import sys
import unittest
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import Base, Skill, ensure_active_published_skill_index, reconcile_active_published_skills
from app.skill_router import SkillCatalogCache
from app.skills import effective_skill_workflow


def skill(version: int, *, skill_id: str = "versioned_skill") -> Skill:
    return Skill(
        skill_id=skill_id,
        name=f"Version {version}",
        version=version,
        source="ops",
        status="PUBLISHED",
        scope="system",
        enabled=True,
        workflow={"deterministicRouting": [{"id": f"v{version}"}]},
    )


class SkillLifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def asyncTearDown(self):
        await self.engine.dispose()

    async def test_reconcile_keeps_highest_version_then_partial_index_blocks_duplicates(self):
        async with self.sessions() as db:
            db.add_all([skill(1), skill(3), skill(2)])
            await db.commit()
            self.assertEqual(await reconcile_active_published_skills(db), 2)
            await db.commit()

        async with self.engine.begin() as connection:
            await ensure_active_published_skill_index(connection)

        async with self.sessions() as db:
            rows = list((await db.execute(
                select(Skill).where(Skill.skill_id == "versioned_skill").order_by(Skill.version)
            )).scalars())
            self.assertEqual([(item.version, item.enabled) for item in rows], [(1, False), (2, False), (3, True)])
            db.add(skill(4))
            with self.assertRaises(IntegrityError):
                await db.commit()
            await db.rollback()

    async def test_catalog_defensively_keeps_only_highest_active_version(self):
        async with self.sessions() as db:
            db.add_all([skill(1), skill(2)])
            await db.commit()
            catalog = await SkillCatalogCache("").load(db)

        self.assertEqual([(item["skillId"], item["version"]) for item in catalog], [("versioned_skill", 2)])

    def test_cached_catalog_defensively_keeps_only_highest_version(self):
        catalog = SkillCatalogCache._latest_catalog_entries([
            {"skillId": "a", "version": 1},
            {"skillId": "b", "version": 2},
            {"skillId": "a", "version": 3},
        ])
        self.assertEqual(catalog, [{"skillId": "a", "version": 3}, {"skillId": "b", "version": 2}])

    def test_operator_workflow_is_authoritative(self):
        workflow = {"routing": {"filters": {"custom": {"type": "string"}}}}
        self.assertEqual(effective_skill_workflow("application_status", "ops", workflow), workflow)

    def test_builtin_workflow_receives_code_defaults(self):
        workflow = effective_skill_workflow("application_status", "builtin", {})
        self.assertTrue(workflow.get("requests"))
