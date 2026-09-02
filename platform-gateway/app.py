import asyncio
import hashlib
import logging
import os
import re
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, ConfigDict


UPSTREAM_BASE_URL = os.getenv(
    "PLATFORM_BASE_URL",
    "http://77.242.240.158:18085/api/platform",
).rstrip("/")
UMC_PORTAL = os.getenv("UMC_PORTAL", "customer").strip().lower()
CUSTOMER_BASE_URL = os.getenv("UMC_CUSTOMER_BASE_URL", "https://umc-customerportal.sol.daypop.ai").rstrip("/")
ADMIN_BASE_URL = os.getenv("UMC_ADMIN_BASE_URL", "https://umc-adminportal.sol.daypop.ai").rstrip("/")
PUBLIC_BASE_URL = os.getenv("UMC_PUBLIC_BASE_URL", "").rstrip("/")
UMC_BASE_URLS = {
    "customer": CUSTOMER_BASE_URL,
    "admin": ADMIN_BASE_URL,
    "public": PUBLIC_BASE_URL or CUSTOMER_BASE_URL,
}
UMC_BASE_URL = UMC_BASE_URLS.get(UMC_PORTAL, CUSTOMER_BASE_URL)
TIMEOUT_SECONDS = float(os.getenv("PLATFORM_TIMEOUT_SECONDS", "30"))
RETRY_ATTEMPTS = max(1, int(os.getenv("PLATFORM_RETRY_ATTEMPTS", "2")))

# Uvicorn configures this logger at INFO for container output.
logger = logging.getLogger("uvicorn.error")

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


def _token_ref(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16] if token else None


def _trace_id(request_id: str | None) -> str:
    return request_id.strip()[:128] if request_id and request_id.strip() else "-"


async def _umc_request(method: str, path: str, *, json: dict[str, Any] | None = None, params: dict[str, Any] | None = None, authorization: str | None = None, request_id: str | None = None) -> Any:
    forwarded = _require_umc_token(authorization)
    trace_id = _trace_id(request_id)
    token_ref = _token_ref(forwarded)
    logger.info(
        "umc_forward portal=%s request_id=%s token_ref=%s method=%s path=%s",
        UMC_PORTAL,
        trace_id,
        token_ref,
        method,
        path,
    )
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.request(
                method,
                f"{UMC_BASE_URL}{path}",
                json=json,
                params=params,
                headers={"Authorization": forwarded, "Content-Type": "application/json"},
            )
        logger.info(
            "umc_response portal=%s request_id=%s token_ref=%s method=%s path=%s status=%s",
            UMC_PORTAL,
            trace_id,
            token_ref,
            method,
            path,
            response.status_code,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code if exc.response.status_code in {401, 403, 404, 422} else 502
        raise HTTPException(status_code=status, detail={"code": "umc_upstream_error", "upstreamStatus": exc.response.status_code}) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail={"code": "umc_upstream_unavailable", "message": str(exc)[:500]}) from exc


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": "77-platform-swagger",
        "upstream": UPSTREAM_BASE_URL,
        "umcPortal": UMC_PORTAL,
        "umcUpstream": UMC_BASE_URL,
        "authMode": "umctoken-forwarded",
        "retryAttempts": RETRY_ATTEMPTS,
        "supportedOperations": ["data-access.application-detail", "data-access.book-by-isbn", "data-access.add-application", "applications.page", "licenses.query", "licenses.statistics", "licenses.action-needed", "swagger.document", "swagger.proxy"],
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


@app.post("/licenses-permits/query")
async def licenses_permits_query(payload: dict[str, Any], authorization: str | None = Header(default=None), x_request_id: str | None = Header(default=None)) -> Any:
    return await _umc_request("POST", "/api/licenses-permits/query", json=payload, authorization=authorization, request_id=x_request_id)


@app.get("/licenses/statistics")
async def licenses_statistics(authorization: str | None = Header(default=None), x_request_id: str | None = Header(default=None)) -> Any:
    return await _umc_request("GET", "/api/License/statistics", authorization=authorization, request_id=x_request_id)


@app.get("/licenses-permits/action-needed")
async def licenses_action_needed(authorization: str | None = Header(default=None), x_request_id: str | None = Header(default=None)) -> Any:
    return await _umc_request("GET", "/api/licenses-permits/action-needed", authorization=authorization, request_id=x_request_id)


class SwaggerProxyRequest(BaseModel):
    method: str
    path: str
    parameters: dict[str, Any] = Field(default_factory=dict)


def _upstream_parameters(parameters: dict[str, Any]) -> dict[str, Any]:
    """Remove DSH execution controls before forwarding to UMC.

    ``confirmed`` is consumed by DSH's Tool Gateway. ``action`` is consumed by
    its configuration-driven action mapper. Neither is a UMC API parameter.
    """

    result = dict(parameters)
    result.pop("confirmed", None)
    result.pop("action", None)
    return result


@app.post("/swagger/proxy")
async def swagger_proxy(request: SwaggerProxyRequest, authorization: str | None = Header(default=None), x_request_id: str | None = Header(default=None)) -> Any:
    """Proxy a published, validated operation for the configured UMC portal."""

    method = request.method.strip().upper()
    path = request.path.strip()
    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        raise HTTPException(status_code=422, detail={"code": "unsupported_http_method"})
    if not path.startswith("/api/") or "://" in path or "\\" in path:
        raise HTTPException(status_code=422, detail={"code": "invalid_umc_path"})
    parameters = _upstream_parameters(request.parameters)
    for parameter_name in re.findall(r"\{([^{}]+)\}", path):
        if parameter_name not in parameters:
            raise HTTPException(status_code=422, detail={"code": "missing_path_parameter", "parameter": parameter_name})
        path = path.replace("{" + parameter_name + "}", str(parameters.pop(parameter_name)))
    if method in {"GET", "DELETE"}:
        return await _umc_request(method, path, params=parameters, authorization=authorization, request_id=x_request_id)
    return await _umc_request(method, path, json=parameters, authorization=authorization, request_id=x_request_id)


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
