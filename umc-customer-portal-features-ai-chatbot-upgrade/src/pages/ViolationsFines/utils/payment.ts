import type {
  PaymentCenterCancelTransactionResponse,
  PaymentCenterCardPaymentInquiryResponse,
} from "@/services/paymentCenterCardPayment";
import { resolveTrustedPaymentUrl } from "@/utils/security/externalDestinations";

export type FinePaymentUiStatus =
  | "loading"
  | "success"
  | "failed"
  | "cancelled"
  | "processing"
  | "missing";

export type FineCardPaymentPurchaseMode = "single" | "batched";

export const resolveFineCardPaymentPurchaseMode = (
  selectedFineCount: number,
): FineCardPaymentPurchaseMode | null => {
  if (selectedFineCount <= 0) {
    return null;
  }

  return selectedFineCount === 1 ? "single" : "batched";
};

export interface FineCardPaymentContext {
  fineReferenceNumber: string;
  amount: number;
  transactionNo: string;
  createdAt: number;
  paymentId?: string;
  referenceNumber?: string;
  hostedPaymentPageUrl?: string;
  isRecovered?: boolean;
}

export interface FinePaymentFailureDetails {
  errorCode?: string;
  reason?: string;
  transactionNo?: string;
  referenceNumber?: string;
  attemptedAmount?: number;
  timestamp?: string;
}

export interface FinePaymentResolution {
  status: FinePaymentUiStatus;
  message?: string;
}

export interface FinePaymentCancelResolution {
  status: Extract<FinePaymentUiStatus, "success" | "cancelled" | "processing">;
  message?: string;
}

const FINE_CARD_PAYMENT_STORAGE_KEY = "violations-fines-card-payment-context";
const FINE_CARD_PAYMENT_RETURN_FLAG_KEY = "finePaymentReturn";
const COMPLETED_STATUS_ID = 3;
const FAILED_STATUS_ID = 4;
const FINE_PAYMENT_COMPLETED_STATUSES = ["completed", "success", "paid"];
const FINE_PAYMENT_FAILED_STATUSES = ["failed", "cancelled", "canceled"];

const normalize = (value?: string | number | null) =>
  `${value ?? ""}`.trim().toLowerCase();

export const getPaymentErrorStatusCode = (error: unknown) => {
  const value = error as {
    statusCode?: number;
    response?: {
      status?: number;
      data?: {
        statusCode?: number;
      };
    };
  };

  return value.statusCode ?? value.response?.data?.statusCode ?? value.response?.status;
};

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

export const buildFinePaymentResultUrl = (
  pathname: string,
  fineReferenceNumber: string,
) => {
  const searchParams = new URLSearchParams();
  searchParams.set(FINE_CARD_PAYMENT_RETURN_FLAG_KEY, "1");
  searchParams.set("method", "card");
  searchParams.set("fineReferenceNumber", fineReferenceNumber);

  if (typeof window === "undefined") {
    return `${pathname}?${searchParams.toString()}`;
  }

  return `${window.location.origin}${pathname}?${searchParams.toString()}`;
};

export const buildFinePaymentResultLocation = (
  pathname: string,
  fineReferenceNumber: string,
) => {
  const resultUrl = buildFinePaymentResultUrl(pathname, fineReferenceNumber);

  if (typeof window === "undefined") {
    const [resultPathname, resultSearch = ""] = resultUrl.split("?");
    return {
      pathname: resultPathname,
      search: resultSearch ? `?${resultSearch}` : "",
    };
  }

  const parsedUrl = new URL(resultUrl);

  return {
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
  };
};

export const saveFineCardPaymentContext = (context: FineCardPaymentContext) => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(FINE_CARD_PAYMENT_STORAGE_KEY, JSON.stringify(context));
};

export const readFineCardPaymentContext = (): FineCardPaymentContext | null => {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(FINE_CARD_PAYMENT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<FineCardPaymentContext>;
    const transactionNo = `${parsedValue.transactionNo ?? ""}`.trim();
    const fineReferenceNumber = `${
      parsedValue.fineReferenceNumber ?? ""
    }`.trim();
    const amount = Number(parsedValue.amount);

    if (!transactionNo || !fineReferenceNumber || !Number.isFinite(amount)) {
      storage.removeItem(FINE_CARD_PAYMENT_STORAGE_KEY);
      return null;
    }

    return {
      fineReferenceNumber,
      amount,
      transactionNo,
      createdAt:
        typeof parsedValue.createdAt === "number"
          ? parsedValue.createdAt
          : Date.now(),
      paymentId: parsedValue.paymentId,
      referenceNumber: parsedValue.referenceNumber,
      hostedPaymentPageUrl: parsedValue.hostedPaymentPageUrl,
      isRecovered: parsedValue.isRecovered,
    };
  } catch (error) {
    console.error("Failed to parse fine card payment context:", error);
    storage.removeItem(FINE_CARD_PAYMENT_STORAGE_KEY);
    return null;
  }
};

export const clearFineCardPaymentContext = () => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(FINE_CARD_PAYMENT_STORAGE_KEY);
};

export const openFinePaymentWindow = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const paymentWindow = window.open("", "_blank");

  if (paymentWindow) {
    paymentWindow.opener = null;
  }

  return paymentWindow;
};

export const navigateFinePaymentWindow = (
  paymentWindow: Window,
  paymentUrl: string,
) => {
  if (paymentWindow.closed) return false;

  const trustedPaymentUrl = resolveTrustedPaymentUrl(paymentUrl);
  if (!trustedPaymentUrl) {
    paymentWindow.close();
    return false;
  }

  paymentWindow.location.href = trustedPaymentUrl;
  return true;
};

export const mapFinePaymentInquiryToUiState = (
  result: PaymentCenterCardPaymentInquiryResponse,
): FinePaymentResolution => {
  if (!result.success) {
    return {
      status: "failed",
      message:
        result.customMessage ||
        result.failureReason ||
        result.errorMessage ||
        "",
    };
  }

  if (result.isFinalConfirmed === false) {
    return {
      status: "processing",
      message:
        result.customMessage ||
        result.failureReason ||
        result.errorMessage ||
        "",
    };
  }

  const gatewayStatus = normalize(result.gatewayStatus);
  const status = normalize(result.status);
  const statusId = Number(result.statusId);

  if (
    statusId === COMPLETED_STATUS_ID ||
    status === "success" ||
    status === "completed" ||
    gatewayStatus === "success" ||
    gatewayStatus === "completed" ||
    gatewayStatus === "captured"
  ) {
    return { status: "success" };
  }

  if (
    status === "cancelled" ||
    status === "canceled" ||
    gatewayStatus === "cancelled" ||
    gatewayStatus === "canceled"
  ) {
    return {
      status: "cancelled",
      message:
        result.customMessage ||
        result.failureReason ||
        result.errorMessage ||
        "",
    };
  }

  if (
    statusId === FAILED_STATUS_ID ||
    status === "failed" ||
    status === "failure" ||
    gatewayStatus === "failed" ||
    gatewayStatus === "failure"
  ) {
    return {
      status: "failed",
      message:
        result.customMessage ||
        result.failureReason ||
        result.errorMessage ||
        "",
    };
  }

  return {
    status: "processing",
    message:
      result.customMessage ||
      result.failureReason ||
      result.errorMessage ||
      "",
  };
};

export const mapFinePaymentCancelToUiState = (
  result: PaymentCenterCancelTransactionResponse,
): FinePaymentCancelResolution => {
  const message = result.message || undefined;
  const currentStatus = normalize(result.currentStatus);
  const finalStatus = FINE_PAYMENT_COMPLETED_STATUSES.includes(currentStatus)
    ? "success"
    : FINE_PAYMENT_FAILED_STATUSES.includes(currentStatus)
    ? "cancelled"
    : null;

  switch (result.action) {
    case "CANCELLED_BY_INQUIRY":
    case "CANCELLED_BY_EXPIRY":
      return { status: "cancelled", message };
    case "CONFIRMED_PAID":
      return { status: "success", message };
    case "ALREADY_FINAL":
      return { status: finalStatus || "processing", message };
    case "INQUIRY_FAILED_STILL_PENDING":
      return { status: "processing", message };
    default:
      return { status: finalStatus || "processing", message };
  }
};

export const buildFinePaymentFailureDetails = ({
  result,
  context,
}: {
  result?: PaymentCenterCardPaymentInquiryResponse;
  context?: FineCardPaymentContext | null;
}): FinePaymentFailureDetails | null => {
  const details: FinePaymentFailureDetails = {
    errorCode: result?.errorCode || undefined,
    reason:
      result?.customMessage ||
      result?.failureReason ||
      result?.errorMessage ||
      undefined,
    transactionNo: result?.transactionNo || context?.transactionNo,
    referenceNumber: result?.referenceNumber || context?.referenceNumber,
    attemptedAmount: context?.amount,
    timestamp: `${new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Dubai",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })} GST`,
  };

  return Object.values(details).some((value) => value !== undefined)
    ? details
    : null;
};
