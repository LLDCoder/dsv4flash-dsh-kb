from typing import Any

import httpx

from .config import Settings
from .reader_limits import effective_platform_timeout


class PlatformGatewayClient:
    """Client for the isolated Admin Portal reader gateway."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.platform_gateway_url.rstrip("/")
        self.timeout = effective_platform_timeout(settings.platform_timeout_seconds)
        self.user_info_url = settings.umc_user_info_endpoint
        self.portal_base_url = settings.umc_base_url

    @staticmethod
    def _headers(
        umc_token: str | None,
        request_id: str | None = None,
        user_id: str | None = None,
    ) -> dict[str, str] | None:
        headers = {"Authorization": f"Bearer {umc_token}"} if umc_token else {}
        if request_id:
            # This is a correlation id, not a user-supplied authentication value.
            headers["X-Request-ID"] = request_id[:128]
        if user_id:
            headers["X-User-ID"] = user_id[:128]
        return headers or None

    async def get_user_info(self, *, umc_token: str | None = None, request_id: str | None = None) -> dict[str, Any]:
        """Read the authoritative role and permission context for this turn."""

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False) as client:
            response = await client.post(
                self.user_info_url,
                headers=self._headers(umc_token, request_id),
            )
            response.raise_for_status()
            return response.json()

    async def admin_portal_read(
        self,
        request: dict[str, Any],
        *,
        umc_token: str | None = None,
        request_id: str | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Execute a validated browser-read plan through the isolated gateway."""

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/admin/portal/read",
                json=request,
                headers=self._headers(umc_token, request_id, user_id),
            )
            response.raise_for_status()
            return response.json()
