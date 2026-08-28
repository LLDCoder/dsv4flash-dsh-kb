import "./index.less";
import { useTranslation } from "react-i18next";
import { resolveRefundStatus } from "@/utils/refundStatus";
import {
  getMyRequestStatusTagClass,
  resolveMyRequestStatusLabelKey,
  type MyRequestStatusKey,
  resolveMyRequestStatus,
} from "@/utils/myRequestApproval";

type StatusType =
  | "refund"
  | "wallet"
  | "application"
  | "transaction"
  | "equiry"
  | "app"
  | "myRequest"
  | "violation"
  | "appeal";
interface TagProps {
  status: number | string;
  type?: StatusType;
  myRequestStatusKey?: MyRequestStatusKey;
  myRequestStatusNameEn?: string | null;
  myRequestStatusNameAr?: string | null;
}
interface StatusItem {
  textEn: string;
  className:
    | "warn"
    | "error"
    | "success"
    | "info"
    | "alert"
    | "cancelled"
    | "resolved"
    | "fill-error";
}
type StatusEnum = Record<StatusType, Record<number, StatusItem>>;

const STATUS_ENUM: StatusEnum = {
  refund: {
    1: { textEn: "Under Review", className: "warn" },
    2: { textEn: "Under Review", className: "warn" },
    3: { textEn: "Under Review", className: "warn" },
    4: { textEn: "Pending Refund", className: "warn" },
    5: { textEn: "Rejected", className: "error" },
    6: { textEn: "Refunded", className: "success" },
    7: { textEn: "Cancelled", className: "cancelled" },
  },
  wallet: {
    1: { textEn: "Pending", className: "warn" },
    2: { textEn: "Processing", className: "info" },
    3: { textEn: "Completed", className: "success" },
    4: { textEn: "Failed", className: "error" },
    5: { textEn: "Pending Completed", className: "success" },
    6: { textEn: "Refund in Progress", className: "info" },
    7: { textEn: "Refund Completed", className: "success" },
  },
  application: {
    1: { textEn: "Cancelled", className: "info" },
    2: { textEn: "Completed", className: "success" },
    3: { textEn: "Failed", className: "error" },
    4: { textEn: "Active", className: "success" },
    5: { textEn: "Paid", className: "success" },
  },
  app: {
    101: { textEn: "Draft", className: "info" },
    102: { textEn: "Under Review", className: "info" },
    103: { textEn: "Pending Payment", className: "info" },
    104: { textEn: "Pending Modification", className: "info" },
    105: { textEn: "Completed", className: "success" },
    106: { textEn: "Rejected", className: "error" },
    107: { textEn: "Cancelled", className: "info" },
    100: { textEn: "All Statuses", className: "info" },
  },
  transaction: {
    1: { textEn: "Pending", className: "info" },
    2: { textEn: "Processing", className: "success" },
    3: { textEn: "Completed", className: "success" },
    4: { textEn: "Failed", className: "error" },
    5: { textEn: "Pending Completed", className: "success" },
    6: { textEn: "Refund in Progress", className: "warn" },
    7: { textEn: "Refund Completed", className: "success" },
  },
  equiry: {
    0: { textEn: "Under Processing", className: "warn" },
    1: { textEn: "Open", className: "warn" },
    2: { textEn: "Pending Customer", className: "warn" },
    3: { textEn: "Department Processing", className: "info" },
    4: { textEn: "Department Processed", className: "info" },
    5: { textEn: "Resolved", className: "resolved" },
    6: { textEn: "Completed", className: "success" },
    7: { textEn: "Cancelled", className: "info" },
  },
  myRequest: {
    100: { textEn: "All Statuses", className: "info" },
    101: { textEn: "Draft", className: "cancelled" },
    102: { textEn: "Under Review", className: "resolved" },
    103: { textEn: "Pending Payment", className: "warn" },
    104: { textEn: "Pending Modification", className: "alert" },
    105: { textEn: "Completed", className: "success" },
    106: { textEn: "Rejected", className: "error" },
    107: { textEn: "Cancelled", className: "cancelled" },
    108: { textEn: "Pending Disposition", className: "resolved" },
    109: { textEn: "Disposition Verification", className: "info" },
  },
  violation: {
    1: { textEn: "Warning Issued", className: "resolved" },
    7: { textEn: "Pending Payment", className: "alert" },
    8: { textEn: "Under Appeal", className: "warn" },
    9: { textEn: "Paid", className: "success" },
    10: { textEn: "Cancelled", className: "cancelled" },
  },
  appeal: {
    0: { textEn: "Processing", className: "warn" },
    1: { textEn: "Under Review", className: "warn" },
    2: { textEn: "Approved", className: "success" },
    3: { textEn: "Rejected", className: "error" },
    4: { textEn: "Cancelled", className: "cancelled" },
    6: { textEn: "Approved", className: "success" },
    7: { textEn: "Rejected", className: "error" },
    8: { textEn: "Cancelled", className: "cancelled" },
  },
};

const getStatusTagClassName = (className?: StatusItem["className"]) =>
  `custom-status-tag custom-status-tag--${className ?? "info"}`;

const normalizeStatusLabel = (value?: string) =>
  value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

function resolveStatusItem(
  type: Exclude<StatusType, "refund" | "myRequest">,
  status: number | string,
) {
  const normalizedStatus = typeof status === "string" ? status.trim() : status;
  const numericStatus =
    typeof normalizedStatus === "number"
      ? normalizedStatus
      : Number.isNaN(Number(normalizedStatus))
        ? undefined
        : Number(normalizedStatus);

  const entries = Object.entries(STATUS_ENUM[type] ?? {});

  if (numericStatus !== undefined) {
    return {
      numericStatus,
      statusItem: STATUS_ENUM[type]?.[numericStatus],
    };
  }

  if (typeof normalizedStatus !== "string" || !normalizedStatus) {
    return {
      numericStatus: undefined,
      statusItem: undefined,
    };
  }

  const matchedEntry = entries.find(([, item]) => {
    return normalizeStatusLabel(item.textEn) === normalizeStatusLabel(normalizedStatus);
  });

  return {
    numericStatus: matchedEntry ? Number(matchedEntry[0]) : undefined,
    statusItem: matchedEntry?.[1],
  };
}

const CustomStatusTag = ({
  status,
  type = "refund",
  myRequestStatusKey,
  myRequestStatusNameEn,
  myRequestStatusNameAr,
}: TagProps) => {
  const { t, i18n } = useTranslation();

  if (type === "refund") {
    const normalizedStatus = typeof status === "string" ? status?.trim() : status;
    const statusId =
      typeof normalizedStatus === "number"
        ? normalizedStatus
        : Number.isNaN(Number(normalizedStatus))
          ? undefined
          : Number(normalizedStatus);

    const resolved = resolveRefundStatus({
      statusId,
      statusName:
        typeof normalizedStatus === "string" ? normalizedStatus : undefined,
    });

    const label = t(`refundPage.refundStatus.${resolved.key}`);

    return (
      <div className={getStatusTagClassName(resolved.tagClassName)}>{label}</div>
    );
  }

  if (type === "myRequest") {
    const normalizedStatus = typeof status === "string" ? status?.trim() : status;
    const numericStatus =
      typeof normalizedStatus === "number"
        ? normalizedStatus
        : Number.isNaN(Number(normalizedStatus))
          ? undefined
          : Number(normalizedStatus);
    const statusKey =
      myRequestStatusKey ||
      resolveMyRequestStatus({
        statusId: numericStatus,
        statusName: myRequestStatusNameEn ||
          (typeof normalizedStatus === "string" ? normalizedStatus : undefined),
      });
    const statusLabelKey = resolveMyRequestStatusLabelKey(
      statusKey,
      myRequestStatusNameEn,
    );
    const hasDispositionVariant = statusLabelKey !== statusKey;
    const isArabic = i18n.language?.toLowerCase().startsWith("ar");
    const fallbackStatusName =
      typeof normalizedStatus === "string" ? normalizedStatus : undefined;
    const localizedStatusName = isArabic
      ? myRequestStatusNameAr?.trim() ||
        myRequestStatusNameEn?.trim() ||
        fallbackStatusName?.trim()
      : myRequestStatusNameEn?.trim() ||
        myRequestStatusNameAr?.trim() ||
        fallbackStatusName?.trim();
    const translatedLabel = t(`customStatusTag.myRequest.${statusLabelKey}`);
    const displayLabel =
      (hasDispositionVariant || statusKey === "unknown") &&
      localizedStatusName
        ? localizedStatusName
        : translatedLabel;

    return (
      <div className={getStatusTagClassName(getMyRequestStatusTagClass(statusKey))}>
        {displayLabel}
      </div>
    );
  }

  const { numericStatus, statusItem } = resolveStatusItem(
    type as Exclude<StatusType, "refund" | "myRequest">,
    status,
  );
  const translateKnownStatus = () => {
    switch (type) {
      case "wallet":
        return t(`customStatusTag.wallet.${numericStatus}`);
      case "application":
        return t(`customStatusTag.application.${numericStatus}`);
      case "transaction":
        return t(`customStatusTag.transaction.${numericStatus}`);
      case "equiry":
        return t(`customStatusTag.equiry.${numericStatus}`);
      case "app":
        return t(`customStatusTag.app.${numericStatus}`);
      case "violation":
        return t(`customStatusTag.violation.${numericStatus}`);
      case "appeal":
        return t(`customStatusTag.appeal.${numericStatus}`);
      default:
        return t("customStatusTag.unknown");
    }
  };
  const displayText =
    numericStatus !== undefined && statusItem
      ? translateKnownStatus()
      : t("customStatusTag.unknown");

  return (
    <div className={getStatusTagClassName(statusItem?.className)}>
      {displayText}
    </div>
  );
};

export default CustomStatusTag;
