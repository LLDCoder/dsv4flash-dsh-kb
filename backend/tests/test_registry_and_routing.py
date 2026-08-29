import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.skills import build_system_prompt, resolve_skill
from app.tool_registry import DEFAULT_BUSINESS_TOOL_DEFINITIONS, DEFAULT_TOOL_DEFINITIONS, SYSTEM_DEFAULT_TOOL_NAMES, extract_operations, interface_key
from app.tool_gateway import ToolGateway
from app.principal import Principal
from app.skill_router import normalized_router_mode, valid_llm_route


class RegistryAndRoutingTests(unittest.TestCase):
    def test_license_intents_are_separate_from_application_status(self):
        self.assertEqual(resolve_skill("How many license do I have?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("What's my license status?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("Which licenses are expiring?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("Please show my application status").skill_id, "application_status")
        self.assertEqual(resolve_skill("How do I renew my license?").skill_id, "license_renewal")

    def test_existing_knowledge_and_tool_routes_remain_compatible(self):
        knowledge = resolve_skill("What documents are required for a filming permit?")
        self.assertEqual((knowledge.skill_id, knowledge.tool_name), ("license_application", "knowledge.search"))
        isbn = resolve_skill("look up this ISBN 9781302000011")
        self.assertEqual((isbn.skill_id, isbn.tool_name), ("umc_book_by_isbn", None))
        detail = resolve_skill("show application detail 3124")
        self.assertEqual((detail.skill_id, detail.tool_name), ("umc_application_detail", None))

    def test_swagger_operations_have_stable_dedup_key(self):
        document = {
            "paths": {
                "/api/License/{id}": {
                    "get": {
                        "operationId": "licenseDetail",
                        "summary": "License detail",
                        "parameters": [{"name": "id", "required": True, "schema": {"type": "integer"}}],
                    }
                }
            }
        }
        operation = extract_operations(document, "http://example.test/openapi.json")[0]
        self.assertEqual(operation["interfaceKey"], "GET /api/license/{id}")
        self.assertEqual(interface_key("get", "/api/License/{id}"), operation["interfaceKey"])
        self.assertEqual(operation["parameters"]["required"], ["id"])

    def test_swagger_server_host_is_not_persisted_as_customer_path(self):
        document = {
            "servers": [{"url": "https://untrusted.example/base"}],
            "paths": {"/api/License/statistics": {"get": {"operationId": "licenseStatistics"}}},
        }
        operation = extract_operations(document, "http://example.test/openapi.json")[0]
        self.assertEqual(operation["httpPath"], "/api/License/statistics")

    def test_every_published_skill_tool_has_a_registry_definition(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        skill_tools = {tool for skill in DEFAULT_SKILL_DEFINITIONS for tool in skill.get("allowed_tools", [])}
        registry_tools = {tool["tool_name"] for tool in DEFAULT_TOOL_DEFINITIONS}
        self.assertEqual(skill_tools - registry_tools, set())

    def test_knowledge_and_ocr_are_runtime_only_capabilities(self):
        business_tools = {item["tool_name"] for item in DEFAULT_BUSINESS_TOOL_DEFINITIONS}
        self.assertTrue(SYSTEM_DEFAULT_TOOL_NAMES.isdisjoint(business_tools))
        self.assertEqual(SYSTEM_DEFAULT_TOOL_NAMES, {"knowledge.search", "ocr.layout_parsing"})

    def test_skill_router_modes_and_validation(self):
        catalog = [{"skillId": "license_permit_status", "status": "PUBLISHED", "enabled": True}]
        self.assertEqual(normalized_router_mode("SHADOW"), "shadow")
        self.assertEqual(normalized_router_mode("invalid"), "keyword")
        self.assertEqual(valid_llm_route({"skillId": "license_permit_status", "confidence": 0.91}, catalog), (True, "ok"))
        self.assertEqual(valid_llm_route({"skillId": "license_permit_status", "confidence": 0.2}, catalog), (False, "low_confidence"))
        self.assertEqual(valid_llm_route({"skillId": "missing", "confidence": 0.91}, catalog), (False, "skill_not_published"))
        self.assertEqual(valid_llm_route({"skillId": "license_permit_status", "confidence": 0.91, "needsClarification": True}, catalog), (False, "needs_clarification"))

    def test_selected_tool_definitions_are_visible_to_model_prompt(self):
        prompt = build_system_prompt(
            resolve_skill("What's my license status?"),
            evidence_available=False,
            tool_definitions=[{"name": "umc.licenses.list", "description": "List issued records", "parameters": {"type": "object"}}],
        )
        self.assertIn("AVAILABLE TOOLS FOR THIS SKILL", prompt)
        self.assertIn("umc.licenses.list", prompt)

    def test_legacy_knowledge_and_new_license_tool_boundaries(self):
        class Knowledge:
            async def search(self, query, folder_id, top_k, *, umc_token=None):
                return {"query": query, "folder_id": folder_id, "top_k": top_k}

        class Platform:
            async def invoke_swagger_tool(self, method, path, parameters, *, umc_token=None):
                return {"method": method, "path": path, "parameters": parameters, "token": umc_token}

        principal = Principal(user_id="u1", tenant_id="t1", request_id="r1", token_ref="ref", umc_token="token")
        gateway = ToolGateway(None, Knowledge(), Platform())

        async def run():
            knowledge = await gateway.invoke(principal, "knowledge.search", {"query": "permit", "folder_id": "kb", "top_k": 5})
            licenses = await gateway.invoke(
                principal,
                "umc.licenses.statistics",
                {},
                allowed_tools=["umc.licenses.statistics"],
                tool_definition={
                    "name": "umc.licenses.statistics",
                    "source": "swagger",
                    "httpMethod": "GET",
                    "httpPath": "/api/License/statistics",
                    "parameters": {"type": "object", "properties": {}},
                },
            )
            return knowledge, licenses

        knowledge, licenses = __import__("asyncio").run(run())
        self.assertEqual(knowledge["result"]["folder_id"], "kb")
        self.assertEqual(licenses["result"]["path"], "/api/License/statistics")


if __name__ == "__main__":
    unittest.main()
