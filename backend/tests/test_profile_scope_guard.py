import sys
import json
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.service import DSHService
from app.profile_scope import ProfileContext, ProfileReference, profile_context_from_payload


class ProfileScopeGuardTests(unittest.TestCase):
    def test_arabic_list_prepositions_are_not_external_owners(self):
        context = ProfileContext("p1", "Current Company", False, (ProfileReference("p2", "Other Company", "establishment"),))
        for count in ("5", "٥"):
            query = f"أرني أحدث {count} طلبات في ملف Other Company"
            result = DSHService.profile_scope_guard(query, "ar", context)
            self.assertEqual(result["code"], "profile_switch_required")
            self.assertEqual(result["profileAction"]["targetProfile"]["profileId"], "p2")
        result = DSHService.profile_scope_guard("أرني أحدث 5 طلبات rui.wang في ملف Other Company", "ar", context)
        self.assertEqual(result["code"], "external_account_lookup")

    def test_authorized_bilingual_names_resolve_the_same_profile(self):
        context = ProfileContext("11", "Commercial DP", False, (ProfileReference("22", "جهة حكومية", "establishment", ("Government UMC", "جهة حكومية")),))
        result = DSHService.profile_scope_guard("أرني طلباتي في ملف Government UMC", "ar", context)
        self.assertEqual(result["code"], "profile_switch_required")
        self.assertEqual(result["profileAction"]["targetProfile"]["profileId"], "22")

    def test_application_evidence_keeps_small_complete_page_and_portal_scope(self):
        context = ProfileContext("22", "Government UMC", False, ())
        result = {"ok": True, "result": {"data": {"total": 21, "items": [{"applicationNo": f"APP-{i}"} for i in range(21)]}}}
        evidence = json.loads(DSHService.answer_tool_evidence("umc.applications", result, "default", context))
        self.assertEqual(len(evidence["result"]["data"]["items"]), 21)
        self.assertFalse(evidence["evidenceTruncated"])
        self.assertEqual(evidence["currentPortalProfile"]["name"], "Government UMC")

    def test_profile_answer_evidence_excludes_internal_relation_ids(self):
        result = {"ok": True, "result": {"data": {"applicationNo": "PUBLIC-1", "certificateId": 1487, "record_id": 9, "profileID": 22, "certificateNumber": "CERT-PUBLIC", "valid": True}}}
        evidence = json.loads(DSHService.answer_tool_evidence("umc.applications", result, "default"))
        fields = evidence["result"]["data"]
        self.assertNotIn("certificateId", fields)
        self.assertNotIn("record_id", fields)
        self.assertNotIn("profileID", fields)
        self.assertEqual(fields["certificateNumber"], "CERT-PUBLIC")
        self.assertEqual(fields["applicationNo"], "PUBLIC-1")
        self.assertTrue(fields["valid"])

    def test_application_list_detector_covers_bilingual_profile_queries(self):
        self.assertTrue(DSHService.is_application_list_request(
            "Show my applications in the Government UMC profile",
        ))
        self.assertTrue(DSHService.is_application_list_request(
            "أرني طلباتي في ملف Government UMC",
        ))
        self.assertTrue(DSHService.is_application_list_request("عرض طلبي"))
        self.assertTrue(DSHService.is_application_list_request("أَرِنِي طَلَبَاتِي"))
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
            ("أرني تراخيص rui.wang والغرامات والمهام المعلقة", "ar"),
            ("أرني تراخيص myzzz.notexist.9x والغرامات والمهام المعلقة", "ar"),
            ("rui.wang", "en"),
            ("myzzz.notexist.9.", "en"),
            ("عرض طلب احمد", "ar"),
        )
        results = [DSHService.profile_scope_guard(text, language, None) for text, language in cases]
        for result in results:
            self.assertIsNotNone(result)
            self.assertEqual(result["code"], "external_account_lookup")
            self.assertNotIn("rui.wang", result["content"])
            self.assertNotIn("zzz.notexist.9x", result["content"])
        self.assertEqual(results[0], results[1])
        self.assertEqual(results[2], results[3])
        self.assertEqual(results[4], results[5])

    def test_first_person_query_is_not_blocked(self):
        self.assertIsNone(DSHService.profile_scope_guard("Show my licenses and fines", "en", None))

    def test_exact_reference_preserves_original_global_profile_isolation(self):
        context = ProfileContext("0", "Global View", True, ())
        english = "What is the current status of my application ML-3-7-5263529, and what is the next step?"
        arabic = "ما هي الحالة الحالية لطلبي ML-3-7-5263529، وما الخطوة التالية؟"
        for text, language in ((english, "en"), (arabic, "ar")):
            self.assertEqual(DSHService.profile_scope_guard(text, language, context)["code"], "profile_selection_required")

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

    def test_global_application_reference_requires_verified_profile_switch(self):
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
        self.assertEqual(result["code"], "profile_switch_required")

    def test_external_owner_cannot_bypass_guard_by_adding_authorized_profile(self):
        context = ProfileContext("11", "Commercial DP", False, (ProfileReference("22", "Government UMC"),))
        result = DSHService.profile_scope_guard("Show me rui.wang licenses in Government UMC profile", "en", context)
        self.assertEqual(result["code"], "external_account_lookup")
        self.assertNotIn("profileAction", result)

    def test_knowledge_questions_and_own_arabic_records_are_not_external(self):
        context = ProfileContext("0", "Global View", True, ())
        self.assertIsNone(DSHService.profile_scope_guard("How do I apply for an advertising license?", "en", context))
        self.assertFalse(DSHService.is_cross_account_record_request("أرني تراخيصي وغراماتي ومهامي", context))

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
