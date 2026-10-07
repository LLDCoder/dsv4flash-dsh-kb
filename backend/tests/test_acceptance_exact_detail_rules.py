"""Exact record / independent rule evidence contracts, not business data."""
import asyncio
import pytest
from app.portal_reader import AdminPortalReader, ReaderOutcome, ReaderResult
from app.tool_gateway import Principal


@pytest.mark.parametrize('question', [
    'Does MC-9-9-1234567 comply with the media content standards?',
    'هل يتوافق MC-9-9-1234567 مع معايير المحتوى الإعلامي؟',
])
def test_detail_fast_path_keeps_case_and_independent_rules(monkeypatch, question):
    reader = AdminPortalReader(None,None,portal_base_url='https://portal.test')
    async def detail(*args, **kwargs):
        return ReaderOutcome(ReaderResult(status='success',summary='Observed detail.',page='/content/ContentApplications',
            workflow_state='authorized_record_detail',facts=('Observed workflow state.',)),{})
    async def rules(*args, **kwargs):
        return ('source.pdf: A grounded rule from the retriever.',)
    monkeypatch.setattr(reader,'_run',detail)
    monkeypatch.setattr(reader,'_rule_evidence_facts',rules)
    result = asyncio.run(reader.run(Principal(user_id='reader',tenant_id='tenant',request_id='request'),question))
    assert result.result.facts == ('Observed workflow state.','source.pdf: A grounded rule from the retriever.')
    assert result.audit_evidence['exactDetailRuleEvidence']['factCount'] == 1


def test_plain_status_detail_does_not_retrieve_rules(monkeypatch):
    reader = AdminPortalReader(None,None,portal_base_url='https://portal.test')
    async def detail(*args, **kwargs):
        return ReaderOutcome(ReaderResult(status='success',summary='Observed detail.',workflow_state='authorized_record_detail',
            facts=('Observed state.',)),{})
    async def forbidden(*args, **kwargs):
        raise AssertionError('Plain status questions do not need regulations')
    monkeypatch.setattr(reader,'_run',detail)
    monkeypatch.setattr(reader,'_rule_evidence_facts',forbidden)
    result = asyncio.run(reader.run(Principal(user_id='reader',tenant_id='tenant',request_id='request'),'What is the application status?'))
    assert result.result.facts == ('Observed state.',)
