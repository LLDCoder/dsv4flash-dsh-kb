import type { PaymentCenterCardPaymentInquiryResponse } from "@/services/paymentCenterCardPayment";
import {
  isCardPaymentTransactionNotFoundMessage,
  mapCardPaymentInquiryToUiState,
  type CardPaymentSessionContext,
} from "./utils";

export type CardPaymentSessionRecoveryDecision =
  | {
      type: "open-hosted-page";
      hostedPaymentPageUrl: string;
    }
  | { type: "run-inquiry" }
  | { type: "discard-session" }
  | { type: "retain-session" }
  | {
      type: "final";
      status: "success" | "failed" | "cancelled";
    };

export const isCardPaymentSessionRecoveryCandidate = (
  context:
    | Pick<CardPaymentSessionContext, "applicationId" | "transactionNo">
    | null,
  applicationId: number,
) =>
  !!context?.transactionNo.trim() && context.applicationId === applicationId;

export const resolveCardPaymentSessionRecovery = (
  context:
    | Pick<
        CardPaymentSessionContext,
        "applicationId" | "transactionNo" | "hostedPaymentPageUrl"
      >
    | null,
  applicationId: number,
  inquiry?: PaymentCenterCardPaymentInquiryResponse | null,
): CardPaymentSessionRecoveryDecision | null => {
  if (
    !context ||
    !isCardPaymentSessionRecoveryCandidate(context, applicationId)
  ) {
    return null;
  }

  if (!inquiry) {
    return { type: "retain-session" };
  }

  if (inquiry.transactionNo !== context.transactionNo) {
    return { type: "retain-session" };
  }

  const resolution = mapCardPaymentInquiryToUiState(inquiry);

  if (resolution.status === "processing") {
    const statusId = Number(inquiry.statusId);
    const isExplicitlyProcessing =
      inquiry.isFinalConfirmed !== true &&
      (statusId === 1 || statusId === 2);

    if (!isExplicitlyProcessing) {
      return { type: "retain-session" };
    }

    return context.hostedPaymentPageUrl
      ? {
          type: "open-hosted-page",
          hostedPaymentPageUrl: context.hostedPaymentPageUrl,
        }
      : { type: "run-inquiry" };
  }

  if (resolution.status === "query_failed") {
    const isTransactionMissing = [
      resolution.message,
      inquiry.customMessage,
      inquiry.failureReason,
      inquiry.errorMessage,
      inquiry.errorCode,
    ].some((message) => isCardPaymentTransactionNotFoundMessage(message));

    return {
      type: isTransactionMissing ? "discard-session" : "retain-session",
    };
  }

  if (
    resolution.status === "success" ||
    resolution.status === "failed" ||
    resolution.status === "cancelled"
  ) {
    return {
      type: "final",
      status: resolution.status,
    };
  }

  return { type: "retain-session" };
};
