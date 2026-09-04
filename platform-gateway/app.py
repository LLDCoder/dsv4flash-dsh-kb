from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import unquote, urljoin, urlsplit

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, ConfigDict
try:
    from playwright.async_api import Browser, Page, Route, async_playwright
except ModuleNotFoundError:  # The production image installs Playwright and Chromium.
    Browser = Page = Route = Any
    async_playwright = None


UMC_PORTAL = os.getenv("UMC_PORTAL", "admin").strip().lower()
ADMIN_BASE_URL = os.getenv("UMC_ADMIN_BASE_URL", "https://umc-adminportal.sol.daypop.ai").rstrip("/")
UMC_BASE_URL = ADMIN_BASE_URL
TIMEOUT_SECONDS = float(os.getenv("PLATFORM_TIMEOUT_SECONDS", "30"))

# Uvicorn configures this logger at INFO for container output.
logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="DSH Admin Portal Reader Gateway", version="1.0.0")

READER_ACTIONS = {"observe", "navigate", "query", "filter", "paginate", "switch_tab", "expand_details"}
READER_FORBIDDEN_TERMS = {
    "approve", "approval", "reject", "submit", "modify", "update", "edit", "delete",
    "remove", "assign", "send", "export", "upload", "download", "create", "write", "save",
    "pay", "refund", "appeal", "publish", "import", "cancel", "confirm", "dowload",
    "suspend", "archive", "enable", "disable", "close", "open", "activate", "deactivate",
}
READER_MAX_ACTIONS = 12
READER_MAX_PAGES = 3
READER_TIMEOUT_SECONDS = 45
READER_MAX_OUTPUT_ITEMS = 20
READER_LOCK = asyncio.Lock()
READER_READ_ONLY_GET_PATHS = frozenset(
    {
        "/api/license/dashboard/overview",
        "/api/license/dashboard/license-distribution",
        "/api/license/dashboard/performance",
        "/api/license/dashboard/performance-trend",
        "/api/license/dashboard/members-needing-coaching",
        "/api/license/dashboard/members-on-leave",
        "/api/license/dashboard/needs-attention",
        "/api/Content/Dashboard/Overview",
        "/api/Content/Dashboard/TaskList",
        "/api/Inspection/Dashboard/Overview",
        "/api/Inspection/Dashboard/TaskList",
        "/api/CustomerHappiness/Dashboard/Overview",
        "/api/CustomerHappiness/Dashboard/TaskList",
        "/api/AdminUser/LoginMethod",
        "/api/UserManagement/GetAdminUserAsync",
        "/api/TypeDictionary/GetTypeDictionaries/ServiceConfigServiceType",
        "/api/Application/UrgenCount",
        "/api/UserManagement/UserProfile/Approves",
        "/api/UserManagement/UserProfile/UserTypes",
        "/api/UserManagement/UserProfile/Status",
        "/api/UserManagement/UserProfile/Type/Count",
        "/api/LicenseManagement/statistics",
        "/api/TypeDictionary/GetTypeDictionaries/CertificateStatus",
        "/api/Application/MyReviewDetail/:taskId",
        "/api/UserManagement/UserProfile/:id/Personal",
        "/api/UserManagement/UserProfile/:id/Establishment",
        "/api/UserManagement/UserProfile/:id/Partners",
        "/api/LicenseManagement/:id",
    }
)
READER_STATIC_FETCH_PATHS = frozenset({"/config.json"})
READER_READ_ONLY_POST_PATHS = frozenset(
    {
        "/api/AdminUser/GetUserInfo",
        "/api/Application/MyComplatedPage",
        "/api/Application/MyTodoPage",
        "/api/LicenseManagement/list",
    }
)
READER_BLOCKED_EXACT_PATHS = frozenset(
    {
        "/api/Document/Dowload",
        "/api/Document/Download",
        "/api/Document/OriginalNames",
        "/api/clientlog/report",
    }
)
READER_BROAD_SELECTORS = frozenset({"html", "body", "main", "table", "*", "#root", "#app"})
READER_QUERY_ROLES = frozenset({"row", "cell", "columnheader", "heading", "status", "listitem", "term", "definition"})
READER_SENSITIVE_LOCATOR_TERMS = frozenset(
    {"credential", "password", "accesstoken", "refreshtoken", "sessiontoken", "umctoken", "authorization", "cookie", "apikey"}
)
READER_FAILURE_TEXT_PATTERN = re.compile(
    r"(?:\b(?:unauthorized|forbidden|access denied|permission denied|something went wrong|"
    r"internal server error|page not found|loading|please wait|retry)\b|"
    r"\b(?:http|error|status code)\s*:?\s*[45]\d{2}\b|"
    r"\b[45]\d{2}\s+(?:error|unauthorized|forbidden|not found|server error)\b|"
    r"未授权|无权限|禁止访问|加载中|重试)",
    re.IGNORECASE,
)
READER_FAILURE_STATE_SELECTOR = (
    "[role='alert'],[aria-busy='true'],.ant-spin-spinning,"
    "[class*='loading'],[class*='error'],[class*='unauthorized'],[class*='forbidden']"
)


class PortalReadAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    path: str | None = None
    url: str | None = None
    selector: str | None = Field(default=None, max_length=500)
    label: str | None = Field(default=None, max_length=200)
    role: str | None = Field(default=None, max_length=80)
    name: str | None = Field(default=None, max_length=200)
    field: str | None = Field(default=None, max_length=200)
    section: str | None = Field(default=None, max_length=200)
    empty_state: str | None = Field(default=None, alias="emptyState", max_length=300)
    permission_code: str | None = Field(default=None, alias="permissionCode", max_length=200)
    value: str | None = Field(default=None, max_length=1_000)
    method: str = "GET"
    parameters: dict[str, Any] = Field(default_factory=dict)
    filters: dict[str, Any] = Field(default_factory=dict)


class AdminPortalReadRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    start_path: str = Field(alias="startPath", min_length=1, max_length=1_000)
    actions: list[PortalReadAction] = Field(min_length=1, max_length=READER_MAX_ACTIONS)
    expected_fields: list[str] = Field(default_factory=list, alias="expectedFields", max_length=30)
    max_pages: int = Field(default=READER_MAX_PAGES, alias="maxPages", ge=1, le=READER_MAX_PAGES)
    timeout_seconds: int = Field(default=READER_TIMEOUT_SECONDS, alias="timeoutSeconds", ge=1, le=READER_TIMEOUT_SECONDS)
    max_output_items: int = Field(default=READER_MAX_OUTPUT_ITEMS, alias="maxOutputItems", ge=1, le=READER_MAX_OUTPUT_ITEMS)


def _token_ref(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16] if token else None


def _auth_init_script(raw_token: str) -> str:
    token_literal = json.dumps(raw_token)
    return f"""(() => {{
        const token = {token_literal};
        const expires = String(Date.now() + 15 * 60 * 1000);
        const stored = value => JSON.stringify({{ value, timestamp: Date.now() }});
        localStorage.setItem('NMA_WORKSPACE_AUTH_TOKEN', stored(token));
        localStorage.setItem('NMA_WORKSPACE_AUTH_TOKEN_EXPIRES', stored(Number(expires)));
        sessionStorage.setItem('NMA_WORKSPACE_AUTH_TOKEN_EXPIRES', stored(Number(expires)));
    }})();"""


def _trace_id(request_id: str | None) -> str:
    return request_id.strip()[:128] if request_id and request_id.strip() else "-"


async def _umc_request(method: str, path: str, *, json: dict[str, Any] | None = None, params: dict[str, Any] | None = None, authorization: str | None = None, request_id: str | None = None) -> Any:
    forwarded = _require_umc_token(authorization)
    trace_id = _trace_id(request_id)
    token_ref = _token_ref(forwarded)
    logger.info(
        "umc_forward portal=%s request_id=%s token_ref=%s method=%s path=%s",
        UMC_PORTAL,
        trace_id,
        token_ref,
        method,
        path,
    )
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.request(
                method,
                f"{UMC_BASE_URL}{path}",
                json=json,
                params=params,
                headers={"Authorization": forwarded, "Content-Type": "application/json"},
            )
        logger.info(
            "umc_response portal=%s request_id=%s token_ref=%s method=%s path=%s status=%s",
            UMC_PORTAL,
            trace_id,
            token_ref,
            method,
            path,
            response.status_code,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code if exc.response.status_code in {401, 403, 404, 422} else 502
        raise HTTPException(status_code=status, detail={"code": "umc_upstream_error", "upstreamStatus": exc.response.status_code}) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail={"code": "umc_upstream_unavailable", "message": str(exc)[:500]}) from exc


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": "admin-portal-reader",
        "umcPortal": UMC_PORTAL,
        "umcUpstream": UMC_BASE_URL,
        "authMode": "umctoken-forwarded",
        "readOnlyGetPathCount": len(READER_READ_ONLY_GET_PATHS),
        "readOnlyPostPathCount": len(READER_READ_ONLY_POST_PATHS),
        "supportedOperations": ["admin.portal.read", "AdminUser.GetUserInfo"],
    }


def _require_umc_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer ") or not authorization[7:].strip():
        raise HTTPException(status_code=401, detail={"code": "umc_token_required", "message": "Authorization: Bearer <UMC_TOKEN> is required"})
    return authorization


def _reader_compact(value: object) -> str:
    return re.sub(r"[^a-z]", "", unquote(str(value or "")).casefold())


def _reader_contains_forbidden(value: object) -> bool:
    compact = _reader_compact(value)
    return any(term in compact for term in READER_FORBIDDEN_TERMS)


def _reader_contains_sensitive_locator(value: object) -> bool:
    compact = _reader_compact(value)
    return any(term in compact for term in READER_SENSITIVE_LOCATOR_TERMS)


_READER_CREDENTIAL_NAME = (
    r"session[\s_-]?token|access[\s_-]?token|refresh[\s_-]?token|umc[\s_-]?token|"
    r"token|password|"
    r"api[\s_-]?key|provider[\s_-]?key|secret|credential"
)


def _sanitize_reader_text(value: object, *, max_chars: int | None = None) -> str:
    """Redact credential values without removing ordinary business uses of 'token'."""

    text = str(value or "")
    text = re.sub(
        r"(?i)(?P<prefix>\bauthorization(?:[\s_-]?header)?\b(?:\s*[:=]\s*|\s+\bis\b\s+|\s+))"
        r"(?P<value>(?:(?:bearer|basic)\s+)?[^\s,;]+)",
        lambda match: f"{match.group('prefix')}[redacted]",
        text,
    )
    text = re.sub(r"(?i)\b(?:bearer|basic)\s+[a-z0-9._~+/=-]+", "[redacted-auth]", text)
    text = re.sub(
        r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b",
        "[redacted-jwt]",
        text,
    )
    text = re.sub(
        r"(?i)(?P<prefix>\bcookie(?:[\s_-]?(?:value|header))?\b(?:\s*[:=]\s*|\s+\bis\b\s+))"
        r"(?P<value>[^\s;,=]+=[^;\s,]+(?:\s*;\s*(?:[^\s;,=]+=[^;\s,]+|secure|httponly|partitioned))*)",
        lambda match: f"{match.group('prefix')}[redacted]",
        text,
    )
    text = re.sub(
        r"(?i)(?P<prefix>\b(?:session|access|refresh|umc)[\s_-]?token\b\s+)"
        r"(?P<value>(?!(?:policy|status|scope|lifetime|expiry|expiration|format|rotation|required)\b)"
        r"[a-z0-9._~+/=-]{6,})",
        lambda match: f"{match.group('prefix')}[redacted]",
        text,
    )
    text = re.sub(
        r"(?i)(?P<prefix>\bcookie(?:[\s_-]?(?:value|header))?\b(?:\s*[:=]\s*|\s+\bis\b\s+))"
        r"(?P<value>[^\s,;]+)",
        lambda match: f"{match.group('prefix')}[redacted]",
        text,
    )
    text = re.sub(
        rf"(?i)(?P<prefix>\b(?:{_READER_CREDENTIAL_NAME})\b\s*[\"']?\s*(?::|=|\bis\b)\s*)"
        r"(?P<value>\"[^\"]*\"|'[^']*'|[^\s,;}\]]+)",
        lambda match: f"{match.group('prefix')}[redacted]",
        text,
    )
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars] if max_chars is not None else text


def _sanitize_reader_output(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _sanitize_reader_output(child) for key, child in value.items()}
    if isinstance(value, list):
        return [_sanitize_reader_output(child) for child in value]
    if isinstance(value, tuple):
        return [_sanitize_reader_output(child) for child in value]
    if isinstance(value, str):
        return _sanitize_reader_text(value)
    return value


def _reader_relative_path(value: object) -> str | None:
    candidate = unquote(str(value or "")).strip()
    if not candidate.startswith("/") or candidate.startswith("//") or "\\" in candidate:
        return None
    parsed = urlsplit(candidate)
    if parsed.scheme or parsed.netloc or parsed.username or parsed.password:
        return None
    return candidate


def _named_values(payload: Any, names: frozenset[str]) -> list[Any]:
    values: list[Any] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            if re.sub(r"[^a-z0-9]", "", str(key).casefold()) in names:
                values.append(value)
            if isinstance(value, (dict, list)):
                values.extend(_named_values(value, names))
    elif isinstance(payload, list):
        for value in payload:
            values.extend(_named_values(value, names))
    return values


def _scalar_values(value: Any, *, preferred: tuple[str, ...] = (), limit: int = 100) -> tuple[str, ...]:
    output: list[str] = []

    def visit(item: Any) -> None:
        if len(output) >= limit:
            return
        if isinstance(item, (str, int)):
            text = str(item).strip()
            if text and text not in output:
                output.append(text[:300])
        elif isinstance(item, list):
            for child in item:
                visit(child)
        elif isinstance(item, dict):
            selected = next((item.get(name) for name in preferred if item.get(name) is not None), None)
            if selected is not None:
                visit(selected)
            else:
                for child in item.values():
                    visit(child)

    visit(value)
    return tuple(output)


def _gateway_permission_context(payload: Any) -> dict[str, Any]:
    identities = _named_values(payload, frozenset({"userid", "useridentifier", "adminuserid"}))
    roles = _named_values(payload, frozenset({"rolesinfo", "listroles", "rolename", "roles"}))
    scopes = _named_values(payload, frozenset({"datascope", "datascopes", "scope", "scopes"}))
    buttons = _named_values(payload, frozenset({"buttonlist", "buttons", "buttonpermissions", "actions"}))
    departments = _named_values(payload, frozenset({"departmentid", "departmentname", "departments", "department"}))
    envelope_data = payload.get("data") if isinstance(payload, dict) and isinstance(payload.get("data"), dict) else {}
    permission_tree = envelope_data.get("listSysPermission") if isinstance(envelope_data.get("listSysPermission"), list) else []
    pages: list[str] = []
    subpages: list[str] = []

    def collect_routes(nodes: Any, *, child: bool) -> None:
        if not isinstance(nodes, list):
            return
        for node in nodes:
            if not isinstance(node, dict):
                continue
            route = node.get("frontendRoute") or node.get("path") or node.get("route")
            if isinstance(route, str) and route.startswith("/"):
                target = subpages if child else pages
                if route not in target:
                    target.append(route[:300])
            collect_routes(node.get("children"), child=True)

    collect_routes(permission_tree, child=False)
    return {
        "userId": str(envelope_data.get("id") or next(iter(_scalar_values(identities, preferred=("userId", "UserID"), limit=1)), ""))[:300],
        "roles": _scalar_values(roles, preferred=("roleName", "nameEn", "name", "code")),
        "departments": _scalar_values(departments, preferred=("departmentId", "departmentName", "name", "id")),
        "pages": tuple(pages),
        "subpages": tuple(subpages),
        "dataScope": _scalar_values(scopes, preferred=("scope", "name", "code"), limit=20),
        "buttons": _scalar_values(buttons, preferred=("permissionCode", "key", "name", "code")),
    }


def _path_is_permitted(path: str, allowed_pages: tuple[str, ...]) -> bool:
    requested = urlsplit(path).path.rstrip("/") or "/"
    for candidate in allowed_pages:
        allowed = urlsplit(candidate).path.rstrip("/") or "/"
        if requested == allowed:
            return True
        requested_parts = requested.strip("/").split("/")
        allowed_parts = allowed.strip("/").split("/")
        def segment_matches(actual: str, expected: str) -> bool:
            if expected == actual:
                return True
            dynamic = expected == "*" or (expected.startswith(":") and len(expected) > 1) or (expected.startswith("{") and expected.endswith("}"))
            return dynamic and bool(re.fullmatch(r"[A-Za-z0-9_-]*\d[A-Za-z0-9_-]*", actual))

        if len(requested_parts) == len(allowed_parts) and all(segment_matches(actual, expected) for actual, expected in zip(requested_parts, allowed_parts, strict=True)):
            return True
    return False


def _gateway_button_permitted(action: PortalReadAction, allowed_buttons: tuple[str, ...]) -> bool:
    candidates = {_reader_compact(action.permission_code)} - {""}
    allowed = {_reader_compact(button) for button in allowed_buttons} - {""}
    return bool(candidates and allowed and candidates.intersection(allowed))


def _permission_fingerprint(context: dict[str, Any]) -> str:
    def normalized(values: Any) -> list[str]:
        sequence = values if isinstance(values, (list, tuple)) else (values,)
        return sorted(
            {"".join(char for char in str(value).casefold() if char.isalnum()) for value in sequence if str(value).strip()}
        )

    canonical = {
        "departments": normalized(context.get("departments", ())),
        "roles": normalized(context.get("roles", ())),
        "pages": normalized(context.get("pages", ())),
        "subpages": normalized(context.get("subpages", ())),
        "buttons": normalized(context.get("buttons", ())),
        "dataScope": normalized(context.get("dataScope", ())),
    }
    return hashlib.sha256(json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def _validate_gateway_permissions(payload: Any, requested_path: str, principal_user_id: str | None) -> dict[str, Any]:
    context = _gateway_permission_context(payload)
    if not principal_user_id or not context["userId"] or str(context["userId"]) != str(principal_user_id):
        raise HTTPException(status_code=403, detail={"code": "reader_identity_mismatch"})
    if not context["roles"] or not (*context["pages"], *context["subpages"]):
        raise HTTPException(status_code=403, detail={"code": "reader_permission_context_incomplete"})
    if not _path_is_permitted(requested_path, (*context["pages"], *context["subpages"])):
        raise HTTPException(status_code=403, detail={"code": "page_not_permitted"})
    return context


def _validate_reader_selector(selector: str | None) -> None:
    value = str(selector or "").strip()
    compact = re.sub(r"\s+", " ", value.casefold())
    if not value or compact in READER_BROAD_SELECTORS or any(part in compact for part in (" body", "body ", " table", "table ", ">table", ">body")):
        raise HTTPException(status_code=422, detail={"code": "reader_selector_too_broad"})
    semantic_markers = ("[data-", "[aria-", "[role=", "[role\"", ".field", ".value", ".row", ".cell", ".card", "[class*=")
    if not any(marker in compact for marker in semantic_markers):
        raise HTTPException(status_code=422, detail={"code": "reader_selector_not_field_or_row"})


def _validate_reader_request(request: AdminPortalReadRequest) -> None:
    if UMC_PORTAL != "admin":
        raise HTTPException(status_code=403, detail={"code": "admin_reader_wrong_portal"})
    if request.max_pages > READER_MAX_PAGES or request.timeout_seconds > READER_TIMEOUT_SECONDS or request.max_output_items > READER_MAX_OUTPUT_ITEMS:
        raise HTTPException(status_code=422, detail={"code": "reader_limit_exceeded"})
    if not _reader_relative_path(request.start_path) or _reader_contains_forbidden(request.start_path):
        raise HTTPException(status_code=422, detail={"code": "invalid_reader_path"})
    pages = {request.start_path}
    if any(action.type.strip().casefold().replace("-", "_") == "observe" for action in request.actions) and len(request.actions) != 1:
        raise HTTPException(status_code=422, detail={"code": "invalid_observation_plan"})
    for action in request.actions:
        action_type = action.type.strip().casefold().replace("-", "_")
        if action_type not in READER_ACTIONS:
            raise HTTPException(status_code=422, detail={"code": "action_not_read_only"})
        if action.method.strip().upper() != "GET":
            raise HTTPException(status_code=422, detail={"code": "method_not_read_only"})
        for candidate in (
            action.type, action.label, action.selector, action.role, action.name,
            action.field, action.section, action.permission_code,
            *action.parameters.keys(), *action.filters.keys(),
        ):
            if _reader_contains_forbidden(candidate):
                raise HTTPException(status_code=422, detail={"code": "action_not_read_only"})
        if action_type in {"query", "filter", "paginate", "switch_tab", "expand_details"}:
            if action.selector:
                _validate_reader_selector(action.selector)
            elif not any((action.role, action.field, action.section)):
                raise HTTPException(status_code=422, detail={"code": "reader_semantic_locator_required"})
        if action_type == "query" and not action.selector and not action.field and action.role not in READER_QUERY_ROLES:
            raise HTTPException(status_code=422, detail={"code": "reader_query_locator_too_broad"})
        if action_type == "query" and any(
            _reader_contains_sensitive_locator(candidate)
            for candidate in (action.selector, action.label, action.name, action.field, action.section)
        ):
            raise HTTPException(status_code=422, detail={"code": "reader_sensitive_locator_forbidden"})
        if action_type in {"paginate", "switch_tab", "expand_details"} and (not action.role or not (action.name or action.label)):
            raise HTTPException(status_code=422, detail={"code": "reader_click_semantics_required"})
        if action_type == "switch_tab" and action.role != "tab":
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_tab"})
        if action_type == "paginate" and action.role not in {"button", "link"}:
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_pagination"})
        if action_type == "expand_details" and action.role != "button":
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_expandable"})
        if action_type == "expand_details" and not action.permission_code:
            raise HTTPException(status_code=422, detail={"code": "button_permission_required"})
        for candidate in (action.path, action.url):
            if candidate is None:
                continue
            safe_path = _reader_relative_path(candidate)
            if not safe_path or _reader_contains_forbidden(safe_path):
                raise HTTPException(status_code=422, detail={"code": "invalid_reader_path"})
            pages.add(safe_path)
    if len(pages) > request.max_pages:
        raise HTTPException(status_code=422, detail={"code": "page_limit_exceeded"})


async def _guard_reader_request(
    route: Route,
    portal_origin: str,
    allowed_navigation_paths: frozenset[str] | None = None,
) -> None:
    request = route.request
    parsed = urlsplit(request.url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    method = request.method.upper()
    resource_type = str(getattr(request, "resource_type", "") or "").casefold()
    if resource_type in {"websocket", "eventsource"} or origin != portal_origin:
        await route.abort("blockedbyclient")
        return
    api_request = parsed.path.startswith("/api/")
    if parsed.path in READER_BLOCKED_EXACT_PATHS:
        await route.abort("blockedbyclient")
        return
    get_path_allowed = _path_is_permitted(parsed.path, tuple(READER_READ_ONLY_GET_PATHS))
    api_allowed = (
        (method == "GET" and get_path_allowed)
        or (method == "POST" and parsed.path in READER_READ_ONLY_POST_PATHS)
        or (
            method == "OPTIONS"
            and (get_path_allowed or parsed.path in READER_READ_ONLY_POST_PATHS)
        )
    )
    if api_request and not api_allowed:
        await route.abort("blockedbyclient")
        return
    static_fetch_allowed = resource_type in {"xhr", "fetch"} and method == "GET" and parsed.path in READER_STATIC_FETCH_PATHS
    static_allowed = resource_type in {"document", "script", "stylesheet", "font", "image"} and method in {"GET", "HEAD"}
    if not api_request and not (static_allowed or static_fetch_allowed):
        await route.abort("blockedbyclient")
        return
    if resource_type == "document" and allowed_navigation_paths is not None and not _path_is_permitted(parsed.path, tuple(allowed_navigation_paths)):
        await route.abort("blockedbyclient")
        return
    await route.continue_()


async def _safe_click(page: Page, action: PortalReadAction) -> None:
    action_type = action.type.strip().casefold().replace("-", "_")
    locator = _semantic_locator(page, action).first
    if await locator.count() == 0:
        raise RuntimeError("reader_selector_not_found")
    descriptor = " ".join(
        filter(
            None,
            [
                await locator.get_attribute("aria-label"),
                await locator.get_attribute("title"),
                (await locator.inner_text())[:200],
            ],
        )
    )
    if _reader_contains_forbidden(descriptor):
        raise RuntimeError("action_not_read_only")
    if not descriptor.strip():
        raise RuntimeError("reader_click_target_unverifiable")
    expected_descriptor = _reader_compact(action.name or action.label)
    if not expected_descriptor or expected_descriptor not in _reader_compact(descriptor):
        raise RuntimeError("reader_click_descriptor_mismatch")
    explicit_role = (await locator.get_attribute("role") or "").casefold()
    tag_name = str(await locator.evaluate("element => element.tagName.toLowerCase()") or "").casefold()
    role = explicit_role or {"button": "button", "a": "link"}.get(tag_name, "")
    if role != str(action.role or "").casefold():
        raise RuntimeError("reader_click_role_mismatch")
    rel = (await locator.get_attribute("rel") or "").casefold()
    aria_expanded = await locator.get_attribute("aria-expanded")
    if action_type == "switch_tab" and role != "tab":
        raise RuntimeError("reader_click_target_not_tab")
    if action_type == "paginate" and rel != "next" and not await locator.get_attribute("aria-controls"):
        raise RuntimeError("reader_click_target_not_pagination")
    if action_type == "expand_details" and aria_expanded not in {"true", "false"}:
        raise RuntimeError("reader_click_target_not_expandable")
    await locator.click(timeout=5_000)


def _semantic_locator(page: Page, action: PortalReadAction):
    if action.selector:
        return page.locator(action.selector)
    if action.field:
        return page.get_by_label(action.field, exact=True)
    if action.role:
        root = page.get_by_role("region", name=action.section, exact=True) if action.section else page
        return root.get_by_role(action.role, name=action.name or action.label, exact=True)
    if action.section:
        return page.get_by_role("region", name=action.section, exact=True)
    raise RuntimeError("reader_semantic_locator_required")


async def _settle_page(page: Page) -> None:
    await page.wait_for_function("document.readyState === 'interactive' || document.readyState === 'complete'", timeout=5_000)
    try:
        await page.wait_for_load_state("networkidle", timeout=3_000)
    except Exception:
        # Polling SPAs may not become fully idle. Semantic locators still have
        # explicit waits, so DOM readiness is the deterministic lower bound.
        pass
    try:
        await page.wait_for_function(
            "document.body && document.body.innerText && document.body.innerText.trim().length > 0",
            timeout=7_000,
        )
    except Exception:
        # Empty content is reported as not_confirmed by the result contract.
        pass
    try:
        await page.wait_for_function(
            "document.querySelector('h1,h2,h3,[role=heading],[role=tab],table th,label') !== null",
            timeout=7_000,
        )
    except Exception:
        pass


async def _observe_semantics(page: Page, limit: int) -> dict[str, list[str]]:
    async def visible_texts(
        locator,
        *,
        max_each: int,
        max_chars: int = 200,
        reject_non_data_rows: bool = False,
        reject_error_states: bool = False,
    ) -> list[str]:
        values: list[str] = []
        for index in range(await locator.count()):
            candidate = locator.nth(index)
            if not await candidate.is_visible():
                continue
            value = _sanitize_reader_text(await candidate.inner_text(), max_chars=max_chars)
            normalized = value.casefold()
            if reject_non_data_rows and (
                any(marker in normalized for marker in ("no data", "no records", "no results", "nothing found", "暂无数据", "暂无记录", "没有数据"))
                or normalized in {"loading", "loading...", "please wait", "please wait..."}
            ):
                continue
            if reject_error_states and (
                any(
                    marker in normalized
                    for marker in (
                        "error", "unauthorized", "forbidden", "access denied", "permission denied",
                        "loading", "please wait", "retry", "未授权", "无权限", "禁止访问", "加载中", "重试",
                    )
                )
                or re.search(r"\b[45]\d{2}\b", normalized)
            ):
                continue
            if value and value not in values:
                values.append(value)
            if len(values) >= max_each:
                break
        return values

    async def texts(selector: str, *, max_each: int, max_chars: int = 200) -> list[str]:
        return await visible_texts(page.locator(selector), max_each=max_each, max_chars=max_chars)

    async def first_data_rows() -> list[str]:
        containers = page.locator("table,[role='grid']")
        for index in range(await containers.count()):
            container = containers.nth(index)
            if not await container.is_visible() or await container.get_attribute("aria-busy") == "true":
                continue
            tag_name = str(await container.evaluate("element => element.tagName.toLowerCase()") or "").casefold()
            headers = container.locator("thead th,[role='columnheader']")
            action_column_indexes: set[int] = set()
            for header_index in range(await headers.count()):
                header = headers.nth(header_index)
                if not await header.is_visible():
                    continue
                header_text = _sanitize_reader_text(await header.inner_text(), max_chars=120)
                if re.sub(r"[^a-z]", "", header_text.casefold()) in {"action", "actions"}:
                    action_column_indexes.add(header_index)
            row_selector = (
                "tbody > tr:has(> td):not(.ant-table-placeholder):not([class*='skeleton']):not(:has([class*='skeleton']))"
                if tag_name == "table"
                else "[role='row']:has([role='cell'],[role='gridcell']):not([class*='skeleton']):not(:has([class*='skeleton']))"
            )
            row_locator = container.locator(row_selector)
            rows: list[str] = []
            for row_index in range(await row_locator.count()):
                row = row_locator.nth(row_index)
                if not await row.is_visible():
                    continue
                if action_column_indexes:
                    cells = row.locator(":scope > td,:scope > [role='cell'],:scope > [role='gridcell']")
                    parts: list[str] = []
                    for cell_index in range(await cells.count()):
                        if cell_index in action_column_indexes:
                            continue
                        cell = cells.nth(cell_index)
                        if cell_index >= 50 or not await cell.is_visible():
                            continue
                        cell_text = _sanitize_reader_text(await cell.inner_text(), max_chars=300)
                        if cell_text:
                            parts.append(cell_text)
                    value = _sanitize_reader_text(" ".join(parts), max_chars=400)
                else:
                    value = _sanitize_reader_text(await row.inner_text(), max_chars=400)
                normalized = value.casefold()
                if (
                    not value
                    or any(marker in normalized for marker in ("no data", "no records", "no results", "nothing found", "暂无数据", "暂无记录", "没有数据"))
                    or normalized in {"loading", "loading...", "please wait", "please wait..."}
                ):
                    continue
                if value not in rows:
                    rows.append(value)
                if len(rows) >= min(limit, 8):
                    break
            if rows:
                return rows
        return []

    return {
        "headings": await texts("h1,h2,h3,[role='heading']", max_each=min(limit, 12)),
        "labels": await texts("label", max_each=min(limit, 12)),
        "columnHeaders": await texts("th,[role='columnheader']", max_each=min(limit, 20), max_chars=120),
        "regions": await texts("[role='region'][aria-label],section[aria-label]", max_each=min(limit, 8)),
        "controls": await texts("[role='tab'],.ant-pagination button,.ant-pagination a,button[aria-label],a[aria-label]", max_each=min(limit, 12)),
        "summaries": await visible_texts(
            page.locator(".stat-card:not([class*='skeleton']):not(:has([class*='skeleton']))"),
            max_each=min(limit, 12),
            max_chars=200,
            reject_error_states=True,
        ),
        "rowSummaries": await first_data_rows(),
    }


async def _query_page_values(page: Page, action: PortalReadAction, limit: int) -> tuple[str, list[str], bool]:
    locator = _semantic_locator(page, action)
    label = _sanitize_reader_text(action.label or action.field or action.name or "result", max_chars=120)
    max_values = max(0, limit)
    if max_values == 0:
        return label, [], False
    count = await locator.count()
    values: list[str] = []
    for index in range(count):
        candidate = locator.nth(index)
        if not await candidate.is_visible():
            continue
        text = _sanitize_reader_text(await candidate.inner_text(), max_chars=500)
        if text and text not in values:
            values.append(text)
        if len(values) >= max_values:
            break

    visible_empty_state = False
    if not values and action.empty_state:
        empty_locator = page.get_by_text(action.empty_state, exact=True)
        for index in range(await empty_locator.count()):
            if await empty_locator.nth(index).is_visible():
                visible_empty_state = True
                break
    confirmed_empty = bool(visible_empty_state and not await _page_has_visible_failure_state(page))
    return label, values, confirmed_empty


async def _page_has_visible_failure_state(page: Page) -> bool:
    state_locator = page.locator(READER_FAILURE_STATE_SELECTOR)
    for index in range(await state_locator.count()):
        candidate = state_locator.nth(index)
        if await candidate.is_visible():
            return True

    body = page.locator("body")
    for index in range(min(await body.count(), 1)):
        candidate = body.nth(index)
        if not await candidate.is_visible():
            continue
        visible_text = _sanitize_reader_text(await candidate.inner_text(), max_chars=20_000)
        if READER_FAILURE_TEXT_PATTERN.search(visible_text):
            return True
    return False


async def _execute_reader_actions(
    page: Page,
    request: AdminPortalReadRequest,
    portal_origin: str,
) -> tuple[list[str], list[str], list[str], bool, dict[str, list[str]] | None]:
    facts: list[str] = []
    visited: list[str] = []
    observed_fields: list[str] = []
    confirmed_empty = False
    observation: dict[str, list[str]] | None = None
    declared_paths = {request.start_path}
    declared_paths.update(
        path
        for action in request.actions
        for path in (action.path, action.url)
        if path
    )

    async def record_page() -> None:
        parsed = urlsplit(page.url)
        if f"{parsed.scheme}://{parsed.netloc}" != portal_origin:
            raise RuntimeError("reader_origin_changed")
        path = parsed.path or "/"
        if not any(_path_is_permitted(path, (allowed,)) for allowed in declared_paths):
            raise RuntimeError("reader_undeclared_navigation")
        if path not in visited:
            visited.append(path)
        if len(visited) > request.max_pages:
            raise RuntimeError("page_limit_exceeded")

    await record_page()
    await _settle_page(page)
    for action in request.actions:
        action_type = action.type.strip().casefold().replace("-", "_")
        if action_type == "observe":
            observation = await _observe_semantics(page, request.max_output_items)
        elif action_type == "navigate":
            path = action.path or action.url
            if path:
                response = await page.goto(urljoin(portal_origin + "/", path.lstrip("/")), wait_until="domcontentloaded")
                if response and response.status in {401, 403}:
                    raise PermissionError("page_not_permitted")
                await _settle_page(page)
                await record_page()
        elif action_type == "filter":
            await _semantic_locator(page, action).first.fill(action.value or "", timeout=5_000)
            await _settle_page(page)
        elif action_type == "query":
            label, values, query_confirmed_empty = await _query_page_values(
                page,
                action,
                request.max_output_items - len(facts),
            )
            if values or query_confirmed_empty:
                if label not in observed_fields:
                    observed_fields.append(label)
            confirmed_empty = confirmed_empty or query_confirmed_empty
            if values:
                facts.extend(f"{label}: {value}"[:500] for value in values)
        else:
            await _safe_click(page, action)
            await _settle_page(page)
            await record_page()
        if len(facts) >= request.max_output_items:
            break
    return facts[: request.max_output_items], visited[: request.max_pages], observed_fields, confirmed_empty, observation


@app.post("/admin/portal/read")
async def admin_portal_read(
    request: AdminPortalReadRequest,
    authorization: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
) -> dict[str, Any]:
    """Execute a serialized, same-origin, read-only Admin Portal inspection."""

    forwarded = _require_umc_token(authorization)
    _validate_reader_request(request)
    # Revalidate the identity inside the executor immediately before opening a
    # page. This also prevents a stale or switched browser account from reusing
    # an earlier DSH permission snapshot.
    try:
        user_info = await _umc_request(
            "POST",
            "/api/AdminUser/GetUserInfo",
            authorization=forwarded,
            request_id=x_request_id,
        )
    except HTTPException as exc:
        if exc.status_code in {401, 403}:
            return {"status": "no_permission", "summary": "The Admin Portal session is not permitted."}
        return {"status": "load_failed", "summary": "The Admin Portal identity could not be loaded."}
    permission_context = _validate_gateway_permissions(user_info, request.start_path, x_user_id)
    for action in request.actions:
        for path in (action.path, action.url):
            if path and not _path_is_permitted(path, (*permission_context["pages"], *permission_context["subpages"])):
                raise HTTPException(status_code=403, detail={"code": "page_not_permitted"})
        action_type = action.type.strip().casefold().replace("-", "_")
        if action_type == "expand_details" and (not action.permission_code or not _gateway_button_permitted(action, permission_context["buttons"])):
            raise HTTPException(status_code=403, detail={"code": "button_not_permitted"})

    portal_parts = urlsplit(UMC_BASE_URL)
    portal_origin = f"{portal_parts.scheme}://{portal_parts.netloc}"
    raw_token = forwarded[7:].strip()

    async def execute() -> tuple[list[str], list[str], list[str], bool, dict[str, list[str]] | None]:
        if async_playwright is None:
            raise RuntimeError("reader_browser_unavailable")
        async with async_playwright() as playwright:
            browser: Browser = await playwright.chromium.launch(
                headless=True,
                args=["--disable-dev-shm-usage", "--no-sandbox"],
            )
            try:
                context = await browser.new_context(
                    accept_downloads=False,
                    extra_http_headers={"Authorization": forwarded},
                    service_workers="block",
                )
                await context.add_init_script(_auth_init_script(raw_token))

                async def route_handler(route: Route) -> None:
                    declared_paths = frozenset(
                        {request.start_path}
                        | {path for action in request.actions for path in (action.path, action.url) if path}
                    )
                    await _guard_reader_request(route, portal_origin, declared_paths)

                await context.route("**/*", route_handler)
                page = await context.new_page()
                page.set_default_timeout(min(request.timeout_seconds * 1_000, 10_000))
                page.on("dialog", lambda dialog: asyncio.create_task(dialog.dismiss()))
                page.on("download", lambda download: asyncio.create_task(download.cancel()))
                start_url = urljoin(portal_origin + "/", request.start_path.lstrip("/"))
                response = await page.goto(start_url, wait_until="domcontentloaded")
                if response and response.status in {401, 403}:
                    raise PermissionError("page_not_permitted")
                await _settle_page(page)
                if urlsplit(page.url).path.casefold().rstrip("/").endswith("/login"):
                    raise PermissionError("portal_login_required")
                return await _execute_reader_actions(page, request, portal_origin)
            finally:
                await browser.close()

    try:
        # Authentication is currently shared between browser task spaces in
        # the Admin Portal. Serialize execution until isolation is proven.
        async with READER_LOCK:
            facts, pages, observed_fields, confirmed_empty, observation = await asyncio.wait_for(execute(), timeout=request.timeout_seconds)
    except PermissionError:
        return _sanitize_reader_output({"status": "no_permission", "summary": "The requested Admin Portal page is not permitted."})
    except asyncio.TimeoutError:
        return _sanitize_reader_output({"status": "load_failed", "summary": "The Admin Portal read timed out.", "limitations": ["reader_timeout"]})
    except Exception as exc:
        code = str(exc)
        status = "no_permission" if code in {"action_not_read_only", "page_not_permitted"} else "load_failed"
        logger.info(
            "admin_portal_reader_result request_id=%s token_ref=%s status=%s error=%s",
            _trace_id(x_request_id),
            _token_ref(forwarded),
            status,
            type(exc).__name__,
        )
        return _sanitize_reader_output(
            {"status": status, "summary": "The Admin Portal page could not be read.", "limitations": [code[:120]]}
        )

    missing_fields = [field for field in request.expected_fields if field not in observed_fields]
    status = "not_confirmed" if missing_fields or (not facts and not confirmed_empty) else "success" if facts else "no_data"
    scope_text = " ".join(permission_context["dataScope"]).casefold()
    scope = "personal" if any(term in scope_text for term in ("personal", "self", "own")) else "team" if any(term in scope_text for term in ("team", "department")) else "global" if any(term in scope_text for term in ("global", "all")) else "unknown"
    observed_at = datetime.now(timezone.utc).isoformat()
    permission_fingerprint = _permission_fingerprint(permission_context)
    workflow_state = ""
    for fact in facts:
        label, separator, value = fact.partition(":")
        if separator and any(term in label.casefold() for term in ("status", "state", "workflow")):
            workflow_state = value.strip()[:500]
            break
    return _sanitize_reader_output({
        "status": status,
        "summary": "The requested Admin Portal data was found." if status == "success" else "No matching Admin Portal data was found." if status == "no_data" else "The requested fields could not all be confirmed.",
        "page": pages[0] if pages else request.start_path,
        "section": ", ".join(observed_fields)[:300],
        "scope": scope,
        "facts": facts,
        "workflowState": workflow_state,
        "missing": missing_fields[:10],
        "pagesVisited": pages,
        "observedAt": observed_at,
        "actionTrace": [action.type for action in request.actions],
        "permissionFingerprint": permission_fingerprint,
        **({"observation": observation} if observation is not None else {}),
    })
