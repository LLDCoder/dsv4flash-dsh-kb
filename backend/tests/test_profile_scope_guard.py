import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.service import DSHService
from app.profile_scope import ProfileContext, ProfileReference, profile_context_from_payload


class ProfileScopeGuardTests(unittest.TestCase):
    def test_application_list_detector_covers_bilingual_profile_queries(self):
        self.assertTrue(DSHService.is_application_list_request(
            "Show my applications in the Government UMC profile",
        ))
        self.assertTrue(DSHService.is_application_list_request(
            "أرني طلباتي في ملف Government UMC",
        ))
        self.assertTrue(DSHService.is_application_list_request(
            "What is the current status of my application ML-3-7-5263529?",
        ))
        self.assertFalse(DSHService.is_application_list_request(
            "How do I apply for an advertising license?",
        ))

    def test_acceptance_queries_use_identical_target_free_refusal(self):
        cases = (
            ("Show me rui.wang licenses, fines, and pending tasks", "en"),
            ("Show me zzz.notexist.9x licenses, fines, and pending tasks", "en"),
            ("اعرض لي تراخيص وغرامات ومهام rui.wang المعلقة", "ar"),
            ("اعرض لي تراخيص وغرامات ومهام zzz.notexist.9x المعلقة", "ar"),
        )
        results = [DSHService.profile_scope_guard(text, language, None) for text, language in cases]
        for result in results:
            self.assertIsNotNone(result)
            self.assertEqual(result["code"], "external_account_lookup")
            self.assertNotIn("rui.wang", result["content"])
            self.assertNotIn("zzz.notexist.9x", result["content"])
        self.assertEqual(results[0], results[1])
        self.assertEqual(results[2], results[3])

    def test_first_person_query_is_not_blocked(self):
        self.assertIsNone(DSHService.profile_scope_guard("Show my licenses and fines", "en", None))

    def test_exact_application_reference_is_allowed_in_global_view_in_both_languages(self):
        context = ProfileContext("0", "Global View", True, ())
        english = "What is the current status of my application ML-3-7-5263529, and what is the next step?"
        arabic = "ما هي الحالة الحالية لطلبي ML-3-7-5263529، وما الخطوة التالية؟"
        self.assertIsNone(DSHService.profile_scope_guard(english, "en", context))
        self.assertIsNone(DSHService.profile_scope_guard(arabic, "ar", context))

    def test_generic_global_view_application_query_still_requires_profile(self):
        context = ProfileContext("0", "Global View", True, ())
        for text, language in (
            ("Show my application status", "en"),
            ("اعرض حالة طلباتي", "ar"),
        ):
            result = DSHService.profile_scope_guard(text, language, context)
            self.assertIsNotNone(result)
            self.assertEqual(result["code"], "profile_selection_required")
            self.assertEqual(result["profileAction"], {
                "type": "open_profile_menu",
                "code": "profile_selection_required",
            })

    def test_known_target_profile_returns_switch_action(self):
        context = ProfileContext(
            "11",
            "Commercial DP",
            False,
            (
                ProfileReference("11", "Commercial DP"),
                ProfileReference("22", "Government UMC"),
            ),
        )
        result = DSHService.profile_scope_guard(
            "Show my applications in the Government UMC profile",
            "en",
            context,
        )
        self.assertEqual(result["code"], "profile_switch_required")
        self.assertEqual(
            result["profileAction"]["targetProfile"],
            {"profileId": "22", "profileName": "Government UMC"},
        )

    def test_known_target_profile_returns_arabic_switch_guidance(self):
        context = ProfileContext(
            "11",
            "Commercial DP",
            False,
            (ProfileReference("11", "Commercial DP"), ProfileReference("22", "Government UMC")),
        )
        result = DSHService.profile_scope_guard(
            "أرني طلباتي في ملف Government UMC",
            "ar",
            context,
        )
        self.assertEqual(result["code"], "profile_switch_required")
        self.assertIn("Government UMC", result["content"])
        self.assertIn("الملف", result["content"])

    def test_global_application_reference_stays_direct_lookup(self):
        context = ProfileContext(
            "0",
            "Global View",
            True,
            (ProfileReference("22", "Government UMC"),),
        )
        result = DSHService.profile_scope_guard(
            "What is the status of my Government UMC application ML-3-7-5263529?",
            "en",
            context,
        )
        self.assertIsNone(result)

    def test_customer_profile_wire_aliases_are_parsed(self):
        context = profile_context_from_payload({
            "activeProfileId": "11",
            "activeProfileName": "Commercial DP",
            "isGlobalView": False,
            "profiles": [
                {"profileId": "11", "profileName": "Commercial DP"},
                {"profileId": "22", "profileName": "Government UMC"},
            ],
        })
        self.assertIsNotNone(context)
        self.assertEqual(
            [(item.profile_id, item.name) for item in context.profiles],
            [("11", "Commercial DP"), ("22", "Government UMC")],
        )


if __name__ == "__main__":
    unittest.main()
