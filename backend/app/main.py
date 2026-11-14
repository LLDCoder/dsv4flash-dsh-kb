import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import make_router
from .config import get_settings
from .console_auth import ConsoleAuthMiddleware
from .db import ConfigEntry, SessionLocal, init_db
from .llm import LLMAdapter
from .knowledge import KnowledgeGatewayClient
from .platform import PlatformGatewayClient
from .runtime import RuntimeManager
from .service import DSHService, EventBroker
from .translation_bridge import VERSION as TRANSLATION_VERSION
from sqlalchemy import select


settings = get_settings()
runtime_manager = RuntimeManager(settings.runtime_idle_ttl_seconds)
broker = EventBroker()
llm = LLMAdapter(settings)
knowledge = KnowledgeGatewayClient(settings)
platform = PlatformGatewayClient(settings)
service = DSHService(runtime_manager, llm, broker, knowledge, platform)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.database_init_enabled:
        await init_db()
    # Re-apply operator-managed live settings after every container restart.
    # The DB/Redis URLs remain restart-only because their pools are constructed
    # before the application lifespan begins.
    async with SessionLocal() as db:
        entries = list((await db.execute(select(ConfigEntry).where(ConfigEntry.scope == "system"))).scalars().all())
        await service.apply_config_entries(entries)
    stop = asyncio.Event()

    async def sweeper() -> None:
        while not stop.is_set():
            await asyncio.sleep(30)
            await runtime_manager.sweep()

    async def audit_sweeper() -> None:
        while not stop.is_set():
            with suppress(Exception):
                await service.purge_expired_audit()
            interval = max(60, int(service.settings.audit_cleanup_interval_seconds))
            try:
                await asyncio.wait_for(stop.wait(), timeout=interval)
            except asyncio.TimeoutError:
                continue

    task = asyncio.create_task(sweeper())
    tasks = [task]
    if settings.audit_cleanup_enabled:
        tasks.append(asyncio.create_task(audit_sweeper()))
    try:
        yield
    finally:
        stop.set()
        for background_task in tasks:
            background_task.cancel()
        for background_task in tasks:
            with suppress(asyncio.CancelledError):
                await background_task


app = FastAPI(title=settings.app_name, version="0.1.2", lifespan=lifespan,
    description="Read-only Admin question answering. Urdu, Malayalam and Tagalog are normalized to English "
    "and answers translated back; other languages retain their original pipeline. "
    "English normalization independently identifies the actual translated text language and verifies meaning; both must pass. Translation language checks distinguish the actual text language from a language mentioned for a later reply. Reference passage budgets are shared across returned sources, without source-name allowlists. Questions retain semantic workflow and compatible conversation context. "
    "Structured field follow-ups map requested attributes to existing column names without sending record values to the mapper, then project the exact preceding values and preserve the source scope/completeness without refreshing business data. Completed structured record lists render verified source fields directly. Plain lists without requested attributes/measures/order/grouping display source identifiers and statuses when both are unambiguous; full source evidence remains available, and explicitly requested fields are preserved. Internal follow-up projections verify actual prose language and grounding, retry one fresh candidate on mismatch and fail without refreshing business records if validation still fails. General reference definitions describing function can answer use questions without inventing formal policy. Presentation-only follow-ups use the preceding owner-bound completed answer and recheck page authority; "
    "they do not refresh business values. Record limits preserve source annotations. Verified SLA population follow-ups project structured records with an exact maximum, including tied rankings, instead of free-form summarization. "
    "Authorized Team Tasks workload rollups aggregate the visible team roster by owner and report unavailable measures explicitly. "
    "Ambiguous date fields are clarified, and creation/assignment/due dates cannot establish actual visits. "
    "Translation, Reader, answer and HTTP timings are recorded in owner-scoped audit. Output translation derives its semantic verdict from typed comparisons and preserves source Markdown link boundaries outside the model. "
    "Input/output semantic mismatches allow one fresh translation with all original checks retained. "
    "Failed semantic contracts stop business reads rather than selecting a legacy fallback source. "
    "Overdue inspection reads use fixed permission-checked UMC endpoints, cover all authorized unfinished queues, "
    "verify full pagination twice and apply explicit limits after counting. Repeated output prose is translated once "
    "with immutable per-row literals and column positions; receipts record compilation and restoration timings. "
    "Business mutations are refused. Configured workflow guidance explains required review steps and payment reconciliation without executing changes. Model or translation failures do not grant access. "
    "Verified semantic deadline and expiry-window fields select the same read-only collection "
    "for equivalent language variants; output translation can retry smaller verified segments "
    "without repeating business reads.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list or ["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(ConsoleAuthMiddleware, get_password=lambda: service.console_password)
app.include_router(make_router(service))


@app.get("/healthz")
async def healthz():
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
        "readerPipeline": service.settings.reader_pipeline,
        "translationBridge": TRANSLATION_VERSION,
        "turnSemantics": "semantic-continuity/43",
        "conversationTransport": "conversation-create/2",
        "applicationIdentity": "source-party/2",
        "translationInputLanguages": ["ur", "ml", "tl"],
        "llmConfigured": bool(service.settings.llm_base_url and service.settings.llm_api_key),
        "llmModel": service.settings.llm_model,
        "runtimeMode": "embedded-lease-mvp",
        "umcPortal": settings.umc_portal_name,
        "umcBaseUrl": settings.umc_base_url,
        "knowledgeGateway": settings.knowledge_gateway_url,
        "platformGateway": settings.platform_gateway_url,
    }


@app.get("/")
async def root():
    return {"service": settings.app_name, "docs": "/docs", "health": "/healthz"}
