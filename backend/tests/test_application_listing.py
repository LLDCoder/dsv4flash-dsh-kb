import copy
import unittest

from app.application_listing import application_list_answer, application_page_arguments, ordered_application_result
from app.profile_scope import ProfileContext, ProfileReference


class ApplicationListingTests(unittest.TestCase):
    def test_default_sort_is_applied_before_pagination_without_losing_filters(self):
        arguments = {"pageIndex": 1, "pageSize": 100, "applicationStatusId": "103"}
        expected = {**arguments, "sortBy": "createdOn", "sortDirection": 0}
        self.assertEqual(application_page_arguments(arguments), expected)
        self.assertNotIn("sortBy", arguments)
        explicit = {**arguments, "sortBy": "orderAmount", "sortDirection": 1}
        self.assertEqual(application_page_arguments(explicit), explicit)

    def setUp(self):
        self.context = ProfileContext("p", "Company", False, (ProfileReference("p", "Company", "establishment", ("شركة",)),))
        self.items = [{"applicationNumber": f"REF-{i}", "createdOn": f"2026-10-{i:02}T18:16:44", "serviceNameEn": "Service", "serviceNameAr": "خدمة", "typeNameEn": "New", "typeNameAr": "جديد", "applicationStatusNameEn": "Completed", "applicationStatusNameAr": "مكتمل\r", "certificateId": 123, "token": "PRIVATE"} for i in range(1, 9)]
        self.result = {"ok": True, "result": {"isSuccess": True, "data": {"applicationPage": {"pageIndex": 1, "total": 8, "items": self.items}, "applicationStatusCounts": [{"applicationStatusNameEn": "Completed", "applicationStatusNameAr": "مكتمل", "count": 8}]}}}

    def test_bilingual_latest_count_uses_identical_ordered_real_projection(self):
        for content, language in (("Show my latest 5 applications", "en"), ("أرني أحدث ٥ طلبات", "ar"), ("List the newest 5 requests for this profile", "en")):
            with self.subTest(content=content):
                answer = application_list_answer(content, self.result, language, self.context)
                self.assertIsNotNone(answer)
                self.assertEqual([value for value in answer.split() if value.startswith("REF-")], [f"REF-{i}" for i in (8, 7, 6, 5, 4)])
                self.assertNotIn("PRIVATE", answer)
                self.assertNotIn("certificateId", answer)
                self.assertNotIn("REF-3", answer)

    def test_excel_short_query_and_localized_dates(self):
        answer = application_list_answer("عرض طلبي", self.result, "ar", self.context)
        self.assertIn("8 من 8", answer)
        self.assertIn("أكتوبر", answer)
        self.assertIn("18:16:44", answer)
        self.assertIn("مكتمل", answer)
        english = application_list_answer("Show my applications in the Company profile", self.result, "en", self.context)
        self.assertIn("October", english)
        self.assertIn("Current Profile: **Company**", english)

    def test_sort_before_bounding_without_mutating_audit_data(self):
        before = copy.deepcopy(self.result)
        sorted_result = ordered_application_result(self.result["result"])
        self.assertEqual(sorted_result["data"]["applicationPage"]["items"][0]["applicationNumber"], "REF-8")
        self.assertEqual(before, self.result)

    def test_scopes_failures_and_complex_requests_fall_back(self):
        for context in (None, ProfileContext("0", "Global View", True, ())):
            self.assertIsNone(application_list_answer("Show my applications", self.result, "en", context))
        self.assertIsNone(application_list_answer("Show my applications", {**self.result, "ok": False}, "en", self.context))
        for content in ("Show my pending payment applications", "What is the current status of my application REF-8?", "Show my applications from September", "Cancel my application"):
            self.assertIsNone(application_list_answer(content, self.result, "en", self.context))

    def test_unknown_dates_do_not_assert_recency_and_ties_are_stable(self):
        self.items[0]["createdOn"] = "not-a-date"
        self.items[1]["createdOn"] = self.items[2]["createdOn"]
        answer = application_list_answer("Show my applications", self.result, "en", self.context)
        self.assertIn("recency cannot be confirmed", answer)
        self.assertNotIn("## Latest applications", answer)
        self.assertLess(answer.index("REF-2"), answer.index("REF-3"))
        self.assertGreater(answer.index("REF-1"), answer.index("REF-3"))

    def test_missing_rows_and_nonfirst_page_do_not_claim_success(self):
        page = self.result["result"]["data"]["applicationPage"]
        page["items"] = []
        self.assertIsNone(application_list_answer("Show my applications", self.result, "en", self.context))
        page["items"] = self.items
        page["pageIndex"] = 2
        self.assertIsNone(application_list_answer("Show my applications", self.result, "en", self.context))

    def test_large_page_is_explicitly_bounded(self):
        self.result["result"]["data"]["applicationPage"]["total"] = 800
        answer = application_list_answer("Show my applications", self.result, "en", self.context)
        self.assertIn("8 of 800", answer)
        self.assertIn("bounded list, not all", answer)
        self.assertNotIn("## Latest applications", answer)
        self.assertIn("cannot be confirmed as the latest", answer)

    def test_malicious_display_text_is_escaped_not_interpreted(self):
        self.items[0]["serviceNameEn"] = '<script>alert(1)</script>|[x](https://example.test)'
        answer = application_list_answer("Show my applications", self.result, "en", self.context)
        self.assertNotIn("<script>", answer)
        self.assertIn("\\|", answer)

    def test_public_service_apostrophes_remain_readable(self):
        self.items[0]["serviceNameEn"] = "Entry Through the Country's Ports"
        answer = application_list_answer("Show my applications", self.result, "en", self.context)
        self.assertIn("Country's Ports", answer)
        self.assertNotIn("&#x27;", answer)


if __name__ == "__main__":
    unittest.main()
