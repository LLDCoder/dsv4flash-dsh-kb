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

PUBLISHED_ENDPOINTS = {
    "application-detail": "nma-application-detail",
    "book-by-isbn": "nma-book-by-isbn",
    "add-application": "nma-add-new-application",
}
DEFAULT_REQUESTED_FIELDS = ["isSuccess", "statusCode", "message", "data"]


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
        "authMode": "umctoken-forwarded",
        "retryAttempts": RETRY_ATTEMPTS,
        "supportedOperations": ["data-access.application-detail", "data-access.book-by-isbn", "data-access.add-application", "applications.page", "swagger.document"],
    }


def _require_umc_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer ") or not authorization[7:].strip():
        raise HTTPException(status_code=401, detail={"code": "umc_token_required", "message": "Authorization: Bearer <UMC_TOKEN> is required"})
    return authorization


async def _data_access(endpoint_code: str, parameters: dict[str, Any], authorization: str | None, requested_fields: list[str] | None = None) -> Any:
    forwarded = _require_umc_token(authorization)
    return await _request(
        "POST",
        f"/api/v1/public/data-access/{PUBLISHED_ENDPOINTS[endpoint_code]}",
        json={"parameters": parameters, "requested_fields": requested_fields or DEFAULT_REQUESTED_FIELDS},
        headers={"Authorization": forwarded, "Content-Type": "application/json"},
    )


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


class ApplicationDetailRequest(BaseModel):
    application_id: int = Field(ge=1, alias="applicationId")
    requested_fields: list[str] | None = Field(default=None, alias="requestedFields")


class BookByIsbnRequest(BaseModel):
    isbn: str = Field(min_length=10, max_length=32)
    requested_fields: list[str] | None = Field(default=None, alias="requestedFields")


class AddApplicationRequest(BaseModel):
    parameters: dict[str, Any]
    requested_fields: list[str] | None = Field(default=None, alias="requestedFields")


@app.post("/data-access/application-detail")
async def application_detail(request: ApplicationDetailRequest, authorization: str | None = Header(default=None)) -> Any:
    return await _data_access("application-detail", {"applicationId": request.application_id}, authorization, request.requested_fields)


@app.post("/data-access/book-by-isbn")
async def book_by_isbn(request: BookByIsbnRequest, authorization: str | None = Header(default=None)) -> Any:
    return await _data_access("book-by-isbn", {"isbn": request.isbn}, authorization, request.requested_fields)


@app.post("/data-access/add-application")
async def add_application(request: AddApplicationRequest, authorization: str | None = Header(default=None)) -> Any:
    parameters = dict(request.parameters)
    # Ordinary workflows may only create a controlled draft through this
    # gateway. Formal submission (type=1) is intentionally rejected here.
    if parameters.get("type") == 1:
        raise HTTPException(status_code=422, detail={"code": "formal_submission_not_allowed", "message": "type=1 is not allowed through the test/runtime gateway"})
    if parameters.get("type") not in {2, 3}:
        raise HTTPException(status_code=422, detail={"code": "unsupported_application_type", "message": "only type=2 update or type=3 draft is allowed"})
    if parameters.get("type") == 3 and parameters.get("isTest") is not True:
        raise HTTPException(status_code=422, detail={"code": "test_draft_required", "message": "new drafts must set type=3 and isTest=true"})
    if parameters.get("type") == 2 and not parameters.get("applicationId"):
        raise HTTPException(status_code=422, detail={"code": "application_id_required", "message": "draft updates require applicationId"})
    return await _data_access("add-application", parameters, authorization, request.requested_fields)
