"""Tests for the MCP server tool definitions and client adapter."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.fixture()
def mcp_tool_defs():
    """Import TOOL_DEFINITIONS lazily to avoid loading gateway clients."""
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "mcp_server"))
    from mcp_server.server import TOOL_DEFINITIONS
    return TOOL_DEFINITIONS


class TestToolDefinitions:
    def test_all_tools_have_required_fields(self, mcp_tool_defs):
        for tool in mcp_tool_defs:
            assert tool.get("name"), f"Tool missing name: {tool}"
            assert tool.get("description"), f"Tool {tool['name']} missing description"
            assert "inputSchema" in tool, f"Tool {tool['name']} missing inputSchema"
            schema = tool["inputSchema"]
            assert schema.get("type") == "object", f"Tool {tool['name']} inputSchema must be object"

    def test_tool_names_use_dotted_namespaces(self, mcp_tool_defs):
        for tool in mcp_tool_defs:
            name = tool["name"]
            assert "." in name, f"Tool name should use dotted namespace: {name}"
            prefix = name.split(".")[0]
            assert prefix in {"umc", "knowledge", "ocr"}, f"Unknown tool prefix: {prefix}"

    def test_expected_tools_present(self, mcp_tool_defs):
        names = {t["name"] for t in mcp_tool_defs}
        expected = {
            "umc.profile.summary",
            "umc.services.eligible",
            "umc.applications",
            "knowledge.search",
            "knowledge.folders_tree",
            "ocr.layout_parsing",
        }
        assert expected.issubset(names), f"Missing tools: {expected - names}"

    def test_readonly_tools_have_empty_or_strict_schema(self, mcp_tool_defs):
        """Identity-scoped tools must not accept arbitrary arguments."""
        identity_tools = {
            "umc.profile.summary",
            "umc.services.eligible",
            "umc.media-licensing.eligible-services",
        }
        for tool in mcp_tool_defs:
            if tool["name"] in identity_tools:
                schema = tool["inputSchema"]
                assert schema.get("additionalProperties") is False, (
                    f"{tool['name']} must reject extra arguments"
                )


class TestMCPToolClient:
    @pytest.mark.asyncio
    async def test_call_tool_parses_json_result(self):
        from mcp_server.client import MCPToolClient

        mock_session = AsyncMock()
        mock_block = MagicMock()
        mock_block.text = json.dumps({"ok": True, "result": {"data": "test"}})
        mock_result = MagicMock()
        mock_result.content = [mock_block]
        mock_session.call_tool = AsyncMock(return_value=mock_result)

        client = MCPToolClient()
        client._session = mock_session

        result = await client.call_tool("umc.profile.summary", {})
        assert result["ok"] is True
        assert result["toolName"] == "umc.profile.summary"
        assert result["result"] == {"data": "test"}

    @pytest.mark.asyncio
    async def test_call_tool_rejects_non_json(self):
        from mcp_server.client import MCPToolClient

        mock_session = AsyncMock()
        mock_block = MagicMock()
        mock_block.text = "plain text result"
        mock_result = MagicMock()
        mock_result.content = [mock_block]
        mock_session.call_tool = AsyncMock(return_value=mock_result)

        client = MCPToolClient()
        client._session = mock_session

        result = await client.call_tool("umc.swagger_proxy", {"method": "GET", "path": "/test"})
        assert result["ok"] is False
        assert result["code"] == "invalid_tool_response"

    @pytest.mark.asyncio
    async def test_call_tool_handles_error(self):
        from mcp_server.client import MCPToolClient

        mock_session = AsyncMock()
        mock_session.call_tool = AsyncMock(side_effect=ConnectionError("server down"))

        client = MCPToolClient()
        client._session = mock_session

        result = await client.call_tool("umc.profile.summary", {})
        assert result["ok"] is False
        assert result["code"] == "tool_unavailable"
        assert result["error"] == "ConnectionError"

    @pytest.mark.asyncio
    async def test_list_tools_formats_correctly(self):
        from mcp_server.client import MCPToolClient

        mock_tool = MagicMock()
        mock_tool.name = "umc.profile.summary"
        mock_tool.title = "Read profile"
        mock_tool.description = "Reads profile"
        mock_tool.inputSchema = {"type": "object", "properties": {}}

        mock_session = AsyncMock()
        mock_list = MagicMock()
        mock_list.tools = [mock_tool]
        mock_session.list_tools = AsyncMock(return_value=mock_list)

        client = MCPToolClient()
        client._session = mock_session

        tools = await client.list_tools()
        assert len(tools) == 1
        assert tools[0]["name"] == "umc.profile.summary"
        assert tools[0]["title"] == "Read profile"


class TestMCPSettings:
    def test_mcp_server_url_default(self):
        from app.config import Settings
        s = Settings()
        assert s.mcp_server_url == "http://127.0.0.1:18190"
