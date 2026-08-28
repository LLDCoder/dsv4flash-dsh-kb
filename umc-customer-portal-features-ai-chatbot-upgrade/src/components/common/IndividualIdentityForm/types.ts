import type { ReactNode } from "react";
import type { Moment } from "moment";
import type { FormInstance } from "antd/lib/form";
import type { NationalityInfo } from "@/services/userProfile";
import type {
  OcrApplyPayload,
  OcrDocumentType,
  OcrPreviewFileType,
} from "@/components/common/ocr";
import type {
  IndividualIdentityFieldName,
  VerificationMethod,
} from "@/utils/individualIdentity";

export interface DocumentFieldFlags {
  hasDelete: boolean;
  hasDownload: boolean;
  disabled: boolean;
}

export interface DocumentExpiryFlags {
  isExpiry?: boolean;
  isLess30?: boolean;
  expiryDays?: number;
  isUnderReview?: boolean;
}

export type IndividualIdentitySection = "verification" | "demographics" | "documents";
export type VerificationOptionValue = VerificationMethod | string;

export interface VerificationOption {
  label: ReactNode;
  value: VerificationOptionValue;
  disabled?: boolean;
}

export interface IndividualIdentityOcrApplyContext {
  documentType: OcrDocumentType;
  previewFileType: OcrPreviewFileType;
  verificationMethod: VerificationMethod;
}

export interface IndividualIdentityOcrApplyResult {
  rawPayload: OcrApplyPayload;
  mappedPayload: Record<string, unknown>;
  context: IndividualIdentityOcrApplyContext;
}

export type IndividualIdentityOcrPayloadMapper = (
  payload: OcrApplyPayload,
  context: IndividualIdentityOcrApplyContext,
) => Record<string, unknown> | null | undefined;

export interface IndividualIdentityFormProps {
  form: FormInstance;
  verificationMethod: VerificationMethod;
  layout: "profile" | "modal";
  sections?: IndividualIdentitySection[];
  showExtendedFields: boolean;
  nationalityList: NationalityInfo[];
  loadingNationalities?: boolean;
  verificationLoading?: boolean;
  enableVerificationLookup?: boolean;
  allowReadonlyVerificationSearch?: boolean;
  hiddenVerificationSearchMethods?: VerificationMethod[];
  icpReadonlyFieldNames: string[];
  verificationOptions?: VerificationOption[];
  selectedVerificationOption?: VerificationOptionValue;
  ocrEnabledMethods?: VerificationMethod[];
  ocrNationalityList?: NationalityInfo[];
  mapOcrApplyPayload?: IndividualIdentityOcrPayloadMapper;
  isFieldDisabled: (field: IndividualIdentityFieldName) => boolean;
  isVerificationMethodOptionDisabled?: (method: VerificationMethod) => boolean;
  onVerificationMethodChange: (method: VerificationMethod) => void;
  onVerificationOptionChange?: (value: VerificationOptionValue) => void;
  onVerificationBlur: () => void;
  onOcrApply?: (result?: IndividualIdentityOcrApplyResult) => void;
  onDateOfBirthChange?: () => void;
  isAr?: boolean;
  verifyMethodLabel?: "howToVerify" | "verificationMethod";
  documentFileNames?: Partial<Record<IndividualIdentityFieldName, string>>;
  getDocumentFieldFlags?: (
    field: IndividualIdentityFieldName,
    expiry?: DocumentExpiryFlags,
  ) => DocumentFieldFlags;
  documentExpiry?: {
    emiratesIdUrl?: DocumentExpiryFlags;
    passportUrl?: DocumentExpiryFlags;
    visaUrl?: DocumentExpiryFlags;
    passportScanUrl?: DocumentExpiryFlags;
    personalPhotoUrl?: DocumentExpiryFlags;
  };
  emiratesIdExpiryDisabledDate?: (current?: Moment) => boolean;
  passportExpiryDisabledDate?: (current?: Moment) => boolean;
  visaExpiryDisabledDate?: (current?: Moment) => boolean;
}

export const DEFAULT_INDIVIDUAL_IDENTITY_SECTIONS: IndividualIdentitySection[] = [
  "verification",
  "demographics",
  "documents",
];
