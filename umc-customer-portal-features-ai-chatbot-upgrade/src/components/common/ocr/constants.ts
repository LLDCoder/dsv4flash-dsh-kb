import {
  VERIFICATION_METHOD,
  type VerificationMethod,
} from "@/utils/individualIdentity";
import type { OcrCaptureSource, OcrDocumentType, OcrStep } from "./type";

export const OCR_STEP: Record<Uppercase<OcrStep>, OcrStep> = {
  ENTRY: "entry",
  SCAN: "scan",
  RESULT: "result",
  ERROR: "error",
};

export const OCR_CAPTURE_SOURCE: Record<
  Uppercase<OcrCaptureSource>,
  OcrCaptureSource
> = {
  CAMERA: "camera",
  UPLOAD: "upload",
};

export const OCR_DOCUMENT_TYPE: Record<
  "EMIRATES_ID" | "PASSPORT",
  OcrDocumentType
> = {
  EMIRATES_ID: "emiratesId",
  PASSPORT: "passport",
};

export const OCR_USE_REAL_CAMERA =
  import.meta.env.VITE_OCR_USE_REAL_CAMERA !== "false";

export const OCR_DOCUMENT_TYPE_BY_METHOD: Partial<
  Record<VerificationMethod, OcrDocumentType>
> = {
  [VERIFICATION_METHOD.EMIRATES_ID]: OCR_DOCUMENT_TYPE.EMIRATES_ID,
  [VERIFICATION_METHOD.PASSPORT]: OCR_DOCUMENT_TYPE.PASSPORT,
};
