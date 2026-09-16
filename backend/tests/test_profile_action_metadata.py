import sys
import unittest
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import Base, Conversation
from app.profile_scope import profile_context_from_payload
from app.service import DSHService, EventBroker
from app.skills import DEFAULT_SKILL_DEFINITIONS, merged_skill_workflow


class ProfileActionMetadataTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.concrete_context = profile_context_from_payload(
            {"activeProfileId": "22", "activeProfileName": "Government UMC"},
            trusted_profile_id="22",
        )
        self.global_context = profile_context_from_payload(
            {"activeProfileId": "0", "activeProfileName": "Global View", "isGlobalView": True},
            trusted_profile_id="0",
        )

    def test_authoritative_profile_errors_always_expose_profile_menu_action(self) -> None:
        for code in ("profile_selection_required", "selected_profile_not_available"):
            with self.subTest(code=code):
                self.assertEqual(
                    DSHService.profile_action_for_tool_result(
                        {"ok": False, "code": code},
                        self.global_context,
                        {},
                    ),
                    {"type": "open_profile_menu", "code": code},
                )

    def test_declared_empty_result_in_concrete_profile_exposes_generic_action(self) -> None:
        workflow = {"profileAction": {"emptyResultItemsPath": "data.items"}}

        action = DSHService.profile_action_for_tool_result(
            {"ok": True, "code": "ok", "result": {"data": {"items": []}}},
            self.concrete_context,
            workflow,
        )

        self.assertEqual(
            action,
            {"type": "open_profile_menu", "code": "no_results_current_profile"},
        )

    def test_global_empty_result_never_exposes_profile_action(self) -> None:
        action = DSHService.profile_action_for_tool_result(
            {"ok": True, "code": "ok", "result": {"data": {"items": []}}},
            self.global_context,
            {"profileAction": {"emptyResultItemsPath": "data.items"}},
        )

        self.assertIsNone(action)

    def test_empty_result_requires_explicit_skill_configuration_and_exact_path(self) -> None:
        empty_result = {"ok": True, "code": "ok", "result": {"data": {"items": []}}}

        self.assertIsNone(
            DSHService.profile_action_for_tool_result(
                empty_result,
                self.concrete_context,
                {},
            )
        )
        self.assertIsNone(
            DSHService.profile_action_for_tool_result(
                empty_result,
                self.concrete_context,
                {"profileAction": {"emptyResultItemsPath": "services"}},
            )
        )
        self.assertIsNone(
            DSHService.profile_action_for_tool_result(
                {"ok": True, "code": "ok", "result": {"data": {"items": [{"id": 1}]}}},
                self.concrete_context,
                {"profileAction": {"emptyResultItemsPath": "data.items"}},
            )
        )

    def test_only_skills_with_existing_current_profile_empty_semantics_opt_in(self) -> None:
        workflows = {
            item["skill_id"]: merged_skill_workflow(item["skill_id"], item.get("workflow"))
            for item in DEFAULT_SKILL_DEFINITIONS
        }

        self.assertEqual(
            {
                skill_id
                for skill_id, workflow in workflows.items()
                if isinstance(workflow.get("profileAction"), dict)
            },
            {
                "application_status",
                "license_permit_status",
                "media_licensing_account_services",
                "service_eligibility",
            },
        )

    async def test_assistant_message_profile_action_is_persisted_and_published(self) -> None:
        engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        sessions = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        service = object.__new__(DSHService)
        service.broker = EventBroker()
        queue = service.broker.subscribe("conv-profile-action")
        action = {"type": "open_profile_menu", "code": "no_results_current_profile"}
        try:
            async with sessions() as db:
                conversation = Conversation(
                    conversation_id="conv-profile-action",
                    tenant_id="umc:profile:22",
                    user_id="user-1",
                    dsh_session_id="dsh-profile-action",
                    workspace="default",
                    skill_profile="default",
                    runtime_profile="default",
                    status="READY",
                    last_seq=0,
                )
                db.add(conversation)
                await db.commit()
                await db.refresh(conversation)

                await service.append_event(
                    db,
                    conversation,
                    "assistant.message",
                    {"content": "No matching record was found.", "requestId": "request-1", "profileAction": action},
                )
                persisted = await service.list_events(db, conversation)

            published = queue.get_nowait()
            self.assertEqual(persisted[0].event_json["profileAction"], action)
            self.assertEqual(published["eventType"], "assistant.message")
            self.assertEqual(published["data"]["profileAction"], action)
        finally:
            service.broker.unsubscribe("conv-profile-action", queue)
            await engine.dispose()


if __name__ == "__main__":
    unittest.main()
