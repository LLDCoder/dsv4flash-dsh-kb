import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.skill_router import route_context_from_history
from app.skill_workflow import build_configured_tool_request, matches_configured_selection_follow_up


def event(event_type, **payload):
    return SimpleNamespace(event_type=event_type, event_json=payload)


def list_result(items, *, ok=True, tool_name="umc.violations.list"):
    return event(
        "tool.result",
        toolName=tool_name,
        ok=ok,
        result=json.dumps({"data": {"items": items, "total": len(items)}}),
    )


class PublishedSkillContextTests(unittest.TestCase):
    def test_published_legacy_id_takes_precedence_over_migration(self):
        catalog = [{"skillId": "fine_payment", "domain": "fines"}]
        context = route_context_from_history([event("skill.route", skillId="fine_payment")], catalog)
        self.assertEqual(context["activeSkillId"], "fine_payment")
        self.assertEqual(context["activeDomain"], "fines")

    def test_exact_published_id_wins_when_both_versions_are_published(self):
        catalog = [
            {"skillId": "fine_payment", "domain": "fines"},
            {"skillId": "fine_payment_guidance", "domain": "knowledge"},
        ]
        context = route_context_from_history([event("skill.route", skillId="fine_payment")], catalog)
        self.assertEqual(context["activeSkillId"], "fine_payment")
        self.assertEqual(context["activeDomain"], "fines")

    def test_absent_legacy_id_keeps_existing_migration(self):
        catalog = [{"skillId": "fine_payment_guidance", "domain": "fines"}]
        context = route_context_from_history([event("skill.route", skillId="fine_payment")], catalog)
        self.assertEqual(context["activeSkillId"], "fine_payment_guidance")
        self.assertEqual(context["activeDomain"], "fines")

    def test_latest_cross_domain_route_replaces_fine_context(self):
        catalog = [
            {"skillId": "fine_payment", "domain": "fines"},
            {"skillId": "application_status", "domain": "applications"},
        ]
        history = [
            event("skill.route", skillId="fine_payment"),
            event("skill.route", skillId="application_status"),
        ]
        context = route_context_from_history(history, catalog)
        self.assertEqual(context["activeSkillId"], "application_status")
        self.assertEqual(context["activeDomain"], "applications")


class EmptySelectionFollowUpTests(unittest.TestCase):
    def setUp(self):
        self.workflow = {
            "selection": {
                "sourceTool": "umc.violations.list",
                "itemsPath": "data.items",
                "valueField": "violationNo",
                "identifierFields": ["violationNo"],
                "toolRequest": {
                    "toolName": "umc.violations.detail",
                    "argumentName": "violationNo",
                    "argumentValueType": "string",
                },
            },
            "defaultToolRequest": {
                "toolName": "umc.violations.list",
                "arguments": {"StatusId": 7, "pageNumber": 1, "pageSize": 100},
            },
        }
        self.history = [event("skill.route", skillId="fine_payment"), list_result([])]
        self.allowed_tools = ["umc.violations.list", "umc.violations.detail"]

    def test_successful_empty_list_keeps_generic_ordinal_follow_ups(self):
        for text in [
            "Show the first one in detail.",
            "First one",
            "Please show me the second record in full.",
            "Show details for the first one.",
            "1",
        ]:
            with self.subTest(text=text):
                self.assertTrue(matches_configured_selection_follow_up(self.workflow, text, self.history))

    def test_empty_selection_requeries_list_without_fabricating_detail_id(self):
        request = build_configured_tool_request(
            self.workflow, self.allowed_tools, "Show the first one in detail.", self.history
        )
        self.assertEqual(request, ("umc.violations.list", {"StatusId": 7, "pageNumber": 1, "pageSize": 100}))

    def test_empty_selection_does_not_claim_explicit_domain_or_payment_questions(self):
        for text in [
            "Show the first application in detail.",
            "Show my first refund.",
            "What application is this complaint related to?",
            "Where can I pay this fine?",
            "What are the first steps for a new application?",
        ]:
            with self.subTest(text=text):
                self.assertFalse(matches_configured_selection_follow_up(self.workflow, text, self.history))

    def test_empty_selection_requires_successful_authoritative_result(self):
        for history in [
            [],
            [list_result([], ok=False)],
            [event("tool.result", toolName="umc.violations.list", result={"data": {"items": []}})],
            [event("tool.result", toolName="umc.violations.list", ok=True, result={"data": {}})],
        ]:
            with self.subTest(history=history):
                self.assertFalse(matches_configured_selection_follow_up(self.workflow, "First one", history))

    def test_latest_failed_or_malformed_result_does_not_restore_older_selection(self):
        old_record = list_result([{"violationNo": "VN-TEST-1"}])
        for latest in [
            list_result([], ok=False),
            event("tool.result", toolName="umc.violations.list", ok=True, result="truncated"),
        ]:
            history = [old_record, latest]
            with self.subTest(latest=latest):
                self.assertFalse(matches_configured_selection_follow_up(self.workflow, "First one", history))
                request = build_configured_tool_request(self.workflow, self.allowed_tools, "First one", history)
                self.assertEqual(request[0], "umc.violations.list")

    def test_newer_empty_list_replaces_older_nonempty_list(self):
        history = [list_result([{"violationNo": "VN-TEST-1"}]), *self.history]
        self.assertTrue(matches_configured_selection_follow_up(self.workflow, "First one", history))
        request = build_configured_tool_request(self.workflow, self.allowed_tools, "First one", history)
        self.assertEqual(request[0], "umc.violations.list")

    def test_cross_domain_route_makes_old_empty_list_stale(self):
        history = [*self.history, event("skill.route", skillId="application_status")]
        self.assertFalse(matches_configured_selection_follow_up(self.workflow, "First one", history))
        history.append(event("skill.route", skillId="fine_payment"))
        self.assertFalse(matches_configured_selection_follow_up(self.workflow, "First one", history))

    def test_newer_unrelated_lookup_makes_old_empty_list_stale(self):
        history = [*self.history, list_result([], tool_name="umc.applications")]
        self.assertFalse(matches_configured_selection_follow_up(self.workflow, "First one", history))

    def test_same_skill_guidance_does_not_discard_empty_list(self):
        history = [*self.history, event("skill.route", skillId="fine_payment")]
        self.assertTrue(matches_configured_selection_follow_up(self.workflow, "First one", history))

    def test_nonempty_selection_still_uses_returned_record_identifier(self):
        history = [list_result([{"violationNo": "VN-TEST-1"}, {"violationNo": "VN-TEST-2"}])]
        for text, identifier in [("Show the first one in detail.", "VN-TEST-1"), ("VN-TEST-2", "VN-TEST-2")]:
            with self.subTest(text=text):
                self.assertTrue(matches_configured_selection_follow_up(self.workflow, text, history))
                self.assertEqual(
                    build_configured_tool_request(self.workflow, self.allowed_tools, text, history),
                    ("umc.violations.detail", {"violationNo": identifier}),
                )

    def test_other_list_detail_workflows_keep_ordinal_selection(self):
        workflow = {
            "selection": {
                "sourceTool": "umc.applications",
                "itemsPath": "data.items",
                "valueField": "id",
                "toolRequest": {"toolName": "umc.application_detail", "argumentName": "applicationId"},
            },
        }
        history = [list_result([{"id": 101}], tool_name="umc.applications")]
        self.assertTrue(matches_configured_selection_follow_up(workflow, "Show the first one in detail.", history))
        self.assertEqual(
            build_configured_tool_request(workflow, ["umc.application_detail"], "Show the first one in detail.", history),
            ("umc.application_detail", {"applicationId": 101}),
        )


if __name__ == "__main__":
    unittest.main()
