import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch, AsyncMock

import httpx
from fastapi import FastAPI

from app.service_fees import CustomerServiceFeeClient, ServiceFeeResponse, fee_answer, is_public_service_fee_query, match_services
from app.service import DSHService
from app.profile_scope import ProfileContext
from app.api import make_router
from app.console_auth import ConsoleAuthMiddleware


class FeeIntentTests(unittest.TestCase):
    def test_public_bilingual_queries_do_not_require_profile(self):
        for query in (
            "can you check service fee for A Permit for a Reporter or Journalist to Work for Foreign Media Offices Licensed in the UAE",
            "Check service fee for Permit for Visiting Individuals to Provide Advertising or Media Content on Social Media",
            "ما هي رسوم تصريح مراسل أو صحفي للعمل لدى مكاتب الإعلام الأجنبية المرخصة في الدولة؟",
            "أرني رسوم إصدار ترخيص للمؤسسات الإعلامية",
            "Check the fee for service ID 35",
        ):
            with self.subTest(query=query):
                self.assertTrue(is_public_service_fee_query(query))
                self.assertIsNone(DSHService.profile_scope_guard(query, "en", ProfileContext("0", "Global View", True, ())))

    def test_private_and_mixed_requests_are_not_exempted(self):
        for query in (
            "Show my licenses and unpaid service fees",
            "Show the licenses for Ahmed and their fees",
            "Check service fee and licenses for myzzz.notexist.9x",
            "Show licenses for Ahmed service fees",
            "Check Bob's permit service fee",
            "What is the service fee for my application ML-3-7-5263529?",
            "أرني تراخيص myzzz.notexist.9x والغرامات والمهام المعلقة ورسوم الخدمة",
            "أرني رسوم رخصتي والغرامات",
        ):
            with self.subTest(query=query):
                self.assertFalse(is_public_service_fee_query(query))
        result = DSHService.profile_scope_guard("Check service fee and licenses for myzzz.notexist.9x", "en", None)
        self.assertEqual(result["code"], "external_account_lookup")

    def test_no_fee_does_not_intercept_other_workflows(self):
        for query in ("Show my applications", "How do I renew my media license?", "أرني تراخيص myzzz.notexist.9x والغرامات والمهام المعلقة"):
            self.assertFalse(is_public_service_fee_query(query))


class FeeClientTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.settings = SimpleNamespace(umc_document_service_base_url="https://customer.test", platform_timeout_seconds=5)
        self.items = [
            {"id": 10, "nameEn": "Permit for Camera Crews", "nameAr": "تصريح طواقم التصوير"},
            {"id": 20, "nameEn": "Permit for Visiting Crews", "nameAr": "تصريح الطواقم الزائرة"},
        ]

    def handler(self, request):
        self.assertEqual(request.headers["Authorization"], "Bearer caller-token")
        if request.method == "POST":
            body = json.loads(request.content)
            self.assertEqual(body["userTypeCodes"], [])
            self.assertNotIn("profileId", body)
            return httpx.Response(200, json={"isSuccess": True, "data": {"items": self.items, "total": len(self.items)}})
        self.assertEqual(request.url.path, "/api/Service/10/Learn/Authorized")
        return httpx.Response(200, json={"isSuccess": True, "data": {
            "serviceId": 10, "serviceFeeEn": "First year: Free; afterwards AED 700", "serviceFeeAr": "السنة الأولى مجاناً؛ بعدها 700 درهم",
            "token": "must-not-return", "userId": 44,
        }})

    async def test_live_card_projection_preserves_conditions_and_source(self):
        client = CustomerServiceFeeClient(self.settings, transport=httpx.MockTransport(self.handler))
        en = await client.lookup("Check service fee for Permit for Camera Crews", umc_token="caller-token")
        ar = await client.lookup("ما هي رسوم تصريح طواقم التصوير", umc_token="caller-token")
        self.assertEqual(en, ar)
        self.assertIn("afterwards AED 700", fee_answer(en, "en"))
        self.assertIn("700 درهم", fee_answer(ar, "ar"))
        self.assertIn("/services/service-card?id=10", fee_answer(en, "en"))
        self.assertNotIn("must-not-return", en.model_dump_json())
        self.assertNotIn("userId", en.model_dump_json())

    async def test_ambiguous_names_do_not_fetch_or_return_fee(self):
        client = CustomerServiceFeeClient(self.settings, transport=httpx.MockTransport(self.handler))
        result = await client.lookup("What is the fee for Permit for Crews", umc_token="caller-token")
        self.assertEqual(result.status, "ambiguous")
        self.assertTrue(all(item.feeEn is None for item in result.services))
        self.assertIn("choose", fee_answer(result, "en"))

    async def test_missing_service_is_not_zero_fee(self):
        client = CustomerServiceFeeClient(self.settings, transport=httpx.MockTransport(self.handler))
        result = await client.lookup("Unknown Service", umc_token="caller-token")
        self.assertEqual(result.status, "not_found")
        self.assertNotIn("0", fee_answer(result, "en"))

    async def test_missing_fee_is_not_estimated_or_borrowed(self):
        def handler(request):
            if request.method == "POST":
                return self.handler(request)
            return httpx.Response(200, json={"data": {"serviceId": 10, "serviceFeeAr": "0 درهم"}})
        result = await CustomerServiceFeeClient(self.settings, transport=httpx.MockTransport(handler)).lookup("10", umc_token="caller-token")
        self.assertIn("cannot estimate", fee_answer(result, "en"))
        self.assertIn("0 درهم", fee_answer(result, "ar"))

    async def test_mismatched_card_and_upstream_errors_do_not_claim_success(self):
        for response in (httpx.Response(200, json={"data": {"serviceId": 99, "serviceFeeEn": "AED 1"}}), httpx.Response(403)):
            def handler(request):
                return self.handler(request) if request.method == "POST" else response
            with self.assertRaises((ValueError, httpx.HTTPStatusError)):
                await CustomerServiceFeeClient(self.settings, transport=httpx.MockTransport(handler)).lookup("10", umc_token="caller-token")

    async def test_incomplete_duplicate_and_changing_pagination_fail(self):
        for mode in ("empty", "duplicate", "changed", "invalid"):
            def handler(request):
                page = json.loads(request.content)["pageIndex"]
                items = self.items[:1] if page == 1 or mode == "duplicate" else []
                total = 2 if page == 1 or mode != "changed" else 3
                if mode == "invalid":
                    total = True
                return httpx.Response(200, json={"data": {"items": items, "total": total}})
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                await CustomerServiceFeeClient(self.settings, transport=httpx.MockTransport(handler)).lookup("10", umc_token="caller-token")

    async def test_missing_auth_never_calls_upstream(self):
        with self.assertRaises(PermissionError):
            await CustomerServiceFeeClient(self.settings).lookup("10", umc_token=None)

    def test_two_full_service_titles_remain_ambiguous(self):
        matches = match_services("Fee for Permit for Camera Crews and Permit for Visiting Crews", self.items)
        self.assertEqual(len(matches), 2)


class FeeApiContractTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.app = FastAPI()
        self.app.add_middleware(ConsoleAuthMiddleware, get_password=lambda: "operator-only")
        self.app.include_router(make_router(SimpleNamespace(settings=SimpleNamespace())))
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_auth_query_and_identity_selector_contract(self):
        self.assertEqual((await self.client.get("/api/v1/umc/services/fees", params={"query": "10"})).status_code, 401)
        self.assertEqual((await self.client.get("/api/v1/config", headers={"Authorization": "Bearer current-caller"})).status_code, 401)
        headers = {"Authorization": "Bearer current-caller"}
        for params in ({"query": "10", "profileId": "other"}, {"query": "fee for outside.account.42 licenses"}, {"query": ""}, {"query": "x" * 501}):
            with self.subTest(params=params):
                self.assertEqual((await self.client.get("/api/v1/umc/services/fees", params=params, headers=headers)).status_code, 422)
        result = ServiceFeeResponse(status="not_found", services=[])
        with patch("app.api.CustomerServiceFeeClient") as factory:
            factory.return_value.lookup = AsyncMock(return_value=result)
            response = await self.client.get("/api/v1/umc/services/fees", params={"query": "10"}, headers=headers)
            self.assertEqual(response.status_code, 200)
            factory.return_value.lookup.assert_awaited_once_with("10", umc_token="current-caller")
            self.assertEqual(response.json()["status"], "not_found")

    async def test_upstream_errors_are_distinct_from_not_found(self):
        for error, status in ((ValueError("invalid"), 502), (httpx.ConnectError("down"), 503),
                              (httpx.HTTPStatusError("denied", request=httpx.Request("GET", "http://test"), response=httpx.Response(403)), 403)):
            with self.subTest(status=status), patch("app.api.CustomerServiceFeeClient") as factory:
                factory.return_value.lookup = AsyncMock(side_effect=error)
                response = await self.client.get("/api/v1/umc/services/fees", params={"query": "10"}, headers={"Authorization": "Bearer caller"})
                self.assertEqual(response.status_code, status)

    def test_openapi_documents_bilingual_fees_and_auth_errors(self):
        schema = self.app.openapi()
        endpoint = schema["paths"]["/api/v1/umc/services/fees"]["get"]
        self.assertTrue({"200", "401", "403", "422", "502", "503"} <= set(endpoint["responses"]))
        self.assertIn("Global View", endpoint["description"])
        self.assertIn("feeAr", schema["components"]["schemas"]["ServiceFeeEntry"]["properties"])
