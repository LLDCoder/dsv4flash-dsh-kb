import { fmt } from "@/utils/gstTime";
import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import { Input, Modal, Spin, Tooltip } from "antd";
import type {
  UploadRequestError,
  UploadRequestOption,
} from "rc-upload/lib/interface";
import {
  ActionFooter,
  CustomButton,
  CardPaymentProgressModal,
  CustomMessage,
  ComfirmModal,
} from "@/components/common";
import FileUpload, { type FileItem } from "@/components/common/FileUpload";
import { useProfileActionConfirmation } from "@/components/ServiceEntryGate";
import FormilyReviewList from "@/components/common/FormilyReviewList";
import DocumentViewer, {
  type FileType,
} from "@/components/common/DocumentViewer";
import WarningCircle from "@/assets/images/warning-circle.png";

import PaymentSuccessModal from "./PaymentSuccessModal";
import { postUserServiceRating } from "@/services/complaints";
import PaymentSuccessPage from "./PaymentSuccessPage";
import FeeQuoteDisplay from "../MediaLicense/components/FeeQuoteDisplay";
import PenaltyDisplay from "../MediaLicense/components/PenaltyDisplay";
import ReviewProfileInfo from "../MediaLicense/components/ReviewProfileInfo";
import ServiceDetails from "../MediaLicense/components/ServiceDetails";
import { resolveServiceDeliveryTime } from "../MediaLicense/components/serviceDetailsDeliveryTime";
import { useMediaLicensePenaltyPreview } from "../MediaLicense/requestPenaltyPreview";
import { isPenaltyEnabledRenewServiceCode } from "../MediaLicense/penaltyPayload";
import ApplicationTimeline, {
  type ApplicationTimelineItem,
} from "./ApplicationTimeline";
import DispositionMethodDetails from "./DispositionMethodDetails";
import DeliveryInformation, {
  type DeliveryInformationErrors,
  type DeliveryInformationValues,
} from "./DeliveryInformation";
import {
  resolveActiveApplicationDeliveryInformation,
  resolveApplicationDeliveryInformation,
} from "./DeliveryInformation/formValues";
import ReviewPersonalInformation from "@/components/common/ReviewPersonalInformation";
import RequestModification, {
  type RequestDetailProps,
} from "./RequestModification";
import DocumentDown from "../PermitsLicense/components/DocumentDown";
import {
  getApplicationDetail,
  getApplicationPartnerManagementContext,
  getApplicationLifecycleActivities,
  getApplicationPage,
  deleteApplication,
  cancelApplication,
  type ApplicationDetailsResponse,
  type LifecycleActivityContext,
  type MyRequestDeliveryResponse,
  submitDispositionSubmission,
  saveSubmitDispositionProof,
  // type PayRequestDto
} from "@/services/myRequest";
import {
  PARTNER_MANAGEMENT_SERVICE_CODES,
  resolvePartnerManagementContextValues,
  type PartnerManagementFormPartner,
} from "@/pages/MediaLicense/partnerManagementContext";
import {
  getLicenseDetail,
  getLicenseList,
  type LicenseListResponseDto,
  type LicensePermitQueryResponse,
} from "@/services/permitsLicense";
import "./index.less";
import FileIcon from "@/assets/images/wenjian.svg";
import StatusIcon from "@/assets/images/submissionTime.svg";
import ClockIcon from "@/assets/images/shijian.svg";
import TypeIcon from "@/assets/refund-detail-icons/summary-category.svg";
import lastUpdatedIconSvgRaw from "@/assets/images/PencilSimpleLine.svg?raw";
import {
  DeleteOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { urlParsing } from "@/utils/history";
import { firstNullableId } from "@/utils/nullableId";
import { createServiceApplicationActionPath } from "@/utils/permitActionPath";
import { useHistory } from "react-router-dom";
import {
  type FeeQuoteResponse,
  GetUserEstablishmentByUserProfileID,
  getISBNstatus,
  getServiceLookupMappingByServiceCode,
  getServiceLearn,
  type ServiceLookupMappingDto,
} from "@/services/services";
import {
  addBookItemStatusToCounts,
  createBookApprovedStatusMap,
  createEmptyBookItemStatusCounts,
  normalizeIsbn,
  type BookApprovedStatusMap,
  type BookItemStatusCounts,
} from "@/utils/bookApprovedStatus";
import {
  downloadServiceApplicationReceipt,
  getServiceApplicationPayment,
  type ServiceApplicationFeeBreakdownItemDto,
  type ServiceApplicationPaymentOrderDto,
} from "@/services/paymentCenterServiceApplication";
import { getUserIndividualByProfileId } from "@/services/userProfile";
import { useServicesStore } from "@/store/services";
import { useUserStore } from "@/store/user";
import { useCommonStore } from "@/store/common-store";
import { useMyRequestDetailTitleStore } from "@/store/myRequestDetailTitle";
import { useMyRequestDetailStore } from "@/store/myRequestDetail";
import CardPaymentFailurePage from "./CardPayment/CardPaymentFailurePage";
import CardPaymentSuccessPage from "./CardPayment/CardPaymentSuccessPage";
import { useCardPayment } from "./CardPayment/useCardPayment";
import PaymentMethodSelectionModal from "@/components/common/PaymentMethodSelectionModal";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import {
  getEffectiveMyRequestStatus,
  getMyRequestDetailActions,
  getMyRequestTimelineStages,
  isDetailServiceDepartmentResolved,
  resolveDetailContentService,
  resolveMyRequestStatus,
  type MyRequestActionKey,
} from "@/utils/myRequestApproval";
import {
  getReceiptDownloadErrorMessage,
  getReceiptDownloadFileName,
  getReceiptPendingMessage,
} from "@/utils/paymentReceipt";
import {
  readProfileActionRouteState,
  resolveProfileActionTarget,
} from "@/utils/profileActionContext";
import { getVisibleFormilyList } from "@/pages/MediaLicense/stepVisibility";
import { resolveService1801IdSelectorRuntimeType } from "@/pages/MediaLicense/service1801IdSelectorRuntime";
import { fileUpload } from "@/services/media";
import { useTranslation } from "react-i18next";
import DetailsReject from "@/assets/images/DetailsReject.svg";
import ModifyChangeSummary from "@/pages/MediaLicense/components/ModifyChangeSummary";
import {
  MODIFY_CHANGE_SUMMARY_SERVICE_CODES,
  resolveSubmittedModifyLanguageSnapshots,
  resolveSubmittedModifyChangeSummary,
} from "@/pages/MediaLicense/modifyChangeSummary";

const LastUpdatedIcon = `data:image/svg+xml,${encodeURIComponent(lastUpdatedIconSvgRaw)}`;
const HIDE_BOOK_LIST_STATUS_IDS = [101, 102, 103, 107];
interface SummaryItem {
  label: string;
  value: string | React.ReactNode;
  icon: string;
}

interface ServiceDetailCardInfo {
  description: string;
  processTime: string;
  paymentTimeline: string;
}

interface DetailServiceLookupConfig {
  processId: number | null;
}

interface ReviewAttachmentItem {
  name: string;
  url: string;
  fileType?: FileType;
}

const EMPTY_DETAIL_SERVICE_LOOKUP_CONFIG: DetailServiceLookupConfig = {
  processId: null,
};
const HIDE_PENALTY_STATUS_KEYS = new Set([
  "completed",
  "rejected",
  "cancelled",
]);
const getTrimmedText = (value: unknown) => String(value ?? "").trim();

const getReviewAttachmentFileName = (url: string) => {
  const cleanUrl = url.split(/[?#]/)[0] || "";
  const parts = cleanUrl.split(/[/\\]/).filter(Boolean);
  const fileName = parts[parts.length - 1] || "";

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
};

const getReviewAttachmentFileType = (fileName: string): FileType | undefined => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "PDF";
  if (extension === "jpg") return "JPG";
  if (extension === "jpeg") return "JPEG";
  if (extension === "png") return "PNG";
  return undefined;
};

const getLocalizedText = (
  englishValue?: unknown,
  arabicValue?: unknown,
  ...fallbacks: unknown[]
) => {
  const isArabic = (localStorage.getItem("language") || "en").startsWith("ar");
  const primaryValue = getTrimmedText(isArabic ? arabicValue : englishValue);
  const secondaryValue = getTrimmedText(isArabic ? englishValue : arabicValue);

  if (primaryValue) return primaryValue;
  if (secondaryValue) return secondaryValue;

  for (const fallback of fallbacks) {
    const nextValue = getTrimmedText(fallback);
    if (nextValue) return nextValue;
  }

  return "";
};

const formatDuration = (value: unknown, unit: unknown, fallback = "-") => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return `${numericValue} ${getTrimmedText(unit) || "Days"}`;
};

const resolveServiceName = (detail: ApplicationDetailsResponse | null) =>
  detail
    ? getLocalizedText(
        detail.serviceNameEn,
        detail.serviceNameAr,
        detail.serviceName,
        detail.nameEn,
        detail.nameAr,
      )
    : "";

const resolveApplicationType = (detail: ApplicationDetailsResponse | null) =>
  detail
    ? getLocalizedText(
        detail.applicationTypeNameEn,
        detail.applicationTypeNameAr,
        detail.typeNameEn,
        detail.typeNameAr,
        detail.type,
      )
    : "";

const resolveServiceLookupMapping = (
  response:
    | { data?: ServiceLookupMappingDto }
    | ServiceLookupMappingDto
    | null
    | undefined,
): ServiceLookupMappingDto | null => {
  if (!response || typeof response !== "object") {
    return null;
  }

  const candidate =
    "data" in response && response.data && typeof response.data === "object"
      ? response.data
      : response;

  return candidate && typeof candidate === "object" ? candidate : null;
};

const getSearchParamText = (search: string, key: string) =>
  new URLSearchParams(search).get(key) || "";

const EMPTY_DELIVERY_ERRORS: DeliveryInformationErrors = {};
const EMPTY_DELIVERY_INFORMATION_VALUES: DeliveryInformationValues = {
  courierService: "",
  recipientName: "",
  emirateId: undefined,
  regionId: undefined,
  areaId: undefined,
  street: "",
  mobile: {
    mobileCountryCode: "",
    mobileLocalNumber: "",
  },
};

const parseJsonArray = <T,>(value: string | null | undefined): T[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error("[Detail] Failed to parse fee JSON:", error);
    return [];
  }
};

const toFiniteNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const mapServiceApplicationPaymentToFeeQuote = (
  feeQuote: ServiceApplicationPaymentOrderDto | null,
): FeeQuoteResponse | null => {
  if (!feeQuote) {
    return null;
  }

  const breakdownItems = parseJsonArray<ServiceApplicationFeeBreakdownItemDto>(
    feeQuote.feeBreakdownJson,
  );
  const breakdown = breakdownItems.map((item, index) => ({
    legacyG3Code:
      getTrimmedText(item.legacyG3Code) ||
      getTrimmedText(item.code) ||
      `FEE-${index + 1}`,
    chargeName:
      getLocalizedText(item.chargeName, item.chargeNameAr, item.description) ||
      "-",
    description: getTrimmedText(item.description),
    amount: toFiniteNumber(item.amount),
    basis: getTrimmedText(item.basis),
  }));
  const totalAmount =
    feeQuote.amount != null
      ? toFiniteNumber(feeQuote.amount)
      : breakdown.reduce((sum, item) => sum + item.amount, 0);
  const currency = getTrimmedText(feeQuote.currencyCode) || "AED";

  if (!breakdown.length && totalAmount <= 0) {
    return null;
  }

  return {
    totalAmount,
    currency,
    breakdown,
    quotedAt:
      getTrimmedText(feeQuote.updatedOn) ||
      getTrimmedText(feeQuote.createdOn) ||
      "",
  };
};

function unwrapServiceApplicationPayment(
  res: unknown,
): ServiceApplicationPaymentOrderDto | null {
  if (res == null || typeof res !== "object") {
    return null;
  }
  const o = res as Record<string, unknown>;
  if (o.data != null && typeof o.data === "object") {
    return o.data as ServiceApplicationPaymentOrderDto;
  }
  return res as ServiceApplicationPaymentOrderDto;
}

type DataEnvelope<T> = { data: T };

const unwrapPayload = <T,>(response: unknown): T => {
  if (typeof response === "object" && response !== null && "data" in response) {
    return (response as DataEnvelope<T>).data;
  }

  return response as T;
};

type ApplicationFormDataItem = Record<string, unknown> & {
  stepNameEn?: string;
  stepNameAr?: string;
};

const parseApplicationFormData = (
  formData?: string | null,
): ApplicationFormDataItem[] => {
  const normalizedFormData = String(formData ?? "").trim();

  if (!normalizedFormData) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalizedFormData);
    return Array.isArray(parsed) ? (parsed as ApplicationFormDataItem[]) : [];
  } catch (error) {
    console.error("Failed to parse application form data:", error);
    return [];
  }
};

const collectApplicationBookIsbns = (
  formDataItems: ApplicationFormDataItem[],
): string[] => {
  const isbnSet = new Set<string>();

  formDataItems.forEach((item) => {
    if (typeof item !== "object" || item === null) {
      return;
    }

    const rawStepFormData = item.formData;
    if (typeof rawStepFormData !== "string" || !rawStepFormData.trim()) {
      return;
    }

    try {
      const parsedStepFormData = JSON.parse(rawStepFormData) as unknown;
      if (
        typeof parsedStepFormData !== "object" ||
        parsedStepFormData === null
      ) {
        return;
      }

      const formValues = (parsedStepFormData as Record<string, unknown>)
        .formValues;
      if (typeof formValues !== "object" || formValues === null) {
        return;
      }

      const bookListUpload = (formValues as Record<string, unknown>)
        .bookListUpload;
      if (typeof bookListUpload !== "object" || bookListUpload === null) {
        return;
      }

      const bookList = (bookListUpload as Record<string, unknown>).bookList;
      if (!Array.isArray(bookList)) {
        return;
      }

      bookList.forEach((book: unknown) => {
        if (typeof book !== "object" || book === null) {
          return;
        }

        const isbn = normalizeIsbn((book as Record<string, unknown>).isbn);
        if (isbn) {
          isbnSet.add(isbn);
        }
      });
    } catch (error) {
      console.error("Failed to parse application step form data:", error);
    }
  });

  return Array.from(isbnSet).sort();
};

const countApplicationBooks = (
  formDataItems: ApplicationFormDataItem[],
): number =>
  formDataItems.reduce((total, item) => {
    if (typeof item !== "object" || item === null) {
      return total;
    }

    const rawStepFormData = item.formData;
    if (typeof rawStepFormData !== "string" || !rawStepFormData.trim()) {
      return total;
    }

    try {
      const parsedStepFormData = JSON.parse(rawStepFormData) as unknown;
      if (
        typeof parsedStepFormData !== "object" ||
        parsedStepFormData === null
      ) {
        return total;
      }

      const formValues = (parsedStepFormData as Record<string, unknown>)
        .formValues;
      if (typeof formValues !== "object" || formValues === null) {
        return total;
      }

      const bookListUpload = (formValues as Record<string, unknown>)
        .bookListUpload;
      if (typeof bookListUpload !== "object" || bookListUpload === null) {
        return total;
      }

      const bookList = (bookListUpload as Record<string, unknown>).bookList;
      return total + (Array.isArray(bookList) ? bookList.length : 0);
    } catch (error) {
      console.error("Failed to parse application step form data:", error);
      return total;
    }
  }, 0);

interface ResolvedApplicationBookStatuses {
  formDataItems: ApplicationFormDataItem[];
  counts: BookItemStatusCounts;
}

const resolveApplicationBookStatuses = (
  formDataItems: ApplicationFormDataItem[],
  statusMap: BookApprovedStatusMap,
): ResolvedApplicationBookStatuses => {
  const counts = createEmptyBookItemStatusCounts();
  const resolvedFormDataItems = formDataItems.map((item) => {
    if (typeof item !== "object" || item === null) {
      return item;
    }

    const rawStepFormData = item.formData;
    if (typeof rawStepFormData !== "string" || !rawStepFormData.trim()) {
      return item;
    }

    try {
      const parsedStepFormData = JSON.parse(rawStepFormData) as unknown;
      if (
        typeof parsedStepFormData !== "object" ||
        parsedStepFormData === null
      ) {
        return item;
      }

      const parsedStepRecord = parsedStepFormData as Record<string, unknown>;
      const formValues = parsedStepRecord.formValues;
      if (typeof formValues !== "object" || formValues === null) {
        return item;
      }

      const formValuesRecord = formValues as Record<string, unknown>;
      const bookListUpload = formValuesRecord.bookListUpload;
      if (typeof bookListUpload !== "object" || bookListUpload === null) {
        return item;
      }

      const bookListUploadRecord = bookListUpload as Record<string, unknown>;
      const bookList = bookListUploadRecord.bookList;
      if (!Array.isArray(bookList)) {
        return item;
      }

      let hasStatusChanged = false;
      const resolvedBookList = bookList.map((book: unknown) => {
        if (typeof book !== "object" || book === null) {
          return book;
        }

        const bookRecord = book as Record<string, unknown>;
        const matchedStatus = statusMap.get(normalizeIsbn(bookRecord.isbn));
        const resolvedStatus = matchedStatus ?? bookRecord.status;
        addBookItemStatusToCounts(counts, resolvedStatus);

        if (matchedStatus === undefined || matchedStatus === bookRecord.status) {
          return book;
        }

        hasStatusChanged = true;
        return {
          ...bookRecord,
          status: matchedStatus,
        };
      });

      if (!hasStatusChanged) {
        return item;
      }

      return {
        ...item,
        formData: JSON.stringify({
          ...parsedStepRecord,
          formValues: {
            ...formValuesRecord,
            bookListUpload: {
              ...bookListUploadRecord,
              bookList: resolvedBookList,
            },
          },
        }),
      };
    } catch (error) {
      console.error("Failed to parse application step form data:", error);
      return item;
    }
  });

  return {
    formDataItems: resolvedFormDataItems,
    counts,
  };
};

const getErrorMessage = (_error: unknown, fallbackMessage: string) =>
  fallbackMessage;

const getSubmitProofUploadedFileNames = (fileList: FileItem[]) => {
  const seen = new Set<string>();

  return fileList.reduce<string[]>((result, file) => {
    const fileName = file.url.trim();
    if (!fileName || seen.has(fileName)) {
      return result;
    }

    seen.add(fileName);
    result.push(fileName);
    return result;
  }, []);
};

const Detail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const localizedPaymentTimelineFallback = useMemo(
    () =>
      t("serviceApplicationSidebar.paymentTimelineValue", {
        count: 21,
      }),
    [t],
  );
  const formatPaymentTimeline = useCallback(
    (
      value: unknown,
      unit: unknown,
      fallback = localizedPaymentTimelineFallback,
    ) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return fallback;
      }

      const normalizedUnit = getTrimmedText(unit).toLowerCase();
      const isWorkingDayUnit =
        !normalizedUnit ||
        normalizedUnit.includes("day") ||
        normalizedUnit.includes("work") ||
        normalizedUnit.includes("business");

      if (isWorkingDayUnit) {
        return t("serviceApplicationSidebar.paymentTimelineValue", {
          count: numericValue,
        });
      }

      return formatDuration(numericValue, unit, fallback);
    },
    [localizedPaymentTimelineFallback, t],
  );
  const localizeActionConfig = useCallback(
    (actionItem: ReturnType<typeof getMyRequestDetailActions>[number]) => ({
      ...actionItem,
      label: t(`myRequestsPage.actions.${actionItem.key}`),
    }),
    [t],
  );
  const dispositionMethodOptions = useMemo(
    () => [
      {
        label: t("myRequestsPage.detail.submitProofModal.methods.export.title"),
        value: "ExportOutOfCountry",
        description: t(
          "myRequestsPage.detail.submitProofModal.methods.export.description",
        ),
        icon: "export" as const,
      },
      {
        label: t(
          "myRequestsPage.detail.submitProofModal.methods.destroy.title",
        ),
        value: "DestructionIncineration",
        description: t(
          "myRequestsPage.detail.submitProofModal.methods.destroy.description",
        ),
        icon: "destroy" as const,
      },
      {
        label: t("myRequestsPage.detail.submitProofModal.methods.seized.title"),
        value: "SeizedByGovernmentAuthority",
        description: t(
          "myRequestsPage.detail.submitProofModal.methods.seized.description",
        ),
        icon: "seized" as const,
      },
    ],
    [t],
  );
  const ServicesStore = useServicesStore();
  const history = useHistory();
  const userInfo = useUserStore((state) => state.userInfo);
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const setCommonLoading = useCommonStore((state) => state.setLoading);
  const setDetailTitle = useMyRequestDetailTitleStore(
    (state) => state.setDetailTitle,
  );
  const clearDetailTitle = useMyRequestDetailTitleStore(
    (state) => state.clearDetailTitle,
  );
  const setIsFirstApprovalRejected = useMyRequestDetailStore(
    (state) => state.setIsFirstApprovalRejected,
  );
  const setStatusEn = useMyRequestDetailStore((state) => state.setStatusEn);
  const resetMyRequestDetail = useMyRequestDetailStore(
    (state) => state.resetMyRequestDetail,
  );
  const [pdfData, setPdfData] = useState({} as LicenseListResponseDto);
  const [documnetVisible, setDocumnetVisible] = useState(false as boolean);
  const [cancelModalShow, setCancelModalShow] = useState(false);
  const [deleteModalShow, setDeleteModalShow] = useState(false);
  const [reviewAttachmentModalVisible, setReviewAttachmentModalVisible] =
    useState(false);

  const location = useLocation();
  const { ensureProfileAction, profileSelectionNode } =
    useProfileActionConfirmation();
  const [loading, setLoading] = useState(true);
  const [applicationDetail, setApplicationDetail] =
    useState<ApplicationDetailsResponse | null>(null);
  // CP-012 / CP-013 email deep links land here as a brand-new page load, so no
  // router state carries the owning profile. Fall back to the URL parameter.
  const deepLinkProfileId = useMemo(
    () => (new URLSearchParams(location.search).get("profileId") || "").trim(),
    [location.search],
  );
  const profileActionTarget = useMemo(
    () =>
      resolveProfileActionTarget(
        applicationDetail,
        readProfileActionRouteState(location.state),
        deepLinkProfileId ? { profileId: deepLinkProfileId } : null,
      ),
    [applicationDetail, deepLinkProfileId, location.state],
  );
  const [applicationPageType, setApplicationPageType] = useState("");
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const detailTitle = useMyRequestDetailTitleStore((state) =>
    applicationId ? state.titlesByApplicationId[applicationId] : undefined,
  );
  // const [applicationDetail, setApplicationDetail] =
  //   useState<ApplicationDetailsResponse | null>(null);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [paymentMethodProceedLoading, setPaymentMethodProceedLoading] =
    useState(false);
  const [paymentSuccessVisible, setPaymentSuccessVisible] = useState(false);
  const [paySuccessDetails] = useState("" as string);
  const [showPaymentSuccessPage, setShowPaymentSuccessPage] = useState(false);
  const [profileInfoExpanded, setProfileInfoExpanded] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0 as number);
  const [delivery, setDelivery] = useState(0 as number);
  const [FormilyOption, setFormilyOption] = useState<ApplicationFormDataItem[]>(
    [],
  );
  const [bookItemStatusCounts, setBookItemStatusCounts] =
    useState<BookItemStatusCounts>(() => createEmptyBookItemStatusCounts());
  const [partnerManagementOwnerPartners, setPartnerManagementOwnerPartners] =
    useState<PartnerManagementFormPartner[]>([]);
  const [ProfileInfoIndex, setProfileInfoIndex] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [Department, setDepartment] = useState(0);
  const [isDepartmentResolved, setIsDepartmentResolved] = useState(false);
  const [isIndividualAccount, setIsIndividualAccount] = useState(false);
  const [resolvedDocumentLicenseId, setResolvedDocumentLicenseId] = useState<
    string | null
  >(null);
  const [resolvingDocumentLicenseId, setResolvingDocumentLicenseId] =
    useState(false);
  const [submitProofModalVisible, setSubmitProofModalVisible] = useState(false);
  const [submitProofMethod, setSubmitProofMethod] = useState<
    string | undefined
  >("ExportOutOfCountry");
  const [submitProofFiles, setSubmitProofFiles] = useState<FileItem[]>([]);
  const [submitProofNotes, setSubmitProofNotes] = useState("");
  const [submitProofSubmitting, setSubmitProofSubmitting] = useState(false);
  const [deliveryDetailState, setDeliveryDetailState] = useState<{
    applicationId: number;
    data: MyRequestDeliveryResponse | null;
  } | null>(null);
  const deliveryDetail = resolveActiveApplicationDeliveryInformation(
    deliveryDetailState,
    applicationId,
  );
  const [quoteData, setQuoteData] = useState<FeeQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [lifecycleActivityContext, setLifecycleActivityContext] =
    useState<LifecycleActivityContext | null>(null);
  const [lifecycleActivityLoading, setLifecycleActivityLoading] =
    useState(false);
  const [lifecycleActivityError, setLifecycleActivityError] = useState(false);
  const hasResolvedFormFeeRef = useRef(false);
  const paymentFromCenterRef = useRef(false);
  const feeRequestIdRef = useRef(0);
  const lifecycleRequestIdRef = useRef(0);
  const paymentDetailRefreshTimerRef = useRef<number | null>(null);
  const paymentMethodProceedInFlightRef = useRef(false);
  const deepLinkProfileCalibrationRef = useRef(false);
  const autoPayNowTriggeredRef = useRef(false);
  const documentLicenseLookupRef = useRef<{
    keyword: string;
    promise: Promise<string | null>;
  } | null>(null);
  const [applicationPayment, setApplicationPayment] =
    useState<ServiceApplicationPaymentOrderDto | null>(null);
  const [serviceDetailInfo, setServiceDetailInfo] =
    useState<ServiceDetailCardInfo>({
      description: "",
      processTime: "-",
      paymentTimeline: localizedPaymentTimelineFallback,
    });
  const [detailServiceLookupConfig, setDetailServiceLookupConfig] =
    useState<DetailServiceLookupConfig>(EMPTY_DETAIL_SERVICE_LOOKUP_CONFIG);
  const basePaymentAmount = useMemo(() => {
    if (applicationPayment?.amount != null) {
      return toFiniteNumber(applicationPayment.amount);
    }
    return totalAmount + delivery;
  }, [applicationPayment, totalAmount, delivery]);

  const visibleFormilyOption = useMemo(
    () =>
      getVisibleFormilyList(FormilyOption || []).map((item) => ({
        ...item,
        stepNameEn:
          item.stepNameEn === "Application Step 1"
            ? "Activity Details"
            : item.stepNameEn,
      })),
    [FormilyOption],
  );
  const applicationBookCount = useMemo(
    () => countApplicationBooks(FormilyOption || []),
    [FormilyOption],
  );
  const detailFormServiceCode = useMemo(
    () =>
      applicationDetail
        ? applicationDetail.code ||
          applicationDetail.serviceCode ||
          String(
            ServicesStore.userInfo.servicesCode ??
              applicationDetail.serviceId ??
              "",
          )
        : "",
    [applicationDetail, ServicesStore.userInfo.servicesCode],
  );
  const detailIdSelectorRuntimeType = useMemo(
    () =>
      Number(applicationDetail?.serviceId) === 1801
        ? resolveService1801IdSelectorRuntimeType(FormilyOption)
        : undefined,
    [applicationDetail?.serviceId, FormilyOption],
  );
  const detailModifyChangeSections = useMemo(() => {
    if (
      !MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(
        String(detailFormServiceCode ?? ""),
      )
    ) {
      return [];
    }
    return resolveSubmittedModifyChangeSummary(visibleFormilyOption);
  }, [detailFormServiceCode, visibleFormilyOption]);
  const detailModifyLanguageSnapshots = useMemo(() => {
    if (
      !MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(
        String(detailFormServiceCode ?? ""),
      )
    ) {
      return [];
    }
    return resolveSubmittedModifyLanguageSnapshots(visibleFormilyOption);
  }, [detailFormServiceCode, visibleFormilyOption]);
  const isContentService = resolveDetailContentService(
    applicationDetail?.serviceDepartment,
    Department === 2,
  );
  const detailStatusInput = useMemo(
    () => ({
      statusId: applicationDetail?.applicationStatusId,
      statusName: applicationDetail?.statusEn || applicationDetail?.statusAr,
      serviceCode: applicationDetail?.code || applicationDetail?.serviceCode,
      isContentService,
      amount: applicationDetail?.amount,
    }),
    [
      applicationDetail?.amount,
      applicationDetail?.applicationStatusId,
      applicationDetail?.code,
      applicationDetail?.serviceCode,
      applicationDetail?.statusAr,
      applicationDetail?.statusEn,
      isContentService,
    ],
  );
  const detailRawStatusKey = useMemo(
    () => resolveMyRequestStatus(detailStatusInput),
    [detailStatusInput],
  );
  const shouldHideDraftAmount =
    detailRawStatusKey === "draft" && applicationDetail?.amount == null;
  const paymentSummaryDisplay = useMemo(() => {
    if (shouldHideDraftAmount) {
      return {
        total: null,
      };
    }

    if (!applicationPayment) {
      return {
        total: totalAmount + delivery,
      };
    }
    const p = applicationPayment;
    return {
      total: p.amount ?? totalAmount + delivery,
    };
  }, [applicationPayment, delivery, shouldHideDraftAmount, totalAmount]);
  const isPenaltyHiddenByStatus = useMemo(
    () => HIDE_PENALTY_STATUS_KEYS.has(detailRawStatusKey),
    [detailRawStatusKey],
  );
  const isPenaltyEnabledDetailService = useMemo(
    () => isPenaltyEnabledRenewServiceCode(detailFormServiceCode),
    [detailFormServiceCode],
  );
  const shouldUsePaymentFirstTimelineFlow =
    detailServiceLookupConfig.processId === 2 && totalAmount === 0;
  const shouldTreatPendingPaymentAsUnderReview =
    detailRawStatusKey === "pendingPayment" &&
    shouldUsePaymentFirstTimelineFlow;
  const detailEffectiveStatusKey = useMemo(
    () =>
      getEffectiveMyRequestStatus({
        ...detailStatusInput,
        overridePendingPaymentAsUnderReview:
          shouldTreatPendingPaymentAsUnderReview,
      }),
    [detailStatusInput, shouldTreatPendingPaymentAsUnderReview],
  );
  const {
    penaltyData,
    penaltyLoading,
    penaltyError,
    requestPenaltyPreview,
    resetPenaltyPreview,
  } = useMediaLicensePenaltyPreview({
    serviceCode: detailFormServiceCode,
    applicationId,
    rootApplicationId: lifecycleActivityContext?.rootApplicationId ?? null,
    applicationNumber: applicationDetail?.applicationNumber ?? null,
    penaltyFor: lifecycleActivityContext?.penaltyFor ?? null,
  });
  const resolvedPenaltyError = useMemo(
    () =>
      lifecycleActivityError
        ? t("myRequestsPage.detail.lifecycleActivityLoadFailed")
        : penaltyError,
    [lifecycleActivityError, penaltyError, t],
  );
  const isPenaltyContextMissing = useMemo(() => {
    return (
      Boolean(applicationDetail) &&
      !isPenaltyHiddenByStatus &&
      isPenaltyEnabledDetailService &&
      !lifecycleActivityLoading &&
      !lifecycleActivityError &&
      !lifecycleActivityContext?.penaltyFor
    );
  }, [
    applicationDetail,
    isPenaltyHiddenByStatus,
    isPenaltyEnabledDetailService,
    lifecycleActivityContext?.penaltyFor,
    lifecycleActivityError,
    lifecycleActivityLoading,
  ]);
  const effectivePenaltyLoading =
    !isPenaltyHiddenByStatus &&
    isPenaltyEnabledDetailService &&
    (lifecycleActivityLoading || penaltyLoading);
  const penaltyTotalAmount =
    Number(
      !resolvedPenaltyError &&
        !isPenaltyContextMissing &&
        penaltyData?.totalAmount,
    ) || 0;
  const paymentAmount = basePaymentAmount + penaltyTotalAmount;
  const isPaymentBlockedByPenalty =
    effectivePenaltyLoading ||
    (!isPenaltyHiddenByStatus &&
      isPenaltyEnabledDetailService &&
      (Boolean(resolvedPenaltyError) ||
        isPenaltyContextMissing ||
        (Boolean(lifecycleActivityContext?.penaltyFor) && !penaltyData)));
  const shouldShowPenaltyDisplay =
    !isPenaltyHiddenByStatus &&
    (effectivePenaltyLoading ||
      Boolean(resolvedPenaltyError) ||
      penaltyTotalAmount > 0 ||
      isPenaltyContextMissing);
  useEffect(() => {
    if (!detailFormServiceCode) {
      setDetailServiceLookupConfig(EMPTY_DETAIL_SERVICE_LOOKUP_CONFIG);
      return;
    }

    let cancelled = false;

    getServiceLookupMappingByServiceCode(detailFormServiceCode)
      .then((response) => {
        if (cancelled) {
          return;
        }

        const mapping = resolveServiceLookupMapping(response);
        setDetailServiceLookupConfig({
          processId: Number(mapping?.processId || 0) || null,
        });
      })
      .catch((error) => {
        console.error("[Detail] Failed to load service lookup mapping:", error);

        if (!cancelled) {
          setDetailServiceLookupConfig(EMPTY_DETAIL_SERVICE_LOOKUP_CONFIG);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailFormServiceCode]);
  useEffect(() => {
    if (
      !applicationDetail ||
      !isPenaltyEnabledDetailService ||
      isPenaltyHiddenByStatus
    ) {
      resetPenaltyPreview();
      return;
    }

    if (lifecycleActivityContext?.penaltyFor) {
      void requestPenaltyPreview();
      return;
    }

    resetPenaltyPreview();
  }, [
    applicationDetail,
    isPenaltyHiddenByStatus,
    isPenaltyEnabledDetailService,
    lifecycleActivityContext?.penaltyFor,
    requestPenaltyPreview,
    resetPenaltyPreview,
  ]);
  const deliveryReadOnlyLabels = useMemo(() => {
    const isArabic = i18n.language.toLowerCase().startsWith("ar");

    return {
      courierService: isArabic
        ? deliveryDetail?.courierNameAr
        : deliveryDetail?.courierNameEn,
      recipientName: deliveryDetail?.recipientName,
      mobileNumber: deliveryDetail?.mobile,
      address: isArabic
        ? deliveryDetail?.addressAr
        : deliveryDetail?.addressEn,
    };
  }, [deliveryDetail, i18n.language]);
  const uploadedSubmitProofFileNames = useMemo(
    () => getSubmitProofUploadedFileNames(submitProofFiles),
    [submitProofFiles],
  );
  const {
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
  } = useCardPayment({
    applicationId: applicationId ?? 0,
    hasPayablePenalty: penaltyTotalAmount > 0,
    applicationDetail,
    search: location.search,
    replacePathSearch: (nextSearch) => {
      history.replace(`${location.pathname}${nextSearch}`);
    },
    refreshDetails: getDetails,
  });

  const openDocumentByCertificateId = useCallback(
    async (
      certificateId: unknown,
      options?: {
        unavailableMessage?: string;
        messageType?: "error" | "info";
      },
    ) => {
      const showMessage =
        options?.messageType === "info"
          ? CustomMessage.info
          : CustomMessage.error;
      const normalizedCertificateId = firstNullableId(certificateId);

      if (!normalizedCertificateId) {
        showMessage(
          options?.unavailableMessage ||
            t("myRequestsPage.messages.documentUnavailable"),
        );
        return false;
      }

      setCommonLoading(true);
      try {
        const res = await getLicenseDetail(normalizedCertificateId);
        const detail = res.data;

        if (!detail?.certificateUrl) {
          showMessage(t("myRequestsPage.messages.documentFileUnavailable"));
          return false;
        }

        setPdfData(detail);
        setDocumnetVisible(true);

        return true;
      } catch (error) {
        console.error("Failed to load document detail:", error);
        showMessage(t("myRequestsPage.messages.failedLoadDocument"));
        return false;
      } finally {
        setCommonLoading(false);
      }
    },
    [setCommonLoading, t],
  );

  const findDocumentSourceIdByApplicationNumber = useCallback(
    async (applicationNumber?: string | null) => {
      const keyword = applicationNumber?.trim();

      if (!keyword) {
        return null;
      }

      const response = unwrapPayload<LicensePermitQueryResponse>(
        await getLicenseList({
          keyword,
          statuses: [],
          documentTypes: [],
          pageIndex: 1,
          pageSize: 10,
          sortBy: "lastUpdateTime",
          sortDirection: 1,
        }),
      );

      const normalizedKeyword = keyword.toLowerCase();
      const matchedRecord = response.items?.find((item) => {
        if (
          item.sourceLicenseId === null ||
          item.sourceLicenseId === undefined
        ) {
          return false;
        }

        return [
          (item as { applicationNumber?: string }).applicationNumber,
          item.applicationNo,
        ].some(
          (value) =>
            String(value ?? "")
              .trim()
              .toLowerCase() === normalizedKeyword,
        );
      });

      return firstNullableId(matchedRecord?.sourceLicenseId);
    },
    [],
  );

  const resolveDocumentLicenseId = useCallback(
    async (applicationNumber?: string | null) => {
      const keyword = applicationNumber?.trim();

      if (!keyword) {
        return null;
      }

      const currentLookup = documentLicenseLookupRef.current;

      if (currentLookup?.keyword === keyword) {
        return currentLookup.promise;
      }

      const lookupPromise = findDocumentSourceIdByApplicationNumber(keyword);
      documentLicenseLookupRef.current = {
        keyword,
        promise: lookupPromise,
      };

      try {
        return await lookupPromise;
      } finally {
        if (documentLicenseLookupRef.current?.promise === lookupPromise) {
          documentLicenseLookupRef.current = null;
        }
      }
    },
    [findDocumentSourceIdByApplicationNumber],
  );

  const documentLicenseLookupKey = useMemo(
    () =>
      firstNullableId(
        applicationDetail?.applicationNumber,
        cardPaymentDocumentNumber,
      ),
    [applicationDetail?.applicationNumber, cardPaymentDocumentNumber],
  );

  const resolveAndCacheDocumentLicenseId = useCallback(
    async (showMessage = false, messageType: "error" | "info" = "error") => {
      const notify =
        messageType === "info" ? CustomMessage.info : CustomMessage.error;
      const currentCertificateId = firstNullableId(
        applicationDetail?.certificateId,
      );

      if (currentCertificateId) {
        setResolvedDocumentLicenseId(currentCertificateId);
        return currentCertificateId;
      }

      if (!documentLicenseLookupKey) {
        if (showMessage) {
          notify(t("myRequestsPage.messages.documentUnavailable"));
        }
        return null;
      }

      setResolvingDocumentLicenseId(true);
      try {
        const documentLicenseId = await resolveDocumentLicenseId(
          documentLicenseLookupKey,
        );

        setResolvedDocumentLicenseId(documentLicenseId);

        if (!documentLicenseId && showMessage) {
          notify(t("myRequestsPage.messages.documentUnavailable"));
        }

        return documentLicenseId;
      } catch (error) {
        console.error("Failed to resolve document license id:", error);

        if (showMessage) {
          notify(t("myRequestsPage.messages.failedLoadDocument"));
        }

        return null;
      } finally {
        setResolvingDocumentLicenseId(false);
      }
    },
    [
      applicationDetail?.certificateId,
      documentLicenseLookupKey,
      resolveDocumentLicenseId,
      t,
    ],
  );

  const openDocumentFromCurrentApplication = async () => {
    const params = urlParsing(location.search);
    const currentCertificateId = firstNullableId(
      applicationDetail?.certificateId,
      params.certificateId,
    );

    if (currentCertificateId) {
      return openDocumentByCertificateId(currentCertificateId);
    }

    if (!applicationId) {
      CustomMessage.error(t("myRequestsPage.messages.documentUnavailable"));
      return false;
    }

    const documentLicenseId =
      resolvedDocumentLicenseId ||
      (await resolveAndCacheDocumentLicenseId(true, "info"));

    if (!documentLicenseId) {
      return false;
    }

    return openDocumentByCertificateId(documentLicenseId);
  };

  const onViewDocument = () => {
    void openDocumentFromCurrentApplication();
  };

  const downloadReceiptByApplicationId = useCallback(
    async (targetApplicationId: number | string | null | undefined) => {
      const normalizedApplicationId = Number(targetApplicationId);

      if (
        !Number.isFinite(normalizedApplicationId) ||
        normalizedApplicationId <= 0
      ) {
        CustomMessage.error(t("myRequestsPage.messages.receiptUnavailable"));
        return;
      }

      setCommonLoading(true);
      try {
        const response = await getServiceApplicationPayment(
          normalizedApplicationId,
        );
        const latestPayment = unwrapServiceApplicationPayment(response);

        if (latestPayment) {
          setApplicationPayment(latestPayment);
        }

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
  const handleConfirmCancel = async () => {
    if (applicationId) {
      try {
        const response = await cancelApplication(applicationId);
        if (response && response.isSuccess) {
          CustomMessage.success(
            t("myRequestsPage.messages.applicationCancelled"),
          );
          getDetails();
        }
      } catch (error) {
        console.error("Failed to cancel application:", error);
        CustomMessage.error(t("myRequestsPage.messages.applicationCancelFailed"));
      }
    }
    setCancelModalShow(false);
  };

  const handleConfirmDelete = async () => {
    if (applicationId) {
      try {
        const response = await deleteApplication(applicationId);
        if (response && response.isSuccess) {
          CustomMessage.success(
            t("myRequestsPage.messages.applicationDeleted"),
          );
          history.push("/my-requests");
        }
      } catch (error) {
        console.error("Failed to delete application:", error);
        CustomMessage.error(t("myRequestsPage.messages.applicationDeleteFailed"));
      }
    }
    setDeleteModalShow(false);
  };
  const resolveServiceNameTitle = useCallback(
    async (
      detail: ApplicationDetailsResponse,
      currentApplicationId: number,
    ) => {
      const directServiceNameEn =
        detail.serviceNameEn || detail.serviceName || detail.nameEn || "";
      const directServiceNameAr = detail.serviceNameAr || detail.nameAr || "";

      if (directServiceNameEn || directServiceNameAr) {
        setDetailTitle({
          applicationId: currentApplicationId,
          serviceNameEn: directServiceNameEn,
          serviceNameAr: directServiceNameAr,
        });
        return;
      }

      const applicationNumber = detail.applicationNumber?.trim();

      if (!applicationNumber) {
        setDetailTitle({
          applicationId: currentApplicationId,
        });
        return;
      }

      try {
        const response = await getApplicationPage({
          pageSize: 10,
          pageIndex: 1,
          keyword: applicationNumber,
        });
        const items = response.data?.applicationPage?.items ?? [];
        const matchedItem = items.find(
          (item) =>
            item.id === currentApplicationId ||
            item.applicationNumber === applicationNumber,
        );

        setDetailTitle({
          applicationId: currentApplicationId,
          serviceNameEn: matchedItem?.serviceNameEn,
          serviceNameAr: matchedItem?.serviceNameAr,
        });
      } catch (error) {
        console.error("Failed to resolve detail service name:", error);
        setDetailTitle({
          applicationId: currentApplicationId,
        });
      }
    },
    [setDetailTitle],
  );

  const resolveApplicationPageTypeName = useCallback(
    async (
      detail: ApplicationDetailsResponse,
      currentApplicationId: number,
      detailRequestId: number,
    ) => {
      const applicationNumber = detail.applicationNumber?.trim();
      const hasServiceDepartment = isDetailServiceDepartmentResolved(
        detail.serviceDepartment,
      );

      if (!applicationNumber) {
        setApplicationPageType("");
        if (!hasServiceDepartment) {
          setDepartment(0);
          setIsDepartmentResolved(true);
        }
        return;
      }

      try {
        const response = await getApplicationPage({
          pageSize: 10,
          pageIndex: 1,
          keyword: applicationNumber,
        });
        const items = response.data?.applicationPage?.items ?? [];
        const matchedItem = items.find(
          (item) =>
            item.id === currentApplicationId ||
            item.applicationId === currentApplicationId ||
            item.applicationNumber === applicationNumber,
        );
        const typeNameItem = matchedItem || items[0];

        setApplicationPageType(
          getLocalizedText(
            typeNameItem?.typeNameEn,
            typeNameItem?.typeNameAr,
            typeNameItem?.type,
          ),
        );

        if (
          !hasServiceDepartment &&
          lifecycleRequestIdRef.current === detailRequestId
        ) {
          setDepartment(matchedItem?.serviceDepartment ?? 0);
          setIsDepartmentResolved(true);
        }
      } catch (error) {
        console.error("Failed to resolve application page type:", error);
        setApplicationPageType("");
        if (
          !hasServiceDepartment &&
          lifecycleRequestIdRef.current === detailRequestId
        ) {
          setDepartment(0);
          setIsDepartmentResolved(true);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!applicationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getDetails();
  }, [
    applicationId,
    ServicesStore.userInfo.servicesId,
    localizedPaymentTimelineFallback,
    formatPaymentTimeline,
  ]);

  function getDetails() {
    const feeRequestId = feeRequestIdRef.current + 1;
    feeRequestIdRef.current = feeRequestId;
    const lifecycleRequestId = lifecycleRequestIdRef.current + 1;
    lifecycleRequestIdRef.current = lifecycleRequestId;
    hasResolvedFormFeeRef.current = false;
    paymentFromCenterRef.current = false;
    setBookItemStatusCounts(createEmptyBookItemStatusCounts());
    setFormilyOption([]);
    setApplicationPayment(null);
    setDeliveryDetailState(null);
    setQuoteData(null);
    setQuoteError(null);
    setQuoteLoading(false);
    setLifecycleActivityContext(null);
    setLifecycleActivityError(false);
    setLifecycleActivityLoading(false);
    setPartnerManagementOwnerPartners([]);
    resetPenaltyPreview();
    setTotalAmount(0);
    setDetailServiceLookupConfig(EMPTY_DETAIL_SERVICE_LOOKUP_CONFIG);
    setApplicationPageType("");
    setIsDepartmentResolved(false);
    resetMyRequestDetail();
    setServiceDetailInfo({
      description: "",
      processTime: "-",
      paymentTimeline: localizedPaymentTimelineFallback,
    });
    const currentApplicationId = Number(applicationId);

    if (Number.isFinite(currentApplicationId)) {
      clearDetailTitle(currentApplicationId);
    }

    if (!Number.isFinite(currentApplicationId)) {
      setApplicationDetail(null);
      setDeliveryDetailState(null);
      return;
    }

    const loadPaymentCenterAmount = () => {
      if (!currentApplicationId) {
        return;
      }

      setQuoteLoading(true);
      getServiceApplicationPayment(currentApplicationId)
        .then((payRes) => {
          if (feeRequestIdRef.current !== feeRequestId) {
            return;
          }

          const p = unwrapServiceApplicationPayment(payRes);
          setQuoteData(mapServiceApplicationPaymentToFeeQuote(p));
          setQuoteError(null);

          if (p && typeof p === "object" && p.amount != null) {
            const amount = toFiniteNumber(p.amount);
            const deliveryFee = toFiniteNumber(
              p.deliveryFee ?? p.deliveryAmount,
            );
            const vatAmount = toFiniteNumber(p.vatAmount);
            const serviceFee = toFiniteNumber(p.serviceFee);
            const subTotal = toFiniteNumber(p.subTotal);
            const normalizedPayment = {
              ...p,
              amount,
              deliveryFee,
              deliveryAmount: deliveryFee,
              vatAmount,
              serviceFee,
              subTotal,
            };
            paymentFromCenterRef.current = true;
            hasResolvedFormFeeRef.current = true;
            setApplicationPayment(normalizedPayment);
            setDelivery(deliveryFee);
            if (p.serviceFee != null || p.subTotal != null) {
              setTotalAmount(p.serviceFee != null ? serviceFee : subTotal);
            } else {
              setTotalAmount(Math.max(0, amount - deliveryFee - vatAmount));
            }
          }
        })
        .catch((err: { response?: { status?: number }; message?: string }) => {
          if (feeRequestIdRef.current !== feeRequestId) {
            return;
          }

          if (err?.response?.status === 404) {
            setQuoteData(null);
            setQuoteError(null);
            return;
          }

          console.error("[getServiceApplicationPayment] failed:", err);
          setQuoteData(null);
          setQuoteError(t("FeeQuoteDisplay.unavailable"));
        })
        .finally(() => {
          if (feeRequestIdRef.current === feeRequestId) {
            setQuoteLoading(false);
          }
        });
    };

    getApplicationDetail(currentApplicationId)
      .then((res) => {
        if (lifecycleRequestIdRef.current !== lifecycleRequestId) {
          return;
        }

        if (res.data) {
          const detail = res.data;
          setDeliveryDetailState({
            applicationId: currentApplicationId,
            data: resolveApplicationDeliveryInformation(detail),
          });
          setIsFirstApprovalRejected(
            typeof detail.isFirstApprovalRejected === "boolean"
              ? detail.isFirstApprovalRejected
              : null,
          );
          setStatusEn(detail.statusEn ?? null);
          const detailServiceName = resolveServiceName(detail);
          const detailDescription = getLocalizedText(
            detail.serviceDescriptionEn,
            detail.serviceDescriptionAr,
          );
          const resolvedDetailServiceCode = String(
            detail.serviceCode ||
              ServicesStore.userInfo.servicesCode ||
              detail.serviceId ||
              "",
          ).trim();
          const lifecycleDetailServiceCode =
            detail.code?.trim() || resolvedDetailServiceCode;
          if (
            PARTNER_MANAGEMENT_SERVICE_CODES.has(lifecycleDetailServiceCode) &&
            currentApplicationId > 0
          ) {
            getApplicationPartnerManagementContext(
              currentApplicationId,
              lifecycleDetailServiceCode,
            )
              .then((partnerManagementResponse) => {
                if (lifecycleRequestIdRef.current !== lifecycleRequestId) {
                  return;
                }

                setPartnerManagementOwnerPartners(
                  resolvePartnerManagementContextValues(
                    partnerManagementResponse?.data,
                  ).ownerPartners,
                );
              })
              .catch((error) => {
                if (lifecycleRequestIdRef.current !== lifecycleRequestId) {
                  return;
                }

                console.error(
                  "Failed to load partner management context:",
                  error,
                );
                setPartnerManagementOwnerPartners([]);
              });
          }
          const detailStatusKey = resolveMyRequestStatus({
            statusId: detail.applicationStatusId,
            statusName: detail.statusEn || detail.statusAr,
          });
          const sourceApplicationId = Number(detail.sourceApplicationId ?? 0);
          const shouldLoadLifecyclePenaltyContext =
            !HIDE_PENALTY_STATUS_KEYS.has(detailStatusKey) &&
            isPenaltyEnabledRenewServiceCode(lifecycleDetailServiceCode) &&
            sourceApplicationId > 0;

          if (detailStatusKey === "draft") {
            const draftPaymentOrder =
              detail.amount != null
                ? {
                    applicationId: detail.applicationId,
                    serviceId: detail.serviceId ?? undefined,
                    amount: toFiniteNumber(detail.amount),
                    currencyCode: detail.currencyCode,
                    feeVersion: detail.feeVersion,
                    feeBreakdownJson: detail.feeBreakdownJson,
                    feeWarningsJson: detail.feeWarningsJson,
                    freeDecisionJson: detail.freeDecisionJson,
                    feeQuoteRawResponseJson: detail.feeQuoteRawResponseJson,
                    createdOn: detail.createdOn,
                    updatedOn: detail.updatedOn,
                  }
                : null;
            const draftPaymentSnapshot =
              mapServiceApplicationPaymentToFeeQuote(draftPaymentOrder);

            if (draftPaymentOrder && draftPaymentSnapshot) {
              hasResolvedFormFeeRef.current = true;
              setQuoteData(draftPaymentSnapshot);
              setApplicationPayment(draftPaymentOrder);
              setTotalAmount(draftPaymentOrder.amount);
            }
          } else {
            loadPaymentCenterAmount();
          }

          setApplicationDetail(detail);
          if (Number.isFinite(currentApplicationId)) {
            void resolveServiceNameTitle(detail, currentApplicationId);
            void resolveApplicationPageTypeName(
              detail,
              currentApplicationId,
              lifecycleRequestId,
            );
          }
          const parsedApplicationFormData = parseApplicationFormData(
            detail.formData,
          );
          const applyResolvedBookStatuses = (
            statusMap: BookApprovedStatusMap,
          ) => {
            if (lifecycleRequestIdRef.current !== lifecycleRequestId) {
              return;
            }

            const resolvedBookStatuses = resolveApplicationBookStatuses(
              parsedApplicationFormData,
              statusMap,
            );
            setBookItemStatusCounts(resolvedBookStatuses.counts);
            setFormilyOption(resolvedBookStatuses.formDataItems);
          };
          const bookIsbnList = collectApplicationBookIsbns(
            parsedApplicationFormData,
          );
          applyResolvedBookStatuses(new Map());

          if (
            detail.isFirstApprovalRejected !== true &&
            bookIsbnList.length > 0
          ) {
            getISBNstatus(bookIsbnList)
              .then((statusResponse) => {
                applyResolvedBookStatuses(
                  createBookApprovedStatusMap(statusResponse?.data),
                );
              })
              .catch((error) => {
                if (lifecycleRequestIdRef.current !== lifecycleRequestId) {
                  return;
                }

                console.error(
                  "Failed to load application book statuses:",
                  error,
                );
              });
          }
          if (isDetailServiceDepartmentResolved(detail.serviceDepartment)) {
            setDepartment(detail.serviceDepartment);
            setIsDepartmentResolved(true);
          } else {
            setDepartment(0);
          }

          if (detailServiceName) {
            ServicesStore.updateServicesName?.(detailServiceName);
          }

          if (detail.serviceId) {
            ServicesStore.updateServicesId?.(Number(detail.serviceId));
          }

          if (shouldLoadLifecyclePenaltyContext) {
            setLifecycleActivityLoading(true);
            setLifecycleActivityError(false);

            getApplicationLifecycleActivities(
              sourceApplicationId,
              lifecycleDetailServiceCode,
              detail.licensePermitNo,
            )
              .then((lifecycleResponse) => {
                if (lifecycleRequestIdRef.current !== lifecycleRequestId) {
                  return;
                }

                setLifecycleActivityContext(
                  (lifecycleResponse.data ||
                    null) as LifecycleActivityContext | null,
                );
              })
              .catch((error) => {
                if (lifecycleRequestIdRef.current !== lifecycleRequestId) {
                  return;
                }

                console.error(
                  "[Detail] Failed to load lifecycle penalty context:",
                  error,
                );
                setLifecycleActivityContext(null);
                setLifecycleActivityError(true);
              })
              .finally(() => {
                if (lifecycleRequestIdRef.current === lifecycleRequestId) {
                  setLifecycleActivityLoading(false);
                }
              });
          }

          const feeServiceId =
            detail.serviceId ?? ServicesStore.userInfo.servicesId;
          if (feeServiceId) {
            getServiceLearn(Number(feeServiceId))
              .then((serviceRes) => {
                if (feeRequestIdRef.current !== feeRequestId) {
                  return;
                }

                const serviceData = serviceRes.data as unknown as Record<
                  string,
                  unknown
                >;
                const serviceRecord = serviceData;
                const serviceName =
                  getLocalizedText(
                    serviceRecord.nameEn,
                    serviceRecord.nameAr,
                    serviceData.serviceName,
                    detailServiceName,
                  ) || detailServiceName;

                if (serviceName) {
                  ServicesStore.updateServicesName?.(serviceName);
                }

                setServiceDetailInfo({
                  description:
                    getLocalizedText(
                      serviceData.serviceDescriptionEn,
                      serviceData.serviceDescriptionAr,
                      detailDescription,
                    ),
                  processTime: resolveServiceDeliveryTime({
                    isArabic: i18n.language.startsWith("ar"),
                    serviceDeliveryTimeEn: serviceData.serviceDeliveryTimeEn,
                    serviceDeliveryTimeAr: serviceData.serviceDeliveryTimeAr,
                  }),
                  paymentTimeline: formatPaymentTimeline(
                    serviceRecord.paymentTimeline ??
                      serviceRecord.paymentTimelineDays ??
                      serviceRecord.paymentPeriod,
                      serviceRecord.paymentTimelineUnit ??
                      serviceRecord.paymentPeriodUnit ??
                      "Days",
                    localizedPaymentTimelineFallback,
                  ),
                });
              })
              .catch((err) => {
                console.error("[getServiceLearn] failed:", err);
                setServiceDetailInfo((prev) => ({
                  ...prev,
                  description: detailDescription || prev.description,
                }));
              });
          } else if (
            !hasResolvedFormFeeRef.current &&
            !paymentFromCenterRef.current
          ) {
            setTotalAmount(0);
          }
          const accountTypeCheck =
            userInfo.userInvitation &&
            userInfo.userInvitation.userProfileId === currentProfileId &&
            currentProfileId;

          setIsIndividualAccount(!!accountTypeCheck);

          if (accountTypeCheck) {
            // Individual account: call GetUserIndividualByProfileId API
            getUserIndividualByProfileId(currentProfileId)
              .then((profileRes) => {
                setProfileInfoIndex(
                  profileRes.data as Record<string, unknown> | null,
                );
              })
              .catch((error) => {
                console.error("Failed to get individual profile:", error);
              });
          } else {
            // Establishment account: call GetUserEstablishmentByUserProfileID API
            GetUserEstablishmentByUserProfileID()
              .then((profileRes) => {
                setProfileInfoIndex(
                  profileRes.data as Record<string, unknown> | null,
                );
              })
              .catch((error) => {
                console.error("Failed to get establishment profile:", error);
              });
          }
        } else if (Number.isFinite(currentApplicationId)) {
          setDeliveryDetailState(null);
          resetMyRequestDetail();
          setDetailTitle({
            applicationId: currentApplicationId,
          });
        }
      })
      .catch((error) => {
        if (lifecycleRequestIdRef.current !== lifecycleRequestId) {
          return;
        }

        console.error("[getApplicationDetail] failed:", error);
        resetMyRequestDetail();
        setApplicationDetail(null);
        setDeliveryDetailState(null);
        setPartnerManagementOwnerPartners([]);
      })
      .finally(() => {
        if (lifecycleRequestIdRef.current === lifecycleRequestId) {
          setLoading(false);
        }
      });

  }
  function clearPaymentDetailRefreshTimer() {
    if (paymentDetailRefreshTimerRef.current !== null) {
      window.clearTimeout(paymentDetailRefreshTimerRef.current);
      paymentDetailRefreshTimerRef.current = null;
    }
  }

  function refreshDetailsAfterSuccessfulPayment() {
    getDetails();
    clearPaymentDetailRefreshTimer();
    paymentDetailRefreshTimerRef.current = window.setTimeout(() => {
      paymentDetailRefreshTimerRef.current = null;
      getDetails();
    }, 1500);
  }

  useEffect(() => {
    const searchParams = urlParsing(location.search);
    const nextApplicationId = Number(searchParams.id);
    const servicesStore = useServicesStore.getState();

    if (
      !Number.isFinite(nextApplicationId) ||
      servicesStore.userInfo.applicationId !== nextApplicationId
    ) {
      servicesStore.updateServicesName?.("");
    }

    servicesStore.updateApplicationId?.(
      Number.isFinite(nextApplicationId) ? nextApplicationId : 0,
    );

    // CP-012 / CP-013 deep links defer this until the profile is calibrated so
    // the detail is never fetched under a different identity.
    if (deepLinkProfileId) {
      return;
    }

    setApplicationId(
      Number.isFinite(nextApplicationId) ? nextApplicationId : null,
    );
  }, [location.search]);

  useEffect(() => {
    if (!deepLinkProfileId || deepLinkProfileCalibrationRef.current) {
      return undefined;
    }

    const nextApplicationId = Number(urlParsing(location.search).id);
    if (!Number.isFinite(nextApplicationId) || nextApplicationId <= 0) {
      return undefined;
    }

    // Wait for the persisted identity to rehydrate, otherwise the target
    // profile cannot be resolved against the profile inventory.
    if (!currentProfileId) {
      return undefined;
    }

    deepLinkProfileCalibrationRef.current = true;
    let cancelled = false;
    const profileIdBeforeSwitch = String(currentProfileId ?? "").trim();

    void (async () => {
      const profileConfirmed = await ensureProfileAction({
        profileId: deepLinkProfileId,
      });

      if (cancelled) {
        return;
      }

      if (!profileConfirmed) {
        CustomMessage.warning(t("myRequestsPage.messages.switchProfileToView"));
        return;
      }

      // Switching identity swaps the auth token, so this already-mounted page
      // would keep requesting under the previous profile. Reload the detail URL
      // with the deep-link profileId dropped: the active identity already
      // matches it, so the reloaded page skips this calibration entirely.
      const profileIdAfterSwitch = String(
        useUserStore.getState().currentProfileId ?? "",
      ).trim();

      if (profileIdAfterSwitch !== profileIdBeforeSwitch) {
        const reloadUrl = new URL(window.location.href);
        reloadUrl.searchParams.delete("profileId");
        window.location.replace(
          `${reloadUrl.pathname}${reloadUrl.search}${reloadUrl.hash}`,
        );
        return;
      }

      setApplicationId(nextApplicationId);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentProfileId,
    deepLinkProfileId,
    ensureProfileAction,
    location.search,
    t,
  ]);

  useEffect(() => {
    clearPaymentDetailRefreshTimer();
    setResolvedDocumentLicenseId(null);
    setResolvingDocumentLicenseId(false);
    documentLicenseLookupRef.current = null;
  }, [applicationId]);

  useEffect(() => {
    return () => {
      clearPaymentDetailRefreshTimer();
    };
  }, []);

  useEffect(() => {
    const unlisten = history.listen((nextLocation) => {
      if (nextLocation.pathname !== "/my-requests/detail") {
        resetMyRequestDetail();
      }
    });

    return unlisten;
  }, [history, resetMyRequestDetail]);

  useEffect(() => {
    if (cardPaymentStatus !== "success" || resolvedDocumentLicenseId) {
      return;
    }

    if (!applicationDetail?.certificateId && !documentLicenseLookupKey) {
      return;
    }

    void resolveAndCacheDocumentLicenseId(false);
  }, [
    applicationDetail?.certificateId,
    cardPaymentStatus,
    documentLicenseLookupKey,
    resolvedDocumentLicenseId,
    resolveAndCacheDocumentLicenseId,
  ]);

  const formatDateTime = (dateString: string | null): string => {
    // Backend sends Dubai wall-clock — format without browser-TZ shifting.
    return fmt(dateString, "DD/MM/YYYY HH:mm:ss");
  };

  const getApplicationTimelineItems = (): ApplicationTimelineItem[] => {
    return getMyRequestTimelineStages({
      ...detailStatusInput,
      overridePendingPaymentAsUnderReview:
        shouldTreatPendingPaymentAsUnderReview,
      forcePaymentFirstTimelineFlow: shouldUsePaymentFirstTimelineFlow,
    }).map((stage) => ({
      key: stage.key,
      label: t(`myRequestsPage.detail.timeline.stages.${stage.key}`),
      state: stage.state,
    }));
  };
  const handleTotalFeeChange = (fee: number) => {
    if (paymentFromCenterRef.current) {
      return;
    }
    hasResolvedFormFeeRef.current = true;
    setTotalAmount(fee || 0);
  };

  const getStatusText = (): string => {
    if (!applicationDetail) return "-";
    const currentLang = localStorage.getItem("language") || "en";
    const status =
      currentLang.startsWith("ar")
        ? applicationDetail.statusAr || applicationDetail.statusEn || ""
        : applicationDetail.statusEn || applicationDetail.statusAr || "";
    return status || "-";
  };

  // Payment handlers
  const handlePayNow = async () => {
    if (isPaymentBlockedByPenalty) {
      CustomMessage.warning(
        t(
          effectivePenaltyLoading
            ? "myRequestsPage.detail.penaltyCalculationPending"
            : "myRequestsPage.detail.penaltyDetailsUnavailable",
        ),
      );
      return;
    }

    const currentApplicationId = Number(applicationId);
    if (!Number.isFinite(currentApplicationId) || currentApplicationId <= 0) {
      return;
    }

    try {
      const latestDetailResponse = await getApplicationDetail(
        currentApplicationId,
      );
      const latestDetail = latestDetailResponse.data;
      const latestStatusKey = resolveMyRequestStatus({
        statusId: latestDetail?.applicationStatusId,
        statusName: latestDetail?.statusEn || latestDetail?.statusAr,
      });

      if (!latestDetail || latestStatusKey !== "pendingPayment") {
        getDetails();
        CustomMessage.error(
          t("myRequestsPage.cardPayment.messages.notReady"),
        );
        return;
      }

      setApplicationDetail(latestDetail);
    } catch (error) {
      console.error("Failed to refresh application before payment:", error);
      CustomMessage.error(t("myRequestsPage.cardPayment.messages.notReady"));
      return;
    }

    setPaymentMethodModalVisible(true);
  };

  useEffect(() => {
    if (!applicationDetail || autoPayNowTriggeredRef.current) {
      return undefined;
    }

    const searchParams = new URLSearchParams(location.search);
    const requestedAction = searchParams.get("action");

    if (
      requestedAction !== "payNow" ||
      detailEffectiveStatusKey !== "pendingPayment" ||
      Department === 2 ||
      isPaymentBlockedByPenalty
    ) {
      return undefined;
    }

    autoPayNowTriggeredRef.current = true;
    let cancelled = false;

    void (async () => {
      // CP-013: never enter payment before the identity matches the profile
      // that owns the application.
      const profileConfirmed = await ensureProfileAction(
        profileActionTarget || {},
      );

      if (cancelled || !profileConfirmed) {
        return;
      }

      await handlePayNow();

      if (cancelled) {
        return;
      }

      searchParams.delete("action");
      const nextSearch = searchParams.toString();
      history.replace(
        `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [
    Department,
    applicationDetail,
    detailEffectiveStatusKey,
    ensureProfileAction,
    history,
    isPaymentBlockedByPenalty,
    location.pathname,
    location.search,
    profileActionTarget,
  ]);

  const handlePaymentMethodModalClose = () => {
    if (paymentMethodProceedInFlightRef.current) {
      return;
    }
    setPaymentMethodModalVisible(false);
  };

  const handlePaymentMethodProceed = async () => {
    if (paymentMethodProceedInFlightRef.current || cardPaymentLoading) {
      return;
    }

    const paymentWindow = window.open("", "_blank");
    if (!paymentWindow) {
      CustomMessage.error(
        <span className="custom-message__text--error">
          {t("myRequestsPage.cardPayment.messages.popupBlocked")}
        </span>,
      );
      return;
    }
    paymentWindow.opener = null;

    paymentMethodProceedInFlightRef.current = true;
    setPaymentMethodProceedLoading(true);
    const currentApplicationId = Number(applicationId);
    let paymentWindowTransferred = false;
    try {
      const latestDetailResponse = await getApplicationDetail(
        currentApplicationId,
      );
      const latestDetail = latestDetailResponse.data;
      const latestStatusKey = resolveMyRequestStatus({
        statusId: latestDetail?.applicationStatusId,
        statusName: latestDetail?.statusEn || latestDetail?.statusAr,
      });

      if (!latestDetail || latestStatusKey !== "pendingPayment") {
        setPaymentMethodModalVisible(false);
        getDetails();
        CustomMessage.error(
          t("myRequestsPage.cardPayment.messages.notReady"),
        );
        return;
      }

      setApplicationDetail(latestDetail);
      paymentWindowTransferred = true;
      await handleCardPaymentPurchase({
        applicationId: currentApplicationId,
        applicationDetail: latestDetail,
        refreshDetails: getDetails,
        paymentWindow,
      });
    } catch (error) {
      console.error("Failed to validate application before payment:", error);
      CustomMessage.error(t("myRequestsPage.cardPayment.messages.notReady"));
    } finally {
      if (!paymentWindowTransferred && !paymentWindow.closed) {
        paymentWindow.close();
      }
      paymentMethodProceedInFlightRef.current = false;
      setPaymentMethodProceedLoading(false);
      setPaymentMethodModalVisible(false);
    }
  };

  const handleCardPaymentUseDifferentMethod = () => {
    resetCardPaymentFlow();
  };

  const handleCardPaymentDownloadReceipt = () => {
    void downloadReceiptByApplicationId(applicationId);
  };

  const handleCardPaymentViewDocument = async () => {
    if (resolvingDocumentLicenseId) {
      return;
    }

    const documentLicenseId =
      resolvedDocumentLicenseId ||
      (await resolveAndCacheDocumentLicenseId(true, "info"));

    if (!documentLicenseId) {
      return;
    }

    void openDocumentByCertificateId(documentLicenseId, {
      messageType: "info",
    });
  };

  // Payment success handlers
  const handlePaymentSuccessClose = () => {
    setPaymentSuccessVisible(false);
  };

  const handlePaymentRatingSubmit = useCallback(
    async (rating: number) => {
      const referenceNo = String(
        applicationDetail?.applicationId ?? applicationId ?? "",
      ).trim();

      if (!rating || !referenceNo) {
        CustomMessage.error(t("complaintsPage.addModal.commentFailed"));
        return false;
      }

      try {
        await postUserServiceRating({
          rating,
          referenceNo,
          isAnonymous: true,
          sourcePage: "MyRequests",
        });
        CustomMessage.success(t("complaintsPage.addModal.commentSuccess"));
        return true;
      } catch {
        CustomMessage.error(t("complaintsPage.addModal.commentFailed"));
        return false;
      }
    },
    [applicationDetail?.applicationId, applicationId, t],
  );

  const handleDownloadReceipt = () => {
    void downloadReceiptByApplicationId(applicationId);
  };

  const handleViewDocument = () => {
    setPaymentSuccessVisible(false);
    refreshDetailsAfterSuccessfulPayment();
    onViewDocument();
  };

  // Payment success page handlers
  const handleBackToDetail = () => {
    setShowPaymentSuccessPage(false);
  };

  const handleSuccessPageDownloadReceipt = () => {
    void downloadReceiptByApplicationId(applicationId);
  };

  const handleSuccessPageViewDocument = () => {
    setShowPaymentSuccessPage(false);
    refreshDetailsAfterSuccessfulPayment();
    onViewDocument();
  };

  const handleEditApplication = async () => {
    if (!applicationDetail?.applicationId || !applicationDetail?.serviceId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationEditUnavailable"),
      );
      return;
    }

    const profileConfirmed = await ensureProfileAction(profileActionTarget || {});
    if (!profileConfirmed) {
      return;
    }

    const resolvedServiceCode = detailFormServiceCode || "";
    ServicesStore.updateServicesCode?.(resolvedServiceCode);
    ServicesStore.updateServicesId?.(Number(applicationDetail.serviceId));
    history.push(
      createServiceApplicationActionPath({
        serviceId: Number(applicationDetail.serviceId),
        action: "edit",
        serviceCode: resolvedServiceCode,
        applicationId: applicationDetail.applicationId,
        applicationStatusId: applicationDetail.applicationStatusId,
        includeServiceEntryGate: true,
        sourceSearch: location.search,
      }),
    );
  };

  const handleDuplicateApplication = async () => {
    if (!applicationDetail?.applicationId || !applicationDetail?.serviceId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationDuplicateUnavailable"),
      );
      return;
    }

    const profileConfirmed = await ensureProfileAction(profileActionTarget || {});
    if (!profileConfirmed) {
      return;
    }

    ServicesStore.updateServicesCode?.(applicationDetail.serviceCode || "");
    ServicesStore.updateServicesId?.(Number(applicationDetail.serviceId));
    window.localStorage.setItem(
      "duplicateRecord",
      JSON.stringify({
        ...applicationDetail,
        id: applicationDetail.applicationId,
      }),
    );
    history.push(
      createServiceApplicationActionPath({
        serviceId: Number(applicationDetail.serviceId),
        action: "Duplicate",
        serviceCode: applicationDetail.serviceCode,
        applicationId: applicationDetail.applicationId,
        applicationStatusId: applicationDetail.applicationStatusId,
        includeServiceEntryGate: true,
        sourceSearch: location.search,
      }),
    );
  };

  const handleDetailDownloadReceipt = () => {
    void downloadReceiptByApplicationId(applicationDetail?.applicationId);
  };

  const clearRequestedDetailAction = useCallback(
    (actionName?: string) => {
      const searchParams = new URLSearchParams(location.search);
      const currentAction = searchParams.get("action");

      if (!currentAction) {
        return;
      }

      if (actionName && currentAction !== actionName) {
        return;
      }

      searchParams.delete("action");
      const nextSearch = searchParams.toString();
      history.replace(
        `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
      );
    },
    [history, location.pathname, location.search],
  );

  const resetSubmitProofState = useCallback(() => {
    setSubmitProofMethod(undefined);
    setSubmitProofFiles([]);
    setSubmitProofNotes("");
    setSubmitProofSubmitting(false);
  }, []);

  const handleSubmitProof = () => {
    setSubmitProofModalVisible(true);
  };

  const closeSubmitProofModal = () => {
    if (submitProofSubmitting) {
      return;
    }

    setSubmitProofModalVisible(false);
    resetSubmitProofState();
    clearRequestedDetailAction("submitProof");
  };

  const handleSubmitProofUpload = async (
    options: UploadRequestOption<string>,
  ) => {
    if (!options) {
      return;
    }

    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append("files", file);

    try {
      const response = await fileUpload(formData);
      const uploadedFileName = response.data?.[0];

      if (!uploadedFileName) {
        throw new Error("Upload failed");
      }

      onSuccess?.(uploadedFileName);
      CustomMessage.success(
        t("myRequestsPage.detail.submitProofModal.uploadSuccess"),
      );
    } catch (error) {
      console.error("Failed to upload disposition proof attachment:", error);
      onError?.(error as UploadRequestError);
      CustomMessage.error(
        getErrorMessage(
          error,
          t("myRequestsPage.detail.submitProofModal.uploadFailed"),
        ),
      );
    }
  };

  const handleSubmitProofConfirm = async () => {
    const targetApplicationId = Number(
      applicationDetail?.applicationId ?? applicationId,
    );

    if (!targetApplicationId || Number.isNaN(targetApplicationId)) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationDetailUnavailable"),
      );
      return;
    }

    if (!submitProofMethod) {
      CustomMessage.error(
        t("myRequestsPage.detail.submitProofModal.validation.selectMethod"),
      );
      return;
    }

    const supportingDocuments = uploadedSubmitProofFileNames;

    if (supportingDocuments.length === 0) {
      CustomMessage.error(
        t("myRequestsPage.detail.submitProofModal.validation.uploadRequired"),
      );
      return;
    }

    setSubmitProofSubmitting(true);
    try {
      await saveSubmitDispositionProof({
        applicationId,
        method: submitProofMethod,
        supportingDocuments,
        notes: submitProofNotes.trim() || undefined,
      });
      // await submitDispositionSubmission(targetApplicationId, {
      //   method: submitProofMethod,
      //   supportingDocuments,
      //   notes: submitProofNotes.trim() || undefined,
      // });

      CustomMessage.success(
        t("myRequestsPage.detail.submitProofModal.submitSuccess"),
      );
      setSubmitProofModalVisible(false);
      resetSubmitProofState();
      clearRequestedDetailAction("submitProof");
      getDetails();
    } catch (error) {
      console.error("Failed to submit disposition proof:", error);
      CustomMessage.error(
        getErrorMessage(
          error,
          t("myRequestsPage.detail.submitProofModal.submitFailed"),
        ),
      );
    } finally {
      setSubmitProofSubmitting(false);
    }
  };

  useEffect(() => {
    if (!applicationDetail) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const requestedAction = searchParams.get("action");
    const statusKey = resolveMyRequestStatus({
      statusId: applicationDetail.applicationStatusId,
      statusName: applicationDetail.statusEn || applicationDetail.statusAr,
    });

    if (
      requestedAction === "submitProof" &&
      statusKey === "pendingDisposition"
    ) {
      handleSubmitProof();
      clearRequestedDetailAction("submitProof");
    }
  }, [applicationDetail, clearRequestedDetailAction, location.search]);

  const runDetailAction = (actionKey: MyRequestActionKey) => {
    switch (actionKey) {
      case "edit":
        void handleEditApplication();
        break;
      case "cancel":
        setCancelModalShow(true);
        break;
      case "delete":
        setDeleteModalShow(true);
        break;
      case "payNow":
        void handlePayNow();
        break;
      case "viewDocument":
        onViewDocument();
        break;
      case "downloadReceipt":
        handleDetailDownloadReceipt();
        break;
      case "duplicate":
        void handleDuplicateApplication();
        break;
      case "submitProof":
        handleSubmitProof();
        break;
      default:
        break;
    }
  };

  const applicationInfo = {
    applicationNumber: applicationDetail?.applicationNumber || "-",
    status: getStatusText(),
    type:
      resolveApplicationType(applicationDetail) ||
      applicationPageType ||
      getLocalizedText(
        getSearchParamText(location.search, "typeNameEn"),
        getSearchParamText(location.search, "typeNameAr"),
      ) ||
      "-",
    submissionTime: formatDateTime(applicationDetail?.createdOn || null),
    lastUpdated: formatDateTime(applicationDetail?.lastUpdateTime || null),
  };

  const summaryItems: SummaryItem[] = [
    {
      label: t("myRequestsPage.detail.summaryApplicationNumber"),
      value: applicationInfo.applicationNumber,
      icon: FileIcon,
    },
    {
      label: t("myRequestsPage.detail.summaryStatus"),
      value: (
        <CustomStatusTag
          type="myRequest"
          status={applicationDetail?.applicationStatusId ?? ""}
          myRequestStatusKey={detailEffectiveStatusKey}
          myRequestStatusNameEn={applicationDetail?.statusEn}
          myRequestStatusNameAr={applicationDetail?.statusAr}
        />
      ),
      icon: ClockIcon,
    },
    {
      label: t("myRequestsPage.detail.summaryType"),
      value: applicationInfo.type,
      icon: TypeIcon,
    },
    {
      label: t("myRequestsPage.detail.summarySubmissionTime"),
      value: applicationInfo.submissionTime,
      icon: StatusIcon,
    },
    {
      label: t("myRequestsPage.detail.summaryLastUpdated"),
      value: applicationInfo.lastUpdated,
      icon: LastUpdatedIcon,
    },
  ];
  const shouldShowApplicationTimeline =
    isDepartmentResolved && detailEffectiveStatusKey !== "draft";
  const applicationTimelineItems = shouldShowApplicationTimeline
    ? getApplicationTimelineItems()
    : [];
  const reviewAttachmentItems = useMemo<ReviewAttachmentItem[]>(() => {
    const reasonFiles = applicationDetail?.approvalRecord?.reasonFiles;
    if (!Array.isArray(reasonFiles)) {
      return [];
    }

    return reasonFiles.reduce<ReviewAttachmentItem[]>((result, file) => {
      const normalizedUrl = getTrimmedText(file);
      if (!normalizedUrl) {
        return result;
      }

      const nextIndex = result.length + 1;
      const fallbackName = t("myRequestsPage.detail.reviewResult.attachmentLabel", {
        index: nextIndex,
      });
      const fileName = getReviewAttachmentFileName(normalizedUrl) || fallbackName;

      result.push({
        name: fileName,
        url: normalizedUrl,
        fileType: getReviewAttachmentFileType(fileName),
      });

      return result;
    }, []);
  }, [applicationDetail?.approvalRecord?.reasonFiles, t]);
  const hasReviewAttachments = reviewAttachmentItems.length > 0;
  const isReviewAttachmentRtl = Boolean(i18n.language?.startsWith("ar"));

  if (loading) {
    return (
      <div className="my-requests-detail">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" tip={t("myRequestsPage.detail.loading")} />
        </div>
      </div>
    );
  }

  if (cardPaymentStatus === "success") {
    return (
      <div className="my-requests-detail">
        <CardPaymentSuccessPage
          applicationNumber={cardPaymentDocumentNumber}
          isContentService={isContentService}
          onDownloadReceipt={handleCardPaymentDownloadReceipt}
          onViewDocument={handleCardPaymentViewDocument}
          onSubmitRating={handlePaymentRatingSubmit}
          viewDocumentLoading={resolvingDocumentLicenseId}
          viewDocumentDisabled={resolvingDocumentLicenseId}
        />
        <DocumentDown
          visible={documnetVisible}
          cancle={() => setDocumnetVisible(false)}
          url={pdfData?.certificateUrl || ""}
          password={pdfData?.pdfPassword || ""}
          fileName={pdfData?.name || ""}
          title={t("myRequestsPage.documentModal.title")}
          subtitle={t("myRequestsPage.documentModal.subtitle")}
          noteTitle={t("myRequestsPage.documentModal.noteTitle")}
          noteText={t("myRequestsPage.documentModal.noteText")}
          passwordLabel={t("myRequestsPage.documentModal.passwordLabel")}
          copyButtonText={t("myRequestsPage.documentModal.copyRedirect")}
        />
      </div>
    );
  }

  if (cardPaymentStatus === "failed" || cardPaymentStatus === "cancelled") {
    return (
      <div className="my-requests-detail">
        <CardPaymentFailurePage
          status={cardPaymentStatus}
          message={cardPaymentResultMessage}
          details={cardPaymentFailureDetails}
          onPrimaryAction={handleCardPaymentTryAgain}
          onSecondaryAction={handleCardPaymentUseDifferentMethod}
        />
      </div>
    );
  }

  // Show payment success page if payment is successful
  if (showPaymentSuccessPage) {
    return (
      <PaymentSuccessPage
        documentNumber={paySuccessDetails}
        onDownloadReceipt={handleSuccessPageDownloadReceipt}
        onViewDocument={handleSuccessPageViewDocument}
        onBackToDetail={handleBackToDetail}
      />
    );
  }

  const detailActions = isDepartmentResolved
    ? getMyRequestDetailActions({
        ...detailStatusInput,
        isContentService,
        overridePendingPaymentAsUnderReview:
          shouldTreatPendingPaymentAsUnderReview,
      }).map(localizeActionConfig)
    : [];
  const showReviewResult = applicationDetail?.applicationStatusId === 106 && applicationDetail?.approvalRecord!=null;
  const isPendingDisposition =
    applicationDetail?.applicationStatusId === 108;
  const showFirstApprovalRejectedResult =
    applicationDetail?.isFirstApprovalRejected === true;
  const hasNoDispositionSubmissions =
    applicationDetail?.dispositionRecord == null ||
    !Array.isArray(applicationDetail.dispositionRecord.submissions) ||
    applicationDetail.dispositionRecord.submissions.length === 0;
  const dispositionSubmissions = Array.isArray(
    applicationDetail?.dispositionRecord?.submissions,
  )
    ? applicationDetail.dispositionRecord.submissions
    : [];
  const lastDispositionSubmission =
    dispositionSubmissions[dispositionSubmissions.length - 1];
  const rejectedDispositionSubmission =
    typeof lastDispositionSubmission === "object" &&
    lastDispositionSubmission !== null &&
    lastDispositionSubmission.reviewResult === "Rejected"
      ? lastDispositionSubmission
      : null;
  const isLastDispositionSubmissionRejected =
    rejectedDispositionSubmission !== null;
  const showDispositionProofRejectedResult =
    isPendingDisposition &&
    showFirstApprovalRejectedResult &&
    isLastDispositionSubmissionRejected;
  const showInitialFirstApprovalRejectedResult =
    isPendingDisposition &&
    showFirstApprovalRejectedResult &&
    hasNoDispositionSubmissions;
  const dispositionProofReviewerComment =
    typeof lastDispositionSubmission?.reviewerComment === "string"
      ? lastDispositionSubmission.reviewerComment.trim()
      : "";
  const showConditionalApprovalResult =
    isPendingDisposition &&
    applicationDetail?.isFirstApprovalRejected === false &&
    bookItemStatusCounts.rejected > 0;
  const showReviewRequiredMaterials =
    bookItemStatusCounts.reviewRequired > 0;
  const rejectedBookCountDisplay =
    bookItemStatusCounts.rejected > 0 ? bookItemStatusCounts.rejected : "N";
  const reviewRequiredBookCountDisplay =
    bookItemStatusCounts.reviewRequired > 0
      ? bookItemStatusCounts.reviewRequired
      : "N";
  const approvedBookCountDisplay =
    bookItemStatusCounts.approved > 0 ? bookItemStatusCounts.approved : "N";
  const reviewReason = applicationDetail?.approvalRecord?.reason || "-";
  const reviewNotes = applicationDetail?.approvalRecord?.notes || "-";

  return (
    <div className="my-requests-detail">
      {applicationDetail?.applicationStatusId === 104 && (
        <RequestModification
          RequestDetail={applicationDetail as RequestDetailProps}
        />
      )}

      {showReviewResult && (
        <div className="review-result-banner">
          <div className="review-result-banner_content">
            {" "}
            <img
              className="review-result-banner__icon"
              src={DetailsReject}
              alt=""
            />
            <div className="review-result-banner__content">
              <div className="review-result-banner__reason">{reviewReason}</div>
              <div className="review-result-banner__notes">{reviewNotes}</div>
            </div>
          </div>

          {hasReviewAttachments ? (
            <button
              type="button"
              className="review-result-banner__attachments"
              onClick={() => setReviewAttachmentModalVisible(true)}
            >
              {t("myRequestsPage.detail.reviewResult.attachmentsButton")}
            </button>
          ) : null}
        </div>
      )}
      {showInitialFirstApprovalRejectedResult && (
        <div className="review-result-banner review-result-banner--first-approval-rejected">
          <div className="review-result-banner_content">
            <img
              className="review-result-banner__icon"
              src={DetailsReject}
              alt=""
            />
            <div className="review-result-banner__content">
              <div className="review-result-banner__title">
                {t(
                  "myRequestsPage.detail.reviewResult.firstApprovalRejected.title",
                )}
              </div>
              <div className="review-result-banner__description">
                {t(
                  "myRequestsPage.detail.reviewResult.firstApprovalRejected.description",
                  { bookCount: applicationBookCount },
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showDispositionProofRejectedResult && (
        <div className="review-result-banner review-result-banner--first-approval-rejected">
          <div className="review-result-banner_content">
            <img
              className="review-result-banner__icon"
              src={DetailsReject}
              alt=""
            />
            <div className="review-result-banner__content">
              <div className="review-result-banner__title">
                {t(
                  "myRequestsPage.detail.reviewResult.firstApprovalRejected.proofRejected.title",
                )}
              </div>
              <div className="review-result-banner__description">
                {dispositionProofReviewerComment ||
                  t(
                    "myRequestsPage.detail.reviewResult.firstApprovalRejected.proofRejected.defaultDescription",
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showConditionalApprovalResult && (
        <div className="review-result-banner review-result-banner--first-approval-rejected">
          <div className="review-result-banner_content">
            <img
              className="review-result-banner__icon"
              src={DetailsReject}
              alt=""
            />
            <div className="review-result-banner__content">
              <div className="review-result-banner__title">
                {t(
                  "myRequestsPage.detail.reviewResult.firstApprovalRejected.title",
                )}
              </div>
              <div className="review-result-banner__description">
                <ul className="review-result-banner__description-list">
                  <li>
                    {t(
                      "myRequestsPage.detail.reviewResult.firstApprovalRejected.conditionalApproval.rejectedMaterials",
                      { rejectedCount: rejectedBookCountDisplay },
                    )}
                  </li>
                  {showReviewRequiredMaterials ? (
                    <li>
                      {t(
                        "myRequestsPage.detail.reviewResult.firstApprovalRejected.conditionalApproval.reviewRequiredMaterials",
                        {
                          reviewRequiredCount:
                            reviewRequiredBookCountDisplay,
                        },
                      )}
                    </li>
                  ) : null}
                  <li>
                    {t(
                      "myRequestsPage.detail.reviewResult.firstApprovalRejected.conditionalApproval.approvedMaterials",
                      { approvedCount: approvedBookCountDisplay },
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="summary-panel">
        {summaryItems.map((item) => (
          <div className="summary-item" key={item.label}>
            <div className="summary-icon">
              <img src={item.icon} alt="" />
            </div>
            <div className="summary-content">
              <div className="summary-label">{item.label}</div>
              <div className="summary-value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="my-requests-box">
        <div className="my-requests-left">
          {detailModifyChangeSections.length > 0 ||
          detailModifyLanguageSnapshots.length > 0 ? (
            <div className="section-card">
              <ModifyChangeSummary
                sections={detailModifyChangeSections}
                languageSnapshots={detailModifyLanguageSnapshots}
                serviceCode={detailFormServiceCode}
              />
            </div>
          ) : null}
          <div className="section-card">
            <FormilyReviewList
              formilyList={visibleFormilyOption}
              formilyData={visibleFormilyOption}
              onSelectTableOptionsChange={handleTotalFeeChange}
              isSelectable={false}
              serviceCode={detailFormServiceCode}
              defaultExpandFirst={detailEffectiveStatusKey === "draft"}
              bookStatusLookupHandledExternally
              service905OwnerPartners={partnerManagementOwnerPartners}
              idSelectorRuntimeType={detailIdSelectorRuntimeType}
              hideBookListStatusColumn={
                showFirstApprovalRejectedResult ||
                (typeof applicationDetail?.applicationStatusId === "number" &&
                  HIDE_BOOK_LIST_STATUS_IDS.includes(
                    applicationDetail.applicationStatusId,
                  ))
              }
            />
          </div>
          {Boolean(quoteData?.totalAmount) && (
            <FeeQuoteDisplay
              quoteData={quoteData}
              quoteLoading={quoteLoading}
              quoteError={quoteError}
            />
          )}
          {isIndividualAccount ? (
            <ReviewPersonalInformation
              ProfileInfoIndex={ProfileInfoIndex as never}
              expanded={profileInfoExpanded}
              onToggle={() => setProfileInfoExpanded(!profileInfoExpanded)}
            />
          ) : (
            <ReviewProfileInfo
              ProfileInfoIndex={ProfileInfoIndex as never}
              expanded={profileInfoExpanded}
              onToggle={() => setProfileInfoExpanded(!profileInfoExpanded)}
            />
          )}
          {rejectedDispositionSubmission ? (
            <DispositionMethodDetails
              submission={rejectedDispositionSubmission}
              methodOptions={dispositionMethodOptions}
            />
          ) : null}

          {shouldShowPenaltyDisplay ? (
            <PenaltyDisplay
              penaltyData={penaltyData}
              penaltyLoading={effectivePenaltyLoading}
              penaltyError={resolvedPenaltyError}
              missingPenaltyContext={isPenaltyContextMissing}
            />
          ) : null}
        </div>
        <div className="my-requests-right">
          {shouldShowApplicationTimeline ? (
            <ApplicationTimeline items={applicationTimelineItems} />
          ) : null}
          {deliveryDetail ? (
            <DeliveryInformation
              values={EMPTY_DELIVERY_INFORMATION_VALUES}
              errors={EMPTY_DELIVERY_ERRORS}
              emirates={[]}
              regions={[]}
              areas={[]}
              courierOptions={[]}
              loadingAddress={false}
              loadingCourierOptions={false}
              readOnly
              readOnlyLabels={deliveryReadOnlyLabels}
              onFieldChange={() => undefined}
            />
          ) : null}
          <ServiceDetails
            TotalAmount={
              paymentSummaryDisplay.total == null ? null : paymentAmount
            }
            fullDescription={
              serviceDetailInfo.description ||
              t("myRequestsPage.detail.serviceDescriptionUnavailable")
            }
            ProcessTime={serviceDetailInfo.processTime}
            PaymentTimeline={serviceDetailInfo.paymentTimeline}
            moreMode="link"
          />
        </div>
      </div>

      <ActionFooter
        onBack={() => {
          history.push("/my-requests");
        }}
        actions={
          isDepartmentResolved ? (
            <div className="action-buttons">
              {detailActions
                .filter(
                  (a) => !(detailActions.length >= 3 && a.key === "duplicate"),
                )
                .map((actionItem) => (
                  <CustomButton
                    key={actionItem.key}
                    text={actionItem.label}
                    variant={actionItem.variant}
                    disabled={
                      actionItem.key === "payNow"
                        ? cardPaymentLoading || isPaymentBlockedByPenalty
                        : false
                    }
                    loading={
                      actionItem.key === "payNow"
                        ? cardPaymentLoading || effectivePenaltyLoading
                        : false
                    }
                    onClick={() => runDetailAction(actionItem.key)}
                  />
                ))}
            </div>
          ) : undefined
        }
        overflowActions={
          detailActions.length >= 3
            ? detailActions
                .filter((a) => a.key === "duplicate")
                .map((actionItem) => (
                  <CustomButton
                    key={actionItem.key}
                    text={actionItem.label}
                    variant={actionItem.variant}
                    onClick={() => runDetailAction(actionItem.key)}
                  />
                ))
            : undefined
        }
      />

      <Modal
        visible={reviewAttachmentModalVisible}
        onCancel={() => setReviewAttachmentModalVisible(false)}
        footer={null}
        destroyOnClose
        centered
        width={768}
        title={t("myRequestsPage.detail.reviewResult.attachmentListTitle")}
        wrapClassName={`review-result-attachment-modal ${
          isReviewAttachmentRtl ? "review-result-attachment-modal--rtl" : ""
        }`}
      >
        <div
          className="review-result-attachment-list"
          dir={isReviewAttachmentRtl ? "rtl" : "ltr"}
        >
          {reviewAttachmentItems.length > 0 ? (
            reviewAttachmentItems.map((file, index) => (
              <div
                className="review-result-attachment-list__item"
                key={`${file.url}`}
              >
                <div className="review-result-attachment-list__label">
                  {t("myRequestsPage.detail.reviewResult.attachmentLabel", {
                    index: index + 1,
                  })}
                </div>
                <DocumentViewer
                  className="review-result-attachment-viewer"
                  fileName={file.name}
                  fileUrl={file.url}
                  fileType={file.fileType}
                  hasView
                  hasDownload
                  hasDelete={false}
                />
              </div>
            ))
          ) : (
            <div className="review-result-attachment-list__empty">
              {t("myRequestsPage.detail.reviewResult.emptyAttachments")}
            </div>
          )}
        </div>
      </Modal>

      {/* Payment Verification Modal */}
      <PaymentMethodSelectionModal
        visible={paymentMethodModalVisible}
        loading={paymentMethodProceedLoading || cardPaymentLoading}
        onCancel={handlePaymentMethodModalClose}
        onProceed={handlePaymentMethodProceed}
        totalAmount={paymentAmount}
        items={[{
          title: getLocalizedText(
            detailTitle?.serviceNameEn,
            detailTitle?.serviceNameAr,
            resolveServiceName(applicationDetail),
          ),
          reference: applicationDetail?.applicationNumber ?? "",
          amount: paymentAmount,
        }]}
      />


      {/* Payment Success Modal */}
      <PaymentSuccessModal
        visible={paymentSuccessVisible}
        onClose={handlePaymentSuccessClose}
        documentNumber={paySuccessDetails}
        onDownloadReceipt={handleDownloadReceipt}
        onViewDocument={handleViewDocument}
        onSubmitRating={handlePaymentRatingSubmit}
      />
      <CardPaymentProgressModal
        visible={
          cardPaymentVisible &&
          (cardPaymentStatus === "redirecting" ||
            cardPaymentStatus === "processing")
        }
        amount={
          Number.isFinite(Number(cardPaymentContext?.amount)) &&
          Number(cardPaymentContext?.amount) > 0
            ? Number(cardPaymentContext?.amount)
            : paymentAmount
        }
        confirmLoading={cardPaymentConfirmLoading}
        cancelLoading={cardPaymentCancelLoading}
        onClose={handleCardPaymentProgressClose}
        onConfirmCompleted={handleCardPaymentConfirmCompleted}
      />
      <ComfirmModal
        icon={WarningCircle}
        title={t("myRequestsPage.cancelModal.title")}
        content={t("myRequestsPage.cancelModal.content")}
        show={cancelModalShow}
        close={() => setCancelModalShow(false)}
        comfrimHanld={handleConfirmCancel}
        type="warning"
        comfrimText={t("myRequestsPage.detail.confirm")}
        cancelText={t("myRequestsPage.actions.cancel")}
      />
      <ComfirmModal
        icon={WarningCircle}
        title={t("myRequestsPage.deleteModal.title")}
        content={t("myRequestsPage.deleteModal.content")}
        show={deleteModalShow}
        close={() => setDeleteModalShow(false)}
        comfrimHanld={handleConfirmDelete}
        type="warning"
        comfrimText={t("myRequestsPage.deleteModal.confirmButton")}
        cancelText={t("myRequestsPage.actions.cancel")}
      />

      <Modal
        visible={submitProofModalVisible}
        onCancel={closeSubmitProofModal}
        footer={null}
        centered
        width={960}
        className="submit-proof-modal"
        maskClosable={false}
        title={t("myRequestsPage.detail.submitProofModal.title")}
      >
        <div className="submit-proof-modal__content">
          <div className="submit-proof-modal__notice">
            <InfoCircleOutlined />
            <span>{t("myRequestsPage.detail.submitProofModal.notice")}</span>
          </div>
          <div className="submit-proof-modal__body">
            <div className="submit-proof-modal__method-list">
              {dispositionMethodOptions.map((option) => {
                const selected = submitProofMethod === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      selected
                        ? "submit-proof-modal__method-card submit-proof-modal__method-card--selected"
                        : "submit-proof-modal__method-card"
                    }
                    onClick={() => setSubmitProofMethod(option.value)}
                  >
                    <div className="submit-proof-modal__method-icon">
                      {option.icon === "export" ? (
                        <GlobalOutlined />
                      ) : option.icon === "destroy" ? (
                        <DeleteOutlined />
                      ) : (
                        <WarningOutlined />
                      )}
                    </div>
                    <div className="submit-proof-modal__method-copy">
                      <div className="submit-proof-modal__method-title">
                        {option.label}
                      </div>
                      <div className="submit-proof-modal__method-description">
                        {option.description}
                      </div>
                    </div>
                    <div
                      className={
                        selected
                          ? "submit-proof-modal__method-radio submit-proof-modal__method-radio--selected"
                          : "submit-proof-modal__method-radio"
                      }
                    >
                      <span />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="submit-proof-modal__field">
              <label>
                {t(
                  "myRequestsPage.detail.submitProofModal.supportingDocuments",
                )}
                <Tooltip
                  title={t("common.fileUpload.uploadTip", {
                    maxSize: 5,
                    fileTypes: "jpg, jpeg, png, pdf",
                    maxCount: 3,
                  })}
                >
                  <InfoCircleOutlined />
                </Tooltip>
                <span>*</span>
              </label>
              <FileUpload
                value={submitProofFiles}
                onChange={setSubmitProofFiles}
                maxCount={3}
                maxSize={5}
                placeholder={t("myRequestsPage.detail.submitProofModal.uploadFile")}
                customRequest={handleSubmitProofUpload}
                uploadTip={t("common.fileUpload.uploadTip", {
                  maxSize: 5,
                  fileTypes: "jpg, jpeg, png, pdf",
                  maxCount: 3,
                })}
                showUploadTip={false}
                isSingle={false}
              />
            </div>
            <div className="submit-proof-modal__field">
              <label htmlFor="submit-proof-notes">
                {t("myRequestsPage.detail.submitProofModal.notes")}
              </label>
              <Input.TextArea
                id="submit-proof-notes"
                value={submitProofNotes}
                onChange={(e) => setSubmitProofNotes(e.target.value)}
                rows={4}
                maxLength={1000}
                showCount={{
                  formatter: ({ count, maxLength }) =>
                    `${count} / ${maxLength}`,
                }}
                placeholder={t("formPlaceholders.pages.detail.enterNotes")}
              />
            </div>
          </div>
          <div className="submit-proof-modal__footer">
            <CustomButton
              text={t("myRequestsPage.actions.cancel")}
              variant="outline"
              disabled={submitProofSubmitting}
              onClick={closeSubmitProofModal}
            />
            <CustomButton
              text={t("myRequestsPage.detail.confirm")}
              variant="primary"
              disabled={
                !submitProofMethod ||
                submitProofSubmitting ||
                uploadedSubmitProofFileNames.length === 0
              }
              loading={submitProofSubmitting}
              onClick={handleSubmitProofConfirm}
            />
          </div>
        </div>
      </Modal>

      <DocumentDown
        visible={documnetVisible}
        cancle={() => setDocumnetVisible(false)}
        url={pdfData?.certificateUrl || ""}
        password={pdfData?.pdfPassword || ""}
        fileName={pdfData?.name || ""}
        title={t("myRequestsPage.documentModal.title")}
        subtitle={t("myRequestsPage.documentModal.subtitle")}
        noteTitle={t("myRequestsPage.documentModal.noteTitle")}
        noteText={t("myRequestsPage.documentModal.noteText")}
        passwordLabel={t("myRequestsPage.documentModal.passwordLabel")}
        copyButtonText={t("myRequestsPage.documentModal.copyRedirect")}
      />
      {profileSelectionNode}
    </div>
  );
};

export default Detail;
