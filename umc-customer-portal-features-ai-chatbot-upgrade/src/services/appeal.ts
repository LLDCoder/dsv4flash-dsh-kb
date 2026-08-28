import request from "@/utils/request";

export interface ApiResponse<TData> {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data: TData;
}

export interface AppealDictionaryDto {
  id?: number;
  code?: string | number | null;
  nameEn?: string | null;
  nameAr?: string | null;
  sort?: number | null;
  isShown?: boolean;
}

export interface AppealableViolationDto {
  violationId: number;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  violationNo: string;
  violatorName: string;
  violationTypeId: number;
  violationType?: string | null;
  violationTypeAr?: string | null;
  fineAmount?: number | null;
  fineAmountDisplay?: string | null;
  statusId: number;
  status?: string | null;
  statusAr?: string | null;
  issuedDate?: string | null;
  createdOn?: string | null;
  allowedAppeal?: boolean | null;
  transactionNo?: string | number | null;
  receiptTransactionNo?: string | number | null;
  paymentTransactionNo?: string | number | null;
  receiptNo?: string | number | null;
  receiptNumber?: string | number | null;
}

export interface AppealViolationReportedViolationDto {
  // This page does not consume an AppealApproval field directly. Once appeal approval is confirmed by the backend,
  // newDegree is synced into degree and afterAppealAdjustedFineAmount is synced into the current amount/fineAmount.
  itemId?: number | string | null;
  code?: string | null;
  name?: string | null;
  nameAr?: string | null;
  occurrenceNumber?: number | string | null;
  severityLevel?: number | string | null;
  severityLevelName?: string | null;
  severityLevelNameAr?: string | null;
  // Current effective amount. In penalty order items, the same current amount is exposed as fineAmount.
  amount?: number | string | null;
  // Current effective level. For violationTypeId=1 it means occurrence count; for violationTypeId=2 it means fine degree.
  degree?: number | string | null;
  // Amount before the appeal adjustment is applied.
  beforeAppealAdjustedFineAmount?: number | string | null;
  // Amount saved by appeal review. After appeal approval, this value becomes the effective amount.
  afterAppealAdjustedFineAmount?: number | string | null;
  // Level determined by committee review before the appeal result is applied.
  oldDegree?: number | string | null;
  // Level saved by appeal review. After appeal approval, this value becomes the effective degree.
  newDegree?: number | string | null;
  appealResult?: number | string | null;
  appealResultName?: string | null;
  notes?: string | null;
  evidenceUrls?: string[];
}

export interface AppealViolationFineDetailDto {
  violationItemName?: string | null;
  violationItemNameAr?: string | null;
  occurrenceNumber?: number | string | null;
  severityLevel?: number | string | null;
  severityLevelName?: string | null;
  severityLevelNameAr?: string | null;
  // Current effective level. For violationTypeId=1 it means occurrence count; for violationTypeId=2 it means fine degree.
  degree?: number | string | null;
  // Current effective amount.
  amount?: number | string | null;
}

export interface AppealDecisionAttachmentDto {
  fileName?: string | null;
  fileUrl?: string | null;
  contentType?: string | null;
}

export interface AppealViolationAssociatedAppealDto {
  appealId: number;
  appealNo?: string | null;
  reasonId?: number | null;
  appealReason?: string | null;
  appealReasonAr?: string | null;
  violatorName?: string | null;
  statusId?: number | null;
  status?: string | null;
  statusAr?: string | null;
  decision?: {
    finalDecisionTypeId?: number | string | null;
    finalDecisionNote?: string | null;
    decidedOn?: string | null;
    attachments?: AppealDecisionAttachmentDto[] | null;
  } | null;
}

export interface AppealViolationDetailDto {
  violationId: number;
  violationNo: string;
  violationTypeId: number;
  violationType?: string | null;
  violationTypeAr?: string | null;
  statusId?: number | null;
  status?: string | null;
  statusAr?: string | null;
  issuedDate?: string | null;
  violatorName?: string | null;
  violatorIdentifier?: string | null;
  fineAmount?: number | string | null;
  fineAmountDisplay?: string | null;
  reportedViolations?: AppealViolationReportedViolationDto[];
  fineDetails?: AppealViolationFineDetailDto[];
  totalFineAmount?: number | string | null;
  associatedAppeal?: AppealViolationAssociatedAppealDto | null;
  allowedAppeal?: boolean | null;
  transactionNo?: string | number | null;
  receiptTransactionNo?: string | number | null;
  paymentTransactionNo?: string | number | null;
  receiptNo?: string | number | null;
  receiptNumber?: string | number | null;
}

export interface AppealViolationPenaltyOrderItemDto {
  itemId?: number | string | null;
  violationItemCode?: string | null;
  violationDescription?: string | null;
  violationTypeId?: number | null;
  violationType?: string | null;
  violationTypeAr?: string | null;
  // Current effective amount in this penalty order item.
  fineAmount?: number | string | null;
  fineAmountDisplay?: string | null;
  notes?: string | null;
  // Current effective level in this penalty order item.
  degree?: number | string | null;
}

export interface AppealViolationPenaltyOrderDto {
  penaltyOrderId: number;
  violationId?: number | null;
  violationNo?: string | null;
  totalAmount?: number | string | null;
  totalAmountDisplay?: string | null;
  currency?: string | null;
  orderStatus?: string | null;
  statusDisplay?: string | null;
  statusDisplayAr?: string | null;
  calculatedAt?: string | null;
  paidAt?: string | null;
  transactionNo?: string | number | null;
  receiptTransactionNo?: string | number | null;
  paymentTransactionNo?: string | number | null;
  receiptNo?: string | number | null;
  receiptNumber?: string | number | null;
  items?: AppealViolationPenaltyOrderItemDto[];
}

export interface AppealRelatedViolationDto {
  violationId: number;
  violationNo: string;
  violatorName: string;
  violationTypeId: number;
  violationType?: string;
  fineAmount?: number | null;
  statusId: number;
  status?: string;
  createdOn?: string;
}

export interface AppealResultBannerDto {
  decisionTypeId?: number | null;
  decision?: string | null;
  note?: string | null;
  attachmentUrl1?: string | null;
  attachmentUrl2?: string | null;
  attachmentUrl3?: string | null;
  decidedOn?: string | null;
}

export interface AppealCommunicationDto {
  id: number;
  senderActorTypeCode: "Customer" | "Agent" | "System" | string;
  senderName?: string;
  personalPhotoUrl?: string | null;
  body?: string;
  isSystemMessage?: boolean;
  note?: string;
  attachmentUrl1?: string | null;
  attachmentUrl2?: string | null;
  attachmentUrl3?: string | null;
  attachmentName1?: string | null;
  attachmentName2?: string | null;
  attachmentName3?: string | null;
  createdOn: string;
}

export interface AppealDetailDto {
  id: number;
  appealNo: string;
  violationId: number;
  statusId: number;
  status?: string;
  statusAr?: string | null;
  reasonId: number;
  reasonRemark?: string | null;
  submissionTime: string;
  slaDueOn?: string | null;
  attachmentUrl1?: string | null;
  attachmentUrl2?: string | null;
  attachmentUrl3?: string | null;
  resultBanner?: AppealResultBannerDto | null;
  relatedViolation?: AppealRelatedViolationDto | null;
  communications?: AppealCommunicationDto[];
}

export type AppealListSortField =
  | "AppealNo"
  | "AppealReason"
  | "ViolationNo"
  | "FineAmount"
  | "SubmissionDate"
  | "Status";

export interface AppealListQuery {
  createdBy: string;
  pageNumber?: number;
  pageSize?: number;
  sortField?: AppealListSortField;
  sortDescending?: boolean;
  keyword?: string;
  startTime?: string;
  endTime?: string;
  reasonId?: number;
  StatusId?: number;
}

export interface AppealListItemDto {
  id: number;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  appealNo?: string | null;
  appealReasonId?: number | null;
  appealReason?: string | null;
  appealReasonAr?: string | null;
  violationNo?: string | null;
  fineAmount?: number | null;
  submissionDate?: string | null;
  statusId: number;
  status?: string | null;
  statusAr?: string | null;
}

export interface AppealListResponseDto {
  total: number;
  pageNumber: number;
  pageSize: number;
  items: AppealListItemDto[];
}

export interface CreateAppealPayload {
  violationId: number;
  reasonId: number;
  remark?: string;
  attachmentUrl1?: string;
  attachmentUrl2?: string;
  attachmentUrl3?: string;
}

export interface SendAppealMessagePayload {
  body: string;
  attachmentUrl1?: string;
  attachmentUrl2?: string;
  attachmentUrl3?: string;
  attachmentName1?: string;
  attachmentName2?: string;
  attachmentName3?: string;
}

export interface AppealViolationListQuery {
  keyword?: string;
  StatusId?: number;
  ViolationTypeId?: number;
  startTime?: string;
  endTime?: string;
  pageNumber?: number;
  pageSize?: number;
  sortField?: "SubmissionDate" | "ViolationNo" | "ViolationType" | "FineAmount" | "Status";
  sortDescending?: boolean;
}

export interface AppealViolationListResponseDto {
  total?: number;
  pageNumber?: number;
  pageSize?: number;
  items?: AppealableViolationDto[];
}

export type AppealViolationListData =
  | AppealableViolationDto[]
  | AppealViolationListResponseDto;

export interface AppealReasonDto extends AppealDictionaryDto {
  scope?: string;
  descAr?: string | null;
  descEn?: string | null;
}

export type CancelAppealResponse = Partial<ApiResponse<unknown>>;

export function unwrapApiData<TData>(response: ApiResponse<TData> | TData): TData {
  if (
    response &&
    typeof response === "object" &&
    "data" in response
  ) {
    return (response as ApiResponse<TData>).data;
  }
  return response as TData;
}

export function getAppealStatuses() {
  return request.get<
    ApiResponse<AppealDictionaryDto[]>,
    ApiResponse<AppealDictionaryDto[]>
  >("/api/Appeal/Statuses", {}, { skipErrorToast: true });
}

export function getAppealViolationStatuses() {
  return request.get<
    ApiResponse<AppealDictionaryDto[]>,
    ApiResponse<AppealDictionaryDto[]>
  >("/api/Appeal/ViolationStatuses", {}, { skipErrorToast: true });
}

export function getAppealViolationTypes() {
  return request.get<
    ApiResponse<AppealDictionaryDto[]>,
    ApiResponse<AppealDictionaryDto[]>
  >("/api/Appeal/ViolationTypes", {}, { skipErrorToast: true });
}

export function getAppealReasons() {
  return request.get<
    ApiResponse<AppealReasonDto[]>,
    ApiResponse<AppealReasonDto[]>
  >("/api/Appeal/Reasons", {}, { skipErrorToast: true });
}

export function getAppealViolations(params: AppealViolationListQuery = {}) {
  return request.get<
    ApiResponse<AppealViolationListData>,
    ApiResponse<AppealViolationListData>
  >("/api/Appeal/Violations", params, { skipErrorToast: true });
}

export function getAppealViolationByNo(violationNo: string) {
  return request.get<
    ApiResponse<AppealViolationDetailDto>,
    ApiResponse<AppealViolationDetailDto>
  >(
    `/api/Appeal/Violations/ByNo/${encodeURIComponent(violationNo)}`,
    {},
    { skipErrorToast: true },
  );
}

export function getAppealViolationPenaltyOrders(violationNo: string) {
  return request.get<
    ApiResponse<AppealViolationPenaltyOrderDto[]>,
    ApiResponse<AppealViolationPenaltyOrderDto[]>
  >(
    `/api/Appeal/Violations/${encodeURIComponent(violationNo)}/PenaltyOrders`,
    {},
    { skipErrorToast: true },
  );
}

export function getAppealableViolations() {
  return request.get<
    ApiResponse<AppealViolationListData>,
    ApiResponse<AppealViolationListData>
  >("/api/Appeal/PendingViolations", {}, { skipErrorToast: true });
}

export function getAppealList(params: AppealListQuery) {
  return request.get<
    ApiResponse<AppealListResponseDto>,
    ApiResponse<AppealListResponseDto>
  >("/api/Appeal/List", params, { skipErrorToast: true });
}

export function createAppeal(payload: CreateAppealPayload) {
  return request.post<ApiResponse<AppealDetailDto>, ApiResponse<AppealDetailDto>>(
    "/api/Appeal",
    payload,
    { skipErrorToast: true },
  );
}

export function getAppealDetail(id: number | string) {
  return request.get<ApiResponse<AppealDetailDto>, ApiResponse<AppealDetailDto>>(
    `/api/Appeal/${id}`,
    {},
    { skipErrorToast: true },
  );
}

export function cancelAppeal(id: number | string) {
  return request.patch<CancelAppealResponse, CancelAppealResponse>(
    `/api/Appeal/${id}/Cancel`,
    {},
    { skipErrorToast: true },
  );
}

export function sendAppealMessage(
  id: number | string,
  payload: SendAppealMessagePayload,
) {
  return request.post<
    ApiResponse<AppealCommunicationDto>,
    ApiResponse<AppealCommunicationDto>
  >(`/api/Appeal/${id}/Message`, payload, { skipErrorToast: true });
}
