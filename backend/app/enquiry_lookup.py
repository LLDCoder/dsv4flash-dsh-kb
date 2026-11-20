"""Read-only Customer enquiries, scoped to the existing authenticated Profile."""
import re

from .application_listing import _cell
from .application_payable import _data, _id

NUMBER = re.compile(r"\bHC-\d{2}-\d{4}-\d+\b", re.I)
LIST = re.compile(
    r"(?:(?:show|list|display)(?: me)? my (?:enquiries and complaints|inquiries and complaints|complaints and enquir(?:y|ies)|complaints|enquiries|inquiries)(?: again)?|"
    r"(?:اعرض|أرني|أعرض) (?:استفساراتي وشكاواي|شكاواي واستفساراتي|شكاواي|استفساراتي)(?: مرة أخرى| مجددًا)?)"
    r"[.!?؟ ]*", re.I,
)
ORDINAL = re.compile(r"(?:(?:view|show|open) (?:the )?(first|second|third) (?:item|record|one)|(?:اعرض|أرني|افتح) (?:العنصر|السجل) (الأول|الثاني|الثالث))[.!?؟ ]*", re.I)
FOLLOW = re.compile(
    r"\b(?:that|this|same)\s+(?:enquiry|inquiry|complaint|ticket|record)\b|\bwhat service is it about\b"
    r"|ذلك الاستفسار|هذه الشكوى|هذا الاستفسار|نفس الشكوى|ما الخدمة المرتبطة|ذلك السجل", re.I,
)
READ = re.compile(r"\b(?:show|details?|find|check|status|service|retrieve)\b|تفاصيل|حالة|اعرض|أرني", re.I)
APPLICATION_NUMBER = re.compile(r"[A-Z]{2}-[0-9]+-[0-9]+-[0-9]+")
UNSUPPORTED = re.compile(r"\b(?:delete|cancel|submit|modify|change|upload|download|send|reply|close)\b|حذف|إلغاء|إرسال|تعديل|تنزيل", re.I)


def is_general_enquiry_policy(question):
    """Recognize standalone policy questions without borrowing personal records."""
    if NUMBER.search(question) or re.search(
        r"\b(?:my|mine|our|this|that|these|those|same|specific|number)\b|شكاواي|شكواي|استفساراتي|هذه|ذلك|رقم",
        question, re.I,
    ):
        return False
    topic = re.search(r"\b(?:complaints?|enquir(?:y|ies)|inquir(?:y|ies))\b|شكاوى|شكوى|استفسار", question, re.I)
    policy = re.search(r"\b(?:polic(?:y|ies)|procedures?|rules?|how (?:are|does))\b|سياس|إجراء|قواعد|كيف", question, re.I)
    return bool(topic and policy)


def enquiry_query(question, history, profile):
    text = question.strip()
    if UNSUPPORTED.search(text) or text.startswith("/"):
        return None
    numbers = {number.upper() for number in NUMBER.findall(text)}
    if numbers:
        return ("exact", numbers.pop()) if len(numbers) == 1 and READ.search(text) else None
    if LIST.fullmatch(text):
        category = None
        if re.search(r"my complaints(?: again)?[.!? ]*$|شكاواي(?: مرة أخرى| مجددًا)?[.!?؟ ]*$", text, re.I) and not re.search(r"\band\b|وشكاواي",text):
            category = 2  # Customer EnquiryType contract.
        if re.search(r"my (?:enquiries|inquiries)(?: again)?[.!? ]*$|استفساراتي(?: مرة أخرى| مجددًا)?[.!?؟ ]*$", text, re.I) and not re.search(r"\band\b|واستفساراتي",text):
            category = 1
        return ("list", category)
    if re.search(r"\b(?:my|our) complaints\b|شكاواي", text, re.I) and re.search(
        r"\b(?:under processing|being processed)\b|قيد المعالجة", text, re.I,
    ):
        return ("processing", None)
    service_filter = re.search(
        r"\b(?:keep|filter|show|limit)\b.*\bmedia services?\b|(?:احتفظ|صفّ|اعرض).*خدمات إعلامية",
        text, re.I,
    )
    linked_details = re.search(
        r"\b(?:application|request) status\b.*\bdetails?\b|حالة (?:الطلب|المعاملة).*تفاصيل",
        text, re.I,
    )
    ordinal = ORDINAL.fullmatch(text)
    if not ordinal and not service_filter and not linked_details and not FOLLOW.search(text):
        return None
    turns = [event for event in history if event.event_type in {"user.message", "assistant.message", "enquiry.lookup.binding"}]
    if turns and turns[-1].event_type == "user.message":
        turns.pop()
    if len(turns) < 2 or turns[-1].event_type != "assistant.message" or turns[-2].event_type != "enquiry.lookup.binding":
        return None
    binding = turns[-2].event_json
    if binding.get("profileId") != profile or binding.get("requestId") != turns[-1].event_json.get("requestId"):
        return None
    references = binding.get("references") or []
    if linked_details and binding.get("mode") == "exact" and len(references) == 1:
        reference = references[0]
        return ("application", reference) if NUMBER.fullmatch(str(reference)) else None
    if service_filter:
        return ("processing", "service_category_unavailable") if binding.get("mode") == "processing" else None
    if ordinal:
        if binding.get("mode") != "list":
            return None
        word = (ordinal.group(1) or ordinal.group(2)).casefold()
        index = {"first": 0, "second": 1, "third": 2, "الأول": 0, "الثاني": 1, "الثالث": 2}[word]
    elif binding.get("mode") == "exact" and len(references) == 1:
        index = 0
    else:
        return None
    return ("exact", references[index]) if len(references) > index and NUMBER.fullmatch(str(references[index])) else None


async def read_enquiry(platform, principal, selection):
    async def read(path, params=None):
        return _data(await platform.invoke_swagger_tool("GET", path, params, umc_token=principal.umc_token, request_id=principal.request_id))

    mode, selector = selection
    params = {"PageIndex": 1, "PageSize": 10, "SortBy": "createdOn", "SortDirection": 1}
    if mode == "exact":
        params["EnquiryNumber"] = selector
    elif mode == "processing" or selector:
        params["EnquiryType"] = 2 if mode == "processing" else selector
    source = await read("/api/Enquiry/List", params)
    total, items = source.get("total"), source.get("items")
    if type(total) is not int or total < 0 or not isinstance(items, list) or not all(isinstance(row, dict) for row in items):
        raise ValueError("enquiry_page_shape")
    if len(items) != min(total, params["PageSize"]):
        raise ValueError("enquiry_page_incomplete")
    if any(row.get("profileId") is not None and str(row["profileId"]) != principal.profile_id for row in items):
        raise PermissionError("enquiry_profile_mismatch")
    if mode == "processing":
        # The portal accepts enquiry type but does not publish a list query for
        # customer status or service category. Apply the status to its full result.
        for page_index in range(2, (total + params["PageSize"] - 1) // params["PageSize"] + 1):
            page = await read("/api/Enquiry/List", {**params, "PageIndex": page_index})
            page_items = page.get("items")
            if (page.get("total") != total or not isinstance(page_items, list)
                or len(page_items) != min(params["PageSize"], total - (page_index - 1) * params["PageSize"])
                or not all(isinstance(row, dict) for row in page_items)):
                raise ValueError("enquiry_page_incomplete")
            items = [*items, *page_items]
        references = {str(row.get("enquiryNumber") or "") for row in items}
        if len(references) != total or not all(NUMBER.fullmatch(ref) for ref in references):
            raise ValueError("enquiry_pages_changed")
        if any(row.get("profileId") is not None and str(row["profileId"]) != principal.profile_id for row in items):
            raise PermissionError("enquiry_profile_mismatch")
        matching = [row for row in items if row.get("enquiryStatusId") == 1]  # Customer EnquiryStatus.UnderProcessing
        return len(matching), matching[:params["PageSize"]]
    if mode == "list":
        return total, [row for row in items if NUMBER.fullmatch(str(row.get("enquiryNumber") or ""))]
    matches = [row for row in items if str(row.get("enquiryNumber") or "").upper() == selector]
    if not matches:
        return 0, []
    if len(matches) != 1 or total != len(items):
        raise ValueError("enquiry_reference_ambiguous")
    key = str(matches[0].get("id") or "")
    if not re.fullmatch(r"[1-9]\d{0,18}", key):
        raise ValueError("enquiry_identity_invalid")
    detail = await read(f"/api/Enquiry/{key}/EnquiryInfo")
    if str(detail.get("enquiryNumber") or "").upper() != selector:
        raise ValueError("enquiry_detail_mismatch")
    if detail.get("profileId") is not None and str(detail["profileId"]) != principal.profile_id:
        raise PermissionError("enquiry_detail_profile_mismatch")
    return 1, [{**matches[0], **{k: v for k, v in detail.items() if v is not None}}]


def enquiry_reply(result, language, selection):
    mode, selector = selection
    total, rows = result
    ar = language == "ar"
    missing = "غير متاح" if ar else "Not available"
    link = "[الاستفسارات والشكاوى](/complaints)" if ar else "[Enquiries & Complaints](/complaints)"

    def label(row, name):
        item = row.get(name)
        return _cell(item.get("nameAr" if ar else "nameEn") if isinstance(item, dict) else None, missing)

    service_note = ""
    if mode == "processing" and selector == "service_category_unavailable":
        service_note = (
            "تعرض البوابة اسم الخدمة لكل شكوى ولا توفر فئة «الخدمات الإعلامية» للتصفية. هذه هي الشكاوى قيد المعالجة."
            if ar else "The portal shows individual service names but does not provide a media-services category filter. The list shows complaints under processing."
        )
    if not rows:
        message = "لا توجد سجلات مطابقة في الملف الحالي." if ar else "No matching records were found in the selected Profile."
        return " ".join(filter(None, [service_note, message, link]))
    lines = [service_note, ""] if service_note else []
    if mode in {"list", "processing"}:
        lines.extend([
            f"الإجمالي: {total}، المعروض: {len(rows)}" if ar else f"Total: {total}. Showing: {len(rows)}.",
            "",
            "| # | الرقم | النوع | الخدمة | الحالة |" if ar else "| # | Reference | Type | Service | Status |",
            "|---|---|---|---|---|",
        ])
        for index, row in enumerate(rows, 1):
            fields = [str(index), row["enquiryNumber"], label(row,"enquiryTypeObj"), label(row,"serviceObj"), label(row,"enquiryStatusObj")]
            lines.append("| " + " | ".join(fields) + " |")
    else:
        row = rows[0]
        fields = [
            ("الرقم" if ar else "Reference",row["enquiryNumber"]),
            ("النوع" if ar else "Type", label(row,"enquiryTypeObj")),
            ("الخدمة" if ar else "Service", label(row,"serviceObj")),
            ("مرحلة المعالجة الحالية" if ar else "Current processing step", label(row,"enquiryStatusObj")),
            ("الطلب المرتبط" if ar else "Linked application", _cell(row.get("applicationNo"),missing)),
            ("وقت التقديم" if ar else "Submitted", _cell(row.get("createdOn"),missing)),
        ]
        if row.get("enquirySoruceObj"):
            fields.append(("مصدر الاستفسار" if ar else "Source", label(row, "enquirySoruceObj")))
        if row.get("description"):
            fields.append(("وصف المشكلة" if ar else "Description", _cell(row["description"], missing)))
        lines.extend(f"- {field}: {value}" for field,value in fields)
    return "\n".join([*lines, "", link])


async def read_enquiry_application(platform, principal, reference):
    _, enquiries = await read_enquiry(platform, principal, ("exact", reference))
    application_number = str(enquiries[0].get("applicationNo") or "") if enquiries else ""
    return await read_linked_application(platform, principal, application_number)


async def read_linked_application(platform, principal, application_number):
    if not APPLICATION_NUMBER.fullmatch(application_number):
        return application_number, None

    async def read(method, path, parameters):
        payload = await platform.invoke_swagger_tool(
            method, path, parameters, umc_token=principal.umc_token, request_id=principal.request_id,
        )
        return _data(payload)

    data = await read("POST", "/api/MyRequest/ApplicationPage", {
        "pageIndex": 1, "pageSize": 10, "keyword": application_number,
    })
    page = data.get("applicationPage") or {}
    items = page.get("items") or []
    matches = [
        row for row in items if isinstance(row, dict)
        and row.get("applicationNumber") == application_number
    ]
    if len(matches) != 1:
        return application_number, None
    row = matches[0]
    if row.get("profileId") is not None and str(row["profileId"]) != principal.profile_id:
        raise PermissionError("linked_application_profile_mismatch")
    application_id = _id(row.get("applicationId") or row.get("id"))
    if application_id is None:
        raise ValueError("linked_application_identity_missing")
    detail = await read("GET", "/api/MyRequest/ApplicationDetail/{applicationId}", {
        "applicationId": application_id,
    })
    if detail.get("applicationNumber") != application_number or _id(detail.get("applicationId")) != application_id:
        raise ValueError("linked_application_detail_mismatch")
    if detail.get("profileId") is not None and str(detail["profileId"]) != principal.profile_id:
        raise PermissionError("linked_application_detail_profile_mismatch")
    return application_number, {**row, **{k: v for k, v in detail.items() if v is not None}}


def linked_application_reply(result, reference, language, *, subject):
    number, row = result
    ar = language == "ar"
    missing = "غير متاح" if ar else "Not available"
    link = "[طلباتي](/my-requests)" if ar else "[My Requests](/my-requests)"
    source_label = ("طلب الاسترداد" if ar else "Refund request") if subject == "refund" else ("رقم التذكرة" if ar else "Ticket number")
    if not row:
        message = (
            f"{source_label} {reference} — تعذر التحقق من تفاصيل الطلب المرتبط في الملف المحدد."
            if ar else f"{source_label} {reference} — linked application details could not be verified in the selected Profile."
        )
        return f"{message} {link}"
    fields = [
        (source_label, reference),
        ("الطلب المرتبط" if ar else "Linked application", number),
        ("حالة الطلب" if ar else "Application status", row.get("statusAr" if ar else "statusEn")),
        ("الخدمة" if ar else "Service", row.get("serviceNameAr" if ar else "serviceNameEn")),
        ("نوع الطلب" if ar else "Request type", row.get("typeNameAr" if ar else "typeNameEn") or row.get("applicationTypeNameAr" if ar else "applicationTypeNameEn")),
        ("وقت التقديم" if ar else "Submitted", row.get("createdOn")),
    ]
    return "\n".join([*(f"- {key}: {_cell(value, missing)}" for key, value in fields), "", link])
