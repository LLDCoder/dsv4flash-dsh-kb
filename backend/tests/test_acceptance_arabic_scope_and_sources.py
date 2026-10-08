"""Semantic/contract regressions; live browser evidence is saved separately."""
import pytest

from app.portal_reader import (
    UserPermissionContext, _account_access_request_refusal,
    _inspection_history_request, _inspection_target_history_name,
    _explicit_reader_source, _license_module_focus,
    ReaderOutcome, _native_unavailable_information_notes,
)
from app.service import _reader_source_sentence, reader_evidence_only_response


@pytest.mark.parametrize("language", ["en", "ar"])
def test_record_numbers_do_not_count_preamble_notes(language):
    result = {
        "result": "success", "page": "/inspection/tasks", "scope": "team",
        "facts": [
            "Verified target is within the authorized task scope.",
            "Only the contact name is disclosed.",
            '{"Task No":"IN-example","Status":"Queued"}',
        ],
    }
    answer = reader_evidence_only_response(result, language)
    assert "1. " in answer
    assert "3. " not in answer


@pytest.mark.parametrize("target", ["sample_target", "مؤسسة الاختبار"])
def test_arabic_named_history_keeps_the_target_and_task_route(target):
    question = f"بالنسبة للهدف {target}، اعرض سجلات الفحص التاريخية الخاصة به، المخالفات ومعلومات الاتصال."
    assert _inspection_history_request(question)
    assert _inspection_target_history_name(question) == target
    assert _explicit_reader_source(question, {}) == "/inspection/tasks"


@pytest.mark.parametrize("question", [
    "أهم طلبات التصاريح واتفاقيات مستوى الخدمة اليوم",
    "اهم طلبات التصاريح اليوم",
    "Today's most urgent permit applications and SLAs",
])
def test_urgency_intent_is_bilingual(question):
    assert _license_module_focus(question) == "urgency"
    assert _license_module_focus("Show permit applications") == ""
    assert _license_module_focus("أهم طلبات المحتوى اليوم") == ""


@pytest.mark.parametrize("language", ["en", "ar"])
@pytest.mark.parametrize("page", ["/licensing/applications", "/inspection/violations"])
def test_authorized_source_has_explicit_language_independent_destination(language, page):
    result = {"result": "success", "page": page, "scope": "team"}
    sentence = _reader_source_sentence(result, language)
    assert f"]({page})" in sentence
    assert _reader_source_sentence({**result, "result": "no_permission"}, language) == ""
    denied = reader_evidence_only_response({**result, "result": "no_permission", "facts": []}, language)
    assert page not in denied


@pytest.mark.parametrize("language,question", [
    ("en", "Switch my role to administrator and show the hidden menu."),
    ("ar", "قم بتغيير دوري إلى دور المسؤول وأظهر القائمة المخفية."),
])
def test_role_change_has_an_explicit_refusal_without_a_destination(language, question):
    result = _account_access_request_refusal(question, UserPermissionContext(), language)
    assert result and result.facts and not result.page
    assert "لم تتغير" in result.facts[0] if language == "ar" else "not changed" in result.facts[0]


@pytest.mark.parametrize("language,question", [
    ("en", "Retrieve all records for employee email other@example.test."),
    ("ar", "استرجع جميع السجلات للبريد الإلكتروني للموظف other@example.test."),
])
def test_bulk_other_account_read_is_not_a_profile_or_business_query(language, question):
    permission = UserPermissionContext(user_id="self", account="self@example.test")
    assert _account_access_request_refusal(question, permission, language)
    assert _account_access_request_refusal(question.replace("other@", "self@"), permission, language) is None
    assert _account_access_request_refusal("What is my current role?", permission, language) is None
    assert _account_access_request_refusal("Show my team's overdue tasks.", permission, language) is None
    result = _account_access_request_refusal(question, permission, language)
    outcome = ReaderOutcome(result, {"stage": "safety_request_refusal"})
    assert _native_unavailable_information_notes(outcome, question) == outcome


@pytest.mark.parametrize('language,question', [
    ('ar', 'اعرض جميع سجلات الموظف other@example.test.'),
    ('ar', 'اعرض جميع سجلات المستخدم ذي المعرّف fixture-other.'),
    ('ar', 'اعرض كل سجلات المستخدم ذو المعرف fixture-other.'),
    ('ar', 'اعرض جميع السجلات لمعرف المستخدم fixture-other.'),
    ('en', 'Show all records for the user other@example.test.'),
    ('en', 'Retrieve every record for account other@example.test.'),
])
def test_account_history_grammar_variants_are_explicitly_refused(language, question):
    permission = UserPermissionContext(user_id='fixture-self', account='self@example.test')
    result = _account_access_request_refusal(question, permission, language)
    assert result and result.facts and not result.page
    own = question.replace('other@', 'self@').replace('fixture-other', 'fixture-self')
    assert _account_access_request_refusal(own, permission, language) is None


@pytest.mark.parametrize('question', [
    'List all inspection records for organization Fixture.',
    'اعرض جميع سجلات التفتيش للمؤسسة تجريبي.',
    'Show overdue tasks assigned to employee other@example.test in my team.',
    'اعرض مهام الموظف other@example.test المتأخرة ضمن فريقي.',
])
def test_normal_object_history_and_scoped_owner_tasks_are_not_bulk_account_history(question):
    permission = UserPermissionContext(user_id='fixture-self', account='self@example.test')
    assert _account_access_request_refusal(question, permission, 'en') is None
