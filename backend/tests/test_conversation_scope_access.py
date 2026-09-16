import asyncio
import base64
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import make_router
from app.db import Base, Conversation, MessageFeedback, SessionEvent, get_db
from app.principal import Principal
from app.service import DSHService


def jwt_with_profile(profile_id: str) -> str:
    def encoded(value: dict) -> str:
        raw = json.dumps(value, separators=(",", ":")).encode()
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    return f"{encoded({'alg': 'none'})}.{encoded({'UserProFileId': profile_id})}.signature"


class ConversationScopeAccessTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)
        self.service = object.__new__(DSHService)
        self.service.settings = SimpleNamespace(
            audit_admin_enabled=False,
            audit_admin_user_ids="",
        )
        self.service._audit_admin_env_enabled = False
        self.service._audit_admin_env_user_ids = ""
        self.service.runtime_manager = SimpleNamespace(get=lambda _conversation_id: None)
        self.service._turn_tasks = {}
        self.service._writer_locks = {}

        self.app = FastAPI()
        self.app.include_router(make_router(self.service))

        async def test_db():
            async with self.sessions() as session:
                yield session

        self.app.dependency_overrides[get_db] = test_db
        self.client = AsyncClient(transport=ASGITransport(app=self.app), base_url="http://test")
        self.verify_umc = patch(
            "app.api.verified_umc_user_info",
            new=AsyncMock(return_value={"data": {"UserID": "user-1"}}),
        )
        self.verify_umc.start()
        await self.seed_conversations()

    async def asyncTearDown(self):
        self.verify_umc.stop()
        await self.client.aclose()
        await self.engine.dispose()

    async def seed_conversations(self) -> None:
        rows = (
            ("conv-global", "umc:global:user-1", "user-1"),
            ("conv-profile", "umc:profile:9467", "user-1"),
            ("conv-establishment", "umc:establishment:16", "user-1"),
            ("conv-non-umc", "demo-tenant", "user-1"),
            ("conv-other-user", "umc:profile:999", "user-2"),
        )
        async with self.sessions() as db:
            for index, (conversation_id, tenant_id, user_id) in enumerate(rows, start=1):
                db.add(Conversation(
                    conversation_id=conversation_id,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    dsh_session_id=f"dsh-{index}",
                    workspace="default",
                    skill_profile="default",
                    runtime_profile="default",
                    status="READY",
                    last_seq=4 if conversation_id == "conv-profile" else 0,
                ))
            db.add_all((
                SessionEvent(
                    tenant_id="umc:profile:9467",
                    user_id="user-1",
                    conversation_id="conv-profile",
                    dsh_session_id="dsh-2",
                    seq=1,
                    event_type="user.message",
                    event_json={"content": "Show my license"},
                ),
                SessionEvent(
                    tenant_id="umc:profile:9467",
                    user_id="user-1",
                    conversation_id="conv-profile",
                    dsh_session_id="dsh-2",
                    seq=2,
                    event_type="tool.result",
                    event_json={"secretInternalDetail": "must not cross scope"},
                ),
                SessionEvent(
                    tenant_id="umc:profile:9467",
                    user_id="user-1",
                    conversation_id="conv-profile",
                    dsh_session_id="dsh-2",
                    seq=3,
                    event_type="assistant.message",
                    event_json={"content": "Your license is active."},
                ),
                SessionEvent(
                    tenant_id="umc:profile:9467",
                    user_id="user-1",
                    conversation_id="conv-profile",
                    dsh_session_id="dsh-2",
                    seq=4,
                    event_type="skill.route",
                    event_json={"skillId": "license_permit_status"},
                ),
                MessageFeedback(
                    tenant_id="umc:profile:9467",
                    user_id="user-1",
                    conversation_id="conv-profile",
                    assistant_event_seq=3,
                    rating="up",
                ),
            ))
            await db.commit()

    @staticmethod
    def principal(tenant_id: str, *, profile_id: str | None, user_id: str = "user-1") -> Principal:
        return Principal(
            user_id=user_id,
            tenant_id=tenant_id,
            request_id="request-1",
            profile_id=profile_id,
            umc_identity_verified=profile_id == "0",
        )

    async def test_global_lists_all_same_user_umc_scopes_only(self):
        principal = self.principal("umc:global:user-1", profile_id="0")
        async with self.sessions() as db:
            conversations = await self.service.list_owned_conversations(db, principal)

        self.assertEqual(
            {item.conversation_id for item in conversations},
            {"conv-global", "conv-profile", "conv-establishment"},
        )

    async def test_specific_profile_remains_exact_tenant_only(self):
        principal = self.principal("umc:profile:9467", profile_id="9467")
        async with self.sessions() as db:
            conversations = await self.service.list_owned_conversations(db, principal)
            with self.assertRaises(LookupError):
                await self.service.get_readable_conversation(db, principal, "conv-global")

        self.assertEqual([item.conversation_id for item in conversations], ["conv-profile"])

    async def test_forged_global_tenant_without_global_claim_is_not_aggregate(self):
        principal = self.principal("umc:global:user-1", profile_id="9467")
        async with self.sessions() as db:
            conversations = await self.service.list_owned_conversations(db, principal)
            with self.assertRaises(LookupError):
                await self.service.get_readable_conversation(db, principal, "conv-profile")

        self.assertEqual([item.conversation_id for item in conversations], ["conv-global"])

    async def test_global_cross_scope_is_readable_but_not_mutable(self):
        principal = self.principal("umc:global:user-1", profile_id="0")
        async with self.sessions() as db:
            conversation = await self.service.get_readable_conversation(db, principal, "conv-profile")
            with self.assertRaises(LookupError):
                await self.service.get_owned_conversation(db, principal, "conv-profile")

        item = self.service.conversation_json(conversation, principal=principal)
        self.assertEqual(item["sourceTenantId"], "umc:profile:9467")
        self.assertEqual(item["sourceScopeType"], "profile")
        self.assertEqual(item["sourceScopeId"], "9467")
        self.assertTrue(item["readOnly"])

    async def test_rest_global_list_and_history_expose_source_but_hide_internal_events(self):
        headers = {
            "X-User-Id": "user-1",
            "X-Tenant-Id": "umc:global:user-1",
            "Authorization": f"Bearer {jwt_with_profile('0')}",
        }
        listing = await self.client.get("/api/v1/conversations", headers=headers)
        history = await self.client.get("/api/v1/conversations/conv-profile/history", headers=headers)

        self.assertEqual(listing.status_code, 200, listing.text)
        items = {item["conversationId"]: item for item in listing.json()["conversations"]}
        self.assertEqual(set(items), {"conv-global", "conv-profile", "conv-establishment"})
        self.assertTrue(items["conv-profile"]["readOnly"])
        self.assertEqual(items["conv-profile"]["sourceTenantId"], "umc:profile:9467")

        self.assertEqual(history.status_code, 200, history.text)
        payload = history.json()
        self.assertTrue(payload["readOnly"])
        self.assertEqual(payload["sourceTenantId"], "umc:profile:9467")
        self.assertEqual([event["eventType"] for event in payload["events"]], ["user.message", "assistant.message"])
        self.assertEqual(payload["events"][1]["data"]["feedback"], "up")
        self.assertNotIn("secretInternalDetail", history.text)

    async def test_rest_non_global_claim_cannot_upgrade_with_global_tenant_header(self):
        headers = {
            "X-User-Id": "user-1",
            "X-Tenant-Id": "umc:global:user-1",
            "Authorization": f"Bearer {jwt_with_profile('9467')}",
        }
        listing = await self.client.get("/api/v1/conversations", headers=headers)
        cross_scope = await self.client.get("/api/v1/conversations/conv-profile", headers=headers)

        self.assertEqual(listing.status_code, 403, listing.text)
        self.assertEqual(cross_scope.status_code, 403)

    async def test_compatibility_api_derives_safe_default_tenant_from_profile_claim(self):
        profile_headers = {
            "X-User-Id": "user-1",
            "Authorization": f"Bearer {jwt_with_profile('9467')}",
        }
        global_headers = {
            "X-User-Id": "user-1",
            "Authorization": f"Bearer {jwt_with_profile('0')}",
        }

        profile_listing = await self.client.get("/api/v1/ai-chat/conversations", headers=profile_headers)
        global_listing = await self.client.get("/api/v1/ai-chat/conversations", headers=global_headers)

        self.assertEqual(profile_listing.status_code, 200, profile_listing.text)
        self.assertEqual(
            [item["conversationId"] for item in profile_listing.json()["conversations"]],
            ["conv-profile"],
        )
        self.assertEqual(global_listing.status_code, 200, global_listing.text)
        self.assertEqual(
            [item["conversationId"] for item in global_listing.json()["conversations"]],
            ["conv-global"],
        )

    async def test_failed_live_global_identity_check_returns_service_unavailable(self):
        self.verify_umc.stop()
        failed_verification = patch(
            "app.api.verified_umc_user_info",
            new=AsyncMock(side_effect=ValueError("invalid response")),
        )
        failed_verification.start()
        self.verify_umc = failed_verification
        headers = {
            "X-User-Id": "user-1",
            "X-Tenant-Id": "umc:global:user-1",
            "Authorization": f"Bearer {jwt_with_profile('0')}",
        }

        listing = await self.client.get("/api/v1/conversations", headers=headers)
        cross_scope = await self.client.get("/api/v1/conversations/conv-profile", headers=headers)

        self.assertEqual(listing.status_code, 503, listing.text)
        self.assertEqual(cross_scope.status_code, 503)

    async def test_global_read_rejects_missing_token_and_mismatched_live_identity(self):
        global_headers = {
            "X-User-Id": "user-1",
            "X-Tenant-Id": "umc:global:user-1",
        }
        missing_token = await self.client.get("/api/v1/conversations", headers=global_headers)
        self.assertEqual(missing_token.status_code, 401)

        self.verify_umc.stop()
        mismatched_verification = patch(
            "app.api.verified_umc_user_info",
            new=AsyncMock(return_value={"data": {"UserID": "user-2"}}),
        )
        mismatched_verification.start()
        self.verify_umc = mismatched_verification
        mismatched = await self.client.get(
            "/api/v1/conversations",
            headers={
                **global_headers,
                "Authorization": f"Bearer {jwt_with_profile('0')}",
            },
        )
        self.assertEqual(mismatched.status_code, 403)

    async def test_cross_scope_write_and_live_event_endpoints_are_rejected(self):
        headers = {
            "X-User-Id": "user-1",
            "X-Tenant-Id": "umc:global:user-1",
            "Authorization": f"Bearer {jwt_with_profile('0')}",
        }
        deleted = await self.client.delete("/api/v1/conversations/conv-profile", headers=headers)
        feedback = await self.client.put(
            "/api/v1/conversations/conv-profile/messages/3/feedback",
            headers=headers,
            json={"rating": "up"},
        )
        events = await self.client.get("/api/v1/conversations/conv-profile/events", headers=headers)

        self.assertEqual(deleted.status_code, 404)
        self.assertEqual(feedback.status_code, 404)
        self.assertEqual(events.status_code, 404)

    async def test_unauthorized_cancel_does_not_cancel_foreign_scope_task(self):
        blocker = asyncio.Event()

        async def pending_turn():
            await blocker.wait()

        task = asyncio.create_task(pending_turn())
        self.service._turn_tasks["conv-profile"] = task
        principal = self.principal("umc:global:user-1", profile_id="0")
        try:
            with patch("app.service.SessionLocal", self.sessions):
                with self.assertRaises(LookupError):
                    await self.service.cancel(principal, "conv-profile")
            self.assertFalse(task.cancelled())
            self.assertFalse(task.done())
        finally:
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task


if __name__ == "__main__":
    unittest.main()
