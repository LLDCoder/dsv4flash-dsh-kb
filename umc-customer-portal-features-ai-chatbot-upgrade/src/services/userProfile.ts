import request from "@/utils/request";
import { useServicesStore } from "@/store/services";

// Individual Profile Interfaces
export interface AddUserProfileIndividualParams {
  userId: string;
  userTypeId: number;
  dataOfBirth: string;
  passportNumber: string;
  email: string;
  mobileNumber: string;
  mobileCountryCode?: string | null;
  mobileLocalNumber?: string | null;
  emiratesId: string;
  fullNameAr: string;
  fullNameEn: string;
  nationalityId: number;
  genderId: number;
  occupation: string;
  personalPhotoUrl: string;
  emiratesIdexpiryDate?: string | null;
  passportExpiryDate?: string | null;
  visaExpiryDate?: string | null;
  emiratesIdCopyUrl?: string;
  passportCopyUrl?: string;
  visaCopyUrl?: string;
  uid?: string;
  eidDocumentOrPassPortSacnUrl: string;
  emirateId: string;
  regionId: string;
  areaId: string;
  street: string;
  /** Map pin. Only meaningful as a pair; a lone axis is rejected with HTTP 400. */
  latitude?: number | null;
  longitude?: number | null;
  licenseExpiryDate: string;
  /** Set on add when `/api/icp/person` succeeded and form was populated from ICP. */
  isGethirdPartyApi?: boolean;
}

export interface UpdateUserProfileIndividualParams {
  proFileId: number;
  userId: string;
  userTypeId: number;
  dataOfBirth: string;
  passportNumber: string;
  email: string;
  mobileNumber: string;
  mobileCountryCode?: string | null;
  mobileLocalNumber?: string | null;
  emiratesId: string;
  fullNameAr: string;
  fullNameEn: string;
  nationalityId: number;
  genderId: number;
  occupation: string;
  personalPhotoUrl: string;
  emiratesIdexpiryDate?: string | null;
  passportExpiryDate?: string | null;
  visaExpiryDate?: string | null;
  emiratesIdCopyUrl?: string;
  passportCopyUrl?: string;
  visaCopyUrl?: string;
  uid?: string;
  eidDocumentOrPassPortSacnUrl: string;
  emirateId: number;
  regionId: number;
  areaId: number;
  street: string;
  /**
   * Map pin. Send the value the form actually holds, independent of how it was
   * entered: omitting the keys keeps the stored pin, an explicit null clears it,
   * and a lone axis is rejected with HTTP 400.
   */
  latitude?: number | null;
  longitude?: number | null;
  /** Present when resubmitting after ICP fields were confirmed in rejected + third-party flow. */
  isGethirdPartyApi?: boolean;
}

// Establishment Profile Interfaces
export interface AddUserProfileEstablishmentParams {
  userId: string;
  name?: string;
  idTypeCode?: string;
  dateBirth?: string | null;
  personalMobile?: string;
  mobileCountryCode?: string | null;
  mobileLocalNumber?: string | null;
  emiratesId?: string;
  personalEmail?: string;
  establishmentTypeId: number;
  workEmail?: string | null;
  commerceLicenseNumber?: string | null;
  licenseExpiryDate?: string | null;
  establishmentNameAr: string;
  establishmentNameEn: string;
  parentId?: number;
  authorityId?: number | null;
  establishmentMobile: string;
  phoneCountryCode?: string | null;
  phoneLocalNumber?: string | null;
  tenancyContractEndDate?: string | null;
  uploadCommerceLicenseURL?: string | null;
  uploadTenancyContractURL?: string | null;
  uploadMemorandumOfAssociationURL?: string | null;
  uploadPowerOfAttorneyURL?: string | null;
  establishmentEmirateId?: number;
  emirateId: number;
  regionId: number;
  areaId: number;
  street: string;
  /** Map pin. Only meaningful as a pair; a lone axis is rejected with HTTP 400. */
  latitude?: number | null;
  longitude?: number | null;
  officialLetterUrl?: string | null;
  passportNumber?: string | null;
  uid?: string | null;
  parters?: PartnerParams[];
  /** MOE/GetLicenseDetails third-party mapping succeeded; forwarded on save. */
  isGethirdPartyApi?: boolean;
}

export interface UpdateUserProfileEstablishmentParams {
  proFileId: number;
  userId: string;
  name?: string;
  idTypeCode?: string;
  dateBirth?: string | null;
  personalMobile?: string;
  mobileCountryCode?: string | null;
  mobileLocalNumber?: string | null;
  emiratesId?: string;
  personalEmail?: string;
  establishmentTypeId: number;
  workEmail?: string | null;
  commerceLicenseNumber?: string | null;
  licenseExpiryDate?: string | null;
  establishmentNameAr: string;
  establishmentNameEn: string;
  parentId?: number;
  authorityId?: number | null;
  establishmentMobile: string;
  phoneCountryCode?: string | null;
  phoneLocalNumber?: string | null;
  tenancyContractEndDate?: string | null;
  uploadCommerceLicenseURL?: string | null;
  uploadTenancyContractURL?: string | null;
  uploadMemorandumOfAssociationURL?: string | null;
  uploadPowerOfAttorneyURL?: string | null;
  establishmentEmirateId?: number;
  officialLetterUrl?: string | null;
  emirateId: number;
  regionId: number;
  areaId: number;
  street: string;
  /**
   * Map pin. Send the value the form actually holds, independent of how it was
   * entered: omitting the keys keeps the stored pin, an explicit null clears it,
   * and a lone axis is rejected with HTTP 400.
   */
  latitude?: number | null;
  longitude?: number | null;
  passportNumber?: string | null;
  uid?: string | null;
  /** MOE/GetLicenseDetails third-party mapping succeeded; forwarded on save. */
  isGethirdPartyApi?: boolean;
}

// Address dropdown list interfaces
export interface EmirateItem {
  id: number;
  nameEn: string;
  nameAr: string;
  code?: string;
}

export interface RegionItem {
  id: number;
  nameEn: string;
  nameAr: string;
  emirateId: number;
  code?: string;
}

export interface AreaItem {
  id: number;
  nameEn: string;
  nameAr: string;
  regionId: number;
  code?: string;
}

// Get User Profile Interfaces
export interface UserIndividualProfile {
  userProfile: {
    id: number;
    userId: string;
    userTypeId: number;
    personId: number;
    addressId: number;
    isCompleted: boolean;
    isApproved: boolean;
    status: string;
  };
  userPerson: {
    id: number;
    name: string;
    nationalityId: number;
    emiratesId: string;
    passportNumber: string;
    emiratesIdCopyUrl: string;
    passportCopyUrl: string;
    genderId: number;
    dateOfBirth: string;
    photoUrl: string;
    nameAr: string;
    tradeLicenseNo: string;
    tradeLicenseEndDate: string;
    emiratesIdexpiryDate: string;
    passportExpiryDate: string;
    personalEmail: string;
    personalMobile: string;
    occupation: string;
  };
}

export interface UserIndividualProfileResponse extends Record<string, unknown> {
  proFileId?: number;
  userId?: string;
  userTypeId?: number;
  type?: number | null;
  isGethirdPartyApi?: boolean | null;
  fullNameEn?: string | null;
  fullNameAr?: string | null;
  personalPhotoUrl?: string | null;
  emiratesId?: string | null;
  passportNumber?: string | null;
  uid?: string | null;
  rejectReason?: string | null;
  proFileStatus?: {
    code?: string | number | null;
    name?: string | null;
    nameEn?: string | null;
    nameAr?: string | null;
  } | null;
  profileStatus?: Record<string, unknown> | string | number | null;
  status?: Record<string, unknown> | string | number | null;
  statusCode?: string | number | null;
  statusName?: string | null;
  statusNameEn?: string | null;
  statusNameAr?: string | null;
  userProfile?: { status?: string | null } | null;
  IsExpiredDays?: string | number | null;
  isExpiredDays?: string | number | null;
  mobileNumber?: string | null;
  mobileCountryCode?: string | null;
  mobileLocalNumber?: string | null;
  emirateId?: number | string | null;
  regionId?: number | string | null;
  areaId?: number | string | null;
  street?: string | null;
}

/**
 * Self-Monitor Program state, inlined on the establishment profile detail
 * response (CPS delivered this instead of a standalone status endpoint).
 * `null` when the establishment has no Self-Monitor record.
 *
 * The backend already applies the Expired override before returning: when
 * `expiryDate` has passed it reports `status: "Expired"` and
 * `isEligibleForAutoApproval: false` even if the stored row still says
 * Trial/Active. Trust these two fields — do not recompute from `expiryDate`.
 */
export interface SelfMonitorProgramInline {
  id: number;
  status: "Trial" | "Active" | "Suspended" | "Expired";
  /** Display label prepared by the backend, e.g. "Self-Monitor Program - Trial". */
  label: string;
  certificateNumber?: string | null;
  effectiveDate?: string | null;
  /** effectiveDate + 1 year. */
  expiryDate?: string | null;
  /** effectiveDate + 3 months. */
  trialEndDate?: string | null;
  /** True while status is Trial or Active. */
  isEligibleForAutoApproval: boolean;
}

export interface UserEstablishmentProfile extends Record<string, unknown> {
  profielId: number;
  userId: string;
  selfMonitorProgram?: SelfMonitorProgramInline | null;
  userTypeId: number;
  establishmentTypeId: number;
  workEmail: string;
  commerceLicenseNumber: string;
  licenseExpiryDate: string;
  establishmentNameAr: string;
  establishmentNameEn: string;
  parentId: number;
  authorityId: number;
  personalMobile?: string | null;
  mobileCountryCode?: string | null;
  mobileLocalNumber?: string | null;
  phoneNumber: string;
  phoneCountryCode?: string | null;
  phoneLocalNumber?: string | null;
  tenancyContractEndDate: string;
  uploadCommerceLicenseURL: string;
  uploadTenancyContractURL: string;
  uploadMemorandumOfAssociationURL: string;
  uploadPowerOfAttorneyURL: string;
  licenseCopyUrl?: string;
  tenancyContractCopyUrl?: string;
  memorandumOfAssociationCopyUrl?: string;
  powerOfAttorneyCopyUrl?: string;
  statementCopyUrl?: string;
  officialLetterUrl?: string;
  emirateId: number;
  regionId: number;
  areaId: number;
  street: string;
}
interface UserInvitation {
  userProfileId: string;
  userTypeId: string;
  id: number;
  name: string;
  photoUrl: string;
  email: string;
}

interface UserEstablishment {
  userProfileId: string;
  id: number;
  userTypeId: string;
  userTypeCode?: string | null;
  nameEn: string;
  nameAr: string;
  email: string;
  establishmentUrl: string | null;
}

interface UserProfile {
  id: string;
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  isFirstLogin: boolean;
  createOn: string;
  userInvitation: UserInvitation;
  userEstablishments: UserEstablishment[];
  listRoles: any[];
  pendingModificationList: any[];
  pendingPaymentList: any[];
  rejectedList: any[];
}
// Type Dictionary and Partner related interfaces
export interface TypeDictionary {
  id: number;
  code: string;
  scope: string;
  nameEn: string;
  nameAr: string;
  isShown: boolean;
  descAr: string | null;
  descEn: string | null;
}

export interface CodeInfo {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
}

export interface NationalityInfo {
  id: number;
  fullNameAr: string;
  fullNameEn: string;
  nameAr: string;
  nameEn: string;
  isocode2: string;
  isocode3: string;
  flagUrl: string;
  bigFlagUrl: string;
  phoneCode: string;
  numericCode: number;
  regionId: number;
}

export interface PartnerListItem {
  id: number;
  source?: number;
  partnerTypeCode: string;
  partnerTypeCodeInfo: CodeInfo;
  dateBirth: string;
  emiratesId: string;
  fullNameAr: string;
  fullNameEn: string;
  representativeNameEn: string | null;
  representativeNameAr: string | null;
  representativeEmiratesId: string | null;
  nationalityId: number;
  nationalityIdInfo: CodeInfo;
  genderId: number;
  genderIdInfo: CodeInfo;
  expiryDate: string;
  occupation: string;
  personalPhotoUrl: string;
  passportUrl: string;
  visaUrl: string;
  emiratesIdUrl?: string;
  emiratesIdurl?: string;
  verificationMethodCode: string;
  uaeNumber: string;
  passportExpiryDate: string;
  visaExpiryDate: string;
  passportNumber: string;
  passportScanUrl: string;
  memorandumOfAssociationUrl?: string;
  powerOfAttorneyUrl?: string;
  statementUrl?: string;
}

export interface PartnerDetail {
  id: number;
  establishmentId: number;
  source?: number;
  partnerTypeCode: string;
  dateBirth: string;
  emiratesId: string;
  fullNameAr: string;
  fullNameEn: string;
  representativeNameEn: string | null;
  representativeNameAr: string | null;
  representativeEmiratesId: string | null;
  nationalityId: number;
  genderId: number;
  expiryDate: string;
  occupation: string;
  personalPhotoUrl: string;
  passportUrl: string;
  visaUrl: string;
  emiratesIdUrl?: string;
  emiratesIdurl?: string;
  verificationMethodCode: string;
  uaeNumber: string;
  passportExpiryDate: string;
  visaExpiryDate: string;
  passportNumber: string;
  passportScanUrl: string;
  updateOn: string;
  createdOn: string;
  memorandumOfAssociationUrl?: string;
  powerOfAttorneyUrl?: string;
  statementUrl?: string;
}

export interface PartnerParams {
  id?: number;
  establishmentId?: number;
  source?: number;
  /** License owner designation for commercial establishment partners */
  isOwner?: boolean;
  partnerTypeCode: string;
  dateBirth: string | null;
  emiratesId: string;
  fullNameAr: string;
  fullNameEn: string;
  representativeNameEn: string | null;
  representativeNameAr: string | null;
  representativeEmiratesId: string | null;
  nationalityId: number;
  genderId: number;
  expiryDate: string | null;
  occupation: string;
  personalPhotoUrl: string;
  passportUrl: string;
  visaUrl: string;
  emiratesIdUrl?: string;
  emiratesIdurl?: string;
  verificationMethodCode: string;
  uaeNumber: string;
  passportExpiryDate: string | null;
  visaExpiryDate: string | null;
  passportNumber: string | null;
  passportScanUrl: string;
  memorandumOfAssociationUrl?: string;
  powerOfAttorneyUrl?: string;
  statementUrl?: string;
}

// Individual Profile API calls
export const addUserProfileIndividual = (
  params: AddUserProfileIndividualParams,
) => {
  return request.post("/api/User/AddUserProFileIndividual", params);
};

export const updateUserProfileIndividual = (
  params: UpdateUserProfileIndividualParams,
) => {
  const payload = {
    ...params,
  } as UpdateUserProfileIndividualParams & Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(payload, "type")) {
    payload.type =
      payload.type === undefined || payload.type === null
        ? ""
        : String(payload.type);
  }

  return request.post("/api/User/UpdateUserProFileIndividual", payload);
};

const normalizeChangeIdentityUserTypeId = (
  userTypeID: string | number,
): number => {
  const normalizedUserTypeID =
    typeof userTypeID === "number" ? userTypeID : Number(userTypeID.trim());

  if (!Number.isInteger(normalizedUserTypeID) || normalizedUserTypeID <= 0) {
    throw new Error("ChangeIdentity userTypeID must be a positive numeric id");
  }

  return normalizedUserTypeID;
};

const normalizeChangeIdentityUserProfileId = (
  userProFileID: string | number,
) => {
  const normalizedUserProfileID = String(userProFileID ?? "").trim();

  if (!normalizedUserProfileID || normalizedUserProfileID === "0") {
    throw new Error("ChangeIdentity target profile must not be Global");
  }

  return normalizedUserProfileID;
};

export const userChangeIdentity = (params: {
  userTypeID: string | number;
  userProFileID: string | number;
}) => {
  return request.post("/api/User/ChangeIdentity", {
    ...params,
    userProFileID: normalizeChangeIdentityUserProfileId(params.userProFileID),
    userTypeID: normalizeChangeIdentityUserTypeId(params.userTypeID),
  });
};

// Establishment Profile API calls
export const addUserProfileEstablishment = (
  params: AddUserProfileEstablishmentParams,
) => {
  return request.post("/api/User/AddUserProFileEstablishments", params);
};

export const updateUserProfileEstablishment = (
  params: UpdateUserProfileEstablishmentParams,
) => {
  return request.post("/api/User/UpdateUserProFileEstablishments", params);
};

// Address dropdown list API calls
export const getEmirateList = () =>
  request.get<EmirateItem[]>("/api/User/GetEmirateList");

export const getRegionList = (emirateId?: number) => {
  const url = emirateId
    ? `/api/User/GetRegionList?emirateId=${emirateId}`
    : "/api/User/GetRegionList";
  return request.get<RegionItem[]>(url);
};

export const getAreaList = (regionId?: number) => {
  const url = regionId
    ? `/api/User/GetAreaList?regionId=${regionId}`
    : "/api/User/GetAreaList";
  return request.get<AreaItem[]>(url);
};

/**
 * Licensing authorities of one Emirate. When `establishmentTypeId` is a sub-type with a
 * licensing rule the backend narrows the list: Free Zone (5) returns free zone authorities,
 * Commercial Entity / Non-Profit / Shipping-Clearing / Advertising-Talent (2, 4, 20, 27) return
 * mainland authorities. Any other sub-type, or none at all, returns the full list.
 */
export const getLicensingAuthority = (
  emirateId: number,
  establishmentTypeId?: number,
) => {
  const url = establishmentTypeId
    ? `/api/User/GetLicensingAuthority/${emirateId}?establishmentTypeId=${establishmentTypeId}`
    : `/api/User/GetLicensingAuthority/${emirateId}`;
  return request.get<TypeDictionary[]>(url);
};

// Get User Profile API calls
export const getUserIndividual = (userId: string) => {
  return request.get<UserIndividualProfileResponse>(
    `/api/User/GetUserIndividual?userId=${userId}`,
  );
};

export const getUserIndividualByProfileId = (prifileId: string) => {
  return request.get<UserIndividualProfileResponse>(
    `/api/User/GetUserIndividualByProfileId?prifileId=${prifileId}`,
  );
};

export const getUserEstablishments = (userId: string) => {
  return request.get<UserEstablishmentProfile>(
    `/api/User/GetUserEstablishmentsList/${userId}`,
  );
};
export const getUserAllApproveProfiles = (userId: string) => {
  return request.get<UserProfile>(
    `/api/User/GetUserAllApproveProfiles?userId=${userId}`,
  );
};
export const getUpdateGuidePageVisible = () => {
  return request.post(
    "/api/User/UpdateGuidePageVisible",
    { isGuidePageVisible:false  },
  );
};

export interface GetUserEstablishmentsPageParams {
  userId: string;
  pageIndex: number;
  pageSize: number;
  keyword?: string;
}

export interface UserEstablishmentPageResponse {
  items: UserEstablishmentProfile[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export const getUserEstablishmentsPage = (
  params: GetUserEstablishmentsPageParams,
) => {
  let url = `/api/User/GetUserEstablishmentsList/${params.userId}?pageIndex=${params.pageIndex}&pageSize=${params.pageSize}`;
  if (params.keyword) {
    url += `&keyword=${params.keyword}`;
  }
  return request.get<UserEstablishmentPageResponse>(url);
};

export const getUserEstablishmentByID = (eId: string) => {
  return request.get<UserEstablishmentProfile>(
    `/api/User/GetUserEstablishmentByID/${eId}`,
  );
};

// Type Dictionary and Partner API calls
export const getTypeDictionaryList = (scope: string) => {
  return request.get<TypeDictionary[]>(
    "/api/ServiceInfo/GetTypeDictionaryList",
    { scope },
  );
};

export const getPublicationTypeByProfileId = (
  profileId: string,
  serviceCode?: string | number | null,
) => {
  const resolvedServiceCode =
    serviceCode ?? useServicesStore.getState().userInfo.servicesCode;

  return request.get<TypeDictionary[]>(
    "/api/FormOptions/PrintedTypeByProfileId",
    {
      profileId,
      serviceCode: resolvedServiceCode ?? "",
    },
  );
};

export const getAllUserType = () => {
  return request.get<TypeDictionary[]>("/api/ServiceInfo/GetAllUserType");
};

export const getCoverType = () => {
  return request.get<TypeDictionary[]>("/api/TypeDictionary/GetTypeDictionaries/CoverType")
}

let nationalityListInFlight: ReturnType<
  typeof request.get<NationalityInfo[]>
> | null = null;

// Share only concurrent requests. Clear the reference after settlement so later
// navigation still fetches the current list from the API.
export const getNationalityList = () => {
  if (nationalityListInFlight) {
    return nationalityListInFlight;
  }

  const pending = request.get<NationalityInfo[]>("/api/User/GetNationalityList");
  nationalityListInFlight = pending;
  const clearPendingRequest = () => {
    if (nationalityListInFlight === pending) {
      nationalityListInFlight = null;
    }
  };
  void pending.then(clearPendingRequest, clearPendingRequest);
  return pending;
};

export const getPartnersNewList = (eid: number) => {
  return request.get<PartnerListItem[]>(`/api/User/GetPartnersNewList/${eid}`);
};

export const getPartnerById = (id: string) => {
  return request.get<PartnerDetail>(`/api/User/GetPartnerById/${id}`);
};

export const addPartner = (params: PartnerParams) => {
  return request.post("/api/User/AddPatner", params);
};

export const deletePartner = (id: string) => {
  return request.delete(`/api/User/DeletePatner/${id}`);
};

export const updatePartner = (params: PartnerParams) => {
  return request.post("/api/User/UpdatePatner", params);
};

export const getEmiratesIdInfo = (
  emiratesId: string,
  dateOfBirth: string,
  config: Record<string, unknown> = {},
) => {
  return request.get(
    "/api/icp/person",
    { emiratesId, dateOfBirth },
    config,
  );
};

export const getPersonalProfileEmiratesIdInfo = (
  emiratesId: string,
  dateOfBirth: string,
  config: Record<string, unknown> = {},
) => {
  return request.get(
    "/api/icp/person-porflie",
    { emiratesId, dateOfBirth },
    config,
  );
};

export const getPersonByEIDandBirthDate = (
  emiratesId: string,
  birthDate: string,
  config: Record<string, unknown> = {},
) => {
  return request.get(
    "/api/User/GetPersonByEIDandBirthDate",
    { emiratesId, birthDate },
    config,
  );
};

export const getPersonByUnifiedNumber = (
  unifiedNumber: string,
  dateOfBirth: string,
  config: Record<string, unknown> = {},
) => {
  return request.get(
    "/api/icp/personbyun",
    { unifiedNumber, dateOfBirth },
    config,
  );
};

export const getPersonalProfilePersonByUnifiedNumber = (
  unifiedNumber: string,
  dateOfBirth: string,
  config: Record<string, unknown> = {},
) => {
  return request.get(
    "/api/icp/personbyun-porflie",
    { unifiedNumber, dateOfBirth },
    config,
  );
};

export const getPassportInfo = (
  passportNumber: string,
  dateOfBirth: string,
  config: Record<string, unknown> = {},
) => {
  return request.get(
    "/api/icp/personbypassport",
    { passportNumber, passportNo: passportNumber, dateOfBirth },
    config,
  );
};

export const checkPersonalIdentityAvailable = (
  passportNumber: string,
  config: Record<string, unknown> = {},
) => {
  return request.post(
    "/api/User/CheckPersonalIdentityAvailable",
    { passportNumber },
    config,
  );
};

// /api/User/SetPartnersNewisOwner
export const setPartnersNewisOwner = (ids: Array<string | number | null | undefined>) => {
  const normalizedIds = Array.isArray(ids)
    ? ids
        .map((id) => String(id ?? "").trim())
        .filter(Boolean)
    : [];

  return request.post("/api/User/SetPartnersNewisOwner", {
    ids: normalizedIds,
  });
};

/** `/api/Moe/GetLicenseDetails` — Establishment Profile commercial license lookup. */
export interface GetLicenseDetailsParams {
  licenseERN: string;
  licenseExpiryDate: string;
}

export const postRetrieveLicenseDetailsMOEc = (params: GetLicenseDetailsParams) => {
  return request.post("/api/Moe/GetLicenseDetails", params);
};
