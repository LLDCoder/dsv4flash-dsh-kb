import type { OcrExtractResponse } from "@/services/media";
import type { OcrDocumentType } from "./type";

interface OcrMockCaptureConfig {
  fileName: string;
  response: OcrExtractResponse;
}

export const OCR_MOCK_CAPTURE_RESULT: Record<
  OcrDocumentType,
  OcrMockCaptureConfig
> = {
  emiratesId: {
    fileName: "emirates-id-mock.png",
    response: {
      success: true,
      documentType: "emirates-id",
      emiratesId: "784199212345671",
      dateOfBirth: "1992-04-18",
      expiryDate: "2031-04-30",
      confidence: 0.99,
      warnings: [],
    },
  },
  passport: {
    fileName: "passport-mock.png",
    response: {
      success: true,
      documentType: "passport",
      passportNumber: "P1234567",
      passportExpiryDate: "2030-09-15",
      fullNameEn: "MOHAMED ALI HASSAN",
      nationalityId: 1,
      genderId: 1,
      dateOfBirth: "1991-08-12",
      confidence: 0.98,
      warnings: [],
    },
  },
};
