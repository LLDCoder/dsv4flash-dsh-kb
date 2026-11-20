"""Read-only fine details using the selected Portal profile."""
import re

from .application_listing import _cell
from .application_payable import _data

REFERENCE = re.compile(r"\bVN-\d{4}-\d+\b", re.I)
OWN_FINES = re.compile(
    r"(?:do i have (?:any )?(?:outstanding |unpaid )?(?:fines|violations)|هل (?:لدي|عندي) (?:أي )?(?:غرامات|مخالفات))[.!?؟ ]*", re.I,
)
PAY_LOCATION = re.compile(r"\bwhere (?:can|do|should) i pay\b|اين (?:يمكنني|استطيع) (?:الدفع|دفع|سداد)|أين (?:يمكنني|أستطيع) (?:الدفع|دفع|سداد)", re.I)
PAGE_ONLY = re.compile(r"\b(?:do not|don.t) (?:make any payment|pay).*?(?:show|open).*?page\b|لا (?:تدفع|تسدد|تجر).*?(?:اعرض|أرني).*?الصفحة", re.I)
APPEAL = re.compile(r"\bappeal\b|تظلم|استئناف|اعتراض", re.I)
OTHER_RECORD = re.compile(r"\b(?:application|licen[cs]e|permit|invoice|renewal)\b|طلب|ترخيص|رخصة|تصريح|فاتورة|تجديد", re.I)
PAYMENT_DEADLINE = re.compile(
    r"\b(?:due date|(?:payment|paying) deadline|deadline (?:for|to) pay|due for payment)\b"
    r"|(?:الموعد|التاريخ)\s+(?:النهائي\s+)?(?:للدفع|للسداد|لدفعها|لسدادها|للاستحقاق)"
    r"|(?:تاريخ|موعد)\s+الاستحقاق|آخر\s+(?:موعد|يوم)\s+(?:للدفع|للسداد|لدفعها|لسدادها)",
    re.I,
)
READ = re.compile(r"\b(?:amount|details?|status|show|fine)\b|مبلغ|تفاصيل|حالة|غرامة|استحقاق|اعرض|أرني", re.I)
WRITE = re.compile(r"\b(?:pay|submit|file|cancel)\b.*(?:\bnow\b|\bfor me\b)|^(?:please )?(?:pay|submit|file|cancel)\b|(?:قدم|أرسل|ادفع|ادفعها|ألغ)\b", re.I)


def fine_query(question, history, profile):
    text = question.strip()
    if WRITE.search(text):
        return None
    references = {match.upper() for match in REFERENCE.findall(text)}
    if len(references) > 1:
        return None
    if OWN_FINES.fullmatch(text):
        return ("list", None)
    asks_due = bool(PAYMENT_DEADLINE.search(text))
    asks_appeal = bool(APPEAL.search(text))
    if references and (READ.search(text) or asks_due or asks_appeal or PAY_LOCATION.search(text)):
        mode = "appeal" if APPEAL.search(text) else "payment" if PAY_LOCATION.search(text) else "detail"
        return (mode, references.pop())
    mode = (
        "payment" if PAY_LOCATION.search(text) or PAGE_ONLY.search(text)
        else "appeal" if asks_appeal and re.search(r"\b(?:can|am) i\b|هل يمكنني|هل يحق لي", text, re.I)
        else "detail" if asks_due and not asks_appeal and not OTHER_RECORD.search(text)
        else None
    )
    if not mode:
        return None
    turns = [event for event in history if event.event_type in {"user.message", "assistant.message", "fine.lookup.binding"}]
    if turns and turns[-1].event_type == "user.message":
        turns.pop()
    if len(turns) < 2 or turns[-1].event_type != "assistant.message" or turns[-2].event_type != "fine.lookup.binding":
        return None
    binding = turns[-2].event_json
    number = str(binding.get("number") or "")
    if binding.get("profileId") == profile and binding.get("requestId") == turns[-1].event_json.get("requestId") and REFERENCE.fullmatch(number):
        return (mode, number)
    return None


async def read_fine(platform, principal, request):
    async def read(path, params=None):
        return _data(await platform.invoke_swagger_tool("GET", path, params, umc_token=principal.umc_token, request_id=principal.request_id))

    mode, target = request
    params = {"pageNumber": 1, "pageSize": 20, "sortField": "SubmissionDate", "sortDescending": True}
    if target:
        params["keyword"] = target
    result = await read("/api/Appeal/Violations", params)
    items, total = result.get("items"), result.get("total")
    if not isinstance(items, list) or not all(isinstance(row, dict) for row in items) or type(total) is not int:
        raise ValueError("fine_list_shape")
    if any(row.get("profileId") is not None and str(row["profileId"]) != principal.profile_id for row in items):
        raise PermissionError("fine_profile_mismatch")
    if mode == "list":
        return total, items
    matches = [row for row in items if str(row.get("violationNo") or "").upper() == target]
    if len(matches) != 1:
        return 0, []
    detail = await read("/api/Appeal/Violations/ByNo/{violationNo}", {"violationNo": target})
    if str(detail.get("violationNo") or "").upper() != target:
        raise ValueError("fine_detail_mismatch")
    if detail.get("profileId") is not None and str(detail["profileId"]) != principal.profile_id:
        raise PermissionError("fine_detail_profile_mismatch")
    return 1, [{
        **matches[0], **{key: value for key, value in detail.items() if value is not None},
        "listAllowsAppeal": matches[0].get("allowedAppeal"),
    }]


def fine_reply(result, request, language):
    total, rows = result
    mode, _ = request
    ar = language == "ar"
    missing = "لا تظهر هذه المعلومة في سجل البوابة." if ar else "The portal record does not provide this field."
    portal = "[المخالفات والغرامات](/violations-fines)" if ar else "[Violations and Fines](/violations-fines)"
    pay = "[دفع الغرامات](/pay-fines)" if ar else "[Pay Fines](/pay-fines)"
    if not rows:
        return ("لا توجد مخالفات مطابقة في الملف المحدد. " if ar else "No matching violations were found in the selected Profile. ") + portal, None

    def get(row, *keys):
        return next((row[key] for key in keys if row.get(key) is not None and row.get(key) != ""), None)

    def payable(row):
        return row.get("canPay") is True or str(row.get("status") or "").casefold().strip() == "pending payment"

    if mode == "list":
        pending = [row for row in rows if payable(row)]
        number = (pending[0].get("violationNo") if len(pending) == 1 else None) if total == len(rows) else None
        heading = (f"المخالفات في الملف المحدد: {total}. المعروض: {len(rows)}."
                   if ar else f"Violations in the selected Profile: {total}. Showing {len(rows)}.")
        lines = [heading, ""]
        for row in rows:
            parts = (row.get("violationNo"), get(row, "statusAr" if ar else "status"), get(row, "fineAmountDisplay", "fineAmount"))
            lines.append("- " + " · ".join(_cell(part, missing) for part in parts))
        return "\n".join([*lines, "", portal]), number
    row = rows[0]
    number = row["violationNo"]
    if mode == "payment":
        if payable(row):
            return pay, number
        return ("لا يظهر السجل بحالة قيد الدفع. " if ar else "The record does not show a pending payment. ") + portal, number
    status = get(row, "statusAr" if ar else "status")
    if mode == "appeal":
        # The portal list controls whether the appeal form is accessible.
        # An inconsistent detail flag cannot confirm formal eligibility.
        eligible = row.get("allowedAppeal")
        form_available = row.get("listAllowsAppeal")
        if form_available is True and eligible is not True:
            action = (
                "تعرض البوابة نموذج التظلم لهذه المخالفة، لكن تفاصيل السجل لا تؤكد قبول التظلم. راجع النموذج والشروط الظاهرة في البوابة."
                if ar else "The portal offers an appeal form for this violation, but its detail record does not confirm eligibility. Check the form and requirements in the portal."
            )
        elif eligible is True:
            action = "يتيح السجل تقديم تظلم." if ar else "The record is eligible for an appeal."
        elif eligible is False:
            action = "لا يتيح السجل تقديم تظلم حاليًا." if ar else "The record is currently ineligible for appeal."
        else:
            action = "تعذر تأكيد أهلية التظلم من السجل." if ar else "The record does not confirm appeal eligibility."
        labels = ("رقم المخالفة", "الحالة", "أهلية التظلم", "آخر موعد للتظلم") if ar else ("Violation number", "Status", "Appeal eligibility", "Appeal deadline")
        values = (number, status, action, row.get("appealDeadline"))
        link = portal
    else:
        evidence = [
            get(item, "nameAr" if ar else "name", "code")
            for item in (row.get("reportedViolations") or []) if isinstance(item, dict)
        ]
        labels = ("رقم المخالفة", "الحالة", "الغرامة بالدرهم", "الموعد النهائي للدفع", "المخالفات المسجلة") if ar else ("Violation number", "Status", "Fine in AED", "Payment due date", "Reported findings")
        values = (number, status, get(row, "fineAmountDisplay", "totalFineAmount", "fineAmount"), row.get("paymentDueDate"), " · ".join(str(item) for item in evidence if item) or None)
        link = pay if payable(row) else portal
    return "\n".join([*(f"- {label}: {_cell(value, missing)}" for label, value in zip(labels, values)), "", link]), number
