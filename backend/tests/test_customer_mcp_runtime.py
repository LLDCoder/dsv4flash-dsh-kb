"""Exercise the deployed socket transport with the current Customer payment reader."""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from threading import Thread
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import httpx
import pytest

from app.config import Settings
from app.mcp_gateway import mcp_tool_gateway
from app.payment_transaction_read import TRANSACTIONS, read_transaction
from app.principal import Principal
from mcp_server.client import MCPToolClient
from mcp_server.settings import publish_gateway_settings


@pytest.mark.asyncio
async def test_socket_payment_detail_and_live_gateway_settings(monkeypatch):
    seen = []
    number = "123456789012"
    class Upstream(BaseHTTPRequestHandler):
        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            seen.append((self.path, body['path'], self.headers.get('Authorization'), self.headers.get('X-Request-ID')))
            row = {'transactionNo': number, 'profileId': '42'}
            data = {'items': [row]} if body['path'] == TRANSACTIONS else {'transaction': row}
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({'data': data}).encode())

        def log_message(self, fmt, *args):
            pass

    # macOS and Linux impose short path limits on Unix sockets.
    with tempfile.TemporaryDirectory(dir='/tmp') as folder, ThreadingHTTPServer(('127.0.0.1', 0), Upstream) as upstream:
        thread = Thread(target=upstream.serve_forever, daemon=True)
        thread.start()
        sock = str(Path(folder) / 'tools.sock')
        conf = Path(folder) / 'gateway.json'
        monkeypatch.setenv('NO_PROXY', '127.0.0.1,localhost')
        monkeypatch.setenv('no_proxy', '127.0.0.1,localhost')
        monkeypatch.setenv('DSH_MCP_SOCKET', sock)
        monkeypatch.setenv('DSH_MCP_GATEWAY_CONFIG', str(conf))
        settings = Settings(platform_gateway_url='http://127.0.0.1:1', llm_api_key='test-only')
        publish_gateway_settings(settings)
        assert 'test-only' not in conf.read_text()
        backend = Path(__file__).resolve().parents[1]
        proc = subprocess.Popen([sys.executable, '-m', 'mcp_server'], cwd=backend,
                                env=dict(os.environ, PYTHONPATH=str(backend)))
        try:
            for _ in range(100):
                if Path(sock).exists():
                    break
                assert proc.poll() is None
                await asyncio.sleep(.05)
            client = MCPToolClient()
            async with client.connection():
                assert 'umc.swagger_proxy' in {t['name'] for t in await client.list_tools()}
                platform = mcp_tool_gateway(client).platform
                with pytest.raises(httpx.RequestError):
                    await platform.profile_summary(umc_token='test')
                settings.platform_gateway_url = f'http://127.0.0.1:{upstream.server_port}'
                publish_gateway_settings(settings)
                principal = Principal('user', 'tenant', 'trace', umc_token='test', profile_id='42')
                row, detail = await read_transaction(platform, principal, ('latest', ''))
                assert row['transactionNo'] == detail['transaction']['transactionNo'] == number
                assert seen == [('/swagger/proxy', path, 'Bearer test', 'trace')
                                for path in (TRANSACTIONS, TRANSACTIONS + '/' + number)]
        finally:
            proc.terminate()
            proc.wait(timeout=10)
            upstream.shutdown()
            thread.join()
