"""
UMC MCP Server — standalone MCP adapter for UMC tool execution.

Runs as an independent process. Receives tool calls from the DSH Runtime
via MCP protocol (HTTP), executes them against the UMC platform gateway,
and returns structured results.

The DSH Runtime communicates with this server through the MCPClient
adapter (mcp_server/client.py), which mirrors the existing ToolGateway
interface so no business logic changes are required upstream.

Transport: HTTP (streamable) at /mcp, default port 18190.

Environment:
    DSH_MCP_SERVER_HOST — bind host (default 127.0.0.1)
    DSH_MCP_SERVER_PORT — bind port (default 18190)
    DSH_LOCAL_ENV_FILE — path to .env.local (loads Settings for gateway URLs)
"""

import logging
import os
from typing import Annotated, Any

import httpx
from jsonschema import Draft202012Validator
from pydantic import Field

from app.knowledge import KnowledgeGatewayClient
from app.ocr import OCRGatewayClient
from app.platform import PlatformGatewayClient
from .settings import get_mcp_settings

logger = logging.getLogger("umc-mcp-server")


def _make_clients():
    """Create gateway clients from MCP server settings."""
    settings = get_mcp_settings()
    return (
        PlatformGatewayClient(settings),
        KnowledgeGatewayClient(settings),
        OCRGatewayClient(settings),
    )


# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "umc.profile.summary",
        "title": "Read my profile status",
        "description": (
            "Read-only details for the Profile currently selected in the live UMC "
            "portal session. The server derives the selected Profile from the UMC "
            "token; callers cannot supply another user or Profile ID."
        ),
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "umc.services.eligible",
        "title": "List all services available to my Profile",
        "description": (
            "Read-only complete service catalog across all categories for the Profile "
            "selected in the live UMC portal session."
        ),
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "umc.media-licensing.eligible-services",
        "title": "List available Media Licensing services",
        "description": (
            "Read-only Media Licensing services available to the Profile selected in "
            "the live UMC portal session."
        ),
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "umc.applications",
        "title": "List my applications",
        "description": "Read-only list of applications belonging to the current UMC account.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pageIndex": {"type": "integer", "minimum": 1},
                "pageSize": {"type": "integer", "minimum": 1, "maximum": 100},
                "keyword": {"type": "string"},
                "startTime": {"type": "string"},
                "endTime": {"type": "string"},
                "applicationStatusId": {"type": ["string", "integer"]},
                "applicationTypeId": {"type": ["string", "integer"]},
                "sortBy": {"type": "string"},
                "sortDirection": {"type": "integer", "enum": [0, 1]},
            },
        },
    },
    {
        "name": "umc.application_detail",
        "title": "Get application detail",
        "description": "Read-only detail for a specific application ID.",
        "inputSchema": {
            "type": "object",
            "properties": {"applicationId": {"type": "integer"}},
            "required": ["applicationId"],
        },
    },
    {
        "name": "umc.licenses_permits_query",
        "title": "Query licenses and permits",
        "description": "Read-only query for issued licenses and permits.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pageIndex": {"type": "integer"},
                "pageSize": {"type": "integer"},
                "keyword": {"type": "string"},
                "type": {"type": "string"},
                "status": {"type": "string"},
            },
        },
    },
    {
        "name": "umc.licenses_statistics",
        "title": "Get license statistics",
        "description": "Read-only statistics for issued licenses.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "umc.licenses_action_needed",
        "title": "Get licenses requiring action",
        "description": "Read-only list of licenses that require customer action.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "umc.add_application",
        "title": "Create or update an application (test only)",
        "description": (
            "Controlled test-only application creation. Requires confirmed=true. "
            "Only type=3 (isTest=true) or type=2 (applicationId required) are allowed."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "parameters": {"type": "object"},
                "confirmed": {"type": "boolean"},
            },
            "required": ["parameters", "confirmed"],
        },
    },
    {
        "name": "umc.swagger_proxy",
        "title": "Execute a published UMC Swagger operation",
        "description": (
            "Execute any published customer Swagger operation through the gateway. "
            "Requires explicit method, path, and parameters."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "method": {"type": "string"},
                "path": {"type": "string"},
                "parameters": {"type": "object"},
            },
            "required": ["method", "path"],
        },
    },
    {
        "name": "knowledge.search",
        "title": "Search UMC knowledge",
        "description": "Read-only search over the configured UMC knowledge collection.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "folder_id": {"type": "string"},
                "top_k": {"type": "integer", "minimum": 1, "maximum": 100},
            },
            "required": ["query", "folder_id"],
        },
    },
    {
        "name": "knowledge.folders_tree",
        "title": "Get knowledge folder tree",
        "description": "Read-only folder structure for the knowledge base.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "knowledge.files",
        "title": "List knowledge files",
        "description": "Read-only list of files in the knowledge base.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "folder_id": {"type": ["string", "null"]},
                "recursive": {"type": "boolean"},
            },
        },
    },
    {
        "name": "knowledge.files_page",
        "title": "List knowledge files (paginated)",
        "description": "Read-only paginated list of files in the knowledge base.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "folder_id": {"type": ["string", "null"]},
                "recursive": {"type": "boolean"},
                "page": {"type": "integer", "minimum": 1},
                "page_size": {"type": "integer", "minimum": 1, "maximum": 100},
            },
        },
    },
    {
        "name": "ocr.layout_parsing",
        "title": "Parse an attached document",
        "description": "Read-only OCR and layout extraction for an attached PDF or image.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file": {"type": "string"},
                "fileType": {"type": ["integer", "null"]},
                "options": {"type": ["object", "null"]},
            },
            "required": ["file"],
        },
    },
]

# Map MCP tool names to PlatformGatewayClient method names
_PLATFORM_METHOD_MAP = {
    "umc.profile.summary": "profile_summary",
    "umc.services.eligible": "eligible_services",
    "umc.media-licensing.eligible-services": "media_licensing_eligible_services",
    "umc.applications": "applications_page",
    "umc.application_detail": "application_detail",
    "umc.licenses_permits_query": "licenses_permits_query",
    "umc.licenses_statistics": "licenses_statistics",
    "umc.licenses_action_needed": "licenses_action_needed",
    "umc.add_application": "add_application",
}


def _build_server():
    """Build and return the FastMCP instance with all tools registered."""
    from mcp.server.fastmcp import FastMCP

    host = os.environ.get("DSH_MCP_SERVER_HOST", "127.0.0.1")
    port = int(os.environ.get("DSH_MCP_SERVER_PORT", "18190"))

    mcp = FastMCP(
        name="umc-tools",
        stateless_http=True,
        json_response=True,
        host=host,
        port=port,
        instructions=(
            "UMC customer-portal tool execution via MCP. "
            "All tools are read-only unless explicitly marked as side-effecting. "
            "Authentication uses the UMC Bearer token from the request context."
        ),
    )

    from starlette.responses import JSONResponse

    @mcp.custom_route("/healthz", methods=["GET"])
    async def healthz(request):
        return JSONResponse({"status": "ok", "service": "umc-mcp"})

    for tool_def in TOOL_DEFINITIONS:
        _register_tool(mcp, tool_def, clients=_make_clients)

    return mcp


def _make_executor(name: str, platform, knowledge, ocr):
    """Select a gateway operation without changing its business payload."""
    if name == "umc.applications":
        async def executor(args: dict, _p=platform) -> Any:
            parameters = {key: value for key, value in args.items() if key not in {"umc_token", "request_id"}}
            return await _p.invoke_swagger_tool("POST", "/api/MyRequest/ApplicationPage", parameters,
                                                umc_token=args.get("umc_token"), request_id=args.get("request_id"))
    elif name == "umc.swagger_proxy":
        async def executor(args: dict, _p=platform) -> Any:
            return await _p.invoke_swagger_tool(
                args.get("method", ""),
                args.get("path", ""),
                args.get("parameters") or {},
                umc_token=args.get("umc_token"),
                request_id=args.get("request_id"),
            )
    elif name == "knowledge.search":
        async def executor(args: dict, _k=knowledge) -> Any:
            return await _k.search(
                args.get("query", ""),
                args.get("folder_id", ""),
                int(args.get("top_k", 32)),
                umc_token=args.get("umc_token"),
            )
    elif name == "knowledge.folders_tree":
        async def executor(args: dict, _k=knowledge) -> Any:
            return await _k.folders_tree(umc_token=args.get("umc_token"))
    elif name == "knowledge.files":
        async def executor(args: dict, _k=knowledge) -> Any:
            return await _k.files(
                args.get("folder_id"),
                bool(args.get("recursive", False)),
                umc_token=args.get("umc_token"),
            )
    elif name == "knowledge.files_page":
        async def executor(args: dict, _k=knowledge) -> Any:
            return await _k.files_page(
                args.get("folder_id"),
                bool(args.get("recursive", False)),
                int(args.get("page", 1)),
                int(args.get("page_size", args.get("pageSize", 20))),
                umc_token=args.get("umc_token"),
            )
    elif name == "ocr.layout_parsing":
        async def executor(args: dict, _o=ocr) -> Any:
            return await _o.layout_parsing(
                args.get("file", ""),
                file_type=args.get("fileType"),
                options=args.get("options"),
            )
    else:
        method_name = _PLATFORM_METHOD_MAP.get(name)
        if not method_name:
            logger.warning("No executor for tool %s", name)
            return
        gateway_method = getattr(platform, method_name)

        if name == "umc.add_application":
            async def executor(args: dict, _m=gateway_method) -> Any:
                parameters = args.get("parameters") or {}
                if args.get("confirmed") is not True:
                    raise ValueError("confirmation_required")
                if parameters.get("type") not in {2, 3} or (parameters.get("type") == 3 and parameters.get("isTest") is not True) or (parameters.get("type") == 2 and not parameters.get("applicationId")):
                    raise ValueError("invalid_draft_parameters")
                return await _m(parameters, umc_token=args.get("umc_token"), request_id=args.get("request_id"))
        else:
            async def executor(args: dict, _m=gateway_method) -> Any:
                # Normalise camelCase / snake_case parameter names to the
                # gateway client signatures so both DSH (camelCase) and
                # direct MCP callers work.
                normalised = dict(args)
                if name == "umc.licenses_permits_query":
                    request = {key: value for key, value in normalised.items() if key not in {"umc_token", "request_id"}}
                    return await _m(request, umc_token=args.get("umc_token"), request_id=args.get("request_id"))
                if "pageIndex" in normalised and "page_index" not in normalised:
                    normalised["page_index"] = normalised.pop("pageIndex")
                if "pageSize" in normalised and "page_size" not in normalised:
                    normalised["page_size"] = normalised.pop("pageSize")
                if "applicationId" in normalised and "application_id" not in normalised:
                    normalised["application_id"] = normalised.pop("applicationId")
                return await _m(**normalised)

    return executor


def _register_tool(mcp, tool_def: dict, platform=None, knowledge=None, ocr=None, *, clients=None) -> None:
    """Register a single tool on the FastMCP instance."""
    name = tool_def["name"]
    title = tool_def.get("title", name)
    description = tool_def.get("description", "")

    validator = Draft202012Validator(tool_def["inputSchema"])

    async def tool_fn(args: dict, umc_token: str | None = None, request_id: str | None = None) -> Any:
        if not validator.is_valid(args) or any(key in args for key in ("umc_token", "request_id")):
            return {"ok": False, "code": "invalid_arguments"}
        if name.startswith("umc.") and not umc_token:
            return {"ok": False, "code": "permission_denied", "status": 401}
        try:
            gateways = clients() if clients else (platform, knowledge, ocr)
            executor = _make_executor(name, *gateways)
            result = await executor({**args, "umc_token": umc_token, "request_id": request_id})
            return {"ok": True, "result": result}
        except httpx.HTTPStatusError as exc:
            return _upstream_error(exc)
        except ValueError:
            return {"ok": False, "code": "invalid_arguments"}
        except Exception as exc:
            logger.warning("Tool failed tool=%s error_type=%s", name, type(exc).__name__)
            return {"ok": False, "code": "tool_unavailable"}

    # Publish the business schema under the same envelope the client sends.
    tool_fn.__annotations__["args"] = Annotated[dict, Field(json_schema_extra=tool_def["inputSchema"])]
    mcp.tool(name=name, title=title, description=description)(tool_fn)


def _upstream_error(exc: httpx.HTTPStatusError) -> dict[str, Any]:
    status = exc.response.status_code
    result: dict[str, Any] = {"ok": False, "code": "permission_denied" if status in {401, 403} else "tool_error", "status": status}
    if status == 422:
        try:
            detail = exc.response.json().get("detail")
        except (ValueError, AttributeError):
            detail = None
        if isinstance(detail, dict) and detail.get("code") in {"profile_selection_required", "selected_profile_not_available"}:
            result.update(code=detail["code"], message=detail.get("message", ""))
    return result


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )
    host = os.environ.get("DSH_MCP_SERVER_HOST", "127.0.0.1")
    port = int(os.environ.get("DSH_MCP_SERVER_PORT", "18190"))
    server = _build_server()
    socket_path = os.environ.get("DSH_MCP_SOCKET")
    if socket_path:
        import uvicorn
        logger.info("Starting Customer MCP on its private Unix socket")
        uvicorn.run(server.streamable_http_app(), uds=socket_path, access_log=False)
    else:
        logger.info("Starting Customer MCP on %s:%d", host, port)
        server.run(transport="streamable-http")


if __name__ == "__main__":
    main()
