"""Read the exact issued document in the selected Customer Profile."""
import re

from .application_listing import _cell, _date
from .application_payable import _data

PAGE = "/permits-license"
REFERENCE = r"(?:[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+|[0-9]{5,20})"
TYPED = re.compile(
    rf"(?:\b(?:licen[cs]e|permit)|(?:الترخيص|الرخصة|التصريح|للترخيص|للرخصة|للتصريح))"
    rf"\s*(?:(?:number|no\.?|رقم)\s*)?[:#]?\s*({REFERENCE})(?![\w-])", re.I,
)
READ = re.compile(r"\b(?:status|validity|valid|expir\w*|effective|dates?|actions?|warning)\b|الحالة|حالة|السريان|الصلاحية|ينتهي|انتهاء|إجراءات|تحذير|تنبيه|إنذار", re.I)
ACTIONS = re.compile(r"\b(?:action items?|actions? (?:needed|required|for)|pending actions?|to do)\b|الإجراءات المطلوبة|إجراءات|المهام المطلوبة", re.I)
WARNING = re.compile(r"\b(?:warning|reminder|red)\b|تنبيه|تحذير|إنذار|الأحمر", re.I)
FOLLOWUP = re.compile(r"\b(?:this|that|same|it|its)\b|نفس|هذا|هذه|ذلك|لها|له", re.I)
WRITE = re.compile(r"^(?:please\s+)?(?:renew|cancel|pay|change|modify|download|transfer)\b|^(?:جدد|ألغ|ادفع|عدّل|نزّل|انقل)\b", re.I)
STATUSES = {
    "201": ("Active", "نشط"), "ACTIVE": ("Active", "نشط"),
    "202": ("Expired", "منتهٍ"), "EXPIRED": ("Expired", "منتهٍ"),
    "203": ("Cancelled", "ملغى"), "CANCELLED": ("Cancelled", "ملغى"),
    "204": ("Suspended", "موقوف"), "SUSPENDED": ("Suspended", "موقوف"), "DISABLED": ("Suspended", "موقوف"),
    "205": ("Expire Soon", "ينتهي قريباً"), "EXPIRE_SOON": ("Expire Soon", "ينتهي قريباً"),
}


def issued_license_query(question, history, profile_id):
    if WRITE.search(question.lstrip()) or not READ.search(question):
        return None
    candidates = {number.upper() for number in TYPED.findall(question)}
    if candidates:
        if len(candidates) == 1:
            number = candidates.pop()
            if any(ch.isdigit() for ch in number) and not re.fullmatch(r"(?:ML|MC|FM|HC)-\d+-\d+-\d+",number):
                return number, bool(ACTIONS.search(question)), bool(WARNING.search(question))
        return None
    if not FOLLOWUP.search(question) or re.search(r"(?<![\w-])[0-9]{5,20}(?![\w-])",question):
        return None
    turns = [e for e in history if e.event_type in {"user.message", "assistant.message", "license.record.binding"}]
    if turns and turns[-1].event_type == "user.message":
        turns.pop()
    if len(turns) < 2 or turns[-1].event_type != "assistant.message" or turns[-2].event_type != "license.record.binding":
        return None
    binding = turns[-2].event_json
    number = str(binding.get("number") or "")
    if binding.get("profileId") == profile_id and binding.get("requestId") == turns[-1].event_json.get("requestId") and re.fullmatch(REFERENCE,number):
        return number, bool(ACTIONS.search(question)), bool(WARNING.search(question))
    return None


def _matches(row, number):
    return number in {str(row.get(key) or "").strip().upper() for key in ("showLicenseNumber", "licensePermitNo")}


async def read_issued_license(platform, principal, query):
    number, ask_actions, explain_warning = query
    async def read(method, path, parameters=None):
        return await platform.invoke_swagger_tool(
            method, path, parameters, umc_token=principal.umc_token, request_id=principal.request_id,
        )
    page = _data(await read("POST", "/api/licenses-permits/query", {
        "keyword": number, "statuses": [], "documentTypes": [], "pageIndex": 1,
        "pageSize": 50, "sortDirection": 0,
    }))
    rows, count = page.get("items"), page.get("total")
    if not isinstance(rows,list) or type(count) is not int or count != len(rows) or any(not isinstance(row,dict) for row in rows):
        raise ValueError("invalid_license_query_page")
    matches = [row for row in rows if _matches(row,number)]
    if not matches:
        return None
    if len(matches) != 1:
        raise ValueError("ambiguous_license_identity")
    record = matches[0]
    if record.get("profileId") is not None and str(record["profileId"]) != principal.profile_id:
        raise PermissionError("license_profile_mismatch")
    actions = None
    if ask_actions:
        body = await read("GET", "/api/licenses-permits/action-needed")
        if isinstance(body,dict) and body.get("isSuccess") is True and isinstance(body.get("data"),list):
            actions = [item for item in body["data"] if isinstance(item,dict) and _matches(item,number)]
            if any(item.get("profileId") is not None and str(item["profileId"]) != principal.profile_id for item in actions):
                raise PermissionError("license_action_profile_mismatch")
    return record, actions


def issued_license_reply(result, query, language):
    number, ask_actions, explain_warning = query
    ar = language == "ar"
    link = "المصدر: [التراخيص والتصاريح](/permits-license)." if ar else "Source: [Licenses & Permits](/permits-license)."
    if result is None:
        return ("لم يُعثر على الترخيص المحدد في الملف الحالي." if ar else "No exact match was found for this license in the current profile.") + "\n\n" + link
    record, actions = result
    code = str(record.get("status") or "").upper()
    status = STATUSES.get(code, ("Unverified", "غير مؤكد"))[int(ar)]
    unavailable = "غير متاح" if ar else "Not available"
    title = _cell(record.get("nameAr" if ar else "nameEn") or record.get("documentName"),unavailable)
    effective = _date(record.get("effectiveDate"))
    expiry = _date(record.get("expireDate"))
    start, end = (date.date().isoformat() if date else unavailable for date in (effective,expiry))
    if ar:
        lines = [f"الترخيص **{number}** — {title}", f"الحالة: **{status}**", f"تاريخ السريان: {start}", f"تاريخ الانتهاء: {end}"]
    else:
        lines = [f"License **{number}** — {title}", f"Status: **{status}**", f"Effective date: {start}", f"Expiry date: {end}"]
    if explain_warning:
        if code in {"202", "EXPIRED"}:
            lines.append("يعرض السجل حالة انتهاء سريان الترخيص." if ar else "The record is already expired.")
        elif code in {"205", "EXPIRE_SOON"}:
            lines.append("يشير التنبيه إلى قرب انتهاء الترخيص. راجع خيارات التجديد في البوابة." if ar else
                         "The warning means the license is approaching expiry. Check the renewal options in the portal.")
        lines.append("سجل الترخيص لا يحدد مدة ظهور التنبيه." if ar else
                     "The license record does not specify how far in advance the warning appears.")
    if ask_actions:
        if actions is None:
            note = "تعذر التحقق من قائمة الإجراءات المطلوبة." if ar else "The Action Needed list could not be verified."
        elif not actions:
            note = "لا يظهر هذا الترخيص في قائمة الإجراءات المطلوبة حالياً." if ar else "This license has no entry in Action Needed."
        else:
            note = "يظهر الترخيص في قائمة الإجراءات المطلوبة. افتح القائمة للتحقق من الخيارات المتاحة." if ar else "This license is listed in Action Needed. Open that list to see the available options."
        lines.append(note)
    return "\n\n".join([*lines,link])
