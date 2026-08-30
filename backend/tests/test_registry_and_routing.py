import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.skills import build_system_prompt, resolve_skill
from app.tool_registry import DEFAULT_BUSINESS_TOOL_DEFINITIONS, DEFAULT_TOOL_DEFINITIONS, SYSTEM_DEFAULT_TOOL_NAMES, build_legacy_tool_request, extract_operations, interface_key
from app.tool_gateway import ToolGateway
from app.principal import Principal
from app.skill_router import normalized_router_mode, recall_skill_candidates, route_context_from_history, valid_llm_route


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

    def test_legacy_skill_tools_are_covered_by_registry_replacements(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        old_tools = {
            "knowledge.search", "ocr.layout_parsing", "umc.add_application", "umc.appeal-reasons",
            "umc.application_detail", "umc.applications", "umc.book_by_isbn", "umc.collected-services",
            "umc.enquiries", "umc.enquiry-applications", "umc.enquiry-types", "umc.licenses", "umc.payments",
            "umc.pending-actions", "umc.pending-violations", "umc.service-categories",
        }
        registry_tools = {tool["tool_name"] for tool in DEFAULT_TOOL_DEFINITIONS}
        self.assertTrue(old_tools - registry_tools <= {"umc.licenses"})
        self.assertTrue({"umc.licenses.list", "umc.licenses.statistics", "umc.licenses.action_needed", "umc.licenses.detail"} <= registry_tools)
        self.assertEqual({"umc.licenses"} - registry_tools, {"umc.licenses"})

    def test_skill_guidance_is_business_scoped(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        for definition in DEFAULT_SKILL_DEFINITIONS:
            content = definition["content"]
            self.assertIn("WHEN TO USE:", content)
            self.assertIn("DO NOT USE WHEN:", content)
            self.assertIn("PREREQUISITES:", content)
            self.assertIn("RESPONSE RULES:", content)

    def test_download_compatibility_request_uses_detail_tool(self):
        request = build_legacy_tool_request(
            ["umc.licenses.list", "umc.licenses.detail"],
            "Download license 7364616",
        )
        self.assertEqual(request, ("umc.licenses.detail", {"id": "7364616"}))

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

    def test_skill_candidates_are_keyword_seeded_and_domain_bounded(self):
        catalog = [
            {"skillId": "license_permit_status", "domain": "licenses_permits", "aliases": ["license status"]},
            {"skillId": "license_renewal", "domain": "licenses_permits", "aliases": ["renew license"]},
            {"skillId": "application_status", "domain": "applications", "aliases": ["application status"]},
        ]
        candidates = recall_skill_candidates(
            "I need to renew my license",
            "license_renewal",
            catalog,
            {"activeDomain": "licenses_permits", "activeSkillId": "license_permit_status"},
        )
        self.assertEqual(candidates[0]["skillId"], "license_renewal")
        self.assertNotIn("application_status", [item["skillId"] for item in candidates])

    def test_route_context_is_bounded_and_tracks_active_skill(self):
        class Event:
            def __init__(self, event_type, content=None, skill_id=None):
                self.event_type = event_type
                self.event_json = {"content": content} if content is not None else {"skillId": skill_id}

        history = [Event("user.message", "first"), Event("skill.route", skill_id="license_permit_status")]
        context = route_context_from_history(history, [{"skillId": "license_permit_status", "domain": "licenses_permits"}])
        self.assertEqual(context["activeDomain"], "licenses_permits")
        self.assertEqual(context["activeSkillId"], "license_permit_status")
        self.assertEqual(context["recentMessages"][0]["content"], "first")

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

    def test_registry_execution_definition_contains_gateway_fields(self):
        definition = next(item for item in DEFAULT_BUSINESS_TOOL_DEFINITIONS if item["tool_name"] == "umc.licenses.statistics")
        execution_definition = {
            "name": definition["tool_name"],
            "description": definition["description"],
            "parameters": definition["parameters"],
            "sideEffect": definition.get("side_effect", "read"),
            "confirmationRequired": definition.get("confirmation_required", False),
            "operationId": definition["operation_id"],
            "httpMethod": definition["http_method"],
            "httpPath": definition["http_path"],
            "source": definition["source"],
        }
        self.assertEqual(execution_definition["httpMethod"], "GET")
        self.assertEqual(execution_definition["httpPath"], "/api/License/statistics")


if __name__ == "__main__":
    unittest.main()
