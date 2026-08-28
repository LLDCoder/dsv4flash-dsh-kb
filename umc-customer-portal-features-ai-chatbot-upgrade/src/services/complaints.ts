import request from '@/utils/request';

export interface ValueObj {
  id: number;
  nameEn: string | null;
  nameAr: string | null;
}

export interface IEnquiryConversations{
  attachements: string[];
  messageContent: string;
  submissionTime: string;
  userName: string;
  userId: string;
  isCurrentUserProfile: boolean;
  photoUrl: string;
}
interface IEnquiryStatus {
  id: number;
  nameEn: string;
  nameAr: string;
}
interface IService {
  id: number;
  nameEn: string;
  nameAr: string;
}
interface IEnquiryServices{
  enquiryId: number;
  enquiryNumber: string;
  enquiryStatusId: number;
  createdOn: string;
  enquiryStatusObj: IEnquiryStatus;
  serviceId: number;
  serviceObj: IService;
}
interface IEnquiryHistors{
  number: number;
  createdOn: string;
  reopenReason: string;
}
export interface EnquiryItem {
  id: number;
  profileId?: number | string | null;
  profileName?: string | null;
  userTypeId?: number | string | null;
  userTypeName?: string | null;
  enquiryNumber: string | null;
  enquiryTypeId: number;
  enquirySoruceId: number;
  serviceId: number;
  createdOn: string;
  enquiryStatusId: number;
  attachmentUrl?: string | null;
  attachmentUrls?: string[];
  enquiryTypeObj: ValueObj | null;
  serviceObj: ValueObj | null;
  enquiryStatusObj: ValueObj | null;
  enquirySoruceObj?: ValueObj | null;
  description?: string | null;
  enquiryConversations: IEnquiryConversations[];
  enquiryServices: IEnquiryServices[];
  enquiryHistors: IEnquiryHistors[];
  applicationNo: string;
  reopenTimes: number;
  messageCount: number;
}

export interface EnquiryListParams {
  EnquiryNumber?: string;
  StartTime?: string;
  EndTime?: string;
  EnquiryType?: number | string;
  PageSize?: number;
  PageIndex?: number;
  SortBy?: string;
  SortDirection?: number;
}

export interface EnquiryPageResponse {
  pageIndex: number;
  pageSize: number;
  total: number;
  items: EnquiryItem[] | null;
}

export interface EnquiryPageApiResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string | null;
  data: EnquiryPageResponse;
}

interface EnquiryApiResponse<T> {
  isSuccess: boolean;
  statusCode: number;
  message: string | null;
  data: T;
}

export type EnquiryTypeItem = ValueObj;

type EnquiryTypesApiResponse = EnquiryApiResponse<EnquiryTypeItem[]>;

export interface EnquiryResponseValueObjDtoApiResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string | null;
  data: EnquiryItem;
}

export const getEnquiryList = (params: EnquiryListParams) => {
  return request.get<EnquiryPageApiResponse, EnquiryPageApiResponse>('/api/Enquiry/List', params);
};

export const getEnquiryTypes = () => {
  return request.get<EnquiryTypesApiResponse, EnquiryTypesApiResponse>(
    '/api/Enquiry/EnquiryTypes',
    {},
    { skipErrorToast: true },
  );
};

export const getEnquirySources = () => {
  return request.get<EnquiryTypeItem[]>('/api/Enquiry/EnquirySource');
};

export const getEnquiryInfo = (id: number | string) => {
  return request.get<EnquiryResponseValueObjDtoApiResponse, EnquiryResponseValueObjDtoApiResponse>(`/api/Enquiry/${id}/EnquiryInfo`);
};
interface EnquiryApplicationsResponse{
  applicationDetailId: number;
  applicationNumber: string;
  serviceId: number;
}
type EnquiryApplicationsApiResponse = EnquiryApiResponse<EnquiryApplicationsResponse[]>;
export const getApplications = () => {
  return request.get<EnquiryApplicationsApiResponse, EnquiryApplicationsApiResponse>(
    "/api/Enquiry/Applications",
    {},
    { skipErrorToast: true },
  );
}
export interface EnquiryServiceResponse {
  id: number;
  nameEn: string;
  nameAr: string;
}
type EnquiryServicesApiResponse = EnquiryApiResponse<EnquiryServiceResponse[]>;
export const getServices = () => {
  return request.get<EnquiryServicesApiResponse, EnquiryServicesApiResponse>(
    "/api/Enquiry/Services",
    {},
    { skipErrorToast: true },
  );
}
interface EnquiryRequest{
  enquiryTypeId: number;
  serviceId: number;
  applicationDetailId: number;
  description: string;
  attachmentUrls: string[];
}
export interface PostEnquiryResponseData {
  enquiryNumber: string;
  enquiryId: string;
}
export const postEnquiry = (data: EnquiryRequest) => {
  return request.post<PostEnquiryResponseData>("/api/Enquiry", data);
}
interface StatusRequest{
  enquiryId: number;
  enquiryStatusId: number;
  reason?: string;
}
export const putStatus = (data: StatusRequest) => {
  return request.put('/api/Enquiry/Status', data)
}
interface ConversationRequest{
  enquiryId: number;
  messageContent: string;
  attachments: string[];
}
export const postConversation = ({ enquiryId, ...data }: ConversationRequest)=>{
  return request.post(`/api/Enquiry/${enquiryId}/Conversation`, data);
}
export interface IStatusCountResponse{
  underProcessingCount: number;
  resolvedCount: number;
  cancelledCount: number;
  completedCount: number;
}
export const getStatusCount = () => {
  return request.get<IStatusCountResponse>('/api/Enquiry/Status/Count')
}


// /api/Enquiry/UserServiceRating
export interface UserServiceRatingRequest{
  // enquiryId: number;
  rating: number;
  ticketNo?: string;
  comment?: string;
  isAnonymous?: boolean;
  sourcePage?: string;
  referenceNo?:string
}
interface UserServiceRatingResponse {
  isSuccess: boolean;
  message: string | null;
}
export const postUserServiceRating = (data: UserServiceRatingRequest) => {
  return request
    .post<UserServiceRatingResponse, UserServiceRatingResponse>(
      '/api/Enquiry/UserServiceRating',
      data,
    )
    .then((response) => {
      if (!response.isSuccess) {
        throw new Error(response.message || 'Rating submission failed.');
      }

      return response;
    });
}

// ---- Public (no-login) enquiry submission from the customer login page "Public Services" ----
export interface PublicEnquiryRequest {
  enquiryTypeId: number;
  serviceId?: number | null;
  applicationNumber?: string | null;
  fullName: string;
  email: string;
  mobileNumber?: string | null;
  description: string;
  attachmentUrls: string[];
  // Set after the user confirms "submit anyway" on the duplicate warning.
  forceCreate?: boolean;
}
export interface SimilarEnquiry {
  id: number;
  enquiryNumber: string;
  createdOn?: string;
}
export interface PublicEnquirySubmitResult {
  enquiryId?: number | null;
  enquiryNumber?: string | null;
  duplicateWarning: boolean;
  similarEnquiries?: SimilarEnquiry[] | null;
}
export const getPublicEnquiryTypes = () => {
  return request.get<EnquiryTypeItem[]>('/api/Enquiry/public/EnquiryTypes');
};
export const getPublicEnquiryServices = () => {
  return request.get<EnquiryServiceResponse[]>('/api/Enquiry/public/Services');
};
// Returns whether the given application number exists in the system (public/anonymous check).
export const checkPublicApplication = (applicationNumber: string) => {
  return request.get<boolean>('/api/Enquiry/public/Application', { applicationNumber });
};
export const postPublicEnquiry = (data: PublicEnquiryRequest) => {
  return request.post<PublicEnquirySubmitResult>('/api/Enquiry/public/Submit', data);
};
// Anonymous rating from the public enquiry success modal.
export const postPublicUserServiceRating = (data: UserServiceRatingRequest) => {
  return request.post('/api/Enquiry/public/UserServiceRating', data);
};

// ---- Public (no-login) enquiry details / message board / cancel (ticket number + email) ----
export interface PublicEnquiryMessageItem {
  senderName: string | null;
  isStaff: boolean;
  createdOn: string | null;
  messageContent: string | null;
  attachments: string[] | null;
}
export interface PublicEnquiryDetail {
  enquiryId: number;
  enquiryNumber: string | null;
  enquiryTypeId: number | null;
  enquiryTypeObj: ValueObj | null;
  enquiryStatusId: number | null;
  enquiryStatusObj: ValueObj | null;
  createdOn: string | null;
  enquirySourceObj: ValueObj | null;
  applicationNo: string | null;
  serviceObj: ValueObj | null;
  fullName: string | null;
  email: string | null;
  description: string | null;
  attachmentUrls: string[] | null;
  conversations: PublicEnquiryMessageItem[] | null;
}
export const getPublicEnquiryDetail = (enquiryNumber: string, email: string) => {
  return request.get<PublicEnquiryDetail>('/api/Enquiry/public/EnquiryDetail', { enquiryNumber, email });
};
export const postPublicEnquiryMessage = (data: { enquiryNumber: string; email: string; messageContent: string; attachments: string[]; }) => {
  return request.post('/api/Enquiry/public/Message', data);
};
export const postPublicEnquiryCancel = (enquiryNumber: string, email: string) => {
  return request.post('/api/Enquiry/public/Cancel', { enquiryNumber, email });
};
