import asyncio
import unittest
from unittest.mock import patch

import app
import httpx


class GatewayAuthTests(unittest.TestCase):
    def setUp(self):
        self.context = patch.multiple(app, GATEWAY_TENANT_ID='', GATEWAY_SUBJECT_ID='', GATEWAY_SUBJECT_ROLES='')
        self.context.start()
        self.addCleanup(self.context.stop)

    def test_public_gateway_keeps_anonymous_headers(self):
        with patch.object(app, 'GATEWAY_AUTH', ''):
            self.assertEqual(set(app._headers()), {'X-Request-ID'})

    def test_configured_gateway_uses_service_auth_only(self):
        with patch.object(app, 'GATEWAY_AUTH', 'test-service-secret'):
            headers = app._headers()
            self.assertEqual(headers['X-FF-Gateway-Auth'], 'test-service-secret')
            self.assertNotIn('Authorization', headers)

    def test_request_ids_are_unique(self):
        self.assertNotEqual(app._headers()['X-Request-ID'], app._headers()['X-Request-ID'])

    def test_service_context_requires_service_credential(self):
        with patch.multiple(app, GATEWAY_AUTH='test-secret', GATEWAY_TENANT_ID='test-tenant', GATEWAY_SUBJECT_ID='test-subject', GATEWAY_SUBJECT_ROLES='test-role'):
            headers = app._headers()
            self.assertEqual(headers['X-FF-Tenant-ID'], 'test-tenant')
            self.assertEqual(headers['X-FF-Subject-ID'], 'test-subject')
            self.assertEqual(headers['X-FF-Subject-Roles'], 'test-role')
            with patch.object(app, 'GATEWAY_AUTH', ''):
                self.assertEqual(set(app._headers()), {'X-Request-ID'})

    def test_health_reports_auth_mode_without_disclosing_credential(self):
        with patch.object(app, 'GATEWAY_AUTH', 'test-service-secret'):
            health = asyncio.run(app.healthz())
            self.assertEqual(health['authMode'], 'service-gateway')
            self.assertNotIn('test-service-secret', str(health))


class GatewayRequestTests(unittest.IsolatedAsyncioTestCase):
    async def test_search_forwards_configured_context_and_preserves_contract(self):
        captured = []
        def handler(request):
            captured.append(request)
            return httpx.Response(200, json={'matches': []})
        client_type = httpx.AsyncClient
        def client(**kwargs):
            return client_type(transport=httpx.MockTransport(handler), **kwargs)
        with patch.multiple(app, GATEWAY_AUTH='test-secret', GATEWAY_TENANT_ID='test-tenant', GATEWAY_SUBJECT_ID='test-subject', GATEWAY_SUBJECT_ROLES='test-role'), patch.object(app.httpx, 'AsyncClient', side_effect=client):
            result = await app.search(app.SearchRequest(query='licensing', folder_id='folder-test', top_k=3))
        self.assertEqual(result, {'matches': []})
        self.assertEqual(len(captured), 1)
        self.assertEqual(captured[0].headers['X-FF-Subject-Roles'], 'test-role')
        self.assertEqual(captured[0].headers['X-FF-Gateway-Auth'], 'test-secret')
        self.assertNotIn('authorization', captured[0].headers)
        self.assertEqual(captured[0].method, 'POST')
        self.assertTrue(captured[0].url.path.endswith('/search'))
