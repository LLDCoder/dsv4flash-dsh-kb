import json
from typing import Any

import httpx

from .knowledge import KnowledgeGatewayClient
from .ocr import OCRGatewayClient
from .platform import PlatformGatewayClient
from .principal import Principal
from .tool_registry import SYSTEM_DEFAULT_TOOL_NAMES


class ToolGateway:
    """Only DSH Runtime calls this boundary; clients do not call OCR directly."""

    def __init__(self, ocr: OCRGatewayClient, knowledge: KnowledgeGatewayClient, platform: PlatformGatewayClient) -> None:
        self.ocr = ocr
        self.knowledge = knowledge
        self.platform = platform

    @staticmethod
    def _validate_schema(arguments: dict[str, Any], schema: dict[str, Any]) -> str | None:
        if not isinstance(arguments, dict) or not isinstance(schema, dict):
            return "arguments must be an object"
        properties = schema.get("properties") if isinstance(schema.get("properties"), dict) else {}
        for name in schema.get("required", []) or []:
            if name not in arguments:
                return f"missing required parameter: {name}"
        for name, value in arguments.items():
            spec = properties.get(name)
            if not isinstance(spec, dict):
                continue
            expected = spec.get("type")
            if expected == "string" and not isinstance(value, str):
                return f"{name} must be a string"
            if expected == "integer" and (isinstance(value, bool) or not isinstance(value, int)):
                return f"{name} must be an integer"
            if expected == "number" and (isinstance(value, bool) or not isinstance(value, (int, float))):
                return f"{name} must be a number"
            if expected == "boolean" and not isinstance(value, bool):
                return f"{name} must be a boolean"
            if expected == "array" and not isinstance(value, list):
                return f"{name} must be an array"
            if isinstance(spec.get("enum"), list) and value not in spec["enum"]:
                return f"{name} must be one of {spec['enum']}"
        return None

    async def _invoke_registered_tool(self, principal: Principal, tool_name: str, arguments: dict[str, Any], definition: dict[str, Any]) -> dict[str, Any]:
        schema = definition.get("parameters") or {}
        invalid = self._validate_schema(arguments, schema)
        if invalid:
            return {"ok": False, "code": "invalid_arguments", "toolName": tool_name, "message": invalid}
        if definition.get("sideEffect", definition.get("side_effect", "read")) != "read" and definition.get("confirmationRequired", definition.get("confirmation_required", False)) and arguments.get("confirmed") is not True:
            return {"ok": False, "code": "confirmation_required", "toolName": tool_name}
        method = definition.get("httpMethod", definition.get("http_method"))
        path = definition.get("httpPath", definition.get("http_path"))
        if not isinstance(method, str) or not isinstance(path, str) or not path.startswith("/api/"):
            return {"ok": False, "code": "tool_not_executable", "toolName": tool_name}
        try:
            result = await self.platform.invoke_swagger_tool(method, path, arguments, umc_token=principal.umc_token)
            return {"ok": True, "code": "ok", "toolName": tool_name, "result": result}
        except httpx.HTTPStatusError as exc:
            code = "permission_denied" if exc.response.status_code in {401, 403} else "tool_error"
            return {"ok": False, "code": code, "toolName": tool_name, "status": exc.response.status_code}
        except httpx.HTTPError as exc:
            return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}

    async def invoke(
        self,
        principal: Principal,
        tool_name: str,
        arguments: dict[str, Any],
        *,
        allowed_tools: list[str] | None = None,
        tool_definition: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if allowed_tools is not None and tool_name not in allowed_tools:
            return {"ok": False, "code": "tool_not_allowed_for_skill", "toolName": tool_name}
        if tool_definition and tool_name not in SYSTEM_DEFAULT_TOOL_NAMES and tool_definition.get("source") in {"swagger", "ops"}:
            return await self._invoke_registered_tool(principal, tool_name, arguments, tool_definition)
        if tool_name != "ocr.layout_parsing":
            if tool_name == "knowledge.search":
                query = arguments.get("query")
                folder_id = arguments.get("folder_id") or arguments.get("folderId")
                if not isinstance(query, str) or not query or not isinstance(folder_id, str) or not folder_id:
                    return {"ok": False, "code": "invalid_arguments", "toolName": tool_name, "required": ["query", "folder_id"]}
                try:
                    raw_top_k = arguments.get("top_k", arguments.get("topK", 32))
                    try:
                        top_k = int(raw_top_k)
                    except (TypeError, ValueError):
                        return {"ok": False, "code": "invalid_arguments", "toolName": tool_name, "message": "top_k must be an integer"}
                    if top_k < 1 or top_k > 100:
                        return {"ok": False, "code": "invalid_arguments", "toolName": tool_name, "message": "top_k must be between 1 and 100"}
                    result = await self.knowledge.search(query, folder_id, top_k, umc_token=principal.umc_token)
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": result}
                except httpx.HTTPStatusError as exc:
                    code = "permission_denied" if exc.response.status_code == 403 else "tool_error"
                    return {"ok": False, "code": code, "toolName": tool_name, "status": exc.response.status_code}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            if tool_name == "knowledge.folders_tree":
                try:
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": await self.knowledge.folders_tree(umc_token=principal.umc_token)}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            if tool_name == "knowledge.files":
                try:
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": await self.knowledge.files(arguments.get("folder_id") or arguments.get("folderId"), bool(arguments.get("recursive", False)), umc_token=principal.umc_token)}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            if tool_name == "knowledge.files_page":
                try:
                    result = await self.knowledge.files_page(arguments.get("folder_id") or arguments.get("folderId"), bool(arguments.get("recursive", False)), int(arguments.get("page", 1)), int(arguments.get("page_size", arguments.get("pageSize", 20))), umc_token=principal.umc_token)
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": result}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            if tool_name == "umc.add_application":
                try:
                    parameters = arguments.get("parameters")
                    if not isinstance(parameters, dict):
                        return {"ok": False, "code": "invalid_arguments", "toolName": tool_name, "required": ["parameters"]}
                    if arguments.get("confirmed") is not True:
                        return {"ok": False, "code": "confirmation_required", "toolName": tool_name, "message": "explicit confirmed=true is required before creating or updating an application"}
                    if parameters.get("type") == 1:
                        return {"ok": False, "code": "formal_submission_not_allowed", "toolName": tool_name}
                    if parameters.get("type") not in {2, 3}:
                        return {"ok": False, "code": "unsupported_application_type", "toolName": tool_name}
                    if parameters.get("type") == 3 and parameters.get("isTest") is not True:
                        return {"ok": False, "code": "test_draft_required", "toolName": tool_name}
                    if parameters.get("type") == 2 and not parameters.get("applicationId"):
                        return {"ok": False, "code": "application_id_required", "toolName": tool_name}
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": await self.platform.add_application(parameters, umc_token=principal.umc_token)}
                except httpx.HTTPStatusError as exc:
                    code = "permission_denied" if exc.response.status_code in {401, 403} else "tool_error"
                    return {"ok": False, "code": code, "toolName": tool_name, "status": exc.response.status_code}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            return {"ok": False, "code": "permission_denied", "toolName": tool_name}
        file = arguments.get("file")
        if not isinstance(file, str) or not file:
            return {"ok": False, "code": "invalid_arguments", "toolName": tool_name}
        try:
            result = await self.ocr.layout_parsing(file, file_type=arguments.get("fileType"), options=arguments.get("options"))
            return {"ok": True, "code": "ok", "toolName": tool_name, "result": result}
        except httpx.HTTPStatusError as exc:
            code = "permission_denied" if exc.response.status_code == 403 else "tool_error"
            return {"ok": False, "code": code, "toolName": tool_name, "status": exc.response.status_code}
        except (httpx.HTTPError, RuntimeError) as exc:
            return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}


def parse_tool_request(content: str) -> tuple[str, dict[str, Any]] | None:
    """Development hook for exercising the runtime tool boundary.

    The production DSH Harness adapter will replace this with native model
    tool-call messages. The explicit marker keeps the local MVP deterministic:
    ``/tool ocr.layout_parsing {"file":"...","fileType":0}``.
    """

    prefix = "/tool "
    if not content.startswith(prefix):
        return None
    command = content[len(prefix):]
    if " " not in command:
        return (command, {})
    tool_name, raw_args = command.split(" ", 1)
    try:
        args = json.loads(raw_args)
    except json.JSONDecodeError:
        return (tool_name, {})
    return (tool_name, args if isinstance(args, dict) else {})
