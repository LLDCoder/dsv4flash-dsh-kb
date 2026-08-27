import asyncio
import os
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, ConfigDict


UPSTREAM_BASE_URL = os.getenv(
    "PLATFORM_BASE_URL",
    "http://77.242.240.158:18085/api/platform",
).rstrip("/")
TIMEOUT_SECONDS = float(os.getenv("PLATFORM_TIMEOUT_SECONDS", "30"))
RETRY_ATTEMPTS = max(1, int(os.getenv("PLATFORM_RETRY_ATTEMPTS", "2")))

app = FastAPI(title="DSH Platform Swagger Gateway", version="0.1.0")


class ApplicationPageRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    page_index: int = Field(default=1, ge=1, alias="pageIndex")
    page_size: int = Field(default=100, ge=1, le=100, alias="pageSize")


async def _request(method: str, path: str, *, json: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> Any:
    last_error: Exception | None = None
    response: httpx.Response | None = None
    for attempt in range(RETRY_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                response = await client.request(method, f"{UPSTREAM_BASE_URL}{path}", json=json, headers=headers)
            if response.status_code not in {429, 502, 503, 504} or attempt == RETRY_ATTEMPTS - 1:
                break
            await asyncio.sleep(min(2**attempt, 4))
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt == RETRY_ATTEMPTS - 1:
                break
            await asyncio.sleep(min(2**attempt, 4))
    if response is None:
        raise HTTPException(status_code=503, detail={"code": "platform_upstream_unavailable", "message": str(last_error)[:500]}) from last_error
    if response.is_error:
        try:
            body = response.json()
        except ValueError:
            body = response.text[:2_000]
        status = response.status_code if response.status_code in {401, 403, 404, 422} else 502
        raise HTTPException(status_code=status, detail={"code": "platform_upstream_error", "upstreamStatus": response.status_code, "body": body})
    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail={"code": "platform_invalid_upstream_response"}) from exc


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": "77-platform-swagger",
        "upstream": UPSTREAM_BASE_URL,
        "retryAttempts": RETRY_ATTEMPTS,
        "supportedOperations": ["applications.page", "swagger.document"],
    }


@app.get("/swagger/document")
async def swagger_document(authorization: str | None = Header(default=None)) -> Any:
    return await _request("GET", "/api/v1/openapi.json", headers={"Authorization": authorization} if authorization else None)


@app.post("/applications/page")
async def applications_page(request: ApplicationPageRequest, authorization: str | None = Header(default=None)) -> Any:
    return await _request(
        "POST",
        "/api/MyRequest/ApplicationPage",
        json={"pageIndex": request.page_index, "pageSize": request.page_size},
        headers={"Authorization": authorization} if authorization else None,
    )
