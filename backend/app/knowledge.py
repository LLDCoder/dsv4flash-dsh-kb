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
        self.api_key = settings.knowledge_api_key

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else None
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.base_url}{path}", params=params or {}, headers=headers)
            response.raise_for_status()
            return response.json()

    async def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        last_error: httpx.HTTPError | None = None
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else None
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

    async def search(self, query: str, folder_id: str, top_k: int = 32) -> dict[str, Any]:
        # The gateway fans retrieval out to BM25, graph and vector routes.
        # Keep top_k explicit at the DSH boundary so model/tool callers cannot
        # silently fall back to the upstream's smaller default.
        return await self._post("/search", {"query": query, "folder_id": folder_id, "top_k": top_k})

    async def folders_tree(self) -> dict[str, Any]:
        return await self._get("/folders/tree")

    async def files(self, folder_id: str | None = None, recursive: bool = False) -> dict[str, Any]:
        params: dict[str, Any] = {"recursive": str(recursive).lower()}
        if folder_id:
            params["folder_id"] = folder_id
        return await self._get("/files", params)

    async def files_page(self, folder_id: str | None = None, recursive: bool = False, page: int = 1, page_size: int = 20) -> dict[str, Any]:
        params: dict[str, Any] = {"recursive": str(recursive).lower(), "page": page, "page_size": page_size}
        if folder_id:
            params["folder_id"] = folder_id
        return await self._get("/files/page", params)
