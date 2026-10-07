"""Collection/rule and partial-permission contracts, not live data."""
import asyncio
import pytest
from app.portal_reader import (AdminPortalReader, ReaderResult, ReaderOutcome, UserPermissionContext,
    ReadOnlyPortalPolicy, _inspection_collection_coverage_notes, _record_collection_only_request)
from app.tool_gateway import Principal


@pytest.mark.parametrize('question', ['List inspection tasks and violations.', 'اعرض مهام التفتيش والمخالفات.'])
def test_partial_permission_is_explicit_without_substitution(question):
    permission = UserPermissionContext(roles=('reader',), pages=('/inspection/violations',))
    base = ReaderOutcome(ReaderResult(status='no_data', summary='Empty observed list.', page='/inspection/violations', facts=('No rows observed.',)), {})
    result = _inspection_collection_coverage_notes(base, question, permission, ReadOnlyPortalPolicy('https://portal.test'))
    assert result.result.status == 'no_data'
    assert 'requested_collection_not_read' in result.result.missing
    assert result.audit_evidence['unreadCollection']['permissionDenied'] is True
    assert len(result.result.facts) == 2


def test_authorized_but_unread_collection_is_not_reported_as_denied():
    permission = UserPermissionContext(roles=('reader',), pages=('/inspection/tasks','/inspection/violations'))
    base = ReaderOutcome(ReaderResult(status='success',summary='Observed list.',page='/inspection/tasks',facts=('Observed task.',)),{})
    result = _inspection_collection_coverage_notes(base, 'List inspection tasks and violations.', permission,
        ReadOnlyPortalPolicy('https://portal.test'))
    assert result.audit_evidence['unreadCollection']['permissionDenied'] is False
    assert 'was not read' in result.result.facts[-1]


@pytest.mark.parametrize('question', ['Which standards apply to these violations?', 'اعرض قواعد التعامل مع المخالفات.'])
def test_explicit_rule_requests_still_retrieve_rules(question):
    assert not _record_collection_only_request(question)


def test_empty_live_list_never_uses_manual_example_counts(monkeypatch):
    reader = AdminPortalReader(None,None,portal_base_url='https://portal.test')
    async def live_empty(*args, **kwargs):
        return ReaderOutcome(ReaderResult(status='no_data',summary='Empty observed list.',page='/inspection/violations',facts=('No observed rows.',)),{})
    async def forbidden(*args, **kwargs):
        raise AssertionError('A record list is not a rule lookup')
    monkeypatch.setattr(reader,'_run',live_empty)
    monkeypatch.setattr(reader,'_rule_evidence_facts',forbidden)
    outcome = asyncio.run(reader.run(Principal(user_id='reader',tenant_id='tenant',request_id='request'),
        'List inspection tasks and violations.'))
    assert outcome.result.status == 'no_data'
