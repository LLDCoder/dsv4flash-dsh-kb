import request from "@/utils/request";

export interface ValueObj {
    id: number;
    nameEn: string;
    nameAr: string;
}

export interface RefundConversationPayload {
    messageContent: string;
    attachments: string[];
}

export interface RefundComment {
    commentId: number;
    messageContent: string;
    attachments: string[];
    userTypeId?: number;
    profileId?: number;
    userProfileId?: number;
    isCurrentProfile?: boolean;
    isCurrentUserProfile?: boolean;
    photoUrl?: string;
    isRead?: boolean;
    createBy?: string;
    createdOn: string;
    userName?: string;
    userId?: string;
    isInternal?: boolean;
    deadLine?: string;
    decisionTypeId?: number;
    decisionType?: ValueObj;
    commentTypeId?: number;
    commentTypeObj?: ValueObj;
    roleTypeId?: number;
    roleTypeObj?: ValueObj;
    detpartInfoObj?: ValueObj;
}

export interface RefundApplyForObj {
    userTypeId?: number;
    userName?: string;
}

export interface RefundPaymentInfo {
    transactionNo?: string;
    statusId?: number;
    statusObj?: ValueObj;
    transactionTypeId?: number;
    transactionTypeObj?: ValueObj;
    paymentMethodId?: number;
    paymentMethodObj?: ValueObj;
    amount?: number;
    applyForObj?: RefundApplyForObj;
    cardInfo?: string;
    desciption?: string;
    updateOn?: string;
}

export interface RelatedApplicationInfo {
    applicationId?: number;
    applicationDetailId?: number;
    applicationNo?: string;
    submissionTime?: string;
    statusId?: number;
    statusObj?: ValueObj;
    serviceId?: number;
    serviceObj?: ValueObj;
}

export interface RelatedViolationInfo {
    fineNumber?: string;
    violationNumber?: string;
    violationType?: string;
    violator?: string;
    statusId?: number;
    statusName?: string;
}

export interface RefundDetailResponse {
    id: number;
    categoryId: number;
    referenceNumber: string;
    amount: number;
    reasonId: number;
    additionalComments: string;
    attachmentsURL01?: string;
    attachmentsURL02?: string;
    attachmentsURL03?: string;
    applicationNumber: string;
    statusId: number;
    status?: string;
    userId?: string;
    createdOn: string;
    updateOn?: string;
    applyFor?: string;
    statusObj?: ValueObj;
    reasonObj?: ValueObj;
    categoryObj?: ValueObj;
    rejectedReason?: string;
    commentDetails?: RefundComment[];
    paymentInfo?: RefundPaymentInfo;
    relatedApplicationInfo?: RelatedApplicationInfo;
    relatedViolationInfo?: RelatedViolationInfo;
}

interface ApplicationType {
    categoryId: number | string;
    fineNumber: string;
    reasonId: number | string;
    amount: number;
    additionalComments: string;
    attachmentsURL01?: string;
    attachmentsURL02?: string;
    attachmentsURL03?: string;
    applicationNumber: string;
    referenceNumber: string;
};
export interface ApplicationParamsType {
    applicationNumber?: string;
    categoryId?: number | null;
    statusId?: number | null;
    pageSize?: number;
    pageIndex?: number;
    sortBy?: string;
    sortDirection?: number;
};

export interface IApplicationModel{
    categoryId: number;
    referenceNumber: string;
    amount: number;
    reasonId: number;
    additionalComments: string;
    attachmentsURL01?: string;
    applicationNumber: string;
    statusId?: number;
    attachmentsURL02?: string;
    attachmentsURL03?: string;
}

export interface RefundStatusStatisticsDto {
    pendingRefundCount?: number;
    refundedCount?: number;
    underReviewCount?: number;
    rejectCount?: number;
    cancleCount?: number;
    cancelCount?: number;
    approvedCount?: number;
    cancelledCount?: number;
    completedCount?: number;
    pendingApprovalCount?: number;
    rejectedCount?: number;
}

interface ApiResponse<TData> {
    isSuccess?: boolean;
    statusCode?: number;
    message?: string | null;
    data: TData;
}

export interface RefundApplicationListItem {
    id: number;
    applicationNumber: string;
    profileId?: number | string | null;
    profileName?: string | null;
    userTypeId?: number | string | null;
    userTypeName?: string | null;
    categoryId: number;
    referenceNumber: string;
    reasonObj?: ValueObj;
    amount: number | string;
    createdOn: string;
    statusId: number;
}

export interface RefundApplicationsPageData {
    pageIndex: number;
    pageSize: number;
    total: number;
    items: RefundApplicationListItem[];
}

export interface EnquiryApplicationData {
    applicaitonId?: number;
    applicationId?: number;
    applicationNumber?: string;
}

export interface RefundApplicationModelResult {
    id: number;
    applicationNumber: string;
}

export const refundApplicationModel = (data: IApplicationModel)=>{
    return request.post<ApiResponse<RefundApplicationModelResult>, ApiResponse<RefundApplicationModelResult>>("api/Refund/ApplicationModel", data);
}

export const refundApplication = (data: ApplicationType) => {
    return request.get("/api/Refund/Application", data);
};

export const refundDetail = (id: number | string) => {
    return request.get<{ data: RefundDetailResponse }, { data: RefundDetailResponse }>(`/api/Refund/${id}/ApplicationModel`);
};

export const refundEdit = (id: number | string, params: { statusId: number }) => {
    return request.put(`/api/Refund/${id}/ApplicationModel/Status`, params);
};

export const postRefundConversation = (
    refundId: number | string,
    data: RefundConversationPayload,
) => {
    return request.post(`/api/Refund/${refundId}/Application/Conversation`, data);
};

export const queryApplications = (params: ApplicationParamsType) => {
    return request.get<ApiResponse<RefundApplicationsPageData>, ApiResponse<RefundApplicationsPageData>>('/api/Refund/Applications', params);
};

export const queryCategorys = () => {
    return request.get<ApiResponse<ValueObj[]>, ApiResponse<ValueObj[]>>('/api/Refund/ApplicationModel/Categories');
};

export const queryReasons = () => {
    return request.get<ApiResponse<ValueObj[]>, ApiResponse<ValueObj[]>>('/api/Refund/ApplicationModel/Reasons');
};

export const queryStatus = () => {
    return request.get<ApiResponse<ValueObj[]>, ApiResponse<ValueObj[]>>('/api/Refund/ApplicationModel/Status');
};

export const queryStatusCount = () => {
    return request.get<RefundStatusStatisticsDto>('/api/Refund/Status/Statistics');
};

export const queryApplicationFee = (applicationNumber: string) => {
    return request.get<ApiResponse<number>, ApiResponse<number>>(`/api/Refund/ApplicationModel/${applicationNumber}/Fee`);
};

export const queryNumbers = (refundCategoryId: string | number) => {
    return request.get<ApiResponse<string[]>, ApiResponse<string[]>>(`/api/Refund/${refundCategoryId}/Numbers`);
};

export const enquiryApplication = (appId: string) => {
    return request.get<ApiResponse<EnquiryApplicationData>, ApiResponse<EnquiryApplicationData>>(`/api/Enquiry/Enquiry/Application?applicationNo=${appId}`);
};


export interface CheckRefundEligibilityData {
    refund: boolean;
    message: string | null;
}

export const checkRefundEligibility = (referenceNumber: string) => {
    return request.post<ApiResponse<CheckRefundEligibilityData>, ApiResponse<CheckRefundEligibilityData>>(
        "/api/Refund/CheckEligibility",
        { referenceNumber },
    );
};
