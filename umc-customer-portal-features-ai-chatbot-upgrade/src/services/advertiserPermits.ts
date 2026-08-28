import request from "@/utils/request";

export type AdvertiserPermitVerifyType = 1 | 2;

export interface AdvertiserPermitVerifyParams {
  query: string;
  type: AdvertiserPermitVerifyType;
  platform?: number[];
}

export interface AdvertiserPermitAccountDto {
  platform: number;
  title: string;
  url: string | null;
}

export interface AdvertiserPermitVerifyResultDto {
  isVerified: boolean;
  expiryDate: string | null;
  accounts: AdvertiserPermitAccountDto[];
}

export interface AdvertiserPermitVerifyResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data: AdvertiserPermitVerifyResultDto;
}

export interface SocialMediaLookupItem {
  Id: number;
  NameEn: string | null;
  NameAr: string | null;
  IsShown: boolean;
}

export interface SocialMediaLookupResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string | null;
  data: SocialMediaLookupItem[];
}

export const getSocialMediaPlatforms = () =>
  request.get<SocialMediaLookupResponse, SocialMediaLookupResponse>(
    "/api/Lookup/GetLookupData",
    { tableName: "SocialMedias" },
    { skipErrorToast: true },
  );

export const verifyAdvertiserPermit = (
  params: AdvertiserPermitVerifyParams,
) => {
  const { platform, ...restParams } = params;
  const queryParams = {
    ...restParams,
    ...(platform?.length ? { platform: platform.join(",") } : {}),
  };

  return request.get<
    AdvertiserPermitVerifyResponse,
    AdvertiserPermitVerifyResponse
  >("/api/advertiser-permits/verify", queryParams, {
    skipErrorToast: true,
  });
};
