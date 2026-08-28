import { createElement, useCallback, useEffect, useRef, useState } from "react";
import i18next from "i18next";
import { CustomMessage } from "@/components/common";
import type { ApplicationDetailsResponse } from "@/services/myRequest";
import {
  cancelCardPaymentTransaction,
  createMergedPurchase,
  createServiceApplicationPurchase,
  inquiryCardPayment,
  unwrapPaymentCenterResponse,
  type PaymentCenterCardPaymentInquiryResponse,
  type PaymentCenterCardPaymentPurchaseResponse,
} from "@/services/paymentCenterCardPayment";
import {
  getServiceApplicationPayment,
  validateServiceApplicationPayNow,
  type ServiceApplicationPayNowValidateResult,
  type ServiceApplicationPaymentOrderDto,
} from "@/services/paymentCenterServiceApplication";
import { resolveCardPaymentPurchaseMode } from "./purchaseMode";
import { createCardPaymentPurchaseLock } from "./purchaseLock";
import {
  isCardPaymentSessionRecoveryCandidate,
  resolveCardPaymentSessionRecovery,
} from "./sessionResume";
import {
  clearCardPaymentContext,
  createCardPaymentPollingOwnerId,
  hasCardPaymentAutoInquiryTimedOut,
  hasCardPaymentReturnFlag,
  isCardPaymentTransactionNotFoundMessage,
  mapCardPaymentCancelToUiState,
  mapCardPaymentInquiryToUiState,
  mapLanguageToPaymentLanguage,
  readCardPaymentContextByApplication,
  refreshCardPaymentPollingLease,
  releaseCardPaymentPollingLease,
  removeCardPaymentReturnFlag,
  resolveCardPaymentResultMessageKey,
  saveCardPaymentContext,
  tryAcquireCardPaymentPollingLease,
  type CardPaymentFailureDetails,
  type CardPaymentSessionContext,
  type CardPaymentUiStatus,
} from "./utils";
import { resolveTrustedPaymentUrl } from "@/utils/security/externalDestinations";

const CARD_PAYMENT_INQUIRY_INTERVAL_MS = 2000;
const CARD_PAYMENT_AUTO_CONFIRMATION_TIMEOUT_MS = 30 * 60 * 1000;
const CARD_PAYMENT_POLLING_LEASE_TTL_MS =
  CARD_PAYMENT_INQUIRY_INTERVAL_MS + 3000;
type CardPaymentMessageKey =
  | "recovery"
  | "recreated"
  | "queryFailed"
  | "timeout"
  | "popupBlocked"
  | "purchaseFailed"
  | "notReady"
  | "cancelFailed"
  | "transactionNotFound"
  | "cancelPending"
  | "sessionMissing"
  | "confirmationAutomatic"
  | "confirmationPending"
  | "applicationMissing";

const cardPaymentMessage = (key: CardPaymentMessageKey) =>
  i18next.t(`myRequestsPage.cardPayment.messages.${key}`);

const getLocalizedCardPaymentResultMessage = (
  status: CardPaymentUiStatus | "query_failed",
) => {
  const messageKey = resolveCardPaymentResultMessageKey(status);
  return messageKey ? i18next.t(messageKey) : "";
};

interface UseCardPaymentOptions {
  applicationId: number;
  hasPayablePenalty: boolean;
  applicationDetail: ApplicationDetailsResponse | null;
  search: string;
  replacePathSearch: (nextSearch: string) => void;
  refreshDetails: () => void;
}

interface UseCardPaymentResult {
  cardPaymentVisible: boolean;
  cardPaymentStatus: CardPaymentUiStatus;
  cardPaymentContext: CardPaymentSessionContext | null;
  cardPaymentLoading: boolean;
  cardPaymentConfirmLoading: boolean;
  cardPaymentCancelLoading: boolean;
  cardPaymentResultMessage: string;
  cardPaymentFailureDetails: CardPaymentFailureDetails | null;
  cardPaymentDocumentNumber: string;
  handleCardPaymentPurchase: (
    options?: CardPaymentPurchaseOptions,
  ) => Promise<boolean>;
  handleCardPaymentProgressClose: () => Promise<void>;
  handleCardPaymentConfirmCompleted: () => void;
  handleCardPaymentTryAgain: () => void;
  resetCardPaymentFlow: (
    nextStatus?: CardPaymentUiStatus,
    clearReturnMarker?: boolean,
  ) => void;
}

type CardPaymentInquiryOptions = {
  context?: CardPaymentSessionContext | null;
  responseData?: PaymentCenterCardPaymentInquiryResponse;
  silent?: boolean;
  restartPolling?: boolean;
  source: "polling" | "manual";
  closeOnPending?: boolean;
  useCancelLoading?: boolean;
};

type PendingManualCardPaymentInquiryOptions = Omit<
  CardPaymentInquiryOptions,
  "source"
> & {
  source: "manual";
};

type CardPaymentPurchaseOptions = {
  applicationId?: number;
  applicationDetail?: ApplicationDetailsResponse | null;
  search?: string;
  refreshDetails?: () => void;
  paymentWindow?: Window | null;
};

const formatCardPaymentTimestamp = (timestamp?: number | string | null) => {
  if (!timestamp) {
    return undefined;
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return `${date.toLocaleString("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })} GST`;
};

const buildCardPaymentFailureDetails = ({
  errorCode,
  reason,
  transactionNo,
  referenceNumber,
  attemptedAmount,
  timestamp,
}: CardPaymentFailureDetails): CardPaymentFailureDetails | null => {
  const nextDetails: CardPaymentFailureDetails = {
    errorCode: errorCode || undefined,
    reason: reason || undefined,
    transactionNo: transactionNo || undefined,
    referenceNumber: referenceNumber || undefined,
    attemptedAmount:
      typeof attemptedAmount === "number" && !Number.isNaN(attemptedAmount)
        ? attemptedAmount
        : undefined,
    timestamp: timestamp || undefined,
  };

  return Object.values(nextDetails).some((value) => value !== undefined)
    ? nextDetails
    : null;
};

const getHttpStatusCode = (error: unknown) => {
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

export const useCardPayment = ({
  applicationId,
  hasPayablePenalty,
  applicationDetail,
  search,
  replacePathSearch,
  refreshDetails,
}: UseCardPaymentOptions): UseCardPaymentResult => {
  const [cardPaymentVisible, setCardPaymentVisible] = useState(false);
  const [cardPaymentStatus, setCardPaymentStatus] =
    useState<CardPaymentUiStatus>("idle");
  const [cardPaymentContext, setCardPaymentContext] =
    useState<CardPaymentSessionContext | null>(null);
  const [cardPaymentLoading, setCardPaymentLoading] = useState(false);
  const [cardPaymentConfirmLoading, setCardPaymentConfirmLoading] =
    useState(false);
  const [cardPaymentCancelLoading, setCardPaymentCancelLoading] =
    useState(false);
  const [cardPaymentResultMessage, setCardPaymentResultMessage] = useState("");
  const [cardPaymentFailureDetails, setCardPaymentFailureDetails] =
    useState<CardPaymentFailureDetails | null>(null);
  const [cardPaymentDocumentNumber, setCardPaymentDocumentNumber] =
    useState("");
  const cardPaymentPollingTimeoutRef = useRef<number | null>(null);
  const cardPaymentInquiryInFlightRef = useRef(false);
  const cardPaymentCancelInFlightRef = useRef(false);
  const cardPaymentCancelTransactionRef = useRef<string | null>(null);
  const cardPaymentPurchaseLockRef = useRef(createCardPaymentPurchaseLock());
  const cardPaymentContextRef = useRef<CardPaymentSessionContext | null>(null);
  const cardPaymentVisibleRef = useRef(false);
  const cardPaymentPollingOwnerIdRef = useRef(
    createCardPaymentPollingOwnerId(),
  );
  const cardPaymentPollingStoppedRef = useRef(false);
  const pendingManualCompletionRef = useRef(false);
  const pendingManualInquiryOptionsRef =
    useRef<PendingManualCardPaymentInquiryOptions | null>(null);
  const cardPaymentAutoResumeActiveRef = useRef(false);
  const cardPaymentProgressDismissedRef = useRef(false);
  const handleCardPaymentInquiryRef =
    useRef<(options?: CardPaymentInquiryOptions) => Promise<void>>();

  useEffect(() => {
    cardPaymentVisibleRef.current = cardPaymentVisible;
  }, [cardPaymentVisible]);

  useEffect(() => {
    cardPaymentContextRef.current = cardPaymentContext;
  }, [cardPaymentContext]);

  useEffect(() => {
    const pollingOwnerId = cardPaymentPollingOwnerIdRef.current;

    return () => {
      if (cardPaymentPollingTimeoutRef.current !== null) {
        window.clearTimeout(cardPaymentPollingTimeoutRef.current);
      }

      releaseCardPaymentPollingLease({
        applicationId: cardPaymentContextRef.current?.applicationId,
        transactionNo: cardPaymentContextRef.current?.transactionNo,
        ownerId: pollingOwnerId,
      });
    };
  }, []);

  const clearCardPaymentReturnMarker = useCallback(() => {
    const nextSearch = removeCardPaymentReturnFlag(search);
    replacePathSearch(nextSearch);
  }, [replacePathSearch, search]);

  const clearCardPaymentStoredContext = useCallback(
    (clearReturnMarker = false) => {
      clearCardPaymentContext();
      cardPaymentContextRef.current = null;
      setCardPaymentContext(null);

      if (clearReturnMarker) {
        clearCardPaymentReturnMarker();
      }
    },
    [clearCardPaymentReturnMarker],
  );

  const stopCardPaymentPolling = useCallback(
    (context?: CardPaymentSessionContext | null) => {
      if (cardPaymentPollingTimeoutRef.current !== null) {
        window.clearTimeout(cardPaymentPollingTimeoutRef.current);
        cardPaymentPollingTimeoutRef.current = null;
      }

      releaseCardPaymentPollingLease({
        applicationId: context?.applicationId,
        transactionNo: context?.transactionNo,
        ownerId: cardPaymentPollingOwnerIdRef.current,
      });
    },
    [],
  );

  const isCardPaymentPollingStopped = useCallback(
    (currentContext?: CardPaymentSessionContext | null) => {
      if (cardPaymentPollingStoppedRef.current) {
        return true;
      }

      if (
        currentContext?.transactionNo &&
        cardPaymentContextRef.current?.transactionNo &&
        currentContext.transactionNo !==
          cardPaymentContextRef.current.transactionNo
      ) {
        return true;
      }

      return false;
    },
    [],
  );

  const handleStaleCardPaymentContext = useCallback(
    (
      currentContext: CardPaymentSessionContext,
      options?: {
        showToast?: boolean;
        message?: string;
      },
    ) => {
      pendingManualCompletionRef.current = false;
      cardPaymentPollingStoppedRef.current = true;
      cardPaymentAutoResumeActiveRef.current = false;
      cardPaymentProgressDismissedRef.current = false;
      stopCardPaymentPolling(currentContext);
      clearCardPaymentStoredContext(true);
      setCardPaymentVisible(false);
      setCardPaymentStatus("idle");
      setCardPaymentResultMessage("");
      setCardPaymentFailureDetails(null);
      setCardPaymentConfirmLoading(false);
      setCardPaymentCancelLoading(false);
      setCardPaymentLoading(false);

      if (options?.showToast && options.message) {
        CustomMessage.error(options.message);
      }
    },
    [clearCardPaymentStoredContext, stopCardPaymentPolling],
  );

  const stopCardPaymentAutoConfirmation = useCallback(
    (
      currentContext: CardPaymentSessionContext,
      message: string,
      options?: {
        showToast?: boolean;
        reopenModal?: boolean;
        clearStoredContext?: boolean;
        clearReturnMarker?: boolean;
        nextStatus?: CardPaymentUiStatus;
      },
    ) => {
      pendingManualCompletionRef.current = false;
      cardPaymentPollingStoppedRef.current = true;
      cardPaymentAutoResumeActiveRef.current = false;
      stopCardPaymentPolling(currentContext);
      const shouldReopenModal =
        options?.reopenModal ?? !cardPaymentProgressDismissedRef.current;

      if (options?.clearStoredContext) {
        clearCardPaymentStoredContext(options?.clearReturnMarker);
      } else {
        cardPaymentContextRef.current = currentContext;
        setCardPaymentContext(currentContext);

        if (options?.clearReturnMarker) {
          clearCardPaymentReturnMarker();
        }
      }

      setCardPaymentConfirmLoading(false);
      setCardPaymentCancelLoading(false);
      setCardPaymentLoading(false);
      setCardPaymentVisible(shouldReopenModal);
      setCardPaymentStatus(options?.nextStatus ?? "processing");
      setCardPaymentFailureDetails(null);
      setCardPaymentResultMessage(message);

      if (options?.showToast ?? true) {
        CustomMessage.error(message);
      }
    },
    [
      clearCardPaymentReturnMarker,
      clearCardPaymentStoredContext,
      stopCardPaymentPolling,
    ],
  );

  const scheduleCardPaymentInquiry = useCallback(
    (
      currentContext: CardPaymentSessionContext,
      delayMs = CARD_PAYMENT_INQUIRY_INTERVAL_MS,
    ) => {
      if (cardPaymentPollingTimeoutRef.current !== null) {
        window.clearTimeout(cardPaymentPollingTimeoutRef.current);
        cardPaymentPollingTimeoutRef.current = null;
      }

      if (isCardPaymentPollingStopped(currentContext)) {
        return;
      }

      if (
        hasCardPaymentAutoInquiryTimedOut(
          currentContext,
          CARD_PAYMENT_AUTO_CONFIRMATION_TIMEOUT_MS,
        )
      ) {
        stopCardPaymentAutoConfirmation(
          currentContext,
          cardPaymentMessage("timeout"),
        );
        return;
      }

      cardPaymentPollingTimeoutRef.current = window.setTimeout(() => {
        void handleCardPaymentInquiryRef.current?.({
          context: currentContext,
          silent: true,
          source: "polling",
        });
      }, delayMs);
    },
    [isCardPaymentPollingStopped, stopCardPaymentAutoConfirmation],
  );

  const resetCardPaymentFlow = useCallback(
    (nextStatus: CardPaymentUiStatus = "idle", clearReturnMarker = false) => {
      stopCardPaymentPolling(cardPaymentContextRef.current);
      pendingManualCompletionRef.current = false;
      pendingManualInquiryOptionsRef.current = null;
      cardPaymentCancelTransactionRef.current = null;
      cardPaymentPollingStoppedRef.current = false;
      cardPaymentAutoResumeActiveRef.current = false;
      cardPaymentProgressDismissedRef.current = false;

      if (nextStatus === "idle") {
        clearCardPaymentStoredContext(clearReturnMarker);
        setCardPaymentResultMessage("");
        setCardPaymentFailureDetails(null);
      } else if (clearReturnMarker) {
        clearCardPaymentReturnMarker();
      }

      setCardPaymentVisible(false);
      setCardPaymentConfirmLoading(false);
      setCardPaymentCancelLoading(false);
      setCardPaymentLoading(false);
      setCardPaymentStatus(nextStatus);
    },
    [
      clearCardPaymentReturnMarker,
      clearCardPaymentStoredContext,
      stopCardPaymentPolling,
    ],
  );

  const handleCardPaymentInquiry = useCallback(
    async (options?: CardPaymentInquiryOptions) => {
      const currentContext =
        options?.context ??
        cardPaymentContextRef.current ??
        readCardPaymentContextByApplication(Number(applicationId));
      const silent = options?.silent ?? false;
      const inquirySource = options?.source;
      const isManualInquiry = inquirySource === "manual";

      if (cardPaymentCancelInFlightRef.current) {
        if (isManualInquiry) {
          CustomMessage.warning(cardPaymentMessage("cancelPending"));
        }
        return;
      }

      if (isManualInquiry) {
        if (cardPaymentPollingTimeoutRef.current !== null) {
          window.clearTimeout(cardPaymentPollingTimeoutRef.current);
          cardPaymentPollingTimeoutRef.current = null;
        }
        if (options?.useCancelLoading) {
          setCardPaymentCancelLoading(true);
        } else {
          setCardPaymentConfirmLoading(true);
        }
      }

      if (
        options?.restartPolling &&
        cardPaymentPollingTimeoutRef.current !== null
      ) {
        window.clearTimeout(cardPaymentPollingTimeoutRef.current);
        cardPaymentPollingTimeoutRef.current = null;
      }

      if (!currentContext?.transactionNo) {
        if (!silent) {
          CustomMessage.error(
            cardPaymentMessage("sessionMissing"),
          );
        }
        resetCardPaymentFlow("idle", true);
        return;
      }

      if (
        inquirySource === "polling" &&
        cardPaymentCancelTransactionRef.current === currentContext.transactionNo
      ) {
        return;
      }

      if (cardPaymentInquiryInFlightRef.current) {
        if (isManualInquiry) {
          pendingManualCompletionRef.current = true;
          pendingManualInquiryOptionsRef.current = {
            context: currentContext,
            silent,
            restartPolling: options?.restartPolling,
            source: "manual",
            closeOnPending: options?.closeOnPending,
            useCancelLoading: options?.useCancelLoading,
          };
          return;
        }

        if (
          options?.restartPolling &&
          inquirySource === "polling" &&
          !isCardPaymentPollingStopped(currentContext)
        ) {
          scheduleCardPaymentInquiry(currentContext);
        }
        return;
      }

      if (inquirySource === "polling") {
        const acquiredPollingLease = tryAcquireCardPaymentPollingLease({
          applicationId: currentContext.applicationId,
          transactionNo: currentContext.transactionNo,
          ownerId: cardPaymentPollingOwnerIdRef.current,
          ttlMs: CARD_PAYMENT_POLLING_LEASE_TTL_MS,
        });

        if (!acquiredPollingLease) {
          if (!isCardPaymentPollingStopped(currentContext)) {
            scheduleCardPaymentInquiry(currentContext);
          }
          return;
        }
      }

      cardPaymentInquiryInFlightRef.current = true;
      if (isManualInquiry) {
        pendingManualCompletionRef.current = false;
        pendingManualInquiryOptionsRef.current = null;
      }
      if (inquirySource === "polling") {
        refreshCardPaymentPollingLease({
          applicationId: currentContext.applicationId,
          transactionNo: currentContext.transactionNo,
          ownerId: cardPaymentPollingOwnerIdRef.current,
          ttlMs: CARD_PAYMENT_POLLING_LEASE_TTL_MS,
        });
      }
      setCardPaymentContext(currentContext);
      cardPaymentContextRef.current = currentContext;
      setCardPaymentStatus("processing");

      if (
        (!silent || cardPaymentVisibleRef.current) &&
        !isCardPaymentPollingStopped(currentContext) &&
        !cardPaymentProgressDismissedRef.current
      ) {
        setCardPaymentVisible(true);
      }

      try {
        const responseData =
          options?.responseData ??
          unwrapPaymentCenterResponse<PaymentCenterCardPaymentInquiryResponse>(
            await inquiryCardPayment({
              transactionNo: currentContext.transactionNo,
              paymentId: currentContext.paymentId,
              tranId: currentContext.tranId,
              correlationId: currentContext.correlationId,
            }),
          );

        if (
          cardPaymentContextRef.current?.transactionNo !==
          currentContext.transactionNo
        ) {
          return;
        }

        const resolution = mapCardPaymentInquiryToUiState(responseData);

        if (
          inquirySource === "polling" &&
          cardPaymentCancelTransactionRef.current === currentContext.transactionNo
        ) {
          return;
        }

        if (inquirySource === "polling") {
          refreshCardPaymentPollingLease({
            applicationId: currentContext.applicationId,
            transactionNo: currentContext.transactionNo,
            ownerId: cardPaymentPollingOwnerIdRef.current,
            ttlMs: CARD_PAYMENT_POLLING_LEASE_TTL_MS,
          });
        }

        if (resolution.status === "query_failed") {
          const isTransactionNotFound = [
            resolution.message,
            responseData.customMessage,
            responseData.failureReason,
            responseData.errorMessage,
            responseData.errorCode,
          ].some((message) =>
            isCardPaymentTransactionNotFoundMessage(message),
          );
          const isSilentAutoResumeStaleContext =
            silent &&
            inquirySource === "polling" &&
            cardPaymentAutoResumeActiveRef.current &&
            isTransactionNotFound;

          if (isSilentAutoResumeStaleContext) {
            handleStaleCardPaymentContext(currentContext);
            return;
          }

          if (isTransactionNotFound) {
            handleStaleCardPaymentContext(currentContext, {
              showToast: !silent || isManualInquiry,
              message: cardPaymentMessage("queryFailed"),
            });
            return;
          }

          stopCardPaymentAutoConfirmation(
            currentContext,
            cardPaymentMessage("queryFailed"),
          );
          return;
        }

        const resultMessage = getLocalizedCardPaymentResultMessage(
          resolution.status,
        );
        setCardPaymentResultMessage(resultMessage);

        if (resolution.status === "success") {
          pendingManualCompletionRef.current = false;
          stopCardPaymentPolling(currentContext);
          cardPaymentAutoResumeActiveRef.current = false;
          clearCardPaymentStoredContext(true);
          setCardPaymentVisible(false);
          setCardPaymentFailureDetails(null);
          setCardPaymentStatus("success");
          setCardPaymentDocumentNumber(
            responseData.referenceNumber ||
              applicationDetail?.referenceNumber ||
              applicationDetail?.applicationNumber ||
              currentContext.referenceNumber ||
              currentContext.transactionNo,
          );
          refreshDetails();
          return;
        }

        if (resolution.status === "processing") {
          setCardPaymentStatus("processing");

          if (isManualInquiry) {
            if (options?.closeOnPending) {
              resetCardPaymentFlow("idle", true);
              return;
            }

            stopCardPaymentAutoConfirmation(
              currentContext,
              cardPaymentMessage("timeout"),
            );
            return;
          }

          cardPaymentContextRef.current = currentContext;
          setCardPaymentContext(currentContext);
          if (!isCardPaymentPollingStopped(currentContext)) {
            scheduleCardPaymentInquiry(currentContext);
          }
          return;
        }

        pendingManualCompletionRef.current = false;
        stopCardPaymentPolling(currentContext);
        cardPaymentAutoResumeActiveRef.current = false;
        clearCardPaymentStoredContext(true);
        setCardPaymentVisible(false);
        setCardPaymentStatus(resolution.status);
        setCardPaymentFailureDetails(
          buildCardPaymentFailureDetails({
            errorCode: responseData.errorCode || undefined,
            reason: resultMessage,
            transactionNo:
              responseData.transactionNo ||
              currentContext.transactionNo ||
              undefined,
            referenceNumber:
              responseData.referenceNumber ||
              applicationDetail?.referenceNumber ||
              applicationDetail?.applicationNumber ||
              currentContext.referenceNumber ||
              undefined,
            attemptedAmount: currentContext.amount,
            timestamp: formatCardPaymentTimestamp(Date.now()),
          }),
        );
      } catch (error) {
        if (
          cardPaymentContextRef.current?.transactionNo !==
          currentContext.transactionNo
        ) {
          return;
        }

        console.error("Failed to inquire card payment:", error);

        if (isManualInquiry) {
          stopCardPaymentAutoConfirmation(
            currentContext,
            cardPaymentMessage("queryFailed"),
          );
          return;
        }

        cardPaymentContextRef.current = currentContext;
        setCardPaymentContext(currentContext);
        setCardPaymentStatus("processing");
        setCardPaymentResultMessage(
          cardPaymentMessage("confirmationAutomatic"),
        );

        if (!silent) {
          CustomMessage.error(
            cardPaymentMessage("confirmationPending"),
          );
        }

        if (!isCardPaymentPollingStopped(currentContext)) {
          scheduleCardPaymentInquiry(currentContext);
        }
      } finally {
        cardPaymentInquiryInFlightRef.current = false;
        const pendingManualInquiryOptions =
          pendingManualInquiryOptionsRef.current;

        if (
          pendingManualCompletionRef.current &&
          pendingManualInquiryOptions &&
          !isCardPaymentPollingStopped(
            cardPaymentContextRef.current ?? currentContext,
          )
        ) {
          pendingManualCompletionRef.current = false;
          pendingManualInquiryOptionsRef.current = null;
          void handleCardPaymentInquiry({
            ...pendingManualInquiryOptions,
            context:
              cardPaymentContextRef.current ??
              pendingManualInquiryOptions.context ??
              currentContext,
          });
        } else {
          pendingManualCompletionRef.current = false;
          pendingManualInquiryOptionsRef.current = null;
          setCardPaymentConfirmLoading(false);
          setCardPaymentCancelLoading(false);
          setCardPaymentLoading(false);
        }
      }
    },
    [
      applicationDetail?.applicationNumber,
      applicationDetail?.referenceNumber,
      applicationId,
      clearCardPaymentStoredContext,
      handleStaleCardPaymentContext,
      isCardPaymentPollingStopped,
      refreshDetails,
      resetCardPaymentFlow,
      scheduleCardPaymentInquiry,
      stopCardPaymentAutoConfirmation,
      stopCardPaymentPolling,
    ],
  );

  useEffect(() => {
    handleCardPaymentInquiryRef.current = handleCardPaymentInquiry;
  }, [handleCardPaymentInquiry]);

  const handleCardPaymentCancel = useCallback(async () => {
    const currentContext =
      cardPaymentContextRef.current ??
      readCardPaymentContextByApplication(Number(applicationId));

    if (cardPaymentCancelInFlightRef.current) {
      return;
    }

    if (!currentContext?.transactionNo) {
      CustomMessage.error(
        cardPaymentMessage("sessionMissing"),
      );
      resetCardPaymentFlow("idle", true);
      return;
    }

    if (cardPaymentPollingTimeoutRef.current !== null) {
      window.clearTimeout(cardPaymentPollingTimeoutRef.current);
      cardPaymentPollingTimeoutRef.current = null;
    }

    cardPaymentCancelInFlightRef.current = true;
    cardPaymentCancelTransactionRef.current = currentContext.transactionNo;
    cardPaymentPollingStoppedRef.current = true;
    setCardPaymentCancelLoading(true);
    setCardPaymentStatus("processing");
    setCardPaymentVisible(true);
    setCardPaymentContext(currentContext);
    cardPaymentContextRef.current = currentContext;

    try {
      const responseData = unwrapPaymentCenterResponse(
        await cancelCardPaymentTransaction({
          transactionNo: currentContext.transactionNo,
        }),
      );
      const resolution = mapCardPaymentCancelToUiState(responseData);

      const resultMessage = getLocalizedCardPaymentResultMessage(
        resolution.status,
      );
      setCardPaymentResultMessage(resultMessage);

      if (resolution.status === "processing") {
        setCardPaymentFailureDetails(null);
        CustomMessage.warning(cardPaymentMessage("cancelPending"));
        return;
      }

      pendingManualCompletionRef.current = false;
      pendingManualInquiryOptionsRef.current = null;
      stopCardPaymentPolling(currentContext);
      cardPaymentAutoResumeActiveRef.current = false;

      clearCardPaymentStoredContext(true);
      setCardPaymentVisible(false);
      setCardPaymentStatus(resolution.status);

      if (resolution.status === "success") {
        setCardPaymentFailureDetails(null);
        setCardPaymentDocumentNumber(
          responseData.referenceNumber ||
            applicationDetail?.referenceNumber ||
            applicationDetail?.applicationNumber ||
            currentContext.referenceNumber ||
            currentContext.transactionNo,
        );
      } else {
        setCardPaymentFailureDetails(
          buildCardPaymentFailureDetails({
            reason: resultMessage,
            transactionNo:
              responseData.transactionNo || currentContext.transactionNo,
            referenceNumber:
              responseData.referenceNumber ||
              applicationDetail?.referenceNumber ||
              applicationDetail?.applicationNumber ||
              currentContext.referenceNumber,
            attemptedAmount: currentContext.amount,
            timestamp: formatCardPaymentTimestamp(Date.now()),
          }),
        );
      }

      refreshDetails();
    } catch (error) {
      console.error("Failed to cancel card payment:", error);

      if (getHttpStatusCode(error) === 404) {
        handleStaleCardPaymentContext(currentContext, {
          showToast: true,
          message: cardPaymentMessage("transactionNotFound"),
        });
        refreshDetails();
        return;
      }

      setCardPaymentContext(currentContext);
      cardPaymentContextRef.current = currentContext;
      setCardPaymentStatus("processing");
      setCardPaymentVisible(true);
      CustomMessage.error(cardPaymentMessage("cancelFailed"));
    } finally {
      cardPaymentCancelInFlightRef.current = false;
      setCardPaymentCancelLoading(false);
      setCardPaymentLoading(false);
    }
  }, [
    applicationDetail?.applicationNumber,
    applicationDetail?.referenceNumber,
    applicationId,
    clearCardPaymentStoredContext,
    handleStaleCardPaymentContext,
    refreshDetails,
    resetCardPaymentFlow,
    stopCardPaymentPolling,
  ]);

  const startCardPaymentPolling = useCallback(
    (currentContext: CardPaymentSessionContext, showModal = true) => {
      pendingManualCompletionRef.current = false;
      pendingManualInquiryOptionsRef.current = null;
      cardPaymentPollingStoppedRef.current = false;
      cardPaymentProgressDismissedRef.current = false;
      cardPaymentContextRef.current = currentContext;
      setCardPaymentContext(currentContext);
      setCardPaymentStatus("processing");
      setCardPaymentResultMessage("");

      if (showModal) {
        setCardPaymentVisible(true);
      }

      void handleCardPaymentInquiry({
        context: currentContext,
        silent: true,
        restartPolling: true,
        source: "polling",
      });
    },
    [handleCardPaymentInquiry],
  );

  const openHostedPaymentAndStartPolling = useCallback(
    (
      currentContext: CardPaymentSessionContext,
      hostedPaymentPageUrl: string,
      paymentWindow: Window,
      showModal = true,
    ) => {
      if (paymentWindow.closed) {
        resetCardPaymentFlow("idle", true);
        CustomMessage.error(cardPaymentMessage("purchaseFailed"));
        return false;
      }

      cardPaymentContextRef.current = currentContext;
      setCardPaymentContext(currentContext);
      setCardPaymentResultMessage("");
      setCardPaymentFailureDetails(null);

      startCardPaymentPolling(currentContext, showModal);
      const trustedHostedPaymentPageUrl =
        resolveTrustedPaymentUrl(hostedPaymentPageUrl);
      if (!trustedHostedPaymentPageUrl) {
        paymentWindow.close();
        resetCardPaymentFlow("idle", true);
        CustomMessage.error(cardPaymentMessage("purchaseFailed"));
        return false;
      }

      paymentWindow.opener = null;
      paymentWindow.location.href = trustedHostedPaymentPageUrl;
      return true;
    },
    [resetCardPaymentFlow, startCardPaymentPolling],
  );

  useEffect(() => {
    if (!applicationId || Number.isNaN(Number(applicationId))) {
      return;
    }

    if (!hasCardPaymentReturnFlag(search)) {
      return;
    }

    const storedContext = readCardPaymentContextByApplication(
      Number(applicationId),
    );

    if (!storedContext) {
      clearCardPaymentReturnMarker();
      return;
    }

    cardPaymentAutoResumeActiveRef.current = true;
    cardPaymentProgressDismissedRef.current = false;
    startCardPaymentPolling(
      storedContext,
      !(
        cardPaymentVisibleRef.current &&
        cardPaymentContextRef.current?.transactionNo ===
          storedContext.transactionNo
      ),
    );
  }, [
    applicationId,
    search,
    clearCardPaymentReturnMarker,
    startCardPaymentPolling,
  ]);

  const handleCardPaymentPurchase = useCallback(
    async (options?: CardPaymentPurchaseOptions) => {
      const targetApplicationId = Number(
        options?.applicationId ?? applicationId,
      );
      const targetApplicationDetail =
        options?.applicationDetail ?? applicationDetail;
      const targetRefreshDetails = options?.refreshDetails ?? refreshDetails;

      if (!targetApplicationId || Number.isNaN(targetApplicationId)) {
        CustomMessage.error(
          cardPaymentMessage("applicationMissing"),
        );
        return false;
      }

      if (!cardPaymentPurchaseLockRef.current.tryAcquire()) {
        if (options?.paymentWindow && !options.paymentWindow.closed) {
          options.paymentWindow.close();
        }
        return false;
      }

      const paymentWindow = options?.paymentWindow ?? window.open("", "_blank");
      if (!paymentWindow) {
        cardPaymentPurchaseLockRef.current.release();
        CustomMessage.error(
          createElement(
            "span",
            { className: "custom-message__text--error" },
            cardPaymentMessage("popupBlocked"),
          ),
        );
        return false;
      }
      if (paymentWindow.closed) {
        cardPaymentPurchaseLockRef.current.release();
        CustomMessage.error(cardPaymentMessage("purchaseFailed"));
        return false;
      }
      paymentWindow.opener = null;

      const previousContext =
        cardPaymentContextRef.current ??
        readCardPaymentContextByApplication(targetApplicationId);

      setCardPaymentLoading(true);
      setCardPaymentConfirmLoading(false);
      setCardPaymentVisible(false);
      setCardPaymentStatus("creating");
      setCardPaymentResultMessage("");
      setCardPaymentFailureDetails(null);
      pendingManualCompletionRef.current = false;
      pendingManualInquiryOptionsRef.current = null;
      cardPaymentCancelTransactionRef.current = null;
      cardPaymentPollingStoppedRef.current = false;
      cardPaymentAutoResumeActiveRef.current = false;
      cardPaymentProgressDismissedRef.current = false;
      let paymentPageOpened = false;

      try {
        const recoveryContext = isCardPaymentSessionRecoveryCandidate(
          previousContext,
          targetApplicationId,
        )
          ? previousContext
          : null;

        if (recoveryContext) {
          let recoveryInquiryData: PaymentCenterCardPaymentInquiryResponse;

          try {
            recoveryInquiryData =
              unwrapPaymentCenterResponse<PaymentCenterCardPaymentInquiryResponse>(
                await inquiryCardPayment({
                  transactionNo: recoveryContext.transactionNo,
                  paymentId: recoveryContext.paymentId,
                  tranId: recoveryContext.tranId,
                  correlationId: recoveryContext.correlationId,
                }),
              );
          } catch (error) {
            console.error("Failed to verify existing card payment:", error);
            stopCardPaymentAutoConfirmation(
              recoveryContext,
              cardPaymentMessage("queryFailed"),
            );
            return false;
          }

          const recoveryDecision = resolveCardPaymentSessionRecovery(
            recoveryContext,
            targetApplicationId,
            recoveryInquiryData,
          );

          if (!recoveryDecision) {
            stopCardPaymentAutoConfirmation(
              recoveryContext,
              cardPaymentMessage("queryFailed"),
            );
            return false;
          }

          if (recoveryDecision.type === "open-hosted-page") {
            paymentPageOpened = openHostedPaymentAndStartPolling(
              recoveryContext,
              recoveryDecision.hostedPaymentPageUrl,
              paymentWindow,
              true,
            );
            if (!paymentPageOpened) {
              return false;
            }
          } else if (recoveryDecision.type === "run-inquiry") {
            startCardPaymentPolling(recoveryContext, true);
          } else if (recoveryDecision.type === "discard-session") {
            stopCardPaymentPolling(recoveryContext);
            clearCardPaymentStoredContext(true);
          } else if (recoveryDecision.type === "retain-session") {
            stopCardPaymentAutoConfirmation(
              recoveryContext,
              cardPaymentMessage("queryFailed"),
            );
            return false;
          } else if (recoveryDecision.type === "final") {
            await handleCardPaymentInquiry({
              context: recoveryContext,
              responseData: recoveryInquiryData,
              silent: true,
              source: "manual",
            });
            return true;
          }

          if (
            recoveryDecision.type === "open-hosted-page" ||
            recoveryDecision.type === "run-inquiry"
          ) {
            CustomMessage.success(cardPaymentMessage("recovery"), 5);
            targetRefreshDetails?.();
            return true;
          }
        }

        const purchaseMode = resolveCardPaymentPurchaseMode(hasPayablePenalty);
        const validationResponse = await validateServiceApplicationPayNow({
          applicationIds: [targetApplicationId],
        });
        const validationData =
          unwrapPaymentCenterResponse<ServiceApplicationPayNowValidateResult>(
            validationResponse,
          );
        const validatedAmount = Number(validationData?.totalAmount);

        if (
          validationData?.canPayNow === false ||
          !Number.isFinite(validatedAmount) ||
          validatedAmount <= 0
        ) {
          resetCardPaymentFlow("idle", true);
          targetRefreshDetails?.();
          CustomMessage.error(cardPaymentMessage("notReady"));
          return false;
        }

        if (paymentWindow.closed) {
          resetCardPaymentFlow("idle", true);
          CustomMessage.error(cardPaymentMessage("purchaseFailed"));
          return false;
        }

        const purchaseAmount = validatedAmount;
        let paymentIntentOrderId: number | undefined;
        let responseData: PaymentCenterCardPaymentPurchaseResponse;

        if (purchaseMode === "merged") {
          const paymentOrderResponse = await getServiceApplicationPayment(
            targetApplicationId,
          );
          const paymentOrder =
            unwrapPaymentCenterResponse<ServiceApplicationPaymentOrderDto>(
              paymentOrderResponse,
            );
          const latestPaymentIntentOrderId = Number(
            paymentOrder?.paymentIntentOrderId,
          );

          if (
            !Number.isFinite(latestPaymentIntentOrderId) ||
            latestPaymentIntentOrderId <= 0
          ) {
            resetCardPaymentFlow("idle", true);
            CustomMessage.error(cardPaymentMessage("notReady"));
            return false;
          }

          paymentIntentOrderId = latestPaymentIntentOrderId;
          if (paymentWindow.closed) {
            resetCardPaymentFlow("idle", true);
            CustomMessage.error(cardPaymentMessage("purchaseFailed"));
            return false;
          }
          responseData = unwrapPaymentCenterResponse(
            await createMergedPurchase({ paymentIntentOrderId }),
          );
        } else {
          responseData = unwrapPaymentCenterResponse(
            await createServiceApplicationPurchase({
              applicationId: targetApplicationId,
              amount: validatedAmount,
              description: targetApplicationDetail?.applicationNumber
                ? `Application ${targetApplicationDetail.applicationNumber}`
                : undefined,
              languageId: mapLanguageToPaymentLanguage(
                localStorage.getItem("language"),
              ),
            }),
          );
        }

        if (!responseData?.success || !responseData?.transactionNo) {
          resetCardPaymentFlow("idle", true);
          CustomMessage.error(cardPaymentMessage("purchaseFailed"));
          return false;
        }

        const isRecreatedAfterExpiry =
          !!previousContext?.transactionNo &&
          previousContext.transactionNo !== responseData.transactionNo &&
          responseData.isRecovered === false;

        const nextContext: CardPaymentSessionContext = {
          applicationId: targetApplicationId,
          amount: purchaseAmount,
          transactionNo: responseData.transactionNo,
          pollingStartedAt: Date.now(),
          paymentId: responseData.paymentId,
          tranId: responseData.tranId || undefined,
          correlationId: responseData.correlationId || undefined,
          referenceNumber: responseData.referenceNumber,
          hostedPaymentPageUrl: responseData.hostedPaymentPageUrl,
          isRecovered: responseData.isRecovered,
          paymentIntentOrderId,
          businessType: "service-application",
        };

        saveCardPaymentContext(nextContext);

        if (responseData.isRecovered) {
          CustomMessage.success(cardPaymentMessage("recovery"), 5);
        } else if (isRecreatedAfterExpiry) {
          CustomMessage.success(cardPaymentMessage("recreated"), 5);
        }

        const shouldRunInquiryDirectly =
          (responseData.isRecovered === true &&
            responseData.nextAction === "RUN_INQUIRY") ||
          !responseData.hostedPaymentPageUrl;
        const hostedPaymentPageUrl = responseData.hostedPaymentPageUrl;

        if (shouldRunInquiryDirectly || !hostedPaymentPageUrl) {
          startCardPaymentPolling(nextContext, true);
        } else {
          paymentPageOpened = openHostedPaymentAndStartPolling(
            nextContext,
            hostedPaymentPageUrl,
            paymentWindow,
            true,
          );
          if (!paymentPageOpened) {
            return false;
          }
        }
        targetRefreshDetails?.();
        return true;
      } catch (error) {
        console.error("Failed to create card payment:", error);
        resetCardPaymentFlow("idle", true);
        targetRefreshDetails?.();
        CustomMessage.error(cardPaymentMessage("purchaseFailed"));
        return false;
      } finally {
        if (!paymentPageOpened && !paymentWindow.closed) {
          paymentWindow.close();
        }
        cardPaymentPurchaseLockRef.current.release();
        setCardPaymentLoading(false);
      }
    },
    [
      applicationId,
      hasPayablePenalty,
      applicationDetail,
      refreshDetails,
      clearCardPaymentStoredContext,
      handleCardPaymentInquiry,
      startCardPaymentPolling,
      resetCardPaymentFlow,
      openHostedPaymentAndStartPolling,
      stopCardPaymentAutoConfirmation,
      stopCardPaymentPolling,
    ],
  );

  const handleCardPaymentConfirmCompleted = useCallback(() => {
    void handleCardPaymentInquiry({
      silent: false,
      restartPolling: true,
      source: "manual",
    });
  }, [handleCardPaymentInquiry]);

  const handleCardPaymentProgressClose = useCallback(() => {
    return handleCardPaymentCancel();
  }, [handleCardPaymentCancel]);

  const handleCardPaymentTryAgain = useCallback(() => {
    void handleCardPaymentPurchase();
  }, [handleCardPaymentPurchase]);

  return {
    cardPaymentVisible,
    cardPaymentStatus,
    cardPaymentContext,
    cardPaymentLoading,
    cardPaymentConfirmLoading,
    cardPaymentCancelLoading,
    cardPaymentResultMessage,
    cardPaymentFailureDetails,
    cardPaymentDocumentNumber,
    handleCardPaymentPurchase,
    handleCardPaymentProgressClose,
    handleCardPaymentConfirmCompleted,
    handleCardPaymentTryAgain,
    resetCardPaymentFlow,
  };
};
