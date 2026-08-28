import request from "@/utils/request";

interface IEnquiryInfoRequest{
    enquiryNumber: string;
    email: string;
}
interface NameLocale {
  id: number;
  nameEn: string;
  nameAr: string;
}
interface EnquiryConversation {
  messageContent: string;
  attachements: string[];
  userName: string;
  userId: string;
  submissionTime: string;
  userTypeId: number;
  userProfileId: number;
  isCurrentUserProfile: boolean;
  photoUrl: string;
  surceTypeId: number;
  departmentDeadLine: string;
  departmentInfoObj: NameLocale;
  transferDepartmentInfoObj: NameLocale;
}

interface EnquiryService {
  enquiryId: number;
  enquiryNumber: string;
  enquiryStatusId: number;
  createdOn: string;
  enquiryStatusObj: NameLocale;
  serviceId: number;
  serviceObj: NameLocale;
  description: string;
}

interface EnquiryHistory {
  number: number;
  reopenReason: string;
  createdOn: string;
}
export interface IEnquiryInfoResponse{
    id: number;
    enquiryNumber: string;
    applicationNo: string;
    enquiryTypeId: number;
    enquirySourceId: number;
    serviceId: number;
    createdOn: string;
    enquiryStatusId: number;
    attachmentUrl: string;
    reopenTimes: number;
    description: string;
    issueCategoryId: number;
    userProfileId: number;
    userId: string;
    enquiryTypeObj: NameLocale;
    serviceObj: NameLocale;
    enquiryStatusObj: NameLocale;
    enquirySoruceObj: NameLocale;
    issueCategoryObj: NameLocale;
    enquiryConversations: EnquiryConversation[];
    enquiryServices: EnquiryService[];
    enquiryHistors: EnquiryHistory[];
    attachmentUrls: string[];
}
export const getEnquiryInfo = (data: IEnquiryInfoRequest)=>{
    return request.get<IEnquiryInfoResponse>('/api/Enquiry/public/EnquiryInfo', data);
}
