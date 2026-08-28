import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DatePicker, Dropdown, Input, Menu, Modal, Select } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import type { Moment } from "moment";
import {
  CheckOutlined,
  CloseCircleFilled,
  ExclamationOutlined,
  MoreOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import FilterIcon from "@/assets/icons/FilterIcon";
import AddSquareIcon from "@/assets/icons/AddSquareIcon";
import MobileFilterModal from "@/components/common/MobileFilterModal";
import useIsMobile from "@/hooks/useIsMobile";
import useMediaQuery from "@/hooks/useMediaQuery";
import useFilterOverflow from "@/hooks/useFilterOverflow";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CustomButton from "@/components/common/CustomButton";
import CustomMessage from "@/components/common/CustomMessage";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import {
  CardPaymentProgressModal,
  AppealSubmissionSuccessModal,
  createProfileNameColumn,
  PaymentSuccessFeedback,
} from "@/components/common";
import PaymentMethodSelectionModal from "@/components/common/PaymentMethodSelectionModal";
import TablePanel from "@/components/common/TablePanel";
import AED from "@/assets/icons/Aed";
import AedSymbolIcon from "@/assets/icons/AED.svg";
import AedHeaderIcon from "@/assets/images/AEDH.svg";
import {
  cancelCardPaymentTransaction,
  inquiryCardPayment,
  unwrapPaymentCenterResponse,
} from "@/services/paymentCenterCardPayment";
import { createBatchedViolationFineCardPurchase } from "@/services/violationFinePayment";
import { submitViolationFineFeedbackRating } from "@/services/violationFine";
import {
  cancelAppeal,
  getAppealList,
  getAppealReasons,
  getAppealStatuses,
  getAppealViolationStatuses,
  getAppealViolationTypes,
  getAppealViolations,
  unwrapApiData,
  type AppealListItemDto,
  type AppealDetailDto,
  type AppealViolationListQuery,
  type AppealableViolationDto,
} from "@/services/appeal";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import {
  type AppealDictionaryOption,
  type AppealReasonOption,
  type AppealRecord,
  type AppealStatus,
  type ViolationRecord,
  type ViolationStatus,
  VIOLATION_STATUS_ID,
} from "./utils/fixtures";
import ModuleTabs from "./components/ModuleTabs";
import SubmitAppealModal from "./components/SubmitAppealModal";
import CancelAppealModal from "./components/CancelAppealModal";
import { useViolationFineReceiptDownload } from "./hooks";
import { PageShell, StatusTag } from "./components/PageShared";
import SimpleBar from "@/components/SimpleBar";
import useKeepAliveActivated from "@/components/KeepAlive/useKeepAliveActivated";
import useKeepAliveScrollRestoration from "@/components/KeepAlive/useKeepAliveScrollRestoration";
import type {
  DateRange,
  ModuleLocationState,
  ModuleTabKey,
} from "./utils/types";
import {
  getPaymentErrorStatusCode,
  mapFinePaymentCancelToUiState,
  mapFinePaymentInquiryToUiState,
  resolveFineCardPaymentPurchaseMode,
  type FinePaymentUiStatus,
} from "./utils/payment";
import {
  DATE_FORMAT,
  formatAmount,
  formatViolationFineAmount,
  findRelatedAppealRecord,
  getViolationPaymentAmount,
  getRequestErrorMessage,
  mapAppealDictionaryDtos,
  mapAppealViolationDtoToViolationRecord,
  mapAppealReasonDtos,
  mapAppealListItemDto,
  normalizeAppealViolationListData,
  parseDateTime,
} from "./utils/utils";
import {
  getRequestedKeepAliveTab,
  resolveKeepAliveTab,
} from "./utils/keepAliveTab";
import "./index.less";

const { RangePicker } = DatePicker;
const TAB_QUERY_KEY = "tab";
const PENDING_PAYMENTS_PAGE_SIZE = 200;
const REVIEW_APPEAL_STATUSES: AppealStatus[] = ["processing", "underReview"];
const FINE_BATCH_PAYMENT_STORAGE_KEY =
  "violations-fines-batch-card-payment-context";
const FINE_BATCH_PAYMENT_POLL_INTERVAL_MS = 3000;
const FINE_BATCH_PAYMENT_TIMEOUT_MS = 30 * 60 * 1000;

type ViolationListQueryState = Required<
  Pick<AppealViolationListQuery, "pageNumber" | "pageSize">
> &
  Omit<AppealViolationListQuery, "pageNumber" | "pageSize">;

type FineBatchPaymentStatus = "idle" | "creating" | "processing";
type FineBatchPaymentResultStatus = Extract<
  FinePaymentUiStatus,
  "success" | "failed" | "cancelled"
>;

interface FineBatchPaymentContext {
  fineReferenceNumbers: string[];
  amount: number;
  transactionNo: string;
  pollingStartedAt: number;
  paymentId?: string;
  tranId?: string;
  correlationId?: string;
  referenceNumber?: string;
  hostedPaymentPageUrl?: string;
  isRecovered?: boolean;
}

const getFineBatchPaymentStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const saveFineBatchPaymentContext = (context: FineBatchPaymentContext) => {
  const storage = getFineBatchPaymentStorage();

  if (!storage) {
    return;
  }

  storage.setItem(FINE_BATCH_PAYMENT_STORAGE_KEY, JSON.stringify(context));
};

const readFineBatchPaymentContext = (): FineBatchPaymentContext | null => {
  const storage = getFineBatchPaymentStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(FINE_BATCH_PAYMENT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<FineBatchPaymentContext>;
    const fineReferenceNumbers = Array.isArray(
      parsedValue.fineReferenceNumbers,
    )
      ? parsedValue.fineReferenceNumbers
          .map((value) => `${value ?? ""}`.trim())
          .filter(Boolean)
      : [];
    const transactionNo = `${parsedValue.transactionNo ?? ""}`.trim();
    const amount = Number(parsedValue.amount);

    if (
      !fineReferenceNumbers.length ||
      !transactionNo ||
      !Number.isFinite(amount)
    ) {
      storage.removeItem(FINE_BATCH_PAYMENT_STORAGE_KEY);
      return null;
    }

    return {
      fineReferenceNumbers,
      amount,
      transactionNo,
      pollingStartedAt:
        typeof parsedValue.pollingStartedAt === "number"
          ? parsedValue.pollingStartedAt
          : Date.now(),
      paymentId: parsedValue.paymentId,
      tranId: parsedValue.tranId,
      correlationId: parsedValue.correlationId,
      referenceNumber: parsedValue.referenceNumber,
      hostedPaymentPageUrl: parsedValue.hostedPaymentPageUrl,
      isRecovered: parsedValue.isRecovered,
    };
  } catch (error) {
    console.error("Failed to parse batched fine payment context:", error);
    storage.removeItem(FINE_BATCH_PAYMENT_STORAGE_KEY);
    return null;
  }
};

const clearFineBatchPaymentContext = () => {
  const storage = getFineBatchPaymentStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(FINE_BATCH_PAYMENT_STORAGE_KEY);
};

const isBatchPayableViolation = (record: ViolationRecord) =>
  record.canPay && getViolationPaymentAmount(record) > 0;

const PendingFineCards = ({
  violations,
  onPay,
}: {
  violations: ViolationRecord[];
  onPay: (violation: ViolationRecord) => void;
}) => {
  const { t } = useTranslation();
  const pending = violations
    .filter((item) => item.status === "pendingPayment")
    .sort(
      (a, b) =>
        parseDateTime(b.issuedTime).valueOf() -
        parseDateTime(a.issuedTime).valueOf(),
    );

  if (!pending.length) return null;

  return (
    <section className="violations-fines-pending-payments">
      <SimpleBar className="violations-fines-action-list">
        <div className="violations-fines-action-list__content">
          {pending.map((item) => (
            <article
              className="violations-fines-fine-card violations-fines-fine-card--action-needed"
              key={item.id}
            >
              <div className="violations-fines-fine-card__body">
                <div className="violations-fines-fine-card__topline">
                  <StatusTag status="pendingPayment" kind="violation" />
                </div>
                <div className="violations-fines-fine-card__title">
                  {item.violationType}
                </div>
              </div>
              <div className="violations-fines-fine-card__footer">
                <span className="violations-fines-fine-card__amount">
                  {item.fineAmount === null ||
                  item.fineAmount === undefined ? (
                    formatAmount(item.fineAmount)
                  ) : (
                    <>
                      <img
                        alt=""
                        aria-hidden="true"
                        className="violations-fines-fine-card__amount-icon"
                        src={AedSymbolIcon}
                      />
                      {formatAmount(item.fineAmount)}
                    </>
                  )}
                </span>
                <div className="violations-fines-fine-card__actions">
                  <button
                    className="violations-fines-link-button violations-fines-link-button--solid"
                    type="button"
                    onClick={() => onPay(item)}
                  >
                    {t("violationsFinesPage.common.payNow")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SimpleBar>
    </section>
  );
};

const FilterToolbar = ({
  children,
  action,
  filtersRef,
  compact = false,
}: React.PropsWithChildren<{
  action?: React.ReactNode;
  filtersRef?: React.RefObject<HTMLDivElement>;
  compact?: boolean;
}>) => {
  return (
    <div
      className={`violations-fines-toolbar${
        compact ? " violations-fines-toolbar--compact" : ""
      }`}
      ref={filtersRef}
    >
      <div className="violations-fines-toolbar__filters">{children}</div>
      {action ? (
        <div className="violations-fines-toolbar__action">{action}</div>
      ) : null}
    </div>
  );
};

const buildTablePagination = ({
  total,
  current,
  pageSize,
  onChange,
  formatTotal,
}: {
  total: number;
  current: number;
  pageSize: number;
  onChange: (page: number, size?: number) => void;
  formatTotal: (total: number) => string;
}): TablePaginationConfig => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    position: ["bottomCenter"],
    current,
    total,
    pageSize,
    showSizeChanger: true,
    onChange,
    showTotal: (recordTotal: number) => (
      <div className="table-panel__pagination-total">
        <div className="table-panel__pagination-total-count">
          {formatTotal(recordTotal)}
        </div>
        <div>
          {current}/{totalPages}
        </div>
      </div>
    ),
  };
};

const ViolationsList = ({
  violations,
  loading,
  total,
  violationTypes,
  violationStatuses,
  violationLookupsLoading,
  query,
  onQueryChange,
  onRefreshBatchSources,
  onOpenSubmitAppeal,
  onPayViolation,
}: {
  violations: ViolationRecord[];
  loading: boolean;
  total: number;
  violationTypes: AppealDictionaryOption[];
  violationStatuses: AppealDictionaryOption[];
  violationLookupsLoading: boolean;
  query: ViolationListQueryState;
  onQueryChange: (query: ViolationListQueryState) => void;
  onRefreshBatchSources: () => void;
  onOpenSubmitAppeal: (violationId?: number) => void;
  onPayViolation: (violation: ViolationRecord) => void;
}) => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const isMobile = useIsMobile();
  const [filterRef, filtersOverflow] = useFilterOverflow();
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const showProfileNameColumn = isGlobalProfileId(currentProfileId);
  const { downloadingReceiptId, downloadReceipt } =
    useViolationFineReceiptDownload();
  const [search, setSearch] = useState(query.keyword ?? "");
  const [range, setRange] = useState<DateRange>(null);
  const [typeFilter, setTypeFilter] = useState<number>();
  const [statusFilter, setStatusFilter] = useState<number>();
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [pendingTypeFilter, setPendingTypeFilter] = useState<number | null>(null);
  const [pendingStatusFilter, setPendingStatusFilter] = useState<number | null>(null);
  const [page, setPage] = useState(query.pageNumber);
  const [pageSize, setPageSize] = useState(query.pageSize);
  const [selectedFineKeys, setSelectedFineKeys] = useState<string[]>([]);
  const [batchPaymentMethodVisible, setBatchPaymentMethodVisible] =
    useState(false);
  const [batchPaymentProgressVisible, setBatchPaymentProgressVisible] =
    useState(false);
  const [batchPaymentStatus, setBatchPaymentStatus] =
    useState<FineBatchPaymentStatus>("idle");
  const [batchPaymentContext, setBatchPaymentContext] =
    useState<FineBatchPaymentContext | null>(null);
  const [batchPaymentConfirmLoading, setBatchPaymentConfirmLoading] =
    useState(false);
  const [batchPaymentCancelLoading, setBatchPaymentCancelLoading] =
    useState(false);
  const [batchPaymentResultStatus, setBatchPaymentResultStatus] =
    useState<FineBatchPaymentResultStatus | null>(null);
  const [batchPaymentResultMessage, setBatchPaymentResultMessage] =
    useState("");
  const batchPaymentTimeoutRef = useRef<number | null>(null);
  const batchPaymentInFlightRef = useRef(false);
  const batchPaymentRatingSubmittedRefsRef = useRef(new Set<string>());
  const batchPaymentCancelInFlightRef = useRef(false);
  const batchPaymentContextRef = useRef<FineBatchPaymentContext | null>(null);
  const batchPaymentFlowVersionRef = useRef(0);
  const batchPaymentInquiryHandlerRef = useRef<
    ((context: FineBatchPaymentContext, isManual?: boolean) => void) | null
  >(null);
  const violationStatusOptions = useMemo(
    () =>
      violationStatuses.map((status) => ({
        label: status.label,
        value: status.id,
      })),
    [violationStatuses],
  );
  const currentProfileIdRef = useRef(currentProfileId);

  const clearBatchSelection = useCallback(() => {
    setSelectedFineKeys([]);
  }, []);

  const selectedFineRows = useMemo(
    () => violations.filter((record) => selectedFineKeys.includes(record.id)),
    [selectedFineKeys, violations],
  );

  const selectedFineTotalAmount = useMemo(
    () =>
      selectedFineRows.reduce(
        (totalAmount, record) =>
          totalAmount + getViolationPaymentAmount(record),
        0,
      ),
    [selectedFineRows],
  );

  const isFineBatchPaymentBusy =
    batchPaymentStatus === "creating" ||
    batchPaymentStatus === "processing";

  const refreshFineBatchPaymentSources = useCallback(() => {
    onRefreshBatchSources();
  }, [onRefreshBatchSources]);

  const clearBatchPaymentTimer = useCallback(() => {
    if (batchPaymentTimeoutRef.current !== null) {
      window.clearTimeout(batchPaymentTimeoutRef.current);
      batchPaymentTimeoutRef.current = null;
    }
  }, []);

  const resetBatchPaymentFlow = useCallback(() => {
    batchPaymentFlowVersionRef.current += 1;
    batchPaymentInFlightRef.current = false;
    batchPaymentCancelInFlightRef.current = false;
    batchPaymentContextRef.current = null;
    clearBatchPaymentTimer();
    clearFineBatchPaymentContext();
    setBatchPaymentContext(null);
    setBatchPaymentProgressVisible(false);
    setBatchPaymentMethodVisible(false);
    setBatchPaymentStatus("idle");
    setBatchPaymentConfirmLoading(false);
    setBatchPaymentCancelLoading(false);
    setBatchPaymentResultStatus(null);
    setBatchPaymentResultMessage("");
  }, [clearBatchPaymentTimer]);

  const finishBatchPayment = useCallback(
    (
      context: FineBatchPaymentContext,
      status: FineBatchPaymentResultStatus,
      message = "",
    ) => {
      clearBatchPaymentTimer();
      clearFineBatchPaymentContext();
      clearBatchSelection();
      batchPaymentContextRef.current = context;
      setBatchPaymentContext(context);
      setBatchPaymentProgressVisible(false);
      setBatchPaymentStatus("idle");
      setBatchPaymentResultStatus(status);
      setBatchPaymentResultMessage(message);
      if (status === "success") {
        batchPaymentRatingSubmittedRefsRef.current.clear();
      }
      refreshFineBatchPaymentSources();
    },
    [
      clearBatchPaymentTimer,
      clearBatchSelection,
      refreshFineBatchPaymentSources,
    ],
  );

  const finishBatchPaymentCancellation = useCallback(() => {
    batchPaymentFlowVersionRef.current += 1;
    batchPaymentInFlightRef.current = false;
    batchPaymentCancelInFlightRef.current = false;
    clearBatchPaymentTimer();
    clearFineBatchPaymentContext();
    clearBatchSelection();
    batchPaymentContextRef.current = null;
    setBatchPaymentContext(null);
    setBatchPaymentProgressVisible(false);
    setBatchPaymentStatus("idle");
    setBatchPaymentConfirmLoading(false);
    setBatchPaymentCancelLoading(false);
    setBatchPaymentResultStatus(null);
    setBatchPaymentResultMessage("");
    refreshFineBatchPaymentSources();
  }, [
    clearBatchPaymentTimer,
    clearBatchSelection,
    refreshFineBatchPaymentSources,
  ]);

  const scheduleBatchPaymentInquiry = useCallback(
    (context: FineBatchPaymentContext) => {
      clearBatchPaymentTimer();
      batchPaymentTimeoutRef.current = window.setTimeout(() => {
        void batchPaymentInquiryHandlerRef.current?.(context);
      }, FINE_BATCH_PAYMENT_POLL_INTERVAL_MS);
    },
    [clearBatchPaymentTimer],
  );

  const isBatchPaymentContextActive = useCallback(
    (context: FineBatchPaymentContext) =>
      batchPaymentContextRef.current?.transactionNo === context.transactionNo,
    [],
  );

  const handleBatchPaymentInquiry = useCallback(
    async (context: FineBatchPaymentContext, isManual = false) => {
      const isActiveContext = isBatchPaymentContextActive(context);

      if (batchPaymentInFlightRef.current || !isActiveContext) {
        if (isManual && isActiveContext) {
          CustomMessage.warning(
            t("violationsFinesPage.batchPayment.messages.confirmationPending"),
          );
        }
        return;
      }

      if (
        !isManual &&
        Date.now() - context.pollingStartedAt > FINE_BATCH_PAYMENT_TIMEOUT_MS
      ) {
        clearBatchPaymentTimer();
        batchPaymentContextRef.current = context;
        setBatchPaymentContext(context);
        setBatchPaymentProgressVisible(true);
        setBatchPaymentStatus("processing");
        CustomMessage.warning(
          t("violationsFinesPage.batchPayment.messages.timeout"),
        );
        return;
      }

      const flowVersion = batchPaymentFlowVersionRef.current;
      batchPaymentInFlightRef.current = true;
      if (isManual) {
        setBatchPaymentConfirmLoading(true);
      }
      setBatchPaymentStatus("processing");

      try {
        const response = await inquiryCardPayment({
          transactionNo: context.transactionNo,
          paymentId: context.paymentId,
          tranId: context.tranId,
          correlationId: context.correlationId,
        });
        const responseData = unwrapPaymentCenterResponse(response);
        const resolution = mapFinePaymentInquiryToUiState(responseData);

        if (
          flowVersion !== batchPaymentFlowVersionRef.current ||
          !isBatchPaymentContextActive(context)
        ) {
          return;
        }

        if (resolution.status === "success") {
          finishBatchPayment(context, "success");
          return;
        }

        if (resolution.status === "cancelled") {
          finishBatchPaymentCancellation();
          CustomMessage.success(
            t("violationsFinesPage.messages.paymentCancelled"),
          );
          return;
        }

        if (resolution.status === "failed") {
          finishBatchPayment(
            context,
            resolution.status,
            t("violationsFinesPage.batchPayment.result.failedDescription"),
          );
          return;
        }

        if (resolution.status === "processing" && isManual) {
          CustomMessage.warning(
            t("violationsFinesPage.batchPayment.messages.confirmationPending"),
          );
        }

        scheduleBatchPaymentInquiry(context);
      } catch (error) {
        if (
          flowVersion !== batchPaymentFlowVersionRef.current ||
          !isBatchPaymentContextActive(context)
        ) {
          return;
        }

        console.error("Failed to inquire batched fine payment:", error);
        if (isManual) {
          CustomMessage.error(
            t("violationsFinesPage.batchPayment.messages.confirmationPending"),
          );
        }
        scheduleBatchPaymentInquiry(context);
      } finally {
        if (flowVersion === batchPaymentFlowVersionRef.current) {
          batchPaymentInFlightRef.current = false;
          setBatchPaymentConfirmLoading(false);
          setBatchPaymentCancelLoading(false);
        }
      }
    },
    [
      clearBatchPaymentTimer,
      finishBatchPaymentCancellation,
      finishBatchPayment,
      isBatchPaymentContextActive,
      scheduleBatchPaymentInquiry,
      t,
    ],
  );

  useEffect(() => {
    batchPaymentInquiryHandlerRef.current = handleBatchPaymentInquiry;
  }, [handleBatchPaymentInquiry]);

  useEffect(() => {
    const storedContext = readFineBatchPaymentContext();
    if (!storedContext) {
      return;
    }

    setBatchPaymentContext(storedContext);
    batchPaymentContextRef.current = storedContext;
    batchPaymentFlowVersionRef.current += 1;
    setBatchPaymentStatus("processing");
    setBatchPaymentProgressVisible(true);
    void handleBatchPaymentInquiry(storedContext);
  }, [handleBatchPaymentInquiry]);

  useEffect(() => clearBatchPaymentTimer, [clearBatchPaymentTimer]);

  useEffect(() => {
    if (currentProfileIdRef.current === currentProfileId) {
      return;
    }

    currentProfileIdRef.current = currentProfileId;
    clearBatchSelection();
    resetBatchPaymentFlow();
  }, [clearBatchSelection, currentProfileId, resetBatchPaymentFlow]);

  const handleBatchPaymentPurchaseError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      console.error("Failed to create batched fine payment:", error);
      clearBatchPaymentTimer();
      clearFineBatchPaymentContext();
      batchPaymentContextRef.current = null;
      batchPaymentFlowVersionRef.current += 1;
      batchPaymentInFlightRef.current = false;
      clearBatchSelection();
      setBatchPaymentMethodVisible(false);
      setBatchPaymentProgressVisible(false);
      setBatchPaymentStatus("idle");
      CustomMessage.error(fallbackMessage);
      refreshFineBatchPaymentSources();
    },
    [
      clearBatchPaymentTimer,
      clearBatchSelection,
      refreshFineBatchPaymentSources,
    ],
  );

  const startBatchPaymentPurchase = useCallback(
    async (fineReferenceNumbers: string[], amount: number) => {
      if (!fineReferenceNumbers.length || amount <= 0) {
        CustomMessage.error(
          t("violationsFinesPage.batchPayment.messages.notAvailable"),
        );
        return false;
      }

      const paymentWindow = window.open("", "_blank");
      if (!paymentWindow) {
        CustomMessage.error(
          <span className="custom-message__text--error">
            {t("violationsFinesPage.batchPayment.messages.popupBlocked")}
          </span>,
        );
        return false;
      }
      paymentWindow.opener = null;

      setBatchPaymentStatus("creating");
      setBatchPaymentResultStatus(null);
      setBatchPaymentResultMessage("");
      const flowVersion = batchPaymentFlowVersionRef.current;
      let paymentPageOpened = false;

      try {
        const response = await createBatchedViolationFineCardPurchase({
          fineReferenceNumbers,
          amount,
          description: t("violationsFinesPage.batchPayment.description", {
            count: fineReferenceNumbers.length,
          }),
          languageId: i18n.language?.toLowerCase().startsWith("ar")
            ? "AR"
            : "EN",
        });

        if (flowVersion !== batchPaymentFlowVersionRef.current) {
          return false;
        }

        const paymentPageUrl =
          response.hostedPaymentPageUrl ||
          response.paymentPageUrl ||
          response.paymentUrl;

        if (!response?.success || !response?.transactionNo) {
          handleBatchPaymentPurchaseError(
            response,
            t("violationsFinesPage.batchPayment.messages.purchaseFailed"),
          );
          return false;
        }

        const nextContext: FineBatchPaymentContext = {
          fineReferenceNumbers,
          amount,
          transactionNo: response.transactionNo,
          pollingStartedAt: Date.now(),
          paymentId: response.paymentId,
          tranId: response.tranId || undefined,
          correlationId: response.correlationId || undefined,
          referenceNumber: response.referenceNumber,
          hostedPaymentPageUrl: paymentPageUrl,
          isRecovered: response.isRecovered,
        };

        saveFineBatchPaymentContext(nextContext);
        batchPaymentContextRef.current = nextContext;
        batchPaymentFlowVersionRef.current += 1;
        setBatchPaymentContext(nextContext);
        setBatchPaymentStatus("processing");
        setBatchPaymentProgressVisible(true);

        const shouldRunInquiryDirectly =
          (response.isRecovered === true &&
            response.nextAction === "RUN_INQUIRY") ||
          !paymentPageUrl;

        if (shouldRunInquiryDirectly) {
          void handleBatchPaymentInquiry(nextContext);
          return true;
        }

        if (paymentWindow.closed) {
          handleBatchPaymentPurchaseError(
            response,
            t("violationsFinesPage.batchPayment.messages.purchaseFailed"),
          );
          return false;
        }

        paymentWindow.location.href = paymentPageUrl;
        paymentPageOpened = true;
        void handleBatchPaymentInquiry(nextContext);
        return true;
      } catch (error) {
        if (flowVersion !== batchPaymentFlowVersionRef.current) {
          return false;
        }

        handleBatchPaymentPurchaseError(
          error,
          t("violationsFinesPage.batchPayment.messages.notAvailable"),
        );
        return false;
      } finally {
        if (!paymentPageOpened && !paymentWindow.closed) {
          paymentWindow.close();
        }
      }
    },
    [handleBatchPaymentInquiry, handleBatchPaymentPurchaseError, i18n.language, t],
  );

  const handleBatchPayNow = useCallback(async () => {
    if (isFineBatchPaymentBusy) {
      return;
    }

    const fineReferenceNumbers = Array.from(
      new Set(
        selectedFineRows
          .map((record) => record.fineReferenceNumber.trim())
          .filter(Boolean),
      ),
    );
    const hasInvalidSelection =
      fineReferenceNumbers.length !== selectedFineRows.length ||
      selectedFineRows.some((record) => !isBatchPayableViolation(record));
    const purchaseMode = resolveFineCardPaymentPurchaseMode(
      selectedFineRows.length,
    );

    if (
      purchaseMode === null ||
      hasInvalidSelection ||
      selectedFineTotalAmount <= 0
    ) {
      clearBatchSelection();
      refreshFineBatchPaymentSources();
      CustomMessage.error(
        t("violationsFinesPage.batchPayment.messages.notAvailable"),
      );
      return;
    }

    if (purchaseMode === "single") {
      const [record] = selectedFineRows;
      clearBatchSelection();
      onPayViolation(record);
      return;
    }

    setBatchPaymentStatus("creating");
    const flowVersion = batchPaymentFlowVersionRef.current;

    try {
      const response = await getAppealViolations(query);

      if (flowVersion !== batchPaymentFlowVersionRef.current) {
        return;
      }

      const { items } = normalizeAppealViolationListData(unwrapApiData(response));
      const latestRecords = items.map((item) =>
        mapAppealViolationDtoToViolationRecord(item),
      );
      const latestRecordsById = new Map(
        latestRecords.map((record) => [record.id, record]),
      );
      const staleSelection = selectedFineRows.some((record) => {
        const latestRecord = latestRecordsById.get(record.id);

        if (!latestRecord || !isBatchPayableViolation(latestRecord)) {
          return true;
        }

        return (
          Math.abs(
            getViolationPaymentAmount(latestRecord) -
              getViolationPaymentAmount(record),
          ) > 0.005
        );
      });

      if (staleSelection) {
        clearBatchSelection();
        refreshFineBatchPaymentSources();
        CustomMessage.error(
          t("violationsFinesPage.batchPayment.messages.notAvailable"),
        );
        return;
      }

      setBatchPaymentMethodVisible(true);
    } catch (error) {
      if (flowVersion !== batchPaymentFlowVersionRef.current) {
        return;
      }

      console.error("Failed to validate selected fines:", error);
      clearBatchSelection();
      refreshFineBatchPaymentSources();
      CustomMessage.error(
        t("violationsFinesPage.batchPayment.messages.notAvailable"),
      );
    } finally {
      if (flowVersion === batchPaymentFlowVersionRef.current) {
        setBatchPaymentStatus("idle");
      }
    }
  }, [
    clearBatchSelection,
    isFineBatchPaymentBusy,
    onPayViolation,
    query,
    refreshFineBatchPaymentSources,
    selectedFineRows,
    selectedFineTotalAmount,
    t,
  ]);

  const handleBatchPaymentMethodClose = useCallback(() => {
    setBatchPaymentMethodVisible(false);
  }, []);

  const handleBatchPaymentMethodProceed = useCallback(
    async () => {
      if (isFineBatchPaymentBusy) {
        return;
      }

      const fineReferenceNumbers = selectedFineRows
        .map((record) => record.fineReferenceNumber.trim())
        .filter(Boolean);
      const started = await startBatchPaymentPurchase(
        fineReferenceNumbers,
        selectedFineTotalAmount,
      );

      if (started) {
        setBatchPaymentMethodVisible(false);
      }
    },
    [
      isFineBatchPaymentBusy,
      selectedFineRows,
      selectedFineTotalAmount,
      startBatchPaymentPurchase,
      t,
    ],
  );

  const handleBatchPaymentConfirmCompleted = useCallback(() => {
    if (!batchPaymentContext) {
      return;
    }

    void handleBatchPaymentInquiry(batchPaymentContext, true);
  }, [batchPaymentContext, handleBatchPaymentInquiry]);

  const handleBatchPaymentProgressClose = useCallback(async () => {
    const context = batchPaymentContextRef.current ?? batchPaymentContext;

    if (batchPaymentCancelInFlightRef.current) {
      return;
    }

    if (!context?.transactionNo) {
      resetBatchPaymentFlow();
      clearBatchSelection();
      refreshFineBatchPaymentSources();
      return;
    }

    clearBatchPaymentTimer();
    batchPaymentFlowVersionRef.current += 1;
    const flowVersion = batchPaymentFlowVersionRef.current;
    batchPaymentCancelInFlightRef.current = true;
    batchPaymentInFlightRef.current = true;
    setBatchPaymentCancelLoading(true);
    setBatchPaymentProgressVisible(true);
    setBatchPaymentStatus("processing");
    setBatchPaymentContext(context);
    batchPaymentContextRef.current = context;

    try {
      const response = await cancelCardPaymentTransaction({
        transactionNo: context.transactionNo,
      });
      const responseData = unwrapPaymentCenterResponse(response);
      const resolution = mapFinePaymentCancelToUiState(responseData);

      if (flowVersion !== batchPaymentFlowVersionRef.current) {
        return;
      }

      if (resolution.status === "processing") {
        setBatchPaymentResultMessage(
          t("violationsFinesPage.batchPayment.messages.confirmationPending"),
        );
        CustomMessage.warning(
          t("violationsFinesPage.batchPayment.messages.confirmationPending"),
        );
        return;
      }

      if (resolution.status === "cancelled") {
        finishBatchPaymentCancellation();
        CustomMessage.success(
          t("violationsFinesPage.messages.paymentCancelled"),
        );
        return;
      }

      finishBatchPayment(
        context,
        resolution.status,
        t("violationsFinesPage.batchPayment.result.failedDescription"),
      );
    } catch (error) {
      if (flowVersion !== batchPaymentFlowVersionRef.current) {
        return;
      }

      console.error("Failed to cancel batched fine payment:", error);

      if (getPaymentErrorStatusCode(error) === 404) {
        resetBatchPaymentFlow();
        clearBatchSelection();
        refreshFineBatchPaymentSources();
        CustomMessage.error(
          t("violationsFinesPage.paymentResult.status.missingDescription"),
        );
        return;
      }

      setBatchPaymentContext(context);
      batchPaymentContextRef.current = context;
      setBatchPaymentProgressVisible(true);
      setBatchPaymentStatus("processing");
      CustomMessage.error(
        t("violationsFinesPage.messages.paymentConfirmFailed"),
      );
    } finally {
      if (flowVersion === batchPaymentFlowVersionRef.current) {
        batchPaymentCancelInFlightRef.current = false;
        batchPaymentInFlightRef.current = false;
        setBatchPaymentCancelLoading(false);
      }
    }
  }, [
    batchPaymentContext,
    clearBatchPaymentTimer,
    clearBatchSelection,
    finishBatchPaymentCancellation,
    finishBatchPayment,
    refreshFineBatchPaymentSources,
    resetBatchPaymentFlow,
    t,
  ]);

  const handleBatchPaymentResultClose = useCallback(() => {
    resetBatchPaymentFlow();
  }, [resetBatchPaymentFlow]);

  const handleBatchPaymentRatingSubmit = useCallback(
    async (rating: number) => {
      const referenceNumbers = batchPaymentContext?.fineReferenceNumbers ?? [];
      if (!rating || !referenceNumbers.length) return false;

      const pendingReferenceNumbers = referenceNumbers.filter(
        (referenceNumber) =>
          !batchPaymentRatingSubmittedRefsRef.current.has(referenceNumber),
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
          batchPaymentRatingSubmittedRefsRef.current.add(
            pendingReferenceNumbers[index],
          );
        }
      });

      if (results.some((result) => result.status === "rejected")) {
        CustomMessage.error(
          t("violationsFinesPage.messages.ratingSubmitFailed"),
        );
        return false;
      }

      CustomMessage.success(t("violationsFinesPage.messages.ratingSubmitted"));
      return true;
    },
    [batchPaymentContext?.fineReferenceNumbers, t],
  );

  const handleBatchPaymentRetry = useCallback(() => {
    const retryContext = batchPaymentContext;
    handleBatchPaymentResultClose();

    if (!retryContext) {
      return;
    }

    void startBatchPaymentPurchase(
      retryContext.fineReferenceNumbers,
      retryContext.amount,
    );
  }, [batchPaymentContext, handleBatchPaymentResultClose, startBatchPaymentPurchase]);

  const batchRowSelection: TableRowSelection<ViolationRecord> = useMemo(
    () => ({
      selectedRowKeys: selectedFineKeys,
      onChange: (selectedKeys: React.Key[]) => {
        setSelectedFineKeys(selectedKeys.map(String));
      },
      getCheckboxProps: (record: ViolationRecord) => ({
        disabled: isFineBatchPaymentBusy || !isBatchPayableViolation(record),
      }),
      renderCell: (
        _checked: boolean,
        _record: ViolationRecord,
        _index: number,
        originNode: React.ReactNode,
      ) => <span onClick={(event) => event.stopPropagation()}>{originNode}</span>,
    }),
    [isFineBatchPaymentBusy, selectedFineKeys],
  );

  useKeepAliveActivated({
    onDeactivated: () => {
      setMobileFilterVisible(false);
      setPendingTypeFilter(null);
      setPendingStatusFilter(null);
      resetBatchPaymentFlow();
      clearBatchSelection();
    },
  });

  useEffect(() => {
    onQueryChange({
      keyword: search.trim() || undefined,
      startTime: range?.[0]?.format(DATE_FORMAT),
      endTime: range?.[1]?.format(DATE_FORMAT),
      ViolationTypeId: typeFilter,
      StatusId: statusFilter,
      pageNumber: page,
      pageSize,
      sortField: "SubmissionDate",
      sortDescending: true,
    });
  }, [
    onQueryChange,
    page,
    pageSize,
    range,
    search,
    statusFilter,
    typeFilter,
  ]);

  const handleRangeChange = (dates: null | [Moment, Moment]) => {
    if (dates?.[0] && !dates?.[1]) {
      CustomMessage.error(t("violationsFinesPage.messages.dateRangeNeedsEnd"));
      return;
    }
    if (dates?.[0] && dates?.[1]) {
      if (dates[0].isAfter(dates[1], "day")) {
        CustomMessage.error(t("violationsFinesPage.messages.dateRangeInvalid"));
        return;
      }
      if (dates[1].diff(dates[0], "years", true) > 2) {
        CustomMessage.error(t("violationsFinesPage.messages.dateRangeTooLarge"));
        return;
      }
    }
    setRange(dates);
    clearBatchSelection();
    setPage(1);
  };

  const columns: ColumnsType<ViolationRecord> = [
    {
      title: t("violationsFinesPage.list.violations.columns.violationNo"),
      dataIndex: "violationNo",
      render: (value) => (
        <span className="violations-fines-table__strong">{value}</span>
      ),
    },
    {
      title: t("violationsFinesPage.list.violations.columns.violationType"),
      dataIndex: "violationType",
      onCell: () => ({ style: { maxWidth: 220 } }),
    },
    ...(showProfileNameColumn
      ? [createProfileNameColumn<ViolationRecord>(t("common.profileName"))]
      : []),
    {
      title: (
        <span className="violations-fines-table__amount-title">
          <span>{t("violationsFinesPage.common.fineAmount")}</span>
          <span className="violations-fines-table__amount-currency">
            (
            <img alt="" aria-hidden="true" src={AedHeaderIcon} />)
          </span>
        </span>
      ),
      dataIndex: "fineAmount",
      render: (value, record) => formatViolationFineAmount(value, record.status),
    },
    {
      title: t("violationsFinesPage.list.violations.columns.issuedTime"),
      dataIndex: "issuedTime",
    },
    {
      title: t("violationsFinesPage.list.violations.columns.status"),
      dataIndex: "status",
      render: (status: ViolationStatus) => (
        <StatusTag status={status} kind="violation" />
      ),
    },
    {
      title: t("violationsFinesPage.list.violations.columns.actions"),
      key: "actions",
      fixed: "right" as const,
      width: "1%",
      className: "actions-column",
      render: (_, record) => {
        const receiptDownloadId =
          record.receiptTransactionNo || record.receiptNo;
        const showDownloadReceiptAction = record.status === "paid";
        const hasActions =
          record.canAppeal || record.canPay || showDownloadReceiptAction;

        if (!hasActions) {
          return (
            <div
              className="violations-fines-table-actions"
              onClick={(event) => event.stopPropagation()}
            >
              <span>-</span>
            </div>
          );
        }

        const menuItems = [
          ...(record.canAppeal ? [{
            key: 'appeal',
            label: t("violationsFinesPage.common.appeal"),
            onClick: () => onOpenSubmitAppeal(record.appealViolationId),
          }] : []),
          ...(record.canPay ? [{
            key: 'pay',
            label: t("violationsFinesPage.common.payNow"),
            onClick: () => onPayViolation(record),
          }] : []),
          ...(showDownloadReceiptAction ? [{
            key: 'download',
            disabled: downloadingReceiptId === receiptDownloadId,
            label: downloadingReceiptId === receiptDownloadId
              ? t("violationsFinesPage.common.downloading")
              : t("violationsFinesPage.common.downloadReceipt"),
            onClick: () => {
              void downloadReceipt({
                transactionNo: record.receiptTransactionNo,
                receiptNo: record.receiptNo,
              });
            },
          }] : []),
        ];

        if (isMobile) {
          return (
            <div
              className="violations-fines-table-actions"
              onClick={(event) => event.stopPropagation()}
            >
              <Dropdown
                overlay={<Menu items={menuItems} />}
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="violations-fines-actions-dropdown"
              >
                <button
                  className="violations-fines-more-button"
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreOutlined />
                </button>
              </Dropdown>
            </div>
          );
        }

        return (
          <div
            className="violations-fines-table-actions"
            onClick={(event) => event.stopPropagation()}
          >
            {record.canAppeal ? (
              <button
                className="violations-fines-link-button"
                type="button"
                onClick={() => onOpenSubmitAppeal(record.appealViolationId)}
              >
                {t("violationsFinesPage.common.appeal")}
              </button>
            ) : null}
            {record.canPay ? (
              <button
                className="violations-fines-link-button"
                type="button"
                onClick={() => onPayViolation(record)}
              >
                {t("violationsFinesPage.common.payNow")}
              </button>
            ) : null}
            {showDownloadReceiptAction ? (
              <button
                className="violations-fines-link-button"
                disabled={downloadingReceiptId === receiptDownloadId}
                type="button"
                onClick={() => {
                  void downloadReceipt({
                    transactionNo: record.receiptTransactionNo,
                    receiptNo: record.receiptNo,
                  });
                }}
              >
                {downloadingReceiptId === receiptDownloadId
                  ? t("violationsFinesPage.common.downloading")
                  : t("violationsFinesPage.common.downloadReceipt")}
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const emptyState = useMemo(
    () => (
      <div className="violations-fines-table__empty-state">
        <EmptyBox
          customClassName="violations-fines-table__empty-box"
          title={t("violationsFinesPage.common.noData")}
        />
      </div>
    ),
    [t],
  );

  return (
    <>
      <FilterToolbar filtersRef={filterRef} compact={filtersOverflow}>
        <Input
          allowClear
          className="violations-fines-control violations-fines-control--search"
          prefix={<SearchOutlined />}
          placeholder={t("formPlaceholders.common.search")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            clearBatchSelection();
            setPage(1);
          }}
        />
        {!filtersOverflow && (
          <>
            <RangePicker
              className="violations-fines-control violations-fines-control--range"
              format={DATE_FORMAT}
              separator="-"
              value={range}
              placeholder={[
                t("formPlaceholders.common.startDate"),
                t("formPlaceholders.common.endDate"),
              ]}
              onChange={(dates) =>
                handleRangeChange(dates as null | [Moment, Moment])
              }
            />
            <Select
              allowClear
              className="violations-fines-control violations-fines-control--select"
              placeholder={t("formPlaceholders.pages.violationsFines.violations.types")}
              value={typeFilter}
              onChange={(value) => {
                setTypeFilter(value);
                clearBatchSelection();
                setPage(1);
              }}
              loading={violationLookupsLoading}
              options={violationTypes.map((type) => ({
                label: type.label,
                value: type.id,
              }))}
            />
            <Select
              allowClear
              className="violations-fines-control violations-fines-control--select"
              placeholder={t("formPlaceholders.common.allStatuses")}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                clearBatchSelection();
                setPage(1);
              }}
              loading={violationLookupsLoading}
              options={violationStatusOptions}
            />
          </>
        )}
        {filtersOverflow && (
          <button
            className="mobile-filter-trigger"
            onClick={() => {
              setPendingTypeFilter(typeFilter ?? null);
              setPendingStatusFilter(statusFilter ?? null);
              setMobileFilterVisible(true);
            }}
          >
            <FilterIcon />
            {(!!typeFilter || !!statusFilter) && (
              <span className="mobile-filter-trigger__badge" />
            )}
          </button>
        )}
      </FilterToolbar>
      <MobileFilterModal
        visible={mobileFilterVisible}
        onClose={() => setMobileFilterVisible(false)}
        onConfirm={() => {
          setTypeFilter(pendingTypeFilter ?? undefined);
          setStatusFilter(pendingStatusFilter ?? undefined);
          clearBatchSelection();
          setPage(1);
          setMobileFilterVisible(false);
        }}
        sections={[
          {
            title: t("formPlaceholders.pages.violationsFines.violations.types"),
            options: violationTypes.map((type) => ({ label: type.label, value: type.id })),
            value: pendingTypeFilter,
            onChange: (v) => setPendingTypeFilter(v as number | null),
          },
          {
            title: t("formPlaceholders.common.allStatuses"),
            options: violationStatusOptions,
            value: pendingStatusFilter,
            onChange: (v) => setPendingStatusFilter(v as number | null),
          },
        ]}
      />
      {selectedFineRows.length > 0 ? (
        <div className="violations-fines-batch-toolbar">
          <div className="violations-fines-batch-toolbar__selection">
            <span className="violations-fines-batch-toolbar__label">
              {t(
                selectedFineRows.length === 1
                  ? "violationsFinesPage.batchPayment.selectedLabelOne"
                  : "violationsFinesPage.batchPayment.selectedLabelOther",
              )}
            </span>
            <strong>{selectedFineRows.length}</strong>
          </div>
          <div className="violations-fines-batch-toolbar__payment">
            <div className="violations-fines-batch-toolbar__summary">
              <span className="violations-fines-batch-toolbar__amount">
                <span className="violations-fines-batch-toolbar__label">
                  {t("violationsFinesPage.batchPayment.totalAmount")}
                </span>
                <strong>
                  <AED />
                  {formatAmount(selectedFineTotalAmount)}
                </strong>
              </span>
            </div>
            <CustomButton
              text={t("violationsFinesPage.batchPayment.payNow")}
              variant="primary"
              loading={isFineBatchPaymentBusy}
              disabled={isFineBatchPaymentBusy}
              customClassName="violations-fines-batch-toolbar__pay-button"
              onClick={handleBatchPayNow}
            />
          </div>
        </div>
      ) : null}
      <TablePanel<ViolationRecord>
        tableProps={{
          className: "violations-fines-table",
          columns,
          dataSource: violations,
          showHeader: violations.length > 0,
          loading,
          locale: { emptyText: emptyState },
          pagination: buildTablePagination({
            total,
            current: page,
            pageSize,
            formatTotal: (recordTotal) =>
              t("violationsFinesPage.pagination.total", {
                count: recordTotal,
              }),
            onChange: (nextPage, nextSize) => {
              clearBatchSelection();
              setPage(nextPage);
              if (nextSize) setPageSize(nextSize);
            },
          }),
          rowSelection: batchRowSelection,
          rowKey: "id",
          scroll: { x: 'max-content' },
          onRow: (record) => ({
            onClick: (event) => {
              const target = event.target;
              if (
                target instanceof Element &&
                target.closest(".ant-table-selection-column")
              ) {
                return;
              }

              history.push(
                `/violations-fines/violations/${encodeURIComponent(
                  record.fineReferenceNumber,
                )}`,
              );
            },
          }),
        }}
      />
      <PaymentMethodSelectionModal
        visible={batchPaymentMethodVisible}
        onCancel={handleBatchPaymentMethodClose}
        onProceed={handleBatchPaymentMethodProceed}
        totalAmount={selectedFineTotalAmount}
        items={selectedFineRows.map((record) => ({
          title: record.violationType ?? "",
          reference: record.fineReferenceNumber,
          amount: getViolationPaymentAmount(record),
        }))}
      />
      <CardPaymentProgressModal
        visible={
          batchPaymentProgressVisible &&
          (batchPaymentStatus === "creating" ||
            batchPaymentStatus === "processing")
        }
        amount={batchPaymentContext?.amount ?? selectedFineTotalAmount}
        modalClassName="card-payment-progress-modal--batch"
        modalWidth={720}
        closable={!batchPaymentConfirmLoading && !batchPaymentCancelLoading}
        amountLabel="Amount :"
        confirmLoading={batchPaymentConfirmLoading}
        cancelLoading={batchPaymentCancelLoading}
        onClose={handleBatchPaymentProgressClose}
        onConfirmCompleted={handleBatchPaymentConfirmCompleted}
      />
      <Modal
        visible={!!batchPaymentResultStatus}
        onCancel={handleBatchPaymentResultClose}
        footer={null}
        centered
        width={720}
        maskClosable={false}
        closable
        className={`violations-fines-batch-result-modal violations-fines-batch-result-modal--${
          batchPaymentResultStatus === "success" ? "success" : "failed"
        }`}
      >
        <div className="violations-fines-batch-result-modal__body">
          <div className="violations-fines-batch-result-modal__content">
            <div
              className={`violations-fines-batch-result-modal__icon violations-fines-batch-result-modal__icon--${
                batchPaymentResultStatus === "success" ? "success" : "failed"
              }`}
            >
              {batchPaymentResultStatus === "success" ? (
                <CheckOutlined />
              ) : (
                <ExclamationOutlined />
              )}
            </div>
            <div className="violations-fines-batch-result-modal__copy">
              <h2>
                {batchPaymentResultStatus === "success"
                  ? t("violationsFinesPage.batchPayment.result.successTitle")
                  : batchPaymentResultStatus === "cancelled"
                  ? t("violationsFinesPage.batchPayment.result.cancelledTitle")
                  : t("violationsFinesPage.batchPayment.result.failedTitle")}
              </h2>
              <p>
                {batchPaymentResultStatus === "success"
                  ? t(
                      "violationsFinesPage.batchPayment.result.successDescription",
                    )
                  : batchPaymentResultMessage ||
                    t(
                      "violationsFinesPage.batchPayment.result.failedDescription",
                    )}
              </p>
            </div>
            <div
              className={`violations-fines-batch-result-modal__amount violations-fines-batch-result-modal__amount--${
                batchPaymentResultStatus === "success" ? "success" : "failed"
              }`}
            >
              <span>{t("violationsFinesPage.batchPayment.result.amount")}</span>
              <strong>
                <AED />
                {formatAmount(
                  batchPaymentContext?.amount ?? selectedFineTotalAmount,
                )}
              </strong>
            </div>
            {batchPaymentResultStatus &&
            batchPaymentResultStatus !== "success" ? (
              <div className="violations-fines-batch-result-modal__alert">
                <CloseCircleFilled />
                <span>
                  {t("violationsFinesPage.batchPayment.result.failedAlert")}
                </span>
              </div>
            ) : null}
            <div className="violations-fines-batch-result-modal__actions">
              {batchPaymentResultStatus === "success" ? (
                <CustomButton
                  text={t("violationsFinesPage.batchPayment.result.ok")}
                  variant="outline"
                  customClassName="violations-fines-batch-result-modal__action violations-fines-batch-result-modal__action--secondary"
                  onClick={handleBatchPaymentResultClose}
                />
              ) : (
                <>
                  <CustomButton
                    text={t("violationsFinesPage.batchPayment.result.cancel")}
                    variant="outline"
                    customClassName="violations-fines-batch-result-modal__action violations-fines-batch-result-modal__action--secondary"
                    onClick={handleBatchPaymentResultClose}
                  />
                  <CustomButton
                    text={t("violationsFinesPage.batchPayment.result.retry")}
                    variant="primary"
                    customClassName="violations-fines-batch-result-modal__action"
                    onClick={handleBatchPaymentRetry}
                  />
                </>
              )}
            </div>
          </div>
          {batchPaymentResultStatus === "success" ? (
            <PaymentSuccessFeedback
              title={t("violationsFinesPage.paymentResult.feedback.title")}
              dissatisfiedLabel={t(
                "violationsFinesPage.paymentResult.feedback.dissatisfied",
              )}
              satisfiedLabel={t(
                "violationsFinesPage.paymentResult.feedback.satisfied",
              )}
              submitLabel={t("violationsFinesPage.common.submit")}
              onSubmit={handleBatchPaymentRatingSubmit}
            />
          ) : null}
        </div>
      </Modal>
    </>
  );
};

const AppealsList = ({
  appealReasons,
  appealReasonsLoading,
  appealStatuses,
  appealStatusesLoading,
  refreshKey,
  onOpenSubmitAppeal,
}: {
  appealReasons: AppealReasonOption[];
  appealReasonsLoading: boolean;
  appealStatuses: AppealDictionaryOption[];
  appealStatusesLoading: boolean;
  refreshKey: number;
  onOpenSubmitAppeal: (violationId?: number) => void;
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const history = useHistory();
  const isMobile = useIsMobile();
  const isTablet = useMediaQuery('(max-width: 1023px)');
  const [filterRef, filtersOverflow] = useFilterOverflow();
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const showProfileNameColumn = isGlobalProfileId(currentProfileId);
  const userId = useUserStore(
    (state) =>
      state.userInfo.id || state.userInfo.userId || state.userInfo.userID || "",
  );
  const [appealItems, setAppealItems] = useState<AppealListItemDto[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>(null);
  const [reasonFilter, setReasonFilter] = useState<number>();
  const [statusFilter, setStatusFilter] = useState<number>();
  const [appealMobileFilterVisible, setAppealMobileFilterVisible] = useState(false);
  const [pendingReasonFilter, setPendingReasonFilter] = useState<number | null>(null);
  const [pendingAppealStatusFilter, setPendingAppealStatusFilter] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AppealRecord | null>(null);
  const [cancelingAppeal, setCancelingAppeal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const appealStatusOptions = useMemo(
    () =>
      appealStatuses.map((status) => ({
        label: status.label,
        value: status.id,
      })),
    [appealStatuses],
  );

  const filterParams = useMemo(
    () => ({
      keyword: search.trim() || undefined,
      startTime: range?.[0]?.format(DATE_FORMAT),
      endTime: range?.[1]?.format(DATE_FORMAT),
      reasonId: reasonFilter,
      StatusId: statusFilter,
    }),
    [range, reasonFilter, search, statusFilter],
  );
  const appeals = useMemo(
    () =>
      appealItems.map((item) =>
        mapAppealListItemDto(item, appealReasons, isAr),
      ),
    [appealItems, appealReasons, isAr],
  );

  const fetchAppeals = useCallback(async () => {
    if (!userId) {
      setAppealItems([]);
      setTotal(0);
      return;
    }

    setListLoading(true);
    try {
      const response = await getAppealList({
        createdBy: userId,
        pageNumber: page,
        pageSize,
        sortField: "SubmissionDate",
        sortDescending: true,
        ...filterParams,
      });
      const data = unwrapApiData(response);
      setAppealItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      setAppealItems([]);
      setTotal(0);
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.loadAppealsFailed"),
        ),
      );
    } finally {
      setListLoading(false);
    }
  }, [filterParams, page, pageSize, t, userId]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals, refreshKey]);

  const handleCancelAppeal = async () => {
    if (!cancelTarget || cancelingAppeal) return;
    setCancelingAppeal(true);
    try {
      await cancelAppeal(cancelTarget.id);
      setCancelTarget(null);
      CustomMessage.success(t("violationsFinesPage.messages.cancelAppealSuccess"));
      fetchAppeals();
    } catch (error) {
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.cancelAppealFailed"),
        ),
      );
    } finally {
      setCancelingAppeal(false);
    }
  };

  useKeepAliveActivated({
    onDeactivated: () => {
      setAppealMobileFilterVisible(false);
      setPendingReasonFilter(null);
      setPendingAppealStatusFilter(null);
      setCancelTarget(null);
    },
  });

  const handleRangeChange = (dates: null | [Moment, Moment]) => {
    if (dates?.[0] && dates?.[1]) {
      if (dates[0].isAfter(dates[1], "day")) {
        CustomMessage.error(t("violationsFinesPage.messages.dateRangeInvalid"));
        return;
      }
      if (dates[1].diff(dates[0], "years", true) > 2) {
        CustomMessage.error(t("violationsFinesPage.messages.dateRangeTooLarge"));
        return;
      }
    }
    setRange(dates);
    setPage(1);
  };

  const columns: ColumnsType<AppealRecord> = [
    {
      title: t("violationsFinesPage.list.appeals.columns.appealNo"),
      dataIndex: "appealNo",
      render: (value) => (
        <span className="violations-fines-table__strong">{value}</span>
      ),
    },
    ...(showProfileNameColumn
      ? [createProfileNameColumn<AppealRecord>(t("common.profileName"))]
      : []),
    {
      title: t("violationsFinesPage.list.appeals.columns.appealReason"),
      dataIndex: "appealReason",
      onCell: () => ({ style: { maxWidth: 280 } }),
    },
    {
      title: t("violationsFinesPage.list.appeals.columns.violationNumber"),
      dataIndex: "violationNo",
      render: (value) => (
        <span className="violations-fines-table__link">{value}</span>
      ),
    },
    {
      title: t("violationsFinesPage.list.appeals.columns.submissionTime"),
      dataIndex: "submissionTime",
    },
    {
      title: t("violationsFinesPage.list.appeals.columns.status"),
      dataIndex: "status",
      render: (status: AppealStatus) => (
        <StatusTag status={status} kind="appeal" />
      ),
    },
    {
      title: t("violationsFinesPage.list.appeals.columns.action"),
      key: "actions",
      fixed: "right" as const,
      width: "1%",
      className: "actions-column",
      render: (_, record) => {
        const canCancel = REVIEW_APPEAL_STATUSES.includes(record.status);
        if (!canCancel) {
          return <div onClick={(event) => event.stopPropagation()}><span>-</span></div>;
        }
        if (isMobile) {
          return (
            <div onClick={(event) => event.stopPropagation()}>
              <Dropdown
                overlay={<Menu items={[{
                  key: 'cancel',
                  label: t("violationsFinesPage.common.cancel"),
                  onClick: () => setCancelTarget(record),
                }]} />}
                trigger={['click']}
                placement="bottomRight"
                overlayClassName="violations-fines-actions-dropdown"
              >
                <button
                  className="violations-fines-more-button"
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreOutlined />
                </button>
              </Dropdown>
            </div>
          );
        }
        return (
          <div onClick={(event) => event.stopPropagation()}>
            <button
              className="violations-fines-link-button"
              type="button"
              onClick={() => setCancelTarget(record)}
            >
              {t("violationsFinesPage.common.cancel")}
            </button>
          </div>
        );
      },
    },
  ];

  const emptyState = useMemo(
    () => (
      <div className="violations-fines-table__empty-state">
        <EmptyBox
          customClassName="violations-fines-table__empty-box"
          title={t("violationsFinesPage.common.noData")}
        />
      </div>
    ),
    [t],
  );

  return (
    <>
      <FilterToolbar
        filtersRef={filterRef}
        compact={filtersOverflow}
        action={
          isTablet ? (
            <button
              className="mobile-export-trigger"
              onClick={() => onOpenSubmitAppeal()}
            >
              <AddSquareIcon />
            </button>
          ) : (
            <CustomButton
              text={t("violationsFinesPage.list.appeals.submit")}
              variant="primary"
              onClick={() => onOpenSubmitAppeal()}
              customClassName="violations-fines-primary-button"
            />
          )
        }
      >
        <Input
          allowClear
          className="violations-fines-control violations-fines-control--search"
          prefix={<SearchOutlined />}
          placeholder={t("formPlaceholders.common.search")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        {!filtersOverflow && (
          <>
            <RangePicker
              className="violations-fines-control violations-fines-control--range"
              format={DATE_FORMAT}
              separator="-"
              placeholder={[
                t("formPlaceholders.common.startTime"),
                t("formPlaceholders.common.endTime"),
              ]}
              value={range}
              onChange={(dates) =>
                handleRangeChange(dates as null | [Moment, Moment])
              }
            />
            <Select
              allowClear
              className="violations-fines-control violations-fines-control--select"
              placeholder={t("formPlaceholders.pages.violationsFines.appeals.reasons")}
              value={reasonFilter}
              onChange={(value) => {
                setReasonFilter(value);
                setPage(1);
              }}
              loading={appealReasonsLoading}
              options={appealReasons.map((reason) => ({
                label: reason.label,
                value: reason.id,
              }))}
            />
            <Select
              allowClear
              className="violations-fines-control violations-fines-control--select"
              placeholder={t("formPlaceholders.common.allStatuses")}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              loading={appealStatusesLoading}
              options={appealStatusOptions}
            />
          </>
        )}
        {filtersOverflow && (
          <button
            className="mobile-filter-trigger"
            onClick={() => {
              setPendingReasonFilter(reasonFilter ?? null);
              setPendingAppealStatusFilter(statusFilter ?? null);
              setAppealMobileFilterVisible(true);
            }}
          >
            <FilterIcon />
            {(!!reasonFilter || !!statusFilter) && (
              <span className="mobile-filter-trigger__badge" />
            )}
          </button>
        )}
      </FilterToolbar>
      <MobileFilterModal
        visible={appealMobileFilterVisible}
        onClose={() => setAppealMobileFilterVisible(false)}
        onConfirm={() => {
          setReasonFilter(pendingReasonFilter ?? undefined);
          setStatusFilter(pendingAppealStatusFilter ?? undefined);
          setPage(1);
          setAppealMobileFilterVisible(false);
        }}
        sections={[
          {
            title: t("formPlaceholders.pages.violationsFines.appeals.reasons"),
            options: appealReasons.map((reason) => ({ label: reason.label, value: reason.id })),
            value: pendingReasonFilter,
            onChange: (v) => setPendingReasonFilter(v as number | null),
          },
          {
            title: t("formPlaceholders.common.allStatuses"),
            options: appealStatusOptions,
            value: pendingAppealStatusFilter,
            onChange: (v) => setPendingAppealStatusFilter(v as number | null),
          },
        ]}
      />
      <TablePanel<AppealRecord>
        tableProps={{
          className: "violations-fines-table",
          columns,
          dataSource: appeals,
          showHeader: appeals.length > 0,
          loading: listLoading,
          locale: { emptyText: emptyState },
          pagination: buildTablePagination({
            total,
            current: page,
            pageSize,
            formatTotal: (recordTotal) =>
              t("violationsFinesPage.pagination.total", {
                count: recordTotal,
              }),
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              if (nextSize) setPageSize(nextSize);
            },
          }),
          rowKey: "id",
          scroll: { x: 'max-content' },
          onRow: (record) => ({
            onClick: () =>
              history.push(`/violations-fines/appeals/${record.id}`),
          }),
        }}
      />
      <CancelAppealModal
        visible={Boolean(cancelTarget)}
        onCancel={() => {
          if (!cancelingAppeal) {
            setCancelTarget(null);
          }
        }}
        onConfirm={handleCancelAppeal}
        loading={cancelingAppeal}
      />
    </>
  );
};

const ViolationsFines: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const history = useHistory();
  const location = useLocation<ModuleLocationState | undefined>();
  const userInfo = useUserStore((state) => state.userInfo);
  const userId = userInfo.id || userInfo.userId || userInfo.userID || "";
  const getInitialTab = useCallback(
    () =>
      resolveKeepAliveTab("violations", location.search, location.state),
    [location.search, location.state],
  );
  const [activeTab, setActiveTab] = useState<ModuleTabKey>(() =>
    getInitialTab(),
  );
  const [submitAppealVisible, setSubmitAppealVisible] = useState(false);
  const [submittedAppeal, setSubmittedAppeal] =
    useState<AppealDetailDto | null>(null);
  const [appealsRefreshKey, setAppealsRefreshKey] = useState(0);
  const [initialViolationId, setInitialViolationId] = useState<
    number | undefined
  >();
  const [violationItems, setViolationItems] = useState<
    AppealableViolationDto[]
  >([]);
  const [pendingViolationItems, setPendingViolationItems] = useState<
    AppealableViolationDto[]
  >([]);
  const [relatedAppealItems, setRelatedAppealItems] = useState<
    AppealListItemDto[]
  >([]);
  const [violationsTotal, setViolationsTotal] = useState(0);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [violationQuery, setViolationQuery] =
    useState<ViolationListQueryState>({
      pageNumber: 1,
      pageSize: 10,
      sortField: "SubmissionDate",
      sortDescending: true,
    });
  const [appealReasons, setAppealReasons] = useState<AppealReasonOption[]>([]);
  const [appealReasonsLoading, setAppealReasonsLoading] = useState(false);
  const [appealStatuses, setAppealStatuses] = useState<
    AppealDictionaryOption[]
  >([]);
  const [appealStatusesLoading, setAppealStatusesLoading] = useState(false);
  const [violationStatuses, setViolationStatuses] = useState<
    AppealDictionaryOption[]
  >([]);
  const [violationTypes, setViolationTypes] = useState<
    AppealDictionaryOption[]
  >([]);
  const [violationLookupsLoading, setViolationLookupsLoading] = useState(false);
  const relatedAppealRecords = useMemo(
    () =>
      relatedAppealItems.map((item) =>
        mapAppealListItemDto(item, appealReasons, isAr),
      ),
    [appealReasons, isAr, relatedAppealItems],
  );
  const violations = useMemo(
    () =>
      violationItems.map((item) => {
        const relatedAppeal = findRelatedAppealRecord(
          relatedAppealRecords,
          String(item.violationNo || item.violationId || ""),
        );

        return mapAppealViolationDtoToViolationRecord(item, {
          relatedAppeal,
        });
      }),
    [relatedAppealRecords, violationItems],
  );
  const pendingViolations = useMemo(
    () =>
      pendingViolationItems.map((item) =>
        mapAppealViolationDtoToViolationRecord(item),
      ),
    [pendingViolationItems],
  );

  const fetchAppealLookups = useCallback(async () => {
    setAppealReasonsLoading(true);
    setAppealStatusesLoading(true);
    try {
      const [reasonsResult, appealStatusesResult] = await Promise.allSettled([
        getAppealReasons(),
        getAppealStatuses(),
      ]);

      if (reasonsResult.status === "fulfilled") {
        setAppealReasons(
          mapAppealReasonDtos(unwrapApiData(reasonsResult.value), isAr),
        );
      } else {
        setAppealReasons([]);
        CustomMessage.error(
          getRequestErrorMessage(
            reasonsResult.reason,
            t("violationsFinesPage.messages.loadAppealReasonsFailed"),
          ),
        );
      }

      if (appealStatusesResult.status === "fulfilled") {
        setAppealStatuses(
          mapAppealDictionaryDtos(
            unwrapApiData(appealStatusesResult.value),
            isAr,
          ),
        );
      } else {
        setAppealStatuses([]);
      }
    } finally {
      setAppealReasonsLoading(false);
      setAppealStatusesLoading(false);
    }
  }, [isAr, t]);

  const fetchViolationLookups = useCallback(async () => {
    setViolationLookupsLoading(true);
    try {
      const [violationStatusesResult, violationTypesResult] =
        await Promise.allSettled([
          getAppealViolationStatuses(),
          getAppealViolationTypes(),
        ]);

      if (violationStatusesResult.status === "fulfilled") {
        setViolationStatuses(
          mapAppealDictionaryDtos(
            unwrapApiData(violationStatusesResult.value),
            isAr,
          ),
        );
      } else {
        setViolationStatuses([]);
      }

      if (violationTypesResult.status === "fulfilled") {
        setViolationTypes(
          mapAppealDictionaryDtos(
            unwrapApiData(violationTypesResult.value),
            isAr,
          ),
        );
      } else {
        setViolationTypes([]);
      }
    } finally {
      setViolationLookupsLoading(false);
    }
  }, [isAr]);

  const fetchViolations = useCallback(async () => {
    setViolationsLoading(true);
    try {
      const [violationsResult, appealListResult] = await Promise.allSettled([
        getAppealViolations(violationQuery),
        userId
          ? getAppealList({
              createdBy: userId,
              pageNumber: 1,
              pageSize: 200,
              sortField: "SubmissionDate",
              sortDescending: true,
            })
          : Promise.resolve(null),
      ]);

      if (violationsResult.status !== "fulfilled") {
        throw violationsResult.reason;
      }

      const { items, total } = normalizeAppealViolationListData(
        unwrapApiData(violationsResult.value),
      );
      setViolationItems(items);
      setRelatedAppealItems(
        appealListResult.status === "fulfilled" && appealListResult.value
          ? unwrapApiData(appealListResult.value).items ?? []
          : [],
      );
      setViolationsTotal(total);
    } catch (error) {
      setViolationItems([]);
      setRelatedAppealItems([]);
      setViolationsTotal(0);
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.loadFinesFailed"),
        ),
      );
    } finally {
      setViolationsLoading(false);
    }
  }, [t, userId, violationQuery]);

  const fetchPendingViolations = useCallback(async () => {
    try {
      const response = await getAppealViolations({
        StatusId: VIOLATION_STATUS_ID.pendingPayment,
        pageNumber: 1,
        pageSize: PENDING_PAYMENTS_PAGE_SIZE,
        sortField: "SubmissionDate",
        sortDescending: true,
      });
      const { items } = normalizeAppealViolationListData(unwrapApiData(response));
      setPendingViolationItems(items);
    } catch (error) {
      setPendingViolationItems([]);
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.loadFinesFailed"),
        ),
      );
    }
  }, [t]);

  useEffect(() => {
    fetchAppealLookups();
  }, [fetchAppealLookups]);

  useEffect(() => {
    if (activeTab !== "violations") return;
    fetchViolationLookups();
  }, [activeTab, fetchViolationLookups]);

  useEffect(() => {
    if (activeTab !== "violations") return;
    fetchViolations();
  }, [activeTab, fetchViolations]);

  useEffect(() => {
    if (activeTab !== "violations") return;
    fetchPendingViolations();
  }, [activeTab, fetchPendingViolations]);

  const handleRefreshBatchSources = useCallback(() => {
    void fetchViolations();
    void fetchPendingViolations();
  }, [fetchPendingViolations, fetchViolations]);

  const handleAppealSubmitted = useCallback(
    (appeal: AppealDetailDto) => {
      setSubmittedAppeal(appeal);
      setAppealsRefreshKey((value) => value + 1);
      void fetchViolations();
      void fetchPendingViolations();
    },
    [fetchPendingViolations, fetchViolations],
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

  const handleViolationQueryChange = useCallback(
    (nextQuery: ViolationListQueryState) => {
      setViolationQuery((currentQuery) => {
        const current = JSON.stringify(currentQuery);
        const next = JSON.stringify(nextQuery);
        return current === next ? currentQuery : nextQuery;
      });
    },
    [],
  );

  const handleTabChange = useCallback(
    (nextTab: ModuleTabKey) => {
      setActiveTab(nextTab);
      const query = new URLSearchParams(location.search);
      query.set(TAB_QUERY_KEY, nextTab);
      history.push({
        pathname: location.pathname,
        search: `?${query.toString()}`,
        state: { activeTab: nextTab },
      });
    },
    [history, location.pathname, location.search],
  );

  const handleOpenSubmitAppeal = useCallback((violationId?: number) => {
    setInitialViolationId(violationId);
    setSubmitAppealVisible(true);
  }, []);

  const handleOpenViolationPayment = useCallback(
    (violation: ViolationRecord) => {
      history.push({
        pathname: `/violations-fines/violations/${encodeURIComponent(
          violation.fineReferenceNumber,
        )}`,
        search: "?action=payNow",
        state: {
          payNowViolation: {
            fineReferenceNumber: violation.fineReferenceNumber,
            violationNo: violation.violationNo,
            fineAmount: violation.fineAmount,
            totalFee: violation.totalFee,
            violationType: violation.violationType,
          },
        },
      });
    },
    [history],
  );

  const isKeepAliveActive = useKeepAliveActivated({
    onActivated: ({ fromPath }) => {
      if (!fromPath.startsWith("/violations-fines/")) {
        return;
      }

      const returnedTab = resolveKeepAliveTab(
        activeTab,
        location.search,
        location.state,
      );

      if (returnedTab === "appeals") {
        setAppealsRefreshKey((value) => value + 1);
        return;
      }

      void fetchViolations();
      void fetchPendingViolations();
    },
    onDeactivated: () => {
      setSubmitAppealVisible(false);
      setSubmittedAppeal(null);
      setInitialViolationId(undefined);
    },
  });

  useKeepAliveScrollRestoration();

  const requestedTab = getRequestedKeepAliveTab(
    location.search,
    location.state,
  );

  useEffect(() => {
    if (!isKeepAliveActive || !requestedTab) {
      return;
    }

    setActiveTab(requestedTab);
  }, [isKeepAliveActive, requestedTab]);

  return (
    <PageShell>
      <section className="violations-fines-panel">
        <ModuleTabs activeKey={activeTab} onChange={handleTabChange} />
        {activeTab === "violations" ? (
          <PendingFineCards
            key="violations-pending"
            violations={pendingViolations}
            onPay={handleOpenViolationPayment}
          />
        ) : null}
        {activeTab === "appeals" ? (
          <AppealsList
            key="appeals-list"
            appealReasons={appealReasons}
            appealReasonsLoading={appealReasonsLoading}
            appealStatuses={appealStatuses}
            appealStatusesLoading={appealStatusesLoading}
            refreshKey={appealsRefreshKey}
            onOpenSubmitAppeal={handleOpenSubmitAppeal}
          />
        ) : (
          <ViolationsList
            key="violations-list"
            violations={violations}
            loading={violationsLoading}
            total={violationsTotal}
            violationTypes={violationTypes}
            violationStatuses={violationStatuses}
            violationLookupsLoading={violationLookupsLoading}
            query={violationQuery}
            onQueryChange={handleViolationQueryChange}
            onRefreshBatchSources={handleRefreshBatchSources}
            onOpenSubmitAppeal={handleOpenSubmitAppeal}
            onPayViolation={handleOpenViolationPayment}
          />
        )}
      </section>
      {submitAppealVisible ? (
        <SubmitAppealModal
          visible={submitAppealVisible}
          initialViolationId={initialViolationId}
          appealReasons={appealReasons}
          appealReasonsLoading={appealReasonsLoading}
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
    </PageShell>
  );
};

export default ViolationsFines;
