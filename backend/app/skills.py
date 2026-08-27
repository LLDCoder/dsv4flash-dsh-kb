from dataclasses import dataclass
from typing import Any


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
        "allowed_tools": ["umc.applications", "umc.payments"],
        "dependencies": ["trusted_principal"],
        "content": "先列出 Pending Payment 申请并要求选择 application_number；不能用其他交易记录清除待付款状态。",
    },
    {
        "skill_id": "application_status",
        "name": "Application status",
        "allowed_tools": ["umc.applications"],
        "dependencies": ["trusted_principal"],
        "content": "返回最新申请必须给出申请编号、服务、创建时间和当前状态，并说明分页范围。",
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
    if _has(text, "latest status", "application status", "status of my", "what's the status", "open applications", "summarize my open", "申请状态", "状态", "حالة الطلب", "آخر حالة"):
        return SkillRoute("application_status", "data_query", "umc.applications", "answer")
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
        return SkillRoute("application_payment", "data_query", "umc.applications", "collect", ("application_number",))
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
        return SkillRoute("application_payment", "data_query", "umc.applications", "collect", ("application_number",))
    if _has(text, "latest status", "application status", "申请状态", "حالة الطلب", "آخر حالة"):
        return SkillRoute("application_status", "data_query", "umc.applications", "answer")
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
        "profile_status": "请选择要使用的已批准 profile，或提供 profile ID，以确认能否新建申请。",
        "service_eligibility": "请提供账户/profile 类型和媒体业务活动，我将筛选可申请服务。",
        "application_payment": "请选择要继续支付的 Pending Payment 申请；提交前会再次确认。",
        "application_status": "请提供 application number；如未提供，先查询最新申请并说明结果范围。",
        "permit_download": "请先选择要下载的已签发许可证/permit；下载前会再次确认。",
        "payment_receipt": "请确认要下载最新成功交易的收据，或提供 transaction number。",
        "fine_appeal": "请提供媒体违规记录和申诉理由；提交前会展示预览并再次确认。",
        "fine_payment": "请提供要支付的媒体违规记录；展示金额和支付信息后仍需再次确认。",
        "complaint_create": "请提供延迟的申请编号和投诉内容；提交前会展示预览。",
        "enquiry_followup": "请提供要跟进的 enquiry reference；没有记录时不声称已完成跟进。",
        "enquiry_reopen": "请提供已解决的 enquiry reference；系统不保证支持 reopen。",
        "technical_enquiry": "请提供失败交易、错误信息和发生时间，以生成技术 enquiry 预览。",
        "service_discovery": "请说明账户类型和媒体业务活动，我将筛选 UMC 媒体服务。",
        "license_application": "请确认具体许可/服务类型和申请主体，以继续申请流程。",
        "license_renewal": "请提供需要续期或延期的许可证/permit 类型；账户查询还需要许可证号。",
        "service_fees": "请提供需要查询费用的具体媒体服务或 service ID。",
        "latest_regulations": "请提供法规主题或具体法规/内阁决议编号、标题和日期；逐字引用还必须定位到明确条款。",
    }.get(route.skill_id, "请补充必要信息后继续。")
    return {
        "required": True,
        "prompt": prompt,
        "fields": list(route.fields),
        "choices": list(route.choices),
        "confirmationRequired": route.confirmation_required,
    }


def build_system_prompt(route: SkillRoute, *, evidence_available: bool) -> str:
    guardrails = [
        "只使用可信工具证据；没有证据时明确说明限制，不得编造账户数据、费用、法规或接口能力。",
        "所有支付、申诉、投诉、下载等副作用操作都必须先展示预览并获得用户明确确认。",
        "候选服务不是资格结论；renewal 与 extension 要分开判断。",
    ]
    if route.skill_id == "latest_regulations" and route.mode == "exact_quote":
        guardrails.append("精确引用必须同时确认法规标题/编号/日期和 article/clause；来源不明确时只能追问，禁止从检索排序中自动选文书。")
    if route.category == "knowledge" and not evidence_available:
        guardrails.append("知识库证据不可用时，不要把通用常识写成 UMC 已验证规则。")
    return "你是 DSH Runtime 的 UMC 助手。请用用户语言回答，默认中文；先遵守 Skill 路由，再生成简洁、可执行的答复。" + "\n" + "\n".join(f"- {item}" for item in guardrails)
