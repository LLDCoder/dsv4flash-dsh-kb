import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import make_router
from app.audit_auth import (
    AUDIT_ROLE_ADMINISTRATOR,
    AUDIT_ROLE_AUDITOR,
    AUDIT_SESSION_COOKIE,
    LoginRateLimiter,
    hash_password,
    issue_session_token,
    normalize_username,
    session_token_digest,
    validate_password_policy,
    verify_password,
)
from app.console_auth import CONSOLE_SESSION_COOKIE
from app.db import (
    AuditOperator,
    AuditOperatorEvent,
    AuditOperatorSession,
    AuditRecord,
    Base,
    ConfigEntry,
    Conversation,
    SessionEvent,
    Skill,
    Tool,
    bootstrap_audit_operator,
    get_db,
    purge_expired_audit_data,
)
from app.service import DSHService


class FakeService:
    def __init__(self):
        self.console_password = "legacy-console-password"
        self.applied_config_keys: list[str] = []
        self.settings = SimpleNamespace(
            audit_session_idle_seconds=1800,
            audit_session_max_age_seconds=28800,
            audit_cookie_secure=False,
            audit_login_max_failures=2,
            audit_login_lock_seconds=900,
            audit_login_rate_max_attempts=3,
            audit_login_rate_window_seconds=60,
            llm_model="test-model",
            llm_api_key="test-secret-key",
            umc_portal="customer",
            umc_customer_base_url="https://umc-customerportal.sol.daypop.ai",
            umc_document_base_url="",
            database_url="sqlite+aiosqlite://",
            redis_url="redis://redis:6379/0",
        )

    audit_payload = staticmethod(DSHService.audit_payload)
    audit_category = staticmethod(DSHService.audit_category)
    conversation_json = staticmethod(DSHService.conversation_json)

    async def apply_config_entries(self, entries: list[ConfigEntry]) -> None:
        self.applied_config_keys = sorted(item.key for item in entries)


class AuditAuthPrimitiveTests(unittest.TestCase):
    def test_password_policy_requires_length_upper_lower_and_number(self):
        self.assertEqual(validate_password_policy("Admin123"), "Admin123")
        for invalid in ("Admin12", "ADMIN123", "admin123", "AdminPass"):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                validate_password_policy(invalid)

    def test_login_rate_limiter_uses_a_sliding_window(self):
        limiter = LoginRateLimiter()

        self.assertIsNone(limiter.check("ip\nuser", limit=2, window_seconds=10, now=1))
        self.assertIsNone(limiter.check("ip\nuser", limit=2, window_seconds=10, now=2))
        self.assertEqual(limiter.check("ip\nuser", limit=2, window_seconds=10, now=3), 9)
        self.assertIsNone(limiter.check("ip\nuser", limit=2, window_seconds=10, now=12))

    def test_password_hash_is_salted_and_verifiable(self):
        first = hash_password("correct horse battery staple", iterations=1_000)
        second = hash_password("correct horse battery staple", iterations=1_000)

        self.assertNotEqual(first, second)
        self.assertTrue(verify_password("correct horse battery staple", first))
        self.assertFalse(verify_password("wrong", first))
        self.assertFalse(verify_password("correct horse battery staple", "invalid"))

    def test_session_database_value_is_not_the_browser_token(self):
        token, digest = issue_session_token()

        self.assertNotEqual(token, digest)
        self.assertEqual(session_token_digest(token), digest)
        self.assertEqual(normalize_username("  Audit.User@Example.TEST "), "audit.user@example.test")

    def test_audit_payload_redacts_common_key_styles(self):
        payload = DSHService.audit_payload({
            "accessToken": "secret",
            "refreshToken": "secret",
            "api_key": "secret",
            "nested": {"UMC-TOKEN": "secret", "content": "visible"},
        })

        self.assertEqual(payload, {
            "accessToken": "[redacted]",
            "refreshToken": "[redacted]",
            "api_key": "[redacted]",
            "nested": {"UMC-TOKEN": "[redacted]", "content": "visible"},
        })


class AuditConsoleApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine(
            "sqlite+aiosqlite://",
            poolclass=StaticPool,
        )
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)
        self.service = FakeService()
        self.app = FastAPI()
        self.app.include_router(make_router(self.service))

        async def test_db():
            async with self.sessions() as session:
                yield session

        self.app.dependency_overrides[get_db] = test_db
        self.client = AsyncClient(transport=ASGITransport(app=self.app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()
        await self.engine.dispose()

    async def add_operator(self, username: str, password: str, role: str) -> AuditOperator:
        async with self.sessions() as db:
            operator = AuditOperator(
                username=normalize_username(username),
                display_name=username,
                password_hash=hash_password(password, iterations=1_000),
                role=role,
            )
            db.add(operator)
            await db.commit()
            await db.refresh(operator)
            return operator

    async def login(self, username: str, password: str, *, client: AsyncClient | None = None):
        return await (client or self.client).post(
            "/api/v1/audit-auth/login",
            json={"username": username, "password": password},
        )

    async def test_fixed_roles_last_admin_and_session_revocation(self):
        administrator = await self.add_operator("Admin@Example.test", "admin-password", AUDIT_ROLE_ADMINISTRATOR)

        anonymous = await self.client.get("/api/v1/audit/conversations")
        self.assertEqual(anonymous.status_code, 401)

        legacy = await self.client.post("/api/v1/console/login", json={"password": self.service.console_password})
        self.assertEqual(legacy.status_code, 200)
        self.assertIn(CONSOLE_SESSION_COOKIE, legacy.cookies)
        self.assertNotIn(AUDIT_SESSION_COOKIE, legacy.cookies)
        legacy_cannot_read_audit = await self.client.get("/api/v1/audit/conversations")
        self.assertEqual(legacy_cannot_read_audit.status_code, 401)

        logged_in = await self.login("  ADMIN@example.TEST ", "admin-password")
        self.assertEqual(logged_in.status_code, 200)
        self.assertIn(AUDIT_SESSION_COOKIE, logged_in.cookies)
        self.assertIn(CONSOLE_SESSION_COOKIE, self.client.cookies)

        last_admin = await self.client.patch(
            f"/api/v1/audit/users/{administrator.id}",
            json={"role": AUDIT_ROLE_AUDITOR},
        )
        self.assertEqual(last_admin.status_code, 409)

        created = await self.client.post(
            "/api/v1/audit/users",
            json={
                "username": "  Reader@Example.TEST ",
                "displayName": "Audit Reader",
                "role": AUDIT_ROLE_AUDITOR,
                "password": "ReaderPass123",
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        reader_id = created.json()["user"]["id"]
        self.assertEqual(created.json()["user"]["username"], "reader@example.test")
        promoted = await self.client.patch(
            f"/api/v1/audit/users/{reader_id}",
            json={"role": AUDIT_ROLE_ADMINISTRATOR},
        )
        self.assertEqual(promoted.json()["user"]["role"], AUDIT_ROLE_ADMINISTRATOR)
        demoted = await self.client.patch(
            f"/api/v1/audit/users/{reader_id}",
            json={"role": AUDIT_ROLE_AUDITOR},
        )
        self.assertEqual(demoted.json()["user"]["role"], AUDIT_ROLE_AUDITOR)

        reader_client = AsyncClient(transport=ASGITransport(app=self.app), base_url="http://test")
        try:
            reader_login = await self.login("reader@example.test", "ReaderPass123", client=reader_client)
            self.assertEqual(reader_login.status_code, 200)
            readable = await reader_client.get("/api/v1/audit/conversations")
            self.assertEqual(readable.status_code, 200)
            forbidden = await reader_client.get("/api/v1/audit/users")
            self.assertEqual(forbidden.status_code, 403)

            disabled = await self.client.patch(f"/api/v1/audit/users/{reader_id}", json={"disabled": True})
            self.assertEqual(disabled.status_code, 200)
            revoked = await reader_client.get("/api/v1/audit-auth/session")
            self.assertEqual(revoked.status_code, 200)
            self.assertFalse(revoked.json()["authenticated"])

            reenabled = await self.client.patch(f"/api/v1/audit/users/{reader_id}", json={"disabled": False})
            self.assertEqual(reenabled.status_code, 200)
            self.assertEqual((await self.login("reader@example.test", "ReaderPass123", client=reader_client)).status_code, 200)
            reset = await self.client.post(
                f"/api/v1/audit/users/{reader_id}/password",
                json={"password": "NewReader123"},
            )
            self.assertEqual(reset.status_code, 200)
            reset_revoked = await reader_client.get("/api/v1/audit-auth/session")
            self.assertFalse(reset_revoked.json()["authenticated"])
            self.assertEqual((await self.login("reader@example.test", "ReaderPass123", client=reader_client)).status_code, 401)
            self.assertEqual((await self.login("reader@example.test", "NewReader123", client=reader_client)).status_code, 200)
        finally:
            await reader_client.aclose()

    async def test_bootstrap_is_explicit_and_only_applies_to_an_empty_table(self):
        settings = SimpleNamespace(
            audit_bootstrap_username=" First.Admin@Example.TEST ",
            audit_bootstrap_password="Bootstrap123",
            audit_bootstrap_display_name="First Administrator",
        )
        async with self.sessions() as db:
            self.assertTrue(await bootstrap_audit_operator(db, settings))
            await db.commit()
            operator = (await db.execute(select(AuditOperator))).scalar_one()
            self.assertEqual(operator.username, "first.admin@example.test")
            self.assertEqual(operator.role, AUDIT_ROLE_ADMINISTRATOR)

            settings.audit_bootstrap_username = "replacement@example.test"
            settings.audit_bootstrap_password = "Replacement123"
            self.assertFalse(await bootstrap_audit_operator(db, settings))
            count = int((await db.execute(select(func.count(AuditOperator.id)))).scalar_one())
            self.assertEqual(count, 1)

        incomplete = SimpleNamespace(
            audit_bootstrap_username="admin@example.test",
            audit_bootstrap_password="",
            audit_bootstrap_display_name="Administrator",
        )
        async with self.sessions() as db:
            with self.assertRaises(RuntimeError):
                await bootstrap_audit_operator(db, incomplete)

    async def test_failed_login_locks_account(self):
        await self.add_operator("reader", "correct-password", AUDIT_ROLE_AUDITOR)

        first = await self.login("reader", "wrong-password")
        second = await self.login("reader", "wrong-password")
        correct_while_locked = await self.login("reader", "correct-password")

        self.assertEqual(first.status_code, 401)
        self.assertEqual(second.status_code, 429)
        self.assertEqual(correct_while_locked.status_code, 429)

    async def test_unknown_account_login_is_rate_limited_by_client_and_username(self):
        responses = [await self.login("missing-user", "wrong-password") for _ in range(4)]

        self.assertEqual([response.status_code for response in responses], [401, 401, 401, 429])
        self.assertIn("Retry-After", responses[-1].headers)

    async def test_only_administrator_can_read_redacted_skill_and_tool_diagnostics(self):
        await self.add_operator("diagnostic-admin", "AdminPass123", AUDIT_ROLE_ADMINISTRATOR)
        await self.add_operator("diagnostic-reader", "ReaderPass123", AUDIT_ROLE_AUDITOR)
        async with self.sessions() as db:
            db.add(Skill(
                skill_id="diagnostic-skill",
                name="Diagnostic Skill",
                version=2,
                source="ops",
                status="PUBLISHED",
                enabled=True,
                allowed_tools=["diagnostic.tool", "missing.tool"],
                dependencies=["base-skill"],
                domain="diagnostic",
                aliases=["diagnose"],
                workflow={"password": "skill-secret"},
                content="contains skill-secret",
            ))
            db.add(Tool(
                tool_name="diagnostic.tool",
                display_name="Diagnostic Tool",
                operation_id="diagnose",
                http_method="POST",
                http_path="https://internal.example/private?apiKey=tool-secret",
                interface_key="POST /private",
                parameters={"apiKey": "tool-secret"},
                response_schema={"secret": "tool-secret"},
                auth_strategy="Bearer tool-auth-secret",
                rbac_policy="tool-rbac-secret",
                masking_policy="configured",
                profile_scope={"secret": "tool-profile-secret"},
                swagger_source="https://internal.example/swagger?token=tool-secret",
                enabled=True,
                published=True,
            ))
            await db.commit()

        self.assertEqual((await self.login("diagnostic-admin", "AdminPass123")).status_code, 200)
        skills_response = await self.client.get("/api/v1/audit/skills")
        tools_response = await self.client.get("/api/v1/audit/tools?search=diagnostic.tool")
        self.assertEqual(skills_response.status_code, 200, skills_response.text)
        self.assertEqual(tools_response.status_code, 200, tools_response.text)

        skill = skills_response.json()["items"][0]
        self.assertEqual(skill["missingTools"], ["missing.tool"])
        self.assertTrue(skill["workflowConfigured"])
        self.assertTrue(skill["contentConfigured"])
        self.assertTrue({"workflow", "content", "positiveExamples", "negativeExamples"}.isdisjoint(skill))

        tool = tools_response.json()["items"][0]
        self.assertEqual(tool["httpPath"], "/private")
        self.assertTrue(tool["authenticationRequired"])
        self.assertTrue(tool["maskingConfigured"])
        self.assertTrue({
            "parameters", "responseSchema", "authStrategy", "rbacPolicy",
            "profileScope", "swaggerSource", "interfaceKey",
        }.isdisjoint(tool))
        serialized = str({"skills": skills_response.json(), "tools": tools_response.json()})
        for secret in ("skill-secret", "tool-secret", "tool-auth-secret", "tool-rbac-secret", "tool-profile-secret"):
            self.assertNotIn(secret, serialized)

        auditor = AsyncClient(transport=ASGITransport(app=self.app), base_url="http://test")
        try:
            self.assertEqual((await self.login("diagnostic-reader", "ReaderPass123", client=auditor)).status_code, 200)
            self.assertEqual((await auditor.get("/api/v1/audit/skills")).status_code, 403)
            self.assertEqual((await auditor.get("/api/v1/audit/tools")).status_code, 403)
        finally:
            await auditor.aclose()

    async def test_administrator_can_view_create_and_update_skill_and_tool_details(self):
        await self.add_operator("registry-admin", "AdminPass123", AUDIT_ROLE_ADMINISTRATOR)
        self.assertEqual((await self.login("registry-admin", "AdminPass123")).status_code, 200)

        tool_payload = {
            "toolName": "customer.widgets",
            "displayName": "Customer widgets",
            "description": "Search customer widgets",
            "operationId": "searchWidgets",
            "httpMethod": "GET",
            "httpPath": "/api/widgets",
            "parameters": {"type": "object", "properties": {"keyword": {"type": "string"}}},
            "responseSchema": {"type": "object"},
            "source": "manual",
            "enabled": True,
            "published": True,
        }
        created_tool = await self.client.post("/api/v1/audit/tools", json=tool_payload)
        self.assertEqual(created_tool.status_code, 201, created_tool.text)
        self.assertEqual(created_tool.json()["parameters"], tool_payload["parameters"])

        tool_detail = await self.client.get("/api/v1/audit/tools/customer.widgets")
        self.assertEqual(tool_detail.status_code, 200, tool_detail.text)
        self.assertEqual(tool_detail.json()["operationId"], "searchWidgets")
        tool_payload.pop("toolName")
        tool_payload["description"] = "Updated widget search"
        updated_tool = await self.client.put("/api/v1/audit/tools/customer.widgets", json=tool_payload)
        self.assertEqual(updated_tool.status_code, 200, updated_tool.text)
        self.assertEqual(updated_tool.json()["description"], "Updated widget search")

        first_skill = {
            "skillId": "widget_search",
            "name": "Widget search v1",
            "version": 1,
            "source": "ops",
            "status": "PUBLISHED",
            "scope": "system",
            "enabled": True,
            "allowedTools": ["customer.widgets"],
            "domain": "widgets",
            "workflow": {"routing": {"defaultIntentId": "search"}},
            "content": "Search the customer's widgets.",
        }
        self.assertEqual((await self.client.post("/api/v1/audit/skills", json=first_skill)).status_code, 201)
        second_skill = dict(first_skill)
        second_skill.update({"name": "Widget search v2", "version": 2, "content": "Authoritative v2 instructions."})
        created_second = await self.client.post("/api/v1/audit/skills", json=second_skill)
        self.assertEqual(created_second.status_code, 201, created_second.text)

        first_detail = await self.client.get("/api/v1/audit/skills/widget_search?version=1")
        second_detail = await self.client.get("/api/v1/audit/skills/widget_search?version=2")
        self.assertFalse(first_detail.json()["enabled"])
        self.assertTrue(second_detail.json()["enabled"])
        self.assertEqual(second_detail.json()["content"], "Authoritative v2 instructions.")

        second_skill.pop("skillId")
        second_skill["content"] = "Updated authoritative v2 instructions."
        updated_skill = await self.client.put("/api/v1/audit/skills/widget_search", json=second_skill)
        self.assertEqual(updated_skill.status_code, 200, updated_skill.text)
        self.assertEqual(updated_skill.json()["content"], "Updated authoritative v2 instructions.")

    async def test_auditor_cannot_read_details_or_mutate_skill_and_tool_registry(self):
        await self.add_operator("registry-reader", "ReaderPass123", AUDIT_ROLE_AUDITOR)
        self.assertEqual((await self.login("registry-reader", "ReaderPass123")).status_code, 200)

        skill_payload = {
            "skillId": "forbidden",
            "name": "Forbidden",
            "version": 1,
            "status": "DRAFT",
            "enabled": False,
        }
        tool_payload = {
            "toolName": "forbidden.tool",
            "displayName": "Forbidden",
            "httpMethod": "GET",
            "httpPath": "/forbidden",
        }
        self.assertEqual((await self.client.get("/api/v1/audit/skills/forbidden")).status_code, 403)
        self.assertEqual((await self.client.post("/api/v1/audit/skills", json=skill_payload)).status_code, 403)
        self.assertEqual((await self.client.put("/api/v1/audit/skills/forbidden", json={key: value for key, value in skill_payload.items() if key != "skillId"})).status_code, 403)
        self.assertEqual((await self.client.get("/api/v1/audit/tools/forbidden.tool")).status_code, 403)
        self.assertEqual((await self.client.post("/api/v1/audit/tools", json=tool_payload)).status_code, 403)
        self.assertEqual((await self.client.put("/api/v1/audit/tools/forbidden.tool", json={key: value for key, value in tool_payload.items() if key != "toolName"})).status_code, 403)

    async def test_only_administrator_can_manage_customer_safe_configuration(self):
        await self.add_operator("config-admin", "AdminPass123", AUDIT_ROLE_ADMINISTRATOR)
        await self.add_operator("config-reader", "ReaderPass123", AUDIT_ROLE_AUDITOR)

        reader = AsyncClient(transport=ASGITransport(app=self.app), base_url="http://test")
        try:
            self.assertEqual((await self.login("config-reader", "ReaderPass123", client=reader)).status_code, 200)
            self.assertEqual((await reader.get("/api/v1/audit/config")).status_code, 403)
            self.assertEqual((await reader.patch(
                "/api/v1/audit/config",
                json={"scope": "system", "patch": {"llm_model": "forbidden"}},
            )).status_code, 403)
        finally:
            await reader.aclose()

        self.assertEqual((await self.login("config-admin", "AdminPass123")).status_code, 200)
        response = await self.client.get("/api/v1/audit/config")
        self.assertEqual(response.status_code, 200, response.text)
        items = {item["key"]: item for item in response.json()["items"]}
        self.assertNotIn("umc_admin_base_url", items)
        self.assertNotIn("umc_public_base_url", items)
        self.assertEqual(items["umc_portal"]["value"], "customer")
        self.assertTrue(items["umc_portal"]["readOnly"])
        self.assertFalse(items["database_url"]["readOnly"])
        self.assertFalse(items["redis_url"]["readOnly"])
        self.assertFalse(items["umc_customer_base_url"]["readOnly"])
        self.assertFalse(items["umc_document_base_url"]["readOnly"])
        self.assertEqual(items["database_url"]["value"], "••••••••")
        self.assertEqual(items["llm_api_key"]["value"], "••••••••")
        self.assertNotIn("test-secret-key", response.text)

        protected = await self.client.patch(
            "/api/v1/audit/config",
            json={"scope": "system", "patch": {"umc_portal": "admin"}},
        )
        self.assertEqual(protected.status_code, 422)
        self.assertEqual(
            protected.json()["detail"],
            {"code": "read_only_or_unsupported_config", "keys": ["umc_portal"]},
        )

        updated = await self.client.patch(
            "/api/v1/audit/config",
            json={"scope": "system", "patch": {
                "llm_model": "updated-model",
                "database_url": "postgresql+asyncpg://updated-database/dsh",
                "redis_url": "redis://updated-redis:6379/0",
                "umc_customer_base_url": "https://customer.example.test",
                "umc_document_base_url": "https://documents.example.test",
            }},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        updated_items = {item["key"]: item for item in updated.json()["items"]}
        self.assertEqual(updated_items["llm_model"]["value"], "updated-model")
        self.assertEqual(updated_items["database_url"]["value"], "••••••••")
        self.assertEqual(updated_items["redis_url"]["value"], "••••••••")
        self.assertEqual(updated_items["umc_customer_base_url"]["value"], "https://customer.example.test")
        self.assertEqual(updated_items["umc_document_base_url"]["value"], "https://documents.example.test")
        self.assertEqual(self.service.applied_config_keys, [
            "database_url",
            "llm_model",
            "redis_url",
            "umc_customer_base_url",
            "umc_document_base_url",
        ])

        async with self.sessions() as db:
            entry = (await db.execute(select(ConfigEntry).where(ConfigEntry.key == "llm_model"))).scalar_one()
            event = (await db.execute(select(AuditOperatorEvent).where(
                AuditOperatorEvent.event_type == "configuration.updated"
            ))).scalar_one()
            self.assertEqual(entry.updated_by, "audit:1")
            self.assertEqual(event.detail, {"scope": "system", "keys": [
                "database_url",
                "llm_model",
                "redis_url",
                "umc_customer_base_url",
                "umc_document_base_url",
            ]})
            self.assertNotIn("updated-model", str(event.detail))
            self.assertNotIn("updated-database", str(event.detail))

    async def test_configured_retention_cleans_expired_security_data(self):
        now = datetime.now(timezone.utc)
        old = now - timedelta(days=100)
        async with self.sessions() as db:
            operator = AuditOperator(
                username="retention-admin",
                display_name="Retention Admin",
                password_hash=hash_password("retention-password", iterations=1_000),
                role=AUDIT_ROLE_ADMINISTRATOR,
            )
            db.add(operator)
            await db.flush()
            db.add_all((
                AuditRecord(
                    tenant_id="tenant", user_id="user", conversation_id="old", dsh_session_id="old-session",
                    category="runtime", record_type="old", payload={}, created_at=old,
                ),
                AuditRecord(
                    tenant_id="tenant", user_id="user", conversation_id="new", dsh_session_id="new-session",
                    category="runtime", record_type="new", payload={}, created_at=now,
                ),
                AuditOperatorSession(
                    operator_id=operator.id, token_digest="a" * 64, created_at=old,
                    last_seen_at=old, expires_at=old,
                ),
                AuditOperatorSession(
                    operator_id=operator.id, token_digest="b" * 64, created_at=now,
                    last_seen_at=now, expires_at=now + timedelta(hours=1),
                ),
                AuditOperatorEvent(
                    actor_operator_id=operator.id, username=operator.username,
                    event_type="old", created_at=old,
                ),
                AuditOperatorEvent(
                    actor_operator_id=operator.id, username=operator.username,
                    event_type="new", created_at=now,
                ),
            ))
            await db.commit()

            deleted = await purge_expired_audit_data(
                db,
                SimpleNamespace(
                    audit_retention_days=30,
                    audit_session_retention_days=7,
                    audit_security_event_retention_days=90,
                ),
                now=now,
            )
            await db.commit()

            self.assertEqual(deleted, {"auditRecords": 1, "operatorSessions": 1, "operatorEvents": 1})
            self.assertEqual(int((await db.execute(select(func.count(AuditRecord.id)))).scalar_one()), 1)
            self.assertEqual(int((await db.execute(select(func.count(AuditOperatorSession.id)))).scalar_one()), 1)
            self.assertEqual(int((await db.execute(select(func.count(AuditOperatorEvent.id)))).scalar_one()), 1)

    async def test_detail_uses_unique_dsh_session_id(self):
        await self.add_operator("auditor", "auditor-password", AUDIT_ROLE_AUDITOR)
        now = datetime.now(timezone.utc)
        async with self.sessions() as db:
            first = Conversation(
                conversation_id="shared-browser-id",
                tenant_id="tenant-1",
                user_id="user-1",
                dsh_session_id="dsh-session-1",
                last_activity_at=now,
            )
            second = Conversation(
                conversation_id="shared-browser-id",
                tenant_id="tenant-2",
                user_id="user-2",
                owner_account="second.owner@example.test",
                dsh_session_id="dsh-session-2",
                last_activity_at=now,
            )
            legacy = Conversation(
                conversation_id="legacy-browser-id",
                tenant_id="tenant-1",
                user_id="user-1",
                dsh_session_id="dsh-session-legacy",
                last_activity_at=now - timedelta(minutes=1),
            )
            db.add_all((first, second, legacy))
            db.add_all((
                AuditRecord(
                    tenant_id="tenant-1", user_id="user-1", conversation_id="shared-browser-id",
                    dsh_session_id="dsh-session-1", category="conversation", record_type="user.message",
                    payload={"content": "first tenant", "accessToken": "legacy-secret"},
                ),
                AuditRecord(
                    tenant_id="tenant-2", user_id="user-2", conversation_id="shared-browser-id",
                    dsh_session_id="dsh-session-2", category="conversation", record_type="user.message",
                    payload={"content": "second tenant"},
                ),
                SessionEvent(
                    tenant_id="tenant-1", user_id="user-1", conversation_id="shared-browser-id",
                    dsh_session_id="dsh-session-1", seq=1, event_type="user.message",
                    event_json={
                        "content": "first title",
                        "auditIdentity": {
                            "account": "first.owner@example.test",
                            "currentRole": "Customer Account Owner",
                        },
                    },
                ),
                SessionEvent(
                    tenant_id="tenant-2", user_id="user-2", conversation_id="shared-browser-id",
                    dsh_session_id="dsh-session-2", seq=2, event_type="user.message",
                    event_json={"content": "second title"},
                ),
                SessionEvent(
                    tenant_id="tenant-1", user_id="user-1", conversation_id="legacy-browser-id",
                    dsh_session_id="dsh-session-legacy", seq=1, event_type="user.message",
                    event_json={"content": "legacy title"},
                ),
            ))
            await db.commit()

        self.assertEqual((await self.login("auditor", "auditor-password")).status_code, 200)
        listing = await self.client.get("/api/v1/audit/conversations")
        self.assertEqual(listing.status_code, 200)
        titles = {item["dshSessionId"]: item["title"] for item in listing.json()["conversations"]}
        self.assertEqual(titles, {
            "dsh-session-1": "first title",
            "dsh-session-2": "second title",
            "dsh-session-legacy": "legacy title",
        })
        accounts = {item["dshSessionId"]: item["ownerAccount"] for item in listing.json()["conversations"]}
        self.assertEqual(accounts, {
            "dsh-session-1": "first.owner@example.test",
            "dsh-session-2": "second.owner@example.test",
            "dsh-session-legacy": "first.owner@example.test",
        })

        account_search = await self.client.get("/api/v1/audit/conversations?search=first.owner@example.test")
        self.assertEqual(account_search.status_code, 200)
        self.assertEqual(
            {item["dshSessionId"] for item in account_search.json()["conversations"]},
            {"dsh-session-1", "dsh-session-legacy"},
        )

        detail = await self.client.get("/api/v1/audit/conversations/dsh-session-1")
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual([item["payload"]["content"] for item in detail.json()["items"]], ["first tenant"])
        self.assertEqual(detail.json()["items"][0]["payload"]["accessToken"], "[redacted]")
        self.assertEqual(detail.json()["conversation"]["auditIdentity"], {
            "account": "first.owner@example.test",
            "currentRole": "Customer Account Owner",
        })


if __name__ == "__main__":
    unittest.main()
