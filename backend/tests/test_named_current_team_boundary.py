"""Contract fixtures, not substitutes for live browser acceptance."""
import pytest
from app.portal_reader import (
    ReaderOutcome, ReaderResult, _named_group_in_question,
    _group_display_name_matches, _guard_named_group_scope,
    _inspection_task_rollup_view,
    _safety_request_result,
)


def test_group_name_does_not_consume_date_and_measures():
    question = 'للمهام المسندة في فريق Fixture بتاريخ 2026-10-07، احسب لكل مفتش عدد المهام والمتأخر منها ونسبة الإنجاز.'
    assert _named_group_in_question(question) == 'Fixture'
    assert _inspection_task_rollup_view(question) == 'team'


def test_arabic_group_does_not_consume_grouping_clause_or_colon():
    assert _named_group_in_question('لخّص مهام فريق تجريبي حسب المفتش: إجمالي المهام والمتأخر منها.') == 'تجريبي'
    assert _named_group_in_question('لخّص مهام قسم تجريبي: إجمالي المهام.') == 'تجريبي'
    question = 'لخّص مهام فريق تجريبي حسب المفتش: إجمالي المهام.'
    assert _guard_named_group_scope(fixture_outcome(), question).result.status == 'not_confirmed'
    outcome = fixture_outcome()
    outcome.audit_evidence['currentTeamBoundary']['departmentLabels'] = ['وحدة تجريبي']
    assert _guard_named_group_scope(outcome, question).result.status == 'success'
    assert not _guard_named_group_scope(outcome, 'لخّص مهام فريق آخر حسب المفتش: إجمالي المهام.').result.facts


def test_aggregation_clause_is_not_a_named_group():
    assert _named_group_in_question('Summarize today\u2019s tasks for each inspector in my team.') == ''
    assert _named_group_in_question('Summarize tasks for every employee in the Fixture team.') == 'Fixture'


@pytest.mark.parametrize('group,labels', [
    ('Fixture', ['Fixture Unit']), ('تجريبي', ['وحدة تجريبي']),
])
def test_current_profile_display_labels_match_without_business_aliases(group, labels):
    assert _group_display_name_matches(group, labels)
    assert not _group_display_name_matches('Other', labels)


def test_compound_label_requires_whole_conjunct_not_partial_words():
    assert _group_display_name_matches('تجريبي', ['وحدة المتابعة والتجريبي']) is False
    assert _group_display_name_matches('التجريبي', ['وحدة المتابعة والتجريبي'])
    assert _group_display_name_matches('Fixture', ['Monitoring and Fixture Unit'])
    assert not _group_display_name_matches('Media', ['Foreign Media Unit'])


def fixture_outcome(view='team', scopes=None, scope='team', verified=True, profile=True):
    return ReaderOutcome(ReaderResult(status='success', scope=scope, summary='Verified team receipt',
        page='/inspection/tasks', facts=('verified current tasks',)), {
        'inspectionTaskRollup': {'verified': verified, 'stablePasses': 2,
            'view': view, 'scopes': scopes or ['TeamTodo', 'TeamCompleted']},
        'currentTeamBoundary': {'ownProfileVerified': profile,
            'departmentLabels': ['Fixture Unit']},
    })


def test_current_team_requires_both_native_team_receipt_and_own_profile():
    question = 'Summarize each inspector in the Fixture team.'
    assert _guard_named_group_scope(fixture_outcome(), question).result.status == 'success'
    for invalid in (fixture_outcome(view='all'), fixture_outcome(scopes=['Queued']),
                    fixture_outcome(scope='personal'), fixture_outcome(verified=False),
                    fixture_outcome(profile=False)):
        guarded = _guard_named_group_scope(invalid, question)
        assert guarded.result.status == 'not_confirmed'
        assert not guarded.result.facts
    assert not _guard_named_group_scope(fixture_outcome(),
        'Summarize each inspector in the Other team.').result.facts


@pytest.mark.parametrize('question', [
    'Show cases and staff across all departments, not just the Fixture department.',
    'اعرض قضايا وموظفي جميع الأقسام، وليس قسم تجريبي فقط.',
])
def test_named_department_exclusion_preserves_explicit_no_read_refusal(question):
    result = _safety_request_result(question)
    assert result is not None and result.facts and not result.page
    outcome = ReaderOutcome(result, {'stage': 'safety_request_refusal'})
    assert _guard_named_group_scope(outcome, question) is outcome


def test_no_read_refusal_exception_never_bypasses_business_row_scope_check():
    outcome = fixture_outcome()
    outcome.audit_evidence['stage'] = 'safety_request_refusal'
    guarded = _guard_named_group_scope(outcome, 'List tasks in the Other department.')
    assert guarded.result.status == 'not_confirmed'
    assert not guarded.result.facts
