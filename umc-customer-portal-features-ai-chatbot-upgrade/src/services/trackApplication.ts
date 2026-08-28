import request from "@/utils/request";

export type TrackApplicationType = 0 | 1 | 2 | 3;

export interface TrackApplicationName {
  id?: number | null;
  nameEn?: string | null;
  nameAr?: string | null;
}

export interface ServiceApplicationTrackDetail {
  referenceNo?: string | null;
  status?: TrackApplicationName | null;
  service?: TrackApplicationName | null;
  applicantName?: string | null;
  passportNumber?: string | null;
  applyfor?: string | null;
  submissionTime?: string | null;
  lastUpdatedTime?: string | null;
}

export interface EnquiryComplaintTrackDetail {
  referenceNo?: string | null;
  status?: TrackApplicationName | null;
  enquiryType?: TrackApplicationName | null;
  applicationNumber?: string | null;
  service?: TrackApplicationName | null;
  problemDescription?: string | null;
  submissionTime?: string | null;
}

export interface AppealTrackDetail {
  referenceNo?: string | null;
  status?: TrackApplicationName | null;
  appealReason?: string | null;
  violationNumber?: string | null;
  profileName?: string | null;
  notes?: string | null;
  submissionTime?: string | null;
}

export interface RefundTrackDetail {
  referenceNo?: string | null;
  status?: TrackApplicationName | null;
  refundCategory?: TrackApplicationName | null;
  applicationNumber?: string | null;
  refundReason?: TrackApplicationName | null;
  refundAmount?: number | null;
  submissionTime?: string | null;
}

export interface PublicTrackApplicationResponse {
  status?: number | null;
  messageCode?: string | null;
  message?: string | null;
  applicationType?: TrackApplicationType | number | null;
  referenceNumber?: string | null;
  requiresLogin?: boolean | null;
  serviceApplication?: ServiceApplicationTrackDetail | null;
  enquiryComplaint?: EnquiryComplaintTrackDetail | null;
  appeal?: AppealTrackDetail | null;
  refund?: RefundTrackDetail | null;
}

export interface PublicTrackApplicationApiResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: PublicTrackApplicationResponse | null;
}

export interface PublicTrackApplicationSearchPayload {
  referenceNumber: string;
  email: string;
}

export const searchPublicTrackApplication = (
  data: PublicTrackApplicationSearchPayload,
) => {
  return request.post<
    PublicTrackApplicationApiResponse,
    PublicTrackApplicationApiResponse
  >("/api/TrackApplication/public/Search", data);
};
