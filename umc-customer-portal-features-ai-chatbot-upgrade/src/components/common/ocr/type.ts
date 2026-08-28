import type {
  OcrApiDocumentType,
  OcrExtractResponse,
} from "@/services/media";
import type { NationalityInfo } from "@/services/userProfile";
import type { IndividualIdentityFormValues } from "@/utils/individualIdentity";

export type OcrDocumentType = "emiratesId" | "passport";

export type OcrStep = "entry" | "scan" | "result" | "error";

export type OcrCaptureSource = "camera" | "upload";

export type OcrErrorType = "cameraUnavailable";

export type OcrPreviewFileType = "image" | "pdf" | "unknown";

export interface OcrApplyContext {
  previewFileType: OcrPreviewFileType;
}

export type OcrEditableFieldKey =
  | "dateOfBirth"
  | "emiratesId"
  | "passportNumber"
  | "passportExpiryDate"
  | "fullNameEn"
  | "nationalityId"
  | "gender";

export type OcrEditableFieldKind = "text" | "date" | "nationality" | "gender";

export type OcrApplyPayload = Partial<IndividualIdentityFormValues> & {
  eidDocumentOrPassPortSacnUrl?: string;
};

export interface OcrResultFieldConfig {
  key: OcrEditableFieldKey;
  kind: OcrEditableFieldKind;
  labelKey: string;
  placeholderKey?: string;
  required?: boolean;
}

export interface OcrDocumentConfig {
  apiDocumentType: OcrApiDocumentType;
  uploadAccept: string;
  uploadExtensions: string[];
  uploadMimeTypes: string[];
  maxFileSizeMb: number;
  invalidFileTypeMessageKey: string;
  entryTitleKey: string;
  scanTitleKey: string;
  entryNoteKey: string;
  documentFieldName: "emiratesIdUrl" | "passportScanUrl";
  resultFields: OcrResultFieldConfig[];
}

export interface OcrResolvedResult {
  documentType: OcrDocumentType;
  apiDocumentType: OcrApiDocumentType;
  payload: OcrApplyPayload;
  response: OcrExtractResponse;
  uploadedObjectName: string;
  warnings: string[];
  confidence: number | null;
}

export interface OcrTriggerProps {
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}

export interface OcrModalProps {
  visible: boolean;
  documentType: OcrDocumentType;
  nationalityList?: NationalityInfo[];
  onApply: (payload: OcrApplyPayload, context: OcrApplyContext) => void;
  onClose: () => void;
}
