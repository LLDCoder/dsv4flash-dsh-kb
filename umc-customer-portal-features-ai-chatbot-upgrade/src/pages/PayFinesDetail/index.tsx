import { useCallback, useEffect, useRef, useState } from "react";
import { CopyOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import paymentSuccessIcon from "@/assets/icons/pay-fines/modal-success.svg";
import loginLogo from "@/assets/images/login-logo.png";
import CardPaymentProgressModal from "@/components/common/CardPaymentProgressModal";
import LangMenu from "@/components/common/LangMenu";
import PaymentMethodSelectionModal from "@/components/common/PaymentMethodSelectionModal";
import {
  CustomButton,
  PaymentSuccessFeedback,
} from "@/components/common";
import CustomMessage from "@/components/common/CustomMessage";
import SimpleBar from "@/components/SimpleBar";
import Footer from "@/layout/Footer";
import CardPaymentFailurePage from "@/pages/Detail/CardPayment/CardPaymentFailurePage";
import CardPaymentResultShell from "@/pages/Detail/CardPayment/CardPaymentResultShell";
import {
  cancelViolationFineCardPayment,
  downloadViolationFineReceiptMetadata,
  getViolationFineDetail,
  inquireViolationFineBatchPaymentStatus,
  prevalidateViolationFinePayment,
  resolveViolationFineCancelPayment,
  submitViolationFinePayment,
  submitViolationFineFeedbackRating,
  VIOLATION_FINE_RECEIPT_STATUS_POLL_INTERVAL_MS,
  VIOLATION_FINE_PAYMENT_STATUS_POLL_INTERVAL_MS,
  VIOLATION_FINE_PAYMENT_STATUS_TIMEOUT_MS,
} from "@/services/violationFine";
import { copyToClipboard } from "@/utils/copy";
import type {
  PayFineDetailDto,
  ViolationFinePaymentResult,
  ViolationFinePaymentStatus,
  ViolationFineReceiptMetadata,
} from "@/services/violationFine";
import { history } from "@/utils/history";
import DetailTabs from "@/pages/ViolationsFines/components/DetailTabs";
import {
  StatusTag,
  SummaryCard,
} from "@/pages/ViolationsFines/components/PageShared";
import { SUMMARY_ICON_MAP } from "@/pages/ViolationsFines/components/summaryIcons";
import {
  DecisionOnAppealCard,
  FineDetailsTable,
  ReportedViolationCard,
} from "@/pages/ViolationsFines/components/ViolationDetailCards";
import type { DetailTabKey } from "@/pages/ViolationsFines/utils/types";
import { openFinePaymentWindow } from "@/pages/ViolationsFines/utils/payment";
import {
  arePaymentReceiptsReady,
  beginPendingPaymentAttempt,
  clearPendingPaymentContext,
  readPendingPaymentContext,
  savePendingPaymentContext,
  shouldRetainPendingPaymentContext,
} from "@/pages/PayFines/paymentContext";
import {
  isAppealDecisionVisible,
  mapPayFineDetailRelatedAppeal,
  mapPayFineDetailToViolationRecord,
} from "@/pages/ViolationsFines/utils/utils";
import "@/pages/Detail/CardPayment/CardPaymentSuccessPage/index.less";
import "./index.less";

const PAYMENT_PROGRESS_DESCRIPTION_KEY = {
  processing: "processing.description",
  unknown: "unknown.description",
} as const;

const normalize = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isPendingPayment = (status?: string | null) => normalize(status) === "pending payment";

const getPayableAmount = (detail?: PayFineDetailDto | null) => {
  const amount = Number(detail?.totalFee ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

type SinglePaymentResult = {
  status: ViolationFinePaymentStatus | "cancelled";
  fineReferenceNumber: string;
  amount: number;
  transactionNo?: string;
  paymentId?: string;
  correlationId?: string;
  receiptsReady?: boolean;
  receipt?: ViolationFineReceiptMetadata;
  descriptionKey?: string;
  description?: string;
} | null;

const getErrorMessage = (_error: unknown, fallback: string) => fallback;

const getErrorStatusCode = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  const value = error as {
    statusCode?: unknown;
    response?: { status?: unknown; data?: { statusCode?: unknown } };
  };
  const statusCode =
    value.statusCode ?? value.response?.data?.statusCode ?? value.response?.status;
  return typeof statusCode === "number" ? statusCode : undefined;
};

export default function PayFinesDetail() {
  const { i18n, t } = useTranslation();
  const mountedRef = useRef(true);
  const paymentTransactionRef = useRef<{
    transactionNo: string;
    paymentId: string;
    correlationId: string;
    fineReference: string;
    amount: number;
  } | null>(null);
  const paymentConfirmInFlightRef = useRef(false);
  const paymentCancelInFlightRef = useRef(false);
  const paymentPollingInFlightRef = useRef(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || "en");
  const [detail, setDetail] = useState<PayFineDetailDto | null>(null);
  const [fineReferenceNumber, setFineReferenceNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState("");
  const [paymentResult, setPaymentResult] = useState<SinglePaymentResult>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentConfirmLoading, setPaymentConfirmLoading] = useState(false);
  const [paymentCancelLoading, setPaymentCancelLoading] = useState(false);
  const [paymentReceipt, setPaymentReceipt] =
    useState<ViolationFineReceiptMetadata | null>(null);
  const [paymentReceiptLoading, setPaymentReceiptLoading] = useState(false);
  const [paymentMethodVisible, setPaymentMethodVisible] = useState(false);
  const [paymentProgressVisible, setPaymentProgressVisible] = useState(false);
  const [paymentPollingTransactionNo, setPaymentPollingTransactionNo] =
    useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabKey>("decision");

  const eligibleForActions = isPendingPayment(detail?.status);
  const canPayFine =
    eligibleForActions && detail?.canPay !== false && !detail?.isPaymentProcessing;

  const handleLanguageChange = (lng: string) => {
    setCurrentLang(lng);
  };

  const goBackToPayFines = () => {
    history.push("/pay-fines");
  };

  const loadFineDetail = useCallback(async (fineNumber: string, silent = false) => {
    if (!silent) {
      setLoading(true);
      setErrorKey("");
    }

    try {
      const response = await getViolationFineDetail(fineNumber);
      if (!mountedRef.current) return;

      const data = response.data;
      if (!data || (!data.fineNumber && !data.violationNumber)) {
        if (!silent) {
          setDetail(null);
          setErrorKey("payFinesDetail.errors.detailUnavailable");
        }
        return;
      }

      setDetail(data);
      setFineReferenceNumber(data.fineNumber || data.violationNumber || fineNumber);
    } catch {
      if (mountedRef.current && !silent) {
        setDetail(null);
        setErrorKey("payFinesDetail.errors.detailUnavailable");
      }
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      paymentTransactionRef.current = null;
      paymentConfirmInFlightRef.current = false;
      paymentCancelInFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fineNumber = new URLSearchParams(window.location.search).get("fineNumber")?.trim();

    if (!fineNumber) {
      setFineReferenceNumber("");
      setDetail(null);
      setErrorKey("payFinesDetail.errors.missingFineNumber");
      setLoading(false);
      return;
    }

    setFineReferenceNumber(fineNumber);
    const storedPaymentContext = readPendingPaymentContext();
    if (
      storedPaymentContext?.transactionNo &&
      storedPaymentContext.paymentId &&
      storedPaymentContext.correlationId &&
      storedPaymentContext.fineReferenceNumbers.length === 1 &&
      storedPaymentContext.fineReferenceNumbers[0].trim() === fineNumber
    ) {
      paymentTransactionRef.current = {
        transactionNo: storedPaymentContext.transactionNo,
        paymentId: storedPaymentContext.paymentId,
        correlationId: storedPaymentContext.correlationId,
        fineReference: fineNumber,
        amount: storedPaymentContext.amount,
      };
      setPaymentResult(null);
      setPaymentReceipt(null);
      setPaymentProgressVisible(true);
      setPaymentPollingTransactionNo(storedPaymentContext.transactionNo);
    }
    void loadFineDetail(fineNumber);
  }, [loadFineDetail]);

  const handlePaymentFeedbackSubmit = async (rating: number) => {
    const referenceNo = paymentResult?.fineReferenceNumber;

    if (!rating || paymentResult?.status !== "success" || !referenceNo) {
      CustomMessage.error(t("payFinesDetail.messages.ratingSubmitFailed"));
      return false;
    }

    try {
      await submitViolationFineFeedbackRating({ referenceNo, rating });
      CustomMessage.success(t("payFinesDetail.messages.ratingSubmitted"));
      return true;
    } catch (error) {
      CustomMessage.error(
        getErrorMessage(error, t("payFinesDetail.messages.ratingSubmitFailed")),
      );
      return false;
    }
  };

  const handleDownloadReceipt = () => {
    if (!paymentResult?.fineReferenceNumber) {
      return;
    }

    setPaymentReceiptLoading(true);
    downloadViolationFineReceiptMetadata(
      paymentResult.fineReferenceNumber,
      paymentResult.receipt,
    )
      .then((response) => {
        if (mountedRef.current && response.data) {
          setPaymentReceipt(response.data);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          CustomMessage.error(t("payFinesDetail.payment.receiptLoadFailed"));
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setPaymentReceiptLoading(false);
        }
      });
  };

  const getPaymentInput = () => {
    const fineReference = (
      fineReferenceNumber ||
      detail?.fineNumber ||
      detail?.violationNumber ||
      ""
    ).trim();
    const amount = getPayableAmount(detail);

    if (!canPayFine || !fineReference || amount <= 0) {
      return null;
    }

    return { fineReference, amount };
  };


  const applyCardPaymentResult = useCallback((
    payment: ViolationFinePaymentResult | undefined | null,
    fineReference: string,
    amount: number,
  ) => {
    const status: ViolationFinePaymentStatus = payment?.status ?? "unknown";
    const paymentReceipts = payment?.receipts ?? [];
    const receiptsReady =
      status === "success" &&
      arePaymentReceiptsReady(
        payment?.receiptsReady,
        [fineReference],
        paymentReceipts,
      );
    const receipt = receiptsReady ? paymentReceipts[0] : undefined;

    if (status === "processing" || status === "unknown") {
      setPaymentProgressVisible(true);
      setPaymentResult(null);
      setPaymentReceipt(null);
      CustomMessage.info(
        t(`payFines.payment.${PAYMENT_PROGRESS_DESCRIPTION_KEY[status]}`),
      );
      return;
    }

    if (!shouldRetainPendingPaymentContext(status, receiptsReady)) {
      clearPendingPaymentContext(paymentTransactionRef.current?.transactionNo);
      paymentTransactionRef.current = null;
    }
    setPaymentPollingTransactionNo(null);
    if (status === "failed") {
      console.error("Violation fine card payment was not completed:", payment);
    }

    setPaymentProgressVisible(false);
    setPaymentResult({
      status,
      fineReferenceNumber: fineReference,
      amount,
      transactionNo: payment?.transactionNo,
      paymentId: payment?.paymentId,
      correlationId: payment?.correlationId,
      receiptsReady,
      receipt,
      description: payment?.message,
      descriptionKey:
        status === "failed" ? "payFines.payment.failed.description" : undefined,
    });
    setPaymentReceipt(receipt ?? null);

    if (status === "success" && payment?.success) {
      setDetail((previous) =>
        previous
          ? {
              ...previous,
              status: "Paid",
              transactionNo: payment.transactionNo,
              receiptNo: receipt?.receiptNo ?? previous.receiptNo,
            }
          : previous,
      );
    }
  }, [t]);

  useEffect(() => {
    const context = paymentTransactionRef.current;

    if (
      !paymentProgressVisible ||
      !paymentPollingTransactionNo ||
      !context ||
      context.transactionNo !== paymentPollingTransactionNo
    ) {
      return undefined;
    }

    const pollingStartedAt = Date.now();
    let disposed = false;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const inquirePaymentStatus = async () => {
      if (
        disposed ||
        paymentPollingInFlightRef.current ||
        Date.now() - pollingStartedAt >=
          VIOLATION_FINE_PAYMENT_STATUS_TIMEOUT_MS
      ) {
        if (
          Date.now() - pollingStartedAt >=
          VIOLATION_FINE_PAYMENT_STATUS_TIMEOUT_MS
        ) {
          stopPolling();
        }
        return;
      }

      paymentPollingInFlightRef.current = true;

      try {
        const response = await inquireViolationFineBatchPaymentStatus({
          batchTransactionNo: paymentPollingTransactionNo,
          paymentId: context.paymentId,
          correlationId: context.correlationId,
        });

        if (
          disposed ||
          !mountedRef.current ||
          paymentCancelInFlightRef.current ||
          paymentTransactionRef.current?.transactionNo !==
            paymentPollingTransactionNo
        ) {
          return;
        }

        if (
          response.data?.status === "processing" ||
          response.data?.status === "unknown"
        ) {
          return;
        }

        applyCardPaymentResult(
          response.data,
          context.fineReference,
          context.amount,
        );
      } catch {
        // Continue polling while the payment result remains unresolved.
      } finally {
        paymentPollingInFlightRef.current = false;
      }
    };

    void inquirePaymentStatus();
    intervalId = window.setInterval(
      () => void inquirePaymentStatus(),
      VIOLATION_FINE_PAYMENT_STATUS_POLL_INTERVAL_MS,
    );
    const timeoutId = window.setTimeout(
      stopPolling,
      VIOLATION_FINE_PAYMENT_STATUS_TIMEOUT_MS,
    );

    return () => {
      disposed = true;
      stopPolling();
      window.clearTimeout(timeoutId);
    };
  }, [
    applyCardPaymentResult,
    paymentPollingTransactionNo,
    paymentProgressVisible,
  ]);

  const pendingReceiptBatchTransactionNo =
    paymentResult?.status === "success" && paymentResult.receiptsReady !== true
      ? paymentResult.transactionNo ?? null
      : null;
  const pendingReceiptPaymentId = pendingReceiptBatchTransactionNo
    ? paymentResult?.paymentId ?? null
    : null;
  const pendingReceiptCorrelationId = pendingReceiptBatchTransactionNo
    ? paymentResult?.correlationId ?? null
    : null;
  const pendingReceiptFineReferenceNumber = pendingReceiptBatchTransactionNo
    ? paymentResult?.fineReferenceNumber ?? null
    : null;

  useEffect(() => {
    if (
      !pendingReceiptBatchTransactionNo ||
      !pendingReceiptPaymentId ||
      !pendingReceiptCorrelationId ||
      !pendingReceiptFineReferenceNumber
    ) {
      return undefined;
    }

    let disposed = false;
    let requestInFlight = false;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const inquirePaymentReceipt = async () => {
      if (disposed || requestInFlight) return;

      requestInFlight = true;
      try {
        const response = await inquireViolationFineBatchPaymentStatus({
          batchTransactionNo: pendingReceiptBatchTransactionNo,
          paymentId: pendingReceiptPaymentId,
          correlationId: pendingReceiptCorrelationId,
        });
        const payment = response.data;
        const receipts = payment?.receipts ?? [];
        const receipt = receipts[0];

        if (
          disposed ||
          !mountedRef.current ||
          payment?.status !== "success" ||
          !receipt ||
          !arePaymentReceiptsReady(
            payment.receiptsReady,
            [pendingReceiptFineReferenceNumber],
            receipts,
          )
        ) {
          return;
        }

        setPaymentResult((current) => {
          if (
            current?.status !== "success" ||
            current.transactionNo !== pendingReceiptBatchTransactionNo ||
            current.fineReferenceNumber !== pendingReceiptFineReferenceNumber
          ) {
            return current;
          }

          return { ...current, receiptsReady: true, receipt };
        });
        setPaymentReceipt(receipt);
        clearPendingPaymentContext(pendingReceiptBatchTransactionNo);
        if (
          paymentTransactionRef.current?.transactionNo ===
          pendingReceiptBatchTransactionNo
        ) {
          paymentTransactionRef.current = null;
        }
        stopPolling();
      } catch {
        // Keep polling while the successful payment receipt is being generated.
      } finally {
        requestInFlight = false;
      }
    };

    void inquirePaymentReceipt();
    intervalId = window.setInterval(
      () => void inquirePaymentReceipt(),
      VIOLATION_FINE_RECEIPT_STATUS_POLL_INTERVAL_MS,
    );

    return () => {
      disposed = true;
      stopPolling();
    };
  }, [
    pendingReceiptBatchTransactionNo,
    pendingReceiptCorrelationId,
    pendingReceiptFineReferenceNumber,
    pendingReceiptPaymentId,
  ]);

  const handlePaymentProgressClose = async () => {
    if (
      paymentSubmitting ||
      paymentConfirmInFlightRef.current ||
      paymentCancelInFlightRef.current
    ) {
      return;
    }

    const context = paymentTransactionRef.current;
    if (!context) {
      setPaymentProgressVisible(false);
      return;
    }

    paymentCancelInFlightRef.current = true;
    setPaymentPollingTransactionNo(null);
    setPaymentCancelLoading(true);
    setPaymentProgressVisible(true);

    try {
      const result = await cancelViolationFineCardPayment({
        transactionNo: context.transactionNo,
      });
      const resolution = resolveViolationFineCancelPayment(result);

      if (resolution === "cancelled") {
        clearPendingPaymentContext(context.transactionNo);
      }

      if (
        !mountedRef.current ||
        paymentTransactionRef.current?.transactionNo !== context.transactionNo
      ) {
        return;
      }

      if (resolution === "success") {
        const response = await inquireViolationFineBatchPaymentStatus({
          batchTransactionNo: context.transactionNo,
          paymentId: context.paymentId,
          correlationId: context.correlationId,
        });
        setPaymentPollingTransactionNo(context.transactionNo);
        applyCardPaymentResult(response.data, context.fineReference, context.amount);
        return;
      }

      if (resolution === "cancelled") {
        clearPendingPaymentContext(context.transactionNo);
        paymentTransactionRef.current = null;
        setPaymentPollingTransactionNo(null);
        setPaymentProgressVisible(false);
        setPaymentReceipt(null);
        setPaymentResult(null);
        CustomMessage.destroy();
        CustomMessage.success(t("payFines.payment.cancelSuccess"));
        void loadFineDetail(context.fineReference);
        return;
      }

      setPaymentPollingTransactionNo(context.transactionNo);
      setPaymentProgressVisible(true);
      CustomMessage.warning(t("payFines.payment.cancelPending"));
    } catch (error) {
      const transactionNotFound = getErrorStatusCode(error) === 404;
      if (transactionNotFound) {
        clearPendingPaymentContext(context.transactionNo);
      }

      if (
        !mountedRef.current ||
        paymentTransactionRef.current?.transactionNo !== context.transactionNo
      ) {
        return;
      }

      if (transactionNotFound) {
        clearPendingPaymentContext(context.transactionNo);
        paymentTransactionRef.current = null;
        setPaymentPollingTransactionNo(null);
        setPaymentProgressVisible(false);
        setPaymentResult(null);
        CustomMessage.error(t("payFines.payment.transactionNotFound"));
        void loadFineDetail(context.fineReference);
        return;
      }

      setPaymentPollingTransactionNo(context.transactionNo);
      setPaymentProgressVisible(true);
      CustomMessage.error(
        getErrorMessage(error, t("payFines.payment.cancelFailed")),
      );
    } finally {
      paymentCancelInFlightRef.current = false;
      if (mountedRef.current) setPaymentCancelLoading(false);
    }
  };

  const handlePaymentProgressCompleted = async () => {
    if (
      paymentCancelInFlightRef.current ||
      paymentConfirmInFlightRef.current
    ) {
      return;
    }
    const paymentInput = paymentTransactionRef.current;

    if (!paymentInput) {
      CustomMessage.error(t("payFinesDetail.payment.invalidFine"));
      return;
    }

    paymentConfirmInFlightRef.current = true;
    setPaymentConfirmLoading(true);

    try {
      const response = await inquireViolationFineBatchPaymentStatus({
        batchTransactionNo: paymentInput.transactionNo,
        paymentId: paymentInput.paymentId,
        correlationId: paymentInput.correlationId,
      });

      if (
        !mountedRef.current ||
        paymentTransactionRef.current?.transactionNo !== paymentInput.transactionNo
      ) {
        return;
      }

      applyCardPaymentResult(
        response.data,
        paymentInput.fineReference,
        paymentInput.amount,
      );
    } catch (error) {
      if (mountedRef.current) {
        CustomMessage.error(getErrorMessage(error, t("payFines.payment.submitFailed")));
      }
    } finally {
      if (mountedRef.current) {
        paymentConfirmInFlightRef.current = false;
        setPaymentConfirmLoading(false);
      }
    }
  };

  const handlePayFineByCard = async () => {
    const paymentInput = getPaymentInput();

    if (!paymentInput) {
      CustomMessage.error(t("payFinesDetail.payment.invalidFine"));
      return;
    }

    const { fineReference, amount } = paymentInput;
    const paymentWindow = openFinePaymentWindow();
    if (!paymentWindow) {
      CustomMessage.error(
        <span className="custom-message__text--error">
          {t("payFines.payment.popupBlocked")}
        </span>,
      );
      return;
    }

    paymentTransactionRef.current = null;
    setPaymentResult(null);
    setPaymentReceipt(null);
    setPaymentProgressVisible(true);
    setPaymentSubmitting(true);
    let paymentSubmissionStarted = false;

    try {
      const prevalidateResponse = await prevalidateViolationFinePayment({
        fineReferenceNumbers: [fineReference],
        amount,
      });
      const prevalidation = prevalidateResponse.data;

      if (!mountedRef.current) {
        paymentWindow.close();
        return;
      }

      if (prevalidateResponse.isSuccess === false || !prevalidation?.canPay) {
        console.error(
          "Violation fine payment prevalidation failed:",
          prevalidateResponse,
        );
        setPaymentProgressVisible(false);
        setPaymentResult({
          status: "failed",
          fineReferenceNumber: fineReference,
          amount,
          descriptionKey: "payFines.payment.prevalidateFailed",
        });
        paymentWindow.close();
        return;
      }

      if (paymentWindow.closed) {
        setPaymentProgressVisible(false);
        CustomMessage.error(t("payFines.payment.submitFailed"));
        return;
      }

      const paymentAttemptRevision = beginPendingPaymentAttempt();
      const paymentRequest = submitViolationFinePayment({
        fineReferenceNumbers: [fineReference],
        amount,
        shouldOpenPaymentPage: () => mountedRef.current,
        paymentWindow,
        waitForStatus: false,
      });
      paymentSubmissionStarted = true;
      const paymentResponse = await paymentRequest;
      const paymentTransactionNo = paymentResponse.data?.transactionNo?.trim();
      const paymentId = paymentResponse.data?.paymentId?.trim();
      const correlationId = paymentResponse.data?.correlationId?.trim();
      const paymentResponseIsCurrent = mountedRef.current;

      if (
        paymentResponse.isSuccess !== false &&
        paymentTransactionNo &&
        paymentId &&
        correlationId
      ) {
        savePendingPaymentContext({
          fineReferenceNumbers: [fineReference],
          amount,
          transactionNo: paymentTransactionNo,
          paymentId,
          tranId: paymentResponse.data?.tranId,
          correlationId,
        }, paymentAttemptRevision);
      }

      if (!paymentResponseIsCurrent) return;

      if (paymentResponse.isSuccess === false) {
        console.error(
          "Violation fine payment submission failed:",
          paymentResponse,
        );
        paymentTransactionRef.current = null;
        setPaymentProgressVisible(false);
        setPaymentResult({
          status: "failed",
          fineReferenceNumber: fineReference,
          amount,
          descriptionKey: "payFines.payment.submitFailed",
          description:
            paymentResponse.data?.message || paymentResponse.message || undefined,
        });
        return;
      }

      if (paymentTransactionNo && paymentId && correlationId) {
        paymentTransactionRef.current = {
          transactionNo: paymentTransactionNo,
          paymentId,
          correlationId,
          fineReference,
          amount,
        };
        setPaymentPollingTransactionNo(paymentTransactionNo);
      }
      applyCardPaymentResult(paymentResponse.data, fineReference, amount);
    } catch (error) {
      if (!paymentSubmissionStarted) {
        paymentWindow.close();
      }
      if (mountedRef.current) {
        console.error("Violation fine payment submission failed:", error);
        paymentTransactionRef.current = null;
        setPaymentProgressVisible(false);
        setPaymentResult({
          status: "failed",
          fineReferenceNumber: fineReference,
          amount,
          descriptionKey: "payFines.payment.submitFailed",
        });
      }
    } finally {
      if (mountedRef.current) {
        setPaymentSubmitting(false);
      }
    }
  };

  const handlePayFine = () => {
    const paymentInput = getPaymentInput();

    if (!paymentInput) {
      CustomMessage.error(t("payFinesDetail.payment.invalidFine"));
      return;
    }

    setPaymentResult(null);
    setPaymentReceipt(null);
    paymentTransactionRef.current = null;
    setPaymentMethodVisible(true);
  };

  const handlePaymentMethodModalClose = () => {
    if (paymentSubmitting) {
      return;
    }

    setPaymentMethodVisible(false);
  };

  const handlePaymentMethodProceed = () => {
    setPaymentMethodVisible(false);
    void handlePayFineByCard();
  };

  const handlePaymentFailureRetry = () => {
    paymentTransactionRef.current = null;
    setPaymentResult(null);
    void handlePayFineByCard();
  };

  const handlePaymentUseDifferentMethod = () => {
    paymentTransactionRef.current = null;
    setPaymentResult(null);
    setPaymentReceipt(null);
    setPaymentMethodVisible(true);
  };

  const handlePaymentResultClose = () => {
    if (
      paymentResult?.status === "success" &&
      paymentResult.receiptsReady !== true
    ) {
      return;
    }

    setPaymentResult(null);
    setPaymentReceipt(null);
  };

  const renderCardPaymentSuccessPage = () => {
    if (paymentResult?.status !== "success") {
      return null;
    }

    const displayFineReferenceNumber = paymentResult.fineReferenceNumber || "-";
    const receiptAvailable = Boolean(paymentReceipt || paymentResult.receipt);

    return (
      <div className="pay-fines-detail">
        <div className="card-payment-success-page">
          <CardPaymentResultShell className="card-payment-success-page__shell">
            <div className="card-payment-success-page__top">
              <div className="card-payment-success-page__main">
                <div className="card-payment-success-page__icon">
                  <img src={paymentSuccessIcon} alt="" />
                </div>
                <div className="card-payment-success-page__copy">
                  <h1>{t("payFines.payment.success.title")}</h1>
                  <p>
                    {t("payFines.payment.success.singleDescription", {
                      sn: displayFineReferenceNumber,
                    })}
                  </p>
                </div>
                <div className="card-payment-success-page__document">
                  <span className="card-payment-success-page__document-label">
                    {t("payFines.fineNumber")}:
                  </span>
                  <strong>{displayFineReferenceNumber}</strong>
                  <button
                    type="button"
                    className="card-payment-success-page__copy-button"
                    disabled={!paymentResult.fineReferenceNumber}
                    onClick={() =>
                      void copyToClipboard(paymentResult.fineReferenceNumber, {
                        successMessage: t("payFinesDetail.messages.copied"),
                      })
                    }
                    aria-label={t(
                      "violationsFinesPage.common.copyViolationNumber",
                    )}
                  >
                    <CopyOutlined />
                  </button>
                </div>
                <div className="card-payment-success-page__actions">
                  <CustomButton
                    variant="outline"
                    onClick={handleDownloadReceipt}
                    loading={paymentReceiptLoading}
                    disabled={!receiptAvailable || paymentReceiptLoading}
                    customClassName="card-payment-success-page__action card-payment-success-page__action--secondary"
                  >
                    {t("btns.downloadReceipt")}
                  </CustomButton>
                  <CustomButton
                    variant="primary"
                    onClick={handlePaymentResultClose}
                    disabled={paymentResult.receiptsReady !== true}
                    customClassName="card-payment-success-page__action card-payment-success-page__action--primary"
                  >
                    {t("common.close")}
                  </CustomButton>
                </div>
              </div>
            </div>
            <PaymentSuccessFeedback
              title={t("payFines.payment.feedbackTitle")}
              dissatisfiedLabel={t("payFines.payment.feedbackExtremelyDissatisfied")}
              satisfiedLabel={t("payFines.payment.feedbackExtremelySatisfied")}
              submitLabel={t("common.submit")}
              onSubmit={handlePaymentFeedbackSubmit}
            />
          </CardPaymentResultShell>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <div className="pay-fines-detail__notice">{t("payFinesDetail.loading")}</div>;
    }

    if (errorKey || !detail) {
      return (
        <div className="pay-fines-detail__notice">
          <div className="pay-fines-detail__notice-title">
            {t(errorKey || "payFinesDetail.errors.detailUnavailable")}
          </div>
          <button className="pay-fines-detail__notice-button" type="button" onClick={goBackToPayFines}>
            {t("payFinesDetail.back")}
          </button>
        </div>
      );
    }

    const isAr = currentLang.startsWith("ar");
    const relatedAppeal = mapPayFineDetailRelatedAppeal(detail, isAr);
    const violationRecord = mapPayFineDetailToViolationRecord(
      detail,
      fineReferenceNumber,
      { relatedAppeal },
    );
    const hasDecisionAppeals = Boolean(detail.decisionAppeals?.length);
    const decisionViolationRecord = hasDecisionAppeals
      ? mapPayFineDetailToViolationRecord(
          { ...detail, reportedViolations: detail.decisionAppeals },
          fineReferenceNumber,
          { relatedAppeal },
        )
      : violationRecord;
    const showDecision =
      hasDecisionAppeals || isAppealDecisionVisible(violationRecord);

    return (
      <>
        <SummaryCard
          items={[
            {
              label: t("violationsFinesPage.violationDetail.summary.violationNumber"),
              value: violationRecord.violationNo,
              icon: SUMMARY_ICON_MAP.violationNumber,
            },
            {
              label: t("violationsFinesPage.violationDetail.summary.violationType"),
              value: violationRecord.violationType,
              icon: SUMMARY_ICON_MAP.violationType,
            },
            {
              label: t("violationsFinesPage.violationDetail.summary.status"),
              value: <StatusTag status={violationRecord.status} kind="violation" />,
              icon: SUMMARY_ICON_MAP.status,
            },
            {
              label: t("violationsFinesPage.violationDetail.summary.issuedTime"),
              value: violationRecord.issuedTime,
              icon: SUMMARY_ICON_MAP.issuedTime,
            },
          ]}
        />
        <div className="violations-fines-detail-layout violations-fines-detail-layout--single">
          <div className="violations-fines-detail-layout__main">
            {showDecision ? (
              <div className="violations-fines-appeal-decision-panel">
                <DetailTabs
                  activeKey={activeDetailTab}
                  onChange={setActiveDetailTab}
                />
                {activeDetailTab === "decision" ? (
                  <DecisionOnAppealCard
                    violation={decisionViolationRecord}
                    relatedAppeal={relatedAppeal}
                  />
                ) : (
                  <ReportedViolationCard
                    items={violationRecord.reportedViolations}
                    showTitle={false}
                  />
                )}
              </div>
            ) : (
              <ReportedViolationCard items={violationRecord.reportedViolations} />
            )}
            <FineDetailsTable
              items={violationRecord.fineDetails}
              totalFee={violationRecord.totalFee}
              violationTypeId={violationRecord.violationTypeId}
            />
          </div>
        </div>
      </>
    );
  };

  if (paymentResult?.status === "success") {
    return renderCardPaymentSuccessPage();
  }

  const showActionBar = Boolean(!loading && detail && !errorKey);

  return (
    <div className={`pay-fines-d-layout${showActionBar ? " pay-fines-d-layout--with-actions" : ""}`}>
      <SimpleBar className="pay-fines-d-page-scroll">
        <div className="pay-fines-d-scroll-content">
          <div className="pay-fines-d-layout-header">
            <div className="pay-fines-d-layout-logo">
              <img className="logo-img" src={loginLogo} alt="" />
            </div>
            <div className="pay-fines-d-layout-right">
              <LangMenu lang={currentLang} onChange={handleLanguageChange} />
              <button
                className="pay-fines-d-layout-login"
                type="button"
                onClick={() => history.push("/login")}
              >
                {t("payFinesDetail.signupLogin")}
              </button>
            </div>
          </div>
          <div className="pay-fines-d-layout-content">
            <div className="pay-fines-d-title">{t("payFinesDetail.violationDetails")}</div>
            {renderContent()}
          </div>
          <Footer />
        </div>
      </SimpleBar>
      {showActionBar ? (
        <div className="pay-fines-d-btns">
          <button className="pay-fines-d-btns-back" type="button" onClick={goBackToPayFines}>
            {t("payFinesDetail.back")}
          </button>
          {canPayFine ? (
            <div className="pay-fines-d-btns-right">
              <button
                className="pay-fines-d-btns-pay-fine"
                disabled={paymentSubmitting || paymentConfirmLoading}
                type="button"
                onClick={() => void handlePayFine()}
              >
                {t("payFinesDetail.payFine")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <PaymentMethodSelectionModal
        visible={paymentMethodVisible}
        onCancel={handlePaymentMethodModalClose}
        onProceed={handlePaymentMethodProceed}
        totalAmount={getPayableAmount(detail)}
        items={[{
          title: detail?.violationType ?? "",
          reference: detail?.fineNumber ?? detail?.violationNumber ?? "",
          amount: getPayableAmount(detail),
        }]}
      />
      <CardPaymentProgressModal
        visible={paymentProgressVisible}
        amount={paymentTransactionRef.current?.amount ?? getPayableAmount(detail)}
        confirmLoading={paymentConfirmLoading}
        cancelLoading={
          paymentSubmitting || paymentConfirmLoading || paymentCancelLoading
        }
        onClose={handlePaymentProgressClose}
        onConfirmCompleted={handlePaymentProgressCompleted}
      />
      <Modal
        visible={
          paymentResult?.status === "failed" || paymentResult?.status === "cancelled"
        }
        onCancel={handlePaymentResultClose}
        footer={null}
        centered
        width={760}
        maskClosable={false}
        className="pay-fines-d-payment-failure-modal"
      >
        {paymentResult?.status === "failed" || paymentResult?.status === "cancelled" ? (
          <CardPaymentFailurePage
            status={paymentResult.status}
            message={
              paymentResult.description ||
              (paymentResult.descriptionKey
                ? t(paymentResult.descriptionKey)
                : undefined)
            }
            details={{
              transactionNo: paymentResult.transactionNo,
              attemptedAmount: paymentResult.amount,
            }}
            onPrimaryAction={handlePaymentFailureRetry}
            onSecondaryAction={handlePaymentUseDifferentMethod}
          />
        ) : null}
      </Modal>
    </div>
  );
}
