import request from "@/utils/request";
import type { RequestConfig } from "@/utils/request";

export type PaymentCenterCardPaymentLanguageId = "EN" | "AR";

export interface PaymentCenterCreateServiceApplicationCardPaymentRequest {
  applicationId: number;
  amount: number;
  description?: string;
  languageId: PaymentCenterCardPaymentLanguageId;
}

export interface PaymentCenterCreateFineCardPaymentRequest {
  fineReferenceNumber: string;
  amount: number;
  responseUrl: string;
  errorUrl: string;
  description?: string;
  languageId: PaymentCenterCardPaymentLanguageId;
}

export interface PaymentCenterCreateBatchedFineCardPaymentRequest {
  fineReferenceNumbers: string[];
  amount: number;
  description?: string;
  languageId?: PaymentCenterCardPaymentLanguageId;
}

export interface PaymentCenterCreateMergedCardPaymentRequest {
  paymentIntentOrderId: number;
}

export interface PaymentCenterCreateBatchedServiceApplicationCardPaymentRequest {
  applicationIds: number[];
  amount: number;
}

export interface PaymentCenterCardPaymentPurchaseResponse {
  success: boolean;
  transactionNo?: string;
  referenceNumber?: string;
  paymentId?: string;
  tranId?: string | null;
  correlationId?: string | null;
  nextAction?: string | null;
  hostedPaymentPageUrl?: string;
  paymentPageUrl?: string;
  paymentUrl?: string;
  amount?: number | string | null;
  statusId?: number | string | null;
  transactionTypeId?: number | string | null;
  // When true, the backend resumed an existing pending/processing transaction.
  isRecovered?: boolean;
  gatewayStatus?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  customMessage?: string | null;
}

export interface PaymentCenterCardPaymentInquiryRequest {
  transactionNo: string;
  paymentId?: string;
  tranId?: string;
  correlationId?: string;
  inquiryType?: string;
}

export interface PaymentCenterCancelTransactionRequest {
  transactionNo: string;
}

export type PaymentCenterCancelTransactionAction =
  | "CANCELLED_BY_INQUIRY"
  | "CANCELLED_BY_EXPIRY"
  | "CONFIRMED_PAID"
  | "ALREADY_FINAL"
  | "INQUIRY_FAILED_STILL_PENDING";

export interface PaymentCenterCancelTransactionResponse {
  transactionNo: string;
  referenceNumber?: string | null;
  previousStatus: string;
  currentStatus: string;
  action: PaymentCenterCancelTransactionAction | number;
  message: string;
}

export interface PaymentCenterCardPaymentInquiryResponse {
  // Indicates the inquiry request itself succeeded, not the final payment outcome.
  success: boolean;
  // Final payment resolution gate from the backend audit flow.
  isFinalConfirmed?: boolean;
  transactionNo?: string;
  referenceNumber?: string;
  paymentId?: string;
  tranId?: string;
  correlationId?: string;
  // Original payment gateway status mirrored from the backend audit record.
  gatewayStatus?: string | null;
  // Local unified transaction status, inferred as 1=PENDING, 2=PROCESSING, 3=COMPLETED, 4=FAILED.
  statusId?: number | string | null;
  status?: string | null;
  failureReason?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  customMessage?: string | null;
}

type PaymentCenterResponseEnvelope<T> = T | { data?: T };

export const unwrapPaymentCenterResponse = <T>(
  response: PaymentCenterResponseEnvelope<T>,
): T => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as { data?: T }).data
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
};

export const createServiceApplicationPurchase = (
  data: PaymentCenterCreateServiceApplicationCardPaymentRequest,
) => {
  return request.post<PaymentCenterCardPaymentPurchaseResponse>(
    "/api/payment-center/card/service-applications/purchase",
    data,
    {
      skipErrorToast: true,
    },
  );
};

export const createMergedPurchase = (
  data: PaymentCenterCreateMergedCardPaymentRequest,
) => {
  return request.post<PaymentCenterCardPaymentPurchaseResponse>(
    "/api/payment-center/card/merged/purchase",
    data,
    {
      skipErrorToast: true,
    },
  );
};

export const createBatchedServiceApplicationPurchase = (
  data: PaymentCenterCreateBatchedServiceApplicationCardPaymentRequest,
) => {
  return request.post<PaymentCenterCardPaymentPurchaseResponse>(
    "/api/payment-center/card/service-applications/batched/purchase",
    data,
    {
      skipErrorToast: true,
    },
  );
};

export const createFinePurchase = (
  data: PaymentCenterCreateFineCardPaymentRequest,
) => {
  return request.post<PaymentCenterCardPaymentPurchaseResponse>(
    "/api/payment-center/card/fines/purchase",
    data,
    {
      skipErrorToast: true,
    },
  );
};

export const createBatchedFinePurchase = (
  data: PaymentCenterCreateBatchedFineCardPaymentRequest,
) => {
  return request.post<PaymentCenterCardPaymentPurchaseResponse>(
    "/api/payment-center/card/fines/purchase",
    data,
    {
      skipErrorToast: true,
    },
  );
};

export const inquiryCardPayment = (
  data: PaymentCenterCardPaymentInquiryRequest,
  config: RequestConfig = {},
) => {
  return request.post<PaymentCenterCardPaymentInquiryResponse>(
    "/api/payment-center/card/inquiry",
    data,
    config,
  );
};

export const cancelCardPaymentTransaction = (
  data: PaymentCenterCancelTransactionRequest,
) => {
  return request.post<PaymentCenterCancelTransactionResponse>(
    "/api/payment-center/card/cancel",
    data,
    {
      skipErrorToast: true,
    },
  );
};
