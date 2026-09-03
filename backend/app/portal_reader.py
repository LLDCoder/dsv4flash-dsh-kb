"""Generic, read-only Admin Portal reader orchestration.

The reader is deliberately independent from business-module Skills and Tools.
It obtains the current identity first, retrieves relevant documentation, then
executes one bounded ``admin.portal.read`` request.  Only the public result is
returned to the main assistant; technical evidence is kept separately for the
audit trail.
"""

from __future__ import annotations

import html
import hashlib
import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal, Protocol
from urllib.parse import unquote, urlsplit

import httpx

from .principal import Principal


ReaderStatus = Literal["success", "no_data", "no_permission", "load_failed", "not_confirmed"]
READER_STATUSES = frozenset({"success", "no_data", "no_permission", "load_failed", "not_confirmed"})
ALLOWED_READER_ACTIONS = frozenset({"observe", "navigate", "query", "filter", "paginate", "switch_tab", "expand_details"})
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


@dataclass(frozen=True)
class UserPermissionContext:
    user_id: str = ""
    roles: tuple[str, ...] = ()
    departments: tuple[str, ...] = ()
    pages: tuple[str, ...] = ()
    subpages: tuple[str, ...] = ()
    buttons: tuple[str, ...] = ()
    data_scope: dict[str, Any] = field(default_factory=dict)

    def prompt_json(self) -> dict[str, Any]:
        return bounded_json(asdict(self), max_depth=4, max_items=50, max_string=300)


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
            "timeoutSeconds": 45,
            "maxOutputItems": 20,
        }


@dataclass(frozen=True)
class ReaderResult:
    status: ReaderStatus
    summary: str
    page: str = ""
    section: str = ""
    scope: Literal["personal", "team", "global", "unknown"] = "unknown"
    facts: tuple[str, ...] = ()
    workflow_state: str = ""
    missing: tuple[str, ...] = ()

    def public_json(self) -> dict[str, Any]:
        result = {
            "result": self.status,
            "page": self.page[:500],
            "section": self.section[:300],
            "scope": self.scope,
            "facts": [str(item)[:400] for item in self.facts[:20]],
            "workflowState": self.workflow_state[:500],
            "missing": [str(item)[:200] for item in self.missing[:10]],
        }
        while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result["facts"]:
            result["facts"].pop()
        while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result["missing"]:
            result["missing"].pop()
        for field_name in ("workflowState", "section", "page"):
            while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 12_000 and result[field_name]:
                result[field_name] = result[field_name][: max(0, len(result[field_name]) // 2)]
        return result


@dataclass(frozen=True)
class ReaderOutcome:
    result: ReaderResult
    audit_evidence: dict[str, Any]


class ReaderPlanner(Protocol):
    async def plan_admin_portal_read(
        self,
        question: str,
        permission_context: dict[str, Any],
        knowledge_context: dict[str, Any],
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


def permission_context_from_user_info(payload: Any) -> UserPermissionContext:
    """Normalize portal-specific ``GetUserInfo`` shapes without trusting the client."""

    aliases = {
        "user": {"userid", "useridentifier", "adminuserid"},
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
    scope_values = _find_values(payload, aliases["scope"])
    scope = bounded_json(scope_values[0], max_depth=4, max_items=50, max_string=300) if scope_values else {}
    if not isinstance(scope, dict):
        scope = {"values": scope if isinstance(scope, list) else [scope]}
    return UserPermissionContext(
        user_id=user_id,
        roles=_strings(_find_values(payload, aliases["roles"])),
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
        "roles": list(context.roles[:20]),
        "departments": list(context.departments[:20]),
        "pageCount": len(context.pages),
        "subpageCount": len(context.subpages),
        "buttonCount": len(context.buttons),
        "observedAt": datetime.now(timezone.utc).isoformat(),
    }


def knowledge_search_query(question: str, context: UserPermissionContext) -> str:
    """Add current permission vocabulary so retrieval can disambiguate Admin manuals."""

    question_text = question.strip()[:1_200]
    parts = ["Admin Portal user manual", "Question: " + question_text]
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
    return ". ".join(parts)[:2_000]


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
        # Full markup is never useful to the main agent or audit viewer.
        plain = re.sub(r"<[^>]{1,500}>", " ", html.unescape(value))
        return re.sub(r"\s+", " ", plain).strip()[:max_string]
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)[:max_string]


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
            if self._contains_forbidden_term(action_type) or self._contains_forbidden_term(action.get("label")) or self._contains_forbidden_term(action.get("selector")):
                return "action_not_read_only"
            permission_code = action.get("permissionCode") or action.get("permission_code")
            if action_type == "expand_details" and (not permission_code or not _click_permission_matches(action, permissions.buttons)):
                return "button_not_permitted"
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
        "type", "path", "url", "selector", "label", "role", "name", "field", "section",
        "emptyState", "permissionCode", "value", "method", "parameters", "filters",
    }
    if any(not isinstance(action, dict) or not set(action).issubset(action_keys) for action in raw_actions):
        return None
    actions = tuple(dict(action) for action in raw_actions if isinstance(action, dict))
    fields = _strings(candidate.get("expectedFields") or candidate.get("expected_fields") or (), limit=30)
    return PortalReadRequest(start_path=start_path, actions=actions, expected_fields=fields)


def knowledge_result_from_plan(plan: Any) -> ReaderResult | None:
    """Validate the planner's closed knowledge-only result shape."""

    if not isinstance(plan, dict) or plan.get("mode") != "knowledge_only":
        return None
    allowed = {"mode", "result", "page", "section", "scope", "facts", "workflowState", "missing"}
    if not set(plan).issubset(allowed):
        return None
    status = str(plan.get("result") or "not_confirmed")
    if status not in {"success", "no_data", "not_confirmed"}:
        return None
    facts = plan.get("facts") or []
    missing = plan.get("missing") or []
    if not isinstance(facts, list) or not isinstance(missing, list):
        return None
    scope = str(plan.get("scope") or "unknown")
    if scope not in {"personal", "team", "global", "unknown"}:
        return None
    return ReaderResult(
        status=status,  # type: ignore[arg-type]
        summary="The knowledge base answered the request." if status == "success" else "The knowledge result is incomplete.",
        page=str(plan.get("page") or "")[:500],
        section=str(plan.get("section") or "")[:300],
        scope=scope,  # type: ignore[arg-type]
        facts=tuple(str(item)[:500] for item in facts[:20]),
        workflow_state=str(plan.get("workflowState") or "")[:500],
        missing=tuple(str(item)[:500] for item in missing[:10]),
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
    return ReaderResult(
        status=status,
        summary=summary[:2_000],
        page=str(payload.get("page") or next(iter(_strings(payload.get("pagesVisited") or (), limit=1)), ""))[:500],
        section=str(payload.get("section") or "")[:300],
        scope=str(payload.get("scope") or "unknown") if str(payload.get("scope") or "unknown") in {"personal", "team", "global", "unknown"} else "unknown",  # type: ignore[arg-type]
        facts=facts,
        workflow_state=str(payload.get("workflowState") or payload.get("workflow_state") or "")[:500],
        missing=_strings(payload.get("missing") or payload.get("limitations") or (), limit=10),
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
    ) -> None:
        self.gateway = gateway
        self.planner = planner
        self.policy = ReadOnlyPortalPolicy(portal_base_url)
        self.knowledge_folder_id = knowledge_folder_id
        self.knowledge_top_k = max(1, min(int(knowledge_top_k), 32))
        self.allowed_tools = list(allowed_tools)

    async def run(self, principal: Principal, question: str) -> ReaderOutcome:
        # This call must remain first. Never use client-provided role, page or
        # button claims as an authorization source.
        user_info = await self.gateway.get_user_info(principal)
        if not user_info.get("ok"):
            status: ReaderStatus = "no_permission" if user_info.get("code") == "permission_denied" else "load_failed"
            result = ReaderResult(status=status, summary="The current Admin Portal permissions could not be verified.")
            return ReaderOutcome(result, {"stage": "get_user_info", "userInfo": bounded_json(user_info)})

        permission_context = permission_context_from_user_info(user_info.get("result"))
        permission_audit = permission_audit_summary(permission_context)
        if not permission_context.user_id or str(permission_context.user_id) != str(principal.user_id):
            result = ReaderResult(
                status="no_permission",
                summary="The current Admin Portal identity could not be confirmed.",
                missing=("identity_mismatch",),
            )
            return ReaderOutcome(result, {"stage": "get_user_info", "permission": permission_audit, "identityMatch": False})
        if not permission_context.roles or not (*permission_context.pages, *permission_context.subpages):
            result = ReaderResult(
                status="no_permission",
                summary="No confirmed Admin Portal page permission is available for this user.",
                missing=("permission_context_incomplete",),
            )
            return ReaderOutcome(result, {"stage": "get_user_info", "permission": permission_audit, "identityMatch": True})
        knowledge_result: dict[str, Any] = {"ok": False, "code": "knowledge_not_configured"}
        if self.knowledge_folder_id:
            search_query = knowledge_search_query(question, permission_context)
            knowledge_result = await self.gateway.invoke(
                principal,
                "knowledge.search",
                {"query": search_query, "folder_id": self.knowledge_folder_id, "top_k": self.knowledge_top_k},
                allowed_tools=self.allowed_tools,
            )
        knowledge_context = bounded_json(knowledge_result, max_depth=4, max_items=30, max_string=500)
        try:
            plan = await self.planner.plan_admin_portal_read(question, permission_context.prompt_json(), knowledge_context)
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
        if knowledge_result_from_planner is not None:
            return ReaderOutcome(
                knowledge_result_from_planner,
                {
                    "stage": "knowledge_only",
                    "permission": permission_audit,
                    "knowledge": knowledge_context,
                    "result": knowledge_result_from_planner.public_json(),
                },
            )
        request = portal_read_request_from_plan(plan)
        if request is None:
            result = ReaderResult(status="not_confirmed", summary="The request did not produce a valid read-only portal plan.")
            return ReaderOutcome(result, {"stage": "planning", "plan": bounded_json(plan), "permission": permission_audit, "knowledge": knowledge_context})
        if any(str(action.get("type") or "").casefold() == "observe" for action in request.actions) and len(request.actions) != 1:
            result = ReaderResult(status="not_confirmed", summary="Portal observation must be a separate bounded step.", missing=("invalid_observation_plan",))
            return ReaderOutcome(result, {"stage": "planning", "plan": bounded_json(plan), "permission": permission_audit})
        policy_error = self.policy.validate(request, permission_context)
        if policy_error:
            status: ReaderStatus = "no_permission" if policy_error in {"page_not_permitted", "permission_context_incomplete", "button_not_permitted"} else "not_confirmed"
            result = ReaderResult(status=status, summary="The requested portal operation is not permitted by the read-only reader.", missing=(policy_error,))
            return ReaderOutcome(result, {"stage": "policy", "plan": bounded_json(request.as_payload()), "policyError": policy_error, "permission": permission_audit})

        tool_result = await self.gateway.invoke(
            principal,
            "admin.portal.read",
            request.as_payload(),
            allowed_tools=self.allowed_tools,
        )
        raw_tool_payload = tool_result.get("result") if isinstance(tool_result, dict) else None
        observation = raw_tool_payload.get("observation") if isinstance(raw_tool_payload, dict) else None
        if observation is not None and any(str(action.get("type") or "").casefold() == "observe" for action in request.actions):
            observed_context = {
                "knowledge": knowledge_context,
                "portalObservation": bounded_json(observation, max_depth=4, max_items=50, max_string=300),
            }
            try:
                next_plan = await self.planner.plan_admin_portal_read(
                    question,
                    permission_context.prompt_json(),
                    observed_context,
                )
            except (httpx.HTTPError, RuntimeError, ValueError, TypeError) as exc:
                result = ReaderResult(status="not_confirmed", summary="The observed portal structure could not be turned into a bounded read plan.")
                return ReaderOutcome(result, {"stage": "planning_after_observe", "permission": permission_audit, "observation": observed_context["portalObservation"], "errorType": type(exc).__name__})
            next_request = portal_read_request_from_plan(next_plan)
            if (
                next_request is None
                or any(str(action.get("type") or "").casefold() == "observe" for action in next_request.actions)
                or len(request.actions) + len(next_request.actions) > self.policy.max_actions
                or len(portal_request_paths(request) | portal_request_paths(next_request)) > self.policy.max_pages
            ):
                result = ReaderResult(status="not_confirmed", summary="The follow-up portal plan was not valid.", missing=("invalid_follow_up_plan",))
                return ReaderOutcome(result, {"stage": "planning_after_observe", "permission": permission_audit, "plan": bounded_json(next_plan), "observation": observed_context["portalObservation"]})
            policy_error = self.policy.validate(next_request, permission_context)
            if policy_error:
                status: ReaderStatus = "no_permission" if policy_error in {"page_not_permitted", "permission_context_incomplete", "button_not_permitted"} else "not_confirmed"
                result = ReaderResult(status=status, summary="The follow-up portal operation is not permitted.", missing=(policy_error,))
                return ReaderOutcome(result, {"stage": "policy_after_observe", "permission": permission_audit, "policyError": policy_error, "plan": bounded_json(next_request.as_payload())})
            tool_result = await self.gateway.invoke(
                principal,
                "admin.portal.read",
                next_request.as_payload(),
                allowed_tools=self.allowed_tools,
            )
            request = next_request
        result = _reader_result_from_tool(tool_result)
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
