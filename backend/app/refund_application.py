"""Read the application referenced by a real refund in the selected Profile."""
import re

from .application_payable import _data, _id
from .enquiry_lookup import APPLICATION_NUMBER, read_linked_application

REFUND = re.compile(r"\bHC-02-\d{4}-\d+\b", re.I)
LOOKUP = re.compile(r"\b(?:which|what) application\b.*\brefund\b|بأي طلب يرتبط.*الاسترداد|ما الطلب المرتبط.*الاسترداد", re.I)
DETAIL = re.compile(r"\b(?:show|view).*\bapplication status\b.*\bdetails?\b|(?:اعرض|أرني) حالة الطلب.*تفاصيل", re.I)


def refund_application_query(text, history, profile):
    mode = "reference" if LOOKUP.search(text) else "application" if DETAIL.search(text) else None
    if not mode:
        return None
    numbers = {number.upper() for number in REFUND.findall(text)}
    if len(numbers) > 1:
        return None
    if mode == "reference" and numbers:
        return mode, numbers.pop()
    turns = [event for event in history if event.event_type in {"user.message", "assistant.message", "refund.lookup.binding", "refund.list.binding"}]
    if turns and turns[-1].event_type == "user.message":
        turns.pop()
    if len(turns) < 2 or turns[-1].event_type != "assistant.message":
        return None
    event = turns[-2]
    if event.event_type not in {"refund.lookup.binding", "refund.list.binding"}:
        return None
    binding = event.event_json
    if binding.get("profileId") != profile or binding.get("requestId") != turns[-1].event_json.get("requestId"):
        return None
    if event.event_type == "refund.list.binding":
        if mode != "reference":
            return ("choose", None)
        references = binding.get("references") or []
        return (mode, references[0]) if len(references) == 1 else ("choose", None)
    number = binding.get("number") or ""
    return (mode, number) if REFUND.fullmatch(number) else ("choose", None)


async def read_refund_application(platform, principal, query):
    mode, number = query

    async def read(path, parameters):
        return _data(await platform.invoke_swagger_tool(
            "GET", path, parameters, umc_token=principal.umc_token, request_id=principal.request_id,
        ))

    page = await read("/api/Refund/Applications", {"applicationNumber": number, "pageIndex": 1, "pageSize": 10})
    matches = [
        row for row in (page.get("items") or []) if isinstance(row, dict)
        and row.get("applicationNumber") == number
    ]
    if len(matches) != 1:
        return "", None
    row = matches[0]
    if row.get("profileId") is not None and str(row["profileId"]) != principal.profile_id:
        raise PermissionError("refund_profile_mismatch")
    refund_id = _id(row.get("id"))
    if refund_id is None:
        raise ValueError("refund_id_invalid")
    detail = await read("/api/Refund/{id}/ApplicationModel", {"id": refund_id})
    if detail.get("applicationNumber") != number or _id(detail.get("id")) != refund_id:
        raise ValueError("refund_detail_mismatch")
    if detail.get("profileId") is not None and str(detail["profileId"]) != principal.profile_id:
        raise PermissionError("refund_detail_profile_mismatch")
    related = detail.get("relatedApplicationInfo")
    if related and not isinstance(related, dict):
        raise ValueError("refund_link_shape")
    target = (related or {}).get("applicationNumber") or detail.get("referenceNumber")
    if not APPLICATION_NUMBER.fullmatch(str(target or "")) or target == number or str(target).startswith("HC-"):
        return "", None
    return await read_linked_application(platform, principal, target) if mode == "application" else (target, None)
