"""Localized display reads must not expand native read authority."""
import asyncio
from types import SimpleNamespace
from test_platform_portal_reader import gateway


def test_profile_label_language_only_changes_accept_language():
    called = {}
    class Response:
        status = 200
        async def body(self):
            return b'{"isSuccess": true, "data": {}}'
        async def dispose(self):
            called['disposed'] = True
    class Transport:
        async def get(self, url, **options):
            called.update(url=url, options=options)
            return Response()
    payload, status = asyncio.run(gateway._reader_get_document(
        SimpleNamespace(_reader_request_context=Transport()), 'http://portal.test/own-profile',
        display_language='ar'))
    assert status == 200 and payload['isSuccess']
    assert called['options']['headers'] == {'Accept-Language':'ar'}
    assert called['options']['max_redirects'] == 0 and called['disposed']


def test_display_language_cannot_be_applied_to_other_operation():
    page = SimpleNamespace(_reader_health={})
    spec = gateway.PageReadRequest(operationKey='GET /api/Other/PrivateList', displayLanguage='ar')
    result = asyncio.run(gateway._reader_page_reads(page, [spec], 'http://portal.test'))
    assert result[0]['verified'] is False
    assert result[0]['reason'] == 'page_read_display_language_not_allowed'
