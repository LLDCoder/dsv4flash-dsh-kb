"""My Account establishment review status, loaded for the authenticated user."""
import re

from .application_listing import _cell
from .application_payable import _data

INITIAL = re.compile(
    r"(?=.*\b(?:my|i)\b)(?=.*\b(?:profiles?|establishments?)\b).*\bunder review\b"
    r"|هل لدي.*(?:ملف|منشأة).*قيد المراجعة",
    re.I,
)
FOLLOW_UP = re.compile(
    r"(?:has|is) (?:that|the same) establishment (?:been )?(?:approved|rejected|under review).*"
    r"|هل (?:تمت الموافقة|تمت موافقة|اعتُمدت|تم اعتماد).*تلك المنشأة|هل.*تلك المنشأة.*قيد المراجعة",
    re.I,
)
# Same documented review-state codes and labels as Customer Portal My Account.
STATUSES = {
    "1": ("Pending Completion", "بانتظار الإكمال"),
    "2": ("Under Review", "قيد المراجعة"),
    "3": ("Approved", "موافق عليه"),
    "4": ("Rejected", "مرفوض"),
    "5": ("Expired", "منتهي الصلاحية"),
    "6": ("Suspended", "موقوف"),
}


def establishment_request(text, history, user):
    if INITIAL.fullmatch(text.strip(" .!?؟")):
        return "list", None
    if not FOLLOW_UP.fullmatch(text.strip(" .!?؟")):
        return None
    turns = [event for event in history if event.event_type in {"user.message", "assistant.message", "establishment.review.binding"}]
    if turns and turns[-1].event_type == "user.message":
        turns.pop()
    if len(turns) < 2 or turns[-1].event_type != "assistant.message" or turns[-2].event_type != "establishment.review.binding":
        return None
    binding = turns[-2].event_json
    if binding.get("userId") != user or binding.get("requestId") != turns[-1].event_json.get("requestId"):
        return None
    return "follow", binding.get("keys") or []


async def read_establishment_reviews(platform, principal):
    async def read(method, path, params=None):
        payload = await platform.invoke_swagger_tool(
            method, path, params, umc_token=principal.umc_token, request_id=principal.request_id,
        )
        return _data(payload)
    identity = await read("POST", "/api/User/GetUserInfo", {})
    user_id = identity.get("id") or identity.get("userId") or identity.get("userID")
    if (not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", str(user_id or ""))
            or str(user_id).casefold() != principal.user_id.casefold()):
        raise PermissionError("establishment_identity_mismatch")
    rows = {}
    expected_total = None
    for page_index in range(1, 101):
        page = await read("GET", "/api/User/GetUserEstablishmentsList/{userId}", {
            "userId": user_id, "pageIndex": page_index, "pageSize": 50,
        })
        total = page.get("totalItems")
        if type(total) is not int or not 0 <= total <= 5000 or (expected_total is not None and total != expected_total):
            raise ValueError("establishment_count_invalid")
        expected_total = total
        items = page.get("items")
        if (not isinstance(items, list) or (not items and len(rows) < total) or len(rows) + len(items) > total):
            raise ValueError("establishment_page_invalid")
        for row in items:
            if not isinstance(row, dict) or row.get("id") is None or str(row["id"]) in rows:
                raise ValueError("establishment_duplicate_or_invalid")
            status = row.get("status")
            fields = status if isinstance(status, dict) else {}
            code = str(fields.get("code") or row.get("statusCode") or status or "").strip()
            labels = STATUSES.get(code)
            if labels is None:
                candidates = {
                    " ".join(str(value).replace("_", " ").split()).casefold()
                    for value in (
                        fields.get("name"), fields.get("nameEn"), fields.get("nameAr"),
                        status if isinstance(status, str) else None, row.get("statusNameEn"),
                        row.get("statusNameAr"), row.get("statusName"), row.get("establishmentStatus"),
                        row.get("profileStatus"), row.get("establishmentProfileStatus"),
                    ) if value
                }
                for known_code, pair in STATUSES.items():
                    if candidates & {label.casefold() for label in pair}:
                        code, labels = known_code, pair
                        break
            rows[str(row["id"])] = (str(code or ""), row.get("nameEn"), row.get("nameAr"), labels)
        if len(rows) == expected_total:
            return rows
    raise ValueError("establishment_page_budget")


def establishment_reply(rows, query, language):
    mode, keys = query
    ar = language == "ar"
    link = "[حسابي](/my-account)" if ar else "[My Account](/my-account)"
    missing = "غير متاح" if ar else "Not available"
    if mode == "list":
        keys = [key for key, row in rows.items() if row[0] == "2"]
        if not keys:
            if any(row[3] is None for row in rows.values()):
                text = "تعذر التحقق من حالة بعض المنشآت." if ar else "Some establishment statuses could not be verified."
            else:
                text = "لا توجد ملفات منشآت قيد المراجعة في حسابك." if ar else "There are no establishment profiles under review in your account."
            return f"{text} {link}", []
        header = f"ملفات المنشآت قيد المراجعة في حسابك: {len(keys)}." if ar else f"Establishment profiles under review in your account: {len(keys)}."
    elif not keys:
        text = "اذكر اسم المنشأة التي تريد الاستفسار عنها." if ar else "Please specify which establishment you mean."
        return f"{text} {link}", []
    else:
        header = "الحالة الحالية للمنشآت المذكورة في الرد السابق:" if ar else "Current status of the establishments listed in the previous reply:"
    shown = [key for key in keys[:20] if key in rows]
    fields = []
    for key in shown:
        _, en, arabic, labels = rows[key]
        name = (arabic or en) if ar else (en or arabic)
        fields.append(f"- {_cell(name, missing)} · {_cell(labels[1 if ar else 0] if labels else None, missing)}")
    if len(shown) < len(keys):
        fields.append("يعرض الرد السجلات المتاحة فقط. راجع القائمة الكاملة في حسابي." if ar else "This reply shows the available records only. See the full list in My Account.")
    return "\n".join([header, "", *fields, "", link]), shown
