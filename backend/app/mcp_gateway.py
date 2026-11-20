"""Keep ToolGateway validation while executing every external call over MCP."""
from typing import Any

import httpx

from mcp_server.client import MCPToolClient
from .tool_gateway import ToolGateway


class MCPGatewayTransport:
    def __init__(self, client: MCPToolClient) -> None:
        self.client = client

    async def invoke(self, name: str, arguments: dict[str, Any], umc_token: str | None = None, request_id: str | None = None) -> Any:
        result = await self.client.call_tool(name, arguments, umc_token=umc_token, request_id=request_id)
        if result.get('ok'):
            return result.get('result')
        request = httpx.Request('POST', 'http://mcp/tools/call')
        status = result.get('status')
        if isinstance(status, int) and 400 <= status <= 599:
            response = httpx.Response(status, json={'detail': result}, request=request)
            raise httpx.HTTPStatusError('MCP upstream request failed', request=request, response=response)
        raise httpx.RequestError('MCP tool unavailable', request=request)


class MCPPlatformGateway(MCPGatewayTransport):
    async def invoke_swagger_tool(self, method: str, path: str, parameters: dict[str, Any] | None = None, *, umc_token: str | None = None, request_id: str | None = None) -> Any:
        return await self.invoke('umc.swagger_proxy', {'method': method, 'path': path, 'parameters': parameters or {}}, umc_token, request_id)

    async def profile_summary(self, *, umc_token: str | None = None, request_id: str | None = None) -> Any:
        return await self.invoke('umc.profile.summary', {}, umc_token, request_id)

    async def eligible_services(self, *, umc_token: str | None = None, request_id: str | None = None) -> Any:
        return await self.invoke('umc.services.eligible', {}, umc_token, request_id)

    async def media_licensing_eligible_services(self, *, umc_token: str | None = None, request_id: str | None = None) -> Any:
        return await self.invoke('umc.media-licensing.eligible-services', {}, umc_token, request_id)

    async def add_application(self, parameters: dict[str, Any], *, umc_token: str | None = None, request_id: str | None = None) -> Any:
        return await self.invoke('umc.add_application', {'parameters': parameters, 'confirmed': True}, umc_token, request_id)


class MCPKnowledgeGateway(MCPGatewayTransport):
    async def search(self, query: str, folder_id: str, top_k: int = 32, *, umc_token: str | None = None) -> Any:
        return await self.invoke('knowledge.search', {'query': query, 'folder_id': folder_id, 'top_k': top_k}, umc_token)

    async def folders_tree(self, *, umc_token: str | None = None) -> Any:
        return await self.invoke('knowledge.folders_tree', {}, umc_token)

    async def files(self, folder_id: str | None = None, recursive: bool = False, *, umc_token: str | None = None) -> Any:
        return await self.invoke('knowledge.files', {'folder_id': folder_id, 'recursive': recursive}, umc_token)

    async def files_page(self, folder_id: str | None = None, recursive: bool = False, page: int = 1, page_size: int = 20, *, umc_token: str | None = None) -> Any:
        return await self.invoke('knowledge.files_page', {'folder_id': folder_id, 'recursive': recursive, 'page': page, 'page_size': page_size}, umc_token)


class MCPOCRGateway(MCPGatewayTransport):
    async def layout_parsing(self, file: str, file_type: int | None = None, options: dict[str, Any] | None = None) -> Any:
        return await self.invoke('ocr.layout_parsing', {'file': file, 'fileType': file_type, 'options': options})


def mcp_tool_gateway(client: MCPToolClient) -> ToolGateway:
    """Use the original security boundary with MCP-only network adapters."""
    return ToolGateway(MCPOCRGateway(client), MCPKnowledgeGateway(client), MCPPlatformGateway(client))
