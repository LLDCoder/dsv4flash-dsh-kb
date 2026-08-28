export type PendingPaymentContext = {
  fineReferenceNumbers: string[];
  amount: number;
  transactionNo?: string;
  paymentId?: string;
  tranId?: string;
  correlationId?: string;
};

const PAY_FINES_PENDING_PAYMENT_STORAGE_KEY =
  "pay-fines-pending-payment-context";
const PAY_FINES_PAYMENT_ATTEMPT_REVISION_STORAGE_KEY =
  "pay-fines-payment-attempt-revision";

const normalizeTransactionNo = (transactionNo?: string | null) =>
  String(transactionNo ?? "").trim();

export const isMatchingPaymentTransaction = (
  expectedTransactionNo?: string | null,
  actualTransactionNo?: string | null,
) => {
  const expected = normalizeTransactionNo(expectedTransactionNo);
  return (
    Boolean(expected) && expected === normalizeTransactionNo(actualTransactionNo)
  );
};

export const shouldRetainPendingPaymentContext = (
  status: "success" | "failed" | "processing" | "unknown",
  receiptsReady?: boolean,
) =>
  status === "processing" ||
  status === "unknown" ||
  (status === "success" && receiptsReady !== true);

export const hasMatchingReceiptReferences = (
  expectedReferenceNumbers: string[],
  receipts: Array<{ fineReferenceNumber: string }>,
) => {
  if (receipts.length !== expectedReferenceNumbers.length) return false;

  const actualReferenceNumbers = new Set(
    receipts.map((receipt) => receipt.fineReferenceNumber),
  );
  return (
    actualReferenceNumbers.size === expectedReferenceNumbers.length &&
    expectedReferenceNumbers.every((referenceNumber) =>
      actualReferenceNumbers.has(referenceNumber),
    )
  );
};

export const arePaymentReceiptsReady = (
  receiptsReady: boolean | undefined,
  expectedReferenceNumbers: string[],
  receipts: Array<{ fineReferenceNumber: string }>,
) =>
  receiptsReady === true &&
  hasMatchingReceiptReferences(expectedReferenceNumbers, receipts);

export const readPendingPaymentContext = (): PendingPaymentContext | null => {
  try {
    const storedValue = window.localStorage.getItem(
      PAY_FINES_PENDING_PAYMENT_STORAGE_KEY,
    );
    if (!storedValue) return null;

    const context = JSON.parse(storedValue) as PendingPaymentContext | null;
    if (
      !context ||
      !Array.isArray(context.fineReferenceNumbers) ||
      !context.fineReferenceNumbers.length ||
      context.fineReferenceNumbers.some(
        (value) => typeof value !== "string" || !value.trim(),
      ) ||
      !Number.isFinite(context.amount) ||
      context.amount <= 0 ||
      typeof context.transactionNo !== "string" ||
      !context.transactionNo.trim() ||
      typeof context.paymentId !== "string" ||
      !context.paymentId.trim() ||
      typeof context.correlationId !== "string" ||
      !context.correlationId.trim()
    ) {
      return null;
    }

    return {
      ...context,
      transactionNo: context.transactionNo.trim(),
      paymentId: context.paymentId.trim(),
      tranId: context.tranId?.trim() || undefined,
      correlationId: context.correlationId.trim(),
    };
  } catch {
    return null;
  }
};

const readPaymentAttemptRevision = () => {
  try {
    const revision = Number(
      window.localStorage.getItem(
        PAY_FINES_PAYMENT_ATTEMPT_REVISION_STORAGE_KEY,
      ),
    );
    return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
  } catch {
    return 0;
  }
};

export const beginPendingPaymentAttempt = () => {
  const revision = readPaymentAttemptRevision() + 1;
  try {
    window.localStorage.setItem(
      PAY_FINES_PAYMENT_ATTEMPT_REVISION_STORAGE_KEY,
      String(revision),
    );
  } catch {
    return revision;
  }
  return revision;
};

export const savePendingPaymentContext = (
  context: PendingPaymentContext,
  expectedRevision: number,
) => {
  if (!context.transactionNo || !context.paymentId || !context.correlationId) {
    return;
  }

  try {
    if (readPaymentAttemptRevision() !== expectedRevision) return;

    window.localStorage.setItem(
      PAY_FINES_PENDING_PAYMENT_STORAGE_KEY,
      JSON.stringify(context),
    );
  } catch {
    return;
  }
};

export const clearPendingPaymentContext = (expectedTransactionNo?: string) => {
  try {
    if (expectedTransactionNo) {
      const storedContext = readPendingPaymentContext();
      if (
        !isMatchingPaymentTransaction(
          expectedTransactionNo,
          storedContext?.transactionNo,
        )
      ) {
        return;
      }
    }

    window.localStorage.removeItem(PAY_FINES_PENDING_PAYMENT_STORAGE_KEY);
  } catch {
    return;
  }
};
