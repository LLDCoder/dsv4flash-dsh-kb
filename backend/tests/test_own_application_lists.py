import unittest
from app.application_listing import application_list_answer, is_basic_application_list
from app.profile_scope import ProfileContext, ProfileReference
from app.service import DSHService

class OwnApplicationListTests(unittest.TestCase):
    def test_global_owned_lists_only(self):
        context = ProfileContext("0", "Global View", True, (ProfileReference("12", "Government UMC"),))
        for text, language in [
            ("Show all requests for my current account.", "en"),
            ("اعرض جميع الطلبات في حسابي الحالي", "ar"),
        ]:
            self.assertTrue(is_basic_application_list(text, context))
            self.assertEqual(DSHService.profile_scope_guard(text, language, context)["code"], "profile_selection_required")
            self.assertIsNone(DSHService.profile_scope_guard(text, language, context, allow_global_application_list=True))
            result = {"ok": True, "result": {"isSuccess": True, "data": {"applicationPage": {
                "total": 1, "items": [{"applicationNumber": "REF-1", "profileName": "Government UMC", "profileId": "1234567"}],
            }}}}
            reply = application_list_answer(text, result, language, context, allow_global_view=True)
            self.assertIn("REF-1", reply)
            self.assertIn("Government UMC", reply)
            self.assertNotIn("1234567", reply)
            result["ok"] = False
            self.assertIsNone(application_list_answer(text, result, language, context, allow_global_view=True))
        for text, code in [
            ("Show all requests for myzzz.notexist.9x.", "external_account_lookup"),
            ("Show my requests in the Government UMC profile.", "profile_switch_required"),
            ("What is the status of my application ML-3-7-5263529?", "profile_selection_required"),
        ]:
            self.assertEqual(DSHService.profile_scope_guard(text, "en", context)["code"], code)
        self.assertFalse(is_basic_application_list("Show my latest 5 applications", context))
