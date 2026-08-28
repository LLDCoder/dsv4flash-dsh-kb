import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import {
  AppealSubmissionSuccessModal,
  CardPaymentProgressModal,
} from "@/components/common";
import CustomButton from "@/components/common/CustomButton";
import CustomMessage from "@/components/common/CustomMessage";
import ActionFooter from "@/components/common/ActionFooter";
import PaymentMethodSelectionModal from "@/components/common/PaymentMethodSelectionModal";
import {
  getAppealViolationByNo,
  getAppealViolationPenaltyOrders,
  unwrapApiData,
  type AppealDetailDto,
} from "@/services/appeal";
import { submitViolationFineFeedbackRating } from "@/services/violationFine";
import {
  createViolationFineCardPurchase,
} from "@/services/violationFinePayment";
import {
  cancelCardPaymentTransaction,
  inquiryCardPayment,
  unwrapPaymentCenterResponse,
} from "@/services/paymentCenterCardPayment";
import type {
  AppealRecord,
  ViolationRecord,
} from "../ViolationsFines/utils/fixtures";
import type {
  DetailTabKey,
  ModuleLocationState,
  PayNowViolationState,
} from "../ViolationsFines/utils/types";
import { useViolationFineReceiptDownload } from "../ViolationsFines/hooks";
import {
  PageShell,
  StatusTag,
  SummaryCard,
} from "../ViolationsFines/components/PageShared";
import { SUMMARY_ICON_MAP } from "../ViolationsFines/components/summaryIcons";
import {
  EMPTY_VALUE,
  getViolationPaymentAmount,
  getRequestErrorMessage,
  getRouteReference,
  isAppealDecisionVisible,
  mapAppealViolationDetailToViolationRecord,
  mapAssociatedAppealToAppealRecord,
  normalizeReferenceValue,
} from "../ViolationsFines/utils/utils";
import {
  buildFinePaymentResultLocation,
  buildFinePaymentResultUrl,
  clearFineCardPaymentContext,
  getPaymentErrorStatusCode,
  mapFinePaymentCancelToUiState,
  navigateFinePaymentWindow,
  openFinePaymentWindow,
  readFineCardPaymentContext,
  saveFineCardPaymentContext,
  mapFinePaymentInquiryToUiState,
  type FineCardPaymentContext,
  type FinePaymentUiStatus,
} from "../ViolationsFines/utils/payment";
import DetailTabs from "../ViolationsFines/components/DetailTabs";
import SubmitAppealModal from "../ViolationsFines/components/SubmitAppealModal";
import {
  DecisionOnAppealCard,
  FineDetailsTable,
  ReportedViolationCard,
} from "../ViolationsFines/components/ViolationDetailCards";
import "./index.less";

const createViolationDetailPlaceholder = (
  fineReferenceNumber: string,
): ViolationRecord => {
  const placeholderId = fineReferenceNumber || "violation-detail-placeholder";

  return {
    id: placeholderId,
    fineReferenceNumber: placeholderId,
    violationNo: EMPTY_VALUE,
    violationType: EMPTY_VALUE,
    violator: EMPTY_VALUE,
    fineAmount: null,
    issuedTime: EMPTY_VALUE,
    status: "warningIssued",
    hasAppeal: false,
    canAppeal: false,
    canPay: false,
    canDownloadReceipt: false,
    reportedViolations: [
      {
        id: `${placeholderId}-reported-placeholder`,
        title: EMPTY_VALUE,
        description: EMPTY_VALUE,
        tag: EMPTY_VALUE,
        amount: null,
        attachments: [],
      },
    ],
    fineDetails: [
      {
        id: `${placeholderId}-fine-placeholder`,
        violation: EMPTY_VALUE,
        count: EMPTY_VALUE,
        amount: null,
      },
    ],
    totalFee: 0,
  };
};

interface PaymentTarget {
  fineReferenceNumber: string;
  violationNo: string;
  violationType?: string;
  amount: number | null;
}

const FINE_PAYMENT_INQUIRY_INTERVAL_MS = 2000;
const FINE_PAYMENT_AUTO_CONFIRMATION_TIMEOUT_MS = 30 * 60 * 1000;

const toPositivePaymentAmount = (
  ...values: Array<number | string | null | undefined>
) => {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }

  return null;
};

const isSameFineReference = (
  left: string | null | undefined,
  right: string | null | undefined,
) => {
  const normalizedLeft = normalizeReferenceValue(left);
  const normalizedRight = normalizeReferenceValue(right);
  return Boolean(normalizedLeft && normalizedLeft === normalizedRight);
};

const getStatePaymentTarget = (
  state: PayNowViolationState | undefined,
  routeFineReferenceNumber: string,
): PaymentTarget | null => {
  if (!state?.fineReferenceNumber) {
    return null;
  }

  if (!isSameFineReference(state.fineReferenceNumber, routeFineReferenceNumber)) {
    return null;
  }

  const fineReferenceNumber =
    state.fineReferenceNumber.trim() || routeFineReferenceNumber;

  return {
    fineReferenceNumber,
    violationNo: state.violationNo?.trim() || fineReferenceNumber,
    violationType: state.violationType,
    amount: toPositivePaymentAmount(state.totalFee, state.fineAmount),
  };
};

const getStoredPaymentTarget = (
  routeFineReferenceNumber: string,
): PaymentTarget | null => {
  const context = readFineCardPaymentContext();

  if (!context) {
    return null;
  }

  if (!isSameFineReference(context.fineReferenceNumber, routeFineReferenceNumber)) {
    return null;
  }

  return {
    fineReferenceNumber: context.fineReferenceNumber,
    violationNo: context.fineReferenceNumber,
    amount: toPositivePaymentAmount(context.amount),
  };
};

const hasFinePaymentAutoInquiryTimedOut = (
  context: Pick<FineCardPaymentContext, "createdAt">,
) => {
  return (
    Date.now() - context.createdAt >= FINE_PAYMENT_AUTO_CONFIRMATION_TIMEOUT_MS
  );
};

interface FinePaymentInquiryOptions {
  source: "polling" | "manual";
  closeOnPending?: boolean;
  useCancelLoading?: boolean;
}

const RelatedAppealCard = ({
  appeal,
}: {
  appeal?: ViolationRecord["appealSummary"];
}) => {
  const history = useHistory();
  const { t } = useTranslation();
  if (!appeal) return null;

  return (
    <div className="violations-fines-side-card">
      <h2 className="violations-fines-side-card__title">
        {t("violationsFinesPage.violationDetail.relatedAppeal.title")}
      </h2>
      <div className="violations-fines-side-card__panel">
        <div className="violations-fines-side-card__heading">
          <strong>{appeal.appealNo}</strong>
          <StatusTag status={appeal.status} kind="appeal" />
        </div>
        <div className="violations-fines-field">
          <span className="violations-fines-field__label">
            {t(
              "violationsFinesPage.violationDetail.relatedAppeal.appealReason",
            )}
          </span>
          <span className="violations-fines-field__value">
            {appeal.appealReason}
          </span>
        </div>
        <div className="violations-fines-field">
          <span className="violations-fines-field__label">
            {t("violationsFinesPage.violationDetail.relatedAppeal.appliedFor")}
          </span>
          <span className="violations-fines-field__value">
            {appeal.profileName}
          </span>
        </div>
        <div className="violations-fines-side-card__actions">
          <button
            className="violations-fines-outline-small"
            type="button"
            onClick={() =>
              history.push(`/violations-fines/appeals/${appeal.id}`)
            }
          >
            {t("violationsFinesPage.common.view")}
          </button>
        </div>
      </div>
    </div>
  );
};

const ViolationDetailPage = () => {
  const history = useHistory();
  const location = useLocation<ModuleLocationState | undefined>();
  const { t, i18n } = useTranslation();
  const fineReferenceNumber = getRouteReference(location.pathname);
  const payNowViolationState = location.state?.payNowViolation;
  const { downloadingReceiptId, downloadReceipt } =
    useViolationFineReceiptDownload();
  const [violation, setViolation] = useState<ViolationRecord | null>(null);
  const [relatedAppeal, setRelatedAppeal] = useState<
    AppealRecord | undefined
  >();
  const [detailLoading, setDetailLoading] = useState(true);
  const [activeDetailTab, setActiveDetailTab] =
    useState<DetailTabKey>("decision");
  const [submitAppealVisible, setSubmitAppealVisible] = useState(false);
  const [submittedAppeal, setSubmittedAppeal] =
    useState<AppealDetailDto | null>(null);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [cardPaymentProgressVisible, setCardPaymentProgressVisible] =
    useState(false);
  const [cardPaymentConfirmLoading, setCardPaymentConfirmLoading] =
    useState(false);
  const [cardPaymentCancelLoading, setCardPaymentCancelLoading] =
    useState(false);
  const finePaymentContextRef = useRef<FineCardPaymentContext | null>(null);
  const finePaymentPollingTimeoutRef = useRef<number | null>(null);
  const finePaymentPollingStoppedRef = useRef(false);
  const finePaymentFlowVersionRef = useRef(0);
  const finePaymentCancelInFlightRef = useRef(false);
  const handleFinePaymentInquiryRef =
    useRef<
      (
        context?: FineCardPaymentContext | null,
        options?: FinePaymentInquiryOptions,
      ) => Promise<void>
    >();
  const storedPaymentTarget = useMemo(
    () => getStoredPaymentTarget(fineReferenceNumber),
    [fineReferenceNumber],
  );
  const paymentTarget = useMemo<PaymentTarget>(
    () => {
      if (violation) {
        return {
          fineReferenceNumber: violation.fineReferenceNumber,
          violationNo: violation.violationNo,
          violationType: violation.violationType,
          amount: toPositivePaymentAmount(getViolationPaymentAmount(violation)),
        };
      }

      return (
        getStatePaymentTarget(payNowViolationState, fineReferenceNumber) ??
        storedPaymentTarget ?? {
          fineReferenceNumber,
          violationNo: fineReferenceNumber || EMPTY_VALUE,
          amount: null,
        }
      );
    },
    [fineReferenceNumber, payNowViolationState, storedPaymentTarget, violation],
  );
  const paymentAmount = paymentTarget.amount ?? 0;
  const displayViolation = useMemo(
    () => violation ?? createViolationDetailPlaceholder(fineReferenceNumber),
    [fineReferenceNumber, violation],
  );
  const showAppealDecision = violation
    ? isAppealDecisionVisible(violation)
    : false;
  const hasRelatedAppeal = Boolean(displayViolation.appealSummary);

  const fetchViolationDetail = useCallback(async () => {
    if (!fineReferenceNumber) {
      setViolation(null);
      setRelatedAppeal(undefined);
      setDetailLoading(false);
      return;
    }

    setDetailLoading(true);
    try {
      const [detailResult, penaltyOrdersResult] = await Promise.allSettled([
        getAppealViolationByNo(fineReferenceNumber),
        getAppealViolationPenaltyOrders(fineReferenceNumber),
      ]);

      if (detailResult.status !== "fulfilled") {
        throw detailResult.reason;
      }

      const detail = unwrapApiData(detailResult.value);
      const penaltyOrders =
        penaltyOrdersResult.status === "fulfilled"
          ? unwrapApiData(penaltyOrdersResult.value)
          : [];
      const isAr = i18n.language.startsWith("ar");
      const relatedAppealRecord = mapAssociatedAppealToAppealRecord(
        detail,
        isAr,
      );

      setRelatedAppeal(relatedAppealRecord);
      setViolation(
        mapAppealViolationDetailToViolationRecord(detail, penaltyOrders, isAr),
      );
    } catch (error) {
      setViolation(null);
      setRelatedAppeal(undefined);
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.loadViolationDetailFailed"),
        ),
      );
    } finally {
      setDetailLoading(false);
    }
  }, [fineReferenceNumber, i18n.language, t]);

  const handlePayNow = useCallback(() => {
    setPaymentMethodModalVisible(true);
  }, []);

  useEffect(() => {
    fetchViolationDetail();
  }, [fetchViolationDetail]);

  const handleAppealSubmitted = useCallback(
    (appeal: AppealDetailDto) => {
      setSubmittedAppeal(appeal);
      void fetchViolationDetail();
    },
    [fetchViolationDetail],
  );

  const handleAppealRatingSubmit = useCallback(
    async (rating: number) => {
      if (!submittedAppeal?.appealNo || !rating) return false;

      try {
        await submitViolationFineFeedbackRating({
          referenceNo: submittedAppeal.appealNo,
          rating,
        });
        CustomMessage.success(
          t("violationsFinesPage.messages.ratingSubmitted"),
        );
        return true;
      } catch {
        CustomMessage.error(
          t("violationsFinesPage.messages.ratingSubmitFailed"),
        );
        return false;
      }
    },
    [submittedAppeal?.appealNo, t],
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (detailLoading || searchParams.get("action") !== "payNow") {
      return;
    }

    handlePayNow();
    searchParams.delete("action");
    const nextSearch = searchParams.toString();
    history.replace({
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : "",
      state: location.state,
    });
  }, [
    detailLoading,
    handlePayNow,
    history,
    location.pathname,
    location.search,
    location.state,
  ]);

  const stopFinePaymentPolling = useCallback(() => {
    if (finePaymentPollingTimeoutRef.current !== null) {
      window.clearTimeout(finePaymentPollingTimeoutRef.current);
      finePaymentPollingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopFinePaymentPolling();
    };
  }, [stopFinePaymentPolling]);

  const navigateToFinePaymentResult = useCallback(
    (
      context: FineCardPaymentContext,
      pathname: string,
      result?: {
        status?: FinePaymentUiStatus;
      },
    ) => {
      finePaymentPollingStoppedRef.current = true;
      stopFinePaymentPolling();
      setCardPaymentProgressVisible(false);
      setCardPaymentConfirmLoading(false);
      setCardPaymentCancelLoading(false);
      setPaymentLoading(false);

      history.replace({
        ...buildFinePaymentResultLocation(
          pathname,
          context.fineReferenceNumber,
        ),
        state: {
          finePaymentContext: context,
          finePaymentInitialStatus: result?.status,
        },
      });
    },
    [history, stopFinePaymentPolling],
  );

  const finishFinePaymentCancellation = useCallback(() => {
    finePaymentFlowVersionRef.current += 1;
    finePaymentPollingStoppedRef.current = true;
    finePaymentCancelInFlightRef.current = false;
    stopFinePaymentPolling();
    clearFineCardPaymentContext();
    finePaymentContextRef.current = null;
    setCardPaymentProgressVisible(false);
    setCardPaymentConfirmLoading(false);
    setCardPaymentCancelLoading(false);
    setPaymentLoading(false);
    CustomMessage.success(t("violationsFinesPage.messages.paymentCancelled"));
    void fetchViolationDetail();
  }, [fetchViolationDetail, stopFinePaymentPolling, t]);

  const scheduleFinePaymentInquiry = useCallback(
    (
      context: FineCardPaymentContext,
      delayMs = FINE_PAYMENT_INQUIRY_INTERVAL_MS,
    ) => {
      stopFinePaymentPolling();

      if (finePaymentPollingStoppedRef.current) {
        return;
      }

      if (hasFinePaymentAutoInquiryTimedOut(context)) {
        finePaymentPollingStoppedRef.current = true;
        setCardPaymentProgressVisible(true);
        CustomMessage.error(
          t("violationsFinesPage.messages.paymentProcessing"),
        );
        return;
      }

      finePaymentPollingTimeoutRef.current = window.setTimeout(() => {
        void handleFinePaymentInquiryRef.current?.(context, {
          source: "polling",
        });
      }, delayMs);
    },
    [stopFinePaymentPolling, t],
  );

  const handleFinePaymentInquiry = useCallback(
    async (
      context?: FineCardPaymentContext | null,
      options: FinePaymentInquiryOptions = { source: "polling" },
    ) => {
      const currentContext =
        context ?? finePaymentContextRef.current ?? readFineCardPaymentContext();

      if (!currentContext?.transactionNo) {
        setCardPaymentProgressVisible(false);
        return;
      }

      finePaymentContextRef.current = currentContext;
      const flowVersion = finePaymentFlowVersionRef.current;

      if (options.source === "manual") {
        if (options.useCancelLoading) {
          setCardPaymentCancelLoading(true);
        } else {
          setCardPaymentConfirmLoading(true);
        }
      } else {
        setCardPaymentProgressVisible(true);
      }

      try {
        const inquiryResult = unwrapPaymentCenterResponse(
          await inquiryCardPayment({
            transactionNo: currentContext.transactionNo,
            paymentId: currentContext.paymentId,
          }),
        );
        const resolution = mapFinePaymentInquiryToUiState(inquiryResult);

        if (flowVersion !== finePaymentFlowVersionRef.current) {
          return;
        }

        if (resolution.status === "success") {
          navigateToFinePaymentResult(
            currentContext,
            "/violations-fines/payment/success",
          );
          return;
        }

        if (resolution.status === "cancelled") {
          finishFinePaymentCancellation();
          return;
        }

        if (resolution.status === "failed") {
          navigateToFinePaymentResult(
            currentContext,
            "/violations-fines/payment/failed",
          );
          return;
        }

        if (options.closeOnPending) {
          finePaymentPollingStoppedRef.current = true;
          stopFinePaymentPolling();
          setCardPaymentProgressVisible(false);
          CustomMessage.error(
            t("violationsFinesPage.messages.paymentProcessing"),
          );
          return;
        }

        setCardPaymentProgressVisible(true);

        if (options.source === "manual") {
          CustomMessage.error(
            t("violationsFinesPage.messages.paymentProcessing"),
          );
        }

        scheduleFinePaymentInquiry(currentContext);
      } catch (error) {
        if (flowVersion !== finePaymentFlowVersionRef.current) {
          return;
        }

        const errorMessage = getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.paymentConfirmFailed"),
        );

        if (options.closeOnPending) {
          finePaymentPollingStoppedRef.current = true;
          stopFinePaymentPolling();
          setCardPaymentProgressVisible(false);
          CustomMessage.error(errorMessage);
          return;
        }

        setCardPaymentProgressVisible(true);

        if (options.source === "manual") {
          CustomMessage.error(errorMessage);
        }

        scheduleFinePaymentInquiry(currentContext);
      } finally {
        if (flowVersion === finePaymentFlowVersionRef.current) {
          setCardPaymentConfirmLoading(false);
          setCardPaymentCancelLoading(false);
        }
      }
    },
    [
      finishFinePaymentCancellation,
      navigateToFinePaymentResult,
      scheduleFinePaymentInquiry,
      stopFinePaymentPolling,
      t,
    ],
  );

  useEffect(() => {
    handleFinePaymentInquiryRef.current = handleFinePaymentInquiry;
  }, [handleFinePaymentInquiry]);

  const startFinePaymentPolling = useCallback(
    (context: FineCardPaymentContext) => {
      finePaymentFlowVersionRef.current += 1;
      finePaymentPollingStoppedRef.current = false;
      finePaymentContextRef.current = context;
      setCardPaymentProgressVisible(true);
      setCardPaymentConfirmLoading(false);
      setCardPaymentCancelLoading(false);
      void handleFinePaymentInquiry(context, { source: "polling" });
    },
    [handleFinePaymentInquiry],
  );

  const handleFinePaymentCancel = useCallback(async () => {
    const currentContext =
      finePaymentContextRef.current ?? readFineCardPaymentContext();

    if (finePaymentCancelInFlightRef.current) {
      return;
    }

    if (!currentContext?.transactionNo) {
      setCardPaymentProgressVisible(false);
      CustomMessage.error(
        t("violationsFinesPage.paymentResult.status.missingDescription"),
      );
      return;
    }

    finePaymentCancelInFlightRef.current = true;
    finePaymentFlowVersionRef.current += 1;
    const flowVersion = finePaymentFlowVersionRef.current;
    finePaymentPollingStoppedRef.current = true;
    stopFinePaymentPolling();
    finePaymentContextRef.current = currentContext;
    setCardPaymentProgressVisible(true);
    setCardPaymentCancelLoading(true);

    try {
      const response = await cancelCardPaymentTransaction({
        transactionNo: currentContext.transactionNo,
      });
      const responseData = unwrapPaymentCenterResponse(response);
      const resolution = mapFinePaymentCancelToUiState(responseData);

      if (flowVersion !== finePaymentFlowVersionRef.current) {
        return;
      }

      if (resolution.status === "processing") {
        CustomMessage.warning(
          t("violationsFinesPage.messages.paymentProcessing"),
        );
        return;
      }

      if (resolution.status === "cancelled") {
        finishFinePaymentCancellation();
        return;
      }

      clearFineCardPaymentContext();
      navigateToFinePaymentResult(
        {
          ...currentContext,
          referenceNumber:
            responseData.referenceNumber || currentContext.referenceNumber,
        },
        "/violations-fines/payment/success",
        {
          status: resolution.status,
        },
      );
    } catch (error) {
      if (flowVersion !== finePaymentFlowVersionRef.current) {
        return;
      }

      console.error("Failed to cancel fine card payment:", error);

      if (getPaymentErrorStatusCode(error) === 404) {
        clearFineCardPaymentContext();
        finePaymentContextRef.current = null;
        setCardPaymentProgressVisible(false);
        void fetchViolationDetail();
        CustomMessage.error(
          t("violationsFinesPage.paymentResult.status.missingDescription"),
        );
        return;
      }

      setCardPaymentProgressVisible(true);
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.paymentConfirmFailed"),
        ),
      );
    } finally {
      if (flowVersion === finePaymentFlowVersionRef.current) {
        finePaymentCancelInFlightRef.current = false;
        setCardPaymentCancelLoading(false);
      }
    }
  }, [
    fetchViolationDetail,
    finishFinePaymentCancellation,
    navigateToFinePaymentResult,
    stopFinePaymentPolling,
    t,
  ]);

  const handleCardPaymentProgressClose = useCallback(() => {
    return handleFinePaymentCancel();
  }, [handleFinePaymentCancel]);

  const handleCardPaymentConfirmCompleted = useCallback(() => {
    void handleFinePaymentInquiry(finePaymentContextRef.current, {
      source: "manual",
    });
  }, [handleFinePaymentInquiry]);

  const handlePaymentMethodModalClose = () => {
    setPaymentMethodModalVisible(false);
  };

  const handlePaymentMethodProceed = async () => {
    if (paymentLoading) {
      return;
    }

    if (!paymentTarget.amount) {
      CustomMessage.error(
        t("violationsFinesPage.violationDetail.payment.detailUnavailable"),
      );
      return;
    }

    const paymentWindow = openFinePaymentWindow();
    if (!paymentWindow) {
      CustomMessage.error(
        <span className="custom-message__text--error">
          {t("violationsFinesPage.violationDetail.payment.popupBlocked")}
        </span>,
      );
      return;
    }

    setPaymentLoading(true);
    let paymentPageOpened = false;
    try {
      const response = await createViolationFineCardPurchase({
        fineReferenceNumber: paymentTarget.fineReferenceNumber,
        amount: paymentTarget.amount,
        responseUrl: buildFinePaymentResultUrl(
          "/violations-fines/payment/success",
          paymentTarget.fineReferenceNumber,
        ),
        errorUrl: buildFinePaymentResultUrl(
          "/violations-fines/payment/failed",
          paymentTarget.fineReferenceNumber,
        ),
        description: t(
          "violationsFinesPage.violationDetail.payment.description",
          {
            reference: paymentTarget.violationNo,
          },
        ),
        languageId: i18n.language.startsWith("ar") ? "AR" : "EN",
      });

      if (response.transactionNo && response.paymentUrl) {
        if (!navigateFinePaymentWindow(paymentWindow, response.paymentUrl)) {
          CustomMessage.error(
            t("violationsFinesPage.violationDetail.payment.startFailed"),
          );
          return;
        }
        paymentPageOpened = true;

        const nextPaymentContext: FineCardPaymentContext = {
          fineReferenceNumber: paymentTarget.fineReferenceNumber,
          amount: paymentTarget.amount,
          transactionNo: response.transactionNo,
          createdAt: Date.now(),
          paymentId: response.paymentId,
          referenceNumber: response.referenceNumber,
          hostedPaymentPageUrl: response.paymentUrl,
          isRecovered: response.isRecovered,
        };

        saveFineCardPaymentContext(nextPaymentContext);
        setPaymentMethodModalVisible(false);
        startFinePaymentPolling(nextPaymentContext);
        return;
      }

      CustomMessage.error(
        t("violationsFinesPage.violationDetail.payment.startFailed"),
      );
    } catch (error) {
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.violationDetail.payment.startFailed"),
        ),
      );
    } finally {
      if (!paymentPageOpened && !paymentWindow.closed) {
        paymentWindow.close();
      }
      setPaymentLoading(false);
    }
  };

  if (detailLoading) {
    return (
      <PageShell>
        <div className="violations-fines-detail-loading">
          {t("violationsFinesPage.violationDetail.loading")}
        </div>
      </PageShell>
    );
  }

  const detailActions = (() => {
    if (!violation) {
      return null;
    }

    const secondaryAction = (() => {
      if (violation.status === "paid") {
        const receiptDownloadId =
          violation.receiptTransactionNo || violation.receiptNo;

        return (
          <CustomButton
            text={t("violationsFinesPage.common.downloadReceipt")}
            variant="primary"
            loading={downloadingReceiptId === receiptDownloadId}
            onClick={() => {
              void downloadReceipt({
                transactionNo: violation.receiptTransactionNo,
                receiptNo: violation.receiptNo,
              });
            }}
          />
        );
      }

      if (showAppealDecision) {
        return violation.canPay ? (
          <CustomButton
            text={t("violationsFinesPage.common.payNow")}
            variant="primary"
            onClick={handlePayNow}
          />
        ) : null;
      }

      if (violation.status === "underAppeal") {
        return null;
      }

      return violation.canPay ? (
        <CustomButton
          text={t("violationsFinesPage.common.payNow")}
          variant="primary"
          onClick={handlePayNow}
        />
      ) : null;
    })();

    const appealAction = violation.canAppeal ? (
      <CustomButton
        text={t("violationsFinesPage.common.appeal")}
        variant={secondaryAction ? "outline" : "primary"}
        onClick={() => setSubmitAppealVisible(true)}
      />
    ) : null;

    if (!appealAction && !secondaryAction) {
      return null;
    }

    return (
      <>
        {appealAction}
        {secondaryAction}
      </>
    );
  })();

  return (
    <PageShell>
      <SummaryCard
        items={[
          {
            label: t(
              "violationsFinesPage.violationDetail.summary.violationNumber",
            ),
            value: displayViolation.violationNo,
            icon: SUMMARY_ICON_MAP.violationNumber,
          },
          {
            label: t(
              "violationsFinesPage.violationDetail.summary.violationType",
            ),
            value: displayViolation.violationType,
            icon: SUMMARY_ICON_MAP.violationType,
          },
          {
            label: t("violationsFinesPage.violationDetail.summary.status"),
            value: violation ? (
              <StatusTag status={violation.status} kind="violation" />
            ) : (
              EMPTY_VALUE
            ),
            icon: SUMMARY_ICON_MAP.status,
          },
          {
            label: t("violationsFinesPage.violationDetail.summary.issuedTime"),
            value: displayViolation.issuedTime,
            icon: SUMMARY_ICON_MAP.issuedTime,
          },
        ]}
      />
      <div
        className={`violations-fines-detail-layout${
          hasRelatedAppeal ? "" : " violations-fines-detail-layout--single"
        }`}
      >
        <div className="violations-fines-detail-layout__main">
          {showAppealDecision ? (
            <div className="violations-fines-appeal-decision-panel">
              <DetailTabs
                activeKey={activeDetailTab}
                onChange={setActiveDetailTab}
              />
              {activeDetailTab === "decision" ? (
                <DecisionOnAppealCard
                  violation={displayViolation}
                  relatedAppeal={relatedAppeal}
                />
              ) : (
                <ReportedViolationCard
                  items={displayViolation.reportedViolations}
                  showTitle={false}
                />
              )}
            </div>
          ) : (
            <ReportedViolationCard items={displayViolation.reportedViolations} />
          )}
          <FineDetailsTable
            items={displayViolation.fineDetails}
            totalFee={violation ? violation.totalFee : null}
            violationTypeId={displayViolation.violationTypeId}
          />
        </div>
        {hasRelatedAppeal ? (
          <div className="violations-fines-detail-layout__side">
            <RelatedAppealCard appeal={displayViolation.appealSummary} />
          </div>
        ) : null}
      </div>
      <ActionFooter
        onBack={() => history.push("/violations-fines")}
        actions={detailActions}
      />
      {submitAppealVisible && violation ? (
        <SubmitAppealModal
          visible={submitAppealVisible}
          initialViolationId={violation.appealViolationId}
          onCancel={() => setSubmitAppealVisible(false)}
          onSubmitted={handleAppealSubmitted}
        />
      ) : null}
      <AppealSubmissionSuccessModal
        visible={Boolean(submittedAppeal)}
        appealNumber={submittedAppeal?.appealNo ?? ""}
        onClose={() => setSubmittedAppeal(null)}
        onSubmitRating={handleAppealRatingSubmit}
      />
      <PaymentMethodSelectionModal
        visible={paymentMethodModalVisible}
        onCancel={handlePaymentMethodModalClose}
        onProceed={handlePaymentMethodProceed}
        totalAmount={paymentAmount}
        items={[{
          title: paymentTarget.violationType ?? "",
          reference: paymentTarget.fineReferenceNumber,
          amount: paymentAmount,
        }]}
      />
      <CardPaymentProgressModal
        visible={cardPaymentProgressVisible}
        amount={finePaymentContextRef.current?.amount ?? paymentAmount}
        confirmLoading={cardPaymentConfirmLoading}
        cancelLoading={cardPaymentCancelLoading}
        onClose={handleCardPaymentProgressClose}
        onConfirmCompleted={handleCardPaymentConfirmCompleted}
      />
    </PageShell>
  );
};

export default ViolationDetailPage;
