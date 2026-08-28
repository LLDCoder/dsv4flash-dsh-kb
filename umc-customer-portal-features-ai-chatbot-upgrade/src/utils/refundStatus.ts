export type RefundStatusKey =
  | "under_review"
  | "pending_refund"
  | "approved"
  | "rejected"
  | "refunded"
  | "cancelled"
  | "unknown";

type RefundTagClass =
  | "warn"
  | "success"
  | "error"
  | "cancelled"
  | "info";

interface ResolveRefundStatusArgs {
  statusId?: number | null;
  statusName?: string | null;
  statusObjName?: string | null;
}

const REFUND_STATUS_LABELS: Record<RefundStatusKey, string> = {
  under_review: "Under Review",
  pending_refund: "Pending Refund",
  approved: "Pending Refund",
  rejected: "Rejected",
  refunded: "Refunded",
  cancelled: "Cancelled",
  unknown: "Unknown",
};

const REFUND_STATUS_TAG_CLASSES: Record<RefundStatusKey, RefundTagClass> = {
  under_review: "warn",
  pending_refund: "warn",
  approved: "warn",
  rejected: "error",
  refunded: "success",
  cancelled: "cancelled",
  unknown: "info",
};

const normalizeText = (value?: string | null) => String(value ?? "").trim();

const resolveRefundStatusKeyFromText = (value?: string | null) => {
  const normalizedStatus = normalizeText(value).toLowerCase();
  if (!normalizedStatus) {
    return null;
  }

  if (normalizedStatus.includes("under review")) {
    return "under_review" as const;
  }

  if (normalizedStatus.includes("pending refund")) {
    return "pending_refund" as const;
  }

  if (normalizedStatus.includes("approve")) {
    return "approved" as const;
  }

  if (normalizedStatus.includes("reject")) {
    return "rejected" as const;
  }

  if (normalizedStatus.includes("refunded")) {
    return "refunded" as const;
  }

  if (normalizedStatus.includes("cancel")) {
    return "cancelled" as const;
  }

  return null;
};

const resolveRefundStatusKeyFromId = (statusId?: number | null) => {
  switch (statusId) {
    case 1:
      return "under_review" as const;
    case 2:
    case 3:
      return "under_review" as const;
    case 4:
      return "approved" as const;
    case 5:
      return "rejected" as const;
    case 6:
      return "refunded" as const;
    case 7:
      return "cancelled" as const;
    default:
      return "unknown" as const;
  }
};

const isAuthoritativeRefundStatusKey = (key: RefundStatusKey) => {
  return (
    key === "approved" ||
    key === "rejected" ||
    key === "refunded" ||
    key === "cancelled"
  );
};

export const resolveRefundStatus = ({
  statusId,
  statusName,
  statusObjName,
}: ResolveRefundStatusArgs) => {
  const keyFromId = resolveRefundStatusKeyFromId(statusId);
  if (isAuthoritativeRefundStatusKey(keyFromId)) {
    return {
      key: keyFromId,
      label: REFUND_STATUS_LABELS[keyFromId],
      tagClassName: REFUND_STATUS_TAG_CLASSES[keyFromId],
    };
  }

  const textCandidates = [statusObjName, statusName];

  for (const candidate of textCandidates) {
    const keyFromText = resolveRefundStatusKeyFromText(candidate);
    if (keyFromText) {
      return {
        key: keyFromText,
        label: REFUND_STATUS_LABELS[keyFromText],
        tagClassName: REFUND_STATUS_TAG_CLASSES[keyFromText],
      };
    }
  }

  const key = keyFromId;
  const fallbackText = normalizeText(statusObjName) || normalizeText(statusName);

  return {
    key,
    label: key === "unknown" && fallbackText ? fallbackText : REFUND_STATUS_LABELS[key],
    tagClassName: REFUND_STATUS_TAG_CLASSES[key],
  };
};
