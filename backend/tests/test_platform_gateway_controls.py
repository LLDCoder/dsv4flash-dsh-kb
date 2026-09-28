import importlib.util
import base64
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch


MODULE_PATH = Path(__file__).resolve().parents[2] / "platform-gateway" / "app.py"
SPEC = importlib.util.spec_from_file_location("dsh_platform_gateway", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class PlatformGatewayControlTests(unittest.TestCase):
    @staticmethod
    def bearer_with_claims(claims):
        payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
        return f"Bearer header.{payload}.signature"

    def test_token_profile_id_uses_live_umc_selection_claim(self):
        self.assertEqual(MODULE._token_profile_id(self.bearer_with_claims({"UserProFileId": "9337"})), "9337")
        self.assertEqual(MODULE._token_profile_id(self.bearer_with_claims({"UserProFileId": 0})), "0")
        self.assertIsNone(MODULE._token_profile_id("Bearer invalid"))

    def test_token_user_type_id_accepts_supported_nonzero_claims(self):
        self.assertEqual(MODULE._token_user_type_id(self.bearer_with_claims({"UserTypeID": "2"})), "2")
        self.assertEqual(MODULE._token_user_type_id(self.bearer_with_claims({"UserTypeId": 3})), "3")
        self.assertEqual(MODULE._token_user_type_id(self.bearer_with_claims({"userTypeId": "4"})), "4")
        self.assertIsNone(MODULE._token_user_type_id(self.bearer_with_claims({"UserTypeID": "0"})))
        self.assertIsNone(MODULE._token_user_type_id(self.bearer_with_claims({"UserTypeID": "GLOBAL"})))

    def test_selected_profile_entry_returns_only_the_token_selected_profile(self):
        identity = {
            "data": {
                "userInvitation": {"userProfileId": "9353", "name": "Peter"},
                "userEstablishments": [
                    {"userProfileId": "9337", "id": 9, "nameEn": "Commercial DP"},
                    {"userProfileId": "9347", "id": 16, "nameEn": "Government UMC"},
                ],
            }
        }
        selected = MODULE._selected_profile_entry(identity, "9337")
        self.assertEqual(selected["profileKind"], "establishment")
        self.assertEqual(selected["nameEn"], "Commercial DP")
        self.assertIsNone(MODULE._selected_profile_entry(identity, "9999"))

    def test_selected_establishment_details_match_establishment_id_not_profile_list_order(self):
        payload = {"data": {"items": [{"id": 16, "nameEn": "Government UMC"}, {"id": 9, "nameEn": "Commercial DP"}]}}
        self.assertEqual(MODULE._selected_establishment_details(payload, 9)["nameEn"], "Commercial DP")

    def test_profile_payload_removes_identifiers_credentials_and_license_numbers(self):
        payload = {
            "id": 9,
            "userProfileId": "9335",
            "licenseNumber": "301000000000008785",
            "identityNumber": "784199000000000",
            "nameEn": "Test Commercial",
            "status": "Approved",
            "expiryDate": "2999-12-31",
            "nested": {"documentNo": "DOC-123", "token": "secret-token", "isValid": True},
        }
        result = MODULE._redact_profile_payload(payload)
        self.assertEqual(
            result,
            {
                "nameEn": "Test Commercial",
                "status": "Approved",
                "expiryDate": "2999-12-31",
                "nested": {"isValid": True},
            },
        )

    def test_confirmed_is_not_forwarded_to_umc(self):
        self.assertEqual(
            MODULE._upstream_parameters({"appealId": 13, "confirmed": True}),
            {"appealId": 13},
        )

    def test_business_fields_are_preserved(self):
        payload = {
            "violationId": 30,
            "reasonId": 3,
            "remark": "Evidence dispute",
            "attachmentUrl1": "evidence.pdf",
        }
        self.assertEqual(MODULE._upstream_parameters(payload), payload)

    def test_media_licensing_endpoint_is_documented(self):
        operation = MODULE.app.openapi()["paths"]["/services/media-licensing/eligible"]["get"]
        self.assertEqual(operation["operationId"], "media_licensing_eligible_services_services_media_licensing_eligible_get")
        self.assertTrue(any(parameter.get("name") == "authorization" for parameter in operation["parameters"]))
        self.assertIn("200", operation["responses"])
        self.assertIn("401", operation["responses"])
        self.assertIn("422", operation["responses"])
        self.assertIn("502", operation["responses"])

    def test_profile_summary_openapi_documents_privacy_safe_contract(self):
        operation = MODULE.app.openapi()["paths"]["/profiles/summary"]["get"]
        self.assertIn("privacy-safe", operation["summary"].lower())
        self.assertNotIn(
            "selectedProfileId",
            MODULE.app.openapi()["components"]["schemas"]["ProfileSummaryResponse"]["properties"],
        )


class ProfileSummaryPrivacyTests(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def bearer_with_claims(claims):
        payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
        return f"Bearer header.{payload}.signature"

    async def test_profile_summary_never_returns_identifiers_or_credentials(self):
        identity = {
            "data": {
                "UserID": "customer-user-id",
                "userEstablishments": [
                    {
                        "id": 9,
                        "userTypeId": 2,
                        "authorityId": 12,
                        "parentId": 5,
                        "establishmentTypeId": 7,
                        "nationalityId": 784,
                        "userProfileId": "9335",
                        "nameEn": "Test Commercial",
                        "status": "Approved",
                    }
                ],
            }
        }
        details = {
            "data": {
                "items": [
                    {
                        "id": 9,
                        "licenseNumber": "301000000000008785",
                        "documentNumber": "DOC-123",
                        "establishmentUrl": "/internal/establishments/9",
                        "licenseCopyUrl": "/documents/license-9.pdf",
                        "memorandumOfAssociationCopyUrl": "/documents/moa-9.pdf",
                        "powerOfAttorneyCopyUrl": "/documents/poa-9.pdf",
                        "officialLetterUrl": "/documents/letter-9.pdf",
                        "status": "Approved",
                        "hasValidLicense": True,
                        "expiryDate": "2026-07-31",
                        "profileUpdateTime": "2026-09-06T10:00:00Z",
                    }
                ]
            }
        }
        with (
            patch.object(MODULE, "_customer_request", new=AsyncMock(return_value=identity)),
            patch.object(MODULE, "_profile_read", new=AsyncMock(return_value=("ok", details))),
        ):
            result = await MODULE.profile_summary(
                authorization=self.bearer_with_claims({"UserProFileId": "9335"}),
                x_request_id="privacy-test",
            )

        payload = result.model_dump(by_alias=True)
        encoded = json.dumps(payload)
        self.assertNotIn("selectedProfileId", payload)
        self.assertNotIn("9335", encoded)
        self.assertNotIn("customer-user-id", encoded)
        self.assertNotIn("301000000000008785", encoded)
        self.assertNotIn("DOC-123", encoded)
        for forbidden_key in (
            "userTypeId",
            "authorityId",
            "parentId",
            "establishmentTypeId",
            "nationalityId",
            "establishmentUrl",
            "licenseCopyUrl",
            "memorandumOfAssociationCopyUrl",
            "powerOfAttorneyCopyUrl",
            "officialLetterUrl",
        ):
            self.assertNotIn(forbidden_key, encoded)
        self.assertEqual(payload["selectedProfile"]["status"], "Approved")
        self.assertEqual(payload["selectedProfileDetails"]["expiryDate"], "2026-07-31")
        self.assertTrue(payload["selectedProfileDetails"]["hasValidLicense"])
        self.assertEqual(payload["selectedProfileDetails"]["profileUpdateTime"], "2026-09-06T10:00:00Z")


class MediaLicensingEligibilityTests(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def bearer_with_claims(claims):
        payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
        return f"Bearer header.{payload}.signature"

    @staticmethod
    def identity(user_type_id=4):
        return {
            "data": {
                "userEstablishments": [
                    {
                        "userProfileId": "9337",
                        "id": 9,
                        "nameEn": "Daisy Profile",
                        "userTypeId": user_type_id,
                    }
                ]
            }
        }

    @patch.object(MODULE, "_customer_request", new_callable=AsyncMock)
    async def test_uses_selected_profile_user_type_and_returns_normalized_services(self, customer_request):
        customer_request.side_effect = [
            self.identity(),
            {"data": [{"id": 4, "code": "NPO", "nameEn": "Non-Profit Organization"}]},
            {
                "data": {
                    "items": [
                        {
                            "id": 3416,
                            "code": "ML-3416",
                            "nameEn": "Issue a Media Activity License",
                            "nameAr": "Arabic service name",
                            "typeEn": "License",
                            "typeAr": "Arabic type",
                            "isPublic": True,
                            "ignoredInternalField": "not returned",
                        }
                    ],
                    "totalCount": 1,
                }
            },
        ]
        result = await MODULE.media_licensing_eligible_services(
            authorization=self.bearer_with_claims({"UserProFileId": "9337"}),
            x_request_id="request-1",
        )

        self.assertEqual(result.selected_profile_id, "9337")
        self.assertEqual(result.profile_user_type["code"], "NPO")
        self.assertEqual(result.total, 1)
        self.assertEqual(result.services[0].name_en, "Issue a Media Activity License")
        self.assertFalse(hasattr(result.services[0], "ignoredInternalField"))

        service_page_call = customer_request.await_args_list[2]
        self.assertEqual(service_page_call.args[:2], ("POST", "/api/Service/ServicePage"))
        self.assertEqual(service_page_call.kwargs["json"]["serviceCategoryId"], 244)
        self.assertEqual(service_page_call.kwargs["json"]["userTypeCodes"], ["NPO"])

    @patch.object(MODULE, "_customer_request", new_callable=AsyncMock)
    async def test_empty_catalogue_is_a_successful_zero_result(self, customer_request):
        customer_request.side_effect = [
            self.identity(),
            {"data": [{"id": 4, "code": "4", "nameEn": "Non-Profit Organization"}]},
            {"data": {"items": [], "totalCount": 0}},
        ]
        result = await MODULE.media_licensing_eligible_services(
            authorization=self.bearer_with_claims({"UserProFileId": "9337"}),
            x_request_id="request-2",
        )
        self.assertEqual(result.total, 0)
        self.assertEqual(result.services, [])

    @patch.object(MODULE, "_customer_request", new_callable=AsyncMock)
    async def test_stale_profile_uses_valid_token_user_type(self, customer_request):
        customer_request.side_effect = [
            self.identity(),
            {"data": [{"id": 2, "code": "2", "nameEn": "Commercial"}]},
            {"data": {"items": [{"id": 3416, "nameEn": "Issue a Media Activity License"}]}},
        ]
        result = await MODULE.media_licensing_eligible_services(
            authorization=self.bearer_with_claims({"UserProFileId": "9999", "UserTypeID": "2"}),
            x_request_id="request-stale-profile",
        )
        self.assertEqual(result.selected_profile_id, "9999")
        self.assertEqual(result.profile_user_type["code"], "2")
        self.assertEqual(result.total, 1)
        self.assertEqual(customer_request.await_args_list[2].kwargs["json"]["userTypeCodes"], ["2"])

    @patch.object(MODULE, "_customer_request", new_callable=AsyncMock)
    async def test_stale_profile_without_valid_token_user_type_remains_422(self, customer_request):
        customer_request.return_value = self.identity()
        with self.assertRaises(MODULE.HTTPException) as raised:
            await MODULE.media_licensing_eligible_services(
                authorization=self.bearer_with_claims({"UserProFileId": "9999", "UserTypeID": "0"}),
                x_request_id="request-stale-profile-no-type",
            )
        self.assertEqual(raised.exception.status_code, 422)
        self.assertEqual(raised.exception.detail["code"], "selected_profile_not_available")
        self.assertEqual(customer_request.await_count, 1)

    @patch.object(MODULE, "_customer_request", new_callable=AsyncMock)
    async def test_global_view_requires_profile_selection(self, customer_request):
        customer_request.return_value = self.identity()
        with self.assertRaises(MODULE.HTTPException) as raised:
            await MODULE.media_licensing_eligible_services(
                authorization=self.bearer_with_claims({"UserProFileId": "0"}),
                x_request_id="request-3",
            )
        self.assertEqual(raised.exception.status_code, 422)
        self.assertEqual(raised.exception.detail["code"], "profile_selection_required")
        self.assertEqual(customer_request.await_count, 1)


if __name__ == "__main__":
    unittest.main()
