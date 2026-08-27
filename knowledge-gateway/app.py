import os
import asyncio
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field


UPSTREAM_BASE_URL = os.getenv(
    "KNOWLEDGE_BASE_URL",
    "http://77.242.240.158:18085/api/platform/api/v1",
).rstrip("/")
TIMEOUT_SECONDS = float(os.getenv("KNOWLEDGE_TIMEOUT_SECONDS", "30"))
RETRY_ATTEMPTS = max(1, int(os.getenv("KNOWLEDGE_RETRY_ATTEMPTS", "3")))
UPSTREAM_MAX_TOP_K = max(1, int(os.getenv("KNOWLEDGE_UPSTREAM_MAX_TOP_K", "20")))
RETRIEVAL_MODES = tuple(
    mode.strip().lower()
    for mode in os.getenv("KNOWLEDGE_RETRIEVAL_MODES", "bm25,graph,vector").split(",")
    if mode.strip()
)

app = FastAPI(title="DSH Knowledge Gateway", version="0.1.0")


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2_000)
    folder_id: str = Field(min_length=1, max_length=128)
    top_k: int = Field(default=32, ge=1, le=100)


async def _request(method: str, path: str, *, params: dict[str, Any] | None = None, json: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> Any:
    last_error: Exception | None = None
    response: httpx.Response | None = None
    for attempt in range(RETRY_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                response = await client.request(method, f"{UPSTREAM_BASE_URL}{path}", params=params, json=json, headers=headers)
            if response.status_code not in {429, 502, 503, 504} or attempt == RETRY_ATTEMPTS - 1:
                break
            await asyncio.sleep(min(2 ** attempt, 4))
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt == RETRY_ATTEMPTS - 1:
                break
            await asyncio.sleep(min(2 ** attempt, 4))
    if response is None:
        raise HTTPException(status_code=503, detail={"code": "knowledge_upstream_unavailable", "message": str(last_error)[:500]}) from last_error

    if response.is_error:
        body: Any
        try:
            body = response.json()
        except ValueError:
            body = response.text[:2_000]
        raise HTTPException(
            status_code=502,
            detail={
                "code": "knowledge_upstream_error",
                "upstreamStatus": response.status_code,
                "body": body,
            },
        )
    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail={"code": "knowledge_invalid_upstream_response"}) from exc


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": "77-knowledge-proxy",
        "upstream": UPSTREAM_BASE_URL,
        "authMode": "public-anonymous-readonly",
        "publicAuthorizationRequired": False,
        "authenticatedBasePath": "/api/knowledge",
        "retrievalModes": list(RETRIEVAL_MODES),
        "defaultTopK": 32,
        "upstreamMaxTopK": UPSTREAM_MAX_TOP_K,
        "retryAttempts": RETRY_ATTEMPTS,
    }


@app.post("/search")
async def search(request: SearchRequest) -> Any:
    """Proxy the anonymous public search endpoint.

    The 77 public knowledge contract explicitly does not require an
    Authorization header.  DSH may still send a user token to this internal
    route, but it is deliberately not forwarded upstream.
    """
    # The public proxy accepts the MailGraph query shape.  The retrieval mode
    # hint is sent as an additive field so newer proxies can enable all three
    # routes (BM25, graph and vector) while older proxies keep compatibility.
    body = request.model_dump()
    # The DSH contract keeps a logical top_k of 32, while the current 77
    # anonymous proxy validates its upstream payload at <=20.  Cap only the
    # wire value here so requests do not become opaque 422/502 failures while
    # preserving the caller's requested value at the DSH boundary.
    body["top_k"] = min(request.top_k, UPSTREAM_MAX_TOP_K)
    body["retrieval_modes"] = list(RETRIEVAL_MODES)
    return await _request("POST", "/public/knowledge/search", json=body)


@app.get("/folders/tree")
async def folders_tree() -> Any:
    return await _request("GET", "/public/knowledge/folders/tree")


@app.get("/files")
async def files(
    folder_id: str | None = Query(default=None),
    recursive: bool = Query(default=False),
) -> Any:
    params: dict[str, Any] = {"recursive": str(recursive).lower()}
    if folder_id:
        params["folder_id"] = folder_id
    return await _request("GET", "/public/knowledge/files", params=params)


@app.get("/files/page")
async def files_page(
    folder_id: str | None = Query(default=None),
    recursive: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=10, le=100),
) -> Any:
    params: dict[str, Any] = {
        "recursive": str(recursive).lower(),
        "page": page,
        "page_size": page_size,
    }
    if folder_id:
        params["folder_id"] = folder_id
    return await _request("GET", "/public/knowledge/files/page", params=params)
