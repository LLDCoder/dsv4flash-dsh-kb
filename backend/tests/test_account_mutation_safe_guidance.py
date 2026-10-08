"""Security contracts only, not substitutes for browser acceptance."""
import pytest
from app.portal_reader import _mutation_request_refusal_result


@pytest.mark.parametrize('language,question', [
    ('en', 'Reset the password for fixture@example.test and send it to me.'),
    ('ar', 'أعد تعيين كلمة مرور المستخدم fixture@example.test وأرسلها إلي.'),
])
def test_password_refusal_does_not_invent_role_specific_controls(language, question):
    result = _mutation_request_refusal_result(question, language)
    assert result and result.facts and not result.page
    text = ' '.join(result.facts)
    assert 'fixture@example.test' in text
    assert 'Customer Management > Accounts' not in text
    assert 'إدارة العملاء > الحسابات' not in text
    assert ('have not verified' in text if language == 'en' else 'لم أتحقق' in text)
    assert ('secure password-recovery workflow' in text if language == 'en' else 'استعادة كلمة المرور الآمن' in text)
    assert result.public_json()['facts'] == list(result.facts)


@pytest.mark.parametrize('language,question', [
    ('en', 'Disable or merge the account fixture@example.test.'),
    ('ar', 'عطّل أو ادمج الحساب fixture@example.test.'),
])
def test_account_change_refusal_includes_target_impact_approval_confirmation(language, question):
    result = _mutation_request_refusal_result(question, language)
    text = ' '.join(result.facts)
    assert result and result.facts and not result.page
    assert 'fixture@example.test' in text
    for token in (('cannot disable', 'impact', 'approval', 'confirmation', 'have not verified')
                  if language == 'en' else ('لا يمكنني تعطيل', 'أثر', 'الموافقات', 'تأكيد', 'لم أتحقق')):
        assert token in text


@pytest.mark.parametrize('question', [
    'What is the account status of fixture@example.test?',
    'ما حالة الحساب fixture@example.test؟',
])
def test_status_read_is_not_an_account_change(question):
    assert _mutation_request_refusal_result(question) is None
