from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
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

READER_ACTIONS = {
    "observe", "navigate", "query", "filter", "paginate", "switch_tab", "expand_details",
    "show_filter", "apply_filter", "reset_filter", "sort", "show_detail", "dismiss_overlay",
}
READER_MUTATION_COMMAND_TERMS = {
    "approve", "reject", "submit", "modify", "update", "edit", "delete",
    "remove", "assign", "send", "export", "upload", "download", "create", "write", "save",
    "pay", "refund", "appeal", "publish", "import", "cancel", "confirm", "dowload",
    "suspend", "archive", "enable", "disable", "close", "open", "activate", "deactivate",
}
# Whole-word matching leaves plural resource routes such as ``/refunds`` and
# ``/appeals`` readable while retaining single-command routes as mutations.
READER_MUTATION_ROUTE_TERMS = READER_MUTATION_COMMAND_TERMS
READER_READ_ONLY_OPEN_CONTEXT_TERMS = {"task", "tasks", "status", "statuses", "category", "categories"}
READER_MAX_ACTIONS = 12
READER_MAX_PAGES = 3
READER_TIMEOUT_SECONDS = 45
READER_MAX_OUTPUT_ITEMS = 20
READER_LOCK = asyncio.Lock()


def _reader_whitelist_enabled() -> bool:
    value = os.getenv("PORTAL_READER_WHITELIST_ENABLED", "true").strip().lower()
    if value not in {"true", "false", "1", "0"}:
        raise ValueError("PORTAL_READER_WHITELIST_ENABLED must be true, false, 1 or 0")
    return value in {"true", "1"}


def _load_reader_network_policy(path: Path) -> dict[str, Any]:
    policy = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(policy, dict) or set(policy) != {
        "version", "allowedMethods", "staticFetchPaths", "blockedExactPaths",
    } or type(policy["version"]) is not int or policy["version"] != 1:
        raise ValueError("Invalid Reader network policy schema/version")
    methods = policy["allowedMethods"]
    if not isinstance(methods, dict) or set(methods) != {"GET", "POST"}:
        raise ValueError("Reader network policy requires GET and POST path lists")
    for name, paths in [*methods.items(), ("staticFetchPaths", policy["staticFetchPaths"]), ("blockedExactPaths", policy["blockedExactPaths"])]:
        if not isinstance(paths, list) or any(not isinstance(p, str) for p in paths):
            raise ValueError(f"Invalid Reader network policy list: {name}")
        if len(paths) != len(set(paths)):
            raise ValueError(f"Duplicate Reader network policy paths: {name}")
        for value in paths:
            if not re.fullmatch(r"/(?:[A-Za-z0-9_-]+|:[A-Za-z][A-Za-z0-9_]*)(?:/(?:[A-Za-z0-9_.-]+|:[A-Za-z][A-Za-z0-9_]*))*", value):
                # Static fetch files can also be rooted directly at /config.json.
                if not (name == "staticFetchPaths" and re.fullmatch(r"/[A-Za-z0-9_-]+\.[A-Za-z0-9]+", value)):
                    raise ValueError(f"Invalid Reader network policy path in {name}")
            if any(segment in {".", ".."} for segment in value.split("/")):
                raise ValueError(f"Invalid Reader network policy traversal in {name}")
            if name != "staticFetchPaths" and not value.startswith("/api/"):
                raise ValueError(f"Reader API policy path must start with /api/ in {name}")
            if name != "GET" and ":" in value:
                raise ValueError(f"Reader policy placeholders are only supported for GET in {name}")
    if set(policy["blockedExactPaths"]) & (set(methods["GET"]) | set(methods["POST"])):
        raise ValueError("Reader policy cannot both allow and block the same path")
    return policy


READER_WHITELIST_ENABLED = _reader_whitelist_enabled()
READER_NETWORK_POLICY_FILE = Path(os.getenv(
    "PORTAL_READER_WHITELIST_FILE", str(Path(__file__).parent / "config" / "reader-network-policy.json"),
))
READER_NETWORK_POLICY = _load_reader_network_policy(READER_NETWORK_POLICY_FILE)
READER_READ_ONLY_GET_PATHS = frozenset(READER_NETWORK_POLICY["allowedMethods"]["GET"])
READER_READ_ONLY_POST_PATHS = frozenset(READER_NETWORK_POLICY["allowedMethods"]["POST"])
READER_STATIC_FETCH_PATHS = frozenset(READER_NETWORK_POLICY["staticFetchPaths"])
READER_BLOCKED_EXACT_PATHS = frozenset(READER_NETWORK_POLICY["blockedExactPaths"])
if not READER_WHITELIST_ENABLED:
    logger.warning("Reader API whitelist is DISABLED for business validation; network-level read-only enforcement is inactive")
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
READER_OVERLAY_SELECTOR = "[role='dialog'],[role='alertdialog'],.ant-drawer-content"
READER_OVERLAY_ACTIONS = frozenset({"apply_filter", "reset_filter", "dismiss_overlay"})


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
    values: list[str] = Field(default_factory=list, max_length=20)
    direction: str | None = Field(default=None, max_length=20)
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
        "readerWhitelistEnabled": READER_WHITELIST_ENABLED,
        "readerWhitelistFile": str(READER_NETWORK_POLICY_FILE),
        "readerNetworkMode": "allowlist" if READER_WHITELIST_ENABLED else "same-origin-unrestricted",
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


def _reader_words(value: object) -> set[str]:
    decoded = unquote(str(value or ""))
    spaced = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", decoded)
    return set(re.findall(r"[a-z]+", spaced.casefold()))


def _reader_contains_mutation_command(value: object) -> bool:
    words = _reader_words(value)
    mutation_terms = words.intersection(READER_MUTATION_COMMAND_TERMS)
    return bool(
        mutation_terms - {"open"}
        or ("open" in mutation_terms and not words.intersection(READER_READ_ONLY_OPEN_CONTEXT_TERMS))
    )


def _reader_is_mutation_route(value: object) -> bool:
    parsed = urlsplit(unquote(str(value or "")))
    return any(
        _reader_contains_mutation_command(segment)
        and _reader_words(segment).intersection(READER_MUTATION_ROUTE_TERMS)
        for segment in parsed.path.split("/")
        if segment
    )


def _reader_is_safe_overlay_dismissal_label(value: object, action: PortalReadAction) -> bool:
    return (
        action.type.strip().casefold().replace("-", "_") == "dismiss_overlay"
        and _reader_words(value) in ({"close"}, {"dismiss"}, {"cancel"})
    )


def _reader_is_safe_overlay_dismissal_descriptor(value: object, action: PortalReadAction) -> bool:
    return _reader_is_safe_overlay_dismissal_label(value, action)


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


def _reader_semantic_tokens(value: object) -> set[str]:
    return {
        token[:-3] + "y" if token.endswith("ies") else token.rstrip("s")
        for token in re.findall(r"[a-z0-9]+", str(value or "").casefold())
        if len(token) > 2
    }


def _reader_surface_health(page: Page, semantic: object = "") -> dict[str, Any]:
    health = getattr(page, "_reader_health", {}) or {}
    if not health and getattr(page, "_reader_blocked_api_paths", None):
        health = {"blocked": getattr(page, "_reader_blocked_api_paths"), "failed": [], "pending": []}
    surface_tokens = _reader_semantic_tokens(urlsplit(getattr(page, "url", "")).path)
    surface_tokens.update(_reader_semantic_tokens(semantic))

    def paths_from(value: object) -> list[str]:
        if isinstance(value, dict):
            return [str(path) for path in (value.values() if any(not isinstance(key, str) for key in value) else value)]
        return [str(path) for path in (value or ())]

    def relevant(paths: object) -> list[str]:
        return list(dict.fromkeys(path for path in paths_from(paths) if surface_tokens & _reader_semantic_tokens(path)))

    def non_background(paths: object) -> list[str]:
        return [path for path in paths_from(paths) if path not in READER_BLOCKED_EXACT_PATHS]

    blocked = relevant(health.get("blocked"))
    failed = relevant(health.get("failed"))
    pending = relevant(health.get("pending"))
    uncertain = [
        path for source in (health.get("blocked"), health.get("failed"), health.get("pending"))
        for path in non_background(source)
        if path not in blocked and path not in failed and path not in pending
    ]
    return {
        "blocked": blocked, "failed": failed, "pending": pending,
        "uncertain": uncertain, "healthy": not (blocked or failed or pending or uncertain),
    }


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


def _reader_detail_identity(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _reader_cell_detail_destination(action: PortalReadAction) -> str | None:
    destinations = [str(value).strip() for value in (action.path, action.url) if value]
    return destinations[0] if len(destinations) == 1 else None


def _reader_same_route(first: str, second: str) -> bool:
    return (urlsplit(first).path.rstrip("/") or "/") == (urlsplit(second).path.rstrip("/") or "/")


def _reader_is_cell_detail_without_button(action: PortalReadAction) -> bool:
    return (
        action.type.strip().casefold().replace("-", "_") == "show_detail"
        and str(action.role or "").casefold() == "cell"
        and not str(action.permission_code or "").strip()
    )


def _validate_cell_detail_request(action: PortalReadAction, start_path: str) -> None:
    identity = _reader_detail_identity(action.value)
    if not str(action.name or "").strip() or _reader_detail_identity(action.name) != identity:
        raise HTTPException(status_code=422, detail={"code": "reader_detail_cell_identity_mismatch"})
    destination = _reader_cell_detail_destination(action)
    if destination is None:
        raise HTTPException(status_code=422, detail={"code": "reader_detail_destination_required"})
    if urlsplit(destination).query or urlsplit(destination).fragment:
        raise HTTPException(status_code=422, detail={"code": "reader_detail_destination_query_forbidden"})
    if _reader_same_route(start_path, destination):
        raise HTTPException(status_code=422, detail={"code": "reader_detail_destination_not_distinct"})


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
    if not _reader_relative_path(request.start_path) or _reader_is_mutation_route(request.start_path):
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
        for field_name, candidate in (("label", action.label), ("name", action.name), ("selector", action.selector)):
            if candidate is None:
                continue
            if field_name in {"label", "name"} and _reader_is_safe_overlay_dismissal_label(candidate, action):
                continue
            if _reader_contains_mutation_command(candidate):
                raise HTTPException(status_code=422, detail={"code": "action_not_read_only"})
        if any(
            _reader_contains_mutation_command(key)
            for key in (*action.parameters, *action.filters)
        ):
            raise HTTPException(status_code=422, detail={"code": "action_not_read_only"})
        if action_type in {
            "query", "filter", "paginate", "switch_tab", "expand_details", "show_filter",
            "apply_filter", "reset_filter", "sort", "show_detail", "dismiss_overlay",
        }:
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
        if action_type == "filter" and action.value is None and not action.values:
            raise HTTPException(status_code=422, detail={"code": "reader_filter_value_required"})
        if any(not str(value).strip() or len(str(value)) > 1_000 for value in action.values):
            raise HTTPException(status_code=422, detail={"code": "reader_filter_value_invalid"})
        if action_type in {
            "paginate", "switch_tab", "expand_details", "show_filter", "apply_filter",
            "reset_filter", "sort", "show_detail", "dismiss_overlay",
        } and (not action.role or not (action.name or action.label)):
            raise HTTPException(status_code=422, detail={"code": "reader_click_semantics_required"})
        if action_type == "switch_tab" and action.role != "tab":
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_tab"})
        if action_type == "paginate" and action.role not in {"button", "link"}:
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_pagination"})
        if action_type == "expand_details" and action.role != "button":
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_expandable"})
        if action_type == "show_filter" and action.role != "button":
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_filter"})
        if action_type in {"apply_filter", "reset_filter", "dismiss_overlay"} and action.role != "button":
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_overlay_button"})
        if action_type == "sort" and action.role not in {"button", "columnheader"}:
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_sort"})
        if action_type == "sort" and str(action.direction or "").casefold() not in {"ascending", "descending"}:
            raise HTTPException(status_code=422, detail={"code": "reader_sort_direction_required"})
        if action_type == "show_detail" and action.role not in {"button", "link", "cell"}:
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_detail"})
        if action_type == "show_detail" and not str(action.value or "").strip():
            raise HTTPException(status_code=422, detail={"code": "reader_detail_identity_required"})
        if action_type == "show_detail" and action.role == "cell" and action.permission_code:
            raise HTTPException(status_code=422, detail={"code": "reader_click_target_not_detail"})
        if _reader_is_cell_detail_without_button(action):
            _validate_cell_detail_request(action, request.start_path)
        if action_type in {"expand_details", "show_detail"} and not _reader_is_cell_detail_without_button(action) and not action.permission_code:
            raise HTTPException(status_code=422, detail={"code": "button_permission_required"})
        for candidate in (action.path, action.url):
            if candidate is None:
                continue
            safe_path = _reader_relative_path(candidate)
            if not safe_path or _reader_is_mutation_route(safe_path):
                raise HTTPException(status_code=422, detail={"code": "invalid_reader_path"})
            pages.add(safe_path)
    if len(pages) > request.max_pages:
        raise HTTPException(status_code=422, detail={"code": "page_limit_exceeded"})


def _reader_network_request_allowed(
    request: Any,
    portal_origin: str,
    allowed_navigation_paths: frozenset[str] | None = None,
) -> bool:
    parsed = urlsplit(request.url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    method = request.method.upper()
    resource_type = str(getattr(request, "resource_type", "") or "").casefold()
    if resource_type in {"websocket", "eventsource"} or origin != portal_origin:
        return False
    if resource_type == "document" and allowed_navigation_paths is not None and not _path_is_permitted(parsed.path, tuple(allowed_navigation_paths)):
        return False
    # Local business validation bypasses only the HTTP method/path policy.
    # Origin, navigation permissions and explicit Reader actions stay guarded.
    if not READER_WHITELIST_ENABLED:
        return True
    api_request = parsed.path.startswith("/api/")
    if parsed.path in READER_BLOCKED_EXACT_PATHS:
        return False
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
        return False
    static_fetch_allowed = resource_type in {"xhr", "fetch"} and method == "GET" and parsed.path in READER_STATIC_FETCH_PATHS
    static_allowed = resource_type in {"document", "script", "stylesheet", "font", "image"} and method in {"GET", "HEAD"}
    if not api_request and not (static_allowed or static_fetch_allowed):
        return False
    return True


async def _guard_reader_request(
    route: Route,
    portal_origin: str,
    allowed_navigation_paths: frozenset[str] | None = None,
    *,
    reader_health: dict[str, Any] | None = None,
) -> None:
    allowed = _reader_network_request_allowed(route.request, portal_origin, allowed_navigation_paths)
    request_path = urlsplit(route.request.url).path
    if reader_health is not None and request_path.startswith("/api/"):
        if allowed:
            reader_health["pending"][id(route.request)] = request_path
        else:
            reader_health["blocked"].append(request_path)
    if not allowed:
        await route.abort("blockedbyclient")
        return
    await route.continue_()


async def _reader_tab_scope(page: Page, action: PortalReadAction) -> Any:
    if not action.section:
        return page
    regions = page.get_by_role("region", name=action.section, exact=True)
    visible_regions = [regions.nth(index) for index in range(await regions.count()) if await regions.nth(index).is_visible()]
    if len(visible_regions) > 1:
        raise RuntimeError("reader_switch_tab_ambiguous")
    if visible_regions:
        return visible_regions[0]
    headings = page.get_by_role("heading", name=action.section, exact=True)
    visible_headings = [headings.nth(index) for index in range(await headings.count()) if await headings.nth(index).is_visible()]
    if len(visible_headings) > 1:
        raise RuntimeError("reader_switch_tab_ambiguous")
    if not visible_headings:
        raise RuntimeError("reader_selector_not_found")
    scope = visible_headings[0].locator("xpath=ancestor::*[self::section or @role='region'][1]")
    if await scope.count() != 1 or not await scope.nth(0).is_visible():
        raise RuntimeError("reader_selector_not_found")
    return scope.nth(0)


async def _reader_tab_fallback_targets(page: Page, action: PortalReadAction) -> list[Any]:
    """Preserve a unique semantic scope; match exact names before numeric badges."""
    if action.selector or action.role != "tab":
        return []
    label = " ".join(str(action.name or action.label or "").split())
    if not label:
        return []
    root = await _reader_tab_scope(page, action)
    exact = root.get_by_role("tab", name=action.name or action.label, exact=True)
    visible_exact = [exact.nth(index) for index in range(await exact.count()) if await exact.nth(index).is_visible()]
    if visible_exact:
        return visible_exact
    candidates = root.get_by_role("tab", name=re.compile(r"^" + re.escape(label) + r"\s+[0-9]+$"))
    matches = []
    for index in range(await candidates.count()):
        candidate = candidates.nth(index)
        if not await candidate.is_visible():
            continue
        parts = await candidate.evaluate("""element => {
            const visible = node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
            const children = Array.from(element.children).filter(visible);
            const looseText = Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
            if (looseText || children.length !== 2) return null;
            return children.map(child => (child.innerText || '').trim().replace(/\\s+/g, ' '));
        }""")
        if isinstance(parts, list) and len(parts) == 2 and parts[0] == label and re.fullmatch(r"[0-9]+", str(parts[1])):
            matches.append(candidate)
    return matches


async def _reader_tab_selection(locator: Any) -> dict[str, Any]:
    aria_selected = await locator.get_attribute("aria-selected")
    if aria_selected is not None:
        return {"selected": aria_selected == "true", "native": True}
    state = await locator.evaluate("""element => {
        const visible = node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
        const active = node => {
            if (node.hasAttribute('aria-selected')) return node.getAttribute('aria-selected') === 'true';
            return ['active', 'selected'].includes(node.getAttribute('data-state')) ||
                Array.from(node.classList).some(token => /^(?:active|selected|is-active|is-selected)$|--(?:active|selected)$/.test(token));
        };
        const group = element.closest('[role="tablist"]') || element.parentElement;
        if (!group || element.getAttribute('role') !== 'tab') return null;
        const tabs = Array.from(group.querySelectorAll('[role="tab"]')).filter(visible);
        const selected = tabs.filter(active);
        return {
            selected: tabs.length >= 2 && selected.length === 1 && selected[0] === element,
            native: false,
            groupLabels: tabs.slice(0, 40).map(tab => (tab.innerText || '').trim().slice(0, 200)),
            groupSize: tabs.length
        };
    }""")
    return state if isinstance(state, dict) else {"selected": False, "native": False}


async def _reader_selected_tab_texts(root: Any) -> list[str]:
    selected = []
    for selector in ("[role='tab'][aria-selected='true']", "[role='tab']:not([aria-selected])"):
        tabs = root.locator(selector)
        for index in range(await tabs.count()):
            tab = tabs.nth(index)
            if not await tab.is_visible():
                continue
            if selector.endswith(":not([aria-selected])") and not (await _reader_tab_selection(tab)).get("selected"):
                continue
            selected.append(_sanitize_reader_text(await tab.inner_text(), max_chars=200))
            if len(selected) >= 2:
                return selected
    return selected


async def _safe_click(page: Page, action: PortalReadAction) -> None:
    action_type = action.type.strip().casefold().replace("-", "_")
    target = _semantic_locator(page, action)
    if _reader_is_cell_detail_without_button(action) and await target.count() != 1:
        raise RuntimeError("reader_detail_cell_not_unique")
    locator = target.first
    if action_type == "switch_tab":
        visible_targets = [
            target.nth(index)
            for index in range(await target.count())
            if await target.nth(index).is_visible()
        ]
        if not visible_targets:
            visible_targets = await _reader_tab_fallback_targets(page, action)
        if not visible_targets:
            raise RuntimeError("reader_selector_not_found")
        if len(visible_targets) != 1:
            raise RuntimeError("reader_switch_tab_ambiguous")
        locator = visible_targets[0]
    if await locator.count() == 0:
        raise RuntimeError("reader_selector_not_found")
    tag_name = str(await locator.evaluate("element => element.tagName.toLowerCase()") or "").casefold()
    if _reader_is_cell_detail_without_button(action):
        if not await locator.is_visible():
            raise RuntimeError("reader_detail_cell_not_visible")
        if tag_name != "td":
            raise RuntimeError("reader_detail_cell_not_native")
        identity = _reader_detail_identity(action.value)
        if _reader_detail_identity(await locator.inner_text()) != identity:
            raise RuntimeError("reader_detail_cell_identity_mismatch")
        row = locator.locator("xpath=ancestor::tr[1]").first
        if await row.count() != 1 or not await row.is_visible():
            raise RuntimeError("reader_detail_row_not_visible")
        if not _reader_detail_identity(await row.inner_text()):
            raise RuntimeError("reader_detail_row_unverifiable")
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
    if _reader_contains_mutation_command(descriptor) and not _reader_is_safe_overlay_dismissal_descriptor(descriptor, action):
        raise RuntimeError("action_not_read_only")
    if not descriptor.strip():
        raise RuntimeError("reader_click_target_unverifiable")
    expected_descriptor = _reader_compact(action.name or action.label)
    if not expected_descriptor or expected_descriptor not in _reader_compact(descriptor):
        raise RuntimeError("reader_click_descriptor_mismatch")
    explicit_role = (await locator.get_attribute("role") or "").casefold()
    role = explicit_role or {"button": "button", "a": "link", "th": "columnheader", "td": "cell"}.get(tag_name, "")
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
    before_tab = await _reader_tab_selection(locator) if action_type == "switch_tab" else {}
    await locator.click(timeout=5_000)
    if action_type == "switch_tab":
        for attempt in range(11):
            after_tab = await _reader_tab_selection(locator)
            stable_group = after_tab.get("native") or (
                before_tab.get("groupSize") == after_tab.get("groupSize")
                and before_tab.get("groupLabels") == after_tab.get("groupLabels")
            )
            if after_tab.get("selected") and stable_group:
                break
            if attempt < 10:
                await asyncio.sleep(0.1)
        else:
            raise RuntimeError("reader_tab_state_not_confirmed")
    if action_type == "sort" and str(await locator.get_attribute("aria-sort") or "").casefold() != str(action.direction).casefold():
        raise RuntimeError("reader_sort_state_not_confirmed")


def _visible_overlay(page: Page):
    return page.locator(
        "[role='dialog']:visible,[role='alertdialog']:visible,.ant-drawer-content:visible"
    ).last


async def _visible_overlay_count(page: Page) -> int:
    return await page.locator(
        "[role='dialog']:visible,[role='alertdialog']:visible,.ant-drawer-content:visible"
    ).count()


def _semantic_locator(page: Page, action: PortalReadAction, *, prefer_overlay: bool = False):
    action_type = action.type.strip().casefold().replace("-", "_")
    root = _visible_overlay(page) if prefer_overlay or action_type in READER_OVERLAY_ACTIONS else page
    if action.selector:
        return root.locator(action.selector)
    if action.field:
        return root.get_by_label(action.field, exact=True)
    if action.role:
        semantic_root = root.get_by_role("region", name=action.section, exact=True) if action.section else root
        return semantic_root.get_by_role(action.role, name=action.name or action.label, exact=True)
    if action.section:
        return root.get_by_role("region", name=action.section, exact=True)
    raise RuntimeError("reader_semantic_locator_required")


async def _set_filter_value(page: Page, action: PortalReadAction) -> None:
    locator = _semantic_locator(page, action, prefer_overlay=await _visible_overlay_count(page) > 0).first
    if await locator.count() == 0:
        raise RuntimeError("reader_selector_not_found")
    tag_name = str(await locator.evaluate("element => element.tagName.toLowerCase()") or "").casefold()
    role = str(await locator.get_attribute("role") or "").casefold()
    input_type = str(await locator.get_attribute("type") or "").casefold()
    if input_type == "password":
        raise RuntimeError("reader_sensitive_locator_forbidden")
    values = action.values or ([action.value] if action.value is not None else [])
    value = str(values[0]) if values else ""
    if tag_name == "select":
        await locator.select_option(label=[str(item) for item in values], timeout=5_000)
        return
    if role == "combobox" and tag_name not in {"input", "textarea"}:
        await locator.click(timeout=5_000)
        for item in values:
            option = page.get_by_role("option", name=str(item), exact=True).first
            if await option.count() == 0 or not await option.is_visible():
                raise RuntimeError("reader_filter_option_not_found")
            await option.click(timeout=5_000)
        return
    if len(values) != 1:
        raise RuntimeError("reader_filter_control_not_multiselect")
    if tag_name not in {"input", "textarea"}:
        raise RuntimeError("reader_filter_control_unsupported")
    await locator.fill(value, timeout=5_000)


async def _detail_identity_is_visible(page: Page, identity: str, *, overlay_open: bool) -> bool:
    root = _visible_overlay(page) if overlay_open else page
    locator = root.get_by_text(identity, exact=True)
    for index in range(await locator.count()):
        if await locator.nth(index).is_visible():
            return True
    return False


async def _validate_cell_detail_navigation(page: Page, action: PortalReadAction, before_url: str) -> None:
    destination = _reader_cell_detail_destination(action)
    identity = _reader_detail_identity(action.value)
    if (
        destination is None
        or page.url == before_url
        or not _reader_same_route(page.url, destination)
    ):
        raise RuntimeError("reader_detail_destination_mismatch")
    if not await _detail_identity_is_visible(page, identity, overlay_open=False):
        raise RuntimeError("reader_detail_identity_mismatch")


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


async def _observe_semantics(page: Page, limit: int) -> dict[str, Any]:
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

    async def table_values(
        container,
        *,
        row_limit: int,
    ) -> tuple[list[str], list[str], list[dict[str, str]], str]:
        async def has_complex_span(cell) -> bool:
            for attribute in ("colspan", "rowspan"):
                value = str(await cell.get_attribute(attribute) or "1").strip()
                if value not in {"", "1"}:
                    return True
            return False

        tag_name = str(await container.evaluate("element => element.tagName.toLowerCase()") or "").casefold()
        headers = container.locator("thead th,[role='columnheader']")
        header_values: list[str] = []
        excluded_column_indexes: set[int] = set()
        structured_headers: list[str] = []
        structured_headers_safe = True
        seen_headers: set[str] = set()
        header_count = await headers.count()
        if not header_count or header_count > 50:
            structured_headers_safe = False
        for header_index in range(header_count):
            header = headers.nth(header_index)
            if not await header.is_visible():
                structured_headers_safe = False
                structured_headers.append("")
                continue
            header_text = _sanitize_reader_text(await header.inner_text(), max_chars=120)
            header_key = header_text.casefold()
            if (
                not header_text
                or header_key in seen_headers
                or await has_complex_span(header)
            ):
                structured_headers_safe = False
            seen_headers.add(header_key)
            structured_headers.append(header_text)
            compact_header = re.sub(r"[^a-z]", "", header_text.casefold())
            if (
                compact_header in {"action", "actions", "operation", "operations"}
                or _reader_contains_sensitive_locator(header_text)
                or "secret" in _reader_words(header_text)
            ):
                excluded_column_indexes.add(header_index)
            elif header_text and header_text not in header_values:
                header_values.append(header_text)
        row_selector = (
            "tbody > tr:has(> td):not(.ant-table-placeholder):not([class*='skeleton']):not(:has([class*='skeleton']))"
            if tag_name == "table"
            else "[role='row']:has([role='cell'],[role='gridcell']):not([class*='skeleton']):not(:has([class*='skeleton']))"
        )
        row_locator = container.locator(row_selector)
        rows: list[str] = []
        row_fields: list[dict[str, str]] = []
        for row_index in range(await row_locator.count()):
            row = row_locator.nth(row_index)
            if not await row.is_visible():
                continue
            structured_row: dict[str, str] | None = None
            cells = None
            if excluded_column_indexes or structured_headers_safe:
                cells = row.locator(":scope > td,:scope > [role='cell'],:scope > [role='gridcell']")
            if structured_headers_safe and cells is not None and await cells.count() == header_count:
                candidate_fields: dict[str, str] = {}
                structured_row_safe = True
                for cell_index in range(header_count):
                    cell = cells.nth(cell_index)
                    if (
                        not await cell.is_visible()
                        or await has_complex_span(cell)
                    ):
                        structured_row_safe = False
                        break
                    if cell_index in excluded_column_indexes or len(candidate_fields) >= 12:
                        continue
                    candidate_fields[structured_headers[cell_index]] = _sanitize_reader_text(
                        await cell.inner_text(),
                        max_chars=300,
                    )
                if structured_row_safe:
                    structured_row = candidate_fields
            if excluded_column_indexes and cells is not None:
                parts: list[str] = []
                for cell_index in range(await cells.count()):
                    if cell_index in excluded_column_indexes:
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
                if structured_row is not None and len(rows) <= 4:
                    row_fields.append(structured_row)
            if len(rows) >= row_limit:
                break
        empty_values = await visible_texts(
            container.locator(".ant-empty-description,[role='status']"),
            max_each=2,
            max_chars=200,
        )
        empty_state = next(
            (
                value for value in empty_values
                if any(marker in value.casefold() for marker in (
                    "no data", "no records", "no results", "nothing found", "暂无数据", "暂无记录", "没有数据",
                ))
            ),
            "",
        )
        return header_values[:20], rows, row_fields, empty_state

    containers = page.locator("table,[role='grid']")
    visible_containers: list[tuple[int, Any]] = []
    for index in range(await containers.count()):
        container = containers.nth(index)
        if await container.is_visible():
            visible_containers.append((index, container))
    section_summaries: list[dict[str, Any]] = []
    first_rows: list[str] = []
    for index, container in visible_containers:
        if await container.get_attribute("aria-busy") == "true":
            continue
        container_kind = "grid" if await container.get_attribute("role") == "grid" else "table"
        headers, rows, row_fields, empty_state = await table_values(
            container,
            row_limit=min(limit, 8) if not first_rows else min(limit, 4),
        )
        if not rows and not empty_state:
            continue
        if not first_rows:
            first_rows = rows
        semantic_identity = await container.evaluate(
                """element => {
                    const visible = node => !!(node && (node.offsetWidth || node.offsetHeight || node.getClientRects().length));
                    const overlay = element.closest('[role="dialog"],[role="alertdialog"],.ant-drawer-content');
                    const semanticRoot = element.closest('section,[role="region"]');
                    const localRoot = semanticRoot || overlay;
                    const localHeadings = localRoot
                        ? Array.from(localRoot.querySelectorAll('h1,h2,h3,[role="heading"]'))
                            .filter(node => visible(node) && (node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING))
                        : [];
                    const heading = localHeadings && localHeadings.pop();
                    let headingText = '';
                    if (heading && heading.innerText.trim()) headingText = heading.innerText.trim();
                    const label = semanticRoot && semanticRoot.getAttribute('aria-label');
                    if (!headingText && label && !/^(?:scrollable content|content|main)$/i.test(label.trim())) {
                        headingText = label;
                    }
                    if (!headingText) {
                        const root = overlay || document.body;
                        const precedingHeadings = Array.from(root.querySelectorAll('h1,h2,h3,[role="heading"]'))
                            .filter(node => visible(node) && (node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
                        const precedingHeading = precedingHeadings.pop();
                        if (precedingHeading && precedingHeading.innerText.trim()) headingText = precedingHeading.innerText.trim();
                    }
                    const semanticRoots = Array.from(document.querySelectorAll('section,[role="region"]'));
                    const parentIndex = semanticRoot ? semanticRoots.indexOf(semanticRoot) : -1;
                    return { heading: headingText, parentIndex };
                }"""
            )
        if isinstance(semantic_identity, dict):
            heading_value = semantic_identity.get("heading")
            parent_index = semantic_identity.get("parentIndex")
        else:
            # Compatibility for browser adapters and test doubles returning the
            # legacy heading scalar.
            heading_value = semantic_identity
            parent_index = None
        heading = _sanitize_reader_text(
            heading_value,
            max_chars=200,
        )
        section_summary: dict[str, Any] = {
            "nodeId": f"observation-table-{index + 1:03d}",
            "kind": container_kind,
            "heading": heading,
            "sourceSection": heading,
            "columnHeaders": headers[:12],
            "rowSummaries": rows[:4],
            "rowFields": row_fields[:4],
            "emptyState": empty_state,
        }
        if isinstance(parent_index, int) and parent_index >= 0:
            section_summary["parentRef"] = f"observation-region-{parent_index + 1:03d}"
        section_summaries.append(section_summary)
        if len(section_summaries) >= 4:
            break

    active_tab_texts = await _reader_selected_tab_texts(page)
    visible_active_tab_count = len(active_tab_texts)
    active_tab_text = active_tab_texts[0] if active_tab_texts else ""
    if len(visible_containers) == 1 and visible_active_tab_count == 1 and active_tab_text:
        visible_table_node_id = f"observation-table-{visible_containers[0][0] + 1:03d}"
        for section_summary in section_summaries:
            if section_summary.get("nodeId") == visible_table_node_id:
                section_summary.setdefault("selectedState", active_tab_text)
                break

    referenced_parent_refs = {
        str(summary.get("parentRef") or "")
        for summary in section_summaries
        if summary.get("parentRef")
    }
    referenced_indexes = {
        int(ref.rsplit("-", 1)[-1]) - 1
        for ref in referenced_parent_refs
        if ref.rsplit("-", 1)[-1].isdigit()
    }
    referenced_regions: list[dict[str, Any]] = []
    other_regions: list[dict[str, Any]] = []
    semantic_sections = page.locator("section,[role='region']")
    for index in range(await semantic_sections.count()):
        section = semantic_sections.nth(index)
        if not await section.is_visible():
            continue
        headings = await visible_texts(
            section.locator("h1,h2,h3,[role='heading']"),
            max_each=1,
            max_chars=200,
        )
        heading = headings[0] if headings else _sanitize_reader_text(
            await section.get_attribute("aria-label"),
            max_chars=200,
        )
        if heading.casefold() in {"scrollable content", "content", "main"}:
            heading = ""
        if not heading:
            continue
        controls = await visible_texts(
            section.locator("[role='tab'],[role='button'],button[aria-label],a[aria-label]"),
            max_each=min(limit, 12),
            max_chars=200,
        )
        selected_states = await _reader_selected_tab_texts(section)
        card_summaries = await visible_texts(
            section.locator(".stat-card:not([class*='skeleton']):not(:has([class*='skeleton']))"),
            max_each=min(limit, 12),
            max_chars=200,
            reject_error_states=True,
        )
        empty_values = await visible_texts(
            section.locator(".ant-empty-description,[role='status']"),
            max_each=2,
            max_chars=200,
        )
        empty_state = next(
            (
                value for value in empty_values
                if any(marker in value.casefold() for marker in (
                    "no data", "no records", "no results", "nothing found", "暂无数据", "暂无记录", "没有数据",
                ))
            ),
            "",
        )
        node_id = f"observation-region-{index + 1:03d}"
        is_referenced_parent = node_id in referenced_parent_refs
        if not controls and not card_summaries and not empty_state and not is_referenced_parent:
            continue
        region_summary: dict[str, Any] = {
            "nodeId": node_id,
            "kind": "region",
            "heading": heading,
            "sourceSection": heading,
            "controls": controls,
            "emptyState": empty_state,
        }
        if len(selected_states) == 1 and selected_states[0]:
            region_summary["selectedState"] = selected_states[0]
        if card_summaries:
            region_summary["cardSummaries"] = card_summaries
            region_summary["summaries"] = card_summaries
        if is_referenced_parent:
            referenced_regions.append(region_summary)
        elif len(other_regions) < 8:
            other_regions.append(region_summary)
        if (
            len(other_regions) >= 8
            and (not referenced_indexes or index >= max(referenced_indexes))
            and len(referenced_regions) >= len(referenced_parent_refs)
        ):
            break

    remaining_region_slots = max(0, 8 - len(referenced_regions))
    region_summaries = sorted(
        [*referenced_regions, *other_regions[:remaining_region_slots]],
        key=lambda summary: str(summary.get("nodeId") or ""),
    )

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
        "rowSummaries": first_rows,
        "sectionSummaries": section_summaries,
        "regionSummaries": region_summaries,
        "dialogs": await texts(READER_OVERLAY_SELECTOR, max_each=min(limit, 4), max_chars=800),
        "readHealth": {
            **_reader_surface_health(page),
            "pending": list(_reader_surface_health(page).get("pending", [])),
        },
    }


async def _query_page_values(page: Page, action: PortalReadAction, limit: int) -> tuple[str, list[str], bool]:
    locator = _semantic_locator(page, action, prefer_overlay=await _visible_overlay_count(page) > 0)
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
    surface_health = _reader_surface_health(page, action.label or action.field or action.name)
    confirmed_empty = bool(
        visible_empty_state
        and not await _page_has_visible_failure_state(page)
        and surface_health["healthy"]
    )
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
) -> tuple[list[str], list[str], list[str], bool, dict[str, Any] | None]:
    facts: list[str] = []
    visited: list[str] = []
    observed_fields: list[str] = []
    confirmed_empty = False
    observation: dict[str, Any] | None = None
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
            if observation.get("readHealth", {}).get("healthy") is not True:
                has_empty = bool(
                    observation.get("rowSummaries") == []
                    and any(region.get("emptyState") for region in observation.get("regionSummaries", []))
                )
                if has_empty:
                    confirmed_empty = False
        elif action_type == "navigate":
            path = action.path or action.url
            if path:
                response = await page.goto(urljoin(portal_origin + "/", path.lstrip("/")), wait_until="domcontentloaded")
                if response and response.status in {401, 403}:
                    raise PermissionError("page_not_permitted")
                await _settle_page(page)
                await record_page()
        elif action_type == "filter":
            await _set_filter_value(page, action)
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
            before_url = page.url
            overlays_before = await _visible_overlay_count(page)
            await _safe_click(page, action)
            await _settle_page(page)
            await record_page()
            overlays_after = await _visible_overlay_count(page)
            if action_type == "show_filter" and overlays_after <= overlays_before:
                raise RuntimeError("reader_filter_overlay_not_opened")
            if _reader_is_cell_detail_without_button(action):
                await _validate_cell_detail_navigation(page, action, before_url)
            elif action_type == "show_detail" and page.url == before_url and overlays_after <= overlays_before:
                raise RuntimeError("reader_detail_not_opened")
            if action_type == "show_detail" and not _reader_is_cell_detail_without_button(action) and not await _detail_identity_is_visible(
                page,
                str(action.value),
                overlay_open=overlays_after > overlays_before,
            ):
                raise RuntimeError("reader_detail_identity_mismatch")
            if action_type == "dismiss_overlay" and overlays_after >= overlays_before:
                raise RuntimeError("reader_overlay_not_dismissed")
        if len(facts) >= request.max_output_items:
            break
    if observation is None and any(
        action.type.strip().casefold().replace("-", "_") != "query"
        for action in request.actions
    ):
        # Capture the bounded semantic state after a verified read-only
        # interaction so callers can validate the resulting tab, page, or view.
        observation = await _observe_semantics(page, request.max_output_items)
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
        if action_type in {"expand_details", "show_detail"} and not _reader_is_cell_detail_without_button(action) and (
            not action.permission_code or not _gateway_button_permitted(action, permission_context["buttons"])
        ):
            raise HTTPException(status_code=403, detail={"code": "button_not_permitted"})

    portal_parts = urlsplit(UMC_BASE_URL)
    portal_origin = f"{portal_parts.scheme}://{portal_parts.netloc}"
    raw_token = forwarded[7:].strip()

    async def execute() -> tuple[list[str], list[str], list[str], bool, dict[str, Any] | None]:
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
                reader_health: dict[str, Any] = {
                    "blocked": [], "failed": {}, "pending": {}, "responses": {},
                }

                async def route_handler(route: Route) -> None:
                    declared_paths = frozenset(
                        {request.start_path}
                        | {path for action in request.actions for path in (action.path, action.url) if path}
                    )
                    await _guard_reader_request(route, portal_origin, declared_paths, reader_health=reader_health)

                await context.route("**/*", route_handler)
                page = await context.new_page()
                setattr(page, "_reader_health", reader_health)
                def request_finished(request_obj: Any) -> None:
                    request_id = id(request_obj)
                    request_path = reader_health["pending"].pop(request_id, "")
                    if request_path and int(reader_health["responses"].pop(request_id, 200)) < 400:
                        reader_health["failed"].pop(request_path, None)
                def request_failed(request_obj: Any) -> None:
                    request_id = id(request_obj)
                    request_path = reader_health["pending"].pop(request_id, "")
                    if request_path:
                        reader_health["failed"][request_path] = reader_health["failed"].get(request_path, 0) + 1
                def response_seen(response: Any) -> None:
                    request_obj = getattr(response, "request", None)
                    request_id = id(request_obj) if request_obj is not None else None
                    request_path = urlsplit(getattr(response, "url", "")).path
                    if request_id is not None:
                        reader_health["responses"][request_id] = int(getattr(response, "status", 200))
                    if request_path.startswith("/api/") and int(getattr(response, "status", 200)) >= 400:
                        reader_health["failed"][request_path] = reader_health["failed"].get(request_path, 0) + 1
                page.on("requestfinished", request_finished)
                page.on("requestfailed", request_failed)
                page.on("response", response_seen)
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
