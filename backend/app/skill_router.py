import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

try:  # Redis is optional for local/unit-test environments.
    from redis.asyncio import Redis
except ImportError:  # pragma: no cover - exercised only without the optional dependency
    Redis = None  # type: ignore[assignment,misc]


SKILL_CATALOG_KEY = "dsh:skills:catalog:system:v1"
SKILL_CACHE_TTL_SECONDS = 60
LLM_ROUTER_MODES = {"keyword", "shadow", "llm"}
LLM_ROUTER_MIN_CONFIDENCE = 0.60


class SkillCatalogCache:
    """Cache published Skill summaries and complete definitions in Redis.

    PostgreSQL remains authoritative. Redis failures simply result in a DB
    read, which keeps local development and a cold cache operational.
    """

    def __init__(self, redis_url: str) -> None:
        self.redis = Redis.from_url(redis_url, decode_responses=True) if Redis and redis_url else None

    async def close(self) -> None:
        if self.redis:
            await self.redis.aclose()

    @staticmethod
    def _summary(item: Any) -> dict[str, Any]:
        content = str(item.content or "").strip()
        return {
            "skillId": item.skill_id,
            "name": item.name,
            "description": content[:800],
            "allowedTools": list(item.allowed_tools or []),
            "dependencies": list(item.dependencies or []),
            "domain": getattr(item, "domain", "general") or "general",
            "aliases": list(getattr(item, "aliases", None) or []),
            "positiveExamples": list(getattr(item, "positive_examples", None) or []),
            "negativeExamples": list(getattr(item, "negative_examples", None) or []),
            "version": item.version,
            "status": item.status,
            "enabled": bool(item.enabled),
        }

    @staticmethod
    def _full(item: Any) -> dict[str, Any]:
        result = SkillCatalogCache._summary(item)
        result["content"] = str(item.content or "")
        return result

    async def invalidate(self) -> None:
        if not self.redis:
            return
        try:
            await self.redis.delete(SKILL_CATALOG_KEY)
        except Exception:
            return

    async def load(self, db: AsyncSession) -> list[dict[str, Any]]:
        if self.redis:
            try:
                cached = await self.redis.get(SKILL_CATALOG_KEY)
                if cached:
                    value = json.loads(cached)
                    if isinstance(value, list):
                        return value
            except Exception:
                pass
        from .db import Skill

        result = await db.execute(
            select(Skill)
            .where(Skill.scope == "system", Skill.enabled.is_(True), Skill.status == "PUBLISHED")
            .order_by(Skill.skill_id, Skill.version.desc())
        )
        items = list(result.scalars().all())
        catalog = [self._summary(item) for item in items]
        if self.redis:
            try:
                pipe = self.redis.pipeline()
                pipe.setex(SKILL_CATALOG_KEY, SKILL_CACHE_TTL_SECONDS, json.dumps(catalog, ensure_ascii=False))
                for item in items:
                    pipe.setex(
                        f"dsh:skill:system:{item.skill_id}:v{item.version}",
                        SKILL_CACHE_TTL_SECONDS,
                        json.dumps(self._full(item), ensure_ascii=False),
                    )
                await pipe.execute()
            except Exception:
                pass
        return catalog


def normalized_router_mode(value: object) -> str:
    mode = str(value or "keyword").strip().lower()
    return mode if mode in LLM_ROUTER_MODES else "keyword"


def valid_llm_route(result: object, catalog: list[dict[str, Any]]) -> tuple[bool, str]:
    if not isinstance(result, dict):
        return False, "invalid_output"
    skill_id = result.get("skillId")
    if not isinstance(skill_id, str) or not skill_id.strip():
        return False, "missing_skill_id"
    if float(result.get("confidence", 0.0)) < LLM_ROUTER_MIN_CONFIDENCE:
        return False, "low_confidence"
    if bool(result.get("needsClarification", False)):
        return False, "needs_clarification"
    if not any(item.get("skillId") == skill_id.strip() for item in catalog):
        return False, "skill_not_published"
    return True, "ok"


def recall_skill_candidates(
    question: str,
    keyword_skill_id: str,
    catalog: list[dict[str, Any]],
    context: dict[str, Any] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Recall a small, explainable candidate set for the LLM leaf classifier.

    Keyword routing remains authoritative in keyword mode. In LLM/shadow mode
    this function only reduces the catalog and never executes a tool.
    """
    context = context or {}
    text = str(question or "").lower()
    active_domain = str(context.get("activeDomain") or "").strip()
    active_skill = str(context.get("activeSkillId") or "").strip()
    ranked: list[tuple[int, dict[str, Any]]] = []
    for item in catalog:
        skill_id = str(item.get("skillId") or "")
        aliases = [str(value).lower() for value in item.get("aliases", []) if value]
        score = 0
        if skill_id == keyword_skill_id:
            score += 100
        if skill_id == active_skill:
            score += 20
        if active_domain and str(item.get("domain") or "") == active_domain:
            score += 12
        score += sum(3 for alias in aliases if alias in text)
        if score:
            ranked.append((score, item))
    ranked.sort(key=lambda pair: (-pair[0], str(pair[1].get("skillId", ""))))
    candidates = [item for _, item in ranked[: max(1, limit)]]
    if not candidates:
        candidates = sorted(catalog, key=lambda item: str(item.get("skillId", "")))[: max(1, limit)]
    return candidates


def route_context_from_history(history: list[Any], catalog: list[dict[str, Any]], max_messages: int = 6) -> dict[str, Any]:
    """Build bounded routing context from persisted events, excluding tool data."""
    messages: list[dict[str, str]] = []
    active_skill_id = ""
    for event in history:
        event_type = getattr(event, "event_type", "")
        payload = getattr(event, "event_json", {}) or {}
        if event_type in {"user.message", "assistant.message"}:
            content = str(payload.get("content") or "").strip()
            if content:
                messages.append({"role": "user" if event_type == "user.message" else "assistant", "content": content[-1200:]})
        elif event_type == "skill.route":
            active_skill_id = str(payload.get("skillId") or active_skill_id)
    messages = messages[-max_messages:]
    active_domain = ""
    if active_skill_id:
        active_domain = str(next((item.get("domain") for item in catalog if item.get("skillId") == active_skill_id), "") or "")
    return {"activeSkillId": active_skill_id or None, "activeDomain": active_domain or None, "recentMessages": messages}
