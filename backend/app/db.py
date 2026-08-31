from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Index, Integer, String, Text, UniqueConstraint, delete, func, select, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import DEFAULT_SKILL_ROUTER_FALLBACK_SKILL_ID, get_settings
from .console_auth import CONSOLE_PASSWORD_CONFIG_KEY, DEFAULT_CONSOLE_PASSWORD


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(AsyncAttrs, DeclarativeBase):
    pass


class Conversation(Base):
    __tablename__ = "conversation_session"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "conversation_id", name="uq_conversation_owner"),
        Index("ix_conversation_owner", "tenant_id", "user_id", "conversation_id"),
        Index("ix_conversation_audit_order", "last_activity_at", "id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(64), index=True)
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    dsh_session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    runtime_profile: Mapped[str] = mapped_column(String(128), default="default")
    runtime_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="READY")
    last_seq: Mapped[int] = mapped_column(Integer, default=0)
    workspace: Mapped[str] = mapped_column(String(256), default="default")
    skill_profile: Mapped[str] = mapped_column(String(128), default="default")
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SessionEvent(Base):
    __tablename__ = "session_event"
    __table_args__ = (
        UniqueConstraint("conversation_id", "seq", name="uq_event_sequence"),
        Index("ix_event_conversation_seq", "conversation_id", "seq"),
        Index("ix_event_owner", "tenant_id", "user_id", "conversation_id"),
        Index("ix_event_conversation_created", "conversation_id", "created_at", "id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    conversation_id: Mapped[str] = mapped_column(String(64), index=True)
    dsh_session_id: Mapped[str] = mapped_column(String(64), index=True)
    seq: Mapped[int] = mapped_column(Integer)
    event_type: Mapped[str] = mapped_column(String(64))
    event_json: Mapped[dict[str, Any]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditRecord(Base):
    """Durable chain-of-custody record for conversation and runtime activity."""

    __tablename__ = "audit_record"
    __table_args__ = (
        Index("ix_audit_created_at", "created_at"),
        Index("ix_audit_conversation_created", "conversation_id", "created_at"),
        Index("ix_audit_conversation_category_created", "conversation_id", "category", "created_at", "id"),
        Index("ix_audit_request", "request_id"),
        Index("ix_audit_runtime", "runtime_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    conversation_id: Mapped[str] = mapped_column(String(64), index=True)
    dsh_session_id: Mapped[str] = mapped_column(String(64), index=True)
    request_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    runtime_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    category: Mapped[str] = mapped_column(String(32), index=True)
    record_type: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class MessageIdempotency(Base):
    __tablename__ = "message_idempotency"
    __table_args__ = (UniqueConstraint("conversation_id", "client_message_id", name="uq_client_message"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(64), index=True)
    client_message_id: Mapped[str] = mapped_column(String(128))
    user_event_seq: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConfigEntry(Base):
    __tablename__ = "config_entry"
    __table_args__ = (UniqueConstraint("scope", "key", name="uq_config_scope_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scope: Mapped[str] = mapped_column(String(128), index=True)
    key: Mapped[str] = mapped_column(String(128))
    version: Mapped[int] = mapped_column(Integer, default=1)
    value: Mapped[dict[str, Any]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    updated_by: Mapped[str] = mapped_column(String(128), default="system")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Skill(Base):
    __tablename__ = "skill"
    __table_args__ = (UniqueConstraint("skill_id", "version", name="uq_skill_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    skill_id: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(256))
    version: Mapped[int] = mapped_column(Integer, default=1)
    source: Mapped[str] = mapped_column(String(64), default="ops")
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    scope: Mapped[str] = mapped_column(String(128), default="system")
    enabled: Mapped[bool] = mapped_column(default=False)
    allowed_tools: Mapped[list[str]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=list)
    dependencies: Mapped[list[str]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=list)
    domain: Mapped[str] = mapped_column(String(128), default="general", server_default="general")
    aliases: Mapped[list[str]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=list)
    positive_examples: Mapped[list[str]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=list)
    negative_examples: Mapped[list[str]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=list)
    workflow: Mapped[dict[str, Any]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    content: Mapped[str] = mapped_column(Text, default="")
    updated_by: Mapped[str] = mapped_column(String(128), default="system")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Tool(Base):
    __tablename__ = "tool_registry"
    __table_args__ = (
        UniqueConstraint("tool_name", name="uq_tool_name"),
        UniqueConstraint("interface_key", name="uq_tool_interface"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tool_name: Mapped[str] = mapped_column(String(160), index=True)
    display_name: Mapped[str] = mapped_column(String(256))
    description: Mapped[str] = mapped_column(Text, default="")
    operation_id: Mapped[str] = mapped_column(String(256), default="")
    http_method: Mapped[str] = mapped_column(String(16))
    http_path: Mapped[str] = mapped_column(String(512))
    interface_key: Mapped[str] = mapped_column(String(600), index=True)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    response_schema: Mapped[dict[str, Any]] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    auth_strategy: Mapped[str] = mapped_column(String(128), default="current_umc_bearer_token")
    side_effect: Mapped[str] = mapped_column(String(32), default="read")
    confirmation_required: Mapped[bool] = mapped_column(default=False)
    rbac_policy: Mapped[str] = mapped_column(String(512), default="trusted_principal")
    masking_policy: Mapped[str] = mapped_column(String(512), default="default")
    swagger_source: Mapped[str] = mapped_column(String(1024), default="")
    source: Mapped[str] = mapped_column(String(64), default="swagger")
    version: Mapped[int] = mapped_column(Integer, default=1)
    enabled: Mapped[bool] = mapped_column(default=False)
    published: Mapped[bool] = mapped_column(default=False)
    updated_by: Mapped[str] = mapped_column(String(128), default="system")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


settings = get_settings()
engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        # create_all does not alter an existing PostgreSQL table. These
        # additive columns keep deployments upgraded in place, including the
        # local database imported from the previous environment.
        if connection.dialect.name == "postgresql":
            await connection.execute(text("ALTER TABLE skill ADD COLUMN IF NOT EXISTS domain VARCHAR(128) NOT NULL DEFAULT 'general'"))
            await connection.execute(text("ALTER TABLE skill ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]'::jsonb"))
            await connection.execute(text("ALTER TABLE skill ADD COLUMN IF NOT EXISTS positive_examples JSONB NOT NULL DEFAULT '[]'::jsonb"))
            await connection.execute(text("ALTER TABLE skill ADD COLUMN IF NOT EXISTS negative_examples JSONB NOT NULL DEFAULT '[]'::jsonb"))
            await connection.execute(text("ALTER TABLE skill ADD COLUMN IF NOT EXISTS workflow JSONB NOT NULL DEFAULT '{}'::jsonb"))

    # Seed the routing skills once so the Skill API and the runtime share the
    # same guardrails. Existing operator-managed versions are preserved.
    from .skills import DEFAULT_SKILL_DEFINITIONS
    from .tool_registry import DEFAULT_BUSINESS_TOOL_DEFINITIONS, SYSTEM_DEFAULT_TOOL_NAMES, interface_key

    async with SessionLocal() as session:
        changed = False
        console_password = await session.execute(
            select(ConfigEntry).where(
                ConfigEntry.scope == "system",
                ConfigEntry.key == CONSOLE_PASSWORD_CONFIG_KEY,
            )
        )
        if console_password.scalar_one_or_none() is None:
            session.add(
                ConfigEntry(
                    scope="system",
                    key=CONSOLE_PASSWORD_CONFIG_KEY,
                    version=1,
                    value={"value": DEFAULT_CONSOLE_PASSWORD},
                    updated_by="system",
                )
            )
            changed = True
        fallback_skill = await session.execute(
            select(ConfigEntry).where(
                ConfigEntry.scope == "system",
                ConfigEntry.key == "skill_router_fallback_skill_id",
            )
        )
        if fallback_skill.scalar_one_or_none() is None:
            session.add(
                ConfigEntry(
                    scope="system",
                    key="skill_router_fallback_skill_id",
                    version=1,
                    value={"value": DEFAULT_SKILL_ROUTER_FALLBACK_SKILL_ID},
                    updated_by="system",
                )
            )
            changed = True
        # Knowledge and OCR are runtime-configured system capabilities, not
        # business Tool Registry rows. Remove rows created by older versions.
        removed_defaults = await session.execute(
            delete(Tool).where(Tool.tool_name.in_((*SYSTEM_DEFAULT_TOOL_NAMES, "umc.licenses")))
        )
        changed = changed or bool(removed_defaults.rowcount)
        for definition in DEFAULT_SKILL_DEFINITIONS:
            result = await session.execute(select(Skill).where(Skill.skill_id == definition["skill_id"], Skill.version == 1))
            existing_skill = result.scalar_one_or_none()
            if existing_skill:
                # Builtin definitions are the deployable business baseline.
                # Apply revisions only while the record is still system-owned;
                # a Skill edited by an operator is intentionally preserved.
                if existing_skill.source == "builtin" and existing_skill.updated_by == "system":
                    for field in ("name", "allowed_tools", "dependencies", "domain", "aliases", "positive_examples", "negative_examples", "workflow", "content"):
                        # New declarative fields may be absent while a development
                        # reloader is between module versions.
                        desired = definition.get(field, {} if field == "workflow" else getattr(existing_skill, field))
                        if getattr(existing_skill, field) != desired:
                            setattr(existing_skill, field, desired)
                            changed = True
                continue
            session.add(
                Skill(
                    skill_id=definition["skill_id"],
                    name=definition["name"],
                    version=1,
                    source="builtin",
                    status="PUBLISHED",
                    scope="system",
                    enabled=True,
                    allowed_tools=definition["allowed_tools"],
                    dependencies=definition["dependencies"],
                    domain=definition.get("domain", "general"),
                    aliases=definition.get("aliases", []),
                    positive_examples=definition.get("positive_examples", []),
                    negative_examples=definition.get("negative_examples", []),
                    workflow=definition.get("workflow", {}),
                    content=definition["content"],
                    updated_by="system",
                )
            )
            changed = True
        for definition in DEFAULT_BUSINESS_TOOL_DEFINITIONS:
            result = await session.execute(select(Tool).where(Tool.tool_name == definition["tool_name"]))
            existing = result.scalar_one_or_none()
            if existing:
                # Upgrade the original hard-coded read adapters to their
                # Swagger-backed Registry definition without overwriting
                # operator-edited descriptions or lifecycle flags.
                if existing.updated_by == "system" and definition.get("source") == "swagger":
                    existing.operation_id = str(definition["operation_id"])
                    existing.http_method = str(definition["http_method"])
                    existing.http_path = str(definition["http_path"])
                    existing.interface_key = interface_key(definition["http_method"], definition["http_path"])
                    existing.parameters = dict(definition.get("parameters", {}))
                    existing.masking_policy = str(definition.get("masking_policy", "default"))
                    existing.source = "swagger"
                    changed = True
                continue
            session.add(
                Tool(
                    **definition,
                    interface_key=interface_key(definition["http_method"], definition["http_path"]),
                    published=True,
                    enabled=True,
                    updated_by="system",
                )
            )
            changed = True
        if changed:
            await session.commit()
