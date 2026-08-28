import i18next from "i18next";

export interface PaymentReceiptDto {
  id?: number;
  receiptNo?: string | null;
  status?: number | string | null;
  storedFileId?: number | null;
  fileName?: string | null;
  contentType?: string | null;
  generatedOn?: string | null;
  failureReason?: string | null;
}

function normalizeReceiptStatus(status?: number | string | null) {
  if (status === null || status === undefined || status === "") {
    return null;
  }
  const parsedStatus = Number(status);
  return Number.isFinite(parsedStatus) ? parsedStatus : null;
}

function cleanReceiptText(value?: string | null) {
  const trimmedValue = String(value ?? "").trim();
  return trimmedValue || null;
}

export function isReceiptReady(
  hasReceipt?: boolean | null,
  receipt?: PaymentReceiptDto | null,
) {
  return Boolean(hasReceipt) || normalizeReceiptStatus(receipt?.status) === 3;
}

export function getReceiptPendingMessage(
  hasReceipt?: boolean | null,
  receipt?: PaymentReceiptDto | null,
) {
  if (isReceiptReady(hasReceipt, receipt)) {
    return null;
  }

  const receiptStatus = normalizeReceiptStatus(receipt?.status);
  if (receiptStatus === 2) {
    return i18next.t("payments.receiptMessages.generating");
  }

  if (receiptStatus === 4) {
    return i18next.t("payments.receiptMessages.generationFailed");
  }

  return i18next.t("payments.receiptMessages.notReady");
}

export function getReceiptDownloadErrorMessage(error: unknown) {
  const responseStatus = (error as { response?: { status?: number } })?.response
    ?.status;

  if (responseStatus === 401 || responseStatus === 403) {
    return i18next.t("payments.receiptMessages.accessDenied");
  }

  if (responseStatus === 404) {
    return i18next.t("payments.receiptMessages.notReady");
  }

  return i18next.t("payments.receiptMessages.downloadFailed");
}

export function getReceiptDownloadFileName(
  receipt: PaymentReceiptDto | null | undefined,
  fallbackFileName: string,
) {
  return cleanReceiptText(receipt?.fileName) || fallbackFileName;
}
