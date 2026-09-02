"""Tool Registry primitives and OpenAPI operation extraction."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlsplit

from .profile_scope import infer_profile_scope


HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}
SYSTEM_DEFAULT_TOOL_NAMES = frozenset({"knowledge.search", "ocr.layout_parsing"})

# Business Tools are maintained in tool_registry. Do not seed portal-specific
# endpoints from code: the Admin Swagger import and Tool management UI own
# their schemas, lifecycle, and access policy.
DEFAULT_TOOL_DEFINITIONS: tuple[dict[str, Any], ...] = ()
DEFAULT_BUSINESS_TOOL_DEFINITIONS: tuple[dict[str, Any], ...] = ()


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
            path = str(raw_path)
            operation_id = str(operation.get("operationId") or f"{method}_{str(raw_path).strip('/').replace('/', '_').replace('{', '').replace('}', '')}")
            summary = str(operation.get("summary") or operation.get("description") or operation_id)
            parameters = _schema_from_request(operation)
            result.append(
                {
                    "operationId": operation_id,
                    "displayName": summary[:256],
                    "description": str(operation.get("description") or summary),
                    "httpMethod": method.upper(),
                    "httpPath": path,
                    "interfaceKey": interface_key(method, path),
                    "parameters": parameters,
                    "responseSchema": _response_schema(operation),
                    "profileScope": infer_profile_scope(parameters, path),
                    "swaggerSource": source_url,
                }
            )
    return result
