"""Presentation contracts; fixture labels are not live acceptance evidence."""
from app.service import reader_evidence_only_response


def test_bounded_empty_context_is_arabic_without_changing_observed_labels():
    payload = {'result': 'not_confirmed', 'answerShape': 'list', 'page': '/inspection/violations',
               'facts': [
                   'The rendered view is the To Do tab of /inspection/violations.',
                   'The page renders these tabs: To Do, Completed.',
                   'The page renders these filter values: All Types, Content Violation.',
                   'No record matching the requested condition is visible in this bounded view, so no record was returned and no other row was substituted.',
               ], 'missing': ['named_source_list_not_visible']}
    answer = reader_evidence_only_response(payload, language='ar')
    assert 'العرض المقروء' in answer and 'التبويبات الظاهرة' in answer
    assert 'قيم المرشحات الظاهرة' in answer and 'لم أستبدله بصف آخر' in answer
    assert 'To Do, Completed' in answer
    assert 'The rendered view' not in answer and 'No record matching' not in answer
    english = reader_evidence_only_response(payload, language='en')
    assert 'The rendered view is the To Do tab' in english
