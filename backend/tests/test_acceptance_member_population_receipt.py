"""Contract fixtures, not live business acceptance data."""
import pytest
from test_reader_network_policy import gateway
from app.portal_reader import _checked_member_card_projection, _team_member_card_result, bounded_portal_observation
from app.service import reader_evidence_only_response


def observed_cards(count=25):
    return {'data': {'startDate': '2026-01-01', 'endDate': '2026-01-07', 'cards': [
        {'userName': f'Fixture Member {i}', 'leaveNote': 'PRIVATE', 'token': 'PRIVATE',
         'metricsByCategory': {'All': {'completedTasks': 0, 'totalAssignedTasks': i % 3,
                                      'overdueTasks': i % 2, 'privateNote': 'PRIVATE'}}}
        for i in range(count)]}}


def observation(projection):
    return {'apiDiscovery': {'candidates': [{'operationKey': 'GET /api/licensing/team-management/members',
        'status': 200, 'responseEvidence': {'data': {'cards': []}},
        'responseEvidenceTruncated': True, 'memberCardProjection': projection}]}}


@pytest.mark.parametrize('count', [11, 25, 100])
def test_complete_safe_projection_survives_both_transport_and_answer_caps(count):
    projection = gateway._reader_member_card_projection(observed_cards(count))
    assert projection['sourceCardCount'] == count and 'PRIVATE' not in str(projection)
    obs = bounded_portal_observation(observation(projection))
    result = _team_member_card_result(obs, question='Summarize pending and overdue tasks for each team member.',
        scope='team', page='/licensing/team-management')
    assert result.status == 'success' and result.completeness == 'complete'
    assert len([f for f in result.facts if f.startswith('{')]) == count
    payload = result.public_json()
    assert len(payload['facts']) >= count
    answer = reader_evidence_only_response(payload, language='en')
    assert f'Fixture Member {count - 1}' in answer


def test_truncated_sample_without_complete_projection_is_not_complete():
    obs = observation(None)
    obs['apiDiscovery']['candidates'][0]['responseEvidence']['data']['cards'] = observed_cards(11)['data']['cards'][:10]
    assert _team_member_card_result(obs, question='Summarize each team member.', scope='team', page='/licensing/team-management') is None


@pytest.mark.parametrize('mutation', ['count', 'duplicate', 'limit'])
def test_invalid_population_receipt_cannot_assert_complete(mutation):
    projection = gateway._reader_member_card_projection(observed_cards())
    if mutation == 'count':
        projection['sourceCardCount'] += 1
    elif mutation == 'duplicate':
        projection['cards'][1]['userName'] = projection['cards'][0]['userName']
    else:
        projection['cards'] *= 5
        projection['sourceCardCount'] = len(projection['cards'])
    assert _checked_member_card_projection(projection) is None


def test_missing_metric_is_not_a_manufactured_zero():
    source = observed_cards(11)
    del source['data']['cards'][0]['metricsByCategory']['All']['overdueTasks']
    projection = gateway._reader_member_card_projection(source)
    assert 'overdueTasks' not in projection['cards'][0]['metricsByCategory']['All']
    assert _team_member_card_result(observation(projection), question='Summarize pending and overdue tasks for each team member.',
        scope='team', page='/licensing/team-management') is None


@pytest.mark.parametrize('question', [
    'How many overdue tasks does Fixture Member 0 have?',
    'كم عدد المهام المتأخرة لدى Fixture Member 0؟',
])
def test_named_member_zero_is_not_discarded_as_no_record(question):
    projection = gateway._reader_member_card_projection(observed_cards(11))
    result = _team_member_card_result(observation(projection), question=question,
        scope='team', page='/licensing/team-management')
    assert result.status == 'success'
    assert '"Overdue Tasks":0' in result.facts[0]
    assert 'Fixture Member 0' in result.facts[0]
    assert 'Fixture Member 1' not in str(result.facts)
