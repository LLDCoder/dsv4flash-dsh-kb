"""Generic, read-only Admin Portal reader orchestration.

The reader is deliberately independent from business-module Skills and Tools.
It obtains the current identity first, retrieves relevant documentation, then
executes one bounded ``admin.portal.read`` request.  Only the public result is
returned to the main assistant; technical evidence is kept separately for the
audit trail.
"""

from __future__ import annotations

import asyncio
import html
import hashlib
import json
import re
import time
from dataclasses import asdict, dataclass, field, replace
from datetime import datetime, timezone
from typing import Any, Literal, Protocol
from urllib.parse import unquote, urlsplit

import httpx

from .principal import Principal
from .reader_intent import parse_intent_resolution
from .reader_limits import PORTAL_EXECUTION_TIMEOUT_SECONDS, READER_TOTAL_TIMEOUT_SECONDS, bounded_reader_total_timeout


ReaderStatus = Literal["success", "no_data", "no_permission", "load_failed", "not_confirmed"]
READER_STATUSES = frozenset({"success", "no_data", "no_permission", "load_failed", "not_confirmed"})
ALLOWED_READER_ACTIONS = frozenset({
    "observe", "navigate", "query", "filter", "paginate", "switch_tab", "expand_details",
    "show_filter", "apply_filter", "reset_filter", "show_detail", "dismiss_overlay", "sort",
})
FORBIDDEN_ACTION_TERMS = frozenset(
    {
        "approve", "approval", "reject", "submit", "modify", "update", "edit", "delete",
        "remove", "assign", "send", "export", "upload", "download", "create", "write",
        "save", "pay", "refund", "appeal", "publish", "import", "cancel", "confirm", "dowload",
        "suspend", "archive", "enable", "disable", "close", "open", "activate", "deactivate",
    }
)
# Browser action types and HTTP methods are the primary read-only boundary. These
# terms provide a second, contextual guard for UI commands without treating the
# names of business resources or workflow states as commands.
MUTATION_COMMAND_TERMS = frozenset(
    {
        "approve", "reject", "submit", "modify", "update", "edit", "delete",
        "remove", "assign", "send", "export", "upload", "download", "dowload",
        "create", "write", "save", "pay", "refund", "appeal", "publish", "import",
        "cancel", "confirm", "suspend", "archive", "enable", "disable", "close",
        "open", "activate", "deactivate",
    }
)
# Whole-word matching leaves plural resource routes such as ``/refunds`` and
# ``/appeals`` readable while retaining single-command routes as mutations.
MUTATION_ROUTE_TERMS = MUTATION_COMMAND_TERMS
READ_ONLY_OPEN_CONTEXT_TERMS = frozenset({"task", "tasks", "status", "statuses", "category", "categories"})
SENSITIVE_KEYS = frozenset(
    {
        "authorization", "cookie", "cookies", "token", "access_token", "accesstoken",
        "refresh_token", "refreshtoken", "password", "secret", "credential", "html",
        "pagehtml", "fullhtml", "dom", "screenshot", "binary", "base64",
    }
)
SENSITIVE_KEY_FRAGMENTS = frozenset(
    {"html", "dom", "screenshot", "base64", "binary", "token", "cookie", "credential", "password", "secret", "session", "authorization", "raw", "pagecontent", "fullpage", "completetable"}
)
_CREDENTIAL_NAME = (
    r"session[_-]?token|access[_-]?token|refresh[_-]?token|umc[_-]?token|token|"
    r"password|api[_-]?key|"
    r"provider[_-]?key|secret|credential"
)


def _sanitize_untrusted_text(value: object, *, max_length: int) -> str:
    decoded = html.unescape(str(value))
    without_active_markup = re.sub(
        r"(?is)<(script|style)\b[^>]*>.*?(?:</\1\s*>|$)",
        " ",
        decoded,
    )
    plain = re.sub(r"<[^>]{1,500}>", " ", without_active_markup)
    redacted = re.sub(
        r"(?i)(?P<prefix>\bauthorization(?:header)?\b(?:\s*[:=]\s*|\s+\bis\b\s+|\s+))"
        r"(?P<value>(?:(?:bearer|basic)\s+)?[^\s,;]+)",
        lambda match: f"{match.group('prefix')}[redacted]",
        plain,
    )
    redacted = re.sub(
        r"(?i)\b(?:bearer|basic)\s+[a-z0-9._~+/=-]+",
        "[redacted-auth]",
        redacted,
    )
    redacted = re.sub(
        r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b",
        "[redacted-jwt]",
        redacted,
    )
    redacted = re.sub(
        r"(?i)(?P<prefix>\bcookie(?:value|header)?\b(?:\s*[:=]\s*|\s+\bis\b\s+))"
        r"(?P<value>[^\s;,=]+=[^;\s,]+(?:\s*;\s*(?:[^\s;,=]+=[^;\s,]+|secure|httponly|partitioned))*)",
        lambda match: f"{match.group('prefix')}[redacted]",
        redacted,
    )
    redacted = re.sub(
        r"(?i)(?P<prefix>\b(?:session|access|refresh|umc)[\s_-]?token\b\s+)"
        r"(?P<value>(?!(?:policy|status|scope|lifetime|expiry|expiration|format|rotation|required)\b)"
        r"[a-z0-9._~+/=-]{6,})",
        lambda match: f"{match.group('prefix')}[redacted]",
        redacted,
    )
    redacted = re.sub(
        r"(?i)(?P<prefix>\bcookie(?:value|header)?\b(?:\s*[:=]\s*|\s+\bis\b\s+))"
        r"(?P<value>[^\s,;]+)",
        lambda match: f"{match.group('prefix')}[redacted]",
        redacted,
    )
    redacted = re.sub(
        r"(?i)(?P<prefix>\b(?:api[\s_-]?key|provider[\s_-]?key)\b\s+)"
        r"(?P<value>sk-[a-z0-9_-]{8,}|[a-z0-9._~+/=-]{16,})",
        lambda match: f"{match.group('prefix')}[redacted]",
        redacted,
    )
    redacted = re.sub(
        rf"(?i)(?P<key>\b(?:{_CREDENTIAL_NAME}|api[\s_-]?key|provider[\s_-]?key)\b)"
        r"(?P<closing_quote>[\"']?)(?P<separator>(?:\s*[:=]\s*|\s+\bis\b\s+))"
        r"(?P<value>\"[^\"]*\"|'[^']*'|[^\s,;}\]]+)",
        lambda match: f"{match.group('key')}{match.group('closing_quote')}{match.group('separator')}[redacted]",
        redacted,
    )
    return re.sub(r"\s+", " ", redacted).strip()[:max_length]


@dataclass(frozen=True)
class ReaderTimeoutBudget:
    """Total and per-dependency budgets for one Reader turn."""

    total_seconds: float = READER_TOTAL_TIMEOUT_SECONDS
    get_user_info_seconds: float = 10.0
    knowledge_search_seconds: float = 15.0
    planner_seconds: float = 30.0
    portal_read_seconds: float = 50.0

    @classmethod
    def from_dependencies(
        cls,
        *,
        total_seconds: float,
        llm_timeout_seconds: float,
        knowledge_timeout_seconds: float,
        platform_timeout_seconds: float,
    ) -> "ReaderTimeoutBudget":
        total = bounded_reader_total_timeout(total_seconds)
        return cls(
            total_seconds=total,
            get_user_info_seconds=min(10.0, float(platform_timeout_seconds), total),
            knowledge_search_seconds=min(15.0, float(knowledge_timeout_seconds), total),
            planner_seconds=min(30.0, float(llm_timeout_seconds), total),
            portal_read_seconds=min(float(platform_timeout_seconds), total),
        )


class ReaderStageTimeout(TimeoutError):
    def __init__(self, stage: str, timeout_seconds: float, *, total_budget: bool) -> None:
        super().__init__(stage)
        self.stage = stage
        self.timeout_seconds = timeout_seconds
        self.total_budget = total_budget


async def _await_reader_stage(awaitable: Any, *, stage: str, cap_seconds: float, deadline: float) -> Any:
    remaining = max(0.001, deadline - asyncio.get_running_loop().time())
    timeout_seconds = min(max(0.001, cap_seconds), remaining)
    try:
        return await asyncio.wait_for(awaitable, timeout=timeout_seconds)
    except asyncio.TimeoutError as exc:
        raise ReaderStageTimeout(stage, timeout_seconds, total_budget=remaining <= cap_seconds) from exc


def _timeout_evidence(exc: ReaderStageTimeout, budget: ReaderTimeoutBudget) -> dict[str, Any]:
    return {
        "stage": exc.stage,
        "timeoutKind": "total" if exc.total_budget else "stage",
        "timeoutSeconds": round(exc.timeout_seconds, 3),
        "totalTimeoutSeconds": budget.total_seconds,
    }


@dataclass(frozen=True)
class UserPermissionContext:
    user_id: str = ""
    account: str = ""
    current_role: str = ""
    roles: tuple[str, ...] = ()
    departments: tuple[str, ...] = ()
    pages: tuple[str, ...] = ()
    subpages: tuple[str, ...] = ()
    buttons: tuple[str, ...] = ()
    data_scope: dict[str, Any] = field(default_factory=dict)

    def prompt_json(self) -> dict[str, Any]:
        payload = asdict(self)
        # The login account is useful for audit attribution, not Reader planning.
        payload.pop("account", None)
        return bounded_json(payload, max_depth=4, max_items=50, max_string=300)


@dataclass(frozen=True)
class PortalReadRequest:
    start_path: str
    actions: tuple[dict[str, Any], ...]
    expected_fields: tuple[str, ...] = ()

    def as_payload(self) -> dict[str, Any]:
        return {
            "startPath": self.start_path,
            "actions": [dict(action) for action in self.actions],
            "expectedFields": list(self.expected_fields),
            # These limits are server-owned and cannot be raised by the model.
            "maxPages": 3,
            "timeoutSeconds": int(PORTAL_EXECUTION_TIMEOUT_SECONDS),
            "maxOutputItems": 20,
        }


@dataclass(frozen=True)
class ReaderResult:
    status: ReaderStatus
    summary: str
    page: str = ""
    section: str = ""
    source_section: str = ""
    answer_shape: Literal["overview", "count", "list", "attention", "due", "detail", "unspecified"] = "unspecified"
    completeness: Literal["bounded", "complete", "unknown"] = "unknown"
    selected_state: str = ""
    scope: Literal["personal", "team", "global", "unknown"] = "unknown"
    facts: tuple[str, ...] = ()
    workflow_state: str = ""
    missing: tuple[str, ...] = ()
    intent_context: dict[str, Any] = field(default_factory=dict)
    clarification_options: tuple[str, ...] = ()
    source_hint: dict[str, str] = field(default_factory=dict)

    def public_json(self) -> dict[str, Any]:
        result = {
            "result": self.status,
            "page": _sanitize_untrusted_text(self.page, max_length=500),
            "section": _sanitize_untrusted_text(self.section, max_length=300),
            "sourceSection": _sanitize_untrusted_text(self.source_section or self.section, max_length=300),
            "answerShape": self.answer_shape,
            "completeness": self.completeness,
            "selectedState": _sanitize_untrusted_text(self.selected_state, max_length=300),
            "scope": self.scope,
            "facts": [_sanitize_untrusted_text(item, max_length=400) for item in self.facts[:20]],
            "workflowState": _sanitize_untrusted_text(self.workflow_state, max_length=500),
            "missing": [_sanitize_untrusted_text(item, max_length=200) for item in self.missing[:10]],
        }
        if self.intent_context:
            result["intentContext"] = bounded_json(self.intent_context, max_depth=4, max_items=10, max_string=500)
        if self.source_hint:
            result["sourceHint"] = {key: _sanitize_untrusted_text(value, max_length=500)
                                    for key, value in self.source_hint.items() if key in {"page", "section"}}
        if self.clarification_options:
            result["clarificationOptions"] = [
                _sanitize_untrusted_text(option, max_length=120) for option in self.clarification_options[:2]
            ]
        while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result["facts"]:
            result["facts"].pop()
        while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result["missing"]:
            result["missing"].pop()
        for field_name in ("workflowState", "selectedState", "sourceSection", "section", "page"):
            while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result[field_name]:
                result[field_name] = result[field_name][: max(0, len(result[field_name]) // 2)]
        if len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000:
            result.pop("intentContext", None)
        return result


@dataclass(frozen=True)
class ReaderOutcome:
    result: ReaderResult
    audit_evidence: dict[str, Any]


@dataclass
class _ReaderQualityTrace:
    """Keep bounded, stage-level diagnostics out of the public Reader result."""

    entries: list[dict[str, Any]] = field(default_factory=list)

    def record(
        self,
        stage: str,
        status: Literal["passed", "failed", "degraded", "skipped"],
        *,
        started_at: float | None = None,
        input_summary: dict[str, Any] | None = None,
        output_summary: dict[str, Any] | None = None,
        failure_code: str = "",
    ) -> None:
        if len(self.entries) >= 20:
            return
        entry: dict[str, Any] = {
            "stage": stage[:80],
            "status": status,
            "durationMs": round(max(0.0, time.perf_counter() - started_at) * 1000, 1)
            if started_at is not None
            else 0.0,
            "input": bounded_json(input_summary or {}, max_depth=3, max_items=10, max_string=160),
            "output": bounded_json(output_summary or {}, max_depth=3, max_items=10, max_string=160),
            "failureCode": _sanitize_untrusted_text(failure_code, max_length=120),
        }
        self.entries.append(entry)

    def root_cause(self, result: ReaderResult) -> str:
        if result.status in {"success", "no_data"}:
            return ""
        for entry in reversed(self.entries):
            if entry["status"] == "failed":
                failure_code = str(entry.get("failureCode") or "")
                if failure_code:
                    return failure_code
        if result.status == "no_permission":
            return "permission_not_confirmed"
        if result.status == "load_failed":
            return "reader_load_failed"
        return "evidence_not_confirmed"


class ReaderPlanner(Protocol):
    async def plan_admin_portal_read(
        self,
        question: str,
        permission_context: dict[str, Any],
        knowledge_context: dict[str, Any],
        conversation_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]: ...


class ReaderToolGateway(Protocol):
    async def get_user_info(self, principal: Principal) -> dict[str, Any]: ...

    async def invoke(
        self,
        principal: Principal,
        tool_name: str,
        arguments: dict[str, Any],
        *,
        allowed_tools: list[str] | None = None,
    ) -> dict[str, Any]: ...


def _key(value: object) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).casefold())


def _strings(value: Any, *, limit: int = 100) -> tuple[str, ...]:
    result: list[str] = []

    def visit(item: Any) -> None:
        if len(result) >= limit:
            return
        if isinstance(item, (str, int)):
            text = str(item).strip()
            if text and text not in result:
                result.append(text[:300])
        elif isinstance(item, list):
            for child in item:
                visit(child)
        elif isinstance(item, dict):
            preferred = next(
                (
                    item.get(name)
                    for name in (
                        "frontendRoute", "path", "url", "route", "roleName", "nameEn",
                        "permissionCode", "key", "departmentId", "name", "title", "code", "id",
                    )
                    if item.get(name) is not None
                ),
                None,
            )
            if preferred is not None:
                visit(preferred)
            else:
                for child in item.values():
                    visit(child)

    visit(value)
    return tuple(result)


def _find_values(payload: Any, aliases: set[str]) -> list[Any]:
    found: list[Any] = []
    if isinstance(payload, dict):
        for name, value in payload.items():
            if _key(name) in aliases:
                found.append(value)
            if isinstance(value, (dict, list)):
                found.extend(_find_values(value, aliases))
    elif isinstance(payload, list):
        for value in payload:
            found.extend(_find_values(value, aliases))
    return found


def _first_direct_string(payload: Any, names: tuple[str, ...]) -> str:
    if not isinstance(payload, dict):
        return ""
    values_by_key = {_key(name): value for name, value in payload.items()}
    for name in names:
        values = _strings(values_by_key.get(_key(name)), limit=1)
        if values:
            return values[0]
    return ""


def permission_context_from_user_info(payload: Any) -> UserPermissionContext:
    """Normalize portal-specific ``GetUserInfo`` shapes without trusting the client."""

    aliases = {
        "user": {"userid", "useridentifier", "adminuserid"},
        "account": {
            "account", "accountname", "email", "emailaddress", "loginaccount",
            "loginname", "useremail", "username",
        },
        "current_role": {
            "activerole", "activerolename", "currentrole", "currentrolename",
            "selectedrole", "selectedrolename",
        },
        "roles": {"role", "roles", "roleinfo", "rolesinfo", "listrole", "listroles", "rolename", "rolenames"},
        "departments": {"department", "departments", "departmentinfo", "listdepartment", "listdepartments", "departmentname", "departmentnames", "departmentid"},
        "pages": {"page", "pages", "pagepermissions", "menus", "menupermissions", "listsyspermission", "syspermissions", "permissions"},
        "subpages": {"subpage", "subpages", "subpagepermissions", "children", "childpermissions"},
        "buttons": {"button", "buttons", "buttonlist", "buttonpermissions", "actions", "actionpermissions", "operations"},
        "scope": {"datascope", "datascopes", "scope", "scopes"},
    }
    user_values = _find_values(payload, aliases["user"])
    envelope_data = payload.get("data") if isinstance(payload, dict) and isinstance(payload.get("data"), dict) else {}
    user_id = str(envelope_data.get("id") or next(iter(_strings(user_values, limit=1)), "")).strip()[:300]
    account = _first_direct_string(
        envelope_data,
        ("email", "emailAddress", "userEmail", "loginAccount", "accountName", "account", "userName", "username", "loginName"),
    ) or next(iter(_strings(_find_values(envelope_data, aliases["account"]), limit=1)), "")
    roles = _strings(_find_values(payload, aliases["roles"]))
    current_role = _first_direct_string(
        envelope_data,
        ("currentRoleName", "activeRoleName", "selectedRoleName", "currentRole", "activeRole", "selectedRole"),
    ) or next(iter(_strings(_find_values(envelope_data, aliases["current_role"]), limit=1)), "")
    if not current_role and roles:
        current_role = roles[0]
    scope_values = _find_values(payload, aliases["scope"])
    scope = bounded_json(scope_values[0], max_depth=4, max_items=50, max_string=300) if scope_values else {}
    if not isinstance(scope, dict):
        scope = {"values": scope if isinstance(scope, list) else [scope]}
    return UserPermissionContext(
        user_id=user_id,
        account=account,
        current_role=current_role,
        roles=roles,
        departments=_strings(_find_values(payload, aliases["departments"])),
        pages=_strings(_find_values(payload, aliases["pages"])),
        subpages=_strings(_find_values(payload, aliases["subpages"])),
        buttons=_strings(_find_values(payload, aliases["buttons"])),
        data_scope=scope,
    )


def permission_audit_summary(context: UserPermissionContext) -> dict[str, Any]:
    """Return audit-safe authorization evidence without copying permission trees."""

    def normalized(values: tuple[str, ...]) -> list[str]:
        return sorted({"".join(char for char in str(value).casefold() if char.isalnum()) for value in values if str(value).strip()})

    def normalized_scope(value: Any) -> Any:
        if isinstance(value, dict):
            return {str(key): normalized_scope(value[key]) for key in sorted(value, key=lambda item: str(item).casefold())}
        if isinstance(value, (list, tuple, set)):
            items = [normalized_scope(item) for item in value]
            return sorted(items, key=lambda item: json.dumps(item, ensure_ascii=False, sort_keys=True))
        if isinstance(value, str):
            return "".join(char for char in value.casefold() if char.isalnum())
        return value

    fingerprint_payload = {
        "roles": normalized(context.roles),
        "departments": normalized(context.departments),
        "pages": normalized(context.pages),
        "subpages": normalized(context.subpages),
        "buttons": normalized(context.buttons),
        "dataScope": normalized_scope(bounded_json(context.data_scope, max_depth=4, max_items=50, max_string=300)),
    }
    canonical = json.dumps(fingerprint_payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return {
        "fingerprint": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        "account": _sanitize_untrusted_text(context.account, max_length=300),
        "currentRole": _sanitize_untrusted_text(context.current_role, max_length=300),
        "roles": list(context.roles[:20]),
        "departments": list(context.departments[:20]),
        "pageCount": len(context.pages),
        "subpageCount": len(context.subpages),
        "buttonCount": len(context.buttons),
        "observedAt": datetime.now(timezone.utc).isoformat(),
    }


def _bounded_conversation_context(value: Any) -> dict[str, Any]:
    """Keep only non-authoritative continuity metadata needed by the Reader."""

    if not isinstance(value, dict):
        return {}
    if isinstance(value.get("resolvedIntent"), dict):
        resolved_context = {"resolvedIntent": bounded_json(value["resolvedIntent"], max_depth=4, max_items=10, max_string=500)}
        options = value.get("resolvedChoiceOptions")
        if isinstance(options, list) and len(options) == 2 and all(isinstance(option, str) for option in options):
            resolved_context["resolvedChoiceOptions"] = [_sanitize_untrusted_text(option, max_length=120) for option in options]
        if isinstance(value.get("sourceHint"), dict):
            resolved_context["sourceHint"] = {key: _sanitize_untrusted_text(item, max_length=500)
                                              for key, item in value["sourceHint"].items()
                                              if key in {"page", "section"} and isinstance(item, str)}
        return resolved_context
    if not isinstance(value.get("previousIntent"), dict):
        return {}
    previous = value["previousIntent"]
    limits = {
        "question": 500,
        "answerShape": 40,
        "deliveredAnswerShape": 40,
        "completeness": 40,
        "businessObject": 160,
        "businessFocus": 240,
        "recordIdentity": 300,
        "view": 200,
        "dateRange": 240,
        "filter": 240,
        "recentIntents": 900,
        "page": 300,
        "section": 200,
        "sourceSection": 200,
        "selectedState": 200,
        "scope": 40,
        "requestedScope": 40,
        "resultStatus": 40,
        "workflowState": 300,
    }
    bounded: dict[str, Any] = {}
    for name, max_length in limits.items():
        value = previous.get(name)
        if value is None:
            continue
        bounded[name] = (
            bounded_json(value, max_depth=3, max_items=8 if name == "recentIntents" else 12, max_string=max_length)
            if isinstance(value, (dict, list, tuple))
            else _sanitize_untrusted_text(value, max_length=max_length)
        )
    if isinstance(previous.get("intentContext"), dict):
        bounded["intentContext"] = bounded_json(previous["intentContext"], max_depth=4, max_items=10, max_string=500)
    if isinstance(previous.get("sourceHint"), dict):
        bounded["sourceHint"] = {key: _sanitize_untrusted_text(item, max_length=500)
                                 for key, item in previous["sourceHint"].items()
                                 if key in {"page", "section"} and isinstance(item, str)}
    if isinstance(previous.get("clarificationOptions"), list):
        bounded["clarificationOptions"] = [
            _sanitize_untrusted_text(option, max_length=120)
            for option in previous["clarificationOptions"][:2] if isinstance(option, str)
        ]
    return {"previousIntent": bounded} if any(bounded.values()) else {}


def _resolved_intent_values(conversation_context: Any) -> dict[str, str]:
    context = _bounded_conversation_context(conversation_context)
    slots = context.get("resolvedIntent", {}).get("slots", {})
    return {
        key: str(slot.get("value") or "")
        for key, slot in slots.items()
        if isinstance(slot, dict) and slot.get("source") in {"current", "previous"} and slot.get("value")
    } if isinstance(slots, dict) else {}


def reader_answer_shape(
    question: str,
    conversation_context: dict[str, Any] | None = None,
) -> Literal["overview", "count", "list", "attention", "due", "detail", "unspecified"]:
    """Classify a generic answer shape without selecting a business destination."""

    resolved = _resolved_intent_values(conversation_context).get("answerShape")
    if resolved in {"overview", "count", "list", "attention", "due", "detail", "unspecified"}:
        return resolved  # type: ignore[return-value]
    normalized = re.sub(r"\s+", " ", str(question or "").casefold()).strip()
    if re.fullmatch(
        r"(?:show|display)(?: me)? my tasks?[?!.]*|(?:显示|查看)(?:一下)?我的任务[？。!！]*",
        normalized,
    ):
        return "overview"
    patterns = (
        ("count", r"\bhow many\b|\bcount\b|\bnumber of\b|多少|几个|几项"),
        ("attention", r"\battention\b|pay attention|需要.{0,8}(?:关注|留意)|(?:关注|留意).{0,8}(?:什么|哪些)"),
        ("due", r"\bdue\b|due soon|expir|overdue|到期|逾期"),
        ("detail", r"\bdetails?\b|详情|明细"),
        ("overview", r"\boverview\b|\bsummary\b|\bwhat (?:is shown|can i see)\b|概览|概况|总览"),
        ("list", r"\bshow\b|\blist\b|\bwhich\b|\bwhat are\b|\b(?:check|view|find)\b.*\b(?:tasks|items|records|applications)\b|显示|列出|哪些|有什么"),
    )
    for shape, pattern in patterns:
        if re.search(pattern, normalized):
            return shape  # type: ignore[return-value]
    elliptical = bool(
        re.search(r"\b(?:how|what) about\b|\band\b|那么|那|至于|呢\s*[?？]?\s*$", normalized)
    )
    if elliptical:
        previous = _bounded_conversation_context(conversation_context).get("previousIntent")
        inherited = str(previous.get("answerShape") or "") if isinstance(previous, dict) else ""
        if inherited in {"overview", "count", "list", "attention", "due", "detail"}:
            return inherited  # type: ignore[return-value]
    return "unspecified"


def knowledge_search_query(
    question: str,
    context: UserPermissionContext,
    conversation_context: dict[str, Any] | None = None,
) -> str:
    """Add current permission vocabulary so retrieval can disambiguate Admin manuals."""

    question_text = question.strip()[:1_200]
    bounded_context = _bounded_conversation_context(conversation_context)
    resolved_values = _resolved_intent_values(bounded_context)
    if bounded_context.get("resolvedIntent"):
        parts = ["Admin Portal user manual"]
        if context.roles:
            parts.append("Current roles: " + ", ".join(context.roles[:4])[:160])
        # Reserve space for every resolved condition before the original wording.
        parts.extend(f"Current task {name}: {value[:180]}" for name, value in resolved_values.items())
        hint = bounded_context.get("sourceHint", {})
        if hint:
            parts.append("Verified candidate source, not a restriction: " + str(hint.get("page", ""))[:200] + " " + str(hint.get("section", ""))[:180])
        parts.append("Original question: " + question_text)
        return ". ".join(parts)[:2_000]
    previous = bounded_context.get("previousIntent")
    previous_page = str(previous.get("page") or "") if isinstance(previous, dict) else ""
    page_label = urlsplit(previous_page).path.rstrip("/").rsplit("/", 1)[-1].replace("-", " ").strip()
    manual_prefix = (
        f"Admin Portal {page_label} page user manual"
        if page_label
        else "Admin Portal user manual"
    )
    parts = [manual_prefix, "Question: " + question_text]
    if previous_page:
        parts.append("Previous page is a candidate source, not a scope constraint: " + previous_page)
    parts.append("Requested answer shape: " + reader_answer_shape(question, bounded_context))
    if isinstance(previous, dict):
        continuity = [
            f"{name}: {previous[name]}"
            for name in (
                "question", "businessObject", "recordIdentity", "view", "dateRange", "filter",
                "recentIntents", "selectedState", "sourceSection", "page", "section", "answerShape",
            )
            if previous.get(name)
        ]
        if continuity:
            parts.append("Prior follow-up intent: " + ", ".join(continuity))
    if context.roles:
        parts.append("Current roles: " + ", ".join(context.roles[:4]))
    if context.departments:
        parts.append("Current departments: " + ", ".join(context.departments[:4]))
    permitted_paths = [
        path
        for path in (*context.pages, *context.subpages)
        if isinstance(path, str) and path.startswith("/")
    ]
    if permitted_paths:
        parts.append("Relevant permitted pages: " + ", ".join(dict.fromkeys(permitted_paths[:20])))
    query = ". ".join(parts)
    if len(query) <= 2_000:
        return query
    # Preserve the current question and follow-up intent before permission vocabulary.
    required_count = 5 if previous_page and len(parts) >= 5 else 4 if isinstance(previous, dict) and len(parts) >= 4 else 3
    required = ". ".join(parts[:required_count])
    optional = ". ".join(parts[required_count:])
    return (required + (". " + optional[: max(0, 1_998 - len(required))] if optional else ""))[:2_000]


def portal_request_paths(request: PortalReadRequest) -> frozenset[str]:
    return frozenset(
        {request.start_path}
        | {
            str(action.get(name))
            for action in request.actions
            for name in ("path", "url")
            if action.get(name)
        }
    )


def permission_path_matches(requested_path: str, allowed_path: str) -> bool:
    """Match exact routes or explicit one-segment route templates only."""

    requested = urlsplit(requested_path).path.rstrip("/") or "/"
    allowed = urlsplit(allowed_path).path.rstrip("/") or "/"
    if requested == allowed:
        return True
    requested_parts = requested.strip("/").split("/")
    allowed_parts = allowed.strip("/").split("/")
    if len(requested_parts) != len(allowed_parts):
        return False
    def segment_matches(actual: str, expected: str) -> bool:
        if expected == actual:
            return True
        dynamic = expected == "*" or (expected.startswith(":") and len(expected) > 1) or (expected.startswith("{") and expected.endswith("}"))
        return dynamic and bool(re.fullmatch(r"[A-Za-z0-9_-]*\d[A-Za-z0-9_-]*", actual))

    return all(segment_matches(actual, expected) for actual, expected in zip(requested_parts, allowed_parts, strict=True))


def _click_permission_matches(action: dict[str, Any], buttons: tuple[str, ...]) -> bool:
    candidates = {_key(action.get("permissionCode") or action.get("permission_code"))} - {""}
    allowed = {_key(button) for button in buttons if _key(button)}
    return bool(candidates and allowed and candidates.intersection(allowed))


def _detail_identity(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _cell_detail_destination(action: dict[str, Any]) -> str | None:
    destinations = [str(action[name]).strip() for name in ("path", "url") if action.get(name)]
    return destinations[0] if len(destinations) == 1 else None


def _same_route(first: str, second: str) -> bool:
    return (urlsplit(first).path.rstrip("/") or "/") == (urlsplit(second).path.rstrip("/") or "/")


def bounded_json(value: Any, *, max_depth: int = 5, max_items: int = 100, max_string: int = 1_000) -> Any:
    """Bound and redact untrusted evidence before it crosses runtime boundaries."""

    if max_depth <= 0:
        return "[truncated]"
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for name, child in list(value.items())[:max_items]:
            normalized = _key(name)
            if normalized in {_key(item) for item in SENSITIVE_KEYS} or any(fragment in normalized for fragment in SENSITIVE_KEY_FRAGMENTS):
                continue
            result[str(name)[:120]] = bounded_json(child, max_depth=max_depth - 1, max_items=max_items, max_string=max_string)
        return result
    if isinstance(value, (list, tuple)):
        return [bounded_json(item, max_depth=max_depth - 1, max_items=max_items, max_string=max_string) for item in list(value)[:max_items]]
    if isinstance(value, str):
        return _sanitize_untrusted_text(value, max_length=max_string)
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)[:max_string]


def _sanitize_knowledge_text(value: str, *, max_length: int) -> str:
    return _sanitize_untrusted_text(value, max_length=max_length)


_KNOWLEDGE_MARKDOWN_V2_ENVELOPE = re.compile(
    r"\A【知识库文件】\s*文件名：(?P<source_name>.+?)\s+目录：\S+\s+分段：\d+\s+"
    r"【文档路径】.+?\s+【来源行】\d+(?:-\d+)?\s+"
    r"【内容类型】[^\s【]+\s+【切分版本】markdown-v2\s+(?P<body>.+)\Z",
    re.IGNORECASE | re.DOTALL,
)


def _knowledge_content_body(content: str, source_name: object = "") -> str:
    """Remove the known retrieval envelope while preserving manual content."""

    normalized = re.sub(r"\s+", " ", str(content or "")).strip()
    match = _KNOWLEDGE_MARKDOWN_V2_ENVELOPE.fullmatch(normalized)
    structured_source = re.sub(r"\s+", " ", str(source_name or "")).strip()
    if not match or not structured_source:
        return normalized
    envelope_source = re.sub(r"\s+", " ", match.group("source_name")).strip()
    if envelope_source.casefold() != structured_source.casefold():
        return normalized
    return match.group("body").strip()


def project_knowledge_result(
    value: Any,
    *,
    max_chunks: int = 8,
    max_content: int = 4_000,
    max_bytes: int = 48_000,
) -> dict[str, Any]:
    """Project the gateway response into bounded planning evidence.

    Knowledge responses are nested more deeply than ordinary audit payloads.
    An explicit projection preserves useful chunk text while excluding IDs,
    hashes, graph payloads, and other retrieval internals.
    """

    if not isinstance(value, dict):
        return {"ok": False, "code": "knowledge_result_invalid"}
    projected: dict[str, Any] = {
        "ok": value.get("ok") is True,
        "code": str(value.get("code") or "")[:120],
    }
    payload = value.get("result")
    if not isinstance(payload, dict):
        return projected
    if isinstance(payload.get("total"), int):
        projected["total"] = payload["total"]
    if isinstance(payload.get("degraded"), bool):
        projected["degraded"] = payload["degraded"]
    raw_chunks = payload.get("chunks")
    if not isinstance(raw_chunks, list):
        raw_chunks = []
    chunks: list[dict[str, Any]] = []
    for raw_item in raw_chunks[: max(0, max_chunks)]:
        if not isinstance(raw_item, dict):
            continue
        nested = raw_item.get("chunk") if isinstance(raw_item.get("chunk"), dict) else {}
        content = raw_item.get("content") or nested.get("content") or raw_item.get("text") or nested.get("text")
        if not isinstance(content, str) or not content.strip():
            continue
        source_name = (
            raw_item.get("source_name")
            or nested.get("source_name")
            or raw_item.get("document_keyword")
            or nested.get("document_keyword")
        )
        body = _knowledge_content_body(content, source_name)
        safe_content = _sanitize_knowledge_text(body, max_length=max_content)
        if not safe_content:
            continue
        item: dict[str, Any] = {"content": safe_content}
        if len(body) > max_content:
            # Keep truncation explicit so the planner cannot mistake an
            # incomplete semantic node for complete manual evidence.
            item["truncated"] = True
        if isinstance(source_name, str) and source_name.strip():
            safe_source_name = _sanitize_knowledge_text(source_name, max_length=300)
            if safe_source_name:
                item["source_name"] = safe_source_name
        score = raw_item.get("score", nested.get("score"))
        if isinstance(score, (int, float)) and not isinstance(score, bool):
            item["score"] = score
        candidate = {**projected, "chunks": [*chunks, item]}
        if len(json.dumps(candidate, ensure_ascii=False).encode("utf-8")) > max_bytes:
            break
        chunks.append(item)
    projected["chunks"] = chunks
    return projected


class ReadOnlyPortalPolicy:
    """Validate generic browser actions before any network call is made."""

    def __init__(self, portal_base_url: str, *, max_actions: int = 12, max_pages: int = 3) -> None:
        parsed = urlsplit(portal_base_url)
        self.portal_origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme in {"http", "https"} and parsed.netloc else ""
        self.max_actions = max(1, max_actions)
        self.max_pages = max(1, max_pages)

    @staticmethod
    def _safe_path(value: object) -> str | None:
        path = unquote(str(value or "")).strip()
        if not path.startswith("/") or path.startswith("//") or "\\" in path:
            return None
        parsed = urlsplit(path)
        if parsed.scheme or parsed.netloc or parsed.username or parsed.password:
            return None
        return path[:1_000]

    @staticmethod
    def _words(value: object) -> frozenset[str]:
        decoded = unquote(str(value or ""))
        # Split camel-case parameter names such as ``exportFormat`` before
        # tokenizing, while keeping plural resource names distinct from verbs.
        spaced = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", decoded)
        return frozenset(re.findall(r"[a-z]+", spaced.casefold()))

    @classmethod
    def _contains_mutation_command(cls, value: object) -> bool:
        words = cls._words(value)
        mutation_terms = words.intersection(MUTATION_COMMAND_TERMS)
        return bool(
            mutation_terms - {"open"}
            or ("open" in mutation_terms and not words.intersection(READ_ONLY_OPEN_CONTEXT_TERMS))
        )

    @classmethod
    def _is_mutation_route(cls, value: object) -> bool:
        parsed = urlsplit(unquote(str(value or "")))
        return any(
            cls._contains_mutation_command(segment)
            and cls._words(segment).intersection(MUTATION_ROUTE_TERMS)
            for segment in parsed.path.split("/")
            if segment
        )

    @classmethod
    def _is_safe_overlay_dismissal_label(cls, value: object, action_type: str) -> bool:
        return action_type == "dismiss_overlay" and cls._words(value) in ({"close"}, {"dismiss"}, {"cancel"})

    def validate(
        self,
        request: PortalReadRequest,
        permissions: UserPermissionContext,
        *,
        require_permission_context: bool = True,
    ) -> str | None:
        if not self.portal_origin:
            return "invalid_portal_origin"
        if not self._safe_path(request.start_path):
            return "invalid_navigation_path"
        if self._is_mutation_route(request.start_path):
            return "action_not_read_only"
        if not request.actions or len(request.actions) > self.max_actions:
            return "invalid_action_count"
        page_paths = {request.start_path}
        allowed_pages = tuple(path for path in (*permissions.pages, *permissions.subpages) if path.startswith("/"))
        if require_permission_context and (not permissions.roles or not allowed_pages):
            return "permission_context_incomplete"
        if allowed_pages and not any(permission_path_matches(request.start_path, page) for page in allowed_pages):
            return "page_not_permitted"
        for action in request.actions:
            action_type = str(action.get("type") or "").strip().casefold().replace("-", "_")
            if action_type not in ALLOWED_READER_ACTIONS:
                return "action_not_read_only"
            method = str(action.get("method") or "GET").strip().upper()
            # Query means interacting with the already-loaded page, not calling
            # an arbitrary API endpoint. The isolated executor owns all network
            # traffic, so model-provided POST requests are never accepted.
            if method != "GET":
                return "method_not_read_only"
            permission_code = action.get("permissionCode") or action.get("permission_code")
            cell_detail_without_button = (
                action_type == "show_detail"
                and str(action.get("role") or "").casefold() == "cell"
                and not str(permission_code or "").strip()
            )
            if action_type == "show_detail" and str(action.get("role") or "").casefold() == "cell" and permission_code:
                return "click_target_not_detail"
            if action_type in {"expand_details", "show_detail"} and not cell_detail_without_button and (
                not permission_code or not _click_permission_matches(action, permissions.buttons)
            ):
                return "button_not_permitted"
            if action_type == "show_detail" and not str(action.get("value") or "").strip():
                return "detail_identity_required"
            if action_type == "sort" and str(action.get("direction") or "").casefold() not in {"ascending", "descending"}:
                return "sort_direction_required"
            raw_values = action.get("values")
            if raw_values is not None and (
                not isinstance(raw_values, list)
                or not 1 <= len(raw_values) <= 20
                or any(not isinstance(value, str) or not value.strip() or len(value) > 1_000 for value in raw_values)
            ):
                return "invalid_filter_values"
            if action_type == "filter" and action.get("value") is None and not raw_values:
                return "filter_value_required"
            for name in ("path", "url"):
                if name in action and not self._safe_path(action[name]):
                    return "invalid_navigation_path"
                if name in action and self._is_mutation_route(action[name]):
                    return "action_not_read_only"
                if name in action:
                    action_path = str(action[name])
                    page_paths.add(action_path)
                    if allowed_pages and not any(permission_path_matches(action_path, page) for page in allowed_pages):
                        return "page_not_permitted"
            if cell_detail_without_button:
                identity = _detail_identity(action.get("value"))
                if not str(action.get("name") or "").strip() or _detail_identity(action.get("name")) != identity:
                    return "detail_cell_identity_mismatch"
                destination = _cell_detail_destination(action)
                if destination is None:
                    return "detail_destination_required"
                if urlsplit(destination).query or urlsplit(destination).fragment:
                    return "detail_destination_query_forbidden"
                if _same_route(request.start_path, destination):
                    return "detail_destination_not_distinct"
            parameters = action.get("parameters") or action.get("filters") or {}
            if not isinstance(parameters, dict):
                return "invalid_action_parameters"
            if any(self._contains_mutation_command(name) for name in parameters):
                return "action_not_read_only"
            for name in ("label", "name", "selector"):
                candidate = action.get(name)
                if candidate is None:
                    continue
                if name in {"label", "name"} and self._is_safe_overlay_dismissal_label(candidate, action_type):
                    continue
                if self._contains_mutation_command(candidate):
                    return "action_not_read_only"
            if action_type == "query" and (
                action.get("value") is not None or raw_values or action.get("parameters") or action.get("filters")
            ):
                return "query_cannot_apply_filters"
        if len(page_paths) > self.max_pages:
            return "page_limit_exceeded"
        return None


def portal_read_request_from_plan(plan: Any) -> PortalReadRequest | None:
    if not isinstance(plan, dict) or set(plan) != {"mode", "portalRequest"} or plan.get("mode") != "portal_read":
        return None
    candidate = plan.get("portalRequest")
    if not isinstance(candidate, dict):
        return None
    if not set(candidate).issubset({"startPath", "actions", "expectedFields"}):
        return None
    start_path = str(candidate.get("startPath") or candidate.get("start_path") or "").strip()
    raw_actions = candidate.get("actions")
    if not start_path or not isinstance(raw_actions, list):
        return None
    if not raw_actions:
        raw_actions = [{"type": "observe"}]
    action_keys = {
        "type", "action", "path", "url", "selector", "label", "role", "name", "field", "section",
        "emptyState", "permissionCode", "value", "values", "method", "parameters", "filters", "direction",
    }
    if any(not isinstance(action, dict) or not set(action).issubset(action_keys) for action in raw_actions):
        return None
    actions: list[dict[str, Any]] = []
    for raw_action in raw_actions:
        action_type = raw_action.get("type")
        action_alias = raw_action.get("action")
        if action_type is not None and action_alias is not None and _key(action_type) != _key(action_alias):
            return None
        normalized_action = {name: value for name, value in raw_action.items() if name != "action"}
        if action_type is None and action_alias is not None:
            normalized_action["type"] = action_alias
        # The model may omit a semantic role for known read-only UI commands.
        # Fill only the role implied by the action type; never overwrite an
        # explicit role, which must continue through policy validation.
        if "role" not in normalized_action:
            implied_role = {
                "switch_tab": "tab",
                "show_filter": "button",
                "apply_filter": "button",
                "reset_filter": "button",
                "dismiss_overlay": "button",
            }.get(str(normalized_action.get("type") or "").casefold())
            if implied_role:
                normalized_action["role"] = implied_role
        actions.append(normalized_action)
    fields = _strings(candidate.get("expectedFields") or candidate.get("expected_fields") or (), limit=30)
    return PortalReadRequest(start_path=start_path, actions=tuple(actions), expected_fields=fields)


def _normalize_initial_observation_request(request: PortalReadRequest) -> PortalReadRequest | None:
    """Normalize redundant observations after original fields pass policy.

    State-changing read actions already return a final observation. A trailing
    pure observe adds no evidence in that case. Other mixed plans stay invalid.
    Callers must validate the original request so normalization cannot hide
    unsafe metadata or bypass action budgets.
    """

    action_types = tuple(
        str(action.get("type") or "").strip().casefold().replace("-", "_")
        for action in request.actions
    )
    if "observe" not in action_types:
        return request
    if (
        len(action_types) > 1
        and action_types[-1] == "observe"
        and action_types.count("observe") == 1
        and set(request.actions[-1]) == {"type"}
        and all(action_type in ALLOWED_READER_ACTIONS - {"observe"} for action_type in action_types[:-1])
        and any(action_type != "query" for action_type in action_types[:-1])
    ):
        return replace(request, actions=request.actions[:-1])
    if not action_types or any(action_type != "observe" for action_type in action_types):
        return None
    return PortalReadRequest(
        start_path=request.start_path,
        actions=({"type": "observe"},),
        expected_fields=request.expected_fields,
    )


def _closed_result_from_plan(
    plan: Any,
    *,
    expected_mode: Literal["knowledge_only", "observation_result"],
) -> ReaderResult | None:
    """Validate one closed planner result mode without accepting aliases."""

    if not isinstance(plan, dict) or plan.get("mode") != expected_mode:
        return None
    allowed = {
        "mode", "result", "page", "section", "sourceSection", "answerShape", "completeness",
        "selectedState", "scope", "facts", "workflowState", "missing",
    }
    if not set(plan).issubset(allowed):
        return None
    status = str(plan.get("result") or "not_confirmed")
    if status not in {"success", "no_data", "not_confirmed"}:
        return None
    facts = plan.get("facts") or []
    missing = plan.get("missing") or []
    if not isinstance(facts, list) or not isinstance(missing, list):
        return None
    normalized_facts: list[str] = []
    for fact in facts[:20]:
        if isinstance(fact, dict) and expected_mode == "observation_result":
            if not fact or not all(isinstance(key, str) and isinstance(value, str) for key, value in fact.items()):
                return None
            # Keep native field bindings as valid JSON for the evidence validator.
            text = json.dumps(fact, ensure_ascii=False, separators=(",", ":"))
            if len(text) > 500:
                return None
        elif isinstance(fact, str):
            text = fact[:500]
        else:
            return None
        normalized_facts.append(text)
    if status == "success" and not facts:
        return None
    if status == "no_data" and facts:
        return None
    if status == "not_confirmed" and not missing:
        return None
    scope = str(plan.get("scope") or "unknown")
    if scope not in {"personal", "team", "global", "unknown"}:
        return None
    answer_shape = str(plan.get("answerShape") or "unspecified")
    if answer_shape not in {"overview", "count", "list", "attention", "due", "detail", "unspecified"}:
        return None
    completeness = str(plan.get("completeness") or "unknown")
    if completeness not in {"bounded", "complete", "unknown"}:
        return None
    return ReaderResult(
        status=status,  # type: ignore[arg-type]
        summary=(
            "The knowledge base answered the request."
            if expected_mode == "knowledge_only" and status == "success"
            else "The portal observation answered the request."
            if expected_mode == "observation_result" and status == "success"
            else "The planner result is incomplete."
        ),
        page=str(plan.get("page") or "")[:500],
        section=str(plan.get("section") or "")[:300],
        source_section=str(plan.get("sourceSection") or plan.get("section") or "")[:300],
        answer_shape=answer_shape,  # type: ignore[arg-type]
        completeness=completeness,  # type: ignore[arg-type]
        selected_state=str(plan.get("selectedState") or "")[:300],
        scope=scope,  # type: ignore[arg-type]
        facts=tuple(normalized_facts),
        workflow_state=str(plan.get("workflowState") or "")[:500],
        missing=tuple(str(item)[:500] for item in missing[:10]),
    )


def knowledge_result_from_plan(plan: Any) -> ReaderResult | None:
    """Validate the planner's closed pre-observe knowledge-only result shape."""

    return _closed_result_from_plan(plan, expected_mode="knowledge_only")


def _observation_plan_result_from_plan(plan: Any) -> ReaderResult | None:
    """Validate the planner's closed post-observe result shape."""

    return _closed_result_from_plan(plan, expected_mode="observation_result")


_DOCUMENTATION_QUESTION_MARKERS = ("manual", "documented", "documentation", "user guide", "手册", "文档", "说明", "دليل")


def question_requests_business_mutation(question: str) -> bool:
    """Recognize explicit commands, not resource names or read-only view changes."""
    text = re.sub(r"\s+", " ", str(question or "")).strip()
    english = re.sub(
        r"^(?:(?:please|now)\s+|(?:can|could|would|will)\s+you\s+|i\s+(?:need|want)\s+you\s+to\s+)+",
        "", text, flags=re.IGNORECASE,
    )
    if re.match(
        r"^(?:approve|reject|submit|delete|remove|create|assign|reassign|export|upload|download|pay|refund|send|suspend|publish|save|archive)\b",
        english, re.IGNORECASE,
    ):
        return True
    if re.match(r"^(?:change|modify|update|edit|enable|disable|activate|deactivate)\b", english, re.IGNORECASE):
        return not bool(re.match(
            r"^\w+\s+(?:(?:the|that|this|my|current)\s+)?(?:filters?|search|tabs?|views?|pages?|sort(?:ing)?|date\s+range)\b",
            english, re.IGNORECASE,
        ))
    if re.match(r"^turn\b.*\b(?:automatic\s+assignment|auto[- ]assignment|assignment\s+settings?)\b.*\b(?:off|on)\b", english, re.IGNORECASE):
        return True
    chinese = re.sub(r"^(?:(?:请|帮我|给我|现在|立即|麻烦你|我需要你|我想让你)\s*)+", "", text)
    return bool(
        re.match(r"^(?:删除|导出|下载|上传|批准|审批|驳回|提交|创建|新建|分配|重新分配|发送|退款|支付|停用|发布|保存)", chinese)
        or re.match(r"^(?:关闭|开启|禁用|启用)自动分配", chinese)
        or re.match(r"^(?:يرجى\s+)?(?:احذف|صدّر|صدر|حمّل|حمل|ارفع|أرسل|ارسل|وافق|ارفض|ادفع)\b", text)
    )


PRIOR_LIST_SAMPLE_FACT = (
    "The records in the immediately preceding list are a bounded sample, not the complete collection. "
    "This does not change any separately verified total."
)


def previous_sample_explanation(question: str, context: dict[str, Any]) -> str | None:
    """Explain prior answer coverage without reusing old records or totals."""
    previous = _bounded_conversation_context(context).get("previousIntent", {})
    if not (
        previous.get("resultStatus") == "success"
        and previous.get("deliveredAnswerShape") == "list"
        and previous.get("completeness") == "bounded"
    ):
        return None
    if re.search(
        r"^\s*is (?:that|this|it)\b.*\b(?:total|all)\b.*\b(?:sample|listed|shown)\b|"
        r"^\s*(?:这|那).{0,20}总数.{0,25}(?:样本|示例|列出)", question, re.IGNORECASE,
    ):
        return PRIOR_LIST_SAMPLE_FACT
    return None


_LIVE_TIME_MARKERS = (
    "current", "currently", "right now", "today", "latest",
    "当前", "现在", "目前", "今天", "最新", "此刻",
    "حالي", "حاليًا", "الآن", "اليوم", "الأحدث",
)
_LIVE_STATE_MARKERS = (
    "visible", "list ", "show ", "how many", "overdue", "due soon",
    "哪些", "有没有", "多少", "逾期", "到期", "快到期",
    "اعرض", "كم ", "متأخر", "مستحق",
)
_KNOWLEDGE_SENTINELS = ("[truncated]", "knowledge_error", "knowledge timeout", "knowledge_timeout")
_KNOWLEDGE_PROSE_TERMS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "for", "from", "has", "have",
        "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "were",
        "will", "with",
    }
)


def question_is_conceptual(question: str) -> bool:
    normalized = question.casefold()
    return bool(re.search(
        r"\b(?:explain|describe|define|meaning|definition|difference|distinction|manual)\b"
        r"|\bwhat (?:does|do)\b.*\b(?:mean|cover|measure|provide|represent)\b"
        r"|\bwhat (?:information|fields|columns)\b.*\bdiffers?\b"
        r"|\b(?:does|do|can)\b.*\b(?:prove|guarantee|imply|establish|mean)\b"
        r"|\balone\b.*\bidentify\b|\bhow (?:do i|can i|to)\b"
        r"|\b(?:what|which)\b.*\b(?:criteria|filters?|fields?|columns?)\b.*\b(?:available|supported)\b"
        r"|解释|含义|区别|手册|是什么意思|如何|怎么使用|شرح|معنى|الفرق|كيف",
        normalized,
    )) or any(marker in normalized for marker in _DOCUMENTATION_QUESTION_MARKERS)


def question_requires_live_portal(question: str) -> bool:
    """Identify generic freshness/personalization language without module routing."""

    normalized = re.sub(r"\s+", " ", str(question or "")).strip().casefold()
    documentation_intent = any(marker in normalized for marker in _DOCUMENTATION_QUESTION_MARKERS)
    personal_intent = bool(
        re.search(r"\b(?:my|mine|do i|can i|for me|i have)\b", normalized)
        or any(marker in normalized for marker in ("我的", "我有", "我能", "我可以", "对我", "لدي", "خاصتي", "هل لدي"))
    )
    current_or_visible = any(marker in normalized for marker in (*_LIVE_TIME_MARKERS, "visible", "selected", "active", "applied", "我能看到", "已选择", "当前", "الظاهرة"))
    definition_intent = bool(
        re.search(r"\bwhat (?:does|do)\b.*\bmean\b", normalized)
        or any(marker in normalized for marker in ("是什么意思", "含义是什么", "ما معنى"))
    )
    conceptual_intent = bool(
        re.search(r"\b(?:explain|describe|define)\b", normalized)
        or re.search(r"\b(?:difference|distinction|meaning)\b", normalized)
        or any(marker in normalized for marker in ("解释", "区别", "含义", "是什么意思"))
    )
    explicit_conceptual = bool(
        re.search(r"\b(?:without|don't|do not|not)\b.*\b(?:read|access|check)\b", normalized)
        or any(marker in normalized for marker in ("不用读取", "不读取我的数据", "无需读取", "不需要读取"))
    )
    if explicit_conceptual and conceptual_intent and not current_or_visible and not any(marker in normalized for marker in ("how many", "list ", "show ", "哪些", "多少")):
        return False
    if documentation_intent and definition_intent and not current_or_visible:
        return False
    if (
        re.search(r"\bwhich\b.*\bdate\b.*\b(?:filter|use|refer|field|mean)\b", normalized)
        and not current_or_visible
        and not re.search(r"\b(?:active|selected|applied)\b", normalized)
    ):
        return False
    which_live = bool(re.search(r"\bwhich\b.*\b(?:task|tasks|item|items|record|records|list)\b", normalized))
    if current_or_visible or which_live or personal_intent:
        return True
    if documentation_intent:
        return False
    if re.search(r"\b(?:check|view|find)\b.*\b(?:tasks|items|records|applications)\b", normalized):
        return True
    if re.search(r"\b(?:how|what) about\b.*\b(?:tasks?|items?|records?)\b", normalized):
        return True
    return any(marker in normalized for marker in _LIVE_STATE_MARKERS)


def _knowledge_evidence_strings(knowledge_context: Any, *, limit: int = 200) -> tuple[str, ...]:
    if not isinstance(knowledge_context, dict) or knowledge_context.get("ok") is not True:
        return ()
    chunks = knowledge_context.get("chunks")
    if not isinstance(chunks, list):
        return ()
    values: list[str] = []
    for chunk in chunks[:limit]:
        content = chunk.get("content") if isinstance(chunk, dict) else None
        if not isinstance(content, str):
            continue
        text = _knowledge_content_body(content, chunk.get("source_name"))
        if text and not any(marker in text.casefold() for marker in _KNOWLEDGE_SENTINELS):
            values.append(text[:4_000])
    return tuple(values)


def _contains_contiguous_tokens(haystack: list[str], needle: list[str]) -> bool:
    if not needle or len(needle) > len(haystack):
        return False
    return any(haystack[index:index + len(needle)] == needle for index in range(len(haystack) - len(needle) + 1))


_NEGATION_PATTERN = re.compile(
    r"(?:\b(?:not|no|never|cannot|without)\b|n't\b|不可以|不能|不可|不得|没有|禁止|尚未|未(?:获|完|通|批)|"
    r"(?:^|\s)(?:لا|ليس|لن|لم|غير|بدون|ممنوع)(?:\s|$))",
    re.IGNORECASE,
)


def _negative_polarity(value: str) -> bool:
    return bool(_NEGATION_PATTERN.search(re.sub(r"\s+", " ", value).strip()))


def _knowledge_numbers_supported(fact: str, unit: str) -> bool:
    fact_numbers = re.findall(r"\d+(?:\.\d+)?", fact)
    unit_numbers = re.findall(r"\d+(?:\.\d+)?", unit)
    return all(fact_numbers.count(number) <= unit_numbers.count(number) for number in set(fact_numbers))


def _knowledge_meaningful_terms(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z][a-z0-9_-]*|\d+(?:\.\d+)?", value.casefold())
        if token[0].isdigit() or (len(token) >= 3 and token not in _KNOWLEDGE_PROSE_TERMS)
    }


def _knowledge_fact_clauses(value: str) -> tuple[str, ...]:
    return tuple(
        item.strip()
        for item in re.split(r"[!?。！？;；]+|(?<!\d)\.+|\.+(?!\d)", value)
        if item.strip()
    )


def _knowledge_fact_is_structural(value: str) -> bool:
    normalized = re.sub(r"\s+", " ", str(value or "")).strip()
    if normalized.startswith("【知识库文件】") or re.match(r"^#{1,6}\s+\S", normalized):
        return True
    field_prefixes = re.findall(r"(?:^|\s)-\s*\*\*[^*:\n]{1,80}:\*\*", normalized)
    return bool(field_prefixes)


def _knowledge_unit_supports_fact(fact: str, unit: str) -> bool:
    normalized_fact = re.sub(r"\s+", " ", fact).strip().casefold()
    normalized_unit = re.sub(r"\s+", " ", unit).strip().casefold()
    if not normalized_fact or not normalized_unit:
        return False
    if _negative_polarity(normalized_fact) != _negative_polarity(normalized_unit):
        return False
    if not _knowledge_numbers_supported(normalized_fact, normalized_unit):
        return False
    if normalized_fact in normalized_unit:
        return True

    fact_latin = [
        token
        for token in re.findall(r"[a-z][a-z0-9_-]*|\d+(?:\.\d+)?", normalized_fact)
        if token[0].isdigit() or (len(token) >= 2 and token not in _KNOWLEDGE_PROSE_TERMS)
    ]
    unit_latin = [
        token
        for token in re.findall(r"[a-z][a-z0-9_-]*|\d+(?:\.\d+)?", normalized_unit)
        if token[0].isdigit() or (len(token) >= 2 and token not in _KNOWLEDGE_PROSE_TERMS)
    ]
    fact_han = [
        sequence[index:index + 2]
        for sequence in re.findall(r"[\u3400-\u9fff]+", normalized_fact)
        for index in range(max(0, len(sequence) - 1))
    ]
    unit_han = {
        sequence[index:index + 2]
        for sequence in re.findall(r"[\u3400-\u9fff]+", normalized_unit)
        for index in range(max(0, len(sequence) - 1))
    }
    fact_arabic = re.findall(r"[\u0621-\u064a]+", normalized_fact)
    unit_arabic = re.findall(r"[\u0621-\u064a]+", normalized_unit)

    checks: list[bool] = []
    if fact_latin:
        checks.append(_contains_contiguous_tokens(unit_latin, fact_latin))
    if fact_han:
        checks.append(len(set(fact_han) & unit_han) >= max(1, (len(set(fact_han)) * 3 + 3) // 4))
    if fact_arabic:
        checks.append(_contains_contiguous_tokens(unit_arabic, fact_arabic))
    return bool(checks) and all(checks)


def _knowledge_claim_supported_by_chunk(fact: str, chunk: str) -> bool:
    normalized_fact = re.sub(r"\s+", " ", fact).strip().casefold()
    if not normalized_fact or _knowledge_fact_is_structural(fact):
        return False

    quote = normalized_fact.replace("`", "").rstrip(".!?。！？ ")
    sentences = _knowledge_fact_clauses(chunk)
    units = [
        item.strip()
        for sentence in sentences
        for item in re.split(r"[,，،]+", sentence)
        if item.strip()
    ]
    if quote and any(
        quote in sentence.casefold().replace("`", "")
        and _negative_polarity(quote) == _negative_polarity(sentence)
        and _knowledge_numbers_supported(quote, sentence)
        for sentence in sentences
    ):
        return True

    if any(_knowledge_unit_supports_fact(fact, unit) for unit in units):
        return True

    fact_terms = _knowledge_meaningful_terms(normalized_fact)
    if len(fact_terms) < 2:
        return False
    fact_numbers = re.findall(r"\d+(?:\.\d+)?", normalized_fact)
    best_supported_overlap = 0
    best_conflicting_overlap = 0
    for unit in units:
        unit_terms = _knowledge_meaningful_terms(unit)
        overlap = fact_terms & unit_terms
        number_conflict = bool(fact_numbers and not _knowledge_numbers_supported(normalized_fact, unit))
        if _negative_polarity(normalized_fact) != _negative_polarity(unit) or number_conflict:
            best_conflicting_overlap = max(best_conflicting_overlap, len(overlap))
            continue
        if len(overlap) >= 2 and len(overlap) * 2 >= len(fact_terms):
            best_supported_overlap = max(best_supported_overlap, len(overlap))
    return best_supported_overlap > best_conflicting_overlap


def knowledge_supports_result(result: ReaderResult, knowledge_context: Any) -> bool:
    """Require knowledge-only success facts to be grounded in retrieved content."""

    if result.status != "success" or not result.facts:
        return False
    evidence = _knowledge_evidence_strings(knowledge_context)
    if not evidence:
        return False
    for fact in result.facts:
        normalized_fact = re.sub(r"\s+", " ", fact).strip().casefold()
        if (
            not normalized_fact
            or _knowledge_fact_is_structural(fact)
            or any(marker in normalized_fact for marker in _KNOWLEDGE_SENTINELS)
        ):
            return False
        clauses = _knowledge_fact_clauses(fact)
        if not clauses:
            return False
        # A compound fact is grounded only when one retrieved chunk supports
        # every clause. Never stitch independent relationships across chunks.
        if not any(
            all(_knowledge_claim_supported_by_chunk(clause, chunk) for clause in clauses)
            for chunk in evidence
        ):
            return False
    return True


_OBSERVATION_PROSE_TERMS = frozenset(
    {
        "and", "are", "area", "areas", "card", "cards", "column", "columns", "control", "controls",
        "count", "counts", "current", "currently", "data", "display", "displayed", "displays", "field",
        "fields", "filter", "filters", "for", "from", "has", "have", "in", "includes", "including",
        "information", "is", "label", "labels", "list", "main", "major", "of", "on", "overview",
        "page", "present", "primary", "region", "regions", "row", "rows", "section", "shown", "shows",
        "summary", "tab", "tabs", "table", "tables", "task", "the", "this", "to", "value", "values",
        "with",
    }
)
_EXPLICIT_EMPTY_MARKERS = (
    "no data", "no records", "no result", "no matching", "nothing found", "暂无数据", "暂无记录", "没有数据",
)
_OBSERVATION_FALLBACK_DISALLOWED_TERMS = frozenset(
    {
        *FORBIDDEN_ACTION_TERMS,
        "attention", "blacklist", "black list", "find", "search", "named", "specific", "particular",
        "detail", "details", "filter", "status", "type", "category", "pending", "completed", "overdue",
        "due", "sla", "date", "recent", "between", "before", "after", "manager",
        "关注", "注意", "黑名单", "查找", "搜索", "指定", "具体", "详情", "明细", "筛选", "过滤",
        "状态", "类型", "类别", "待处理", "已完成", "逾期", "到期", "日期", "最近", "经理",
        "اهتمام", "قائمة سوداء", "بحث", "محدد", "تفاصيل", "تصفية", "حالة", "نوع", "فئة", "تاريخ",
    }
)
_OBSERVATION_FALLBACK_MAX_FACTS = 8
_OBSERVATION_FALLBACK_MAX_FACT_CHARS = 300
_OBSERVATION_FALLBACK_MAX_FACT_BYTES = 2_400
def _observation_scalar_strings(value: Any, *, limit: int = 300) -> tuple[str, ...]:
    values: list[str] = []

    def visit(item: Any) -> None:
        if len(values) >= limit:
            return
        if isinstance(item, str):
            text = re.sub(r"\s+", " ", item).strip()
            if text:
                values.append(text[:1_000])
        elif isinstance(item, (int, float)) and not isinstance(item, bool):
            values.append(str(item))
        elif isinstance(item, dict):
            for child in item.values():
                visit(child)
        elif isinstance(item, (list, tuple)):
            for child in item:
                visit(child)

    visit(value)
    return tuple(values)


def _observation_fallback_intent(
    question: str,
    answer_shape: Literal["overview", "count", "list", "attention", "due", "detail", "unspecified"] | None = None,
) -> Literal["list", "overview"] | None:
    normalized = re.sub(r"[^\w\u3400-\u9fff\u0621-\u064a]+", " ", str(question or "").casefold())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized or re.search(r"\d", normalized):
        return None
    answer_shape = answer_shape or reader_answer_shape(question)
    if answer_shape not in {"list", "overview"}:
        return None
    if answer_shape == "list" and "show" in set(re.findall(r"[a-z]+", normalized)) and not re.search(
        r"\b(?:list|tasks|applications|licenses|records|items)\b",
        normalized,
    ):
        return None
    latin_words = set(re.findall(r"[a-z]+", normalized))
    disallowed_terms = (
        _OBSERVATION_FALLBACK_DISALLOWED_TERMS - {"status", "状态", "حالة"}
        if answer_shape == "overview"
        else _OBSERVATION_FALLBACK_DISALLOWED_TERMS
    )
    if any(
        (" " in term and term in normalized)
        or (term.isascii() and term in latin_words)
        or (not term.isascii() and term in normalized)
        for term in disallowed_terms
    ):
        return None
    return answer_shape


def _data_observation_control(value: str) -> bool:
    normalized = value.casefold()
    if not re.search(r"\d", normalized) or not any(character.isalpha() for character in normalized):
        return False
    return not any(
        marker in normalized
        for marker in ("next", "previous", "page ", "last day", "last week", "last month", "loading", "please wait")
    )


def _observation_has_error_state(observation: Any) -> bool:
    if not isinstance(observation, dict):
        return False
    # Page-level signals are distinct from record descriptions and other regions.
    surface = _observation_scalar_strings({
        key: observation.get(key) for key in ("title", "headings", "error", "errorState", "loadingState")
    })
    error_marker = re.compile(
        r"unauthorized|forbidden|access denied|permission denied|something went wrong|"
        r"internal server error|page not found|loading|please wait|retry|"
        r"未授权|无权限|禁止访问|加载中|重试", re.IGNORECASE,
    )
    if any(
        error_marker.fullmatch(value.strip(" .!…"))
        or re.search(r"\b(?:http|error|status code)\s*:?[45]\d{2}\b", value, re.IGNORECASE)
        or re.search(r"\b[45]\d{2}\s+(?:error|unauthorized|forbidden|not found|server error)\b", value, re.IGNORECASE)
        for value in surface
    ):
        return True
    if _observation_semantic_nodes(observation):
        return False
    # Legacy, unstructured observations may consist solely of a loading/error row.
    content = _observation_scalar_strings({
        key: observation.get(key) for key in ("regions", "rowSummaries", "summaries")
    })
    return bool(content) and all(error_marker.fullmatch(value.strip(" .!…")) for value in content)


def _bounded_observation_field(observation: Any, name: str, *, limit: int) -> tuple[str, ...]:
    if not isinstance(observation, dict) or not isinstance(observation.get(name), (list, tuple)):
        return ()
    result: list[str] = []
    for value in observation[name]:
        if not isinstance(value, (str, int, float)) or isinstance(value, bool):
            continue
        text = re.sub(r"\s+", " ", str(value)).strip()[:_OBSERVATION_FALLBACK_MAX_FACT_CHARS]
        if (
            not text
            or text in result
            or any(marker in text.casefold() for marker in _KNOWLEDGE_SENTINELS)
            or any(marker in text.casefold() for marker in _EXPLICIT_EMPTY_MARKERS)
        ):
            continue
        result.append(text)
        if len(result) >= limit:
            break
    return tuple(result)


def _section_observation(section: Any) -> dict[str, Any] | None:
    if not isinstance(section, dict):
        return None
    heading = re.sub(
        r"\s+",
        " ",
        str(section.get("sourceSection") or section.get("sourceRegion") or section.get("heading") or ""),
    ).strip()[:300]
    if not heading and not (
        isinstance(section.get("nodeId"), str)
        and section["nodeId"].strip()
        and section.get("kind") in {"table", "grid", "region", "cards", "metrics"}
    ):
        return None
    normalized = {
        "heading": heading,
        "sourceSection": heading,
        "headings": [heading] if heading else [],
        "columnHeaders": list(section.get("columnHeaders")) if isinstance(section.get("columnHeaders"), (list, tuple)) else [],
        "rowSummaries": list(section.get("rowSummaries")) if isinstance(section.get("rowSummaries"), (list, tuple)) else [],
        "controls": list(section.get("controls")) if isinstance(section.get("controls"), (list, tuple)) else [],
        "summaries": list(section.get("summaries")) if isinstance(section.get("summaries"), (list, tuple)) else [],
        "cardSummaries": list(section.get("cardSummaries")) if isinstance(section.get("cardSummaries"), (list, tuple)) else [],
        "selectedState": str(section.get("selectedState") or "")[:300],
        "emptyState": str(section.get("emptyState") or "")[:300],
    }
    for name, max_length in (("nodeId", 120), ("kind", 40), ("parentRef", 120)):
        value = str(section.get(name) or "").strip()
        if value:
            normalized[name] = value[:max_length]
    if isinstance(section.get("rowFields"), list):
        normalized["rowFields"] = [
            {str(key)[:120]: str(value)[:300] for key, value in list(row.items())[:12] if isinstance(value, str)}
            for row in section["rowFields"][:4] if isinstance(row, dict)
        ]
    return normalized


def _observation_semantic_nodes(observation: Any) -> tuple[dict[str, Any], ...]:
    """Return bounded semantic nodes without merging same-heading siblings."""

    if not isinstance(observation, dict):
        return ()
    nodes: list[dict[str, Any]] = []
    for collection_name in ("sectionSummaries", "regionSummaries"):
        raw_nodes = observation.get(collection_name)
        if not isinstance(raw_nodes, (list, tuple)):
            continue
        for raw_node in raw_nodes[:12]:
            node = _section_observation(raw_node)
            if node is not None:
                nodes.append(node)
    return tuple(nodes)


def _semantic_node_evidence_signature(
    node: dict[str, Any],
    nodes_by_id: dict[str, dict[str, Any]],
) -> tuple[Any, ...]:
    """Describe bounded business evidence while ignoring semantic node identity."""

    def normalized_text(value: Any) -> str:
        return re.sub(r"\s+", " ", str(value or "")).strip().casefold()

    parent = nodes_by_id.get(normalized_text(node.get("parentRef")))
    values = tuple(
        (
            field_name,
            tuple(
                normalized_text(value)
                for value in _bounded_observation_field(node, field_name, limit=20)
            ),
        )
        for field_name in (
            "columnHeaders",
            "rowSummaries",
            "controls",
            "summaries",
            "cardSummaries",
        )
    )
    return (
        normalized_text(node.get("kind")),
        normalized_text(node.get("heading")),
        normalized_text(node.get("sourceSection")),
        normalized_text(node.get("selectedState")),
        normalized_text(node.get("emptyState")),
        normalized_text(parent.get("kind")) if parent else "",
        normalized_text(parent.get("heading")) if parent else "",
        normalized_text(parent.get("selectedState")) if parent else "",
        values,
    )


def _structured_observation_sections(observation: Any) -> tuple[dict[str, Any], ...]:
    """Merge bounded evidence by semantic section without flattening the page."""

    if not isinstance(observation, dict):
        return ()
    merged: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for collection_name in ("sectionSummaries", "regionSummaries"):
        raw_sections = observation.get(collection_name)
        if not isinstance(raw_sections, (list, tuple)):
            continue
        for raw_section in raw_sections[:12]:
            section = _section_observation(raw_section)
            if section is None:
                continue
            key = re.sub(
                r"[^a-z0-9\u3400-\u9fff\u0621-\u064a]+",
                " ",
                section["heading"].casefold(),
            ).strip()
            if not key:
                continue
            if key not in merged:
                merged[key] = section
                if section.get("nodeId"):
                    merged[key]["nodeRefs"] = [section["nodeId"]]
                order.append(key)
                continue
            target = merged[key]
            for field_name in ("columnHeaders", "rowSummaries", "controls", "summaries", "cardSummaries"):
                values = target[field_name]
                for value in section[field_name]:
                    if value not in values:
                        values.append(value)
            if not target["emptyState"]:
                target["emptyState"] = section["emptyState"]
            if not target["selectedState"]:
                target["selectedState"] = section["selectedState"]
            node_id = str(section.get("nodeId") or "")
            if node_id and node_id not in target.setdefault("nodeRefs", []):
                target["nodeRefs"].append(node_id)
    return tuple(merged[key] for key in order)


def _matching_observation_section(
    observation: Any,
    *,
    heading: str,
    exclude: tuple[str, ...] = (),
) -> dict[str, Any] | None:
    if not isinstance(observation, dict):
        return None
    expected = heading.casefold()
    for section in _structured_observation_sections(observation):
        normalized = section["heading"].casefold()
        if expected in normalized and not any(term.casefold() in normalized for term in exclude):
            return section
    return None


def _observation_evidence_for_section(observation: Any, section_name: str) -> dict[str, Any] | None:
    """Resolve the most specific bounded evidence node for a visible section."""

    nodes = _observation_semantic_nodes(observation)
    if not nodes:
        return observation if isinstance(observation, dict) else None
    nodes_by_id = {
        str(node.get("nodeId") or "").casefold(): node
        for node in nodes
        if node.get("nodeId")
    }

    def with_parent_state(node: dict[str, Any]) -> dict[str, Any]:
        parent = nodes_by_id.get(str(node.get("parentRef") or "").casefold())
        if parent is None or node.get("selectedState"):
            return node
        selected_state = str(parent.get("selectedState") or "").strip()
        return {**node, "selectedState": selected_state} if selected_state else node

    if not section_name.strip():
        return with_parent_state(nodes[0]) if len(nodes) == 1 else None
    expected = re.sub(r"\s+", " ", section_name).strip().casefold()
    exact_node = nodes_by_id.get(expected)
    if exact_node is not None:
        return with_parent_state(exact_node)
    matches = [
        section
        for section in nodes
        if section["heading"] and (
            expected == section["heading"].casefold()
            or expected in section["heading"].casefold()
            or section["heading"].casefold() in expected
        )
    ]
    if len(matches) == 1:
        return with_parent_state(matches[0])
    table_matches = [
        node
        for node in matches
        if str(node.get("kind") or "").casefold() == "table"
        and (
            _bounded_observation_field(node, "rowSummaries", limit=1)
            or _bounded_observation_field(node, "cardSummaries", limit=1)
            or _raw_observation_has_empty_state(node)
        )
    ]
    if len(table_matches) == 1:
        # A region and its only table often share a visible heading. The table is
        # the narrower evidence bundle for row/detail answers.
        return with_parent_state(table_matches[0])
    if (
        matches
        and len({str(node.get("heading") or "").casefold() for node in matches}) == 1
        and len({_semantic_node_evidence_signature(node, nodes_by_id) for node in matches}) == 1
    ):
        return with_parent_state(matches[0])
    if matches and all(not node.get("nodeId") and not node.get("parentRef") for node in matches):
        legacy_matches = [
            section
            for section in _structured_observation_sections(observation)
            if expected == section["heading"].casefold()
            or expected in section["heading"].casefold()
            or section["heading"].casefold() in expected
        ]
        return legacy_matches[0] if len(legacy_matches) == 1 else None
    if not matches:
        empty_tables = [
            node
            for node in nodes
            if str(node.get("kind") or "").casefold() == "table"
            and _raw_observation_has_empty_state(node)
        ]
        if len(empty_tables) == 1:
            # A bounded scan can retain a table while dropping its parent region.
            # The explicit empty state remains valid evidence for a no-data result.
            return with_parent_state(empty_tables[0])
    return None


def _observation_selected_state_matches(claim: str, node: dict[str, Any]) -> bool:
    claimed = re.sub(r"\s+", " ", claim).strip().casefold()
    actual = re.sub(r"\s+", " ", str(node.get("selectedState") or "")).strip().casefold()
    if claimed == actual:
        return True
    controls = {re.sub(r"\s+", " ", value).strip().casefold()
                for value in _bounded_observation_field(node, "controls", limit=20)}
    badge = re.fullmatch(r"(.+?)\s+\d+", actual)
    return bool(actual in controls and badge and claimed == badge.group(1))


def _observation_evidence_for_result(observation: Any, result: ReaderResult) -> dict[str, Any] | None:
    """Bind a source within its declared region and observed view, never globally by a tab label."""

    def normalized(value: Any) -> str:
        return re.sub(r"\s+", " ", str(value or "")).strip().casefold()

    nodes = _observation_semantic_nodes(observation)
    source = normalized(result.source_section or result.section)
    section = normalized(result.section)
    state = normalized(result.selected_state)
    nodes_by_id = {normalized(node.get("nodeId")): node for node in nodes if node.get("nodeId")}
    roots = [node for node in nodes if section and section in {
        normalized(node.get("nodeId")), normalized(node.get("heading")),
    }]
    if not roots:
        if result.status != "no_data" and nodes_by_id and source not in nodes_by_id and not any(
            normalized(node.get("heading")) == source for node in nodes
        ):
            return None
        return _observation_evidence_for_section(observation, result.source_section or result.section)

    root_ids = {normalized(node.get("nodeId")) for node in roots if node.get("nodeId")}

    def in_region(node: dict[str, Any]) -> bool:
        if node in roots:
            return True
        parent = normalized(node.get("parentRef"))
        seen: set[str] = set()
        while parent and parent not in seen:
            if parent in root_ids:
                return True
            seen.add(parent)
            parent = normalized(nodes_by_id.get(parent, {}).get("parentRef"))
        return False

    def with_state(node: dict[str, Any]) -> dict[str, Any]:
        parent = nodes_by_id.get(normalized(node.get("parentRef")), {})
        return {**node, "selectedState": node.get("selectedState") or parent.get("selectedState") or ""}

    scoped = [with_state(node) for node in nodes if in_region(node)]
    if source in nodes_by_id:
        return next((node for node in scoped if normalized(node.get("nodeId")) == source), None)
    # A control can name the source only when it is the observed active view in
    # the declared region. An unrelated same-name heading is not an alternative.
    candidates = [node for node in scoped if source == normalized(node.get("heading"))
                  or node.get("selectedState") and _observation_selected_state_matches(source, node)]
    if state:
        matching_state = [node for node in candidates if _observation_selected_state_matches(state, node)]
        if not matching_state and any(node.get("selectedState") for node in candidates):
            return None
        candidates = matching_state or [node for node in candidates if not node.get("selectedState")]
    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        return None
    if len({normalized(node.get("heading")) for node in candidates}) != 1:
        return None
    return _observation_evidence_for_section(
        {"sectionSummaries": candidates}, str(candidates[0].get("heading") or ""),
    )


_SECTION_INFERENCE_STOP_WORDS = frozenset({
    "about", "anything", "current", "dashboard", "display", "give", "have", "how", "item", "items",
    "list", "many", "overview", "page", "please", "section", "show", "the", "this", "what", "with",
    "我的", "当前", "显示", "查看", "页面", "总览", "概览", "哪些", "什么", "多少", "几个",
})


def _section_match_tokens(value: Any) -> frozenset[str]:
    normalized = re.sub(
        r"[^a-z0-9\u3400-\u9fff\u0621-\u064a]+",
        " ",
        str(value or "").casefold(),
    )
    return frozenset(
        token
        for token in normalized.split()
        if len(token) > 1 and token not in _SECTION_INFERENCE_STOP_WORDS
    )


_CATEGORY_TARGET_STOP_WORDS = frozenset({
    "detail", "details", "me", "my", "record", "records", "task", "tasks",
})


def _category_target_tokens(value: Any) -> frozenset[str]:
    return _section_match_tokens(value) - _CATEGORY_TARGET_STOP_WORDS


@dataclass(frozen=True)
class _CategoryChildRequirement:
    semantic_label: str
    control_label: str


def _category_control_requiring_children(
    question: str,
    observation: Any,
    planned_result: ReaderResult | None,
    requested_answer_shape: str,
    conversation_context: dict[str, Any] | None = None,
) -> _CategoryChildRequirement | None:
    """Identify a named collection whose parent count is not enough evidence."""

    if (
        requested_answer_shape not in {"list", "detail", "count", "overview"}
        or (planned_result is not None and planned_result.status not in {"success", "not_confirmed"})
    ):
        return None
    if requested_answer_shape == "detail" and re.search(
        r"\b(?:difference|distinction|meaning)\b|\b(?:does|do)\b.+\b(?:mean|prove)\b|区别|含义|是否意味着",
        question, re.IGNORECASE,
    ) and not re.search(r"\b(?:show|list|open|read)\b|显示|列出|打开|读取", question, re.IGNORECASE):
        return None
    previous = _bounded_conversation_context(conversation_context).get("previousIntent")
    target_sources: tuple[Any, ...] = (
        question,
        _resolved_intent_values(conversation_context).get("businessObject", ""),
        _resolved_intent_values(conversation_context).get("view", ""),
        previous.get("question") if isinstance(previous, dict) else "",
        previous.get("selectedState") if isinstance(previous, dict) else "",
        previous.get("sourceSection") if isinstance(previous, dict) else "",
        previous.get("section") if isinstance(previous, dict) else "",
    )
    candidates: dict[str, _CategoryChildRequirement] = {}
    tab_controls = observation.get("tabControls", []) if isinstance(observation, dict) else []
    current_words = frozenset(re.findall(r"\w+", question.casefold()))
    current_words |= frozenset(re.findall(r"\w+", _resolved_intent_values(conversation_context).get("view", "").casefold()))
    for control in tab_controls[:20] if isinstance(tab_controls, list) else []:
        if not isinstance(control, dict) or control.get("selected") is not False:
            continue
        label = str(control.get("name") or "").strip()[:200]
        label_words = frozenset(re.findall(r"\w+", label.casefold()))
        if label_words and label_words.issubset(current_words) and not _observation_has_category_children(observation, label):
            candidates.setdefault(label, _CategoryChildRequirement(semantic_label=label, control_label=label))
    for section in _observation_semantic_nodes(observation):
        if requested_answer_shape in {"count", "overview"}:
            break
        for control in _bounded_observation_field(section, "controls", limit=20):
            match = re.fullmatch(
                r"(.+?)\s*(?:[([]\s*)?\d+(?:[.,]\d+)?(?:\s*[)\]])?",
                control,
            )
            if match is None:
                continue
            label = match.group(1).strip()
            if label and not _observation_has_category_children(observation, label):
                candidates.setdefault(
                    control,
                    _CategoryChildRequirement(
                        semantic_label=label,
                        control_label=control,
                    ),
                )
    for source in target_sources:
        source_tokens = _category_target_tokens(source)
        if not source_tokens:
            continue
        scored = [
            (
                len(source_tokens & _category_target_tokens(candidate.semantic_label)),
                int(_category_target_tokens(candidate.semantic_label).issubset(source_tokens)),
                candidate,
            )
            for candidate in candidates.values()
            if source_tokens & _category_target_tokens(candidate.semantic_label)
        ]
        if not scored:
            continue
        best_score = max((overlap, full_match) for overlap, full_match, _ in scored)
        matches = {
            candidate
            for overlap, full_match, candidate in scored
            if (overlap, full_match) == best_score
        }
        return next(iter(matches)) if len(matches) == 1 else None
    return None


def _observation_has_category_children(observation: Any, category_label: str) -> bool:
    """Require child evidence under a matching heading or selected state."""

    category_tokens = _section_match_tokens(category_label)
    if not category_tokens:
        return False
    nodes = _observation_semantic_nodes(observation)
    nodes_by_id = {
        str(node.get("nodeId") or ""): node
        for node in nodes
        if node.get("nodeId")
    }
    for section in nodes:
        parent = nodes_by_id.get(str(section.get("parentRef") or ""))
        heading_tokens = _section_match_tokens(section.get("heading"))
        parent_heading_tokens = _section_match_tokens(parent.get("heading")) if parent else frozenset()
        selected_state = str(
            section.get("selectedState")
            or (parent.get("selectedState") if parent else "")
            or ""
        ).strip()
        selected_tokens = _section_match_tokens(selected_state)
        selected_matches = bool(selected_tokens and category_tokens.issubset(selected_tokens))
        heading_matches = bool(
            (heading_tokens and category_tokens.issubset(heading_tokens))
            or (parent_heading_tokens and category_tokens.issubset(parent_heading_tokens))
        )
        if selected_state and not selected_matches:
            continue
        if not selected_matches and not heading_matches:
            continue
        rows = _bounded_observation_field(section, "rowSummaries", limit=8)
        child_cards = tuple(
            value
            for value in _bounded_observation_field(section, "cardSummaries", limit=12)
            if re.fullmatch(r".+?\s*(?:[([]\s*)?\d+(?:[.,]\d+)?(?:\s*[)\]])?", value) is None
        )
        if rows or child_cards or _raw_observation_has_empty_state(section):
            return True
    return False


def _request_advances_category_on_current_page(
    request: PortalReadRequest | None,
    *,
    current_page: str,
    category_control: str,
) -> bool:
    """Confirm a refinement selects or expands the observed category in place."""

    if request is None:
        return False
    current_path = urlsplit(current_page).path.rstrip("/") or "/"
    request_path = urlsplit(request.start_path).path.rstrip("/") or "/"
    if request_path != current_path:
        return False
    expected_control = re.sub(r"\s+", " ", category_control).strip()
    if not expected_control:
        return False
    for action in request.actions:
        action_type = str(action.get("type") or "").strip().casefold().replace("-", "_")
        if action_type not in {"switch_tab", "expand_details"}:
            continue
        if action.get("field"):
            locator_value = action.get("field")
        elif action.get("role"):
            locator_value = action.get("name") or action.get("label")
        else:
            locator_value = action.get("section")
        actual_control = re.sub(r"\s+", " ", str(locator_value or "")).strip()
        if actual_control == expected_control:
            return True
    return False


def _infer_observation_section(
    observation: Any,
    *,
    question: str,
    expected_fields: tuple[str, ...] = (),
    answer_shape: Literal["overview", "count", "list", "attention", "due", "detail", "unspecified"] = "unspecified",
) -> str:
    """Choose one observed semantic section from question and planner field vocabulary."""

    sections = _structured_observation_sections(observation)
    if not sections:
        return ""
    question_context = str(question or "").casefold()
    expected_context = " ".join(expected_fields).casefold()
    question_tokens = _section_match_tokens(question_context)
    expected_tokens = _section_match_tokens(expected_context)
    ranked: list[tuple[int, int, str]] = []
    for index, section in enumerate(sections):
        heading = str(section.get("heading") or "").strip()
        if not heading:
            continue
        heading_normalized = re.sub(r"\s+", " ", heading).strip().casefold()
        heading_tokens = _section_match_tokens(heading)
        evidence_tokens = _section_match_tokens(
            " ".join(
                _observation_scalar_strings(
                    {
                        key: section.get(key)
                        for key in ("controls", "summaries", "cardSummaries", "columnHeaders")
                    },
                    limit=80,
                )
            )
        )
        exact_question_score = 200 if heading_normalized and heading_normalized in question_context else 0
        question_heading_score = 30 * len(question_tokens & heading_tokens)
        expected_exact_score = 40 if heading_normalized and heading_normalized in expected_context else 0
        expected_heading_score = 3 * len(expected_tokens & heading_tokens)
        evidence_score = min(8, 2 * len(question_tokens & evidence_tokens))
        due_evidence_score = 0
        if answer_shape == "due":
            evidence_text = " ".join(
                _observation_scalar_strings(
                    {
                        key: section.get(key)
                        for key in ("controls", "summaries", "cardSummaries", "rowSummaries")
                    },
                    limit=80,
                )
            ).casefold()
            if re.search(r"\bdue in\b|\boverdue\b|即将|到期|逾期|قريب|متأخر", evidence_text):
                due_evidence_score = 80
        evidence_only_allowed = answer_shape in {"overview", "count", "attention", "due"}
        if (
            exact_question_score
            or question_heading_score
            or expected_exact_score
            or expected_heading_score
            or (evidence_score and evidence_only_allowed)
            or due_evidence_score
        ):
            ranked.append((
                exact_question_score + question_heading_score + expected_exact_score
                + expected_heading_score + evidence_score + due_evidence_score,
                -index,
                heading,
            ))
    ranked.sort(reverse=True)
    if not ranked or ranked[0][0] <= 0:
        return ""
    if len(ranked) > 1 and ranked[0][0] == ranked[1][0]:
        return ""
    return ranked[0][2]


def _result_from_structured_observation(
    observation: Any,
    *,
    page: str,
    section_name: str,
    answer_shape: Literal["overview", "count", "list", "attention", "due", "detail", "unspecified"],
    scope: Literal["personal", "team", "global", "unknown"],
    question: str = "",
) -> ReaderResult | None:
    """Resolve a repeated observe when it identifies one existing section."""

    if (
        answer_shape not in {"count", "list", "attention", "due"}
    ):
        return None
    if _category_control_requiring_children(question, observation, None, answer_shape):
        return None
    section = _observation_evidence_for_section(observation, section_name)
    if section is None or _observation_has_error_state(section):
        return None
    if section.get("kind") in {"metrics", "cards"} and not _observation_no_data_allowed(observation):
        return None
    heading = str(section.get("heading") or "")
    attention_heading = reader_answer_shape(heading) == "attention" or bool(re.search(
        r"\b(?:need(?:s|ing)?|requir(?:e|es|ing))\b.{0,25}\b(?:review|action)\b|待处理|待审核|需要审核",
        heading.casefold(),
    ))
    if answer_shape == "attention" and not attention_heading:
        # Generic rows establish a list, not a business priority. Other attention
        # evidence needs semantic evaluation by the planner, not label copying.
        return None
    rows = _bounded_observation_field(section, "rowSummaries", limit=8)
    controls = _bounded_observation_field(section, "controls", limit=20)
    card_summaries = _bounded_observation_field(section, "cardSummaries", limit=20)
    summaries = _bounded_observation_field(section, "summaries", limit=20)
    if answer_shape == "count":
        candidates = tuple(
            value for value in (*summaries, *controls)
            if re.search(r"(?:^|\s)\d+(?:[.,]\d+)?\s*$", value)
        )
    elif answer_shape == "due":
        normalized_question = question.casefold()
        due_soon_only = bool(re.search(r"due soon|expir|即将|到期|قريب", normalized_question)) and not bool(
            re.search(r"overdue|逾期|متأخر", normalized_question)
        )
        candidates = tuple(
            value for value in (*card_summaries, *controls, *rows)
            if (
                (re.search(r"\bdue in\b|即将|到期|قريب", value.casefold()) if due_soon_only else
                 re.search(r"\bdue\b|\boverdue\b|即将|到期|逾期|قريب|متأخر", value.casefold()))
            )
        )
    elif answer_shape in {"list", "attention"}:
        category_controls = tuple(
            value for value in controls
            if re.search(r"(?:^|\s)\d+(?:[.,]\d+)?\s*$", value)
        )
        non_count_controls = tuple(
            value for value in controls
            if _data_observation_control(value)
            and not re.search(r"(?:^|\s)\d+(?:[.,]\d+)?\s*$", value)
        )
        selected_state = str(section.get("selectedState") or "").strip()
        if answer_shape == "list" and not rows and not card_summaries and len(category_controls) >= 2:
            if not selected_state:
                return None
            requested_tokens = _section_match_tokens(question)
            matching_categories = tuple(
                value for value in category_controls
                if requested_tokens & _section_match_tokens(value)
            )
            if matching_categories and not (
                requested_tokens & _section_match_tokens(selected_state)
            ):
                return None
        candidates = rows or card_summaries or non_count_controls
        if answer_shape == "attention" and not candidates and category_controls:
            return ReaderResult(
                status="not_confirmed",
                summary="Attention counts are confirmed; the requested item details are not.",
                page=page, section=heading, source_section=str(section.get("nodeId") or heading),
                answer_shape="attention", completeness="bounded", scope=scope,
                selected_state=selected_state, facts=_bounded_fact_candidates(category_controls),
                missing=("attention_details_not_confirmed",),
            )
    else:
        candidates = rows
    facts = _bounded_fact_candidates(candidates)
    if facts:
        return ReaderResult(
            status="success",
            summary="The requested portal section was observed.",
            page=str(page)[:500],
            section=str(section.get("heading") or section_name)[:300],
            source_section=str(section.get("heading") or section_name)[:300],
            answer_shape=answer_shape,
            completeness="bounded",
            selected_state=str(section.get("selectedState") or "")[:300],
            scope=scope,
            facts=facts,
        )
    if _raw_observation_has_empty_state(section):
        if not _observation_no_data_allowed(observation):
            return None
        return ReaderResult(
            status="no_data",
            summary="The requested portal section is empty.",
            page=str(page)[:500],
            section=str(section.get("heading") or section_name)[:300],
            source_section=str(section.get("heading") or section_name)[:300],
            answer_shape=answer_shape,
            completeness="bounded",
            selected_state=str(section.get("selectedState") or "")[:300],
            scope=scope,
        )
    return None


def _raw_observation_has_empty_state(observation: Any) -> bool:
    values: list[str] = []

    def visit(item: Any) -> None:
        if isinstance(item, dict):
            for name, value in item.items():
                if _key(name) == "emptystate":
                    values.extend(text.casefold() for text in _observation_scalar_strings(value))
                elif isinstance(value, (dict, list, tuple)):
                    visit(value)
        elif isinstance(item, (list, tuple)):
            for value in item:
                visit(value)

    visit(observation)
    return any(marker in value for value in values for marker in _EXPLICIT_EMPTY_MARKERS)


def _observation_no_data_allowed(observation: Any) -> bool:
    """Do not turn an unhealthy read into a false empty result."""

    if not isinstance(observation, dict):
        return True
    health = observation.get("readHealth")
    return not (isinstance(health, dict) and health.get("healthy") is False)


def _bounded_fact_candidates(candidates: tuple[str, ...]) -> tuple[str, ...]:
    facts: list[str] = []
    fact_bytes = 0
    for candidate in candidates:
        fact = re.sub(r"\s+", " ", str(candidate)).strip()[:_OBSERVATION_FALLBACK_MAX_FACT_CHARS]
        if not fact or fact in facts:
            continue
        encoded_size = len(fact.encode("utf-8"))
        if fact_bytes + encoded_size > _OBSERVATION_FALLBACK_MAX_FACT_BYTES:
            break
        facts.append(fact)
        fact_bytes += encoded_size
        if len(facts) >= _OBSERVATION_FALLBACK_MAX_FACTS:
            break
    return tuple(facts)


def observation_fallback_result(
    question: str,
    observation: Any,
    *,
    page: str = "",
    section: str = "",
    scope: Literal["personal", "team", "global", "unknown"] = "unknown",
    answer_shape: Literal["overview", "count", "list", "attention", "due", "detail", "unspecified"] | None = None,
) -> ReaderResult | None:
    """Return exact facts from one plan-selected or unambiguous semantic region."""

    intent = _observation_fallback_intent(question, answer_shape)
    if intent is None:
        return None
    answer_shape = answer_shape or reader_answer_shape(question)
    if answer_shape in {"count", "attention", "due", "detail"}:
        return None
    if _observation_has_error_state(observation) or not _observation_no_data_allowed(observation):
        return None
    if _category_control_requiring_children(question, observation, None, answer_shape):
        return None

    source = _observation_evidence_for_section(observation, section)
    if source is None:
        return None
    headings = _bounded_observation_field(source, "headings", limit=3)
    controls = tuple(
        value for value in _bounded_observation_field(source, "controls", limit=12)
        if _data_observation_control(value)
    )
    rows = _bounded_observation_field(source, "rowSummaries", limit=4)
    summaries = (
        *(
            value for value in _bounded_observation_field(source, "cardSummaries", limit=12)
            if _data_observation_control(value)
        ),
        *(
            value for value in _bounded_observation_field(source, "summaries", limit=12)
            if _data_observation_control(value)
        ),
    )
    if intent == "list" and not rows:
        if _structured_observation_sections(observation) and _raw_observation_has_empty_state(source):
            if not _observation_no_data_allowed(observation):
                return None
            return ReaderResult(
                status="no_data",
                summary="The requested portal section is empty.",
                page=str(page)[:500],
                section=str(source.get("heading") or section)[:300],
                source_section=str(source.get("heading") or section)[:300],
                answer_shape="list",
                completeness="bounded",
                selected_state=str(source.get("selectedState") or "")[:300],
                scope=scope,
            )
        return None
    if intent == "overview" and not controls and not summaries:
        if _raw_observation_has_empty_state(source):
            if not _observation_no_data_allowed(observation):
                return None
            return ReaderResult(
                status="no_data",
                summary="The requested portal section is empty.",
                page=str(page)[:500],
                section=str(source.get("heading") or section)[:300],
                source_section=str(source.get("heading") or section)[:300],
                answer_shape="overview",
                completeness="bounded",
                selected_state=str(source.get("selectedState") or "")[:300],
                scope=scope,
            )
        return None
    if intent == "list":
        candidates = rows
    else:
        count_controls = tuple(
            value for value in controls
            if re.search(r"(?:^|\s)\d+(?:[.,]\d+)?\s*$", value)
        )
        requested_tokens = _section_match_tokens(question)
        matching_count_controls = tuple(
            value for value in count_controls
            if requested_tokens & _section_match_tokens(value)
        )
        if len(matching_count_controls) == 1:
            candidates = matching_count_controls
        else:
            candidates = (*summaries, *(count_controls if len(count_controls) >= 2 else controls))
    facts = _bounded_fact_candidates(tuple(candidates))
    if not facts:
        return None
    return ReaderResult(
        status="success",
        summary="The bounded portal observation answered the generic request.",
        page=str(page)[:500],
        section=str(source.get("heading") or section or (headings[0] if headings else ""))[:300],
        source_section=str(source.get("heading") or section or (headings[0] if headings else ""))[:300],
        answer_shape=intent,
        completeness="bounded",
        selected_state=str(source.get("selectedState") or "")[:300],
        scope=scope,
        facts=facts,
    )


def _observation_unit_supports_fact(fact: str, value: str, *, structural_tokens: frozenset[str]) -> bool:
    normalized_fact = re.sub(r"\s+", " ", fact).strip().casefold()
    normalized_value = re.sub(r"\s+", " ", value).strip().casefold()
    if not normalized_fact or not normalized_value:
        return False
    if _negative_polarity(normalized_fact) != _negative_polarity(normalized_value):
        return False
    fact_tokens = re.findall(r"[a-z][a-z0-9_-]*|\d+(?:\.\d+)?", normalized_fact)
    value_tokens = re.findall(r"[a-z][a-z0-9_-]*|\d+(?:\.\d+)?", normalized_value)
    concrete_tokens = {
        token
        for token in fact_tokens
        if token not in structural_tokens
        and (token[0].isdigit() or (len(token) >= 2 and token not in _OBSERVATION_PROSE_TERMS))
    }
    if not concrete_tokens:
        return normalized_fact in normalized_value or normalized_value in normalized_fact
    if not concrete_tokens.issubset(set(value_tokens)):
        return False
    compact_fact = [
        token for token in fact_tokens
        if token not in _OBSERVATION_PROSE_TERMS and token not in structural_tokens
    ]
    compact_value = [token for token in value_tokens if token not in _OBSERVATION_PROSE_TERMS]
    supported_numbers: set[str] = set()
    for index, token in enumerate(compact_fact):
        if not token[0].isdigit():
            continue
        windows = [
            compact_fact[start:end]
            for start in range(max(0, index - 2), index + 1)
            for end in range(index + 1, min(len(compact_fact), index + 3) + 1)
            if end - start >= 2
        ]
        if any(_contains_contiguous_tokens(compact_value, window) for window in windows):
            supported_numbers.add(token)
            continue
        translated_repeat = token in supported_numbers and re.search(
            rf"{re.escape(token)}\D{{0,40}}[（(][^）)]*{re.escape(token)}(?:\D|$)",
            fact,
        )
        if not translated_repeat:
            return False
    return True


def _table_row_supports_fact(
    fact: str,
    row: str,
    *,
    column_headers: tuple[str, ...],
) -> bool:
    """Allow an ambiguous table fallback to retain only its original row text."""

    normalized_fact = re.sub(r"\s+", " ", fact).strip().casefold()
    normalized_row = re.sub(r"\s+", " ", row).strip().casefold()
    if not normalized_fact or not normalized_row:
        return False
    # Without native rowFields, headers only describe the table shape. They
    # cannot prove which position supplied a value, so an LLM must not turn
    # them into label:value claims. Keep the raw, unlabeled row as the only
    # safe fallback.
    return normalized_fact == normalized_row


def _native_sample_value_facts(observation: Any) -> tuple[str, ...]:
    """Derive field occurrences, never a complete enum or collection total."""
    if not isinstance(observation, dict) or observation.get("kind") != "table":
        return ()
    rows = [row for row in observation.get("rowFields", [])[:4] if isinstance(row, dict)]
    if not rows:
        return ()
    facts = []
    for field in list(rows[0])[:12]:
        values = list(dict.fromkeys(row[field] for row in rows if isinstance(row.get(field), str)))
        if not values or len(values) > 4:
            continue
        fact = f"Values of {field} in the bounded row sample: " + json.dumps(values, ensure_ascii=False)
        if len(fact) <= 400:
            facts.append(fact)
    return tuple(facts)


def _observation_supports_fact(fact: str, observation: Any) -> bool:
    """Require a fact's labels, values, polarity and numbers in one observed unit.

    Natural-language glue may be translated or paraphrased, while statuses,
    labels, dates and counts must come directly from the bounded observation.
    """

    if not fact.strip():
        return False
    if isinstance(observation, dict) and str(observation.get("kind") or "").casefold() == "table":
        if fact in _native_sample_value_facts(observation):
            return True
        if observation.get("rowFields") and _structured_row_supports_fact(fact, observation):
            return True
        if any(_observation_unit_supports_fact(fact, value, structural_tokens=frozenset())
               for value in _bounded_observation_field(observation, "summaries", limit=4)):
            return True
        column_headers = _bounded_observation_field(observation, "columnHeaders", limit=20)
        return any(
            _table_row_supports_fact(fact, row, column_headers=column_headers)
            for row in _bounded_observation_field(observation, "rowSummaries", limit=12)
        )
    values = _observation_scalar_strings(observation)
    if not values:
        return False
    structural_values = (
        str(observation.get("heading") or "") if isinstance(observation, dict) else "",
        str(observation.get("sourceSection") or "") if isinstance(observation, dict) else "",
        *_bounded_observation_field(observation, "headings", limit=3),
        *_bounded_observation_field(observation, "columnHeaders", limit=20),
        *_bounded_observation_field(observation, "labels", limit=20),
    )
    structural_tokens = frozenset(
        token
        for value in structural_values
        for token in re.findall(r"[a-z][a-z0-9_-]*", value.casefold())
    )
    if any(
        _observation_unit_supports_fact(fact, value, structural_tokens=structural_tokens)
        for value in values
    ):
        return True
    return False


def _unconfirmed_observation_fact(fact: str) -> str:
    normalized = re.sub(r"\s+", " ", fact).strip()
    return f"unconfirmed_fact: {normalized}"[:500]


def _structured_row_supports_fact(fact: str, observation: dict[str, Any]) -> bool:
    def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        if len({key for key, _ in pairs}) != len(pairs):
            raise ValueError("duplicate_field")
        return dict(pairs)

    try:
        fields = json.loads(fact, object_pairs_hook=unique_object)
    except (TypeError, ValueError):
        return False
    if not isinstance(fields, dict) or not fields or not all(isinstance(value, str) for value in fields.values()):
        return False
    return sum(
        all(key in row and value == row[key] for key, value in fields.items())
        for row in observation.get("rowFields", []) if isinstance(row, dict)
    ) == 1


def _permission_result_scope(context: UserPermissionContext) -> Literal["personal", "team", "global", "unknown"]:
    values = {re.sub(r"[^a-z]", "", value.casefold()) for value in _strings(context.data_scope, limit=20)}
    matches: set[str] = set()
    if values.intersection({"personal", "self", "own"}):
        matches.add("personal")
    if values.intersection({"team", "department"}):
        matches.add("team")
    if values.intersection({"global", "all"}):
        matches.add("global")
    if matches == {"personal"}:
        return "personal"
    if matches == {"team"}:
        return "team"
    if matches == {"global"}:
        return "global"
    return "unknown"


def _explicit_observed_filter(question: str, observation: Any) -> str:
    """Recognize one literal observed category, not a business-specific status map."""
    if not isinstance(observation, dict) or not observation.get("filterControls"):
        return ""
    question_text = re.sub(r"\s+", " ", question).strip().casefold()
    if re.search(r"\b(not|except|excluding|without|compare|versus)\b|不要|排除|不包括|对比", question_text):
        return ""
    selected_tabs = {str(node.get("selectedState") or "").casefold()
                     for node in _observation_semantic_nodes(observation)}
    labels = [item.get("label") for item in observation.get("metrics", []) if isinstance(item, dict)]
    for control in observation.get("filterControls", []):
        if isinstance(control, dict):
            labels.extend(control.get("options") or [])
            labels.extend(control.get("selected") or [])
    matches = {str(label).strip() for label in labels if isinstance(label, str) and len(label.strip()) >= 3
               and label.strip().casefold() not in selected_tabs
               and re.search(r"(?<!\w)" + re.escape(label.strip().casefold()) + r"(?!\w)", question_text)}
    # Nested labels are not separate predicates (e.g. Review / Pending Review).
    matches = {label for label in matches if not any(label.casefold() in other.casefold() and label != other for other in matches)}
    return next(iter(matches)) if len(matches) == 1 else ""


def _filter_result_needs_read(plan: Any, observation: Any, requested_value: str, requested_shape: str = "unspecified") -> bool:
    if not requested_value or not isinstance(plan, dict) or plan.get("mode") != "observation_result":
        return False
    if requested_shape in {"count", "overview"} or requested_shape == "unspecified" and plan.get("answerShape") in {"count", "overview"}:
        return False
    result = _observation_plan_result_from_plan(plan)
    source = _observation_evidence_for_result(observation, result) if result else None
    rows = source.get("rowFields", []) if source else []
    matching_rows = [row for row in rows if isinstance(row, dict)
                     and requested_value.casefold() in {str(value).strip().casefold() for value in row.values()}]
    if matching_rows and len(matching_rows) == len(rows):
        # The read is complete; ordinary source/shape validation can repair the
        # candidate without selecting the same filter again.
        return False
    if result and result.facts:
        return not all(_structured_row_supports_fact(fact, {"rowFields": matching_rows}) for fact in result.facts)
    if plan.get("result") == "no_data":
        applied = {str(value).casefold() for value in observation.get("appliedFilters", [])}
        return requested_value.casefold() not in applied or bool(rows)
    return True


def _list_selection_review_context(plan: Any, context: dict[str, Any]) -> dict[str, Any] | None:
    """Ask for semantic review of a partial selection, never infer a row filter."""
    result = _observation_plan_result_from_plan(plan)
    if result is None or result.status != "success" or result.answer_shape != "list":
        return None
    section = _observation_evidence_for_result(context.get("portalObservation"), result)
    if not section or not section.get("selectedState"):
        return None
    rows = [row for row in section.get("rowFields", [])[:4] if isinstance(row, dict)]
    selected: set[int] = set()
    for fact in result.facts:
        matches = [
            index for index, row in enumerate(rows)
            if _structured_row_supports_fact(fact, {"rowFields": [row]})
        ]
        if len(matches) != 1:
            return None
        selected.add(matches[0])
    if not 0 < len(selected) < len(rows):
        return None
    return {
        **context,
        "planningDirective": {
            **(context.get("planningDirective") or {}),
            "listSelectionReview": True,
            "reason": "selected_view_rows_were_omitted",
            "observedRowCount": len(rows),
            "selectedRowCount": len(selected),
            "priorSelection": bounded_json(plan, max_depth=3, max_items=24, max_string=500),
        },
    }


def observation_result_from_plan(
    plan: Any,
    observation: Any,
    *,
    verified_scope: Literal["personal", "team", "global", "unknown"] = "unknown",
    observed_page: str = "",
    permitted_paths: tuple[str, ...] = (),
) -> ReaderResult | None:
    """Validate a post-observe LLM result against permission and bounded evidence."""

    result = _observation_plan_result_from_plan(plan)
    if result is None:
        return None
    result_page = (urlsplit(result.page).path.rstrip("/") or "/") if result.page else ""
    actual_page = (urlsplit(observed_page).path.rstrip("/") or "/") if observed_page else ""
    if result_page and actual_page and result_page != actual_page:
        return None
    if result_page and permitted_paths and not any(
        permission_path_matches(result_page, allowed) for allowed in permitted_paths
    ):
        return None
    source_ref = result.source_section or result.section
    scoped_observation = _observation_evidence_for_result(observation, result)
    if scoped_observation is not None and _observation_has_error_state(scoped_observation):
        return None
    actual_selected_state = ""
    if scoped_observation is not None:
        actual_selected_state = re.sub(
            r"\s+",
            " ",
            str(scoped_observation.get("selectedState") or ""),
        ).strip()[:300]
    claimed_selected_state = re.sub(r"\s+", " ", result.selected_state).strip()
    if actual_selected_state and claimed_selected_state and (
        not _observation_selected_state_matches(claimed_selected_state, scoped_observation)
    ):
        return None
    if scoped_observation is not None and scoped_observation.get("nodeId"):
        result = replace(result, source_section=str(scoped_observation["nodeId"]))
    if result.status == "not_confirmed" and not result.facts:
        if source_ref and scoped_observation is None:
            return None
        return ReaderResult(
            status=result.status,
            summary=result.summary,
            page=observed_page or result.page,
            section=result.section,
            source_section=result.source_section or result.section,
            answer_shape=result.answer_shape,
            completeness=result.completeness,
            selected_state=actual_selected_state,
            scope=verified_scope,
            missing=result.missing,
        )
    if scoped_observation is None:
        return None
    if scoped_observation.get("kind") in {"metrics", "cards"} and not _observation_no_data_allowed(observation):
        return None
    if result.status in {"success", "not_confirmed"}:
        sample_facts = _native_sample_value_facts(scoped_observation)
        uses_sample_values = any(fact in sample_facts for fact in result.facts)
        if uses_sample_values and (result.answer_shape not in {"detail", "overview"}
                                   or not _observation_no_data_allowed(observation)):
            return None
        supported: list[str] = []
        unsupported: list[str] = []
        structured_list = result.answer_shape == "list" and bool(scoped_observation.get("rowFields"))
        fact_observation = scoped_observation
        if result.answer_shape == "count" and scoped_observation.get("kind") in {"table", "grid"}:
            # Visible record values and row counts cannot establish a collection total.
            fact_observation = {key: scoped_observation.get(key, []) for key in ("summaries", "cardSummaries")}
        for fact in result.facts:
            fact_supported = (
                _structured_row_supports_fact(fact, scoped_observation)
                if structured_list else _observation_supports_fact(fact, fact_observation)
            )
            (supported if fact_supported else unsupported).append(fact)
        supported_facts = tuple(supported)
        if not supported_facts and result.status == "success":
            return None
        visible_rows = _bounded_observation_field(scoped_observation, "rowSummaries", limit=8)
        if supported_facts and result.answer_shape == "list" and visible_rows and not structured_list:
            column_headers = _bounded_observation_field(scoped_observation, "columnHeaders", limit=20)
            row_fact_supported = any(
                _table_row_supports_fact(fact, row, column_headers=column_headers)
                if str(scoped_observation.get("kind") or "").casefold() == "table"
                else _observation_supports_fact(fact, {**scoped_observation, "rowSummaries": [row]})
                for fact in supported_facts
                for row in visible_rows
            )
            if not row_fact_supported:
                # A table schema is useful context, but it is not a task list.
                # Let the bounded row fallback answer instead of returning headers
                # after the planner collapsed several rows into a prose summary.
                return None
        missing = tuple(
            [*result.missing, *(_unconfirmed_observation_fact(fact) for fact in unsupported)][:10]
        )
        count_source = {
            "heading": str(scoped_observation.get("heading") or ""),
            "controls": [
                value for value in (
                    *_bounded_observation_field(scoped_observation, "controls", limit=20),
                    *_bounded_observation_field(scoped_observation, "summaries", limit=20),
                ) if re.search(r"(?:^|\s)\d+(?:[.,]\d+)?\s*$", value)
            ],
        }
        count_only_attention = result.answer_shape == "attention" and bool(supported_facts) and all(
            _observation_supports_fact(fact, count_source) for fact in supported_facts
        )
        if count_only_attention:
            missing = tuple(dict.fromkeys(("attention_details_not_confirmed", *missing)))[:10]
        result = ReaderResult(
            status="not_confirmed" if unsupported or count_only_attention else result.status,
            summary=result.summary,
            page=result.page,
            section=result.section,
            source_section=result.source_section or result.section,
            answer_shape=result.answer_shape,
            completeness=result.completeness,
            selected_state=actual_selected_state,
            scope=result.scope,
            facts=supported_facts,
            workflow_state=result.workflow_state,
            missing=missing,
        )
        if result.answer_shape == "list" or uses_sample_values:
            result = replace(result, completeness="bounded")
    elif result.status == "no_data":
        if not _observation_no_data_allowed(observation):
            return None
        evidence_text = " ".join(_observation_scalar_strings(scoped_observation)).casefold()
        if not any(marker in evidence_text for marker in _EXPLICIT_EMPTY_MARKERS):
            return None

    return ReaderResult(
        status=result.status,
        summary="The portal observation answered the request." if result.status == "success" else result.summary,
        page=observed_page or result.page,
        section=result.section,
        source_section=result.source_section or result.section,
        answer_shape=result.answer_shape,
        completeness=result.completeness,
        selected_state=actual_selected_state,
        scope=verified_scope,
        facts=result.facts,
        workflow_state=result.workflow_state,
        missing=result.missing,
    )


def _reader_result_from_tool(tool_result: dict[str, Any]) -> ReaderResult:
    if not tool_result.get("ok"):
        code = str(tool_result.get("code") or "")
        status: ReaderStatus = "no_permission" if code in {"permission_denied", "page_not_permitted", "umc_token_required"} else "load_failed"
        return ReaderResult(status=status, summary="The Admin Portal could not be read for this request.", missing=(code or "portal_read_failed",))
    raw = tool_result.get("result")
    payload = bounded_json(raw, max_depth=5, max_items=100, max_string=1_000)
    if not isinstance(payload, dict):
        return ReaderResult(status="not_confirmed", summary="The Admin Portal returned an unrecognized result.")
    requested_status = str(payload.get("result") or payload.get("status") or "").strip()
    status: ReaderStatus = requested_status if requested_status in READER_STATUSES else "not_confirmed"  # type: ignore[assignment]
    facts_value = payload.get("facts") or payload.get("items") or payload.get("data") or []
    if not isinstance(facts_value, list):
        facts_value = [facts_value] if facts_value else []
    facts: tuple[str, ...] = tuple(
        (
            str(item)[:500]
            if isinstance(item, str)
            else json.dumps(bounded_json(item, max_depth=3, max_items=20, max_string=500), ensure_ascii=False)[:500]
        )
        for item in facts_value[:20]
    )
    if not requested_status:
        status = "success" if facts else "no_data"
    summary = str(payload.get("summary") or payload.get("message") or "").strip()
    if not summary:
        summary = "The requested portal data was found." if status == "success" else "No matching portal data was found." if status == "no_data" else "The portal result could not be confirmed."
    answer_shape = str(payload.get("answerShape") or "unspecified")
    if answer_shape not in {"overview", "count", "list", "attention", "due", "detail", "unspecified"}:
        answer_shape = "unspecified"
    completeness = str(payload.get("completeness") or "unknown")
    if completeness not in {"bounded", "complete", "unknown"}:
        completeness = "unknown"
    return ReaderResult(
        status=status,
        summary=summary[:2_000],
        page=str(payload.get("page") or next(iter(_strings(payload.get("pagesVisited") or (), limit=1)), ""))[:500],
        section=str(payload.get("section") or "")[:300],
        source_section=str(payload.get("sourceSection") or payload.get("section") or "")[:300],
        answer_shape=answer_shape,  # type: ignore[arg-type]
        completeness=completeness,  # type: ignore[arg-type]
        selected_state=str(payload.get("selectedState") or "")[:300],
        scope=str(payload.get("scope") or "unknown") if str(payload.get("scope") or "unknown") in {"personal", "team", "global", "unknown"} else "unknown",  # type: ignore[arg-type]
        facts=facts,
        workflow_state=str(payload.get("workflowState") or payload.get("workflow_state") or "")[:500],
        missing=_strings(payload.get("missing") or payload.get("limitations") or (), limit=10),
    )


def _align_result_to_answer_shape(
    result: ReaderResult,
    question: str,
    conversation_context: dict[str, Any] | None = None,
) -> ReaderResult:
    """Attach presentation guidance without deleting already verified facts."""

    if _bounded_conversation_context(conversation_context).get("resolvedIntent"):
        # A declared current intent must be checked, not copied onto the evidence.
        return result
    answer_shape = reader_answer_shape(question, conversation_context)
    return replace(
        result,
        answer_shape=answer_shape if answer_shape != "unspecified" else result.answer_shape,
    )


def _reconcile_verified_answer_shape(result: ReaderResult, expected_shape: str, question: str) -> ReaderResult:
    """Check narrow content equivalence; retain other verified evidence as partial."""
    if (
        result.status == "success" and result.answer_shape == "list" and expected_shape == "due"
        and result.facts and re.search(r"\boverdue\b|逾期|متأخر", question, re.IGNORECASE)
        and not re.search(r"\d|today|tomorrow|yesterday|\bdays?\b|\bweeks?\b|\bmonths?\b|今天|明天|昨天", question, re.IGNORECASE)
        and all(
            re.search(r"\boverdue\b|逾期|متأخر", fact, re.IGNORECASE)
            and not _negative_polarity(fact)
            and not re.search(r"\b0(?:d|\s+days?)?\s+overdue\b|\boverdue\s*:?\s*0\b", fact, re.IGNORECASE)
            for fact in result.facts
        )
    ):
        return replace(result, answer_shape="due")
    return replace(
        result, status="not_confirmed", completeness="bounded",
        missing=tuple(dict.fromkeys((*result.missing, "answer_intent_mismatch")))[:10],
    )


def _selected_view_list_fallback(
    observation: Any, *, section_name: str, question: str, page: str,
    scope: Literal["personal", "team", "global", "unknown"], conversation_context: Any,
) -> ReaderResult | None:
    """Recover a plain request for one verified view, never infer extra predicates."""
    resolved = _resolved_intent_values(conversation_context)
    if any(resolved.get(key) for key in ("dateRange", "recordIdentity")):
        return None
    section = _observation_evidence_for_section(observation, section_name)
    if section is None or not section.get("selectedState") or not section.get("rowFields"):
        return None
    if re.search(r"\d", question) or _observation_has_error_state(observation):
        return None

    def tokens(value: str) -> set[str]:
        return {word[:-1] if len(word) > 3 and word.endswith("s") else word
                for word in _section_match_tokens(value)}

    question_tokens = tokens(question)
    view_tokens = tokens(str(section["selectedState"]))
    if any(tokens(resolved.get(key, "")) - view_tokens for key in ("filter", "view")):
        return None
    if not question_tokens & view_tokens:
        return None
    request_words = tokens("show list display please me the all records items tasks")
    if scope == "personal":
        request_words.add("my")
    if scope == "team":
        request_words.add("our")
    if question_tokens - view_tokens - tokens(str(section.get("heading") or "")) - request_words:
        return None
    # Native field bindings avoid reconstructing cells from flattened text.
    facts = tuple(
        json.dumps(row, ensure_ascii=False)
        for row in section["rowFields"][:4] if row
    )
    if (
        not facts or any(len(fact) > 500 for fact in facts)
        or sum(len(f.encode("utf-8")) for f in facts) > 2400
        or any(not _structured_row_supports_fact(fact, section) for fact in facts)
    ):
        return None
    return ReaderResult(
        status="success", summary="The requested selected view was observed.", page=page,
        section=str(section.get("heading") or ""), source_section=str(section.get("nodeId") or section_name),
        answer_shape="list", completeness="bounded", scope=scope,
        selected_state=str(section["selectedState"]), facts=facts,
    )


class AdminPortalReader:
    """GetUserInfo-first orchestration for one serialized Admin reader turn."""

    def __init__(
        self,
        gateway: ReaderToolGateway,
        planner: ReaderPlanner,
        *,
        portal_base_url: str,
        knowledge_folder_id: str = "",
        knowledge_top_k: int = 12,
        allowed_tools: tuple[str, ...] = ("knowledge.search", "admin.portal.read"),
        timeout_budget: ReaderTimeoutBudget | None = None,
    ) -> None:
        self.gateway = gateway
        self.planner = planner
        self.policy = ReadOnlyPortalPolicy(portal_base_url)
        self.knowledge_folder_id = knowledge_folder_id
        self.knowledge_top_k = max(1, min(int(knowledge_top_k), 32))
        self.allowed_tools = list(allowed_tools)
        self.timeout_budget = timeout_budget or ReaderTimeoutBudget()

    async def run(
        self,
        principal: Principal,
        question: str,
        *,
        conversation_context: dict[str, Any] | None = None,
    ) -> ReaderOutcome:
        trace = _ReaderQualityTrace()
        bounded_context = _bounded_conversation_context(conversation_context)
        intent_state: dict[str, Any] = {}
        trace.record(
            "question_context",
            "passed",
            input_summary={
                "questionChars": min(len(question), 10_000),
                "hasFollowUp": bool(bounded_context),
            },
            output_summary={
                "answerShape": reader_answer_shape(question, bounded_context),
                "requiresLivePortalRead": question_requires_live_portal(question),
            },
        )
        try:
            outcome = await self._run(
                principal,
                question,
                conversation_context=bounded_context,
                trace=trace,
                intent_state=intent_state,
            )
        except Exception as exc:
            trace.record(
                "reader_runtime",
                "failed",
                output_summary={"exceptionType": type(exc).__name__},
                failure_code="reader_runtime_error",
            )
            raise
        if intent_state:
            hint = parse_intent_resolution(intent_state, question, bounded_context).planner_context(bounded_context).get("sourceHint", {})
            result = replace(outcome.result, intent_context=intent_state, source_hint=hint)
            expected_shape = _resolved_intent_values({"resolvedIntent": intent_state}).get("answerShape")
            if result.status in {"success", "no_data"} and expected_shape not in {None, "unspecified", result.answer_shape}:
                result = _reconcile_verified_answer_shape(result, expected_shape, question)
            outcome = ReaderOutcome(result, {
                **outcome.audit_evidence, "intentResolution": intent_state, "result": result.public_json(),
            })
        result_status = "passed" if outcome.result.status in {"success", "no_data"} else "failed"
        failure_code = outcome.result.missing[0] if outcome.result.missing else ""
        trace.record(
            "result_classification",
            result_status,  # type: ignore[arg-type]
            input_summary={"readerStatus": outcome.result.status},
            output_summary={
                "factCount": len(outcome.result.facts),
                "missingCount": len(outcome.result.missing),
                "answerShape": outcome.result.answer_shape,
            },
            failure_code=failure_code,
        )
        root_cause = trace.root_cause(outcome.result)
        evidence = {
            **outcome.audit_evidence,
            "qualityTrace": trace.entries,
            "rootCause": root_cause,
        }
        return ReaderOutcome(outcome.result, evidence)

    async def _run(
        self,
        principal: Principal,
        question: str,
        *,
        conversation_context: dict[str, Any] | None = None,
        trace: _ReaderQualityTrace,
        intent_state: dict[str, Any],
    ) -> ReaderOutcome:
        budget = self.timeout_budget
        bounded_conversation_context = _bounded_conversation_context(conversation_context)
        list_selection_reviewed = False
        observation_grounding_reviewed = False
        intent_completion_reviewed = False
        filter_completion_reviewed = False
        observation_schema_reviewed = False
        action_contract_reviewed = False

        def plan_reader(knowledge_or_observation: dict[str, Any]):
            if bounded_conversation_context:
                return self.planner.plan_admin_portal_read(
                    question,
                    permission_context.prompt_json(),
                    knowledge_or_observation,
                    bounded_conversation_context,
                )
            return self.planner.plan_admin_portal_read(
                question,
                permission_context.prompt_json(),
                knowledge_or_observation,
            )

        def plan_summary(plan: Any) -> dict[str, Any]:
            if not isinstance(plan, dict):
                return {"planType": type(plan).__name__}
            request = plan.get("portalRequest")
            if not isinstance(request, dict):
                return {"mode": str(plan.get("mode") or ""), "hasPortalRequest": False}
            actions = request.get("actions")
            return {
                "mode": str(plan.get("mode") or ""),
                "startPath": str(request.get("startPath") or "")[:300],
                "actionCount": len(actions) if isinstance(actions, list) else 0,
                "actionTypes": [
                    str(action.get("type") or action.get("action") or "")[:80]
                    for action in actions[:12]
                    if isinstance(action, dict)
                ] if isinstance(actions, list) else [],
                "expectedFieldCount": len(request.get("expectedFields") or [])
                if isinstance(request.get("expectedFields"), list) else 0,
            }

        def request_summary(request: PortalReadRequest) -> dict[str, Any]:
            return {
                "startPath": request.start_path[:300],
                "actionCount": len(request.actions),
                "actionTypes": [str(action.get("type") or "")[:80] for action in request.actions],
                "expectedFieldCount": len(request.expected_fields),
            }

        async def plan_stage(
            knowledge_or_observation: dict[str, Any],
            *,
            timeout_stage: str,
            reason: str,
        ) -> dict[str, Any]:
            nonlocal list_selection_reviewed, intent_completion_reviewed, filter_completion_reviewed, observation_schema_reviewed, action_contract_reviewed
            started_at = time.perf_counter()
            input_summary = {
                "reason": reason,
                "knowledgeChunks": len(knowledge_or_observation.get("chunks") or [])
                if isinstance(knowledge_or_observation, dict) else 0,
                "hasPortalObservation": bool(
                    isinstance(knowledge_or_observation, dict)
                    and knowledge_or_observation.get("portalObservation") is not None
                ),
            }
            try:
                plan = await _await_reader_stage(
                    plan_reader(knowledge_or_observation),
                    stage=timeout_stage,
                    cap_seconds=budget.planner_seconds,
                    deadline=deadline,
                )
            except ReaderStageTimeout as exc:
                trace.record(
                    "planning",
                    "failed",
                    started_at=started_at,
                    input_summary=input_summary,
                    output_summary={"timeoutKind": "total" if exc.total_budget else "stage"},
                    failure_code="reader_total_timeout" if exc.total_budget else "planner_timeout",
                )
                raise
            except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                trace.record(
                    "planning",
                    "failed",
                    started_at=started_at,
                    input_summary=input_summary,
                    output_summary={"exceptionType": type(exc).__name__,
                                    "validationCode": str(getattr(exc, "reader_validation_code", ""))[:80],
                                    "validationDetails": getattr(exc, "reader_validation_details", [])},
                    failure_code="planner_error",
                )
                raise
            trace.record(
                "planning",
                "passed",
                started_at=started_at,
                input_summary=input_summary,
                output_summary=plan_summary(plan),
            )
            observation = knowledge_or_observation.get("portalObservation")
            requested_filter = _explicit_observed_filter(question, observation)
            filter_controls = observation.get("filterControls", []) if isinstance(observation, dict) else []
            observed_filter_actions = [
                {"controlLabel": control.get("label"), "action": {
                    "type": "filter", "selector": control["selector"], "value": requested_filter,
                }} for control in filter_controls if isinstance(control, dict)
                and control.get("role") == "combobox" and control.get("selector") and requested_filter
            ]
            request_candidate = portal_read_request_from_plan(plan)
            invalid_filter_actions = request_candidate and any(
                (action.get("type") in {"apply_filter", "reset_filter", "show_filter"}
                 and action.get("role") not in {None, "button"})
                or (action.get("type") == "show_filter" and any(
                    str(control.get("label") or "").casefold() == str(action.get("field") or action.get("name") or action.get("label") or "").casefold()
                    for control in filter_controls if isinstance(control, dict) and control.get("role") == "combobox"
                ))
                for action in request_candidate.actions
            )
            if invalid_filter_actions:
                if not action_contract_reviewed:
                    action_contract_reviewed = True
                    return await plan_stage(
                        {**knowledge_or_observation, "planningDirective": {
                            **knowledge_or_observation.get("planningDirective", {}),
                            "filterActionContractReview": True, "priorCandidate": bounded_json(plan),
                            "observedFilterActions": observed_filter_actions,
                        }}, timeout_stage=timeout_stage, reason="filter_action_contract_review",
                    )
                return {"mode": "observation_result" if observation is not None else "knowledge_only",
                        "result": "not_confirmed", "facts": [], "missing": ["invalid_filter_action_contract"]}
            if _filter_result_needs_read(plan, observation, requested_filter, reader_answer_shape(question, bounded_conversation_context)):
                trace.record("filter_completion", "degraded", input_summary={"requestedValue": requested_filter},
                             output_summary={"decision": "read_required"}, failure_code="requested_filter_not_confirmed")
                if not filter_completion_reviewed:
                    filter_completion_reviewed = True
                    matching_controls = [control for control in filter_controls if isinstance(control, dict)
                                         and control.get("filterSurface") is True
                                         and control.get("role") == "combobox" and control.get("selector")
                                         and requested_filter.casefold() in {str(value).casefold() for value in control.get("options", [])}]
                    prior_read = knowledge_or_observation.get("priorPortalRead") or {}
                    if len(matching_controls) == 1 and prior_read.get("startPath"):
                        # A literal user condition and a unique observed option
                        # determine a read action, not a business answer.
                        return {"mode": "portal_read", "portalRequest": {
                            "startPath": prior_read["startPath"],
                            "actions": [{"type": "filter", "selector": matching_controls[0]["selector"], "value": requested_filter}],
                            "expectedFields": [],
                        }}
                    return await plan_stage(
                        {**knowledge_or_observation, "planningDirective": {
                            **knowledge_or_observation.get("planningDirective", {}),
                            "filterCompletionReview": True,
                            "requestedFilterValues": [requested_filter],
                            "observedFilterActions": observed_filter_actions,
                            "priorCandidate": bounded_json(plan),
                        }}, timeout_stage=timeout_stage, reason="requested_filter_completion_review",
                    )
                return {"mode": "observation_result", "result": "not_confirmed", "facts": [],
                        "answerShape": "list", "missing": ["requested_filter_not_confirmed"]}
            if (observation is not None and plan.get("mode") == "observation_result"
                    and _observation_plan_result_from_plan(plan) is None):
                if not observation_schema_reviewed:
                    observation_schema_reviewed = True
                    return await plan_stage(
                        {**knowledge_or_observation, "planningDirective": {
                            **knowledge_or_observation.get("planningDirective", {}),
                            "observationSchemaReview": True, "priorCandidate": bounded_json(plan),
                        }}, timeout_stage=timeout_stage, reason="invalid_observation_schema_review",
                    )
                return {"mode": "observation_result", "result": "not_confirmed", "facts": [],
                        "missing": ["invalid_observation_schema"]}
            expected_shape = _resolved_intent_values(bounded_conversation_context).get("answerShape") or (
                reader_answer_shape(question, bounded_conversation_context) if requested_filter else None
            )
            if expected_shape is None and reader_answer_shape(question) == "count":
                expected_shape = "count"
            elif (
                expected_shape is None and not bounded_conversation_context
                and reader_answer_shape(question) == "list"
                and plan.get("mode") == "observation_result"
                and plan.get("answerShape") in {"overview", "count"}
            ):
                expected_shape = "list"
            if (
                not intent_completion_reviewed and expected_shape not in {None, "unspecified"}
                and plan.get("mode") in {"observation_result", "knowledge_only"}
                and (
                    plan.get("result") in {"success", "no_data"} and plan.get("answerShape") != expected_shape
                    or plan.get("result") == "not_confirmed" and bool(plan.get("facts"))
                )
            ):
                intent_completion_reviewed = True
                try:
                    return await plan_stage(
                        {**knowledge_or_observation, "planningDirective": {
                            **knowledge_or_observation.get("planningDirective", {}),
                            "intentCompletionReview": True,
                            "requestedAnswerShape": expected_shape,
                            "priorCandidate": bounded_json(plan),
                        }},
                        timeout_stage=timeout_stage,
                        reason="current_intent_completion_review",
                    )
                except (ReaderStageTimeout, httpx.HTTPError, RuntimeError, ValueError, TypeError, IndexError):
                    prior_read = knowledge_or_observation.get("priorPortalRead") or {}
                    candidate = observation_result_from_plan(
                        plan, knowledge_or_observation.get("portalObservation"),
                        observed_page=str(prior_read.get("startPath") or ""),
                        verified_scope=_permission_result_scope(permission_context),
                        permitted_paths=(*permission_context.pages, *permission_context.subpages),
                    )
                    if candidate is None or not candidate.facts:
                        raise
                    return {
                        **plan, "result": "not_confirmed", "facts": list(candidate.facts),
                        "missing": [*candidate.missing, "completion_review_unavailable"][:10],
                    }
            review_context = (
                _list_selection_review_context(plan, knowledge_or_observation)
                if not list_selection_reviewed else None
            )
            if review_context is not None:
                list_selection_reviewed = True
                directive = review_context["planningDirective"]
                trace.record(
                    "list_selection_review",
                    "degraded",
                    input_summary={
                        "observedRowCount": directive["observedRowCount"],
                        "selectedRowCount": directive["selectedRowCount"],
                    },
                    output_summary={"decision": "request_semantic_review"},
                )
                return await plan_stage(
                    review_context,
                    timeout_stage=timeout_stage,
                    reason="bounded_list_selection_review",
                )
            return plan

        def validate_policy(request: PortalReadRequest, *, reason: str) -> str | None:
            started_at = time.perf_counter()
            policy_error = self.policy.validate(request, permission_context)
            trace.record(
                "read_policy",
                "failed" if policy_error else "passed",
                started_at=started_at,
                input_summary={"reason": reason, **request_summary(request)},
                output_summary={"decision": "rejected" if policy_error else "allowed"},
                failure_code=policy_error or "",
            )
            return policy_error

        async def portal_read_stage(
            request: PortalReadRequest,
            *,
            timeout_stage: str,
            attempt: str,
        ) -> dict[str, Any]:
            started_at = time.perf_counter()
            request_trace = {"attempt": attempt, **request_summary(request)}
            try:
                tool_result = await _await_reader_stage(
                    self.gateway.invoke(
                        principal,
                        "admin.portal.read",
                        request.as_payload(),
                        allowed_tools=self.allowed_tools,
                    ),
                    stage=timeout_stage,
                    cap_seconds=budget.portal_read_seconds,
                    deadline=deadline,
                )
            except ReaderStageTimeout as exc:
                trace.record(
                    "portal_execution",
                    "failed",
                    started_at=started_at,
                    input_summary=request_trace,
                    output_summary={"timeoutKind": "total" if exc.total_budget else "stage"},
                    failure_code="reader_total_timeout" if exc.total_budget else "portal_read_timeout",
                )
                raise
            except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                trace.record(
                    "portal_execution",
                    "failed",
                    started_at=started_at,
                    input_summary=request_trace,
                    output_summary={"exceptionType": type(exc).__name__},
                    failure_code="portal_read_error",
                )
                raise
            payload = tool_result.get("result") if isinstance(tool_result, dict) else None
            facts = payload.get("facts") if isinstance(payload, dict) else []
            trace.record(
                "portal_execution",
                "passed" if isinstance(tool_result, dict) and tool_result.get("ok") else "failed",
                started_at=started_at,
                input_summary=request_trace,
                output_summary={
                    "toolCode": str(tool_result.get("code") or "")[:120] if isinstance(tool_result, dict) else "",
                    "resultStatus": str(payload.get("result") or payload.get("status") or "")[:80]
                    if isinstance(payload, dict) else "",
                    "factCount": len(facts) if isinstance(facts, list) else int(bool(facts)),
                    "hasObservation": bool(isinstance(payload, dict) and payload.get("observation") is not None),
                },
                failure_code=(
                    str(tool_result.get("code") or "portal_read_failed")[:120]
                    if isinstance(tool_result, dict) and not tool_result.get("ok") else ""
                ),
            )
            return tool_result

        async def repair_partial_observation(
            candidate_plan: Any, candidate: ReaderResult | None, context: dict[str, Any], *, page: str,
        ) -> tuple[Any, ReaderResult | None]:
            nonlocal observation_grounding_reviewed
            original = _observation_plan_result_from_plan(candidate_plan)
            if (
                observation_grounding_reviewed or original is None or not original.facts
                or original.status not in {"success", "not_confirmed"}
                or candidate is not None and not any(item.startswith("unconfirmed_fact:") for item in candidate.missing)
            ):
                return candidate_plan, candidate
            observation_grounding_reviewed = True
            bound_source = _observation_evidence_for_result(context.get("portalObservation"), original)
            repair_context = dict(context)
            if bound_source is not None:
                repair_observation: dict[str, Any] = {"sectionSummaries": [bound_source]}
                full_observation = context.get("portalObservation")
                if isinstance(full_observation, dict) and "readHealth" in full_observation:
                    repair_observation["readHealth"] = full_observation["readHealth"]
                repair_context["portalObservation"] = repair_observation
            repair_started_at = time.perf_counter()
            try:
                repaired_plan = await plan_stage(
                    {**repair_context, "planningDirective": {
                        "repairObservationGrounding": True,
                        "priorCandidate": bounded_json(candidate_plan),
                        "confirmedFacts": list(candidate.facts) if candidate is not None else [],
                        "boundSource": bounded_json(bound_source, max_depth=4, max_items=20, max_string=500),
                        "reason": "Candidate facts or their source were not grounded. Cite one exact observed nodeId when headings repeat, use its actual selectedState, and copy its original evidence units without inventing field labels.",
                    }},
                    timeout_stage="planning_observation_grounding", reason="repair_observation_grounding",
                )
                repaired = observation_result_from_plan(
                    repaired_plan, context.get("portalObservation"), observed_page=page,
                    verified_scope=_permission_result_scope(permission_context),
                    permitted_paths=(*permission_context.pages, *permission_context.subpages),
                )
                source_changed = bool(
                    bound_source and bound_source.get("nodeId") and repaired is not None
                    and repaired.source_section != bound_source["nodeId"]
                )
                if source_changed:
                    repaired = None
                trace.record(
                    "observation_grounding", "passed" if repaired is not None and repaired.facts else "degraded",
                    started_at=repair_started_at,
                    input_summary={"boundSource": str((bound_source or {}).get("nodeId") or "")},
                    output_summary={
                        "sourceSection": str(repaired_plan.get("sourceSection") or "")[:120]
                        if isinstance(repaired_plan, dict) else "",
                        "selectedState": str(repaired_plan.get("selectedState") or "")[:120]
                        if isinstance(repaired_plan, dict) else "",
                        "factCount": len(repaired.facts) if repaired is not None else 0,
                    },
                    failure_code=("grounding_repair_source_changed" if source_changed else
                                  "" if repaired is not None and repaired.facts else "grounding_repair_rejected"),
                )
                if repaired is not None and repaired.facts and (
                    repaired.status == "success" or candidate is None or len(repaired.facts) >= len(candidate.facts)
                ):
                    return repaired_plan, repaired
            except (ReaderStageTimeout, httpx.HTTPError, RuntimeError, ValueError, TypeError, IndexError) as exc:
                trace.record(
                    "observation_grounding", "degraded", started_at=repair_started_at,
                    input_summary={"boundSource": str((bound_source or {}).get("nodeId") or "")},
                    output_summary={"errorType": type(exc).__name__},
                    failure_code="grounding_repair_unavailable",
                )
            return candidate_plan, candidate

        def deterministic_observation_fallback(
            observation: Any,
            *,
            page: str,
            section: str,
            answer_shape: Literal["overview", "count", "list", "attention", "due", "detail", "unspecified"],
            scope: Literal["personal", "team", "global", "unknown"],
            selection: ReaderResult | None = None,
        ) -> tuple[ReaderResult | None, str]:
            if selection is not None:
                binding = observation_result_from_plan(
                    {**selection.public_json(), "mode": "observation_result", "result": "not_confirmed",
                     "facts": [], "missing": ["binding_validation"]},
                    observation, observed_page=page, verified_scope=scope,
                    permitted_paths=(*permission_context.pages, *permission_context.subpages),
                )
                if binding is None:
                    return None, "none"
                section = binding.source_section or binding.section
            fallback_intent = _observation_fallback_intent(question, answer_shape)
            if fallback_intent is None and answer_shape == "list":
                selected_view = _selected_view_list_fallback(
                    observation, section_name=section, question=question, page=page,
                    scope=scope, conversation_context=bounded_conversation_context,
                )
                if selected_view is not None:
                    return selected_view, "verified_selected_view"
            if fallback_intent is None and answer_shape in {"count", "attention", "due"}:
                unique_section = _observation_evidence_for_section(observation, section)
                if unique_section is not None:
                    fallback_intent = answer_shape
            if fallback_intent is None:
                return None, "none"
            structured = _result_from_structured_observation(
                observation,
                page=page,
                section_name=section,
                answer_shape=fallback_intent,
                scope=scope,
                question=question,
            )
            if structured is not None:
                return structured, "structured_unique_evidence"
            generic = observation_fallback_result(
                question,
                observation,
                page=page,
                section=section,
                scope=scope,
                answer_shape=answer_shape,
            )
            if generic is not None:
                return generic, "generic_unique_evidence"
            return None, "none"

        def record_semantic_resolution(
            *,
            decision: str,
            reason: str,
            llm_plan: Any = None,
            result: ReaderResult | None = None,
            fallback_strategy: str = "none",
        ) -> dict[str, Any]:
            llm_result = _observation_plan_result_from_plan(llm_plan)
            llm_request = portal_read_request_from_plan(llm_plan)
            llm_selection = (
                {
                    "resultStatus": llm_result.status,
                    "section": llm_result.section[:160],
                    "sourceSection": llm_result.source_section[:120],
                    "answerShape": llm_result.answer_shape,
                }
                if llm_result is not None
                else {
                    "startPath": llm_request.start_path[:160],
                    "actionTypes": [str(action.get("type") or "")[:40] for action in llm_request.actions],
                }
                if llm_request is not None
                else {}
            )
            status = "passed" if result is not None and result.status in {"success", "no_data"} else "degraded"
            failure_code = "" if status == "passed" else reason
            trace.record(
                "semantic_resolution",
                status,
                input_summary={
                    "reason": reason,
                    "llmMode": str(llm_plan.get("mode") or "")[:80] if isinstance(llm_plan, dict) else "",
                },
                output_summary={
                    "decision": decision,
                    "fallbackStrategy": fallback_strategy,
                    "resultStatus": result.status if result is not None else "",
                    "factCount": len(result.facts) if result is not None else 0,
                    "answerShape": result.answer_shape if result is not None else "",
                },
                failure_code=failure_code,
            )
            return {
                "decision": decision,
                "reason": reason,
                "llmMode": str(llm_plan.get("mode") or "")[:80] if isinstance(llm_plan, dict) else "",
                "llmSelection": bounded_json(llm_selection, max_depth=3, max_items=8, max_string=160),
                "validation": "passed" if decision == "llm_result" else "failed" if "invalid" in reason else "not_applicable",
                "fallbackUsed": decision == "fallback",
                "fallbackStrategy": fallback_strategy,
            }

        # Finish just inside the service guard so the current stage can be
        # recorded instead of collapsing into a generic runtime timeout.
        deadline = asyncio.get_running_loop().time() + max(0.01, budget.total_seconds - 1.0)
        # This call must remain first. Never use client-provided role, page or
        # button claims as an authorization source.
        identity_started_at = time.perf_counter()
        try:
            user_info = await _await_reader_stage(
                self.gateway.get_user_info(principal),
                stage="get_user_info",
                cap_seconds=budget.get_user_info_seconds,
                deadline=deadline,
            )
        except ReaderStageTimeout as exc:
            missing = "reader_total_timeout" if exc.total_budget else "get_user_info_timeout"
            trace.record(
                "identity_permissions",
                "failed",
                started_at=identity_started_at,
                output_summary={"timeoutKind": "total" if exc.total_budget else "stage"},
                failure_code=missing,
            )
            result = ReaderResult(status="load_failed", summary="The current Admin Portal permissions could not be loaded in time.", missing=(missing,))
            return ReaderOutcome(result, _timeout_evidence(exc, budget))
        if not user_info.get("ok"):
            status: ReaderStatus = "no_permission" if user_info.get("code") == "permission_denied" else "load_failed"
            trace.record(
                "identity_permissions",
                "failed",
                started_at=identity_started_at,
                output_summary={"toolCode": str(user_info.get("code") or "")[:120]},
                failure_code=str(user_info.get("code") or "get_user_info_failed"),
            )
            result = ReaderResult(status=status, summary="The current Admin Portal permissions could not be verified.")
            return ReaderOutcome(result, {"stage": "get_user_info", "userInfo": bounded_json(user_info)})

        permission_context = permission_context_from_user_info(user_info.get("result"))
        permission_audit = permission_audit_summary(permission_context)
        if not permission_context.user_id or str(permission_context.user_id) != str(principal.user_id):
            trace.record(
                "identity_permissions",
                "failed",
                started_at=identity_started_at,
                output_summary={"identityMatch": False},
                failure_code="identity_mismatch",
            )
            result = ReaderResult(
                status="no_permission",
                summary="The current Admin Portal identity could not be confirmed.",
                missing=("identity_mismatch",),
            )
            return ReaderOutcome(result, {"stage": "get_user_info", "permission": permission_audit, "identityMatch": False})
        if not permission_context.roles or not (*permission_context.pages, *permission_context.subpages):
            trace.record(
                "identity_permissions",
                "failed",
                started_at=identity_started_at,
                output_summary={"identityMatch": True, "permissionContext": "incomplete"},
                failure_code="permission_context_incomplete",
            )
            result = ReaderResult(
                status="no_permission",
                summary="No confirmed Admin Portal page permission is available for this user.",
                missing=("permission_context_incomplete",),
            )
            return ReaderOutcome(result, {"stage": "get_user_info", "permission": permission_audit, "identityMatch": True})
        trace.record(
            "identity_permissions",
            "passed",
            started_at=identity_started_at,
            output_summary={
                "identityMatch": True,
                "roleCount": len(permission_context.roles),
                "pageCount": len(permission_context.pages) + len(permission_context.subpages),
                "buttonCount": len(permission_context.buttons),
            },
        )
        if question_requests_business_mutation(question):
            trace.record("read_policy", "failed", failure_code="action_not_read_only",
                         output_summary={"decision": "explicit_business_command_rejected"})
            return ReaderOutcome(
                ReaderResult(status="not_confirmed", summary="Business mutations are outside the read-only Reader.",
                             missing=("action_not_read_only",)),
                {"stage": "read_only_boundary", "permission": permission_audit},
            )
        sample_explanation = previous_sample_explanation(question, bounded_conversation_context)
        if sample_explanation is not None:
            return ReaderOutcome(
                ReaderResult(status="success", summary="The previous answer coverage is confirmed.",
                             answer_shape="detail", facts=(sample_explanation,)),
                {"stage": "prior_answer_coverage", "permission": permission_audit,
                 "source": "previous_result_presentation_metadata"},
            )
        resolver = getattr(self.planner, "resolve_admin_portal_intent", None)
        if bounded_conversation_context and callable(resolver):
            intent_started_at = time.perf_counter()
            try:
                candidate = await _await_reader_stage(
                    resolver(question, bounded_conversation_context),
                    stage="intent_resolution", cap_seconds=min(20.0, budget.planner_seconds), deadline=deadline,
                )
                resolution = parse_intent_resolution(candidate, question, bounded_conversation_context)
                intent_state.update(resolution.public_json())
            except (ReaderStageTimeout, httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                failure = "intent_resolution_timeout" if isinstance(exc, ReaderStageTimeout) else "intent_resolution_invalid"
                trace.record("intent_resolution", "failed", started_at=intent_started_at, failure_code=failure)
                return ReaderOutcome(
                    ReaderResult(status="not_confirmed", summary="The current task scope could not be resolved.", missing=(failure,)),
                    {"stage": "intent_resolution", "permission": permission_audit,
                     "validationError": str(exc)[:200] if isinstance(exc, ValueError) else type(exc).__name__},
                )
            trace.record(
                "intent_resolution", "passed", started_at=intent_started_at,
                output_summary={"relation": intent_state["relation"], "sources": {
                    name: slot["source"] for name, slot in intent_state["slots"].items()
                }},
            )
            if intent_state["relation"] == "clarify":
                return ReaderOutcome(
                    ReaderResult(status="not_confirmed", summary="The requested scope needs clarification.",
                                 missing=("intent_ambiguous",), clarification_options=tuple(intent_state["clarificationOptions"])),
                    {"stage": "intent_clarification", "permission": permission_audit},
                )
            bounded_conversation_context = resolution.planner_context(bounded_conversation_context)
        knowledge_result: dict[str, Any] = {"ok": False, "code": "knowledge_not_configured"}
        knowledge_trace_recorded = False
        if self.knowledge_folder_id:
            search_query = knowledge_search_query(question, permission_context, bounded_conversation_context)
            knowledge_started_at = time.perf_counter()
            try:
                knowledge_result = await _await_reader_stage(
                    self.gateway.invoke(
                        principal,
                        "knowledge.search",
                        {"query": search_query, "folder_id": self.knowledge_folder_id, "top_k": self.knowledge_top_k},
                        allowed_tools=self.allowed_tools,
                    ),
                    stage="knowledge_search",
                    cap_seconds=budget.knowledge_search_seconds,
                    deadline=deadline,
                )
            except ReaderStageTimeout as exc:
                if exc.total_budget:
                    trace.record(
                        "knowledge_retrieval",
                        "failed",
                        started_at=knowledge_started_at,
                        input_summary={"queryChars": len(search_query), "topK": self.knowledge_top_k},
                        output_summary={"timeoutKind": "total"},
                        failure_code="reader_total_timeout",
                    )
                    result = ReaderResult(status="load_failed", summary="The Admin Portal Reader exhausted its total time budget.", missing=("reader_total_timeout",))
                    return ReaderOutcome(result, {**_timeout_evidence(exc, budget), "permission": permission_audit})
                # A temporary manual-search delay must not prevent a live,
                # permission-checked portal read.
                knowledge_result = {"ok": False, "code": "knowledge_timeout"}
                trace.record(
                    "knowledge_retrieval",
                    "degraded",
                    started_at=knowledge_started_at,
                    input_summary={"queryChars": len(search_query), "topK": self.knowledge_top_k},
                    output_summary={"timeoutKind": "stage"},
                    failure_code="knowledge_timeout",
                )
                knowledge_trace_recorded = True
        knowledge_context = project_knowledge_result(knowledge_result)
        if not knowledge_trace_recorded:
            retrieval_ok = bool(knowledge_result.get("ok"))
            trace.record(
                "knowledge_retrieval",
                "passed" if retrieval_ok else "degraded" if self.knowledge_folder_id else "skipped",
                started_at=knowledge_started_at if self.knowledge_folder_id else None,
                input_summary={"topK": self.knowledge_top_k} if self.knowledge_folder_id else {},
                output_summary={
                    "toolCode": str(knowledge_result.get("code") or "")[:120],
                    "chunkCount": len(knowledge_context.get("chunks") or []),
                    "sourceNames": [
                        str(chunk.get("source_name") or "")[:160]
                        for chunk in (knowledge_context.get("chunks") or [])[:8]
                        if isinstance(chunk, dict)
                    ],
                },
                failure_code="" if retrieval_ok else str(knowledge_result.get("code") or "knowledge_not_configured"),
            )
        try:
            plan = await plan_stage(knowledge_context, timeout_stage="planning", reason="initial")
        except ReaderStageTimeout as exc:
            missing = "reader_total_timeout" if exc.total_budget else "planner_timeout"
            result = ReaderResult(status="not_confirmed", summary="A bounded read-only portal plan could not be prepared in time.", missing=(missing,))
            return ReaderOutcome(result, {**_timeout_evidence(exc, budget), "permission": permission_audit, "knowledge": knowledge_context})
        except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
            result = ReaderResult(status="not_confirmed", summary="I could not determine a bounded read-only portal plan.")
            return ReaderOutcome(
                result,
                {
                    "stage": "planning",
                    "permission": permission_audit,
                    "knowledge": knowledge_context,
                    "errorType": type(exc).__name__,
                },
            )
        knowledge_result_from_planner = knowledge_result_from_plan(plan)
        resolved_values = _resolved_intent_values(bounded_conversation_context)
        conceptual_request = question_is_conceptual(question)
        if resolved_values and conceptual_request and not any(
            marker in question.casefold() for marker in (*_LIVE_TIME_MARKERS, "visible", "selected", "applied")
        ) and not resolved_values.get("recordIdentity"):
            needs_live_read = False
        else:
            needs_live_read = question_requires_live_portal(question) or bool(
                resolved_values and not conceptual_request and (
                    resolved_values.get("recordIdentity") or resolved_values.get("view")
                    or resolved_values.get("answerShape") in {"overview", "count", "list", "attention", "due", "detail"}
                )
            )
        if (
            knowledge_result_from_planner is not None
            and knowledge_result_from_planner.status == "success"
            and not needs_live_read
            and knowledge_supports_result(knowledge_result_from_planner, knowledge_context)
        ):
            return ReaderOutcome(
                knowledge_result_from_planner,
                {
                    "stage": "knowledge_only",
                    "permission": permission_audit,
                    "knowledge": knowledge_context,
                    "result": knowledge_result_from_planner.public_json(),
                },
            )
        if (
            isinstance(plan, dict)
            and plan.get("mode") == "knowledge_only"
            and not needs_live_read
            and knowledge_result_from_planner is not None
            and knowledge_result_from_planner.status == "success"
            and bool(_knowledge_evidence_strings(knowledge_context))
        ):
            # Give a stable, non-live explanation one bounded grounding repair
            # before considering a portal read. The repair must quote/rephrase
            # retrieved evidence; it may not turn a definition question into a
            # current-state browse.
            try:
                repaired_plan = await plan_stage(
                    {
                        **knowledge_context,
                        "planningDirective": {
                            "knowledgeGroundingRepair": True,
                            "reason": "knowledge_result_not_grounded_or_incomplete",
                            "requiredEvidenceUse": "quote_exact_relevant_sentences_in_source_language",
                            "allowedFallback": "knowledge_only:not_confirmed",
                        },
                        "priorKnowledgeResult": bounded_json(plan, max_depth=3, max_items=20, max_string=300),
                    },
                    timeout_stage="planning_knowledge_grounding_repair",
                    reason="knowledge_grounding_repair",
                )
            except (ReaderStageTimeout, httpx.HTTPError, RuntimeError, ValueError, TypeError, IndexError):
                repaired_plan = None
            repaired_result = knowledge_result_from_plan(repaired_plan)
            if (
                repaired_result is not None
                and repaired_result.status == "success"
                and knowledge_supports_result(repaired_result, knowledge_context)
            ):
                return ReaderOutcome(
                    repaired_result,
                    {
                        "stage": "knowledge_only_repaired",
                        "permission": permission_audit,
                        "knowledge": knowledge_context,
                        "result": repaired_result.public_json(),
                    },
                )
            result = ReaderResult(
                status="not_confirmed",
                summary="The manual evidence could not be grounded for this explanation.",
                missing=("knowledge_not_grounded",),
            )
            return ReaderOutcome(
                result,
                {
                    "stage": "knowledge_grounding_repair",
                    "permission": permission_audit,
                    "knowledge": knowledge_context,
                    "result": result.public_json(),
                    "knowledgeGrounding": {
                        "initialFacts": list(knowledge_result_from_planner.facts[:3]),
                        "repairFacts": list(repaired_result.facts[:3]) if repaired_result is not None else [],
                        "repairStatus": repaired_result.status if repaired_result is not None else "invalid_plan",
                        "unsupportedInitialFacts": [
                            fact for fact in knowledge_result_from_planner.facts
                            if not knowledge_supports_result(replace(knowledge_result_from_planner, facts=(fact,)), knowledge_context)
                        ][:3],
                        "unsupportedRepairFacts": [
                            fact for fact in repaired_result.facts
                            if not knowledge_supports_result(replace(repaired_result, facts=(fact,)), knowledge_context)
                        ][:3] if repaired_result is not None else [],
                    },
                },
            )
        if (
            isinstance(plan, dict)
            and (plan.get("mode") == "knowledge_only" or needs_live_read and plan.get("mode") == "observation_result")
        ):
            force_reason = (
                "current_portal_state_required"
                if needs_live_read
                else "knowledge_result_not_grounded_or_incomplete"
            )
            forced_context = {
                **knowledge_context,
                "planningDirective": {
                    "requirePortalRead": True,
                    "reason": force_reason,
                    "allowedFallback": "knowledge_only:not_confirmed",
                },
            }
            try:
                plan = await plan_stage(
                    forced_context,
                    timeout_stage="planning_required_portal",
                    reason="required_portal_read",
                )
            except ReaderStageTimeout as exc:
                missing = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                result = ReaderResult(status="not_confirmed", summary="A required live portal read could not be planned in time.", missing=(missing,))
                return ReaderOutcome(result, {**_timeout_evidence(exc, budget), "permission": permission_audit, "knowledge": knowledge_context, "forceReason": force_reason})
            except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                result = ReaderResult(status="not_confirmed", summary="A required live portal read could not be planned.", missing=("portal_read_required",))
                return ReaderOutcome(result, {"stage": "planning_required_portal", "permission": permission_audit, "knowledge": knowledge_context, "forceReason": force_reason, "errorType": type(exc).__name__})
            if portal_read_request_from_plan(plan) is None and not (
                isinstance(plan, dict) and plan.get("mode") == "portal_read"
            ):
                result = ReaderResult(status="not_confirmed", summary="The requested current portal state could not be confirmed.", missing=("portal_read_required",))
                return ReaderOutcome(result, {"stage": "planning_required_portal", "permission": permission_audit, "knowledge": knowledge_context, "forceReason": force_reason, "plan": bounded_json(plan)})
        invalid_plan_error: str | None = None
        request = portal_read_request_from_plan(plan)
        if request is None and isinstance(plan, dict) and plan.get("mode") == "portal_read":
            invalid_plan_error = "invalid_closed_plan"
        elif request is None:
            result = ReaderResult(status="not_confirmed", summary="The request did not produce a valid read-only portal plan.")
            return ReaderOutcome(result, {"stage": "planning", "plan": bounded_json(plan), "permission": permission_audit, "knowledge": knowledge_context})
        if request is not None:
            # Validate the original plan before discarding observe metadata.
            # This prevents normalization from concealing unsafe fields.
            policy_error = validate_policy(request, reason="initial")
            if policy_error:
                status = "no_permission" if policy_error in {"page_not_permitted", "permission_context_incomplete", "button_not_permitted"} else "not_confirmed"
                result = ReaderResult(status=status, summary="The requested portal operation is not permitted by the read-only reader.", missing=(policy_error,))  # type: ignore[arg-type]
                return ReaderOutcome(result, {"stage": "policy", "plan": bounded_json(request.as_payload()), "policyError": policy_error, "permission": permission_audit})
            normalized_request = _normalize_initial_observation_request(request)
            if normalized_request is None:
                invalid_plan_error = "invalid_observation_plan"
            else:
                request = normalized_request

        if invalid_plan_error is not None:
            correction_context = {
                **knowledge_context,
                "planningDirective": {
                    "requirePortalRead": True,
                    "pureObserveFirst": True,
                    "invalidClosedPlan": True,
                    "reason": invalid_plan_error,
                    "allowedFallback": "knowledge_only:not_confirmed",
                },
            }
            try:
                corrected_plan = await plan_stage(
                    correction_context,
                    timeout_stage="planning_correction",
                    reason="invalid_closed_plan",
                )
            except ReaderStageTimeout as exc:
                missing = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                result = ReaderResult(status="not_confirmed", summary="The invalid portal plan could not be corrected in time.", missing=(missing,))
                return ReaderOutcome(result, {**_timeout_evidence(exc, budget), "permission": permission_audit, "invalidPlanError": invalid_plan_error})
            except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                result = ReaderResult(status="not_confirmed", summary="The invalid portal plan could not be corrected.", missing=(invalid_plan_error,))
                return ReaderOutcome(result, {"stage": "planning_correction", "permission": permission_audit, "invalidPlanError": invalid_plan_error, "errorType": type(exc).__name__})

            corrected_request = portal_read_request_from_plan(corrected_plan)
            if corrected_request is None:
                result = ReaderResult(status="not_confirmed", summary="The corrected portal plan was not valid.", missing=("invalid_closed_plan",))
                return ReaderOutcome(result, {"stage": "planning_correction", "permission": permission_audit, "invalidPlanError": "invalid_closed_plan"})
            policy_error = validate_policy(corrected_request, reason="corrected_plan")
            if policy_error:
                status = "no_permission" if policy_error in {"page_not_permitted", "permission_context_incomplete", "button_not_permitted"} else "not_confirmed"
                result = ReaderResult(status=status, summary="The corrected portal operation is not permitted by the read-only reader.", missing=(policy_error,))  # type: ignore[arg-type]
                return ReaderOutcome(result, {"stage": "policy_after_correction", "policyError": policy_error, "permission": permission_audit})
            normalized_request = _normalize_initial_observation_request(corrected_request)
            if normalized_request is None:
                result = ReaderResult(status="not_confirmed", summary="The corrected observation plan was still invalid.", missing=("invalid_observation_plan",))
                return ReaderOutcome(result, {"stage": "planning_correction", "permission": permission_audit, "invalidPlanError": "invalid_observation_plan"})
            plan = corrected_plan
            request = normalized_request

        unverified_scoped_plan = None
        if any(action.get("section") and action.get("type") != "observe" for action in request.actions):
            # A manual node title is not an observed locator. Establish the
            # structure first and replan the original scope against that evidence.
            unverified_scoped_plan = request.as_payload()
            request = replace(request, actions=({"type": "observe"},))
        elif (any(action.get("type") in {"reset_filter", "apply_filter", "dismiss_overlay"} for action in request.actions)
              and not any(action.get("type") == "show_filter" for action in request.actions)):
            # A fresh reader context has no previously opened filter overlay.
            request = replace(request, actions=({"type": "observe"},))
        planned_request = portal_read_request_from_plan(plan)
        observation_section_hint = next(
            (
                str(action.get("section") or "").strip()
                for action in (planned_request.actions if planned_request is not None else ())
                if str(action.get("type") or "").casefold() == "observe" and action.get("section")
            ),
            "",
        )
        category_requirement: _CategoryChildRequirement | None = None
        category_read_is_in_place = False
        try:
            tool_result = await portal_read_stage(
                request,
                timeout_stage="portal_read",
                attempt="initial",
            )
        except ReaderStageTimeout as exc:
            missing = "reader_total_timeout" if exc.total_budget else "portal_read_timeout"
            result = ReaderResult(status="load_failed", summary="The Admin Portal page could not be loaded in time.", missing=(missing,))
            return ReaderOutcome(result, {**_timeout_evidence(exc, budget), "permission": permission_audit})
        raw_tool_payload = tool_result.get("result") if isinstance(tool_result, dict) else None
        observation = raw_tool_payload.get("observation") if isinstance(raw_tool_payload, dict) else None
        if observation is not None and (
            any(str(action.get("type") or "").casefold() == "observe" for action in request.actions)
            or not raw_tool_payload.get("facts")
        ):
            observed_context = {
                **knowledge_context,
                "portalObservation": bounded_json(observation, max_depth=6, max_items=50, max_string=300),
                "priorPortalRead": bounded_json(request.as_payload(), max_depth=4, max_items=30, max_string=200),
            }
            if unverified_scoped_plan is not None:
                observed_context["unverifiedInitialPlan"] = bounded_json(unverified_scoped_plan)
                observed_context["planningDirective"] = {
                    "reason": "initial_section_requires_observation",
                    "preserveRequestedScope": True,
                    "instruction": (
                        "Preserve the user's requested business object, view, filters and scope. "
                        "unverifiedInitialPlan is an untrusted locator proposal, not a user scope constraint. "
                        "Do not preserve its invented section name. Use an exact observed globally unique "
                        "control without section when that control still fulfills the user's scope. "
                        "If the user requires a particular region and it cannot be uniquely verified, "
                        "return not_confirmed; never substitute another region."
                    ),
                }
            observation_status = str(
                raw_tool_payload.get("result") or raw_tool_payload.get("status") or ""
            ).strip()
            if observation_status in {"load_failed", "no_permission"}:
                result = ReaderResult(
                    status=observation_status,  # type: ignore[arg-type]
                    summary=(
                        "The Admin Portal page could not be loaded."
                        if observation_status == "load_failed"
                        else "The requested Admin Portal page is not permitted."
                    ),
                    page=request.start_path,
                    missing=(f"observation_{observation_status}",),
                )
                return ReaderOutcome(
                    result,
                    {
                        "stage": "observation_validation",
                        "permission": permission_audit,
                        "observation": observed_context["portalObservation"],
                    },
                )
            if _observation_has_error_state(observed_context["portalObservation"]):
                result = ReaderResult(
                    status="not_confirmed",
                    summary="The observed page was not a confirmed Admin Portal data page.",
                    missing=("observation_page_not_confirmed",),
                )
                return ReaderOutcome(
                    result,
                    {
                        "stage": "observation_validation",
                        "permission": permission_audit,
                        "observation": observed_context["portalObservation"],
                    },
                )
            requested_answer_shape = reader_answer_shape(question, bounded_conversation_context)
            resolved_section_hint = observation_section_hint or _infer_observation_section(
                observed_context["portalObservation"],
                question=question,
                expected_fields=request.expected_fields,
                answer_shape=requested_answer_shape,
            )
            verified_scope = _permission_result_scope(permission_context)
            category_requirement = _category_control_requiring_children(
                question,
                observed_context["portalObservation"],
                None,
                requested_answer_shape,
                bounded_conversation_context,
            )
            try:
                next_plan = await plan_stage(
                    observed_context,
                    timeout_stage="planning_after_observe",
                    reason="after_observe",
                )
            except ReaderStageTimeout as exc:
                missing = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                if category_requirement:
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The requested collection requires a bounded category read.",
                        page=request.start_path,
                        missing=(missing,),
                    )
                    semantic_resolution = record_semantic_resolution(
                        decision="not_confirmed",
                        reason=missing,
                        result=result,
                    )
                    return ReaderOutcome(
                        result,
                        {
                            **_timeout_evidence(exc, budget),
                            "permission": permission_audit,
                            "observation": observed_context["portalObservation"],
                            "semanticResolution": semantic_resolution,
                        },
                    )
                fallback_result, fallback_strategy = deterministic_observation_fallback(
                    observed_context["portalObservation"],
                    page=request.start_path,
                    section=resolved_section_hint,
                    answer_shape=requested_answer_shape,
                    scope=verified_scope,
                )
                semantic_resolution = record_semantic_resolution(
                    decision="fallback" if fallback_result is not None else "not_confirmed",
                    reason=missing,
                    result=fallback_result,
                    fallback_strategy=fallback_strategy,
                )
                if fallback_result is not None:
                    return ReaderOutcome(
                        fallback_result,
                        {
                            "stage": "completed_from_observation_fallback",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "observation": observed_context["portalObservation"],
                            "result": fallback_result.public_json(),
                            "semanticResolution": semantic_resolution,
                        },
                    )
                result = ReaderResult(status="not_confirmed", summary="The observed portal structure could not be interpreted in time.", missing=(missing,))
                return ReaderOutcome(
                    result,
                    {**_timeout_evidence(exc, budget), "permission": permission_audit, "observation": observed_context["portalObservation"], "semanticResolution": semantic_resolution},
                )
            except (httpx.HTTPError, RuntimeError, ValueError, TypeError, IndexError) as exc:
                if category_requirement:
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The requested collection requires a bounded category read.",
                        page=request.start_path,
                        missing=("collection_children_read_required",),
                    )
                    semantic_resolution = record_semantic_resolution(
                        decision="not_confirmed",
                        reason="planner_error",
                        result=result,
                    )
                    return ReaderOutcome(
                        result,
                        {
                            "stage": "planning_collection_children_after_observe",
                            "permission": permission_audit,
                            "observation": observed_context["portalObservation"],
                            "semanticResolution": semantic_resolution,
                            "errorType": type(exc).__name__,
                        },
                    )
                fallback_result, fallback_strategy = deterministic_observation_fallback(
                    observed_context["portalObservation"],
                    page=request.start_path,
                    section=resolved_section_hint,
                    answer_shape=requested_answer_shape,
                    scope=verified_scope,
                )
                semantic_resolution = record_semantic_resolution(
                    decision="fallback" if fallback_result is not None else "not_confirmed",
                    reason="planner_error",
                    result=fallback_result,
                    fallback_strategy=fallback_strategy,
                )
                if fallback_result is not None:
                    return ReaderOutcome(
                        fallback_result,
                        {
                            "stage": "completed_from_observation_fallback",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "observation": observed_context["portalObservation"],
                            "result": fallback_result.public_json(),
                            "semanticResolution": semantic_resolution,
                            "errorType": type(exc).__name__,
                        },
                    )
                result = ReaderResult(status="not_confirmed", summary="The observed portal structure could not be turned into a bounded read plan.")
                return ReaderOutcome(result, {"stage": "planning_after_observe", "permission": permission_audit, "observation": observed_context["portalObservation"], "semanticResolution": semantic_resolution, "errorType": type(exc).__name__})
            planned_result = _observation_plan_result_from_plan(next_plan)
            category_requirement = category_requirement or _category_control_requiring_children(
                question,
                observed_context["portalObservation"],
                planned_result,
                requested_answer_shape,
                bounded_conversation_context,
            )
            if category_requirement:
                refinement_context = {
                    **observed_context,
                    "planningDirective": {
                        "requirePortalRead": True,
                        "reason": "named_collection_requires_child_evidence",
                        "currentPage": request.start_path,
                        "categoryControl": category_requirement.control_label,
                        "categorySemanticLabel": category_requirement.semantic_label,
                        "requestedAnswerShape": requested_answer_shape,
                        "requireChildEvidence": True,
                        "parentCountNotSufficient": True,
                        "currentPageControlIsAvailable": True,
                        "priorResult": planned_result.public_json() if planned_result is not None else {},
                        "allowedFallback": "observation_result:not_confirmed",
                    },
                }
                try:
                    next_plan = await plan_stage(
                        refinement_context,
                        timeout_stage="planning_collection_children_after_observe",
                        reason="collection_children_required",
                    )
                except ReaderStageTimeout as exc:
                    missing = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The requested collection details could not be planned in time.",
                        page=request.start_path,
                        missing=(missing,),
                    )
                    return ReaderOutcome(
                        result,
                        {
                            **_timeout_evidence(exc, budget),
                            "permission": permission_audit,
                            "observation": observed_context["portalObservation"],
                        },
                    )
                except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The requested collection details could not be planned.",
                        page=request.start_path,
                        missing=("collection_children_read_required",),
                    )
                    return ReaderOutcome(
                        result,
                        {
                            "stage": "planning_collection_children_after_observe",
                            "permission": permission_audit,
                            "observation": observed_context["portalObservation"],
                            "errorType": type(exc).__name__,
                        },
                    )
                planned_result = _observation_plan_result_from_plan(next_plan)
                refinement_request = portal_read_request_from_plan(next_plan)
                if refinement_request is None:
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The requested collection children require a bounded read.",
                        page=request.start_path,
                        section=category_requirement.semantic_label,
                        answer_shape=requested_answer_shape,  # type: ignore[arg-type]
                        scope=verified_scope,
                        missing=("collection_children_read_required",),
                    )
                    semantic_resolution = record_semantic_resolution(
                        decision="not_confirmed",
                        reason="collection_children_read_required",
                        llm_plan=next_plan,
                        result=result,
                    )
                    return ReaderOutcome(
                        result,
                        {
                            "stage": "planning_collection_children_after_observe",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(next_plan),
                            "observation": observed_context["portalObservation"],
                            "result": result.public_json(),
                            "semanticResolution": semantic_resolution,
                        },
                    )
                category_read_is_in_place = _request_advances_category_on_current_page(
                    refinement_request,
                    current_page=request.start_path,
                    category_control=category_requirement.control_label,
                )
            if (
                planned_result is not None
                and planned_result.status == "not_confirmed"
                and question_requires_live_portal(question)
                and requested_answer_shape in {"list", "due", "detail"}
                and re.search(
                    r"/[a-z0-9][a-z0-9_/?=&.-]*",
                    " ".join(planned_result.missing).casefold(),
                )
            ):
                follow_up_required_context = {
                    **observed_context,
                    "planningDirective": {
                        "requirePortalRead": True,
                        "reason": "current_data_requires_a_follow_up_page_read",
                        "priorNotConfirmed": planned_result.public_json(),
                        "allowedFallback": "observation_result:not_confirmed",
                    },
                }
                try:
                    next_plan = await plan_stage(
                        follow_up_required_context,
                        timeout_stage="planning_required_portal_after_observe",
                        reason="required_portal_read_after_observe",
                    )
                except ReaderStageTimeout as exc:
                    missing = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="A required follow-up portal read could not be planned in time.",
                        missing=(missing,),
                    )
                    return ReaderOutcome(
                        result,
                        {
                            **_timeout_evidence(exc, budget),
                            "permission": permission_audit,
                            "observation": observed_context["portalObservation"],
                        },
                    )
                except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="A required follow-up portal read could not be planned.",
                        missing=("follow_up_portal_read_required",),
                    )
                    return ReaderOutcome(
                        result,
                        {
                            "stage": "planning_required_portal_after_observe",
                            "permission": permission_audit,
                            "observation": observed_context["portalObservation"],
                            "errorType": type(exc).__name__,
                        },
                    )
                planned_result = _observation_plan_result_from_plan(next_plan)
            observed_result = observation_result_from_plan(
                next_plan,
                observed_context["portalObservation"],
                verified_scope=verified_scope,
                observed_page=request.start_path,
                permitted_paths=(*permission_context.pages, *permission_context.subpages),
            )
            next_plan, observed_result = await repair_partial_observation(
                next_plan, observed_result, observed_context, page=request.start_path,
            )
            planned_result = _observation_plan_result_from_plan(next_plan)
            if observed_result is not None and (observed_result.status in {"success", "no_data"} or observed_result.facts):
                semantic_resolution = record_semantic_resolution(
                    decision="llm_result",
                    reason="validated_observation_result",
                    llm_plan=next_plan,
                    result=observed_result,
                )
                return ReaderOutcome(
                    observed_result,
                    {
                        "stage": "completed_after_observe",
                        "permission": permission_audit,
                        "knowledge": knowledge_context,
                        "plan": bounded_json(next_plan),
                        "observation": observed_context["portalObservation"],
                        "result": observed_result.public_json(),
                        "semanticResolution": semantic_resolution,
                    },
                )
            next_request = portal_read_request_from_plan(next_plan)
            fallback_reason = ""
            if planned_result is not None and planned_result.status == "not_confirmed":
                fallback_reason = (
                    "llm_not_confirmed"
                    if observed_result is not None
                    else "invalid_observation_references"
                )
            elif planned_result is not None and observed_result is None:
                fallback_reason = "invalid_observation_references"
            elif planned_result is None and next_request is None:
                fallback_reason = "invalid_semantic_schema"
            if fallback_reason:
                planned_section = (
                    (planned_result.source_section or planned_result.section)
                    if planned_result is not None
                    else ""
                )
                fallback_section = planned_section or resolved_section_hint
                fallback_shape = (
                    planned_result.answer_shape
                    if planned_result is not None and planned_result.answer_shape != "unspecified"
                    else requested_answer_shape
                )
                fallback_result, fallback_strategy = deterministic_observation_fallback(
                    observed_context["portalObservation"],
                    page=request.start_path,
                    section=fallback_section,
                    answer_shape=fallback_shape,
                    scope=verified_scope,
                    selection=planned_result,
                )
                semantic_resolution = record_semantic_resolution(
                    decision="fallback" if fallback_result is not None else "llm_not_confirmed",
                    reason=fallback_reason,
                    llm_plan=next_plan,
                    result=fallback_result or observed_result,
                    fallback_strategy=fallback_strategy,
                )
                if fallback_result is not None:
                    return ReaderOutcome(
                        fallback_result,
                        {
                            "stage": "completed_from_observation_fallback",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(next_plan),
                            "observation": observed_context["portalObservation"],
                            "result": fallback_result.public_json(),
                            "semanticResolution": semantic_resolution,
                        },
                    )
                if observed_result is not None:
                    return ReaderOutcome(
                        observed_result,
                        {
                            "stage": "completed_after_observe",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(next_plan),
                            "observation": observed_context["portalObservation"],
                            "result": observed_result.public_json(),
                            "semanticResolution": semantic_resolution,
                        },
                    )
                if planned_result is not None and planned_result.status == "not_confirmed":
                    unconfirmed_result = replace(
                        planned_result,
                        page=request.start_path,
                        scope=verified_scope,
                        facts=(),
                    )
                    return ReaderOutcome(
                        unconfirmed_result,
                        {
                            "stage": "completed_after_observe",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(next_plan),
                            "observation": observed_context["portalObservation"],
                            "result": unconfirmed_result.public_json(),
                            "semanticResolution": semantic_resolution,
                        },
                    )
                if planned_result is not None:
                    result = ReaderResult(
                        status="not_confirmed", summary="The observed result could not be grounded.",
                        page=request.start_path, missing=(fallback_reason,),
                    )
                    return ReaderOutcome(result, {
                        "stage": "observation_result_validation", "permission": permission_audit,
                        "plan": bounded_json(next_plan), "observation": observed_context["portalObservation"],
                        "semanticResolution": semantic_resolution,
                    })
            def normalize_follow_up(candidate: PortalReadRequest | None) -> tuple[PortalReadRequest | None, ReaderOutcome | None]:
                if candidate is None:
                    return None, None
                initial_original = planned_request or request
                if (
                    len(initial_original.actions) + len(candidate.actions) > self.policy.max_actions
                    or len(portal_request_paths(initial_original) | portal_request_paths(candidate)) > self.policy.max_pages
                ):
                    result = ReaderResult(status="not_confirmed", summary="The follow-up portal plan exceeded the cumulative read budget.", missing=("invalid_follow_up_plan",))
                    return None, ReaderOutcome(result, {"stage": "planning_after_observe", "permission": permission_audit,
                                                        "plan": bounded_json(candidate.as_payload()), "observation": observed_context["portalObservation"]})
                policy_error = validate_policy(candidate, reason="after_observe_before_normalization")
                if policy_error:
                    status: ReaderStatus = "no_permission" if policy_error in {"page_not_permitted", "permission_context_incomplete", "button_not_permitted"} else "not_confirmed"
                    result = ReaderResult(status=status, summary="The follow-up portal operation is not permitted.", missing=(policy_error,))
                    return None, ReaderOutcome(result, {"stage": "policy_after_observe", "permission": permission_audit,
                                                        "policyError": policy_error, "plan": bounded_json(candidate.as_payload())})
                action_types = {str(action.get("type") or "").strip().casefold().replace("-", "_") for action in candidate.actions}
                if "observe" in action_types and action_types != {"observe"}:
                    return _normalize_initial_observation_request(candidate), None
                return candidate, None

            next_request, follow_up_rejection = normalize_follow_up(next_request)
            if follow_up_rejection is not None:
                return follow_up_rejection
            if (
                next_request is None
                and isinstance(next_plan, dict)
                and next_plan.get("mode") == "portal_read"
            ):
                repair_context = {
                    **observed_context,
                    "planningDirective": {
                        "repairInvalidPortalReadPlan": True,
                        "reason": "follow_up_plan_did_not_match_closed_schema",
                        "rejectedPlan": bounded_json(next_plan, max_depth=4, max_items=30, max_string=200),
                        "requiredPortalRequestKeys": ["startPath", "actions", "expectedFields"],
                        "allowedActionKeys": [
                            "type", "path", "url", "selector", "label", "role", "name", "field",
                            "section", "emptyState", "permissionCode", "value", "values", "method",
                            "parameters", "filters", "direction",
                        ],
                    },
                }
                try:
                    next_plan = await plan_stage(
                        repair_context,
                        timeout_stage="planning_after_observe_correction",
                        reason="repair_follow_up_plan",
                    )
                except ReaderStageTimeout as exc:
                    missing = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The invalid follow-up read plan could not be corrected in time.",
                        missing=(missing,),
                    )
                    return ReaderOutcome(
                        result,
                        {
                            **_timeout_evidence(exc, budget),
                            "permission": permission_audit,
                            "observation": observed_context["portalObservation"],
                        },
                    )
                except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The invalid follow-up read plan could not be corrected.",
                        missing=("invalid_follow_up_plan",),
                    )
                    return ReaderOutcome(
                        result,
                        {
                            "stage": "planning_after_observe_correction",
                            "permission": permission_audit,
                            "observation": observed_context["portalObservation"],
                            "errorType": type(exc).__name__,
                        },
                    )
                next_request = portal_read_request_from_plan(next_plan)
                next_request, follow_up_rejection = normalize_follow_up(next_request)
                if follow_up_rejection is not None:
                    return follow_up_rejection
                if next_request is None:
                    result = ReaderResult(status="not_confirmed", summary="The corrected follow-up portal plan was still invalid.", missing=("invalid_follow_up_plan",))
                    return ReaderOutcome(result, {"stage": "planning_after_observe_correction", "permission": permission_audit,
                                                  "plan": bounded_json(next_plan), "observation": observed_context["portalObservation"]})
            repeated_observe = (
                next_request is not None
                and (urlsplit(next_request.start_path).path.rstrip("/") or "/")
                == (urlsplit(request.start_path).path.rstrip("/") or "/")
                and any(str(action.get("type") or "").casefold() == "observe" for action in next_request.actions)
            )
            if repeated_observe:
                section_hint = next(
                    (
                        str(action.get("section") or "").strip()
                        for action in next_request.actions
                        if str(action.get("type") or "").casefold() == "observe"
                    ),
                    "",
                )
                repeated_result = _result_from_structured_observation(
                    observed_context["portalObservation"],
                    page=request.start_path,
                    section_name=section_hint,
                    answer_shape=reader_answer_shape(question, bounded_conversation_context),
                    scope=verified_scope,
                    question=question,
                )
                if repeated_result is not None:
                    semantic_resolution = record_semantic_resolution(
                        decision="fallback",
                        reason="invalid_repeated_observe_plan",
                        llm_plan=next_plan,
                        result=repeated_result,
                        fallback_strategy="structured_unique_evidence",
                    )
                    return ReaderOutcome(
                        repeated_result,
                        {
                            "stage": "completed_from_existing_observation",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(next_plan),
                            "observation": observed_context["portalObservation"],
                            "result": repeated_result.public_json(),
                            "semanticResolution": semantic_resolution,
                        },
                    )
                result = ReaderResult(
                    status="not_confirmed",
                    summary="The repeated observation did not identify a single section with new verifiable evidence.",
                    page=request.start_path,
                    section=section_hint,
                    scope=verified_scope,
                    missing=("repeated_observe_without_new_evidence",),
                )
                return ReaderOutcome(
                    result,
                    {
                        "stage": "planning_after_observe",
                        "permission": permission_audit,
                        "plan": bounded_json(next_plan),
                        "observation": observed_context["portalObservation"],
                    },
                )
            if next_request is not None:
                trace.record(
                    "semantic_resolution",
                    "passed",
                    input_summary={"reason": "after_observe", "llmMode": "portal_read"},
                    output_summary={"decision": "follow_up_read", "actionCount": len(next_request.actions)},
                )
            if (
                next_request is None
                or len(request.actions) + len(next_request.actions) > self.policy.max_actions
                or len(portal_request_paths(request) | portal_request_paths(next_request)) > self.policy.max_pages
            ):
                result = ReaderResult(status="not_confirmed", summary="The follow-up portal plan was not valid.", missing=("invalid_follow_up_plan",))
                return ReaderOutcome(result, {"stage": "planning_after_observe", "permission": permission_audit, "plan": bounded_json(next_plan), "observation": observed_context["portalObservation"]})
            policy_error = validate_policy(next_request, reason="after_observe")
            if policy_error:
                status: ReaderStatus = "no_permission" if policy_error in {"page_not_permitted", "permission_context_incomplete", "button_not_permitted"} else "not_confirmed"
                result = ReaderResult(status=status, summary="The follow-up portal operation is not permitted.", missing=(policy_error,))
                return ReaderOutcome(result, {"stage": "policy_after_observe", "permission": permission_audit, "policyError": policy_error, "plan": bounded_json(next_request.as_payload())})
            try:
                tool_result = await portal_read_stage(
                    next_request,
                    timeout_stage="portal_read_after_observe",
                    attempt="after_observe",
                )
            except ReaderStageTimeout as exc:
                missing = "reader_total_timeout" if exc.total_budget else "portal_read_timeout"
                result = ReaderResult(status="load_failed", summary="The follow-up Admin Portal page read did not complete in time.", missing=(missing,))
                return ReaderOutcome(result, {**_timeout_evidence(exc, budget), "permission": permission_audit})
            request = next_request
            follow_up_payload = tool_result.get("result") if isinstance(tool_result, dict) else None
            follow_up_observation = (
                follow_up_payload.get("observation") if isinstance(follow_up_payload, dict) else None
            )
            if follow_up_observation is not None:
                bounded_follow_up_observation = bounded_json(
                    follow_up_observation,
                    max_depth=6,
                    max_items=50,
                    max_string=300,
                )
                follow_up_shape = reader_answer_shape(question, bounded_conversation_context)
                follow_up_section = next(
                    (
                        str(action.get("section") or "").strip()
                        for action in reversed(next_request.actions)
                        if action.get("section")
                    ),
                    "",
                ) or _infer_observation_section(
                    bounded_follow_up_observation,
                    question=question,
                    expected_fields=next_request.expected_fields,
                    answer_shape=follow_up_shape,
                )
                post_action_context = {
                    **knowledge_context,
                    "portalObservation": bounded_follow_up_observation,
                    "priorPortalRead": bounded_json(next_request.as_payload(), max_depth=4, max_items=30, max_string=200),
                }
                post_action_plan: Any = None
                post_action_error = ""
                try:
                    post_action_plan = await plan_stage(
                        post_action_context,
                        timeout_stage="planning_after_read_state_change",
                        reason="after_read_state_change",
                    )
                except ReaderStageTimeout as exc:
                    post_action_error = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                except (httpx.HTTPError, RuntimeError, ValueError, TypeError, IndexError):
                    post_action_error = "planner_error"

                post_action_request = portal_read_request_from_plan(post_action_plan)
                follow_up_result = observation_result_from_plan(
                    post_action_plan,
                    bounded_follow_up_observation,
                    verified_scope=verified_scope,
                    observed_page=next_request.start_path,
                    permitted_paths=(*permission_context.pages, *permission_context.subpages),
                )
                post_action_plan, follow_up_result = await repair_partial_observation(
                    post_action_plan, follow_up_result, post_action_context, page=next_request.start_path,
                )
                post_action_request = portal_read_request_from_plan(post_action_plan)
                if (
                    category_requirement
                    and category_read_is_in_place
                    and follow_up_shape in {"list", "detail"}
                    and not _observation_has_category_children(
                        bounded_follow_up_observation,
                        category_requirement.semantic_label,
                    )
                    and post_action_request is None
                ):
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The selected category did not expose matching child evidence.",
                        page=next_request.start_path,
                        section=category_requirement.semantic_label,
                        answer_shape=follow_up_shape,
                        scope=verified_scope,
                        missing=("collection_children_not_confirmed",),
                    )
                    semantic_resolution = record_semantic_resolution(
                        decision="not_confirmed",
                        reason="category_child_evidence_not_confirmed",
                        llm_plan=post_action_plan,
                        result=result,
                    )
                    return ReaderOutcome(
                        result,
                        {
                            "stage": "validation_after_read_state_change",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(post_action_plan),
                            "portalReadPlan": bounded_json(next_request.as_payload()),
                            "observation": bounded_follow_up_observation,
                            "result": result.public_json(),
                            "semanticResolution": semantic_resolution,
                        },
                    )
                if follow_up_result is not None and (follow_up_result.status in {"success", "no_data"} or follow_up_result.facts):
                    semantic_resolution = record_semantic_resolution(
                        decision="llm_result",
                        reason="validated_post_action_observation_result",
                        llm_plan=post_action_plan,
                        result=follow_up_result,
                    )
                    return ReaderOutcome(
                        follow_up_result,
                        {
                            "stage": "completed_after_read_state_change",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(post_action_plan),
                            "portalReadPlan": bounded_json(next_request.as_payload()),
                            "observation": bounded_follow_up_observation,
                            "result": follow_up_result.public_json(),
                            "semanticResolution": semantic_resolution,
                        },
                    )
                post_action_planned_result = _observation_plan_result_from_plan(post_action_plan)
                fallback_reason = post_action_error
                if not fallback_reason and post_action_planned_result is not None:
                    fallback_reason = (
                        "llm_not_confirmed"
                        if post_action_planned_result.status == "not_confirmed"
                        and follow_up_result is not None
                        else "invalid_observation_references"
                    )
                if not fallback_reason and post_action_request is None:
                    fallback_reason = "invalid_semantic_schema"
                if fallback_reason:
                    planned_section = (
                        (post_action_planned_result.source_section or post_action_planned_result.section)
                        if post_action_planned_result is not None
                        else ""
                    )
                    fallback_section = planned_section or follow_up_section
                    fallback_answer_shape = (
                        post_action_planned_result.answer_shape
                        if post_action_planned_result is not None
                        and post_action_planned_result.answer_shape != "unspecified"
                        else follow_up_shape
                    )
                    fallback_result, fallback_strategy = deterministic_observation_fallback(
                        bounded_follow_up_observation,
                        page=next_request.start_path,
                        section=fallback_section,
                        answer_shape=fallback_answer_shape,
                        scope=verified_scope,
                        selection=post_action_planned_result,
                    )
                    semantic_resolution = record_semantic_resolution(
                        decision="fallback" if fallback_result is not None else "not_confirmed",
                        reason=fallback_reason,
                        llm_plan=post_action_plan,
                        result=fallback_result or follow_up_result,
                        fallback_strategy=fallback_strategy,
                    )
                    if fallback_result is not None:
                        return ReaderOutcome(
                            fallback_result,
                            {
                                "stage": "completed_after_read_state_change_fallback",
                                "permission": permission_audit,
                                "knowledge": knowledge_context,
                                "plan": bounded_json(post_action_plan),
                                "portalReadPlan": bounded_json(next_request.as_payload()),
                                "observation": bounded_follow_up_observation,
                                "result": fallback_result.public_json(),
                                "semanticResolution": semantic_resolution,
                            },
                        )
                    if follow_up_result is not None:
                        return ReaderOutcome(
                            follow_up_result,
                            {
                                "stage": "completed_after_read_state_change",
                                "permission": permission_audit,
                                "knowledge": knowledge_context,
                                "plan": bounded_json(post_action_plan),
                                "portalReadPlan": bounded_json(next_request.as_payload()),
                                "observation": bounded_follow_up_observation,
                                "result": follow_up_result.public_json(),
                                "semanticResolution": semantic_resolution,
                            },
                        )
                    if (
                        post_action_planned_result is not None
                        and post_action_planned_result.status == "not_confirmed"
                    ):
                        unconfirmed_result = replace(
                            post_action_planned_result,
                            page=next_request.start_path,
                            scope=verified_scope,
                            facts=(),
                        )
                        return ReaderOutcome(
                            unconfirmed_result,
                            {
                                "stage": "completed_after_read_state_change",
                                "permission": permission_audit,
                                "knowledge": knowledge_context,
                                "plan": bounded_json(post_action_plan),
                                "portalReadPlan": bounded_json(next_request.as_payload()),
                                "observation": bounded_follow_up_observation,
                                "result": unconfirmed_result.public_json(),
                                "semanticResolution": semantic_resolution,
                            },
                        )
                if post_action_request is not None:
                    # The post-action observation is already fresh and
                    # permission-checked. Give the bounded deterministic
                    # resolver one chance to answer from it before reporting
                    # that another portal read is required.
                    fallback_result, fallback_strategy = deterministic_observation_fallback(
                        bounded_follow_up_observation,
                        page=next_request.start_path,
                        section=follow_up_section,
                        answer_shape=follow_up_shape,
                        scope=verified_scope,
                    )
                    if fallback_result is not None:
                        semantic_resolution = record_semantic_resolution(
                            decision="fallback",
                            reason="post_action_plan_redundant_for_observation",
                            llm_plan=post_action_plan,
                            result=fallback_result,
                            fallback_strategy=fallback_strategy,
                        )
                        return ReaderOutcome(
                            fallback_result,
                            {
                                "stage": "completed_after_read_state_change_fallback",
                                "permission": permission_audit,
                                "knowledge": knowledge_context,
                                "plan": bounded_json(post_action_plan),
                                "portalReadPlan": bounded_json(next_request.as_payload()),
                                "observation": bounded_follow_up_observation,
                                "result": fallback_result.public_json(),
                                "semanticResolution": semantic_resolution,
                            },
                        )
                    post_action_policy_error = validate_policy(post_action_request, reason="after_read_state_change")
                    if not post_action_policy_error:
                        cumulative_actions = len(request.actions) + len(next_request.actions) + len(post_action_request.actions)
                        cumulative_pages = len(
                            portal_request_paths(request)
                            | portal_request_paths(next_request)
                            | portal_request_paths(post_action_request)
                        )
                        if cumulative_actions <= self.policy.max_actions and cumulative_pages <= self.policy.max_pages:
                            try:
                                replay_result = await portal_read_stage(
                                    post_action_request,
                                    timeout_stage="portal_read_after_read_state_change",
                                    attempt="after_read_state_change",
                                )
                            except ReaderStageTimeout as exc:
                                missing = "reader_total_timeout" if exc.total_budget else "portal_read_timeout"
                                result = ReaderResult(
                                    status="load_failed",
                                    summary="The bounded replay portal read did not complete in time.",
                                    page=post_action_request.start_path,
                                    scope=verified_scope,
                                    missing=(missing,),
                                )
                                return ReaderOutcome(
                                    result,
                                    {
                                        **_timeout_evidence(exc, budget),
                                        "stage": "portal_read_after_read_state_change",
                                        "permission": permission_audit,
                                        "knowledge": knowledge_context,
                                        "plan": bounded_json(post_action_plan),
                                        "portalReadPlan": bounded_json(post_action_request.as_payload()),
                                    },
                                )
                            if replay_result is not None:
                                replay_payload = replay_result.get("result") if isinstance(replay_result, dict) else None
                                replay_observation = replay_payload.get("observation") if isinstance(replay_payload, dict) else None
                                replay_reader_result: ReaderResult | None = None
                                if replay_observation is not None:
                                    bounded_replay_observation = bounded_json(
                                        replay_observation, max_depth=6, max_items=50, max_string=300
                                    )
                                    try:
                                        replay_plan = await plan_stage(
                                            {
                                                **knowledge_context,
                                                "portalObservation": bounded_replay_observation,
                                                "priorPortalRead": bounded_json(post_action_request.as_payload(), max_depth=4, max_items=30, max_string=200),
                                            },
                                            timeout_stage="planning_after_bounded_replay",
                                            reason="after_bounded_replay",
                                        )
                                    except (ReaderStageTimeout, httpx.HTTPError, RuntimeError, ValueError, TypeError, IndexError):
                                        replay_plan = None
                                    replay_reader_result = observation_result_from_plan(
                                        replay_plan,
                                        bounded_replay_observation,
                                        verified_scope=verified_scope,
                                        observed_page=post_action_request.start_path,
                                        permitted_paths=(*permission_context.pages, *permission_context.subpages),
                                    )
                                    if replay_reader_result is None:
                                        replay_reader_result = deterministic_observation_fallback(
                                            bounded_replay_observation,
                                            page=post_action_request.start_path,
                                            section=follow_up_section,
                                            answer_shape=follow_up_shape,
                                            scope=verified_scope,
                                            selection=_observation_plan_result_from_plan(replay_plan),
                                        )[0]
                                if replay_reader_result is not None and replay_reader_result.status in {"success", "no_data"}:
                                    semantic_resolution = record_semantic_resolution(
                                        decision="follow_up_read",
                                        reason="bounded_replay_after_state_change",
                                        llm_plan=post_action_plan,
                                        result=replay_reader_result,
                                    )
                                    return ReaderOutcome(
                                        replay_reader_result,
                                        {
                                            "stage": "completed_after_bounded_replay",
                                            "permission": permission_audit,
                                            "knowledge": knowledge_context,
                                            "plan": bounded_json(post_action_plan),
                                            "portalReadPlan": bounded_json(post_action_request.as_payload()),
                                            "observation": bounded_json(replay_observation) if replay_observation is not None else {},
                                            "result": replay_reader_result.public_json(),
                                            "semanticResolution": semantic_resolution,
                                        },
                                    )
                    semantic_resolution = record_semantic_resolution(
                        decision="additional_read_not_executed",
                        reason="post_action_requires_additional_read",
                        llm_plan=post_action_plan,
                    )
                    result = ReaderResult(
                        status="not_confirmed",
                        summary="The post-action observation requires another bounded read.",
                        page=next_request.start_path,
                        missing=("additional_portal_read_required",),
                    )
                    return ReaderOutcome(
                        result,
                        {
                            "stage": "planning_after_read_state_change",
                            "permission": permission_audit,
                            "plan": bounded_json(post_action_plan),
                            "observation": bounded_follow_up_observation,
                            "semanticResolution": semantic_resolution,
                        },
                    )
        result = _align_result_to_answer_shape(
            _reader_result_from_tool(tool_result),
            question,
            bounded_conversation_context,
        )
        retryable_control_failures = {
            "reader_selector_not_found",
            "reader_click_descriptor_mismatch",
            "reader_click_role_mismatch",
            "reader_tab_state_not_confirmed",
            "reader_filter_control_unsupported",
            "reader_filter_option_not_found",
        }
        raw_final_payload = tool_result.get("result") if isinstance(tool_result, dict) else None
        final_limitations = set(
            _strings(raw_final_payload.get("limitations") or (), limit=10)
            if isinstance(raw_final_payload, dict)
            else ()
        )
        if (
            result.status == "load_failed"
            and final_limitations.intersection(retryable_control_failures)
            and not any(str(action.get("type") or "").casefold() == "observe" for action in request.actions)
        ):
            observe_request = PortalReadRequest(
                start_path=request.start_path,
                actions=({"type": "observe"},),
                expected_fields=(),
            )
            if validate_policy(observe_request, reason="control_failure_recovery") is None:
                try:
                    observed_tool_result = await portal_read_stage(
                        observe_request,
                        timeout_stage="portal_observe_after_control_failure",
                        attempt="control_failure_recovery",
                    )
                except ReaderStageTimeout:
                    observed_tool_result = {}
                observed_payload = (
                    observed_tool_result.get("result")
                    if isinstance(observed_tool_result, dict)
                    else None
                )
                retry_observation = (
                    observed_payload.get("observation")
                    if isinstance(observed_payload, dict)
                    else None
                )
                if retry_observation is not None:
                    bounded_retry_observation = bounded_json(
                        retry_observation,
                        max_depth=6,
                        max_items=50,
                        max_string=300,
                    )
                    retry_shape = reader_answer_shape(question, bounded_conversation_context)
                    retry_section = _infer_observation_section(
                        bounded_retry_observation,
                        question=question,
                        answer_shape=retry_shape,
                    )
                    recovery_plan: Any = None
                    recovery_error = ""
                    try:
                        recovery_plan = await plan_stage(
                            {
                                **knowledge_context,
                                "portalObservation": bounded_retry_observation,
                                "priorPortalFailure": bounded_json(
                                    raw_final_payload, max_depth=4, max_items=20, max_string=160
                                ),
                            },
                            timeout_stage="planning_after_control_failure_observe",
                            reason="after_control_failure_observe",
                        )
                    except ReaderStageTimeout as exc:
                        recovery_error = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                    except (httpx.HTTPError, RuntimeError, ValueError, TypeError, IndexError):
                        recovery_error = "planner_error"
                    verified_scope = _permission_result_scope(permission_context)
                    observed_result = observation_result_from_plan(
                        recovery_plan,
                        bounded_retry_observation,
                        verified_scope=verified_scope,
                        observed_page=request.start_path,
                        permitted_paths=(*permission_context.pages, *permission_context.subpages),
                    )
                    recovery_plan, observed_result = await repair_partial_observation(
                        recovery_plan, observed_result,
                        {**knowledge_context, "portalObservation": bounded_retry_observation},
                        page=request.start_path,
                    )
                    if observed_result is not None and (observed_result.status in {"success", "no_data"} or observed_result.facts):
                        semantic_resolution = record_semantic_resolution(
                            decision="llm_result",
                            reason="validated_control_failure_observation_result",
                            llm_plan=recovery_plan,
                            result=observed_result,
                        )
                        return ReaderOutcome(
                            observed_result,
                            {
                                "stage": "completed_from_control_failure_observation",
                                "permission": permission_audit,
                                "knowledge": knowledge_context,
                                "failedPlan": bounded_json(request.as_payload()),
                                "failure": bounded_json(raw_final_payload),
                                "observation": bounded_retry_observation,
                                "result": observed_result.public_json(),
                                "semanticResolution": semantic_resolution,
                            },
                        )
                    recovery_planned_result = _observation_plan_result_from_plan(recovery_plan)
                    recovery_request = portal_read_request_from_plan(recovery_plan)
                    fallback_reason = recovery_error
                    if not fallback_reason and recovery_planned_result is not None:
                        fallback_reason = (
                            "llm_not_confirmed"
                            if recovery_planned_result.status == "not_confirmed"
                            and observed_result is not None
                            else "invalid_observation_references"
                        )
                    if not fallback_reason and recovery_request is None:
                        fallback_reason = "invalid_semantic_schema"
                    if fallback_reason:
                        planned_section = (
                            recovery_planned_result.source_section or recovery_planned_result.section
                            if recovery_planned_result is not None
                            else ""
                        )
                        fallback_result, fallback_strategy = deterministic_observation_fallback(
                            bounded_retry_observation,
                            page=request.start_path,
                            section=planned_section or retry_section,
                            answer_shape=(
                                recovery_planned_result.answer_shape
                                if recovery_planned_result is not None
                                and recovery_planned_result.answer_shape != "unspecified"
                                else retry_shape
                            ),
                            scope=verified_scope,
                            selection=recovery_planned_result,
                        )
                        semantic_resolution = record_semantic_resolution(
                            decision="fallback" if fallback_result is not None else "not_confirmed",
                            reason=fallback_reason,
                            llm_plan=recovery_plan,
                            result=fallback_result or observed_result,
                            fallback_strategy=fallback_strategy,
                        )
                        if fallback_result is not None:
                            return ReaderOutcome(
                                fallback_result,
                                {
                                    "stage": "completed_from_control_failure_observation_fallback",
                                    "permission": permission_audit,
                                    "knowledge": knowledge_context,
                                    "failedPlan": bounded_json(request.as_payload()),
                                    "failure": bounded_json(raw_final_payload),
                                    "plan": bounded_json(recovery_plan),
                                    "observation": bounded_retry_observation,
                                    "result": fallback_result.public_json(),
                                    "semanticResolution": semantic_resolution,
                                },
                            )
        return ReaderOutcome(
            result,
            {
                "stage": "completed",
                "permission": permission_audit,
                "knowledge": knowledge_context,
                "plan": bounded_json(request.as_payload()),
                "portalEvidence": bounded_json(tool_result, max_depth=6, max_items=100, max_string=1_000),
            },
        )
