import type { PaymentCenterCardPaymentInquiryResponse } from "@/services/paymentCenterCardPayment";

export type PaymentResultKind =
  | "CHECKING"
  | "SUCCESS"
  | "FAILED"
  | "UNCONFIRMED"
  | "INVALID_LINK";

export interface PaymentResultSearchParams {
  transactionNo: string;
  source: "return" | "manual" | null;
}

export interface PaymentResultViewState {
  kind: PaymentResultKind;
  transactionNo: string;
  referenceNumber: string | null;
  paymentId: string | null;
  gatewayStatus: string | null;
  errorCode: string | null;
}

const TRANSACTION_NO_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const cleanText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

export function parsePaymentResultSearch(
  search: string,
): PaymentResultSearchParams | null {
  const params = new URLSearchParams(search || "");
  const transactionNo = cleanText(params.get("transactionNo"));

  if (!transactionNo || !TRANSACTION_NO_PATTERN.test(transactionNo)) {
    return null;
  }

  const rawSource = params.get("src");
  const source = rawSource === "return" || rawSource === "manual" ? rawSource : null;

  return { transactionNo, source };
}

export function mapInquiryToPaymentResult(
  response: PaymentCenterCardPaymentInquiryResponse,
  transactionNo: string,
): PaymentResultViewState {
  const baseState = {
    transactionNo,
    referenceNumber: cleanText(response.referenceNumber),
    paymentId: cleanText(response.paymentId),
    gatewayStatus: cleanText(response.gatewayStatus),
    errorCode: cleanText(response.errorCode),
  };

  if (!response.success || response.isFinalConfirmed !== true) {
    return { kind: "CHECKING", ...baseState };
  }

  const statusId = Number(response.statusId);
  if (statusId === 3) {
    return { kind: "SUCCESS", ...baseState };
  }

  if (statusId === 4) {
    return { kind: "FAILED", ...baseState };
  }

  return { kind: "UNCONFIRMED", ...baseState };
}

export function createInitialPaymentResultState(
  transactionNo: string,
): PaymentResultViewState {
  return {
    kind: "CHECKING",
    transactionNo,
    referenceNumber: null,
    paymentId: null,
    gatewayStatus: null,
    errorCode: null,
  };
}

export function createInvalidPaymentResultState(): PaymentResultViewState {
  return {
    kind: "INVALID_LINK",
    transactionNo: "",
    referenceNumber: null,
    paymentId: null,
    gatewayStatus: null,
    errorCode: null,
  };
}
