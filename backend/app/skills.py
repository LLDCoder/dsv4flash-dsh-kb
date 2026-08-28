from dataclasses import dataclass
from typing import Any


def response_language_for(text: str) -> str:
    """Use Arabic only for primarily Arabic input; English is the fallback."""

    arabic_count = sum(
        1
        for char in text
        if "\u0600" <= char <= "\u06ff"
        or "\u0750" <= char <= "\u077f"
        or "\u08a0" <= char <= "\u08ff"
        or "\ufb50" <= char <= "\ufdff"
        or "\ufe70" <= char <= "\ufeff"
    )
    latin_count = sum(1 for char in text if ("A" <= char <= "Z") or ("a" <= char <= "z"))
    return "ar" if arabic_count > latin_count else "en"


@dataclass(frozen=True)
class SkillRoute:
    skill_id: str
    category: str
    tool_name: str | None = None
    mode: str = "answer"
    fields: tuple[str, ...] = ()
    choices: tuple[str, ...] = ()
    confirmation_required: bool = False


DEFAULT_SKILL_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "skill_id": "document_ocr",
        "name": "Document OCR and field extraction",
        "allowed_tools": ["ocr.layout_parsing"],
        "dependencies": ["ocr_gateway", "trusted_principal"],
        "content": "先识别文件并提取字段，再由用户确认；OCR 结果不是已提交的申请或已验证的业务数据。",
    },
    {
        "skill_id": "service_discovery",
        "name": "Service discovery and comparison",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": "根据媒体活动和申请主体筛选候选服务；候选服务不是法律资格结论。",
    },
    {
        "skill_id": "umc_application_detail",
        "name": "UMC application detail lookup",
        "allowed_tools": ["umc.application_detail"],
        "dependencies": ["trusted_principal", "umc_data_access"],
        "content": "使用调用方的 UMC Token 查询指定 applicationId；没有 ID 时先追问，不编造申请数据。",
    },
    {
        "skill_id": "umc_book_by_isbn",
        "name": "UMC book ISBN lookup",
        "allowed_tools": ["umc.book_by_isbn"],
        "dependencies": ["trusted_principal", "umc_data_access"],
        "content": "ISBN 必须按字符串传递；只展示 UMC 返回的图书记录，不把 ISBN 转为数字。",
    },
    {
        "skill_id": "umc_add_application",
        "name": "UMC controlled draft application",
        "allowed_tools": ["umc.add_application"],
        "dependencies": ["trusted_principal", "umc_data_access", "explicit_confirmation"],
        "content": "新增草稿会产生真实持久化数据；固定 type=3、isTest=true，正式提交 type=1 禁止通过测试网关。",
    },
    {
        "skill_id": "copyright_guidance",
        "name": "Copyright and content guidance",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": "解释版权与内容合规的一般要求，不能替用户作法律清权或保证许可状态。",
    },
    {
        "skill_id": "admin_inspection",
        "name": "Admin inspection drilldown",
        "allowed_tools": [],
        "dependencies": ["trusted_principal", "admin_scope"],
        "content": "管理员数据仅在授权范围内查询；风险说明是辅助信息，不是执法或审批决定。",
    },
    {
        "skill_id": "admin_analytics",
        "name": "Admin analytics and pivots",
        "allowed_tools": [],
        "dependencies": ["trusted_principal", "admin_scope"],
        "content": "保持指标、时间范围和筛选条件一致；说明数据口径，不编造趋势原因。",
    },
    {
        "skill_id": "admin_finance",
        "name": "Admin finance trend",
        "allowed_tools": [],
        "dependencies": ["trusted_principal", "admin_scope"],
        "content": "财务汇总只用于分析，保持同一时间口径并标注数据来源，不执行资金操作。",
    },
    {
        "skill_id": "admin_audit",
        "name": "Admin audit and permissions",
        "allowed_tools": [],
        "dependencies": ["trusted_principal", "admin_scope"],
        "content": "审计查询遵循 RBAC，敏感字段必须脱敏；低置信度是复核信号，不是事实结论。",
    },
    {
        "skill_id": "profile_status",
        "name": "Profile status and application eligibility",
        "allowed_tools": ["umc.pending-actions", "umc.applications"],
        "dependencies": ["trusted_principal"],
        "content": "区分 profile 审核状态和申请状态；没有 profile_id 时先追问，不能用草稿数量推断资格。",
    },
    {
        "skill_id": "service_eligibility",
        "name": "Service eligibility",
        "allowed_tools": ["umc.collected-services", "umc.service-categories"],
        "dependencies": ["trusted_principal"],
        "content": "候选服务不是资格结论；必须收集 profile/account type 和 media activity 后再筛选。",
    },
    {
        "skill_id": "application_payment",
        "name": "Pending payment workflow",
        "allowed_tools": [],
        "dependencies": ["trusted_principal"],
        "content": "先列出 Pending Payment 申请并要求选择 application_number；不能用其他交易记录清除待付款状态。",
    },
    {
        "skill_id": "application_status",
        "name": "Application status",
        "allowed_tools": ["umc.applications", "umc.application_detail"],
        "dependencies": ["trusted_principal"],
        "content": "优先查询当前账号的最新申请列表；返回申请编号、服务、创建时间和当前状态，并说明分页范围。用户提供申请编号时再查询详情。",
    },
    {
        "skill_id": "permit_download",
        "name": "Issued permit download",
        "allowed_tools": ["umc.licenses"],
        "dependencies": ["trusted_principal"],
        "content": "先列出可下载许可，要求用户选择 license_id；下载属于副作用，必须二次确认。",
    },
    {
        "skill_id": "payment_receipt",
        "name": "Payment receipt",
        "allowed_tools": ["umc.payments"],
        "dependencies": ["trusted_principal"],
        "content": "先展示最近成功交易及 transaction_number，再确认是否下载收据。",
    },
    {
        "skill_id": "fine_appeal",
        "name": "Fine appeal",
        "allowed_tools": ["umc.pending-violations", "umc.appeal-reasons"],
        "dependencies": ["trusted_principal"],
        "content": "需要 violation_number、appeal_reason 和 appeal_details；提交前必须二次确认。",
    },
    {
        "skill_id": "complaint_create",
        "name": "Delayed application complaint",
        "allowed_tools": ["umc.enquiry-types", "umc.enquiry-applications"],
        "dependencies": ["trusted_principal"],
        "content": "需要 application_number 和 complaint_details；只生成预览，不直接提交。",
    },
    {
        "skill_id": "enquiry_followup",
        "name": "Enquiry follow-up",
        "allowed_tools": ["umc.enquiries"],
        "dependencies": ["trusted_principal"],
        "content": "没有 enquiry 记录时要求 enquiry_reference，不声称已完成跟进。",
    },
    {
        "skill_id": "enquiry_reopen",
        "name": "Resolved enquiry follow-up",
        "allowed_tools": ["umc.enquiries"],
        "dependencies": ["trusted_principal"],
        "content": "不承诺存在 reopen 接口；优先检查追加消息或创建关联 enquiry。",
    },
    {
        "skill_id": "technical_enquiry",
        "name": "Payment technical enquiry",
        "allowed_tools": ["umc.enquiry-types", "umc.payments"],
        "dependencies": ["trusted_principal"],
        "content": "收集 transaction_number、error_message、occurred_at 后生成技术 enquiry 预览。",
    },
    {
        "skill_id": "license_application",
        "name": "Media license application knowledge",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway", "trusted_principal"],
        "content": "先检索三路知识证据，再区分 Ground/Aerial/Marine 等具体许可；缺少主体信息时追问。",
    },
    {
        "skill_id": "service_eligibility_info",
        "name": "General media service eligibility knowledge",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": "回答媒体服务通常面向哪些申请主体；不要把一般资格说明当成当前用户的资格判定。",
    },
    {
        "skill_id": "license_renewal",
        "name": "License renewal and permit extension",
        "allowed_tools": ["knowledge.search", "umc.licenses"],
        "dependencies": ["knowledge_gateway", "trusted_principal"],
        "content": "区分 renewal 与 extension；检索服务特定规则，账户查询需要 license number。",
    },
    {
        "skill_id": "service_fees",
        "name": "Media service fees",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": "费用按 service ID、数据版本和生效日期消歧，不把不同服务的金额合并。",
    },
    {
        "skill_id": "latest_regulations",
        "name": "Latest media regulations and exact quotation",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": "精确引用前必须确认法规标题、编号、日期和 article/clause；来源不明确时禁止自动选文书或逐字引用。",
    },
    {
        "skill_id": "fine_payment",
        "name": "Fine payment",
        "allowed_tools": ["umc.pending-violations", "knowledge.search"],
        "dependencies": ["trusted_principal", "knowledge_gateway"],
        "content": "同时检查实时 pending violations 和知识库支付流程；展示金额后仍需二次确认。",
    },
)


def _has(text: str, *terms: str) -> bool:
    lowered = text.lower()
    return any(term.lower() in lowered for term in terms)


def resolve_skill(text: str) -> SkillRoute:
    """Deterministic first-pass router; the LLM may refine only after this gate."""
    if _has(text, "ocr", "optical character", "attached document", "attached Arabic trade license", "upload", "image", "screenshot", "IMG-", "识别材料", "扫描件", "图片", "截图", "上传", "رخصة التجارة العربية", "المرفقة", "صورة", "لقطة شاشة"):
        return SkillRoute("document_ocr", "api_call", "ocr.layout_parsing", "collect", ("file", "file_type"))
    if _has(text, "book by isbn", "isbn lookup", "isbn 查询", "isbn"):
        return SkillRoute("umc_book_by_isbn", "api_call", "umc.book_by_isbn", "answer", ("isbn",))
    if _has(text, "application detail", "applicationdetail", "application id", "applicationid", "申请详情", "申请 ID"):
        return SkillRoute("umc_application_detail", "api_call", "umc.application_detail", "answer", ("applicationId",))
    if _has(text, "add new application", "new draft application", "create a draft application", "新增申请", "新建草稿"):
        return SkillRoute("umc_add_application", "api_call", "umc.add_application", "collect", ("parameters",), confirmation_required=True)
    if _has(text, "quote", "exactly", "逐字", "原文", "اقتبس", "حرفيًا", "النص الأصلي"):
        return SkillRoute(
            "latest_regulations", "knowledge", "knowledge.search", "exact_quote",
            ("regulation_or_resolution_reference", "article_number"),
            ("Latest updates", "Summary", "Exact quotation"),
        )
    if _has(text, "regulation", "media rules", "media regulations", "cabinet resolution", "法规", "条例", "لائحة", "لوائح", "تشريعات", "قرار مجلس الوزراء"):
        return SkillRoute(
            "latest_regulations", "knowledge", "knowledge.search", "summary",
            ("regulation_topic", "regulation_or_resolution_reference", "article_number"),
            ("Latest updates", "Summary", "Exact quotation"),
        )
    if _has(text, "renew", "renewal", "expiring", "will expire", "extend an existing permit", "续期", "到期", "延期", "تجديد", "تمديد", "منتهية", "ستنتهي", "تنتهي", "رخصتي"):
        return SkillRoute(
            "license_renewal", "knowledge", "knowledge.search", "answer",
            ("license_or_permit_type", "license_number"), ("Renew licence", "Extend permit"),
        )
    if _has(text, "inspection summary", "high risk", "inspection", "检查摘要", "高风险"):
        return SkillRoute("admin_inspection", "data_query", None, "answer")
    if _has(text, "dimension pivot", "process time", "按省", "按酋长国", "اتجاه وقت معالجة", "قسّمه حسب الإمارة"):
        return SkillRoute("admin_analytics", "data_query", None, "answer")
    if _has(text, "revenue", "fine collection", "last 7 days", "finance trend", "收入", "罚款回收", "الإيرادات", "تحصيل الغرامات"):
        return SkillRoute("admin_finance", "data_query", None, "answer")
    if _has(text, "audit", "low-confidence", "full user details", "permissions", "审计", "低置信度", "用户详情"):
        return SkillRoute("admin_audit", "data_query", None, "answer")
    # A status question must win over product/service keywords such as
    # "social media" or "license application" (for example, "What is the
    # status of my social media license?").
    if _has(text, "latest status", "application status", "status of my", "what's the status", "license status", "permit status", "status of my license", "what's my license status", "what is my license status", "open applications", "summarize my open", "申请状态", "状态", "حالة الطلب", "حالة رخصتي", "حالة التصريح", "آخر حالة"):
        return SkillRoute("application_status", "data_query", None, "answer")
    if _has(text, "which service should", "very specific media activity", "not listed", "media service comparison", "difference between a photography permit and an advertiser permit", "apply for a media service", "advertiser permit", "paid product reviews", "social media", "服务对比", "未列出", "选择哪项服务", "الخدمة المناسبة", "نشاطي التجاري"):
        return SkillRoute("service_discovery", "knowledge", "knowledge.search", "answer", ("account_type", "media_activity"))
    if _has(text, "content standards", "advertising on social media", "media content", "child-safety", "child safety", "children", "advertising rules", "policy comparison", "regulation version", "版权", "copyright", "photograph from the internet", "commercial campaign", "معايير المحتوى", "سلامة الأطفال", "حقوق الطبع"):
        skill_id = "copyright_guidance" if _has(text, "copyright", "版权", "photograph from the internet", "commercial campaign", "حقوق الطبع") else "latest_regulations"
        return SkillRoute(skill_id, "knowledge", "knowledge.search", "summary", ("regulation_topic",))
    if _has(text, "cost", "processing time", "how much does", "fees", "fee", "费用", "الرسوم"):
        return SkillRoute("service_fees", "knowledge", "knowledge.search", "answer", ("service_name",))
    if _has(text, "fine", "violation penalty", "unpaid fines", "罚款", "违规", "غرامة", "مخالفة"):
        if _has(text, "appeal", "申诉", "استئناف", "طعن"):
            return SkillRoute("fine_appeal", "api_call", None, "collect", ("violation_number", "appeal_reason", "appeal_details"), confirmation_required=True)
        return SkillRoute("fine_payment", "data_query", None, "collect", ("fine_reference",), confirmation_required=True)
    # Status/payment intent must win over the words “license application” in a
    # sentence such as “show the latest status of my media license application”.
    if _has(text, "pending payment", "待付款", "الدفع المعلق", "قيد الدفع"):
        return SkillRoute("application_payment", "data_query", None, "collect", ("application_number",))
    if _has(text, "download", "issued permit", "下载", "许可证", "تنزيل", "تحميل", "تصريح صادر") and _has(text, "permit", "license", "许可", "تصريح", "رخصة"):
        return SkillRoute("permit_download", "api_call", None, "collect", ("license_id",), confirmation_required=True)
    if _has(text, "complaint", "投诉", "شكوى"):
        return SkillRoute("complaint_create", "api_call", None, "collect", ("application_number", "complaint_details"), confirmation_required=True)
    if _has(text, "follow up", "enquiry", "咨询", "متابعة", "استفسار") and _has(text, "earlier", "submitted", "跟进", "سابق", "مقدم"):
        return SkillRoute("enquiry_followup", "data_query", None, "collect", ("enquiry_reference",))
    if _has(text, "photography", "filming", "filming permit", "photocopying equipment", "advertising license", "new permit", "license requirements", "license application", "media license", "newspaper", "publication", "broadcasting", "radio", "television", "申请许可", "摄影", "طلب تصريح", "متطلبات الترخيص", "رخصة إعلامية", "تصريح", "ترخيص", "صحيفة", "منشور", "بث"):
        return SkillRoute(
            "license_application", "knowledge", "knowledge.search", "answer",
            ("permit_or_service_type", "account_type"), ("Individual", "Commercial", "Government"),
        )
    if _has(text, "service fees", "fees", "fee", "费用", "الرسوم"):
        return SkillRoute("service_fees", "knowledge", "knowledge.search", "answer", ("service_name",))
    if _has(text, "who is eligible", "eligible for media services", "media service eligibility", "مؤهل", "الأهلية", "الخدمات الإعلامية"):
        return SkillRoute("service_eligibility_info", "knowledge", "knowledge.search", "answer", ("account_type", "media_activity"), ("Individual", "Commercial", "Government"))
    if _has(text, "technical enquiry", "cannot complete payment", "技术", "استفسار تقني", "تعذر الدفع", "لا أستطيع إتمام الدفع"):
        return SkillRoute("technical_enquiry", "api_call", None, "collect", ("transaction_number", "error_message", "occurred_at"), confirmation_required=True)
    if _has(text, "fine", "violation penalty", "罚款", "违规", "غرامة", "مخالفة") and _has(text, "appeal", "申诉", "استئناف", "طعن"):
        return SkillRoute("fine_appeal", "api_call", None, "collect", ("violation_number", "appeal_reason", "appeal_details"), confirmation_required=True)
    if _has(text, "fine", "violation penalty", "罚款", "违规", "غرامة", "مخالفة"):
        return SkillRoute("fine_payment", "data_query", None, "collect", ("fine_reference",), confirmation_required=True)
    if _has(text, "profile is under review", "profile review", "profile 审核", "الملف قيد المراجعة", "ملفي قيد المراجعة", "مراجعة الملف"):
        return SkillRoute("profile_status", "data_query", None, "collect", ("profile_id",), ("Individual", "Business"))
    if _has(text, "eligible", "eligibility", "资格", "مؤهل", "الأهلية"):
        return SkillRoute("service_eligibility", "data_query", None, "collect", ("profile_id", "account_type", "media_activity"), ("Individual", "Commercial", "Government"))
    if _has(text, "pending payment", "待付款", "الدفع المعلق", "قيد الدفع"):
        return SkillRoute("application_payment", "data_query", None, "collect", ("application_number",))
    if _has(text, "latest status", "application status", "申请状态", "حالة الطلب", "آخر حالة"):
        return SkillRoute("application_status", "data_query", None, "answer")
    if _has(text, "download", "issued permit", "下载", "许可证", "تنزيل", "تحميل", "تصريح صادر") and _has(text, "permit", "license", "许可", "تصريح", "رخصة"):
        return SkillRoute("permit_download", "api_call", None, "collect", ("license_id",), confirmation_required=True)
    if _has(text, "payment", "receipt", "付款", "收据", "إيصال", "إيصال الدفع"):
        return SkillRoute("payment_receipt", "api_call", None, "collect", ("transaction_number",), ("Download latest receipt", "Choose another transaction"), confirmation_required=True)
    if _has(text, "complaint", "投诉", "شكوى"):
        return SkillRoute("complaint_create", "api_call", None, "collect", ("application_number", "complaint_details"), confirmation_required=True)
    if _has(text, "follow up", "enquiry", "咨询", "متابعة", "استفسار") and _has(text, "earlier", "submitted", "跟进", "سابق", "مقدم"):
        return SkillRoute("enquiry_followup", "data_query", None, "collect", ("enquiry_reference",))
    if _has(text, "reopen", "resolved enquiry", "重新打开", "إعادة فتح", "استفسار مغلق"):
        return SkillRoute("enquiry_reopen", "api_call", None, "collect", ("enquiry_reference",), ("Check message option", "Create linked enquiry"))
    if _has(text, "right service", "service for my business", "找不到服务", "الخدمة المناسبة", "نشاطي التجاري"):
        return SkillRoute("service_discovery", "data_query", None, "collect", ("account_type", "media_activity"), ("Publishing / books", "Advertising content", "Broadcast / production", "Social media"))
    return SkillRoute("general", "general")


def build_knowledge_query(route: SkillRoute, original_text: str) -> str:
    """Add domain anchors before retrieval so generic phrases do not hit unrelated corpora."""
    prefixes = {
        "license_application": "UMC UAE Media Council media license permit application requirements process",
        "service_eligibility_info": "UMC UAE Media Council media services eligibility applicant types",
        "license_renewal": "UMC UAE media license permit renewal extension validity fees process",
        "service_fees": "UMC UAE Media Council media service fees service ID",
        "latest_regulations": "UAE media regulation Federal Decree-Law 55 of 2023 Cabinet Decision 68 of 2024 article",
        "fine_payment": "UMC media violation fine payment process",
        "copyright_guidance": "UMC UAE media content copyright permission commercial campaign guidance",
        "service_discovery": "UMC UAE Media Council media services service catalogue applicant activity",
    }
    prefix = prefixes.get(route.skill_id)
    return f"{prefix} {original_text}" if prefix else original_text


def exact_quote_source_sufficient(text: str) -> bool:
    """An article number alone is not a source; require a named/numbered instrument."""
    lowered = text.lower()
    if not _has(lowered, "quote", "exactly", "逐字", "原文"):
        return True
    return bool(
        __import__("re").search(
            r"(?:federal|cabinet|decree|law|resolution|regulation|联邦|法令|决议|条例|قرار مجلس الوزراء).{0,40}(?:no\.?|number|رقم|第|\d{2,4})|(?:no\.?|number|رقم|第)\s*\d",
            lowered,
        )
    )


def build_flow_prompt(route: SkillRoute) -> dict[str, Any]:
    prompt = {
        "profile_status": "Select an approved profile or provide its profile ID so I can determine whether a new application can be created.",
        "service_eligibility": "Provide the account/profile type and media activity so I can identify candidate services.",
        "application_payment": "Select the Pending Payment application to continue; explicit confirmation is still required before submission.",
        "application_status": "Provide the application number. If it is unavailable, query the latest applications and state the result scope.",
        "permit_download": "Select the issued licence or permit to download; explicit confirmation is required before downloading.",
        "payment_receipt": "Confirm whether to download the latest successful transaction receipt, or provide a transaction number.",
        "fine_appeal": "Provide the media violation and appeal reason; show a preview and obtain explicit confirmation before submission.",
        "fine_payment": "Provide the media violation to pay; show the amount and payment information and obtain explicit confirmation.",
        "complaint_create": "Provide the delayed application number and complaint details; show a preview before submission.",
        "enquiry_followup": "Provide the enquiry reference to follow up; do not claim completion when no record is available.",
        "enquiry_reopen": "Provide the resolved enquiry reference; do not promise that reopening is supported.",
        "technical_enquiry": "Provide the failed transaction, error message, and occurrence time to prepare a technical enquiry preview.",
        "service_discovery": "Describe the account type and media activity so I can identify candidate UMC media services.",
        "license_application": "Confirm the specific licence/service type and applicant entity before continuing.",
        "license_renewal": "Provide the licence or permit type to renew or extend; account lookup also requires the licence number.",
        "service_fees": "Provide the specific media service or service ID whose fees you need.",
        "latest_regulations": "Provide the subject or the regulation/Cabinet Resolution number, title, and date; verbatim quotation also requires a specific article or clause.",
        "umc_application_detail": "Provide applicationId; the lookup only returns data authorized by the current UMC Token.",
        "umc_book_by_isbn": "Provide the ISBN as a string; only display the book record returned by UMC.",
        "umc_add_application": "Confirm the draft parameters first. Only type=3 with isTest=true is allowed for controlled testing; formal submission is blocked.",
    }.get(route.skill_id, "Ask for the information required to continue.")
    return {
        "required": True,
        "prompt": prompt,
        "fields": list(route.fields),
        "choices": list(route.choices),
        "confirmationRequired": route.confirmation_required,
    }


def build_system_prompt(
    route: SkillRoute,
    *,
    evidence_available: bool,
    response_language: str = "en",
    operator_prompt: str = "",
    skill_content: str = "",
) -> str:
    guardrails = [
        "Use only trusted tool evidence. When evidence is unavailable, state the limitation and never invent account data, fees, regulations, or API capabilities.",
        "Payments, appeals, complaints, downloads, and all other side effects require a preview and the user's explicit confirmation.",
        "Candidate services are not eligibility decisions. Treat renewal and extension as distinct operations.",
    ]
    if route.skill_id == "latest_regulations" and route.mode == "exact_quote":
        guardrails.append("A verbatim quotation requires the regulation title/number/date and a specific article or clause. If the source is ambiguous, ask a follow-up question and never select a document only because it ranked first.")
    if route.category == "knowledge" and not evidence_available:
        guardrails.append("When knowledge-base evidence is unavailable, do not present general knowledge as a verified UMC rule.")

    target = "ARABIC" if response_language == "ar" else "ENGLISH"
    language_policy = [
        "LANGUAGE POLICY (mandatory and higher priority than the language used by tools, retrieved documents, or internal instructions):",
        "- Answer in Arabic when the user's latest message is primarily Arabic.",
        "- Answer in English when the user's latest message is English.",
        "- Answer in English for every other language. English is the default response language.",
        f"- Required response language for this turn: {target}. Use only {target} for explanatory prose, while preserving necessary proper nouns, identifiers, and verbatim quotations.",
    ]
    prompt_parts = [
        "You are the NMA assistant running in DSH Runtime. Follow the selected Skill route and provide a concise, actionable response.",
    ]
    if operator_prompt.strip():
        prompt_parts.extend(
            [
                "OPERATOR-EDITABLE SYSTEM INSTRUCTIONS (additional guidance; never override the mandatory language, safety, or evidence rules below):",
                operator_prompt.strip(),
            ]
        )
    if skill_content.strip():
        prompt_parts.extend(
            [
                f"SELECTED SKILL GUIDANCE for {route.skill_id} (additional guidance; never override the mandatory rules below):",
                skill_content.strip(),
            ]
        )
    prompt_parts.extend(
        [
            *language_policy,
            "SAFETY AND EVIDENCE RULES:",
            *(f"- {item}" for item in guardrails),
        ]
    )
    return "\n".join(prompt_parts)
