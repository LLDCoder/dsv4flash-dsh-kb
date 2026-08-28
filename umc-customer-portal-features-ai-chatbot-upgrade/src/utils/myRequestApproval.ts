export type MyRequestStatusKey =
  | "allStatuses"
  | "draft"
  | "underReview"
  | "pendingPayment"
  | "pendingModification"
  | "pendingDisposition"
  | "underVerification"
  | "completed"
  | "rejected"
  | "cancelled"
  | "unknown";

export type MyRequestStatusLabelKey =
  | MyRequestStatusKey
  | "completedDispositionVerified"
  | "completedDispositionNotVerified"
  | "rejectedDispositionVerified"
  | "rejectedDispositionNotVerified";

export type MyRequestActionKey =
  | "details"
  | "edit"
  | "delete"
  | "payNow"
  | "cancel"
  | "duplicate"
  | "viewDocument"
  | "downloadReceipt"
  | "submitProof";

export interface MyRequestActionConfig {
  key: MyRequestActionKey;
  label: string;
  variant?: "primary" | "outline" | "text" | "danger-outline";
  pendingBackend?: boolean;
}

export interface MyRequestStatusInput {
  statusId?: number | string | null;
  statusName?: string | null;
  serviceCode?: string | null;
  isContentService?: boolean;
  orderAmount?: number | string | null;
  amount?: number | string | null;
  overridePendingPaymentAsUnderReview?: boolean;
  forcePaymentFirstTimelineFlow?: boolean;
}

export type MyRequestTimelineStageKey =
  | "submitted"
  | "underReview"
  | "approvalGranted"
  | "pendingPayment"
  | "documentIssuance"
  | "rejected"
  | "cancelled";

export type MyRequestTimelineStageState =
  | "completed"
  | "active"
  | "pending"
  | "error";

export interface MyRequestTimelineStage {
  key: MyRequestTimelineStageKey;
  label: string;
  state: MyRequestTimelineStageState;
}

export const MY_REQUEST_TIMELINE_I18N_KEY_PREFIX =
  "myRequestsPage.detail.timeline.stages.";

const STATUS_BY_ID: Record<number, MyRequestStatusKey> = {
  100: "allStatuses",
  101: "draft",
  102: "underReview",
  103: "pendingPayment",
  104: "pendingModification",
  105: "completed",
  106: "rejected",
  107: "cancelled",
  108: "pendingDisposition",
  109: "underVerification",
};

const STATUS_LABELS: Record<MyRequestStatusLabelKey, string> = {
  allStatuses: "All Statuses",
  draft: "Draft",
  underReview: "Under Review",
  pendingPayment: "Pending Payment",
  pendingModification: "Pending Modification",
  pendingDisposition: "Pending Disposition",
  underVerification: "Disposition Verification",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  unknown: "Unknown",
  completedDispositionVerified: "Completed (Disposition Verified)",
  completedDispositionNotVerified: "Completed (Disposition Not Verified)",
  rejectedDispositionVerified: "Rejected (Disposition Verified)",
  rejectedDispositionNotVerified: "Rejected (Disposition Not Verified)",
};

const ACTION_LABELS: Record<MyRequestActionKey, string> = {
  details: "Details",
  edit: "Edit",
  delete: "Delete",
  payNow: "Pay Now",
  cancel: "Cancel",
  duplicate: "Duplicate",
  viewDocument: "View Document",
  downloadReceipt: "Download Receipt",
  submitProof: "Submit Proof",
};

const HIDE_VIEW_DOCUMENT_SERVICE_CODES = new Set(["1901","6"]);

export const isDetailServiceDepartmentResolved = (
  serviceDepartment?: number | null,
) => Number(serviceDepartment ?? 0) > 0;

export const resolveDetailContentService = (
  serviceDepartment?: number | null,
  fallbackIsContentService = false,
) =>
  isDetailServiceDepartmentResolved(serviceDepartment)
    ? serviceDepartment === 2
    : fallbackIsContentService;

const shouldHideViewDocument = (serviceCode?: string | number | null) =>
  HIDE_VIEW_DOCUMENT_SERVICE_CODES.has(String(serviceCode ?? "").trim());

const LICENSE_TIMELINE_FLOW: MyRequestTimelineStageKey[] = [
  "submitted",
  "underReview",
  "approvalGranted",
  "pendingPayment",
  "documentIssuance",
];

const CONTENT_TIMELINE_FLOW: MyRequestTimelineStageKey[] = [
  "submitted",
  "pendingPayment",
  "underReview",
  "approvalGranted",
  "documentIssuance",
];

const APPROVE_THEN_PAY_SERVICE_CODES = new Set([
  "901",
  "8007",
  "8008",
  "8006",
  "8010",
  "23",
  "1201",
  "801",
  "13",
  "1",
  "4",
  "6",
  "1801",
  "7",
  "14",
  "20",
  "902",
  "80021",
  "80022",
  "1204",
  "802",
  "1802",
  "903",
  "1203",
  "803",
  "905",
  "1205",
  "804",
  "906",
  "1206",
  "805",
  "904",
  "80041",
  "80042",
  "1202",
  "806",
]);

const PAY_THEN_APPROVE_SERVICE_CODES = new Set([
  "1901",
  "1902",
  "201",
  "202",
  "203",
  "204",
  "205",
  "301",
  "302",
  "303",
  "304",
  "1003",
  "1004",
  "1011",
  "1007",
  "1006",
  "1005",
  "21",
  "2201",
  "1002",
  "1008",
  "1001",
  "1101",
  "1102",
  "2202",
  "1009",
  "1010",
]);

const normalizeServiceCode = (serviceCode?: string | null) =>
  String(serviceCode ?? "").trim();

const getMyRequestTimelineFlow = ({
  serviceCode,
  isContentService = false,
}: Pick<MyRequestStatusInput, "serviceCode" | "isContentService">) => {
  const normalizedServiceCode = normalizeServiceCode(serviceCode);

  if (APPROVE_THEN_PAY_SERVICE_CODES.has(normalizedServiceCode)) {
    return LICENSE_TIMELINE_FLOW;
  }

  if (PAY_THEN_APPROVE_SERVICE_CODES.has(normalizedServiceCode)) {
    return CONTENT_TIMELINE_FLOW;
  }

  return isContentService ? CONTENT_TIMELINE_FLOW : LICENSE_TIMELINE_FLOW;
};

const buildProgressTimeline = (
  flow: MyRequestTimelineStageKey[],
  activeStage: MyRequestTimelineStageKey,
): MyRequestTimelineStage[] => {
  const activeIndex = Math.max(flow.indexOf(activeStage), 0);

  return flow.map((stageKey, index) => ({
    key: stageKey,
    label: stageKey,
    state:
      index < activeIndex
        ? "completed"
        : index === activeIndex
          ? "active"
          : "pending",
  }));
};

const buildCompletedTimeline = (
  flow: MyRequestTimelineStageKey[],
): MyRequestTimelineStage[] =>
  flow.map((stageKey) => ({
    key: stageKey,
    label: stageKey,
    state: "completed",
  }));

const buildTerminalTimeline = (
  completedStages: MyRequestTimelineStageKey[],
  terminalStage: MyRequestTimelineStageKey,
): MyRequestTimelineStage[] => [
  ...completedStages.map((stageKey) => ({
    key: stageKey,
    label: stageKey,
    state: "completed" as const,
  })),
  {
    key: terminalStage,
    label: terminalStage,
    state: "error",
  },
];

export const normalizeMyRequestStatusName = (statusName?: string | null) =>
  String(statusName ?? "")
    .trim()
    .toLowerCase();

export const resolveMyRequestStatus = ({
  statusId,
  statusName,
}: MyRequestStatusInput): MyRequestStatusKey => {
  const numericStatus =
    typeof statusId === "number"
      ? statusId
      : Number.isNaN(Number(statusId))
        ? undefined
        : Number(statusId);

  if (numericStatus !== undefined && STATUS_BY_ID[numericStatus]) {
    return STATUS_BY_ID[numericStatus];
  }

  const normalizedStatusName = normalizeMyRequestStatusName(statusName);

  if (!normalizedStatusName) {
    return "unknown";
  }

  if (
    normalizedStatusName.includes("pending disposition") ||
    normalizedStatusName.includes("pending proof") ||
    normalizedStatusName.includes("submit proof")
  ) {
    return "pendingDisposition";
  }

  if (
    normalizedStatusName.includes("under verification") ||
    normalizedStatusName.includes("disposition verification") ||
    normalizedStatusName.includes("pending verification")
  ) {
    return "underVerification";
  }

  if (normalizedStatusName.includes("pending modification")) {
    return "pendingModification";
  }

  if (normalizedStatusName.includes("pending payment")) {
    return "pendingPayment";
  }

  if (
    normalizedStatusName.includes("under review") ||
    normalizedStatusName.includes("review")
  ) {
    return "underReview";
  }

  if (normalizedStatusName.includes("draft")) {
    return "draft";
  }

  if (normalizedStatusName.includes("completed")) {
    return "completed";
  }

  if (normalizedStatusName.includes("rejected")) {
    return "rejected";
  }

  if (normalizedStatusName.includes("cancelled")) {
    return "cancelled";
  }

  return "unknown";
};

export const getEffectiveMyRequestStatus = (
  input: MyRequestStatusInput,
): MyRequestStatusKey => {
  const statusKey = resolveMyRequestStatus(input);

  if (
    statusKey === "pendingPayment" &&
    input.overridePendingPaymentAsUnderReview
  ) {
    return "underReview";
  }

  return statusKey;
};

export const getMyRequestStatusLabel = (
  statusKey: MyRequestStatusLabelKey,
  fallback?: string | null,
) => {
  if (statusKey === "unknown") {
    return fallback?.trim() || STATUS_LABELS.unknown;
  }

  return STATUS_LABELS[statusKey];
};

export const resolveMyRequestStatusLabelKey = (
  statusKey: MyRequestStatusKey,
  statusNameEn?: string | null,
): MyRequestStatusLabelKey => {
  const normalizedStatusName = normalizeMyRequestStatusName(statusNameEn);

  if (statusKey === "completed") {
    if (normalizedStatusName.includes("disposition not verified")) {
      return "completedDispositionNotVerified";
    }
    if (normalizedStatusName.includes("disposition verified")) {
      return "completedDispositionVerified";
    }
  }

  if (statusKey === "rejected") {
    if (normalizedStatusName.includes("disposition not verified")) {
      return "rejectedDispositionNotVerified";
    }
    if (normalizedStatusName.includes("disposition verified")) {
      return "rejectedDispositionVerified";
    }
  }

  return statusKey;
};

export const getMyRequestStatusTagClass = (
  statusKey: MyRequestStatusKey,
) => {
  switch (statusKey) {
    case "completed":
      return "success";
    case "rejected":
      return "error";
    case "cancelled":
    case "draft":
      return "cancelled";
    case "underVerification":
      return "resolved";
    case "underReview":
    case "pendingDisposition":
    case "pendingModification":
      return "warn";
    case "pendingPayment":
      return "alert";
    default:
      return "info";
  }
};

export const getMyRequestTimelineStages = (
  input: MyRequestStatusInput,
): MyRequestTimelineStage[] => {
  const statusKey = getEffectiveMyRequestStatus(input);
  const flow = input.forcePaymentFirstTimelineFlow
    ? CONTENT_TIMELINE_FLOW
    : getMyRequestTimelineFlow({
        serviceCode: input.serviceCode,
        isContentService: Boolean(input.isContentService),
      });

  switch (statusKey) {
    case "draft":
      return buildProgressTimeline(flow, "submitted");
    case "pendingPayment":
    case "pendingDisposition":
    case "underVerification":
      return buildProgressTimeline(flow, "pendingPayment");
    case "underReview":
    case "pendingModification":
      return buildProgressTimeline(flow, "underReview");
    case "completed":
      return buildCompletedTimeline(flow);
    case "rejected":
      return buildTerminalTimeline(
        flow === CONTENT_TIMELINE_FLOW
          ? ["submitted", "pendingPayment", "underReview"]
          : ["submitted", "underReview"],
        "rejected",
      );
    case "cancelled":
      return buildTerminalTimeline(["submitted"], "cancelled");
    default:
      return buildProgressTimeline(flow, "submitted");
  }
};

const action = (
  key: MyRequestActionKey,
  variant: MyRequestActionConfig["variant"] = "text",
  pendingBackend = false,
): MyRequestActionConfig => ({
  key,
  label: ACTION_LABELS[key],
  variant,
  pendingBackend,
});

const toAmountNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const filterReceiptActions = (
  actions: MyRequestActionConfig[],
  input: MyRequestStatusInput,
) => {
  const amount = toAmountNumber(input.orderAmount ?? input.amount);
  if (amount !== 0) return actions;
  return actions.filter((item) => item.key !== "downloadReceipt");
};

const filterViewDocumentActions = (
  actions: MyRequestActionConfig[],
  input: MyRequestStatusInput,
) => {
  if (!shouldHideViewDocument(input.serviceCode)) return actions;
  return actions.filter((item) => item.key !== "viewDocument");
};

export const getMyRequestListActions = (
  input: MyRequestStatusInput,
): MyRequestActionConfig[] => {
  const statusKey = getEffectiveMyRequestStatus(input);

  const actions = (() => {
    switch (statusKey) {
    case "draft":
      return [action("edit"), action("delete")];
    case "pendingPayment":
      return [action("payNow"), action("cancel"), action("duplicate")];
    case "pendingModification":
      return input.isContentService
        ? [action("edit"), action("duplicate")]
        : [action("edit"), action("cancel"), action("duplicate")];
    case "underReview":
      return input.isContentService
        ? [action("downloadReceipt"), action("duplicate")]
        : [action("cancel"), action("duplicate")];
    case "pendingDisposition":
      return [action("submitProof", "text", true), action("duplicate")];
    case "underVerification":
      return [action("details")];
    case "completed":
      return [
        action("viewDocument"),
        action("downloadReceipt"),
        action("duplicate"),
      ];
    case "rejected":
      return input.isContentService
        ? [action("downloadReceipt"), action("duplicate")]
        : [action("duplicate")];
    case "cancelled":
      return [action("duplicate")];
    default:
      return [action("details")];
    }
  })();

  return filterReceiptActions(filterViewDocumentActions(actions, input), input);
};

export const getMyRequestCardActions = (
  input: MyRequestStatusInput,
): MyRequestActionConfig[] => {
  const statusKey = getEffectiveMyRequestStatus(input);

  switch (statusKey) {
    case "draft":
      return [action("delete", "text"), action("edit", "primary")];
    case "pendingPayment":
      return [action("details", "text"), action("payNow", "primary")];
    case "pendingModification":
      return [action("delete", "text"), action("edit", "primary")];
    case "underReview":
      return [action("details", "text"), action("cancel", "primary")];
    case "pendingDisposition":
      return [action("submitProof", "primary", true)];
    case "underVerification":
      return [action("details", "primary")];
    default:
      return [action("details", "primary")];
  }
};

export const getMyRequestDetailActions = (
  input: MyRequestStatusInput,
): MyRequestActionConfig[] => {
  const statusKey = getEffectiveMyRequestStatus(input);

  const actions = (() => {
    switch (statusKey) {
    case "draft":
      return [action("edit", "primary"), action("delete", "outline")];
    case "pendingPayment":
      return [
        action("cancel", "danger-outline"),
        action("duplicate", "outline"),
        action("payNow", "primary"),
      ];
    case "pendingModification":
      return input.isContentService
        ? [action("duplicate", "outline"), action("edit", "primary")]
        : [
            action("cancel", "danger-outline"),
            action("duplicate", "outline"),
            action("edit", "primary"),
          ];
    case "underReview":
      return input.isContentService
        ? [action("downloadReceipt", "outline"), action("duplicate", "primary")]
        : [action("cancel", "danger-outline"), action("duplicate", "primary")];
    case "pendingDisposition":
      return [
        action("duplicate", "outline"),
        action("submitProof", "primary", true),
      ];
    case "completed":
      return [
        action("downloadReceipt", "outline"),
        action("duplicate", "outline"),
        action("viewDocument", "primary"),
      ];
    case "rejected":
      return input.isContentService
        ? [action("downloadReceipt", "outline"), action("duplicate", "primary")]
        : [action("duplicate", "primary")];
    case "cancelled":
      return [action("duplicate", "primary")];
    default:
      return [];
    }
  })();

  return filterReceiptActions(filterViewDocumentActions(actions, input), input);
};
