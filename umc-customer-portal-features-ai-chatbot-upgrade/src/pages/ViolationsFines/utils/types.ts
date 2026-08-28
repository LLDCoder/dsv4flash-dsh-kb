import type { Moment } from "moment";

export type DateRange = [Moment, Moment] | null;

export interface SubmitAppealValues {
  violationId?: number;
  reasonId?: number;
  remark?: string;
}

export interface UploadRequestOptions {
  file: File;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

export type ModuleTabKey = "violations" | "appeals";

export type DetailTabKey = "decision" | "reported";

export interface PayNowViolationState {
  fineReferenceNumber: string;
  violationNo?: string;
  fineAmount?: number | null;
  totalFee?: number | null;
  violationType?: string;
}

export interface ModuleLocationState {
  activeTab?: ModuleTabKey;
  payNowViolation?: PayNowViolationState;
}
