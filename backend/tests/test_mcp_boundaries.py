"""Regression checks for MCP transport and the existing tool security boundary."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.principal import Principal
from app.profile_scope import ProfileContext
from mcp_server.client import MCPToolClient


def protocol_reply(payload, *, error=False):
    return SimpleNamespace(content=[SimpleNamespace(text=json.dumps(payload))], isError=error)


@pytest.mark.asyncio
@pytest.mark.parametrize('payload,error', [({'ok': False, 'code': 'permission_denied', 'status': 401}, False), ('invalid arguments', True)])
async def test_mcp_failure_is_not_success(payload, error):
    client = MCPToolClient()
    client._session = SimpleNamespace(call_tool=AsyncMock(return_value=protocol_reply(payload, error=error)))
    result = await client.call_tool('umc.swagger_proxy', {})
    assert result['ok'] is False
    if isinstance(payload, dict):
        assert result['status'] == 401
        assert result['code'] == 'permission_denied'


@pytest.mark.asyncio
async def test_success_preserves_original_gateway_dto():
    client = MCPToolClient()
    data = {'data': {'items': [{'applicationNumber': 'APP-1'}], 'total': 1}}
    client._session = SimpleNamespace(call_tool=AsyncMock(return_value=protocol_reply({'ok': True, 'result': data})))
    result = await client.call_tool('umc.swagger_proxy', {})
    assert result['result'] == data


@pytest.mark.asyncio
async def test_business_arguments_cannot_override_identity():
    client = MCPToolClient()
    client._session = SimpleNamespace(call_tool=AsyncMock(return_value=protocol_reply({'ok': True, 'result': {}})))
    await client.call_tool('umc.profile.summary', {'umc_token': 'untrusted'}, umc_token='trusted')
    payload = client._session.call_tool.call_args.args[1]
    assert payload['umc_token'] == 'trusted'
    assert 'umc_token' not in payload['args']


def registered_definition():
    return {'source': 'swagger', 'httpMethod': 'POST', 'httpPath': '/api/Test/Read',
            'parameters': {'type': 'object', 'properties': {'profileId': {'type': 'integer'}, 'count': {'type': 'integer'}}, 'required': ['count']},
            'profileScope': {'mode': 'bind_parameter', 'parameter': 'profileId'}}


@pytest.mark.asyncio
@pytest.mark.parametrize('scenario,arguments,expected', [
    ('allowlist', {'count': 1}, 'tool_not_allowed_for_skill'),
    ('schema', {'count': 'invalid'}, 'invalid_arguments'),
    ('confirmation', {'count': 1}, 'confirmation_required'),
    ('profile', {'count': 1, 'profileId': 999}, 'ok'),
])
async def test_runtime_keeps_legacy_security_guards(scenario, arguments, expected):
    from app.mcp_gateway import mcp_tool_gateway
    client = SimpleNamespace(call_tool=AsyncMock(return_value={'ok': True, 'result': {'data': {}}}))
    gateway = mcp_tool_gateway(client)
    definition = registered_definition()
    if scenario == 'confirmation':
        definition.update(sideEffect='write', confirmationRequired=True)
    result = await gateway.invoke(
        Principal('user', 'tenant', 'request', umc_token='trusted'), 'umc.test', arguments,
        allowed_tools=[] if scenario == 'allowlist' else ['umc.test'], tool_definition=definition,
        profile_context=ProfileContext('42', 'Selected', False, ()),
    )
    assert result['code'] == expected
    if scenario == 'profile':
        assert client.call_tool.call_args.args[1]['parameters']['profileId'] == 42
        assert client.call_tool.call_args.kwargs['umc_token'] == 'trusted'
    else:
        client.call_tool.assert_not_awaited()


@pytest.mark.asyncio
async def test_transport_failure_reaches_legacy_error_handler():
    from app.mcp_gateway import mcp_tool_gateway
    client = SimpleNamespace(call_tool=AsyncMock(return_value={'ok': False, 'code': 'permission_denied', 'status': 401}))
    gateway = mcp_tool_gateway(client)
    result = await gateway.invoke(Principal('user', 'tenant', 'request', umc_token='trusted'), 'umc.test', {'count': 1},
                                  allowed_tools=['umc.test'], tool_definition=registered_definition(),
                                  profile_context=ProfileContext('42', 'Selected', False, ()))
    assert result['ok'] is False
    assert result['code'] == 'permission_denied'
    assert result['status'] == 401


@pytest.mark.asyncio
async def test_published_tool_schema_and_execution_reject_identity_selectors():
    from mcp.server.fastmcp import FastMCP
    from mcp_server.server import TOOL_DEFINITIONS, _register_tool
    server = FastMCP('test')
    platform = SimpleNamespace(profile_summary=AsyncMock(return_value={}))
    definition = TOOL_DEFINITIONS[0]
    _register_tool(server, definition, platform, None, None)
    tools = await server.list_tools()
    args_schema = tools[0].inputSchema['properties']['args']
    assert args_schema['additionalProperties'] is False
    result = await server.call_tool('umc.profile.summary', {'args': {'profileId': 'other'}, 'umc_token': 'trusted'})
    text = result[0][0].text if isinstance(result, tuple) else result[0].text
    assert json.loads(text)['ok'] is False
    platform.profile_summary.assert_not_awaited()

@pytest.fixture(scope='module')
def mcp_http_server(tmp_path_factory):
    """Exercise the real SDK and HTTP transport; only the UMC upstream is fake."""
    import os
    from pathlib import Path
    import socket
    import subprocess
    import sys
    import time

    root = Path(__file__).resolve().parents[2]
    directory = tmp_path_factory.mktemp('mcp-http')
    script = directory / 'server.py'
    script.write_text('''
import asyncio, os, httpx
from types import SimpleNamespace
from mcp_server import server
class Gateway:
    def __getattr__(self, name):
        async def invoke(*args, **kwargs):
            await asyncio.sleep(0.005)
            token = kwargs.get('umc_token')
            if token == 'expired-test-token':
                request = httpx.Request('POST', 'http://upstream/test')
                raise httpx.HTTPStatusError('expired', request=request, response=httpx.Response(401, request=request))
            return {'data': {'owner': token, 'parameters': args[2] if len(args) > 2 else {}, 'items': [{'applicationNumber': 'APP-TEST'}]}}
        return invoke
server._make_clients = lambda: (Gateway(), Gateway(), Gateway())
server._build_server().run(transport='streamable-http')
''')
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    env = dict(os.environ, PYTHONPATH=str(root / "backend"), DSH_MCP_SERVER_HOST='127.0.0.1', DSH_MCP_SERVER_PORT=str(port))
    log = (directory / 'server.log').open('w')
    process = subprocess.Popen([sys.executable, str(script)], cwd=root, env=env, stdout=log, stderr=log)
    try:
        for _ in range(100):
            if process.poll() is not None:
                pytest.fail('MCP test server exited during startup')
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=0.1):
                    break
            except OSError:
                time.sleep(0.05)
        else:
            pytest.fail('MCP test server did not start')
        yield f'http://127.0.0.1:{port}'
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        log.close()


@pytest.mark.asyncio
async def test_http_roundtrip_preserves_scope_filters_and_concurrent_identity(mcp_http_server):
    import asyncio
    from app.mcp_gateway import mcp_tool_gateway
    client = MCPToolClient(mcp_http_server)
    await client.connect()
    gateway = mcp_tool_gateway(client)
    try:
        async def query(index):
            token = f'test-user-{index}'
            result = await gateway.invoke(
                Principal(str(index), 'tenant', 'request', umc_token=token), 'umc.test', {'count': 1, 'profileId': 999},
                allowed_tools=['umc.test'], tool_definition=registered_definition(),
                profile_context=ProfileContext(str(index + 1), 'Selected', False, ()),
            )
            assert result['ok'] is True
            assert result['result']['data']['owner'] == token
            assert result['result']['data']['parameters'] == {'count': 1, 'profileId': index + 1}
        await asyncio.gather(*(query(index) for index in range(12)))
        result = await gateway.invoke(Principal('user', 'tenant', 'request', umc_token='expired-test-token'), 'umc.profile.summary', {})
        assert result == {'ok': False, 'code': 'permission_denied', 'toolName': 'umc.profile.summary', 'status': 401}
        result = await client.call_tool('umc.profile.summary', {})
        assert result['ok'] is False
        assert result['status'] == 401
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_http_schema_rejects_extra_identity_and_unconfirmed_draft(mcp_http_server):
    client = MCPToolClient(mcp_http_server)
    await client.connect()
    try:
        result = await client.call_tool('umc.profile.summary', {'profileId': 'other'}, umc_token='test-user')
        assert result['ok'] is False
        result = await client.call_tool('umc.add_application', {'parameters': {'type': 1}}, umc_token='test-user')
        assert result['ok'] is False
        result = await client.call_tool('umc.swagger_proxy', {'method': 'POST', 'path': '/api/MyRequest/ApplicationPage', 'parameters': {'pageIndex': 2, 'pageSize': 5, 'keyword': 'filter', 'sortBy': 'createdOn'}}, umc_token='test-user')
        assert result['result']['data']['parameters'] == {'pageIndex': 2, 'pageSize': 5, 'keyword': 'filter', 'sortBy': 'createdOn'}
    finally:
        await client.close()

@pytest.mark.asyncio
async def test_connection_is_closed_when_application_startup_fails():
    client = MCPToolClient()
    client.connect = AsyncMock()
    client.close = AsyncMock()
    with pytest.raises(RuntimeError, match='startup failed'):
        async with client.connection():
            raise RuntimeError('startup failed')
    client.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_timed_out_call_fails_without_replaying_write():
    import asyncio
    client = MCPToolClient(timeout=0.01)
    async def slow_call(*args, **kwargs):
        await asyncio.sleep(1)
    call = AsyncMock(side_effect=slow_call)
    client._session = SimpleNamespace(call_tool=call)
    result = await client.call_tool('umc.swagger_proxy', {'method': 'POST', 'path': '/api/Test/Write'})
    assert result['ok'] is False
    assert result['code'] == 'tool_unavailable'
    call.assert_awaited_once()
