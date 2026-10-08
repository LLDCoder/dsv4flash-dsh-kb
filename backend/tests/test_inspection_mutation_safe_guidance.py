"""Safety response contracts; browser/native evidence remains the acceptance gate."""
import pytest
from app.portal_reader import _mutation_request_refusal_result


@pytest.mark.parametrize('language,question,tokens', [
    ('en', 'Help me change the inspection result for IN-2026-1234567 to Passed.',
     ('No change was performed', 'evidence', 'review', 'required approval', 'have not verified')),
    ('ar', 'ساعدني في تغيير نتيجة الفحص رقم IN-2026-1234567 إلى مقبول.',
     ('لم يُنفَّذ أي تغيير', 'الأدلة', 'مراجعة', 'الموافقات', 'لم أتحقق')),
    ('ar', 'قم بتعديل نتيجة التفتيش IN-2026-7654321 إلى ناجح.',
     ('لم يُنفَّذ أي تغيير', 'الأدلة', 'مراجعة', 'الموافقات', 'لم أتحقق')),
    ('ar', 'الرجاء قم بتغيير نتيجة الفحص للمهمة IN-2026-4567890 إلى مقبول.',
     ('لم يُنفَّذ أي تغيير', 'الأدلة', 'مراجعة', 'الموافقات', 'لم أتحقق')),
    ('zh', '请修改检查结果为合格。', ('没有执行变更', '证据', '复核', '审批', '未核实')),
])
def test_result_change_requires_evidence_review_and_approval(language, question, tokens):
    result = _mutation_request_refusal_result(question, language)
    assert result and result.status == 'not_confirmed' and not result.page
    assert all(token in ' '.join(result.facts) for token in tokens)
    assert result.public_json()['facts'] == list(result.facts)


@pytest.mark.parametrize('language,question,tokens', [
    ('en', 'Please transfer inspection task IN-2026-1234567 to the Licensing Department.',
     ('was not transferred', 'have not verified', 'record owner', 'required approval', 'official portal confirmation')),
    ('ar', 'يرجى نقل مهمة التفتيش IN-2026-1234567 إلى قسم الترخيص.',
     ('لم يتم نقل', 'لم أتحقق', 'الجهة المالكة', 'الموافقات', 'تأكيد رسمي')),
])
def test_transfer_does_not_invent_visible_assignment_controls(language, question, tokens):
    result = _mutation_request_refusal_result(question, language)
    assert result and result.status == 'not_confirmed' and not result.page
    text = ' '.join(result.facts)
    assert 'IN-2026-1234567' in text
    assert all(token in text for token in tokens)
    assert 'visible Assign Inspector action' not in text and 'الظاهر' not in text
    assert result.public_json()['facts'] == list(result.facts)


@pytest.mark.parametrize('question', [
    'What is the inspection result for IN-2026-1234567?',
    'ما نتيجة التفتيش للمهمة IN-2026-1234567؟',
    'ما متطلبات تعديل نتيجة التفتيش للمهمة IN-2026-1234567؟',
])
def test_result_read_is_not_a_mutation(question):
    assert _mutation_request_refusal_result(question) is None
