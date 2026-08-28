import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
  type Key,
} from "react";
import {
  CloseCircleFilled,
  ExclamationOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { Alert, Modal, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import PublicLayout from "@/components/common/PublicLayout";
import ArrowLeft from "@/assets/icons/ArrowLeft";
import Editor from "@/assets/icons/Editor";
import Submit from "@/assets/icons/Submit";
import Company from "@/assets/icons/Company";
import AED from "@/assets/icons/Aed";
import paymentSuccessIcon from "@/assets/icons/pay-fines/modal-success.svg";
import SimpleBar from "@/components/SimpleBar";
import CardPaymentProgressModal from "@/components/common/CardPaymentProgressModal";
import CustomMessage from "@/components/common/CustomMessage";
import PaymentSuccessFeedback from "@/components/common/PaymentSuccessFeedback";
import PaymentMethodSelectionModal from "@/components/common/PaymentMethodSelectionModal";
import useKeepAliveActivated from "@/components/KeepAlive/useKeepAliveActivated";
import { openFinePaymentWindow } from "@/pages/ViolationsFines/utils/payment";
import { history } from "@/utils/history";
import formatMoney from "@/utils/formatMoney";
import {
  cancelViolationFineCardPayment,
  downloadViolationFineReceiptMetadata,
  inquireViolationFineBatchPaymentStatus,
  prevalidateViolationFinePayment,
  resolveViolationFineCancelPayment,
  searchViolationFinesByEstablishment,
  searchViolationFinesByIndividual,
  searchViolationFinesByViolationNumber,
  submitViolationFinePayment,
  submitViolationFineFeedbackRating,
  type PayFineListItemDto,
  type PayFineSearchByEstablishmentParams,
  type PayFineSearchByIndividualParams,
  type PayFineSearchLockDetails,
  type PayFineSearchByViolationNumberParams,
  type ViolationFinePaymentResult,
  type ViolationFineReceiptMetadata,
  type ViolationFinePaymentStatus,
  VIOLATION_FINE_RECEIPT_STATUS_POLL_INTERVAL_MS,
  VIOLATION_FINE_PAYMENT_STATUS_POLL_INTERVAL_MS,
  VIOLATION_FINE_PAYMENT_STATUS_TIMEOUT_MS,
} from "@/services/violationFine";
import moment from "moment";
import i18n from "@/localization/config";
import FineNumber from "./Tabs/FineNumber";
import IndividualFines from "./Tabs/IndividualFines";
import EstblishmentFines from "./Tabs/EstblishmentFines";
import SinglePaymentSuccessModal from "./components/SinglePaymentSuccessModal";
import {
  arePaymentReceiptsReady,
  beginPendingPaymentAttempt,
  clearPendingPaymentContext,
  hasMatchingReceiptReferences,
  readPendingPaymentContext,
  savePendingPaymentContext,
  shouldRetainPendingPaymentContext,
  type PendingPaymentContext,
} from "./paymentContext";
import "./index.less";

type PayFinesTabKey = "fine-number" | "individual-fines" | "estblishment-fines";

type SearchRequest =
  | {
      type: "fine-number";
      params: PayFineSearchByViolationNumberParams;
    }
  | {
      type: "individual-fines";
      params: PayFineSearchByIndividualParams;
    }
  | {
      type: "estblishment-fines";
      params: PayFineSearchByEstablishmentParams;
    };

type PaymentNotice = {
  type: "info" | "error";
  message: string;
} | null;

type PayFinesPaymentResult = {
  status: ViolationFinePaymentStatus;
  fineReferenceNumbers: string[];
  amount: number;
  transactionNo?: string;
  paymentId?: string;
  tranId?: string;
  correlationId?: string;
  receiptsReady?: boolean;
  receipt?: ViolationFineReceiptMetadata;
  receipts?: ViolationFineReceiptMetadata[];
  descriptionKey?: string;
  description?: string;
} | null;

interface SearchLock {
  lockedUntil: number | null;
}

interface PayFineRow extends PayFineListItemDto {
  rowKey: string;
  fineReference: string | null;
}

const PENDING_PAYMENT_STATUS = "Pending Payment";
const PAY_FINES_LOCKED_ERROR_CODE = "PAY_FINES_LOCKED";
const PAYMENT_WINDOW_CLOSE_POLL_INTERVAL_MS = 500;
const paymentCancelRequests = new Map<
  string,
  ReturnType<typeof cancelViolationFineCardPayment>
>();

const reconcileViolationFineCardPayment = (transactionNo: string) => {
  const existingRequest = paymentCancelRequests.get(transactionNo);
  if (existingRequest) return existingRequest;

  const request = cancelViolationFineCardPayment({ transactionNo });
  paymentCancelRequests.set(transactionNo, request);
  return request;
};

const claimViolationFineCardPaymentResult = (
  transactionNo: string,
  request: ReturnType<typeof cancelViolationFineCardPayment>,
) => {
  if (paymentCancelRequests.get(transactionNo) !== request) return false;
  paymentCancelRequests.delete(transactionNo);
  return true;
};

const PAYMENT_TITLE_KEY_BY_STATUS: Record<
  ViolationFinePaymentStatus,
  "success.title" | "failed.title" | "processing.title" | "unknown.title"
> = {
  success: "success.title",
  failed: "failed.title",
  processing: "processing.title",
  unknown: "unknown.title",
};
const PAYMENT_DESCRIPTION_KEY_BY_STATUS = {
  failed: "failed.description",
  processing: "processing.description",
  unknown: "unknown.description",
} as const;

const normalizeKeyPart = (value: string | number | null | undefined) =>
  String(value ?? "").trim().toLowerCase();

const getSearchKey = (request: SearchRequest) => {
  if (request.type === "fine-number") {
    return `${request.type}:${normalizeKeyPart(request.params.violationNumber)}`;
  }

  if (request.type === "individual-fines") {
    return `${request.type}:${normalizeKeyPart(
      request.params.Method,
    )}:${normalizeKeyPart(request.params.Identifier)}:${normalizeKeyPart(
      request.params.Email,
    )}`;
  }

  return `${request.type}:${normalizeKeyPart(
    request.params.CommercialLicenseNumber,
  )}:${normalizeKeyPart(request.params.EmirateId)}`;
};

const getRealText = (...values: Array<string | number | null | undefined>) => {
  const value = values.find((item) => String(item ?? "").trim());
  return value === undefined || value === null ? null : String(value).trim();
};

const getDisplayText = (...values: Array<string | number | null | undefined>) =>
  getRealText(...values) ?? "-";

const getFineReference = (record: PayFineListItemDto): string | null =>
  getRealText(
    record.fineReferenceNumber,
    record.fineNumber,
    record.violationNumber,
    record.violationNo,
    record.id,
  );

const getViolationNumber = (record: PayFineListItemDto) =>
  getDisplayText(record.violationNumber, record.violationNo, record.fineNumber);

const getFineAmount = (record: PayFineListItemDto) => {
  const amount = Number(record.amount ?? record.fineAmount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const isSelectableFine = (record: PayFineRow) =>
  Boolean(record.fineReference) &&
  record.status === PENDING_PAYMENT_STATUS &&
  record.canPay !== false &&
  !record.isPaymentProcessing &&
  getFineAmount(record) > 0;

const formatIssueDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = moment(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : value;
};

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

const getActiveLock = (lock: SearchLock | undefined) =>
  lock && (lock.lockedUntil === null || lock.lockedUntil > Date.now())
    ? lock
    : null;

const getSearchLockDeadline = (
  details: PayFineSearchLockDetails | null | undefined,
) => {
  const lockedUntil = details?.lockedUntil
    ? Date.parse(details.lockedUntil)
    : Number.NaN;

  if (Number.isFinite(lockedUntil)) return lockedUntil;

  const remainingSeconds = details?.remainingSeconds;
  return typeof remainingSeconds === "number" && remainingSeconds > 0
    ? Date.now() + remainingSeconds * 1000
    : null;
};

const normalizeRows = (items: PayFineListItemDto[]): PayFineRow[] =>
  items.map((item, index) => {
    const fineReference = getFineReference(item);

    return {
      ...item,
      fineReference,
      rowKey: fineReference ?? `missing-${index}`,
    };
  });

const renderPaymentStatusIcon = (status: ViolationFinePaymentStatus) => (
  <div className={`pay-fines-payment-result__icon pay-fines-payment-result__icon--${status}`}>
    {status === "success" ? (
      <img src={paymentSuccessIcon} alt="" />
    ) : status === "failed" ? (
      <ExclamationOutlined />
    ) : status === "processing" ? (
      <LoadingOutlined />
    ) : (
      <QuestionCircleOutlined />
    )}
  </div>
);

export default function PayFines() {
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const lastSearchRequestRef = useRef<SearchRequest | null>(null);
  const pageScrollRef = useRef<ElementRef<typeof SimpleBar>>(null);
  const [activeKey, setActiveKey] = useState<PayFinesTabKey>("fine-number");
  const [activeSearchKey, setActiveSearchKey] = useState<string | null>(null);
  const [locks, setLocks] = useState<Record<string, SearchLock>>({});
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [fines, setFines] = useState<PayFineRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [paymentNotice, setPaymentNotice] = useState<PaymentNotice>(null);
  const [paymentResult, setPaymentResult] = useState<PayFinesPaymentResult>(null);
  const [paymentReceiptLoading, setPaymentReceiptLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMethodVisible, setPaymentMethodVisible] = useState(false);
  const [paymentProgressVisible, setPaymentProgressVisible] = useState(false);
  const [paymentPollingTransactionNo, setPaymentPollingTransactionNo] =
    useState<string | null>(null);
  const [paymentConfirmLoading, setPaymentConfirmLoading] = useState(false);
  const [paymentCancelLoading, setPaymentCancelLoading] = useState(false);
  const paymentConfirmInFlightRef = useRef(false);
  const paymentCancelInFlightRef = useRef(false);
  const paymentPollingInFlightRef = useRef(false);
  const paymentActionInFlightRef = useRef(false);
  const paymentFeedbackSubmittedRefsRef = useRef(new Set<string>());
  const pendingPaymentRef = useRef<PendingPaymentContext | null>(null);
  const paymentSessionIdRef = useRef(0);
  const paymentWindowRef = useRef<Window | null>(null);
  const paymentWindowMonitorIdRef = useRef<number | null>(null);
  const paymentWindowClosedHandlerRef = useRef<(transactionNo: string) => void>(
    () => undefined,
  );

  const activeLock = activeSearchKey
    ? getActiveLock(locks[activeSearchKey])
    : null;
  const isLocked = Boolean(activeLock);

  const stopPaymentWindowMonitoring = useCallback(() => {
    if (paymentWindowMonitorIdRef.current !== null) {
      window.clearInterval(paymentWindowMonitorIdRef.current);
      paymentWindowMonitorIdRef.current = null;
    }
    paymentWindowRef.current = null;
  }, []);

  const startPaymentWindowMonitoring = useCallback((
    paymentWindow: Window,
    transactionNo: string,
  ) => {
    stopPaymentWindowMonitoring();
    paymentWindowRef.current = paymentWindow;

    const handleWindowClosed = () => {
      if (
        paymentWindowRef.current !== paymentWindow ||
        !paymentWindow.closed
      ) {
        return;
      }

      paymentWindowClosedHandlerRef.current(transactionNo);
    };

    handleWindowClosed();
    if (paymentWindowRef.current === paymentWindow) {
      paymentWindowMonitorIdRef.current = window.setInterval(
        handleWindowClosed,
        PAYMENT_WINDOW_CLOSE_POLL_INTERVAL_MS,
      );
    }
  }, [stopPaymentWindowMonitoring]);

  useEffect(() => {
    if (!activeSearchKey || activeLock?.lockedUntil === null || !activeLock) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLocks((current) => {
        if (!current[activeSearchKey]) return current;

        const next = { ...current };
        delete next[activeSearchKey];
        return next;
      });
    }, Math.max(0, activeLock.lockedUntil - Date.now()));

    return () => window.clearTimeout(timeoutId);
  }, [activeLock, activeSearchKey]);

  const restorePendingPaymentFlow = useCallback(() => {
    const context = readPendingPaymentContext();
    if (!context) return;

    pendingPaymentRef.current = context;
    setPaymentResult(null);
    setPaymentProgressVisible(true);
    setPaymentPollingTransactionNo(context.transactionNo ?? null);

    if (
      context.transactionNo &&
      paymentCancelRequests.has(context.transactionNo)
    ) {
      paymentWindowClosedHandlerRef.current(context.transactionNo);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    restorePendingPaymentFlow();

    return () => {
      mountedRef.current = false;
      stopPaymentWindowMonitoring();
      paymentSessionIdRef.current += 1;
      pendingPaymentRef.current = null;
      paymentConfirmInFlightRef.current = false;
      paymentCancelInFlightRef.current = false;
      paymentPollingInFlightRef.current = false;
      paymentActionInFlightRef.current = false;
    };
  }, [restorePendingPaymentFlow, stopPaymentWindowMonitoring]);

  const deactivatePaymentFlow = useCallback(() => {
    stopPaymentWindowMonitoring();
    paymentSessionIdRef.current += 1;
    pendingPaymentRef.current = null;
    setPaymentMethodVisible(false);
    setPaymentProgressVisible(false);
    setPaymentPollingTransactionNo(null);
    setPaymentConfirmLoading(false);
    setPaymentCancelLoading(false);
    setPaymentResult(null);
    setPaying(false);
    setPaymentReceiptLoading(false);
    paymentConfirmInFlightRef.current = false;
    paymentCancelInFlightRef.current = false;
    paymentPollingInFlightRef.current = false;
    paymentActionInFlightRef.current = false;
  }, [stopPaymentWindowMonitoring]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      pageScrollRef.current?.recalculate();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    activeKey,
    activeLock?.lockedUntil,
    fines.length,
    hasSearched,
    loading,
    paymentNotice,
    searchError,
  ]);

  const resetResults = () => {
    stopPaymentWindowMonitoring();
    requestIdRef.current += 1;
    paymentSessionIdRef.current += 1;
    pendingPaymentRef.current = null;
    paymentActionInFlightRef.current = false;
    setPaymentMethodVisible(false);
    setPaymentProgressVisible(false);
    setPaymentPollingTransactionNo(null);
    setPaying(false);
    setHasSearched(false);
    setFines([]);
    setSearchError(null);
    setSelectedRowKeys([]);
    setPaymentNotice(null);
    setPaymentResult(null);
    paymentFeedbackSubmittedRefsRef.current.clear();
    setPaymentReceiptLoading(false);
    setActiveSearchKey(null);
    setLoading(false);
    lastSearchRequestRef.current = null;
  };

  const handleTabChange = (key: PayFinesTabKey) => {
    if (key === activeKey) return;

    setActiveKey(key);
    resetResults();
  };

  const handleSearchDraftChange = (request: SearchRequest) => {
    setActiveSearchKey(getSearchKey(request));
  };

  const handleSearch = async (request: SearchRequest) => {
    const searchKey = getSearchKey(request);
    const existingLock = getActiveLock(locks[searchKey]);

    setActiveSearchKey(searchKey);
    setHasSearched(true);
    setFines([]);
    setSearchError(null);
    setSelectedRowKeys([]);
    setPaymentNotice(null);
    paymentSessionIdRef.current += 1;
    pendingPaymentRef.current = null;
    paymentActionInFlightRef.current = false;
    setPaymentMethodVisible(false);
    setPaymentProgressVisible(false);
    setPaymentPollingTransactionNo(null);
    setPaying(false);

    if (existingLock) return;

    lastSearchRequestRef.current = request;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    try {
      const response =
        request.type === "fine-number"
          ? await searchViolationFinesByViolationNumber(request.params)
          : request.type === "individual-fines"
            ? await searchViolationFinesByIndividual(request.params)
            : await searchViolationFinesByEstablishment(request.params);

      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      if (response.isSuccess === false) {
        if (response.errorCode === PAY_FINES_LOCKED_ERROR_CODE) {
          setLocks((current) => ({
            ...current,
            [searchKey]: {
              lockedUntil: getSearchLockDeadline(response.details),
            },
          }));
          setSearchError(null);
          return;
        }

        throw new Error(response.message || i18n.t("payFines.results.searchFailed"));
      }

      const nextFines = normalizeRows(response.data?.fines ?? []);
      setFines(nextFines);
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      setFines([]);
      setSearchError(
        getErrorMessage(error, i18n.t("payFines.results.searchFailed")),
      );
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const selectedRows = useMemo(() => {
    const keySet = new Set(selectedRowKeys);
    return fines.filter((record) => keySet.has(record.rowKey));
  }, [fines, selectedRowKeys]);

  const totalAmount = selectedRows.reduce(
    (total, record) => total + getFineAmount(record),
    0,
  );
  const paymentInteractionLocked =
    paying || paymentMethodVisible || paymentProgressVisible;

  const columns: ColumnsType<PayFineRow> = [
    {
      title: i18n.t("payFines.results.columns.violationNumber"),
      key: "violationNumber",
      render: (_, record) => getViolationNumber(record),
    },
    {
      title: i18n.t("payFines.results.columns.violationType"),
      dataIndex: "violationType",
      key: "violationType",
      render: (value: string | null | undefined) => getDisplayText(value),
    },
    {
      title: i18n.t("payFines.results.columns.issueDate"),
      dataIndex: "issueDate",
      key: "issueDate",
      render: (value: string | null | undefined) => formatIssueDate(value),
    },
    {
      title: (
        <div className="pay-fines-results__amount-title">
          {i18n.t("payFines.results.columns.amount")} (AED)
        </div>
      ),
      key: "amount",
      render: (_, record) => formatMoney(getFineAmount(record)),
    },
  ];

  const rowSelection: TableRowSelection<PayFineRow> = {
    type: "checkbox",
    selectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: paymentInteractionLocked || !isSelectableFine(record),
    }),
    onChange: (keys) => {
      const keySet = new Set(keys);
      setSelectedRowKeys(
        fines
          .filter((record) => keySet.has(record.rowKey) && isSelectableFine(record))
          .map((record) => record.rowKey),
      );
      setPaymentNotice(null);
    },
    renderCell: (_checked, _record, _index, originNode) => (
      <span
        className="pay-fines-results__selection-cell"
        onClick={(event) => event.stopPropagation()}
      >
        {originNode}
      </span>
    ),
  };

  const handleBatchPaymentFeedbackSubmit = async (rating: number) => {
    if (!rating || paymentResult?.status !== "success") return false;

    const pendingReferenceNumbers = paymentResult.fineReferenceNumbers.filter(
      (referenceNumber) =>
        !paymentFeedbackSubmittedRefsRef.current.has(referenceNumber),
    );

    if (!pendingReferenceNumbers.length) return true;

    const results = await Promise.allSettled(
      pendingReferenceNumbers.map((referenceNumber) =>
        submitViolationFineFeedbackRating({
          referenceNo: referenceNumber,
          rating,
        }),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        paymentFeedbackSubmittedRefsRef.current.add(
          pendingReferenceNumbers[index],
        );
      }
    });

    if (results.some((result) => result.status === "rejected")) {
      CustomMessage.error(i18n.t("payFines.payment.ratingSubmitFailed"));
      return false;
    }

    CustomMessage.success(i18n.t("payFines.payment.ratingSubmitted"));
    return true;
  };

  const applyPaymentResult = useCallback((
    payment: ViolationFinePaymentResult | undefined | null,
    fineReferenceNumbers: string[],
    amount: number,
  ) => {
    const status: ViolationFinePaymentStatus = payment?.status ?? "unknown";
    const paymentReceipts = payment?.receipts ?? [];
    const receiptsReady =
      status === "success" &&
      arePaymentReceiptsReady(
        payment?.receiptsReady,
        fineReferenceNumbers,
        paymentReceipts,
      );

    if (status === "processing" || status === "unknown") {
      setPaymentProgressVisible(true);
      setPaymentResult(null);
      CustomMessage.info(
        i18n.t(
          `payFines.payment.${PAYMENT_DESCRIPTION_KEY_BY_STATUS[status]}`,
        ),
      );
      return;
    }

    stopPaymentWindowMonitoring();
    if (!shouldRetainPendingPaymentContext(status, receiptsReady)) {
      clearPendingPaymentContext(pendingPaymentRef.current?.transactionNo);
      pendingPaymentRef.current = null;
    }

    setPaymentProgressVisible(false);
    setPaymentPollingTransactionNo(null);
    if (status === "success") {
      paymentFeedbackSubmittedRefsRef.current.clear();
    }
    setPaymentResult({
      status,
      fineReferenceNumbers,
      amount,
      transactionNo: payment?.transactionNo,
      paymentId: payment?.paymentId,
      tranId: payment?.tranId,
      correlationId: payment?.correlationId,
      receiptsReady,
      receipt: receiptsReady ? paymentReceipts[0] : undefined,
      receipts: receiptsReady ? paymentReceipts : undefined,
      description: payment?.message,
    });

    if (status === "success" && payment?.success) {
      const paidReferenceNumbers = new Set(fineReferenceNumbers);
      setFines((current) =>
        current.filter(
          (record) =>
            !record.fineReference || !paidReferenceNumbers.has(record.fineReference),
        ),
      );
      setSelectedRowKeys([]);
    }
  }, [stopPaymentWindowMonitoring]);

  useEffect(() => {
    const context = pendingPaymentRef.current;

    if (
      !paymentProgressVisible ||
      !paymentPollingTransactionNo ||
      !context ||
      context.transactionNo !== paymentPollingTransactionNo ||
      !context.paymentId ||
      !context.correlationId
    ) {
      return undefined;
    }

    const paymentId = context.paymentId;
    const correlationId = context.correlationId;
    const paymentSessionId = paymentSessionIdRef.current;
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
          paymentId,
          correlationId,
        });

        if (
          disposed ||
          !mountedRef.current ||
          paymentSessionId !== paymentSessionIdRef.current ||
          paymentCancelInFlightRef.current ||
          pendingPaymentRef.current?.transactionNo !== paymentPollingTransactionNo
        ) {
          return;
        }

        if (
          response.data?.status === "processing" ||
          response.data?.status === "unknown"
        ) {
          return;
        }

        applyPaymentResult(
          response.data,
          context.fineReferenceNumbers,
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
    applyPaymentResult,
    paymentPollingTransactionNo,
    paymentProgressVisible,
  ]);

  const pendingReceiptReferenceNumbers =
    paymentResult?.status === "success" &&
    paymentResult.receiptsReady !== true
      ? paymentResult.fineReferenceNumbers
      : null;
  const pendingReceiptTransactionNo = pendingReceiptReferenceNumbers
    ? paymentResult?.transactionNo ?? null
    : null;
  const pendingReceiptPaymentId = pendingReceiptReferenceNumbers
    ? paymentResult?.paymentId ?? null
    : null;
  const pendingReceiptCorrelationId = pendingReceiptReferenceNumbers
    ? paymentResult?.correlationId ?? null
    : null;

  useEffect(() => {
    if (
      !pendingReceiptReferenceNumbers ||
      !pendingReceiptReferenceNumbers.length ||
      !pendingReceiptTransactionNo ||
      !pendingReceiptPaymentId ||
      !pendingReceiptCorrelationId
    ) {
      return undefined;
    }

    const paymentSessionId = paymentSessionIdRef.current;
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
          batchTransactionNo: pendingReceiptTransactionNo,
          paymentId: pendingReceiptPaymentId,
          correlationId: pendingReceiptCorrelationId,
        });
        const payment = response.data;
        const receipts = payment?.receipts ?? [];

        if (
          disposed ||
          !mountedRef.current ||
          paymentSessionId !== paymentSessionIdRef.current ||
          payment?.status !== "success" ||
          payment.receiptsReady !== true ||
          payment.transactionNo !== pendingReceiptTransactionNo ||
          !hasMatchingReceiptReferences(
            pendingReceiptReferenceNumbers,
            receipts,
          )
        ) {
          return;
        }

        setPaymentResult((current) => {
          if (
            current?.status !== "success" ||
            current.fineReferenceNumbers.length !==
              pendingReceiptReferenceNumbers.length ||
            current.fineReferenceNumbers.some(
              (referenceNumber, index) =>
                referenceNumber !== pendingReceiptReferenceNumbers[index],
            ) ||
            current.transactionNo !== pendingReceiptTransactionNo
          ) {
            return current;
          }

          return {
            ...current,
            transactionNo: payment.transactionNo || current.transactionNo,
            receiptsReady: true,
            receipt: payment.receipt,
            receipts,
          };
        });
        clearPendingPaymentContext(pendingReceiptTransactionNo);
        if (
          pendingPaymentRef.current?.transactionNo ===
          pendingReceiptTransactionNo
        ) {
          pendingPaymentRef.current = null;
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
    pendingReceiptCorrelationId,
    pendingReceiptReferenceNumbers,
    pendingReceiptPaymentId,
    pendingReceiptTransactionNo,
  ]);

  const handlePrevalidationUnavailable = (
    blockedFineReferenceNumbers: string[] = [],
  ) => {
    const blocked = new Set(blockedFineReferenceNumbers);
    if (blocked.size) {
      setFines((current) =>
        current.filter(
          (record) =>
            !record.fineReference || !blocked.has(record.fineReference),
        ),
      );
    }

    pendingPaymentRef.current = null;
    setSelectedRowKeys([]);
    setPaymentMethodVisible(false);
    setPaymentProgressVisible(false);
    CustomMessage.error(i18n.t("payFines.payment.prevalidateUnavailable"));
  };

  const validatePaymentAvailability = async (
    fineReferenceNumbers: string[],
    amount: number,
    paymentSessionId: number,
  ) => {
    const response = await prevalidateViolationFinePayment({
      fineReferenceNumbers,
      amount,
    });

    if (
      !mountedRef.current ||
      paymentSessionId !== paymentSessionIdRef.current
    ) {
      return null;
    }

    const validation = response.data;
    const validatedAmount = Number(validation?.amount);
    if (
      response.isSuccess === false ||
      !validation?.canPay ||
      !Number.isFinite(validatedAmount) ||
      validatedAmount <= 0
    ) {
      handlePrevalidationUnavailable(
        validation?.blockedFineReferenceNumbers,
      );
      return null;
    }

    return validatedAmount;
  };

  // Batch payment mirrors My Requests: validate on Pay Now and again before purchase.
  const handlePayNow = async () => {
    if (paymentActionInFlightRef.current || paymentInteractionLocked) return;

    if (!selectedRows.length) {
      CustomMessage.error(i18n.t("payFines.results.selectFineFirst"));
      return;
    }

    if (selectedRows.some((record) => !isSelectableFine(record))) {
      CustomMessage.error(i18n.t("payFines.results.invalidSelection"));
      return;
    }

    const fineReferenceNumbers = selectedRows
      .map((record) => record.fineReference)
      .filter((value): value is string => Boolean(value));

    if (fineReferenceNumbers.length !== selectedRows.length) {
      CustomMessage.error(i18n.t("payFines.results.invalidSelection"));
      return;
    }

    const paymentSessionId = paymentSessionIdRef.current + 1;
    paymentSessionIdRef.current = paymentSessionId;
    paymentActionInFlightRef.current = true;
    pendingPaymentRef.current = null;
    setPaying(true);
    setPaymentNotice(null);
    setPaymentResult(null);
    paymentFeedbackSubmittedRefsRef.current.clear();
    setPaymentReceiptLoading(false);

    try {
      const validatedAmount = await validatePaymentAvailability(
        fineReferenceNumbers,
        totalAmount,
        paymentSessionId,
      );
      if (validatedAmount === null) return;

      pendingPaymentRef.current = {
        fineReferenceNumbers,
        amount: validatedAmount,
      };
      setPaymentMethodVisible(true);
    } catch (error) {
      if (
        mountedRef.current &&
        paymentSessionId === paymentSessionIdRef.current
      ) {
        CustomMessage.error(
          getErrorMessage(
            error,
            i18n.t("payFines.payment.prevalidateUnavailable"),
          ),
        );
      }
    } finally {
      if (
        mountedRef.current &&
        paymentSessionId === paymentSessionIdRef.current
      ) {
        paymentActionInFlightRef.current = false;
        setPaying(false);
      }
    }
  };

  const handlePaymentMethodClose = () => {
    if (paying) return;
    paymentSessionIdRef.current += 1;
    pendingPaymentRef.current = null;
    setPaymentMethodVisible(false);
  };

  const handlePayByCard = async () => {
    if (paymentActionInFlightRef.current) return;

    const input = pendingPaymentRef.current;
    if (!input) return;
    const { fineReferenceNumbers, amount } = input;
    const paymentWindow = openFinePaymentWindow();
    if (!paymentWindow) {
      CustomMessage.error(
        <span className="custom-message__text--error">
          {i18n.t("payFines.payment.popupBlocked")}
        </span>,
      );
      return;
    }

    const paymentSessionId = paymentSessionIdRef.current + 1;
    paymentSessionIdRef.current = paymentSessionId;
    paymentActionInFlightRef.current = true;

    setPaymentResult(null);
    paymentFeedbackSubmittedRefsRef.current.clear();
    setPaymentReceiptLoading(false);
    setPaymentPollingTransactionNo(null);
    setPaymentProgressVisible(true);
    setPaying(true);
    let paymentSubmissionStarted = false;

    try {
      const validatedAmount = await validatePaymentAvailability(
        fineReferenceNumbers,
        amount,
        paymentSessionId,
      );
      if (validatedAmount === null) {
        paymentWindow.close();
        return;
      }

      if (pendingPaymentRef.current) {
        pendingPaymentRef.current = {
          ...pendingPaymentRef.current,
          amount: validatedAmount,
        };
      }

      if (paymentWindow.closed) {
        setPaymentProgressVisible(false);
        CustomMessage.error(i18n.t("payFines.payment.submitFailed"));
        return;
      }

      const paymentAttemptRevision = beginPendingPaymentAttempt();
      const paymentRequest = submitViolationFinePayment({
        fineReferenceNumbers,
        amount: validatedAmount,
        shouldOpenPaymentPage: () =>
          mountedRef.current &&
          paymentSessionId === paymentSessionIdRef.current,
        paymentWindow,
        waitForStatus: false,
      });
      paymentSubmissionStarted = true;
      const paymentResponse = await paymentRequest;
      const paymentTransactionNo = paymentResponse.data?.transactionNo?.trim();
      const paymentId = paymentResponse.data?.paymentId?.trim();
      const correlationId = paymentResponse.data?.correlationId?.trim();
      const paymentResponseIsCurrent =
        mountedRef.current && paymentSessionId === paymentSessionIdRef.current;

      if (
        paymentResponse.isSuccess !== false &&
        paymentTransactionNo &&
        paymentId &&
        correlationId
      ) {
        savePendingPaymentContext({
          fineReferenceNumbers,
          amount: validatedAmount,
          transactionNo: paymentTransactionNo,
          paymentId,
          tranId: paymentResponse.data?.tranId,
          correlationId,
        }, paymentAttemptRevision);
      }

      if (!paymentResponseIsCurrent) return;

      if (paymentResponse.isSuccess === false) {
        setPaymentProgressVisible(false);
        setPaymentResult({
          status: "failed",
          fineReferenceNumbers,
          amount: validatedAmount,
          descriptionKey: "payFines.payment.submitFailed",
          description:
            paymentResponse.data?.message || paymentResponse.message || undefined,
        });
        return;
      }

      if (
        paymentTransactionNo &&
        paymentId &&
        correlationId &&
        pendingPaymentRef.current
      ) {
        const pendingPaymentContext = {
          ...pendingPaymentRef.current,
          transactionNo: paymentTransactionNo,
          paymentId,
          tranId: paymentResponse.data?.tranId,
          correlationId,
        };
        pendingPaymentRef.current = pendingPaymentContext;
        setPaymentPollingTransactionNo(paymentTransactionNo);
      }
      applyPaymentResult(
        paymentResponse.data,
        fineReferenceNumbers,
        validatedAmount,
      );
      if (paymentTransactionNo) {
        startPaymentWindowMonitoring(paymentWindow, paymentTransactionNo);
      }
    } catch (error) {
      if (!paymentSubmissionStarted) {
        paymentWindow.close();
      }
      if (
        mountedRef.current &&
        paymentSessionId === paymentSessionIdRef.current
      ) {
        setPaymentProgressVisible(false);
        setPaymentResult({
          status: "failed",
          fineReferenceNumbers,
          amount: pendingPaymentRef.current?.amount ?? amount,
          descriptionKey: "payFines.payment.submitFailed",
          description: getErrorMessage(error, i18n.t("payFines.payment.submitFailed")),
        });
      }
    } finally {
      if (
        mountedRef.current &&
        paymentSessionId === paymentSessionIdRef.current
      ) {
        paymentActionInFlightRef.current = false;
        setPaying(false);
      }
    }
  };

  const handlePaymentMethodProceed = () => {
    setPaymentMethodVisible(false);
    void handlePayByCard();
  };

  const refreshLastSearch = () => {
    const request = lastSearchRequestRef.current;
    if (request) void handleSearch(request);
  };

  useKeepAliveActivated({
    onActivated: ({ fromPath }) => {
      if (fromPath === "/pay-fines/detail") refreshLastSearch();
      restorePendingPaymentFlow();
    },
    onDeactivated: deactivatePaymentFlow,
  });

  const handlePaymentProgressClose = async () => {
    if (
      paying ||
      paymentConfirmInFlightRef.current ||
      paymentCancelInFlightRef.current
    ) {
      return;
    }

    const context = pendingPaymentRef.current;
    if (!context?.transactionNo) {
      deactivatePaymentFlow();
      return;
    }

    const {
      transactionNo,
      paymentId,
      correlationId,
      fineReferenceNumbers,
      amount,
    } = context;
    stopPaymentWindowMonitoring();
    const paymentSessionId = paymentSessionIdRef.current;
    paymentCancelInFlightRef.current = true;
    setPaymentPollingTransactionNo(null);
    setPaymentCancelLoading(true);
    setPaymentProgressVisible(true);
    let reconciliationRequest: ReturnType<
      typeof cancelViolationFineCardPayment
    > | null = null;
    let reconciliationResultClaimed = false;

    try {
      reconciliationRequest = reconcileViolationFineCardPayment(transactionNo);
      const result = await reconciliationRequest;
      const resolution = resolveViolationFineCancelPayment(result);

      if (
        !mountedRef.current ||
        pendingPaymentRef.current?.transactionNo !== transactionNo
      ) {
        return;
      }
      if (
        !claimViolationFineCardPaymentResult(
          transactionNo,
          reconciliationRequest,
        )
      ) {
        return;
      }
      reconciliationResultClaimed = true;

      if (resolution === "cancelled") {
        clearPendingPaymentContext(transactionNo);
      }

      if (resolution === "success") {
        if (!paymentId || !correlationId) return;
        const response = await inquireViolationFineBatchPaymentStatus({
          batchTransactionNo: transactionNo,
          paymentId,
          correlationId,
        });
        setPaymentPollingTransactionNo(transactionNo);
        applyPaymentResult(response.data, fineReferenceNumbers, amount);
        return;
      }

      if (resolution === "cancelled") {
        paymentCancelInFlightRef.current = false;
        clearPendingPaymentContext(transactionNo);
        pendingPaymentRef.current = null;
        setPaymentProgressVisible(false);
        setPaymentPollingTransactionNo(null);
        setPaymentCancelLoading(false);
        setPaymentResult(null);
        setSelectedRowKeys([]);
        CustomMessage.destroy();
        CustomMessage.success(i18n.t("payFines.payment.cancelSuccess"));
        refreshLastSearch();
        return;
      }

      setPaymentPollingTransactionNo(transactionNo);
      setPaymentProgressVisible(true);
      CustomMessage.warning(i18n.t("payFines.payment.cancelPending"));
    } catch (error) {
      const transactionNotFound = getErrorStatusCode(error) === 404;

      if (
        !mountedRef.current ||
        pendingPaymentRef.current?.transactionNo !== transactionNo
      ) {
        return;
      }
      if (reconciliationRequest && !reconciliationResultClaimed) {
        if (
          !claimViolationFineCardPaymentResult(
            transactionNo,
            reconciliationRequest,
          )
        ) {
          return;
        }
        reconciliationResultClaimed = true;
      }

      if (transactionNotFound) {
        paymentCancelInFlightRef.current = false;
        clearPendingPaymentContext(transactionNo);
        pendingPaymentRef.current = null;
        setPaymentProgressVisible(false);
        setPaymentPollingTransactionNo(null);
        setPaymentCancelLoading(false);
        setPaymentResult(null);
        setSelectedRowKeys([]);
        CustomMessage.error(i18n.t("payFines.payment.transactionNotFound"));
        refreshLastSearch();
        return;
      }

      setPaymentPollingTransactionNo(transactionNo);
      setPaymentProgressVisible(true);
      CustomMessage.error(
        getErrorMessage(error, i18n.t("payFines.payment.cancelFailed")),
      );
    } finally {
      if (
        mountedRef.current &&
        (paymentSessionId === paymentSessionIdRef.current ||
          reconciliationResultClaimed)
      ) {
        paymentCancelInFlightRef.current = false;
        setPaymentCancelLoading(false);
      }
    }
  };

  paymentWindowClosedHandlerRef.current = (transactionNo) => {
    if (pendingPaymentRef.current?.transactionNo !== transactionNo) {
      stopPaymentWindowMonitoring();
      return;
    }
    void handlePaymentProgressClose();
  };

  const handlePaymentProgressCompleted = async () => {
    if (
      paymentCancelInFlightRef.current ||
      paymentConfirmInFlightRef.current
    ) {
      return;
    }
    const input = pendingPaymentRef.current;
    if (!input?.transactionNo) return;
    const {
      fineReferenceNumbers,
      amount,
      transactionNo,
      paymentId,
      correlationId,
    } = input;
    if (!paymentId || !correlationId) return;
    const paymentSessionId = paymentSessionIdRef.current;

    paymentConfirmInFlightRef.current = true;
    setPaymentConfirmLoading(true);

    try {
      const response = await inquireViolationFineBatchPaymentStatus({
        batchTransactionNo: transactionNo,
        paymentId,
        correlationId,
      });

      if (
        !mountedRef.current ||
        paymentSessionId !== paymentSessionIdRef.current ||
        paymentCancelInFlightRef.current ||
        pendingPaymentRef.current?.transactionNo !== transactionNo
      ) {
        return;
      }

      applyPaymentResult(response.data, fineReferenceNumbers, amount);
    } catch (error) {
      if (
        mountedRef.current &&
        paymentSessionId === paymentSessionIdRef.current
      ) {
        CustomMessage.error(
          getErrorMessage(error, i18n.t("payFines.payment.submitFailed")),
        );
      }
    } finally {
      if (
        mountedRef.current &&
        paymentSessionId === paymentSessionIdRef.current
      ) {
        paymentConfirmInFlightRef.current = false;
        setPaymentConfirmLoading(false);
      }
    }
  };

  const handlePaymentRetry = () => {
    if (paymentResult?.status !== "failed") return;

    pendingPaymentRef.current = {
      fineReferenceNumbers: paymentResult.fineReferenceNumbers,
      amount: paymentResult.amount,
    };
    setPaymentResult(null);
    void handlePayByCard();
  };

  const handleSinglePaymentReceiptDownload = async () => {
    const result = paymentResult;
    const fineReferenceNumber = result?.fineReferenceNumbers[0];

    if (
      !result ||
      result.status !== "success" ||
      result.fineReferenceNumbers.length !== 1 ||
      !fineReferenceNumber ||
      paymentReceiptLoading
    ) {
      return;
    }

    setPaymentReceiptLoading(true);

    try {
      await downloadViolationFineReceiptMetadata(
        fineReferenceNumber,
        result.receipt,
      );
    } catch (error) {
      CustomMessage.error(
        getErrorMessage(
          error,
          i18n.t("payFines.payment.receiptDownloadFailed"),
        ),
      );
    } finally {
      if (mountedRef.current) {
        setPaymentReceiptLoading(false);
      }
    }
  };

  const handleBatchPaymentReceiptDownload = async (
    receipt: ViolationFineReceiptMetadata,
  ) => {
    if (paymentReceiptLoading) return;

    setPaymentReceiptLoading(true);

    try {
      await downloadViolationFineReceiptMetadata(
        receipt.fineReferenceNumber,
        receipt,
      );
    } catch (error) {
      console.error("Unable to download violation fine receipt:", error);
      CustomMessage.error(i18n.t("payFines.payment.receiptDownloadFailed"));
    } finally {
      if (mountedRef.current) {
        setPaymentReceiptLoading(false);
      }
    }
  };

  const handleSinglePaymentFeedbackSubmit = async (rating: number) => {
    const result = paymentResult;
    const fineReferenceNumber = result?.fineReferenceNumbers[0];

    if (
      !result ||
      result.status !== "success" ||
      result.fineReferenceNumbers.length !== 1 ||
      !fineReferenceNumber
    ) {
      return;
    }

    try {
      await submitViolationFineFeedbackRating({
        referenceNo: fineReferenceNumber,
        rating,
      });
      CustomMessage.success(i18n.t("payFines.payment.ratingSubmitted"));
    } catch (error) {
      CustomMessage.error(
        getErrorMessage(error, i18n.t("payFines.payment.ratingSubmitFailed")),
      );
      throw error;
    }
  };

  const tabDisabled = loading || paymentInteractionLocked || isLocked;

  const tabs = [
    {
      title: (
        <div className="pay-fines-tabs-title">
          <div className="pay-fines-tabs-icon">
            <Editor />
          </div>
          <div className="pay-fines-tabs-txt">{i18n.t("payFines.fineNumber")}</div>
        </div>
      ),
      key: "fine-number" as const,
      element: (
        <FineNumber
          disabled={tabDisabled}
          onValuesChange={(params) =>
            handleSearchDraftChange({ type: "fine-number", params })
          }
          onSearch={(params) => void handleSearch({ type: "fine-number", params })}
        />
      ),
    },
    {
      title: (
        <div className="pay-fines-tabs-title">
          <div className="pay-fines-tabs-icon">
            <Submit />
          </div>
          <div className="pay-fines-tabs-txt">{i18n.t("payFines.individualFines")}</div>
        </div>
      ),
      key: "individual-fines" as const,
      element: (
        <IndividualFines
          disabled={tabDisabled}
          onValuesChange={(params) =>
            handleSearchDraftChange({ type: "individual-fines", params })
          }
          onSearch={(params) => void handleSearch({ type: "individual-fines", params })}
        />
      ),
    },
    {
      title: (
        <div className="pay-fines-tabs-title">
          <div className="pay-fines-tabs-icon">
            <Company />
          </div>
          <div className="pay-fines-tabs-txt">{i18n.t("payFines.establishmentFines")}</div>
        </div>
      ),
      key: "estblishment-fines" as const,
      element: (
        <EstblishmentFines
          disabled={tabDisabled}
          onValuesChange={(params) =>
            handleSearchDraftChange({ type: "estblishment-fines", params })
          }
          onSearch={(params) => void handleSearch({ type: "estblishment-fines", params })}
        />
      ),
    },
  ];

  return (
    <SimpleBar ref={pageScrollRef} className="pay-fines-page-scroll">
      <PublicLayout className="pay-fines-public-layout">
        <div className={`pay-fines ${isLocked ? "pay-fines--locked" : ""}`}>
          <div className="pay-fines__content">
            <div className="pay-fines-back">
              <ArrowLeft className="go-back" onClick={() => history.push("/login")} />
              <div className="pay-fines-title">{i18n.t("payFines.title")}</div>
            </div>

            <div className="pay-fines-tabs">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`pay-fines-tab ${activeKey === item.key ? "active" : ""}`}
                  disabled={tabDisabled}
                  onClick={() => handleTabChange(item.key)}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <div className="pay-fines-tabs-content">
              {tabs.find((item) => item.key === activeKey)?.element}
            </div>

            <div className="pay-fines-results">
              {searchError && !activeLock && (
                <Alert
                  className="pay-fines-results__alert"
                  showIcon
                  type="error"
                  message={i18n.t("payFines.results.searchErrorTitle")}
                  description={searchError}
                />
              )}

              {paymentNotice && (
                <Alert
                  className="pay-fines-results__alert"
                  showIcon
                  type={paymentNotice.type}
                  message={paymentNotice.message}
                />
              )}

              {loading ? (
                <div className="pay-fines-results__state">
                  {i18n.t("payFines.results.loading")}
                </div>
              ) : !hasSearched ? (
                <div className="pay-fines-results__state">
                  {i18n.t(
                    activeKey === "fine-number"
                      ? "payFines.results.initialPrompt"
                      : "payFines.results.genericInitialPrompt",
                  )}
                </div>
              ) : activeLock ? (
                <div className="pay-fines-results__lock">
                  {i18n.t("payFines.results.lockErrorDescription")}
                </div>
              ) : searchError ? null : fines.length === 0 ? (
                <div className="pay-fines-results__state">
                  {i18n.t("payFines.results.empty")}
                </div>
              ) : (
                <div className="pay-fines-results__table-wrapper">
                  <Table
                    className="admin-table pay-fines-results__table"
                    columns={columns}
                    dataSource={fines}
                    pagination={false}
                    scroll={{ x: 720 }}
                    rowClassName={(record) =>
                      record.fineReference ? "" : "pay-fines-results__row--disabled"
                    }
                    rowKey="rowKey"
                    rowSelection={rowSelection}
                    onRow={(record) => {
                      const fineReference = record.fineReference;
                      if (!fineReference) return {};

                      return {
                        onClick: () => {
                          history.push(
                            `/pay-fines/detail?fineNumber=${encodeURIComponent(fineReference)}`,
                          );
                        },
                      };
                    }}
                  />
                  <div className="pay-fines-results__footer">
                    <div className="pay-fines-results__total">
                      <div className="pay-fines-results__total-label">
                        {i18n.t("payFines.results.totalAmount")}{" "}
                        <span>
                          {i18n.t("payFines.results.selectedItems", {
                            count: selectedRows.length,
                          })}
                        </span>
                      </div>
                      <div className="pay-fines-results__total-value">
                        <AED />
                        {formatMoney(totalAmount)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`pay-fines-results__pay-now${
                        !selectedRows.length
                          ? " pay-fines-results__pay-now--inactive"
                          : ""
                      }`}
                      aria-disabled={paymentInteractionLocked}
                      disabled={paymentInteractionLocked}
                      onClick={() => void handlePayNow()}
                    >
                      {i18n.t("payFines.results.payNow")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {paymentResult?.status === "success" &&
        paymentResult.fineReferenceNumbers.length === 1 ? (
          <SinglePaymentSuccessModal
            closeDisabled={paymentResult.receiptsReady !== true}
            fineReferenceNumber={paymentResult.fineReferenceNumbers[0]}
            receiptAvailable={
              paymentResult.receipt?.receiptId !== undefined &&
              paymentResult.receipt?.receiptId !== null
            }
            receiptDownloadLoading={paymentReceiptLoading}
            visible
            onClose={() => setPaymentResult(null)}
            onDownloadReceipt={() => void handleSinglePaymentReceiptDownload()}
            onReceiptUnavailable={() =>
              CustomMessage.info(
                i18n.t("payFines.payment.receiptUnavailable"),
              )
            }
            onSubmitFeedback={handleSinglePaymentFeedbackSubmit}
          />
        ) : paymentResult ? (
          <Modal
            centered
            className={`pay-fines-payment-modal pay-fines-payment-modal--${paymentResult.status}`}
            closable={
              paymentResult.status !== "success" ||
              paymentResult.receiptsReady === true
            }
            footer={null}
            keyboard={
              paymentResult.status !== "success" ||
              paymentResult.receiptsReady === true
            }
            maskClosable={false}
            visible
            onCancel={() => setPaymentResult(null)}
          >
            <div className={`pay-fines-payment-result pay-fines-payment-result--${paymentResult.status}`}>
              {renderPaymentStatusIcon(paymentResult.status)}
              <div className="pay-fines-payment-result__title">
                {i18n.t(
                  `payFines.payment.${PAYMENT_TITLE_KEY_BY_STATUS[paymentResult.status]}`,
                )}
              </div>
              <div className="pay-fines-payment-result__description">
                {paymentResult.description ||
                  i18n.t(
                    paymentResult.descriptionKey ||
                      (paymentResult.status === "success"
                        ? "payFines.payment.success.batchDescription"
                        : `payFines.payment.${PAYMENT_DESCRIPTION_KEY_BY_STATUS[paymentResult.status]}`),
                    {
                      amount: formatMoney(paymentResult.amount),
                      count: paymentResult.fineReferenceNumbers.length,
                    },
                  )}
              </div>
              {paymentResult.status === "success" ||
              paymentResult.status === "failed" ? (
                <div className="pay-fines-payment-result__amount">
                  <span>{i18n.t("payFines.payment.amount")}</span>
                  <strong>
                    <AED />
                    {formatMoney(paymentResult.amount)}
                  </strong>
                </div>
              ) : paymentResult.transactionNo ? (
                <div className="pay-fines-payment-result__meta">
                  <span>{i18n.t("payFines.payment.transactionNumber")}</span>
                  <strong>{paymentResult.transactionNo}</strong>
                </div>
              ) : null}
              {paymentResult.status === "success" &&
              paymentResult.fineReferenceNumbers.length > 1 &&
              paymentResult.receipts?.length ? (
                <div className="pay-fines-payment-result__receipts">
                  {paymentResult.receipts.map((receipt) => (
                    <div
                      className="pay-fines-payment-result__receipt"
                      key={receipt.fineReferenceNumber}
                    >
                      <span>{receipt.fineReferenceNumber}</span>
                      <button
                        className="pay-fines-payment-result__receipt-button"
                        type="button"
                        disabled={paymentReceiptLoading}
                        onClick={() =>
                          void handleBatchPaymentReceiptDownload(receipt)
                        }
                      >
                        {i18n.t("btns.downloadReceipt")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              {paymentResult.status === "failed" ? (
                <div className="pay-fines-payment-result__note">
                  <CloseCircleFilled />
                  <span>{i18n.t("payFines.payment.failed.note")}</span>
                </div>
              ) : null}
              <div
                className={`pay-fines-payment-result__actions${
                  paymentResult.status === "success" ? " pay-fines-payment-result__actions--success" : ""
                }`}
              >
                {paymentResult.status === "failed" ? (
                  <>
                    <button
                      className="pay-fines-payment-result__button"
                      type="button"
                      onClick={() => setPaymentResult(null)}
                    >
                      {i18n.t("common.cancel")}
                    </button>
                    <button
                      className="pay-fines-payment-result__button pay-fines-payment-result__button--primary"
                      type="button"
                      disabled={paying}
                      onClick={handlePaymentRetry}
                    >
                      {i18n.t("payFines.payment.retry")}
                    </button>
                  </>
                ) : (
                  <button
                    className="pay-fines-payment-result__button"
                    type="button"
                    /* Keep receipt readiness from disabling the OK button. */
                    /* disabled={
                      paymentResult.status === "success" &&
                      paymentResult.receiptsReady !== true
                    } */
                    onClick={() => setPaymentResult(null)}
                  >
                    {paymentResult.status === "success"
                      ? i18n.t("serviceEntryGate.actions.ok")
                      : i18n.t("common.close")}
                  </button>
                )}
              </div>
              {paymentResult.status === "success" ? (
                <PaymentSuccessFeedback
                  title={i18n.t("payFines.payment.feedbackTitle")}
                  dissatisfiedLabel={i18n.t(
                    "payFines.payment.feedbackExtremelyDissatisfied",
                  )}
                  satisfiedLabel={i18n.t(
                    "payFines.payment.feedbackExtremelySatisfied",
                  )}
                  submitLabel={i18n.t("common.submit")}
                  onSubmit={handleBatchPaymentFeedbackSubmit}
                />
              ) : null}
            </div>
          </Modal>
        ) : null}
        {paymentMethodVisible ? (
          <PaymentMethodSelectionModal
            visible
            onCancel={handlePaymentMethodClose}
            onProceed={handlePaymentMethodProceed}
            totalAmount={pendingPaymentRef.current?.amount ?? totalAmount}
            items={selectedRows.map((record) => ({
              title: record.violationType ?? "",
              reference: record.fineReference ?? "",
              amount: getFineAmount(record),
            }))}
          />
        ) : null}
        {paymentProgressVisible ? (
          <CardPaymentProgressModal
            visible
            amount={pendingPaymentRef.current?.amount ?? totalAmount}
            confirmLoading={paymentConfirmLoading}
            cancelLoading={paying || paymentConfirmLoading || paymentCancelLoading}
            onClose={handlePaymentProgressClose}
            onConfirmCompleted={handlePaymentProgressCompleted}
          />
        ) : null}
      </PublicLayout>
    </SimpleBar>
  );
}
