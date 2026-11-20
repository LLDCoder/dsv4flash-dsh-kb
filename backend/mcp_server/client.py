"""
MCP Client adapter for DSH Runtime.

Preserves the ToolGateway result envelope while all tool execution uses MCP.

Uses the official mcp Python SDK client (streamable HTTP transport).

Usage:
    from mcp_server.client import MCPToolClient

    client = MCPToolClient("http://127.0.0.1:18190")
    await client.connect()
    result = await client.call_tool("umc.profile.summary", {})
    await client.close()
"""

import asyncio
import json
import logging
import os
from contextlib import AsyncExitStack, asynccontextmanager
from typing import Any

import httpx

logger = logging.getLogger("umc-mcp-client")


class MCPToolClient:
    """Drop-in replacement for ToolGateway that routes calls through MCP."""

    def __init__(self, base_url: str = "http://127.0.0.1:18190", timeout: float = 30.0):
        self.base_url = base_url.rstrip("/") + "/mcp"
        self.timeout = timeout
        self._session = None
        self._stack = None

    async def connect(self) -> None:
        """Establish the MCP client session."""
        from mcp.client.streamable_http import streamable_http_client
        from mcp import ClientSession

        self._stack = AsyncExitStack()
        try:
            socket_path = os.environ.get("DSH_MCP_SOCKET")
            transport = httpx.AsyncHTTPTransport(uds=socket_path) if socket_path else None
            http = await self._stack.enter_async_context(httpx.AsyncClient(
                transport=transport, timeout=self.timeout, trust_env=False
            ))
            read, write, _ = await self._stack.enter_async_context(streamable_http_client(self.base_url, http_client=http))
            self._session = await self._stack.enter_async_context(ClientSession(read, write))
            await self._session.initialize()
        except BaseException:
            await self.close()
            raise

    async def close(self) -> None:
        try:
            if self._stack:
                await self._stack.aclose()
        finally:
            self._session = None
            self._stack = None

    @asynccontextmanager
    async def connection(self):
        await self.connect()
        try:
            yield self
        finally:
            await self.close()

    async def list_tools(self) -> list[dict[str, Any]]:
        """List all tools exposed by the MCP server."""
        if not self._session:
            raise ConnectionError("Not connected. Call connect() first.")
        result = await self._session.list_tools()
        return [
            {
                "name": t.name,
                "title": t.title or "",
                "description": t.description or "",
                "inputSchema": t.inputSchema or {},
            }
            for t in result.tools
        ]

    async def call_tool(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        *,
        umc_token: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        """Execute a tool call through MCP and return a ToolGateway-compatible result."""
        if not self._session:
            return {"ok": False, "code": "mcp_not_connected", "toolName": tool_name}
        # Identity comes only from the trusted caller, never from model arguments.
        business = {key: value for key, value in arguments.items() if key not in {"umc_token", "request_id"}}
        payload = {"args": business, "umc_token": umc_token, "request_id": request_id}
        try:
            result = await asyncio.wait_for(self._session.call_tool(tool_name, payload), timeout=self.timeout)
        except Exception as exc:
            logger.warning("MCP call failed tool=%s error_type=%s", tool_name, type(exc).__name__)
            return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": type(exc).__name__}
        return self._decode_result(tool_name, result)

    @staticmethod
    def _decode_result(tool_name: str, result: Any) -> dict[str, Any]:
        raw_text = "\n".join(block.text for block in result.content if hasattr(block, "text"))
        if result.isError is True:
            return {"ok": False, "code": "tool_error", "toolName": tool_name}
        try:
            parsed = json.loads(raw_text)
        except (json.JSONDecodeError, TypeError):
            return {"ok": False, "code": "invalid_tool_response", "toolName": tool_name}
        if not isinstance(parsed, dict) or not isinstance(parsed.get("ok"), bool):
            return {"ok": False, "code": "invalid_tool_response", "toolName": tool_name}
        return {"code": "ok" if parsed["ok"] else "tool_error", **parsed, "toolName": tool_name}
