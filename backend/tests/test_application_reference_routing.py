import unittest

from app.skill_workflow import build_configured_tool_request
from app.skills import DEFAULT_SKILL_DEFINITIONS, resolve_skill


class ApplicationReferenceRoutingTests(unittest.TestCase):
    @staticmethod
    def workflow():
        return next(
            item["workflow"]
            for item in DEFAULT_SKILL_DEFINITIONS
            if item["skill_id"] == "application_status"
        )

    def test_hc_reference_routes_to_application_status_and_locks_routing(self):
        route = resolve_skill(
            "Please check the detailed information of the current data for "
            "HC-02-2026-3194244. What stage is it at now?"
        )
        self.assertEqual(route.skill_id, "application_status")
        self.assertTrue(route.routing_locked)

    def test_mc_reference_is_also_recognized_but_violation_number_is_not(self):
        self.assertEqual(resolve_skill("Check MC-3-203-2852058").skill_id, "application_status")
        self.assertNotEqual(resolve_skill("Check VN-2026-3497781").skill_id, "application_status")

    def test_specialized_payment_intent_keeps_priority_over_application_number(self):
        self.assertEqual(
            resolve_skill("How much do I need to pay for application ML-2-2026-12345?").skill_id,
            "application_payment_details",
        )

    def test_reference_is_bound_to_the_live_application_keyword(self):
        request = build_configured_tool_request(
            self.workflow(),
            ["umc.applications", "umc.application_detail"],
            "Please show HC-02-2026-3194244 in detail.",
            [],
        )
        self.assertIsNotNone(request)
        tool_name, arguments = request
        self.assertEqual(tool_name, "umc.applications")
        self.assertEqual(arguments["keyword"], "HC-02-2026-3194244")

    def test_explicit_validated_filter_takes_precedence_over_text_binding(self):
        request = build_configured_tool_request(
            self.workflow(),
            ["umc.applications"],
            "Please show HC-02-2026-3194244.",
            [],
            filters={"keyword": "MC-3-203-2852058"},
        )
        self.assertEqual(request[1]["keyword"], "MC-3-203-2852058")


if __name__ == "__main__":
    unittest.main()
