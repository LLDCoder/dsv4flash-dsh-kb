import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.service import DSHService
from app.skills import SkillRoute


class _Catalog:
    def __init__(self, items):
        self.items = items

    async def load(self, _db):
        return self.items


class _Router:
    def __init__(self, result):
        self.result = result

    async def route_skill(self, _question, _candidates, _context):
        return self.result


class RouterDecisionTests(unittest.IsolatedAsyncioTestCase):
    def service(self, result):
        service = object.__new__(DSHService)
        service.settings = SimpleNamespace(
            skill_router_mode="llm",
            skill_router_fallback_skill_id="general_knowledge",
        )
        service.skill_catalog = _Catalog(
            [
                {
                    "skillId": "application_status",
                    "domain": "applications",
                    "aliases": ["service applications", "application count"],
                    "positiveExamples": ["How many service applications are registered?"],
                    "allowedTools": ["umc.applications"],
                    "routing": {
                        "intents": [{"id": "list", "description": "List applications"}],
                        "filters": {"keyword": {"type": "string", "description": "Search phrase"}},
                    },
                },
                {
                    "skillId": "general_knowledge",
                    "domain": "general",
                    "aliases": [],
                    "positiveExamples": [],
                    "allowedTools": ["knowledge.search"],
                    "routing": {},
                },
            ]
        )
        service.llm = _Router(result)
        return service

    async def test_explicit_business_domain_survives_narrow_confidence_miss(self):
        service = self.service(
            {
                "skillId": "application_status",
                "intentId": "list",
                "filters": {},
                "confidence": 0.55,
                "needsClarification": False,
            }
        )

        route, metadata = await service.choose_skill_route(
            None,
            "How many service applications are registered under Peter's name?",
            SkillRoute("general", "general"),
            SimpleNamespace(runtime_id="rt_test"),
            "req_test",
            {},
        )

        self.assertEqual(route.skill_id, "application_status")
        self.assertEqual(metadata["fallbackReason"], "domain_consistent_low_confidence")
        self.assertTrue(metadata["domainConsistentLowConfidence"])

    async def test_explicit_business_domain_ignores_redundant_clarification_flag(self):
        service = self.service(
            {
                "skillId": "application_status",
                "intentId": "list",
                "filters": {"keyword": "Peter"},
                "confidence": 0.42,
                "needsClarification": True,
                "clarifyingQuestion": "Do you mean your own applications or Peter's applications?",
            }
        )

        route, metadata = await service.choose_skill_route(
            None,
            "How many service applications are registered under Peter's name?",
            SkillRoute("general", "general"),
            SimpleNamespace(runtime_id="rt_test"),
            "req_test",
            {},
        )

        self.assertEqual(route.skill_id, "application_status")
        self.assertFalse(metadata["needsClarification"])
        self.assertTrue(metadata["classifierNeedsClarification"])
        self.assertEqual(metadata["fallbackReason"], "domain_consistent_low_confidence")
        self.assertEqual(metadata["filters"], {"keyword": "Peter"})
        self.assertGreaterEqual(metadata["currentDomainScore"], 1.0)

    async def test_very_low_confidence_still_uses_configured_knowledge_fallback(self):
        service = self.service(
            {
                "skillId": "application_status",
                "intentId": "list",
                "filters": {},
                "confidence": 0.20,
                "needsClarification": False,
            }
        )

        route, metadata = await service.choose_skill_route(
            None,
            "How many service applications are registered under Peter's name?",
            SkillRoute("general", "general"),
            SimpleNamespace(runtime_id="rt_test"),
            "req_test",
            {},
        )

        self.assertEqual(route.skill_id, "general_knowledge")
        self.assertEqual(metadata["fallbackReason"], "low_confidence")

    async def test_ambiguous_follow_up_requests_clarification_without_kb_fallback(self):
        service = self.service(
            {
                "skillId": "application_status",
                "intentId": "list",
                "filters": {"keyword": "Peter"},
                "confidence": 0.20,
                "needsClarification": True,
                "clarifyingQuestion": "Do you mean the total number of requests under Peter's Profile?",
            }
        )
        context = {
            "activeDomain": "applications",
            "activeSkillId": "application_status",
            "recentMessages": [
                {"role": "user", "content": "How many service applications are registered under Peter's name?"}
            ],
        }

        route, metadata = await service.choose_skill_route(
            None,
            "How many Total assets belong to Peter?",
            SkillRoute("general", "general"),
            SimpleNamespace(runtime_id="rt_test"),
            "req_test",
            context,
        )

        self.assertEqual(route.skill_id, "application_status")
        self.assertEqual(metadata["fallbackReason"], "needs_clarification")
        self.assertEqual(
            service.clarification_message(metadata, "en"),
            "Do you mean the total number of requests under Peter's Profile?",
        )

    async def test_context_alone_does_not_rescue_an_ambiguous_low_confidence_turn(self):
        service = self.service(
            {
                "skillId": "application_status",
                "intentId": "list",
                "filters": {},
                "confidence": 0.55,
                "needsClarification": False,
            }
        )
        route, metadata = await service.choose_skill_route(
            None,
            "How many Total assets belong to Peter?",
            SkillRoute("general", "general"),
            SimpleNamespace(runtime_id="rt_test"),
            "req_test",
            {
                "activeDomain": "applications",
                "activeSkillId": "application_status",
                "recentMessages": [{"role": "user", "content": "service applications"}],
            },
        )

        # Existing active-domain fallback remains available, but the narrow
        # low-confidence rescue is not reported for an ambiguous current turn.
        self.assertEqual(route.skill_id, "application_status")
        self.assertEqual(metadata["fallbackReason"], "low_confidence")
        self.assertNotIn("domainConsistentLowConfidence", metadata)

    def test_total_assets_is_not_a_deterministic_application_route(self):
        from app.skills import resolve_skill

        self.assertNotEqual(
            resolve_skill("How many Total assets belong to Peter?").skill_id,
            "application_status",
        )


if __name__ == "__main__":
    unittest.main()
