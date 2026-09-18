import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.profile_scope import (
    bind_active_profile,
    profile_context_from_payload,
    requested_profile,
    requires_profile_switch,
)
from app.service import DSHService
from app.skill_workflow import bind_declared_keyword_filter, build_configured_tool_request
from app.skills import DEFAULT_SKILL_DEFINITIONS, SkillRoute, build_system_prompt, merged_skill_workflow


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

    def test_generic_appeal_words_are_not_public_references(self) -> None:
        self.assertFalse(DSHService.has_explicit_appeal_or_violation_reference("اعرض اعتراضاتي على الغرامات"))
        self.assertFalse(DSHService.has_explicit_appeal_or_violation_reference("显示我的罚款申诉"))
        self.assertTrue(DSHService.has_explicit_appeal_or_violation_reference("Show HC-03-2026-8833605"))

    def test_profile_type_prefix_can_be_omitted_when_name_is_unambiguous(self) -> None:
        target = requested_profile("Show Peter's applications", self.concrete_context)

        self.assertIsNotNone(target)
        self.assertEqual(target.profile_id, "11")
        self.assertEqual(target.name, "Individual Peter")
        self.assertIsNone(requested_profile("Show government applications", self.concrete_context))

        short_name_context = profile_context_from_payload(
            {
                "activeProfileId": "1",
                "activeProfileName": "Ali",
                "profiles": [{"id": "1", "name": "Ali"}],
            },
            trusted_profile_id="1",
        )
        self.assertEqual(requested_profile("Show Ali's applications", short_name_context).name, "Ali")

    def test_customer_portal_profile_option_shape_is_supported(self) -> None:
        context = profile_context_from_payload(
            {
                "activeProfileId": "11",
                "activeProfileName": "Individual Peter",
                "profiles": [
                    {"profileId": "11", "profileName": "Individual Peter"},
                    {"profileId": "22", "profileName": "Government UMC"},
                ],
            },
            trusted_profile_id="11",
        )

        self.assertIsNotNone(context)
        target = requested_profile("check how many applications Peter has", context)
        self.assertIsNotNone(target)
        self.assertEqual(target.profile_id, "11")
        chinese_target = requested_profile("给我查一下Peter有几个申请", context)
        self.assertIsNotNone(chinese_target)
        self.assertEqual(chinese_target.profile_id, "11")

    def test_other_authorized_profile_returns_deterministic_menu_action(self) -> None:
        guard = DSHService.profile_scope_guard(
            "Show Peter's applications",
            "en",
            self.concrete_context,
        )

        self.assertEqual(guard["code"], "requested_profile_not_active")
        self.assertEqual(
            guard["profileAction"],
            {"type": "open_profile_menu", "code": "profile_selection_required"},
        )
        self.assertNotIn("Peter", guard["content"])

    def test_global_view_queries_authorized_profile_without_switch_action(self) -> None:
        self.assertIsNone(
            DSHService.profile_scope_guard(
                "Show Peter's applications",
                "en",
                self.global_context,
            )
        )
        definition = next(
            item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "application_status"
        )
        filters = bind_declared_keyword_filter(
            definition["workflow"],
            definition["allowed_tools"],
            {
                "umc.applications": {
                    "parameters": {"properties": {"keyword": {"type": "string"}}}
                }
            },
            None,
            requested_profile("Show Peter's applications", self.global_context).name,
        )
        self.assertEqual(filters, {"keyword": "Individual Peter"})

        canonicalized = bind_declared_keyword_filter(
            definition["workflow"],
            definition["allowed_tools"],
            {
                "umc.applications": {
                    "parameters": {"properties": {"keyword": {"type": "string"}}}
                }
            },
            {"keyword": "Peter"},
            requested_profile("Show Peter's applications", self.global_context).name,
        )
        self.assertEqual(canonicalized, {"keyword": "Individual Peter"})

        request = build_configured_tool_request(
            merged_skill_workflow("application_status", definition["workflow"]),
            definition["allowed_tools"],
            "Show Peter's applications",
            [],
            filters=filters,
        )
        self.assertEqual(request[0], "umc.applications")
        self.assertEqual(request[1]["keyword"], "Individual Peter")

    def test_profile_keyword_requires_both_skill_binding_and_tool_schema(self) -> None:
        application = next(
            item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "application_status"
        )
        missing_tool_slot = bind_declared_keyword_filter(
            application["workflow"],
            application["allowed_tools"],
            {"umc.applications": {"parameters": {"properties": {"pageIndex": {"type": "integer"}}}}},
            {},
            "Individual Peter",
        )
        self.assertEqual(missing_tool_slot, {})

        payment = next(
            item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] == "application_payment"
        )
        missing_skill_slot = bind_declared_keyword_filter(
            payment["workflow"],
            payment["allowed_tools"],
            {"umc.applications": {"parameters": {"properties": {"keyword": {"type": "string"}}}}},
            {},
            "Individual Peter",
        )
        self.assertEqual(missing_skill_slot, {})

    def test_unknown_account_record_queries_have_identical_local_refusal(self) -> None:
        known_shape = DSHService.profile_scope_guard(
            "查询 rui.wang 的许可证、罚单和待办事项。",
            "en",
            self.global_context,
        )
        nonexistent_shape = DSHService.profile_scope_guard(
            "查询 umc-nonexistent-9f3a72 的许可证、罚单和待办事项。",
            "en",
            self.global_context,
        )

        self.assertEqual(known_shape, nonexistent_shape)
        self.assertEqual(known_shape["code"], "external_account_lookup")
        self.assertNotIn("rui.wang", known_shape["content"])
        self.assertNotIn("profileAction", known_shape)
        self.assertEqual(
            DSHService.profile_scope_guard(
                "Show alice@example.com's applications",
                "en",
                self.global_context,
            )["code"],
            "external_account_lookup",
        )
        self.assertIsNone(
            DSHService.profile_scope_guard(
                "Show my applications",
                "en",
                self.global_context,
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
