"""Run the Admin tool gateway over private, in-process MCP Streamable HTTP."""

import asyncio
import json
import logging
import os
from contextlib import AsyncExitStack, asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

import httpx

from .principal import Principal
from .tool_gateway import SYSTEM_DEFAULT_TOOL_NAMES, ToolGateway


logger = logging.getLogger(__name__)
_MCP_URL = "http://127.0.0.1:18190/mcp"


@dataclass(frozen=True)
class _ToolScope:
    principal: Principal
    allowed_tools: list[str] | None


class _MCPHTTPClient(httpx.AsyncClient):
    async def send(self, request: httpx.Request, *args, **kwargs) -> httpx.Response:
        request.extensions["dsh_internal_mcp"] = True
        return await super().send(request, *args, **kwargs)


class MCPAdminToolGateway(ToolGateway):
    def __init__(self, gateway: ToolGateway):
        super().__init__(gateway.knowledge, gateway.platform)
        self._gateway = gateway
        self._scope: ContextVar[_ToolScope | None] = ContextVar("admin_mcp_scope", default=None)

    @asynccontextmanager
    async def connection(self):
        from mcp.server.fastmcp import FastMCP

        server = FastMCP("admin-dsh-tools", stateless_http=True, json_response=True)
        for name in sorted(SYSTEM_DEFAULT_TOOL_NAMES):
            server.add_tool(self._handler(name), name=name, description="Admin read-only tool.")
        internal_app = server.streamable_http_app()
        async with server.session_manager.run(), _MCPHTTPClient(
            transport=httpx.ASGITransport(app=internal_app, raise_app_exceptions=False),
            trust_env=False,
        ) as self._http:
            await asyncio.wait_for(self._check_tools(), timeout=5)
            yield self

    @asynccontextmanager
    async def _session(self):
        from mcp import ClientSession
        from mcp.client.streamable_http import streamable_http_client

        # Start the SDK tasks in this turn's context so identity and audit
        # receipts follow concurrent tool calls without entering JSON-RPC.
        async with streamable_http_client(_MCP_URL, http_client=self._http) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session

    async def _check_tools(self):
        async with self._session() as session:
            result = await session.list_tools()
        if {tool.name for tool in result.tools} != SYSTEM_DEFAULT_TOOL_NAMES:
            raise RuntimeError("Admin MCP capability mismatch")

    def _handler(self, name: str):
        async def execute(arguments: dict[str, Any]) -> dict[str, Any]:
            scope = self._scope.get()
            if scope is None:
                return {"ok": False, "code": "permission_denied", "toolName": name}
            return await self._gateway.invoke(
                scope.principal, name, arguments, allowed_tools=scope.allowed_tools
            )

        return execute

    async def invoke(
        self,
        principal: Principal,
        tool_name: str,
        arguments: dict[str, Any],
        *,
        allowed_tools: list[str] | None = None,
    ) -> dict[str, Any]:
        if allowed_tools is not None and tool_name not in allowed_tools:
            return {"ok": False, "code": "tool_not_allowed_for_skill", "toolName": tool_name}
        if tool_name not in SYSTEM_DEFAULT_TOOL_NAMES:
            return {"ok": False, "code": "tool_not_allowed_for_runtime", "toolName": tool_name}
        token = self._scope.set(_ToolScope(principal, allowed_tools))
        try:
            async with self._session() as session:
                result = await session.call_tool(tool_name, {"arguments": arguments})
            envelope = result.structuredContent
            if envelope is None and len(result.content) == 1 and result.content[0].type == "text":
                envelope = json.loads(result.content[0].text)
            if not result.isError and isinstance(envelope, dict) and isinstance(envelope.get("ok"), bool):
                return envelope
        except Exception as exc:
            logger.warning("Admin MCP call failed: tool=%s error=%s", tool_name, type(exc).__name__)
        finally:
            self._scope.reset(token)
        return {"ok": False, "code": "tool_unavailable", "toolName": tool_name}


@asynccontextmanager
async def admin_mcp_transport(service):
    """Enable the adapter only after a successful local MCP startup check."""
    if os.environ.get("DSH_ADMIN_MCP_ENABLED", "").strip().lower() not in {"1", "true"}:
        yield
        return

    original = service.tool_gateway
    async with AsyncExitStack() as stack:
        try:
            service.tool_gateway = await stack.enter_async_context(MCPAdminToolGateway(original).connection())
        except Exception as exc:
            logger.warning("Admin MCP startup check failed: %s", type(exc).__name__)
        try:
            yield
        finally:
            service.tool_gateway = original
