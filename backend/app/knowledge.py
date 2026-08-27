import asyncio
from typing import Any

import httpx

from .config import Settings


class KnowledgeGatewayClient:
    """Client for the internal gateway that fronts the 77 knowledge proxy."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.knowledge_gateway_url.rstrip("/")
        self.timeout = settings.knowledge_timeout_seconds
        self.retry_attempts = max(1, settings.knowledge_retry_attempts)

    @staticmethod
    def _headers(umc_token: str | None) -> dict[str, str] | None:
        return {"Authorization": f"Bearer {umc_token}"} if umc_token else None

    async def _get(self, path: str, params: dict[str, Any] | None = None, *, umc_token: str | None = None) -> dict[str, Any]:
        headers = self._headers(umc_token)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.base_url}{path}", params=params or {}, headers=headers)
            response.raise_for_status()
            return response.json()

    async def _post(self, path: str, body: dict[str, Any], *, umc_token: str | None = None) -> dict[str, Any]:
        last_error: httpx.HTTPError | None = None
        headers = self._headers(umc_token)
        for attempt in range(self.retry_attempts):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(f"{self.base_url}{path}", json=body, headers=headers)
                if response.status_code in {429, 502, 503, 504} and attempt < self.retry_attempts - 1:
                    await asyncio.sleep(min(2**attempt, 4))
                    continue
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt >= self.retry_attempts - 1:
                    raise
                await asyncio.sleep(min(2**attempt, 4))
        raise last_error or RuntimeError("knowledge gateway request failed")

    async def search(self, query: str, folder_id: str, top_k: int = 32, *, umc_token: str | None = None) -> dict[str, Any]:
        # The gateway fans retrieval out to BM25, graph and vector routes.
        # Keep top_k explicit at the DSH boundary so model/tool callers cannot
        # silently fall back to the upstream's smaller default.
        return await self._post("/search", {"query": query, "folder_id": folder_id, "top_k": top_k}, umc_token=umc_token)

    async def folders_tree(self, *, umc_token: str | None = None) -> dict[str, Any]:
        return await self._get("/folders/tree", umc_token=umc_token)

    async def files(self, folder_id: str | None = None, recursive: bool = False, *, umc_token: str | None = None) -> dict[str, Any]:
        params: dict[str, Any] = {"recursive": str(recursive).lower()}
        if folder_id:
            params["folder_id"] = folder_id
        return await self._get("/files", params, umc_token=umc_token)

    async def files_page(self, folder_id: str | None = None, recursive: bool = False, page: int = 1, page_size: int = 20, *, umc_token: str | None = None) -> dict[str, Any]:
        params: dict[str, Any] = {"recursive": str(recursive).lower(), "page": page, "page_size": page_size}
        if folder_id:
            params["folder_id"] = folder_id
        return await self._get("/files/page", params, umc_token=umc_token)
