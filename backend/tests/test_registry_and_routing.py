import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.skills import build_system_prompt, resolve_skill
from app.skill_workflow import build_configured_tool_request, mask_tool_result
from app.tool_registry import DEFAULT_BUSINESS_TOOL_DEFINITIONS, DEFAULT_TOOL_DEFINITIONS, SYSTEM_DEFAULT_TOOL_NAMES, build_legacy_tool_request, extract_operations, interface_key
from app.tool_gateway import ToolGateway
from app.principal import Principal
from app.skill_router import add_keyword_skill_candidate, configured_knowledge_fallback, normalized_router_mode, recall_skill_candidates, route_context_from_history, valid_llm_route


class RegistryAndRoutingTests(unittest.TestCase):
    def test_license_intents_are_separate_from_application_status(self):
        self.assertEqual(resolve_skill("How many license do I have?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("What's my license status?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("Which licenses are expiring?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("Please show my application status").skill_id, "application_status")
        self.assertEqual(resolve_skill("How do I renew my license?").skill_id, "license_renewal")
        self.assertEqual(resolve_skill("Do I have any applications waiting for payment?").skill_id, "application_payment")

    def test_read_only_customer_portal_routes(self):
        self.assertEqual(resolve_skill("Show my My Requests").skill_id, "application_status")
        self.assertEqual(resolve_skill("What pending actions do I have in My Requests?").skill_id, "my_requests_pending_actions")
        self.assertEqual(resolve_skill("Which licenses need action or renewal?").skill_id, "license_renewal")

    def test_application_payment_detail_is_read_only(self):
        definition = next(item for item in DEFAULT_TOOL_DEFINITIONS if item["tool_name"] == "umc.application_payment_detail")
        self.assertEqual(definition["http_method"], "GET")
        self.assertEqual(definition["http_path"], "/api/payment-center/service-applications/{applicationId}/payment")
        self.assertEqual(definition.get("side_effect", "read"), "read")
        self.assertFalse(definition.get("confirmation_required", False))
        self.assertEqual(
            build_legacy_tool_request(
                ["umc.applications", "umc.application_payment_detail"],
                "show payment details for application 4503",
            ),
            ("umc.application_payment_detail", {"applicationId": 4503}),
        )

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

    def test_license_download_is_portal_only(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        skill = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "permit_download")
        self.assertEqual(skill["allowed_tools"], [])
        self.assertEqual(build_configured_tool_request(skill["workflow"], skill["allowed_tools"], "Download license 7364616", []), None)

    def test_configured_workflow_selects_a_prior_list_item(self):
        class Event:
            event_type = "tool.result"
            event_json = {
                "toolName": "records.list",
                "result": {"data": {"items": [
                    {"displayId": "A-1", "detailId": "a"},
                    {"displayId": "B-2", "detailId": "b"},
                ]}},
            }

        workflow = {
            "selection": {
                "sourceTool": "records.list",
                "itemsPath": "data.items",
                "valueField": "detailId",
                "identifierFields": ["displayId"],
                "ordinalTerms": {"1": ["first"], "2": ["second"]},
                "detailRequest": {"when": {"anyTerms": ["detail"]}, "toolName": "records.detail", "argumentName": "id", "argumentValueType": "string"},
            },
        }
        self.assertEqual(
            build_configured_tool_request(workflow, ["records.detail"], "show the first detail", [Event()]),
            ("records.detail", {"id": "a"}),
        )
        self.assertEqual(
            build_configured_tool_request(workflow, ["records.detail"], "show detail B-2", [Event()]),
            ("records.detail", {"id": "b"}),
        )

    def test_tool_masking_policy_hides_configured_fields(self):
        evidence = {
            "result": json.dumps({
                "data": {
                    "publicName": "record",
                    "privateUrl": "https://example.test/signed.pdf",
                    "alternatePrivateUrl": "license/2026/record.pdf",
                    "accessSecret": "secret-code",
                },
            }),
        }
        hidden = mask_tool_result(evidence, "hide:privateUrl,alternatePrivateUrl,accessSecret")
        detail = json.loads(hidden["result"])["data"]
        self.assertEqual(detail["privateUrl"], "[redacted]")
        self.assertEqual(detail["alternatePrivateUrl"], "[redacted]")
        self.assertEqual(detail["accessSecret"], "[redacted]")

    def test_expired_status_rule_is_skill_configuration(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        skill = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "license_permit_status")
        request = build_configured_tool_request(
            skill["workflow"], skill["allowed_tools"], "Do I have expired license?", []
        )
        self.assertEqual(
            request,
            (
                "umc.licenses.list",
                {
                    "statuses": ["EXPIRED"],
                    "documentTypes": [],
                    "pageIndex": 1,
                    "pageSize": 100,
                    "sortBy": "expireDate",
                    "sortDirection": 1,
                },
            ),
        )
        renewal = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "license_renewal")
        renewal_request = build_configured_tool_request(renewal["workflow"], renewal["allowed_tools"], "Which licenses need renewal?", [])
        self.assertEqual(renewal_request, ("umc.licenses.action_needed", {}))

        list_event = type("Event", (), {
            "event_type": "tool.result",
            "event_json": {"toolName": "umc.licenses.list", "result": json.dumps({"data": {"items": [{"sourceLicenseId": 752}]}})},
        })()
        detail_request = build_configured_tool_request(
            skill["workflow"], skill["allowed_tools"], "show the first detail", [list_event]
        )
        self.assertEqual(detail_request, ("umc.licenses.detail", {"id": "752"}))

    def test_knowledge_and_ocr_are_runtime_only_capabilities(self):
        business_tools = {item["tool_name"] for item in DEFAULT_BUSINESS_TOOL_DEFINITIONS}
        self.assertTrue(SYSTEM_DEFAULT_TOOL_NAMES.isdisjoint(business_tools))
        self.assertEqual(SYSTEM_DEFAULT_TOOL_NAMES, {"knowledge.search", "ocr.layout_parsing"})

    def test_skill_router_modes_and_validation(self):
        catalog = [{"skillId": "license_permit_status", "status": "PUBLISHED", "enabled": True}]
        self.assertEqual(normalized_router_mode("SHADOW"), "shadow")
        self.assertEqual(normalized_router_mode("invalid"), "llm")
        self.assertEqual(valid_llm_route({"skillId": "license_permit_status", "confidence": 0.91}, catalog), (True, "ok"))
        self.assertEqual(valid_llm_route({"skillId": "license_permit_status", "confidence": 0.2}, catalog), (False, "low_confidence"))
        self.assertEqual(valid_llm_route({"skillId": "missing", "confidence": 0.91}, catalog), (False, "skill_not_published"))
        self.assertEqual(valid_llm_route({"skillId": "license_permit_status", "confidence": 0.91, "needsClarification": True}, catalog), (True, "needs_clarification"))

    def test_skill_candidates_use_the_highest_scoring_domain(self):
        catalog = [
            {"skillId": "license_permit_status", "domain": "licenses_permits", "aliases": ["license status"], "positiveExamples": []},
            {"skillId": "license_renewal", "domain": "licenses_permits", "aliases": ["renew license"], "positiveExamples": ["renew my permit"]},
            {"skillId": "application_status", "domain": "applications", "aliases": ["application status"], "positiveExamples": []},
        ]
        recall = recall_skill_candidates(
            "I need to renew my license",
            catalog,
            {"activeDomain": "licenses_permits", "activeSkillId": "license_permit_status"},
        )
        self.assertEqual(recall.domains, ["licenses_permits"])
        self.assertEqual([item["skillId"] for item in recall.candidates], ["license_permit_status", "license_renewal"])
        self.assertNotIn("application_status", [item["skillId"] for item in recall.candidates])

    def test_legacy_keyword_skill_is_added_as_a_published_candidate(self):
        catalog = [
            {"skillId": "general_knowledge", "domain": "general", "aliases": ["help"], "positiveExamples": []},
            {"skillId": "license_permit_status", "domain": "licenses_permits", "aliases": ["my license"], "positiveExamples": []},
        ]
        recall = recall_skill_candidates("Do I have expired license?", catalog)
        self.assertEqual(recall.candidates, [])
        merged = add_keyword_skill_candidate(recall, catalog, "license_permit_status")
        self.assertEqual([item["skillId"] for item in merged.candidates], ["license_permit_status"])
        self.assertEqual(merged.domains, ["licenses_permits"])

    def test_unmatched_question_has_no_domain_candidates(self):
        recall = recall_skill_candidates(
            "How do I register a new media outlet?",
            [{"skillId": "license_status", "domain": "licenses", "aliases": ["license status"], "positiveExamples": []}],
        )
        self.assertEqual(recall.domains, [])
        self.assertEqual(recall.candidates, [])

    def test_configured_knowledge_fallback_requires_bound_knowledge_tool(self):
        catalog = [
            {"skillId": "general_knowledge", "allowedTools": ["knowledge.search"]},
            {"skillId": "wrong_fallback", "allowedTools": ["umc.applications"]},
            {"skillId": "mixed_fallback", "allowedTools": ["knowledge.search", "umc.applications"]},
        ]
        self.assertEqual(configured_knowledge_fallback(catalog, "general_knowledge")["skillId"], "general_knowledge")
        self.assertIsNone(configured_knowledge_fallback(catalog, "wrong_fallback"))
        self.assertIsNone(configured_knowledge_fallback(catalog, "mixed_fallback"))

    def test_general_knowledge_is_a_builtin_knowledge_skill(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        skill = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "general_knowledge")
        self.assertEqual(skill["allowed_tools"], ["knowledge.search"])

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

    def test_route_context_keeps_four_prior_messages(self):
        class Event:
            def __init__(self, content):
                self.event_type = "user.message"
                self.event_json = {"content": content}

        history = [Event(str(index)) for index in range(7)]
        context = route_context_from_history(history, [])
        prior = context["recentMessages"][:-1]
        self.assertEqual([item["content"] for item in prior], ["2", "3", "4", "5"])

    def test_selected_tool_definitions_are_visible_to_model_prompt(self):
        prompt = build_system_prompt(
            resolve_skill("What's my license status?"),
            evidence_available=False,
            tool_definitions=[{"name": "umc.licenses.list", "description": "List issued records", "parameters": {"type": "object"}}],
        )
        self.assertIn("AVAILABLE TOOLS FOR THIS SKILL", prompt)
        self.assertIn("umc.licenses.list", prompt)
        self.assertIn("Never expose internal Tool names", prompt)

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
