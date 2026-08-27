import json
from typing import Any

import httpx

from .knowledge import KnowledgeGatewayClient
from .ocr import OCRGatewayClient
from .platform import PlatformGatewayClient
from .principal import Principal


class ToolGateway:
    """Only DSH Runtime calls this boundary; clients do not call OCR directly."""

    def __init__(self, ocr: OCRGatewayClient, knowledge: KnowledgeGatewayClient, platform: PlatformGatewayClient) -> None:
        self.ocr = ocr
        self.knowledge = knowledge
        self.platform = platform

    async def invoke(self, principal: Principal, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
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
                    result = await self.knowledge.search(query, folder_id, top_k)
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": result}
                except httpx.HTTPStatusError as exc:
                    code = "permission_denied" if exc.response.status_code == 403 else "tool_error"
                    return {"ok": False, "code": code, "toolName": tool_name, "status": exc.response.status_code}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            if tool_name == "knowledge.folders_tree":
                try:
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": await self.knowledge.folders_tree()}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            if tool_name == "knowledge.files":
                try:
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": await self.knowledge.files(arguments.get("folder_id") or arguments.get("folderId"), bool(arguments.get("recursive", False)))}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            if tool_name == "knowledge.files_page":
                try:
                    result = await self.knowledge.files_page(arguments.get("folder_id") or arguments.get("folderId"), bool(arguments.get("recursive", False)), int(arguments.get("page", 1)), int(arguments.get("page_size", arguments.get("pageSize", 20))))
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": result}
                except httpx.HTTPError as exc:
                    return {"ok": False, "code": "tool_unavailable", "toolName": tool_name, "error": str(exc)[:500]}
            if tool_name == "umc.applications":
                try:
                    page_index = int(arguments.get("page_index", arguments.get("pageIndex", 1)))
                    page_size = int(arguments.get("page_size", arguments.get("pageSize", 100)))
                    if page_index < 1 or page_size < 1 or page_size > 100:
                        return {"ok": False, "code": "invalid_arguments", "toolName": tool_name, "message": "page_index must be >= 1 and page_size must be between 1 and 100"}
                    return {"ok": True, "code": "ok", "toolName": tool_name, "result": await self.platform.applications_page(page_index, page_size)}
                except httpx.HTTPStatusError as exc:
                    code = "permission_denied" if exc.response.status_code in {401, 403} else "tool_error"
                    return {"ok": False, "code": code, "toolName": tool_name, "status": exc.response.status_code}
                except (httpx.HTTPError, ValueError) as exc:
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
