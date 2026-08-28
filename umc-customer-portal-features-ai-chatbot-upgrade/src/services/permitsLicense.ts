import request from "@/utils/request";

export type LicensePermitDocumentType = "LICENSE" | "PERMIT";

export interface LicensePermitAllowedActionDto {
  action: string;
  serviceId: number | null;
  serviceCode: string | null;
}

export interface LicensePermitQueryRequest {
  keyword?: string;
  statuses: string[];
  documentTypes: LicensePermitDocumentType[];
  pageIndex: number;
  pageSize: number;
  sortBy?: "effectiveDate" | "expireDate" | "lastUpdateTime";
  sortDirection: 0 | 1;
}

export interface LicensePermitListItemDto {
  id: string | number;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  applicationId?: number | null;
  type?: number | null;
  documentType?: LicensePermitDocumentType;
  documentId?: string;
  documentName?: string;
  /** When set with `nameAr`, used for localized title instead of `documentName`. */
  nameEn?: string | null;
  nameAr?: string | null;
  licensePermitNo?: string;
  /** Number to render. Media license number when the document has one, certificate number otherwise. */
  showLicenseNumber?: string;
  applicationNo?: string;
  serviceId?: number | null;
  serviceCode?: string | null;
  sourceServiceId?: number | null;
  sourceLicenseId?: number | null;
  sourceServiceCode?: string | null;
  sourceMedialLicenseId?: number | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  effectiveDate?: string;
  expireDate?: string | null;
  lastUpdateTime?: string;
  status?: string;
  hasOutstandingFees?: boolean;
  hasInProgressApplication?: boolean;
  inProgressApplicationType?: string | null;
  allowedActions?: LicensePermitAllowedActionDto[];
  downloadUrl?: string | null;
}

export interface LicensePermitQueryResponse {
  pageIndex: number;
  pageSize: number;
  total: number;
  items: LicensePermitListItemDto[];
}

export interface LicensePermitActionNeededItemDto {
  id?: string | number;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  applicationId?: number | null;
  type?: number | null;
  documentId?: string;
  documentName?: string;
  nameEn?: string | null;
  nameAr?: string | null;
  licensePermitNo?: string;
  /** Number to render. Media license number when the document has one, certificate number otherwise. */
  showLicenseNumber?: string;
  documentType?: LicensePermitDocumentType;
  serviceId?: number | null;
  serviceCode?: string | null;
  sourceLicenseId?: number | null;
  sourceServiceCode?: string | null;
  sourceMedialLicenseId?: number | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  status?: string;
  expireLabel?: string;
  effectiveDate?: string;
  expireDate?: string | null;
  allowedActions?: LicensePermitAllowedActionDto[];
}

export interface LicensePermitValidateRequest {
  documentId: string;
  documentType: LicensePermitDocumentType;
  action: string;
}

export interface LicensePermitValidateResponse {
  isAllowed: boolean;
  reasonCode: string | null;
  message: string | null;
  inProgressApplicationType: string | null;
  serviceId: number | null;
  serviceCode: string | null;
}

export interface LicensePermitApiResponse<T> {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: T;
}

// Legacy DTOs still used by other pages.
export interface LicenseListResponseDto {
  id: string | number;
  licenseNumber?: string;
  name?: string;
  nameEn?: string | null;
  nameAr?: string | null;
  applicationNumber?: string;
  startDate?: string;
  expiryDate?: string | null;
  status?: string;
  statusLabel?: string;
  daysToExpiry?: number | null;
  certificateUrl?: string | null;
  statusPromptCode?: string | null;
  serviceType?: string;
  pdfPassword?: string;
  disabledReason?: string | null;
  remarks?: string | null;
  childServices?: unknown[] | null;
  documentId?: string;
  documentName?: string;
  documentType?: LicensePermitDocumentType;
  licensePermitNo?: string;
  applicationNo?: string;
  effectiveDate?: string;
  expireDate?: string | null;
  lastUpdateTime?: string;
  hasOutstandingFees?: boolean;
  hasInProgressApplication?: boolean;
  inProgressApplicationType?: string;
  allowedActions?: string[];
}

export interface LicenseStatisticsDto {
  activeCount: number;
  expireSoonCount: number;
  expiredCount: number;
  suspendedCount: number;
  cancelledCount: number;
  totalCount: number;
}

export const getLicenseList = (requestData: LicensePermitQueryRequest) => {
  return request.post<LicensePermitQueryResponse>(
    "/api/licenses-permits/query",
    requestData,
  );
};

export const getActionNeeded = () => {
  return request.get<LicensePermitActionNeededItemDto[]>(
    "/api/licenses-permits/action-needed",
  );
};

export const validatePermitAction = (data: LicensePermitValidateRequest) => {
  return request.post<LicensePermitValidateResponse>(
    "/api/licenses-permits/actions/validate",
    data,
  );
};

// Legacy APIs still used elsewhere in the portal.
export const getStatistics = () => {
  return request.get<LicenseStatisticsDto>("/api/license/statistics");
};

export const runCancel = (id: string) => {
  return request.post(`/api/license/${id}/cancel`);
};

export const runTransfer = (id: string) => {
  return request.post(`/api/license/${id}/transfer`);
};

export const getPdfPassword = (id: string) => {
  return request.get(`/api/licenses/${id}/pdf/password`);
};

export const getLicenseDetail = (id: string) => {
  return request.get<LicenseListResponseDto>(`/api/license/${id}`);
};

export const pdfDown = (fileName: string) => {
  return request.get(`/api/pdf/preview?fileName=${fileName}`);
};
