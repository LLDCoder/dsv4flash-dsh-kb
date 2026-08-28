import { toApi } from "@/utils/gstTime";
import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useMemo,
} from "react";
import {
  CustomButton,
  ComfirmModal,
  CustomMessage,
  CardPaymentProgressModal,
  PaymentSuccessFeedback,
} from "@/components/common";
import { useProfileActionConfirmation } from "@/components/ServiceEntryGate";
import MobileFilterModal from "@/components/common/MobileFilterModal";
import { useHistory } from "react-router-dom";
import useIsMobile from "@/hooks/useIsMobile";
import useFilterOverflow from "@/hooks/useFilterOverflow";
import {
  Dropdown,
  Input,
  Select,
  DatePicker,
  Menu,
  Modal,
} from "antd";
import {
  CloseCircleFilled,
  CheckOutlined,
  ExclamationOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import FilterIcon from "@/assets/icons/FilterIcon";
import SearchIcon from "@/assets/icons/SearchIcon";
import {
  getPendingActions,
  getApplicationPage,
  getApplicationDetail,
  getApplicationLifecycleActivities,
  deleteApplication,
  cancelApplication,
  getApplicationStatuses,
  getApplicationTypes,
  type PendingActionsResponse,
  type ApplicationItem,
  type ApplicationDetailsResponse,
  type LifecycleActivityContext,
  type TypeDictionary,
  type ApplicationStatusCountResponse,
} from "@/services/myRequest";
import type { LicenseListResponseDto } from "@/services/permitsLicense";
import WarningCircle from "@/assets/images/warning-circle.png";
import "./index.less";
import DocumentDown from "@/pages/PermitsLicense/components/DocumentDown";
import { getLicenseDetail } from "@/services/permitsLicense";
import {
  licenseDetailDisplayName,
  preferLocalizedEnAr,
  resolveApiEntityLabel,
} from "@/utils/bilingualDisplay";
import { useCommonStore } from "@/store/common-store";
import { useServicesStore } from "@/store/services";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import { createProfileNameColumn, TablePanel } from "@/components/common";
import moment from "moment";
import { firstNullableId } from "@/utils/nullableId";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import {
  getMyRequestCardActions,
  getMyRequestListActions,
  resolveMyRequestStatus,
  type MyRequestStatusKey,
  type MyRequestActionConfig,
  type MyRequestActionKey,
} from "@/utils/myRequestApproval";
import {
  downloadServiceApplicationReceipt,
  getServiceApplicationPayment,
  validateServiceApplicationPayNow,
  type ServiceApplicationPaymentOrderDto,
  type ServiceApplicationPayNowValidateResult,
} from "@/services/paymentCenterServiceApplication";
import {
  cancelCardPaymentTransaction,
  createBatchedServiceApplicationPurchase,
  inquiryCardPayment,
  unwrapPaymentCenterResponse,
} from "@/services/paymentCenterCardPayment";
import { postUserServiceRating } from "@/services/complaints";
import {
  getReceiptDownloadErrorMessage,
  getReceiptDownloadFileName,
  getReceiptPendingMessage,
} from "@/utils/paymentReceipt";
import { useTranslation } from "react-i18next";
import SimpleBar from "@/components/SimpleBar";
import OverflowTooltip from "@/components/common/OverflowTooltip";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import PaymentMethodSelectionModal from "@/components/common/PaymentMethodSelectionModal";
import {
  mapCardPaymentCancelToUiState,
  mapCardPaymentInquiryToUiState,
  type CardPaymentUiStatus,
} from "@/pages/Detail/CardPayment/utils";
import AED from "@/assets/icons/Aed";
import formatMoney from "@/utils/formatMoney";
import { createServiceApplicationActionPath } from "@/utils/permitActionPath";
import {
  getPenaltyEvaluate,
  type PenaltyEvaluateEnvelope,
  type PenaltyEvaluateResponse,
} from "@/services/services";
import {
  buildPenaltyEvaluatePayload,
  isPenaltyEnabledRenewServiceCode,
} from "@/pages/MediaLicense/penaltyPayload";
import {
  createProfileActionRouteState,
  hasProfileActionTarget,
  resolveProfileActionTarget,
} from "@/utils/profileActionContext";
import useKeepAliveActivated from "@/components/KeepAlive/useKeepAliveActivated";
import useKeepAliveScrollRestoration from "@/components/KeepAlive/useKeepAliveScrollRestoration";
import { createKeepAliveAsyncGuard } from "@/components/KeepAlive/asyncGuard";

type MyRequestRecord = {
  id?: number;
  applicationNumber?: string;
  applicationId?: number;
  applicationDetailId?: number;
  applicationStatusId?: number | null;
  applicationStatusEn?: string | null;
  applicationStatusAr?: string | null;
  applicationStatusNameEn?: string | null;
  applicationStatusNameAr?: string | null;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  serviceId?: number | null;
  serviceCode?: string | null;
  serviceNameEn?: string | null;
  serviceNameAr?: string | null;
  createdOn?: string;
  type?: string | null;
  typeNameEn?: string | null;
  typeNameAr?: string | null;
  certificateId?: number | string | null;
  serviceDepartment?: number | null;
  orderAmount?: number | string | null;
};

const TOP_APPLICATION_TABS = [
  { key: "all", labelKey: "ALL" },
  { key: "pendingPayment", labelKey: "PENDING_PAYMENT" },
  {
    key: "pendingModification",
    labelKey: "PENDING_MODIFICATION",
  },
  {
    key: "pendingDisposition",
    labelKey: "PENDING_DISPOSITION",
  },
  { key: "draft", labelKey: "DRAFT" },
];

const TOP_ACTIONABLE_STATUS_KEYS: MyRequestStatusKey[] = [
  "pendingPayment",
  "pendingModification",
  "pendingDisposition",
  "draft",
];

const ALL_STATUSES_VALUE = "__ALL_STATUSES__";
const BATCH_PAYMENT_STORAGE_KEY = "my-requests-batch-card-payment-context";
const BATCH_PAYMENT_POLL_INTERVAL_MS = 3000;
const BATCH_PAYMENT_TIMEOUT_MS = 30 * 60 * 1000;

type BatchPaymentResultStatus = Extract<
  CardPaymentUiStatus,
  "success" | "failed" | "cancelled"
>;

interface BatchPaymentSessionContext {
  applicationIds: number[];
  amount: number;
  transactionNo: string;
  pollingStartedAt: number;
  paymentId?: string;
  tranId?: string;
  correlationId?: string;
}

const getBatchPaymentStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const saveBatchPaymentContext = (context: BatchPaymentSessionContext) => {
  getBatchPaymentStorage()?.setItem(
    BATCH_PAYMENT_STORAGE_KEY,
    JSON.stringify(context),
  );
};

const readBatchPaymentContext = (): BatchPaymentSessionContext | null => {
  const storage = getBatchPaymentStorage();
  const rawValue = storage?.getItem(BATCH_PAYMENT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<BatchPaymentSessionContext>;
    const applicationIds = Array.isArray(parsedValue.applicationIds)
      ? parsedValue.applicationIds.map(Number).filter(Number.isFinite)
      : [];
    const amount = Number(parsedValue.amount);
    const transactionNo = `${parsedValue.transactionNo ?? ""}`;

    if (!applicationIds.length || !Number.isFinite(amount) || !transactionNo) {
      storage?.removeItem(BATCH_PAYMENT_STORAGE_KEY);
      return null;
    }

    return {
      applicationIds,
      amount,
      transactionNo,
      pollingStartedAt:
        typeof parsedValue.pollingStartedAt === "number"
          ? parsedValue.pollingStartedAt
          : Date.now(),
      paymentId: parsedValue.paymentId,
      tranId: parsedValue.tranId,
      correlationId: parsedValue.correlationId,
    };
  } catch (error) {
    console.error("Failed to parse batch payment context:", error);
    storage?.removeItem(BATCH_PAYMENT_STORAGE_KEY);
    return null;
  }
};

const clearBatchPaymentContext = () => {
  getBatchPaymentStorage()?.removeItem(BATCH_PAYMENT_STORAGE_KEY);
};

const toAmountNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const normalizeErrorText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isSuccessResponse = (response: unknown) => {
  if (response === true) {
    return true;
  }

  if (!response || typeof response !== "object") {
    return false;
  }

  const payload = response as { data?: unknown; isSuccess?: unknown };
  return payload.data === true || payload.isSuccess === true;
};

const getBatchPaymentErrorText = (error: unknown) => {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  const directData =
    error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const payload =
    responseData && typeof responseData === "object"
      ? (responseData as Record<string, unknown>)
      : directData;

  return [
    (error as { message?: unknown })?.message,
    payload.code,
    payload.errorCode,
    payload.message,
    payload.errorMessage,
    payload.customMessage,
  ]
    .map(normalizeErrorText)
    .filter(Boolean)
    .join(" ");
};

const getBatchPaymentErrorStatusCode = (error: unknown) => {
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

const unwrapPenaltyEvaluateResponse = (
  response: PenaltyEvaluateResponse | PenaltyEvaluateEnvelope | null | undefined,
): PenaltyEvaluateResponse | null => {
  if (!response || typeof response !== "object") {
    return null;
  }

  if ("data" in response && response.data && typeof response.data === "object") {
    return response.data as PenaltyEvaluateResponse;
  }

  return response as PenaltyEvaluateResponse;
};

function unwrapServiceApplicationPayment(
  response: unknown,
): ServiceApplicationPaymentOrderDto | null {
  if (response == null || typeof response !== "object") {
    return null;
  }

  const payload = response as Record<string, unknown>;
  if (payload.data != null && typeof payload.data === "object") {
    return payload.data as ServiceApplicationPaymentOrderDto;
  }

  return payload as ServiceApplicationPaymentOrderDto;
}

const ApplicationCard: React.FC<{
  title: string;
  statusId?: number | null;
  statusNameEn?: string | null;
  statusNameAr?: string | null;
  actions: MyRequestActionConfig[];
  onActionClick: (
    action: MyRequestActionConfig,
    record: MyRequestRecord,
    e: React.MouseEvent,
  ) => void;
  onCardClick: (record: MyRequestRecord) => void;
  record: MyRequestRecord;
}> = ({
  title,
  statusId,
  statusNameEn,
  statusNameAr,
  actions,
  onActionClick,
  onCardClick,
  record,
}) => {
  return (
    <div className={`application-card`} onClick={() => onCardClick(record)}>
      <div className="payments-talbe-status">
        <CustomStatusTag
          type="myRequest"
          status={statusId ?? ""}
          myRequestStatusNameEn={statusNameEn}
          myRequestStatusNameAr={statusNameAr}
        />
      </div>
      <OverflowTooltip
        className="card-title service-name-text"
        placement="top"
        title={title}
      >
        {title}
      </OverflowTooltip>
      <div className="card-actions">
        {actions.map((actionItem) => (
          <CustomButton
            key={actionItem.key}
            text={actionItem.label}
            variant={actionItem.variant}
            onClick={(e: React.MouseEvent) =>
              onActionClick(actionItem, record, e)
            }
          />
        ))}
      </div>
    </div>
  );
};

const MyRequests: React.FC = () => {
  const history = useHistory();
  const { t, i18n } = useTranslation();
  const isArLang = i18n.language.startsWith("ar");
  const isMobile = useIsMobile();
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const showProfileNameColumn = isGlobalProfileId(currentProfileId);
  const { ensureProfileAction, profileSelectionNode } =
    useProfileActionConfirmation();
  const [filterContainerRef, filtersOverflow] = useFilterOverflow();
  const localizeActionConfig = useCallback(
    (actionItem: MyRequestActionConfig): MyRequestActionConfig => ({
      ...actionItem,
      label: t(`myRequestsPage.actions.${actionItem.key}`),
    }),
    [t],
  );
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<string>(ALL_STATUSES_VALUE);
  const [selectedRequestType, setSelectedRequestType] = useState<string>("");
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [pendingRequestType, setPendingRequestType] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[unknown, unknown] | null>(null);
  const [tableData, setTableData] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfData, setPdfData] = useState({} as LicenseListResponseDto);
  const updateServicesId = useServicesStore((state) => state.updateServicesId);
  const updateServicesCode = useServicesStore(
    (state) => state.updateServicesCode,
  );
  const updateServicesName = useServicesStore(
    (state) => state.updateServicesName,
  );
  const updateApplicationId = useServicesStore(
    (state) => state.updateApplicationId,
  );

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const paginationCurrent = pagination.current;
  const paginationPageSize = pagination.pageSize;
  const [sorter, setSorter] = useState<{
    sortBy?: string;
    sortDirection?: number;
  }>({});

  const [pendingActions, setPendingActions] = useState<
    PendingActionsResponse[]
  >([]);
  const setCommonLoading = useCommonStore((state) => state.setLoading);
  const [cancelModalShow, setCancelModalShow] = useState(false);
  const [deleteModalShow, setDeleteModalShow] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MyRequestRecord | null>(
    null,
  );

  //
  const [, setStatsData] = useState({
    Draft: 0,
    Completed: 0,
    Processing: 0,
    Rejected: 0,
    Cancelled: 0,
  });

  const [statusOptions, setStatusOptions] = useState<
    Array<{ label: string; value: string }>
  >([
    {
      label: t("myRequestsPage.filters.allStatuses"),
      value: ALL_STATUSES_VALUE,
    },
  ]);
  const [requestTypeOptions, setRequestTypeOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [optionsInitialized, setOptionsInitialized] = useState(false);
  const [batchSelectedRowKeys, setBatchSelectedRowKeys] = useState<number[]>([]);
  const [batchPaymentMethodVisible, setBatchPaymentMethodVisible] =
    useState(false);
  const [batchValidatedTotalAmount, setBatchValidatedTotalAmount] =
    useState<number | null>(null);
  const [batchPaymentStatus, setBatchPaymentStatus] =
    useState<CardPaymentUiStatus>("idle");
  const [batchPaymentContext, setBatchPaymentContext] =
    useState<BatchPaymentSessionContext | null>(null);
  const [batchPaymentProgressVisible, setBatchPaymentProgressVisible] =
    useState(false);
  const [batchPaymentConfirmLoading, setBatchPaymentConfirmLoading] =
    useState(false);
  const [batchPaymentCancelLoading, setBatchPaymentCancelLoading] =
    useState(false);
  const [batchPaymentResultStatus, setBatchPaymentResultStatus] =
    useState<BatchPaymentResultStatus | null>(null);
  const [batchPaymentResultMessage, setBatchPaymentResultMessage] =
    useState("");
  const batchPaymentTimeoutRef = useRef<number | null>(null);
  const batchPaymentInFlightRef = useRef(false);
  const batchPaymentRatingSubmittedIdsRef = useRef(new Set<number>());
  const batchPaymentContextRef =
    useRef<BatchPaymentSessionContext | null>(null);
  const batchPaymentFlowVersionRef = useRef(0);
  const batchPaymentInquiryHandlerRef = useRef<
    ((context: BatchPaymentSessionContext, isManual?: boolean) => Promise<void>)
      | null
  >(null);
  const documentGuardRef = useRef(createKeepAliveAsyncGuard());

  const [documnetVisible, setDocumnetVisible] = useState(false as boolean);

  const openDocumentByCertificateId = useCallback(
    async (certificateId: unknown) => {
      const normalizedCertificateId = firstNullableId(certificateId);

      if (!normalizedCertificateId) {
        CustomMessage.error(t("myRequestsPage.messages.documentUnavailable"));
        return;
      }

      setCommonLoading(true);
      const flowVersion = documentGuardRef.current.capture();
      try {
        const res = await getLicenseDetail(normalizedCertificateId);
        if (!documentGuardRef.current.isCurrent(flowVersion)) {
          return;
        }
        const detail = res.data;

        if (!detail?.certificateUrl) {
          CustomMessage.error(t("myRequestsPage.messages.documentFileUnavailable"));
          return;
        }

        setPdfData(detail);
        setDocumnetVisible(true);
      } catch (error) {
        if (!documentGuardRef.current.isCurrent(flowVersion)) {
          return;
        }
        console.error("Failed to load document detail:", error);
        CustomMessage.error(t("myRequestsPage.messages.failedLoadDocument"));
      } finally {
        if (documentGuardRef.current.isCurrent(flowVersion)) {
          setCommonLoading(false);
        }
      }
    },
    [setCommonLoading, t],
  );

  const downloadReceiptByApplicationId = useCallback(
    async (applicationId: number | string | undefined) => {
      const normalizedApplicationId = Number(applicationId);

      if (
        !Number.isFinite(normalizedApplicationId) ||
        normalizedApplicationId <= 0
      ) {
        CustomMessage.error(t("myRequestsPage.messages.receiptNotReady"));
        return;
      }

      setCommonLoading(true);
      try {
        const response = await getServiceApplicationPayment(
          normalizedApplicationId,
        );
        const latestPayment = unwrapServiceApplicationPayment(response);
        const pendingMessage = getReceiptPendingMessage(
          latestPayment?.hasReceipt,
          latestPayment?.receipt,
        );

        if (pendingMessage) {
          CustomMessage.error(pendingMessage);
          return;
        }

        await downloadServiceApplicationReceipt(
          normalizedApplicationId,
          getReceiptDownloadFileName(
            latestPayment?.receipt,
            `receipt-${normalizedApplicationId}.pdf`,
          ),
        );
      } catch (error) {
        CustomMessage.error(getReceiptDownloadErrorMessage(error));
      } finally {
        setCommonLoading(false);
      }
    },
    [setCommonLoading, t],
  );

  const clearBatchSelection = useCallback(() => {
    setBatchSelectedRowKeys([]);
    setBatchValidatedTotalAmount(null);
  }, []);

  const fetchPendingActions = useCallback(async () => {
    try {
      const response = await getPendingActions();
      console.log("response", response);
      if (response && response.data) {
        setPendingActions(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch pending actions:", error);
    }
  }, []);

  const fetchTableData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        pageSize: paginationPageSize,
        pageIndex: paginationCurrent, // API  1
        keyword: searchKeyword,
        applicationStatusId:
          selectedStatus === ALL_STATUSES_VALUE ? undefined : selectedStatus,
        applicationTypeId: selectedRequestType || undefined, //applicationStatusIdapplicationTypeId
        startTime: dateRange?.[0] ? toApi(dateRange[0]) : undefined,
        endTime: dateRange?.[1] ? toApi(dateRange[1]) : undefined,
        sortBy: sorter.sortBy,
        sortDirection: sorter.sortDirection,
      };

      const response = await getApplicationPage(params);

      if (response && response.data) {
        const { applicationPage, applicationStatusCounts } = response.data;
        console.log("page", applicationPage, applicationStatusCounts);
        if (!applicationStatusCounts) {
          setStatsData({
            Draft: 0,
            Completed: 0,
            Processing: 0,
            Rejected: 0,
            Cancelled: 0,
          });
          setTableData([]);
          return;
        }
        //  key
        const dataWithKeys = applicationPage.items.map((item) => ({
          ...item,
          key: item.id.toString(),
        }));
        setTableData(dataWithKeys);
        setPagination((prev) => ({
          ...prev,
          total: applicationPage.total,
        }));

        //
        if (applicationStatusCounts && applicationStatusCounts.length > 0) {
          const newStats = {
            Draft: 0,
            Completed: 0,
            Processing: 0,
            Rejected: 0,
            Cancelled: 0,
          };

          applicationStatusCounts.forEach(
            (count: ApplicationStatusCountResponse) => {
              const statusKey = resolveMyRequestStatus({
                statusId: count.applicationStatusId,
                statusName: count.applicationStatusNameEn,
              });

              if (statusKey === "draft") {
                newStats.Draft += count.count;
              } else if (statusKey === "completed") {
                newStats.Completed += count.count;
              } else if (statusKey === "rejected") {
                newStats.Rejected += count.count;
              } else if (statusKey === "cancelled") {
                newStats.Cancelled += count.count;
              } else if (statusKey !== "unknown") {
                newStats.Processing += count.count;
              }
            },
          );

          setStatsData(newStats);
        }
      }
    } catch (error) {
      console.error("Failed to fetch table data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    paginationPageSize,
    paginationCurrent,
    searchKeyword,
    selectedStatus,
    selectedRequestType,
    dateRange,
    sorter,
  ]);
  //
  const fetchStatusOptions = useCallback(async () => {
    try {
      const response = await getApplicationStatuses();
      if (response && response.data) {
        const allStatusesLabel = t("myRequestsPage.filters.allStatuses");
        const normalizedAllStatusesLabel = allStatusesLabel.trim().toLowerCase();
        const options = response.data
          .filter((item: TypeDictionary) => item.code) //  code  null
          .map((item: TypeDictionary) => {
            const statusKey = resolveMyRequestStatus({
              statusId: item.code,
              statusName: item.nameEn,
            });
            return {
              label:
                statusKey === "unknown"
                  ? resolveApiEntityLabel(isArLang, item)
                  : t(`customStatusTag.myRequest.${statusKey}`),
              value: String(item.code || ""),
            };
          })
          .filter(
            (item: { label: string; value: string }) =>
              item.label &&
              item.value &&
              item.value !== "100" &&
              item.label.trim().toLowerCase() !== normalizedAllStatusesLabel,
          );
        setStatusOptions([
          {
            label: allStatusesLabel,
            value: ALL_STATUSES_VALUE,
          },
          ...options,
        ]);
        return true;
      }
    } catch (error) {
      console.error("Failed to fetch status options:", error);
    }
    return false;
  }, [isArLang, t]);

  const fetchRequestTypeOptions = useCallback(async () => {
    try {
      const response = await getApplicationTypes();
      if (response && response.data) {
        const options = response.data
          .filter((item: TypeDictionary) => item.code)
          //  code  null
          .map((item: TypeDictionary) => ({
            label: resolveApiEntityLabel(isArLang, item),
            value: item.code || "",
          }))
          .filter(
            (item: { label: string; value: string }) =>
              item.label && item.value,
          );
        setRequestTypeOptions([
          {
            label: t("myRequestsPage.filters.allRequestTypes"),
            value: "",
          },
          ...options,
        ]);
        return true;
      }
    } catch (error) {
      console.error("Failed to fetch request type options:", error);
    }
    return false;
  }, [isArLang, t]);

  useEffect(() => {
    const initializeOptions = async () => {
      await Promise.all([
        fetchPendingActions(),
        fetchStatusOptions(),
        fetchRequestTypeOptions(),
      ]);
      setOptionsInitialized(true);
    };
    initializeOptions();
  }, [fetchPendingActions, fetchStatusOptions, fetchRequestTypeOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      clearBatchSelection();
      setSearchKeyword(searchText);
      setPagination((prev) => ({
        ...prev,
        current: 1,
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [clearBatchSelection, searchText]);

  useEffect(() => {
    //
    if (optionsInitialized) {
      fetchTableData();
    }
  }, [fetchTableData, optionsInitialized]);

  const getRecordApplicationId = (record: MyRequestRecord): number | undefined =>
    record.id ?? record.applicationId;

  const getRecordServiceName = (record: MyRequestRecord): string => {
    return isArLang
      ? record.serviceNameAr || record.serviceNameEn || ""
      : record.serviceNameEn || record.serviceNameAr || "";
  };

  const getBatchPenaltyTotalAmount = useCallback(
    async (record: ApplicationItem) => {
      const recordServiceCode = String(record.serviceCode ?? "").trim();
      if (
        recordServiceCode &&
        !isPenaltyEnabledRenewServiceCode(recordServiceCode)
      ) {
        return 0;
      }

      const applicationId = record.id ?? record.applicationId;
      if (!applicationId) {
        throw new Error("Missing application id for penalty evaluation.");
      }

      const detailResponse = await getApplicationDetail(applicationId);
      const detail = detailResponse.data as ApplicationDetailsResponse | null;
      const serviceCode = String(
        detail?.code ||
          detail?.serviceCode ||
          recordServiceCode ||
          record.serviceId ||
          "",
      ).trim();

      if (!isPenaltyEnabledRenewServiceCode(serviceCode)) {
        return 0;
      }

      const sourceApplicationId = Number(detail?.sourceApplicationId ?? 0);
      if (!Number.isFinite(sourceApplicationId) || sourceApplicationId <= 0) {
        throw new Error("Missing lifecycle source for penalty evaluation.");
      }

      const lifecycleResponse = await getApplicationLifecycleActivities(
        sourceApplicationId,
        serviceCode,
        detail?.licensePermitNo,
      );
      const lifecycleContext = (lifecycleResponse.data ||
        null) as LifecycleActivityContext | null;
      const payload = buildPenaltyEvaluatePayload({
        serviceCode,
        applicationId:
          lifecycleContext?.rootApplicationId ?? detail?.applicationId ?? applicationId,
        applicationNo: detail?.applicationNumber ?? record.applicationNumber,
        penaltyFor: lifecycleContext?.penaltyFor ?? null,
      });

      if (!payload) {
        throw new Error("Missing penalty context for penalty evaluation.");
      }

      const evaluateResponse = await getPenaltyEvaluate(
        payload.request,
        payload.correlationId,
      );
      const penaltyData = unwrapPenaltyEvaluateResponse(evaluateResponse);

      return Number(penaltyData?.totalAmount) || 0;
    },
    [],
  );

  const hasBatchPaymentPenalty = useCallback(
    async (records: ApplicationItem[]) => {
      for (const record of records) {
        const penaltyTotalAmount = await getBatchPenaltyTotalAmount(record);
        if (penaltyTotalAmount > 0) {
          return true;
        }
      }

      return false;
    },
    [getBatchPenaltyTotalAmount],
  );

  const showBatchPaymentError = useCallback((message: string) => {
    window.setTimeout(() => {
      CustomMessage.error(message);
    }, 0);
  }, []);

  const isBatchPayableRecord = useCallback((record: ApplicationItem) => {
    const statusKey = resolveMyRequestStatus({
      statusId: record.applicationStatusId,
      statusName: record.applicationStatusNameEn,
    });
    const amount = toAmountNumber(record.orderAmount);

    return statusKey === "pendingPayment" && amount !== null && amount > 0;
  }, []);

  const batchSelectedRows = useMemo(
    () => tableData.filter((record) => batchSelectedRowKeys.includes(record.id)),
    [batchSelectedRowKeys, tableData],
  );
  const batchSelectedTotalAmount = useMemo(
    () =>
      batchSelectedRows.reduce(
        (total, record) => total + (toAmountNumber(record.orderAmount) ?? 0),
        0,
      ),
    [batchSelectedRows],
  );
  const batchDisplayAmount =
    batchPaymentContext?.amount ??
    batchValidatedTotalAmount ??
    batchSelectedTotalAmount;
  const isBatchPaymentBusy =
    batchPaymentStatus === "creating" ||
    batchPaymentStatus === "processing";

  const refreshBatchPaymentSources = useCallback(() => {
    void fetchTableData();
    void fetchPendingActions();
  }, [fetchPendingActions, fetchTableData]);

  const clearBatchPaymentTimer = useCallback(() => {
    if (batchPaymentTimeoutRef.current !== null) {
      window.clearTimeout(batchPaymentTimeoutRef.current);
      batchPaymentTimeoutRef.current = null;
    }
  }, []);

  const resetBatchPaymentFlow = useCallback(() => {
    batchPaymentFlowVersionRef.current += 1;
    batchPaymentInFlightRef.current = false;
    batchPaymentContextRef.current = null;
    clearBatchPaymentTimer();
    clearBatchPaymentContext();
    setBatchPaymentContext(null);
    setBatchPaymentProgressVisible(false);
    setBatchPaymentStatus("idle");
    setBatchPaymentConfirmLoading(false);
    setBatchPaymentCancelLoading(false);
    setBatchPaymentResultStatus(null);
    setBatchPaymentResultMessage("");
  }, [clearBatchPaymentTimer]);

  useKeepAliveActivated({
    onActivated: ({ fromPath }) => {
      if (fromPath !== "/my-requests/detail") {
        return;
      }

      void fetchTableData();
      void fetchPendingActions();
    },
    onDeactivated: () => {
      documentGuardRef.current.invalidate();
      setCommonLoading(false);
      setMobileFilterVisible(false);
      setPendingStatus(null);
      setPendingRequestType(null);
      setCancelModalShow(false);
      setDeleteModalShow(false);
      setSelectedRecord(null);
      setDocumnetVisible(false);
      setBatchPaymentMethodVisible(false);
      resetBatchPaymentFlow();
      clearBatchSelection();
    },
  });

  useKeepAliveScrollRestoration();

  const finishBatchPayment = useCallback(
    (
      context: BatchPaymentSessionContext,
      status: BatchPaymentResultStatus,
      message = "",
    ) => {
      clearBatchPaymentTimer();
      clearBatchPaymentContext();
      clearBatchSelection();
      batchPaymentContextRef.current = context;
      setBatchPaymentContext(context);
      setBatchPaymentProgressVisible(false);
      setBatchPaymentStatus(status);
      setBatchPaymentResultStatus(status);
      setBatchPaymentResultMessage(message);
      if (status === "success") {
        batchPaymentRatingSubmittedIdsRef.current.clear();
      }
      refreshBatchPaymentSources();
    },
    [clearBatchPaymentTimer, clearBatchSelection, refreshBatchPaymentSources],
  );

  const finishBatchPaymentCancellation = useCallback((message = "") => {
    batchPaymentFlowVersionRef.current += 1;
    batchPaymentInFlightRef.current = false;
    clearBatchPaymentTimer();
    clearBatchPaymentContext();
    clearBatchSelection();
    batchPaymentContextRef.current = null;
    setBatchPaymentContext(null);
    setBatchPaymentProgressVisible(false);
    setBatchPaymentStatus("idle");
    setBatchPaymentConfirmLoading(false);
    setBatchPaymentCancelLoading(false);
    setBatchPaymentResultStatus(null);
    setBatchPaymentResultMessage("");
    CustomMessage.success(
      message || t("myRequestsPage.messages.paymentCancelled"),
    );
    refreshBatchPaymentSources();
  }, [
    clearBatchPaymentTimer,
    clearBatchSelection,
    refreshBatchPaymentSources,
    t,
  ]);

  const scheduleBatchPaymentInquiry = useCallback(
    (context: BatchPaymentSessionContext) => {
      clearBatchPaymentTimer();
      batchPaymentTimeoutRef.current = window.setTimeout(() => {
        void batchPaymentInquiryHandlerRef.current?.(context);
      }, BATCH_PAYMENT_POLL_INTERVAL_MS);
    },
    [clearBatchPaymentTimer],
  );

  const isBatchPaymentContextActive = useCallback(
    (context: BatchPaymentSessionContext) =>
      batchPaymentContextRef.current?.transactionNo === context.transactionNo,
    [],
  );

  const handleBatchPaymentInquiry = useCallback(
    async (context: BatchPaymentSessionContext, isManual = false) => {
      if (
        batchPaymentInFlightRef.current ||
        !isBatchPaymentContextActive(context)
      ) {
        return;
      }

      if (!isManual && Date.now() - context.pollingStartedAt > BATCH_PAYMENT_TIMEOUT_MS) {
        clearBatchPaymentTimer();
        batchPaymentContextRef.current = context;
        setBatchPaymentContext(context);
        setBatchPaymentProgressVisible(true);
        setBatchPaymentStatus("processing");
        CustomMessage.warning(t("myRequestsPage.batchPayment.messages.timeout"));
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
        const resolution = mapCardPaymentInquiryToUiState(responseData);

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

        if (
          resolution.status === "failed" ||
          resolution.status === "cancelled"
        ) {
          finishBatchPayment(
            context,
            resolution.status,
            t("myRequestsPage.batchPayment.result.failedDescription"),
          );
          return;
        }

        if (resolution.status === "processing" && isManual) {
          CustomMessage.warning(
            t("myRequestsPage.batchPayment.messages.confirmationPending"),
          );
        }

        if (resolution.status === "query_failed" && isManual) {
          CustomMessage.error(
            t("myRequestsPage.batchPayment.messages.confirmationPending"),
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

        console.error("Failed to inquire batch card payment:", error);
        if (isManual) {
          CustomMessage.error(
            t("myRequestsPage.batchPayment.messages.confirmationPending"),
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
      finishBatchPayment,
      clearBatchPaymentTimer,
      isBatchPaymentContextActive,
      scheduleBatchPaymentInquiry,
      t,
    ],
  );

  useEffect(() => {
    batchPaymentInquiryHandlerRef.current = handleBatchPaymentInquiry;
  }, [handleBatchPaymentInquiry]);

  useEffect(() => {
    const storedContext = readBatchPaymentContext();
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

  const handleBatchPaymentPurchaseError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const errorText = getBatchPaymentErrorText(error);
      const message =
        errorText.includes("overdue") && errorText.includes("fine")
          ? t("myRequestsPage.batchPayment.messages.overdueFine")
          : fallbackMessage;

      console.error("Failed to create batch card payment:", error);
      clearBatchPaymentTimer();
      clearBatchPaymentContext();
      batchPaymentContextRef.current = null;
      batchPaymentFlowVersionRef.current += 1;
      batchPaymentInFlightRef.current = false;
      clearBatchSelection();
      setBatchPaymentMethodVisible(false);
      setBatchPaymentProgressVisible(false);
      setBatchPaymentStatus("idle");
      CustomMessage.error(message);
      refreshBatchPaymentSources();
    },
    [
      clearBatchPaymentTimer,
      clearBatchSelection,
      refreshBatchPaymentSources,
      t,
    ],
  );

  const startBatchPaymentPurchase = useCallback(
    async (applicationIds: number[], amount: number) => {
      if (!applicationIds.length || amount <= 0) {
        CustomMessage.error(
          t("myRequestsPage.batchPayment.messages.notAvailable"),
        );
        return false;
      }

      const paymentWindow = window.open("", "_blank");
      if (!paymentWindow) {
        CustomMessage.error(
          <span className="custom-message__text--error">
            {t("myRequestsPage.batchPayment.messages.popupBlocked")}
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
        const validationResponse = await validateServiceApplicationPayNow({
          applicationIds,
        });
        if (flowVersion !== batchPaymentFlowVersionRef.current) {
          return false;
        }
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
          handleBatchPaymentPurchaseError(
            validationData,
            validationData?.message ||
              t("myRequestsPage.batchPayment.messages.notAvailable"),
          );
          return false;
        }

        if (paymentWindow.closed) {
          handleBatchPaymentPurchaseError(
            validationData,
            t("myRequestsPage.batchPayment.messages.purchaseFailed"),
          );
          return false;
        }

        const response = await createBatchedServiceApplicationPurchase({
          applicationIds,
          amount: validatedAmount,
        });
        if (flowVersion !== batchPaymentFlowVersionRef.current) {
          return false;
        }
        const responseData = unwrapPaymentCenterResponse(response);
        const paymentPageUrl =
          responseData.hostedPaymentPageUrl ||
          responseData.paymentPageUrl ||
          responseData.paymentUrl;

        if (!responseData?.success || !responseData?.transactionNo) {
          handleBatchPaymentPurchaseError(
            responseData,
            t("myRequestsPage.batchPayment.messages.purchaseFailed"),
          );
          return false;
        }

        const nextContext: BatchPaymentSessionContext = {
          applicationIds,
          amount: validatedAmount,
          transactionNo: responseData.transactionNo,
          pollingStartedAt: Date.now(),
          paymentId: responseData.paymentId,
          tranId: responseData.tranId || undefined,
          correlationId: responseData.correlationId || undefined,
        };

        saveBatchPaymentContext(nextContext);
        batchPaymentContextRef.current = nextContext;
        batchPaymentFlowVersionRef.current += 1;
        setBatchPaymentContext(nextContext);
        setBatchPaymentStatus("processing");
        setBatchPaymentProgressVisible(true);

        const shouldRunInquiryDirectly =
          (responseData.isRecovered === true &&
            responseData.nextAction === "RUN_INQUIRY") ||
          !paymentPageUrl;

        if (shouldRunInquiryDirectly) {
          void handleBatchPaymentInquiry(nextContext);
          return true;
        }

        if (paymentWindow.closed) {
          handleBatchPaymentPurchaseError(
            responseData,
            t("myRequestsPage.batchPayment.messages.purchaseFailed"),
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
          t("myRequestsPage.batchPayment.messages.notAvailable"),
        );
        return false;
      } finally {
        if (!paymentPageOpened && !paymentWindow.closed) {
          paymentWindow.close();
        }
      }
    },
    [handleBatchPaymentInquiry, handleBatchPaymentPurchaseError, t],
  );

  async function handleBatchPayNow() {
    if (isBatchPaymentBusy) {
      return;
    }

    const applicationIds = batchSelectedRows
      .map((record) => getRecordApplicationId(record))
      .filter((value): value is number => Number.isFinite(value));
    const hasInvalidSelection =
      applicationIds.length !== batchSelectedRows.length ||
      batchSelectedRows.some((record) => !isBatchPayableRecord(record));

    if (
      !batchSelectedRows.length ||
      hasInvalidSelection ||
      batchSelectedTotalAmount <= 0
    ) {
      clearBatchSelection();
      refreshBatchPaymentSources();
      showBatchPaymentError(t("myRequestsPage.batchPayment.messages.notAvailable"));
      return;
    }

    if (batchSelectedRows.length === 1) {
      const [record] = batchSelectedRows;
      clearBatchSelection();
      goToDetail(record, "payNow");
      return;
    }

    setBatchPaymentStatus("creating");
    const flowVersion = batchPaymentFlowVersionRef.current;

    try {
      const hasPenalty = await hasBatchPaymentPenalty(batchSelectedRows);
      if (flowVersion !== batchPaymentFlowVersionRef.current) {
        return;
      }

      if (hasPenalty) {
        clearBatchSelection();
        refreshBatchPaymentSources();
        showBatchPaymentError(
          t("myRequestsPage.batchPayment.messages.overdueFine"),
        );
        return;
      }

      const validationResponse = await validateServiceApplicationPayNow({
        applicationIds,
      });
      if (flowVersion !== batchPaymentFlowVersionRef.current) {
        return;
      }
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
        clearBatchSelection();
        refreshBatchPaymentSources();
        showBatchPaymentError(
          validationData?.message ||
            t("myRequestsPage.batchPayment.messages.notAvailable"),
        );
        return;
      }

      setBatchValidatedTotalAmount(validatedAmount);
      setBatchPaymentMethodVisible(true);
    } catch (error) {
      if (flowVersion !== batchPaymentFlowVersionRef.current) {
        return;
      }
      console.error("Failed to evaluate batch payment penalty:", error);
      clearBatchSelection();
      refreshBatchPaymentSources();
      showBatchPaymentError(t("myRequestsPage.batchPayment.messages.notAvailable"));
    } finally {
      if (flowVersion === batchPaymentFlowVersionRef.current) {
        setBatchPaymentStatus("idle");
      }
    }
  }

  const handleBatchPaymentMethodClose = useCallback(() => {
    setBatchPaymentMethodVisible(false);
    setBatchValidatedTotalAmount(null);
  }, []);

  const handleBatchPaymentMethodProceed = useCallback(
    async () => {
      if (isBatchPaymentBusy) {
        return;
      }

      const applicationIds = batchSelectedRows
        .map((record) => getRecordApplicationId(record))
        .filter((value): value is number => Number.isFinite(value));
      const started = await startBatchPaymentPurchase(
        applicationIds,
        batchDisplayAmount,
      );

      if (started) {
        setBatchPaymentMethodVisible(false);
        setBatchValidatedTotalAmount(null);
      }
    },
    [
      batchSelectedRows,
      batchDisplayAmount,
      isBatchPaymentBusy,
      startBatchPaymentPurchase,
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

    if (!context?.transactionNo) {
      resetBatchPaymentFlow();
      return;
    }

    if (batchPaymentInFlightRef.current) {
      CustomMessage.warning(
        t("myRequestsPage.batchPayment.messages.confirmationPending"),
      );
      return;
    }

    const flowVersion = batchPaymentFlowVersionRef.current;
    batchPaymentInFlightRef.current = true;
    clearBatchPaymentTimer();
    setBatchPaymentCancelLoading(true);
    setBatchPaymentStatus("processing");
    setBatchPaymentProgressVisible(true);

    try {
      const responseData = unwrapPaymentCenterResponse(
        await cancelCardPaymentTransaction({
          transactionNo: context.transactionNo,
        }),
      );
      const resolution = mapCardPaymentCancelToUiState(responseData);

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
        return;
      }

      batchPaymentContextRef.current = context;
      setBatchPaymentContext(context);
      setBatchPaymentStatus("processing");
      setBatchPaymentProgressVisible(true);
      CustomMessage.warning(t("myRequestsPage.batchPayment.messages.cancelPending"));
    } catch (error) {
      if (
        flowVersion !== batchPaymentFlowVersionRef.current ||
        !isBatchPaymentContextActive(context)
      ) {
        return;
      }

      if (getBatchPaymentErrorStatusCode(error) === 404) {
        CustomMessage.error(
          t("myRequestsPage.batchPayment.messages.transactionNotFound"),
        );
        resetBatchPaymentFlow();
        refreshBatchPaymentSources();
        return;
      }

      console.error("Failed to cancel batch card payment:", error);
      batchPaymentContextRef.current = context;
      setBatchPaymentContext(context);
      setBatchPaymentStatus("processing");
      setBatchPaymentProgressVisible(true);
      CustomMessage.error(
        t("myRequestsPage.batchPayment.messages.cancelFailed"),
      );
    } finally {
      if (flowVersion === batchPaymentFlowVersionRef.current) {
        batchPaymentInFlightRef.current = false;
        setBatchPaymentCancelLoading(false);
      }
    }
  }, [
    batchPaymentContext,
    clearBatchPaymentTimer,
    finishBatchPaymentCancellation,
    finishBatchPayment,
    isBatchPaymentContextActive,
    refreshBatchPaymentSources,
    resetBatchPaymentFlow,
    t,
  ]);

  const handleBatchPaymentResultClose = useCallback(() => {
    resetBatchPaymentFlow();
  }, [resetBatchPaymentFlow]);

  const handleBatchPaymentRatingSubmit = useCallback(
    async (rating: number) => {
      const applicationIds = batchPaymentContext?.applicationIds ?? [];
      if (!rating || !applicationIds.length) return false;

      const pendingApplicationIds = applicationIds.filter(
        (applicationId) =>
          !batchPaymentRatingSubmittedIdsRef.current.has(applicationId),
      );

      if (!pendingApplicationIds.length) return true;

      const results = await Promise.allSettled(
        pendingApplicationIds.map((applicationId) =>
          postUserServiceRating({
            rating,
            referenceNo: String(applicationId),
            isAnonymous: true,
            sourcePage: "MyRequests",
          }),
        ),
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          batchPaymentRatingSubmittedIdsRef.current.add(
            pendingApplicationIds[index],
          );
        }
      });

      if (results.some((result) => result.status === "rejected")) {
        CustomMessage.error(t("complaintsPage.addModal.commentFailed"));
        return false;
      }

      CustomMessage.success(t("complaintsPage.addModal.commentSuccess"));
      return true;
    },
    [batchPaymentContext?.applicationIds, t],
  );

  const handleBatchPaymentRetry = useCallback(() => {
    const retryContext = batchPaymentContext;
    handleBatchPaymentResultClose();

    if (!retryContext) {
      return;
    }

    void startBatchPaymentPurchase(
      retryContext.applicationIds,
      retryContext.amount,
    );
  }, [batchPaymentContext, handleBatchPaymentResultClose, startBatchPaymentPurchase]);

  const batchRowSelection = useMemo(
    () => ({
      selectedRowKeys: batchSelectedRowKeys,
      onChange: (selectedKeys: React.Key[]) => {
        setBatchSelectedRowKeys(
          selectedKeys.map(Number).filter(Number.isFinite),
        );
      },
      getCheckboxProps: (record: ApplicationItem) => ({
        disabled: isBatchPaymentBusy || !isBatchPayableRecord(record),
      }),
      renderCell: (
        _checked: boolean,
        _record: ApplicationItem,
        _index: number,
        originNode: React.ReactNode,
      ) => <span onClick={(event) => event.stopPropagation()}>{originNode}</span>,
    }),
    [batchSelectedRowKeys, isBatchPayableRecord, isBatchPaymentBusy],
  );

  const goToDetail = (record: MyRequestRecord, actionName?: string) => {
    const recordId = getRecordApplicationId(record);
    if (!recordId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationDetailUnavailable"),
      );
      return;
    }

    updateServicesId(record.serviceId ? Number(record.serviceId) : null);
    updateServicesCode(record.serviceCode || "");
    updateServicesName(getRecordServiceName(record));
    updateApplicationId(recordId);

    const certificateId = firstNullableId(record.certificateId);
    const searchParams = new URLSearchParams({ id: String(recordId) });

    if (certificateId) {
      searchParams.set("certificateId", String(certificateId));
    }

    if (actionName) {
      searchParams.set("action", actionName);
    }

    if (record.typeNameEn) {
      searchParams.set("typeNameEn", record.typeNameEn);
    }

    if (record.typeNameAr) {
      searchParams.set("typeNameAr", record.typeNameAr);
    }

    history.push({
      pathname: "/my-requests/detail",
      search: `?${searchParams.toString()}`,
      state: createProfileActionRouteState(record),
    });
  };

  const ensureRecordProfileAction = useCallback(
    async (record: MyRequestRecord) => {
      if (
        hasProfileActionTarget(record) &&
        !isGlobalProfileId(record.profileId)
      ) {
        return ensureProfileAction(record);
      }

      // A normal profile is already the acting identity. Do not turn an
      // optional Global View lookup into a blocker for existing edit flows.
      if (
        !isGlobalProfileId(currentProfileId) &&
        !hasProfileActionTarget(record)
      ) {
        return true;
      }

      const recordId = getRecordApplicationId(record);
      if (!recordId) {
        return false;
      }

      try {
        const response = await getApplicationDetail(recordId);
        const target = resolveProfileActionTarget(
          response.data as ApplicationDetailsResponse,
          record,
        );

        return ensureProfileAction(target || {});
      } catch (error) {
        console.error("resolve record profile action", error);
        CustomMessage.error(t("common.requestFailed"));
        return false;
      }
    },
    [currentProfileId, ensureProfileAction, t],
  );

  const openCancelModal = (record: MyRequestRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRecord(record);
    setCancelModalShow(true);
  };

  const openDeleteModal = (record: MyRequestRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRecord(record);
    setDeleteModalShow(true);
  };

  const handleConfirmCancel = async () => {
    const recordId = selectedRecord ? getRecordApplicationId(selectedRecord) : undefined;
    if (recordId) {
      try {
        const response = await cancelApplication(recordId);
        if (isSuccessResponse(response)) {
          fetchTableData();
          fetchPendingActions();
          CustomMessage.success(t("myRequestsPage.messages.applicationCancelled"));
        }
      } catch (error) {
        console.error("Failed to cancel application:", error);
        CustomMessage.error(t("myRequestsPage.messages.applicationCancelFailed"));
      }
    }
    setCancelModalShow(false);
    setSelectedRecord(null);
  };

  const handleConfirmDelete = async () => {
    const recordId = selectedRecord ? getRecordApplicationId(selectedRecord) : undefined;
    if (recordId) {
      try {
        const response = await deleteApplication(recordId);
        if (isSuccessResponse(response)) {
          fetchTableData();
          fetchPendingActions();
          CustomMessage.success(t("myRequestsPage.messages.applicationDeleted"));
        }
      } catch (error) {
        console.error("Failed to delete application:", error);
        CustomMessage.error(t("myRequestsPage.messages.applicationDeleteFailed"));
      }
    }
    setDeleteModalShow(false);
    setSelectedRecord(null);
  };

  const handleDuplicate = async (record: MyRequestRecord) => {
    const recordId = getRecordApplicationId(record);

    if (!recordId || !record.serviceId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationDuplicateUnavailable"),
      );
      return;
    }

    try {
      const profileConfirmed = await ensureRecordProfileAction(record);
      if (!profileConfirmed) {
        return;
      }

      updateServicesCode(record.serviceCode || "");
      updateServicesId(Number(record.serviceId));
      window.localStorage.setItem(
        "duplicateRecord",
        JSON.stringify({ ...record, id: recordId }),
      );
      history.push(
        createServiceApplicationActionPath({
          serviceId: Number(record.serviceId),
          action: "Duplicate",
          serviceCode: record.serviceCode,
          applicationId: recordId,
          applicationStatusId: record.applicationStatusId,
          includeServiceEntryGate: true,
          sourceSearch: history.location.search,
        }),
      );
    } catch (error) {
      console.error("handleDuplicate profile confirmation", error);
      CustomMessage.error(t("common.requestFailed"));
    }
  };
  const handEdit = async (record: MyRequestRecord) => {
    const recordId = getRecordApplicationId(record);

    if (!recordId || !record.serviceId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationEditUnavailable"),
      );
      return;
    }

    const profileConfirmed = await ensureRecordProfileAction(record);
    if (!profileConfirmed) {
      return;
    }

    updateServicesCode(record.serviceCode || "");
    updateServicesId(Number(record.serviceId));
    history.push(
      createServiceApplicationActionPath({
        serviceId: Number(record.serviceId),
        action: "edit",
        serviceCode: record.serviceCode,
        applicationId: recordId,
        applicationStatusId: record.applicationStatusId,
        includeServiceEntryGate: true,
        sourceSearch: history.location.search,
      }),
    );
  };

  const runRequestAction = (
    actionKey: MyRequestActionKey,
    record: MyRequestRecord,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();

    switch (actionKey) {
      case "details":
        goToDetail(record);
        break;
      case "edit":
        void handEdit(record);
        break;
      case "delete":
        openDeleteModal(record, e);
        break;
      case "payNow":
        goToDetail(record, "payNow");
        break;
      case "cancel":
        openCancelModal(record, e);
        break;
      case "duplicate":
        void handleDuplicate(record);
        break;
      case "viewDocument":
        void openDocumentByCertificateId(record.certificateId);
        break;
      case "downloadReceipt":
        void downloadReceiptByApplicationId(getRecordApplicationId(record));
        break;
      case "submitProof":
        goToDetail(record, "submitProof");
        break;
      default:
        break;
    }
  };

  const columns = [
    {
      title: t("myRequestsPage.table.applicationNo"),
      dataIndex: "applicationNumber",
      key: "applicationNumber",
    },
    {
      title: t("myRequestsPage.table.serviceName"),
      key: "serviceName",
      onCell: () => ({ style: { maxWidth: 280 } }),
      render: (_: unknown, record: ApplicationItem) => {
        const text = preferLocalizedEnAr(
          isArLang,
          record.serviceNameEn,
          record.serviceNameAr,
        );
        return (
          <OverflowTooltip
            className="service-name-text"
            placement="top"
            title={text}
          >
            {text}
          </OverflowTooltip>
        );
      },
    },
    {
      title: t("myRequestsPage.table.requestType"),
      key: "requestType",
      render: (_: unknown, record: ApplicationItem) =>
        preferLocalizedEnAr(isArLang, record.typeNameEn, record.typeNameAr),
    },
    ...(showProfileNameColumn
      ? [createProfileNameColumn<ApplicationItem>(t("common.profileName"))]
      : []),
    {
      title: t("myRequestsPage.table.submissionTime"),
      dataIndex: "createdOn",
      key: "createdOn",
      sorter: true,

      render: (text: string) => {
        return moment(text).format("DD/MM/YYYY HH:mm:ss");
      },
      // render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t("myRequestsPage.table.status"),
      dataIndex: "applicationStatusId",
      key: "status",
      render: (text: number, record: ApplicationItem) => {
        return (
          <div className="payments-talbe-status">
            <CustomStatusTag
              type="myRequest"
              status={text}
              myRequestStatusNameEn={record.applicationStatusNameEn}
              myRequestStatusNameAr={record.applicationStatusNameAr}
            />
          </div>
        );
      },
    },
    {
      title: t("myRequestsPage.table.actions"),
      key: "actions",
      fixed: "right" as const,
      width: "1%",
      className: "actions-column",
      onHeaderCell: () => ({
        className: "actions-column",
      }),
      render: (_: unknown, record: ApplicationItem) => {
        const actionItems = getMyRequestListActions({
          statusId: record.applicationStatusId,
          statusName: record.applicationStatusNameEn,
          serviceCode: record.serviceCode,
          isContentService: record.serviceDepartment === 2,
          orderAmount: record.orderAmount,
        }).map(localizeActionConfig);
        const inlineActionItems = isMobile ? [] : actionItems.slice(0, 2);
        const overflowActionItems = isMobile ? actionItems : actionItems.slice(2);
        const overflowMenu = (
          <Menu
            onClick={({ key, domEvent }) => {
              domEvent.stopPropagation();
              runRequestAction(key as MyRequestActionKey, record);
            }}
          >
            {overflowActionItems.map((actionItem) => (
              <Menu.Item key={actionItem.key}>{actionItem.label}</Menu.Item>
            ))}
          </Menu>
        );

        return (
          <div className="my-request-table-actions">
            {inlineActionItems.length > 0 && (
              <div className="my-request-table-actions__links">
                {inlineActionItems.map((actionItem) => (
                  <button
                    key={actionItem.key}
                    type="button"
                    className="my-request-table-action-link"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                      runRequestAction(actionItem.key, record, e)
                    }
                  >
                    {actionItem.label}
                  </button>
                ))}
              </div>
            )}
            {overflowActionItems.length > 0 && (
              <Dropdown
                trigger={["click"]}
                overlayClassName="myRequest-dropdown"
                overlay={overflowMenu}
              >
                <button
                  type="button"
                  className="my-request-more-button my-request-more-button--table"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreOutlined />
                </button>
              </Dropdown>
            )}
          </div>
        );
      },
    },
  ];

  const topApplicationSource: MyRequestRecord[] = pendingActions;
  const topApplicationsByStatus = TOP_ACTIONABLE_STATUS_KEYS.reduce(
    (applicationsByStatus, statusKey) => {
      applicationsByStatus[statusKey] = topApplicationSource
        .filter(
          (item) =>
            resolveMyRequestStatus({
              statusId: item.applicationStatusId,
              statusName: item.applicationStatusNameEn,
            }) === statusKey,
        )
        .sort((a, b) => {
          const nextTime = new Date(b.createdOn || "").getTime();
          const currentTime = new Date(a.createdOn || "").getTime();
          return (Number.isFinite(nextTime) ? nextTime : 0) -
            (Number.isFinite(currentTime) ? currentTime : 0);
        })
      return applicationsByStatus;
    },
    {} as Record<(typeof TOP_ACTIONABLE_STATUS_KEYS)[number], MyRequestRecord[]>,
  );
  const allTopApplications = TOP_ACTIONABLE_STATUS_KEYS.flatMap(
    (statusKey) => topApplicationsByStatus[statusKey],
  );
  const topApplications =
    activeTab === "all"
      ? allTopApplications
      : topApplicationsByStatus[activeTab as MyRequestStatusKey] || [];
  const tabs = TOP_APPLICATION_TABS.map((tab) => ({
    ...tab,
    count:
      tab.key === "all"
        ? allTopApplications.length
        : topApplicationsByStatus[tab.key as MyRequestStatusKey]?.length ?? 0,
  }));
  const hasTopApplicationsArea =
    (tabs.find((tab) => tab.key === "all")?.count ?? 0) > 0;
  const topApplicationsScrollRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    topApplicationsScrollRef.current?.scrollTo({ left: 0 });
  }, [activeTab]);

  return (
    <div className="my-requests">
      {hasTopApplicationsArea && (
        <div className="my-requests-container">
          <div className="tabs-container">
            {tabs.map((tab) => (
              <div
                key={tab.key}
                className={`tab-item ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {t(`myRequestsPage.tabs.${tab.labelKey}`)} ({tab.count})
              </div>
            ))}
          </div>

          <SimpleBar
            className="top-applications"
            scrollableNodeProps={{ ref: topApplicationsScrollRef }}
          >
            <div
              className={`top-applications__content ${
                topApplications.length === 0
                  ? "top-applications__content--empty"
                  : ""
              }`}
            >
              {topApplications.length > 0 ? (
                topApplications.map((app, index) => {
                  return (
                    <ApplicationCard
                      record={app}
                      key={`${app.applicationId || index}-${app.applicationDetailId || ""}`}
                      title={getRecordServiceName(app) || "-"}
                      statusId={app.applicationStatusId}
                      statusNameEn={
                        app.applicationStatusNameEn || app.applicationStatusEn
                      }
                      statusNameAr={
                        app.applicationStatusNameAr || app.applicationStatusAr
                      }
                      actions={getMyRequestCardActions({
                        statusId: app.applicationStatusId,
                        statusName:
                          app.applicationStatusNameEn || app.applicationStatusEn,
                        isContentService: app.serviceDepartment === 2,
                        orderAmount: app.orderAmount,
                      }).map(localizeActionConfig)}
                      onActionClick={(actionItem, record, e) =>
                        runRequestAction(actionItem.key, record, e)
                      }
                      onCardClick={goToDetail}
                    />
                  );
                })
              ) : (
                <div className="top-applications__empty">
                  <EmptyBox
                    customClassName="top-applications__empty-state"
                    title={t("common.noData")}
                  />
                </div>
              )}
            </div>
          </SimpleBar>
        </div>
      )}

      <div className="my-requests-container2">
        <div className="filter-container" ref={filterContainerRef}>
          <Input
            className="search-input"
            placeholder={t("formPlaceholders.common.search")}
            prefix={<SearchIcon />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          {!filtersOverflow && (
            <>
              <DatePicker.RangePicker
                className="date-input"
                placeholder={[
                  t("formPlaceholders.common.startTime"),
                  t("formPlaceholders.common.endTime"),
                ]}
                onChange={(val) => {
                  clearBatchSelection();
                  setDateRange(val);
                  setPagination((prev) => ({ ...prev, current: 1 }));
                }}
              />
              <Select
                className="filter-select"
                placeholder={t("formPlaceholders.common.allStatuses")}
                allowClear
                value={selectedStatus}
                onChange={(val) => {
                  clearBatchSelection();
                  setSelectedStatus(val ?? ALL_STATUSES_VALUE);
                  setPagination((prev) => ({ ...prev, current: 1 }));
                }}
                options={statusOptions}
              />
              <Select
                className="filter-select"
                allowClear
                placeholder={t("formPlaceholders.pages.myRequests.filters.requestTypes")}
                value={selectedRequestType}
                onChange={(val) => {
                  clearBatchSelection();
                  setSelectedRequestType(val);
                  setPagination((prev) => ({ ...prev, current: 1 }));
                }}
                options={requestTypeOptions}
              />
            </>
          )}
          {filtersOverflow && (
            <button
              className="mobile-filter-trigger"
              onClick={() => {
                setPendingStatus(selectedStatus);
                setPendingRequestType(selectedRequestType || null);
                setMobileFilterVisible(true);
              }}
            >
              <FilterIcon />
              {(selectedStatus !== ALL_STATUSES_VALUE || !!selectedRequestType) && (
                <span className="mobile-filter-trigger__badge" />
              )}
            </button>
          )}
        </div>
        <MobileFilterModal
          visible={mobileFilterVisible}
          onClose={() => setMobileFilterVisible(false)}
          onConfirm={() => {
            clearBatchSelection();
            setSelectedStatus(pendingStatus ?? ALL_STATUSES_VALUE);
            setSelectedRequestType(pendingRequestType ?? "");
            setPagination((prev) => ({ ...prev, current: 1 }));
            setMobileFilterVisible(false);
          }}
          sections={[
            {
              title: t("formPlaceholders.common.allStatuses"),
              options: statusOptions,
              value: pendingStatus,
              onChange: (v) => setPendingStatus(v as string | null),
            },
            {
              title: t("formPlaceholders.pages.myRequests.filters.requestTypes"),
              options: requestTypeOptions,
              value: pendingRequestType,
              onChange: (v) => setPendingRequestType(v as string | null),
            },
          ]}
        />
        {batchSelectedRows.length > 0 && (
          <div className="my-requests-batch-toolbar">
            <div className="my-requests-batch-toolbar__selection">
              <span className="my-requests-batch-toolbar__label">
                {t(
                  batchSelectedRows.length === 1
                    ? "myRequestsPage.batchPayment.selectedLabelOne"
                    : "myRequestsPage.batchPayment.selectedLabelOther",
                )}
              </span>
              <strong>{batchSelectedRows.length}</strong>
            </div>
            <div className="my-requests-batch-toolbar__payment">
              <div className="my-requests-batch-toolbar__summary">
                <span className="my-requests-batch-toolbar__amount">
                  <span className="my-requests-batch-toolbar__label">
                    {t("myRequestsPage.batchPayment.totalAmount")}
                  </span>
                  <strong>
                    <AED />
                    {formatMoney(batchSelectedTotalAmount)}
                  </strong>
                </span>
              </div>
              <CustomButton
                text={t("myRequestsPage.batchPayment.payNow")}
                variant="primary"
                loading={isBatchPaymentBusy}
                disabled={isBatchPaymentBusy}
                customClassName="my-requests-batch-toolbar__pay-button"
                onClick={handleBatchPayNow}
              />
            </div>
          </div>
        )}
        <TablePanel
          // summaryItems={[
          //   {
          //     label: "Draft",
          //     value: statsData.Draft,
          //     status: "default",
          //   },
          //   {
          //     label: "Completed",
          //     value: statsData.Completed,
          //     status: "success",
          //   },
          //   {
          //     label: "Under Review",
          //     value: statsData.Processing,
          //     status: "warning",
          //   },
          //   {
          //     label: "Rejected",
          //     value: statsData.Rejected,
          //     status: "error",
          //   },

          //   {
          //     label: "Cancelled",
          //     value: statsData.Cancelled,
          //     status: "default",
          //   },
          // ]}
          tableProps={{
            loading,
            columns: columns,
            dataSource: tableData,
            rowKey: "id",
            scroll: { x: 'max-content' },
            pagination: {
              ...pagination,
              position: ["bottomCenter"],
              showSizeChanger: true,
              showTotal: (total) => {
                const totalPages = Math.ceil(total / pagination.pageSize);
                return (
                  <div className="payments-page-total-wrapper">
                    <div className="payments-page-total">
                      {t("myRequestsPage.pagination.total", { count: total })}
                    </div>
                    <div>
                      {t("myRequestsPage.pagination.pageOfTotal", {
                        current: pagination.current,
                        pages: totalPages,
                      })}
                    </div>
                  </div>
                );
              },
            },
            rowSelection: batchRowSelection,
            onChange: (
              newPagination: {
                current?: number;
                pageSize?: number;
              },
              _filters: unknown,
              sorter:
                | {
                    field?: React.Key | readonly React.Key[];
                    order?: string | null;
                  }
                | Array<{
                    field?: React.Key | readonly React.Key[];
                    order?: string | null;
                  }>,
            ) => {
              clearBatchSelection();
              const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
              setPagination((currentPagination) => {
                const nextPageSize =
                  newPagination.pageSize ?? currentPagination.pageSize;

                return {
                  current:
                    nextPageSize !== currentPagination.pageSize
                      ? 1
                      : newPagination.current ?? currentPagination.current,
                  pageSize: nextPageSize,
                  total: currentPagination.total,
                };
              });
              if (
                activeSorter &&
                activeSorter.field === "createdOn" &&
                activeSorter.order
              ) {
                setSorter({
                  sortBy: "createdOn",
                  sortDirection: activeSorter.order === "descend" ? 0 : 1,
                });
              } else {
                setSorter({
                  sortBy: "",
                  sortDirection: 0,
                });
              }
            },
            onRow: (record) => ({
              onClick: (event) => {
                const target = event.target;
                if (
                  target instanceof Element &&
                  target.closest(".ant-table-selection-column")
                ) {
                  if (!target.closest(".ant-checkbox")) {
                    target
                      .closest(".ant-table-selection-column")
                      ?.querySelector<HTMLInputElement>(".ant-checkbox-input")
                      ?.click();
                  }
                  return;
                }

                goToDetail(record);
              },
            }),
          }}
        />
      </div>

      <PaymentMethodSelectionModal
        visible={batchPaymentMethodVisible}
        onCancel={handleBatchPaymentMethodClose}
        onProceed={handleBatchPaymentMethodProceed}
        totalAmount={batchDisplayAmount}
        items={batchSelectedRows.map((record) => ({
          title: record.serviceNameEn ?? record.serviceNameAr ?? "",
          reference: record.applicationNumber ?? "",
          amount: toAmountNumber(record.orderAmount) ?? 0,
        }))}
      />

      <CardPaymentProgressModal
        visible={
          batchPaymentProgressVisible &&
          (batchPaymentStatus === "creating" ||
            batchPaymentStatus === "processing")
        }
        amount={batchDisplayAmount}
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
        className={`my-requests-batch-result-modal my-requests-batch-result-modal--${
          batchPaymentResultStatus === "success" ? "success" : "failed"
        }`}
      >
        <div className="my-requests-batch-result-modal__body">
          <div className="my-requests-batch-result-modal__content">
            <div
              className={`my-requests-batch-result-modal__icon my-requests-batch-result-modal__icon--${
                batchPaymentResultStatus === "success" ? "success" : "failed"
              }`}
            >
              {batchPaymentResultStatus === "success" ? (
                <CheckOutlined />
              ) : (
                <ExclamationOutlined />
              )}
            </div>
            <div className="my-requests-batch-result-modal__copy">
              <h2>
                {batchPaymentResultStatus === "success"
                  ? t("myRequestsPage.batchPayment.result.successTitle")
                  : batchPaymentResultStatus === "cancelled"
                  ? t("myRequestsPage.batchPayment.result.cancelledTitle")
                  : t("myRequestsPage.batchPayment.result.failedTitle")}
              </h2>
              <p>
                {batchPaymentResultStatus === "success"
                  ? t("myRequestsPage.batchPayment.result.successDescription")
                  : batchPaymentResultStatus === "cancelled"
                  ? batchPaymentResultMessage ||
                    t("myRequestsPage.batchPayment.result.cancelledDescription")
                  : batchPaymentResultMessage ||
                    t("myRequestsPage.batchPayment.result.failedDescription")}
              </p>
            </div>
            <div
              className={`my-requests-batch-result-modal__amount my-requests-batch-result-modal__amount--${
                batchPaymentResultStatus === "success" ? "success" : "failed"
              }`}
            >
              <span>{t("myRequestsPage.batchPayment.result.amount")}</span>
              <strong>
                <AED />
                {formatMoney(batchDisplayAmount)}
              </strong>
            </div>
            {batchPaymentResultStatus === "failed" && (
              <div className="my-requests-batch-result-modal__alert">
                <CloseCircleFilled />
                <span>{t("myRequestsPage.batchPayment.result.failedAlert")}</span>
              </div>
            )}
            <div className="my-requests-batch-result-modal__actions">
              {batchPaymentResultStatus === "success" ? (
                <CustomButton
                  text={t("myRequestsPage.batchPayment.result.ok")}
                  variant="outline"
                  customClassName="my-requests-batch-result-modal__action my-requests-batch-result-modal__action--secondary"
                  onClick={handleBatchPaymentResultClose}
                />
              ) : (
                <>
                  <CustomButton
                    text={t("myRequestsPage.batchPayment.result.cancel")}
                    variant="outline"
                    customClassName="my-requests-batch-result-modal__action my-requests-batch-result-modal__action--secondary"
                    onClick={handleBatchPaymentResultClose}
                  />
                  <CustomButton
                    text={t("myRequestsPage.batchPayment.result.retry")}
                    variant="primary"
                    customClassName="my-requests-batch-result-modal__action"
                    onClick={handleBatchPaymentRetry}
                  />
                </>
              )}
            </div>
          </div>
          {batchPaymentResultStatus === "success" && (
            <PaymentSuccessFeedback
              title={t("myRequestsPage.batchPayment.result.feedbackTitle")}
              dissatisfiedLabel={t(
                "myRequestsPage.batchPayment.result.dissatisfied",
              )}
              satisfiedLabel={t(
                "myRequestsPage.batchPayment.result.satisfied",
              )}
              submitLabel={t("common.submit")}
              onSubmit={handleBatchPaymentRatingSubmit}
            />
          )}
        </div>
      </Modal>

      <ComfirmModal
        icon={WarningCircle}
        title={t("myRequestsPage.cancelModal.title")}
        content={t("myRequestsPage.cancelModal.content")}
        show={cancelModalShow}
        close={() => setCancelModalShow(false)}
        comfrimHanld={handleConfirmCancel}
        type="warning"
      />

      <ComfirmModal
        icon={WarningCircle}
        type="warning"
        title={t("myRequestsPage.deleteModal.title")}
        content={t("myRequestsPage.deleteModal.content")}
        show={deleteModalShow}
        close={() => setDeleteModalShow(false)}
        comfrimHanld={handleConfirmDelete}
        comfrimText={t("myRequestsPage.deleteModal.confirmButton")}
      />

      <DocumentDown
        visible={documnetVisible}
        fileName={licenseDetailDisplayName(isArLang, pdfData)}
        url={pdfData.certificateUrl || ""}
        password={pdfData.pdfPassword || ""}
        title={t("myRequestsPage.documentModal.title")}
        subtitle={t("myRequestsPage.documentModal.subtitle")}
        noteTitle={t("myRequestsPage.documentModal.noteTitle")}
        noteText={t("myRequestsPage.documentModal.noteText")}
        passwordLabel={t("myRequestsPage.documentModal.passwordLabel")}
        copyButtonText={t("myRequestsPage.documentModal.copyRedirect")}
        cancle={() => {
          setDocumnetVisible(false);
        }}
      />
      {profileSelectionNode}
    </div>
  );
};

export default MyRequests;
