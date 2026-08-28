import request from "@/utils/request";

/**
 * Response of `GET /api/inspection/signature/context`.
 *
 * `eidAttachmentFileName` / `eidAttachmentFileUrl` are not part of the current
 * backend contract yet. They are optional so the page can prefill the Emirates
 * ID upload as soon as the backend starts returning them.
 */
export type DeclarationPortalContext = {
  taskId: number;
  taskNo: string;
  contactPersonId: number;
  expiresOnUtc: string;
  establishmentName: string;
  applicantFullName: string;
  tradeLicenseNumber: string;
  contactFullName: string;
  position: string;
  mobile: string;
  mobileCountryCode: string | null;
  mobileLocalNumber: string | null;
  email: string;
  emiratesId: string;
  declarationAcknowledged: boolean;
  eidAttachmentFileName?: string | null;
  eidAttachmentFileUrl?: string | null;
};

/**
 * Body of `POST /api/inspection/signature/submit`.
 *
 * The page has exactly two uploads, mapped onto the two required file pairs:
 * - `signatureImage*` — the signed copy the user uploads (it *is* the signature).
 * - `declarationDocument*` — the declaration template that was signed.
 *
 * `emiratesIdAttachment*` carries the Emirates ID attachment; it is pending
 * backend support and currently ignored server-side.
 */
export type SubmitDeclarationPortalPayload = {
  token: string;
  fullName: string;
  position: string;
  mobileCountryCode: string;
  mobileLocalNumber: string;
  mobile: string;
  email: string;
  emiratesId: string;
  declarationAcknowledged: true;
  signatureImageFileName: string;
  signatureImageFileUrl: string;
  declarationDocumentFileName: string;
  declarationDocumentFileUrl: string;
  emiratesIdAttachmentFileName: string;
  emiratesIdAttachmentFileUrl: string;
};

export type SubmitDeclarationPortalResult = {
  taskId: number;
  contactPersonId: number;
  submittedOnUtc: string;
  signatureLinkConsumedOnUtc: string;
};

type DocumentUploadResult = {
  fileName: string;
  fileUrl: string;
  contentType?: string;
};

/**
 * The upload endpoint has several shapes in the wild:
 * - `["stored-name.pdf"]` (current CustomerPortal behavior)
 * - `"stored-name.pdf"`
 * - `{ fileUrl | filePath | url | path, fileName?, contentType? }`
 */
type DocumentUploadResponseData =
  | string
  | string[]
  | {
      fileName?: string;
      fileUrl?: string;
      filePath?: string;
      url?: string;
      path?: string;
      contentType?: string;
    };

type PortalApiResponse<T> = {
  code?: number;
  statusCode?: number;
  isSuccess?: boolean;
  message?: string;
  title?: string;
  data?: T;
};

const SIGNATURE_CONTEXT_ENDPOINT = "/api/inspection/signature/context";
const SIGNATURE_SUBMIT_ENDPOINT = "/api/inspection/signature/submit";
const DOCUMENT_UPLOAD_ENDPOINT = "/api/Document/public/Upload";

const getDeclarationPortalRequestConfig = () => ({
  skipAuth: true,
  skipErrorToast: true,
  skipUnauthorizedRedirect: true,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const readText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const readNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Extracts the stored file reference regardless of the response shape. */
const readUploadedFileUrl = (value: unknown): string => {
  if (isString(value)) return value.trim();

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = readUploadedFileUrl(entry);
      if (nested) return nested;
    }
    return "";
  }

  if (isRecord(value)) {
    return (
      readText(value.fileUrl) ||
      readText(value.filePath) ||
      readText(value.url) ||
      readText(value.path)
    );
  }

  return "";
};

const readUploadedContentType = (value: unknown): string =>
  isRecord(value) ? readText(value.contentType) : "";

/**
 * The documented contract returns the payload object directly, while the local
 * gateway wraps it in `{ code, message, data }`. Both shapes are accepted.
 */
const unwrapPortalResponse = <T>(response: unknown): T => {
  if (!isRecord(response)) {
    throw new Error("Invalid declaration response.");
  }

  const payload = response as PortalApiResponse<T>;
  const hasEnvelope =
    Object.prototype.hasOwnProperty.call(payload, "data") ||
    payload.code !== undefined ||
    payload.statusCode !== undefined ||
    payload.isSuccess !== undefined;

  if (!hasEnvelope) {
    return response as T;
  }

  const errorMessage = payload.message || payload.title;
  const numericStatus = Number(payload.code ?? payload.statusCode ?? 200);

  if (Number.isFinite(numericStatus) && numericStatus >= 400) {
    throw new Error(errorMessage || "Declaration request failed.");
  }

  if (payload.isSuccess === false) {
    throw new Error(errorMessage || "Declaration request failed.");
  }

  if (!Object.prototype.hasOwnProperty.call(payload, "data")) {
    throw new Error("Declaration response data is missing.");
  }

  return payload.data as T;
};

const normalizeContext = (value: unknown): DeclarationPortalContext => {
  if (!isRecord(value)) {
    throw new Error("Declaration context shape is invalid.");
  }

  return {
    taskId: readNumber(value.taskId),
    taskNo: readText(value.taskNo),
    contactPersonId: readNumber(value.contactPersonId),
    expiresOnUtc: readText(value.expiresOnUtc),
    establishmentName: readText(value.establishmentName),
    applicantFullName: readText(value.applicantFullName),
    tradeLicenseNumber: readText(value.tradeLicenseNumber),
    contactFullName: readText(value.contactFullName),
    position: readText(value.position),
    mobile: readText(value.mobile),
    mobileCountryCode: readText(value.mobileCountryCode) || null,
    mobileLocalNumber: readText(value.mobileLocalNumber) || null,
    email: readText(value.email),
    emiratesId: readText(value.emiratesId),
    declarationAcknowledged: Boolean(value.declarationAcknowledged),
    eidAttachmentFileName: readText(value.eidAttachmentFileName) || null,
    eidAttachmentFileUrl: readText(value.eidAttachmentFileUrl) || null,
  };
};

export const getDeclarationPortalContext = async (
  token: string,
): Promise<DeclarationPortalContext> => {
  const response = await request.get<
    PortalApiResponse<DeclarationPortalContext>,
    unknown
  >(
    SIGNATURE_CONTEXT_ENDPOINT,
    { token },
    getDeclarationPortalRequestConfig(),
  );

  return normalizeContext(
    unwrapPortalResponse<DeclarationPortalContext>(response),
  );
};

export const submitDeclarationPortalSignature = async (
  payload: SubmitDeclarationPortalPayload,
): Promise<SubmitDeclarationPortalResult> => {
  const response = await request.post<
    PortalApiResponse<SubmitDeclarationPortalResult>,
    unknown
  >(
    SIGNATURE_SUBMIT_ENDPOINT,
    payload,
    getDeclarationPortalRequestConfig(),
  );
  const result = unwrapPortalResponse<SubmitDeclarationPortalResult>(response);

  return {
    taskId: readNumber(isRecord(result) ? result.taskId : 0),
    contactPersonId: readNumber(isRecord(result) ? result.contactPersonId : 0),
    submittedOnUtc: readText(isRecord(result) ? result.submittedOnUtc : ""),
    signatureLinkConsumedOnUtc: readText(
      isRecord(result) ? result.signatureLinkConsumedOnUtc : "",
    ),
  };
};

export const uploadDeclarationPortalFile = (
  file: File,
): Promise<DocumentUploadResult> => {
  const formData = new FormData();
  formData.append("files", file);

  return request.post<unknown, unknown>(
    DOCUMENT_UPLOAD_ENDPOINT,
    formData,
    {
      ...getDeclarationPortalRequestConfig(),
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  ).then((response) => {
    const uploadData = unwrapPortalResponse<DocumentUploadResponseData>(response);
    const fileUrl = readUploadedFileUrl(uploadData);

    if (!fileUrl) {
      throw new Error("Upload response shape is invalid.");
    }

    return {
      fileName: file.name,
      fileUrl,
      contentType:
        readUploadedContentType(uploadData) || file.type || undefined,
    };
  });
};
