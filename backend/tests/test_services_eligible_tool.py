import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import make_router
from app.platform import PlatformGatewayClient
from app.principal import Principal
from app.skills import DEFAULT_SKILL_DEFINITIONS, ROUTING_RULES, resolve_configured_skill, resolve_skill
from app.tool_gateway import ToolGateway
from app.tool_registry import SYSTEM_DEFAULT_TOOL_NAMES, system_default_tool_definitions


TOOL_NAME = "umc.services.eligible"


class ServicesEligibleToolTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.platform = AsyncMock()
        self.gateway = ToolGateway(AsyncMock(), AsyncMock(), self.platform)
        self.principal = Principal(
            user_id="current-customer",
            tenant_id="current-tenant",
            request_id="request-service-catalog",
            umc_token="test-current-profile-token",
        )

    async def invoke(self, arguments=None, **kwargs):
        return await self.gateway.invoke(
            self.principal,
            TOOL_NAME,
            {} if arguments is None else arguments,
            allowed_tools=[TOOL_NAME],
            **kwargs,
        )

    async def test_forwards_current_token_and_preserves_all_categories(self):
        catalog = {
            "scope": "current_profile_available_services",
            "categoryId": 0,
            "profileUserType": {"id": 1, "code": "1", "nameEn": "Individual", "nameAr": None},
            "total": 11,
            "services": [
                {
                    "id": number,
                    "nameEn": f"Test service {number}",
                    "typeEn": "Filming Permit" if number <= 4 else "Other Service",
                }
                for number in range(1, 12)
            ],
            "limitations": ["Service availability does not guarantee application approval."],
        }
        self.platform.eligible_services.return_value = catalog

        result = await self.invoke()

        self.assertTrue(result["ok"])
        self.assertEqual(result["result"], catalog)
        self.assertEqual(len(result["result"]["services"]), 11)
        self.assertEqual(sum(item["typeEn"] == "Filming Permit" for item in result["result"]["services"]), 4)
        self.platform.eligible_services.assert_awaited_once_with(
            umc_token=self.principal.umc_token,
            request_id=self.principal.request_id,
        )
        self.platform.media_licensing_eligible_services.assert_not_awaited()

    async def test_empty_catalog_is_a_successful_empty_result(self):
        self.platform.eligible_services.return_value = {"total": 0, "services": []}

        result = await self.invoke()

        self.assertTrue(result["ok"])
        self.assertEqual(result["result"], {"total": 0, "services": []})

    async def test_rejects_caller_identity_and_filter_overrides(self):
        for argument in ("userId", "profileId", "userProfileId", "userType", "categoryId", "pageSize"):
            with self.subTest(argument=argument):
                result = await self.invoke({argument: "other-profile"})
                self.assertEqual(result["code"], "invalid_arguments")
        self.platform.eligible_services.assert_not_awaited()

    async def test_skill_allowlist_is_enforced(self):
        result = await self.gateway.invoke(self.principal, TOOL_NAME, {}, allowed_tools=[])

        self.assertEqual(result["code"], "tool_not_allowed_for_skill")
        self.platform.eligible_services.assert_not_awaited()

    async def test_runtime_tool_cannot_be_redirected_by_registry_definition(self):
        self.platform.eligible_services.return_value = {"total": 0, "services": []}

        result = await self.invoke(tool_definition={
            "source": "manual",
            "httpMethod": "POST",
            "httpPath": "/api/Other/Mutation",
        })

        self.assertTrue(result["ok"])
        self.platform.eligible_services.assert_awaited_once()
        self.platform.invoke_swagger_tool.assert_not_awaited()

    async def test_authentication_and_upstream_errors_are_not_empty_successes(self):
        for status, expected in ((401, "permission_denied"), (403, "permission_denied"), (502, "tool_error")):
            with self.subTest(status=status):
                response = httpx.Response(status, request=httpx.Request("GET", "http://gateway/services/eligible"))
                self.platform.eligible_services.side_effect = httpx.HTTPStatusError(
                    "catalog unavailable", request=response.request, response=response,
                )
                result = await self.invoke()
                self.assertFalse(result["ok"])
                self.assertEqual(result["code"], expected)
                self.assertEqual(result["status"], status)
                self.assertNotIn("result", result)

    async def test_structured_profile_selection_errors_are_preserved(self):
        for code in ("profile_selection_required", "selected_profile_not_available"):
            with self.subTest(code=code):
                message = "Select an available Profile in Customer Portal and retry."
                response = httpx.Response(
                    422,
                    json={"detail": {"code": code, "message": message}},
                    request=httpx.Request("GET", "http://gateway/services/eligible"),
                )
                self.platform.eligible_services.side_effect = httpx.HTTPStatusError(
                    "profile selection required", request=response.request, response=response,
                )
                result = await self.invoke()
                self.assertEqual(result["code"], code)
                self.assertEqual(result["status"], 422)
                self.assertEqual(result["message"], message)

    async def test_unrecognized_validation_error_remains_generic(self):
        response = httpx.Response(
            422,
            json={"detail": {"code": "unknown_error", "message": "Untrusted internal detail"}},
            request=httpx.Request("GET", "http://gateway/services/eligible"),
        )
        self.platform.eligible_services.side_effect = httpx.HTTPStatusError(
            "invalid response", request=response.request, response=response,
        )

        result = await self.invoke()

        self.assertEqual(result["code"], "tool_error")
        self.assertNotIn("message", result)

    async def test_transport_error_returns_unavailable(self):
        self.platform.eligible_services.side_effect = httpx.ConnectError("gateway unavailable")

        result = await self.invoke()

        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "tool_unavailable")

    async def test_client_requests_all_category_endpoint_without_identity_parameters(self):
        requests = []

        def handle(request):
            requests.append(request)
            return httpx.Response(200, json={"total": 0, "services": []})

        async_client = httpx.AsyncClient
        settings = SimpleNamespace(platform_gateway_url="http://gateway/", platform_timeout_seconds=30)
        client = PlatformGatewayClient(settings)
        with patch("app.platform.httpx.AsyncClient", side_effect=lambda **kwargs: async_client(
            transport=httpx.MockTransport(handle), **kwargs,
        )):
            result = await client.eligible_services(
                umc_token=self.principal.umc_token,
                request_id=self.principal.request_id,
            )

        self.assertEqual(result, {"total": 0, "services": []})
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0].method, "GET")
        self.assertEqual(str(requests[0].url), "http://gateway/services/eligible")
        self.assertEqual(requests[0].headers["Authorization"], f"Bearer {self.principal.umc_token}")
        self.assertEqual(requests[0].headers["X-Request-ID"], self.principal.request_id)
        self.assertEqual(requests[0].content, b"")


class ServicesEligibleRoutingTests(unittest.TestCase):
    def test_current_profile_catalog_questions_use_live_tool(self):
        for question in (
            "Which services am I eligible to apply for under mycurrent profile?",
            "Which services am I eligible to apply for under my current profile?",
            "What services can I apply for based on my current file?",
            "What services can  I apply for based on my current file?",
            "What services are available for my current account?",
            "Which services can I apply for?",
            "Show all services available to me.",
        ):
            with self.subTest(question=question):
                route = resolve_skill(question)
                self.assertEqual(route.skill_id, "service_eligibility")
                self.assertEqual(route.category, "data_query")
                self.assertEqual(route.tool_name, TOOL_NAME)
                self.assertTrue(route.routing_locked)
                self.assertEqual(route.fields, ())

    def test_specific_media_licensing_route_is_unchanged(self):
        question = "Which Media Licensing services can my account apply for?"

        route = resolve_skill(question)

        self.assertEqual(route.skill_id, "media_licensing_account_services")
        definition = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == route.skill_id)
        self.assertEqual(definition["allowed_tools"], ["umc.media-licensing.eligible-services"])
        self.assertEqual(definition["workflow"]["defaultToolRequest"]["toolName"], "umc.media-licensing.eligible-services")

    def test_current_profile_media_licensing_questions_use_existing_category_tool(self):
        for question in (
            "Which Media Licensing services can I apply for under my current profile?",
            "Which Media Licensing services am I eligible to apply for under mycurrent profile?",
            "What Media Licensing services can I apply for based on my current file?",
            "What Media Licensing services are available under the selected profile?",
            "List the Media Licensing services for my current account.",
            "Which Media Licensing services can  I apply for?",
            "Show the Media-Licensing services available to me.",
        ):
            with self.subTest(question=question):
                route = resolve_skill(question)
                self.assertEqual(route.skill_id, "media_licensing_account_services")
                self.assertEqual(route.category, "data_query")
                self.assertEqual(route.tool_name, "umc.media-licensing.eligible-services")
                self.assertEqual(route.fields, ())
                self.assertTrue(route.routing_locked)

    def test_new_media_catalog_rule_excludes_policy_and_other_accounts(self):
        definition = {
            "skill_id": "media_licensing_account_services",
            "workflow": {"deterministicRouting": [ROUTING_RULES["media_licensing_account_services"][0]]},
        }
        for question in (
            "Who is eligible for Media Licensing services?",
            "What are the requirements for Media Licensing services available to my current profile?",
            "What are the fees for Media Licensing services available to my current account?",
            "How do I apply for Media Licensing services under my current profile?",
            "Which Media Licensing services can another user apply for under my current profile?",
            "Which Media Licensing services are available to another account instead of my current account?",
            "Which Media Licensing services can Daisy apply for?",
        ):
            with self.subTest(question=question):
                self.assertIsNone(resolve_configured_skill(question, [definition]))

    def test_profile_and_knowledge_questions_keep_existing_domains(self):
        self.assertEqual(resolve_skill("What is my profile status?").skill_id, "profile_status")
        self.assertEqual(resolve_skill("Who is eligible for media services?").skill_id, "service_eligibility_info")

    def test_default_skill_uses_full_catalog_and_keeps_read_categories(self):
        definition = next(item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "service_eligibility")

        self.assertEqual(definition["allowed_tools"], [TOOL_NAME, "umc.service-categories"])
        self.assertEqual(definition["workflow"]["defaultToolRequest"], {"toolName": TOOL_NAME, "arguments": {}})

    def test_runtime_tool_is_read_only_and_requires_gateway_configuration(self):
        for configured in (True, False):
            with self.subTest(configured=configured):
                settings = SimpleNamespace(platform_gateway_url="http://gateway" if configured else "")
                definition = next(item for item in system_default_tool_definitions(settings) if item["toolName"] == TOOL_NAME)
                self.assertIn(TOOL_NAME, SYSTEM_DEFAULT_TOOL_NAMES)
                self.assertEqual(definition["sideEffect"], "read")
                self.assertFalse(definition["confirmationRequired"])
                self.assertFalse(definition["parameters"]["additionalProperties"])
                self.assertEqual(definition["parameters"]["properties"], {})
                self.assertEqual(definition["enabled"], configured)
                self.assertEqual(definition["published"], configured)


class ServicesEligibleApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.platform = AsyncMock()
        self.platform.eligible_services.return_value = {
            "scope": "current_profile_available_services",
            "categoryId": 0,
            "profileUserType": {"id": 1, "code": "1", "nameEn": "Individual", "nameAr": None},
            "total": 1,
            "services": [{"id": 42, "nameEn": "Test filming service", "typeEn": "Filming Permit"}],
            "limitations": ["Availability is not application approval."],
        }
        self.app = FastAPI()
        self.app.include_router(make_router(SimpleNamespace(tool_gateway=SimpleNamespace(platform=self.platform))))
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://dsh")
        self.headers = {"Authorization": "Bearer test-current-session", "X-Request-ID": "request-catalog-api"}

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_endpoint_returns_typed_catalog_and_forwards_current_auth(self):
        self.platform.eligible_services.return_value["selectedProfileId"] = "private-profile-identifier"

        response = await self.client.get("/api/v1/umc/services/eligible", headers=self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total"], 1)
        self.assertEqual(response.json()["services"][0]["typeEn"], "Filming Permit")
        self.assertNotIn("selectedProfileId", response.json())
        self.platform.eligible_services.assert_awaited_once_with(
            umc_token="test-current-session", request_id="request-catalog-api",
        )

    async def test_endpoint_requires_bearer_auth_even_with_identity_headers(self):
        response = await self.client.get("/api/v1/umc/services/eligible", headers={"X-User-ID": "other-user"})

        self.assertEqual(response.status_code, 401)
        self.platform.eligible_services.assert_not_awaited()

    async def test_endpoint_rejects_query_selectors_without_forwarding_them(self):
        for parameter in ("userId", "profileId", "userTypeCodes", "categoryId", "pageSize"):
            with self.subTest(parameter=parameter):
                response = await self.client.get(
                    "/api/v1/umc/services/eligible", headers=self.headers, params={parameter: "override"},
                )
                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json()["detail"]["code"], "identity_selectors_not_allowed")
        self.platform.eligible_services.assert_not_awaited()

    async def test_endpoint_preserves_auth_profile_and_availability_statuses(self):
        for status in (401, 403, 422, 502, 503):
            with self.subTest(status=status):
                upstream = httpx.Response(
                    status,
                    json={"detail": {"code": "profile_selection_required"}},
                    request=httpx.Request("GET", "http://gateway/services/eligible"),
                )
                self.platform.eligible_services.side_effect = httpx.HTTPStatusError(
                    "upstream error", request=upstream.request, response=upstream,
                )
                response = await self.client.get("/api/v1/umc/services/eligible", headers=self.headers)
                self.assertEqual(response.status_code, status)
                if status == 422:
                    self.assertEqual(response.json()["detail"]["code"], "profile_selection_required")
                self.assertNotIn("services", response.json())

    async def test_endpoint_maps_transport_failure_to_bad_gateway(self):
        self.platform.eligible_services.side_effect = httpx.ConnectError("Internal connection detail")

        response = await self.client.get("/api/v1/umc/services/eligible", headers=self.headers)

        self.assertEqual(response.status_code, 502)
        self.assertNotIn("Internal connection detail", response.text)

    async def test_openapi_describes_read_only_catalog_and_no_identity_inputs(self):
        response = await self.client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        document = response.json()
        endpoint = document["paths"]["/api/v1/umc/services/eligible"]
        self.assertEqual(set(endpoint), {"get"})
        operation = endpoint["get"]
        self.assertTrue(all(parameter["in"] == "header" for parameter in operation.get("parameters", [])))
        self.assertTrue({"200", "401", "403", "422", "502", "503"}.issubset(operation["responses"]))
        schema = document["components"]["schemas"]["ServiceEligibilityResponse"]
        self.assertEqual(schema["properties"]["categoryId"]["const"], 0)
        self.assertIn("total", schema["required"])
        self.assertEqual(schema["properties"]["services"]["items"]["$ref"], "#/components/schemas/AvailableService")


if __name__ == "__main__":
    unittest.main()
