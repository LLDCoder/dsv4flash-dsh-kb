import asyncio
import unittest
from unittest.mock import patch

import app


class GatewayAuthTests(unittest.TestCase):
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

    def test_health_reports_auth_mode_without_disclosing_credential(self):
        with patch.object(app, 'GATEWAY_AUTH', 'test-service-secret'):
            health = asyncio.run(app.healthz())
            self.assertEqual(health['authMode'], 'service-gateway')
            self.assertNotIn('test-service-secret', str(health))
