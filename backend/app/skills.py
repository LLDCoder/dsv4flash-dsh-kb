import json
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


def _guidance(when: str, boundary: str, prerequisites: str, response: str, navigation: str = "") -> str:
    sections = [
        f"WHEN TO USE: {when}",
        f"DO NOT USE WHEN: {boundary}",
        f"PREREQUISITES: {prerequisites}",
        f"RESPONSE RULES: {response}",
    ]
    if navigation:
        sections.append(f"NAVIGATION: {navigation}")
    return "\n".join(sections)


SKILL_GUIDANCE: dict[str, str] = {
    "document_ocr": _guidance(
        "the user attaches a PDF/image or asks to extract fields from a document.",
        "the user asks whether a document has already been submitted, approved, or verified by UMC.",
        "an attachment and a trusted caller identity; OCR output must be treated as unverified evidence.",
        "state that extracted values require user confirmation, preserve identifiers as strings, and report uncertainty or unreadable fields.",
    ),
    "service_discovery": _guidance(
        "the user wants to find or compare a media service for a stated activity.",
        "the user asks for a personal application status, issued document status, fee transaction, or legal ruling.",
        "the applicant type and media activity; use knowledge evidence to identify candidate services.",
        "separate candidate services from legal eligibility and explain what information is still missing.",
    ),
    "umc_application_detail": _guidance(
        "the user selects one of their My Requests records and asks for its detail, timeline, fee, service, or linked document.",
        "no application identifier or selectable My Requests record is available, or the question concerns an issued License/Permit list.",
        "a current UMC bearer token and a positive applicationId.",
        "return only fields from live responses, identify the application number and current status, and never infer missing milestones or approval decisions. This Skill is read-only: do not edit, cancel, duplicate, submit, or pay.",
        "/my-requests/detail?id={applicationId}",
    ),
    "umc_book_by_isbn": _guidance(
        "the user asks to look up a book by ISBN.",
        "the identifier is not an ISBN or the user asks for a general book recommendation.",
        "the ISBN as a string, including leading zeros and hyphens until normalized.",
        "show only the record returned by UMC and state when no matching record is found.",
    ),
    "umc_add_application": _guidance(
        "the user explicitly asks to create or update a controlled draft in the test environment.",
        "the user asks to formally submit an application, pay, or bypass confirmation.",
        "trusted UMC identity, complete draft parameters, and explicit confirmation immediately before the write.",
        "preview the payload first; allow only type=3/isTest=true new drafts or type=2 updates with applicationId; never claim formal submission.",
    ),
    "copyright_guidance": _guidance(
        "the user asks about copyright, content permission, or media content compliance.",
        "the user asks for a personal license status, a binding legal opinion, or a guarantee that a use is cleared.",
        "current knowledge-base evidence and the specific content scenario.",
        "cite the retrieved source, distinguish general guidance from legal advice, and identify when professional review is needed.",
    ),
    "admin_inspection": _guidance(
        "an authorized administrator asks for inspection summaries, risk indicators, or drill-downs.",
        "a customer asks about another account or the caller lacks administrator scope.",
        "trusted principal and verified admin_scope; no customer data may be inferred from aggregates.",
        "enforce account/tenant scope, label risk as an analytical signal, and state when the current tool set cannot provide a requested metric.",
    ),
    "admin_analytics": _guidance(
        "an authorized administrator asks for pivots, dimensions, processing time, or operational trends.",
        "a customer asks for administrative data or the requested dimension is not available in the evidence.",
        "trusted principal, admin_scope, a time range, metric definition, and grouping dimension.",
        "keep one metric definition and time window, show the population size, and do not invent causes for a trend.",
    ),
    "admin_finance": _guidance(
        "an authorized administrator asks for revenue, collection, or finance trend analysis.",
        "the user asks to initiate, refund, or change a payment, or lacks admin_scope.",
        "trusted principal, admin_scope, and a precise period/currency definition.",
        "report aggregates with their source and period; this Skill is read-only and never performs a financial operation.",
    ),
    "admin_audit": _guidance(
        "an authorized administrator asks about audit events, permissions, or low-confidence records.",
        "a customer asks to inspect another user or the caller lacks admin_scope.",
        "trusted principal and admin_scope; sensitive fields must be masked.",
        "separate recorded facts from review signals, apply RBAC before returning data, and never expose tokens or credentials.",
    ),
    "profile_status": _guidance(
        "the user asks about a profile review state or whether a profile can apply.",
        "the user asks for a specific application status or an issued license/permit status.",
        "profileId when the question is profile-specific; use the caller's application list only for related eligibility context.",
        "separate profile state from application state and never infer eligibility from draft counts.",
    ),
    "service_eligibility": _guidance(
        "the user asks which services are available to their account/profile.",
        "the user asks for general policy only, or provides no applicant type and no media activity.",
        "account/profile type and media activity; use collected services and service categories from the current account.",
        "return candidate services and missing inputs, not a binding eligibility decision.",
    ),
    "application_payment": _guidance(
        "the user asks which My Requests applications are awaiting payment or asks to inspect the payment details for a selected application.",
        "the user asks to make, retry, or confirm a payment, or asks about an unrelated transaction or issued permit.",
        "trusted UMC identity; use the current application list and the selected application's read-only payment detail.",
        "show application number, service, amount, currency, and payment status returned by UMC. This Skill is read-only and never starts, retries, or confirms payment.",
    ),
    "application_status": _guidance(
        "the user asks for the status, progress, filters, counts, or history of their own My Requests applications.",
        "the user asks for an issued license/permit count or general application requirements.",
        "trusted UMC identity; query the current account's application list and use detail only for a selected application.",
        "include application number, service, creation time, current status, and result scope; distinguish draft, submitted, pending payment, and completed. This Skill is read-only and never edits, cancels, duplicates, submits, or pays.",
        "/my-requests or /my-requests/detail?id={applicationId}",
    ),
    "license_permit_status": _guidance(
        "the user asks about their own issued License/Permit list, count, status, validity, expiry, number, or available portal actions, including a named document such as 'How about my Social Media Advertiser Permit?'.",
        "the user explicitly asks for renewal process/requirements, My Requests application status, pending payment, a new-license application, or administrative records.",
        "a current UMC bearer token and live License/Permit APIs; query the current account's issued-record list and never substitute application records.",
        "for a named permit, match it against the returned issued records and report its actual status, effective date, expiry date, number, and available actions. Do not say account access is unavailable when the live lookup succeeds. Do not use public verification or knowledge-base guidance as a substitute for the account result. This Skill is read-only and never renews, modifies, cancels, transfers, or submits.",
        "/permits-license; if a selected-record detail request is unavailable, say only that full details are unavailable and direct the user to this portal page. Never describe internal tools, errors, URLs, access codes, or hidden fields.",
    ),
    "license_permit_modification_knowledge": _guidance(
        "the user asks whether a current License/Permit can be modified, why its Modify action is unavailable, or asks the general modification scope, requirements, documents, fees, or process.",
        "the user asks to actually create, save, submit, cancel, transfer, or pay for a modification; asks for renewal, download, or a My Requests application status.",
        "for a named current document, the live issued-record list; for general process questions, current knowledge evidence.",
        "state the live availability of Modify separately from general guidance. Use only returned actions and evidence; do not invent supported changes or claim a modification was started. Direct the user to the selected record's Modify action when it is available.",
        "/permits-license",
    ),
    "permit_download": _guidance(
        "the user asks to view or download a specific issued License/Permit document.",
        "the user has not selected a document, or asks to download an application draft or another user's document.",
        "the customer uses the authenticated NMA customer portal.",
        "explain that the customer must download the issued record from the Licenses & Permits page in the portal. The downloaded PDF is protected and requires an Access Code to open. The assistant must not download or open the file for the customer, retrieve, request, or reveal an Access Code, document URL, or download credential. Give concise portal guidance in the user's current language and direct the customer to official support if they cannot access the code.",
        "/permits-license",
    ),
    "payment_receipt": _guidance(
        "the user asks to find or download a receipt for a completed payment.",
        "the transaction is pending/failed, or the user asks to make or reverse a payment.",
        "trusted UMC identity and a selected successful transaction number.",
        "show the transaction first, confirm the selected receipt, and do not fabricate a receipt URL or payment success.",
    ),
    "fine_appeal": _guidance(
        "the user asks to challenge a specific media violation.",
        "no violation is identified, or the user asks to pay the fine instead.",
        "violation number, an appeal reason from UMC, appeal details, and explicit confirmation before submission.",
        "show a complete preview, keep the submitted reason/details verbatim where possible, and never claim the appeal was filed without a successful write response.",
    ),
    "complaint_create": _guidance(
        "the user wants to prepare a complaint about a delayed application.",
        "the user asks to complain about a different topic or provides no application reference.",
        "application number, complaint details, and the available enquiry type/application options.",
        "create a preview only; obtain explicit confirmation before any future write integration and never claim a complaint was submitted.",
    ),
    "enquiry_followup": _guidance(
        "the user wants to follow up on an existing enquiry.",
        "no enquiry reference exists, or the user wants to create a new complaint.",
        "trusted UMC identity and an enquiry reference selected from the current account.",
        "show the matching enquiry and its current state; do not claim that a follow-up was sent when only a read operation is available.",
    ),
    "enquiry_reopen": _guidance(
        "the user asks what can be done with a resolved enquiry.",
        "the user expects an unsupported one-click reopen operation.",
        "a resolved enquiry reference and the current account's enquiry record.",
        "explain whether adding a message or creating a linked enquiry is available; never promise reopening without an API result.",
    ),
    "technical_enquiry": _guidance(
        "the user reports a payment failure and wants a technical enquiry prepared.",
        "the user asks to retry or complete payment directly.",
        "transaction number, error message, occurrence time, and the available enquiry types.",
        "show a technical-enquiry preview and preserve the error details; do not claim submission or payment resolution.",
    ),
    "license_application_knowledge": _guidance(
        "the user asks how to apply for a named new media license or permit, including its requirements, documents, fees, or process.",
        "the user asks to create, save, submit, modify, pay for, or track an application; asks about an issued document or renewal; or only describes an activity without identifying a license/service.",
        "the named license/service and current knowledge evidence. For an explicit license or permit name, search knowledge before asking for applicant type.",
        "provide evidence-based requirements and process only. Keep service discovery for an unknown service/activity, and keep future application creation or submission in a separate write Skill. Do not invent a personalized approval outcome.",
        "/services and the selected service's application flow",
    ),
    "service_eligibility_info": _guidance(
        "the user asks for general information about who may use media services.",
        "the user asks for a personal eligibility determination or account/profile status.",
        "knowledge-base evidence and the applicant category/activity being discussed.",
        "label the answer as general guidance and direct personal checks to the profile/service eligibility flow.",
    ),
    "license_renewal": _guidance(
        "the user asks which existing License/Permit needs attention or wants read-only renewal/expiry eligibility information.",
        "the user asks to apply for a new service or merely wants the current document count/status.",
        "the document type/number when account lookup is needed, current action-needed data, and the renewal knowledge rule.",
        "distinguish renewal from extension/modification, use action validation only as a read-only eligibility check, and never initiate renewal or another write operation. Ask for confirmation only if a later download is requested.",
        "/permits-license action-needed cards and the resulting service route",
    ),
    "my_requests_pending_actions": _guidance(
        "the user asks what is pending, what needs attention, or which actions are outstanding in My Requests.",
        "the user asks about issued License/Permit expiry actions, administrative review data, or asks to perform an action.",
        "trusted UMC identity and the current account's pending-actions/application list.",
        "list only live pending items, identify the related application and status, and do not pay, edit, cancel, duplicate, submit, or otherwise mutate a request.",
        "/my-requests",
    ),
    "service_fees": _guidance(
        "the user asks for the fee or processing time of a specific media service.",
        "the service is not identified, or the user asks for a personal payment/receipt.",
        "service name or ID plus current knowledge evidence and effective-date context.",
        "disambiguate service IDs, show currency and effective date, and never combine fees from different services.",
    ),
    "latest_regulations": _guidance(
        "the user asks for current media regulations, a Cabinet Resolution, or an exact quotation.",
        "the requested instrument/article cannot be identified, or the user asks for a personal legal clearance.",
        "knowledge evidence; exact quotation additionally requires the instrument number/title/date and article or clause.",
        "identify the source and date, distinguish summary from quotation, and ask a clarification question when the source is ambiguous.",
    ),
    "fine_payment": _guidance(
        "the user asks about an unpaid media fine and how payment works.",
        "the user asks to appeal, or no violation can be identified.",
        "current pending-violation data and the payment procedure from the knowledge base.",
        "show the violation and amount returned by UMC, require explicit confirmation before payment, and never claim payment completion without a transaction result.",
    ),
    "general_knowledge": _guidance(
        "no business domain was confidently recalled and the user asks for general NMA or media-service information.",
        "the user asks for a personal application, license, payment, account, or other live record that needs a business Skill.",
        "knowledge-base evidence; ask a focused follow-up only when the question cannot be answered reliably from the available evidence.",
        "answer from retrieved evidence, cite the source, and clearly state when the knowledge base has no reliable answer. Do not invent personal account results or policy requirements.",
    ),
}


# Routing metadata is intentionally short and operational. The full Skill
# content remains the source of answer-time instructions; these fields are
# used only for deterministic candidate recall before LLM classification.
SKILL_ROUTING_METADATA: dict[str, dict[str, Any]] = {
    "document_ocr": {"domain": "documents", "aliases": ["ocr", "document", "image", "attachment", "扫描件", "图片"]},
    "service_discovery": {"domain": "services", "aliases": ["find service", "compare services", "which service", "服务", "service catalogue"]},
    "umc_application_detail": {"domain": "applications", "aliases": ["application detail", "application id", "申请详情", "applicationid"]},
    "umc_book_by_isbn": {"domain": "books", "aliases": ["isbn", "book lookup", "书号"]},
    "umc_add_application": {"domain": "applications", "aliases": ["new application", "create draft", "新建申请", "草稿"]},
    "copyright_guidance": {"domain": "knowledge_policy", "aliases": ["copyright", "content permission", "版权", "内容合规"]},
    "admin_inspection": {"domain": "admin", "aliases": ["inspection", "risk", "检查", "高风险"]},
    "admin_analytics": {"domain": "admin", "aliases": ["analytics", "pivot", "processing time", "分析", "趋势"]},
    "admin_finance": {"domain": "admin", "aliases": ["revenue", "collection", "finance", "收入", "财务"]},
    "admin_audit": {"domain": "admin", "aliases": ["audit", "permissions", "审计", "权限"]},
    "profile_status": {"domain": "profile", "aliases": ["profile review", "profile status", "资料审核", "档案"]},
    "service_eligibility": {"domain": "services", "aliases": ["my eligibility", "eligible for", "资格", "适用服务"]},
    "application_payment": {"domain": "payments", "aliases": ["pending payment", "pay application", "待付款", "付款申请"]},
    "my_requests_pending_actions": {"domain": "applications", "aliases": ["my requests pending", "pending actions", "what needs attention", "待处理事项", "待办申请"]},
    "application_status": {"domain": "applications", "aliases": ["application status", "application progress", "申请状态", "申请进度"]},
    "license_permit_status": {"domain": "licenses_permits", "aliases": ["my license", "my permit", "named permit", "license status", "permit status", "license count", "advertiser permit", "许可证", "牌照", "许可"]},
    "license_permit_modification_knowledge": {"domain": "licenses_permits", "aliases": ["modify license", "modify permit", "change license details", "update media license", "add license activity", "修改许可证", "修改牌照"]},
    "permit_download": {"domain": "licenses_permits", "aliases": ["download license", "download permit", "license document", "下载许可证"]},
    "payment_receipt": {"domain": "payments", "aliases": ["receipt", "payment receipt", "收据", "付款凭证"]},
    "fine_appeal": {"domain": "fines", "aliases": ["appeal fine", "violation appeal", "申诉罚款", "违规申诉"]},
    "complaint_create": {"domain": "enquiries", "aliases": ["complaint", "投诉", "delayed application"]},
    "enquiry_followup": {"domain": "enquiries", "aliases": ["follow up enquiry", "enquiry follow-up", "跟进咨询"]},
    "enquiry_reopen": {"domain": "enquiries", "aliases": ["reopen enquiry", "resolved enquiry", "重新打开咨询"]},
    "technical_enquiry": {"domain": "enquiries", "aliases": ["technical enquiry", "payment failed", "技术咨询", "支付失败"]},
    "license_application_knowledge": {"domain": "license_application", "aliases": ["apply for license", "apply for permit", "license application", "license requirements", "permit requirements", "new license", "申请许可证", "办理牌照"]},
    "service_eligibility_info": {"domain": "knowledge_policy", "aliases": ["who is eligible", "eligibility information", "谁有资格", "资格说明"]},
    "license_renewal": {"domain": "licenses_permits", "aliases": ["renew license", "renewal", "extend permit", "续期", "延期"]},
    "service_fees": {"domain": "knowledge_policy", "aliases": ["service fee", "processing time", "费用", "办理时间"]},
    "latest_regulations": {"domain": "knowledge_policy", "aliases": ["regulation", "cabinet resolution", "media rules", "法规", "条例"]},
    "fine_payment": {"domain": "fines", "aliases": ["pay fine", "unpaid fine", "罚款缴纳", "未缴罚款"]},
}


DEFAULT_SKILL_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "skill_id": "document_ocr",
        "name": "Document OCR and field extraction",
        "allowed_tools": ["ocr.layout_parsing"],
        "dependencies": ["ocr_gateway", "trusted_principal"],
        "content": SKILL_GUIDANCE["document_ocr"],
    },
    {
        "skill_id": "service_discovery",
        "name": "Service discovery and comparison",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": SKILL_GUIDANCE["service_discovery"],
    },
    {
        "skill_id": "umc_application_detail",
        "name": "UMC application detail lookup",
        "allowed_tools": ["umc.application_detail"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["umc_application_detail"],
    },
    {
        "skill_id": "umc_book_by_isbn",
        "name": "UMC book ISBN lookup",
        "allowed_tools": ["umc.book_by_isbn"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["umc_book_by_isbn"],
    },
    {
        "skill_id": "umc_add_application",
        "name": "UMC controlled draft application",
        "allowed_tools": ["umc.add_application"],
        "dependencies": ["trusted_principal", "umc_data_access", "explicit_confirmation"],
        "content": SKILL_GUIDANCE["umc_add_application"],
    },
    {
        "skill_id": "copyright_guidance",
        "name": "Copyright and content guidance",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": SKILL_GUIDANCE["copyright_guidance"],
    },
    {
        "skill_id": "admin_inspection",
        "name": "Admin inspection drilldown",
        "allowed_tools": [],
        "dependencies": ["trusted_principal", "admin_scope"],
        "content": SKILL_GUIDANCE["admin_inspection"],
    },
    {
        "skill_id": "admin_analytics",
        "name": "Admin analytics and pivots",
        "allowed_tools": [],
        "dependencies": ["trusted_principal", "admin_scope"],
        "content": SKILL_GUIDANCE["admin_analytics"],
    },
    {
        "skill_id": "admin_finance",
        "name": "Admin finance trend",
        "allowed_tools": [],
        "dependencies": ["trusted_principal", "admin_scope"],
        "content": SKILL_GUIDANCE["admin_finance"],
    },
    {
        "skill_id": "admin_audit",
        "name": "Admin audit and permissions",
        "allowed_tools": [],
        "dependencies": ["trusted_principal", "admin_scope"],
        "content": SKILL_GUIDANCE["admin_audit"],
    },
    {
        "skill_id": "profile_status",
        "name": "Profile status and application eligibility",
        "allowed_tools": ["umc.applications"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["profile_status"],
    },
    {
        "skill_id": "service_eligibility",
        "name": "Service eligibility",
        "allowed_tools": ["umc.collected-services", "umc.service-categories"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["service_eligibility"],
    },
    {
        "skill_id": "application_payment",
        "name": "Pending payment application details",
        "allowed_tools": ["umc.applications", "umc.application_payment_detail"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["application_payment"],
    },
    {
        "skill_id": "my_requests_pending_actions",
        "name": "My Requests pending actions",
        "allowed_tools": ["umc.pending-actions", "umc.applications"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["my_requests_pending_actions"],
    },
    {
        "skill_id": "application_status",
        "name": "Application status",
        "allowed_tools": ["umc.applications", "umc.application_detail"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "workflow": {
            "routing": {
                "defaultIntentId": "list",
                "intents": [
                    {"id": "list", "description": "Search or summarize the user's My Requests applications."},
                    {"id": "detail", "description": "Show a selected application from the preceding application list."},
                ],
                "filters": {
                    "keyword": {"type": "string", "description": "Application number or text the user explicitly supplied."},
                    "submissionDate": {"type": "date_range", "description": "Inclusive submission-date range with ISO start and end dates."},
                    "status": {
                        "type": "enum",
                        "description": "My Requests status filter.",
                        "options": [
                            {"id": "draft", "value": "101", "description": "Draft requests."},
                            {"id": "under_review", "value": "102", "description": "Requests under review."},
                            {"id": "pending_payment", "value": "103", "description": "Requests awaiting payment."},
                            {"id": "pending_modification", "value": "104", "description": "Requests awaiting modification."},
                            {"id": "completed", "value": "105", "description": "Completed requests."},
                            {"id": "rejected", "value": "106", "description": "Rejected requests."},
                            {"id": "cancelled", "value": "107", "description": "Cancelled requests."},
                            {"id": "pending_disposition", "value": "108", "description": "Requests pending disposition."},
                            {"id": "submitted", "value": "110", "description": "Submitted requests."},
                        ],
                    },
                    "record": {"type": "selection", "description": "A record from the latest application list, by ordinal or application identifier."},
                },
            },
            "requests": [
                {
                    "intentId": "list",
                    "toolName": "umc.applications",
                    "arguments": {"pageIndex": 1, "pageSize": 100, "sortBy": "createdOn", "sortDirection": 1},
                    "bindings": [
                        {"filter": "keyword", "argument": "keyword"},
                        {"filter": "submissionDate.start", "argument": "startTime"},
                        {"filter": "submissionDate.end", "argument": "endTime"},
                        {"filter": "status", "argument": "applicationStatusId"},
                    ],
                },
            ],
            "defaultToolRequest": {
                "toolName": "umc.applications",
                "arguments": {"pageIndex": 1, "pageSize": 100, "sortBy": "createdOn", "sortDirection": 1},
            },
            "selection": {
                "intentId": "detail",
                "filter": "record",
                "sourceTool": "umc.applications",
                "itemsPath": "data.applicationPage.items",
                "valueField": "applicationId",
                "identifierFields": ["applicationNumber", "applicationNo", "id"],
                "toolRequest": {"toolName": "umc.application_detail", "argumentName": "applicationId", "argumentValueType": "integer"},
            },
        },
        "content": SKILL_GUIDANCE["application_status"],
    },
    {
        "skill_id": "license_permit_status",
        "name": "Issued license and permit status",
        "allowed_tools": ["umc.licenses.list", "umc.licenses.statistics", "umc.licenses.action_needed", "umc.licenses.detail"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "workflow": {
            "routing": {
                "defaultIntentId": "list",
                "intents": [
                    {"id": "list", "description": "List or summarize issued licenses and permits."},
                    {"id": "named_permit", "description": "The user asks about a particular issued permit or license in their account, including 'How about my <permit name>?'."},
                    {"id": "expired", "description": "Records whose status is already expired."},
                    {"id": "expiring_soon", "description": "Records whose status is Expiring Soon, not already expired."},
                    {"id": "action_needed", "description": "Records returned by the portal's Action Needed feed."},
                    {"id": "detail", "description": "Show a selected record from the preceding license or permit list."},
                ],
                "filters": {
                    "record": {"type": "selection", "description": "A record from the latest license list, by ordinal or identifier."},
                },
            },
            "requests": [
                {
                    "intentId": "list",
                    "toolName": "umc.licenses.list",
                    "arguments": {"statuses": [], "documentTypes": [], "pageIndex": 1, "pageSize": 100, "sortDirection": 1},
                },
                {
                    "intentId": "named_permit",
                    "toolName": "umc.licenses.list",
                    "arguments": {"statuses": [], "documentTypes": [], "pageIndex": 1, "pageSize": 100, "sortDirection": 1},
                },
                {
                    "intentId": "expired",
                    "toolName": "umc.licenses.list",
                    "arguments": {
                        "statuses": ["EXPIRED"],
                        "documentTypes": [],
                        "pageIndex": 1,
                        "pageSize": 100,
                        "sortBy": "expireDate",
                        "sortDirection": 1,
                    },
                },
                {
                    "intentId": "expiring_soon",
                    "toolName": "umc.licenses.list",
                    "arguments": {"statuses": ["EXPIRE_SOON", "205"], "documentTypes": [], "pageIndex": 1, "pageSize": 100, "sortBy": "expireDate", "sortDirection": 1},
                },
                {"intentId": "action_needed", "toolName": "umc.licenses.action_needed", "arguments": {}},
            ],
            "defaultToolRequest": {
                "toolName": "umc.licenses.list",
                "arguments": {"statuses": [], "documentTypes": [], "pageIndex": 1, "pageSize": 100, "sortDirection": 1},
            },
            "selection": {
                "intentId": "detail",
                "filter": "record",
                "sourceTool": "umc.licenses.list",
                "itemsPath": "data.items",
                "valueField": "sourceLicenseId",
                "identifierFields": ["documentId", "licensePermitNo", "showLicenseNumber", "mediaLicenseNumber", "documentName"],
                "toolRequest": {
                    "toolName": "umc.licenses.detail",
                    "argumentName": "id",
                    "argumentValueType": "string",
                },
            },
        },
        "content": SKILL_GUIDANCE["license_permit_status"],
    },
    {
        "skill_id": "license_permit_modification_knowledge",
        "name": "License and permit modification knowledge",
        "allowed_tools": ["knowledge.search", "umc.licenses.list"],
        "dependencies": ["knowledge_gateway", "trusted_principal", "umc_customer_api"],
        "workflow": {
            "routing": {
                "defaultIntentId": "general_guidance",
                "intents": [
                    {"id": "current_document", "description": "The user names or selects a current issued license or permit and asks whether Modify is available."},
                    {"id": "general_guidance", "description": "The user asks the modification scope, requirements, documents, fees, or process without selecting a current document."},
                ],
            },
            "requests": [
                {
                    "intentId": "current_document",
                    "toolName": "umc.licenses.list",
                    "arguments": {"statuses": [], "documentTypes": [], "pageIndex": 1, "pageSize": 100, "sortDirection": 1},
                },
            ],
            "toolRequestRules": [
                {
                    "when": {
                        "anyTerms": [
                            "my ", "this ", "my license", "my licence", "my permit", "this license", "this licence", "this permit",
                            "license number", "licence number", "permit number", "我的许可证", "我的牌照", "这个许可证", "这个许可",
                        ],
                    },
                    "toolName": "umc.licenses.list",
                    "arguments": {"statuses": [], "documentTypes": [], "pageIndex": 1, "pageSize": 100, "sortDirection": 1},
                },
            ],
            "defaultToolRequest": {"toolName": "knowledge.search", "arguments": {}},
        },
        "content": SKILL_GUIDANCE["license_permit_modification_knowledge"],
    },
    {
        "skill_id": "permit_download",
        "name": "Issued permit download",
        "allowed_tools": [],
        "dependencies": [],
        "content": SKILL_GUIDANCE["permit_download"],
    },
    {
        "skill_id": "payment_receipt",
        "name": "Payment receipt",
        "allowed_tools": ["umc.payments"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["payment_receipt"],
    },
    {
        "skill_id": "fine_appeal",
        "name": "Fine appeal",
        "allowed_tools": ["umc.pending-violations", "umc.appeal-reasons"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["fine_appeal"],
    },
    {
        "skill_id": "complaint_create",
        "name": "Delayed application complaint",
        "allowed_tools": ["umc.enquiry-types", "umc.enquiry-applications"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["complaint_create"],
    },
    {
        "skill_id": "enquiry_followup",
        "name": "Enquiry follow-up",
        "allowed_tools": ["umc.enquiries"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["enquiry_followup"],
    },
    {
        "skill_id": "enquiry_reopen",
        "name": "Resolved enquiry follow-up",
        "allowed_tools": ["umc.enquiries"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["enquiry_reopen"],
    },
    {
        "skill_id": "technical_enquiry",
        "name": "Payment technical enquiry",
        "allowed_tools": ["umc.enquiry-types", "umc.payments"],
        "dependencies": ["trusted_principal", "umc_customer_api"],
        "content": SKILL_GUIDANCE["technical_enquiry"],
    },
    {
        "skill_id": "license_application_knowledge",
        "name": "Media license application knowledge",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway", "trusted_principal"],
        "content": SKILL_GUIDANCE["license_application_knowledge"],
    },
    {
        "skill_id": "service_eligibility_info",
        "name": "General media service eligibility knowledge",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": SKILL_GUIDANCE["service_eligibility_info"],
    },
    {
        "skill_id": "license_renewal",
        "name": "License and permit action-needed information",
        "allowed_tools": ["knowledge.search", "umc.licenses.list", "umc.licenses.action_needed", "umc.licenses.action_validate", "umc.licenses.detail"],
        "dependencies": ["knowledge_gateway", "trusted_principal", "umc_customer_api"],
        "workflow": {"defaultToolRequest": {"toolName": "umc.licenses.action_needed", "arguments": {}}},
        "content": SKILL_GUIDANCE["license_renewal"],
    },
    {
        "skill_id": "service_fees",
        "name": "Media service fees",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": SKILL_GUIDANCE["service_fees"],
    },
    {
        "skill_id": "latest_regulations",
        "name": "Latest media regulations and exact quotation",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": SKILL_GUIDANCE["latest_regulations"],
    },
    {
        "skill_id": "fine_payment",
        "name": "Fine payment",
        "allowed_tools": ["umc.pending-violations", "knowledge.search"],
        "dependencies": ["trusted_principal", "knowledge_gateway", "umc_customer_api", "explicit_confirmation"],
        "content": SKILL_GUIDANCE["fine_payment"],
    },
    {
        "skill_id": "general_knowledge",
        "name": "General knowledge-base guidance",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "domain": "general",
        "aliases": [],
        "positive_examples": [],
        "negative_examples": [],
        "content": SKILL_GUIDANCE["general_knowledge"],
    },
)

# Keep the definition shape backwards compatible while making routing metadata
# available to DB seeding, Redis catalog generation, and API clients.
for _definition in DEFAULT_SKILL_DEFINITIONS:
    _routing = SKILL_ROUTING_METADATA.get(_definition["skill_id"], {})
    _definition.update(_routing)
    _definition.setdefault("positive_examples", list(_routing.get("aliases", []))[:4])
    _definition.setdefault("negative_examples", [])
    _definition.setdefault("workflow", {})


def _has(text: str, *terms: str) -> bool:
    lowered = text.lower()
    return any(term.lower() in lowered for term in terms)


def resolve_skill(text: str) -> SkillRoute:
    """Deterministic first-pass router; the LLM may refine only after this gate."""
    if _has(text, "ocr", "optical character", "attached document", "attached Arabic trade license", "upload", "image", "screenshot", "IMG-", "识别材料", "扫描件", "图片", "截图", "上传", "رخصة التجارة العربية", "المرفقة", "صورة", "لقطة شاشة"):
        return SkillRoute("document_ocr", "api_call", None, "collect", ("file", "file_type"))
    if _has(text, "book by isbn", "isbn lookup", "isbn 查询", "isbn"):
        return SkillRoute("umc_book_by_isbn", "api_call", None, "answer", ("isbn",))
    if _has(text, "application detail", "applicationdetail", "application id", "applicationid", "申请详情", "申请 ID"):
        return SkillRoute("umc_application_detail", "api_call", None, "answer", ("applicationId",))
    if _has(text, "add new application", "new draft application", "create a draft application", "新增申请", "新建草稿"):
        return SkillRoute("umc_add_application", "api_call", None, "collect", ("parameters",), confirmation_required=True)
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
    if _has(text, "pending actions", "what needs attention", "outstanding actions", "my requests pending", "my pending actions", "待处理事项", "待办申请", "我的待办", "我的待处理", "需要处理") and (
        _has(text, "my request", "application", "申请", "请求", "طلب", "طلبات")
        or not _has(text, "license", "licence", "permit", "许可证", "牌照", "许可", "رخصة", "تصريح")
    ):
        return SkillRoute("my_requests_pending_actions", "data_query", None, "answer")
    if _has(text, "action needed", "actions needed", "needs renewal", "renewal due", "需要续期", "待处理") and _has(text, "license", "licence", "permit", "许可证", "牌照", "许可", "رخصة", "تصريح"):
        return SkillRoute("license_renewal", "data_query", None, "answer", ("license_or_permit_type", "license_number"))
    # Renewal questions have priority over a generic possessive document
    # reference; a named permit alone is an issued-document status query.
    if _has(text, "renew", "renewal", "extend an existing permit", "续期", "延期", "تجديد", "تمديد"):
        return SkillRoute(
            "license_renewal", "knowledge", "knowledge.search", "answer",
            ("license_or_permit_type", "license_number"), ("Renew licence", "Extend permit"),
        )

    if _has(text, "modify", "modification", "change license", "change permit", "update license", "update permit", "修改", "变更") and _has(
        text, "license", "licence", "permit", "许可证", "牌照", "许可", "رخصة", "تصريح"
    ):
        return SkillRoute(
            "license_permit_modification_knowledge", "api_call", None, "answer", ("license_or_permit_type",)
        )

    if _has(text, "download", "issued permit", "下载", "许可证", "تنزيل", "تحميل", "تصريح صادر") and _has(text, "permit", "license", "许可", "تصريح", "رخصة"):
        return SkillRoute("permit_download", "data_query", None, "answer")

    # Personal issued-document questions must be separated from public
    # renewal guidance and from application status.
    personal_document = _has(
        text,
        "how many license", "how many licence", "number of licenses", "number of licences",
        "license status", "licence status", "permit status", "license expiry", "licence expiry",
        "expiring licenses", "expiring licences", "expiring permits",
        "我的许可证", "我的牌照", "我的许可", "许可证数量", "牌照数量", "许可证状态", "牌照状态",
        "حالة رخصتي", "حالة تصريحي", "رخصتي", "تصريحي", "عدد الرخص", "عدد التصاريح",
    )
    personal_document = personal_document or (
        _has(text, "my license", "my permit", "my licence", "my licenses", "my permits")
        and _has(text, "status", "expiry", "expire", "expiring", "how many", "count", "状态", "到期", "数量")
    )
    personal_document = personal_document or (
        _has(text, "expiry", "expire", "expiring", "到期", "ستنتهي", "منتهية")
        and _has(text, "license", "licence", "permit", "许可证", "牌照", "许可", "رخصة", "تصريح")
    )
    personal_document = personal_document or (
        _has(text, "my ", "我的", "رخصتي", "تصريحي")
        and _has(text, "license", "licence", "permit", "许可证", "牌照", "许可", "رخصة", "تصريح")
        and not _has(text, "apply", "application", "new license", "new permit", "requirements", "eligibility", "how to get", "申请", "办理", "资格")
    )
    application_document = _has(text, "application", "申请", "طلب", "طلباتي", "application status", "حالة الطلب")
    if personal_document and not application_document:
        return SkillRoute("license_permit_status", "data_query", None, "answer", ("license_or_permit_type",))

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
    if _has(text, "latest status", "application status", "status of my application", "what's the status of my application", "open applications", "summarize my open", "my requests", "我的申请", "我的请求", "申请状态", "申请进度", "حالة الطلب", "حالة طلبي", "آخر حالة"):
        return SkillRoute("application_status", "data_query", None, "answer")
    if _has(text, "how to apply", "how do i apply", "apply for", "application requirements", "license requirements", "permit requirements", "申请许可", "申请许可证", "办理牌照") and _has(text, "license", "licence", "permit", "许可证", "牌照", "许可", "رخصة", "تصريح"):
        return SkillRoute(
            "license_application_knowledge", "knowledge", "knowledge.search", "answer",
            ("permit_or_service_type",),
        )
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
    if _has(text, "pending payment", "waiting for payment", "awaiting payment", "待付款", "الدفع المعلق", "قيد الدفع"):
        return SkillRoute("application_payment", "data_query", None, "collect", ("application_number",))
    if _has(text, "complaint", "投诉", "شكوى"):
        return SkillRoute("complaint_create", "api_call", None, "collect", ("application_number", "complaint_details"), confirmation_required=True)
    if _has(text, "follow up", "enquiry", "咨询", "متابعة", "استفسار") and _has(text, "earlier", "submitted", "跟进", "سابق", "مقدم"):
        return SkillRoute("enquiry_followup", "data_query", None, "collect", ("enquiry_reference",))
    if _has(text, "photography", "filming", "filming permit", "photocopying equipment", "advertising license", "new permit", "license requirements", "license application", "media license", "newspaper", "publication", "broadcasting", "radio", "television", "申请许可", "摄影", "طلب تصريح", "متطلبات الترخيص", "رخصة إعلامية", "تصريح", "ترخيص", "صحيفة", "منشور", "بث"):
        return SkillRoute(
            "license_application_knowledge", "knowledge", "knowledge.search", "answer",
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
    if _has(text, "pending payment", "waiting for payment", "awaiting payment", "待付款", "الدفع المعلق", "قيد الدفع"):
        return SkillRoute("application_payment", "data_query", None, "collect", ("application_number",))
    if _has(text, "latest status", "application status", "申请状态", "حالة الطلب", "آخر حالة"):
        return SkillRoute("application_status", "data_query", None, "answer")
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
        "license_application_knowledge": "UMC UAE Media Council media license permit application requirements process",
        "service_eligibility_info": "UMC UAE Media Council media services eligibility applicant types",
        "license_permit_status": "UMC UAE Media Council issued licenses permits current status expiry effective date",
        "license_permit_modification_knowledge": "UMC UAE Media Council media license permit modification requirements documents fees process",
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
        "application_payment": "Select the Pending Payment application to inspect its read-only payment details; this Skill never starts or confirms payment.",
        "my_requests_pending_actions": "Query the current account's My Requests pending actions and identify the related application; no mutation is allowed.",
        "application_status": "Provide the application number. If it is unavailable, query the latest applications and state the result scope.",
        "license_permit_status": "Query the current user's issued licenses and permits. Report separate License and Permit counts, statuses, effective dates, expiry dates, and available actions; do not mix in application records.",
        "license_permit_modification_knowledge": "For a named current document, query issued licenses and permits and report whether Modify is available without starting it. For general modification questions, provide knowledge-based requirements and process only.",
        "permit_download": "Do not download or open the document. Explain that the customer must use the Licenses & Permits portal page; its downloaded PDF requires an Access Code to open, which the assistant cannot retrieve, request, or reveal. Respond in the user's current language.",
        "payment_receipt": "Confirm whether to download the latest successful transaction receipt, or provide a transaction number.",
        "fine_appeal": "Provide the media violation and appeal reason; show a preview and obtain explicit confirmation before submission.",
        "fine_payment": "Provide the media violation to pay; show the amount and payment information and obtain explicit confirmation.",
        "complaint_create": "Provide the delayed application number and complaint details; show a preview before submission.",
        "enquiry_followup": "Provide the enquiry reference to follow up; do not claim completion when no record is available.",
        "enquiry_reopen": "Provide the resolved enquiry reference; do not promise that reopening is supported.",
        "technical_enquiry": "Provide the failed transaction, error message, and occurrence time to prepare a technical enquiry preview.",
        "service_discovery": "Describe the account type and media activity so I can identify candidate UMC media services.",
        "license_application_knowledge": "Provide the named licence or permit. If only the activity is known, use service discovery first.",
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
        "Never expose internal Tool names, request arguments, serialized JSON, API envelopes, or internal evidence instructions. Convert verified evidence into a concise user-facing answer.",
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
