import asyncio
import base64
import hashlib
import json
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
CUSTOMER_BASE_URL = os.getenv("UMC_CUSTOMER_BASE_URL", "https://umc-customerportal.sol.daypop.ai").rstrip("/")
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


class ProfileSummaryResponse(BaseModel):
    """Privacy-safe status summary for the Profile selected in the UMC token."""

    model_config = ConfigDict(populate_by_name=True)
    scope: str
    selected_profile: dict[str, Any] | None = Field(default=None, alias="selectedProfile", description="Profile type and status fields with identifiers and credentials removed")
    selected_profile_details: dict[str, Any] | None = Field(default=None, alias="selectedProfileDetails", description="Additional status and validity fields with identifiers and credentials removed")
    sources: dict[str, str]
    limitations: list[str]


class MediaLicensingServiceResponse(BaseModel):
    """A normalized service returned by the Customer Portal catalogue."""

    id: int | str | None = None
    code: str | None = None
    name_en: str | None = Field(default=None, alias="nameEn")
    name_ar: str | None = Field(default=None, alias="nameAr")
    type_en: str | None = Field(default=None, alias="typeEn")
    type_ar: str | None = Field(default=None, alias="typeAr")
    is_public: bool | None = Field(default=None, alias="isPublic")


class MediaLicensingEligibilityResponse(BaseModel):
    """Read-only services available to the Profile selected in the UMC token."""

    model_config = ConfigDict(populate_by_name=True)
    scope: str
    selected_profile_id: str = Field(alias="selectedProfileId")
    category_id: int = Field(default=244, alias="categoryId")
    profile_user_type: dict[str, Any] = Field(alias="profileUserType")
    total: int
    services: list[MediaLicensingServiceResponse]
    limitations: list[str]


class AvailableServiceResponse(MediaLicensingServiceResponse):
    category_id: int | str | None = Field(default=None, alias="categoryId")
    category_name_en: str | None = Field(default=None, alias="categoryNameEn")
    category_name_ar: str | None = Field(default=None, alias="categoryNameAr")


class AvailableServicesResponse(BaseModel):
    """Complete current-Profile catalogue, without personal identifiers."""

    model_config = ConfigDict(populate_by_name=True)
    scope: str
    category_id: int = Field(default=0, alias="categoryId")
    profile_user_type: dict[str, Any] = Field(alias="profileUserType")
    total: int = Field(ge=0)
    services: list[AvailableServiceResponse]
    limitations: list[str]


PROFILE_STATUS_FIELD_ALLOWLIST = frozenset(
    {
        "profilekind",
        "nameen",
        "namear",
        "profilenameen",
        "profilenamear",
        "establishmentnameen",
        "establishmentnamear",
        "status",
        "statuscode",
        "profilestatus",
        "reviewstatus",
        "reviewstage",
        "approvalstatus",
        "isactive",
        "active",
        "isapproved",
        "underreview",
        "hasvalidlicense",
        "isvalid",
        "valid",
        "licenseexpirydate",
        "expirydate",
        "expirationdate",
        "profileupdatetime",
        "updatedat",
        "lastupdatedat",
    }
)


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


def _token_profile_id(authorization: str | None) -> str | None:
    """Read the current UMC Profile selection from the bearer-token claims.

    The value is used only to select a record returned by UMC for the same
    bearer token.  The endpoint never accepts a caller-supplied Profile ID.
    """

    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        token = authorization[7:].strip()
        part = token.split(".")[1]
        part += "=" * (-len(part) % 4)
        claims = json.loads(base64.urlsafe_b64decode(part).decode("utf-8"))
        for key in ("UserProFileId", "UserProfileId", "userProfileId"):
            if key not in claims:
                continue
            value = claims[key]
            return str(value).strip() if isinstance(value, (str, int)) and str(value).strip() else None
        return None
    except (IndexError, ValueError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def _token_user_type_id(authorization: str | None) -> str | None:
    """Read a valid, non-global UMC user type from the bearer-token claims."""

    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        token = authorization[7:].strip()
        part = token.split(".")[1]
        part += "=" * (-len(part) % 4)
        claims = json.loads(base64.urlsafe_b64decode(part).decode("utf-8"))
        for key in ("UserTypeID", "UserTypeId", "userTypeId"):
            if key not in claims:
                continue
            value = claims[key]
            normalized = str(value).strip() if isinstance(value, (str, int)) else ""
            return normalized if normalized.isdigit() and int(normalized) > 0 else None
        return None
    except (IndexError, ValueError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def _trace_id(request_id: str | None) -> str:
    return request_id.strip()[:128] if request_id and request_id.strip() else "-"


async def _customer_request(method: str, path: str, *, json: dict[str, Any] | None = None, params: dict[str, Any] | None = None, authorization: str | None = None, request_id: str | None = None) -> Any:
    forwarded = _require_umc_token(authorization)
    trace_id = _trace_id(request_id)
    token_ref = _token_ref(forwarded)
    logger.info(
        "customer_forward request_id=%s token_ref=%s method=%s path=%s",
        trace_id,
        token_ref,
        method,
        path,
    )
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.request(
                method,
                f"{CUSTOMER_BASE_URL}{path}",
                json=json,
                params=params,
                headers={"Authorization": forwarded, "Content-Type": "application/json"},
            )
        logger.info(
            "customer_response request_id=%s token_ref=%s method=%s path=%s status=%s",
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
        raise HTTPException(status_code=status, detail={"code": "customer_upstream_error", "upstreamStatus": exc.response.status_code}) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail={"code": "customer_upstream_unavailable", "message": str(exc)[:500]}) from exc


def _find_user_id(value: Any) -> str | None:
    """Find the authenticated UMC user id in its live identity response only."""

    if isinstance(value, dict):
        for key in ("UserID", "UserId", "userId", "userID"):
            candidate = value.get(key)
            if isinstance(candidate, (str, int)) and str(candidate).strip():
                return str(candidate).strip()
        for child in value.values():
            found = _find_user_id(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_user_id(child)
            if found:
                return found
    return None


def _redact_profile_payload(value: Any) -> Any:
    """Return only allowlisted display-name, status, validity, and date fields."""

    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for key, item in value.items():
            normalized = re.sub(r"[^a-z0-9]", "", str(key).casefold())
            redacted_item = _redact_profile_payload(item) if isinstance(item, (dict, list)) else item
            if normalized in PROFILE_STATUS_FIELD_ALLOWLIST:
                result[str(key)] = redacted_item
                continue
            if isinstance(item, (dict, list)) and redacted_item:
                result[str(key)] = redacted_item
        return result
    if isinstance(value, list):
        redacted_items = [_redact_profile_payload(item) for item in value]
        return [item for item in redacted_items if item not in ({}, [])]
    return None


def _payload_data(value: Any) -> Any:
    return value.get("data") if isinstance(value, dict) and "data" in value else value


def _selected_profile_entry(identity: Any, profile_id: str) -> dict[str, Any] | None:
    """Find the selected individual or establishment entry in GetUserInfo."""

    data = _payload_data(identity)
    if not isinstance(data, dict):
        return None
    invitation = data.get("userInvitation")
    if isinstance(invitation, dict) and str(invitation.get("userProfileId") or "").strip() == profile_id:
        return {"profileKind": "individual", **invitation}
    for item in data.get("userEstablishments") or []:
        if isinstance(item, dict) and str(item.get("userProfileId") or "").strip() == profile_id:
            return {"profileKind": "establishment", **item}
    return None


def _selected_establishment_details(payload: Any, establishment_id: Any) -> dict[str, Any] | None:
    data = _payload_data(payload)
    items = data.get("items") if isinstance(data, dict) else None
    if not isinstance(items, list):
        return None
    return next(
        (item for item in items if isinstance(item, dict) and str(item.get("id")) == str(establishment_id)),
        None,
    )


def _selected_profile_user_type_id(profile: dict[str, Any]) -> str | None:
    for key in ("userTypeId", "userTypeID", "UserTypeId", "UserTypeID"):
        value = profile.get(key)
        if isinstance(value, (str, int)) and str(value).strip():
            return str(value).strip()
    user_type = profile.get("userType")
    if isinstance(user_type, dict):
        value = user_type.get("id") or user_type.get("userTypeId")
        if isinstance(value, (str, int)) and str(value).strip():
            return str(value).strip()
    return None


def _user_type_entry(payload: Any, user_type_id: str) -> dict[str, Any] | None:
    data = _payload_data(payload)
    items = data if isinstance(data, list) else data.get("items") if isinstance(data, dict) else None
    if not isinstance(items, list):
        return None
    return next(
        (
            item
            for item in items
            if isinstance(item, dict)
            and str(item.get("id") or item.get("userTypeId") or "").strip() == user_type_id
        ),
        None,
    )


def _service_items(payload: Any) -> list[dict[str, Any]]:
    data = _payload_data(payload)
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if not isinstance(data, dict):
        return []
    for key in ("items", "records", "services", "result", "results"):
        items = data.get(key)
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
    return []


def _normalize_media_licensing_service(item: dict[str, Any]) -> MediaLicensingServiceResponse:
    def value(*keys: str) -> Any:
        return next((item[key] for key in keys if key in item), None)

    return MediaLicensingServiceResponse(
        id=value("id", "serviceId"),
        code=str(value("code", "serviceCode")) if value("code", "serviceCode") is not None else None,
        nameEn=value("nameEn", "serviceNameEn", "name"),
        nameAr=value("nameAr", "serviceNameAr"),
        typeEn=value("typeEn", "serviceTypeEn"),
        typeAr=value("typeAr", "serviceTypeAr"),
        isPublic=value("isPublic"),
    )


async def _profile_read(
    label: str,
    method: str,
    path: str,
    *,
    authorization: str | None,
    request_id: str | None,
    params: dict[str, Any] | None = None,
) -> tuple[str, Any]:
    """Collect an optional Profile source without turning partial read loss into a write/retry flow."""

    try:
        return "ok", await _customer_request(
            method,
            path,
            params=params,
            authorization=authorization,
            request_id=request_id,
        )
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        return "unavailable", {
            "source": label,
            "status": exc.status_code,
            "code": detail.get("code", "profile_source_unavailable"),
        }


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": "77-platform-swagger",
        "upstream": UPSTREAM_BASE_URL,
        "customerUpstream": CUSTOMER_BASE_URL,
        "authMode": "umctoken-forwarded",
        "retryAttempts": RETRY_ATTEMPTS,
        "supportedOperations": ["data-access.application-detail", "data-access.book-by-isbn", "data-access.add-application", "applications.page", "licenses.query", "licenses.statistics", "licenses.action-needed", "profiles.summary", "services.media-licensing.eligible", "services.eligible", "swagger.document", "swagger.proxy"],
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
    return await _customer_request("POST", "/api/licenses-permits/query", json=payload, authorization=authorization, request_id=x_request_id)


@app.get("/licenses/statistics")
async def licenses_statistics(authorization: str | None = Header(default=None), x_request_id: str | None = Header(default=None)) -> Any:
    return await _customer_request("GET", "/api/License/statistics", authorization=authorization, request_id=x_request_id)


@app.get("/licenses-permits/action-needed")
async def licenses_action_needed(authorization: str | None = Header(default=None), x_request_id: str | None = Header(default=None)) -> Any:
    return await _customer_request("GET", "/api/licenses-permits/action-needed", authorization=authorization, request_id=x_request_id)


@app.get(
    "/profiles/summary",
    response_model=ProfileSummaryResponse,
    summary="Get a privacy-safe summary of the selected Profile",
    description="Returns non-sensitive Profile type, review status, validity, and expiry information. Full identity, Profile, establishment, license, document, credential, and token values are never returned.",
    responses={
        200: {"description": "Non-sensitive Profile status summary; identifiers and credentials are omitted"},
        401: {"description": "UMC bearer token is missing or invalid"},
        502: {"description": "Customer Portal profile source failed"},
    },
)
async def profile_summary(authorization: str | None = Header(default=None), x_request_id: str | None = Header(default=None)) -> ProfileSummaryResponse:
    """Read only the Profile currently selected in the authenticated UMC session.

    The selection is taken from the UMC token's ``UserProFileId`` claim, then
    matched only against records returned by Customer Portal for that same
    bearer token.  In Global View no individual Profile is selected.
    """

    identity = await _customer_request(
        "POST",
        "/api/User/GetUserInfo",
        json={},
        authorization=authorization,
        request_id=x_request_id,
    )
    user_id = _find_user_id(identity)
    if not user_id:
        raise HTTPException(status_code=502, detail={"code": "customer_identity_missing"})

    selected_profile_id = _token_profile_id(authorization)
    if not selected_profile_id or selected_profile_id == "0":
        return ProfileSummaryResponse(
            scope="global_view",
            sources={"currentIdentity": "ok"},
            limitations=[
                "No Profile is currently selected because the UMC session is in Global View.",
                "Select an individual or establishment Profile in Customer Portal and retry.",
            ],
        )

    selected_profile = _selected_profile_entry(identity, selected_profile_id)
    if not selected_profile:
        return ProfileSummaryResponse(
            scope="selected_profile_not_available",
            sources={"currentIdentity": "ok"},
            limitations=[
                "The Profile in the live UMC token was not returned by Customer Portal.",
                "Refresh the portal session, reselect the Profile, and retry.",
            ],
        )

    profile_kind = str(selected_profile.get("profileKind") or "")
    if profile_kind == "individual":
        source, detail_payload = await _profile_read(
            "individualProfile", "GET", "/api/User/GetUserIndividual",
            params={"userId": user_id}, authorization=authorization, request_id=x_request_id,
        )
        details = _payload_data(detail_payload) if source == "ok" else None
        sources = {"currentIdentity": "ok", "individualProfile": source}
    else:
        source, establishments_payload = await _profile_read(
            "establishmentProfiles", "GET", f"/api/User/GetUserEstablishmentsList/{user_id}",
            params={"pageIndex": 1, "pageSize": 100}, authorization=authorization, request_id=x_request_id,
        )
        details = _selected_establishment_details(establishments_payload, selected_profile.get("id")) if source == "ok" else None
        sources = {"currentIdentity": "ok", "establishmentProfiles": source}

    return ProfileSummaryResponse(
        scope="current_selected_umc_profile",
        selectedProfile=_redact_profile_payload(selected_profile),
        selectedProfileDetails=_redact_profile_payload(details) if details else None,
        sources=sources,
        limitations=[
            "No user or Profile identifier is accepted from the caller.",
            "The selected Profile is derived from the live UMC token, not from a client-supplied selector.",
            "Sensitive identity, Profile, establishment, license, document, credential, and token values are intentionally omitted.",
            "Official identifiers can be reviewed securely on the My Account page in Customer Portal.",
        ],
    )


@app.get(
    "/services/media-licensing/eligible",
    response_model=MediaLicensingEligibilityResponse,
    responses={
        401: {"description": "UMC bearer token is missing or invalid"},
        422: {"description": "No usable Profile is selected in the current UMC session"},
        502: {"description": "Customer Portal identity, user type, or service data is invalid"},
        503: {"description": "Customer Portal is unavailable"},
    },
)
async def media_licensing_eligible_services(
    authorization: str | None = Header(default=None, description="Current UMC bearer token"),
    x_request_id: str | None = Header(default=None),
) -> MediaLicensingEligibilityResponse:
    """List Media Licensing services for the Profile selected in the current token.

    The caller cannot supply a user, Profile, or user-type selector. The live
    UMC identity and selected Profile are the only authority for this query.
    """

    identity = await _customer_request(
        "POST",
        "/api/User/GetUserInfo",
        json={},
        authorization=authorization,
        request_id=x_request_id,
    )
    selected_profile_id = _token_profile_id(authorization)
    if not selected_profile_id or selected_profile_id == "0":
        raise HTTPException(
            status_code=422,
            detail={
                "code": "profile_selection_required",
                "message": "Select an individual or establishment Profile in Customer Portal and retry.",
            },
        )

    selected_profile = _selected_profile_entry(identity, selected_profile_id)
    user_type_id = (
        _selected_profile_user_type_id(selected_profile)
        if selected_profile
        else _token_user_type_id(authorization)
    )
    if not selected_profile and not user_type_id:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "selected_profile_not_available",
                "message": "The Profile selected in the UMC token is no longer available. Select another Profile in Customer Portal and retry.",
            },
        )
    if not user_type_id:
        raise HTTPException(status_code=502, detail={"code": "selected_profile_user_type_missing"})

    user_types_payload = await _customer_request(
        "GET",
        "/api/ServiceInfo/GetAllUserType",
        authorization=authorization,
        request_id=x_request_id,
    )
    user_type = _user_type_entry(user_types_payload, user_type_id)
    user_type_code = user_type.get("code") if user_type else None
    if not isinstance(user_type_code, (str, int)) or not str(user_type_code).strip():
        raise HTTPException(
            status_code=502,
            detail={"code": "selected_profile_user_type_not_mapped", "userTypeId": user_type_id},
        )
    user_type_code = str(user_type_code).strip()

    services_payload = await _customer_request(
        "POST",
        "/api/Service/ServicePage",
        json={
            "pageSize": 100,
            "pageIndex": 1,
            "sortBy": "",
            "sortDirection": 0,
            "nameEn": "",
            "nameAr": "",
            "serviceCategoryId": 244,
            "featured": False,
            "favorite": False,
            "userTypeCodes": [user_type_code],
        },
        authorization=authorization,
        request_id=x_request_id,
    )
    services = [_normalize_media_licensing_service(item) for item in _service_items(services_payload)]
    return MediaLicensingEligibilityResponse(
        scope="current_selected_umc_profile",
        selectedProfileId=selected_profile_id,
        categoryId=244,
        profileUserType={
            "id": user_type.get("id", user_type_id),
            "code": user_type_code,
            "nameEn": user_type.get("nameEn"),
            "nameAr": user_type.get("nameAr"),
        },
        total=len(services),
        services=services,
        limitations=[
            "Results apply only to the Profile selected in the current UMC session.",
            "The catalogue result is not a binding legal eligibility decision.",
        ],
    )


def _catalogue_page(payload: Any) -> tuple[list[dict[str, Any]], int]:
    """Require a real list and total; malformed data must not become an empty catalogue."""
    if not isinstance(payload, dict) or payload.get("isSuccess") is False:
        raise HTTPException(status_code=502, detail={"code": "customer_service_catalogue_invalid"})
    data = _payload_data(payload)
    items = next((data[key] for key in ("items", "records", "services", "result", "results") if isinstance(data, dict) and key in data), None)
    total = next((data[key] for key in ("total", "totalCount", "totalRecords") if isinstance(data, dict) and key in data), None)
    if not isinstance(items, list) or not all(isinstance(item, dict) for item in items):
        raise HTTPException(status_code=502, detail={"code": "customer_service_catalogue_invalid"})
    if isinstance(total, bool) or not isinstance(total, (int, str)) or not str(total).isdigit():
        raise HTTPException(status_code=502, detail={"code": "customer_service_catalogue_total_missing"})
    return items, int(total)


def _normalize_available_service(item: dict[str, Any]) -> AvailableServiceResponse:
    category = item.get("serviceCategory") or item.get("category") or {}
    if not isinstance(category, dict):
        category = {}
    return AvailableServiceResponse(
        **_normalize_media_licensing_service(item).model_dump(by_alias=True),
        categoryId=item.get("serviceCategoryId", item.get("categoryId", category.get("id"))),
        categoryNameEn=item.get("serviceCategoryNameEn", item.get("categoryNameEn", category.get("nameEn"))),
        categoryNameAr=item.get("serviceCategoryNameAr", item.get("categoryNameAr", category.get("nameAr"))),
    )


@app.get(
    "/services/eligible",
    response_model=AvailableServicesResponse,
    summary="List all catalogue services available to the current Profile",
    description="Read-only Customer Portal ServicePage query across all categories. Profile and user type are derived from the authenticated UMC session; caller-supplied identity selectors are not accepted. All pages are retrieved (up to 100 pages). This is catalogue availability, not final application approval.",
    responses={
        401: {"description": "UMC bearer token is missing or invalid"},
        403: {"description": "The current UMC session is not authorized"},
        422: {"description": "Select a usable individual or establishment Profile"},
        502: {"description": "Invalid upstream data or incomplete/inconsistent catalogue pagination"},
        503: {"description": "Customer Portal is unavailable"},
    },
)
async def eligible_services(
    authorization: str | None = Header(default=None, description="Current UMC bearer token"),
    x_request_id: str | None = Header(default=None),
) -> AvailableServicesResponse:
    forwarded = _require_umc_token(authorization)
    identity = await _customer_request("POST", "/api/User/GetUserInfo", json={}, authorization=forwarded, request_id=x_request_id)
    selected_profile_id = _token_profile_id(forwarded)
    if not selected_profile_id or selected_profile_id == "0":
        raise HTTPException(status_code=422, detail={"code": "profile_selection_required", "message": "Select a Profile in Customer Portal and retry."})
    selected_profile = _selected_profile_entry(identity, selected_profile_id)
    user_type_id = _selected_profile_user_type_id(selected_profile) if selected_profile else _token_user_type_id(forwarded)
    if not user_type_id or user_type_id == "0":
        raise HTTPException(status_code=422, detail={"code": "selected_profile_not_available", "message": "Reselect the current Profile in Customer Portal and retry."})
    types = await _customer_request("GET", "/api/ServiceInfo/GetAllUserType", authorization=forwarded, request_id=x_request_id)
    user_type = _user_type_entry(types, user_type_id)
    code = user_type.get("code") if user_type else None
    if isinstance(code, bool) or not isinstance(code, (str, int)) or not str(code).strip():
        raise HTTPException(status_code=502, detail={"code": "selected_profile_user_type_not_mapped"})

    services: list[AvailableServiceResponse] = []
    seen: set[str] = set()
    expected_total: int | None = None
    for page_index in range(1, 101):
        payload = await _customer_request(
            "POST", "/api/Service/ServicePage",
            json={"pageSize": 100, "pageIndex": page_index, "sortBy": "", "sortDirection": 0,
                  "nameEn": "", "nameAr": "", "serviceCategoryId": 0, "featured": False,
                  "favorite": False, "userTypeCodes": [str(code).strip()]},
            authorization=forwarded, request_id=x_request_id,
        )
        items, total = _catalogue_page(payload)
        if expected_total is not None and total != expected_total:
            raise HTTPException(status_code=502, detail={"code": "customer_service_catalogue_changed", "message": "The service catalogue changed during pagination. Retry the query."})
        expected_total = total
        for item in items:
            service = _normalize_available_service(item)
            key = str(service.id) if service.id is not None else service.code
            if key is None or key in seen:
                raise HTTPException(status_code=502, detail={"code": "customer_service_catalogue_pagination_invalid"})
            seen.add(key)
            services.append(service)
        if len(services) == total:
            break
        if not items or len(services) > total:
            raise HTTPException(status_code=502, detail={"code": "customer_service_catalogue_incomplete"})
    else:
        raise HTTPException(status_code=502, detail={"code": "customer_service_catalogue_page_limit"})

    return AvailableServicesResponse(
        scope="current_profile_available_services", categoryId=0,
        profileUserType={"id": user_type.get("id", user_type_id), "code": str(code).strip(), "nameEn": user_type.get("nameEn"), "nameAr": user_type.get("nameAr")},
        total=expected_total, services=services,
        limitations=["Results apply only to the Profile selected in the current UMC session.", "The catalogue includes all service categories and is not a binding legal eligibility decision."],
    )


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
    """Proxy a published, validated customer operation without per-tool routes."""

    method = request.method.strip().upper()
    path = request.path.strip()
    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        raise HTTPException(status_code=422, detail={"code": "unsupported_http_method"})
    if not path.startswith("/api/") or "://" in path or "\\" in path:
        raise HTTPException(status_code=422, detail={"code": "invalid_customer_path"})
    parameters = _upstream_parameters(request.parameters)
    for parameter_name in re.findall(r"\{([^{}]+)\}", path):
        if parameter_name not in parameters:
            raise HTTPException(status_code=422, detail={"code": "missing_path_parameter", "parameter": parameter_name})
        path = path.replace("{" + parameter_name + "}", str(parameters.pop(parameter_name)))
    if method in {"GET", "DELETE"}:
        return await _customer_request(method, path, params=parameters, authorization=authorization, request_id=x_request_id)
    return await _customer_request(method, path, json=parameters, authorization=authorization, request_id=x_request_id)


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
