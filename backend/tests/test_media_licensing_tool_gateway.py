import unittest
from unittest.mock import AsyncMock

import httpx

from app.principal import Principal
from app.tool_gateway import ToolGateway


class MediaLicensingToolGatewayTests(unittest.IsolatedAsyncioTestCase):
    async def test_preserves_structured_profile_selection_error(self):
        platform = AsyncMock()
        response = httpx.Response(
            422,
            json={
                "detail": {
                    "code": "profile_selection_required",
                    "message": "Select an individual or establishment Profile in Customer Portal and retry.",
                }
            },
            request=httpx.Request("GET", "http://platform-gateway/services/media-licensing/eligible"),
        )
        platform.media_licensing_eligible_services.side_effect = httpx.HTTPStatusError(
            "profile selection required",
            request=response.request,
            response=response,
        )
        gateway = ToolGateway(AsyncMock(), AsyncMock(), platform)
        principal = Principal(
            user_id="customer-user",
            tenant_id="customer-tenant",
            request_id="request-profile-selection",
            umc_token="token",
        )

        result = await gateway.invoke(
            principal,
            "umc.media-licensing.eligible-services",
            {},
            allowed_tools=["umc.media-licensing.eligible-services"],
        )

        self.assertEqual(result["status"], 422)
        self.assertEqual(result["code"], "profile_selection_required")
        self.assertEqual(
            result["message"],
            "Select an individual or establishment Profile in Customer Portal and retry.",
        )

    async def test_preserves_structured_stale_profile_error(self):
        platform = AsyncMock()
        response = httpx.Response(
            422,
            json={
                "detail": {
                    "code": "selected_profile_not_available",
                    "message": "The selected Profile is no longer available.",
                }
            },
            request=httpx.Request("GET", "http://platform-gateway/services/media-licensing/eligible"),
        )
        platform.media_licensing_eligible_services.side_effect = httpx.HTTPStatusError(
            "selected profile unavailable",
            request=response.request,
            response=response,
        )
        gateway = ToolGateway(AsyncMock(), AsyncMock(), platform)
        principal = Principal(
            user_id="customer-user",
            tenant_id="customer-tenant",
            request_id="request-stale-profile",
            umc_token="token",
        )

        result = await gateway.invoke(
            principal,
            "umc.media-licensing.eligible-services",
            {},
            allowed_tools=["umc.media-licensing.eligible-services"],
        )

        self.assertEqual(result["status"], 422)
        self.assertEqual(result["code"], "selected_profile_not_available")
        self.assertEqual(result["message"], "The selected Profile is no longer available.")

    async def test_unknown_422_remains_generic_tool_error(self):
        platform = AsyncMock()
        response = httpx.Response(
            422,
            json={"detail": {"code": "unexpected_validation_error"}},
            request=httpx.Request("GET", "http://platform-gateway/services/media-licensing/eligible"),
        )
        platform.media_licensing_eligible_services.side_effect = httpx.HTTPStatusError(
            "validation error",
            request=response.request,
            response=response,
        )
        gateway = ToolGateway(AsyncMock(), AsyncMock(), platform)
        principal = Principal(
            user_id="customer-user",
            tenant_id="customer-tenant",
            request_id="request-validation-error",
            umc_token="token",
        )

        result = await gateway.invoke(
            principal,
            "umc.media-licensing.eligible-services",
            {},
            allowed_tools=["umc.media-licensing.eligible-services"],
        )

        self.assertEqual(result["status"], 422)
        self.assertEqual(result["code"], "tool_error")


if __name__ == "__main__":
    unittest.main()
