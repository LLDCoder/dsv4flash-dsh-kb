import base64
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

SPEC = importlib.util.spec_from_file_location("available_services_gateway", Path(__file__).resolve().parents[2] / "platform-gateway" / "app.py")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def bearer(profile="123", user_type="4"):
    payload = base64.urlsafe_b64encode(json.dumps({"UserProFileId": profile, "UserTypeID": user_type}).encode()).decode().rstrip("=")
    return f"Bearer header.{payload}.signature"


def page(count, start=0, total=None):
    return {"data": {"total": count if total is None else total, "items": [
        {"id": i, "nameEn": f"Service {i}", "serviceCategoryId": 245 if i >= 7 else 244,
         "serviceCategoryNameEn": "Filming Permit" if i >= 7 else "Media Licensing"}
        for i in range(start, start + count)
    ]}}


class AvailableServicesTests(unittest.IsolatedAsyncioTestCase):
    def upstream(self, *pages, identity=None):
        return AsyncMock(side_effect=[
            identity if identity is not None else {"data": {"userInvitation": {"userProfileId": "123", "userTypeId": 4}}},
            {"data": [{"id": 4, "code": "INDIVIDUAL", "nameEn": "Individual"}]},
            *pages,
        ])

    async def test_all_categories_not_homepage_collection(self):
        upstream = self.upstream(page(11))
        with patch.object(MODULE, "_customer_request", upstream):
            result = await MODULE.eligible_services(bearer(), "test-all-services")
        self.assertEqual(result.total, 11)
        self.assertEqual(len(result.services), 11)
        self.assertEqual(sum(s.category_name_en == "Filming Permit" for s in result.services), 4)
        request = upstream.call_args_list[-1]
        self.assertEqual(request.args, ("POST", "/api/Service/ServicePage"))
        self.assertEqual(request.kwargs["json"]["userTypeCodes"], ["INDIVIDUAL"])
        self.assertEqual(request.kwargs["json"]["serviceCategoryId"], 0)
        self.assertIs(request.kwargs["json"]["favorite"], False)
        self.assertIs(request.kwargs["json"]["featured"], False)
        self.assertEqual(request.kwargs["authorization"], bearer())
        self.assertNotIn("selectedProfileId", result.model_dump(by_alias=True))

    async def test_upstream_page_size_cap_does_not_drop_items(self):
        upstream = self.upstream(page(7, total=11), page(4, start=7, total=11))
        with patch.object(MODULE, "_customer_request", upstream):
            result = await MODULE.eligible_services(bearer(), None)
        self.assertEqual(result.total, len(result.services))
        self.assertEqual(upstream.call_args.kwargs["json"]["pageIndex"], 2)

    async def test_more_than_one_hundred(self):
        with patch.object(MODULE, "_customer_request", self.upstream(page(100, total=103), page(3, start=100, total=103))):
            result = await MODULE.eligible_services(bearer(), None)
        self.assertEqual(result.total, 103)

    async def test_empty_list_is_verified_zero(self):
        with patch.object(MODULE, "_customer_request", self.upstream(page(0))):
            result = await MODULE.eligible_services(bearer(), None)
        self.assertEqual(result.total, 0)
        self.assertEqual(result.services, [])

    async def test_token_type_fallback_when_profile_entry_absent(self):
        with patch.object(MODULE, "_customer_request", self.upstream(page(1), identity={"data": {}})):
            result = await MODULE.eligible_services(bearer(), None)
        self.assertEqual(result.profile_user_type["code"], "INDIVIDUAL")

    async def test_missing_bearer_fails_before_upstream(self):
        upstream = AsyncMock()
        with patch.object(MODULE, "_customer_request", upstream), self.assertRaises(HTTPException) as error:
            await MODULE.eligible_services(None, None)
        self.assertEqual(error.exception.status_code, 401)
        upstream.assert_not_awaited()

    async def test_global_profile_requires_selection(self):
        upstream = AsyncMock(return_value={"data": {}})
        with patch.object(MODULE, "_customer_request", upstream), self.assertRaises(HTTPException) as error:
            await MODULE.eligible_services(bearer(profile="0"), None)
        self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(upstream.await_count, 1)

    async def test_failed_response_is_not_zero(self):
        for payload in ({"isSuccess": False, "data": {"items": [], "total": 0}}, {"data": {}}, {"data": {"items": [], "total": -1}}, {"data": {"items": [], "total": True}}):
            with self.subTest(payload=payload), patch.object(MODULE, "_customer_request", self.upstream(payload)), self.assertRaises(HTTPException) as error:
                await MODULE.eligible_services(bearer(), None)
            self.assertEqual(error.exception.status_code, 502)

    async def test_changed_or_stalled_pagination_is_not_partial_success(self):
        for second_page in (page(1, start=7, total=12), page(7, total=11), page(0, total=11)):
            with self.subTest(second_page=second_page), patch.object(MODULE, "_customer_request", self.upstream(page(7, total=11), second_page)), self.assertRaises(HTTPException) as error:
                await MODULE.eligible_services(bearer(), None)
            self.assertEqual(error.exception.status_code, 502)

    async def test_auth_failure_propagates(self):
        with patch.object(MODULE, "_customer_request", AsyncMock(side_effect=HTTPException(401, "expired"))), self.assertRaises(HTTPException) as error:
            await MODULE.eligible_services(bearer(), None)
        self.assertEqual(error.exception.status_code, 401)

    def test_openapi(self):
        operation = MODULE.app.openapi()["paths"]["/services/eligible"]["get"]
        self.assertTrue({"200", "401", "403", "422", "502", "503"}.issubset(operation["responses"]))
        self.assertEqual({p["name"] for p in operation["parameters"]}, {"authorization", "x-request-id"})
