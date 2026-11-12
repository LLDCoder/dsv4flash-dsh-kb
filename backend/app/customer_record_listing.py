"""Render the Customer portal's own-account refund and violation lists."""
from __future__ import annotations

import re
from typing import Any

from .application_listing import _cell, _display_date
from .customer_record_intent import QUERY_WORDS, normalize_record_text
from .profile_scope import ProfileContext, requested_profile_candidates

PAGE_SIZE = 100
LIST_REQUESTS = {
    "refunds": (
        "umc.refunds.list",
        {"pageIndex": 1, "pageSize": PAGE_SIZE, "sortBy": "createdOn", "sortDirection": 0},
    ),
    "violations": (
        "umc.violations.list",
        {"pageNumber": 1, "pageSize": PAGE_SIZE, "sortField": "SubmissionDate", "sortDescending": True},
    ),
}
REFUND_STATUSES_TOOL = "umc.refunds.statuses"
REFUND_WORDS = frozenset("refund refunds استرداد الاسترداد استرجاع الاسترجاع".split())
VIOLATION_WORDS = frozenset(normalize_record_text(
    "violation violations fine fines penalty penalties مخالفة المخالفة مخالفات المخالفات مخالفاتي مخالفاتنا "
    "ومخالفاتي والمخالفات غرامة الغرامة غرامات الغرامات غراماتي غراماتنا وغراماتي والغرامات"
).split())
LIST_WORDS = QUERY_WORDS | frozenset(normalize_record_text(
    "can could you please get see what are is me my mine our the all records record list lists applications "
    "application requests request their statuses and for of in under account current profile this history "
    "اريد اطلع سجل سجلات طلب طلبات الطلبات طلباتي حالات الحالات حالاتها وحالتها وحالاتها حالتها "
    "الرسوم رسوم المبالغ مبالغ المبلغ جميع كل الخاصه الخاص بي لي لدي عندي حسابي الحالي في من ملف الملف فضلك"
).split())


def record_list_query(content: str, context: ProfileContext | None) -> tuple[str, int] | None:
    """Accept simple read requests. Leave filters, references and actions to existing routes."""
    if not context:
        return None
    text = normalize_record_text(content)
    for target in requested_profile_candidates(content, context):
        for name in (target.name, *target.aliases):
            normalized = normalize_record_text(name)
            if normalized:
                text = re.sub(r"(?<!\w)" + re.escape(normalized) + r"(?!\w)", " ", text)
    words = set(re.findall(r"\w+", text))
    refunds = bool(words & REFUND_WORDS)
    violations = bool(words & VIOLATION_WORDS)
    if refunds == violations or words - LIST_WORDS - REFUND_WORDS - VIOLATION_WORDS:
        return None
    if not words & (QUERY_WORDS | {"get", "see", "اريد", "اطلع"}):
        return None
    limit = PAGE_SIZE if words & {"all", "جميع", "كل"} else 20
    return ("refunds" if refunds else "violations", limit)


def successful_data(response: dict[str, Any]) -> Any:
    body = response.get("result")
    if response.get("ok") and isinstance(body, dict) and body.get("isSuccess") is True:
        return body.get("data")
    return None


def record_list_answer(
    kind: str,
    data: Any,
    statuses: Any,
    limit: int,
    language: str,
    context: ProfileContext,
) -> str | None:
    if not isinstance(data, dict):
        return None
    total, items = data.get("total"), data.get("items")
    if type(total) is not int or total < 0 or not isinstance(items, list) or len(items) > total or (total and not items):
        return None
    refunds = kind == "refunds"
    reference = "applicationNumber" if refunds else "violationNo"
    if any(not isinstance(item, dict) or not item.get(reference) for item in items):
        return None
    ar = language == "ar"
    unavailable = "غير متاح" if ar else "Not available"
    status_field = "nameAr" if ar else "nameEn"
    status_names = {
        str(row["id"]): row.get(status_field)
        for row in statuses
        if isinstance(row, dict) and row.get("id") is not None
    } if isinstance(statuses, list) else {}
    title = ("طلبات استرداد الرسوم" if refunds else "المخالفات والغرامات") if ar else ("Refund requests" if refunds else "Violations and fines")
    if context.is_global_view:
        scope = "العرض الشامل: الملفات المخوّلة لحسابك." if ar else "Global View: your account’s authorized Profiles."
    else:
        profile = _cell(context.active_profile_name, unavailable)
        scope = f"الملف الحالي: **{profile}**." if ar else f"Current Profile: **{profile}**."
    displayed = items[:limit]
    lines = [
        f"## {title}", scope,
        f"الإجمالي: **{total}**" if ar else f"Total: **{total}**",
        f"المعروض: **{len(displayed)} من {total}**." if ar else f"Showing: **{len(displayed)} of {total}**.",
    ]
    if not displayed:
        return "\n".join(lines + ["لا توجد سجلات في هذا النطاق." if ar else "There are no records in this scope."])
    columns = ["رقم الطلب" if refunds else "رقم المخالفة", "المبلغ (درهم)", "التاريخ", "الحالة"] if ar else [
        "Refund request number" if refunds else "Violation number", "Amount (AED)", "Date", "Status",
    ]
    if context.is_global_view:
        columns.append("الملف" if ar else "Profile")
    lines += ["", "| " + " | ".join(columns) + " |", "|" + "---|" * len(columns)]
    for item in displayed:
        if refunds:
            status_object = item.get("statusObj")
            status = status_object.get(status_field) if isinstance(status_object, dict) else None
            status = status or status_names.get(str(item.get("statusId")))
            amount, date = item.get("amount"), item.get("createdOn")
        else:
            status = item.get("statusAr" if ar else "status")
            amount, date = item.get("fineAmountDisplay") or item.get("fineAmount"), item.get("issuedDate")
        values = [item[reference], amount, _display_date(date, language), status]
        if context.is_global_view:
            values.append(item.get("profileName"))
        lines.append("| " + " | ".join(_cell(value, unavailable) for value in values) + " |")
    if refunds:
        lines += ["", "عرض القائمة الكاملة في [طلبات الاسترداد](/refund)." if ar else "Open [Refunds](/refund) for the full list."]
    else:
        lines += ["", "عرض القائمة الكاملة في [المخالفات والغرامات](/violations-fines)." if ar else "Open [Violations and Fines](/violations-fines) for the full list."]
    return "\n".join(lines)


BOOK_FIELDS = (
    ("title", "Title", "العنوان"),
    ("authorName", "Author", "المؤلف"),
    ("isbn", "ISBN", "الرقم الدولي المعياري للكتاب"),
    ("versionNumber", "Version", "الإصدار"),
    ("printYear", "Print year", "سنة الطباعة"),
    ("language", "Language", "اللغة"),
    ("subjectCategory", "Subject category", "التصنيف الموضوعي"),
    ("subjectSubCategory", "Subject subcategory", "التصنيف الفرعي"),
    ("nationalDepositoryNo", "National deposit number", "رقم الإيداع الوطني"),
)


def isbn_lookup_answer(isbn: str, result: dict[str, Any], language: str) -> str:
    """Project verified bibliographic fields and preserve their original scripts."""
    rows = successful_data(result)
    ar = language == "ar"
    unavailable = "غير متاح" if ar else "Not available"
    if not isinstance(rows, list) or any(
        not isinstance(row, dict) or not row.get("isbn") for row in rows
    ):
        return (
            "تعذر التحقق من نتيجة البحث عن الكتاب حالياً. يرجى المحاولة مرة أخرى."
            if ar else "I couldn’t verify the book lookup right now. Please try again."
        )
    heading = f"## ISBN {_cell(isbn, unavailable)}"
    if not rows:
        return f"{heading}\n\n" + (
            "لم يعثر البحث على سجلات مطابقة." if ar else "The lookup returned no matching records."
        )

    lines = [heading, "", f"**السجلات المطابقة: {len(rows)}**" if ar else f"**Matching records: {len(rows)}**"]
    for index, row in enumerate(rows, start=1):
        lines.extend([
            "", f"### السجل {index}" if ar else f"### Record {index}", "",
            "| الحقل | القيمة |" if ar else "| Field | Value |", "|---|---|",
        ])
        for field, en_label, ar_label in BOOK_FIELDS:
            value = row.get(field)
            if field == "language" and isinstance(value, list):
                value = ("، " if ar else ", ").join(v for v in value if isinstance(v, str) and v.strip())
            if type(value) not in (str, int, float) or value == "":
                value = None
            lines.append(f"| {ar_label if ar else en_label} | {_cell(value, unavailable)} |")
    return "\n".join(lines)
