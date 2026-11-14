"""Read-only quote for an application in the authenticated Customer Profile."""
from __future__ import annotations

import asyncio
from decimal import Decimal, InvalidOperation
import json
import logging
import re
from typing import Any
from uuid import uuid4

import httpx


logger = logging.getLogger(__name__)


def _data(payload: Any) -> dict:
    if isinstance(payload, str):
        payload = json.loads(payload)
    if not isinstance(payload, dict) or payload.get("isSuccess") is False or payload.get("success") is False:
        raise ValueError("payment_source_unavailable")
    data = payload.get("data", payload)
    if not isinstance(data, dict):
        raise ValueError("payment_source_shape")
    return data


def _amount(value: Any) -> Decimal:
    if isinstance(value, bool):
        raise ValueError("invalid_payment_amount")
    amount = Decimal(str(value))
    if not amount.is_finite() or amount < 0:
        raise ValueError("invalid_payment_amount")
    return amount


def _id(value: Any) -> int | None:
    value = str(value)
    return int(value) if re.fullmatch(r"[1-9][0-9]{0,17}", value) else None


def _application_list_match(result, question, previous_question):
    data = _data(result)
    items = (data.get("applicationPage") or {}).get("items")
    if not isinstance(items, list):
        return None
    pattern = r"(?<![A-Z0-9])[A-Z]{2}-[0-9]+-[0-9]+-[0-9]+(?![A-Z0-9])"
    references = set(re.findall(pattern, question.upper()))
    if not references and re.search(r"\b(?:that|this|same)\s+(?:application|request)\b|(?:ذلك الطلب|هذا الطلب|الطلب نفسه)", question, re.I):
        references = set(re.findall(pattern, previous_question.upper()))
    if len(references) != 1:
        return None
    matches = [row for row in items if isinstance(row, dict)
               and str(row.get("applicationNumber") or "").upper() in references]
    return matches[0] if len(matches) == 1 else None


async def read_application_payable(platform, principal, context, settings, tool_name, arguments, result, question, previous_question):
    """Calculate the portal preview from its frozen order and applicable fee rules."""
    if (not result.get("ok") or not context or context.is_global_view
            or not context.active_profile_id or not principal.umc_token
            or tool_name not in {"umc.applications", "umc.application_detail", "umc.application_payment_detail"}):
        return None
    found = None
    if tool_name == "umc.applications":
        try:
            found = _application_list_match(result["result"], question, previous_question)
        except (KeyError, TypeError, ValueError):
            return None
        if not found:
            return None
    application_id = _id((found.get("applicationId") or found.get("id")) if found else arguments.get("applicationId"))
    if application_id is None:
        return None

    async def read(method, path, parameters=None):
        return _data(await platform.invoke_swagger_tool(
            method, path, parameters, umc_token=principal.umc_token, request_id=principal.request_id))

    async def quote():
        detail = (_data(result["result"]) if tool_name == "umc.application_detail" else
                  await read("GET", "/api/MyRequest/ApplicationDetail/{applicationId}", {"applicationId": application_id}))
        if (str(detail.get("applicationStatusId")) != "103"
                and str(detail.get("statusEn") or "").strip().casefold() != "pending payment"):
            return None
        if (_id(detail.get("applicationId")) != application_id
                or found and detail.get("applicationNumber") != found.get("applicationNumber")):
            raise ValueError("payment_application_unbound")
        if detail.get("profileId") is not None and str(detail["profileId"]) != context.active_profile_id:
            raise ValueError("payment_profile_mismatch")
        reference = str(detail.get("applicationNumber") or "").strip()
        if not reference:
            raise ValueError("payment_reference_missing")
        evidence = {"applicationNumber": reference, "applicationStatus": "Pending Payment",
                    "payableStatus": "unconfirmed"}
        try:
            order = (_data(result["result"]) if tool_name == "umc.application_payment_detail" else
                     await read("GET", "/api/payment-center/service-applications/{applicationId}/payment",
                                {"applicationId": application_id}))
            if order.get("applicationId") is not None and _id(order["applicationId"]) != application_id:
                raise ValueError("payment_order_unbound")
            amount = _amount(order.get("amount"))
            currency = str(order.get("currencyCode") or detail.get("currencyCode") or "").strip().upper()
            if not re.fullmatch(r"[A-Z]{3}", currency):
                raise ValueError("payment_currency_unavailable")
            evidence.update(baseOrderAmount=str(amount), currencyCode=currency)
            service_code = str(detail.get("code") or detail.get("serviceCode") or "").strip()
            if not service_code:
                raise ValueError("payment_service_code_unavailable")
            rules = settings.application_payable_penalty_service_ids
            surcharge = Decimal(0)
            if service_code in rules:
                source_id = _id(detail.get("sourceApplicationId"))
                if source_id is None:
                    raise ValueError("payment_lifecycle_source_missing")
                parameters = {"sourceApplicationId": source_id, "targetServiceCode": service_code}
                if detail.get("licensePermitNo"):
                    parameters["licensePermitNo"] = detail["licensePermitNo"]
                lifecycle = await read("GET", "/api/MyRequest/ApplicationLifecycleActivities/{sourceApplicationId}", parameters)
                link = lifecycle.get("penaltyFor") or {}
                ref_type, ref_id = link.get("penaltyReferenceType"), link.get("penaltyReferenceId")
                root_id = _id(lifecycle.get("rootApplicationId"))
                if not ref_type or not ref_id or root_id is None:
                    raise ValueError("payment_penalty_reference_missing")
                service_id = rules[service_code]
                evaluation = await read("POST", "/api/customer-engines/penalty/evaluate", {
                    "serviceId": service_id, "applicationId": root_id, "applicationNo": reference,
                    "penaltyScenarioCode": settings.application_payable_penalty_scenario,
                    "enginePayload": {"serviceId": service_id, "referenceType": ref_type, "referenceId": ref_id,
                                      "correlationId": f"dsh-preview-{uuid4().hex}"},
                })
                surcharge = _amount(evaluation.get("totalAmount"))
            return {**evidence, "payableStatus": "confirmed", "pendingPaymentSurcharge": str(surcharge),
                    "totalPayable": str(amount + surcharge)}
        except (httpx.HTTPError, InvalidOperation, ValueError, TypeError, KeyError) as exc:
            logger.info("application_payment_quote_unconfirmed request_id=%s failure=%s",
                        principal.request_id, exc if isinstance(exc, ValueError) and str(exc).startswith("payment_") else type(exc).__name__)
            return evidence

    try:
        return await asyncio.wait_for(quote(), timeout=12)
    except (httpx.HTTPError, TimeoutError, ValueError, TypeError, KeyError) as exc:
        logger.info("application_payment_quote_unavailable request_id=%s failure=%s", principal.request_id, type(exc).__name__)
        return {"payableStatus": "unconfirmed"}
