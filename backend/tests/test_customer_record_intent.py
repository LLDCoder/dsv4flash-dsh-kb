import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.customer_record_intent import customer_record_intent
from app.profile_scope import ProfileContext, ProfileReference


class CustomerRecordIntentBoundaryTests(unittest.TestCase):
    def test_sentence_punctuation_does_not_hide_external_owner(self):
        for owner in ("outside.account.42", "another.user@example.test"):
            for prefix, suffix in (("", ""), ("", "."), ("", "..."), ("", "?"),
                                   ("", "؟"), ("(", ")"), ("«", "»"), ("...", ".")):
                question = f"Show the licenses, fines, and pending tasks for {prefix}{owner}{suffix}"
                with self.subTest(question=question):
                    intent = customer_record_intent(question)
                    self.assertTrue(intent.query)
                    self.assertTrue(intent.external_owner)
                    self.assertEqual(intent.categories, {"licenses", "fines", "pending"})

    def test_authorized_dotted_profile_is_not_external(self):
        context = ProfileContext("owned", "Authorized.Company", False,
                                 (ProfileReference("owned", "Authorized.Company"),))
        for suffix in ("", ".", "...", "?", "؟"):
            with self.subTest(suffix=suffix):
                intent = customer_record_intent(f"Show my licenses in Authorized.Company{suffix}", context)
                self.assertTrue(intent.query)
                self.assertFalse(intent.external_owner)

    def test_public_application_reference_is_not_account_handle(self):
        for suffix in ("", ".", "...", "?", "؟"):
            with self.subTest(suffix=suffix):
                intent = customer_record_intent(f"Show my application ML-3-7-5263529{suffix}")
                self.assertTrue(intent.query)
                self.assertFalse(intent.external_owner)

    def test_arabic_owner_detection_does_not_depend_on_profile_label_language(self):
        for name in ("Global View", "العرض الشامل"):
            context = ProfileContext("0", name, True, ())
            for suffix in ("", ".", "؟"):
                with self.subTest(name=name, suffix=suffix):
                    intent = customer_record_intent(f"أرني تراخيص outside.account.42 والغرامات والمهام المعلقة{suffix}", context)
                    self.assertTrue(intent.query)
                    self.assertTrue(intent.external_owner)


if __name__ == "__main__":
    unittest.main()
