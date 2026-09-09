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
from urllib.parse import parse_qsl, unquote, urljoin, urlsplit

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
READER_ACTION_TIMEOUT_MS = max(
    5_000,
    min(15_000, int(float(os.getenv("READER_ACTION_TIMEOUT_MS", "10000")))),
)
READER_MAX_OUTPUT_ITEMS = 20
READER_MAX_API_CANDIDATES = 32
READER_MAX_REQUEST_VARIANTS_PER_OPERATION = 32
READER_MAX_API_EVIDENCE_BYTES = 2_000_000
READER_MAX_API_EVIDENCE_NODES = 600
READER_MAX_API_EVIDENCE_CHARS = 48_000
READER_MAX_API_EVIDENCE_DEPTH = 32
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


def _bounded_catalog_strings(value: Any, *, limit: int, max_chars: int) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip()[:max_chars] for item in value[:limit] if isinstance(item, str) and item.strip()]


def _load_reader_operation_catalog(path: Path) -> tuple[dict[str, Any], ...]:
    """Load optional, compact Swagger metadata without making discovery depend on it."""

    if not path.is_file():
        return ()
    payload = json.loads(path.read_text(encoding="utf-8"))
    operations = payload.get("operations") if isinstance(payload, dict) else payload
    if not isinstance(operations, list):
        raise ValueError("Reader operation catalog must contain an operations list")
    bounded: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for value in operations[:2_000]:
        if not isinstance(value, dict):
            continue
        method = str(value.get("method") or "").strip().upper()
        operation_path = str(value.get("path") or "").strip()
        if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"} or not operation_path.startswith("/api/"):
            continue
        parsed = urlsplit(operation_path)
        if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or "\\" in operation_path:
            continue
        key = (method, parsed.path.rstrip("/") or "/")
        if key in seen:
            continue
        seen.add(key)
        entry: dict[str, Any] = {
            "method": method,
            "path": key[1],
            "tags": _bounded_catalog_strings(value.get("tags"), limit=8, max_chars=80),
            "requestSchemas": _bounded_catalog_strings(value.get("requestSchemas"), limit=6, max_chars=120),
            "requestFields": _bounded_catalog_strings(value.get("requestFields"), limit=12, max_chars=120),
            "responseSchemas": _bounded_catalog_strings(value.get("responseSchemas"), limit=6, max_chars=120),
            "responseFields": _bounded_catalog_strings(value.get("responseFields"), limit=12, max_chars=120),
        }
        for field, limit in (("operationId", 120), ("summary", 300), ("description", 600)):
            field_value = value.get(field)
            if isinstance(field_value, str) and field_value.strip():
                entry[field] = field_value.strip()[:limit]
        classification = value.get("classification")
        if isinstance(classification, str) and classification.strip():
            entry["classification"] = classification.strip()[:80]
        bounded.append(entry)
    return tuple(bounded)


READER_OPERATION_CATALOG_FILE = Path(os.getenv(
    "PORTAL_READER_OPERATION_CATALOG", "/app/config/reader-operation-catalog.json",
))
try:
    READER_OPERATION_CATALOG = _load_reader_operation_catalog(READER_OPERATION_CATALOG_FILE)
except (OSError, ValueError, json.JSONDecodeError) as exc:
    logger.warning("Reader operation catalog is unavailable: %s", type(exc).__name__)
    READER_OPERATION_CATALOG = ()
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
    type: str = Field(description="Read-only UI action. query reads existing values; filter sets or clears a criterion. query must not carry value, values, nonempty parameters or filters. reset_filter and apply_filter target an observed filter overlay or a verified inline filter toolbar. dismiss_overlay is overlay-only. Clearing a page search uses filter with an empty value.")
    path: str | None = None
    url: str | None = None
    selector: str | None = Field(default=None, max_length=500)
    label: str | None = Field(default=None, max_length=200)
    role: str | None = Field(default=None, max_length=80)
    name: str | None = Field(default=None, max_length=200)
    field: str | None = Field(default=None, max_length=200)
    section: str | None = Field(default=None, max_length=200, description="Optional exact observed semantic-region scope. A manual node title is not a region locator. A globally unique observed control may omit this field, but a user-required region must remain verified; a missing or ambiguous scope must never silently broaden the action.")
    empty_state: str | None = Field(default=None, alias="emptyState", max_length=300)
    permission_code: str | None = Field(default=None, alias="permissionCode", max_length=200)
    value: str | None = Field(default=None, max_length=1_000, description="A filter input value, including an empty string to clear, or the stable identity for a detail action. Not permitted on query.")
    values: list[str] = Field(default_factory=list, max_length=20, description="Bounded filter option values. Nonempty values are not permitted on query.")
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
        "readerOperationCatalogFile": str(READER_OPERATION_CATALOG_FILE),
        "readerOperationCatalogCount": len(READER_OPERATION_CATALOG),
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
        return list(dict.fromkeys(path for path in paths_from(paths)
                                 if path not in READER_BLOCKED_EXACT_PATHS
                                 and surface_tokens & _reader_semantic_tokens(path)))

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


def _reader_discovery_template(method: str, path: str) -> tuple[str, dict[str, Any] | None]:
    normalized = path.rstrip("/") or "/"
    for operation in READER_OPERATION_CATALOG:
        if operation["method"] == method and operation["path"] == normalized:
            return operation["path"], operation
    for operation in READER_OPERATION_CATALOG:
        if operation["method"] != method:
            continue
        expected = operation["path"].strip("/").split("/")
        actual = normalized.strip("/").split("/")
        if len(expected) == len(actual) and all(
            left == right or left.startswith(":") or (left.startswith("{") and left.endswith("}"))
            for left, right in zip(expected, actual, strict=True)
        ):
            return operation["path"], operation
    if method == "GET":
        for allowed in READER_READ_ONLY_GET_PATHS:
            if ":" in allowed and _path_is_permitted(normalized, (allowed,)):
                return allowed, None
    if (
        (method == "GET" and normalized in READER_READ_ONLY_GET_PATHS)
        or (method == "POST" and normalized in READER_READ_ONLY_POST_PATHS)
        or normalized in READER_BLOCKED_EXACT_PATHS
    ):
        return normalized, None
    parts = normalized.split("/")
    for index, segment in enumerate(parts):
        follows_sensitive_name = index > 0 and _reader_words(parts[index - 1]).intersection({
            "authorization", "credential", "key", "secret", "token",
        })
        if (
            follows_sensitive_name
            or (any(char.isdigit() for char in segment) and not re.fullmatch(r"v\d+", segment, re.IGNORECASE))
            or re.fullmatch(r"\d+", segment)
            or re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}", segment)
            or re.fullmatch(r"[0-9a-fA-F]{16,}", segment)
            or re.fullmatch(r"[A-Za-z]+[-_]\d+[A-Za-z0-9_-]*", segment)
            or re.fullmatch(r"[^/@\s]+@[^/@\s]+", segment)
            or (len(segment) >= 20 and segment.isalnum() and any(char.isdigit() for char in segment))
        ):
            parts[index] = ":id"
    return "/".join(parts) or "/", None


def _reader_discovery_is_background(path: str, method: str) -> bool:
    lowered = path.casefold().rstrip("/")
    return (
        method == "OPTIONS"
        or lowered == "/api/adminuser/getuserinfo"
        or lowered.startswith("/api/clientlog/")
        or lowered.startswith("/api/signalr/getnotificationinfolist")
    )


def _reader_discovery_candidate_kind(path: str, catalog_entry: dict[str, Any] | None) -> str:
    tags = catalog_entry.get("tags", []) if catalog_entry else []
    semantic_words = _reader_words(" ".join([path, *(str(tag) for tag in tags)]))
    leaf_words = _reader_words(path.rstrip("/").rsplit("/", 1)[-1])
    support_words = {
        "lookup", "lookups", "dictionary", "dictionaries", "enum", "enums", "enumeration",
        "option", "options", "status", "statuses", "type", "types", "category", "categories",
        "priority", "priorities",
    }
    return "support" if semantic_words.intersection({"lookup", "lookups", "dictionary", "dictionaries"}) or leaf_words.intersection(support_words) else "business"


def _reader_request_variant(request_obj: Any) -> str:
    """Hash bounded business filters without retaining or exposing request values."""

    ignored_keys = {
        "_", "cachebuster", "continuationtoken", "current", "currentpage", "cursor", "limit",
        "nonce", "offset", "order", "orderby", "page", "pageindex", "pageno", "pagenumber",
        "pagesize", "perpage", "size", "skip", "sort", "sortby", "t", "take", "timestamp",
    }

    def ignored(key: object) -> bool:
        compact = re.sub(r"[^a-z0-9]", "", str(key).casefold())
        return compact in ignored_keys or any(
            marker in compact for marker in ("authorization", "credential", "password", "secret", "signature", "token")
        )

    def bounded(value: Any, depth: int = 0) -> Any:
        if depth >= 4:
            return "[depth]"
        if isinstance(value, dict):
            return {
                str(key)[:80]: bounded(item, depth + 1)
                for key, item in sorted(value.items(), key=lambda pair: str(pair[0]))[:40]
                if not ignored(key)
            }
        if isinstance(value, list):
            return [bounded(item, depth + 1) for item in value[:40]]
        if value is None or isinstance(value, (bool, int, float)):
            return value
        return str(value)[:300]

    parsed = urlsplit(str(getattr(request_obj, "url", "") or ""))
    query = sorted(
        (key[:80], value[:300])
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)[:80]
        if not ignored(key)
    )
    body: Any = None
    raw_body = getattr(request_obj, "post_data", None)
    if isinstance(raw_body, str) and raw_body and len(raw_body) <= 16_384:
        try:
            body = bounded(json.loads(raw_body))
        except (TypeError, ValueError, json.JSONDecodeError):
            body = hashlib.sha256(raw_body.encode("utf-8", errors="replace")).hexdigest()
    canonical = {"query": query, "body": body}
    if not query and body in (None, {}, []):
        return ""
    return hashlib.sha256(
        json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def _reader_bounded_api_evidence(value: Any) -> tuple[Any, bool]:
    """Keep arbitrary JSON response shapes while bounding and redacting them."""

    remaining_nodes = READER_MAX_API_EVIDENCE_NODES
    remaining_chars = READER_MAX_API_EVIDENCE_CHARS
    truncated = False
    omitted = object()

    def sensitive_key(key: object) -> bool:
        compact = re.sub(r"[^a-z0-9]", "", str(key).casefold())
        return any(marker in compact for marker in (
            "authorization", "cookie", "credential", "password", "secret", "token",
            "base64", "binary", "filecontent", "documentcontent", "pagehtml", "fullhtml",
        ))

    def visit(item: Any, depth: int = 0) -> Any:
        nonlocal remaining_nodes, remaining_chars, truncated
        if (
            remaining_nodes <= 0
            or remaining_chars <= 0
            or depth >= READER_MAX_API_EVIDENCE_DEPTH
        ):
            truncated = True
            return omitted
        remaining_nodes -= 1
        if isinstance(item, dict):
            result: dict[str, Any] = {}
            safe_items = [
                (key, child)
                for key, child in item.items()
                if not sensitive_key(key)
            ]
            if len(safe_items) > 60:
                truncated = True
            # Large record arrays must not consume the whole response budget
            # before sibling summary objects such as totals or dashboard cards.
            safe_items.sort(key=lambda pair: 2 if isinstance(pair[1], (list, tuple)) else 1 if isinstance(pair[1], dict) else 0)
            for key, child in safe_items[:60]:
                if sensitive_key(key):
                    continue
                safe_key = _sanitize_reader_text(key, max_chars=120)
                if safe_key:
                    bounded_child = visit(child, depth + 1)
                    if bounded_child is not omitted:
                        result[safe_key] = bounded_child
            return result
        if isinstance(item, (list, tuple)):
            if len(item) > READER_MAX_OUTPUT_ITEMS:
                truncated = True
            result = []
            for child in list(item)[:READER_MAX_OUTPUT_ITEMS]:
                bounded_child = visit(child, depth + 1)
                if bounded_child is not omitted:
                    result.append(bounded_child)
            return result
        if item is None or isinstance(item, (bool, int, float)):
            return item
        original = str(item)
        text = _sanitize_reader_text(original, max_chars=min(1_000, remaining_chars))
        remaining_chars -= len(text)
        if len(original) > len(text):
            truncated = True
        return text

    evidence = visit(value)
    return ({} if evidence is omitted else evidence), truncated


def _reader_api_discovery_state(reader_health: dict[str, Any]) -> dict[str, Any]:
    state = reader_health.setdefault("apiDiscovery", {
        "trigger": "initial",
        "candidates": {},
        "requestKeys": {},
        "truncated": False,
        "selectableBusinessTruncated": False,
        "selectableSupportTruncated": False,
        "actionBaselineKeys": set(),
        "requestVariants": {},
        "variantTruncatedKeys": set(),
        "deltaCandidateKeys": [],
        "deltaTruncated": False,
        "deltaSelectableBusinessTruncated": False,
        "deltaSelectableSupportTruncated": False,
    })
    defaults = {
        "trigger": "initial", "candidates": {}, "requestKeys": {}, "truncated": False,
        "selectableBusinessTruncated": False, "selectableSupportTruncated": False,
        "actionBaselineKeys": set(), "actionBaselineStatusClasses": {},
        "actionBaselineRequestVariants": {}, "actionBaselineVariantTruncatedKeys": set(),
        "requestVariants": {}, "variantTruncatedKeys": set(), "deltaCandidateKeys": [],
        "deltaTruncated": False, "deltaSelectableBusinessTruncated": False,
        "deltaSelectableSupportTruncated": False,
    }
    for key, value in defaults.items():
        state.setdefault(key, value)
    return state


def _reader_discovery_priority(candidate: dict[str, Any]) -> tuple[int, int]:
    policy_priority = {"blocked": 0, "bypassed": 2, "allowed": 2}.get(
        str(candidate.get("policyState") or "").casefold(), 0,
    )
    kind_priority = 1 if candidate.get("candidateKind") == "business" else 0
    return policy_priority, kind_priority


def _reader_mark_discovery_truncated(
    state: dict[str, Any], candidate: dict[str, Any], *, delta: bool,
) -> None:
    state["truncated"] = True
    if delta:
        state["deltaTruncated"] = True
    if candidate.get("policyState") not in {"allowed", "bypassed"}:
        return
    suffix = "BusinessTruncated" if candidate.get("candidateKind") == "business" else "SupportTruncated"
    state[f"selectable{suffix}"] = True
    if delta:
        state[f"deltaSelectable{suffix}"] = True


def _reader_record_api_candidate(
    reader_health: dict[str, Any],
    request_obj: Any,
    portal_origin: str,
    *,
    allowed: bool,
    policy_state: str,
) -> None:
    parsed = urlsplit(str(getattr(request_obj, "url", "") or ""))
    if f"{parsed.scheme}://{parsed.netloc}" != portal_origin or not parsed.path.startswith("/api/"):
        return
    method = str(getattr(request_obj, "method", "") or "").upper()
    if _reader_discovery_is_background(parsed.path, method):
        return
    path_template, catalog_entry = _reader_discovery_template(method, parsed.path)
    operation_key = f"{method} {path_template}"
    state = _reader_api_discovery_state(reader_health)
    candidates = state["candidates"]
    trigger = str(state.get("trigger") or "initial")[:120]
    request_variant = _reader_request_variant(request_obj)
    candidate = candidates.get(operation_key)
    if candidate is None:
        candidate = {
            "operationKey": operation_key,
            "method": method,
            "path": path_template,
            "pathTemplate": path_template,
            "status": None,
            "policyState": policy_state,
            "candidateKind": _reader_discovery_candidate_kind(path_template, catalog_entry),
            "trigger": trigger,
            "triggers": [trigger],
        }
        baseline_keys = state.get("actionBaselineKeys")
        is_delta = trigger.casefold().startswith("action:") and operation_key not in (
            baseline_keys if isinstance(baseline_keys, set) else set()
        )
        if len(candidates) >= READER_MAX_API_CANDIDATES:
            lowest_key, lowest = min(candidates.items(), key=lambda item: _reader_discovery_priority(item[1]))
            if _reader_discovery_priority(candidate) <= _reader_discovery_priority(lowest):
                _reader_mark_discovery_truncated(state, candidate, delta=is_delta)
                return
            evicted_was_delta = lowest_key in state["deltaCandidateKeys"]
            _reader_mark_discovery_truncated(state, lowest, delta=evicted_was_delta)
            candidates.pop(lowest_key, None)
            if evicted_was_delta:
                state["deltaCandidateKeys"].remove(lowest_key)
            state["requestKeys"] = {
                request_id: key for request_id, key in state["requestKeys"].items() if key != lowest_key
            }
        if catalog_entry is not None:
            swagger = {
                key: catalog_entry[key]
                for key in (
                    "operationId", "summary", "description", "tags", "requestSchemas", "requestFields",
                    "responseSchemas", "responseFields", "classification",
                )
                if catalog_entry.get(key) not in (None, [], "")
            }
            if swagger:
                candidate["swagger"] = swagger
        candidates[operation_key] = candidate
        if is_delta:
            state["deltaCandidateKeys"].append(operation_key)
    else:
        candidate["trigger"] = trigger
        if trigger not in candidate["triggers"] and len(candidate["triggers"]) < READER_MAX_ACTIONS + 1:
            candidate["triggers"].append(trigger)
        baseline_variants = state.get("actionBaselineRequestVariants")
        baseline_truncated = state.get("actionBaselineVariantTruncatedKeys")
        if (
            trigger.casefold().startswith("action:")
            and request_variant
            and isinstance(baseline_variants, dict)
            and request_variant not in baseline_variants.get(operation_key, set())
        ):
            if isinstance(baseline_truncated, set) and operation_key in baseline_truncated:
                _reader_mark_discovery_truncated(state, candidate, delta=True)
            elif operation_key not in state["deltaCandidateKeys"]:
                state["deltaCandidateKeys"].append(operation_key)
    if candidate is not None and request_variant:
        variants = state["requestVariants"].setdefault(operation_key, set())
        if len(variants) < READER_MAX_REQUEST_VARIANTS_PER_OPERATION:
            variants.add(request_variant)
        elif request_variant not in variants:
            state["variantTruncatedKeys"].add(operation_key)
            _reader_mark_discovery_truncated(
                state, candidate, delta=trigger.casefold().startswith("action:"),
            )
    if allowed:
        state["requestKeys"][id(request_obj)] = operation_key


def _reader_api_discovery_response_seen(reader_health: dict[str, Any], request_obj: Any, status: int) -> str:
    state = _reader_api_discovery_state(reader_health)
    operation_key = state["requestKeys"].get(id(request_obj))
    candidate = state["candidates"].get(operation_key)
    if candidate is not None:
        bounded_status = max(0, min(int(status), 999))
        candidate["status"] = bounded_status
        baseline_statuses = state.get("actionBaselineStatusClasses")
        if (
            str(state.get("trigger") or "").casefold().startswith("action:")
            and isinstance(baseline_statuses, dict)
            and operation_key in baseline_statuses
            and baseline_statuses[operation_key] != ("healthy" if 200 <= bounded_status < 400 else "failed")
            and operation_key not in state["deltaCandidateKeys"]
        ):
            state["deltaCandidateKeys"].append(operation_key)
    return str(operation_key or "")


async def _reader_capture_api_response_evidence(
    reader_health: dict[str, Any], response: Any, operation_key: str,
) -> None:
    """Attach the already received JSON response to its observed operation."""

    try:
        headers = getattr(response, "headers", {}) or {}
        content_type = str(headers.get("content-type") or "").casefold()
        content_length = str(headers.get("content-length") or "").strip()
        if "json" not in content_type:
            return
        if content_length.isdigit() and int(content_length) > READER_MAX_API_EVIDENCE_BYTES:
            return
        body = await response.body()
        if len(body) > READER_MAX_API_EVIDENCE_BYTES:
            return
        payload = json.loads(body)
        evidence, truncated = _reader_bounded_api_evidence(payload)
    except Exception:
        return
    state = _reader_api_discovery_state(reader_health)
    candidate = state["candidates"].get(operation_key)
    if candidate is None or candidate.get("policyState") not in {"allowed", "bypassed"}:
        return
    candidate["responseEvidence"] = evidence
    candidate["responseEvidenceTruncated"] = truncated


async def _reader_wait_for_api_response_evidence(page: Page) -> None:
    health = getattr(page, "_reader_health", None)
    if not isinstance(health, dict):
        return
    tasks = tuple(health.get("responseCaptureTasks") or ())
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


def _reader_set_api_discovery_trigger(page: Page, trigger: str) -> None:
    health = getattr(page, "_reader_health", None)
    if isinstance(health, dict):
        state = _reader_api_discovery_state(health)
        bounded_trigger = trigger[:120]
        state["trigger"] = bounded_trigger
        if bounded_trigger.casefold().startswith("action:"):
            state["actionBaselineKeys"] = set(state["candidates"])
            state["actionBaselineStatusClasses"] = {
                key: "healthy" if isinstance(candidate.get("status"), int) and 200 <= candidate["status"] < 400 else "failed"
                for key, candidate in state["candidates"].items()
            }
            state["actionBaselineRequestVariants"] = {
                key: set(variants) for key, variants in state["requestVariants"].items()
            }
            state["actionBaselineVariantTruncatedKeys"] = set(state["variantTruncatedKeys"])
            state["deltaCandidateKeys"] = []
            state["deltaTruncated"] = False
            state["deltaSelectableBusinessTruncated"] = False
            state["deltaSelectableSupportTruncated"] = False


def _reader_api_discovery_snapshot(page: Page) -> dict[str, Any]:
    health = getattr(page, "_reader_health", None)
    if not isinstance(health, dict):
        return {
            "candidates": [], "candidateCount": 0, "truncated": False,
            "selectableBusinessTruncated": False, "selectableSupportTruncated": False,
            "deltaCandidates": [], "deltaCandidateCount": 0, "deltaTruncated": False,
            "deltaSelectableBusinessTruncated": False, "deltaSelectableSupportTruncated": False,
        }
    state = _reader_api_discovery_state(health)
    candidates = list(state["candidates"].values())
    delta_candidates = [
        state["candidates"][key]
        for key in state["deltaCandidateKeys"]
        if key in state["candidates"]
    ]
    return {
        "candidates": candidates,
        "candidateCount": len(candidates),
        "truncated": bool(state["truncated"]),
        "selectableBusinessTruncated": bool(state["selectableBusinessTruncated"]),
        "selectableSupportTruncated": bool(state["selectableSupportTruncated"]),
        "deltaCandidates": delta_candidates,
        "deltaCandidateCount": len(delta_candidates),
        "deltaTruncated": bool(state["deltaTruncated"]),
        "deltaSelectableBusinessTruncated": bool(state["deltaSelectableBusinessTruncated"]),
        "deltaSelectableSupportTruncated": bool(state["deltaSelectableSupportTruncated"]),
    }


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
    if destination is not None and (urlsplit(destination).query or urlsplit(destination).fragment):
        raise HTTPException(status_code=422, detail={"code": "reader_detail_destination_query_forbidden"})
    if destination is not None and _reader_same_route(start_path, destination):
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
    semantic_markers = ("[data-", "[aria-", "[role=", "[role\"", "input[placeholder=", ".field", ".value", ".row", ".cell", ".card", "[class*=")
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
        if action_type == "query" and (action.value is not None or action.values or action.parameters or action.filters):
            raise HTTPException(status_code=422, detail={"code": "reader_query_cannot_apply_filters"})
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
    exact_get_path_allowed = method == "GET" and parsed.path in READER_READ_ONLY_GET_PATHS
    if api_request and _reader_is_mutation_route(parsed.path) and not exact_get_path_allowed:
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


def _reader_api_configured_policy_allows(request: Any, portal_origin: str) -> bool:
    parsed = urlsplit(request.url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    method = request.method.upper()
    exact_get_path_allowed = method == "GET" and parsed.path in READER_READ_ONLY_GET_PATHS
    if (
        origin != portal_origin
        or not parsed.path.startswith("/api/")
        or parsed.path in READER_BLOCKED_EXACT_PATHS
        or (_reader_is_mutation_route(parsed.path) and not exact_get_path_allowed)
    ):
        return False
    get_path_allowed = _path_is_permitted(parsed.path, tuple(READER_READ_ONLY_GET_PATHS))
    return (
        (method == "GET" and get_path_allowed)
        or (method == "POST" and parsed.path in READER_READ_ONLY_POST_PATHS)
        or (method == "OPTIONS" and (get_path_allowed or parsed.path in READER_READ_ONLY_POST_PATHS))
    )


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
        configured_allowed = _reader_api_configured_policy_allows(route.request, portal_origin)
        policy_state = "blocked" if not allowed else "allowed" if configured_allowed else "bypassed"
        _reader_record_api_candidate(
            reader_health, route.request, portal_origin, allowed=allowed, policy_state=policy_state,
        )
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
    try:
        root = await _reader_tab_scope(page, action)
    except RuntimeError as exc:
        if str(exc) != "reader_selector_not_found" or not action.section:
            raise
        # A section emitted by the planner is only a hint. If it does not map
        # to a semantic DOM scope, a unique page-level tab remains safe to use.
        root = page
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
    target = _semantic_locator(page, action, prefer_overlay=(
        action_type in {"apply_filter", "reset_filter"} and await _visible_overlay_count(page) > 0
    ))
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
    await locator.click(timeout=READER_ACTION_TIMEOUT_MS)
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
    root = _visible_overlay(page) if prefer_overlay or action_type == "dismiss_overlay" else page
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
    overlay_open = await _visible_overlay_count(page) > 0
    async def visible_targets(candidate: Any) -> list[Any]:
        return [candidate.nth(index) for index in range(await candidate.count())
                if await candidate.nth(index).is_visible()]
    root = _visible_overlay(page) if overlay_open else page
    if action.field and action.section and not action.selector:
        regions = await visible_targets(root.get_by_role("region", name=action.section, exact=True))
        if len(regions) != 1:
            raise RuntimeError("reader_filter_scope_not_unique")
        root = regions[0]
        target = root.get_by_label(action.field, exact=True)
    else:
        target = _semantic_locator(page, action, prefer_overlay=overlay_open)
    matches = await visible_targets(target)
    if not matches and action.field and not action.selector:
        matches = await visible_targets(root.get_by_role("textbox", name=action.field, exact=True))
        if not matches:
            matches = await visible_targets(root.get_by_placeholder(action.field, exact=True))
    if not matches:
        raise RuntimeError("reader_selector_not_found")
    if len(matches) != 1:
        raise RuntimeError("reader_filter_control_not_unique")
    locator = matches[0]
    tag_name = str(await locator.evaluate("element => element.tagName.toLowerCase()") or "").casefold()
    role = str(await locator.get_attribute("role") or "").casefold()
    input_type = str(await locator.get_attribute("type") or "").casefold()
    if input_type == "password":
        raise RuntimeError("reader_sensitive_locator_forbidden")
    if input_type in {"file", "checkbox", "radio", "submit", "reset", "button", "hidden"}:
        raise RuntimeError("reader_filter_control_unsupported")
    values = action.values or ([action.value] if action.value is not None else [])
    value = str(values[0]) if values else ""
    if tag_name == "select":
        await locator.select_option(label=[str(item) for item in values], timeout=READER_ACTION_TIMEOUT_MS)
        return
    if role == "combobox":
        handle = await locator.element_handle()
        if handle is None:
            raise RuntimeError("reader_filter_control_not_unique")
        popup_id = await locator.get_attribute("aria-controls") or await locator.get_attribute("aria-owns")
        ant_root = locator.locator("xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ant-select ')][1]")
        is_ant = await ant_root.count() == 1
        for item in values:
            await handle.click(timeout=READER_ACTION_TIMEOUT_MS)
            # Ant's virtualized accessibility list may omit the desired option.
            # Restrict its rendered fallback to this control's own popup.
            root = page.locator(f'[id={json.dumps(popup_id)}]') if popup_id else page
            option = root.get_by_role("option", name=str(item), exact=True)
            if is_ant and popup_id:
                popup = root.locator("xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ant-select-dropdown ')][1]")
                option = popup.locator(".ant-select-item-option").filter(has_text=re.compile(r"^" + re.escape(str(item)) + r"$"))
            if await option.count() != 1 or not await option.is_visible():
                raise RuntimeError("reader_filter_option_not_found")
            await option.click(timeout=READER_ACTION_TIMEOUT_MS)
            selected = await handle.evaluate("""element => {
                const ant = element.closest('.ant-select');
                return ant ? Array.from(ant.querySelectorAll('.ant-select-selection-item')).map(x => x.getAttribute('title') || x.textContent.trim())
                    : [element.value || element.textContent.trim()];
            }""")
            if not isinstance(selected, list) or str(item) not in selected:
                raise RuntimeError("reader_filter_value_not_confirmed")
        return
    if len(values) != 1:
        raise RuntimeError("reader_filter_control_not_multiselect")
    if tag_name not in {"input", "textarea"}:
        raise RuntimeError("reader_filter_control_unsupported")
    await locator.fill(value, timeout=READER_ACTION_TIMEOUT_MS)


async def _observe_filter_surface(page: Page, limit: int) -> dict[str, Any]:
    raw = await page.evaluate("""limit => {
        const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
        const text = el => (el?.innerText || el?.textContent || '').trim();
        const controls = [];
        for (const el of document.querySelectorAll('select,[role="combobox"],input[placeholder]')) {
            const ant = el.closest('.ant-select');
            if (!visible(ant || el) || el.type === 'password' || el.closest('nav,aside')) continue;
            const filterRoot = el.closest('[role="search"],[class*="filter"],[class*="Filter"]');
            const filterSurface = !!filterRoot;
            const commands = filterRoot ? Array.from(filterRoot.querySelectorAll('button,[role="button"]'))
                .filter(visible).map(button => button.getAttribute('aria-label') || text(button))
                .filter(name => /^(?:filter|apply|apply filters|reset|reset filters|clear|clear filters)$/i.test(name))
                .slice(0, 6) : [];
            const placeholder = el.getAttribute('placeholder') || text(ant?.querySelector('.ant-select-selection-placeholder'));
            const label = el.getAttribute('aria-label') || text(el.labels?.[0]) || placeholder || text(ant?.querySelector('.ant-select-selection-item'));
            if (!label || /page size/i.test(label)) continue;
            const selected = ant ? Array.from(ant.querySelectorAll('.ant-select-selection-item')).map(text)
                : el.tagName === 'SELECT' ? Array.from(el.selectedOptions).map(text) : [el.value].filter(Boolean);
            const selector = ant && placeholder
                ? '.ant-select:has(.ant-select-selection-placeholder:text-is(' + JSON.stringify(placeholder) + ')) [role="combobox"]'
                : el.id && el.getAttribute('role') ? '[id=' + JSON.stringify(el.id) + '][role=' + JSON.stringify(el.getAttribute('role')) + ']'
                : el.getAttribute('placeholder') ? 'input[placeholder=' + JSON.stringify(placeholder) + ']'
                : '';
            controls.push({label, role:el.getAttribute('role') || (el.tagName === 'SELECT' ? 'combobox' : 'textbox'),
                selector, selected, filterSurface, commands, options:el.tagName === 'SELECT' ? Array.from(el.options).slice(0,20).map(text) : []});
            if (controls.length >= limit) break;
        }
        // Bind only local label/value siblings, never adjacent flattened page text.
        const metrics = [];
        for (const el of document.querySelectorAll('div,span,dd')) {
            if (el.children.length || !visible(el) || !/^\\d[\\d,.]*$/.test(text(el))) continue;
            const parent = el.parentElement;
            if (!parent || parent.children.length !== 2 || parent.closest('table,[role="grid"],nav,aside,button,[role="tab"],.ant-pagination')) continue;
            const other = Array.from(parent.children).find(x => x !== el);
            const label = text(other);
            if (!visible(other) || !label || label.length > 120 || /^\\d[\\d,.]*$/.test(label) || other.querySelector('input,button,a,select')) continue;
            metrics.push({label, value:text(el)});
            if (metrics.length >= limit) break;
        }
        return {filterControls:controls, metrics};
    }""", min(limit, 12))
    if not isinstance(raw, dict):
        return {"filterControls": [], "metrics": []}
    controls = []
    for item in raw.get("filterControls", [])[:12]:
        if not isinstance(item, dict) or _reader_contains_sensitive_locator(str(item.get("label") or "")):
            continue
        controls.append({key: value if key == "filterSurface" and isinstance(value, bool) else [_sanitize_reader_text(str(v), max_chars=120) for v in value[:20]]
                         if isinstance(value, list) else _sanitize_reader_text(str(value), max_chars=300)
                         for key, value in item.items() if key in {"label", "role", "selector", "selected", "options", "filterSurface", "commands"}})
    metrics = [{"label": _sanitize_reader_text(str(item.get("label") or ""), max_chars=120),
                "value": _sanitize_reader_text(str(item.get("value") or ""), max_chars=40)}
               for item in raw.get("metrics", [])[:12] if isinstance(item, dict)
               and not _reader_contains_sensitive_locator(str(item.get("label") or ""))]
    for control in controls[:4]:
        if control.get("role") != "combobox" or control.get("options") or not control.get("selector") or control.get("filterSurface") is not True:
            continue
        locator = page.locator(control["selector"])
        if await locator.count() != 1:
            continue
        ant = locator.locator("xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ant-select ')][1]")
        if await ant.count() != 1:
            continue
        handle = await locator.element_handle()
        popup_id = await locator.get_attribute("aria-controls") or await locator.get_attribute("aria-owns")
        if handle is None or not popup_id:
            continue
        try:
            # Inspect bounded enumerated choices without selecting or changing a value.
            await handle.click(timeout=1_000)
            popup = page.locator(f'[id={json.dumps(popup_id)}]').locator(
                "xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ant-select-dropdown ')][1]"
            )
            options = popup.locator(".ant-select-item-option:visible")
            await options.first.wait_for(state="visible", timeout=1_000)
            control["options"] = [
                _sanitize_reader_text(await options.nth(index).inner_text(), max_chars=120)
                for index in range(min(await options.count(), 20))
            ]
        except Exception:
            control["options"] = []
        finally:
            await handle.press("Escape", timeout=1_000)
    return {"filterControls": controls, "metrics": metrics}


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
        page.url == before_url
        or (destination is not None and not _reader_same_route(page.url, destination))
    ):
        raise RuntimeError("reader_detail_destination_mismatch")
    if not await _detail_identity_is_visible(page, identity, overlay_open=False):
        raise RuntimeError("reader_detail_identity_mismatch")


async def _settle_reader_requests(page: Page, timeout_seconds: float = 8.0) -> None:
    """Wait through delayed SPA requests and a short stable response window."""
    if not hasattr(page, "_reader_health"):
        return
    clock = asyncio.get_running_loop().time
    deadline = clock() + timeout_seconds
    quiet_since = clock()
    while True:
        health = getattr(page, "_reader_health", {}) or {}
        pending = health.get("pending", {})
        paths = pending.values() if isinstance(pending, dict) else pending
        if any(path not in READER_BLOCKED_EXACT_PATHS for path in paths):
            quiet_since = clock()
        elif clock() - quiet_since >= 0.5:
            return
        remaining = deadline - clock()
        if remaining <= 0:
            return
        await asyncio.sleep(min(0.1, remaining))


async def _settle_page(page: Page) -> None:
    try:
        await page.wait_for_function(
            "document.readyState === 'interactive' || document.readyState === 'complete'",
            timeout=READER_ACTION_TIMEOUT_MS,
        )
    except Exception:
        # A SPA can briefly miss this readiness poll even though semantic DOM
        # content is available. The later bounded checks determine usability.
        pass
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
    await _settle_reader_requests(page)


READER_TABLE_SNAPSHOT_SCRIPT = """element => {
    const visible = node => !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const cell = node => ({text: (node.innerText || '').slice(0, 1000), visible: visible(node),
        colSpan: Number(node.getAttribute('colspan') || 1), rowSpan: Number(node.getAttribute('rowspan') || 1)});
    const tag = element.tagName.toLowerCase();
    const selector = tag === 'table'
        ? "tbody > tr:has(> td):not(.ant-table-placeholder):not([class*='skeleton']):not(:has([class*='skeleton']))"
        : "[role='row']:has([role='cell'],[role='gridcell']):not([class*='skeleton']):not(:has([class*='skeleton']))";
    return {format: 'reader_table_v1', tag,
        headers: Array.from(element.querySelectorAll("thead th,[role='columnheader']")).slice(0, 51).map(cell),
        headerRows: Array.from(element.tHead?.rows || []).slice(0, 7).map(row => Array.from(row.cells).slice(0, 51).map(cell)),
        rows: Array.from(element.querySelectorAll(selector)).filter(visible).slice(0, 8).map(row => ({
            text: (row.innerText || '').slice(0, 4000),
            cells: Array.from(row.querySelectorAll(":scope > td,:scope > [role='cell'],:scope > [role='gridcell']")).slice(0, 51).map(cell)
        })),
        empty: Array.from(element.querySelectorAll(".ant-empty-description,[role='status'],.ant-table-placeholder"))
            .filter(visible).slice(0, 4).map(node => (node.innerText || '').slice(0, 200))
    };
}"""


def _reader_table_snapshot_values(snapshot: Any, row_limit: int):
    if not isinstance(snapshot, dict) or snapshot.get('format') != 'reader_table_v1':
        return None
    headers = snapshot['headers']
    names = [_sanitize_reader_text(cell['text'], max_chars=120) for cell in headers]

    def excluded(label):
        return any(re.sub(r'[^a-z]', '', part.casefold()) in {'action', 'actions', 'operation', 'operations'}
                   or _reader_contains_sensitive_locator(part) or 'secret' in _reader_words(part)
                   for part in label.split(' / '))

    excluded_indexes = {i for i, name in enumerate(names) if excluded(name) or not name}
    seen = [name.casefold() for i, name in enumerate(names) if i not in excluded_indexes]
    safe = (0 < len(headers) <= 50 and len(seen) == len(set(seen))
            and all(cell['visible'] and cell['colSpan'] == 1 and cell['rowSpan'] == 1
                    for i, cell in enumerate(headers) if i not in excluded_indexes))
    if not safe and snapshot['tag'] == 'table':
        leaves = _reader_leaf_headers(snapshot['headerRows'])
        if leaves is not None:
            names, safe = leaves, True
            excluded_indexes = {i for i, name in enumerate(names) if excluded(name)}
    header_values = list(dict.fromkeys(name for i, name in enumerate(names)
                                      if i not in excluded_indexes and (safe or headers[i]['visible'])))
    rows, fields = [], []
    for row in snapshot['rows']:
        cells = row['cells']
        value = _sanitize_reader_text(
            ' '.join(cell['text'] for i, cell in enumerate(cells)
                     if i not in excluded_indexes and cell['visible'])
            if excluded_indexes else row['text'], max_chars=400,
        )
        normalized = value.casefold()
        if (not value or any(marker in normalized for marker in
                ('no data', 'no records', 'no results', 'nothing found', '暂无数据', '暂无记录', '没有数据'))
                or normalized in {'loading', 'loading...', 'please wait', 'please wait...'}):
            continue
        if value in rows:
            continue
        rows.append(value)
        if (safe and len(cells) == len(names) and len(rows) <= 4
                and all(cell['visible'] and cell['colSpan'] == 1 and cell['rowSpan'] == 1
                        for i, cell in enumerate(cells) if i not in excluded_indexes)):
            fields.append({names[i]: _sanitize_reader_text(cell['text'], max_chars=300)
                           for i, cell in list(enumerate(cells))[:50] if i not in excluded_indexes
                           and sum(j not in excluded_indexes for j in range(i + 1)) <= 12})
        if len(rows) >= row_limit:
            break
    empty = next((_sanitize_reader_text(value, max_chars=200) for value in snapshot['empty']
                  if any(marker in value.casefold() for marker in
                      ('no data', 'no records', 'no results', 'nothing found', '暂无数据', '暂无记录', '没有数据'))), '')
    return header_values[:20], rows, fields, empty


READER_TABLE_HEADERS_SCRIPT = """element => Array.from(element.tHead?.rows || []).map(row =>
    Array.from(row.cells).map(cell => ({text: cell.innerText, colSpan: cell.colSpan, rowSpan: cell.rowSpan,
        visible: !!cell.getClientRects().length && getComputedStyle(cell).visibility !== 'hidden'})))"""


def _reader_leaf_headers(rows: Any) -> list[str] | None:
    """Resolve only complete rectangular HTML header grids, preserving parent labels."""
    if not isinstance(rows, list) or not 2 <= len(rows) <= 6:
        return None
    grid: dict[tuple[int, int], tuple[int, str]] = {}
    cell_id = 0
    for row_index, cells in enumerate(rows):
        if not isinstance(cells, list) or len(cells) > 50:
            return None
        column = 0
        for cell in cells:
            if not isinstance(cell, dict) or cell.get("visible") is not True:
                return None
            label = _sanitize_reader_text(cell.get("text"), max_chars=120)
            width, height = cell.get("colSpan"), cell.get("rowSpan")
            if (not label or type(width) is not int or type(height) is not int
                    or not 1 <= width <= 50 or not 1 <= height <= len(rows) - row_index):
                return None
            while (row_index, column) in grid:
                column += 1
            if column + width > 50:
                return None
            cell_id += 1
            for r in range(row_index, row_index + height):
                for c in range(column, column + width):
                    if (r, c) in grid:
                        return None
                    grid[r, c] = (cell_id, label)
            column += width
    if not grid:
        return None
    width = max(c for _, c in grid) + 1
    if len(grid) != len(rows) * width:
        return None
    headers = []
    for column in range(width):
        chain = []
        seen = set()
        for row_index in range(len(rows)):
            cell_id, label = grid[row_index, column]
            if cell_id not in seen:
                chain.append(label)
                seen.add(cell_id)
        headers.append(" / ".join(chain))
    if any(len(value) > 120 for value in headers) or len({value.casefold() for value in headers}) != len(headers):
        return None
    return headers


READER_TABLE_TAB_PATH_SCRIPT = """element => {
    const visible = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const labels = [];
    let panel = element.closest('[role="tabpanel"]');
    while (panel) {
        const id = panel.getAttribute('aria-labelledby') || '';
        const tab = !/\\s/.test(id) && document.getElementById(id);
        if (visible(tab) && tab.getAttribute('role') === 'tab' &&
            tab.getAttribute('aria-controls') === panel.id && tab.getAttribute('aria-selected') === 'true') {
            labels.push((tab.innerText || '').trim());
        }
        panel = panel.parentElement && panel.parentElement.closest('[role="tabpanel"]');
    }
    if (labels.length) return labels;
    // Some tab libraries render the table beside the tab bar, with no panels.
    // Bind only a unique table and one new tab group at each ancestor level.
    // Stop before combining independent sibling groups or multiple tables.
    const seen = new Set();
    for (let parent = element.parentElement; parent && !['BODY','HTML'].includes(parent.tagName); parent = parent.parentElement) {
        const tables = [...parent.querySelectorAll('table,[role="grid"]')].filter(visible);
        if (tables.length !== 1 || tables[0] !== element) break;
        const groups = [...parent.querySelectorAll('[role="tablist"]')].filter(visible);
        const added = groups.filter(g => !seen.has(g));
        if (added.length > 1) break;
        if (added.length === 1) {
            const group = added[0];
            const selected = [...group.querySelectorAll('[role="tab"][aria-selected="true"]')]
                .filter(t => visible(t) && t.closest('[role="tablist"]') === group);
            if (selected.length !== 1) break;
            labels.push((selected[0].innerText || '').trim());
            seen.add(group);
        }
        if (parent.matches('section,[role="region"]') || labels.length >= 4) break;
    }
    return labels;
}"""


READER_TABLE_PAGINATION_SCRIPT = """element => {
    const visible = node => !!(node && (node.offsetWidth || node.offsetHeight || node.getClientRects().length));
    const root = element.closest('.ant-table-wrapper') || element.closest('section,[role="region"]');
    if (!root || root.closest('[aria-busy="true"]') || root.querySelector('.ant-spin-spinning')) return [];
    const tables = Array.from(root.querySelectorAll('table,[role="grid"]')).filter(visible);
    if (tables.length !== 1 || tables[0] !== element) return [];
    const totals = Array.from(root.querySelectorAll('.ant-pagination-total-text')).filter(visible);
    if (totals.length !== 1) return [];
    return totals[0].innerText.split(/\\r?\\n/).map(text => text.trim())
        .filter(text => text && !/^[\\d\\s/.,-]+$/.test(text)).slice(0, 4);
}"""


READER_CARD_COLLECTION_SCRIPT = """() => {
    const visible = node => !!(node && node.getClientRects().length) &&
        !node.closest('[hidden],[aria-hidden="true"],[aria-busy="true"]') &&
        getComputedStyle(node).visibility !== 'hidden';
    const cardLike = node => Array.from(node.classList).some(name => /(?:^|-)card$/.test(name));
    const ignored = 'button,input,select,textarea,svg,img,script,style,nav,[role="button"],[role="tab"],' +
        '[hidden],[aria-hidden="true"],a[href^="mailto:"],a[href^="tel:"],' +
        '[class*="contact"],[class*="email"],[class*="phone"],[class*="mobile"],[class*="secret"],[class*="token"],[class*="password"]';
    const cards = Array.from(document.querySelectorAll('[class]')).filter(node =>
        cardLike(node) && visible(node) && !node.matches('.stat-card,[class*="skeleton"]') &&
        !node.querySelector('table,[role="grid"],[class*="skeleton"],.ant-spin-spinning') &&
        Array.from(node.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')).some(visible)
    );
    const leafCards = cards.filter(node => !cards.some(other => other !== node && node.contains(other)));
    const groups = new Map();
    for (const card of leafCards.slice(0, 40)) {
        const parent = card.parentElement;
        if (!groups.has(parent)) groups.set(parent, []);
        const values = groups.get(parent);
        if (values.length >= 4) continue;
        const fragments = [];
        const walk = node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim().replace(/\\s+/g, ' ');
                if (text && !/[^\\s@]+@[^\\s@]+\\.[^\\s@]+/.test(text)) fragments.push(text);
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || !visible(node) || node.matches(ignored)) return;
            for (const child of node.childNodes) walk(child);
        };
        walk(card);
        const text = fragments.join(' | ').slice(0, 300);
        if (text && !values.includes(text)) values.push(text);
    }
    return Array.from(groups).filter(([, values]) => values.length).slice(0, 2).map(([parent, values]) => {
        const region = parent.closest('section,[role="region"],[role="tabpanel"]');
        const label = region && region.getAttribute('aria-label');
        return {heading: label || '', cardSummaries: values};
    });
}"""


READER_LABELED_METRICS_SCRIPT = """() => {
    const visible = node => !!(node && node.getClientRects().length) &&
        !node.closest('[hidden],[aria-hidden="true"],[aria-busy="true"]') &&
        getComputedStyle(node).visibility !== 'hidden';
    const metrics = Array.from(document.querySelectorAll('[class$="-statistics-item"],[class$="-statistic-item"],[class$="__stat"],[data-stat]'));
    const groups = new Map();
    for (const metric of metrics.slice(0, 100)) {
        if (!visible(metric) || metric.closest('table,[role="grid"]') ||
            metric.querySelector('[class*="skeleton"],.ant-spin-spinning,button,input,select,textarea')) continue;
        const leaves = Array.from(metric.querySelectorAll('*')).filter(node =>
            !node.children.length && visible(node) && !node.matches('svg,svg *,img,script,style'));
        const parts = leaves.map(node => node.innerText?.trim()).filter(Boolean);
        if (parts.length !== 2) continue;
        const numeric = parts.map(value => /^[+-]?\\d[\\d,.]*(?:%|[kmbKMB])?$/.test(value));
        if (numeric.filter(Boolean).length !== 1) continue;
        const value = parts[numeric.indexOf(true)], label = parts[numeric.indexOf(false)];
        if (label.length > 100 || /@|password|token|secret/i.test(label)) continue;
        const parent = metric.parentElement;
        if (!visible(parent) || parent.querySelector('.ant-spin-spinning,[class*="skeleton"]')) continue;
        if (!groups.has(parent)) groups.set(parent, []);
        const summaries = groups.get(parent);
        const text = label + ' ' + value;
        if (summaries.length < 12 && !summaries.includes(text)) summaries.push(text);
    }
    return Array.from(groups).slice(0, 2).map(([parent, summaries]) => {
        const region = parent.closest('section,[role="region"],[role="tabpanel"]');
        return {heading: region?.getAttribute('aria-label') || '', summaries};
    });
}"""


async def _observe_semantics(page: Page, limit: int) -> dict[str, Any]:
    stamp_script = """() => {
        const text = Array.from(document.querySelectorAll('table,[role="grid"]')).slice(0,8)
            .map(el => el.innerText.slice(0,40000)).join('|');
        let hash = 2166136261;
        for (let i=0; i<text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
        return text.length + ':' + (hash >>> 0);
    }"""
    for _ in range(3):
        before = await page.evaluate(stamp_script, None)
        observation = await _observe_semantics_once(page, limit)
        after = await page.evaluate(stamp_script, None)
        if before == after:
            return observation
        await _settle_page(page)
    return {"readHealth": {"healthy": False, "pending": ["table_updated_during_observation"]},
            "sectionSummaries": [], "regionSummaries": [], "rowSummaries": []}


async def _observe_semantics_once(page: Page, limit: int) -> dict[str, Any]:
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
        # Capture cells and their headers in one DOM read while filters replace rows.
        snapshot = _reader_table_snapshot_values(await container.evaluate(READER_TABLE_SNAPSHOT_SCRIPT), row_limit)
        if snapshot is not None:
            return snapshot
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
            header_text = _sanitize_reader_text(await header.inner_text(), max_chars=120)
            compact_header = re.sub(r"[^a-z]", "", header_text.casefold())
            excluded = compact_header in {"action", "actions", "operation", "operations"} or _reader_contains_sensitive_locator(header_text) or "secret" in _reader_words(header_text)
            if excluded:
                excluded_column_indexes.add(header_index)
                structured_headers.append(header_text)
                continue
            if not await header.is_visible():
                structured_headers_safe = False
                structured_headers.append("")
                continue
            header_key = header_text.casefold()
            if (
                (header_text and header_key in seen_headers)
                or await has_complex_span(header)
            ):
                structured_headers_safe = False
            if header_text:
                seen_headers.add(header_key)
            structured_headers.append(header_text)
            compact_header = re.sub(r"[^a-z]", "", header_text.casefold())
            if (
                not header_text
                or compact_header in {"action", "actions", "operation", "operations"}
                or _reader_contains_sensitive_locator(header_text)
                or "secret" in _reader_words(header_text)
            ):
                excluded_column_indexes.add(header_index)
            elif header_text and header_text not in header_values:
                header_values.append(header_text)
        if tag_name == "table" and not structured_headers_safe:
            leaf_headers = _reader_leaf_headers(await container.evaluate(READER_TABLE_HEADERS_SCRIPT))
            if leaf_headers is not None:
                structured_headers = leaf_headers
                header_count = len(leaf_headers)
                excluded_column_indexes = {
                    index for index, label in enumerate(leaf_headers)
                    if any(re.sub(r"[^a-z]", "", part.casefold()) in {"action", "actions", "operation", "operations"}
                           or _reader_contains_sensitive_locator(part) or "secret" in _reader_words(part)
                           for part in label.split(" / "))
                }
                header_values = [label for index, label in enumerate(leaf_headers) if index not in excluded_column_indexes]
                structured_headers_safe = True
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
                    if cell_index in excluded_column_indexes:
                        continue
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
        if not empty_values:
            empty_values = await visible_texts(
                container.locator(".ant-table-placeholder"), max_each=2, max_chars=200,
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
        # A pagination total belongs only to its unique, settled table wrapper.
        pagination_texts = await container.evaluate(READER_TABLE_PAGINATION_SCRIPT)
        if isinstance(pagination_texts, list):
            section_summary["summaries"] = [
                _sanitize_reader_text(value, max_chars=200)
                for value in pagination_texts[:4] if isinstance(value, str) and value.strip()
            ]
        if isinstance(parent_index, int) and parent_index >= 0:
            section_summary["parentRef"] = f"observation-region-{parent_index + 1:03d}"
        section_summaries.append(section_summary)
        if len(section_summaries) >= 4:
            break

    active_tab_texts = await _reader_selected_tab_texts(page)
    tab_controls = []
    visible_tabs = page.locator("[role='tab']")
    for tab_index in range(await visible_tabs.count()):
        tab = visible_tabs.nth(tab_index)
        if not await tab.is_visible():
            continue
        name = _sanitize_reader_text(await tab.inner_text(), max_chars=200)
        if name:
            tab_controls.append({"name": name, "selected": bool((await _reader_tab_selection(tab)).get("selected"))})
        if len(tab_controls) >= 20:
            break
    for container_index, container in visible_containers:
        state = await container.evaluate(READER_TABLE_TAB_PATH_SCRIPT)
        if isinstance(state, str):
            state = [state]
        if isinstance(state, list):
            state = [_sanitize_reader_text(value, max_chars=200) for value in state[:4] if isinstance(value, str) and value.strip()]
        if isinstance(state, list) and state:
            for section_summary in section_summaries:
                if section_summary.get('nodeId') == f'observation-table-{container_index + 1:03d}':
                    section_summary['selectedState'] = state[0]
                    section_summary['selectedTabPath'] = list(reversed(state))
                    break
    visible_active_tab_count = len(active_tab_texts)
    active_tab_text = active_tab_texts[0] if active_tab_texts else ""
    metric_collections = await page.evaluate(READER_LABELED_METRICS_SCRIPT)
    for metric_index, collection in enumerate(metric_collections if isinstance(metric_collections, list) else []):
        if not isinstance(collection, dict) or not isinstance(collection.get("summaries"), list):
            continue
        summaries = [_sanitize_reader_text(value, max_chars=200) for value in collection["summaries"][:min(limit, 12)]
                     if isinstance(value, str) and value.strip()]
        if not summaries:
            continue
        heading = _sanitize_reader_text(collection.get("heading"), max_chars=200)
        if heading.casefold() in {"scrollable content", "content", "main"}:
            heading = ""
        if not heading and visible_active_tab_count == 1:
            heading = active_tab_text
        section_summaries.append({
            "nodeId": f"observation-metrics-{metric_index + 1:03d}", "kind": "metrics",
            "heading": heading, "sourceSection": heading, "summaries": summaries,
            "selectedState": active_tab_text if visible_active_tab_count == 1 else "",
        })
    card_collections = await page.evaluate(READER_CARD_COLLECTION_SCRIPT)
    for card_index, collection in enumerate(card_collections if isinstance(card_collections, list) else []):
        if not isinstance(collection, dict) or not isinstance(collection.get("cardSummaries"), list):
            continue
        cards = [_sanitize_reader_text(value, max_chars=300) for value in collection["cardSummaries"][:min(limit, 4)]
                 if isinstance(value, str) and value.strip()]
        if not cards:
            continue
        heading = _sanitize_reader_text(collection.get("heading"), max_chars=200)
        if heading.casefold() in {"scrollable content", "content", "main"}:
            heading = ""
        if not heading and visible_active_tab_count == 1:
            heading = active_tab_text
        section_summaries.append({
            "nodeId": f"observation-cards-{card_index + 1:03d}",
            "kind": "cards", "heading": heading, "sourceSection": heading,
            "cardSummaries": cards,
            "selectedState": active_tab_text if visible_active_tab_count == 1 else "",
        })
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

    filter_dialog_fields: list[str] = []
    filter_dialog_commands: list[str] = []
    if await _visible_overlay_count(page) == 1:
        overlay = _visible_overlay(page)
        heading = await visible_texts(overlay.locator('h1,h2,h3,[role="heading"],.ant-modal-title,.ant-drawer-title'), max_each=4, max_chars=120)
        if any(re.fullmatch(r'Filter|筛选', title, re.I) for title in heading):
            filter_dialog_fields = await visible_texts(
                overlay.locator('label,.filter-modal-item-label'), max_each=min(limit, 20), max_chars=120)
            filter_dialog_commands = await visible_texts(overlay.locator('button'), max_each=8, max_chars=120)
    return {
        **(await _observe_filter_surface(page, limit)),
        "filterDialogFields": filter_dialog_fields,
        "filterDialogCommands": filter_dialog_commands,
        "headings": await texts("h1,h2,h3,[role='heading']", max_each=min(limit, 12)),
        "labels": await texts("label", max_each=min(limit, 12)),
        "columnHeaders": await texts("th,[role='columnheader']", max_each=min(limit, 20), max_chars=120),
        "regions": await texts("[role='region'][aria-label],section[aria-label]", max_each=min(limit, 8)),
        "controls": await texts("[role='tab'],.ant-pagination button,.ant-pagination a,button,a[aria-label]", max_each=min(limit, 20)),
        "summaries": await visible_texts(
            page.locator(".stat-card:not([class*='skeleton']):not(:has([class*='skeleton']))"),
            max_each=min(limit, 12),
            max_chars=200,
            reject_error_states=True,
        ),
        "rowSummaries": first_rows,
        "sectionSummaries": section_summaries,
        "regionSummaries": region_summaries,
        "tabControls": tab_controls,
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
    permitted_navigation_paths: tuple[str, ...] = (),
) -> tuple[list[str], list[str], list[str], bool, dict[str, Any] | None]:
    facts: list[str] = []
    visited: list[str] = []
    observed_fields: list[str] = []
    confirmed_empty = False
    observation: dict[str, Any] | None = None
    pending_filters: dict[str, list[str]] = {}
    applied_filters: list[str] = []
    declared_paths = {request.start_path}
    declared_paths.update(
        path
        for action in request.actions
        for path in (action.path, action.url)
        if path
    )
    if any(
        _reader_is_cell_detail_without_button(action)
        and _reader_cell_detail_destination(action) is None
        for action in request.actions
    ):
        declared_paths.update(permitted_navigation_paths)

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
    for action_index, action in enumerate(request.actions, start=1):
        action_type = action.type.strip().casefold().replace("-", "_")
        _reader_set_api_discovery_trigger(page, f"action:{action_index}:{action_type}")
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
                pending_filters.clear()
                applied_filters.clear()
        elif action_type == "filter":
            await _set_filter_value(page, action)
            pending_filters[action.selector or action.field or action.name or action.label or "filter"] = [
                str(value) for value in (action.values or [action.value]) if value is not None
            ]
            applied_filters.clear()
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
            if action_type == "apply_filter":
                applied_filters = [value for values in pending_filters.values() for value in values]
            elif action_type in {"reset_filter", "switch_tab"} or page.url != before_url:
                pending_filters.clear()
                applied_filters.clear()
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
    if observation is None:
        observation = {}
    await _reader_wait_for_api_response_evidence(page)
    observation["appliedFilters"] = [_sanitize_reader_text(value, max_chars=120) for value in applied_filters[:12]]
    observation["apiDiscovery"] = _reader_api_discovery_snapshot(page)
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
                    viewport={"width": 1920, "height": 1080},
                    extra_http_headers={"Authorization": forwarded},
                    service_workers="block",
                )
                await context.add_init_script(_auth_init_script(raw_token))
                reader_health: dict[str, Any] = {
                    "blocked": [], "failed": {}, "pending": {}, "responses": {},
                    "responseCaptureTasks": set(),
                }

                async def route_handler(route: Route) -> None:
                    declared_path_values = (
                        {request.start_path}
                        | {path for action in request.actions for path in (action.path, action.url) if path}
                    )
                    if any(
                        _reader_is_cell_detail_without_button(action)
                        and _reader_cell_detail_destination(action) is None
                        for action in request.actions
                    ):
                        declared_path_values.update((*permission_context["pages"], *permission_context["subpages"]))
                    declared_paths = frozenset(declared_path_values)
                    await _guard_reader_request(route, portal_origin, declared_paths, reader_health=reader_health)

                await context.route("**/*", route_handler)
                page = await context.new_page()
                setattr(page, "_reader_health", reader_health)
                def request_finished(request_obj: Any) -> None:
                    request_id = id(request_obj)
                    request_path = reader_health["pending"].pop(request_id, "")
                    if request_path and int(reader_health["responses"].pop(request_id, 200)) < 400:
                        reader_health["failed"].pop(request_path, None)
                    _reader_api_discovery_state(reader_health)["requestKeys"].pop(request_id, None)
                def request_failed(request_obj: Any) -> None:
                    request_id = id(request_obj)
                    request_path = reader_health["pending"].pop(request_id, "")
                    _reader_api_discovery_state(reader_health)["requestKeys"].pop(request_id, None)
                    if request_path:
                        reader_health["failed"][request_path] = reader_health["failed"].get(request_path, 0) + 1
                def response_seen(response: Any) -> None:
                    request_obj = getattr(response, "request", None)
                    request_id = id(request_obj) if request_obj is not None else None
                    request_path = urlsplit(getattr(response, "url", "")).path
                    if request_id is not None:
                        reader_health["responses"][request_id] = int(getattr(response, "status", 200))
                        operation_key = _reader_api_discovery_response_seen(
                            reader_health, request_obj, int(getattr(response, "status", 200)),
                        )
                        if operation_key and 200 <= int(getattr(response, "status", 200)) < 400:
                            task = asyncio.create_task(_reader_capture_api_response_evidence(
                                reader_health, response, operation_key,
                            ))
                            reader_health["responseCaptureTasks"].add(task)
                            task.add_done_callback(reader_health["responseCaptureTasks"].discard)
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
                return await _execute_reader_actions(
                    page,
                    request,
                    portal_origin,
                    (*permission_context["pages"], *permission_context["subpages"]),
                )
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
        target_not_confirmed = {
            "reader_selector_not_found", "reader_switch_tab_ambiguous",
            "reader_detail_cell_not_unique", "reader_detail_cell_not_visible",
            "reader_detail_cell_not_native", "reader_detail_cell_identity_mismatch",
            "reader_detail_row_not_visible", "reader_detail_row_unverifiable",
            "reader_detail_destination_mismatch", "reader_detail_identity_mismatch",
        }
        status = (
            "no_permission"
            if code in {"action_not_read_only", "page_not_permitted"}
            else "not_confirmed"
            if code in target_not_confirmed
            else "load_failed"
        )
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
