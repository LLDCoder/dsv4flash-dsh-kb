import asyncio
import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

import httpx

from app.admin_mcp import MCPAdminToolGateway, admin_mcp_transport
from app.portal_reader import _reader_reference_utc
from app.principal import Principal
from app.tool_gateway import ToolGateway
from app.turn_http_timing import http_stage, trace_http


class Knowledge:
    def __init__(self):
        self.base_url = "http://knowledge-gateway:8101"
        self.calls = []

    async def search(self, query, folder_id, top_k, *, umc_token=None, **options):
        reference = _reader_reference_utc.get()
        self.calls.append((query, umc_token, reference))

        async def take_request(request):
            await asyncio.sleep(0)
            return httpx.Response(200, json={"chunks": [{"text": query}]})

        async with httpx.AsyncClient(transport=httpx.MockTransport(take_request)) as client:
            response = await client.post(self.base_url + "/search")
        return response.json()


class Platform:
    portal_base_url = "https://umc.example.invalid"

    async def get_user_info(self, *, umc_token, request_id):
        return {"userId": umc_token, "requestId": request_id}

    async def admin_portal_read(self, payload, **identity):
        self.read_identity = identity
        if identity["umc_token"] == "denied":
            request = httpx.Request("POST", "http://platform-gateway:8102/admin/portal/read")
            response = httpx.Response(403, request=request)
            raise httpx.HTTPStatusError("denied", request=request, response=response)
        return {"actualPage": payload.get("startPath"), "observations": []}


def principal(name, token=None):
    return Principal(
        user_id=name, tenant_id="test", request_id="request-" + name,
        token_ref="audit-" + name, umc_token=token,
    )


class AdminMCPTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.knowledge = Knowledge()
        self.gateway = ToolGateway(self.knowledge, Platform())

    async def test_permissions_and_valid_tool_contract(self):
        adapter = MCPAdminToolGateway(self.gateway)
        current = principal("user-one", "authorized")
        denied = principal("user-two", "denied")
        request = {"startPath": "/inspection/tasks", "actions": [{"type": "observe"}]}
        async with adapter.connection():
            self.assertEqual(
                await adapter.get_user_info(current), await self.gateway.get_user_info(current)
            )
            self.assertEqual((await adapter.get_user_info(principal("guest")))["code"], "permission_denied")
            result = await adapter.invoke(current, "admin.portal.read", request)
            self.assertTrue(result["ok"])
            self.assertEqual(self.gateway.platform.read_identity["user_id"], current.user_id)
            self.assertEqual(self.gateway.platform.read_identity["request_id"], current.request_id)
            forbidden = await adapter.invoke(denied, "admin.portal.read", request)
            self.assertEqual((forbidden["code"], forbidden["status"]), ("permission_denied", 403))
            mutation = {"startPath": "/inspection/tasks", "actions": [{"type": "approve"}]}
            self.assertFalse((await adapter.invoke(current, "admin.portal.read", mutation))["ok"])
            restricted = await adapter.invoke(current, "admin.portal.read", request, allowed_tools=[])
            self.assertEqual(restricted["code"], "tool_not_allowed_for_skill")
            unknown = await adapter.invoke(current, "admin.portal.write", {})
            self.assertEqual(unknown["code"], "tool_not_allowed_for_runtime")
            async with adapter._session() as session:
                unscoped = await session.call_tool("admin.portal.read", {"arguments": request})
            self.assertEqual(unscoped.structuredContent["code"], "permission_denied")

    async def test_concurrent_identity_and_audit_with_live_gateway_config(self):
        adapter = MCPAdminToolGateway(self.gateway)
        settings = SimpleNamespace(
            llm_base_url="", umc_base_url="", platform_gateway_url="",
            knowledge_gateway_url="http://updated-knowledge:8101",
        )

        async def question(name, day):
            ref = datetime(2026, 11, day, tzinfo=timezone.utc)
            token = _reader_reference_utc.set(ref)
            try:
                with trace_http(settings) as receipts, http_stage("knowledge_search"):
                    result = await adapter.invoke(
                        principal(name, name), "knowledge.search", {"query": name, "folder_id": "sample"},
                    )
                self.assertEqual(result["result"]["chunks"][0]["text"], name)
                self.assertEqual(len(receipts), 1)
                self.assertEqual(receipts[0]["origin"], settings.knowledge_gateway_url)
                self.assertEqual(receipts[0]["stage"], "knowledge_search")
                self.assertEqual(receipts[0]["httpStatus"], 200)
                self.assertIn("durationMs", receipts[0])
            finally:
                _reader_reference_utc.reset(token)

        async with adapter.connection():
            adapter.knowledge.base_url = settings.knowledge_gateway_url
            self.assertIs(adapter.knowledge, self.gateway.knowledge)
            await asyncio.gather(question("first", 18), question("second", 19))
        self.assertEqual(
            {(query, token, ref.day) for query, token, ref in self.knowledge.calls},
            {("first", "first", 18), ("second", "second", 19)},
        )

    async def test_startup_switch_and_restore(self):
        service = SimpleNamespace(tool_gateway=self.gateway)
        with patch.dict(os.environ, {"DSH_ADMIN_MCP_ENABLED": "1"}):
            with patch.object(MCPAdminToolGateway, "_check_tools", side_effect=RuntimeError):
                async with admin_mcp_transport(service):
                    self.assertIs(service.tool_gateway, self.gateway)
            async with admin_mcp_transport(service):
                self.assertIsInstance(service.tool_gateway, MCPAdminToolGateway)
            self.assertIs(service.tool_gateway, self.gateway)
        with patch.dict(os.environ, {"DSH_ADMIN_MCP_ENABLED": "0"}):
            async with admin_mcp_transport(service):
                self.assertIs(service.tool_gateway, self.gateway)

    async def test_call_failure_does_not_run_direct_and_next_call_recovers(self):
        adapter = MCPAdminToolGateway(self.gateway)
        current = principal("user-one", "authorized")
        arguments = {"query": "sample", "folder_id": "folder"}

        async with adapter.connection():
            with patch.object(adapter, "_session", side_effect=httpx.ConnectError):
                failure = await adapter.invoke(current, "knowledge.search", arguments)
            self.assertEqual(failure["code"], "tool_unavailable")
            self.assertEqual(self.knowledge.calls, [])
            success = await adapter.invoke(current, "knowledge.search", arguments)
            self.assertTrue(success["ok"])
            self.assertEqual(len(self.knowledge.calls), 1)


if __name__ == "__main__":
    unittest.main()
