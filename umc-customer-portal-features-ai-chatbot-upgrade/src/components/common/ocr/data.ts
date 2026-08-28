import moment from "moment";
import EidCardImage from "@/assets/images/ocr/pic_card_eid.png";
import PassportCardImage from "@/assets/images/ocr/pic_card_passport.png";
import type { OcrExtractResponse } from "@/services/media";
import type {
  OcrApplyPayload,
  OcrDocumentConfig,
  OcrDocumentType,
  OcrResolvedResult,
} from "./type";

const OCR_EXAMPLE_IMAGE_MAP: Record<OcrDocumentType, string> = {
  emiratesId: EidCardImage,
  passport: PassportCardImage,
};

export const OCR_DOCUMENT_CONFIG: Record<OcrDocumentType, OcrDocumentConfig> = {
  emiratesId: {
    apiDocumentType: "emirates-id",
    uploadAccept: ".pdf",
    uploadExtensions: [".pdf"],
    uploadMimeTypes: ["application/pdf"],
    maxFileSizeMb: 5,
    invalidFileTypeMessageKey: "individualIdentity.validation.validPdf",
    entryTitleKey: "ocr.entry.emiratesIdTitle",
    scanTitleKey: "ocr.scan.emiratesIdTitle",
    entryNoteKey: "ocr.entry.emiratesIdNote",
    documentFieldName: "emiratesIdUrl",
    resultFields: [
      {
        key: "dateOfBirth",
        kind: "date",
        labelKey: "individualIdentity.fields.dateOfBirth",
        placeholderKey: "individualIdentity.placeholders.datePicker",
        required: true,
      },
      {
        key: "emiratesId",
        kind: "text",
        labelKey: "individualIdentity.fields.emiratesId",
        placeholderKey: "individualIdentity.placeholders.emiratesIdMask",
        required: true,
      },
    ],
  },
  passport: {
    apiDocumentType: "passport",
    uploadAccept: ".pdf",
    uploadExtensions: [".pdf"],
    uploadMimeTypes: ["application/pdf"],
    maxFileSizeMb: 5,
    invalidFileTypeMessageKey: "individualIdentity.validation.validPdf",
    entryTitleKey: "ocr.entry.passportTitle",
    scanTitleKey: "ocr.scan.passportTitle",
    entryNoteKey: "ocr.entry.emiratesIdNote",
    documentFieldName: "passportScanUrl",
    resultFields: [
      {
        key: "dateOfBirth",
        kind: "date",
        labelKey: "individualIdentity.fields.dateOfBirth",
        placeholderKey: "individualIdentity.placeholders.datePicker",
        required: true,
      },
      {
        key: "passportNumber",
        kind: "text",
        labelKey: "individualIdentity.fields.passportNumber",
        placeholderKey: "individualIdentity.placeholders.enterPassport",
        required: true,
      },
      {
        key: "fullNameEn",
        kind: "text",
        labelKey: "individualIdentity.fields.fullNameEnglish",
        placeholderKey: "individualIdentity.placeholders.enterFullName",
        required: true,
      },
      {
        key: "nationalityId",
        kind: "nationality",
        labelKey: "individualIdentity.fields.nationality",
        placeholderKey: "individualIdentity.placeholders.selectNationality",
        required: true,
      },
      {
        key: "gender",
        kind: "gender",
        labelKey: "individualIdentity.fields.gender",
        placeholderKey: "individualIdentity.placeholders.selectGender",
        required: true,
      },
      {
        key: "passportExpiryDate",
        kind: "date",
        labelKey: "individualIdentity.fields.passportExpiryDate",
        placeholderKey: "individualIdentity.placeholders.datePicker",
        required: true,
      },
    ],
  },
};

const toMomentOrNull = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const parsedDate = moment(value);
  return parsedDate.isValid() ? parsedDate : null;
};

const toOptionalString = (value: string | null | undefined) => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || undefined;
};

const toOptionalPositiveNumber = (value: number | null | undefined) => {
  return typeof value === "number" && value > 0 ? value : undefined;
};

export const getOcrExampleImage = (documentType: OcrDocumentType): string =>
  OCR_EXAMPLE_IMAGE_MAP[documentType];

export const buildOcrResolvedResult = (
  documentType: OcrDocumentType,
  response: OcrExtractResponse,
  uploadedObjectName: string,
): OcrResolvedResult => {
  const documentConfig = OCR_DOCUMENT_CONFIG[documentType];
  const basePayload: OcrApplyPayload = {
    dateOfBirth: toMomentOrNull(response.dateOfBirth),
    fullNameEn: toOptionalString(response.fullNameEn),
    fullNameAr: toOptionalString(response.fullNameAr),
    nationalityId: toOptionalPositiveNumber(response.nationalityId),
    gender: toOptionalPositiveNumber(response.genderId),
    eidDocumentOrPassPortSacnUrl: uploadedObjectName,
  };

  if (documentType === "emiratesId") {
    return {
      documentType,
      apiDocumentType: documentConfig.apiDocumentType,
      payload: {
        ...basePayload,
        emiratesId: toOptionalString(response.emiratesId),
        emiratesIdExpiryDate: toMomentOrNull(response.expiryDate),
        emiratesIdUrl: uploadedObjectName,
      },
      response,
      uploadedObjectName,
      warnings: Array.isArray(response.warnings)
        ? response.warnings.filter(Boolean)
        : [],
      confidence:
        typeof response.confidence === "number" ? response.confidence : null,
    };
  }

  return {
    documentType,
    apiDocumentType: documentConfig.apiDocumentType,
    payload: {
      ...basePayload,
      passportNumber: toOptionalString(response.passportNumber),
      passportExpiryDate: toMomentOrNull(response.passportExpiryDate),
      passportScanUrl: uploadedObjectName,
    },
    response,
    uploadedObjectName,
    warnings: Array.isArray(response.warnings)
      ? response.warnings.filter(Boolean)
      : [],
    confidence: typeof response.confidence === "number" ? response.confidence : null,
  };
};
