"""Read published Customer Learn More fees, not private payment records.

Service identity and fee text always come from the live catalogue/card. A
partial name may produce choices; it must never select a nearby service's fee.
"""
from __future__ import annotations

import html
import re
from typing import Any

import httpx
from pydantic import BaseModel, Field

from .customer_record_intent import normalize_record_text


def is_public_service_fee_query(content: str) -> bool:
    text = normalize_record_text(content)
    fee = re.search(r"\b(?:fees?|cost|price)\b|رسوم|تكلفه|سعر", text)
    if not fee:
        return False
    # Never turn mixed/private record requests into a public-information route.
    private = re.search(
        r"\b(?:my|our|his|her|their|paid|unpaid|payment|payments|receipt|invoice|refund|fines?|violations?|pending|status|balance)\b|\w+['’]s\b"
        r"|\b(?:show|list|view|display)\s+(?:me\s+)?(?:licenses|licences|permits|applications|requests)\s+(?:for|of)\b"
        r"|غرام|مخالف|معلقه|حساب|رصيد|ايصال|فاتوره|مدفوع|طلباتي|طلبي|تراخيصي|رخصتي|رخصي"
        r"|(?:[\w+-]+[.@])+[\w+-]+|\b[a-z]{2,6}(?:-\d+){3,}\b", text,
    )
    return private is None


class ServiceFeeEntry(BaseModel):
    serviceId: int
    nameEn: str
    nameAr: str
    feeEn: str | None = None
    feeAr: str | None = None
    sourcePath: str


class ServiceFeeResponse(BaseModel):
    scope: str = "published_customer_service_information"
    status: str = Field(description="matched, ambiguous, or not_found; only matched contains fee data")
    services: list[ServiceFeeEntry]


def _text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(html.unescape(re.sub(r"<[^>]*>", " ", value)).split())[:2000]


def _name(value: str) -> str:
    return " ".join(re.findall(r"\w+", normalize_record_text(value)))


def match_services(query: str, services: list[dict]) -> list[dict]:
    text = _name(query)
    identifiers = re.findall(r"\b(?:service\s*(?:id|number)?|خدمه\s*رقم|رقم\s*الخدمه)\s*(\d+)\b", text)
    if text.isdigit():
        identifiers = [text]
    if identifiers:
        return [s for s in services if str(s.get("id")) in identifiers]
    exact = [s for s in services if any(
        name and re.search(r"(?<!\w)" + re.escape(name) + r"(?!\w)", text)
        for name in (_name(str(s.get("nameEn") or "")), _name(str(s.get("nameAr") or "")))
    )]
    if exact:
        return exact
    stop = set("can could you please check tell show me what is are the a an for of to in how much does service services fee fees cost price and work اريد ما هي هو كم رسوم تكلفه سعر خدمه الخدمه ارني اعرض من فضلك".split())
    tokens = set(text.split()) - stop
    if len(tokens) < 2:
        return []
    return [s for s in services if any(tokens <= set(_name(str(s.get(k) or "")).split()) for k in ("nameEn", "nameAr"))]


class CustomerServiceFeeClient:
    def __init__(self, settings, *, transport=None):
        # Reuse the selected Customer API binding; never accept a caller URL.
        self.base_url = settings.umc_document_service_base_url.rstrip("/")
        self.timeout = settings.platform_timeout_seconds
        self.transport = transport

    @staticmethod
    def _data(payload: Any) -> dict:
        if not isinstance(payload, dict) or payload.get("isSuccess") is False or not isinstance(payload.get("data"), dict):
            raise ValueError("Invalid Customer service response")
        return payload["data"]

    async def lookup(self, query: str, *, umc_token: str | None) -> ServiceFeeResponse:
        if not umc_token:
            raise PermissionError("UMC authentication is required")
        if not self.base_url:
            raise RuntimeError("Customer service API is not configured")
        async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport, follow_redirects=False,
                                     headers={"Authorization": f"Bearer {umc_token}"}) as client:
            catalogue, seen, expected = [], set(), None
            for page in range(1, 101):
                response = await client.post(f"{self.base_url}/api/Service/ServicePage", json={
                    "pageSize": 100, "pageIndex": page, "sortBy": "", "sortDirection": 0,
                    "nameEn": "", "nameAr": "", "serviceCategoryId": 0,
                    "featured": False, "favorite": False, "userTypeCodes": [],
                })
                response.raise_for_status()
                data = self._data(response.json())
                items, total = data.get("items"), data.get("total")
                if not isinstance(items, list) or isinstance(total, bool) or not isinstance(total, int) or total < 0 or (expected is not None and expected != total):
                    raise ValueError("Invalid or changing service catalogue")
                expected = total
                for item in items:
                    if not isinstance(item, dict) or isinstance(item.get("id"), bool) or not isinstance(item.get("id"), int) or item["id"] <= 0 or item["id"] in seen:
                        raise ValueError("Invalid catalogue pagination")
                    seen.add(item["id"])
                    catalogue.append(item)
                if len(catalogue) == total:
                    break
                if not items or len(catalogue) > total:
                    raise ValueError("Incomplete catalogue")
            else:
                raise ValueError("Service catalogue page limit exceeded")
            matches = match_services(query, catalogue)
            entries = [ServiceFeeEntry(serviceId=s["id"], nameEn=_text(s.get("nameEn")), nameAr=_text(s.get("nameAr")),
                                       sourcePath=f"/services/service-card?id={s['id']}") for s in matches[:8]]
            status = "matched" if len(matches) == 1 else "ambiguous" if matches else "not_found"
            if status == "matched":
                entry = entries[0]
                response = await client.get(f"{self.base_url}/api/Service/{entry.serviceId}/Learn/Authorized")
                response.raise_for_status()
                data = self._data(response.json())
                if data.get("serviceId") != entry.serviceId:
                    raise ValueError("Service card identity mismatch")
                entry.feeEn = _text(data.get("serviceFeeEn")) or None
                entry.feeAr = _text(data.get("serviceFeeAr")) or None
            return ServiceFeeResponse(status=status, services=entries)


def fee_answer(result: ServiceFeeResponse, language: str) -> str:
    def safe(value):
        return re.sub(r"([\\`*_[\]<>|])", r"\\\1", str(value))
    ar = language == "ar"
    if result.status == "not_found":
        return "يرجى تحديد اسم الخدمة أو رقمها كما يظهر في بطاقة الخدمة لقراءة رسومها." if ar else "Please provide the service name or service ID as shown on its card so I can read its fee."
    if result.status == "ambiguous":
        heading = "توجد خدمات متعددة مطابقة. اختر الخدمة المقصودة:" if ar else "Several services match. Please choose the intended service:"
        return heading + "\n\n" + "\n".join(f"- [{safe(s.nameAr if ar else s.nameEn)}]({s.sourcePath}) — {s.serviceId}" for s in result.services)
    entry = result.services[0]
    name = entry.nameAr if ar else entry.nameEn
    fee = entry.feeAr if ar else entry.feeEn
    if not fee:
        message = "لا تعرض بطاقة الخدمة رسوماً مؤكدة بهذه اللغة؛ لا يمكنني تقديرها." if ar else "The service card does not display a confirmed fee in this language; I cannot estimate it."
    else:
        message = ("رسوم الخدمة: **" if ar else "Service fee: **") + safe(fee) + "**"
    source = "المصدر: [بطاقة الخدمة — اعرف المزيد]" if ar else "Source: [Service card — Learn More]"
    note = "هذه رسوم منشورة للخدمة، وليست رصيداً أو فاتورة خاصة بحسابك. لم يتم تقديم طلب أو إجراء أي دفع." if ar else "This is the published service fee, not your account balance or invoice. No application or payment has been made."
    return f"## {safe(name)}\n\n{message}\n\n{source}({entry.sourcePath})\n\n{note}"
