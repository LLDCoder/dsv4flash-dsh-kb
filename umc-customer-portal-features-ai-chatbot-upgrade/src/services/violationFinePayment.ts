import {
  createBatchedFinePurchase,
  createFinePurchase,
  unwrapPaymentCenterResponse,
  type PaymentCenterCardPaymentLanguageId,
} from "@/services/paymentCenterCardPayment";
import {
  downloadPaymentReceipt,
} from "@/services/paymentCenterReceipt";
import {
  downloadTransactionReceipt,
  getTransactionDetail,
  type PaymentCenterTransactionDetailDto,
} from "@/services/payments";
import {
  getReceiptDownloadErrorMessage,
  getReceiptDownloadFileName,
  getReceiptPendingMessage,
} from "@/utils/paymentReceipt";

export interface ViolationFineWalletPaymentPayload {
  fineReferenceNumber: string;
  amount: number;
  pin: string;
}

export interface ViolationFineCardPurchasePayload {
  fineReferenceNumber: string;
  amount: number;
  responseUrl: string;
  errorUrl: string;
  description?: string;
  languageId?: PaymentCenterCardPaymentLanguageId;
}

export interface BatchedViolationFineCardPurchasePayload {
  fineReferenceNumbers: string[];
  amount: number;
  description?: string;
  languageId?: PaymentCenterCardPaymentLanguageId;
}

export interface ViolationFinePaymentResponse {
  success: boolean;
  referenceNumber?: string;
}

export interface ViolationFineCardPurchaseResponse {
  success: boolean;
  paymentUrl?: string;
  transactionNo?: string;
  referenceNumber?: string;
  paymentId?: string;
  tranId?: string | null;
  correlationId?: string | null;
  nextAction?: string | null;
  hostedPaymentPageUrl?: string;
  paymentPageUrl?: string;
  isRecovered?: boolean;
  gatewayStatus?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  customMessage?: string | null;
}

export interface ViolationFineReceiptDownloadOptions {
  fallbackFileName?: string;
  receiptNo?: string | null;
}

export const VIOLATION_FINE_WALLET_PAYMENT_UNAVAILABLE_MESSAGE =
  "Wallet payment is not available for fine payments.";

export const VIOLATION_FINE_PAYMENT_API_UNAVAILABLE_MESSAGE =
  "Fine payment API is not available yet.";

export const VIOLATION_FINE_RECEIPT_API_UNAVAILABLE_MESSAGE =
  "Fine receipt is not available yet.";

export const payViolationFineByWallet = async (
  payload: ViolationFineWalletPaymentPayload,
): Promise<ViolationFinePaymentResponse> => {
  void payload;
  throw new Error(VIOLATION_FINE_WALLET_PAYMENT_UNAVAILABLE_MESSAGE);
};

export const createViolationFineCardPurchase = async (
  payload: ViolationFineCardPurchasePayload,
): Promise<ViolationFineCardPurchaseResponse> => {
  const response = unwrapPaymentCenterResponse(
    await createFinePurchase({
      fineReferenceNumber: payload.fineReferenceNumber,
      amount: payload.amount,
      responseUrl: payload.responseUrl,
      errorUrl: payload.errorUrl,
      description: payload.description,
      languageId: payload.languageId ?? "EN",
    }),
  );

  return {
    ...response,
    paymentUrl: response.hostedPaymentPageUrl,
  };
};

export const createBatchedViolationFineCardPurchase = async (
  payload: BatchedViolationFineCardPurchasePayload,
): Promise<ViolationFineCardPurchaseResponse> => {
  const response = unwrapPaymentCenterResponse(
    await createBatchedFinePurchase({
      fineReferenceNumbers: payload.fineReferenceNumbers,
      amount: payload.amount,
      description: payload.description,
      languageId: payload.languageId ?? "EN",
    }),
  );

  return {
    ...response,
    paymentUrl: response.hostedPaymentPageUrl || response.paymentPageUrl,
  };
};

function cleanReceiptText(value?: string | null) {
  const trimmedValue = String(value ?? "").trim();
  return trimmedValue || null;
}

function unwrapTransactionDetail(
  response: unknown,
): PaymentCenterTransactionDetailDto | null {
  if (response == null || typeof response !== "object") {
    return null;
  }

  const result = response as Record<string, unknown>;
  if (result.data != null && typeof result.data === "object") {
    return result.data as PaymentCenterTransactionDetailDto;
  }

  return result as PaymentCenterTransactionDetailDto;
}

export const downloadViolationFineReceiptByTransactionNo = async (
  transactionNo: string | null | undefined,
  options: ViolationFineReceiptDownloadOptions = {},
) => {
  const normalizedTransactionNo = cleanReceiptText(transactionNo);
  const normalizedReceiptNo = cleanReceiptText(options.receiptNo);

  if (!normalizedTransactionNo && !normalizedReceiptNo) {
    throw new Error("Receipt is not available yet. Please try again later.");
  }

  if (normalizedTransactionNo) {
    let transactionDetail: PaymentCenterTransactionDetailDto | null = null;

    try {
      transactionDetail = unwrapTransactionDetail(
        await getTransactionDetail(normalizedTransactionNo),
      );
    } catch (error) {
      if (!normalizedReceiptNo) {
        throw error;
      }
    }

    if (transactionDetail) {
      const pendingMessage = getReceiptPendingMessage(
        transactionDetail.hasReceipt,
        transactionDetail.receipt,
      );

      if (pendingMessage) {
        throw new Error(pendingMessage);
      }

      try {
        await downloadTransactionReceipt(
          normalizedTransactionNo,
          getReceiptDownloadFileName(
            transactionDetail.receipt,
            options.fallbackFileName ||
              `receipt-${normalizedTransactionNo}.pdf`,
          ),
        );
        return;
      } catch (error) {
        if (!normalizedReceiptNo) {
          throw error;
        }
      }
    } else if (!normalizedReceiptNo) {
      throw new Error(VIOLATION_FINE_RECEIPT_API_UNAVAILABLE_MESSAGE);
    }
  }

  if (!normalizedReceiptNo) {
    throw new Error(VIOLATION_FINE_RECEIPT_API_UNAVAILABLE_MESSAGE);
  }

  await downloadPaymentReceipt(
    normalizedReceiptNo,
    options.fallbackFileName || `receipt-${normalizedReceiptNo}.pdf`,
  );
};

export const getViolationFinePaymentErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return VIOLATION_FINE_PAYMENT_API_UNAVAILABLE_MESSAGE;
};

export const getViolationFineReceiptDownloadErrorMessage = (error: unknown) => {
  return getReceiptDownloadErrorMessage(error);
};
