import request from "@/utils/request";
import type { ApiResponse } from "@/services/appeal";
import downloadBlobFile from "@/utils/downloadBlobFile";
import { stripEmiratesIdDigits } from "@/utils/individualIdentity/validation";
import { v4 as uuidv4, validate as validateUuid, version as getUuidVersion } from "uuid";
import { resolveTrustedPaymentUrl } from "@/utils/security/externalDestinations";
import {
  mapViolationFineBatchPaymentStatus,
  type PublicViolationFineBatchPaymentStatusResult,
} from "@/services/violationFineBatchPaymentStatus";

export type PayFineIndividualMethod =
  | "EmiratesId"
  | "UnifiedNumber"
  | "PassportNumber";

export interface PayFineSearchByIndividualParams {
  Email: string;
  Method: PayFineIndividualMethod;
  Identifier: string;
}

export interface PayFineSearchByEstablishmentParams {
  CommercialLicenseNumber: string;
  EmirateId: number;
}

export interface PayFineSearchByViolationNumberParams {
  violationNumber: string;
}

export interface PayFineEmirateDto {
  id: number;
  nameEn: string;
  nameAr: string;
  code?: string | null;
}

export interface PayFineListItemDto {
  id?: number | string;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  fineReferenceNumber?: string | null;
  fineNumber?: string | null;
  violationNumber?: string | null;
  violationNo?: string | null;
  violationType?: string | null;
  violationReason?: string | null;
  issueDate?: string | null;
  issuedTime?: string | null;
  amount?: number | string | null;
  fineAmount?: number | string | null;
  currencyCode?: string | null;
  status?: string | null;
  canPay?: boolean;
  canAppeal?: boolean;
  isPaymentProcessing?: boolean;
  transactionNo?: string | number | null;
  receiptNo?: string | number | null;
}

export interface PayFineSearchResponseDto {
  fines?: PayFineListItemDto[];
  total?: number;
  attemptsRemaining?: number;
  establishment?: PayFineEstablishmentDto | null;
}

export interface PayFineSearchLockDetails {
  lockedUntil?: string | null;
  remainingSeconds?: number | null;
}

export interface PayFineSearchApiResponse
  extends ApiResponse<PayFineSearchResponseDto> {
  errorCode?: string | null;
  details?: PayFineSearchLockDetails | null;
}

export interface PayFineEstablishmentDto {
  name?: string | null;
  establishmentName?: string | null;
  licenseNumber?: string | null;
}

export interface PayFineAttachmentDto {
  attachmentId?: string | number | null;
  fileName?: string | null;
  filePath?: string | null;
  downloadUrl?: string | null;
}

export interface PayFineActivityDto {
  number?: number | string | null;
  activity?: string | null;
  count?: number | string | null;
  amount?: number | string | null;
  warningCount?: number | string | null;
}

export interface PayFineReportedViolationDto {
  number?: number | string | null;
  code?: string | number | null;
  activity?: string | null;
  isWarning?: boolean;
  amount?: number | string | null;
  times?: number | string | null;
  attachments?: PayFineAttachmentDto[];
  // Appeal decision fields returned by the public detail endpoint.
  appealResult?: number | string | null;
  appealResultName?: string | null;
  appealResultNameAr?: string | null;
  oldDegree?: number | string | null;
  newDegree?: number | string | null;
}

export interface PayFineAssociatedAppealDecisionDto {
  finalDecisionNote?: string | null;
  decidedOn?: string | null;
}

export interface PayFineAssociatedAppealDto {
  appealId?: number | null;
  appealNo?: string | null;
  appealReason?: string | null;
  appealReasonAr?: string | null;
  violatorName?: string | null;
  statusId?: number | null;
  status?: string | null;
  statusAr?: string | null;
  decision?: PayFineAssociatedAppealDecisionDto | null;
}

export interface PayFineDetailDto {
  fineNumber?: string | null;
  violationNumber?: string | null;
  violationType?: string | null;
  status?: string | null;
  violationTime?: string | null;
  issueDate?: string | null;
  establishment?: PayFineEstablishmentDto | null;
  violationReasons?: Array<string | null | undefined>;
  reportedViolations?: PayFineReportedViolationDto[];
  decisionAppeals?: PayFineReportedViolationDto[];
  inspectorNotes?: string | null;
  contactPerson?: string | null;
  attachments?: PayFineAttachmentDto[];
  activities?: PayFineActivityDto[];
  totalFee?: number | string | null;
  appealDeadline?: string | null;
  canPay?: boolean;
  canAppeal?: boolean;
  isPaymentProcessing?: boolean;
  transactionNo?: string | number | null;
  receiptNo?: string | number | null;
  associatedAppeal?: PayFineAssociatedAppealDto | null;
}

export interface ViolationFinePrevalidatePaymentPayload {
  fineReferenceNumbers: string[];
  amount: number;
}

export interface ViolationFinePrevalidatePaymentResult {
  canPay: boolean;
  payableFineReferenceNumbers: string[];
  blockedFineReferenceNumbers: string[];
  amount: number | null;
  message?: string;
}

export type ViolationFinePaymentStatus =
  | "success"
  | "failed"
  | "processing"
  | "unknown";

export interface ViolationFinePaymentPayload {
  fineReferenceNumbers: string[];
  amount: number;
  paymentWindow?: Window | null;
  shouldOpenPaymentPage?: () => boolean;
  waitForStatus?: boolean;
}

export interface ViolationFineReceiptMetadata {
  fineReferenceNumber: string;
  transactionNo: string;
  receiptNo: string;
  fileName?: string | null;
  receiptId?: number | string | null;
  downloadUrl?: string | null;
}

export interface ViolationFinePaymentResult {
  success: boolean;
  status: ViolationFinePaymentStatus;
  transactionNo: string;
  paymentId?: string;
  tranId?: string;
  correlationId?: string;
  receiptsReady?: boolean;
  receipt?: ViolationFineReceiptMetadata;
  receipts?: ViolationFineReceiptMetadata[];
  message?: string;
}

export interface ViolationFineBatchPaymentStatusRequest {
  batchTransactionNo: string;
  paymentId: string;
  correlationId: string;
}

export interface ViolationFineCancelPaymentRequest {
  transactionNo: string;
}

export type ViolationFineCancelPaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type ViolationFineCancelPaymentAction =
  | "CANCELLED_BY_INQUIRY"
  | "CANCELLED_BY_EXPIRY"
  | "CONFIRMED_PAID"
  | "ALREADY_FINAL"
  | "INQUIRY_FAILED_STILL_PENDING";

export interface ViolationFineCancelPaymentResult {
  transactionNo: string;
  referenceNumber: string | null;
  previousStatus: ViolationFineCancelPaymentStatus;
  currentStatus: ViolationFineCancelPaymentStatus;
  action: ViolationFineCancelPaymentAction;
  message: string;
}

export type ViolationFineCancelPaymentResolution =
  | "success"
  | "cancelled"
  | "processing";

export interface ViolationFineFeedbackPayload {
  referenceNo: string;
  rating: number;
}

export interface ViolationFineFeedbackResult {
  success: boolean;
  submittedAt?: string;
}

interface PublicUserServiceRatingResponseData {
  success: boolean;
  data?: {
    createdTime?: string | null;
  } | null;
  message?: string | null;
}

interface PublicUserServiceRatingResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data?: PublicUserServiceRatingResponseData | null;
}

export const VIOLATION_FINE_API_UNAVAILABLE_MESSAGE =
  "Fine service endpoint is not available yet.";

const PUBLIC_PAY_FINES_BASE = "/api/public/pay-fines";
const PAY_FINES_CLIENT_ID_COOKIE_NAME = "pay_fines_client_id";
const PAY_FINES_CLIENT_ID_MAX_AGE_SECONDS = 60 * 60;
export const VIOLATION_FINE_PAYMENT_STATUS_POLL_INTERVAL_MS = 3000;
export const VIOLATION_FINE_PAYMENT_STATUS_TIMEOUT_MS = 30 * 60 * 1000;
export const VIOLATION_FINE_RECEIPT_STATUS_POLL_INTERVAL_MS = 30 * 1000;
const PUBLIC_PAY_FINES_SEARCH_REQUEST_CONFIG = {
  skipErrorToast: true,
  validateStatus: (status: number) =>
    (status >= 200 && status < 300) || status === 429,
};

const readPayFinesClientId = () => {
  const cookiePrefix = `${PAY_FINES_CLIENT_ID_COOKIE_NAME}=`;
  let cookies = "";

  try {
    cookies = document.cookie;
  } catch {
    return null;
  }

  const cookie = cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(cookiePrefix));

  if (!cookie) return null;

  try {
    const clientId = decodeURIComponent(cookie.slice(cookiePrefix.length));
    return validateUuid(clientId) && getUuidVersion(clientId) === 4
      ? clientId
      : null;
  } catch {
    return null;
  }
};

const getPayFinesClientId = () => {
  const clientId = readPayFinesClientId() ?? uuidv4();
  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";

  try {
    document.cookie = `${PAY_FINES_CLIENT_ID_COOKIE_NAME}=${encodeURIComponent(
      clientId,
    )}; Path=/; SameSite=Lax; Max-Age=${PAY_FINES_CLIENT_ID_MAX_AGE_SECONDS}${secureAttribute}`;
  } catch {
    return clientId;
  }

  return clientId;
};

const ok = <TData>(data: TData): ApiResponse<TData> => ({
  isSuccess: true,
  statusCode: 200,
  message: null,
  data,
});

interface PublicPayFinesEnvelope<TData> {
  success?: boolean;
  data?: TData | null;
  message?: string | null;
  errorCode?: string | null;
  details?: PayFineSearchLockDetails | null;
}

type PublicPayFinesGatewayResponse<TData> = ApiResponse<
  PublicPayFinesEnvelope<TData> | null
>;

type PublicPayFinesGatewayDataResponse<TData> = ApiResponse<TData | null>;

interface PublicPayFineListData {
  items?: PublicPayFineListItem[];
  total?: number;
  attemptsRemaining?: number;
  establishment?: {
    name?: string | null;
    licenseNumber?: string | null;
  } | null;
}

interface PublicPayFineEmirateItem {
  id: number;
  nameEn: string;
  nameAr: string;
  code?: string | null;
}

interface PublicPayFineListItem {
  fineReferenceNumber?: string | null;
  violationNumber?: string | null;
  violationNo?: string | null;
  violationType?: string | null;
  status?: string | null;
  issuedTime?: string | null;
  fineAmount?: number | string | null;
  currencyCode?: string | null;
  canPay?: boolean;
  canAppeal?: boolean;
  isPaymentProcessing?: boolean;
  transactionNo?: string | number | null;
  receiptNo?: string | number | null;
}

interface PublicViolationFineActivity {
  code?: string | number | null;
  description?: string | null;
  violationDescriptionEn?: string | null;
  violationDescriptionAr?: string | null;
  checklistName?: string | null;
  amount?: number | string | null;
  degree?: number | string | null;
  times?: number | string | null;
  isWarning?: boolean;
  attachments?: Array<{
    attachmentId?: string | number | null;
    fileId?: string | number | null;
    fileName?: string | null;
    downloadUrl?: string | null;
  }>;
  // Appeal decision fields — see docs/pay-fines-detail-decision-on-appeal-api-gap.md
  appealResult?: number | string | null;
  appealResultName?: string | null;
  appealResultNameAr?: string | null;
  oldDegree?: number | string | null;
  newDegree?: number | string | null;
}

interface PublicAssociatedAppeal {
  appealId?: number | null;
  appealNo?: string | null;
  appealReason?: string | null;
  appealReasonAr?: string | null;
  violatorName?: string | null;
  statusId?: number | null;
  status?: string | null;
  statusAr?: string | null;
  decision?: {
    finalDecisionNote?: string | null;
    decidedOn?: string | null;
  } | null;
}

interface PublicViolationFineDetail extends PublicPayFineListItem {
  violationTime?: string | null;
  establishment?: {
    name?: string | null;
    licenseNumber?: string | null;
  } | null;
  reportedViolations?: PublicViolationFineActivity[];
  decisionAppeals?: PublicViolationFineActivity[];
  fineDetails?: PublicViolationFineActivity[];
  attachments?: Array<{
    attachmentId?: string | number | null;
    fileId?: string | number | null;
    fileName?: string | null;
    downloadUrl?: string | null;
  }>;
  totalAmount?: number | string | null;
  appealDeadline?: string | null;
  associatedAppeal?: PublicAssociatedAppeal | null;
}

interface PublicPrevalidatePaymentResult {
  canPayNow?: boolean;
  items?: Array<{ violationNo?: string | null }>;
  unavailableViolationNos?: string[];
  totalAmount?: number;
  currencyCode?: string;
}

interface PublicPurchaseResult {
  success?: boolean;
  batchTransactionNo?: string | null;
  transactionNo?: string | null;
  referenceNumber?: string | null;
  paymentId?: string | null;
  tranId?: string | null;
  correlationId?: string | null;
  amount?: number | null;
  currencyCode?: string | null;
  paymentPageUrl?: string | null;
  hostedPaymentPageUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

const normalizeStatus = (status?: string | null) => {
  const value = String(status ?? "").trim();
  if (value === "PendingPayment") return "Pending Payment";
  if (value === "UnderAppeal") return "Under Appeal";
  return value || null;
};

const isGatewaySuccess = <TData>(
  response: PublicPayFinesGatewayDataResponse<TData>,
) =>
  response.isSuccess !== false &&
  (response.statusCode === undefined || response.statusCode === 200);

const unwrapGatewayData = <TData>(
  response: PublicPayFinesGatewayDataResponse<TData>,
  fallbackMessage = VIOLATION_FINE_API_UNAVAILABLE_MESSAGE,
): TData => {
  if (!isGatewaySuccess(response) || response.data === null || response.data === undefined) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data;
};

const unwrapPublicEnvelopeData = <TData>(
  response: PublicPayFinesGatewayResponse<TData>,
  fallbackMessage = VIOLATION_FINE_API_UNAVAILABLE_MESSAGE,
): TData => {
  const envelope = unwrapGatewayData(response, fallbackMessage);

  if (envelope.success === false || envelope.data === undefined || envelope.data === null) {
    throw new Error(envelope.message || response.message || fallbackMessage);
  }

  return envelope.data;
};

const mapListItem = (item: PublicPayFineListItem): PayFineListItemDto => ({
  id: item.fineReferenceNumber || item.violationNumber || item.violationNo || undefined,
  fineReferenceNumber: item.fineReferenceNumber,
  fineNumber: item.fineReferenceNumber || item.violationNo,
  violationNumber: item.violationNumber || item.violationNo,
  violationNo: item.violationNo || item.violationNumber,
  violationType: item.violationType,
  issueDate: item.issuedTime,
  issuedTime: item.issuedTime,
  amount: item.fineAmount,
  fineAmount: item.fineAmount,
  currencyCode: item.currencyCode,
  status: normalizeStatus(item.status),
  canPay: item.canPay,
  canAppeal: item.canAppeal,
  isPaymentProcessing: item.isPaymentProcessing,
  transactionNo: item.transactionNo,
  receiptNo: item.receiptNo,
});

const mapSearchResponse = (
  response: PublicPayFinesGatewayResponse<PublicPayFineListData>,
): PayFineSearchApiResponse => {
  const envelope = response.data;
  const searchData = envelope?.data;
  const isSuccess =
    isGatewaySuccess(response) && Boolean(envelope) && envelope?.success !== false;

  return {
    isSuccess,
    statusCode: isSuccess ? 200 : 400,
    message: envelope?.message ?? response.message ?? null,
    errorCode: envelope?.errorCode ?? null,
    details: envelope?.details ?? null,
    data: {
      fines: (searchData?.items ?? []).map(mapListItem),
      total: searchData?.total,
      attemptsRemaining: searchData?.attemptsRemaining,
      establishment: searchData?.establishment
        ? {
            name: searchData.establishment.name,
            establishmentName: searchData.establishment.name,
            licenseNumber: searchData.establishment.licenseNumber,
          }
        : null,
    },
  };
};

const mapDetailActivity = (
  item: PublicViolationFineActivity,
  index: number,
): PayFineReportedViolationDto => ({
  number: item.code || index + 1,
  code: item.code,
  activity: item.description,
  isWarning: item.isWarning,
  amount: item.amount,
  times: item.times,
  attachments: (item.attachments ?? []).map((attachment) => ({
    attachmentId: attachment.attachmentId ?? attachment.fileId,
    fileName: attachment.fileName,
    filePath: attachment.downloadUrl,
    downloadUrl: attachment.downloadUrl,
  })),
  appealResult: item.appealResult,
  appealResultName: item.appealResultName,
  appealResultNameAr: item.appealResultNameAr,
  oldDegree: item.oldDegree,
  newDegree: item.newDegree,
});

const mapDetailResponse = (data: PublicViolationFineDetail): PayFineDetailDto => ({
  fineNumber: data.fineReferenceNumber || data.violationNumber || data.violationNo,
  violationNumber: data.violationNumber || data.violationNo,
  violationType: data.violationType,
  status: normalizeStatus(data.status),
  violationTime: data.violationTime,
  issueDate: data.issuedTime,
  establishment: data.establishment
    ? {
        name: data.establishment.name,
        establishmentName: data.establishment.name,
        licenseNumber: data.establishment.licenseNumber,
      }
    : null,
  violationReasons: (data.reportedViolations ?? []).map(
    (item) => item.description || String(item.code ?? ""),
  ),
  attachments: (data.attachments ?? []).map((item) => ({
    attachmentId: item.attachmentId ?? item.fileId,
    fileName: item.fileName,
    filePath: item.downloadUrl,
    downloadUrl: item.downloadUrl,
  })),
  reportedViolations: (data.reportedViolations ?? []).map(mapDetailActivity),
  decisionAppeals: (data.decisionAppeals ?? []).map(mapDetailActivity),
  activities: (data.fineDetails ?? data.reportedViolations ?? []).map((item, index) => ({
    number: item.code || index + 1,
    activity: item.description,
    count: item.times ?? item.degree,
    amount: item.amount,
    warningCount: item.times,
  })),
  totalFee: data.totalAmount,
  appealDeadline: data.appealDeadline,
  canPay: data.canPay,
  canAppeal: data.canAppeal,
  isPaymentProcessing: data.isPaymentProcessing,
  transactionNo: data.transactionNo,
  receiptNo: data.receiptNo,
  associatedAppeal: data.associatedAppeal
    ? {
        appealId: data.associatedAppeal.appealId,
        appealNo: data.associatedAppeal.appealNo,
        appealReason: data.associatedAppeal.appealReason,
        appealReasonAr: data.associatedAppeal.appealReasonAr,
        violatorName: data.associatedAppeal.violatorName,
        statusId: data.associatedAppeal.statusId,
        status: data.associatedAppeal.status,
        statusAr: data.associatedAppeal.statusAr,
        decision: data.associatedAppeal.decision
          ? {
              finalDecisionNote: data.associatedAppeal.decision.finalDecisionNote,
              decidedOn: data.associatedAppeal.decision.decidedOn,
            }
          : null,
      }
    : null,
});

const getPurchasePaymentPageUrl = (purchase: PublicPurchaseResult) =>
  purchase.hostedPaymentPageUrl || purchase.paymentPageUrl || "";

export const resolveViolationFineCancelPayment = (
  result: ViolationFineCancelPaymentResult,
): ViolationFineCancelPaymentResolution => {
  if (
    result.action === "CANCELLED_BY_INQUIRY" ||
    result.action === "CANCELLED_BY_EXPIRY"
  ) {
    return "cancelled";
  }

  if (result.action === "CONFIRMED_PAID") {
    return "success";
  }

  if (result.action === "ALREADY_FINAL") {
    if (result.currentStatus === "COMPLETED") return "success";
    if (result.currentStatus === "FAILED") return "cancelled";
  }

  return "processing";
};

const closePaymentWindow = (paymentWindow?: Window | null) => {
  if (!paymentWindow || paymentWindow.closed) return;
  paymentWindow.close();
};

const openPaymentPage = (
  paymentPageUrl: string,
  paymentWindow?: Window | null,
) => {
  const trustedPaymentPageUrl = resolveTrustedPaymentUrl(paymentPageUrl);
  if (!trustedPaymentPageUrl) {
    closePaymentWindow(paymentWindow);
    return false;
  }

  if (paymentWindow?.closed) return false;

  if (paymentWindow) {
    paymentWindow.opener = null;
    paymentWindow.location.href = trustedPaymentPageUrl;
    return true;
  }

  if (typeof window === "undefined") return false;

  const openedWindow = window.open(
    trustedPaymentPageUrl,
    "_blank",
    "noopener,noreferrer",
  );
  if (!openedWindow) return false;

  openedWindow.opener = null;
  return true;
};

const formatEmiratesId = (value: string) => {
  const digits = stripEmiratesIdDigits(value);
  if (digits.length !== 15) return String(value ?? "").trim();
  // Backend matches the canonical dashed format 784-XXXX-XXXXXXX-X, not raw digits.
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14)}`;
};

const normalizeIndividualIdentifier = (
  method: PayFineIndividualMethod,
  value: string,
) =>
  method === "EmiratesId"
    ? formatEmiratesId(value)
    : String(value ?? "").trim();

export const searchViolationFinesByIndividual = (
  params: PayFineSearchByIndividualParams,
) => {
  return request
    .get<
      PublicPayFinesGatewayResponse<PublicPayFineListData>,
      PublicPayFinesGatewayResponse<PublicPayFineListData>
    >(
      `${PUBLIC_PAY_FINES_BASE}/search/by-individual`,
      {
        method: params.Method,
        identifier: normalizeIndividualIdentifier(params.Method, params.Identifier),
        email: params.Email,
        clientId: getPayFinesClientId(),
      },
      PUBLIC_PAY_FINES_SEARCH_REQUEST_CONFIG,
    )
    .then(mapSearchResponse);
};

export const searchViolationFinesByEstablishment = (
  params: PayFineSearchByEstablishmentParams,
) => {
  return request
    .get<
      PublicPayFinesGatewayResponse<PublicPayFineListData>,
      PublicPayFinesGatewayResponse<PublicPayFineListData>
    >(
      `${PUBLIC_PAY_FINES_BASE}/search/by-establishment`,
      {
        commercialLicenseNumber: params.CommercialLicenseNumber,
        emirateId: params.EmirateId,
        clientId: getPayFinesClientId(),
      },
      PUBLIC_PAY_FINES_SEARCH_REQUEST_CONFIG,
    )
    .then(mapSearchResponse);
};

export const getPayFineEmirates = () => {
  return request
    .get<
      PublicPayFinesGatewayResponse<PublicPayFineEmirateItem[]>,
      PublicPayFinesGatewayResponse<PublicPayFineEmirateItem[]>
    >(`${PUBLIC_PAY_FINES_BASE}/emirates`, {}, { skipErrorToast: true })
    .then((response) => ok(unwrapPublicEnvelopeData(response)));
};

export const searchViolationFinesByViolationNumber = (
  params: PayFineSearchByViolationNumberParams,
) => {
  return request
    .get<
      PublicPayFinesGatewayResponse<PublicPayFineListData>,
      PublicPayFinesGatewayResponse<PublicPayFineListData>
    >(
      `${PUBLIC_PAY_FINES_BASE}/search/by-violation-no`,
      {
        violationNumber: params.violationNumber,
        clientId: getPayFinesClientId(),
      },
      PUBLIC_PAY_FINES_SEARCH_REQUEST_CONFIG,
    )
    .then(mapSearchResponse);
};

export const getViolationFineDetail = (fineReferenceNumber: string) => {
  return request
    .get<
      PublicPayFinesGatewayResponse<PublicViolationFineDetail>,
      PublicPayFinesGatewayResponse<PublicViolationFineDetail>
    >(
      `${PUBLIC_PAY_FINES_BASE}/violations/${encodeURIComponent(fineReferenceNumber)}`,
      {},
      { skipErrorToast: true },
    )
    .then((response) => ok(mapDetailResponse(unwrapPublicEnvelopeData(response))));
};

export const prevalidateViolationFinePayment = (
  payload: ViolationFinePrevalidatePaymentPayload,
) => {
  return request
    .post<
      PublicPayFinesGatewayDataResponse<PublicPrevalidatePaymentResult>,
      PublicPayFinesGatewayDataResponse<PublicPrevalidatePaymentResult>
    >(
      `${PUBLIC_PAY_FINES_BASE}/pay-now/validate`,
      { violationNos: payload.fineReferenceNumbers },
      { skipErrorToast: true },
    )
    .then((response) => {
      const validation = unwrapGatewayData(response);
      return ok({
        canPay: Boolean(validation.canPayNow),
        payableFineReferenceNumbers: (validation.items ?? [])
          .map((item) => item.violationNo)
          .filter((value): value is string => Boolean(value)),
        blockedFineReferenceNumbers: validation.unavailableViolationNos ?? [],
        amount: validation.totalAmount ?? null,
        message: validation.canPayNow ? undefined : "Selected fines are not payable.",
      });
    });
};

const getViolationFineBatchPaymentStatus = (
  payload: ViolationFineBatchPaymentStatusRequest,
) =>
  request
    .post<
      PublicPayFinesGatewayDataResponse<PublicViolationFineBatchPaymentStatusResult>,
      PublicPayFinesGatewayDataResponse<PublicViolationFineBatchPaymentStatusResult>
    >(`${PUBLIC_PAY_FINES_BASE}/batch-payment-status`, payload, {
      skipErrorToast: true,
    })
    .then((response) =>
      mapViolationFineBatchPaymentStatus(unwrapGatewayData(response), payload),
    );

export const inquireViolationFineBatchPaymentStatus = (
  payload: ViolationFineBatchPaymentStatusRequest,
): Promise<ApiResponse<ViolationFinePaymentResult>> =>
  getViolationFineBatchPaymentStatus(payload).then(ok);

const pollViolationFineBatchPaymentStatus = async (
  payload: ViolationFineBatchPaymentStatusRequest,
) => {
  const startedAt = Date.now();
  let paymentStatus = await getViolationFineBatchPaymentStatus(payload);

  while (
    (paymentStatus.status === "processing" ||
      paymentStatus.status === "unknown") &&
    Date.now() - startedAt < VIOLATION_FINE_PAYMENT_STATUS_TIMEOUT_MS
  ) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, VIOLATION_FINE_PAYMENT_STATUS_POLL_INTERVAL_MS);
    });
    paymentStatus = await getViolationFineBatchPaymentStatus(payload);
  }

  return paymentStatus;
};

export const submitViolationFinePayment = (
  payload: ViolationFinePaymentPayload,
): Promise<ApiResponse<ViolationFinePaymentResult>> => {
  let paymentPageOpened = false;

  return request
    .post<
      PublicPayFinesGatewayDataResponse<PublicPurchaseResult>,
      PublicPayFinesGatewayDataResponse<PublicPurchaseResult>
    >(
      `${PUBLIC_PAY_FINES_BASE}/purchase`,
      {
        violationNos: payload.fineReferenceNumbers,
        languageId: "en",
      },
      { skipErrorToast: true },
    )
    .then(async (response) => {
      const purchase = unwrapGatewayData(response);
      if (!purchase.success) {
        closePaymentWindow(payload.paymentWindow);
        console.error("Payment submission failed:", purchase.errorMessage || response.message);
        return {
          isSuccess: false,
          statusCode: 400,
          message: purchase.errorMessage || "Payment could not be created.",
          data: {
            success: false,
            status: "failed" as ViolationFinePaymentStatus,
            transactionNo: purchase.batchTransactionNo || "",
            message: purchase.errorMessage || undefined,
          },
        };
      }

      const batchTransactionNo = purchase.batchTransactionNo?.trim();
      const paymentId = purchase.paymentId?.trim();
      const correlationId = purchase.correlationId?.trim();
      if (!batchTransactionNo || !paymentId || !correlationId) {
        closePaymentWindow(payload.paymentWindow);
        console.error("Payment submission failed: Missing batch payment identifiers.");
        return {
          isSuccess: false,
          statusCode: 400,
          message: "Payment could not be created.",
          data: {
            success: false,
            status: "failed" as ViolationFinePaymentStatus,
            transactionNo: "",
            message: "Payment could not be created.",
          },
        };
      }

      const paymentPageUrl = getPurchasePaymentPageUrl(purchase);
      if (
        payload.shouldOpenPaymentPage &&
        !payload.shouldOpenPaymentPage()
      ) {
        closePaymentWindow(payload.paymentWindow);
        return ok<ViolationFinePaymentResult>({
          success: false,
          status: "processing",
          transactionNo: batchTransactionNo,
          paymentId,
          tranId: purchase.tranId?.trim() || undefined,
          correlationId,
          receipts: [],
          message: purchase.errorMessage || undefined,
        });
      }

      if (!openPaymentPage(paymentPageUrl, payload.paymentWindow)) {
        console.error("Payment page could not be opened:", paymentPageUrl);
        return ok<ViolationFinePaymentResult>({
          success: false,
          status: "processing",
          transactionNo: batchTransactionNo,
          paymentId,
          tranId: purchase.tranId?.trim() || undefined,
          correlationId,
          receipts: [],
          message: "Payment page could not be opened.",
        });
      }
      paymentPageOpened = Boolean(paymentPageUrl);

      if (payload.waitForStatus === false) {
        return ok<ViolationFinePaymentResult>({
          success: false,
          status: "processing",
          transactionNo: batchTransactionNo,
          paymentId,
          tranId: purchase.tranId?.trim() || undefined,
          correlationId,
          receipts: [],
          message: purchase.errorMessage || undefined,
        });
      }

      const paymentStatus = await pollViolationFineBatchPaymentStatus({
        batchTransactionNo,
        paymentId,
        correlationId,
      });

      return ok<ViolationFinePaymentResult>(paymentStatus);
    })
    .catch((error) => {
      if (!paymentPageOpened) closePaymentWindow(payload.paymentWindow);
      console.error("Error during violation fine payment submission:", error);
      throw error;
    });
};

export const cancelViolationFineCardPayment = (
  payload: ViolationFineCancelPaymentRequest,
) =>
  request.post<
    PublicPayFinesGatewayDataResponse<ViolationFineCancelPaymentResult>,
    PublicPayFinesGatewayDataResponse<ViolationFineCancelPaymentResult>
  >(`${PUBLIC_PAY_FINES_BASE}/card/cancel`, payload, {
    skipErrorToast: true,
  }).then((response) => unwrapGatewayData(response));

export const downloadViolationFineReceiptMetadata = (
  _fineReferenceNumber: string,
  receipt?: ViolationFineReceiptMetadata | null,
): Promise<ApiResponse<ViolationFineReceiptMetadata | null>> => {
  if (receipt?.receiptId === undefined || receipt.receiptId === null) {
    return Promise.reject(new Error("Receipt is not available yet."));
  }

  return request
    .get(
      `${PUBLIC_PAY_FINES_BASE}/receipts/${encodeURIComponent(
        String(receipt.receiptId),
      )}`,
      {},
      {
        responseType: "blob",
        skipErrorToast: true,
        skipUnauthorizedRedirect: true,
      },
    )
    .then((blob) => {
      downloadBlobFile(
        blob as unknown as Blob,
        receipt.fileName || `receipt-${String(receipt.receiptId)}.pdf`,
      );
      return ok<ViolationFineReceiptMetadata | null>(receipt);
    });
};

export const submitViolationFineFeedbackRating = (
  payload: ViolationFineFeedbackPayload,
) => {
  return request
    .post<PublicUserServiceRatingResponse, PublicUserServiceRatingResponse>(
      `${PUBLIC_PAY_FINES_BASE}/user-service-rating`,
      {
        referenceNo: payload.referenceNo,
        rating: payload.rating,
        sourcePage: "PayFinesViolationAppeals",
      },
      { skipErrorToast: true },
    )
    .then((response) => {
      const result = response.data;
      if (
        response.isSuccess !== true ||
        result?.success !== true
      ) {
        throw new Error(
          result?.message || response.message || "Rating submission failed.",
        );
      }

      return ok<ViolationFineFeedbackResult>({
        success: true,
        submittedAt: result.data?.createdTime ?? undefined,
      });
    });
};
