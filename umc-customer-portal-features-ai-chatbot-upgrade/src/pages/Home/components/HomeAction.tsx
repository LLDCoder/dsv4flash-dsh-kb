import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useLayoutEffect,
} from "react";
import { useTranslation } from "react-i18next";
import {
  CustomButton,
  ComfirmModal,
  TablePanel,
  CustomMessage,
  ProfileNameCell,
  createProfileNameColumn,
  type ProfileNameFields,
} from "@/components/common";
import {
  useGlobalServiceProfileSelection,
  useProfileActionConfirmation,
  useServiceEntryGateDialogController,
} from "@/components/ServiceEntryGate";
import { useHistory, useLocation } from "react-router-dom";
import request from "@/utils/request";
import { fromApi, nowGst } from "@/utils/gstTime";
import { recentRequestList, collectServiceList } from "@/services/homePage";
import { getTransactionsList } from "@/services/payments";
import { orderHomeActions } from "./homeActionPriority";
import { useActionStore } from "@/store/pengdingAction";
import {
  getActionNeeded,
  getLicenseList,
  getStatistics,
  getLicenseDetail,
  validatePermitAction,
} from "@/services/permitsLicense";
import {
  ClockCircleOutlined,
  MoreOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import DoubleBottomOutlined from "@/assets/images/DoubleBottomOutlined.png";
import DoubleTopOutlined from "@/assets/images/DoubleTopOutlined.png";
import { cancelApplication, deleteApplication } from "@/services/myRequest";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { useServicesStore } from "@/store/services";
import { useUpdateFormStore } from "@/store/update-form";
import ArrowIcon from "@/assets/images/ArrowCircleRight.svg";
import TransactionsFinePayment from "@/assets/images/Home_FinePayment.png";
import TransactionsRefund from "@/assets/images/Home_Refund.png";
import TransactionsDefault from "@/assets/images/Home_NewspaperClipping.png";
import ServiceAdvisor from "@/assets/images/service-advisor.png";
import AED from "@/assets/icons/Aed";
import ProcessModal from "./ProcessModal";
import moment from "moment";
import formatMoney from "@/utils/formatMoney";
import { formatDisplayDateRange } from "@/utils/date";
import RechargeModal from "./RechargeModal";
import DocumentDown from "@/pages/PermitsLicense/components/DocumentDown";
import PermiteBgPaper from "@/assets/images/permite-paper.png";
import PermitArticle from "@/assets/images/PermitArticle.png";
import PermitBook from "@/assets/images/PermitBook.png";
import PermitTelevision from "@/assets/images/PermitTelevision.png";
import PermitCamera from "@/assets/images/PermitCamera.png";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import OverflowTooltip from "@/components/common/OverflowTooltip";
import ServiceIcon from "@/assets/images/service_icon.png";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import SimpleBar from "@/components/SimpleBar";
import type {
  LicenseListResponseDto,
  LicensePermitActionNeededItemDto,
  LicensePermitAllowedActionDto,
  LicensePermitDocumentType,
  LicensePermitListItemDto,
  LicensePermitQueryResponse,
  LicensePermitValidateResponse,
} from "@/services/permitsLicense";
import { Dropdown, Menu, Spin } from "antd";
import {
  getKnowledgeItemUrl,
  KNOWLEDGE_ITEMS,
} from "@/pages/Knowledgecenter/knowledgeData";
import { requestOpenAiChatBot } from "@/components/AIChatBot/featureFlag";
import useMediaQuery from "@/hooks/useMediaQuery";
import {
  isServiceEntryGateEnabled,
  openServiceWithGate,
} from "@/utils/serviceEntryGate";
import { APPLICATION_STATUS_ID } from "@/config/constants";
import {
  pendingActionServiceDisplayName,
  preferLocalizedEnAr,
} from "@/utils/bilingualDisplay";
import {
  createLicenseLifecycleRouteState,
  createLicenseLifecycleSource,
} from "@/utils/licenseLifecycleSource";
import {
  createPermitActionPath,
  createServiceApplicationActionPath,
  resolvePermitActionApplicationId,
} from "@/utils/permitActionPath";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import { createProfileActionRouteState } from "@/utils/profileActionContext";
import {
  buildHomeRequestDetailSearch,
  normalizeHomeRenewalDocumentType,
} from "../utils";

interface ActionItem extends ProfileNameFields {
  id?: string | number;
  applicationId?: number;
  applicationNumber?: string;
  applicationStatusId?: number;
  applicationStatusNameEn?: string;
  serviceNameEn?: string;
  serviceNameAr?: string;
  serviceId?: number | null;
  serviceCode?: string | null;
  documentId?: string;
  documentName?: string;
  licensePermitNo?: string;
  status?: number | string;
  nameEn?: string;
  nameAr?: string;
  createdOn?: string;
}
interface PendingFineItem extends ActionItem {
  violationId?: number | string;
  violationNo?: string | null;
  violatorName?: string | null;
  violationTypeId?: number | string | null;
  violationType?: string | null;
  violationTypeAr?: string | null;
  fineAmount?: number | string | null;
  fineAmountDisplay?: string | null;
  statusId?: number | string | null;
  status?: number | string;
  statusAr?: string | null;
  issuedDate?: string | null;
  allowedAppeal?: boolean | null;
}
type HomeActionCardItem = ActionItem | PendingFineItem | RenewalViewModel;
interface ActionListType {
  allActions: HomeActionCardItem[];
  pendingFineList: PendingFineItem[];
  renewalList: RenewalViewModel[];
  pendingRequestsList: ActionItem[];
  draftList: ActionItem[];
}
type ActionListKey = keyof ActionListType;
interface HomeActionTab {
  name: string;
  id: number;
  key: ActionListKey;
  num: number;
}
interface PendingActionsPayload {
  draftList?: ActionItem[];
  rejectedList?: ActionItem[];
  pendingPaymentList?: ActionItem[];
  pendingModificationList?: ActionItem[];
  pendingDispositionList?: ActionItem[];
  pendingFinesList?: PendingFineItem[];
  pendingFineList?: PendingFineItem[];
  renewalCount?: number;
}
interface DeleteApplicationResponse {
  isSuccess?: boolean;
  data?: boolean | { isSuccess?: boolean };
}
interface TransactionsItem {
  id?: number | string | null;
  transactionNo?: string | null;
  amount?: number | string | null;
  createOn?: string | null;
  completedAt?: string | null;
  description?: string | null;
  paymentMethodId?: number | null;
  transactionTypeId?: number | null;
  transactionTypeObj?: {
    id?: number | null;
    nameEn?: string | null;
    nameAr?: string | null;
  } | null;
}
interface TransactionsPayload {
  items?: TransactionsItem[] | null;
}
interface IWalletDetailObj {
  id: number;
  walletOwnerUserId: string;
  balance: number;
  currency: string;
  statusId: number;
  ishasPin: boolean;
}
interface UserTypeItem {
  nameEn: string;
  nameAr: string;
}
interface ServiceItem {
  code: string;
  id: number;
  serviceNameAr: string;
  serviceNameEn: string;
  serviceCategoryId: number;
  serviceCategoryNameAr: string;
  serviceCategoryNameEn: string;
  userTypes: UserTypeItem[];
}

type LicenseStatus =
  | "ACTIVE"
  | "EXPIRE_SOON"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED";
type PermitActionType =
  | "RENEW"
  | "MODIFY"
  | "CANCEL"
  | "TRANSFER"
  | "PARTNER_MANAGEMENT"
  | "DOWNLOAD";
type DataEnvelope<T> = { data: T };
type PermitAllowedAction = LicensePermitAllowedActionDto & {
  action: PermitActionType;
};

interface PermitViewModel extends ProfileNameFields {
  id: string;
  applicationId?: number | null;
  type?: number | null;
  documentId: string;
  documentName: string;
  documentType: LicensePermitDocumentType;
  /** Certificate number. Identity value the download/action flows key on - do not render it. */
  licensePermitNo: string;
  /** Number shown on the card. */
  showLicenseNumber: string;
  sourceLicenseId?: number | null;
  sourceServiceCode?: string | null;
  sourceMedialLicenseId?: number | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  effectiveDate: string;
  expireDate: string;
  status: LicenseStatus;
  allowedActions: PermitAllowedAction[];
  serviceId?: number | null;
  serviceCode?: string | null;
}

interface RenewalViewModel extends PermitViewModel {
  kind: "renewal";
  expireLabel: string;
}

const PERMIT_ACTION_TYPE_SET = new Set<PermitActionType>([
  "RENEW",
  "MODIFY",
  "CANCEL",
  "TRANSFER",
  "PARTNER_MANAGEMENT",
  "DOWNLOAD",
]);
const GATED_PERMIT_ACTIONS = new Set<PermitActionType>([
  "RENEW",
  "MODIFY",
  "CANCEL",
  "PARTNER_MANAGEMENT",
]);
const LICENSE_PERMIT_NO_REQUIRED_SERVICE_IDS = new Set([
  1802, 802, 804, 806, 1202, 1204, 1205, 80022, 80042, 80021, 80041,
]);

const isPermitActionType = (value: string): value is PermitActionType =>
  PERMIT_ACTION_TYPE_SET.has(value as PermitActionType);

const isInProgressValidationResult = (
  result: LicensePermitValidateResponse,
) => {
  if (result.inProgressApplicationType) {
    return true;
  }

  const normalizedText = [result.reasonCode, result.message]
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

const unwrapPayload = <T,>(response: unknown): T => {
  if (typeof response === "object" && response !== null && "data" in response) {
    return (response as DataEnvelope<T>).data;
  }

  return response as T;
};

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
        .filter((item): item is PermitAllowedAction =>
          Boolean(item?.action && isPermitActionType(item.action)),
        )
        .map((item) => ({
          action: item.action,
          serviceId: item.serviceId ?? null,
          serviceCode: item.serviceCode ?? null,
        }))
    : [];

const normalizePermitRecord = (
  item: LicensePermitListItemDto,
): PermitViewModel => ({
  id: String(item.id),
  profileId: item.profileId ?? null,
  profileName: item.profileName ?? null,
  userTypeId: item.userTypeId ?? null,
  userTypeName: item.userTypeName ?? null,
  applicationId: item.applicationId ?? null,
  type: item.type ?? null,
  documentId: item.documentId ?? "-",
  documentName: item.documentName ?? "-",
  documentType: item.documentType ?? "LICENSE",
  licensePermitNo: item.licensePermitNo ?? "-",
  showLicenseNumber: item.showLicenseNumber ?? item.licensePermitNo ?? "-",
  sourceLicenseId: item.sourceLicenseId ?? null,
  sourceServiceCode: item.sourceServiceCode ?? null,
  sourceMedialLicenseId: item.sourceMedialLicenseId ?? null,
  sourceApplicationId: item.sourceApplicationId ?? null,
  sourceApplicationDetailId: item.sourceApplicationDetailId ?? null,
  effectiveDate: item.effectiveDate ?? "",
  expireDate: item.expireDate ?? "",
  status: normalizeStatus(item.status),
  allowedActions: normalizeAllowedActions(item.allowedActions),
  serviceId: item.serviceId ?? null,
  serviceCode: item.serviceCode ?? null,
});

const normalizeRenewalRecord = (
  item: LicensePermitActionNeededItemDto,
): RenewalViewModel => ({
  kind: "renewal",
  id: String(item.id ?? ""),
  profileId: item.profileId ?? null,
  profileName: item.profileName ?? null,
  userTypeId: item.userTypeId ?? null,
  userTypeName: item.userTypeName ?? null,
  applicationId: item.applicationId ?? null,
  type: item.type ?? null,
  documentId: item.documentId ?? "",
  documentName: item.documentName ?? "",
  documentType: normalizeHomeRenewalDocumentType(item.documentType),
  licensePermitNo: item.licensePermitNo ?? "",
  showLicenseNumber: item.showLicenseNumber ?? item.licensePermitNo ?? "",
  sourceLicenseId: item.sourceLicenseId ?? null,
  sourceServiceCode: item.sourceServiceCode ?? null,
  sourceMedialLicenseId: item.sourceMedialLicenseId ?? null,
  sourceApplicationId: item.sourceApplicationId ?? null,
  sourceApplicationDetailId: item.sourceApplicationDetailId ?? null,
  effectiveDate: item.effectiveDate ?? "",
  expireDate: item.expireDate ?? "",
  expireLabel: item.expireLabel ?? "",
  status: normalizeStatus(item.status),
  allowedActions: normalizeAllowedActions(item.allowedActions),
  serviceId: item.serviceId ?? null,
  serviceCode: item.serviceCode ?? null,
});

const partitionPermitActions = (actions: PermitAllowedAction[]) => {
  const actionKeys = actions.map((item) => item.action);
  const inlineActions: PermitActionType[] = [];

  if (actionKeys.includes("RENEW")) {
    inlineActions.push("RENEW");
  } else if (actionKeys.includes("MODIFY")) {
    inlineActions.push("MODIFY");
  }

  if (actionKeys.includes("DOWNLOAD")) {
    inlineActions.push("DOWNLOAD");
  }

  if (inlineActions.length === 0 && actionKeys[0]) {
    inlineActions.push(actionKeys[0]);
  }

  return {
    inlineActions: inlineActions.sort((currentAction, nextAction) => {
      if (currentAction === "DOWNLOAD") return -1;
      if (nextAction === "DOWNLOAD") return 1;
      return 0;
    }),
    moreActions: actionKeys.filter((action) => !inlineActions.includes(action)),
  };
};

const normalizeLicensePermitNo = (value?: string | null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "-") {
    return undefined;
  }

  return normalized;
};

const createPermitActionKey = (
  action: PermitActionType,
  record: Pick<PermitViewModel, "documentId" | "documentType">,
) => `${record.documentType}:${record.documentId}:${action}`;

const getSafeArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const toFiniteNumber = (value: unknown): number | null => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const formatTransactionDate = (value?: string | null): string => {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "-";

  const date = moment(normalizedValue);
  return date.isValid() ? date.format("DD/MM/YYYY HH:mm:ss") : "-";
};

const unwrapData = <T,>(response: unknown, fallback: T): T => {
  const payload = unwrapPayload<T | null | undefined>(response);

  return payload ?? fallback;
};

const isPendingFineItem = (item: HomeActionCardItem): item is PendingFineItem =>
  Boolean(
    (item as PendingFineItem).violationId ||
      (item as PendingFineItem).violationNo,
  );

const isRenewalItem = (item: HomeActionCardItem): item is RenewalViewModel =>
  (item as RenewalViewModel).kind === "renewal";

const getPendingFineTitle = (item: PendingFineItem, isAr: boolean) => {
  const title = isAr
    ? item.violationTypeAr || item.violationType
    : item.violationType || item.violationTypeAr;

  return String(title || item.violationNo || "-").trim() || "-";
};

const getPendingFineAmountText = (item: PendingFineItem) => {
  const displayAmount = String(item.fineAmountDisplay ?? "").trim();

  if (displayAmount) {
    return displayAmount;
  }

  if (
    item.fineAmount === null ||
    item.fineAmount === undefined ||
    item.fineAmount === ""
  ) {
    return "-";
  }

  return String(formatMoney(item.fineAmount));
};

const normalizePendingFineReference = (value?: string | number | null) =>
  String(value ?? "").trim();

const getPendingFineReferenceNumber = (item: PendingFineItem) =>
  normalizePendingFineReference(item.violationNo) ||
  normalizePendingFineReference(item.violationId);

const getPendingFinePaymentAmount = (item: PendingFineItem) => {
  const amount = Number(item.fineAmount);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

interface HomeActionProps {
  refreshAction: () => void;
}
const permitIcons = [
  PermiteBgPaper,
  PermitArticle,
  PermitBook,
  PermitTelevision,
  PermitCamera,
];
const HomeAction: React.FC<HomeActionProps> = ({ refreshAction }) => {
  const { t, i18n } = useTranslation();
  const permitStatusLabel = useCallback(
    (statusKey: LicenseStatus) => t(`homeAction.permitStatus.${statusKey}`),
    [t],
  );
  const permitActionLabels: Record<PermitActionType, string> = useMemo(
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
  const isMax1280Min1024 = useMediaQuery(
    "(max-width: 1919px) and (min-width: 1024px)",
  );
  const isPermitHoverEnabled = useMediaQuery(
    "(hover: hover) and (pointer: fine)",
  );
  const { pengdingActions, pengdingActionNum } = useActionStore();
  const updateServicesId = useServicesStore((state) => state.updateServicesId);
  const updateServicesCode = useServicesStore(
    (state) => state.updateServicesCode,
  );
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const showProfileNameColumn = isGlobalProfileId(currentProfileId);
  const setLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.setLicenseLifecycleSource,
  );
  const clearLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.clearLicenseLifecycleSource,
  );
  const setUpdateForm = useUpdateFormStore(
    (state: {
      setUpdateForm: (payload: {
        applicationId?: number | null;
        type?: number | null;
      }) => void;
    }) => state.setUpdateForm,
  );
  const history = useHistory();
  const location = useLocation();
  const { openDialog, dialogNode } = useServiceEntryGateDialogController();
  const {
    ensureProfileAction,
    profileSelectionNode: profileActionSelectionNode,
  } = useProfileActionConfirmation();
  const {
    startService: startServiceWithProfileSelection,
    profileSelectionNode: globalServiceProfileSelectionNode,
  } = useGlobalServiceProfileSelection();
  const [actionList, setActionList] = useState<ActionListType>({
    allActions: [],
    pendingFineList: [],
    renewalList: [],
    pendingRequestsList: [],
    draftList: [],
  });
  const [pdfData, setPdfData] = useState({} as LicenseListResponseDto);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [documnetVisible, setDocumnetVisible] = useState(false);
  const [walletDetail, setWalletDetail] = useState<IWalletDetailObj | null>(
    null,
  );
  const [transactionsList, setTransactionsList] = useState<TransactionsItem[]>(
    [],
  );
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [serviceList, setServiceList] = useState<ServiceItem[]>([]);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [cancelModal, setCancelModal] = useState<{
    visible: boolean;
    id: string;
  }>({
    visible: false,
    id: "",
  });
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    id: string;
  }>({
    visible: false,
    id: "",
  });
  const [requestList, setRequestList] = useState<ActionItem[]>([]);
  const [currentTab, setCurrentTab] = useState(1);
  const [showComfirmModal, setShowComfirmModal] = useState(false);
  const [permitsList, setPermitsList] = useState<PermitViewModel[]>([]);
  const [renewalRecords, setRenewalRecords] = useState<RenewalViewModel[]>([]);
  const [visiblePermitsCount, setVisiblePermitsCount] = useState(4);
  const [permitsPageIndex, setPermitsPageIndex] = useState(1);
  const [permitsTotal, setPermitsTotal] = useState(0);
  const [isPermitsLoading, setIsPermitsLoading] = useState(false);
  const [hoveredPermitIndex, setHoveredPermitIndex] = useState<number | null>(
    null,
  );
  useEffect(() => {
    if (!isPermitHoverEnabled) {
      setHoveredPermitIndex(null);
    }
  }, [isPermitHoverEnabled]);
  const [pendingPermitActionKeys, setPendingPermitActionKeys] = useState<
    Set<string>
  >(() => new Set());
  const [openRenewalActionMenuKey, setOpenRenewalActionMenuKey] = useState<
    string | null
  >(null);
  const [, setStatisticData] = useState<{
    activeCount: number;
    expireSoonCount: number;
    expiredCount: number;
  }>({
    activeCount: 0,
    expireSoonCount: 0,
    expiredCount: 0,
  });
  const actionScrollRef = useRef<HTMLElement | null>(null);
  const permitsListRef = useRef<HTMLDivElement>(null);
  const pendingPermitActionKeyRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setPermitActionPending = useCallback(
    (actionKey: string, pending: boolean) => {
      const nextPendingKeys = new Set(pendingPermitActionKeyRef.current);

      if (pending) {
        nextPendingKeys.add(actionKey);
      } else {
        nextPendingKeys.delete(actionKey);
      }

      pendingPermitActionKeyRef.current = nextPendingKeys;
      setPendingPermitActionKeys(nextPendingKeys);
    },
    [],
  );

  const isPermitActionPending = useCallback(
    (
      action: PermitActionType,
      record: Pick<PermitViewModel, "documentId" | "documentType">,
    ) => pendingPermitActionKeys.has(createPermitActionKey(action, record)),
    [pendingPermitActionKeys],
  );

  useLayoutEffect(() => {
    actionScrollRef.current?.scrollTo({ left: 0 });
  }, [currentTab]);

  useEffect(() => {
    const pendingActionsData =
      (pengdingActions as PendingActionsPayload | undefined) ?? {};
    const pendingFinesList = Array.isArray(pendingActionsData.pendingFinesList)
      ? getSafeArray<PendingFineItem>(pendingActionsData.pendingFinesList)
      : getSafeArray<PendingFineItem>(pendingActionsData.pendingFineList);
    const pendingPaymentList = getSafeArray<ActionItem>(
      pendingActionsData.pendingPaymentList,
    );
    const pendingModificationList = getSafeArray<ActionItem>(
      pendingActionsData.pendingModificationList,
    );
    const pendingDispositionList = getSafeArray<ActionItem>(
      pendingActionsData.pendingDispositionList,
    );
    const pendingRequestsList = [
      ...pendingPaymentList,
      ...pendingModificationList,
      ...pendingDispositionList,
    ];
    const draftList = getSafeArray<ActionItem>(pendingActionsData.draftList);
    const now = nowGst().valueOf();
    const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;
    const renewalsWithin7Days: RenewalViewModel[] = [];
    const renewalsWithin30Days: RenewalViewModel[] = [];
    const otherRenewals: RenewalViewModel[] = [];

    renewalRecords.forEach((record) => {
      const expiresAt = fromApi(record.expireDate)?.valueOf();
      if (expiresAt === undefined) {
        otherRenewals.push(record);
        return;
      }
      const remainingTime = expiresAt - now;

      if (remainingTime >= 0 && remainingTime <= sevenDaysInMilliseconds) {
        renewalsWithin7Days.push(record);
      } else if (
        remainingTime > sevenDaysInMilliseconds &&
        remainingTime <= thirtyDaysInMilliseconds
      ) {
        renewalsWithin30Days.push(record);
      } else {
        otherRenewals.push(record);
      }
    });

    setActionList({
      pendingFineList: pendingFinesList,
      renewalList: renewalRecords,
      pendingRequestsList,
      draftList,
      allActions: [
        ...orderHomeActions({
          pendingFines: pendingFinesList,
          pendingPayments: pendingPaymentList,
          renewalsWithin7Days,
          renewalsWithin30Days,
          pendingModifications: pendingModificationList,
          drafts: draftList,
        }),
        ...pendingDispositionList,
        ...otherRenewals,
      ],
    });
  }, [pengdingActions, renewalRecords]);
  useEffect(() => {
    getWalletDetail();
    getTransactions();
    getRequestList();
    getStatisticData();
    getPermitsList();
    getRenewalList();
    getServiceList();
  }, []);
  const knowledgeList = KNOWLEDGE_ITEMS;
  // Badge counts use the backend's full renewal count, not the first-page
  // renewalList (which only exists for rendering the list body).
  const renewalCount =
    (pengdingActions as PendingActionsPayload)?.renewalCount ?? 0;
  const tabsList = useMemo(
    (): HomeActionTab[] => [
      {
        name: t("homeAction.tabs.allActions"),
        id: 1,
        key: "allActions",
        num:
          (actionList?.pendingRequestsList.length ?? 0) +
          (actionList?.draftList.length ?? 0) +
          (actionList?.pendingFineList.length ?? 0) +
          renewalCount,
      },
      {
        name: t("homeAction.tabs.pendingFines"),
        id: 2,
        key: "pendingFineList",
        num: actionList?.pendingFineList.length,
      },
      {
        name: t("homeAction.tabs.renewal"),
        id: 3,
        key: "renewalList",
        num: renewalCount,
      },
      {
        name: t("homeAction.tabs.pendingRequests"),
        id: 4,
        key: "pendingRequestsList",
        num: actionList?.pendingRequestsList.length,
      },
      {
        name: t("homeAction.tabs.drafts"),
        id: 5,
        key: "draftList",
        num: actionList?.draftList.length,
      },
    ],
    [t, actionList, renewalCount],
  );
  const columns = useMemo(
    () => [
      {
        title: t("homeAction.columns.requestNo"),
        dataIndex: "applicationNumber",
        key: "applicationNumber",
        width: 280,
      },
      {
        title: t("homeAction.columns.service"),
        dataIndex: "serviceNameEn",
        key: "serviceNameEn",
        width: 480,
        ellipsis: true,
        render(
          text: string,
          record: { serviceNameAr?: string; serviceNameEn?: string },
        ) {
          const display = i18n.language.startsWith("ar")
            ? record?.serviceNameAr ?? text
            : text;
          return (
            <OverflowTooltip
              className="home-recent-request-service"
              title={display || "-"}
            >
              {display || "-"}
            </OverflowTooltip>
          );
        },
      },
      ...(showProfileNameColumn
        ? [createProfileNameColumn<ActionItem>(t("common.profileName"))]
        : []),
      {
        title: t("homeAction.columns.submissionDate"),
        dataIndex: "createdOn",
        key: "createdOn",
        width: 160,
        render: (text: string) => moment(text).format("DD/MM/YYYY"),
      },
      {
        title: t("homeAction.columns.status"),
        dataIndex: "applicationStatusId",
        key: "applicationStatusNameEn",
        width: 160,
        render: (text: number) => (
          <div className="payments-talbe-status">
            <CustomStatusTag type="myRequest" status={text} />
          </div>
        ),
      },
    ],
    [t, i18n.language, showProfileNameColumn],
  );
  const getWalletDetail = () => {
    request.get("/api/Wallet/Detail").then((res) => {
      if (isMountedRef.current) {
        setWalletDetail(unwrapData<IWalletDetailObj | null>(res, null));
      }
    });
  };
  const getRequestList = () => {
    recentRequestList().then((res) => {
      if (isMountedRef.current) {
        setRequestList(getSafeArray<ActionItem>(unwrapData(res, [])));
      }
    });
  };
  const getTransactions = () => {
    setTransactionsLoading(true);
    getTransactionsList({
      PageIndex: 1,
      PageSize: 5,
    })
      .then((res) => {
        if (!isMountedRef.current) {
          return;
        }
        const payload = unwrapData<TransactionsPayload | null>(res, null);
        setTransactionsList(
          getSafeArray<TransactionsItem>(payload?.items).slice(0, 5),
        );
      })
      .catch((error) => {
        console.error("Failed to fetch payment center transactions:", error);
        if (isMountedRef.current) {
          setTransactionsList([]);
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setTransactionsLoading(false);
        }
      });
    // request
    //   .get("/api/Wallet/Transactions", {
    //     SortDirection: 1,
    //     pageSize: 4,
    //   })
    //   .then((res) => {
    //     setTransactionsList(res.data?.items);
    //   });
  };
  const getStatisticData = () => {
    getStatistics().then((res) => {
      if (isMountedRef.current) {
        setStatisticData({
          activeCount: res.data?.activeCount,
          expireSoonCount: res.data?.expireSoonCount,
          expiredCount: res.data?.expiredCount,
        });
      }
    });
  };
  const getRenewalList = () => {
    getActionNeeded()
      .then((res) => {
        if (!isMountedRef.current) {
          return;
        }
        const response = unwrapPayload<LicensePermitActionNeededItemDto[]>(res);
        setRenewalRecords(
          getSafeArray<LicensePermitActionNeededItemDto>(response)
            .filter((item) => Boolean(item.expireDate))
            .map(normalizeRenewalRecord),
        );
      })
      .catch((error) => {
        console.error(error);
        if (isMountedRef.current) {
          setRenewalRecords([]);
        }
      });
  };
  const getPermitsList = (
    pageIndex = 1,
    onLoaded?: (nextListLength: number, hasMoreServerData: boolean) => void,
  ) => {
    setIsPermitsLoading(true);
    getLicenseList({
      pageIndex,
      pageSize: 24,
      statuses: [],
      documentTypes: [],
      sortBy: "lastUpdateTime",
      sortDirection: 1,
    })
      .then((res) => {
        if (!isMountedRef.current) {
          return;
        }
        const response = unwrapPayload<LicensePermitQueryResponse>(res);
        const items = (response.items || []).map(normalizePermitRecord);
        const total = response.total || 0;
        setPermitsTotal(total);
        setPermitsPageIndex(response.pageIndex ?? pageIndex);
        if (pageIndex === 1) {
          setPermitsList(items);
          setVisiblePermitsCount(Math.min(4, items.length));
          onLoaded?.(items.length, items.length < total);
          return;
        }
        setPermitsList((prev) => {
          const nextList = [...prev, ...items];
          onLoaded?.(nextList.length, nextList.length < total);
          return nextList;
        });
      })
      .catch((error) => {
        console.error(error);
        if (isMountedRef.current && pageIndex === 1) {
          setPermitsList([]);
          setPermitsTotal(0);
          setVisiblePermitsCount(0);
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsPermitsLoading(false);
        }
      });
  };
  const getPermitIcon = (record: Pick<PermitViewModel, "id" | "documentId">) => {
    const stableKey = String(record.documentId || record.id || "");
    let hash = 0;

    for (let i = 0; i < stableKey.length; i += 1) {
      hash = (hash * 31 + stableKey.charCodeAt(i)) >>> 0;
    }

    return permitIcons[hash % permitIcons.length];
  };
  const rechanrgeAmount = (amount: string) => {
    if (walletDetail?.id) {
      request
        .post(`/api/Wallet/${walletDetail?.id}/Recharge`, {
          balance: Number(amount),
        })
        .then((res) => {
          if (res.data) {
            setShowRechargeModal(false);
            setShowComfirmModal(true);
            getWalletDetail();
            getTransactions();
          }
        });
    }
  };
  const getServiceList = () => {
    collectServiceList().then((res) => {
      if (isMountedRef.current) {
        const services = getSafeArray<ServiceItem>(unwrapData(res, []));
        setServiceList(services.slice(0, 8));
      }
    });
  };
  const getAction = (record: ActionItem) => {
    const applicationStatusId = record.applicationStatusId;
    if (applicationStatusId === APPLICATION_STATUS_ID.pendingPayment) {
      return (
        <CustomButton
          text={t("loginAs.payNow")}
          variant="primary"
          customClassName="action-btn"
          onClick={() => goToRequestDetail(record)}
        />
      );
    }
    if (
      applicationStatusId === APPLICATION_STATUS_ID.pendingModification ||
      applicationStatusId === APPLICATION_STATUS_ID.draft
    ) {
      return (
        <CustomButton
          text={t("loginAs.edit")}
          variant="primary"
          customClassName="action-btn"
          onClick={() => void handEdit(record)}
        />
      );
    }
    if (applicationStatusId === APPLICATION_STATUS_ID.underReview) {
      return (
        <CustomButton
          text={t("loginAs.cancel")}
          variant="primary"
          customClassName="action-btn"
          onClick={() =>
            setCancelModal({
              visible: true,
              id: String(record.applicationId || record.id || ""),
            })
          }
        />
      );
    }
  };
  const handleConfirmCancel = () => {
    if (cancelModal.id) {
      cancelApplication(cancelModal.id).then(() => {
        CustomMessage.success(t("loginAs.cancelSuccess"));
        getRequestList();
        refreshAction();
      });
    }
  };
  const isDeleteApplicationSuccess = (response: unknown) => {
    if (response === true) {
      return true;
    }

    if (!response || typeof response !== "object") {
      return false;
    }

    const normalizedResponse = response as DeleteApplicationResponse;
    if (
      normalizedResponse.isSuccess === true ||
      normalizedResponse.data === true
    ) {
      return true;
    }

    return (
      typeof normalizedResponse.data === "object" &&
      normalizedResponse.data?.isSuccess === true
    );
  };
  const openDeleteModal = (record: ActionItem) => {
    const applicationId = record.applicationId || record.id;
    if (!applicationId) {
      CustomMessage.error(t("myRequestsPage.messages.applicationDeleteFailed"));
      return;
    }

    setDeleteModal({ visible: true, id: String(applicationId) });
  };
  const handleConfirmDelete = async () => {
    try {
      const applicationId = Number(deleteModal.id);
      if (
        !deleteModal.id ||
        !Number.isFinite(applicationId) ||
        applicationId <= 0
      ) {
        CustomMessage.error(
          t("myRequestsPage.messages.applicationDeleteFailed"),
        );
        return;
      }

      const response = await deleteApplication(applicationId);
      if (isDeleteApplicationSuccess(response)) {
        CustomMessage.success(t("myRequestsPage.messages.applicationDeleted"));
        getRequestList();
        refreshAction();
        return;
      }

      CustomMessage.error(t("myRequestsPage.messages.applicationDeleteFailed"));
    } catch (error) {
      console.error("Failed to delete application:", error);
      CustomMessage.error(t("myRequestsPage.messages.applicationDeleteFailed"));
    } finally {
      setDeleteModal({ visible: false, id: "" });
    }
  };
  const handleStartService = async (val: ServiceItem) => {
    await startServiceWithProfileSelection({
      history,
      serviceId: val.id,
      serviceCode: val.code,
      serviceName: val.serviceNameEn,
      source: "home-action",
      openDialog,
    });
  };
  const goToRequestDetail = (record: ActionItem) => {
    const applicationId = record.applicationId || record.id;

    if (!applicationId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationDetailUnavailable"),
      );
      return;
    }

    history.push({
      pathname: "/my-requests/detail",
      search: buildHomeRequestDetailSearch(
        applicationId,
        record.applicationStatusId === APPLICATION_STATUS_ID.pendingPayment
          ? "payNow"
          : undefined,
      ),
      state: createProfileActionRouteState(record),
    });
  };

  const handEdit = async (record: ActionItem) => {
    const applicationId = record.applicationId || record.id;
    if (!applicationId || !record.serviceId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationEditUnavailable"),
      );
      return;
    }

    const profileConfirmed = await ensureProfileAction(record);
    if (!profileConfirmed) {
      return;
    }

    updateServicesId(Number(record.serviceId));
    updateServicesCode(record.serviceCode || "");

    history.push(
      createServiceApplicationActionPath({
        serviceId: Number(record.serviceId),
        action: "edit",
        serviceCode: record.serviceCode,
        applicationId,
        applicationStatusId: record.applicationStatusId,
        includeServiceEntryGate: true,
        sourceSearch: location.search,
      }),
    );
  };
  const handlePendingFinePayNow = useCallback(
    (item: PendingFineItem) => {
      const fineReferenceNumber = getPendingFineReferenceNumber(item);

      if (!fineReferenceNumber) {
        CustomMessage.error(t("violationsFinesPage.messages.loadFinesFailed"));
        return;
      }

      const violationNo =
        normalizePendingFineReference(item.violationNo) || fineReferenceNumber;
      const violationType = String(
        item.violationType ?? item.violationTypeAr ?? "",
      ).trim();

      history.push({
        pathname: `/violations-fines/violations/${encodeURIComponent(
          fineReferenceNumber,
        )}`,
        search: "?action=payNow",
        state: {
          payNowViolation: {
            fineReferenceNumber,
            violationNo,
            fineAmount: getPendingFinePaymentAmount(item),
            violationType: violationType || undefined,
          },
        },
      });
    },
    [history, t],
  );
  const openPermitDocument = async (
    record: Pick<
      PermitViewModel,
      "sourceLicenseId" | "documentName"
    >,
  ) => {
    if (
      record.sourceLicenseId === null ||
      record.sourceLicenseId === undefined
    ) {
      CustomMessage.error(t("homeAction.documentPreviewUnavailable"));
      return;
    }

    try {
      const detail = unwrapPayload<LicenseListResponseDto>(
        await getLicenseDetail(String(record.sourceLicenseId)),
      );
      if (!detail?.certificateUrl) {
        CustomMessage.error(t("homeAction.documentDownloadFailed"));
        return;
      }

      setPdfData({
        ...detail,
        name: detail.name ?? detail.documentName ?? record.documentName,
      });
      setDocumnetVisible(true);
    } catch (error) {
      console.error(error);
      CustomMessage.error(t("homeAction.documentDownloadFailed"));
    }
  };
  const hasPermitDownloadAction = (item: PermitViewModel) =>
    item.allowedActions.some((actionItem) => actionItem.action === "DOWNLOAD");

  const hasPermitRenewAction = (item: PermitViewModel) =>
    item.allowedActions.some((actionItem) => actionItem.action === "RENEW");

  const hasPermitInlineActions = (item: PermitViewModel) =>
    hasPermitDownloadAction(item) || hasPermitRenewAction(item);

  const handlePermitAction = async (
    action: PermitActionType,
    record: PermitViewModel,
  ) => {
    if (action === "DOWNLOAD") {
      await openPermitDocument(record);
      return;
    }

    const actionKey = createPermitActionKey(action, record);
    if (pendingPermitActionKeyRef.current.has(actionKey)) {
      return;
    }

    setPermitActionPending(actionKey, true);
    try {
      const profileConfirmed = await ensureProfileAction(record);
      if (!profileConfirmed) {
        return;
      }

      const actionApplicationId = resolvePermitActionApplicationId(record);
      const lifecycleSource = createLicenseLifecycleSource({
        action,
        documentId: record.documentId,
        documentType: record.documentType,
        licensePermitNo: normalizeLicensePermitNo(record.licensePermitNo),
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
      const shouldRunGate = gateEnabled && GATED_PERMIT_ACTIONS.has(action);
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
        CustomMessage.error(
          t("permitsLicensePage.messages.routingUnavailable"),
        );
        return;
      }

      const licensePermitNo = normalizeLicensePermitNo(record.licensePermitNo);
      if (
        LICENSE_PERMIT_NO_REQUIRED_SERVICE_IDS.has(result.serviceId) &&
        !licensePermitNo
      ) {
        CustomMessage.error(
          t("permitsLicensePage.messages.licensePermitNumberRequired"),
        );
        return;
      }

      const nextServiceCode = result.serviceCode ?? null;

      if (shouldRunGate) {
        await openServiceWithGate({
          history,
          serviceId: result.serviceId,
          serviceCode: nextServiceCode,
          source: "home-permit-action",
          openDialog,
          createAllowPath: (payload) =>
            createPermitActionPath({
              serviceId: payload.serviceId,
              action,
              serviceCode: payload.serviceCode ?? nextServiceCode,
              applicationId: actionApplicationId,
              requestType: record.type ?? null,
              includeServiceEntryGate: true,
              sourceSearch: location.search,
            }),
          onBeforeAllowNavigate: (payload) => {
            updateServicesId(payload.serviceId);
            updateServicesCode(payload.serviceCode ?? nextServiceCode);
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
      updateServicesCode(nextServiceCode);
      setUpdateForm({
        applicationId: actionApplicationId,
        type: record.type ?? null,
      });
      history.push(
        createPermitActionPath({
          serviceId: result.serviceId,
          action,
          serviceCode: nextServiceCode,
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
      setPermitActionPending(actionKey, false);
    }
  };

  const renderPermitDownloadButton = (
    item: PermitViewModel,
    customClassName = "download-btn",
  ) => {
    const hasDownloadAction = item.allowedActions.some(
      (actionItem) => actionItem.action === "DOWNLOAD",
    );

    if (!hasDownloadAction) {
      return null;
    }

    return (
      <CustomButton
        text={t("homeAction.download")}
        variant="text"
        customClassName={customClassName}
        disabled={item.allowedActions.some((action) =>
          isPermitActionPending(action.action, item),
        )}
        onClick={() => void openPermitDocument(item)}
      />
    );
  };

  const renderPermitRenewButton = (
    item: PermitViewModel,
    customClassName = "renew-btn",
  ) => {
    if (!hasPermitRenewAction(item)) {
      return null;
    }

    return (
      <CustomButton
        text={t("loginAs.renew")}
        variant="primary"
        size="medium"
        customClassName={customClassName}
        loading={isPermitActionPending("RENEW", item)}
        onClick={() => void handlePermitAction("RENEW", item)}
      />
    );
  };
  const renderRenewalActions = (item: RenewalViewModel) => {
    const { inlineActions, moreActions } = partitionPermitActions(
      item.allowedActions,
    );
    const isActionPending = (action: PermitActionType) =>
      isPermitActionPending(action, item);
    const actionMenuKey = `${item.documentType}:${item.documentId}`;
    const actionMenu = (
      <Menu
        onClick={({ key }) => {
          setOpenRenewalActionMenuKey(null);
          const action = String(key);
          if (!isPermitActionType(action)) return;
          void handlePermitAction(action, item);
        }}
        items={moreActions.map((action) => ({
          key: action,
          label: permitActionLabels[action],
          disabled: isActionPending(action),
        }))}
      />
    );

    return (
      <div className="home-renewal-card__footer">
        {moreActions.length > 0 ? (
          <Dropdown
            trigger={["click"]}
            overlayClassName="home-renewal-actions-dropdown"
            overlay={actionMenu}
            visible={openRenewalActionMenuKey === actionMenuKey}
            onVisibleChange={(visible) => {
              setOpenRenewalActionMenuKey(visible ? actionMenuKey : null);
            }}
          >
            <button
              type="button"
              className="home-renewal-card__more-button"
              aria-label={t("homeAction.more")}
              disabled={moreActions.every(isActionPending)}
            >
              <MoreOutlined />
            </button>
          </Dropdown>
        ) : (
          <span className="home-renewal-card__more-placeholder" />
        )}
        <div className="home-renewal-card__actions">
          {inlineActions.map((action, index) =>
            index === inlineActions.length - 1 ? (
              <CustomButton
                key={action}
                text={permitActionLabels[action]}
                size="medium"
                customClassName="home-renewal-card__primary-action"
                disabled={isActionPending(action)}
                loading={isActionPending(action)}
                onClick={() => void handlePermitAction(action, item)}
              />
            ) : (
              <CustomButton
                key={action}
                text={permitActionLabels[action]}
                variant="text"
                size="medium"
                customClassName="home-renewal-card__link-action"
                disabled={isActionPending(action)}
                loading={isActionPending(action)}
                onClick={() => void handlePermitAction(action, item)}
              />
            ),
          )}
        </div>
      </div>
    );
  };
  const renderProfileName = (
    item: ProfileNameFields,
    className = "home-action-profile",
  ) => {
    if (!showProfileNameColumn) {
      return null;
    }

    return (
      <div className={className}>
        <ProfileNameCell
          profileId={item.profileId}
          profileName={item.profileName}
          userTypeId={item.userTypeId}
          userTypeName={item.userTypeName}
        />
      </div>
    );
  };
  const items = actionList[tabsList[currentTab - 1].key].map((item) => {
    const isFineItem = isPendingFineItem(item);
    const renewalItem = isRenewalItem(item) ? item : null;
    const actionItem = item as ActionItem;
    const fineAmountText = isFineItem ? getPendingFineAmountText(item) : "";
    const shouldShowFineAmountIcon =
      Boolean(fineAmountText) && fineAmountText !== "-";
    const cardTitle = isFineItem
      ? getPendingFineTitle(item, i18n.language.startsWith("ar"))
      : renewalItem
      ? renewalItem.documentName
      : pendingActionServiceDisplayName(
          i18n.language.startsWith("ar"),
          actionItem,
        );
    const itemKey =
      item.id ??
      item.applicationId ??
      item.documentId ??
      item.licensePermitNo ??
      (isFineItem ? item.violationId ?? item.violationNo : undefined);

    if (isFineItem) {
      return (
        <div key={itemKey} className="l1-2-item l1-2-item--pending-fine">
          <div className="home-pending-fine-card__body">
            <div className="home-pending-fine-card__topline">
              <CustomStatusTag
                type="violation"
                status={item.statusId ?? item.status ?? 7}
              />
              {renderProfileName(
                item,
                "home-action-profile home-action-profile--inline",
              )}
            </div>
            <OverflowTooltip
              align={{ offset: [0, 8] }}
              className="l1-2-item-content home-pending-fine-card__title"
              placement="top"
              title={cardTitle}
            >
              {cardTitle}
            </OverflowTooltip>
          </div>
          <div className="home-pending-fine-card__footer">
            <div className="home-pending-fine-card__amount">
              {shouldShowFineAmountIcon ? <AED /> : null}
              <span>{fineAmountText || "-"}</span>
            </div>
            <CustomButton
              text={t("violationsFinesPage.common.payNow")}
              variant="primary"
              size="medium"
              customClassName="home-pending-fine-card__button"
              onClick={() => handlePendingFinePayNow(item)}
            />
          </div>
        </div>
      );
    }

    if (renewalItem) {
      return (
        <article
          key={itemKey}
          className={`l1-2-item l1-2-item--renewal home-renewal-card ${
            renewalItem.status === "EXPIRED"
              ? "home-renewal-card--expired"
              : "home-renewal-card--default"
          }`}
        >
          <div className="home-renewal-card__body">
            <span
              className={`home-renewal-card__status ${
                renewalItem.status === "EXPIRED"
                  ? "home-renewal-card__status--expired"
                  : "home-renewal-card__status--expire-soon"
              }`}
            >
              {renewalItem.expireLabel}
            </span>
            {renderProfileName(
              renewalItem,
              "home-action-profile home-renewal-card__profile",
            )}
            <OverflowTooltip
              align={{ offset: [0, 8] }}
              className="home-renewal-card__title"
              placement="top"
              title={renewalItem.documentName}
            >
              {renewalItem.documentName}
            </OverflowTooltip>
            {renewalItem.effectiveDate || renewalItem.expireDate ? (
              <div className="home-renewal-card__dates">
                <ClockCircleOutlined />
                <span>
                  {formatDisplayDateRange(
                    renewalItem.effectiveDate,
                    renewalItem.expireDate,
                  )}
                </span>
              </div>
            ) : null}
          </div>
          {renderRenewalActions(renewalItem)}
        </article>
      );
    }

    return (
      <div
        key={itemKey}
        className={`l1-2-item ${
          actionItem.applicationStatusId === APPLICATION_STATUS_ID.rejected
            ? "rejected-item"
            : ""
        }`}
      >
        <div className="payments-talbe-status">
          <CustomStatusTag
            type="myRequest"
            status={actionItem.applicationStatusId ?? 0}
          />
        </div>
        {renderProfileName(item)}
        {/* <div className={`status-tag ${getStatus(item.applicationStatusNameEn)}`}>{item.applicationStatusNameEn}</div> */}
        <OverflowTooltip
          align={{ offset: [0, 8] }}
          className="l1-2-item-content"
          placement="top"
          title={cardTitle}
        >
          {cardTitle}
        </OverflowTooltip>
        {actionItem.status === 3 ? (
          <div className="pending-bottom">
            <div className="price">1,000.00</div>
            <CustomButton text={t("homeAction.payFine")} variant="primary" />
          </div>
        ) : (
          <div className="btn-group">
            {actionItem.applicationStatusId === APPLICATION_STATUS_ID.draft ? (
              <CustomButton
                text={t("loginAs.delete")}
                variant="text"
                customClassName="action-btn"
                onClick={() => openDeleteModal(actionItem)}
              />
            ) : (
              <CustomButton
                text={t("homeAction.details")}
                variant="text"
                customClassName="action-btn"
                onClick={() => goToRequestDetail(actionItem)}
              />
            )}
            {getAction(actionItem)}
          </div>
        )}
      </div>
    );
  });

  // transactionTypeId: 1 RECHARGE (never returned here), 2 SERVICE_PAYMENT, 3 FINES, 4 REFUND
  const getIcon = (transactionTypeId: number | null) => {
    switch (transactionTypeId) {
      case 3:
        return TransactionsFinePayment;
      case 4:
        return TransactionsRefund;
      default:
        return TransactionsDefault;
    }
  };
  const permitStatusClassNameMap: Record<LicenseStatus, string> = {
    ACTIVE: "status-tag--active",
    EXPIRE_SOON: "status-tag--expire-soon",
    EXPIRED: "status-tag--expired",
    SUSPENDED: "status-tag--suspended",
    CANCELLED: "status-tag--cancelled",
  };
  const tabs = tabsList.map((item) => (
    <div
      key={item.id}
      className={`tabs-item ${item.id === currentTab ? "active-tab" : ""}`}
      onClick={() => setCurrentTab(item.id)}
    >
      {`${item.name} (${item.num})`}
    </div>
  ));
  const getPermitsScrollStep = () => {
    if (!permitsListRef.current) return 78;
    const permitItems =
      permitsListRef.current.querySelectorAll(".permits-item");
    if (permitItems.length < 2) return 78;

    const firstTop = (permitItems[0] as HTMLElement).offsetTop;
    const secondTop = (permitItems[1] as HTMLElement).offsetTop;
    const step = Math.abs(secondTop - firstTop);

    return step || 78;
  };
  const permitsStep = 4;
  const hasUnshownLocalPermits = visiblePermitsCount < permitsList.length;
  const hasMoreServerPermits = permitsList.length < permitsTotal;
  const canLoadMorePermits = hasUnshownLocalPermits || hasMoreServerPermits;
  const showTopButton = visiblePermitsCount > permitsStep;

  const handleLoadMorePermits = () => {
    if (isPermitsLoading) return;

    if (hasUnshownLocalPermits) {
      const nextVisibleCount = Math.min(
        visiblePermitsCount + permitsStep,
        permitsList.length,
      );
      const isShowingLastLocalItem =
        nextVisibleCount === permitsList.length && !hasMoreServerPermits;

      setVisiblePermitsCount(nextVisibleCount);
      requestAnimationFrame(() => {
        if (permitsListRef.current) {
          if (isShowingLastLocalItem) {
            permitsListRef.current.scrollTo({
              top: permitsListRef.current.scrollHeight,
              behavior: "smooth",
            });
          } else {
            permitsListRef.current.scrollBy({
              top: getPermitsScrollStep(),
              behavior: "smooth",
            });
          }
        }
      });
      return;
    }

    if (hasMoreServerPermits) {
      const nextPageIndex = permitsPageIndex + 1;
      getPermitsList(nextPageIndex, (nextListLength, nextHasMoreServerData) => {
        const nextVisibleCount = Math.min(
          visiblePermitsCount + permitsStep,
          nextListLength,
        );
        const isShowingLastItem =
          nextVisibleCount === nextListLength && !nextHasMoreServerData;

        setVisiblePermitsCount(nextVisibleCount);
        requestAnimationFrame(() => {
          if (permitsListRef.current) {
            if (isShowingLastItem) {
              permitsListRef.current.scrollTo({
                top: permitsListRef.current.scrollHeight,
                behavior: "smooth",
              });
            } else {
              permitsListRef.current.scrollBy({
                top: getPermitsScrollStep(),
                behavior: "smooth",
              });
            }
          }
        });
      });
    }
  };

  const handleBackToPermitsTop = () => {
    setVisiblePermitsCount((prev) => Math.max(4, prev - permitsStep));
    requestAnimationFrame(() => {
      if (permitsListRef.current) {
        permitsListRef.current.scrollBy({
          top: -getPermitsScrollStep(),
          behavior: "smooth",
        });
      }
    });
  };

  const visiblePermitsStartIndex =
    Math.floor((Math.max(visiblePermitsCount, 1) - 1) / permitsStep) *
    permitsStep;
  const permits = permitsList
    .slice(visiblePermitsStartIndex, visiblePermitsStartIndex + permitsStep)
    .map((item, index) => {
      const isHovered = hoveredPermitIndex === index;
      const shouldCompress = hoveredPermitIndex !== null && !isHovered;

      return (
        <div
          className={`permits-item ${isHovered ? "is-hovered" : ""} ${
            shouldCompress ? "is-compressed" : ""
          }`}
          key={item.id}
          onMouseEnter={() => {
            if (isPermitHoverEnabled) {
              setHoveredPermitIndex(index);
            }
          }}
          onMouseLeave={() => setHoveredPermitIndex(null)}
        >
          <div className="item-main">
            <div>
              <div className="name">{item.documentName}</div>
              {renderProfileName(
                item,
                "home-action-profile home-action-profile--permit",
              )}
              <div className="content">
                {t("homeAction.licensePermitNoLabel", {
                  no: item.showLicenseNumber,
                })}
              </div>
              <div className="time">
                {formatDisplayDateRange(item.effectiveDate, item.expireDate)}
              </div>
            </div>
            <div
              className={`status-tag ${permitStatusClassNameMap[item.status]}`}
            >
              {permitStatusLabel(item.status)}
            </div>
            <img className="bg-img" src={getPermitIcon(item)} alt="" />
          </div>
          {hasPermitInlineActions(item) ? (
            <div className="item-actions">
              {renderPermitDownloadButton(item)}
              {renderPermitRenewButton(item)}
            </div>
          ) : null}
        </div>
      );
    });
  const shouldStabilizePermitHover =
    isPermitHoverEnabled && permits.length > 1;
  const transactions = transactionsList.map((item, i) => {
    const transactionTypeId = toFiniteNumber(
    item.transactionTypeId ?? item.transactionTypeObj?.id,
    );
    const isPositive = transactionTypeId === 1 || transactionTypeId === 4;
    const amount = toFiniteNumber(item.amount);
    const transactionName =
      preferLocalizedEnAr(
        i18n.language.startsWith("ar"),
        item.transactionTypeObj?.nameEn,
        item.transactionTypeObj?.nameAr,
      ) || "-";

    return (
      <div
        className="transactions-item"
        key={String(item.id ?? item.transactionNo ?? i)}
      >
        <div className="item-icon">
        <img src={getIcon(transactionTypeId)} alt="" />
        </div>
        <div className="item-msg">
          <div className="name">{transactionName}</div>
          <div className="time">{formatTransactionDate(item.completedAt)}</div>
        </div>
        <div className={`item-value ${!isPositive ? "item-value-red" : ""}`}>
          {amount === null ? (
            <span>-</span>
          ) : (
            <>
              <span>{isPositive ? "+" : "-"}</span>
              <AED />
              {formatMoney(amount)}
            </>
          )}
        </div>
      </div>
    );
  });
  const services = serviceList.map((item) => (
    <div className="service-item" key={item.id}>
      <img src={ServiceIcon} alt="" />
      <div className="service-name">
        {pendingActionServiceDisplayName(i18n.language.startsWith("ar"), item)}
      </div>
      <div className="tag-list">
        {item.userTypes.map((type, i) => (
          <div className="tag-item" key={i}>
            {i18n.language.startsWith("ar")
              ? type.nameAr ?? type.nameEn
              : type.nameEn}
          </div>
        ))}
      </div>
      <div className="item-footer">
        <CustomButton
          text={t("homeInitialization.learnMore")}
          customClassName="learn-btn"
          variant="outline"
          size="small"
          onClick={() => history.push(`/services/service-card?id=${item.id}`)}
        />
        <CustomButton
          text={t("homeInitialization.startService")}
          customClassName="start-btn"
          variant="primary"
          size="small"
          onClick={() => handleStartService(item)}
        />
      </div>
    </div>
  ));
  const hasHomeActions =
    pengdingActionNum > 0 || actionList.renewalList.length > 0;
  return (
    <div className="action-page">
      <div className="module-1">
        {hasHomeActions ? (
          <div className="tabs-list-wrapper">
            <div className="tabs-list">{tabs}</div>
          </div>
        ) : (
          <div className="tip-title">{t("homeAction.whatDoYouWantToday")}</div>
        )}
        <SimpleBar
          className="horizontal_scroll"
          scrollableNodeProps={{ ref: actionScrollRef }}
        >
          <div className="horizontal_scroll__content">
            {hasHomeActions ? (
              items.length > 0 ? (
                items
              ) : (
                <div className="empty-action-wrapper">
                  <EmptyBox
                    customClassName="empty-action-state"
                    title={t("homeInitialization.noData")}
                  />
                </div>
              )
            ) : (
              <>
                <div
                  className="add-request"
                  onClick={() => history.push("/services")}
                >
                  <PlusOutlined className="plus-icon" />
                  <div className="add-title">{t("homeAction.newRequest")}</div>
                </div>
                {services}
              </>
            )}
          </div>
        </SimpleBar>
      </div>
      {/* module 2 */}
      <div className="module-2">
        <div className="module-card module-2-table">
          <div className="card-head">
            <div className="card-title">{t("homeAction.recentRequests")}</div>
            <img
              src={ArrowIcon}
              onClick={() => history.push("/my-requests")}
              alt=""
            />
          </div>
          <TablePanel
            tableProps={{
              dataSource: requestList,
              columns: columns,
              pagination: false,
              scroll: { x: 1080 },
              tableLayout: "fixed",
              onRow: (record) => ({
                onClick: () => {
                  goToRequestDetail(record);
                },
              }),
            }}
          />
        </div>
        <div
          className={`module-card module-2-permits ${
            Math.max(permitsList.length, permitsTotal) < permitsStep
              ? "module-2-permits--content-height"
              : ""
          }`}
        >
          <div className="card-head">
            <div className="card-title">
              {t("homeAction.permitsAndLicense")}
            </div>
            <img
              src={ArrowIcon}
              onClick={() => history.push("/permits-license")}
              alt=""
            />
          </div>
          {/* 
          <div className="data_line">
            <div className="data_item success-style">
              <span>Active</span>
              <span>{statisticData.activeCount}</span>
            </div>
            <div className="data_item warn-style">
              <span>Expiring</span>
              <span>{statisticData.expireSoonCount}</span>
            </div>
            <div className="data_item error-style">
              <span>Expired</span>
              <span>{statisticData.expiredCount}</span>
            </div>
          </div>
           */}
          {permitsList.length > 0 ? (
            <div
              className={`permits-list-wrapper ${
                Math.max(permitsList.length, permitsTotal) < permitsStep
                  ? "permits-list-wrapper--content-height"
                  : ""
              } ${
                shouldStabilizePermitHover
                  ? "permits-list-wrapper--stable-hover"
                  : ""
              }`}
            >
              {showTopButton && (
                <div
                  className="top-btn-wrapper"
                  onClick={handleBackToPermitsTop}
                >
                  <OverflowTooltip
                    className="top-btn-label"
                    title={t("homeAction.top")}
                  >
                    {t("homeAction.top")}
                  </OverflowTooltip>
                  <img
                    src={DoubleTopOutlined}
                    alt=""
                    style={{ marginLeft: 4 }}
                  />
                </div>
              )}
              <div
                className={`permits-list permits-list--stacked ${
                  shouldStabilizePermitHover
                    ? "permits-list--stable-hover"
                    : ""
                }`}
                ref={permitsListRef}
              >
                {permits}
              </div>
              {canLoadMorePermits && (
                <div
                  className="more-btn-wrapper"
                  onClick={handleLoadMorePermits}
                >
                  {isPermitsLoading
                    ? t("common.loading")
                    : t("homeAction.more")}
                  <img
                    src={DoubleBottomOutlined}
                    alt=""
                    style={{ marginLeft: 4 }}
                  />
                </div>
              )}
            </div>
          ) : (
            <EmptyBox title={t("homeInitialization.noData")} />
          )}
        </div>
        {isMax1280Min1024 && (
          <div className="module-3">
            <div className="module-card module-3-transactions">
              <div className="card-head">
                <div className="card-title">
                  {/* {walletDetail?.statusId == 1
                    ? t("homeInitialization.myWallet")
                    : t("homeInitialization.transactionsTitle")} */}
                  {t("homeInitialization.transactionsTitle")}
                </div>
                <img
                  src={ArrowIcon}
                  onClick={() => history.push("/payments")}
                  alt=""
                />
              </div>
              <>
                {transactionsLoading ? (
                  <div className="transactions-loading-wrapper">
                    <Spin size="large" />
                  </div>
                ) : transactionsList.length > 0 ? (
                  <div className="transactions-list">{transactions}</div>
                ) : (
                  <EmptyBox title={t("homeInitialization.noData")} />
                )}
              </>
            </div>
          </div>
        )}
      </div>
      {/* module 3 */}
      <div className="module-3">
        {!isMax1280Min1024 && (
          <div className="module-card module-3-transactions">
            <div className="card-head">
              <div className="card-title">
                {/* {walletDetail?.statusId == 1
                  ? t("homeInitialization.myWallet")
                  : t("homeInitialization.transactionsTitle")} */}
                {t("homeInitialization.transactionsTitle")}
              </div>
              <img
                src={ArrowIcon}
                onClick={() => history.push("/payments")}
                alt=""
              />
            </div>

            <>
              {transactionsLoading ? (
                <div className="transactions-loading-wrapper">
                  <Spin size="large" />
                </div>
              ) : transactionsList.length > 0 ? (
                <div className="transactions-list">{transactions}</div>
              ) : (
                <EmptyBox title={t("homeInitialization.noData")} />
              )}
            </>
          </div>
        )}
        <div className="module-card module-3-knowledge">
          <div className="card-head">
            <div className="card-title">
              {t("homeInitialization.knowledgeCenterTitle")}
            </div>
            <img
              src={ArrowIcon}
              alt=""
              onClick={() => {
                history.push("/knowledge-center");
              }}
            />
          </div>
          <div className="knowledge-list">
            {knowledgeList?.length > 0 ? (
              knowledgeList.slice(0, 3).map((item) => {
                return (
                  <div className="knowledge-item" key={item.id}>
                    <img src={item.img} alt="" />
                    <div className="title">
                      {i18n.language?.startsWith("ar") && item.titleAr
                        ? item.titleAr
                        : item.titleEn}
                    </div>
                    <div className="content">
                      {i18n.language?.startsWith("ar") && item.contentAr
                        ? item.contentAr
                        : item.contentEn}
                    </div>
                    <div className="flex-end-box">
                      <CustomButton
                        onClick={() => {
                          const url = getKnowledgeItemUrl(item, i18n.language);

                          if (url) {
                            window.open(url, "_blank", "noopener,noreferrer");
                            return;
                          }

                          history.push(
                            `/knowledge-center/knowledge-center-detail?id=${item.id}`,
                          );
                        }}
                        text={t("homeInitialization.learnMore")}
                        variant="outline"
                        customClassName="learn-btn"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyBox title={t("homeInitialization.noData")} />
            )}
          </div>
        </div>
        <div className="module-card module-3-service">
          <div className="card-head">
            <div className="card-title">
              {t("homeInitialization.serviceAdvisorTitle")}
            </div>
          </div>
          <div className="service-advisor">
            <img src={ServiceAdvisor} alt="" />
            <div className="title">{t("homeInitialization.advisorTitle")}</div>
            <div className="content">
              {t("homeInitialization.advisorContent")}
            </div>
            <div className="flex-end-box">
              <CustomButton
                text={t("homeInitialization.getStarted")}
                variant="primary"
                customClassName="learn-btn"
                onClick={() => {
                  if (requestOpenAiChatBot()) return;
                  CustomMessage.info(
                    t("homeInitialization.featureInDevelopment"),
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* ProcessModal */}
      <ProcessModal
        show={showProcessModal}
        close={() => setShowProcessModal(false)}
      />
      {/* RechargeModal */}
      <RechargeModal
        show={showRechargeModal}
        recharge={rechanrgeAmount}
        close={() => setShowRechargeModal(false)}
      />
      {/* DocumentDown */}
      <DocumentDown
        visible={documnetVisible}
        fileName={pdfData.name ?? ""}
        url={pdfData.certificateUrl ?? ""}
        password={pdfData.pdfPassword ?? ""}
        title={t("homeAction.downloadDocumentTitle")}
        subtitle={t("homeAction.downloadDocumentSubtitle")}
        noteText={t("homeAction.downloadDocumentNote")}
        useCustomIcon={true}
        className="document-down-modal"
        cancle={() => {
          setDocumnetVisible(false);
        }}
      />
      {/* Cancel request ComfirmModal */}
      <ComfirmModal
        title={t("loginAs.cancelComplaintTitle")}
        content={t("loginAs.cancelComplaintContent")}
        show={cancelModal.visible}
        close={() => setCancelModal({ visible: false, id: "" })}
        comfrimHanld={handleConfirmCancel}
        type="warning"
        comfrimText={t("common.confirm")}
        cancelText={t("common.cancel")}
      />
      {/* Delete request ComfirmModal */}
      <ComfirmModal
        title={t("myRequestsPage.deleteModal.title")}
        content={t("myRequestsPage.deleteModal.content")}
        show={deleteModal.visible}
        close={() => setDeleteModal({ visible: false, id: "" })}
        comfrimHanld={handleConfirmDelete}
        type="warning"
        comfrimText={t("myRequestsPage.deleteModal.confirmButton")}
        cancelText={t("common.cancel")}
      />
      {/* ComfirmModal */}
      <ComfirmModal
        show={showComfirmModal}
        title={t("homeInitialization.rechargeSuccessTitle")}
        content={t("homeInitialization.rechargeSuccessContent")}
        cancelText={t("homeInitialization.close")}
        comfrimText={t("homeInitialization.downloadReceipt")}
        close={() => setShowComfirmModal(false)}
      />
      {dialogNode}
      {profileActionSelectionNode}
      {globalServiceProfileSelectionNode}
    </div>
  );
};

export default HomeAction;
