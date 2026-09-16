import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.profile_scope import (
    bind_active_profile,
    profile_context_from_payload,
    requires_profile_switch,
)
from app.skills import SkillRoute, build_system_prompt


class ProfileScopeSemanticsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.global_context = profile_context_from_payload(
            {
                "activeProfileId": "0",
                "activeProfileName": "Global View",
                "isGlobalView": True,
                "profiles": [
                    {"id": "11", "name": "Individual Peter"},
                    {"id": "22", "name": "Government UMC"},
                ],
            },
            trusted_profile_id="0",
        )
        self.concrete_context = profile_context_from_payload(
            {
                "activeProfileId": "22",
                "activeProfileName": "Government UMC",
                "profiles": [
                    {"id": "11", "name": "Individual Peter"},
                    {"id": "22", "name": "Government UMC"},
                ],
            },
            trusted_profile_id="22",
        )

    def test_profile_names_never_trigger_a_pre_query_switch(self) -> None:
        definition = {
            "name": "umc.applications",
            "parameters": {
                "type": "object",
                "properties": {"keyword": {"type": "string"}},
            },
            "profileScope": {"mode": "token_scoped"},
        }

        self.assertIsNone(
            requires_profile_switch(
                definition,
                self.global_context,
                "Show Peter's applications",
            )
        )
        self.assertIsNone(
            requires_profile_switch(
                definition,
                self.concrete_context,
                "Show Individual Peter's applications",
            )
        )

    def test_global_optional_profile_selector_is_removed(self) -> None:
        definition = {
            "parameters": {
                "type": "object",
                "properties": {
                    "UserProfileId": {"type": "integer"},
                    "pageSize": {"type": "integer"},
                },
            },
            "profileScope": {
                "mode": "bind_parameter",
                "parameter": "UserProfileId",
            },
        }

        arguments, error = bind_active_profile(
            definition,
            {"UserProfileId": 999, "pageSize": 20},
            self.global_context,
        )

        self.assertIsNone(error)
        self.assertEqual(arguments, {"pageSize": 20})

    def test_global_required_profile_selector_still_requires_selection(self) -> None:
        definition = {
            "parameters": {
                "type": "object",
                "properties": {"UserProfileId": {"type": "integer"}},
                "required": ["UserProfileId"],
            },
            "profileScope": {
                "mode": "bind_parameter",
                "parameter": "UserProfileId",
            },
        }

        arguments, error = bind_active_profile(
            definition,
            {"UserProfileId": 999},
            self.global_context,
        )

        self.assertIsNone(arguments)
        self.assertEqual(error, "profile_selection_required")

    def test_concrete_profile_overwrites_forged_selector(self) -> None:
        definition = {
            "parameters": {
                "type": "object",
                "properties": {"UserProfileId": {"type": "integer"}},
                "required": ["UserProfileId"],
            },
            "profileScope": {
                "mode": "bind_parameter",
                "parameter": "UserProfileId",
            },
        }

        arguments, error = bind_active_profile(
            definition,
            {"UserProfileId": 999},
            self.concrete_context,
        )

        self.assertIsNone(error)
        self.assertEqual(arguments, {"UserProfileId": 22})

    def test_global_prompt_uses_aggregate_token_scope(self) -> None:
        prompt = build_system_prompt(
            SkillRoute("application_status", "data_query"),
            evidence_available=True,
            profile_context=self.global_context,
        )

        self.assertIn("authorized aggregate scope", prompt)
        self.assertIn("never ask for a Profile switch", prompt)
        self.assertNotIn("until the user selects a concrete profile", prompt)

    def test_concrete_prompt_never_claims_another_profile_has_data(self) -> None:
        prompt = build_system_prompt(
            SkillRoute("application_status", "data_query"),
            evidence_available=True,
            profile_context=self.concrete_context,
        )

        self.assertIn("no matching record was found in the current Profile scope", prompt)
        self.assertIn("never name a target Profile", prompt)
        self.assertNotIn("Government UMC", prompt)


if __name__ == "__main__":
    unittest.main()
