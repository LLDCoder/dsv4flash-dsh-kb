import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.skills import LEGACY_SKILL_ID_MIGRATIONS, build_system_prompt, canonical_skill_id, merged_skill_workflow, resolve_configured_skill, resolve_skill
from app.skill_workflow import build_configured_tool_request, mask_tool_result, matches_configured_selection_follow_up, normalize_route_directives, routing_contract
from app.tool_registry import DEFAULT_BUSINESS_TOOL_DEFINITIONS, DEFAULT_TOOL_DEFINITIONS, SYSTEM_DEFAULT_TOOL_NAMES, build_legacy_tool_request, extract_operations, interface_key
from app.tool_gateway import ToolGateway
from app.principal import Principal
from app.profile_scope import profile_context_from_payload, requires_profile_switch
from app.response_safety import is_internal_tool_protocol
from app.skill_router import add_keyword_skill_candidate, configured_knowledge_fallback, normalized_router_mode, recall_skill_candidates, route_context_from_history, valid_llm_route


class RegistryAndRoutingTests(unittest.TestCase):
    def test_license_intents_are_separate_from_application_status(self):
        self.assertEqual(resolve_skill("How many license do I have?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("What's my license status?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("How about my Social Media Advertiser Permit?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("Which licenses are expiring?").skill_id, "license_permit_status")
        self.assertEqual(resolve_skill("Please show my application status").skill_id, "application_status")
        self.assertEqual(resolve_skill("How do I renew my license?").skill_id, "license_renewal")
        self.assertEqual(resolve_skill("Can I modify my Media License?").skill_id, "license_permit_modification_knowledge")
        self.assertEqual(resolve_skill("Do I have any applications waiting for payment?").skill_id, "application_payment_details")
        self.assertEqual(resolve_skill("Which application payments are pending?").skill_id, "application_payment_details")

    def test_read_only_customer_portal_routes(self):
        self.assertEqual(resolve_skill("Show my My Requests").skill_id, "application_status")
        self.assertEqual(resolve_skill("Show my application history").skill_id, "application_status")
        self.assertEqual(resolve_skill("Check ML-2-2026-12345").skill_id, "application_status")
        self.assertEqual(resolve_skill("What is the status of my renewal application ML-2-2026-12345?").skill_id, "application_status")
        self.assertEqual(resolve_skill("How much do I need to pay for application ML-2-2026-12345?").skill_id, "application_payment_details")
        self.assertEqual(resolve_skill("What pending actions do I have in My Requests?").skill_id, "my_requests_pending_actions")
        self.assertEqual(resolve_skill("Which licenses need action or renewal?").skill_id, "license_renewal")

    def test_application_payment_detail_is_read_only(self):
        definition = next(item for item in DEFAULT_TOOL_DEFINITIONS if item["tool_name"] == "umc.application_payment_detail")
        self.assertEqual(definition["http_method"], "GET")
        self.assertEqual(definition["http_path"], "/api/payment-center/service-applications/{applicationId}/payment")
        self.assertEqual(definition.get("side_effect", "read"), "read")
        self.assertFalse(definition.get("confirmation_required", False))
        self.assertEqual(
            mask_tool_result(
                {"result": {"applicationId": 4503, "serviceApplicationId": 4503}},
                "hide:applicationId,serviceApplicationId",
            ),
            {"result": {"applicationId": "[redacted]", "serviceApplicationId": "[redacted]"}},
        )
        self.assertEqual(
            build_legacy_tool_request(
                ["umc.applications", "umc.application_payment_detail"],
                "show payment details for application 4503",
            ),
            ("umc.application_payment_detail", {"applicationId": 4503}),
        )

    def test_published_selection_workflow_claims_only_its_declared_follow_up(self):
        class Event:
            event_type = "tool.result"
            event_json = {
                "toolName": "records.list",
                "result": json.dumps({"data": {"items": [{"id": 1}]}}),
            }

        workflow = {
            "selection": {
                "sourceTool": "records.list",
                "itemsPath": "data.items",
                "toolRequest": {"when": {"anyTerms": ["inspect selected"]}},
            },
        }
        self.assertTrue(matches_configured_selection_follow_up(workflow, "inspect selected record", [Event()]))
        self.assertFalse(matches_configured_selection_follow_up(workflow, "show a different report", [Event()]))

    def test_deterministic_routing_is_driven_by_published_skill_configuration(self):
        catalog = [{
            "skillId": "custom_records",
            "deterministicRouting": [{
                "priority": 10,
                "allTerms": ["inspect", "record"],
                "route": {"category": "api_call", "mode": "answer", "fields": ["record_id"]},
            }],
        }]
        route = resolve_configured_skill("inspect this record", catalog, canonicalize=False)
        self.assertEqual((route.skill_id, route.category, route.fields), ("custom_records", "api_call", ("record_id",)))

    def test_payments_routes_obey_read_only_priority(self):
        self.assertEqual(resolve_skill("申请 ML-2-2026-12345 待付款").skill_id, "application_payment_details")
        self.assertEqual(resolve_skill("待缴罚款有哪些？").skill_id, "fine_payment_guidance")
        self.assertEqual(resolve_skill("I want a refund for a fine").skill_id, "fine_payment_guidance")
        self.assertEqual(resolve_skill("我要退款").mode, "portal_action")
        self.assertEqual(resolve_skill("下载收据").mode, "portal_action")
        self.assertEqual(resolve_skill("导出交易记录").mode, "portal_action")
        self.assertEqual(resolve_skill("支付失败，查这笔交易").skill_id, "payment_transaction_history")
        self.assertEqual(resolve_skill("payment").skill_id, "payment_transaction_history")

    def test_customer_intent_routes_do_not_get_shadowed_by_neighboring_skills(self):
        self.assertEqual(
            resolve_skill("I cannot complete payment. How can I raise a technical enquiry?").skill_id,
            "technical_enquiry",
        )
        self.assertEqual(resolve_skill("I received a fine notification. Can I appeal it?").skill_id, "fine_appeal")
        self.assertEqual(resolve_skill("My license is expiring soon. What should I do?").skill_id, "license_renewal")
        self.assertEqual(resolve_skill("Can I reopen my resolved enquiry?").skill_id, "enquiry_reopen")
        self.assertEqual(
            resolve_skill("Which services am I eligible to apply for under my current profile?").skill_id,
            "service_eligibility",
        )

    def test_payment_skill_id_migration_keeps_old_ids_as_aliases(self):
        self.assertEqual(canonical_skill_id("payment_receipt"), "payment_transaction_history")
        self.assertEqual(canonical_skill_id("application_payment"), "application_payment_details")
        self.assertEqual(canonical_skill_id("fine_payment"), "fine_payment_guidance")

    def test_existing_knowledge_and_tool_routes_remain_compatible(self):
        knowledge = resolve_skill("What documents are required for a filming permit?")
        self.assertEqual((knowledge.skill_id, knowledge.tool_name), ("license_application_knowledge", "knowledge.search"))
        application = resolve_skill("How do I apply for a Social Media Advertiser Permit?")
        self.assertEqual((application.skill_id, application.tool_name), ("license_application_knowledge", "knowledge.search"))
        isbn = resolve_skill("look up this ISBN 9781302000011")
        self.assertEqual((isbn.skill_id, isbn.tool_name), ("umc_book_by_isbn", None))
        detail = resolve_skill("show application detail 3124")
        self.assertEqual((detail.skill_id, detail.tool_name), ("umc_application_detail", None))

    def test_modification_knowledge_workflow_separates_live_and_general_questions(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        skill = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "license_permit_modification_knowledge")
        current = build_configured_tool_request(skill["workflow"], skill["allowed_tools"], "Can I modify this Media License?", [], intent_id="current_document")
        general = build_configured_tool_request(skill["workflow"], skill["allowed_tools"], "What documents are required to modify a media license?", [], intent_id="general_guidance")
        keyword_current = build_configured_tool_request(skill["workflow"], skill["allowed_tools"], "Can I modify my Media License?", [])
        self.assertEqual(current[0], "umc.licenses.list")
        self.assertEqual(general, ("knowledge.search", {}))
        self.assertEqual(keyword_current[0], "umc.licenses.list")

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

    def test_swagger_profile_parameter_is_marked_for_active_profile_binding(self):
        document = {
            "paths": {
                "/api/Appeal/List": {
                    "get": {
                        "operationId": "appealList",
                        "parameters": [{"name": "UserProfileId", "required": True, "schema": {"type": "integer"}}],
                    }
                }
            }
        }
        operation = extract_operations(document, "http://example.test/openapi.json")[0]
        self.assertEqual(operation["profileScope"], {"mode": "bind_parameter", "parameter": "UserProfileId"})

    def test_profile_scope_blocks_known_cross_profile_and_binds_active_parameter(self):
        class Platform:
            def __init__(self):
                self.calls = []

            async def invoke_swagger_tool(self, method, path, parameters, *, umc_token=None, request_id=None):
                self.calls.append((method, path, parameters))
                return {"parameters": parameters}

        context = profile_context_from_payload({
            "activeProfileId": "11",
            "activeProfileName": "Commercial UMC",
            "profiles": [
                {"id": "11", "name": "Commercial UMC"},
                {"id": "22", "name": "Government UMC"},
            ],
        })
        definition = {
            "name": "appeal.list",
            "source": "swagger",
            "httpMethod": "GET",
            "httpPath": "/api/Appeal/List",
            "parameters": {"type": "object", "properties": {"UserProfileId": {"type": "integer"}, "pageSize": {"type": "integer"}}, "required": ["UserProfileId"]},
            "profileScope": {"mode": "bind_parameter", "parameter": "UserProfileId"},
        }
        self.assertEqual(requires_profile_switch(definition, context, "Show requests for Gover profile").profile_id, "22")
        platform = Platform()
        gateway = ToolGateway(None, None, platform)
        principal = Principal(user_id="u1", tenant_id="t1", request_id="r1", umc_token="token")
        result = __import__("asyncio").run(
            gateway.invoke(
                principal,
                "appeal.list",
                {"UserProfileId": 999, "pageSize": 20},
                allowed_tools=["appeal.list"],
                tool_definition=definition,
                profile_context=context,
            )
        )
        self.assertTrue(result["ok"])
        self.assertEqual(platform.calls[0][2]["UserProfileId"], 11)
        forged_global_context = profile_context_from_payload(
            {
                "activeProfileId": "22",
                "isGlobalView": False,
                "profiles": [{"id": "22", "name": "Government UMC"}],
            },
            trusted_profile_id="0",
        )
        blocked = __import__("asyncio").run(
            gateway.invoke(
                principal,
                "appeal.list",
                {"pageSize": 20},
                allowed_tools=["appeal.list"],
                tool_definition=definition,
                profile_context=forged_global_context,
            )
        )
        self.assertTrue(forged_global_context.is_global_view)
        self.assertEqual(blocked["code"], "profile_selection_required")
        self.assertEqual(len(platform.calls), 1)

    def test_profile_scope_does_not_match_profile_name_inside_regular_word(self):
        context = profile_context_from_payload({
            "activeProfileId": "0",
            "isGlobalView": True,
            "profiles": [{"id": "22", "name": "Test"}],
        })
        definition = {
            "name": "applications.list",
            "httpPath": "/api/MyRequest/ApplicationPage",
            "parameters": {"type": "object", "properties": {}},
            "profileScope": {"mode": "token_scoped"},
        }
        self.assertIsNone(
            requires_profile_switch(
                definition,
                context,
                "What's my latest application, and when was it submitted?",
            )
        )
        self.assertEqual(
            requires_profile_switch(definition, context, "Show requests for Test profile").profile_id,
            "22",
        )

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
        self.assertIn("requires an Access Code to open", skill["content"])
        self.assertIn("must not download or open the file", skill["content"])
        route = resolve_skill("I want to download my issued media permit")
        self.assertEqual((route.skill_id, route.category, route.mode, route.fields, route.confirmation_required), ("permit_download", "data_query", "answer", (), False))

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

    def test_structured_intents_and_filters_are_skill_configuration(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        skill = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "license_permit_status")
        intent_id, filters = normalize_route_directives(skill["workflow"], "expiring_soon", {})
        request = build_configured_tool_request(
            skill["workflow"], skill["allowed_tools"], "How many are about to expire?", [], intent_id=intent_id, filters=filters
        )
        self.assertEqual(
            request,
            (
                "umc.licenses.list",
                {
                    "statuses": ["EXPIRE_SOON", "205"],
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

        service_eligibility = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "service_eligibility")
        self.assertEqual(
            build_configured_tool_request(service_eligibility["workflow"], service_eligibility["allowed_tools"], "Which services can I apply for?", []),
            ("umc.collected-services", {}),
        )
        fine_appeal = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "fine_appeal")
        self.assertEqual(
            build_configured_tool_request(fine_appeal["workflow"], fine_appeal["allowed_tools"], "Can I appeal this fine?", []),
            ("umc.pending-violations", {}),
        )
        technical_enquiry = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "technical_enquiry")
        self.assertEqual(
            build_configured_tool_request(technical_enquiry["workflow"], technical_enquiry["allowed_tools"], "I cannot complete payment", []),
            ("umc.enquiry-types", {}),
        )

        list_event = type("Event", (), {
            "event_type": "tool.result",
            "event_json": {"toolName": "umc.licenses.list", "result": json.dumps({"data": {"items": [{"sourceLicenseId": 752}]}})},
        })()
        detail_intent, detail_filters = normalize_route_directives(
            skill["workflow"], "detail", {"record": {"ordinal": 1}}
        )
        detail_request = build_configured_tool_request(
            skill["workflow"], skill["allowed_tools"], "show the first detail", [list_event], intent_id=detail_intent, filters=detail_filters
        )
        self.assertEqual(detail_request, ("umc.licenses.detail", {"id": "752"}))
        second_list_event = type("Event", (), {
            "event_type": "tool.result",
            "event_json": {"toolName": "umc.licenses.list", "result": json.dumps({"data": {"items": [
                {"sourceLicenseId": 752}, {"sourceLicenseId": 753},
            ]}})},
        })()
        self.assertEqual(
            build_configured_tool_request(
                skill["workflow"], skill["allowed_tools"], "show the second detail", [second_list_event], intent_id="detail"
            ),
            ("umc.licenses.detail", {"id": "753"}),
        )

        application_skill = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "application_status")
        application_intent, application_filters = normalize_route_directives(
            application_skill["workflow"],
            "list",
            {"status": "pending_payment", "submissionDate": {"start": "2026-08-01", "end": "2026-08-31"}},
        )
        application_request = build_configured_tool_request(
            application_skill["workflow"], application_skill["allowed_tools"], "show my requests", [], intent_id=application_intent, filters=application_filters
        )
        self.assertEqual(application_request[0], "umc.applications")
        self.assertEqual(application_request[1]["applicationStatusId"], "103")
        self.assertEqual(application_request[1]["startTime"], "2026-08-01")
        self.assertEqual(application_request[1]["endTime"], "2026-08-31")
        self.assertEqual(application_request[1]["sortBy"], "createdOn")
        self.assertEqual(application_request[1]["sortDirection"], 0)
        self.assertEqual(routing_contract(application_skill["workflow"])["filters"]["status"]["options"][2]["id"], "pending_payment")

    def test_my_requests_read_only_workflows_keep_summary_history_and_payment_separate(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        pending = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "my_requests_pending_actions")
        self.assertEqual(
            build_configured_tool_request(pending["workflow"], pending["allowed_tools"], "What needs attention?", []),
            ("umc.pending-actions", {}),
        )

        payment = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "application_payment")
        self.assertEqual(
            build_configured_tool_request(payment["workflow"], payment["allowed_tools"], "Which applications are pending payment?", []),
            ("umc.applications", {"pageIndex": 1, "pageSize": 100, "applicationStatusId": "103", "sortBy": "createdOn", "sortDirection": 0}),
        )
        list_event = type("Event", (), {
            "event_type": "tool.result",
            "event_json": {"toolName": "umc.applications", "result": json.dumps({"data": {"applicationPage": {"items": [{"id": 752, "applicationNumber": "ML-2-2026-12345"}]}}})},
        })()
        intent_id, filters = normalize_route_directives(payment["workflow"], "detail", {"record": {"identifier": "ML-2-2026-12345"}})
        self.assertEqual(
            build_configured_tool_request(payment["workflow"], payment["allowed_tools"], "payment details for ML-2-2026-12345", [list_event], intent_id=intent_id, filters=filters),
            ("umc.application_payment_detail", {"applicationId": 752}),
        )
        self.assertEqual(
            build_configured_tool_request(payment["workflow"], payment["allowed_tools"], "show payment details for the first application", [list_event]),
            ("umc.application_payment_detail", {"applicationId": 752}),
        )
        self.assertIn("never label a numeric applicationId", payment["content"])

    def test_application_detail_selection_is_request_type_agnostic(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        application = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "application_status")
        for request_type, application_id, application_number in (
            ("Modify", 4683, "ML-2-903-1610651"),
            ("Cancel", 4704, "ML-2-904-1206376"),
        ):
            list_event = type("Event", (), {
                "event_type": "tool.result",
                "event_json": {
                    "toolName": "umc.applications",
                    "result": json.dumps({"data": {"applicationPage": {"items": [{
                        "id": application_id,
                        "applicationNumber": application_number,
                        "requestType": request_type,
                    }]}}}),
                },
            })()
            intent_id, filters = normalize_route_directives(
                application["workflow"], "detail", {"record": {"identifier": application_number}}
            )
            self.assertEqual(
                build_configured_tool_request(
                    application["workflow"], application["allowed_tools"], f"show {request_type} detail", [list_event],
                    intent_id=intent_id, filters=filters,
                ),
                ("umc.application_detail", {"applicationId": application_id}),
            )

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

        legacy_history = [Event("skill.route", skill_id="payment_receipt")]
        migrated = route_context_from_history(
            legacy_history,
            [{"skillId": "payment_transaction_history", "domain": "payments"}],
        )
        self.assertEqual(migrated["activeSkillId"], "payment_transaction_history")
        self.assertEqual(migrated["activeDomain"], "payments")

    def test_route_context_keeps_four_prior_messages(self):
        class Event:
            def __init__(self, content):
                self.event_type = "user.message"
                self.event_json = {"content": content}

        history = [Event(str(index)) for index in range(7)]
        context = route_context_from_history(history, [])
        prior = context["recentMessages"][:-1]
        self.assertEqual([item["content"] for item in prior], ["2", "3", "4", "5"])

    def test_active_legacy_skill_alias_resolves_to_the_published_record(self):
        catalog = [{"skillId": "application_payment", "domain": "payments"}]
        active_skill_id = "application_payment_details"
        active = next(
            (item for item in catalog if canonical_skill_id(item["skillId"]) == active_skill_id),
            None,
        )
        self.assertEqual(active["skillId"], "application_payment")

    def test_renamed_skill_inherits_only_missing_workflow_sections(self):
        workflow = merged_skill_workflow(
            "application_payment_details",
            {
                "routing": {"defaultIntentId": "list"},
                "selection": {
                    "sourceTool": "umc.applications",
                    "itemsPath": "data.applicationPage.items",
                    "valueField": "id",
                    "toolRequest": {
                        "toolName": "umc.application_payment_detail",
                        "argumentName": "applicationId",
                        "argumentValueType": "integer",
                    },
                },
            },
        )
        self.assertEqual(workflow["routing"]["defaultIntentId"], "list")
        self.assertTrue(workflow["routing"]["intents"])
        self.assertEqual(workflow["selection"]["sourceTool"], "umc.applications")
        self.assertEqual(workflow["selection"]["ordinalTerms"]["2"], ["second", "2nd", "第二个", "第二笔", "الثاني"])
        event = type("Event", (), {
            "event_type": "tool.result",
            "event_json": {
                "toolName": "umc.applications",
                "result": {"data": {"applicationPage": {"items": [{"id": 4503}]}}},
            },
        })()
        self.assertTrue(matches_configured_selection_follow_up(workflow, "show payment details for the first one", [event]))
        self.assertEqual(
            build_configured_tool_request(workflow, ["umc.application_payment_detail"], "show payment details for the first one", [event]),
            ("umc.application_payment_detail", {"applicationId": 4503}),
        )

    def test_final_answer_prompt_excludes_tool_definitions(self):
        prompt = build_system_prompt(
            resolve_skill("What's my license status?"),
            evidence_available=False,
        )
        self.assertNotIn("AVAILABLE TOOLS FOR THIS SKILL", prompt)
        self.assertNotIn("umc.licenses.list", prompt)
        self.assertIn("Never expose internal Tool names", prompt)

    def test_internal_tool_protocol_is_not_a_public_answer(self):
        self.assertTrue(is_internal_tool_protocol('JSON\n{"tool": "umc.licenses.detail", "args": {"id": "20329"}}'))
        self.assertTrue(is_internal_tool_protocol('```json\n{"toolName": "umc.applications", "arguments": {}}\n```'))
        self.assertTrue(is_internal_tool_protocol(
            'I will check the guidance.\n\n<｜｜DSML｜｜tool_calls>\n'
            '<｜｜DSML｜｜invoke name="knowledge.search">\n'
            '<｜｜DSML｜｜parameter name="query" string="true">Text Permit application</｜｜DSML｜｜parameter>'
        ))
        self.assertFalse(is_internal_tool_protocol('{"total": 2, "status": "EXPIRED"}'))

    def test_legacy_knowledge_and_new_license_tool_boundaries(self):
        class Knowledge:
            async def search(self, query, folder_id, top_k, *, umc_token=None):
                return {"query": query, "folder_id": folder_id, "top_k": top_k}

        class Platform:
            async def invoke_swagger_tool(self, method, path, parameters, *, umc_token=None, request_id=None):
                return {"method": method, "path": path, "parameters": parameters, "token": umc_token, "request_id": request_id}

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
        self.assertEqual(licenses["result"]["request_id"], "r1")

    def test_manual_registered_tool_uses_the_same_guarded_execution_path(self):
        class Platform:
            def __init__(self):
                self.calls = []

            async def invoke_swagger_tool(self, method, path, parameters, *, umc_token=None, request_id=None):
                self.calls.append((method, path, parameters, umc_token, request_id))
                return {"method": method, "path": path, "parameters": parameters}

        principal = Principal(user_id="u1", tenant_id="t1", request_id="r1", token_ref="ref", umc_token="token")
        platform = Platform()
        gateway = ToolGateway(None, None, platform)
        definition = {
            "name": "umc.refund-applications",
            "source": "manual",
            "httpMethod": "GET",
            "httpPath": "/api/Refund/Applications",
            "parameters": {"type": "object", "properties": {"pageSize": {"type": "integer"}}},
            "sideEffect": "read",
            "confirmationRequired": False,
        }

        result = __import__("asyncio").run(
            gateway.invoke(
                principal,
                "umc.refund-applications",
                {"pageSize": 10},
                allowed_tools=["umc.refund-applications"],
                tool_definition=definition,
            )
        )

        self.assertTrue(result["ok"])
        self.assertEqual(platform.calls, [("GET", "/api/Refund/Applications", {"pageSize": 10}, "token", "r1")])

    def test_manual_write_tool_still_requires_explicit_confirmation(self):
        class Platform:
            async def invoke_swagger_tool(self, method, path, parameters, *, umc_token=None):
                self.fail("write Tool must not run before explicit confirmation")

        principal = Principal(user_id="u1", tenant_id="t1", request_id="r1", token_ref="ref", umc_token="token")
        gateway = ToolGateway(None, None, Platform())
        definition = {
            "name": "umc.refund-create",
            "source": "manual",
            "httpMethod": "POST",
            "httpPath": "/api/Refund/ApplicationModel",
            "parameters": {"type": "object", "properties": {"confirmed": {"type": "boolean"}}},
            "sideEffect": "write",
            "confirmationRequired": True,
        }

        result = __import__("asyncio").run(
            gateway.invoke(
                principal,
                "umc.refund-create",
                {},
                allowed_tools=["umc.refund-create"],
                tool_definition=definition,
            )
        )

        self.assertEqual(result["code"], "confirmation_required")

    def test_configured_action_is_materialized_without_client_status_identifier(self):
        class Platform:
            def __init__(self):
                self.calls = []

            async def invoke_swagger_tool(self, method, path, parameters, *, umc_token=None, request_id=None):
                self.calls.append((method, path, parameters, umc_token, request_id))
                return {"method": method, "path": path, "parameters": parameters}

        principal = Principal(user_id="u1", tenant_id="t1", request_id="r1", token_ref="ref", umc_token="token")
        platform = Platform()
        gateway = ToolGateway(None, None, platform)
        definition = {
            "name": "umc.enquiry-status-transition",
            "source": "manual",
            "httpMethod": "PUT",
            "httpPath": "/api/Enquiry/Status",
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "enquiryId": {"type": "integer"},
                    "action": {"type": "string", "enum": ["cancel"]},
                    "confirmed": {"type": "boolean"},
                },
                "required": ["enquiryId", "action", "confirmed"],
                # Fixture data represents protected Tool Registry configuration,
                # not any production UMC status value embedded in code.
                "x-dsh-action-payloads": {"cancel": {"enquiryStatusId": 9001}},
            },
            "sideEffect": "write",
            "confirmationRequired": True,
        }

        result = __import__("asyncio").run(
            gateway.invoke(
                principal,
                "umc.enquiry-status-transition",
                {"enquiryId": 42, "action": "cancel", "confirmed": True},
                allowed_tools=["umc.enquiry-status-transition"],
                tool_definition=definition,
            )
        )

        self.assertTrue(result["ok"])
        self.assertEqual(platform.calls[0][2], {"enquiryId": 42, "confirmed": True, "enquiryStatusId": 9001})

    def test_unconfigured_action_and_raw_status_identifier_are_rejected(self):
        class Platform:
            async def invoke_swagger_tool(self, method, path, parameters, *, umc_token=None):
                self.fail("invalid action input must not be forwarded")

        principal = Principal(user_id="u1", tenant_id="t1", request_id="r1", token_ref="ref", umc_token="token")
        gateway = ToolGateway(None, None, Platform())
        definition = {
            "name": "umc.refund-update-status",
            "source": "manual",
            "httpMethod": "PUT",
            "httpPath": "/api/Refund/1/ApplicationModel/Status",
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "properties": {"action": {"type": "string"}, "confirmed": {"type": "boolean"}},
                "required": ["action", "confirmed"],
                "x-dsh-action-payloads": {},
            },
            "sideEffect": "write",
            "confirmationRequired": True,
        }

        unconfigured = __import__("asyncio").run(
            gateway.invoke(principal, "umc.refund-update-status", {"action": "cancel", "confirmed": True}, allowed_tools=["umc.refund-update-status"], tool_definition=definition)
        )
        raw_status = __import__("asyncio").run(
            gateway.invoke(principal, "umc.refund-update-status", {"action": "cancel", "confirmed": True, "refundStatusId": 1}, allowed_tools=["umc.refund-update-status"], tool_definition=definition)
        )

        self.assertEqual(unconfigured["code"], "action_not_configured")
        self.assertEqual(raw_status["code"], "invalid_arguments")
        self.assertIn("unsupported parameter: refundStatusId", raw_status["message"])

    def test_business_tools_are_not_seeded_from_customer_defaults(self):
        self.assertEqual(DEFAULT_BUSINESS_TOOL_DEFINITIONS, ())


if __name__ == "__main__":
    unittest.main()
