import type {
  PaymentCenterCancelTransactionResponse,
  PaymentCenterCardPaymentInquiryResponse,
} from "@/services/paymentCenterCardPayment";

export type CardPaymentUiStatus =
  | "idle"
  | "creating"
  | "redirecting"
  | "processing"
  | "success"
  | "failed"
  | "cancelled"
  | "timeout";

export interface CardPaymentSessionContext {
  applicationId: number;
  amount: number;
  transactionNo: string;
  pollingStartedAt: number;
  paymentIntentOrderId?: number;
  paymentId?: string;
  tranId?: string;
  correlationId?: string;
  referenceNumber?: string;
  hostedPaymentPageUrl?: string;
  isRecovered?: boolean;
  businessType: "service-application";
}

export interface CardPaymentResolution {
  status: CardPaymentUiStatus | "query_failed";
  message?: string;
}

export interface CardPaymentCancelResolution {
  status: Extract<CardPaymentUiStatus, "success" | "cancelled" | "processing">;
  message?: string;
}

export interface CardPaymentFailureDetails {
  errorCode?: string;
  reason?: string;
  transactionNo?: string;
  referenceNumber?: string;
  attemptedAmount?: number;
  timestamp?: string;
}

type CardPaymentResultMessageStatus = CardPaymentUiStatus | "query_failed";

export const resolveCardPaymentResultMessageKey = (
  status: CardPaymentResultMessageStatus,
): string | null => {
  switch (status) {
    case "processing":
      return "myRequestsPage.cardPayment.messages.confirmationAutomatic";
    case "failed":
      return "myRequestsPage.cardPayment.messages.purchaseFailed";
    case "cancelled":
      return "myRequestsPage.cardPayment.messages.cancelledResult";
    case "query_failed":
      return "myRequestsPage.cardPayment.messages.queryFailed";
    default:
      return null;
  }
};

export const resolveCardPaymentSuccessPresentation = (
  isContentService: boolean,
) => ({
  descriptionKey: isContentService
    ? "myRequestsPage.paymentSuccess.contentServiceDescription"
    : null,
  showViewDocument: !isContentService,
});

const CARD_PAYMENT_STORAGE_KEY = "detail-card-payment-context";
const CARD_PAYMENT_POLLING_LEASE_KEY = "detail-card-payment-polling-lease";
const CARD_PAYMENT_RETURN_FLAG_KEY = "cardPaymentReturn";

const CARD_PAYMENT_TRANSACTION_STATUS_PENDING = 1;
const CARD_PAYMENT_TRANSACTION_STATUS_PROCESSING = 2;
const CARD_PAYMENT_TRANSACTION_STATUS_COMPLETED = 3;
const CARD_PAYMENT_TRANSACTION_STATUS_FAILED = 4;
const CARD_PAYMENT_CANCELLED_GATEWAY_STATUSES = ["cancelled", "canceled"];
const CARD_PAYMENT_COMPLETED_STATUSES = ["completed", "paid", "success"];
const CARD_PAYMENT_FAILED_STATUSES = ["failed", "cancelled", "canceled"];

const normalize = (value?: string | number | null) =>
  `${value ?? ""}`.trim().toLowerCase();

export const isCardPaymentTransactionNotFoundMessage = (value?: string | null) => {
  const normalizedValue = normalize(value);

  return (
    normalizedValue === "transaction_not_found" ||
    normalizedValue.includes("unable to locate the requested transaction") ||
    normalizedValue.includes("transaction not found")
  );
};

const normalizeTransactionStatusId = (value?: string | number | null) => {
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const resolveCardPaymentMessage = (
  result: Pick<
    PaymentCenterCardPaymentInquiryResponse,
    "customMessage" | "failureReason" | "errorMessage"
  >,
  fallbackMessage: string,
) => {
  return result.customMessage || result.failureReason || result.errorMessage || fallbackMessage;
};

const getContextStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

interface CardPaymentPollingLease {
  applicationId: number;
  transactionNo: string;
  ownerId: string;
  expiresAt: number;
}

export const mapLanguageToPaymentLanguage = (
  language?: string | null,
): "EN" | "AR" => {
  return `${language ?? "en"}`.toLowerCase().startsWith("ar") ? "AR" : "EN";
};

export const buildCardPaymentReturnUrl = (pathname: string, search: string) => {
  const searchParams = new URLSearchParams(search);
  searchParams.set(CARD_PAYMENT_RETURN_FLAG_KEY, "1");
  const normalizedSearch = searchParams.toString();

  if (typeof window === "undefined") {
    return `${pathname}${normalizedSearch ? `?${normalizedSearch}` : ""}`;
  }

  return `${window.location.origin}${pathname}${
    normalizedSearch ? `?${normalizedSearch}` : ""
  }`;
};

export const hasCardPaymentReturnFlag = (search: string) => {
  const searchParams = new URLSearchParams(search);
  return searchParams.get(CARD_PAYMENT_RETURN_FLAG_KEY) === "1";
};

export const removeCardPaymentReturnFlag = (search: string) => {
  const searchParams = new URLSearchParams(search);
  searchParams.delete(CARD_PAYMENT_RETURN_FLAG_KEY);
  const normalizedSearch = searchParams.toString();

  return normalizedSearch ? `?${normalizedSearch}` : "";
};

export const saveCardPaymentContext = (context: CardPaymentSessionContext) => {
  const storage = getContextStorage();

  if (!storage) {
    return;
  }

  storage.setItem(CARD_PAYMENT_STORAGE_KEY, JSON.stringify(context));
};

export const readCardPaymentContext = (): CardPaymentSessionContext | null => {
  const storage = getContextStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(CARD_PAYMENT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<CardPaymentSessionContext> & { createdAt?: number };
    return {
      applicationId: Number(parsedValue.applicationId),
      amount: Number(parsedValue.amount),
      transactionNo: `${parsedValue.transactionNo ?? ""}`,
      pollingStartedAt:
        typeof parsedValue.pollingStartedAt === "number"
          ? parsedValue.pollingStartedAt
          : typeof parsedValue.createdAt === "number"
          ? parsedValue.createdAt
          : Date.now(),
      paymentIntentOrderId:
        typeof parsedValue.paymentIntentOrderId === "number"
        && !Number.isNaN(parsedValue.paymentIntentOrderId)
          ? parsedValue.paymentIntentOrderId
          : undefined,
      paymentId: parsedValue.paymentId,
      tranId: parsedValue.tranId,
      correlationId: parsedValue.correlationId,
      referenceNumber: parsedValue.referenceNumber,
      hostedPaymentPageUrl: parsedValue.hostedPaymentPageUrl,
      isRecovered: parsedValue.isRecovered,
      businessType: parsedValue.businessType ?? "service-application",
    };
  } catch (error) {
    console.error("Failed to parse card payment context:", error);
    storage.removeItem(CARD_PAYMENT_STORAGE_KEY);
    return null;
  }
};

export const clearCardPaymentContext = () => {
  const storage = getContextStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(CARD_PAYMENT_STORAGE_KEY);
};

const readCardPaymentPollingLease = (): CardPaymentPollingLease | null => {
  const storage = getContextStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(CARD_PAYMENT_POLLING_LEASE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<CardPaymentPollingLease>;
    if (
      !parsedValue.ownerId ||
      !parsedValue.transactionNo ||
      Number.isNaN(Number(parsedValue.applicationId)) ||
      Number.isNaN(Number(parsedValue.expiresAt))
    ) {
      storage.removeItem(CARD_PAYMENT_POLLING_LEASE_KEY);
      return null;
    }

    return {
      applicationId: Number(parsedValue.applicationId),
      transactionNo: `${parsedValue.transactionNo}`,
      ownerId: `${parsedValue.ownerId}`,
      expiresAt: Number(parsedValue.expiresAt),
    };
  } catch (error) {
    console.error("Failed to parse card payment polling lease:", error);
    storage.removeItem(CARD_PAYMENT_POLLING_LEASE_KEY);
    return null;
  }
};

export const createCardPaymentPollingOwnerId = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `card-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const hasCardPaymentAutoInquiryTimedOut = (
  context: Pick<CardPaymentSessionContext, "pollingStartedAt">,
  maxDurationMs: number,
) => {
  return Date.now() - context.pollingStartedAt >= maxDurationMs;
};

export const tryAcquireCardPaymentPollingLease = ({
  applicationId,
  transactionNo,
  ownerId,
  ttlMs,
}: {
  applicationId: number;
  transactionNo: string;
  ownerId: string;
  ttlMs: number;
}) => {
  const storage = getContextStorage();

  if (!storage) {
    return true;
  }

  const currentLease = readCardPaymentPollingLease();
  const now = Date.now();
  const leasePayload: CardPaymentPollingLease = {
    applicationId,
    transactionNo,
    ownerId,
    expiresAt: now + ttlMs,
  };

  if (
    currentLease &&
    currentLease.ownerId !== ownerId &&
    currentLease.expiresAt > now &&
    currentLease.applicationId === applicationId &&
    currentLease.transactionNo === transactionNo
  ) {
    return false;
  }

  storage.setItem(CARD_PAYMENT_POLLING_LEASE_KEY, JSON.stringify(leasePayload));
  return true;
};

export const refreshCardPaymentPollingLease = ({
  applicationId,
  transactionNo,
  ownerId,
  ttlMs,
}: {
  applicationId: number;
  transactionNo: string;
  ownerId: string;
  ttlMs: number;
}) => {
  const storage = getContextStorage();

  if (!storage) {
    return;
  }

  storage.setItem(
    CARD_PAYMENT_POLLING_LEASE_KEY,
    JSON.stringify({
      applicationId,
      transactionNo,
      ownerId,
      expiresAt: Date.now() + ttlMs,
    } satisfies CardPaymentPollingLease),
  );
};

export const releaseCardPaymentPollingLease = ({
  applicationId,
  transactionNo,
  ownerId,
}: {
  applicationId?: number;
  transactionNo?: string;
  ownerId: string;
}) => {
  const storage = getContextStorage();

  if (!storage) {
    return;
  }

  const currentLease = readCardPaymentPollingLease();

  if (!currentLease) {
    return;
  }

  const matchesOwner = currentLease.ownerId === ownerId;
  const matchesApplication =
    typeof applicationId !== "number" || currentLease.applicationId === applicationId;
  const matchesTransaction =
    !transactionNo || currentLease.transactionNo === transactionNo;

  if (matchesOwner && matchesApplication && matchesTransaction) {
    storage.removeItem(CARD_PAYMENT_POLLING_LEASE_KEY);
  }
};

export const readCardPaymentContextByApplication = (
  applicationId: number,
): CardPaymentSessionContext | null => {
  const context = readCardPaymentContext();

  if (!context || context.applicationId !== applicationId) {
    return null;
  }

  return context;
};

export const mapCardPaymentInquiryToUiState = (
  result: PaymentCenterCardPaymentInquiryResponse,
): CardPaymentResolution => {
  if (!result.success) {
    return {
      status: "query_failed",
      message: resolveCardPaymentMessage(
        result,
        "We could not confirm your payment status right now. Please check again.",
      ),
    };
  }

  if (result.isFinalConfirmed === false) {
    return {
      status: "processing",
      message: resolveCardPaymentMessage(
        result,
        "Payment is still being processed. We will keep checking automatically.",
      ),
    };
  }

  const gatewayStatus = normalize(result.gatewayStatus);
  const statusId = normalizeTransactionStatusId(result.statusId);

  if (
    statusId === CARD_PAYMENT_TRANSACTION_STATUS_PENDING ||
    statusId === CARD_PAYMENT_TRANSACTION_STATUS_PROCESSING
  ) {
    return {
      status: "processing",
      message: resolveCardPaymentMessage(
        result,
        "Payment result confirmation is still in progress. We will keep checking automatically.",
      ),
    };
  }

  if (statusId === CARD_PAYMENT_TRANSACTION_STATUS_COMPLETED) {
    return {
      status: "success",
    };
  }

  if (statusId === CARD_PAYMENT_TRANSACTION_STATUS_FAILED) {
    if (CARD_PAYMENT_CANCELLED_GATEWAY_STATUSES.includes(gatewayStatus)) {
      return {
        status: "cancelled",
        message: resolveCardPaymentMessage(
          result,
          "Your payment was cancelled before completion.",
        ),
      };
    }

    return {
      status: "failed",
      message: resolveCardPaymentMessage(
        result,
        "Your payment could not be processed. Please try again.",
      ),
    };
  }

  return {
    status: "processing",
    message: resolveCardPaymentMessage(
      result,
      "Payment result confirmation is still in progress. We will keep checking automatically.",
    ),
  };
};

export const mapCardPaymentCancelToUiState = (
  result: PaymentCenterCancelTransactionResponse,
): CardPaymentCancelResolution => {
  const message = result.message || undefined;
  const currentStatus = normalize(result.currentStatus);
  const finalStatus = CARD_PAYMENT_COMPLETED_STATUSES.includes(currentStatus)
    ? "success"
    : CARD_PAYMENT_FAILED_STATUSES.includes(currentStatus)
    ? "cancelled"
    : null;

  switch (result.action) {
    case "CANCELLED_BY_INQUIRY":
    case "CANCELLED_BY_EXPIRY":
      return {
        status: "cancelled",
        message,
      };
    case "CONFIRMED_PAID":
      return {
        status: "success",
        message,
      };
    case "ALREADY_FINAL": {
      if (finalStatus) {
        return {
          status: finalStatus,
          message,
        };
      }

      return {
        status: "processing",
        message,
      };
    }
    case "INQUIRY_FAILED_STILL_PENDING":
      return {
        status: "processing",
        message,
      };
    default:
      if (finalStatus) {
        return {
          status: finalStatus,
          message,
        };
      }

      return {
        status: "processing",
        message,
      };
  }
};
