import moment from "moment";
import CustomMessage from "@/components/common/CustomMessage";
import i18n from "@/localization/config";
import { fileUpload } from "@/services/media";
import type {
  AppealableViolationDto,
  AppealViolationAssociatedAppealDto,
  AppealViolationDetailDto,
  AppealViolationFineDetailDto,
  AppealViolationPenaltyOrderDto,
  AppealViolationPenaltyOrderItemDto,
  AppealViolationReportedViolationDto,
  AppealDictionaryDto,
  AppealDetailDto,
  AppealViolationListData,
  AppealListItemDto,
  AppealReasonDto,
} from "@/services/appeal";
import type {
  PayFineActivityDto,
  PayFineAttachmentDto,
  PayFineDetailDto,
  PayFineListItemDto,
} from "@/services/violationFine";
import type {
  AppealRecord,
  AppealSummary,
  AppealDictionaryOption,
  AppealReasonOption,
  AppealStatus,
  AttachmentItem,
  FineDetailItem,
  ReportedViolationItem,
  ViolationRecord,
  ViolationStatus,
} from "./fixtures";
import type { UploadRequestOptions } from "./types";

export const DATE_FORMAT = "DD/MM/YYYY";
export const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm:ss";
export const MAX_MESSAGE_LENGTH = 1000;
export const EMPTY_VALUE = "-";

const SUCCESS_STATUS_KEYWORDS = ["paid", "completed", "success", "settled"];
const APPEAL_STATUS_KEYWORDS = ["appeal", "review"];
const CANCELLED_STATUS_KEYWORDS = ["cancel"];
const WARNING_STATUS_KEYWORDS = ["warning"];
const PENDING_STATUS_KEYWORDS = ["pending", "processing"];
const LICENSING_VIOLATION_TYPE_ID = 1;
const CONTENT_VIOLATION_TYPE_ID = 2;

interface ReceiptMetadataSource {
  transactionNo?: string | number | null;
  receiptTransactionNo?: string | number | null;
  paymentTransactionNo?: string | number | null;
  receiptNo?: string | number | null;
  receiptNumber?: string | number | null;
}

export function formatAmount(amount: number | null | undefined, withCurrency = false) {
  if (amount === null || amount === undefined) {
    return EMPTY_VALUE;
  }
  const value = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withCurrency ? `AED ${value}` : value;
}

export function formatViolationFineAmount(
  amount: number | null | undefined,
  status: ViolationStatus,
  withCurrency = false,
) {
  if (status === "cancelled" || status === "warningIssued") {
    return EMPTY_VALUE;
  }

  return formatAmount(amount, withCurrency);
}

export function getViolationPaymentAmount(violation: ViolationRecord) {
  if (violation.totalFee > 0) {
    return violation.totalFee;
  }
  return violation.fineAmount ?? 0;
}

export function parseDateTime(value: string) {
  const parsed = moment(value, [DATE_TIME_FORMAT, DATE_FORMAT, moment.ISO_8601], true);
  return parsed.isValid() ? parsed : moment(value);
}

export function formatTextValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || EMPTY_VALUE;
}

export function formatDateValue(value: string | null | undefined, format = DATE_FORMAT) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === EMPTY_VALUE) {
    return EMPTY_VALUE;
  }

  const parsed = parseDateTime(normalized);
  return parsed.isValid() ? parsed.format(format) : EMPTY_VALUE;
}

export function getRouteId(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const numeric = Number(last);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function getRouteReference(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];

  if (!last) {
    return "";
  }

  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function normalizeReferenceValue(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

const toNumberOrNull = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const toPositiveAmountOrNull = (value?: number | string | null) => {
  const parsedValue = toNumberOrNull(value);
  return parsedValue !== null && parsedValue > 0 ? parsedValue : null;
};

const formatOrdinal = (value: number | string | null | undefined) => {
  const numberValue = toNumberOrNull(value);
  if (numberValue === null || numberValue <= 0) {
    return undefined;
  }

  const absoluteValue = Math.trunc(Math.abs(numberValue));
  const tens = absoluteValue % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? "th"
      : absoluteValue % 10 === 1
        ? "st"
        : absoluteValue % 10 === 2
          ? "nd"
          : absoluteValue % 10 === 3
            ? "rd"
            : "th";

  return `${absoluteValue}${suffix}`;
};

const getReportedViolationDisplayAmount = (
  item: AppealViolationReportedViolationDto,
) => {
  const adjustedAmount = toNumberOrNull(item.beforeAppealAdjustedFineAmount);
  const originalAmount = toPositiveAmountOrNull(item.amount);

  if (adjustedAmount !== null && adjustedAmount > 0) {
    return adjustedAmount;
  }

  return originalAmount ?? null;
};

const getReportedViolationOriginalAmount = (
  item: AppealViolationReportedViolationDto,
) => {
  // Reported Violations show the amount before appeal review. Do not fall back to the current effective amount here.
  const adjustedAmount = toNumberOrNull(item.beforeAppealAdjustedFineAmount);
  return adjustedAmount !== null && adjustedAmount > 0 ? adjustedAmount : null;
};

const isContentViolationType = (violationTypeId?: number | string | null) =>
  toNumberOrNull(violationTypeId) === CONTENT_VIOLATION_TYPE_ID;

const getReportedViolationDisplayDegree = (
  item: AppealViolationReportedViolationDto,
) => {
  // Reported Violations show the committee-confirmed level before appeal review. Do not fall back to current degree.
  const originalDegree = toNumberOrNull(item.oldDegree);

  return originalDegree !== null && originalDegree > 0
    ? String(originalDegree)
    : undefined;
};

const getFineDetailLevelValue = (
  degree: number | string | null | undefined,
) => {
  // The backend exposes the current effective level as `degree`: count for licensing violations, degree for content violations.
  const parsedDegree = toNumberOrNull(degree);

  if (parsedDegree === null || parsedDegree <= 0) {
    return undefined;
  }

  return String(parsedDegree);
};

const getReportedWarningLabel = (
  item: AppealViolationReportedViolationDto,
  violationTypeId?: number | string | null,
) => {
  const isLicensingViolation =
    toNumberOrNull(violationTypeId) === LICENSING_VIOLATION_TYPE_ID;
  const itemAmount = toNumberOrNull(item.amount);
  const displayAmount = getReportedViolationDisplayAmount(item);

  if (!isLicensingViolation || itemAmount !== 0 || displayAmount !== null) {
    return undefined;
  }

  return formatOrdinal(item.oldDegree);
};

const getReportedViolationTag = (
  item: AppealViolationReportedViolationDto,
  amount: number | null,
  violationTypeId?: number | string | null,
) => {
  const warningLabel = getReportedWarningLabel(item, violationTypeId);
  if (warningLabel) {
    return `${warningLabel} Warning`;
  }

  if (isContentViolationType(violationTypeId)) {
    // Content Reported Violations must show the pre-appeal baseline only: oldDegree + beforeAppealAdjustedFineAmount.
    // After appeal approval, newDegree and afterAppealAdjustedFineAmount are synced into degree and fineAmount instead.
    const originalAmount = getReportedViolationOriginalAmount(item);
    const originalDegree = getReportedViolationDisplayDegree(item);

    return originalAmount !== null && originalDegree
      ? `Degree ${originalDegree}: AED ${formatAmount(originalAmount)}`
      : "";
  }

  if (amount === null) {
    return "Reported";
  }

  return `AED ${formatAmount(amount)}`;
};

export const getDecisionStatusClassName = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("maintain")) return "info";
  if (normalized.includes("reject")) return "error";
  return "warn";
};

export function mapAppealStatus(
  statusId?: number | string | null,
  statusLabel?: string | null,
): AppealStatus {
  const normalizedStatus = String(statusLabel ?? "")
    .trim()
    .toLowerCase();

  if (normalizedStatus.includes("approved")) return "approved";
  if (normalizedStatus.includes("rejected")) return "rejected";
  if (normalizedStatus.includes("cancel")) return "cancelled";
  if (normalizedStatus.includes("under review")) return "underReview";
  if (
    normalizedStatus.includes("processing") ||
    normalizedStatus.includes("under processing")
  ) {
    return "processing";
  }

  const normalizedStatusId = toNumberOrNull(statusId);
  if (normalizedStatusId === 0) return "processing";
  if (normalizedStatusId === 1) return "underReview";
  if (normalizedStatusId === 2 || normalizedStatusId === 6) return "approved";
  if (normalizedStatusId === 3 || normalizedStatusId === 7) return "rejected";
  if (normalizedStatusId === 4 || normalizedStatusId === 8) return "cancelled";

  return "underReview";
}

const getDictionaryOptionId = (item: AppealDictionaryDto) => {
  const codeId = toNumberOrNull(item.code);
  if (codeId !== null) return codeId;

  const id = toNumberOrNull(item.id);
  return id;
};

export function mapAppealDictionaryDtos(
  items: AppealDictionaryDto[],
  isAr = false,
): AppealDictionaryOption[] {
  return items
    .filter((item) => item.isShown !== false)
    .reduce<AppealDictionaryOption[]>((options, item) => {
      const id = getDictionaryOptionId(item);
      const label = formatTextValue(
        isAr
          ? item.nameAr || item.nameEn || item.code
          : item.nameEn || item.nameAr || item.code,
      );

      if (id === null || label === EMPTY_VALUE) {
        return options;
      }

      options.push({
        id,
        label,
        code:
          item.code === null || item.code === undefined
            ? undefined
            : String(item.code),
        sort: item.sort,
        nameEn: item.nameEn,
        nameAr: item.nameAr,
      });

      return options;
    }, [])
    .sort((left, right) => {
      const leftSort = left.sort ?? Number.MAX_SAFE_INTEGER;
      const rightSort = right.sort ?? Number.MAX_SAFE_INTEGER;
      return leftSort - rightSort;
    });
}

export function mapAppealReasonDtos(
  items: AppealReasonDto[],
  isAr = false,
): AppealReasonOption[] {
  return mapAppealDictionaryDtos(items, isAr);
}

export function normalizeAppealViolationListData(
  data: AppealViolationListData | undefined,
) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
    };
  }

  const items = data?.items ?? [];
  return {
    items,
    total: data?.total ?? items.length,
  };
}

export function getReasonLabel(
  reasonId?: number,
  reasons: AppealReasonOption[] = [],
) {
  return reasons.find((item) => item.id === reasonId)?.label ?? EMPTY_VALUE;
}

export function isOtherAppealReason(
  reasonId: number | undefined,
  reasons: AppealReasonOption[],
) {
  const reason = reasons.find((item) => item.id === reasonId);
  const normalized = `${reason?.code ?? ""} ${reason?.label ?? ""}`.toLowerCase();
  return normalized.includes("other");
}

export function makeAttachmentItems(
  urls: Array<string | null | undefined>,
  names?: Array<string | null | undefined>,
) {
  return urls
    .map((url, index) => {
      const normalizedUrl = String(url ?? "").trim();
      if (!normalizedUrl) return null;
      const fallbackName = `Attachment ${index + 1}`;
      const inferredName = normalizedUrl.split("/").filter(Boolean).pop() || fallbackName;
      const displayName = formatTextValue(names?.[index]);
      return {
        url: normalizedUrl,
        name: displayName === EMPTY_VALUE ? inferredName : displayName,
      };
    })
    .filter(Boolean) as AttachmentItem[];
}

export function mapAppealDetailDto(
  dto: AppealDetailDto,
  reasons: AppealReasonOption[] = [],
): AppealRecord {
  const status = mapAppealStatus(
    dto.statusId,
    `${dto.status ?? ""} ${dto.statusAr ?? ""}`,
  );
  const attachments = makeAttachmentItems([
    dto.attachmentUrl1,
    dto.attachmentUrl2,
    dto.attachmentUrl3,
  ]);
  const resultAttachments = makeAttachmentItems([
    dto.resultBanner?.attachmentUrl1,
    dto.resultBanner?.attachmentUrl2,
    dto.resultBanner?.attachmentUrl3,
  ]);
  const relatedViolation = dto.relatedViolation;
  return {
    id: dto.id,
    appealNo: formatTextValue(dto.appealNo),
    appealReasonId: dto.reasonId,
    appealReason: getReasonLabel(dto.reasonId, reasons),
    violationId: dto.violationId,
    violationNo: formatTextValue(relatedViolation?.violationNo),
    fineAmount: relatedViolation?.fineAmount ?? null,
    submissionTime: formatTextValue(dto.submissionTime),
    status,
    notes: formatTextValue(dto.reasonRemark),
    attachments,
    relatedViolation: {
      violationNo: formatTextValue(relatedViolation?.violationNo),
      status: mapViolationStatus(relatedViolation?.statusId),
      violationType: formatTextValue(relatedViolation?.violationType),
      violator: formatTextValue(relatedViolation?.violatorName),
    },
    resultBanner: dto.resultBanner
      ? {
          title: status === "approved" ? "Appeal Approved" : "Appeal Rejected",
          note: formatTextValue(dto.resultBanner.note || dto.resultBanner.decision),
          decidedOn: dto.resultBanner.decidedOn || "",
          attachments: resultAttachments,
        }
      : undefined,
    communications: (dto.communications ?? []).map((item) => ({
      id: item.id,
      senderType: item.isSystemMessage ? "System" : item.senderActorTypeCode === "Agent" ? "Agent" : "Customer",
      senderName: formatTextValue(item.senderName || item.senderActorTypeCode || "System"),
      body: formatTextValue(item.body || item.note),
      createdOn: formatTextValue(item.createdOn),
      attachments: makeAttachmentItems(
        [item.attachmentUrl1, item.attachmentUrl2, item.attachmentUrl3],
        [item.attachmentName1, item.attachmentName2, item.attachmentName3],
      ),
    })),
  };
}

export function mapAppealListItemDto(
  dto: AppealListItemDto,
  reasons: AppealReasonOption[] = [],
  isAr = false,
): AppealRecord {
  const dtoAppealReason = formatTextValue(
    isAr
      ? dto.appealReasonAr || dto.appealReason
      : dto.appealReason || dto.appealReasonAr,
  );
  const reasonLabel = getReasonLabel(dto.appealReasonId ?? undefined, reasons);
  const appealReason =
    reasonLabel === EMPTY_VALUE ? dtoAppealReason : reasonLabel;
  const appealReasonOption = reasons.find(
    (item) => item.label.toLowerCase() === appealReason.toLowerCase(),
  );
  const violationNo = formatTextValue(dto.violationNo);

  return {
    id: dto.id,
    profileId: dto.profileId ?? null,
    profileName: dto.profileName ?? null,
    userTypeId: dto.userTypeId ?? null,
    userTypeName: dto.userTypeName ?? null,
    appealNo: formatTextValue(dto.appealNo),
    appealReasonId: dto.appealReasonId ?? appealReasonOption?.id ?? 0,
    appealReason,
    violationId: 0,
    violationNo,
    fineAmount: dto.fineAmount ?? null,
    submissionTime: formatDateValue(dto.submissionDate, DATE_FORMAT),
    status: mapAppealStatus(
      dto.statusId,
      `${dto.status ?? ""} ${dto.statusAr ?? ""}`,
    ),
    notes: EMPTY_VALUE,
    attachments: [],
    relatedViolation: {
      violationNo,
      status: "pendingPayment",
      violationType: EMPTY_VALUE,
      violator: EMPTY_VALUE,
    },
    communications: [],
  };
}

export function createAppealPlaceholder(id: number): AppealRecord {
  return {
    id,
    appealNo: EMPTY_VALUE,
    appealReasonId: 0,
    appealReason: EMPTY_VALUE,
    violationId: 0,
    violationNo: EMPTY_VALUE,
    fineAmount: null,
    submissionTime: EMPTY_VALUE,
    status: "underReview",
    notes: EMPTY_VALUE,
    attachments: [],
    relatedViolation: {
      violationNo: EMPTY_VALUE,
      status: "pendingPayment",
      violationType: EMPTY_VALUE,
      violator: EMPTY_VALUE,
    },
    communications: [],
  };
}

export function getRequestErrorMessage(_error: unknown, fallback: string) {
  return fallback;
}

export function uploadRequest(options: UploadRequestOptions) {
  const { file, onSuccess, onError } = options;
  const formData = new FormData();
  formData.append("files", file);

  fileUpload(formData)
    .then((response) => {
      const data = response?.data;
      const uploadedUrl = Array.isArray(data) ? data[0] : undefined;
      if (!uploadedUrl?.trim()) {
        throw new Error("Upload did not return a file URL.");
      }
      onSuccess?.(uploadedUrl);
    })
    .catch((error) => {
      console.error("Failed to upload appeal attachment:", error);
      const uploadError = new Error(
        getRequestErrorMessage(error, "Upload failed. Please try again."),
      );
      CustomMessage.error(i18n.t("violationsFinesPage.messages.uploadFailed"));
      onError?.(uploadError);
    });
}

const getFirstOptionalText = (
  ...values: Array<string | number | null | undefined>
) => {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const getFirstText = (...values: Array<string | number | null | undefined>) => {
  const resolvedValue = getFirstOptionalText(...values);
  if (resolvedValue) {
    return resolvedValue;
  }

  return EMPTY_VALUE;
};

const getLocalizedText = (
  isAr: boolean,
  english?: string | number | null,
  arabic?: string | number | null,
) => (isAr ? getFirstText(arabic, english) : getFirstText(english, arabic));

const getReceiptIdentifiers = (
  ...sources: Array<ReceiptMetadataSource | null | undefined>
) => {
  let receiptTransactionNo: string | undefined;
  let receiptNo: string | undefined;

  for (const source of sources) {
    receiptTransactionNo = getFirstOptionalText(
      source?.transactionNo,
      source?.receiptTransactionNo,
      source?.paymentTransactionNo,
    );
    if (receiptTransactionNo) {
      break;
    }
  }

  for (const source of sources) {
    receiptNo = getFirstOptionalText(
      source?.receiptNo,
      source?.receiptNumber,
    );
    if (receiptNo) {
      break;
    }
  }

  return {
    receiptTransactionNo,
    receiptNo,
  };
};

export const mapViolationStatus = (
  statusValue?: string | number | null,
  amount?: number | null,
): ViolationStatus => {
  const statusId = toNumberOrNull(statusValue);
  if (statusId === 1) return "warningIssued";
  if (statusId === 7) return "pendingPayment";
  if (statusId === 8) return "underAppeal";
  if (statusId === 9) return "paid";
  if (statusId === 10) return "cancelled";

  const normalizedStatus = String(statusValue ?? "").trim().toLowerCase();

  if (SUCCESS_STATUS_KEYWORDS.some((keyword) => normalizedStatus.includes(keyword))) {
    return "paid";
  }

  if (APPEAL_STATUS_KEYWORDS.some((keyword) => normalizedStatus.includes(keyword))) {
    return "underAppeal";
  }

  if (CANCELLED_STATUS_KEYWORDS.some((keyword) => normalizedStatus.includes(keyword))) {
    return "cancelled";
  }

  if (WARNING_STATUS_KEYWORDS.some((keyword) => normalizedStatus.includes(keyword))) {
    return "warningIssued";
  }

  if (PENDING_STATUS_KEYWORDS.some((keyword) => normalizedStatus.includes(keyword))) {
    return "pendingPayment";
  }

  return amount && amount > 0 ? "pendingPayment" : "warningIssued";
};

const mapAppealViolationReportedItems = (
  items: AppealViolationReportedViolationDto[] | undefined,
  violationNo: string,
  isAr = false,
  violationTypeId?: number | string | null,
): ReportedViolationItem[] => {
  const reportedItems = items ?? [];

  if (!reportedItems.length) {
    return [
      {
        id: `${violationNo}-reported-placeholder`,
        title: EMPTY_VALUE,
        description: EMPTY_VALUE,
        tag: EMPTY_VALUE,
        amount: null,
        attachments: [],
      },
    ];
  }

  return reportedItems.map((item, index) => {
    const amount = isContentViolationType(violationTypeId)
      ? getReportedViolationOriginalAmount(item)
      : getReportedViolationDisplayAmount(item);
    const name = getLocalizedText(isAr, item.name, item.nameAr);
    const appealResultName = formatTextValue(item.appealResultName);
    const severity = getLocalizedText(
      isAr,
      item.severityLevelName,
      item.severityLevelNameAr,
    );

    return {
      id: `${violationNo}-reported-${item.itemId ?? index + 1}`,
      title: name,
      description: formatTextValue(item.notes || name),
      tag: getReportedViolationTag(item, amount, violationTypeId),
      amount,
      severity: severity === EMPTY_VALUE ? undefined : severity,
      oldDegree: item.oldDegree,
      newDegree: item.newDegree,
      appealResult: item.appealResult,
      appealResultName:
        appealResultName === EMPTY_VALUE ? undefined : appealResultName,
      sourceItemId: item.itemId ?? null,
      sourceIndex: index,
      attachments: makeAttachmentItems(item.evidenceUrls ?? []),
    };
  });
};

const mapAppealViolationFineDetailItems = (
  items: AppealViolationFineDetailDto[] | undefined,
  violationNo: string,
  isAr = false,
): FineDetailItem[] =>
  (items ?? []).map((item, index) => ({
    id: `${violationNo}-fine-${index + 1}`,
    violation: getLocalizedText(
      isAr,
      item.violationItemName,
      item.violationItemNameAr,
    ),
    count: formatTextValue(getFineDetailLevelValue(item.degree)),
    amount: toNumberOrNull(item.amount),
    sourceIndex: index,
  }));

const mapPenaltyOrderItemsToFineDetails = (
  orders: AppealViolationPenaltyOrderDto[],
  violationNo: string,
): FineDetailItem[] => {
  let sourceIndex = 0;

  return orders.flatMap((order, orderIndex) =>
    (order.items ?? []).map((item: AppealViolationPenaltyOrderItemDto, itemIndex) => {
      const itemSourceIndex = sourceIndex;
      sourceIndex += 1;

      return {
        id: `${violationNo}-penalty-${order.penaltyOrderId ?? orderIndex + 1}-${
          item.itemId ?? itemIndex + 1
        }`,
        violation: formatTextValue(item.violationDescription),
        count: formatTextValue(getFineDetailLevelValue(item.degree)),
        amount: toNumberOrNull(item.fineAmount),
        sourceItemId: item.itemId ?? null,
        sourceIndex: itemSourceIndex,
      };
    }),
  );
};

const localizePenaltyFineDetails = (
  fineDetails: FineDetailItem[],
  reportedViolations: ReportedViolationItem[],
  isAr: boolean,
): FineDetailItem[] => {
  if (!isAr) return fineDetails;

  const localizedTitlesByItemId = new Map(
    reportedViolations
      .filter((item) => item.sourceItemId != null)
      .map((item) => [String(item.sourceItemId), item.title]),
  );

  return fineDetails.map((item) => {
    const localizedTitle =
      item.sourceItemId == null
        ? undefined
        : localizedTitlesByItemId.get(String(item.sourceItemId));

    return localizedTitle && localizedTitle !== EMPTY_VALUE
      ? { ...item, violation: localizedTitle }
      : item;
  });
};

const normalizeSourceItemId = (value?: string | number | null) => {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
};

const isCancelledReportedViolation = (item: ReportedViolationItem) =>
  item.appealResultName
    ? getDecisionStatusClassName(item.appealResultName) === "cancelled"
    : false;

const filterCancelledFineDetails = (
  fineDetails: FineDetailItem[],
  reportedViolations: ReportedViolationItem[],
): FineDetailItem[] => {
  const cancelledReportedViolations = reportedViolations.filter(
    isCancelledReportedViolation,
  );

  if (!cancelledReportedViolations.length) {
    return fineDetails;
  }

  const cancelledSourceItemIds = new Set(
    cancelledReportedViolations
      .map((item) => normalizeSourceItemId(item.sourceItemId))
      .filter((value): value is string => Boolean(value)),
  );
  const cancelledSourceIndexes = new Set(
    cancelledReportedViolations
      .map((item) => item.sourceIndex)
      .filter((value): value is number => typeof value === "number"),
  );

  return fineDetails.filter((item) => {
    const sourceItemId = normalizeSourceItemId(item.sourceItemId);

    if (sourceItemId && cancelledSourceItemIds.size) {
      return !cancelledSourceItemIds.has(sourceItemId);
    }

    if (typeof item.sourceIndex === "number") {
      return !cancelledSourceIndexes.has(item.sourceIndex);
    }

    return true;
  });
};

const isPayablePenaltyOrder = (order: AppealViolationPenaltyOrderDto) => {
  const status = `${order.orderStatus ?? ""} ${order.statusDisplay ?? ""}`
    .replace(/\s+/g, "")
    .toLowerCase();
  return status.includes("pendingpayment");
};

const getPayablePenaltyOrder = (orders: AppealViolationPenaltyOrderDto[]) =>
  orders.find(isPayablePenaltyOrder);

const isSuccessfulPenaltyOrder = (order: AppealViolationPenaltyOrderDto) => {
  const status = `${order.orderStatus ?? ""} ${order.statusDisplay ?? ""}`
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return (
    Boolean(String(order.paidAt ?? "").trim()) ||
    SUCCESS_STATUS_KEYWORDS.some((keyword) => status.includes(keyword))
  );
};

const getReceiptPenaltyOrder = (orders: AppealViolationPenaltyOrderDto[]) =>
  orders.find((order) => {
    const { receiptTransactionNo, receiptNo } = getReceiptIdentifiers(order);
    return Boolean(receiptTransactionNo || receiptNo);
  }) ?? orders.find(isSuccessfulPenaltyOrder);

const mapAssociatedAppealSummary = (
  appeal: AppealViolationAssociatedAppealDto | null | undefined,
  isAr = false,
): AppealSummary | undefined => {
  if (!appeal) return undefined;

  return {
    id: appeal.appealId,
    appealNo: formatTextValue(appeal.appealNo),
    appealReason: getLocalizedText(
      isAr,
      appeal.appealReason,
      appeal.appealReasonAr,
    ),
    profileName: formatTextValue(appeal.violatorName),
    status: mapAppealStatus(
      appeal.statusId,
      `${appeal.status ?? ""} ${appeal.statusAr ?? ""}`,
    ),
  };
};

export const mapAssociatedAppealToAppealRecord = (
  detail: AppealViolationDetailDto,
  isAr = false,
): AppealRecord | undefined => {
  const appeal = detail.associatedAppeal;
  if (!appeal) return undefined;

  const appealReason = getLocalizedText(
    isAr,
    appeal.appealReason,
    appeal.appealReasonAr,
  );
  const status = mapAppealStatus(
    appeal.statusId,
    `${appeal.status ?? ""} ${appeal.statusAr ?? ""}`,
  );
  const violationStatusText = isAr
    ? detail.statusAr || detail.status || detail.statusId
    : detail.status || detail.statusId;

  return {
    id: appeal.appealId,
    appealNo: formatTextValue(appeal.appealNo),
    appealReasonId: appeal.reasonId ?? 0,
    appealReason,
    violationId: detail.violationId,
    violationNo: formatTextValue(detail.violationNo),
    fineAmount: toNumberOrNull(detail.totalFineAmount ?? detail.fineAmount),
    submissionTime: EMPTY_VALUE,
    status,
    notes: appeal.decision?.finalDecisionNote || EMPTY_VALUE,
    attachments: [],
    relatedViolation: {
      violationNo: formatTextValue(detail.violationNo),
      status: mapViolationStatus(
        violationStatusText,
        toNumberOrNull(detail.totalFineAmount ?? detail.fineAmount),
      ),
      violationType: getLocalizedText(
        isAr,
        detail.violationType,
        detail.violationTypeAr,
      ),
      violator: formatTextValue(detail.violatorName),
    },
    communications: [],
  };
};

export const mapAppealViolationDetailToViolationRecord = (
  detail: AppealViolationDetailDto,
  penaltyOrders: AppealViolationPenaltyOrderDto[] = [],
  isAr = false,
): ViolationRecord => {
  const violationNo = getFirstText(detail.violationNo, detail.violationId);
  const payablePenaltyOrder = getPayablePenaltyOrder(penaltyOrders);
  const totalFineAmount = toNumberOrNull(detail.totalFineAmount);
  const fineAmount = toNumberOrNull(
    payablePenaltyOrder?.totalAmount ?? detail.fineAmount ?? totalFineAmount,
  );
  const totalFee = toNumberOrNull(
    payablePenaltyOrder?.totalAmount ?? totalFineAmount ?? detail.fineAmount,
  );
  const receiptPenaltyOrder = getReceiptPenaltyOrder(penaltyOrders);
  const { receiptTransactionNo, receiptNo } = getReceiptIdentifiers(
    detail,
    receiptPenaltyOrder,
  );
  const statusText = isAr
    ? detail.statusAr || detail.status || detail.statusId
    : detail.status || detail.statusId;
  const status = mapViolationStatus(
    statusText,
    fineAmount,
  );
  const reportedViolations = mapAppealViolationReportedItems(
    detail.reportedViolations,
    violationNo,
    isAr,
    detail.violationTypeId,
  );
  const penaltyFineDetails = mapPenaltyOrderItemsToFineDetails(
    penaltyOrders,
    violationNo,
  );
  const localizedPenaltyFineDetails = localizePenaltyFineDetails(
    penaltyFineDetails,
    reportedViolations,
    isAr,
  );
  const fallbackFineDetails = mapAppealViolationFineDetailItems(
    detail.fineDetails,
    violationNo,
    isAr,
  );
  const fineDetails = filterCancelledFineDetails(
    localizedPenaltyFineDetails.length
      ? localizedPenaltyFineDetails
      : fallbackFineDetails,
    reportedViolations,
  );
  const associatedAppealSummary = mapAssociatedAppealSummary(
    detail.associatedAppeal,
    isAr,
  );
  const hasAssociatedAppeal = Boolean(detail.associatedAppeal);
  const payablePenaltyOrderAmount = toNumberOrNull(
    payablePenaltyOrder?.totalAmount,
  );
  const payableAmount = payablePenaltyOrderAmount ?? totalFee ?? fineAmount;
  const canPay =
    status === "pendingPayment" && Boolean(payableAmount && payableAmount > 0);

  return {
    id: violationNo,
    fineReferenceNumber: violationNo,
    appealViolationId: detail.violationId,
    violationTypeId: detail.violationTypeId,
    statusId: detail.statusId ?? undefined,
    violationNo,
    violationType: getLocalizedText(
      isAr,
      detail.violationType,
      detail.violationTypeAr,
    ),
    violator: formatTextValue(detail.violatorName),
    fineAmount,
    issuedTime: formatDateValue(detail.issuedDate, DATE_TIME_FORMAT),
    status,
    hasAppeal: hasAssociatedAppeal || status === "underAppeal",
    canAppeal: detail.allowedAppeal === true,
    canPay,
    canDownloadReceipt: Boolean(receiptTransactionNo || receiptNo),
    receiptTransactionNo,
    receiptNo,
    reportedViolations,
    fineDetails,
    totalFee: totalFee ?? 0,
    appealSummary: associatedAppealSummary,
  };
};

const createAttachmentItemsFromDtos = (
  attachments: PayFineAttachmentDto[] | undefined,
) =>
  makeAttachmentItems(
    (attachments ?? []).map((item) => item.filePath),
    (attachments ?? []).map((item) => item.fileName),
  );

const mapActivitiesToFineDetails = (
  activities: PayFineActivityDto[] | undefined,
  fineReferenceNumber: string,
): FineDetailItem[] =>
  (activities ?? []).map((item, index) => ({
    id: `${fineReferenceNumber}-fine-${item.number ?? index + 1}`,
    violation: formatTextValue(item.activity),
    count: formatTextValue(item.count),
    amount: toNumberOrNull(item.amount),
  }));

const mapDetailReportedViolations = (
  detail: PayFineDetailDto,
  fineReferenceNumber: string,
): ReportedViolationItem[] => {
  const attachments = createAttachmentItemsFromDtos(detail.attachments);
  const reported = detail.reportedViolations ?? [];

  // Preferred source: the reported violations array, which also carries the
  // appeal decision fields consumed by DecisionOnAppealCard.
  if (reported.length > 0) {
    return reported.map((item, index) => {
      const amount = toNumberOrNull(item.amount);
      const isWarning = item.isWarning === true;
      const ordinal = formatOrdinal(item.times);
      const tag = isWarning
        ? `${ordinal ? `${ordinal} ` : ""}Warning`
        : amount !== null && amount > 0
          ? `AED ${formatAmount(amount)}`
          : "Reported";
      const appealResultName = formatTextValue(item.appealResultName);

      return {
        id: `${fineReferenceNumber}-reported-${item.number ?? item.code ?? index + 1}`,
        title: formatTextValue(item.activity),
        description: formatTextValue(detail.inspectorNotes || item.activity),
        tag,
        amount,
        oldDegree: item.oldDegree,
        newDegree: item.newDegree,
        appealResult: item.appealResult,
        appealResultName:
          appealResultName === EMPTY_VALUE ? undefined : appealResultName,
        attachments: createAttachmentItemsFromDtos(item.attachments),
      };
    });
  }

  const activities = detail.activities ?? [];

  if (activities.length > 0) {
    return activities.map((item, index) => {
      const amount = toNumberOrNull(item.amount);
      return {
        id: `${fineReferenceNumber}-reported-${item.number ?? index + 1}`,
        title: formatTextValue(item.activity),
        description: formatTextValue(detail.inspectorNotes || item.activity),
        tag: amount === null ? "Reported" : `AED ${formatAmount(amount)}`,
        amount,
        attachments: index === 0 ? attachments : [],
      };
    });
  }

  const reasons = detail.violationReasons ?? [];
  if (reasons.length > 0) {
    return reasons.map((reason, index) => ({
      id: `${fineReferenceNumber}-reason-${index + 1}`,
      title: formatTextValue(reason),
      description: formatTextValue(detail.inspectorNotes || reason),
      tag: "Reported",
      amount: null,
      attachments: index === 0 ? attachments : [],
    }));
  }

  return [
    {
      id: `${fineReferenceNumber}-reported-1`,
      title: formatTextValue(detail.violationType),
      description: formatTextValue(detail.inspectorNotes),
      tag: "Reported",
      amount: null,
      attachments,
    },
  ];
};

interface ViolationRecordEnrichment {
  appealableViolation?: AppealableViolationDto;
  relatedAppeal?: AppealRecord;
  receiptTransactionNo?: string;
  receiptNo?: string;
}

export const mapPayFineListItemToViolationRecord = (
  item: PayFineListItemDto,
  enrichment: ViolationRecordEnrichment = {},
): ViolationRecord => {
  const fineAmount = toNumberOrNull(item.amount ?? item.fineAmount);
  const fineReferenceNumber = getFirstText(
    item.fineNumber,
    item.violationNumber,
    item.violationNo,
    item.id,
  );
  const violationNo = getFirstText(item.violationNumber, item.violationNo, item.fineNumber);
  const status = mapViolationStatus(item.status, fineAmount);
  const hasAppeal = Boolean(enrichment.relatedAppeal);
  const canPay = status === "pendingPayment" && Boolean(fineAmount && fineAmount > 0);

  return {
    id: fineReferenceNumber,
    profileId: item.profileId ?? null,
    profileName: item.profileName ?? null,
    userTypeId: item.userTypeId ?? null,
    userTypeName: item.userTypeName ?? null,
    fineReferenceNumber,
    appealViolationId: enrichment.appealableViolation?.violationId,
    violationTypeId: enrichment.appealableViolation?.violationTypeId,
    statusId: enrichment.appealableViolation?.statusId,
    violationNo,
    violationType: formatTextValue(item.violationType),
    violator: formatTextValue(enrichment.appealableViolation?.violatorName),
    fineAmount,
    issuedTime: formatDateValue(
      getFirstText(item.issueDate, item.issuedTime),
      DATE_TIME_FORMAT,
    ),
    status,
    hasAppeal,
    canAppeal: Boolean(enrichment.appealableViolation?.violationId) && !hasAppeal,
    canPay,
    canDownloadReceipt: Boolean(enrichment.receiptTransactionNo || enrichment.receiptNo),
    receiptTransactionNo: enrichment.receiptTransactionNo,
    receiptNo: enrichment.receiptNo,
    reportedViolations: [
      {
        id: `${fineReferenceNumber}-reported-1`,
        title: formatTextValue(item.violationReason || item.violationType),
        description: formatTextValue(item.violationReason),
        tag: fineAmount === null ? "Reported" : `AED ${formatAmount(fineAmount)}`,
        amount: fineAmount,
        attachments: [],
      },
    ],
    fineDetails:
      fineAmount === null
        ? []
        : [
            {
              id: `${fineReferenceNumber}-fine-1`,
              violation: formatTextValue(item.violationReason || item.violationType),
              count: "1",
              amount: fineAmount,
            },
          ],
    totalFee: fineAmount ?? 0,
    appealSummary: enrichment.relatedAppeal
      ? {
          id: enrichment.relatedAppeal.id,
          appealNo: enrichment.relatedAppeal.appealNo,
          appealReason: enrichment.relatedAppeal.appealReason,
          profileName: formatTextValue(enrichment.appealableViolation?.violatorName),
          status: enrichment.relatedAppeal.status,
        }
      : undefined,
  };
};

export const mapAppealViolationDtoToViolationRecord = (
  item: AppealableViolationDto,
  enrichment: ViolationRecordEnrichment = {},
): ViolationRecord => {
  const fineAmount = toPositiveAmountOrNull(item.fineAmount);
  const fineReferenceNumber = getFirstText(item.violationNo, item.violationId);
  const status = mapViolationStatus(item.statusId ?? item.status, fineAmount);
  const relatedAppeal = enrichment.relatedAppeal;
  const hasAppeal = Boolean(relatedAppeal) || status === "underAppeal";
  const canPay = status === "pendingPayment" && Boolean(fineAmount && fineAmount > 0);
  const receiptIdentifiers = getReceiptIdentifiers(item, enrichment);
  const receiptTransactionNo =
    receiptIdentifiers.receiptTransactionNo ??
    enrichment.receiptTransactionNo;
  const receiptNo = receiptIdentifiers.receiptNo ?? enrichment.receiptNo;

  return {
    id: fineReferenceNumber,
    profileId: item.profileId ?? null,
    profileName: item.profileName ?? null,
    userTypeId: item.userTypeId ?? null,
    userTypeName: item.userTypeName ?? null,
    fineReferenceNumber,
    appealViolationId: item.violationId,
    violationTypeId: item.violationTypeId,
    statusId: item.statusId,
    violationNo: formatTextValue(item.violationNo),
    violationType: formatTextValue(item.violationType),
    violator: formatTextValue(item.violatorName),
    fineAmount,
    issuedTime: formatDateValue(
      getFirstText(item.issuedDate, item.createdOn),
      DATE_TIME_FORMAT,
    ),
    status,
    hasAppeal,
    canAppeal: item.allowedAppeal === true,
    canPay,
    canDownloadReceipt: Boolean(receiptTransactionNo || receiptNo),
    receiptTransactionNo,
    receiptNo,
    reportedViolations: [
      {
        id: `${fineReferenceNumber}-reported-1`,
        title: formatTextValue(item.violationType),
        description: formatTextValue(item.status),
        tag: fineAmount === null ? "Reported" : `AED ${formatAmount(fineAmount)}`,
        amount: fineAmount,
        attachments: [],
      },
    ],
    fineDetails:
      fineAmount === null
        ? []
        : [
            {
              id: `${fineReferenceNumber}-fine-1`,
              violation: formatTextValue(item.violationType),
              count: "1",
              amount: fineAmount,
            },
          ],
    totalFee: fineAmount ?? 0,
    appealSummary: relatedAppeal
      ? {
          id: relatedAppeal.id,
          appealNo: relatedAppeal.appealNo,
          appealReason: relatedAppeal.appealReason,
          profileName: formatTextValue(item.violatorName),
          status: relatedAppeal.status,
        }
      : undefined,
  };
};

export const mapPayFineDetailToViolationRecord = (
  detail: PayFineDetailDto,
  fallbackFineReferenceNumber: string,
  enrichment: ViolationRecordEnrichment = {},
): ViolationRecord => {
  const totalFee = toNumberOrNull(detail.totalFee);
  const activitiesTotal = (detail.activities ?? []).reduce((sum, item) => {
    return sum + (toNumberOrNull(item.amount) ?? 0);
  }, 0);
  const fineAmount = totalFee ?? (activitiesTotal > 0 ? activitiesTotal : null);
  const fineReferenceNumber = getFirstText(
    detail.fineNumber,
    detail.violationNumber,
    fallbackFineReferenceNumber,
  );
  const status = mapViolationStatus(detail.status, fineAmount);
  const hasAppeal = Boolean(enrichment.relatedAppeal);
  const canPay = status === "pendingPayment" && Boolean(fineAmount && fineAmount > 0);

  return {
    id: fineReferenceNumber,
    fineReferenceNumber,
    appealViolationId: enrichment.appealableViolation?.violationId,
    violationTypeId: enrichment.appealableViolation?.violationTypeId,
    statusId: enrichment.appealableViolation?.statusId,
    violationNo: getFirstText(detail.violationNumber, detail.fineNumber, fallbackFineReferenceNumber),
    violationType: formatTextValue(detail.violationType),
    violator: formatTextValue(detail.establishment?.establishmentName || detail.contactPerson),
    fineAmount,
    issuedTime: formatDateValue(
      getFirstText(detail.violationTime, detail.issueDate),
      DATE_TIME_FORMAT,
    ),
    status,
    hasAppeal,
    canAppeal: Boolean(enrichment.appealableViolation?.violationId) && !hasAppeal,
    canPay,
    canDownloadReceipt: Boolean(enrichment.receiptTransactionNo || enrichment.receiptNo),
    receiptTransactionNo: enrichment.receiptTransactionNo,
    receiptNo: enrichment.receiptNo,
    reportedViolations: mapDetailReportedViolations(detail, fineReferenceNumber),
    fineDetails: mapActivitiesToFineDetails(detail.activities, fineReferenceNumber),
    totalFee: fineAmount ?? 0,
    appealSummary: enrichment.relatedAppeal
      ? {
          id: enrichment.relatedAppeal.id,
          appealNo: enrichment.relatedAppeal.appealNo,
          appealReason: enrichment.relatedAppeal.appealReason,
          profileName: formatTextValue(detail.establishment?.establishmentName || detail.contactPerson),
          status: enrichment.relatedAppeal.status,
        }
      : undefined,
  };
};

// Builds the related-appeal record from the public detail's associatedAppeal.
// Used to gate the Decision on Appeal panel and to render its Notes.
export const mapPayFineDetailRelatedAppeal = (
  detail: PayFineDetailDto,
  isAr = false,
): AppealRecord | undefined => {
  const appeal = detail.associatedAppeal;
  if (!appeal) {
    return undefined;
  }

  const violationNo = getFirstText(detail.violationNumber, detail.fineNumber);
  const status = mapAppealStatus(
    appeal.statusId,
    `${appeal.status ?? ""} ${appeal.statusAr ?? ""}`,
  );

  return {
    id: appeal.appealId ?? 0,
    appealNo: formatTextValue(appeal.appealNo),
    appealReasonId: 0,
    appealReason: getLocalizedText(isAr, appeal.appealReason, appeal.appealReasonAr),
    violationId: 0,
    violationNo,
    fineAmount: toNumberOrNull(detail.totalFee),
    submissionTime: EMPTY_VALUE,
    status,
    notes: formatTextValue(appeal.decision?.finalDecisionNote),
    attachments: [],
    relatedViolation: {
      violationNo,
      status: mapViolationStatus(detail.status),
      violationType: formatTextValue(detail.violationType),
      violator: formatTextValue(appeal.violatorName),
    },
    communications: [],
  };
};

export const findAppealableViolation = (
  appealableViolations: AppealableViolationDto[],
  fineReferenceNumber: string,
) => {
  const target = normalizeReferenceValue(fineReferenceNumber);
  return appealableViolations.find(
    (item) => normalizeReferenceValue(item.violationNo) === target,
  );
};

export const findRelatedAppealRecord = (
  appeals: AppealRecord[],
  fineReferenceNumber: string,
) => {
  const target = normalizeReferenceValue(fineReferenceNumber);
  return appeals.find((item) => normalizeReferenceValue(item.violationNo) === target);
};

export const isAppealDecisionVisible = (violation: ViolationRecord) =>
  Boolean(
    violation.hasAppeal &&
      violation.appealSummary &&
      ["approved", "rejected", "cancelled"].includes(violation.appealSummary.status),
  );

export const getReportedTagClassName = (item: ReportedViolationItem) => {
  const normalized = `${item.tag} ${item.severity ?? ""}`.toLowerCase();
  if (normalized.includes("warning")) return "is-warning";
  if (normalized.includes("degree") || normalized.includes("aed") || item.amount) return "is-amount";
  if (normalized.includes("medium")) return "is-medium";
  return "is-neutral";
};
