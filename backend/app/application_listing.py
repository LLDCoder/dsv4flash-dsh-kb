"""Read-only, bilingual projections of verified Customer application pages.

Select rows in code, never in generated prose. Only public display fields from
the masked API result are rendered; Profile identity still comes from the
authenticated portal context. Complex questions retain normal Skill handling.
"""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from typing import Any

from .customer_record_intent import AR_RECORD_NOUNS, normalize_record_text
from .profile_scope import ProfileContext


def application_page_arguments(arguments: dict[str, Any]) -> dict[str, Any]:
    """Apply My Requests' default order before pagination on every tool path.

    Configured explicit sorting and all filters remain authoritative. This is
    shared by legacy and published workflows, not a per-question substitution.
    """
    result = dict(arguments)
    if not result.get("sortBy"):
        result["sortBy"] = "createdOn"
        result["sortDirection"] = 0
    elif "sortDirection" not in result:
        result["sortDirection"] = 0
    return result


def _body(result: Any) -> dict[str, Any] | None:
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except (ValueError, TypeError):
            return None
    return result if isinstance(result, dict) else None


def _date(value: Any) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def ordered_application_result(result: Any) -> Any:
    """Sort before evidence truncation; do not mutate the API/audit payload."""
    body = _body(result)
    data = body.get("data") if body else None
    page = data.get("applicationPage") if isinstance(data, dict) else None
    items = page.get("items") if isinstance(page, dict) else None
    if not isinstance(items, list) or not all(isinstance(item, dict) for item in items):
        return result
    def sort_key(item: dict[str, Any]) -> float:
        date = _date(item.get("createdOn"))
        return date.replace(tzinfo=date.tzinfo or timezone.utc).timestamp() if date else float("-inf")
    return {**body, "data": {**data, "applicationPage": {**page, "items": sorted(items, key=sort_key, reverse=True)}}}


def _display_limit(content: str, context: ProfileContext) -> int | None:
    text = normalize_record_text(content)
    # Names are removed only from the authenticated inventory, not a lookup of
    # arbitrary user input. No account/test-question-specific substitutions.
    names = [context.active_profile_name or ""]
    for profile in context.profiles:
        names.extend((profile.name, *profile.aliases))
    for name in sorted(set(names), key=len, reverse=True):
        normalized = normalize_record_text(name)
        if normalized:
            text = re.sub(r"(?<!\w)" + re.escape(normalized) + r"(?!\w)", " ", text)
    words = re.findall(r"\d+|[^\W\d_]+", text)
    vocabulary = set("show list view display me my mine our ours the latest recent newest last top first applications application requests request current profile in for under of this from all overview summary statistics count please".split())
    vocabulary.update(normalize_record_text("عرض اعرض ارني اظهر استعرض احدث اخر طلب طلبات طلبي طلباتي طلبنا طلباتنا لي لدي لدينا حسابي ملف ملفي الملف الشخصي في من هذا الحالي جميع كل قائمه ملخص احصاء احصاءات احصائيات عدد نظرة عامه علي").split())
    for noun, category in AR_RECORD_NOUNS.items():
        if category == "applications":
            vocabulary.update(noun + suffix for suffix in ("", "ي", "نا"))
    if not words or any(not word.isdecimal() and word not in vocabulary for word in words):
        return None
    numbers = [int(word) for word in words if word.isdecimal()]
    if len(numbers) > 1 or (numbers and numbers[0] <= 0):
        return None
    return min(numbers[0], 100) if numbers else 100 if any(word in {"all", "جميع", "كل"} for word in words) else 20


def _cell(value: Any, unavailable: str) -> str:
    text = " ".join(str(value).split()) if value is not None else unavailable
    text = html.escape(text[:500], quote=False)
    return re.sub(r"([\\|*`\[\]])", r"\\\1", text)


def _display_date(value: Any, language: str) -> str:
    date = _date(value)
    if date is None:
        return "غير متاح" if language == "ar" else "Not available"
    if language == "ar":
        months = ("يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر")
        return f"{date.day} {months[date.month-1]} {date.year} {date:%H:%M:%S}"
    return date.strftime("%d %B %Y %H:%M:%S")


def application_list_answer(content: str, tool_result: dict[str, Any], language: str, context: ProfileContext | None) -> str | None:
    """Render only basic list/statistics views, from a successful masked DTO."""
    if not context or context.is_global_view or not tool_result.get("ok"):
        return None
    limit = _display_limit(content, context)
    if limit is None:
        return None
    body = _body(ordered_application_result(tool_result.get("result")))
    data = body.get("data") if body and body.get("isSuccess") is not False else None
    page = data.get("applicationPage") if isinstance(data, dict) else None
    if not isinstance(page, dict) or page.get("pageIndex", 1) != 1:
        return None
    total, items = page.get("total"), page.get("items")
    if isinstance(total, bool) or not isinstance(total, int) or total < 0 or not isinstance(items, list):
        return None
    if any(not isinstance(item, dict) or not item.get("applicationNumber") for item in items) or total < len(items):
        return None
    if total and not items:
        return None
    ar = language == "ar"
    unavailable = "غير متاح" if ar else "Not available"
    suffix = "Ar" if ar else "En"
    name = _cell(context.active_profile_name, unavailable)
    lines = ["## نظرة عامة على طلباتك" if ar else "## Your applications",
             f"الملف الحالي: **{name}**. نطاق البيانات: هذا الملف المحدد فقط." if ar else f"Current Profile: **{name}**. Data scope: this selected Profile only.",
             f"الإجمالي: **{total}**" if ar else f"Total: **{total}**"]
    counts = data.get("applicationStatusCounts")
    if isinstance(counts, list):
        lines.extend(["", "| الحالة | العدد |" if ar else "| Status | Count |", "|---|---:|"])
        for count in counts:
            if isinstance(count, dict) and isinstance(count.get("count"), int) and not isinstance(count.get("count"), bool):
                lines.append(f"| {_cell(count.get('applicationStatusName'+suffix), unavailable)} | {count['count']} |")
    selected = items[:limit]
    known_dates = all(_date(item.get("createdOn")) for item in items)
    complete_result = total == len(items)
    confirmed_latest = known_dates and complete_result
    lines.extend(["", "## أحدث الطلبات" if ar and confirmed_latest else "## الطلبات" if ar else "## Latest applications" if confirmed_latest else "## Applications",
                  f"المعروض: **{len(selected)} من {total}**." if ar else f"Showing: **{len(selected)} of {total}**."])
    if not known_dates:
        lines.append("بعض أوقات التقديم غير متاحة؛ لا يمكن تأكيد ترتيب الأحدث لتلك السجلات." if ar else "Some submission times are unavailable; recency cannot be confirmed for those records.")
    if not complete_result:
        lines.append("تم ترتيب السجلات التي أعادتها الصفحة فقط؛ لا يمكن تأكيد أنها أحدث الطلبات ضمن القائمة كاملة." if ar else "Only the returned page has been sorted; these records cannot be confirmed as the latest across the entire list.")
    if selected:
        lines.extend(["", "| رقم الطلب | الخدمة | نوع الطلب | وقت التقديم | الحالة |" if ar else "| Application number | Service | Application type | Submission time | Status |", "|---|---|---|---|---|"])
        for item in selected:
            fields = (item["applicationNumber"], item.get("serviceName"+suffix), item.get("typeName"+suffix), _display_date(item.get("createdOn"), language), item.get("applicationStatusName"+suffix))
            lines.append("| " + " | ".join(_cell(value, unavailable) for value in fields) + " |")
    if len(selected) < total:
        lines.extend(["", "هذه قائمة مختصرة وليست جميع الطلبات؛ الإجمالي وإحصاءات الحالات تخص الملف المحدد." if ar else "This is a bounded list, not all applications; the total and status counts apply to the selected Profile."])
    lines.extend(["", "هذه معاينة للقراءة فقط؛ لم يتم تعديل أي طلب أو إرساله أو إلغاؤه أو دفع رسومه." if ar else "Read-only lookup; no application has been changed, submitted, cancelled, or paid.",
                  "افتح [طلباتي](/my-requests) لعرض القائمة كاملة أو تفاصيل طلب محدد." if ar else "Open [My Requests](/my-requests) for the full list or a specific application's details."])
    return "\n".join(lines)
