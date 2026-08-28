import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  LeftOutlined,
  MoreOutlined,
  RightOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import FilterIcon from "@/assets/icons/FilterIcon";
import SimpleBar from "@/components/SimpleBar";
import MobileFilterModal from "@/components/common/MobileFilterModal";
import {
  Dropdown,
  Input,
  Menu,
  Select,
  Spin,
  Table,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import moment from "moment";
import { useHistory, useLocation } from "react-router-dom";
import useIsMobile from "@/hooks/useIsMobile";
import useFilterOverflow from "@/hooks/useFilterOverflow";
import {
  AppPagination,
  createProfileNameColumn,
  CustomButton,
  CustomMessage,
} from "@/components/common";
import {
  useProfileActionConfirmation,
  useServiceEntryGateDialogController,
} from "@/components/ServiceEntryGate";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { useServicesStore } from "@/store/services";
import { useUpdateFormStore } from "@/store/update-form";
import {
  createLicenseLifecycleRouteState,
  createLicenseLifecycleSource,
} from "@/utils/licenseLifecycleSource";
import {
  createPermitActionPath,
  resolvePermitActionApplicationId,
} from "@/utils/permitActionPath";
import {
  isServiceEntryGateEnabled,
  openServiceWithGate,
} from "@/utils/serviceEntryGate";
import {
  getActionNeeded,
  getLicenseDetail,
  getLicenseList,
  validatePermitAction,
  type LicensePermitActionNeededItemDto,
  type LicensePermitAllowedActionDto,
  type LicensePermitDocumentType,
  type LicensePermitListItemDto,
  type LicensePermitQueryResponse,
  type LicensePermitValidateResponse,
  type LicenseListResponseDto,
} from "@/services/permitsLicense";
import { enquiryApplication } from "@/services/refund";
import DocumentDown from "./components/DocumentDown";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import "./index.less";
import { useTranslation } from "react-i18next";
import {
  licenseDetailDisplayName,
  licensePermitListDisplayName,
} from "@/utils/bilingualDisplay";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import {
  formatDisplayDate,
  formatDisplayDateRange,
} from "@/utils/date";

type ViewMode = "table" | "grid";
type SortOrder = "ascend" | "descend";
type LicenseStatus =
  | "ACTIVE"
  | "EXPIRE_SOON"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED";
type ActionType =
  | "RENEW"
  | "MODIFY"
  | "CANCEL"
  | "TRANSFER"
  | "PARTNER_MANAGEMENT"
  | "DOWNLOAD";
type SortField = "effectiveDate" | "expireDate" | "lastUpdateTime";
type PermitAllowedAction = LicensePermitAllowedActionDto & { action: ActionType };

interface PermitViewModel {
  id: string;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  applicationId?: number | null;
  type?: number | null;
  documentId: string;
  documentName: string;
  documentType: LicensePermitDocumentType;
  /** Certificate number. Identity value the download/action flows key on - do not render it. */
  licensePermitNo: string;
  /** Number shown in the list column and on the mobile card. */
  showLicenseNumber: string;
  applicationNo: string;
  sourceLicenseId?: number | null;
  sourceServiceCode?: string | null;
  sourceMedialLicenseId?: number | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  effectiveDate: string;
  expireDate: string;
  lastUpdateTime: string;
  status: LicenseStatus;
  allowedActions: PermitAllowedAction[];
  downloadUrl?: string | null;
  hasInProgressApplication?: boolean;
  inProgressApplicationType?: string | null;
  serviceId?: number | null;
  serviceCode?: string | null;
}

interface ActionNeededViewModel {
  id: string;
  profileId?: number | string | null;
  userTypeId?: number | string | null;
  applicationId?: number | null;
  type?: number | null;
  documentId: string;
  documentName: string;
  documentType: LicensePermitDocumentType;
  /** Certificate number. Identity value the action flows key on - do not render it. */
  licensePermitNo: string;
  /** Number shown on the action-needed card. */
  showLicenseNumber: string;
  serviceId?: number | null;
  serviceCode?: string | null;
  sourceLicenseId?: number | null;
  sourceServiceCode?: string | null;
  sourceMedialLicenseId?: number | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  effectiveDate: string;
  expireDate: string;
  expireLabel: string;
  status: LicenseStatus;
  allowedActions: PermitAllowedAction[];
}

interface PdfState {
  visible: boolean;
  fileName: string;
  url: string;
  password: string;
}

type DataEnvelope<T> = { data: T };

const unwrapPayload = <T,>(response: unknown): T => {
  if (
    typeof response === "object" &&
    response !== null &&
    "data" in response
  ) {
    return (response as DataEnvelope<T>).data;
  }

  return response as T;
};

const ENABLE_PERMITS_UI_MOCKS =
  import.meta.env.DEV &&
  import.meta.env.VITE_LICENSES_PERMITS_ENABLE_MOCKS === "true";

const VIEW_PAGE_SIZE: Record<ViewMode, number> = {
  table: 10,
  grid: 8,
};

const ACTION_TYPE_SET = new Set<ActionType>([
  "RENEW",
  "MODIFY",
  "CANCEL",
  "TRANSFER",
  "PARTNER_MANAGEMENT",
  "DOWNLOAD",
]);
const GATED_PERMIT_ACTIONS = new Set<ActionType>([
  "RENEW",
  "MODIFY",
  "CANCEL",
  "PARTNER_MANAGEMENT",
]);
const LICENSE_PERMIT_NO_REQUIRED_SERVICE_IDS = new Set([
  1802,
  802,
  804,
  806,
  1202,
  1204,
  1205,
  80022,
  80042,
  80021,
  80041,
]);
const STATUS_FILTER_ORDER: LicenseStatus[] = [
  "ACTIVE",
  "EXPIRE_SOON",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED",
];
const SORT_DIRECTIONS: SortOrder[] = ["descend", "ascend"];
const SORT_FIELD_SET = new Set<SortField>([
  "effectiveDate",
  "expireDate",
  "lastUpdateTime",
]);

const isActionType = (value: string): value is ActionType =>
  ACTION_TYPE_SET.has(value as ActionType);

const isSortField = (value: string): value is SortField =>
  SORT_FIELD_SET.has(value as SortField);

const shouldRunServiceEntryGateForAction = (action: ActionType) =>
  GATED_PERMIT_ACTIONS.has(action);

const normalizeLicensePermitNo = (value?: string | null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "-") {
    return undefined;
  }

  return normalized;
};

const isInProgressValidationResult = (
  result: LicensePermitValidateResponse,
) => {
  if (result.inProgressApplicationType) {
    return true;
  }

  const normalizedText = [
    result.reasonCode,
    result.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  return (
    normalizedText.includes("in progress") ||
    normalizedText.includes("under review") ||
    normalizedText.includes("pending payment")
  );
};

const createPermitActionKey = (
  action: ActionType,
  record: Pick<PermitViewModel | ActionNeededViewModel, "documentId" | "documentType">,
) => `${record.documentType}:${record.documentId}:${action}`;

const normalizeStatus = (value?: string | null): LicenseStatus => {
  switch (String(value ?? "").toUpperCase()) {
    case "ACTIVE":
    case "201":
      return "ACTIVE";
    case "EXPIRED":
    case "202":
      return "EXPIRED";
    case "CANCELLED":
    case "203":
      return "CANCELLED";
    case "SUSPENDED":
    case "204":
    case "DISABLED":
      return "SUSPENDED";
    case "EXPIRE_SOON":
    case "205":
      return "EXPIRE_SOON";
    default:
      return "ACTIVE";
  }
};

const normalizeAllowedActions = (
  actions?: LicensePermitAllowedActionDto[],
): PermitAllowedAction[] =>
  Array.isArray(actions)
    ? actions
        .filter((item): item is PermitAllowedAction => Boolean(item?.action && isActionType(item.action)))
        .map((item) => ({
          action: item.action,
          serviceId: item.serviceId ?? null,
          serviceCode: item.serviceCode ?? null,
        }))
    : [];

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = moment(value);

  return date.isValid() ? date.format("DD/MM/YYYY HH:mm:ss") : "-";
};

const partitionActions = (actions: PermitAllowedAction[]) => {
  const actionKeys = actions.map((item) => item.action);
  const inlineActions: ActionType[] = [];

  if (actionKeys.includes("RENEW")) {
    inlineActions.push("RENEW");
  } else if (actionKeys.includes("MODIFY")) {
    inlineActions.push("MODIFY");
  }

  if (actionKeys.includes("DOWNLOAD") && !inlineActions.includes("DOWNLOAD")) {
    inlineActions.push("DOWNLOAD");
  }

  if (inlineActions.length === 0 && actionKeys[0]) {
    inlineActions.push(actionKeys[0]);
  }

  return {
    inlineActions,
    moreActions: actions
      .map((item) => item.action)
      .filter((action) => !inlineActions.includes(action)),
  };
};

const getCardToneClassName = (status: LicenseStatus) => {
  if (status === "EXPIRED") {
    return "permit-card--expired";
  }

  if (status === "SUSPENDED" || status === "CANCELLED") {
    return "permit-card--muted";
  }

  return "permit-card--default";
};

const statusClassNameMap: Record<LicenseStatus, string> = {
  ACTIVE: "status-tag--active",
  EXPIRE_SOON: "status-tag--expire-soon",
  EXPIRED: "status-tag--expired",
  SUSPENDED: "status-tag--suspended",
  CANCELLED: "status-tag--cancelled",
};

const createMockActions = (...actions: ActionType[]): PermitAllowedAction[] =>
  actions.map((action) => ({
    action,
    serviceId: null,
    serviceCode: null,
  }));

const DEV_STATUS_MOCK_RECORDS: PermitViewModel[] = [
  {
    id: "mock-expire-soon",
    documentId: "7364616",
    documentName: "Newspaper Media License",
    documentType: "LICENSE",
    licensePermitNo: "7364616",
    applicationNo: "ML-02-03-7364616",
    effectiveDate: "2025-09-27",
    expireDate: "2026-09-27",
    lastUpdateTime: "2026-09-20T12:00:00",
    status: "EXPIRE_SOON",
    allowedActions: createMockActions("DOWNLOAD", "RENEW"),
    downloadUrl: null,
  },
  {
    id: "mock-expired",
    documentId: "6228691",
    documentName: "Publishing Print & Text Permit",
    documentType: "PERMIT",
    licensePermitNo: "6228691",
    applicationNo: "ML-02-901-6228691",
    effectiveDate: "2025-09-27",
    expireDate: "2026-09-27",
    lastUpdateTime: "2026-09-27T12:00:00",
    status: "EXPIRED",
    allowedActions: createMockActions("DOWNLOAD", "RENEW"),
    downloadUrl: null,
  },
  {
    id: "mock-suspended",
    documentId: "4105649",
    documentName: "AceJ Test Service Certificate",
    documentType: "LICENSE",
    licensePermitNo: "4105649",
    applicationNo: "ML-02-111-0017632",
    effectiveDate: "2026-01-12",
    expireDate: "2027-01-12",
    lastUpdateTime: "2026-01-12T14:57:10",
    status: "SUSPENDED",
    allowedActions: createMockActions("DOWNLOAD"),
    downloadUrl: null,
  },
  {
    id: "mock-cancelled",
    documentId: "5402291",
    documentName: "Radio & TV Broadcasting License",
    documentType: "LICENSE",
    licensePermitNo: "5402291",
    applicationNo: "ML-02-270-5402291",
    effectiveDate: "2025-11-08",
    expireDate: "2026-11-08",
    lastUpdateTime: "2026-02-02T08:18:26",
    status: "CANCELLED",
    allowedActions: createMockActions("DOWNLOAD"),
    downloadUrl: null,
  },
];

const DEV_ACTION_NEEDED_MOCKS: ActionNeededViewModel[] = [
  {
    id: "mock-action-expired",
    documentId: "6228691",
    documentName: "Publishing Print & Text Permit",
    documentType: "PERMIT",
    licensePermitNo: "6228691",
    effectiveDate: "2025-09-27",
    expireDate: "2026-09-27",
    expireLabel: "Expired",
    status: "EXPIRED",
    allowedActions: createMockActions("DOWNLOAD", "RENEW"),
  },
  {
    id: "mock-action-expire-soon",
    documentId: "7364616",
    documentName: "Newspaper Media License",
    documentType: "LICENSE",
    licensePermitNo: "7364616",
    effectiveDate: "2025-09-27",
    expireDate: moment().add(2, "day").format("YYYY-MM-DD"),
    expireLabel: "Expire in 3 Days",
    status: "EXPIRE_SOON",
    allowedActions: createMockActions("DOWNLOAD", "RENEW"),
  },
];

const normalizeRecord = (
  item: LicensePermitListItemDto,
  isAr: boolean,
): PermitViewModel => ({
  id: String(item.id),
  profileId: item.profileId ?? null,
  profileName: item.profileName ?? null,
  userTypeId: item.userTypeId ?? null,
  userTypeName: item.userTypeName ?? null,
  applicationId: item.applicationId ?? null,
  type: item.type ?? null,
  documentId: item.documentId ?? "-",
  documentName: licensePermitListDisplayName(isAr, item),
  documentType: item.documentType ?? "LICENSE",
  licensePermitNo: item.licensePermitNo ?? "-",
  showLicenseNumber: item.showLicenseNumber ?? item.licensePermitNo ?? "-",
  applicationNo: item.applicationNo ?? "-",
  sourceLicenseId: item.sourceLicenseId ?? null,
  sourceServiceCode: item.sourceServiceCode ?? null,
  sourceMedialLicenseId: item.sourceMedialLicenseId ?? null,
  sourceApplicationId: item.sourceApplicationId ?? null,
  sourceApplicationDetailId: item.sourceApplicationDetailId ?? null,
  effectiveDate: item.effectiveDate ?? "",
  expireDate: item.expireDate ?? "",
  lastUpdateTime: item.lastUpdateTime ?? "",
  status: normalizeStatus(item.status),
  allowedActions: normalizeAllowedActions(item.allowedActions),
  downloadUrl: item.downloadUrl ?? null,
  hasInProgressApplication: item.hasInProgressApplication,
  inProgressApplicationType: item.inProgressApplicationType ?? null,
  serviceId: item.serviceId ?? null,
  serviceCode: item.serviceCode ?? null,
});

const normalizeActionNeeded = (
  item: LicensePermitActionNeededItemDto,
  isAr: boolean,
  statusLabel: (status: LicenseStatus) => string,
): ActionNeededViewModel => ({
  id: String(item.id ?? item.documentId ?? item.licensePermitNo ?? item.documentName ?? "action-needed"),
  profileId: item.profileId ?? null,
  userTypeId: item.userTypeId ?? null,
  applicationId: item.applicationId ?? null,
  type: item.type ?? null,
  documentId: item.documentId ?? "-",
  documentName: licensePermitListDisplayName(isAr, item),
  documentType: item.documentType ?? "LICENSE",
  licensePermitNo: item.licensePermitNo ?? item.documentId ?? "-",
  showLicenseNumber:
    item.showLicenseNumber ?? item.licensePermitNo ?? item.documentId ?? "-",
  serviceId: item.serviceId ?? null,
  serviceCode: item.serviceCode ?? null,
  sourceLicenseId: item.sourceLicenseId ?? null,
  sourceServiceCode: item.sourceServiceCode ?? null,
  sourceMedialLicenseId: item.sourceMedialLicenseId ?? null,
  sourceApplicationId: item.sourceApplicationId ?? null,
  sourceApplicationDetailId: item.sourceApplicationDetailId ?? null,
  effectiveDate: item.effectiveDate ?? "",
  expireDate: item.expireDate ?? "",
  expireLabel: item.expireLabel ?? statusLabel(normalizeStatus(item.status)),
  status: normalizeStatus(item.status),
  allowedActions: normalizeAllowedActions(item.allowedActions),
});

const matchesMockSearch = (
  record: Pick<PermitViewModel, "documentId" | "documentName" | "licensePermitNo" | "applicationNo">,
  keyword: string,
) => {
  if (!keyword) return true;

  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;

  return [
    record.documentId,
    record.documentName,
    record.licensePermitNo,
    record.applicationNo,
  ].some((value) => value.toLowerCase().includes(normalizedKeyword));
};

export default function PermitsLicense() {
  const history = useHistory();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const showProfileNameColumn = isGlobalProfileId(currentProfileId);
  const [filterRef, filtersOverflow] = useFilterOverflow();
  const isArLang = i18n.language.startsWith("ar");
  const { openDialog: openGateDialog, dialogNode } =
    useServiceEntryGateDialogController();
  const { ensureProfileAction, profileSelectionNode } =
    useProfileActionConfirmation();
  const updateServicesId = useServicesStore((state) => state.updateServicesId);
  const updateServicesCode = useServicesStore((state) => state.updateServicesCode);
  const setLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.setLicenseLifecycleSource,
  );
  const clearLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.clearLicenseLifecycleSource,
  );
  const setUpdateForm = useUpdateFormStore((state) => state.setUpdateForm);
  const initialSearch = useMemo(
    () => new URLSearchParams(location.search).get("search") ?? "",
    [location.search],
  );

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchKeyword, setSearchKeyword] = useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState<LicenseStatus | undefined>();
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LicenseStatus | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [actionNeededLoading, setActionNeededLoading] = useState(false);
  const [listError, setListError] = useState(false);
  const [records, setRecords] = useState<PermitViewModel[]>([]);
  const [actionNeededRecords, setActionNeededRecords] = useState<ActionNeededViewModel[]>([]);
  const [sortField, setSortField] = useState<SortField | null>("lastUpdateTime");
  const [sortOrder, setSortOrder] = useState<SortOrder | null>("descend");
  const [pendingActionKeys, setPendingActionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: VIEW_PAGE_SIZE.table,
    total: 0,
  });
  const [pdfState, setPdfState] = useState<PdfState>({
    visible: false,
    fileName: "",
    url: "",
    password: "",
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const statusLabels: Record<LicenseStatus, string> = useMemo(
    () => ({
      ACTIVE: t("permitsLicensePage.status.active"),
      EXPIRE_SOON: t("permitsLicensePage.status.expireSoon"),
      EXPIRED: t("permitsLicensePage.status.expired"),
      SUSPENDED: t("permitsLicensePage.status.suspended"),
      CANCELLED: t("permitsLicensePage.status.cancelled"),
    }),
    [t],
  );

  const actionLabels: Record<ActionType, string> = useMemo(
    () => ({
      RENEW: t("permitsLicensePage.actions.renew"),
      MODIFY: t("permitsLicensePage.actions.modify"),
      CANCEL: t("permitsLicensePage.actions.cancel"),
      TRANSFER: t("permitsLicensePage.actions.transfer"),
      PARTNER_MANAGEMENT: t("permitsLicensePage.actions.partnerManagement"),
      DOWNLOAD: t("permitsLicensePage.actions.download"),
    }),
    [t],
  );

  const renderActionMenu = useCallback(
    (
      actions: ActionType[],
      onAction: (action: ActionType) => void,
      isActionDisabled?: (action: ActionType) => boolean,
    ) => (
      <Menu
        onClick={({ key }) => onAction(key as ActionType)}
        items={actions.map((action) => ({
          key: action,
          label: actionLabels[action],
          disabled: isActionDisabled?.(action),
        }))}
      />
    ),
    [actionLabels],
  );

  const searchTimerRef = useRef<number>();
  const actionNeededRef = useRef<HTMLElement | null>(null);
  const pendingActionKeyRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const currentPage = pagination.current;
  const pageSize = pagination.pageSize;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setActionPending = useCallback((actionKey: string, pending: boolean) => {
    const nextPendingActionKeys = new Set(pendingActionKeyRef.current);

    if (pending) {
      nextPendingActionKeys.add(actionKey);
    } else {
      nextPendingActionKeys.delete(actionKey);
    }

    pendingActionKeyRef.current = nextPendingActionKeys;
    if (mountedRef.current) {
      setPendingActionKeys(nextPendingActionKeys);
    }
  }, []);

  const isActionPending = useCallback(
    (
      action: ActionType,
      record: Pick<
        PermitViewModel | ActionNeededViewModel,
        "documentId" | "documentType"
      >,
    ) => pendingActionKeys.has(createPermitActionKey(action, record)),
    [pendingActionKeys],
  );

  const syncActionNeededScroll = useCallback(() => {
    const container = actionNeededRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 1,
    );
  }, []);

  const openDocumentModal = useCallback(
    async (record: Pick<PermitViewModel, "sourceLicenseId">) => {
      if (record.sourceLicenseId === null || record.sourceLicenseId === undefined) {
        CustomMessage.error(t("permitsLicensePage.messages.documentPreviewUnavailable"));
        return;
      }

      try {
        const detail = unwrapPayload<LicenseListResponseDto>(
          await getLicenseDetail(String(record.sourceLicenseId)),
        );
        if (!detail?.certificateUrl) {
          if (detail?.statusPromptCode === "DOCUMENT_GENERATING") {
            CustomMessage.info(t("permitsLicensePage.messages.documentPreparing"));
          } else {
            CustomMessage.error(t("permitsLicensePage.messages.documentDownloadFailed"));
          }
          return;
        }

        const isAr = i18n.language.startsWith("ar");
        setPdfState({
          visible: true,
          fileName: licenseDetailDisplayName(isAr, detail),
          url: detail.certificateUrl ?? "",
          password: detail.pdfPassword ?? "",
        });
      } catch (error) {
        console.error(error);
        CustomMessage.error(t("permitsLicensePage.messages.documentDownloadFailed"));
      }
    },
    [t, i18n.language],
  );

  const handleValidatedAction = useCallback(
    async (
      action: ActionType,
      record: Pick<
        PermitViewModel,
        | "documentId"
        | "documentType"
        | "profileId"
        | "userTypeId"
        | "licensePermitNo"
        | "applicationId"
        | "type"
        | "serviceId"
        | "serviceCode"
        | "sourceServiceCode"
        | "sourceMedialLicenseId"
        | "sourceApplicationId"
        | "sourceApplicationDetailId"
      >,
    ) => {
      const actionKey = createPermitActionKey(action, record);
      if (pendingActionKeyRef.current.has(actionKey)) {
        return;
      }

      setActionPending(actionKey, true);
      try {
        const profileConfirmed = await ensureProfileAction({
          profileId: record.profileId,
          userTypeId: record.userTypeId,
        });

        if (!profileConfirmed) {
          return;
        }

        const licensePermitNo = normalizeLicensePermitNo(record.licensePermitNo);
        const actionApplicationId = resolvePermitActionApplicationId(record);
        const lifecycleSource = createLicenseLifecycleSource({
          action,
          documentId: record.documentId,
          documentType: record.documentType,
          licensePermitNo,
          serviceId: record.serviceId ?? null,
          serviceCode: record.serviceCode ?? null,
          sourceServiceCode: record.sourceServiceCode ?? null,
          sourceMedialLicenseId: record.sourceMedialLicenseId ?? null,
          sourceApplicationId: record.sourceApplicationId ?? null,
          sourceApplicationDetailId: record.sourceApplicationDetailId ?? null,
        });
        const routeState = createLicenseLifecycleRouteState(lifecycleSource);

        if (lifecycleSource) {
          setLicenseLifecycleSource(lifecycleSource);
        } else {
          clearLicenseLifecycleSource();
        }

        const gateEnabled = isServiceEntryGateEnabled(location.search);
        const shouldRunGate =
          gateEnabled && shouldRunServiceEntryGateForAction(action);
        const result = unwrapPayload<LicensePermitValidateResponse>(
          await validatePermitAction({
            documentId: record.documentId,
            documentType: record.documentType,
            action,
          }),
        );

        if (!result.isAllowed) {
          if (shouldRunGate && isInProgressValidationResult(result)) {
            CustomMessage.error(
              t("permitsLicensePage.messages.inProgressApplication"),
            );
            return;
          }

          CustomMessage.error(t("permitsLicensePage.messages.actionUnavailable"));
          return;
        }

        if (!result.serviceId) {
          CustomMessage.error(t("permitsLicensePage.messages.routingUnavailable"));
          return;
        }

        if (
          LICENSE_PERMIT_NO_REQUIRED_SERVICE_IDS.has(result.serviceId) &&
          !licensePermitNo
        ) {
          CustomMessage.error(
            t("permitsLicensePage.messages.licensePermitNumberRequired"),
          );
          return;
        }

        if (shouldRunGate) {
          await openServiceWithGate({
            history,
            serviceId: result.serviceId,
            serviceCode: result.serviceCode ?? null,
            source: "permits-license-action",
            openDialog: openGateDialog,
            createAllowPath: (payload) =>
              createPermitActionPath({
                serviceId: payload.serviceId,
                action,
                serviceCode: payload.serviceCode ?? result.serviceCode ?? null,
                applicationId: actionApplicationId,
                requestType: record.type ?? null,
                includeServiceEntryGate: true,
                sourceSearch: location.search,
              }),
            onBeforeAllowNavigate: (payload) => {
              updateServicesId(payload.serviceId);
              updateServicesCode(payload.serviceCode ?? result.serviceCode ?? null);
              setUpdateForm({
                applicationId: actionApplicationId,
                type: record.type ?? null,
              });
            },
            onInProgressApplication: () => {
              CustomMessage.error(
                t("permitsLicensePage.messages.inProgressApplication"),
              );
            },
            extraState: routeState,
          });
          return;
        }

        updateServicesId(result.serviceId);
        updateServicesCode(result.serviceCode ?? null);
        setUpdateForm({
          applicationId: actionApplicationId,
          type: record.type ?? null,
        });
        history.push(
          createPermitActionPath({
            serviceId: result.serviceId,
            action,
            serviceCode: result.serviceCode ?? null,
            applicationId: actionApplicationId,
            requestType: record.type ?? null,
            includeServiceEntryGate: true,
            sourceSearch: location.search,
          }),
          routeState,
        );
      } catch (error) {
        console.error(error);
        CustomMessage.error(t("permitsLicensePage.messages.actionUnavailable"));
      } finally {
        setActionPending(actionKey, false);
      }
    },
    [
      history,
      location.search,
      ensureProfileAction,
      openGateDialog,
      setActionPending,
      clearLicenseLifecycleSource,
      setLicenseLifecycleSource,
      setUpdateForm,
      updateServicesCode,
      updateServicesId,
      t,
    ],
  );

  const handleActionClick = useCallback(
    async (action: ActionType, record: PermitViewModel) => {
      if (action === "DOWNLOAD") {
        await openDocumentModal(record);
        return;
      }

      await handleValidatedAction(action, record);
    },
    [handleValidatedAction, openDocumentModal],
  );

  const handleActionNeededClick = useCallback(
    async (action: ActionType, record: ActionNeededViewModel) => {
      if (action === "DOWNLOAD") {
        await openDocumentModal({
          sourceLicenseId: record.sourceLicenseId,
        });
        return;
      }

      await handleValidatedAction(action, record);
    },
    [handleValidatedAction, openDocumentModal],
  );

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(false);

    try {
      const response = unwrapPayload<LicensePermitQueryResponse>(
        await getLicenseList({
          keyword: searchKeyword || undefined,
          statuses: selectedStatus ? [selectedStatus] : [],
          documentTypes: [],
          pageIndex: currentPage,
          pageSize,
          sortBy: sortField ?? undefined,
          sortDirection: sortOrder === "ascend" ? 0 : 1,
        }),
      );

      const normalizedRecords = (response.items ?? []).map((item) =>
        normalizeRecord(item, isArLang),
      );
      const devMockRecords =
        ENABLE_PERMITS_UI_MOCKS && currentPage === 1
          ? DEV_STATUS_MOCK_RECORDS.filter((mockRecord) => {
              if (selectedStatus && mockRecord.status !== selectedStatus) {
                return false;
              }

              if (
                normalizedRecords.some(
                  (record: PermitViewModel) => record.status === mockRecord.status,
                )
              ) {
                return false;
              }

              return matchesMockSearch(mockRecord, searchKeyword);
            })
          : [];

      const mergedRecords =
        devMockRecords.length > 0
          ? [...devMockRecords, ...normalizedRecords].slice(0, pageSize)
          : normalizedRecords;

      setRecords(mergedRecords);
      setPagination((currentState) => ({
        ...currentState,
        current: response.pageIndex ?? currentState.current,
        pageSize: response.pageSize ?? currentState.pageSize,
        total: response.total ?? 0,
      }));
    } catch (error) {
      console.error(error);
      setRecords([]);
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchKeyword,
    selectedStatus,
    sortField,
    sortOrder,
    isArLang,
  ]);

  const fetchActionNeeded = useCallback(async () => {
    setActionNeededLoading(true);

    try {
      const response = unwrapPayload<LicensePermitActionNeededItemDto[]>(
        await getActionNeeded(),
      );
      const normalized = response
        .filter((item) => Boolean(item.expireDate))
        .map((item) =>
          normalizeActionNeeded(item, isArLang, (s) => statusLabels[s]),
        );
      const devMockActionNeeded =
        ENABLE_PERMITS_UI_MOCKS && normalized.length === 0 ? DEV_ACTION_NEEDED_MOCKS : [];

      setActionNeededRecords(
        devMockActionNeeded.length > 0 ? devMockActionNeeded : normalized,
      );
    } catch (error) {
      console.error(error);
      setActionNeededRecords(ENABLE_PERMITS_UI_MOCKS ? DEV_ACTION_NEEDED_MOCKS : []);
    } finally {
      setActionNeededLoading(false);
    }
  }, [isArLang, statusLabels]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    void fetchActionNeeded();
  }, [fetchActionNeeded]);

  useEffect(() => {
    setSearchInput(initialSearch);
    setSearchKeyword(initialSearch);
    setPagination((currentState) => ({
      ...currentState,
      current: 1,
    }));
  }, [initialSearch]);

  useEffect(() => {
    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      const nextKeyword = searchInput.trim();
      const searchParams = new URLSearchParams(location.search);

      if (nextKeyword) {
        searchParams.set("search", nextKeyword);
      } else {
        searchParams.delete("search");
      }

      history.replace({
        pathname: location.pathname,
        search: searchParams.toString(),
      });

      setSearchKeyword(nextKeyword);
      setPagination((currentState) => ({
        ...currentState,
        current: 1,
      }));
    }, 300);

    return () => {
      window.clearTimeout(searchTimerRef.current);
    };
  }, [history, location.pathname, location.search, searchInput]);

  useEffect(() => {
    syncActionNeededScroll();
  }, [actionNeededRecords, syncActionNeededScroll]);

  useEffect(() => {
    const container = actionNeededRef.current;
    if (!container) return;

    container.addEventListener("scroll", syncActionNeededScroll);
    window.addEventListener("resize", syncActionNeededScroll);

    return () => {
      container.removeEventListener("scroll", syncActionNeededScroll);
      window.removeEventListener("resize", syncActionNeededScroll);
    };
  }, [actionNeededRecords.length, syncActionNeededScroll]);

  useEffect(() => {
    return () => {
      window.clearTimeout(searchTimerRef.current);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageSize));
  const renderPaginationTotal = (total: number) => (
    <div className="licenses-page-total-wrapper">
      <div className="licenses-page-total">
        {t("permitsLicensePage.pagination.total", { total })}
      </div>
      <div>
        {pagination.current}/{totalPages}
      </div>
    </div>
  );
  const hasFilters = Boolean(searchKeyword || selectedStatus);
  const emptyDescription = hasFilters
    ? t("permitsLicensePage.empty.noResults")
    : t("permitsLicensePage.empty.noLicenses");

  const handleApplicationNoClick = useCallback(
    async (
      record: Pick<PermitViewModel, "applicationNo" | "sourceLicenseId">,
    ) => {
      if (
        !record.applicationNo ||
        record.applicationNo === "-" ||
        record.sourceLicenseId === null ||
        record.sourceLicenseId === undefined
      ) {
        CustomMessage.error(
          t("myRequestsPage.messages.applicationDetailUnavailable"),
        );
        return;
      }

      try {
        const response = await enquiryApplication(record.applicationNo);
        const applicationId = response.data?.applicaitonId;

        if (!applicationId) {
          CustomMessage.error(
            t("myRequestsPage.messages.applicationDetailUnavailable"),
          );
          return;
        }

        const searchParams = new URLSearchParams({
          id: String(applicationId),
          certificateId: String(record.sourceLicenseId),
        });

        history.push({
          pathname: "/my-requests/detail",
          search: `?${searchParams.toString()}`,
        });
      } catch (error) {
        console.error("Failed to open application detail:", error);
        CustomMessage.error(
          t("myRequestsPage.messages.applicationDetailUnavailable"),
        );
      }
    },
    [history, t],
  );

  const columns: ColumnsType<PermitViewModel> = useMemo(
   () => [
    {
      title: t("permitsLicensePage.table.documentName"),
      dataIndex: "documentName",
      key: "documentName",
      onCell: () => ({ style: { maxWidth: 280 } }),
    },
    {
      title: t("permitsLicensePage.table.licensePermitNo"),
      dataIndex: "showLicenseNumber",
      key: "showLicenseNumber",
      ellipsis: true,
    },
    {
      title: t("permitsLicensePage.table.applicationNo"),
      dataIndex: "applicationNo",
      key: "applicationNo",
      render: (value: string, record: PermitViewModel) => {
        if (!value || value === "-") {
          return "-";
        }

        return (
          <button
            type="button"
            className="link-button"
            onClick={() => void handleApplicationNoClick(record)}
          >
            {value}
          </button>
        );
      },
    },
    ...(showProfileNameColumn
      ? [createProfileNameColumn<PermitViewModel>(t("common.profileName"))]
      : []),
    {
      title: t("permitsLicensePage.table.effectiveDate"),
      dataIndex: "effectiveDate",
      key: "effectiveDate",
      sorter: true,
      sortDirections: SORT_DIRECTIONS,
      sortOrder: sortField === "effectiveDate" ? sortOrder : null,
      render: (value: string) => formatDisplayDate(value),
    },
    {
      title: t("permitsLicensePage.table.expireDate"),
      dataIndex: "expireDate",
      key: "expireDate",
      sorter: true,
      sortDirections: SORT_DIRECTIONS,
      sortOrder: sortField === "expireDate" ? sortOrder : null,
      render: (value: string | null) => formatDisplayDate(value),
    },
    {
      title: t("permitsLicensePage.table.lastUpdate"),
      dataIndex: "lastUpdateTime",
      key: "lastUpdateTime",
      sorter: true,
      sortDirections: SORT_DIRECTIONS,
      sortOrder: sortField === "lastUpdateTime" ? sortOrder : null,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: t("permitsLicensePage.table.status"),
      dataIndex: "status",
      key: "status",
      render: (value: LicenseStatus) => (
        <span className={`status-tag ${statusClassNameMap[value]}`}>
          {statusLabels[value]}
        </span>
      ),
    },
    {
      title: t("permitsLicensePage.table.actions"),
      key: "actions",
      width: "1%",
      fixed: "right",
      className: "actions-column",
      onHeaderCell: () => ({
        className: "actions-column",
      }),
      render: (_, record) => {
        const { inlineActions, moreActions } = partitionActions(record.allowedActions);
        const isRecordActionPending = (action: ActionType) =>
          isActionPending(action, record);
        const allActions = isMobile ? [...inlineActions, ...moreActions] : null;
        const dropdownActions = isMobile ? allActions! : moreActions;

        return (
          <div className="table-actions">
            {!isMobile && (
              <div className="table-actions__links">
                {inlineActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="table-action-link"
                    disabled={isRecordActionPending(action)}
                    onClick={() => void handleActionClick(action, record)}
                  >
                    {actionLabels[action]}
                  </button>
                ))}
              </div>
            )}
            {dropdownActions.length > 0 ? (
              <Dropdown
                trigger={["click"]}
                overlayClassName="permits-actions-dropdown"
                overlay={renderActionMenu(dropdownActions, (action) =>
                  void handleActionClick(action, record),
                  isRecordActionPending,
                )}
              >
                <button
                  type="button"
                  className="more-button more-button--table"
                  disabled={dropdownActions.every(isRecordActionPending)}
                >
                  <MoreOutlined />
                </button>
              </Dropdown>
            ) : null}
          </div>
        );
      },
    },
  ],
  [
    t,
    sortField,
    sortOrder,
    statusLabels,
    actionLabels,
    renderActionMenu,
    handleActionClick,
    isActionPending,
    isMobile,
    showProfileNameColumn,
    handleApplicationNoClick,
  ],
);

  const renderCardActions = (
    record: Pick<
      PermitViewModel | ActionNeededViewModel,
      "allowedActions" | "documentId" | "documentType"
    > & {
      onAction: (action: ActionType) => void;
    },
  ) => {
    const { inlineActions, moreActions } = partitionActions(record.allowedActions);
    const cardInlineActions = [...inlineActions].sort((currentAction, nextAction) => {
      if (currentAction === "DOWNLOAD" && nextAction !== "DOWNLOAD") {
        return -1;
      }

      if (currentAction !== "DOWNLOAD" && nextAction === "DOWNLOAD") {
        return 1;
      }

      return inlineActions.indexOf(currentAction) - inlineActions.indexOf(nextAction);
    });
    const isRecordActionPending = (action: ActionType) =>
      isActionPending(action, record);

    return (
      <div className="permit-card__footer">
        {moreActions.length > 0 ? (
          <Dropdown
            trigger={["click"]}
            overlayClassName="permits-actions-dropdown"
            overlay={renderActionMenu(
              moreActions,
              record.onAction,
              isRecordActionPending,
            )}
          >
            <button
              type="button"
              className="more-button"
              disabled={moreActions.every(isRecordActionPending)}
            >
              <MoreOutlined />
            </button>
          </Dropdown>
        ) : (
          <span className="permit-card__more-placeholder" />
        )}
        <div className="permit-card__actions">
          {cardInlineActions.map((action, index) =>
            index === cardInlineActions.length - 1 ? (
              <CustomButton
                key={action}
                text={actionLabels[action]}
                size="medium"
                disabled={isRecordActionPending(action)}
                loading={isRecordActionPending(action)}
                onClick={() => record.onAction(action)}
              />
            ) : (
              <CustomButton
                key={action}
                text={actionLabels[action]}
                variant="text"
                size="medium"
                customClassName="permit-card__link-action"
                disabled={isRecordActionPending(action)}
                loading={isRecordActionPending(action)}
                onClick={() => record.onAction(action)}
              />
            ),
          )}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="empty-state">
      <EmptyBox title={emptyDescription} />
      {hasFilters ? (
        <CustomButton
          text={t("permitsLicensePage.clearFilters")}
          variant="outline"
          onClick={() => {
            setSearchInput("");
            setSelectedStatus(undefined);
            setPagination((currentState) => ({
              ...currentState,
              current: 1,
            }));
          }}
        />
      ) : null}
    </div>
  );

  const handleTableChange = (
    tablePagination: TablePaginationConfig,
    _: Record<string, FilterValue | null>,
    sorter: SorterResult<PermitViewModel> | SorterResult<PermitViewModel>[],
  ) => {
    const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const nextSortField =
      typeof currentSorter?.columnKey === "string" && isSortField(currentSorter.columnKey)
        ? currentSorter.columnKey
        : null;

    if (nextSortField) {
      if (currentSorter.order) {
        setSortField(nextSortField);
        setSortOrder(currentSorter.order as SortOrder);
      } else {
        setSortField(null);
        setSortOrder(null);
      }
    }

    setPagination((currentState) => ({
      ...currentState,
      current: tablePagination.current ?? currentState.current,
    }));
  };

  return (
    <div className="permits-license">
      {actionNeededRecords.length > 0 && (
        <section className="action-needed-section">
          <div className="action-needed-section__header">
            <h3 className="section-title">
              {t("permitsLicensePage.actionNeeded.sectionTitle", {
                count: actionNeededRecords.length,
              })}
            </h3>
            <div className="action-needed-section__toolbar">
              <button
                type="button"
                className="scroll-arrow"
                disabled={!canScrollLeft}
                onClick={() => {
                  actionNeededRef.current?.scrollBy({ left: -392, behavior: "smooth" });
                }}
              >
                <LeftOutlined />
              </button>
              <button
                type="button"
                className="scroll-arrow"
                disabled={!canScrollRight}
                onClick={() => {
                  actionNeededRef.current?.scrollBy({ left: 392, behavior: "smooth" });
                }}
              >
                <RightOutlined />
              </button>
            </div>
          </div>
          <Spin spinning={actionNeededLoading}>
            <SimpleBar
              className="action-needed-list"
              scrollableNodeProps={{ ref: actionNeededRef }}
            >
              <div className="action-needed-list__content">
                {actionNeededRecords.map((record) => (
                  <article
                    key={record.id}
                    className={`permit-card permit-card--action-needed ${getCardToneClassName(record.status)}`}
                  >
                    <div className="permit-card__body">
                      <span
                        className={`status-tag status-tag--action-needed ${
                          record.status === "EXPIRED"
                            ? "status-tag--expired-solid"
                            : "status-tag--expire-warning"
                        }`}
                      >
                        {record.expireLabel}
                      </span>
                      <div className="permit-card__title">{record.documentName}</div>
                      {record.effectiveDate || record.expireDate ? (
                        <div className="permit-card__dates">
                          <ClockCircleOutlined />
                          <span>
                            {formatDisplayDateRange(
                              record.effectiveDate,
                              record.expireDate,
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {renderCardActions({
                      allowedActions: record.allowedActions,
                      documentId: record.documentId,
                      documentType: record.documentType,
                      onAction: (action) => void handleActionNeededClick(action, record),
                    })}
                  </article>
                ))}
              </div>
            </SimpleBar>
          </Spin>
        </section>
      )}

      <section className="licenses-panel">
        <div className="licenses-panel__header">
          <h3 className="section-title">{t("permitsLicensePage.title")}</h3>
        </div>

        <div
          className={`toolbar${filtersOverflow ? " toolbar--compact" : ""}`}
          ref={filterRef}
        >
          <div className="toolbar__filters">
            <Input
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              prefix={<SearchOutlined />}
              placeholder={t("formPlaceholders.common.search")}
              className="toolbar__search"
            />
            {!filtersOverflow && (
              <Select
                allowClear
                value={selectedStatus}
                onChange={(value) => {
                  setSelectedStatus(value);
                  setPagination((currentState) => ({
                    ...currentState,
                    current: 1,
                  }));
                }}
                placeholder={t("formPlaceholders.common.allStatuses")}
                className="toolbar__status"
                dropdownMatchSelectWidth={220}
              >
                {STATUS_FILTER_ORDER.map((value) => (
                  <Select.Option key={value} value={value}>
                    {statusLabels[value]}
                  </Select.Option>
                ))}
              </Select>
            )}
            {filtersOverflow && (
              <button
                className="mobile-filter-trigger"
                onClick={() => {
                  setPendingStatus(selectedStatus ?? null);
                  setMobileFilterVisible(true);
                }}
              >
                <FilterIcon />
                {!!selectedStatus && (
                  <span className="mobile-filter-trigger__badge" />
                )}
              </button>
            )}
          </div>
          <MobileFilterModal
            visible={mobileFilterVisible}
            onClose={() => setMobileFilterVisible(false)}
            onConfirm={() => {
              setSelectedStatus(pendingStatus ?? undefined);
              setPagination((currentState) => ({ ...currentState, current: 1 }));
              setMobileFilterVisible(false);
            }}
            sections={[
              {
                title: t("formPlaceholders.common.allStatuses"),
                options: STATUS_FILTER_ORDER.map((value) => ({
                  label: statusLabels[value],
                  value,
                })),
                value: pendingStatus,
                onChange: (v) => setPendingStatus(v as LicenseStatus | null),
              },
            ]}
          />

          <div className="view-toggle" role="tablist" aria-label={t("permitsLicensePage.viewMode.ariaLabel")}>
            <button
              type="button"
              className={`view-toggle__button ${viewMode === "grid" ? "is-active" : ""}`}
              onClick={() => {
                setViewMode("grid");
                setPagination((currentState) => ({
                  ...currentState,
                  current: 1,
                  pageSize: VIEW_PAGE_SIZE.grid,
                }));
              }}
            >
              <AppstoreOutlined />
            </button>
            <button
              type="button"
              className={`view-toggle__button ${viewMode === "table" ? "is-active" : ""}`}
              onClick={() => {
                setViewMode("table");
                setPagination((currentState) => ({
                  ...currentState,
                  current: 1,
                  pageSize: VIEW_PAGE_SIZE.table,
                }));
              }}
            >
              <UnorderedListOutlined />
            </button>
          </div>
        </div>

        {listError ? (
          <div className="error-state">
            <EmptyBox title={t("permitsLicensePage.error.loadFailed")} />
            <CustomButton
              text={t("permitsLicensePage.retry")}
              onClick={() => void fetchList()}
            />
          </div>
        ) : viewMode === "table" ? (
          <>
            <Table
              className="licenses-table"
              rowKey="id"
              loading={listLoading}
              columns={columns}
              dataSource={records}
              scroll={{ x: "max-content" }}
              pagination={false}
              onChange={handleTableChange}
              locale={{ emptyText: renderEmptyState() }}
            />
            {records.length > 0 && (
              <AppPagination
                className="licenses-pagination"
                current={pagination.current}
                total={pagination.total}
                pageSize={pagination.pageSize}
                pageSizeOptions={["10", "20", "50"]}
                showSizeChanger
                showQuickJumper={false}
                showTotal={(total) => renderPaginationTotal(total)}
                onChange={(page, pageSize) => {
                  setPagination((currentState) => ({
                    ...currentState,
                    current: page,
                    pageSize: pageSize ?? currentState.pageSize,
                  }));
                }}
                onShowSizeChange={(_, pageSize) => {
                  setPagination((currentState) => ({
                    ...currentState,
                    current: 1,
                    pageSize,
                  }));
                }}
              />
            )}
          </>
        ) : (
          <>
            <Spin spinning={listLoading}>
              {records.length > 0 ? (
                <div className="licenses-grid">
                  {records.map((record) => (
                    <article
                      key={record.id}
                      className={`permit-card ${getCardToneClassName(record.status)}`}
                    >
                      <div className="permit-card__body">
                        <div className="permit-card__topline">
                          <span className={`status-tag ${statusClassNameMap[record.status]}`}>
                            {statusLabels[record.status]}
                          </span>
                          <span className="permit-card__number">{record.showLicenseNumber}</span>
                        </div>
                        <div className="permit-card__title">{record.documentName}</div>
                        <div className="permit-card__dates">
                          <ClockCircleOutlined />
                          <span>
                            {formatDisplayDateRange(
                              record.effectiveDate,
                              record.expireDate,
                            )}
                          </span>
                        </div>
                      </div>
                      {renderCardActions({
                        allowedActions: record.allowedActions,
                        documentId: record.documentId,
                        documentType: record.documentType,
                        onAction: (action) => void handleActionClick(action, record),
                      })}
                    </article>
                  ))}
                </div>
              ) : (
                renderEmptyState()
              )}
            </Spin>
            {records.length > 0 && (
              <AppPagination
                className="licenses-pagination"
                current={pagination.current}
                total={pagination.total}
                pageSize={pagination.pageSize}
                pageSizeOptions={["8", "16", "24", "32"]}
                showSizeChanger
                showTotal={(total) => renderPaginationTotal(total)}
                onChange={(page, pageSize) => {
                  setPagination((currentState) => ({
                    ...currentState,
                    current: page,
                    pageSize: pageSize ?? currentState.pageSize,
                  }));
                }}
                onShowSizeChange={(_, pageSize) => {
                  setPagination((currentState) => ({
                    ...currentState,
                    current: 1,
                    pageSize,
                  }));
                }}
              />
            )}
          </>
        )}
      </section>

      <DocumentDown
        visible={pdfState.visible}
        fileName={pdfState.fileName}
        url={pdfState.url}
        password={pdfState.password}
        title={t("permitsLicensePage.documentModal.title")}
        subtitle={t("permitsLicensePage.documentModal.subtitle")}
        noteTitle={t("permitsLicensePage.documentModal.noteTitle")}
        noteText={t("permitsLicensePage.documentModal.noteText")}
        passwordLabel={t("permitsLicensePage.documentModal.passwordLabel")}
        copyButtonText={t("permitsLicensePage.documentModal.copyButtonText")}
        useCustomIcon={true}
        className="document-down-modal"
        cancle={() =>
          setPdfState((currentState) => ({
            ...currentState,
            visible: false,
          }))
        }
      />
      {dialogNode}
      {profileSelectionNode}
    </div>
  );
}
