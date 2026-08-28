import type { ViolationFinePaymentResult } from "./violationFine";

export type PublicViolationFineBatchPaymentStatusItem = {
  violationNo?: string | null;
  transactionNo?: string | null;
  amount?: number | null;
  currencyCode?: string | null;
  paymentStatus?: string | null;
  failureReason?: string | null;
  receiptId?: number | string | null;
  receiptStoredFileKey?: string | null;
  receiptFileName?: string | null;
  receiptDownloadUrl?: string | null;
};

export type PublicViolationFineBatchPaymentStatusResult = {
  success?: boolean;
  isFinalConfirmed?: boolean;
  batchTransactionNo?: string | null;
  transactionNo?: string | null;
  referenceNumber?: string | null;
  paymentId?: string | null;
  tranId?: string | null;
  correlationId?: string | null;
  gatewayStatus?: string | null;
  statusId?: number | string | null;
  paymentStatus?: string | null;
  amount?: number | null;
  currencyCode?: string | null;
  receiptsReady?: boolean;
  failureReason?: string | null;
  items?: PublicViolationFineBatchPaymentStatusItem[];
};

export type ViolationFineBatchPaymentStatusIdentifiers = {
  batchTransactionNo: string;
  paymentId: string;
  correlationId: string;
};

const normalizeStatusId = (statusId?: number | string | null) =>
  Number(statusId);

const mapReceipt = (
  item: PublicViolationFineBatchPaymentStatusItem,
) => {
  if (
    !item.violationNo?.trim() ||
    item.receiptId === undefined ||
    item.receiptId === null
  ) {
    return null;
  }

  return {
    fineReferenceNumber: item.violationNo.trim(),
    transactionNo: item.transactionNo?.trim() || "",
    receiptNo: String(item.receiptId),
    receiptId: item.receiptId,
    fileName: item.receiptFileName ?? null,
    downloadUrl: item.receiptDownloadUrl ?? null,
  };
};

export const mapViolationFineBatchPaymentStatus = (
  paymentStatus: PublicViolationFineBatchPaymentStatusResult,
  expectedIdentifiers?: ViolationFineBatchPaymentStatusIdentifiers,
): ViolationFinePaymentResult => {
  const transactionNo = paymentStatus.batchTransactionNo?.trim() || "";
  const paymentId = paymentStatus.paymentId?.trim() || "";
  const correlationId = paymentStatus.correlationId?.trim() || "";

  if (
    expectedIdentifiers &&
    (transactionNo !== expectedIdentifiers.batchTransactionNo.trim() ||
      paymentId !== expectedIdentifiers.paymentId.trim() ||
      correlationId !== expectedIdentifiers.correlationId.trim())
  ) {
    throw new Error("Batch payment status identifiers do not match the request.");
  }
  const isPaid =
    paymentStatus.success === true &&
    paymentStatus.isFinalConfirmed === true &&
    normalizeStatusId(paymentStatus.statusId) === 3 &&
    paymentStatus.paymentStatus === "PAID";
  const isFailed =
    paymentStatus.isFinalConfirmed === true &&
    normalizeStatusId(paymentStatus.statusId) === 4 &&
    paymentStatus.paymentStatus === "FAILED";

  if (!isPaid && !isFailed) {
    return {
      success: false,
      status: "processing",
      transactionNo,
      paymentId: paymentId || undefined,
      tranId: paymentStatus.tranId?.trim() || undefined,
      correlationId: correlationId || undefined,
      receiptsReady: paymentStatus.receiptsReady,
      receipts: [],
    };
  }

  const receipts = isPaid
    ? (paymentStatus.items ?? [])
        .map(mapReceipt)
        .filter((receipt): receipt is NonNullable<typeof receipt> =>
          Boolean(receipt),
        )
    : [];

  return {
    success: isPaid,
    status: isPaid ? "success" : "failed",
    transactionNo,
    paymentId: paymentId || undefined,
    tranId: paymentStatus.tranId?.trim() || undefined,
    correlationId: correlationId || undefined,
    receiptsReady: paymentStatus.receiptsReady,
    receipt: receipts[0],
    receipts,
  };
};
