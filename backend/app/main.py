import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware

from .api import make_router
from .config import get_settings
from .console_auth import ConsoleAuthMiddleware
from .db import ConfigEntry, SessionLocal, init_db
from .llm import LLMAdapter
from .knowledge import KnowledgeGatewayClient
from .ocr import OCRGatewayClient
from .platform import PlatformGatewayClient
from .runtime import RuntimeManager
from .service import DSHService, EventBroker
from sqlalchemy import select


settings = get_settings()
runtime_manager = RuntimeManager(settings.runtime_idle_ttl_seconds)
broker = EventBroker()
llm = LLMAdapter(settings)
ocr = OCRGatewayClient(settings)
knowledge = KnowledgeGatewayClient(settings)
platform = PlatformGatewayClient(settings)
service = DSHService(runtime_manager, llm, broker, ocr, knowledge, platform)


@asynccontextmanager
async def _runtime_lifespan(app: FastAPI):
    # Code-only restarts must not migrate or reseed the existing database.
    if settings.database_init_enabled:
        await init_db()
    await service.skill_catalog.invalidate()
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
    audit_task = asyncio.create_task(audit_sweeper())
    try:
        yield
    finally:
        stop.set()
        task.cancel()
        audit_task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        with suppress(asyncio.CancelledError):
            await audit_task
        await service.skill_catalog.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from mcp_server.client import MCPToolClient
    from .mcp_gateway import mcp_tool_gateway

    async with _runtime_lifespan(app):
        previous_gateway, previous_ocr = service.tool_gateway, service.ocr
        client = MCPToolClient(settings.mcp_server_url, timeout=max(
            settings.ocr_timeout_seconds, settings.platform_timeout_seconds,
            settings.knowledge_timeout_seconds * max(1, settings.knowledge_retry_attempts)
        ) + 10)
        async with client.connection():
            gateway = mcp_tool_gateway(client)
            service.tool_gateway, service.ocr = gateway, gateway.ocr
            try:
                yield
            finally:
                service.tool_gateway, service.ocr = previous_gateway, previous_ocr


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "NMA AI Assistant API. Customer-facing answers preserve the same evidence, "
        "facts, constraints, and uncertainty across supported response languages."
    ),
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list or ["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(ConsoleAuthMiddleware, get_password=lambda: service.console_password)
app.include_router(make_router(service))


def custom_openapi():
    """Expose the WebSocket event contract alongside the generated OpenAPI schema."""

    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema["x-websocket-events"] = {
        "/api/v1/ws": {
            "description": (
                "Authenticated JSON WebSocket used by the Customer AI Chatbot. "
                "The assistant.message event may include profileAction when the "
                "request must be answered in another authorized Profile."
            ),
            "authentication": {
                "frame": {"type": "auth", "umctoken": "string"},
                "requirements": ["UMC bearer token", "owned conversation"],
            },
            "messageAcceptance": {
                "accepted": "true for a new persisted user turn; false for busy or duplicate",
                "duplicate": "true reuses the original persisted requestId; replay its events without creating another user message",
                "busy": "conversation_busy is not accepted or queued; preserve the draft and show a retryable notice",
            },
            "applicationList": {
                "examples": ["Show all requests for my current account.", "اعرض جميع الطلبات في حسابي الحالي"],
                "selectedProfile": "Reads the selected Profile through My Requests.",
                "globalView": "Uses the authenticated Global View UMC bearer to read requests across authorized Profiles, with totals, status counts, and Profile names for returned rows.",
                "display": "Up to 100 rows (20 by default); displayed and total counts are reported separately.",
                "failure": "An unavailable lookup returns a read failure without claiming that the account has zero applications.",
            },
            "customerRecordLists": {
                "examples": ["Show my refund requests.", "أرني طلبات استرداد الرسوم الخاصة بي",
                             "Show all my violations and fines.", "أرني جميع مخالفاتي وغراماتي"],
                "scope": "Reads the selected UMC Profile or the authorized aggregate with a Global View UMC bearer.",
                "response": "assistant.message includes totals, public record references, amounts, dates and localized statuses. Global View rows include the owning Profile display name.",
                "limits": "Displays 20 rows by default and up to 100 for an all-records request. Full violations and pending violations are distinct reads.",
                "failure": "Denied or unavailable upstream reads return a localized failure and do not report an empty list.",
                "sideEffect": "Read only.",
            },
            "isbnLookup": {
                "example": "Look up ISBN 9781302000011.",
                "scope": "Uses the published read-only book lookup and current UMC bearer.",
                "response": "assistant.message returns each verified book record with its original bibliographic values, including mixed-language fields, and streamStatus complete.",
                "emptyOrUnavailable": "A confirmed empty list and an unavailable or unverified lookup have distinct replies.",
            },
            "profileConfirmation": {
                "profileContext.confirmedTargetProfileId": "Optional user-selected intent resolution; only honored when it equals the authenticated token Profile and matches the named candidates. It cannot authorize another Profile.",
            },
            "applicationCount": "Counts My Requests totals and displays available status counts for status overviews from the authenticated selected Profile.",
            "establishmentReview": "Uses the authenticated My Account establishment list to confirm review status. No user or Profile identifier is accepted from the question.",
            "refundApplicationLookup": "Verifies refund references against the active Profile and reads their linked application from My Requests.",
            "fineLookup": "Reads fines and appeal eligibility in the selected Profile. Verified fine references may be reused in a later turn. Payment guidance returns only portal navigation.",
            "enquiryLookup": "Reads selected-Profile enquiries and complaints. Exact and positional follow-ups use verified references in the same conversation. Customer-status filtering preserves the current Profile. General policy questions use public-facing knowledge independently of personal enquiry results. Linked applications are verified in the selected Profile through My Requests.",
            "issuedLicenseLookup": "Reads an exact license or permit from the current Profile and rechecks Action Needed for a bound follow-up.",
            "paymentTransactionLookup": {
                "description": "Read-only exact or most-recent transaction from the authenticated selected Profile. Compatible follow-ups are bound to the last verified transaction in the same Profile and conversation.",
                "response": "Shows the recorded status and amount, receipt readiness when verifiable, and the Payments entry point. Does not download or initiate payment.",
            },
            "paymentPreview": {
                "description": "A selected-profile Pending Payment detail can include a verified total payable from the frozen order and applicable UMC read-only penalty preview. No payment is initiated.",
            },
            "assistantMessage": {
                "content": "May contain a clickable relative Markdown link for a published tool-free portal navigation workflow. A compatible follow-up can repeat that link without a business record lookup.",
                "profileAction": {
                    "type": "open_profile_menu",
                    "code": [
                        "profile_selection_required",
                        "profile_switch_required",
                        "profile_choice_required",
                        "selected_profile_not_available",
                        "no_results_current_profile",
                    ],
                    "targetProfile": {
                        "profileId": "authorized profile identifier",
                        "profileName": "display name",
                    },
                    "candidateProfiles": [
                        {"profileId": "authorized profile identifier", "profileName": "matching display name"}
                    ],
                },
                "scope": (
                    "targetProfile is present only for an authorized profile resolved "
                    "from the current account context; clients must still match it "
                    "against their refreshed authorized profile list before switching."
                    " Ambiguous names return profile_choice_required with candidateProfiles, "
                    "without reading business records or selecting a destination automatically."
                ),
            },
        },
    }
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/healthz")
async def healthz():
    """Report the active Customer tool transport. MCP indicates a completed startup handshake."""
    from .mcp_gateway import MCPPlatformGateway
    return {
        "toolTransport": "mcp" if isinstance(service.tool_gateway.platform, MCPPlatformGateway) else "direct",
        "status": "ok",
        "service": settings.app_name,
        "runtimeMode": "embedded-lease-mvp",
        "umcPortal": settings.umc_portal_name,
        "umcBaseUrl": settings.umc_base_url,
        "ocrGateway": settings.ocr_gateway_url,
        "knowledgeGateway": settings.knowledge_gateway_url,
        "platformGateway": settings.platform_gateway_url,
    }


@app.get("/")
async def root():
    return {"service": settings.app_name, "docs": "/docs", "health": "/healthz"}
