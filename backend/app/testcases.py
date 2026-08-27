"""Knowledge-grounded multilingual test case generation and execution.

The generator is deliberately deterministic: every question is tied to a
business blueprint and is enriched with the first source returned by the live
knowledge gateway. This makes the test set reproducible while still proving
that the current knowledge corpus is reachable.
"""

import asyncio
import time
from typing import Any
from uuid import uuid4

from .db import SessionLocal
from .principal import Principal
from .service import DSHService
from .skills import resolve_skill


TEST_BLUEPRINTS: tuple[dict[str, Any], ...] = (
    {
        "id": "regulation-summary",
        "label": "法规摘要",
        "knowledge": True,
        "query": "UAE Media Council Federal Decree Law 55 of 2023 media regulation overview",
        "en": "Summarize the main UAE media regulation requirements for a new media license applicant.",
        "ar": "لخّص المتطلبات الرئيسية للوائح الإعلام في دولة الإمارات لمتقدم جديد للحصول على ترخيص إعلامي.",
        "expected": "检索法规证据，给出摘要并区分一般规则与具体服务条件。",
    },
    {
        "id": "exact-quote",
        "label": "法规逐字引用安全门禁",
        "knowledge": True,
        "guardrail": True,
        "query": "Cabinet Resolution No. 68 of 2024 Article 7.2 exact text",
        "en": "Quote Cabinet Resolution No. 68 of 2024 Article 7.2 exactly.",
        "ar": "اقتبس حرفيًا المادة 7.2 من قرار مجلس الوزراء رقم 68 لعام 2024.",
        "expected": "必须确认来源和条款；不得从排序结果臆造逐字引用。",
    },
    {
        "id": "filming-permit",
        "label": "摄影许可申请",
        "knowledge": True,
        "query": "UMC filming permit land aerial marine application required documents 15 working days",
        "en": "What documents and lead time are required for a land, aerial, or marine filming permit?",
        "ar": "ما المستندات والمدة المطلوبة للحصول على تصريح تصوير بري أو جوي أو بحري؟",
        "expected": "说明申请资料、拍摄日期地点、授权信及至少 15 个工作日等规则。",
    },
    {
        "id": "publication-license",
        "label": "报刊出版许可",
        "knowledge": True,
        "query": "UMC newspaper publication license application editor in chief requirements",
        "en": "What are the requirements to obtain a license for a newspaper or publication?",
        "ar": "ما المتطلبات للحصول على ترخيص لإصدار صحيفة أو منشور؟",
        "expected": "覆盖电子申请、主编资格、出版信息展示及内容标准。",
    },
    {
        "id": "broadcast-license",
        "label": "广播电视许可",
        "knowledge": True,
        "query": "UMC radio television broadcasting license conditions program plans TDRA approval",
        "en": "What conditions apply when applying for a radio or television broadcasting license?",
        "ar": "ما الشروط المطلوبة للتقدم بطلب ترخيص للبث الإذاعي أو التلفزيوني؟",
        "expected": "覆盖频道名称、总部、语言、节目计划和技术批准。",
    },
    {
        "id": "service-eligibility",
        "label": "服务资格说明",
        "knowledge": True,
        "query": "UMC UAE Media Council who is eligible for media services individual commercial government",
        "en": "Who is eligible to apply for UMC media services as an individual, company, or government entity?",
        "ar": "من المؤهل للتقدم إلى خدمات المجلس الإعلامي كفرد أو شركة أو جهة حكومية؟",
        "expected": "说明一般资格，不把通用说明当成当前账户的资格结论。",
    },
    {
        "id": "service-fees",
        "label": "服务费用",
        "knowledge": True,
        "query": "UMC media service fees service ID effective date",
        "en": "How can I check the current fee for a specific UMC media service?",
        "ar": "كيف يمكنني التحقق من الرسوم الحالية لخدمة إعلامية محددة لدى المجلس؟",
        "expected": "要求具体 service 或 service ID，并标注版本/生效日期。",
    },
    {
        "id": "license-renewal",
        "label": "许可证续期",
        "knowledge": True,
        "query": "UMC media license renewal 30 days before expiry 90 days cancellation",
        "en": "When should I submit a media license renewal, and what happens if it expires?",
        "ar": "متى يجب تقديم طلب تجديد الترخيص الإعلامي، وماذا يحدث إذا انتهت صلاحيته؟",
        "expected": "区分 renewal/extension，说明到期前 30 天及逾期 90 天规则。",
    },
    {
        "id": "application-status",
        "label": "申请状态查询",
        "knowledge": False,
        "en": "Please show the latest status of my media license application.",
        "ar": "أرغب في معرفة آخر حالة لطلب الترخيص الإعلامي الخاص بي.",
        "expected": "要求 application number 或明确查询范围，不编造账户状态。",
    },
    {
        "id": "pending-payment",
        "label": "待付款申请",
        "knowledge": False,
        "en": "Which of my applications are pending payment, and how do I continue?",
        "ar": "ما هي طلباتي التي ما زالت قيد الدفع وكيف يمكنني المتابعة؟",
        "expected": "调用应用列表，列出 Pending Payment 后要求选择申请并确认。",
    },
    {
        "id": "permit-download",
        "label": "已签发许可证下载",
        "knowledge": False,
        "en": "I want to download my issued media permit.",
        "ar": "أريد تنزيل التصريح الإعلامي الصادر لي.",
        "expected": "先列出可下载许可，索要 license_id，下载前二次确认。",
    },
    {
        "id": "payment-receipt",
        "label": "付款收据",
        "knowledge": False,
        "en": "Can you help me obtain the receipt for my latest successful payment?",
        "ar": "هل يمكنك مساعدتي في الحصول على إيصال آخر دفعة ناجحة؟",
        "expected": "要求 transaction number 或确认最新交易，再执行下载。",
    },
    {
        "id": "fine-payment",
        "label": "违规罚款支付",
        "knowledge": True,
        "query": "UMC media violation fine payment process",
        "en": "I need to pay a media violation fine. What information is required?",
        "ar": "أحتاج إلى دفع غرامة مخالفة إعلامية، ما المعلومات المطلوبة؟",
        "expected": "检查实时违规记录，展示金额后仍需明确确认。",
    },
    {
        "id": "fine-appeal",
        "label": "罚款申诉",
        "knowledge": False,
        "en": "I want to appeal a media violation fine because the facts are incorrect.",
        "ar": "أريد تقديم استئناف على غرامة مخالفة إعلامية لأن الوقائع غير صحيحة.",
        "expected": "收集 violation number、理由和详情，先预览，不直接提交。",
    },
    {
        "id": "complaint",
        "label": "延迟申请投诉",
        "knowledge": False,
        "en": "My media application is delayed and I want to file a complaint.",
        "ar": "تأخر طلب الترخيص الإعلامي وأرغب في تقديم شكوى.",
        "expected": "要求 application number 和投诉详情，生成预览。",
    },
    {
        "id": "enquiry-followup",
        "label": "咨询跟进",
        "knowledge": False,
        "en": "Please follow up on my earlier enquiry about a media permit.",
        "ar": "يرجى متابعة الاستفسار السابق حول التصريح الإعلامي.",
        "expected": "要求 enquiry reference，不声称已完成跟进。",
    },
    {
        "id": "technical-payment",
        "label": "支付技术咨询",
        "knowledge": False,
        "en": "I cannot complete the payment and need a technical enquiry.",
        "ar": "تعذر الدفع وأحتاج إلى تقديم استفسار تقني.",
        "expected": "收集 transaction number、错误信息和发生时间。",
    },
    {
        "id": "profile-review",
        "label": "Profile 审核状态",
        "knowledge": False,
        "en": "My profile is under review. Can I submit a new media application?",
        "ar": "ملفي قيد المراجعة، هل يمكنني تقديم طلب إعلامي جديد؟",
        "expected": "要求 profile ID 并区分 profile 审核和申请资格。",
    },
    {
        "id": "ocr-document",
        "label": "OCR 材料识别",
        "knowledge": False,
        "tool": "ocr.layout_parsing",
        "en": "Please read the attached Arabic trade license and list the fields needed for a media application.",
        "ar": "يرجى قراءة رخصة التجارة العربية المرفقة وتحديد الحقول المطلوبة لطلب إعلامي.",
        "expected": "调用 PaddleOCR-VL-1.6 工具；不能把 OCR 结果当作已提交申请。",
    },
)


def _first_folder(tree: Any) -> str:
    if isinstance(tree, dict):
        for key in ("items", "children", "data"):
            value = tree.get(key)
            if isinstance(value, list) and value:
                for item in value:
                    if isinstance(item, dict) and item.get("id"):
                        return str(item["id"])
                    nested = _first_folder(item)
                    if nested:
                        return nested
    if isinstance(tree, list):
        for item in tree:
            nested = _first_folder(item)
            if nested:
                return nested
    return ""


def _sources(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, dict):
        chunks = raw.get("chunks") or raw.get("items") or raw.get("results") or raw.get("data")
    else:
        chunks = raw
    if not isinstance(chunks, list):
        return []
    return [item for item in chunks if isinstance(item, dict)]


async def generate_test_cases(service: DSHService, languages: list[str], folder_id: str | None = None, limit: int = 40, *, umc_token: str | None = None) -> dict[str, Any]:
    requested = [lang for lang in languages if lang in {"en", "ar"}] or ["en", "ar"]
    selected_folder = folder_id or service.settings.knowledge_default_folder_id
    folder_source = "config"
    if not selected_folder:
        try:
            selected_folder = _first_folder(await service.tool_gateway.knowledge.folders_tree(umc_token=umc_token))
            folder_source = "knowledge_tree"
        except Exception:
            folder_source = "not_available"

    output: list[dict[str, Any]] = []
    limit = max(1, min(limit, 60))
    for blueprint in TEST_BLUEPRINTS:
        for language in requested:
            if len(output) >= limit:
                break
            question = str(blueprint[language])
            route = resolve_skill(question)
            output.append(
                {
                    "caseId": f"{blueprint['id']}-{language}",
                    "language": language,
                    "label": blueprint["label"],
                    "question": question,
                    "skillId": route.skill_id,
                    "category": route.category,
                    "mode": route.mode,
                    "knowledgeRequired": bool(blueprint.get("knowledge")),
                    "guardrailRequired": bool(blueprint.get("guardrail")),
                    "tool": blueprint.get("tool") or route.tool_name,
                    "expected": blueprint["expected"],
                    "folderId": selected_folder,
                    "sourceTitle": None,
                    "evidenceCount": 0,
                    "bestSimilarity": None,
                    "retrievalModes": ["bm25", "graph", "vector"] if blueprint.get("knowledge") else [],
                    "topK": service.settings.knowledge_top_k,
                }
            )
        if len(output) >= limit:
            break

    semaphore = asyncio.Semaphore(6)

    async def enrich(item: dict[str, Any]) -> dict[str, Any]:
        if not item["knowledgeRequired"] or not selected_folder:
            return item
        async with semaphore:
            try:
                blueprint = next(entry for entry in TEST_BLUEPRINTS if f"{entry['id']}-{item['language']}" == item["caseId"])
                raw = await service.tool_gateway.knowledge.search(str(blueprint["query"]), selected_folder, service.settings.knowledge_top_k, umc_token=umc_token)
                sources = _sources(raw)
                item["evidenceCount"] = len(sources)
                if sources:
                    first = sources[0]
                    item["sourceTitle"] = first.get("source_name") or first.get("document_keyword") or first.get("title")
                    item["bestSimilarity"] = first.get("score") or first.get("similarity")
            except Exception as exc:
                item["sourceTitle"] = f"knowledge_error: {type(exc).__name__}"
        return item

    output = list(await asyncio.gather(*(enrich(item) for item in output)))
    return {
        "items": output,
        "count": len(output),
        "languages": requested,
        "folderId": selected_folder,
        "folderSource": folder_source,
        "retrievalModes": ["bm25", "graph", "vector"],
        "topK": service.settings.knowledge_top_k,
    }


async def _run_one(service: DSHService, principal: Principal, case: dict[str, Any], timeout_seconds: float) -> dict[str, Any]:
    started = time.perf_counter()
    async with SessionLocal() as db:
        conversation = await service.create_conversation(db, principal, "multilingual-test", "default", "test")
    accepted = await service.submit_message(principal, conversation.conversation_id, str(case["question"]), f"test-{uuid4().hex}")
    deadline = time.perf_counter() + timeout_seconds
    events: list[Any] = []
    while time.perf_counter() < deadline:
        async with SessionLocal() as db:
            current = await service.get_owned_conversation(db, principal, conversation.conversation_id)
            events = await service.list_events(db, current, after_seq=0)
        types = {event.event_type for event in events}
        if "assistant.message" in types or "runtime.error" in types:
            break
        await asyncio.sleep(0.25)
    route = next((event.event_json for event in events if event.event_type == "skill.route"), {})
    tool_call = next((event.event_json for event in events if event.event_type == "tool.call"), {})
    tool_result = next((event.event_json for event in events if event.event_type == "tool.result"), {})
    assistant = next((event.event_json.get("content", "") for event in reversed(events) if event.event_type == "assistant.message"), "")
    route_ok = route.get("skillId") == case.get("skillId")
    tool_ok = bool(tool_result.get("ok"))
    guardrail_ok = bool(case.get("guardrailRequired") and not tool_call and assistant)
    if route_ok and (tool_ok or guardrail_ok or (not case.get("knowledgeRequired") and assistant)):
        score = 5
    elif route_ok and assistant:
        score = 4
    elif assistant:
        score = 3
    else:
        score = 1
    return {
        **case,
        "accepted": bool(accepted.get("accepted")),
        "conversationId": conversation.conversation_id,
        "routeObserved": route.get("skillId"),
        "routeMatch": route_ok,
        "toolCall": tool_call.get("toolName"),
        "toolOk": tool_ok,
        "assistant": assistant,
        "score": score,
        "eventCount": len(events),
        "elapsedMs": round((time.perf_counter() - started) * 1000),
        "timedOut": "assistant.message" not in {event.event_type for event in events},
    }


async def run_test_cases(service: DSHService, principal: Principal, cases: list[dict[str, Any]], timeout_seconds: float = 90) -> dict[str, Any]:
    semaphore = asyncio.Semaphore(6)

    async def run_limited(case: dict[str, Any]) -> dict[str, Any]:
        async with semaphore:
            return await _run_one(service, principal, case, max(10, min(timeout_seconds, 180)))

    # Different conversations are isolated by the runtime manager, so a small
    # concurrency cap keeps a multilingual batch practical without opening an
    # unbounded number of upstream LLM/knowledge requests.
    results = list(await asyncio.gather(*(run_limited(case) for case in cases[:40])))
    scores = [item["score"] for item in results]
    return {
        "items": results,
        "count": len(results),
        "completed": sum(1 for item in results if not item["timedOut"]),
        "routeMatches": sum(1 for item in results if item["routeMatch"]),
        "toolSuccesses": sum(1 for item in results if item["toolOk"]),
        "averageScore": round(sum(scores) / len(scores), 2) if scores else 0,
        "fivePointScale": True,
    }
