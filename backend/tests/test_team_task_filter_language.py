import json

import pytest

from app.portal_reader import _team_task_assignment_rows_result
from app.service import reader_evidence_only_response


def observation(state):
    return {
        'tabControls': [{'name': 'Team Tasks', 'selected': True}],
        'filterControls': [{'role': 'switch', 'filterSurface': True,
                            'label': 'Application Tasks Only', 'selected': state}],
        'sectionSummaries': [{'kind': 'table', 'nodeId': 'observed-task-table', 'columnHeaders': ['Task No.', 'Assigned To', 'Status'],
                             'rowFields': [{'Task No.': 'TASK-EXAMPLE', 'Assigned To': 'Visible Owner',
                                            'Status': 'Pending Modification'}]}],
        'apiDiscovery': {'candidates': [{'status': 200, 'responseEvidence': {'data': {
            'items': [{}], 'pageIndex': 1, 'pageSize': 10, 'total': 23}}}]},
    }


@pytest.mark.parametrize('state,phrase', [(['false'], 'includes all task categories'),
                                        (['true'], 'service-application tasks only')])
def test_verified_category_switch_is_disclosed_without_changing_total(state, phrase):
    result = _team_task_assignment_rows_result(observation(state), page='/content/team-management', scope='team')
    assert result and phrase in result.facts[-1]
    assert '1 of 23' in result.facts[-2]
    assert json.loads(result.facts[0])['Assigned To'] == 'Visible Owner'
    english = reader_evidence_only_response(result.public_json(), 'en')
    arabic = reader_evidence_only_response(result.public_json(), 'ar')
    assert phrase in english
    assert 'TASK-EXAMPLE' in arabic and 'Visible Owner' in arabic
    assert 'بانتظار التعديل' in arabic
    assert 'Pending Modification' not in arabic
    assert 'Application Tasks Only' not in arabic


@pytest.mark.parametrize('state', [[], ['unknown'], ['true', 'false']])
def test_unverified_filter_state_is_not_invented(state):
    result = _team_task_assignment_rows_result(observation(state), page='/content/team-management', scope='team')
    assert result and len(result.facts) == 2


def test_arabic_native_filter_label_uses_the_same_scope_contract():
    source = observation(['false'])
    source['filterControls'][0]['label'] = 'مهام الطلبات فقط'
    result = _team_task_assignment_rows_result(source, page='/content/team-management', scope='team')
    assert result and 'includes all task categories' in result.facts[-1]
