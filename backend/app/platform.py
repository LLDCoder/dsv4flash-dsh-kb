from typing import Any

import httpx

from .config import Settings


class PlatformGatewayClient:
    """Client for the internal gateway backed by the 77 Swagger platform API."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.platform_gateway_url.rstrip("/")
        self.timeout = settings.platform_timeout_seconds

    @staticmethod
    def _headers(umc_token: str | None) -> dict[str, str] | None:
        return {"Authorization": f"Bearer {umc_token}"} if umc_token else None

    async def applications_page(self, page_index: int = 1, page_size: int = 100, *, umc_token: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/applications/page",
                json={"pageIndex": page_index, "pageSize": page_size},
                headers=self._headers(umc_token),
            )
            response.raise_for_status()
            return response.json()

    async def licenses_permits_query(self, request: dict[str, Any], *, umc_token: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/licenses-permits/query",
                json=request,
                headers=self._headers(umc_token),
            )
            response.raise_for_status()
            return response.json()

    async def licenses_statistics(self, *, umc_token: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/licenses/statistics",
                headers=self._headers(umc_token),
            )
            response.raise_for_status()
            return response.json()

    async def licenses_action_needed(self, *, umc_token: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/licenses-permits/action-needed",
                headers=self._headers(umc_token),
            )
            response.raise_for_status()
            return response.json()

    async def application_detail(self, application_id: int, *, umc_token: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/data-access/application-detail",
                json={"applicationId": application_id},
                headers=self._headers(umc_token),
            )
            response.raise_for_status()
            return response.json()

    async def book_by_isbn(self, isbn: str, *, umc_token: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/data-access/book-by-isbn",
                json={"isbn": isbn},
                headers=self._headers(umc_token),
            )
            response.raise_for_status()
            return response.json()

    async def add_application(self, parameters: dict[str, Any], *, umc_token: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/data-access/add-application",
                json={"parameters": parameters},
                headers=self._headers(umc_token),
            )
            response.raise_for_status()
            return response.json()

    async def invoke_swagger_tool(
        self,
        method: str,
        path: str,
        parameters: dict[str, Any] | None = None,
        *,
        umc_token: str | None = None,
    ) -> Any:
        """Execute a published customer Swagger operation through the gateway."""

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/swagger/proxy",
                json={"method": method, "path": path, "parameters": parameters or {}},
                headers=self._headers(umc_token),
            )
            response.raise_for_status()
            return response.json()
