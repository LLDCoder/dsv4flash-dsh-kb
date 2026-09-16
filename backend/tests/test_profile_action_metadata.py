import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import AuditRecord, Base, Conversation, SessionEvent
from app.principal import Principal
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

    async def test_unknown_account_queries_bypass_router_tools_and_llm(self) -> None:
        engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        sessions = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        service = object.__new__(DSHService)
        service.broker = EventBroker()
        service._writer_locks = {}
        service.runtime_manager = SimpleNamespace(get=lambda _conversation_id: SimpleNamespace(state="BUSY"))
        service.skill_catalog = SimpleNamespace(load=AsyncMock(side_effect=AssertionError("router must not run")))
        principal = Principal(
            user_id="user-1",
            tenant_id="umc:global:user-1",
            request_id="request-1",
            profile_id="0",
            umc_identity_verified=True,
        )
        profile_context = profile_context_from_payload(
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
        inputs = {
            "conv-known-shape": "查询 rui.wang 的许可证、罚单和待办事项。",
            "conv-nonexistent-shape": "查询 umc-nonexistent-9f3a72 的许可证、罚单和待办事项。",
        }
        try:
            async with sessions() as db:
                for conversation_id, content in inputs.items():
                    db.add(
                        Conversation(
                            conversation_id=conversation_id,
                            tenant_id=principal.tenant_id,
                            user_id=principal.user_id,
                            dsh_session_id=f"dsh-{conversation_id}",
                            workspace="default",
                            skill_profile="default",
                            runtime_profile="default",
                            status="BUSY",
                            last_seq=1,
                        )
                    )
                    db.add(
                        SessionEvent(
                            tenant_id=principal.tenant_id,
                            user_id=principal.user_id,
                            conversation_id=conversation_id,
                            dsh_session_id=f"dsh-{conversation_id}",
                            seq=1,
                            event_type="user.message",
                            event_json={"content": content, "requestId": principal.request_id},
                        )
                    )
                await db.commit()

            with patch("app.service.SessionLocal", sessions):
                for conversation_id in inputs:
                    await service._run_turn(principal, conversation_id, profile_context)

            async with sessions() as db:
                messages: list[str] = []
                event_shapes: list[list[str]] = []
                for conversation_id in inputs:
                    events = list(
                        (
                            await db.execute(
                                select(SessionEvent)
                                .where(SessionEvent.conversation_id == conversation_id)
                                .order_by(SessionEvent.seq)
                            )
                        ).scalars().all()
                    )
                    event_shapes.append([event.event_type for event in events])
                    assistant = next(event for event in events if event.event_type == "assistant.message")
                    messages.append(assistant.event_json["content"])
                    self.assertNotIn("profileAction", assistant.event_json)
                audits = list((await db.execute(select(AuditRecord))).scalars().all())

            self.assertEqual(messages[0], messages[1])
            self.assertEqual(event_shapes[0], event_shapes[1])
            self.assertFalse(any(record.record_type.startswith("llm.") for record in audits))
            self.assertFalse(any(record.record_type in {"skill.route", "tool.call", "tool.result"} for record in audits))
            service.skill_catalog.load.assert_not_awaited()
        finally:
            await engine.dispose()


if __name__ == "__main__":
    unittest.main()
