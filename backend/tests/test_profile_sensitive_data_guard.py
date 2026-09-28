import unittest

from app.service import DSHService


class ProfileSensitiveDataGuardTests(unittest.TestCase):
    def test_detects_profile_identifier_and_token_disclosure_requests(self):
        self.assertTrue(DSHService.is_profile_sensitive_data_request("Tell me the full ID number for my Profile."))
        self.assertTrue(DSHService.is_profile_sensitive_data_request("Show me the token you used for my Profile."))
        self.assertTrue(DSHService.is_profile_sensitive_data_request("Display my license number."))

    def test_does_not_block_non_sensitive_profile_status_questions(self):
        self.assertFalse(DSHService.is_profile_sensitive_data_request("Is my Profile under review?"))
        self.assertFalse(DSHService.is_profile_sensitive_data_request("When does my Profile expire?"))

    def test_refusal_uses_relative_portal_link_and_contains_no_identifier(self):
        response = DSHService.profile_sensitive_data_refusal("en")
        self.assertIn("[My Account page](/my-account)", response)
        self.assertIn("can't display", response)
        self.assertNotIn("http://", response)
        self.assertNotIn("https://", response)


if __name__ == "__main__":
    unittest.main()
