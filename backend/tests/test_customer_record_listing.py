import unittest

from app.customer_record_listing import record_list_answer, record_list_query, successful_data
from app.profile_scope import ProfileContext, ProfileReference
from app.service import DSHService
from app.service_fees import is_public_service_fee_query


class CustomerRecordListTests(unittest.TestCase):
    context = ProfileContext("0", "Global View", True, (ProfileReference("12", "Commercial Dubai"),))

    def test_bilingual_queries(self):
        for question, expected in [
            ("Show my refund records and their statuses.", ("refunds", 20)),
            ("أرني سجل طلبات استرداد الرسوم الخاصة بي وحالتها", ("refunds", 20)),
            ("Show all my violations and fines.", ("violations", 100)),
            ("أرني جميع مخالفاتي وغراماتي", ("violations", 100)),
        ]:
            with self.subTest(question=question):
                self.assertEqual(record_list_query(question, self.context), expected)
                self.assertIsNone(DSHService.profile_scope_guard(question, "ar", self.context, allow_global_application_list=True))
                self.assertFalse(is_public_service_fee_query(question))

    def test_scope_and_action_boundaries(self):
        for question in (
            "Show refunds for myzzz.notexist.9x",
            "أرني طلبات استرداد الرسوم myzzz.notexist.9x",
            "Show violations for myzzz.notexist.9x",
        ):
            with self.subTest(question=question):
                self.assertIsNone(record_list_query(question, self.context))
                self.assertEqual(DSHService.profile_scope_guard(question, "en", self.context)["code"], "external_account_lookup")
        self.assertEqual(DSHService.profile_scope_guard(
            "Show my refunds in the Commercial Dubai profile", "en", self.context, allow_global_application_list=True
        )["code"], "profile_switch_required")
        for question in ("Cancel my refund", "Pay my fine", "How do I apply for a refund?", "Show my unpaid fines", "Show my violation VF-99"):
            self.assertIsNone(record_list_query(question, self.context))
        self.assertTrue(is_public_service_fee_query("ما هي رسوم خدمة التصوير الأرضي؟"))

    def test_read_failure_and_projection(self):
        self.assertIsNone(successful_data({"ok": True, "result": {"isSuccess": False, "data": {"total": 0, "items": []}}}))
        self.assertIsNone(record_list_answer("refunds", {"total": 1, "items": []}, None, 20, "en", self.context))
        self.assertIn("Total: **0**", record_list_answer("refunds", {"total": 0, "items": []}, None, 20, "en", self.context))
        data = {"total": 1, "items": [{"applicationNumber": "REF-1", "profileName": "Test Profile", "statusId": 5,
                                      "amount": 100, "attachmentsURL01": "PRIVATE-ATTACHMENT", "userId": "PRIVATE-USER"}]}
        status = [{"id": 5, "nameAr": "مكتمل", "nameEn": "Completed"}]
        reply = record_list_answer("refunds", data, status, 20, "ar", self.context)
        self.assertIn("مكتمل | Test Profile |", reply)
        self.assertIn("REF-1 | 100 |", reply)
        self.assertNotIn("PRIVATE-", reply)
