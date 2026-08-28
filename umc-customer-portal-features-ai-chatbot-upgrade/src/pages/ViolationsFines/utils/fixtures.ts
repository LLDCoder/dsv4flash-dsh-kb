export type ViolationStatus =
  | "warningIssued"
  | "pendingPayment"
  | "paid"
  | "underAppeal"
  | "cancelled";

export type AppealStatus =
  | "processing"
  | "underReview"
  | "approved"
  | "rejected"
  | "cancelled";

export interface AttachmentItem {
  name: string;
  url: string;
}

export interface FineDetailItem {
  id: string;
  violation: string;
  count: string;
  amount: number | null;
  afterAppealStatus?: string;
  sourceItemId?: string | number | null;
  sourceIndex?: number;
}

export interface ReportedViolationItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  amount?: number | null;
  severity?: string;
  oldDegree?: number | string | null;
  newDegree?: number | string | null;
  appealResult?: number | string | null;
  appealResultName?: string;
  sourceItemId?: string | number | null;
  sourceIndex?: number;
  attachments: AttachmentItem[];
}

export interface AppealSummary {
  id: number;
  appealNo: string;
  appealReason: string;
  profileName: string;
  status: AppealStatus;
}

export interface ViolationRecord {
  id: string;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  fineReferenceNumber: string;
  appealViolationId?: number;
  violationTypeId?: number;
  statusId?: number;
  violationNo: string;
  violationType: string;
  violator: string;
  fineAmount: number | null;
  issuedTime: string;
  status: ViolationStatus;
  hasAppeal: boolean;
  canAppeal: boolean;
  canPay: boolean;
  canDownloadReceipt: boolean;
  receiptTransactionNo?: string;
  receiptNo?: string;
  reportedViolations: ReportedViolationItem[];
  fineDetails: FineDetailItem[];
  totalFee: number;
  appealSummary?: AppealSummary;
}

export interface AppealDictionaryOption {
  id: number;
  label: string;
  code?: string;
  sort?: number | null;
  nameEn?: string | null;
  nameAr?: string | null;
}

export type AppealReasonOption = AppealDictionaryOption;

export interface AppealCommunication {
  id: number;
  senderType: "Customer" | "Agent" | "System";
  senderName: string;
  body: string;
  createdOn: string;
  attachments: AttachmentItem[];
}

export interface AppealRecord {
  id: number;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  appealNo: string;
  appealReasonId: number;
  appealReason: string;
  violationId: number;
  violationNo: string;
  fineAmount: number | null;
  submissionTime: string;
  status: AppealStatus;
  notes: string;
  attachments: AttachmentItem[];
  relatedViolation: {
    violationNo: string;
    status: ViolationStatus;
    violationType: string;
    violator: string;
  };
  resultBanner?: {
    title: string;
    note: string;
    decidedOn: string;
    attachments: AttachmentItem[];
  };
  communications: AppealCommunication[];
}

export const VIOLATION_STATUS_LABEL: Record<ViolationStatus, string> = {
  warningIssued: "Warning Issued",
  pendingPayment: "Pending Payment",
  paid: "Paid",
  underAppeal: "Under Appeal",
  cancelled: "Cancelled",
};

export const APPEAL_STATUS_LABEL: Record<AppealStatus, string> = {
  processing: "Processing",
  underReview: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const VIOLATION_STATUS_ID: Record<ViolationStatus, number> = {
  warningIssued: 1,
  pendingPayment: 7,
  underAppeal: 8,
  paid: 9,
  cancelled: 10,
};

export const APPEAL_STATUS_ID: Record<AppealStatus, number> = {
  processing: 0,
  underReview: 1,
  approved: 6,
  rejected: 7,
  cancelled: 8,
};
