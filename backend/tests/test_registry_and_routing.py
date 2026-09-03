import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.skills import build_system_prompt, requires_reference_context, resolve_configured_skill, resolve_skill
from app.skill_workflow import build_configured_hybrid_knowledge_request, build_configured_tool_request, configured_clarification_follow_up_skill, deterministic_route_directives, inherit_configured_clarification_filters, inherit_declared_filters, mask_tool_result, matches_configured_follow_up_route, matches_configured_selection_follow_up, normalize_route_directives, routing_contract, selection_snapshot_for_tool_result
from app.tool_registry import DEFAULT_BUSINESS_TOOL_DEFINITIONS, DEFAULT_TOOL_DEFINITIONS, SYSTEM_DEFAULT_TOOL_NAMES, extract_operations, interface_key
from app.tool_gateway import ToolGateway
from app.principal import Principal
from app.profile_scope import profile_context_from_payload, requires_profile_switch
from app.response_safety import is_internal_tool_protocol, strip_unverified_links
from app.skill_router import add_keyword_skill_candidate, configured_knowledge_fallback, latest_skill_versions, normalized_router_mode, recall_skill_candidates, route_context_from_history, valid_llm_route
class RegistryAndRoutingTests(unittest.TestCase):
    def test_catalog_keeps_only_latest_version_per_skill(self):
        class Record:
            def __init__(self, skill_id, version):
                self.skill_id = skill_id
                self.version = version

        selected = latest_skill_versions(
            [
                Record("admin_service_category_reader", 1),
                Record("admin_content_dashboard_reader", 4),
                Record("admin_service_category_reader", 2),
                Record("admin_content_dashboard_reader", 1),
            ]
        )

        self.assertEqual(
            [(item.skill_id, item.version) for item in selected],
            [("admin_content_dashboard_reader", 4), ("admin_service_category_reader", 2)],
        )

    def test_published_admin_skill_configuration_drives_recall_and_read_only_boundary(self):
        catalog = [
            {
                "skillId": "admin_licensing_task_reader",
                "domain": "admin_licensing",
                "aliases": ["licensing task", "pending approval"],
                "positiveExamples": ["how many pending approvals"],
                "workflow": {},
            },
            {
                "skillId": "admin_licensing_read_only_boundary",
                "domain": "admin_licensing",
                "aliases": ["approve application"],
                "positiveExamples": [],
                "workflow": {
                    "deterministicRouting": [{"priority": 1000, "anyTerms": ["approve application"], "route": {"category": "data_query", "routingLocked": True}}],
                },
            },
        ]
        recall = recall_skill_candidates("How many pending approvals?", catalog)
        self.assertEqual(recall.domains, ["admin_licensing"])
        self.assertEqual({item["skillId"] for item in recall.candidates}, {"admin_licensing_task_reader", "admin_licensing_read_only_boundary"})
        self.assertEqual(recall_skill_candidates("How many?", catalog).candidates, [])
        route = resolve_configured_skill("approve application ML-1-7-2029185", catalog, canonicalize=False)
        self.assertEqual((route.skill_id, route.category, route.routing_locked), ("admin_licensing_read_only_boundary", "data_query", True))

    def test_published_task_workflow_binds_date_statuses_and_limit(self):
        workflow = {
            "routing": {
                "defaultIntentId": "list",
                "intents": [{"id": "list", "description": "List matching tasks."}],
                "filters": {
                    "dateRange": {"type": "date_range"},
                    "statuses": {"type": "string_array"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 100},
                },
            },
            "requests": [{
                "intentId": "list",
                "toolName": "admin.application.post-application-mytodopage",
                "arguments": {"pageIndex": 1, "sortDirection": 1},
                "bindings": [
                    {"filter": "dateRange.start", "argument": "startTime"},
                    {"filter": "dateRange.end", "argument": "endTime"},
                    {"filter": "statuses", "argument": "approvalStatus"},
                    {"filter": "limit", "argument": "pageSize"},
                ],
            }],
        }
        intent_id, filters = normalize_route_directives(
            workflow,
            "list",
            {
                "dateRange": {"start": "2026-09-01", "end": "2026-09-05"},
                "statuses": ["Pending Review", "Final Approval"],
                "limit": 5,
            },
        )
        self.assertEqual(intent_id, "list")
        self.assertEqual(filters["statuses"], ["Pending Review", "Final Approval"])
        request = build_configured_tool_request(workflow, ["admin.application.post-application-mytodopage"], "recent tasks", [], intent_id=intent_id, filters=filters)
        self.assertEqual(
            request,
            (
                "admin.application.post-application-mytodopage",
                {
                    "pageIndex": 1,
                    "pageSize": 5,
                    "sortDirection": 1,
                    "startTime": "2026-09-01",
                    "endTime": "2026-09-05",
                    "approvalStatus": ["Pending Review", "Final Approval"],
                },
            ),
        )

    def test_published_filter_validation_rejects_invalid_top_n_and_array_types(self):
        workflow = {"routing": {"filters": {"limit": {"type": "integer", "minimum": 1}, "statuses": {"type": "string_array"}}}}
        _, filters = normalize_route_directives(workflow, "list", {"limit": 0, "statuses": "Pending Review"})
        self.assertNotIn("limit", filters)
        self.assertNotIn("statuses", filters)

    def test_unresolved_reference_requires_conversation_context(self):
        self.assertTrue(requires_reference_context("What guidance applies to this task?"))
        self.assertTrue(requires_reference_context("What about the third one?"))
        self.assertFalse(requires_reference_context("What reporting guidance applies to an inspection task?"))

    def test_hybrid_knowledge_request_requires_declared_primary_tool_and_scope(self):
        workflow = {
            "hybridKnowledgeRules": [{
                "when": {"allTerms": ["reporting", "guidance"]},
                "afterTools": ["records.detail"],
                "folderId": "inspection-guidance",
                "topK": 8,
            }],
        }
        self.assertEqual(
            build_configured_hybrid_knowledge_request(
                workflow,
                ["records.detail", "knowledge.search"],
                "What reporting guidance applies?",
                primary_tool_name="records.detail",
            ),
            ("knowledge.search", {"query": "What reporting guidance applies?", "folder_id": "inspection-guidance", "top_k": 8}),
        )
        self.assertIsNone(
            build_configured_hybrid_knowledge_request(
                workflow,
                ["records.detail", "knowledge.search"],
                "What reporting guidance applies?",
                primary_tool_name="records.list",
            )
        )

    def test_explicit_selection_precedes_declared_no_tool_rule(self):
        class Event:
            event_type = "tool.result"
            event_json = {
                "toolName": "records.list",
                "result": json.dumps({"data": {"items": [{"id": 7}]}}),
            }

        workflow = {
            "selection": {
                "sourceTool": "records.list",
                "itemsPath": "data.items",
                "valueField": "id",
                "filter": "selection",
                "ordinalTerms": {"1": ["first"]},
                "toolRequest": {
                    "when": {"anyTerms": ["first"]},
                    "toolName": "records.detail",
                    "argumentName": "id",
                },
            },
            "noToolRequestRules": [{"when": {"allTerms": ["reporting", "guidance"]}}],
        }
        self.assertEqual(
            build_configured_tool_request(
                workflow,
                ["records.detail"],
                "What reporting guidance applies to the first record?",
                [Event()],
            ),
            ("records.detail", {"id": 7}),
        )

    def test_database_declared_clarification_follow_up_selects_only_its_target_skill(self):
        workflow = {
            "clarificationFollowUps": [
                {
                    "when": {"anyTerms": ["customer happiness", "happiness"]},
                    "targetSkillId": "admin_customer_happiness_dashboard_reader",
                },
            ],
        }
        self.assertEqual(
            configured_clarification_follow_up_skill(workflow, "Customer Happiness"),
            "admin_customer_happiness_dashboard_reader",
        )
        self.assertIsNone(configured_clarification_follow_up_skill(workflow, "Licensing"))

    def test_database_declared_clarification_carries_only_target_declared_filters(self):
        class Event:
            event_type = "skill.route"
            event_json = {
                "skillId": "dashboard.scope",
                "filters": {
                    "dateRange": {"start": "2026-08-28", "end": "2026-09-03"},
                    "unrelated": "must not carry",
                },
            }

        workflow = {"routing": {"filters": {"dateRange": {"type": "date_range"}}}}
        self.assertEqual(
            inherit_configured_clarification_filters(
                workflow,
                {},
                [Event()],
                source_skill_id="dashboard.scope",
            ),
            {"dateRange": {"start": "2026-08-28", "end": "2026-09-03"}},
        )

    def test_selection_snapshot_preserves_hidden_internal_identifier_for_ordinal_follow_up(self):
        workflow = {
            "selection": {
                "sourceTool": "profiles.list",
                "itemsPath": "data.items",
                "valueField": "profileId",
                "identifierFields": ["profileId"],
            },
        }
        raw = {"result": {"data": {"items": [{"profileId": 7, "profileNo": "P-7"}]}}}
        masked = mask_tool_result(raw, "hide:profileId,profileNo")
        self.assertEqual(masked["result"]["data"]["items"][0], {"profileId": "[redacted]", "profileNo": "[redacted]"})
        self.assertEqual(selection_snapshot_for_tool_result(workflow, "profiles.list", raw), [{"profileId": 7}])

    def test_allow_masking_policy_redacts_unlisted_nested_fields(self):
        raw = {
            "isSuccess": True,
            "data": {
                "profileStatusObj": {"nameEn": "Approved", "id": 2},
                "personalEmail": "private@example.test",
                "documentCount": 4,
            },
        }
        masked = mask_tool_result(raw, "allow:isSuccess,data,profileStatusObj,nameEn,id")
        self.assertEqual(masked["isSuccess"], True)
        self.assertEqual(masked["data"]["profileStatusObj"], {"nameEn": "Approved", "id": 2})
        self.assertNotIn("personalEmail", masked["data"])
        self.assertNotIn("documentCount", masked["data"])

    def test_locked_route_extracts_only_declared_generic_date_and_limit_filters(self):
        workflow = {
            "deterministicIntentRules": [
                {"when": {"allTerms": ["security", "log"]}, "intentId": "security"},
            ],
            "routing": {
                "defaultIntentId": "list",
                "intents": [
                    {"id": "list", "description": "List records."},
                    {"id": "security", "description": "List security records."},
                ],
                "filters": {
                    "dateRange": {"type": "date_range"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50},
                    "status": {"type": "string"},
                },
            },
        }
        intent, filters = deterministic_route_directives(
            workflow,
            "Show the latest 5 security logs from the last 7 days with active status.",
            today=__import__("datetime").date(2026, 9, 3),
        )
        self.assertEqual(intent, "security")
        self.assertEqual(filters, {"dateRange": {"start": "2026-08-28", "end": "2026-09-03"}, "limit": 5})

    def test_locked_route_extracts_only_database_declared_enum_labels(self):
        workflow = {
            "routing": {
                "defaultIntentId": "list",
                "intents": [{"id": "list", "description": "List records."}],
                "filters": {
                    "statuses": {
                        "type": "enum_array",
                        "options": [
                            {"id": "pending_modification", "value": "Pending Modification"},
                            {"id": "pending_review", "value": "Pending Review"},
                        ],
                    },
                },
            },
        }
        intent, filters = deterministic_route_directives(workflow, "Only show Pending Modification records.")
        self.assertEqual(intent, "list")
        self.assertEqual(filters, {"statuses": ["pending_modification"]})

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

    def test_selection_prefers_explicit_ordinal_over_generic_one(self):
        class Event:
            event_type = "tool.result"
            event_json = {
                "toolName": "records.list",
                "selectionItems": [
                    {"id": "one"},
                    {"id": "two"},
                    {"id": "three"},
                ],
            }

        workflow = {
            "selection": {
                "sourceTool": "records.list",
                "valueField": "id",
                "identifierFields": ["id"],
                "ordinalTerms": {
                    "1": ["first", "one"],
                    "2": ["second", "two"],
                    "3": ["third", "three"],
                },
                "toolRequest": {
                    "when": {"anyTerms": ["first", "second", "third"]},
                    "toolName": "records.detail",
                    "argumentName": "id",
                },
            },
        }
        request = build_configured_tool_request(
            workflow,
            ["records.list", "records.detail"],
            "What about the third one?",
            [Event()],
        )
        self.assertEqual(request, ("records.detail", {"id": "three"}))

    def test_selection_can_route_declared_follow_up_intent_to_another_read_tool(self):
        class Event:
            event_type = "tool.result"
            event_json = {"toolName": "records.list", "selectionItems": [{"id": "one"}, {"id": "two"}, {"id": "three"}]}

        workflow = {
            "selection": {
                "sourceTool": "records.list", "valueField": "id", "ordinalTerms": {"3": ["third"]},
                "toolRequest": {"when": {"anyTerms": ["third"]}, "toolName": "records.detail", "argumentName": "id"},
                "toolRequestRules": [{"when": {"allTerms": ["workflow", "third"]}, "toolName": "records.workflow", "argumentName": "serviceId"}],
            },
        }
        request = build_configured_tool_request(workflow, ["records.list", "records.detail", "records.workflow"], "Show the workflow for the third record.", [Event()])
        self.assertEqual(request, ("records.workflow", {"serviceId": "three"}))

    def test_selection_uses_the_latest_declared_list_source_for_ordinal_detail(self):
        class Event:
            def __init__(self, tool_name, items):
                self.event_type = "tool.result"
                self.event_json = {"toolName": tool_name, "selectionItems": items}

        workflow = {
            "selection": {
                "ordinalTerms": {"3": ["third"]},
                "sources": [
                    {
                        "sourceTool": "books.list",
                        "valueField": "bookId",
                        "toolRequest": {"when": {"anyTerms": ["third"]}, "toolName": "books.detail", "argumentName": "bookId"},
                    },
                    {
                        "sourceTool": "cinema.list",
                        "valueField": "cinemaId",
                        "toolRequest": {"when": {"anyTerms": ["third"]}, "toolName": "cinema.detail", "argumentName": "cinemaId"},
                    },
                ],
            },
        }
        history = [
            Event("books.list", [{"bookId": 1}, {"bookId": 2}, {"bookId": 3}]),
            Event("cinema.list", [{"cinemaId": 10}, {"cinemaId": 20}, {"cinemaId": 30}]),
        ]
        self.assertTrue(matches_configured_selection_follow_up(workflow, "What about the third one?", history))
        self.assertEqual(
            build_configured_tool_request(workflow, ["books.detail", "cinema.detail"], "What about the third one?", history),
            ("cinema.detail", {"cinemaId": 30}),
        )

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

    def test_declared_follow_up_inherits_only_the_same_skill_date_range(self):
        class Event:
            def __init__(self, event_type, event_json):
                self.event_type = event_type
                self.event_json = event_json

        workflow = {
            "followUpRouting": [{"when": {"allTerms": ["team", "performance"]}}],
            "routing": {"filters": {"dateRange": {"type": "date_range"}}},
        }
        history = [
            Event("skill.route", {"skillId": "other_skill", "filters": {"dateRange": {"start": "2026-08-01", "end": "2026-08-31"}}}),
            Event("skill.route", {"skillId": "analytics", "filters": {"dateRange": {"start": "2026-08-05", "end": "2026-09-03"}}}),
        ]
        self.assertTrue(matches_configured_follow_up_route(workflow, "Show team performance in the same period."))
        self.assertEqual(
            inherit_declared_filters(workflow, {}, "Show team performance in the same period.", history, skill_id="analytics"),
            {"dateRange": {"start": "2026-08-05", "end": "2026-09-03"}},
        )
        self.assertEqual(
            inherit_declared_filters(workflow, {}, "Show team performance.", history, skill_id="analytics"),
            {},
        )

    def test_business_tools_are_not_seeded_from_code(self):
        self.assertEqual(DEFAULT_TOOL_DEFINITIONS, ())
        self.assertEqual(DEFAULT_BUSINESS_TOOL_DEFINITIONS, ())

    def test_skill_guidance_is_business_scoped(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        for definition in DEFAULT_SKILL_DEFINITIONS:
            content = definition["content"]
            self.assertIn("WHEN TO USE:", content)
            self.assertIn("DO NOT USE WHEN:", content)
            self.assertIn("PREREQUISITES:", content)
            self.assertIn("RESPONSE RULES:", content)

    def test_knowledge_prompt_requires_source_titles_when_evidence_exists(self):
        from app.skills import SkillRoute

        prompt = build_system_prompt(
            SkillRoute("custom_knowledge", "knowledge", "knowledge.search", "summary"),
            evidence_available=True,
        )
        self.assertIn("Sources section", prompt)

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

    def test_selection_snapshot_keeps_follow_up_working_when_result_is_truncated(self):
        class Event:
            event_type = "tool.result"
            event_json = {
                "toolName": "records.list",
                "result": "{truncated",
                "selectionItems": [{"displayId": "A-1", "detailId": "a"}],
            }

        workflow = {
            "selection": {
                "sourceTool": "records.list",
                "itemsPath": "data.items",
                "valueField": "detailId",
                "identifierFields": ["displayId"],
                "ordinalTerms": {"1": ["first"]},
                "toolRequest": {
                    "when": {"anyTerms": ["first"]},
                    "toolName": "records.detail",
                    "argumentName": "id",
                    "argumentValueType": "string",
                },
            },
        }
        self.assertTrue(matches_configured_selection_follow_up(workflow, "show the first one", [Event()]))
        self.assertEqual(
            build_configured_tool_request(workflow, ["records.detail"], "show the first one", [Event()]),
            ("records.detail", {"id": "a"}),
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

    def test_published_workflow_is_the_only_business_workflow_source(self):
        workflow = {"defaultToolRequest": {"toolName": "records.list", "arguments": {"pageSize": 20}}}
        self.assertEqual(
            build_configured_tool_request(workflow, ["records.list"], "show records", []),
            ("records.list", {"pageSize": 20}),
        )

    def test_published_no_tool_rule_blocks_unsupported_detail_follow_up(self):
        workflow = {
            "noToolRequestRules": [
                {"when": {"allTerms": ["task"], "anyTerms": ["detail", "third"]}},
            ],
            "defaultToolRequest": {"toolName": "records.list", "arguments": {"pageSize": 20}},
        }
        self.assertIsNone(
            build_configured_tool_request(workflow, ["records.list"], "What about the third task?", []),
        )
        self.assertEqual(
            build_configured_tool_request(workflow, ["records.list"], "List the first 3 tasks.", []),
            ("records.list", {"pageSize": 20}),
        )

    def test_knowledge_and_ocr_are_runtime_only_capabilities(self):
        business_tools = {item["tool_name"] for item in DEFAULT_BUSINESS_TOOL_DEFINITIONS}
        self.assertTrue(SYSTEM_DEFAULT_TOOL_NAMES.isdisjoint(business_tools))
        self.assertEqual(SYSTEM_DEFAULT_TOOL_NAMES, {"knowledge.search", "ocr.layout_parsing"})

    def test_skill_router_modes_and_validation(self):
        catalog = [{"skillId": "admin_inspection", "status": "PUBLISHED", "enabled": True}]
        self.assertEqual(normalized_router_mode("SHADOW"), "shadow")
        self.assertEqual(normalized_router_mode("invalid"), "llm")
        self.assertEqual(valid_llm_route({"skillId": "admin_inspection", "confidence": 0.91}, catalog), (True, "ok"))
        self.assertEqual(valid_llm_route({"skillId": "admin_inspection", "confidence": 0.2}, catalog), (False, "low_confidence"))
        self.assertEqual(valid_llm_route({"skillId": "missing", "confidence": 0.91}, catalog), (False, "skill_not_published"))
        self.assertEqual(valid_llm_route({"skillId": "admin_inspection", "confidence": 0.91, "needsClarification": True}, catalog), (True, "needs_clarification"))

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
            {"skillId": "wrong_fallback", "allowedTools": ["records.list"]},
            {"skillId": "mixed_fallback", "allowedTools": ["knowledge.search", "records.list"]},
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

        history = [Event("user.message", "first"), Event("skill.route", skill_id="admin_inspection")]
        context = route_context_from_history(history, [{"skillId": "admin_inspection", "domain": "admin"}])
        self.assertEqual(context["activeDomain"], "admin")
        self.assertEqual(context["activeSkillId"], "admin_inspection")
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

    def test_final_answer_prompt_excludes_tool_definitions(self):
        prompt = build_system_prompt(
            resolve_skill("What's my license status?"),
            evidence_available=False,
        )
        self.assertNotIn("AVAILABLE TOOLS FOR THIS SKILL", prompt)
        self.assertNotIn("umc.licenses.list", prompt)
        self.assertIn("Never expose internal Tool names", prompt)

    def test_global_view_prompt_allows_token_scoped_tool_evidence(self):
        context = profile_context_from_payload(
            {
                "activeProfileId": "0",
                "isGlobalView": True,
                "profiles": [{"id": "0", "name": "Global View"}],
            },
            trusted_profile_id="0",
        )
        prompt = build_system_prompt(
            resolve_skill("Show Finance payment-method statistics."),
            evidence_available=True,
            profile_context=context,
        )
        self.assertIn("token-scoped Tools may return the caller's authorized role view", prompt)
        self.assertNotIn("Do not represent profile-bound data as available", prompt)

    def test_knowledge_fallback_does_not_contain_business_specific_guidance(self):
        from app.skills import DEFAULT_SKILL_DEFINITIONS

        self.assertEqual([item["skill_id"] for item in DEFAULT_SKILL_DEFINITIONS], ["general_knowledge"])
        self.assertNotIn("customer", DEFAULT_SKILL_DEFINITIONS[0]["content"].lower())

    def test_internal_tool_protocol_is_not_a_public_answer(self):
        self.assertTrue(is_internal_tool_protocol('JSON\n{"tool": "umc.licenses.detail", "args": {"id": "20329"}}'))
        self.assertTrue(is_internal_tool_protocol('```json\n{"toolName": "umc.applications", "arguments": {}}\n```'))
        self.assertTrue(is_internal_tool_protocol(
            'I will check the guidance.\n\n<｜｜DSML｜｜tool_calls>\n'
            '<｜｜DSML｜｜invoke name="knowledge.search">\n'
            '<｜｜DSML｜｜parameter name="query" string="true">Text Permit application</｜｜DSML｜｜parameter>'
        ))
        self.assertFalse(is_internal_tool_protocol('{"total": 2, "status": "EXPIRED"}'))

    def test_response_links_require_tool_evidence(self):
        content = (
            "See [Portal page](http://localhost:18086/fabricated) and "
            "[the returned record](https://portal.example.test/records/42). "
            "Also omit [a relative fake](/). Do not use https://portal.example.test/invented."
        )
        evidence = {"recordUrl": "https://portal.example.test/records/42"}

        self.assertEqual(
            strip_unverified_links(content, evidence),
            "See Portal page and [the returned record](https://portal.example.test/records/42). Also omit a relative fake. Do not use .",
        )

    def test_selection_specialized_tool_rule_keeps_active_skill(self):
        workflow = {
            "selection": {
                "sourceTool": "example.list",
                "itemsPath": "items",
                "valueField": "id",
                "ordinalTerms": {"1": ["first"]},
                "toolRequestRules": [
                    {
                        "when": {"allTerms": ["workflow"]},
                        "toolName": "example.workflow",
                        "argumentName": "id",
                        "argumentValueType": "integer",
                    },
                ],
            },
        }
        history = [
            type("Event", (), {"event_type": "tool.result", "event_json": {
                "toolName": "example.list", "selectionItems": [{"id": 1}],
            }})(),
            type("Event", (), {"event_type": "user.message", "event_json": {
                "content": "Show the first item details.",
            }})(),
        ]

        self.assertTrue(matches_configured_selection_follow_up(workflow, "Show its workflow.", history))
        self.assertEqual(
            build_configured_tool_request(
                workflow,
                ["example.workflow"],
                "Show its workflow.",
                history,
            ),
            ("example.workflow", {"id": 1}),
        )

    def test_selection_detail_rule_merges_declared_static_arguments(self):
        workflow = {
            "selection": {
                "sourceTool": "example.list",
                "itemsPath": "items",
                "valueField": "id",
                "ordinalTerms": {"1": ["first"]},
                "toolRequest": {
                    "when": {"anyTerms": ["first"]},
                    "toolName": "example.detail",
                    "argumentName": "id",
                    "argumentValueType": "integer",
                    "arguments": {"recordType": "read_only"},
                },
            },
        }
        history = [
            type("Event", (), {"event_type": "tool.result", "event_json": {
                "toolName": "example.list", "selectionItems": [{"id": 1}],
            }})(),
        ]

        self.assertEqual(
            build_configured_tool_request(
                workflow,
                ["example.detail"],
                "Show the first one.",
                history,
            ),
            ("example.detail", {"recordType": "read_only", "id": 1}),
        )

    def test_explicit_tool_rule_overrides_default_intent_request(self):
        workflow = {
            "routing": {"intents": [{"id": "overview"}], "defaultIntentId": "overview"},
            "requests": [{
                "intentId": "overview",
                "toolName": "dashboard.overview",
                "arguments": {"tab": "all"},
            }],
            "toolRequestRules": [{
                "when": {"anyTerms": ["blocked"]},
                "toolName": "dashboard.tasks",
                "arguments": {"tab": "blocked"},
            }],
        }

        self.assertEqual(
            build_configured_tool_request(
                workflow,
                ["dashboard.overview", "dashboard.tasks"],
                "What about the blocked items?",
                [],
                intent_id="overview",
            ),
            ("dashboard.tasks", {"tab": "blocked"}),
        )

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
