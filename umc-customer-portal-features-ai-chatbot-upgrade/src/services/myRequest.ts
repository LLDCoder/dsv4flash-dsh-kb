import request from "@/utils/request";

export interface PendingActionItem {
  applicationId: number;
  applicationDetailId: number;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  applicationStatusId?: number | null;
  applicationStatusEn?: string | null;
  applicationStatusAr?: string | null;
  applicationStatusNameEn?: string | null;
  applicationStatusNameAr?: string | null;
  serviceId?: number | null;
  serviceCode?: string | null;
  serviceNameEn: string;
  serviceNameAr: string;
  certificateId?: number | string | null;
  serviceDepartment?: number | null;
}

export interface PendingActionsResponse {
  applicationDetailId: number;
  applicationId: number;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  applicationStatusId: number;
  applicationStatusEn?: string | null;
  applicationStatusAr?: string | null;
  applicationStatusNameAr?: string | null;
  applicationStatusNameEn?: string | null;
  createdOn: string;
  serviceId?: number | null;
  serviceCode?: string | null;
  serviceNameAr: string;
  serviceNameEn: string;
  certificateId?: number | string | null;
  serviceDepartment?: number | null;
}

export interface ApplicationItem {
  id: number;
  applicationNumber: string;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  serviceId: number;
  serviceCode?: string | null;
  serviceNameEn: string;
  serviceNameAr: string;
  createdOn: string;
  applicationStatusId: number;
  applicationStatusNameEn: string;
  applicationStatusNameAr: string;
  type: string;
  typeNameEn: string;
  typeNameAr: string;
  certificateId?: number | string | null;
  serviceDepartment?: number | null;
  applicationId?: number;
  orderAmount?: number | string | null;
}

export interface ApplicationPageParams {
  pageSize: number;
  pageIndex: number;
  sortBy?: string;
  sortDirection?: number; // 0: , 1:
  keyword?: string;
  startTime?: string;
  endTime?: string;
  applicationStatusId?: string | number; //  code (string)  id (number)
  applicationTypeId?: string | number; //  code (string)  id (number)
}

export interface ApplicationPageItemResponse {
  pageIndex: number;
  pageSize: number;
  total: number;
  items: ApplicationItem[];
}

export interface ApplicationStatusCountResponse {
  applicationStatusId: number;
  applicationStatusNameEn: string | null;
  applicationStatusNameAr: string | null;
  count: number;
}

export interface ApplicationPageResponse {
  applicationStatusCounts?: ApplicationStatusCountResponse[] | null;
  applicationPage: ApplicationPageItemResponse;
}

export interface TypeDictionary {
  id: number;
  code: string | null;
  scope: string | null;
  nameEn: string | null;
  nameAr: string | null;
  isShown: boolean;
  descAr: string | null;
  descEn: string | null;
  businessCode: string | null;
  sort: number | null;
  createBy: string | null;
  createAt: string | null;
  updateAt: string | null;
}

export interface ApplicationTimelineResponse {
  title?: string | null;
  titleEn?: string | null;
  titleAr?: string | null;
  nodeName?: string | null;
  stageName?: string | null;
  status?: string | null;
  statusEn?: string | null;
  statusAr?: string | null;
  approvalResult?: string | null;
  workflowActionLabel?: string | null;
  userName?: string | null;
  approverName?: string | null;
  approvalTime?: string | null;
  createdOn?: string | null;
  updatedOn?: string | null;
  duration?: string | number | null;
  approvalComment?: string | null;
  reason?: string | null;
  reasonEn?: string | null;
  reasonAr?: string | null;
  notes?: string | null;
}

export interface ApplicationDispositionSubmission {
  method?: string | null;
  supportingDocumentsJson?: string | string[] | null;
  notes?: string | null;
  reviewResult?: string | null;
  reviewerComment?: string | null;
}

export interface ApplicationDispositionRecord {
  submissions?: Array<ApplicationDispositionSubmission | null> | null;
}

export interface ApplicationDetailsResponse {
  id?: number | null;
  applicationDetailId?: number | null;
  applicationId: number;
  applicationNumber: string | null;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  licensePermitNo?: string | null;
  mediaLicenseId?: number | null;
  serviceId?: number | null;
  code?: string | null;
  serviceCode?: string | null;
  sourceServiceCode?: string | null;
  sourceMedialLicenseId?: number | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  serviceName?: string | null;
  serviceNameEn?: string | null;
  serviceNameAr?: string | null;
  serviceDescriptionEn?: string | null;
  serviceDescriptionAr?: string | null;
  applicationStatusId?: number | null;
  isFirstApprovalRejected?: boolean | null;
  dispositionRecord?: ApplicationDispositionRecord | null;
  deliveryInfo?: MyRequestDeliveryResponse | null;
  statusEn: string | null;
  statusAr: string | null;
  createdOn: string; // date-time
  updatedOn: string | null; // date-time
  formData: string | null;
  serviceDepartment?: number;
  amount?: number | null;
  currencyCode?: string | null;
  feeVersion?: string | null;
  feeBreakdownJson?: string | null;
  feeWarningsJson?: string | null;
  freeDecisionJson?: string | null;
  feeQuoteRawResponseJson?: string | null;
  certificateId?: number | string | null;
  referenceNumber?: string | null;
  type?: string | null;
  typeNameEn?: string | null;
  typeNameAr?: string | null;
  applicationTypeNameEn?: string | null;
  applicationTypeNameAr?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
  applicationTimeline?: ApplicationTimelineResponse[] | null;
  timeline?: ApplicationTimelineResponse[] | null;
  applicationTimelines?: ApplicationTimelineResponse[] | null;
  socialMediaAccounts?: Array<{
    accountId: number;
    platformId: number;
    mediaCategoryId: number;
    subCategoryIds: number[];
    displayName: string;
    websiteUrl: string;
  }> | null;
  lastUpdateTime?: string;
  approvalRecord?: {
    reason?: string | null;
    notes?: string | null;
    reasonFiles?: Array<string | null | undefined> | null;
  } | null;
}

export interface LifecycleActivityItem {
  id: number;
  code?: string | null;
  nameEn: string;
  nameAr: string;
}

export interface LifecyclePenaltyReference {
  penaltyReferenceType: string;
  penaltyReferenceId: number | string;
}

export interface LifecycleActivityContext {
  rootApplicationId?: number | null;
  sourceApplicationId: number;
  sourceApplicationDetailId?: number | null;
  sourceMedialLicenseId: number;
  targetServiceCode: string;
  targetServiceType: string;
  selectionMode: "renew-final" | "modify-final" | "retained" | string;
  existingActivities: LifecycleActivityItem[];
  selectedActivityIds: number[];
  selectedActivities: LifecycleActivityItem[];
  penaltyFor?: LifecyclePenaltyReference | null;
}

export interface PartnerManagementPartnerDto {
  id?: number | string | null;
  isOwner?: boolean | null;
  partnerTypeCode?: number | string | null;
  verificationMethodCode?: number | string | null;
  partnerType?: string | null;
  type?: string | null;
  dateOfBirth?: string | null;
  dateBirth?: string | null;
  emiratesId?: string | null;
  uaeNumber?: string | null;
  uid?: string | null;
  passportNumber?: string | null;
  fullNameArabic?: string | null;
  fullNameEnglish?: string | null;
  fullNameAr?: string | null;
  fullNameEn?: string | null;
  nationality?: number | string | null;
  nationalityId?: number | string | null;
  gender?: string | number | null;
  genderId?: string | number | null;
  occupation?: string | null;
  emiratesIdExpiryDate?: string | null;
  emiratesIdexpiryDate?: string | null;
  expiryDate?: string | null;
  passportExpiryDate?: string | null;
  visaExpiryDate?: string | null;
  personalPhoto?: string | null;
  personalPhotoUrl?: string | null;
  emiratesIdFile?: string | null;
  emiratesIdUrl?: string | null;
  emiratesIdurl?: string | null;
  passportScan?: string | null;
  passportScanUrl?: string | null;
  passport?: string | null;
  passportUrl?: string | null;
  visaUrl?: string | null;
  establishmentNameArabic?: string | null;
  establishmentNameEnglish?: string | null;
  representativeEmiratesId?: string | null;
  representativeNameEn?: string | null;
  representativeNameAr?: string | null;
  memorandumOfAssociation?: string | null;
  memorandumOfAssociationUrl?: string | null;
  powerOfAttorney?: string | null;
  powerOfAttorneyUrl?: string | null;
  statement?: string | null;
  statementUrl?: string | null;
}

export interface PartnerManagementContext {
  sourceApplicationId: number;
  sourceMedialLicenseId: number;
  targetServiceCode: string;
  targetServiceType: string;
  establishmentId?: number | string | null;
  hasDraft: boolean;
  initialPartnerIds: Array<number | string>;
  existingPartners: PartnerManagementPartnerDto[];
  draftPartners: PartnerManagementPartnerDto[];
}

export interface PayRequestDto {
  applicationId: number | string;
  amount: number;
  pin: string;
}

export interface WalletDetailResponse {
  id: number;
  walletOwnerUserId: string;
  balance: number;
  currency: string;
  statusId: number;
  statusObj: {
    id: number;
    nameEn: string;
    nameAr: string;
    scope: string;
  };
  ishasPin: boolean;
}

export interface MyRequestPayResponse {
  success: boolean;
  applicationNumber: string;
}

export interface DispositionSubmissionRequest {
  method: string;
  supportingDocuments: string[];
  notes?: string;
}

export interface DispositionSubmissionResponse {
  success: boolean;
  dispositionCaseId?: number | null;
  adminStatus?: string | null;
  customerStatus?: string | null;
  requiresAdminReview?: boolean | null;
}

export interface MyRequestDeliveryRequest {
  applicationDetailId: number;
  courierId?: number | null;
  recipientName?: string | null;
  emirateId?: number | null;
  regionId?: number | null;
  areaId?: number | null;
  street?: string | null;
  mobile?: string | null;
  mobileCountryCode?: string | null;
  mobileLocalNumber?: string | null;
}

export interface MyRequestDeliveryResponse {
  id?: number | null;
  applicationId?: number | null;
  applicationDetailId?: number | null;
  courierId?: number | string | null;
  courierCompanyId?: number | string | null;
  courierName?: string | null;
  courierNameAr?: string | null;
  courierNameEn?: string | null;
  recipientName?: string | null;
  receiverName?: string | null;
  emirateId?: number | string | null;
  emirateName?: string | null;
  emirateNameAr?: string | null;
  emirateNameEn?: string | null;
  regionId?: number | string | null;
  regionName?: string | null;
  regionNameAr?: string | null;
  regionNameEn?: string | null;
  areaId?: number | string | null;
  areaName?: string | null;
  areaNameAr?: string | null;
  areaNameEn?: string | null;
  street?: string | null;
  addressEn?: string | null;
  addressAr?: string | null;
  mobile?: string | null;
  mobileNumber?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  dialCode?: string | null;
  mobileCountryCode?: string | null;
  mobileLocalNumber?: string | null;
  createdOn?: string | null;
  updatedOn?: string | null;
}

export interface AnalyzeBookRequest {
  filePath: string;
  typeOfPublication?: string;
  serviceCode: number | string;
  originalFileName?: string;
}

export interface AnalyzeBookResponseData {
  analysisStatus?: string;
  requestId?: string;
  riskLevel?: string;
  isCompliant?: boolean;
  recommendationSummary?: string;
  aiGeneratedFields?: Record<string, unknown>;
  aiGeneratedLabels?: Record<string, unknown>;
  aiGeneratedFieldKeys?: string[];
  mappingWarnings?: string[];
}

export interface AnalyzeBookResponseEnvelope {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: AnalyzeBookResponseData;
}

export const getPendingActions = () => {
  return request.get<PendingActionsResponse[]>("/api/MyRequest/PendingActions");
};

export const getApplicationPage = (params: ApplicationPageParams) => {
  return request.post<ApplicationPageResponse>(
    "/api/MyRequest/ApplicationPage",
    params,
  );
};

export const addNewApplication = (serviceId: number) => {
  return request.get<boolean>(`/api/MyRequest/AddNewApplication/${serviceId}`);
};

export const deleteApplication = (applicationId: number) => {
  return request.get<boolean>(
    `/api/MyRequest/DeleteApplication/${applicationId}`,
  );
};

export const cancelApplication = (applicationId: number | string) => {
  return request.get<boolean>(
    `/api/MyRequest/CancelApplication/${applicationId}`,
  );
};

export const duplicateApplication = (applicationId: number) => {
  return request.get<boolean>(
    `/api/MyRequest/DuplicateApplication/${applicationId}`,
  );
};

export const getApplicationStatuses = () => {
  return request.get<TypeDictionary[]>("/api/MyRequest/ApplicationStatuses");
};

export const getApplicationTypes = () => {
  return request.get<TypeDictionary[]>("/api/MyRequest/ApplicationTypes");
};

export const getApplicationDetail = (applicationId: number) => {
  return request.get<ApplicationDetailsResponse>(
    `/api/MyRequest/ApplicationDetail/${applicationId}`,
  );
};

export const getApplicationLifecycleActivities = (
  sourceApplicationId: number,
  targetServiceCode: string | number,
  licensePermitNo?: string | null,
) => {
  return request.get<LifecycleActivityContext>(
    `/api/MyRequest/ApplicationLifecycleActivities/${sourceApplicationId}`,
    {
      targetServiceCode,
      licensePermitNo,
    },
  );
};

export const getApplicationPartnerManagementContext = (
  applicationId: number,
  targetServiceCode: string | number,
) => {
  return request.get<PartnerManagementContext>(
    `/api/MyRequest/ApplicationPartnerManagementContext/${applicationId}`,
    {
      targetServiceCode,
    },
  );
};

// /api/Wallet/Detail
export const getWalletDetail = () => {
  return request.get<WalletDetailResponse>(`/api/Wallet/Detail`);
};

// /api/MyRequest/Pay
export const myRequestPay = (data: PayRequestDto) => {
  return request.post<MyRequestPayResponse>(`/api/MyRequest/Pay`, data);
};

export const saveMyRequestDelivery = (data: MyRequestDeliveryRequest) => {
  return request.post(`/api/MyRequest/Delivery`, data);
};

export const analyzeBookMaterial = (data: AnalyzeBookRequest) => {
  // P8 Plan A: route through the gateway (relative /api); no per-service base URL override.
  return request.post<AnalyzeBookResponseEnvelope, AnalyzeBookResponseEnvelope>(
    `/api/MyRequest/AI/analyze-book`,
    data,
    // AI multimodal analysis can run long; override the default 60s timeout to 10 minutes.
    { timeout: 10 * 60 * 1000*6 },
  );
};

export const getMyRequestDelivery = (applicationId: number | string) => {
  return request.get<MyRequestDeliveryResponse | null>(
    `/api/MyRequest/Delivery/${applicationId}`,
  );
};

export const submitDispositionSubmission = (
  applicationId: number | string,
  data: DispositionSubmissionRequest,
) => {
  return request.post(
    `/api/applications/${applicationId}/disposition-submissions`,
    data,
    {
      baseURL:
        import.meta.env.VITE_ADMIN_API_BASE_URL ||
        "https://umc-adminportal.sol.daypop.ai",
    },
  );
};
export interface SubmitDispositionProofRequest {
  applicationId: number | null;
  method: string;
  supportingDocuments: Array<string>;
  notes?: string;
}
export const saveSubmitDispositionProof = (
  data: SubmitDispositionProofRequest,
) => {
  return request.post(`/api/MyRequest/SubmitDispositionProof`, data);
};
// http://192.168.2.24:5002/api/MyRequest/ApplicationDetail/1
// export const getApplicationDetail = (id:string) => {
//   return request.get(`/api/MyRequest/ApplicationDetail/${id}`)
// }
