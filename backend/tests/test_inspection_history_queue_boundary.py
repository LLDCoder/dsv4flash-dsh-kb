"""Exact target histories must not become unrelated overdue queues."""
import pytest
from app.portal_reader import _inspection_history_request, _inspection_overdue_list_requested


@pytest.mark.parametrize('question', [
    'اعرض جميع عمليات التفتيش السابقة والغرامات وجهات الاتصال الخاصة بالمؤسسة المرتبطة بمهمة التفتيش IN-2026-1234567.',
    'اعرض التفتيشات السابقة للمؤسسة المرتبطة بالمهمة IN-2026-7654321.',
    'Show all past inspections and fines for the institution linked to IN-2026-1234567.',
])
def test_exact_record_history_does_not_become_overdue_queue(question):
    assert _inspection_history_request(question)
    assert not _inspection_overdue_list_requested(question)


def test_related_is_not_the_english_overdue_token_late():
    assert not _inspection_overdue_list_requested('Show related inspections for this institution.')
    assert _inspection_overdue_list_requested('Show late inspection tasks sorted by overdue days.')
    assert _inspection_overdue_list_requested('اعرض مهام التفتيش المتأخرة مرتبة حسب أيام التأخير.')
