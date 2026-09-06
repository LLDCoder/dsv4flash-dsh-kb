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
        while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result["facts"]:
            result["facts"].pop()
        while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result["missing"]:
            result["missing"].pop()
        for field_name in ("workflowState", "selectedState", "sourceSection", "section", "page"):
            while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result[field_name]:
                result[field_name] = result[field_name][: max(0, len(result[field_name]) // 2)]
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

    if not isinstance(value, dict) or not isinstance(value.get("previousIntent"), dict):
        return {}
    previous = value["previousIntent"]
    limits = {
        "question": 500,
        "answerShape": 40,
        "category": 100,
        "page": 300,
        "section": 200,
        "scope": 40,
        "resultStatus": 40,
        "workflowState": 300,
    }
    bounded = {
        name: _sanitize_untrusted_text(previous.get(name), max_length=max_length)
        for name, max_length in limits.items()
        if previous.get(name) is not None
    }
    return {"previousIntent": bounded} if any(bounded.values()) else {}


def reader_answer_shape(
    question: str,
    conversation_context: dict[str, Any] | None = None,
) -> Literal["overview", "count", "list", "attention", "due", "detail", "unspecified"]:
    """Classify a generic answer shape without selecting a business destination."""

    normalized = re.sub(r"\s+", " ", str(question or "").casefold()).strip()
    if re.fullmatch(
        r"(?:show|display)(?: me)? my tasks?[?!.]*|(?:显示|查看)(?:一下)?我的任务[？。!！]*",
        normalized,
    ):
        return "overview"
    patterns = (
        ("attention", r"\battention\b|pay attention|需要.{0,8}(?:关注|留意)|(?:关注|留意).{0,8}(?:什么|哪些)"),
        ("due", r"\bdue\b|due soon|expir|overdue|到期|逾期"),
        ("detail", r"\bdetails?\b|详情|明细"),
        ("count", r"\bhow many\b|\bcount\b|\bnumber of\b|多少|几个|几项"),
        ("overview", r"\boverview\b|\bsummary\b|\bwhat (?:is shown|can i see)\b|概览|概况|总览"),
        ("list", r"\bshow\b|\blist\b|\bwhich\b|\bwhat are\b|显示|列出|哪些|有什么"),
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
        parts.append(
            "Continue within the current Admin Portal page unless the question explicitly names another page: "
            + previous_page
        )
    parts.append("Requested answer shape: " + reader_answer_shape(question, bounded_context))
    if isinstance(previous, dict):
        continuity = [
            f"{name}: {previous[name]}"
            for name in ("answerShape", "category", "page", "section")
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


def project_knowledge_result(
    value: Any,
    *,
    max_chunks: int = 8,
    max_content: int = 1_000,
    max_bytes: int = 10_000,
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
        safe_content = _sanitize_knowledge_text(content, max_length=max_content)
        if not safe_content:
            continue
        item: dict[str, Any] = {"content": safe_content}
        source_name = (
            raw_item.get("source_name")
            or nested.get("source_name")
            or raw_item.get("document_keyword")
            or nested.get("document_keyword")
        )
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
    def _contains_forbidden_term(value: object) -> bool:
        decoded = unquote(str(value or "")).casefold()
        compact = re.sub(r"[^a-z]", "", decoded)
        return any(term in compact for term in FORBIDDEN_ACTION_TERMS)

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
        if self._contains_forbidden_term(request.start_path):
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
            dismiss_label = action_type == "dismiss_overlay" and _key(action.get("label") or action.get("name")) in {"close", "dismiss"}
            if (
                (self._contains_forbidden_term(action.get("label")) and not dismiss_label)
                or self._contains_forbidden_term(action.get("selector"))
            ):
                return "action_not_read_only"
            permission_code = action.get("permissionCode") or action.get("permission_code")
            if action_type in {"expand_details", "show_detail"} and (not permission_code or not _click_permission_matches(action, permissions.buttons)):
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
            method = str(action.get("method") or "GET").strip().upper()
            # Query means interacting with the already-loaded page, not calling
            # an arbitrary API endpoint. The isolated executor owns all network
            # traffic, so model-provided POST requests are never accepted.
            if method != "GET":
                return "method_not_read_only"
            for name in ("path", "url"):
                if name in action and not self._safe_path(action[name]):
                    return "invalid_navigation_path"
                if name in action and self._contains_forbidden_term(action[name]):
                    return "action_not_read_only"
                if name in action:
                    action_path = str(action[name])
                    page_paths.add(action_path)
                    if allowed_pages and not any(permission_path_matches(action_path, page) for page in allowed_pages):
                        return "page_not_permitted"
            parameters = action.get("parameters") or action.get("filters") or {}
            if not isinstance(parameters, dict):
                return "invalid_action_parameters"
            if any(self._contains_forbidden_term(name) for name in parameters):
                return "action_not_read_only"
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
        actions.append(normalized_action)
    fields = _strings(candidate.get("expectedFields") or candidate.get("expected_fields") or (), limit=30)
    return PortalReadRequest(start_path=start_path, actions=tuple(actions), expected_fields=fields)


def _normalize_initial_observation_request(request: PortalReadRequest) -> PortalReadRequest | None:
    """Collapse an all-observe plan after its original fields pass policy.

    Returning ``None`` means observe was mixed with another action. Callers
    must validate the unmodified request first so unsafe metadata cannot be
    hidden by normalization.
    """

    action_types = tuple(
        str(action.get("type") or "").strip().casefold().replace("-", "_")
        for action in request.actions
    )
    if "observe" not in action_types:
        return request
    if not action_types or any(action_type != "observe" for action_type in action_types):
        return None
    return PortalReadRequest(
        start_path=request.start_path,
        actions=({"type": "observe"},),
        expected_fields=request.expected_fields,
    )


def knowledge_result_from_plan(plan: Any) -> ReaderResult | None:
    """Validate the planner's closed knowledge-only result shape."""

    if not isinstance(plan, dict) or plan.get("mode") != "knowledge_only":
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
        summary="The knowledge base answered the request." if status == "success" else "The knowledge result is incomplete.",
        page=str(plan.get("page") or "")[:500],
        section=str(plan.get("section") or "")[:300],
        source_section=str(plan.get("sourceSection") or plan.get("section") or "")[:300],
        answer_shape=answer_shape,  # type: ignore[arg-type]
        completeness=completeness,  # type: ignore[arg-type]
        selected_state=str(plan.get("selectedState") or "")[:300],
        scope=scope,  # type: ignore[arg-type]
        facts=tuple(str(item)[:500] for item in facts[:20]),
        workflow_state=str(plan.get("workflowState") or "")[:500],
        missing=tuple(str(item)[:500] for item in missing[:10]),
    )


_DOCUMENTATION_QUESTION_MARKERS = ("manual", "documented", "documentation", "user guide", "手册", "文档", "说明", "دليل")
_LIVE_TIME_MARKERS = (
    "current", "currently", "right now", "today", "latest",
    "当前", "现在", "目前", "今天", "最新", "此刻",
    "حالي", "حاليًا", "الآن", "اليوم", "الأحدث",
)
_LIVE_STATE_MARKERS = (
    "visible", "which ", "list ", "show ", "how many", "overdue", "due soon",
    "哪些", "有没有", "多少", "逾期", "到期", "快到期",
    "اعرض", "كم ", "متأخر", "مستحق",
)
_KNOWLEDGE_SENTINELS = ("[truncated]", "knowledge_error", "knowledge timeout", "knowledge_timeout")
_KNOWLEDGE_PROSE_TERMS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
        "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "were",
        "will", "with",
    }
)


def question_requires_live_portal(question: str) -> bool:
    """Identify generic freshness/personalization language without module routing."""

    normalized = re.sub(r"\s+", " ", str(question or "")).strip().casefold()
    documentation_intent = any(marker in normalized for marker in _DOCUMENTATION_QUESTION_MARKERS)
    personal_intent = bool(
        re.search(r"\b(?:my|mine|do i|can i|for me|i have)\b", normalized)
        or any(marker in normalized for marker in ("我的", "我有", "我能", "我可以", "对我", "لدي", "خاصتي", "هل لدي"))
    )
    current_or_visible = any(marker in normalized for marker in (*_LIVE_TIME_MARKERS, "visible", "我能看到", "الظاهرة"))
    definition_intent = bool(
        re.search(r"\bwhat (?:does|do)\b.*\bmean\b", normalized)
        or any(marker in normalized for marker in ("是什么意思", "含义是什么", "ما معنى"))
    )
    if documentation_intent and definition_intent and not current_or_visible:
        return False
    if current_or_visible or personal_intent:
        return True
    if documentation_intent:
        return False
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
        text = re.sub(r"\s+", " ", content).strip()
        if text and not any(marker in text.casefold() for marker in _KNOWLEDGE_SENTINELS):
            values.append(text[:2_000])
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


def _knowledge_unit_supports_fact(fact: str, unit: str) -> bool:
    normalized_fact = re.sub(r"\s+", " ", fact).strip().casefold()
    normalized_unit = re.sub(r"\s+", " ", unit).strip().casefold()
    if not normalized_fact or not normalized_unit:
        return False
    if _negative_polarity(normalized_fact) != _negative_polarity(normalized_unit):
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


def knowledge_supports_result(result: ReaderResult, knowledge_context: Any) -> bool:
    """Require knowledge-only success facts to be grounded in retrieved content."""

    if result.status != "success" or not result.facts:
        return False
    evidence = _knowledge_evidence_strings(knowledge_context)
    if not evidence:
        return False
    for fact in result.facts:
        normalized_fact = re.sub(r"\s+", " ", fact).strip().casefold()
        if not normalized_fact or any(marker in normalized_fact for marker in _KNOWLEDGE_SENTINELS):
            return False
        supported = False
        for chunk in evidence:
            units = [item.strip() for item in re.split(r"[.!?。！？,，،;；\n]+", chunk) if item.strip()]
            if any(_knowledge_unit_supports_fact(fact, unit) for unit in units):
                supported = True
                break
        if not supported:
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
    text = " ".join(_observation_scalar_strings(observation)).casefold()
    if any(
        marker in text
        for marker in (
            "unauthorized", "forbidden", "access denied", "permission denied", "something went wrong",
            "internal server error", "page not found", "loading", "please wait", "retry",
            "未授权", "无权限", "禁止访问", "加载中", "重试",
        )
    ):
        return True
    return bool(
        re.search(r"\b(?:http|error|status code)\s*:?[45]\d{2}\b", text)
        or re.search(r"\b[45]\d{2}\s+(?:error|unauthorized|forbidden|not found|server error)\b", text)
    )


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
    if not heading:
        return None
    return {
        "heading": heading,
        "sourceSection": heading,
        "headings": [heading],
        "columnHeaders": list(section.get("columnHeaders")) if isinstance(section.get("columnHeaders"), (list, tuple)) else [],
        "rowSummaries": list(section.get("rowSummaries")) if isinstance(section.get("rowSummaries"), (list, tuple)) else [],
        "controls": list(section.get("controls")) if isinstance(section.get("controls"), (list, tuple)) else [],
        "summaries": list(section.get("summaries")) if isinstance(section.get("summaries"), (list, tuple)) else [],
        "cardSummaries": list(section.get("cardSummaries")) if isinstance(section.get("cardSummaries"), (list, tuple)) else [],
        "selectedState": str(section.get("selectedState") or "")[:300],
        "emptyState": str(section.get("emptyState") or "")[:300],
    }


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
    """Return one section's evidence, falling back only for legacy observations."""

    structured = _structured_observation_sections(observation)
    if not structured:
        return observation if isinstance(observation, dict) else None
    if not section_name.strip():
        return structured[0] if len(structured) == 1 else None
    expected = re.sub(r"\s+", " ", section_name).strip().casefold()
    matches = [
        section
        for section in structured
        if expected == section["heading"].casefold()
        or expected in section["heading"].casefold()
        or section["heading"].casefold() in expected
    ]
    return matches[0] if len(matches) == 1 else None


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

    if answer_shape not in {"count", "list", "attention", "due"}:
        return None
    section = _observation_evidence_for_section(observation, section_name)
    if section is None:
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
            scope=scope,
            facts=facts,
        )
    if _raw_observation_has_empty_state(section):
        return ReaderResult(
            status="no_data",
            summary="The requested portal section is empty.",
            page=str(page)[:500],
            section=str(section.get("heading") or section_name)[:300],
            source_section=str(section.get("heading") or section_name)[:300],
            answer_shape=answer_shape,
            completeness="bounded",
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
    if _observation_has_error_state(observation):
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
            return ReaderResult(
                status="no_data",
                summary="The requested portal section is empty.",
                page=str(page)[:500],
                section=str(source.get("heading") or section)[:300],
                source_section=str(source.get("heading") or section)[:300],
                answer_shape="list",
                completeness="bounded",
                scope=scope,
            )
        return None
    if intent == "overview" and not controls and not summaries:
        if _raw_observation_has_empty_state(source):
            return ReaderResult(
                status="no_data",
                summary="The requested portal section is empty.",
                page=str(page)[:500],
                section=str(source.get("heading") or section)[:300],
                source_section=str(source.get("heading") or section)[:300],
                answer_shape="overview",
                completeness="bounded",
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


def _observation_supports_fact(fact: str, observation: Any) -> bool:
    """Require a fact's labels, values, polarity and numbers in one observed unit.

    Natural-language glue may be translated or paraphrased, while statuses,
    labels, dates and counts must come directly from the bounded observation.
    """

    values = _observation_scalar_strings(observation)
    if not values or not fact.strip():
        return False
    structural_values = (
        *_bounded_observation_field(observation, "columnHeaders", limit=20),
        *_bounded_observation_field(observation, "labels", limit=20),
    )
    structural_tokens = frozenset(
        token
        for value in structural_values
        for token in re.findall(r"[a-z][a-z0-9_-]*", value.casefold())
    )
    return any(
        _observation_unit_supports_fact(fact, value, structural_tokens=structural_tokens)
        for value in values
    )


def _unconfirmed_observation_fact(fact: str) -> str:
    normalized = re.sub(r"\s+", " ", fact).strip()
    return f"unconfirmed_fact: {normalized}"[:500]


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


def observation_result_from_plan(
    plan: Any,
    observation: Any,
    *,
    verified_scope: Literal["personal", "team", "global", "unknown"] = "unknown",
) -> ReaderResult | None:
    """Keep the observation-grounded subset of a post-observe result."""

    result = knowledge_result_from_plan(plan)
    if result is None:
        return None
    scoped_observation = _observation_evidence_for_section(observation, result.section)
    if result.status == "not_confirmed":
        return ReaderResult(
            status=result.status,
            summary=result.summary,
            page=result.page,
            section=result.section,
            source_section=result.source_section or result.section,
            answer_shape=result.answer_shape,
            completeness=result.completeness,
            selected_state=result.selected_state,
            scope=verified_scope,
            missing=result.missing,
        )
    if scoped_observation is None:
        return None
    if result.status == "success":
        supported: list[str] = []
        unsupported: list[str] = []
        for fact in result.facts:
            (supported if _observation_supports_fact(fact, scoped_observation) else unsupported).append(fact)
        supported_facts = tuple(supported)
        if not supported_facts:
            return None
        missing = tuple(
            [*result.missing, *(_unconfirmed_observation_fact(fact) for fact in unsupported)][:10]
        )
        result = ReaderResult(
            status=result.status,
            summary=result.summary,
            page=result.page,
            section=result.section,
            source_section=result.source_section or result.section,
            answer_shape=result.answer_shape,
            completeness=result.completeness,
            selected_state=result.selected_state,
            scope=result.scope,
            facts=supported_facts,
            workflow_state=result.workflow_state,
            missing=missing,
        )
    elif result.status == "no_data":
        evidence_text = " ".join(_observation_scalar_strings(scoped_observation)).casefold()
        if not any(marker in evidence_text for marker in _EXPLICIT_EMPTY_MARKERS):
            return None

    return ReaderResult(
        status=result.status,
        summary="The portal observation answered the request." if result.status == "success" else result.summary,
        page=result.page,
        section=result.section,
        source_section=result.source_section or result.section,
        answer_shape=result.answer_shape,
        completeness=result.completeness,
        selected_state=result.selected_state,
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
    """Keep final Tool facts within the user's requested response shape."""

    answer_shape = reader_answer_shape(question, conversation_context)
    if result.status != "success":
        return replace(
            result,
            answer_shape=answer_shape if answer_shape != "unspecified" else result.answer_shape,
        )
    if answer_shape != "due":
        return replace(
            result,
            answer_shape=answer_shape if answer_shape != "unspecified" else result.answer_shape,
        )

    normalized_question = question.casefold()
    due_soon_only = bool(re.search(r"due soon|expir|即将|到期|قريب", normalized_question)) and not bool(
        re.search(r"overdue|逾期|متأخر", normalized_question)
    )
    if not due_soon_only:
        return replace(result, answer_shape="due")
    due_facts = tuple(
        fact
        for fact in result.facts
        if re.search(r"\bdue in\b|即将|到期|قريب", fact.casefold())
        and not re.search(r"\boverdue\b|逾期|متأخر", fact.casefold())
    )
    if due_facts:
        return replace(
            result,
            summary="The requested due-soon portal items were found.",
            answer_shape="due",
            completeness="bounded",
            facts=due_facts,
        )
    return replace(
        result,
        status="not_confirmed",
        summary="No due-soon item was confirmed in the bounded portal result.",
        answer_shape="due",
        completeness="bounded",
        facts=(),
        missing=tuple((*result.missing, "due_soon_items_not_observed")[:10]),
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
            )
        except Exception as exc:
            trace.record(
                "reader_runtime",
                "failed",
                output_summary={"exceptionType": type(exc).__name__},
                failure_code="reader_runtime_error",
            )
            raise
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
    ) -> ReaderOutcome:
        budget = self.timeout_budget
        bounded_conversation_context = _bounded_conversation_context(conversation_context)

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
                    output_summary={"exceptionType": type(exc).__name__},
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
        needs_live_read = question_requires_live_portal(question)
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
        ):
            force_reason = (
                "current_portal_state_required"
                if needs_live_read
                else "knowledge_result_not_grounded_or_incomplete"
            )
            forced_context = {
                "knowledge": knowledge_context,
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
                "knowledge": knowledge_context,
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

        planned_request = portal_read_request_from_plan(plan)
        observation_section_hint = next(
            (
                str(action.get("section") or "").strip()
                for action in (planned_request.actions if planned_request is not None else ())
                if str(action.get("type") or "").casefold() == "observe" and action.get("section")
            ),
            "",
        )
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
        if observation is not None and any(str(action.get("type") or "").casefold() == "observe" for action in request.actions):
            observed_context = {
                "knowledge": knowledge_context,
                "portalObservation": bounded_json(observation, max_depth=5, max_items=50, max_string=300),
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
            if resolved_section_hint:
                direct_result = _result_from_structured_observation(
                    observed_context["portalObservation"],
                    page=request.start_path,
                    section_name=resolved_section_hint,
                    answer_shape=requested_answer_shape,
                    scope=_permission_result_scope(permission_context),
                    question=question,
                )
                if direct_result is None:
                    direct_result = observation_fallback_result(
                        question,
                        observed_context["portalObservation"],
                        page=request.start_path,
                        section=resolved_section_hint,
                        scope=_permission_result_scope(permission_context),
                        answer_shape=requested_answer_shape,
                    )
                if direct_result is not None:
                    return ReaderOutcome(
                        direct_result,
                        {
                            "stage": "completed_from_observation",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(request.as_payload()),
                            "observation": observed_context["portalObservation"],
                            "result": direct_result.public_json(),
                        },
                    )
            elif (
                requested_answer_shape in {"count", "list", "attention", "due"}
                and not _structured_observation_sections(observed_context["portalObservation"])
                and (
                    requested_answer_shape != "list"
                    or _observation_fallback_intent(question, requested_answer_shape) is not None
                )
            ):
                unscoped_result = _result_from_structured_observation(
                    observed_context["portalObservation"],
                    page=request.start_path,
                    section_name="",
                    answer_shape=requested_answer_shape,
                    scope=_permission_result_scope(permission_context),
                    question=question,
                )
                if unscoped_result is not None:
                    return ReaderOutcome(
                        unscoped_result,
                        {
                            "stage": "completed_from_observation",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(request.as_payload()),
                            "observation": observed_context["portalObservation"],
                            "result": unscoped_result.public_json(),
                        },
                    )
            try:
                next_plan = await plan_stage(
                    observed_context,
                    timeout_stage="planning_after_observe",
                    reason="after_observe",
                )
            except ReaderStageTimeout as exc:
                missing = "reader_total_timeout" if exc.total_budget else "planner_timeout"
                result = ReaderResult(status="not_confirmed", summary="The observed portal structure could not be interpreted in time.", missing=(missing,))
                return ReaderOutcome(
                    result,
                    {**_timeout_evidence(exc, budget), "permission": permission_audit, "observation": observed_context["portalObservation"]},
                )
            except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                result = ReaderResult(status="not_confirmed", summary="The observed portal structure could not be turned into a bounded read plan.")
                return ReaderOutcome(result, {"stage": "planning_after_observe", "permission": permission_audit, "observation": observed_context["portalObservation"], "errorType": type(exc).__name__})
            verified_scope = _permission_result_scope(permission_context)
            planned_result = knowledge_result_from_plan(next_plan)
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
                        "allowedFallback": "knowledge_only:not_confirmed",
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
                planned_result = knowledge_result_from_plan(next_plan)
            fallback_result = None
            if planned_result is not None and planned_result.status in {"success", "not_confirmed"}:
                fallback_result = observation_fallback_result(
                    question,
                    observed_context["portalObservation"],
                    page=request.start_path,
                    section=planned_result.section,
                    scope=verified_scope,
                    answer_shape=(
                        planned_result.answer_shape
                        if planned_result.answer_shape != "unspecified"
                        else requested_answer_shape
                    ),
                )
            if fallback_result is not None:
                return ReaderOutcome(
                    fallback_result,
                    {
                        "stage": "completed_from_observation",
                        "permission": permission_audit,
                        "knowledge": knowledge_context,
                        "plan": bounded_json(next_plan),
                        "observation": observed_context["portalObservation"],
                        "result": fallback_result.public_json(),
                    },
                )
            observed_result = observation_result_from_plan(
                next_plan,
                observed_context["portalObservation"],
                verified_scope=verified_scope,
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
                    },
                )
            next_request = portal_read_request_from_plan(next_plan)
            mixed_follow_up_observe = bool(
                next_request is not None
                and any(str(action.get("type") or "").casefold() == "observe" for action in next_request.actions)
                and any(str(action.get("type") or "").casefold() != "observe" for action in next_request.actions)
            )
            if (
                (next_request is None or mixed_follow_up_observe)
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
            repeated_observe = (
                next_request is not None
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
                    return ReaderOutcome(
                        repeated_result,
                        {
                            "stage": "completed_from_existing_observation",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(next_plan),
                            "observation": observed_context["portalObservation"],
                            "result": repeated_result.public_json(),
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
                    max_depth=5,
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
                follow_up_result = None
                if follow_up_section:
                    follow_up_result = _result_from_structured_observation(
                        bounded_follow_up_observation,
                        page=next_request.start_path,
                        section_name=follow_up_section,
                        answer_shape=follow_up_shape,
                        scope=verified_scope,
                        question=question,
                    )
                    if follow_up_result is None:
                        follow_up_result = observation_fallback_result(
                            question,
                            bounded_follow_up_observation,
                            page=next_request.start_path,
                            section=follow_up_section,
                            scope=verified_scope,
                            answer_shape=follow_up_shape,
                        )
                if follow_up_result is not None:
                    selected_state = next(
                        (
                            str(action.get("name") or action.get("label") or action.get("value") or "").strip()
                            for action in reversed(next_request.actions)
                            if str(action.get("type") or "").casefold() in {"switch_tab", "filter", "paginate", "sort"}
                        ),
                        "",
                    )
                    follow_up_result = replace(follow_up_result, selected_state=selected_state[:300])
                    return ReaderOutcome(
                        follow_up_result,
                        {
                            "stage": "completed_after_read_state_change",
                            "permission": permission_audit,
                            "knowledge": knowledge_context,
                            "plan": bounded_json(next_request.as_payload()),
                            "observation": bounded_follow_up_observation,
                            "result": follow_up_result.public_json(),
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
                        max_depth=5,
                        max_items=50,
                        max_string=300,
                    )
                    retry_shape = reader_answer_shape(question, bounded_conversation_context)
                    retry_section = _infer_observation_section(
                        bounded_retry_observation,
                        question=question,
                        answer_shape=retry_shape,
                    )
                    observed_result = _result_from_structured_observation(
                        bounded_retry_observation,
                        page=request.start_path,
                        section_name=retry_section,
                        answer_shape=retry_shape,
                        scope=_permission_result_scope(permission_context),
                        question=question,
                    )
                    if observed_result is not None:
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
