"""Read-only projection of the authenticated Customer Payments page."""
import re
from decimal import Decimal, InvalidOperation

import httpx

from .application_payable import _data

TRANSACTIONS = "/api/payment-center/transactions"
PAYMENTS_PAGE = "/payments"
_REFERENCE = re.compile(r"(?<![\w-])\d{12,24}(?![\w-])")
_PAYMENT = re.compile(r"\b(?:payments?|transactions?|receipts?)\b|دف[ع]|معامل[ةات]|إيصال", re.I)
_LATEST = re.compile(r"\b(?:latest|most recent|last)\b|أحدث|آخر", re.I)
_FOLLOWUP = re.compile(r"\b(?:that|this|same|it|its)\b|\bwhere\b.{0,55}\breceipt\b|نفس|هذه|تلك|الإيصال", re.I)
_OTHER_INTENT = re.compile(
    r"\b(?:refunds?|retry|reverse|chargeback|reconcile|bulk|batch|recharge|export|submit|send|upload|switch)\b"
    r"|\b(?:pay|download|cancel|change)\s+(?:it|this|that|the|my|now|a)\b"
    r"|استرداد|إلغاء|إعادة المحاولة|تحميل|تنزيل|تصدير", re.I,
)
_PAYMENT_STATUS = {
    "1": ("Pending", "قيد الانتظار"), "2": ("Processing", "قيد المعالجة"),
    "3": ("Completed", "مكتمل"), "4": ("Failed", "فشل"),
    "5": ("Pending Completed", "بانتظار الإكمال"),
    "6": ("Refund in Progress", "الاسترداد قيد المعالجة"),
    "7": ("Refund Completed", "اكتمل الاسترداد"),
}


def transaction_request(question, history, profile_id):
    if _OTHER_INTENT.search(question) or question.lstrip().startswith("/"):
        return None
    refs = set(_REFERENCE.findall(question))
    if _PAYMENT.search(question):
        if len(refs) == 1:
            return ("exact", refs.pop())
        if not refs and _LATEST.search(question) and not re.search(
            r"\b(?:payments|transactions|successful transactions only)\b", question, re.I
        ):
            return ("latest", "")
    if refs or not _PAYMENT.search(question) or not _FOLLOWUP.search(question):
        return None
    # Bind an immediate follow-up only to the preceding assistant turn's
    # verified lookup in this Profile, never to a prior free-text answer.
    events = [event for event in history
              if event.event_type in {"user.message", "assistant.message", "payment.transaction.binding"}]
    if events and events[-1].event_type == "user.message":
        events.pop()
    if len(events) < 2 or events[-1].event_type != "assistant.message":
        return None
    recent = events[-2]
    marker = recent.event_json
    if (recent.event_type == "payment.transaction.binding"
            and marker.get("requestId") == events[-1].event_json.get("requestId")
            and marker.get("profileId") == profile_id
            and _REFERENCE.fullmatch(str(marker.get("transactionNo") or ""))):
        return ("exact", marker["transactionNo"])
    return None


async def read_transaction(platform, principal, selection):
    async def read(path, parameters=None):
        return _data(await platform.invoke_swagger_tool(
            "GET", path, parameters, umc_token=principal.umc_token, request_id=principal.request_id
        ))

    mode, number = selection
    params = {"pageIndex": 1, "pageSize": 1 if mode == "latest" else 20,
              "sortBy": "createdOn", "sortDirection": 1}
    if number:
        params["keyWord"] = number
    page = await read(TRANSACTIONS, params)
    rows = page.get("items")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ValueError("unexpected_payments_page")
    if mode == "latest":
        rows = rows[:1]
    else:
        rows = [row for row in rows if str(row.get("transactionNo")) == number]
    if not rows:
        return None
    if len(rows) != 1 or not _REFERENCE.fullmatch(str(rows[0].get("transactionNo") or "")):
        raise ValueError("unverified_transaction_identity")

    row = rows[0]
    number = str(row["transactionNo"])
    if row.get("profileId") is not None and str(row["profileId"]) != principal.profile_id:
        raise PermissionError("mismatched_transaction_profile")
    try:
        detail = await read(f"{TRANSACTIONS}/{number}")
    except (httpx.HTTPError, ValueError, TypeError):
        detail = {}
    detail_record = detail.get("transaction")
    if (not isinstance(detail_record, dict) or str(detail_record.get("transactionNo")) != number
            or detail_record.get("profileId") is not None and str(detail_record["profileId"]) != principal.profile_id):
        detail = {}
    return row, detail


def transaction_reply(result, language):
    ar = language == "ar"
    if result is None:
        return (
            "لم أجد المعاملة في [المدفوعات](/payments) ضمن الملف المحدد."
            if ar else "No matching transaction was found in [Payments](/payments) for the selected profile."
        )
    row, detail = result
    number = row["transactionNo"]
    status_code = str(row.get("statusId") or "")
    status_object = row.get("statusObj")
    status_object = status_object if isinstance(status_object, dict) else {}
    status = (_PAYMENT_STATUS.get(status_code) or (
        status_object.get("nameEn") or "Unverified",
        status_object.get("nameAr") or "غير مؤكدة",
    ))[int(ar)]
    try:
        amount = Decimal(str(row.get("amount")))
        transaction_type = row.get("transactionTypeObj")
        type_id = transaction_type.get("id") if isinstance(transaction_type, dict) else row.get("transactionTypeId")
        # Match the debit/credit sign rendered by the Payments table.
        sign = "+" if str(type_id) in {"1", "4"} else "-" if type_id is not None else ""
        money = f"{sign}{abs(amount):,.2f}" if amount.is_finite() else ""
    except InvalidOperation:
        money = ""
    currency = str(row.get("currencyCode") or row.get("currency") or "AED").upper()
    if not re.fullmatch(r"[A-Z]{3}", currency):
        currency = ""
    amount_text = f"{currency} {money}".strip() if money else ("غير مؤكد" if ar else "Unverified")
    date = str(row.get("completedAt") or "").strip()
    receipt = detail.get("receipt") if isinstance(detail.get("receipt"), dict) else {}
    receipt_status = str(receipt.get("status") or "")
    if detail.get("hasReceipt") is True or receipt_status == "3":
        receipt_text = ("الإيصال متاح. افتح المدفوعات، وابحث عن رقم المعاملة، ثم اختر تنزيل الإيصال."
                        if ar else "The receipt is available. In Payments, search for the transaction number and select Download Receipt on its row.")
    elif receipt_status == "2":
        receipt_text = "الإيصال قيد الإنشاء." if ar else "The receipt is still being generated."
    elif receipt_status == "4":
        receipt_text = "تعذر إنشاء الإيصال." if ar else "Receipt generation failed."
    elif detail.get("hasReceipt") is False:
        receipt_text = (
            "الإيصال غير جاهز حالياً. راجع إجراءات المعاملة في المدفوعات."
            if ar else "The receipt is not ready. Check the transaction actions in Payments."
        )
    else:
        receipt_text = ("لم أتمكن من تأكيد توفر الإيصال." if ar else "Receipt availability could not be confirmed.")
    head = (f"المعاملة {number} — الحالة: {status}، المبلغ: {amount_text}."
            if ar else f"Transaction {number} — Status: {status}. Amount: {amount_text}.")
    if date:
        head += f" ({date})"
    return head + "\n\n" + receipt_text + (" [المدفوعات](/payments)" if ar else " [Payments](/payments)")
