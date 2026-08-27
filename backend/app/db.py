from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Index, Integer, String, Text, UniqueConstraint, func, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(AsyncAttrs, DeclarativeBase):
    pass


class Conversation(Base):
    __tablename__ = "conversation_session"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "conversation_id", name="uq_conversation_owner"),
        Index("ix_conversation_owner", "tenant_id", "user_id", "conversation_id"),
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
    content: Mapped[str] = mapped_column(Text, default="")
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

    # Seed the routing skills once so the Skill API and the runtime share the
    # same guardrails. Existing operator-managed versions are preserved.
    from .skills import DEFAULT_SKILL_DEFINITIONS

    async with SessionLocal() as session:
        changed = False
        for definition in DEFAULT_SKILL_DEFINITIONS:
            result = await session.execute(select(Skill).where(Skill.skill_id == definition["skill_id"], Skill.version == 1))
            if result.scalar_one_or_none():
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
                    content=definition["content"],
                    updated_by="system",
                )
            )
            changed = True
        if changed:
            await session.commit()
