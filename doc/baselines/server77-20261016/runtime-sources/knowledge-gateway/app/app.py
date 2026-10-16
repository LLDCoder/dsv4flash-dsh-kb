import asyncio
import os
import uuid
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

UPSTREAM_BASE_URL = os.getenv("KNOWLEDGE_BASE_URL", "http://ai-generation-service:8091").rstrip("/")
PUBLIC_KNOWLEDGE_PATH = os.getenv("KNOWLEDGE_PUBLIC_PATH", "/public/knowledge").rstrip("/")
TIMEOUT_SECONDS = float(os.getenv("KNOWLEDGE_TIMEOUT_SECONDS", "30"))
RETRY_ATTEMPTS = max(1, int(os.getenv("KNOWLEDGE_RETRY_ATTEMPTS", "2")))
UPSTREAM_MAX_TOP_K = max(1, int(os.getenv("KNOWLEDGE_UPSTREAM_MAX_TOP_K", "20")))
RETRIEVAL_MODES = tuple(x.strip().lower() for x in os.getenv("KNOWLEDGE_RETRIEVAL_MODES", "bm25,graph,vector").split(",") if x.strip())

app = FastAPI(title="DSH Knowledge Gateway", version="0.3.0")


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2_000)
    folder_id: str = Field(min_length=1, max_length=128)
    top_k: int = Field(default=32, ge=1, le=100)


def _headers() -> dict[str, str]:
    # The 77 ``public/knowledge`` contract is anonymous. In particular, do
    # not synthesize ``Authorization: Bearer `` when no service token exists:
    # httpx rejects that malformed header before the request reaches 77 and
    # the gateway previously surfaced the client-side failure as HTTP 503.
    return {"X-Request-ID": str(uuid.uuid4())}


async def _request(method: str, path: str, *, params: dict[str, Any] | None = None, json: dict[str, Any] | None = None) -> Any:
    last_error: Exception | None = None
    for attempt in range(RETRY_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                response = await client.request(method, f"{UPSTREAM_BASE_URL}{path}", params=params, json=json, headers=_headers())
            if response.status_code not in {429, 502, 503, 504} or attempt == RETRY_ATTEMPTS - 1:
                break
            await asyncio.sleep(min(2 ** attempt, 2))
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt == RETRY_ATTEMPTS - 1:
                raise HTTPException(status_code=503, detail={"code": "knowledge_upstream_unavailable", "message": str(exc)[:500]}) from exc
            await asyncio.sleep(min(2 ** attempt, 2))
    if response.is_error:
        try:
            body = response.json()
        except ValueError:
            body = response.text[:2000]
        raise HTTPException(status_code=502, detail={"code": "knowledge_upstream_error", "upstreamStatus": response.status_code, "body": body})
    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail={"code": "knowledge_invalid_upstream_response"}) from exc


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": "dsh-knowledge-proxy",
        "upstream": UPSTREAM_BASE_URL,
        "upstreamPath": PUBLIC_KNOWLEDGE_PATH,
        "authMode": "anonymous-public",
        "retrievalModes": list(RETRIEVAL_MODES),
        "upstreamMaxTopK": UPSTREAM_MAX_TOP_K,
    }


@app.post("/search")
async def search(request: SearchRequest) -> Any:
    top_k = min(request.top_k, UPSTREAM_MAX_TOP_K)
    body = {
        "query": request.query,
        "folder_id": request.folder_id,
        "retrieval_modes": list(RETRIEVAL_MODES),
        "candidate_k": min(max(request.top_k, 10), 200),
        "top_k": top_k,
        "rerank": {"enabled": False, "top_n": top_k},
    }
    return await _request("POST", f"{PUBLIC_KNOWLEDGE_PATH}/search", json=body)


@app.get("/folders/tree")
async def folders_tree() -> Any:
    return await _request("GET", f"{PUBLIC_KNOWLEDGE_PATH}/folders/tree")


@app.get("/files")
async def files(folder_id: str | None = Query(default=None), recursive: bool = Query(default=False)) -> Any:
    params: dict[str, Any] = {"recursive": str(recursive).lower()}
    if folder_id:
        params["folder_id"] = folder_id
    return await _request("GET", f"{PUBLIC_KNOWLEDGE_PATH}/files", params=params)


@app.get("/files/page")
async def files_page(folder_id: str | None = Query(default=None), recursive: bool = Query(default=False), page: int = Query(default=1, ge=1), page_size: int = Query(default=20, ge=10, le=100)) -> Any:
    params: dict[str, Any] = {
        "recursive": str(recursive).lower(),
        "page": page,
        "page_size": page_size,
    }
    if folder_id:
        params["folder_id"] = folder_id
    return await _request("GET", f"{PUBLIC_KNOWLEDGE_PATH}/files/page", params=params)
