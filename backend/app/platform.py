from typing import Any

import httpx

from .config import Settings


class PlatformGatewayClient:
    """Client for the internal gateway backed by the 77 Swagger platform API."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.platform_gateway_url.rstrip("/")
        self.timeout = settings.platform_timeout_seconds
        self.api_key = settings.platform_api_key

    async def applications_page(self, page_index: int = 1, page_size: int = 100) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/applications/page",
                json={"pageIndex": page_index, "pageSize": page_size},
                headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else None,
            )
            response.raise_for_status()
            return response.json()
