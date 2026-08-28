import type { RefObject } from "react";
import type { FormInstance } from "antd/lib/form";
import type {
  OcrDocumentType,
  OcrEditableFieldKey,
  OcrPreviewFileType,
  OcrResultFieldConfig,
} from "../../type";

export type OcrResultFormValues = Partial<Record<OcrEditableFieldKey, unknown>>;

export interface EntryStepProps {
  documentLabel: string;
  entryTitle: string;
  entryNote: string;
  documentPreviewImage: string;
  cameraButtonText: string;
  uploadButtonText: string;
  orText: string;
  canInteract: boolean;
  uploadLoading: boolean;
  cameraLoading: boolean;
  onStartCamera: () => void;
  onChooseFile: () => void;
}

export interface ScanStepProps {
  stageLabel: string;
  scanTitle: string;
  description: string;
  cancelText: string;
  captureText: string;
  captureLoading: boolean;
  capturedPreviewUrl: string;
  disabled: boolean;
  useMockPreview?: boolean;
  onCancel: () => void;
  onCapture: () => void;
  videoRef: RefObject<HTMLVideoElement>;
  frameVideoRef: RefObject<HTMLVideoElement>;
}

export interface ErrorStepProps {
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
}

export interface OcrNationalityOption {
  label: string;
  value: number;
}

export interface ResultStepProps {
  documentType: OcrDocumentType;
  documentLabel: string;
  previewUrl: string;
  previewFileName: string;
  previewFileType: OcrPreviewFileType;
  fallbackPreviewImage: string;
  warnings: string[];
  form: FormInstance<OcrResultFormValues>;
  fieldConfigs: OcrResultFieldConfig[];
  nationalityOptions: OcrNationalityOption[];
  nationalityLoading: boolean;
  isApplyingResult: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  cancelText: string;
}
