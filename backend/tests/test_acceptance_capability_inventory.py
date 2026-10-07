"""Capability language contracts, not business acceptance data."""
import pytest
import asyncio
from app.portal_reader import AdminPortalReader, ReaderOutcome, ReaderResult
from app.tool_gateway import Principal
from app.skills import response_language_for
from app.portal_reader import _self_profile_requested


@pytest.mark.parametrize('question', [
    'Which business modules and data can I access with my current account?',
    'Which pages can I see?',
    'Which data and modules can I read?',
])
def test_current_account_inventory_is_not_manual_guidance(question):
    assert _self_profile_requested(question)


@pytest.mark.parametrize('question', [
    'List the licensing applications I can see.',
    'Which pending tasks are overdue?',
])
def test_business_record_queries_still_use_record_reader(question):
    assert not _self_profile_requested(question)


@pytest.mark.parametrize('status', ['no_permission', 'load_failed'])
def test_document_enrichment_cannot_upgrade_failed_live_read(monkeypatch, status):
    reader = AdminPortalReader(None, None, portal_base_url='https://admin.example.test')
    async def denied(*args, **kwargs):
        return ReaderOutcome(ReaderResult(status=status, summary='Read unavailable.', page='/inspection/violations',
            missing=('page_not_permitted',)), {'stage':'explicit_named_source_list'})
    async def forbidden_enrichment(*args, **kwargs):
        raise AssertionError('A denied live read must not invoke the rule enricher')
    monkeypatch.setattr(reader, '_run', denied)
    monkeypatch.setattr(reader, '_rule_evidence_facts', forbidden_enrichment)
    result = asyncio.run(reader.run(Principal(user_id='reader', tenant_id='tenant', request_id='request'),
        'List inspection tasks and violations.'))
    assert result.result.status == status
    assert not result.result.facts


@pytest.mark.parametrize('preferred', ['en', 'ar'])
def test_symbol_heavy_arabic_input_does_not_follow_secondary_fragment(preferred):
    assert response_language_for('؟؟!!٪٪ @@## 😀😀🔥🔥 opaqueletters 你好乱码', preferred) == 'ar'


def test_prose_and_explicit_language_still_override_noise_punctuation():
    assert response_language_for('Please explain my tasks ؟؟', 'ar') == 'en'
    assert response_language_for('Reply in English: ؟؟!!٪٪ @@## opaqueletters 你好乱码', 'ar') == 'en'
