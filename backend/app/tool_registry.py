"""Tool Registry primitives and OpenAPI operation extraction."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlsplit
import re


HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}
SYSTEM_DEFAULT_TOOL_NAMES = frozenset({"knowledge.search", "ocr.layout_parsing"})


DEFAULT_TOOL_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "tool_name": "ocr.layout_parsing",
        "display_name": "Parse an attached document",
        "description": "Read-only OCR and layout extraction for an attached PDF or image.",
        "operation_id": "ocr_layout_parsing",
        "http_method": "POST",
        "http_path": "/ocr/layout-parsing",
        "parameters": {"type": "object", "properties": {"file": {"type": "string"}, "fileType": {"type": "integer"}}, "required": ["file"]},
        "auth_strategy": "trusted_principal",
        "source": "builtin",
    },
    {
        "tool_name": "knowledge.search",
        "display_name": "Search UMC knowledge",
        "description": "Read-only search over the configured UMC knowledge collection.",
        "operation_id": "knowledge_search",
        "http_method": "POST",
        "http_path": "/knowledge/search",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "folder_id": {"type": "string"}, "top_k": {"type": "integer"}}, "required": ["query", "folder_id"]},
        "auth_strategy": "current_umc_bearer_token",
        "source": "builtin",
    },
    {
        "tool_name": "umc.applications",
        "display_name": "List my applications",
        "description": "Read-only list of applications belonging to the current UMC account.",
        "operation_id": "application_page",
        "http_method": "POST",
        "http_path": "/api/MyRequest/ApplicationPage",
        "parameters": {"type": "object", "properties": {"pageIndex": {"type": "integer", "minimum": 1}, "pageSize": {"type": "integer", "minimum": 1, "maximum": 100}}},
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {
        "tool_name": "umc.application_detail",
        "display_name": "Get application detail",
        "description": "Read-only detail for a selected UMC application.",
        "operation_id": "application_detail",
        "http_method": "GET",
        "http_path": "/api/MyRequest/ApplicationDetail/{applicationId}",
        "parameters": {"type": "object", "properties": {"applicationId": {"type": "integer", "minimum": 1}}, "required": ["applicationId"]},
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {
        "tool_name": "umc.application_payment_detail",
        "display_name": "Get application payment details",
        "description": "Read-only payment details for a selected My Requests application; never starts or confirms payment.",
        "operation_id": "application_payment_detail",
        "http_method": "GET",
        "http_path": "/api/payment-center/service-applications/{applicationId}/payment",
        "parameters": {"type": "object", "properties": {"applicationId": {"type": "integer", "minimum": 1}}, "required": ["applicationId"]},
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {
        "tool_name": "umc.book_by_isbn",
        "display_name": "Look up a book by ISBN",
        "description": "Read-only UMC book lookup by ISBN string.",
        "operation_id": "book_by_isbn",
        "http_method": "GET",
        "http_path": "/api/books/by-isbn",
        "parameters": {"type": "object", "properties": {"isbn": {"type": "string", "minLength": 10}}, "required": ["isbn"]},
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {
        "tool_name": "umc.add_application",
        "display_name": "Create or update a controlled draft",
        "description": "Controlled draft write operation; formal submission is not allowed and explicit confirmation is required.",
        "operation_id": "add_application",
        "http_method": "POST",
        "http_path": "/data-access/add-application",
        "parameters": {"type": "object", "properties": {"parameters": {"type": "object"}, "confirmed": {"type": "boolean"}}, "required": ["parameters", "confirmed"]},
        "auth_strategy": "current_umc_bearer_token",
        "side_effect": "write",
        "confirmation_required": True,
        "source": "builtin",
    },
    {
        "tool_name": "umc.licenses.list",
        "display_name": "List my licenses and permits",
        "description": "Read-only list of the current user's issued License and Permit records.",
        "operation_id": "licenses_permits_query",
        "http_method": "POST",
        "http_path": "/api/licenses-permits/query",
        "parameters": {"type": "object", "properties": {"statuses": {"type": "array"}, "documentTypes": {"type": "array"}, "pageIndex": {"type": "integer"}, "pageSize": {"type": "integer"}, "sortBy": {"type": "string"}, "sortDirection": {"type": "integer"}}},
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {
        "tool_name": "umc.licenses.statistics",
        "display_name": "Get license statistics",
        "description": "Read-only count and summary statistics for the current user's issued licenses and permits.",
        "operation_id": "license_statistics",
        "http_method": "GET",
        "http_path": "/api/License/statistics",
        "parameters": {"type": "object", "properties": {}},
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {
        "tool_name": "umc.licenses.action_needed",
        "display_name": "List license actions needed",
        "description": "Read-only list of licenses and permits requiring renewal or other action.",
        "operation_id": "licenses_action_needed",
        "http_method": "GET",
        "http_path": "/api/licenses-permits/action-needed",
        "parameters": {"type": "object", "properties": {}},
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {
        "tool_name": "umc.licenses.detail",
        "display_name": "Get issued license or permit document details",
        "description": "Read-only details for a selected issued License or Permit.",
        "operation_id": "license_detail",
        "http_method": "GET",
        "http_path": "/api/license/{id}",
        "parameters": {"type": "object", "properties": {"id": {"type": "string", "minLength": 1}}, "required": ["id"]},
        "masking_policy": "hide:certificateUrl,certificateWithHeaderUrl,pdfPassword",
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {
        "tool_name": "umc.licenses.action_validate",
        "display_name": "Validate an issued license action",
        "description": "Read-only validation of whether the current user may renew, modify, cancel, transfer, or manage a selected License or Permit.",
        "operation_id": "licenses_action_validate",
        "http_method": "POST",
        "http_path": "/api/licenses-permits/actions/validate",
        "parameters": {
            "type": "object",
            "properties": {
                "documentId": {"type": "string", "minLength": 1},
                "documentType": {"type": "string", "enum": ["LICENSE", "PERMIT"]},
                "action": {"type": "string", "enum": ["RENEW", "MODIFY", "CANCEL", "TRANSFER", "PARTNER_MANAGEMENT", "DOWNLOAD"]},
            },
            "required": ["documentId", "documentType", "action"],
        },
        "auth_strategy": "current_umc_bearer_token",
        "source": "swagger",
    },
    {"tool_name": "umc.pending-actions", "display_name": "List pending actions", "description": "Read-only pending actions for the current account.", "operation_id": "pending_actions", "http_method": "GET", "http_path": "/api/MyRequest/PendingActions", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
    {"tool_name": "umc.collected-services", "display_name": "List collected services", "description": "Read-only services available to the current account.", "operation_id": "collect_service_list", "http_method": "GET", "http_path": "/api/HomePage/CollectServiceList", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
    {"tool_name": "umc.service-categories", "display_name": "List service categories", "description": "Read-only UMC service categories.", "operation_id": "service_categories", "http_method": "GET", "http_path": "/api/Service/ServiceCategories", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
    {"tool_name": "umc.payments", "display_name": "List payment transactions", "description": "Read-only payment transaction records for the current account.", "operation_id": "payment_transactions", "http_method": "GET", "http_path": "/api/payment-center/transactions", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
    {"tool_name": "umc.pending-violations", "display_name": "List pending violations", "description": "Read-only pending media violations for the current account.", "operation_id": "pending_violations", "http_method": "GET", "http_path": "/api/Appeal/PendingViolations", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
    {"tool_name": "umc.appeal-reasons", "display_name": "List appeal reasons", "description": "Read-only appeal reason options.", "operation_id": "appeal_reasons", "http_method": "GET", "http_path": "/api/Appeal/Reasons", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
    {"tool_name": "umc.enquiries", "display_name": "List enquiries", "description": "Read-only enquiries for the current account.", "operation_id": "enquiry_list", "http_method": "GET", "http_path": "/api/Enquiry/List", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
    {"tool_name": "umc.enquiry-applications", "display_name": "List enquiry applications", "description": "Read-only applications available for enquiry follow-up.", "operation_id": "enquiry_applications", "http_method": "GET", "http_path": "/api/Enquiry/Applications", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
    {"tool_name": "umc.enquiry-types", "display_name": "List enquiry types", "description": "Read-only enquiry type options.", "operation_id": "enquiry_types", "http_method": "GET", "http_path": "/api/Enquiry/EnquiryTypes", "auth_strategy": "current_umc_bearer_token", "source": "swagger"},
)

DEFAULT_BUSINESS_TOOL_DEFINITIONS: tuple[dict[str, Any], ...] = tuple(
    definition for definition in DEFAULT_TOOL_DEFINITIONS if definition["tool_name"] not in SYSTEM_DEFAULT_TOOL_NAMES
)


def is_system_default_tool(tool_name: str) -> bool:
    return str(tool_name).strip() in SYSTEM_DEFAULT_TOOL_NAMES


def system_default_tool_definitions(settings: Any) -> list[dict[str, Any]]:
    """Build the two non-persisted capabilities from live runtime config."""

    knowledge_enabled = bool(str(getattr(settings, "knowledge_gateway_url", "") or "").strip())
    ocr_enabled = bool(str(getattr(settings, "ocr_gateway_url", "") or "").strip())
    knowledge_folder = str(getattr(settings, "knowledge_default_folder_id", "") or "")
    knowledge_top_k = int(getattr(settings, "knowledge_top_k", 32) or 32)
    return [
        {
            "toolName": "knowledge.search",
            "displayName": "Search UMC knowledge",
            "description": "Read-only search over the configured UMC knowledge collection.",
            "operationId": "knowledge_search",
            "httpMethod": "POST",
            "httpPath": "/knowledge/search",
            "interfaceKey": "POST /knowledge/search",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "folder_id": {"type": "string", "default": knowledge_folder},
                    "top_k": {"type": "integer", "default": knowledge_top_k},
                },
                "required": ["query", "folder_id"],
            },
            "responseSchema": {},
            "authStrategy": "current_umc_bearer_token",
            "sideEffect": "read",
            "confirmationRequired": False,
            "source": "runtime_config",
            "toolType": "system_default",
            "enabled": knowledge_enabled,
            "published": knowledge_enabled,
            "mutable": False,
        },
        {
            "toolName": "ocr.layout_parsing",
            "displayName": "Parse an attached document",
            "description": "Read-only OCR and layout extraction for an attached PDF or image.",
            "operationId": "ocr_layout_parsing",
            "httpMethod": "POST",
            "httpPath": "/ocr/layout-parsing",
            "interfaceKey": "POST /ocr/layout-parsing",
            "parameters": {
                "type": "object",
                "properties": {"file": {"type": "string"}, "fileType": {"type": "integer"}},
                "required": ["file"],
            },
            "responseSchema": {},
            "authStrategy": "trusted_principal",
            "sideEffect": "read",
            "confirmationRequired": False,
            "source": "runtime_config",
            "toolType": "system_default",
            "enabled": ocr_enabled,
            "published": ocr_enabled,
            "mutable": False,
        },
    ]


def interface_key(method: str, path: str) -> str:
    raw_path = str(path).strip()
    if "://" in raw_path:
        raw_path = urlsplit(raw_path).path
    normalized_path = "/" + "/".join(part for part in raw_path.split("/") if part)
    return f"{str(method).strip().upper()} {normalized_path.lower()}"


def _schema_from_request(operation: dict[str, Any]) -> dict[str, Any]:
    properties: dict[str, Any] = {}
    required: list[str] = []
    for parameter in operation.get("parameters", []) or []:
        if not isinstance(parameter, dict) or not parameter.get("name"):
            continue
        name = str(parameter["name"])
        properties[name] = parameter.get("schema") or {"type": "string"}
        if parameter.get("required"):
            required.append(name)
    request_body = operation.get("requestBody") or {}
    content = request_body.get("content") if isinstance(request_body, dict) else None
    if isinstance(content, dict):
        media = content.get("application/json") or next(iter(content.values()), {})
        schema = media.get("schema") if isinstance(media, dict) else None
        if isinstance(schema, dict):
            if "$ref" in schema:
                properties.setdefault("body", schema)
            else:
                properties.update(schema.get("properties", {}))
                required.extend(schema.get("required", []))
    result: dict[str, Any] = {"type": "object", "properties": properties}
    if required:
        result["required"] = sorted(set(required))
    return result


def _response_schema(operation: dict[str, Any]) -> dict[str, Any]:
    responses = operation.get("responses") or {}
    success = responses.get("200") or responses.get("201") or next(iter(responses.values()), {})
    content = success.get("content") if isinstance(success, dict) else None
    if isinstance(content, dict):
        media = content.get("application/json") or next(iter(content.values()), {})
        schema = media.get("schema") if isinstance(media, dict) else None
        if isinstance(schema, dict):
            return schema
    return {}


def extract_operations(document: dict[str, Any], source_url: str) -> list[dict[str, Any]]:
    """Extract model-facing operation definitions from OpenAPI 3 documents."""

    result: list[dict[str, Any]] = []
    for raw_path, path_item in (document.get("paths") or {}).items():
        if not isinstance(path_item, dict):
            continue
        for raw_method, operation in path_item.items():
            method = str(raw_method).lower()
            if method not in HTTP_METHODS or not isinstance(operation, dict):
                continue
            # The gateway always targets the configured UMC Portal. Ignore an
            # OpenAPI server host so imported definitions cannot redirect
            # customer calls to an arbitrary origin.
            path = str(raw_path)
            operation_id = str(operation.get("operationId") or f"{method}_{str(raw_path).strip('/').replace('/', '_').replace('{', '').replace('}', '')}")
            summary = str(operation.get("summary") or operation.get("description") or operation_id)
            result.append(
                {
                    "operationId": operation_id,
                    "displayName": summary[:256],
                    "description": str(operation.get("description") or summary),
                    "httpMethod": method.upper(),
                    "httpPath": path,
                    "interfaceKey": interface_key(method, path),
                    "parameters": _schema_from_request(operation),
                    "responseSchema": _response_schema(operation),
                    "swaggerSource": source_url,
                }
            )
    return result


def build_legacy_tool_request(
    allowed_tools: list[str],
    text: str,
    *,
    mode: str = "answer",
    skill_id: str | None = None,
) -> tuple[str, dict[str, Any]] | None:
    """Build compatibility requests from published Skill tools.

    This keeps old deterministic flows working while making the Skill's
    published allowed-tools list the source of truth instead of route fields.
    Knowledge retrieval is intentionally handled separately by the runtime.
    """

    if "umc.application_detail" in allowed_tools:
        match = re.search(r"(?:application\s*(?:id|number)?|申请(?:详情|ID)?)[\s:#-]*(\d{1,12})\b", text, re.IGNORECASE)
        if match:
            return "umc.application_detail", {"applicationId": int(match.group(1))}
    if "umc.book_by_isbn" in allowed_tools:
        match = re.search(r"\b(?:97[89][\d\s-]{9,20}|\d[\d\s-]{9,20})\b", text)
        if match:
            isbn = re.sub(r"[\s-]", "", match.group(0))
            if len(isbn) >= 10:
                return "umc.book_by_isbn", {"isbn": isbn}
    if "umc.application_payment_detail" in allowed_tools:
        match = re.search(r"(?:application\s*(?:id|number)?|申请(?:详情|ID)?)[\s:#-]*(\d{1,12})\b", text, re.IGNORECASE)
        if match and any(term in text.lower() for term in ("payment", "pending payment", "付款", "支付", "الدفع")):
            return "umc.application_payment_detail", {"applicationId": int(match.group(1))}
    if "umc.applications" in allowed_tools and any(term in text.lower() for term in ("pending payment", "waiting for payment", "awaiting payment", "待付款", "الدفع المعلق", "قيد الدفع")):
        return "umc.applications", {"pageIndex": 1, "pageSize": 100}
    if mode == "answer" and "umc.applications" in allowed_tools:
        return "umc.applications", {"pageIndex": 1, "pageSize": 100}
    return None
