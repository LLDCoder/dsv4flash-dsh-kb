import pytest

from app.portal_reader import question_is_conceptual
from test_admin_portal_reader import Gateway, Planner, run_reader


@pytest.mark.parametrize('question', [
    'What information differs between the Books and Movies lists?',
    'Does Completed mean each row has a status literally named Completed?',
    'Does Fine Amount tell me what was paid, or does it only establish a fine?',
    'Do these figures alone prove which record I must approve?',
    'Does the empty search prove the account never existed?',
    'Can an Account ID alone identify a specific profile?',
    'What does Operational Insights measure?',
    'What does this report cover?',
    'What date and member criteria are available in that view?',
    'Which filters are supported on this list?',
])
def test_business_meaning_questions_are_conceptual(question):
    assert question_is_conceptual(question)


@pytest.mark.parametrize('question', [
    'Show three completed records.',
    'How many members are in this team?',
    'Find task REF-123.',
    'Is case REF-123 completed?',
])
def test_live_record_requests_are_not_conceptual(question):
    assert not question_is_conceptual(question)


def test_conceptual_followup_does_not_force_live_read_from_inherited_view():
    fact = 'Queue membership does not prove personal ownership.'
    gateway = Gateway(knowledge_result={'ok': True, 'result': {'chunks': [{'content': fact}]}})
    planner = Planner({'mode': 'knowledge_only', 'result': 'success', 'answerShape': 'detail',
                       'facts': [fact], 'missing': []})
    outcome = run_reader(gateway, planner, question='Does queue membership prove personal ownership?',
                         conversation_context={'resolvedIntent': {'slots': {
                             'view': {'source': 'previous', 'value': 'Completed', 'evidence': 'Completed'},
                             'answerShape': {'source': 'current', 'value': 'detail', 'evidence': 'Does'},
                         }}})
    assert outcome.result.status == 'success'
    assert outcome.audit_evidence['stage'] == 'knowledge_only'
    assert not any(call[0] == 'admin.portal.read' for call in gateway.calls)


def test_available_criteria_followup_uses_manual_without_reading_member_rows():
    fact = 'Select Team Member and start/end date criteria are both available.'
    gateway = Gateway(knowledge_result={'ok': True, 'result': {'chunks': [{'content': fact}]}})
    planner = Planner({'mode': 'knowledge_only', 'result': 'success', 'answerShape': 'overview',
                       'facts': [fact], 'missing': []})
    outcome = run_reader(gateway, planner, question='What date and member criteria are available in that view?',
                         conversation_context={'resolvedIntent': {'slots': {
                             'view': {'source': 'previous', 'value': 'Team Members', 'evidence': 'Team Members'},
                             'answerShape': {'source': 'current', 'value': 'overview', 'evidence': 'What criteria'},
                         }}})
    assert outcome.result.status == 'success'
    assert not any(call[0] == 'admin.portal.read' for call in gateway.calls)
