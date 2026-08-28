import { useServicesStore } from "@/store/services";
import request, { type RequestConfig } from "@/utils/request";
import {
  getUserEstablishmentByID,
  type SelfMonitorProgramInline,
} from "@/services/userProfile";

export interface ServiceCategories {
  id: number;
  nameEn: string;
  nameAr: string;
}
export interface ServicePage {
  pageSize?: number;
  pageIndex?: number;
  sortBy?: string;
  sortDirection?: number;
  nameEn?: string;
  nameAr?: string;
  serviceCategoryId?: number;
  userTypeCodes?: string[];
  featured?: boolean;
  favorite?: boolean;
}
export interface addServices {
  serviceId: number;
  serviceCode?: string;
  formData: string;
  type: number;
  IsTest?: boolean;
  activityIds?: number[];
  applicationId?: number | null;
  ServiceCode: string | number | null;
  sourceServiceCode?: string | null;
  sourceMedialLicenseId?: number | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  breEnginePayload?: RuleStrategyValidatePayload;
  feeEnginePayload?: FeeQuoteEnginePayload;
  penaltyEnginePayload?: PenaltyEnginePayload;
  amount?: number;
  currencyCode?: string | null;
  feeBreakdownJson?: string | null;
  feeQuoteRawResponseJson?: string | null;
}

export type RuleStrategySubmissionMode = "save" | "submit";

export interface RuleStrategyIssue {
  code?: string;
  field?: string;
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface RuleStrategyEnvelope<T> {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface RuleStrategyValidateData {
  serviceId: number;
  ruleVersion?: string;
  isValid?: boolean;
  hasErrors?: boolean;
  failures?: RuleStrategyIssue[];
  warnings?: RuleStrategyIssue[];
  validatedAt?: string;
  [key: string]: unknown;
}

export interface RuleStrategyPayloadBase<TRequest> {
  actionType: number;
  expectedRuleVersion?: string;
  request: TRequest & {
    licensePermitNo?: string;
    mediaLicenseId?: number;
  };
}

export interface CustomerEngineEnvelope<TPayload> {
  serviceId: number;
  enginePayload: TPayload;
  penaltyScenarioCode?: string;
}

export interface Service901AccountBinding {
  activityId: number;
  accounts: Array<{
    categoryId: number;
    subCategoryIds: number[];
    platformId: number;
    displayName: string;
    url: string;
  }>;
}

export interface Service9RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  activityIds: number[];
  activityAccountBindings: Service901AccountBinding[];
  termsAgreed: boolean;
}

export interface Service901RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  activityIds: number[];
  activityAccountBindings: Service901AccountBinding[];
  termsAgreed: boolean;
}

export interface Service903RuleStrategyRequest {
  serviceId: number;
  applicationId: number;
  applicationDetailId: number;
  modificationItems: string[];
  establishmentFields: string[];
  tradeLicenseNumber?: string;
  addedEconomicActivityIds: number[];
  removedEconomicActivityIds: number[];
  termsAgreed: boolean;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
}

export interface Service902RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  activityIds: number[];
  cinemaScreenCategoryId?: number;
  termsAgreed: boolean;
}

export interface Service904RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  activityIds: number[];
  initialApprovalDocumentUrl?: string;
  termsAgreed: boolean;
}

export interface Service905RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  initialApprovalDocumentUrl?: string;
  termsAgreed: boolean;
}

export interface Service806RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  activityIds: number[];
  economicApprovalLetterUrl?: string;
  termsAgreed: boolean;
}

export interface Service80042RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  activityIds: number[];
  cancellationDocumentUrl?: string;
  termsAgreed: boolean;
}

export interface Service80041RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  activityIds: number[];
  cancellationDocumentUrl?: string;
  termsAgreed: boolean;
}

export interface Service80022RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  activityIds: number[];
  termsAgreed: boolean;
}

export interface Service80021RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  activityIds: number[];
  termsAgreed: boolean;
}

export interface Service804PartnerChangeItem {
  changeType?: string;
  partnerType?: string;
  identityMethod?: string;
  identityValue?: string;
}

export interface Service804RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  economicApprovalLetterUrl?: string;
  partnerChanges?: Service804PartnerChangeItem[];
  termsAgreed: boolean;
}

export interface Service1205RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  EconomicApprovalLetterUrl?: string;
  termsAgreed: boolean;
}

export interface Service1203RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  termsAgreed: boolean;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
}

export interface Service1204RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  renewalFieldCodes: string[];
}

export interface Service1202RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  activityIds: number[];
}

export interface Service802RuleStrategyChiefEditor {
  fullName: string;
  identityNumber?: string;
  photoUrl?: string;
  acquaintanceFormDocumentUrl?: string;
}

export interface Service802RuleStrategyRequest {
  serviceId: number;
  applicantUserId?: string;
  establishmentId?: string;
  applicationId?: number;
  applicationDetailId?: number;
  submissionMode?: RuleStrategySubmissionMode | string;
  requestTime?: string;
  chiefEditor?: Service802RuleStrategyChiefEditor;
  termsAgreed: boolean;
}

export interface Service803RuleStrategyChiefEditor {
  submitted: true;
  fieldKeys: string[];
  identityDocumentType: "EMIRATES_ID" | "UID" | "PASSPORT";
  identityDocumentNumber: string;
  attachmentKeys: string[];
}

export interface Service803RuleStrategyRequest {
  serviceId: number;
  applicationId: number;
  applicationDetailId: number;
  modificationItems: Array<
    "ESTABLISHMENT_INFORMATION" | "CHIEF_EDITOR"
  >;
  establishmentFields: string[];
  chiefEditor?: Service803RuleStrategyChiefEditor;
  termsAgreed: boolean;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
}

export type ServiceSocialMediaAccountChange =
  | {
      operation: "ADD";
      accountId: null;
      platformId: number;
      accountType: number;
      mediaCategoryId: number;
      displayName: string;
      websiteUrl: string;
      proofDocUrl: string;
      subCategoryIds: number[];
    }
  | {
      operation: "MODIFY";
      accountId: number;
      platformId: number;
      accountType: number;
      mediaCategoryId: number;
      displayName: string;
      websiteUrl: string;
      proofDocUrl: string;
      subCategoryIds: number[];
    }
  | {
      operation: "DELETE";
      accountId: number;
    };

export interface Service80011RuleStrategyRequest {
  serviceId: number;
  applicationId: number;
  applicationDetailId: number;
  licensePermitNo: string;
  mediaLicenseId: number;
  modificationItems: ["SOCIAL_MEDIA_ACCOUNT"];
  establishmentFields: [];
  socialMediaAccountChanges: ServiceSocialMediaAccountChange[];
  termsAgreed: boolean;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
}

export interface Service80012RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  applicationId: number;
  applicationDetailId: number;
  licensePermitNo: string;
  mediaLicenseId: number;
  modificationItems: Array<
    "ESTABLISHMENT_INFORMATION" | "SOCIAL_MEDIA_ACCOUNT"
  >;
  establishmentFields: string[];
  socialMediaAccountChanges: ServiceSocialMediaAccountChange[];
  termsAgreed: boolean;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
}

export interface Service8006ManagerProfile {
  fullNameEnglish?: string;
  fullNameArabic?: string;
  nationalityId?: number;
  occupation?: string;
  dateOfBirth?: string;
  gender?: string;
  emiratesId?: string;
  uid?: string;
  passportNumber?: string;
  photoUrl?: string;
  emiratesIdCopyUrl?: string;
  passportCopyUrl?: string;
  visaCopyUrl?: string;
}

export interface Service8006ExternalMediaAccountBinding {
  activityId: number;
  platform?: string;
  accountHandle?: string;
  accountUrl?: string;
}

export interface Service8006RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  activityIds: number[];
  useDefaultManagerProfile: boolean;
  managerProfile?: Service8006ManagerProfile;
  externalMediaAccounts: Service8006ExternalMediaAccountBinding[];
  termsAgreed: boolean;
  socialTermsAgreed: boolean;
}

export interface Service8007ManagerProfile {
  fullNameEnglish?: string;
  fullNameArabic?: string;
  nationalityId?: number;
  occupation?: string;
  dateOfBirth?: string;
  gender?: string;
  emiratesId?: string;
  uid?: string;
  passportNumber?: string;
  photoUrl?: string;
  emiratesIdCopyUrl?: string;
  passportCopyUrl?: string;
  visaCopyUrl?: string;
}

export interface Service8007GuardianProfile {
  fullName?: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  emailAddress?: string;
  mobileNumber?: string;
  gender?: string;
  occupation?: string;
}

export interface Service8007ExternalMediaAccountBinding {
  activityId: number;
  platform?: string;
  accountHandle?: string;
  accountUrl?: string;
}

export interface Service8007RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  activityIds: number[];
  useDefaultManagerProfile: boolean;
  managerProfile?: Service8007ManagerProfile;
  legalAgeProofUploaded: boolean;
  guardianProfile?: Service8007GuardianProfile;
  externalMediaAccounts: Service8007ExternalMediaAccountBinding[];
  termsAgreed: boolean;
  socialTermsAgreed: boolean;
}

export interface Service8008AccountHolderProfile {
  fullName?: string;
  identityNumber?: string;
  nationality?: string;
  mobileNumber?: string;
  emailAddress?: string;
}

export interface Service8008ManagerProfile {
  fullName?: string;
  identityNumber?: string;
  mobileNumber?: string;
  emailAddress?: string;
}

export interface Service8008GuardianProfile {
  fullName?: string;
  identityNumber?: string;
  relationship?: string;
  mobileNumber?: string;
  emailAddress?: string;
}

export interface Service8008ExternalMediaAccountBinding {
  activityId: number;
  platform?: string;
  accountHandle?: string;
  accountUrl?: string;
}

export interface Service8008RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  activityIds: number[];
  accountHolderProfile?: Service8008AccountHolderProfile;
  managerProfile?: Service8008ManagerProfile;
  guardianProfile?: Service8008GuardianProfile;
  externalMediaAccounts: Service8008ExternalMediaAccountBinding[];
  termsAgreed: boolean;
  socialTermsAgreed: boolean;
}

export interface Service4RuleStrategyApplicant {
  userId: string;
  userTypeCode: string;
  establishmentId: string;
}

export interface Service1RuleStrategyApplicant {
  userId: string;
  userTypeCode: string;
  establishmentId: string;
}

export interface Service1RuleStrategyResponsiblePerson {
  personId?: number;
  name?: string;
  countryId?: number;
  photoUrl?: string;
  emiratesId?: string;
  passportNumber?: string;
  identityType?: string;
  acquaintancePersonId?: number;
}

export interface Service1RuleStrategyRequest {
  serviceId: number;
  applicant: Service1RuleStrategyApplicant;
  form: {
    foreignOffice: {
      nameAr?: string;
      nameEn?: string;
      licenseNumber?: string;
      foreignAddress?: {
        countryId?: number;
        phoneNumber?: string;
      };
    };
    termsAccepted: boolean;
    responsiblePersons: Service1RuleStrategyResponsiblePerson[];
  };
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
}

export interface Service4RuleStrategyPerson {
  isValidResidence?: boolean;
  visaType: number;
  dateOfBirth: string;
  emiratesId?: string;
  passportNumber?: string;
  name: string;
  nameAr: string;
  genderId?: number;
  countryId?: number;
  photoUrl: string;
  emiratesIdCopyUrl?: string;
  passportCopyUrl?: string;
  visaCopyUrl?: string;
  inquiryResult?: {
    nationalityId?: number;
    genderId?: number;
    occupation?: string;
    emiratesIdExpiryDate?: string;
    visaExpiryDate?: string;
  };
  occupation?: string;
  emiratesIdExpiryDate?: string;
  passportExpiryDate?: string;
  visaExpiryDate?: string;
}

export interface Service4RuleStrategyRequest {
  serviceId: number;
  applicant: Service4RuleStrategyApplicant;
  form: {
    termsAccepted: boolean;
    officialLetterUrl: string;
    person: Service4RuleStrategyPerson;
  };
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
}

export interface Service13RuleStrategyApplicant {
  userId: string;
  userTypeCode: string;
  establishmentId: string;
}

export interface Service13RuleStrategyEquipment {
  photoEquipmentId?: number;
  photoEquipmentNameEn?: string;
  otherText?: string;
  number?: number;
}

export interface Service13RuleStrategyMemberPerson {
  emiratesId?: string;
  passportNumber?: string;
  name: string;
  title?: string;
  countryId?: number;
  photoUrl?: string;
}

export interface Service13RuleStrategyMember {
  person: Service13RuleStrategyMemberPerson;
}

export interface Service13RuleStrategyRequest {
  serviceId: number;
  applicant: Service13RuleStrategyApplicant;
  form: {
    purpose: string;
    arrivalDate?: string;
    emirateId?: number;
    portId?: number;
    requestUrl?: string;
    purposeUrl?: string;
    termsAccepted: boolean;
    equipments: Service13RuleStrategyEquipment[];
    members: Service13RuleStrategyMember[];
  };
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
}

export interface Service1201RuleStrategyLanguageItem {
  languageId: number;
  name: string;
}

export interface Service1101RuleStrategyLanguageItem {
  languageId: number;
  name: string;
}

export interface Service1201RuleStrategyChiefEditor {
  fullName: string;
  phoneNumber: string;
  email: string;
  qualificationId?: number;
  qualificationCopyUrl?: string;
  yearsOfExperience?: number;
  photoUrl?: string;
}

export interface Service1201RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  isElectronic: boolean;
  isMagazine: boolean;
  releaseTypeId: number;
  periodicalTypeId?: number;
  subjectCategoryIds: number[];
  languageItems: Service1201RuleStrategyLanguageItem[];
  url?: string;
  registrationUrl?: string;
  ownerApprovalUrl?: string;
  chiefEditor?: Service1201RuleStrategyChiefEditor;
  termsAccepted: boolean;
}

export interface Service1101RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  hasOwnerLicense: boolean;
  isMagazine: boolean;
  mediaLicenseNumber?: string;
  periodicalTypeId?: number;
  sourceCountryCode?: string;
  subjectCategoryIds: number[];
  versionNumber?: number;
  publishingHouse?: string;
  distributionStartDate?: string;
  distributionEndDate?: string;
  distributionEmirateIds: number[];
  numberOfCopies?: number;
  copyrightFileUrl?: string;
  localLicenseFileUrl?: string;
  languageItems: Service1101RuleStrategyLanguageItem[];
  termsAgreed: boolean;
}

export type Service1102RuleStrategyRequest = Service1101RuleStrategyRequest;

export interface Service1801RuleStrategyForeignEntity {
  nameEnglish?: string;
  nameArabic?: string;
  headquarterCountryId?: number;
  websiteUrl?: string;
  email?: string;
  phoneNumber?: string;
}

export interface Service1801RuleStrategyJournalist {
  fullNameEnglish?: string;
  fullNameArabic?: string;
  passportNumber?: string;
  passportCountryId?: number;
  passportCopyUrl?: string;
  personalPhotoUrl?: string;
  emiratesId?: string;
}

export interface Service1801RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  applicantUserTypeId?: number;
  isTemporaryPressCard?: boolean;
  businessTypeId?: number;
  assignmentLetterUrl?: string;
  foreignEntity: Service1801RuleStrategyForeignEntity;
  journalist: Service1801RuleStrategyJournalist;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  termsAgreed: boolean;
}

export interface Service1802RuleStrategyForeignEntity {
  nameEnglish?: string;
  nameArabic?: string;
  headquarterCountryId?: number;
  websiteUrl?: string;
  email?: string;
  phoneNumber?: string;
}

export interface Service1802RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  applicantUserTypeId?: number;
  applicationId?: number | null;
  applicationDetailId?: number;
  isTemporaryPressCard?: boolean;
  assignmentLetterUrl?: string;
  foreignEntity?: Service1802RuleStrategyForeignEntity;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  termsAgreed: boolean;
}

export interface Service1901RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  applicantUserTypeId?: number;
  selectedService18ApplicationId?: number;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  termsAgreed: boolean;
}

export interface Service2202RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  typeId: number;
  mediaMaterialTypeCode: string;
  title?: string;
  artistWorkTypeId?: number;
  languageId?: number;
  countryId?: number;
  copyrightsTypeId?: number;
  permitStartDate?: string;
  permitEndDate?: string;
  contentLink?: string;
  termsAgreed: boolean;
}

export interface Service1009RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  flag: number;
  mediaMaterialTypeCode: string;
  ageRatingPermitId?: number | string;
  title?: string;
  artistWorkTypeId?: number | string | unknown;
  languageId?: number | string;
  sourceCountryId?: number | string;
  copyrightsTypeId?: number | string;
  copyrightStartDate?: string;
  copyrightEndDate?: string;
  copyrightAttachmentFileUrl?: string;
  isDigital?: boolean;
  selectedPlatformCodes: string[];
  digitalGameContentFileUrl?: string;
  termsAgreed: boolean;
}

export interface Service1008RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  cinemaPermitTypeId: number;
  selectedFilmId?: number | string;
  selectedFilmTitle?: string;
  selectedFilmPermitNumber?: string;
  mediaMaterialTypeId?: number;
  artistWorkTypeId?: number | string;
  languageId?: number | string;
  durationInMinutes?: number;
  sourceCountryId?: number | string;
  copyrightsTypeId?: number | string;
  copyrightStartDate?: string;
  copyrightEndDate?: string;
  copyrightFileUrl?: string;
  termsAgreed: boolean;
}

export interface Service1007RuleStrategyTitleUrlItem {
  title: string;
  url: string;
}

export interface Service1007RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  cinemaPermitTypeId: number;
  titleUrlItems: Service1007RuleStrategyTitleUrlItem[];
  startDate?: string;
  endDate?: string;
  isTicketed?: boolean;
  nocFileUrl?: string;
  termsAgreed: boolean;
  activityId?: unknown;
}

export interface Service1006RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  cinemaPermitTypeId: number;
  titleUrlItems: Service1007RuleStrategyTitleUrlItem[];
  startDate?: string;
  endDate?: string;
  isTicketed?: boolean;
  termsAgreed: boolean;
}

export interface Service1005RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  cinemaPermitTypeId: number;
  title?: string;
  categoryId?: number | string;
  subCategoryId?: number | string;
  advertisementLink?: string;
  cinemaIds: unknown[];
  copyrightStartDate?: string;
  copyrightEndDate?: string;
  termsAgreed: boolean;
}

export interface Service1004RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  mediaMaterialTypeId: number;
  title?: string;
  artistWorkTypeId?: number | string;
  languageId?: number | string;
  countryId?: number | string;
  copyrightsTypeId?: number | string;
  permitStartDate?: string;
  permitEndDate?: string;
  copyrightCertificateFileUrl?: string;
  termsAgreed: boolean;
}

export type Service1003RuleStrategyRequest = Service1004RuleStrategyRequest;

export interface Service1002RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  cinemaPermitTypeId: number;
  ageRatingPermitId?: number | string;
  title?: string;
  artistWorkTypeId?: number | string;
  languageId?: number | string;
  durationInMinutes?: number;
  sourceCountryId?: number | string;
  copyrightsTypeId?: number | string;
  copyrightStartDate?: string;
  copyrightEndDate?: string;
  copyrightFileUrl?: string;
  isTicketed?: boolean;
  termsAgreed: boolean;
}

export interface Service1001RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  flag: number;
  mediaMaterialTypeCode: string;
  activityIds: Array<number | string>;
  isLocalFilm?: boolean;
  title?: string;
  artistWorkTypeId?: number | string;
  languageId?: number | string;
  sourceCountryId?: number | string;
  copyrightsTypeId?: number | string;
  durationInMinutes?: number;
  copyrightStartDate?: string;
  copyrightEndDate?: string;
  ministryOfEconomyRegistrationCertificateUrl?: string;
  trailerLinks: string[];
  posterFileUrls: string[];
  filmDirector?: string;
  filmWriter?: string;
  writerNationalityId?: number | string;
  writerEmiratesId?: string;
  writerEmiratesIdCopyUrl?: string;
  termsAgreed: boolean;
  requestedPackageItems: string[];
}

export interface PublicationMaterialRuleStrategyItem {
  materialTypeId: number;
  title: string;
  language: number;
  quantity: number;
}

export interface MaterialTypeLookupItem {
  id: number;
  nameAr?: string;
  nameEn?: string;
  code?: string;
  userTypeId?: number;
}

export interface PublicationBookRuleStrategyItem {
  isbn: string;
  title: string;
  authorName: string;
  language1: number;
  language2?: number;
}

export interface PublicationNewspaperRuleStrategyItem {
  title: string;
  quantity: number;
}

export interface Service303RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  policyNumber?: string;
  policyDate?: string;
  arrivalCountryId?: number | string;
  portId?: number;
  customDeclarationFileUrl?: string;
  policyFileUrl?: string;
  purchaseInvoicesFileUrl?: string;
  materials: PublicationMaterialRuleStrategyItem[];
  newspaperList: PublicationNewspaperRuleStrategyItem[];
  termsAgreed: boolean;
}

export interface Service304RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  beneficiaryType: 1 | 2 | 3 | 4;
  beneficiaryName?: string;
  mediaLicenseId?: number;
  licensePermitNo?: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  policyNumber?: string;
  policyDate?: string;
  arrivalCountryId?: number | string;
  portId?: number;
  customDeclarationFileUrl?: string;
  policyFileUrl?: string;
  purchaseInvoicesFileUrl?: string;
  materials: PublicationMaterialRuleStrategyItem[];
  bookList: PublicationBookRuleStrategyItem[];
  newspaperList: PublicationNewspaperRuleStrategyItem[];
  termsAgreed: boolean;
}

export interface Service302RuleStrategyRequest extends Service303RuleStrategyRequest {
  establishmentId: string;
  selectedMaterialTypeIds: number[];
  bookList: PublicationBookRuleStrategyItem[];
  newspaperList: PublicationNewspaperRuleStrategyItem[];
}

export interface Service301RuleStrategyRequest extends Service303RuleStrategyRequest {
  establishmentId: string;
  bookList: PublicationBookRuleStrategyItem[];
  newspaperList: PublicationNewspaperRuleStrategyItem[];
}

export interface Service205RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  publicationTypeId: number;
  printedTypeId: number;
  title?: string;
  authorName?: string;
  languages: number[];
  materialUrl?: string;
  termsAccepted: boolean;
  isLocalFilm?: boolean;
  directorName?: string;
  authorNationality?: string;
  authorIdentityNumber?: string;
}

export interface Service201RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  publicationTypeId: number;
  printedTypeId: number;
  title?: string;
  authorName?: string;
  languages: number[];
  numberOfEpisodes?: number;
  materialUrl?: string;
  termsAccepted: boolean;
}

export interface Service202RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  publicationTypeId: number;
  title?: string;
  authorName?: string;
  languages: number[];
  materialUrl?: string;
  termsAccepted: boolean;
}

export interface Service203RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  publicationTypeId: number;
  printedTypeId?: number | string;
  title?: string;
  authorName?: string;
  languages: number[];
  materialUrl?: string;
  termsAccepted: boolean;
  isbn?: string;
  edition?: string;
  publishMethod?: string;
  coverType?: string;
  subject?: string;
}

export interface Service204RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  publicationTypeId: number;
  bookCollectTypeId?: number | string;
  printingPermitId?: string;
  regulateEntryId?: string;
  numberOfItems?: number;
  qtyBookFair?: number;
  isElectronicBookType?: boolean;
  purchaseInvoiceUrl?: string;
  title?: string;
  authorName?: string;
  isbn?: string;
  nationalDepositoryNo?: string;
  printYear?: string;
  versionNumber?: string;
  languages?: number[];
  subjectCategory?: number;
  subjectSubCategory?: number;
  distributorAgency?: string;
  materialUrl?: string;
  termsAccepted: boolean;
  // Self-Monitor auto-approval linkage (FE-3, additive)
  bookLanguageIds?: number[];
  subjectSubCategoryId?: number;
  ageClassificationId?: number;
}

/**
 * Self-Monitor auto-approval fields returned on the rule/validate envelope
 * `data` side for Service204. All additive/optional; the UI reads them to drive
 * the Age Classification dropdown visibility and the auto-approval hints.
 */
export type Service204BookHistoryDecision = "Approved" | "Rejected" | "None";

export type Service204SelfMonitorProgramStatus =
  | "Trial"
  | "Active"
  | "Suspended"
  | "Expired"
  | "None";

/**
 * A Self-Monitor blocking reason. CPS may return either a bare code string, or
 * an object carrying a backend-localized message. When a message is present the
 * UI shows it verbatim; otherwise it falls back to `selfMonitor.reasons.<code>`
 * and finally to the raw code.
 */
export type Service204SelfMonitorBlockingReason =
  | string
  | {
      code?: string;
      message?: string;
    };

export interface Service204SelfMonitorRuleData {
  selfMonitorAutoApprovalEligible?: boolean;
  bookHistoryDecision?: Service204BookHistoryDecision;
  isSelfMonitorEnterprise?: boolean;
  selfMonitorProgramStatus?: Service204SelfMonitorProgramStatus;
  isArabicBook?: boolean;
  isSubjectSubCategoryAutoApproval?: boolean;
  isAgeClassificationSelfMonitored?: boolean;
  selfMonitorBlockingReasons?: Service204SelfMonitorBlockingReason[];
}

/**
 * Self-Monitor Program profile status (shared by FE-3 Age Classification
 * dropdown visibility and FE-4 profile badge).
 *
 * `isEligibleForAutoApproval` comes straight from CPS and already accounts for
 * expiry, so prefer it over comparing `status` yourself.
 */
export interface SelfMonitorProgramStatusResult {
  status: Service204SelfMonitorProgramStatus;
  certificateNumber?: string;
  /** Certificate effective date (CPS `effectiveDate`). */
  trialStartDate?: string;
  trialEndDate?: string;
  /** Certificate expiry date (CPS `expiryDate`). */
  validUntil?: string;
  /** Backend verdict: true while the programme is Trial or Active. */
  isEligibleForAutoApproval?: boolean;
  /** Display label prepared by CPS, e.g. "Self-Monitor Program - Trial". */
  label?: string;
}

const SELF_MONITOR_NONE: SelfMonitorProgramStatusResult = { status: "None" };

const toOptionalDateString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined;

/**
 * Reads the Self-Monitor Program state for an establishment.
 *
 * CPS delivered this as an **inline field on the establishment profile detail**
 * (`selfMonitorProgram`) rather than a standalone endpoint, so this helper wraps
 * `getUserEstablishmentByID` and normalizes the result. A missing record, a
 * missing id or a failed request all collapse to `{ status: "None" }`, which
 * callers already treat as "not a Self-Monitor establishment".
 *
 * ⚠️ The argument is the **establishment id** (the one the establishment
 * profile page carries in its `?id=` query and passes to
 * `GetUserEstablishmentByID`) — not a user profile id.
 */
export const getSelfMonitorProgramStatus = async (
  establishmentId?: string | number | null,
): Promise<SelfMonitorProgramStatusResult> => {
  const id = String(establishmentId ?? "").trim();
  if (!id) {
    return SELF_MONITOR_NONE;
  }

  try {
    const response = await getUserEstablishmentByID(id);
    const program = (
      response as { data?: { selfMonitorProgram?: SelfMonitorProgramInline | null } }
    )?.data?.selfMonitorProgram;

    if (!program?.status) {
      return SELF_MONITOR_NONE;
    }

    return {
      status: program.status,
      certificateNumber: program.certificateNumber ?? undefined,
      trialStartDate: toOptionalDateString(program.effectiveDate),
      trialEndDate: toOptionalDateString(program.trialEndDate),
      validUntil: toOptionalDateString(program.expiryDate),
      isEligibleForAutoApproval: program.isEligibleForAutoApproval,
      label: program.label,
    };
  } catch {
    return SELF_MONITOR_NONE;
  }
};

export interface Service21RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  mediaMaterialTypeCode: string;
  requestTypes: string[];
  title?: string;
  artistWorkTypeId?: number | string;
  languageId?: number | string;
  durationInMinutes?: number;
  countryId?: number | string;
  copyrightsTypeId?: number | string;
  permitStartDate?: string;
  permitEndDate?: string;
  trailerLinks: string[];
  posterFileUrls: string[];
  termsAgreed: boolean;
}

export interface Service2201RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  typeId: number;
  mediaMaterialTypeCode: string;
  posterTrailerPermitId?: number | string;
  title?: string;
  artistWorkTypeId?: number | string;
  languageId?: number | string;
  countryId?: number | string;
  copyrightsTypeId?: number | string;
  permitStartDate?: string;
  permitEndDate?: string;
  durationInMinutes?: number;
  termsAgreed: boolean;
}

export interface Service1010RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  flag: number;
  packageTypeId: number;
  mediaMaterialTypeCode: string;
  requestedPackageItems: string[];
  title?: string;
  artistWorkTypeId?: number | string;
  languageId?: number | string;
  sourceCountryId?: number | string;
  copyrightsTypeId?: number | string;
  copyrightStartDate?: string;
  copyrightEndDate?: string;
  contentLink?: string;
  copyrightAttachmentFileUrl?: string;
  isDigitalForPackage?: boolean;
  selectedPlatformCodes: string[];
  termsAgreed: boolean;
}

export type Service9RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service9RuleStrategyRequest>;

export type Service901RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service901RuleStrategyRequest>;

export type Service903RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service903RuleStrategyRequest>;

export type Service902RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service902RuleStrategyRequest>;

export type Service904RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service904RuleStrategyRequest>;

export type Service905RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service905RuleStrategyRequest>;

export type Service806RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service806RuleStrategyRequest>;

export type Service80042RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service80042RuleStrategyRequest>;

export type Service80041RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service80041RuleStrategyRequest>;

export type Service80022RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service80022RuleStrategyRequest>;

export type Service80021RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service80021RuleStrategyRequest>;

export type Service804RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service804RuleStrategyRequest>;

export type Service1205RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1205RuleStrategyRequest>;

export type Service1203RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1203RuleStrategyRequest>;

export type Service1204RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1204RuleStrategyRequest>;

export type Service1202RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1202RuleStrategyRequest>;

export type Service802RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service802RuleStrategyRequest>;

export type Service803RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service803RuleStrategyRequest>;

export type Service80011RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service80011RuleStrategyRequest>;

export type Service80012RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service80012RuleStrategyRequest>;

export type Service8006RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service8006RuleStrategyRequest>;

export type Service8007RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service8007RuleStrategyRequest>;

export type Service8008RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service8008RuleStrategyRequest>;

export type Service4RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service4RuleStrategyRequest>;

export type Service1RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1RuleStrategyRequest>;

export type Service13RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service13RuleStrategyRequest>;

export type Service1201RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1201RuleStrategyRequest>;

export type Service1101RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1101RuleStrategyRequest>;

export type Service1102RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1102RuleStrategyRequest>;

export type Service1801RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1801RuleStrategyRequest>;

export type Service1802RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1802RuleStrategyRequest>;

export type Service1901RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1901RuleStrategyRequest>;

export type Service2202RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service2202RuleStrategyRequest>;

export type Service1009RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1009RuleStrategyRequest>;

export type Service1008RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1008RuleStrategyRequest>;

export type Service1007RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1007RuleStrategyRequest>;

export type Service1006RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1006RuleStrategyRequest>;

export type Service1005RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1005RuleStrategyRequest>;

export type Service1004RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1004RuleStrategyRequest>;

export type Service1003RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1003RuleStrategyRequest>;

export type Service1002RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1002RuleStrategyRequest>;

export type Service1001RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1001RuleStrategyRequest>;

export type Service303RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service303RuleStrategyRequest>;

export type Service304RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service304RuleStrategyRequest>;

export type Service302RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service302RuleStrategyRequest>;

export type Service301RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service301RuleStrategyRequest>;

export type Service205RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service205RuleStrategyRequest>;

export type Service201RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service201RuleStrategyRequest>;

export type Service202RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service202RuleStrategyRequest>;

export type Service203RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service203RuleStrategyRequest>;

export type Service204RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service204RuleStrategyRequest>;

export type Service21RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service21RuleStrategyRequest>;

export type Service2201RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service2201RuleStrategyRequest>;

export interface Service2401RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  mediaLicenseInternalId?: number | string;
}

export type Service2401RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service2401RuleStrategyRequest>;

export interface Service2402RuleStrategyRequest {
  serviceId: number;
  applicantUserId: string;
  establishmentId: string;
  submissionMode: RuleStrategySubmissionMode | string;
  requestTime: string;
  mediaLicenseInternalId?: number | string;
  selfMonitorCertificateNumber?: string;
}

export type Service2402RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service2402RuleStrategyRequest>;

export type Service1010RuleStrategyValidatePayload =
  RuleStrategyPayloadBase<Service1010RuleStrategyRequest>;

export type RuleStrategyValidatePayload =
  | Service9RuleStrategyValidatePayload
  | Service901RuleStrategyValidatePayload
  | Service902RuleStrategyValidatePayload
  | Service903RuleStrategyValidatePayload
  | Service904RuleStrategyValidatePayload
  | Service905RuleStrategyValidatePayload
  | Service806RuleStrategyValidatePayload
  | Service80042RuleStrategyValidatePayload
  | Service80041RuleStrategyValidatePayload
  | Service80021RuleStrategyValidatePayload
  | Service804RuleStrategyValidatePayload
  | Service1205RuleStrategyValidatePayload
  | Service1203RuleStrategyValidatePayload
  | Service1204RuleStrategyValidatePayload
  | Service1202RuleStrategyValidatePayload
  | Service802RuleStrategyValidatePayload
  | Service803RuleStrategyValidatePayload
  | Service80011RuleStrategyValidatePayload
  | Service80012RuleStrategyValidatePayload
  | Service8006RuleStrategyValidatePayload
  | Service8007RuleStrategyValidatePayload
  | Service8008RuleStrategyValidatePayload
  | Service1RuleStrategyValidatePayload
  | Service4RuleStrategyValidatePayload
  | Service13RuleStrategyValidatePayload
  | Service1101RuleStrategyValidatePayload
  | Service1102RuleStrategyValidatePayload
  | Service1201RuleStrategyValidatePayload
  | Service1801RuleStrategyValidatePayload
  | Service1802RuleStrategyValidatePayload
  | Service1901RuleStrategyValidatePayload
  | Service2202RuleStrategyValidatePayload
  | Service1009RuleStrategyValidatePayload
  | Service1008RuleStrategyValidatePayload
  | Service1007RuleStrategyValidatePayload
  | Service1006RuleStrategyValidatePayload
  | Service1005RuleStrategyValidatePayload
  | Service1004RuleStrategyValidatePayload
  | Service1003RuleStrategyValidatePayload
  | Service1002RuleStrategyValidatePayload
  | Service1001RuleStrategyValidatePayload
  | Service304RuleStrategyValidatePayload
  | Service303RuleStrategyValidatePayload
  | Service302RuleStrategyValidatePayload
  | Service301RuleStrategyValidatePayload
  | Service205RuleStrategyValidatePayload
  | Service201RuleStrategyValidatePayload
  | Service202RuleStrategyValidatePayload
  | Service203RuleStrategyValidatePayload
  | Service204RuleStrategyValidatePayload
  | Service21RuleStrategyValidatePayload
  | Service2201RuleStrategyValidatePayload
  | Service1010RuleStrategyValidatePayload;

export type RuleStrategyValidateEnvelope =
  CustomerEngineEnvelope<RuleStrategyValidatePayload>;

export interface AddFavorite {
  serviceId: number;
}

export type ServiceLookupMappingDto = {
  id: number;
  serviceCode: string;
  materialTypeId: number;
  periodicalTypeId: number;
  processId?: number | null;
  isExpressSupported?: boolean | null;
};

export const getServiceLookupMappingByServiceCode = (
  serviceCode: string | number,
) => {
  return request.get<{ data: ServiceLookupMappingDto } | ServiceLookupMappingDto>(
    `/api/Lookup/GetServiceLookupMappingByServiceCode`,
    { serviceCode },
  );
};

// Individual Profile API calls
export const getServicePage = (
  params: ServicePage,
  config: RequestConfig = {},
) => {
  return request.post("/api/Service/ServicePage", params, config);
};

export const getServiceCategories = () => {
  return request.get("/api/Service/ServiceCategories");
};

// De-dupe concurrent/remount-triggered duplicate calls for the same serviceId.
// Formily re-registers form fields during page init, which can cause the page
// effect to fire twice (old + new instance) before the first request resolves.
// We only merge in-flight requests; results are NOT cached long-term so callers
// that intentionally re-fetch (e.g. after navigation) still hit the server.
const userEstablishmentsInFlight = new Map<
  number,
  ReturnType<typeof request.get>
>();

export const getUserEstablishments = (serviceId: number) => {
  const existing = userEstablishmentsInFlight.get(serviceId);
  if (existing) {
    return existing;
  }
  const pending = request.get(`/api/Service/${serviceId}`);
  userEstablishmentsInFlight.set(serviceId, pending);
  void pending.finally(() => {
    userEstablishmentsInFlight.delete(serviceId);
  });
  return pending;
};
export const getApplicationDetail = (applicationId: number) => {
  return request.get(`/api/MyRequest/ApplicationDetail/${applicationId}`);
};
export const AddNewApplication = (params: addServices) => {
  return request.post(
    // "http://172.16.8.135:5206/api/MyRequest/AddNewApplication",
   `/api/MyRequest/AddNewApplication`,
    params,
  );
};

export interface UserEstablishmentProfileDto {
  licenseNumber: string | null;
  trnumber: string | null;
  licenseExpiryDate: string | null;
  licenseCopyUrl: string | null;
  establishmentTypeName: string | null;
  emails: string | null;
  nameAr: string | null;
  nameEn: string | null;
  authorityIdName: string | null;
  establishmentMobile: string | null;
  phoneCountryCode?: string | null;
  phoneLocalNumber?: string | null;
  tenancyContractEndDate: string | null;
  tenancyContractCopyUrl: string | null;
  memorandumOfAssociationCopyUrl: string | null;
  powerOfAttorneyCopyUrl: string | null;
  establishmentEmirateId: number | null;
  establishmentEmirateName: string | null;
  emirate: string | null;
  region: string | null;
  area: string | null;
  street: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const GetUserEstablishmentByUserProfileID = () => {
  return request.get<UserEstablishmentProfileDto>(
    "/api/User/GetUserEstablishmentByUserProfileID",
  );
};
export const CheckProfile = (val: number) => {
  return request.get(`/api/Service/CheckProfile/${val}`);
};
export const DocumentDowload = (fileName?: string) => {
  return request.get(`/api/Document/Dowload?fileName=${fileName || ""}`);
};
export const DocumentPreview = (fileName?: string) => {
  return request.get(`/api/pdf/preview?fileName=${fileName || ""}`);
};

export const CheckService = (serviceId: number) => {
  return request.get(`/api/Service/${serviceId}/Check`);
};

export type ServiceEntryGateFinalAction =
  | "Allow"
  | "Block"
  | "RedirectRenewal"
  | "ExternalRedirect";

export type ServiceEntryGateRequiredApplicantType =
  | "Individual"
  | "Establishment"
  | "Either";

export type ServiceEntryGateProfileState =
  | "missing"
  | "incomplete"
  | "complete";

export type ServiceEntryGateExpiredState = "grace" | "penalty";

export type ServiceEntryGatePromptCode =
  | "IN_PROGRESS_APPLICATION"
  | "REDIRECT_TO_RENEWAL"
  | "COMPLETE_PROFILE_VERIFICATION"
  | "SWITCH_ESTABLISHMENT_PROFILE"
  | "ADD_ESTABLISHMENT_PROFILE"
  | "RENEWABLE_DOCUMENT_NOT_FOUND"
  | "SUSPENDED_DOCUMENT_EXISTS"
  | "EXISTING_VALID_DOCUMENT"
  | "DOCUMENT_STATUS_INVALID"
  | "DOCUMENT_NOT_FOUND"
  | "ApplicantTypeNotAllowed"
  | "MissingEstablishmentContext"
  | "MissingPrerequisiteDocument"
  | "PrerequisiteDocumentUnavailable"
  | (string & {});

export interface ServiceEntryGateMissingPrerequisiteService {
  serviceCode?: string | null;
  serviceName?: string | null;
  description?: string | null;
}

export interface ServiceEntryGateDecisionVariables
  extends Record<string, unknown> {
  requirementDescription?: string | null;
  missingPrerequisiteServices?: Array<
    ServiceEntryGateMissingPrerequisiteService | null
  > | null;
}

export interface ServiceEntryGateDecision {
  finalAction: ServiceEntryGateFinalAction | (string & {});
  allowed?: boolean | null;
  action?: string | null;
  variables?: ServiceEntryGateDecisionVariables | null;
  reasonCode?: string | null;
  promptCode?: ServiceEntryGatePromptCode | null;
  targetServiceId?: number | null;
  targetServiceCode?: string | null;
  renewalServiceId?: number | null;
  renewalServiceCode?: string | null;
  canSwitchProfile?: boolean | null;
  targetProfileId?: number | string | null;
  targetUserTypeId?: number | string | null;
  requiredApplicantType?:
    | ServiceEntryGateRequiredApplicantType
    | (string & {})
    | null;
}

export interface ServiceEntryGateApplicant {
  userId?: string | null;
  profileId?: number | null;
  userTypeId?: number | null;
  userTypeCode?: string | null;
  applicantKind?: "Individual" | "Establishment" | (string & {}) | null;
  applicantType?: "Individual" | "Establishment" | (string & {}) | null;
  profileState?: ServiceEntryGateProfileState | (string & {}) | null;
  hasProfile?: boolean | null;
  currentUserTypeCode?: string | null;
  personId?: number | null;
  establishmentId?: number | null;
  governmentTypeId?: number | null;
  missingEstablishmentContext?: boolean | null;
  promptCode?: ServiceEntryGatePromptCode | null;
}

export interface ServiceEntryGateResult {
  rule: string;
  action: string;
  factSource?: string | null;
  reasonCode?: string | null;
  promptCode?: ServiceEntryGatePromptCode | null;
  targetServiceId?: number | null;
  targetServiceCode?: string | null;
}

export interface ServiceEntryGateDocumentInfo {
  identifierLabel?: string | null;
  /** Certificate number. Identity value the detail route keys on - do not render it. */
  identifierValue?: string | null;
  /** Number to render. Media license number when the document has one, certificate number otherwise. */
  showLicenseNumber?: string | null;
  applicationId?: number | string | null;
  applicationNumber?: string | null;
  applicationStatus?: string | null;
  licenseId?: number | string | null;
  licenseNumber?: string | null;
  licenseStatus?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  expiredState?: ServiceEntryGateExpiredState | (string & {}) | null;
  graceDays?: number | null;
  remainingGraceDays?: number | null;
  renewalServiceId?: number | string | null;
  renewalServiceCode?: string | null;
  detailRoute?: string | null;
  penaltyApplies?: boolean | null;
  penaltyRequired?: boolean | null;
  requiredParentLicenseType?: string | null;
  requiredParentServiceCode?: string | null;
  requiredParentLicenseName?: string | null;
  missingReason?: string | null;
}

export interface ServiceEntryGateUiHints {
  applicantMode?: "Individual" | "Establishment" | "Both" | null;
  allowApplicantSwitch?: boolean | null;
  variant?: string | null;
  establishmentTypes?: string[] | null;
  requiredUserTypeCodes?: Array<string | number> | null;
  currentUserTypeCode?: string | null;
  hasQualifiedProfile?: boolean | null;
  qualifyingProfiles?: Array<{
    profileId: number | string;
    userTypeId?: number | string | null;
    userTypeCode?: number | string | null;
    profileName?: string | null;
    nameEn?: string | null;
    nameAr?: string | null;
    title?: string | null;
    subtitle?: string | null;
    avatarUrl?: string | null;
    commercialLicenseNumber?: string | number | null;
    isEligible?: boolean | null;
    isSuspended?: boolean | null;
    suspended?: boolean | null;
    profileStatus?: string | number | null;
    profileStatusCode?: string | number | null;
    profileStatusName?: string | null;
    status?: string | number | null;
    statusCode?: string | number | null;
    statusName?: string | null;
    disabledReasonCode?: string | null;
  }> | null;
  availableSwitchProfiles?: Array<{
    profileId: number | string;
    userTypeId?: number | string | null;
    userTypeCode?: number | string | null;
    nameEn?: string | null;
    nameAr?: string | null;
    title?: string | null;
    subtitle?: string | null;
    avatarUrl?: string | null;
  }> | null;
}

export interface ServiceEntryGateInProgressInfo {
  applicationId?: number | null;
  applicationNumber?: string | null;
  applicationStatus?: string | null;
}

export interface ServiceEntryGatePayload {
  serviceId: number;
  serviceCode?: string | null;
  serviceType?: string | null;
  parentServiceId?: number | null;
  documentType?: string | null;
  applicant?: ServiceEntryGateApplicant | null;
  results?: ServiceEntryGateResult[] | null;
  decision?: ServiceEntryGateDecision | null;
  documentInfo?: ServiceEntryGateDocumentInfo | null;
  inProgressInfo?: ServiceEntryGateInProgressInfo | null;
  uiHints?: ServiceEntryGateUiHints | null;
  [key: string]: unknown;
}

export interface ServiceEntryGateEnvelope {
  isSuccess: boolean;
  statusCode: number;
  message?: string | null;
  data?: ServiceEntryGatePayload | null;
}

export const checkServiceEntryGate = (
  serviceId: number,
  config?: Pick<RequestConfig, "skipErrorToast">,
) => {
  if (!config) {
    return request.get<ServiceEntryGateEnvelope, ServiceEntryGateEnvelope>(
      `/api/Service/${serviceId}/Check`,
    );
  }

  return request.get<ServiceEntryGateEnvelope, ServiceEntryGateEnvelope>(
    `/api/Service/${serviceId}/Check`,
    {},
    config,
  );
};

export interface ServiceTypeDictionary {
  id: number | null;
  nameEn: string | null;
  nameAr: string | null;
}

export interface RelatedServiceDto {
  id: number | null;
  code: string | null;
  nameEn: string | null;
  nameAr: string | null;
  categoryNameEn: string | null;
  categoryNameAr: string | null;
  iconUri: string | null;
  userTypes: ServiceTypeDictionary[] | null;
}

export interface ServiceLearnData {
  serviceId: number | null;
  serviceName: string | null;
  serviceNameAr: string | null;
  serviceCode: string | null;
  departmentId: number | null;
  serviceDescriptionEn: string | null;
  serviceDescriptionAr: string | null;
  userType: ServiceTypeDictionary[] | null;
  scopAppcations: ServiceTypeDictionary[] | null;
  relateServices: RelatedServiceDto[] | null;
  estimatedCompletionTime: number | null;
  estimatedCompletionTimeUnit: string | null;
  lastUpdatedTime: string | null;
  validityPeriod: string | null;
  serviceFeeEn: string | null;
  serviceFeeAr: string | null;
  serviceDeliveryTimeEn: string | null;
  serviceDeliveryTimeAr: string | null;
  termsConditionsEn: string | null;
  termsConditionsAr: string | null;
  paymentTimeline?: number | string | null;
}

export interface ServiceLearnResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string | null;
  data: ServiceLearnData | null;
}

export const getServiceLearn = (serviceId: number) => {
  return request.get<ServiceLearnResponse, ServiceLearnResponse>(
    `/api/Service/${serviceId}/Learn/Authorized`,
  );
};

export const validateRuleStrategy = (data: RuleStrategyValidateEnvelope) => {
  return request.post<
    RuleStrategyEnvelope<RuleStrategyValidateData>,
    RuleStrategyEnvelope<RuleStrategyValidateData>
  >("/api/customer-engines/rule/validate", data);
};
export const getLookupData = (
  source: string,
  serviceCode?: string | number | null,
) => {
  const resolvedServiceCode =
    serviceCode ?? useServicesStore.getState().userInfo.servicesCode;

  return request.get(`/api/Lookup/GetLookupData`, {
    tableName: source,
    ServiceCode: resolvedServiceCode ?? undefined,
  });
};

const ARTIST_WORK_TYPE_MEDIA_MATERIAL_TYPE_BY_SERVICE_CODE: Record<string, number> = {
  "21": 1,
  "1001": 1,
  "1002": 1,
  "1003": 2,
  "1004": 3,
  "1008": 1,
  "1009": 4,
  "1010": 4,
  "2201": 1,
  "2202": 4,
};

export const resolveArtistWorkTypeMediaMaterialTypeId = (
  serviceCode?: string | number | null,
) => {
  const normalizedServiceCode = String(serviceCode ?? "").trim();

  return (
    ARTIST_WORK_TYPE_MEDIA_MATERIAL_TYPE_BY_SERVICE_CODE[
      normalizedServiceCode
    ] ?? 1
  );
};

export const getArtistWorkTypes = (mediaMaterialTypeId = 1) => {
  return request.get<MaterialTypeLookupItem[]>(
    `/api/Lookup/GetArtistWorkTypes?mediaMaterialTypeId=${mediaMaterialTypeId}`,
  );
};

export const getArtistWorkTypesByServiceCode = (
  serviceCode?: string | number | null,
) => {
  return getArtistWorkTypes(
    resolveArtistWorkTypeMediaMaterialTypeId(serviceCode),
  );
};
export const getMaterialTypes = (userTypeId: string | number) => {
  return request.get<MaterialTypeLookupItem[]>(
    `/api/Lookup/MaterialTypes?userTypeId=${userTypeId}`,
  );
};
export const getSocialMediaSubCategory = (id: string | number) => {
  return request.get(`/api/Lookup/GetSocialMediaSubCategory/${id}`);
};
export const getSubjectList = () => {
  return request.get(`/api/Lookup/GetSubjectList`);
};
export const getSubjectSubList = () => {
  return request.get(`/api/Lookup/GetSubjectSubList`);
};
export const getAuthoritiesByEmirateId = (emirateId: number) => {
  return request.get(`/api/Lookup/GetAuthoritiesByEmirateId?emirateId=${emirateId}`);
};
export const getServiceSelectTable = (serviceId: number) => {
  return request.get(`/api/Service/Config/${serviceId}/Fees`, {}, { skipErrorToast: true });
};

const requestEconomicActivitys = (serviceCode: string) =>
  request.get<unknown[]>(
    `/api/ServiceInfo/GetEconomicActivitys?ServiceCode=${serviceCode}`,
  );

const economicActivityRequests = new Map<
  string,
  ReturnType<typeof requestEconomicActivitys>
>();

export function getEconomicActivitys(feeLinkedServiceCode: string) {
  const serviceCode = String(feeLinkedServiceCode);
  const cachedRequest = economicActivityRequests.get(serviceCode);

  if (cachedRequest) {
    return cachedRequest;
  }

  const pendingRequest = requestEconomicActivitys(serviceCode).catch((error) => {
    economicActivityRequests.delete(serviceCode);
    throw error;
  });

  economicActivityRequests.set(serviceCode, pendingRequest);
  return pendingRequest;
}
export const getEconomicActivityByMoe = (
  establishmentId?: string | number,
) => {
  return request.get(
    `/api/Service/GetEconomicActivityByMoe`,
    { EstablishmentId: establishmentId },
    { skipErrorToast: true },
  );
};
export interface TODOPermitOption {
  value: number | string;
  label: string;
  labelEn?: string;
  labelAr?: string;
  title: string;
  titleEn?: string;
  titleAr?: string;
  category: string;
  categoryEn?: string;
  categoryAr?: string;
  languages: string;
  languagesEn?: string;
  languagesAr?: string;
  originCountry: string;
  originCountryEn?: string;
  originCountryAr?: string;
  copyrightsType: string;
  copyrightsTypeEn?: string;
  copyrightsTypeAr?: string;
  requestType: string;
  applyingPermitForLocalCinematicFilms: "Yes" | "No";
  filmDirector: string;
  filmWriter: string;
  durationInMinutes: string;
  permitValidityPeriod?: [string, string];
  ministryOfEconomyRegistrationCertificate?: string;
  writerEmiratesId?: string;
  writerNationalityId?: number;
  writerEmiratesIdCopy?: string;
  sourceCountryId?: number | string;
}

type PosterTrailerPermitByProfileIdApiItem = {
  id?: number | string | null;
  value?: number | string | null;
  applicationDetailId?: number | string | null;
  posterTrailerPermitId?: number | string | null;
  applicationNumber?: string | null;
  label?: string | null;
  labelEn?: string | null;
  labelAr?: string | null;
  title?: string | null;
  titleEn?: string | null;
  titleAr?: string | null;
  requestType?: string | null;
  posterType?: string | null;
  posterTypeEn?: string | null;
  posterTypeAr?: string | null;
  posterTypeId?: number | string | null;
  category?: string | number | null;
  categoryEn?: string | null;
  categoryAr?: string | null;
  artistWorkType?: string | number | null;
  artistWorkTypeEn?: string | null;
  artistWorkTypeAr?: string | null;
  artistWorkTypeId?: number | string | null;
  language?: string | number | null;
  languageEn?: string | null;
  languageAr?: string | null;
  languages?: string | number | null;
  languagesEn?: string | null;
  languagesAr?: string | null;
  languageId?: number | string | null;
  originCountry?: string | number | null;
  originCountryEn?: string | null;
  originCountryAr?: string | null;
  source?: string | number | null;
  sourceEn?: string | null;
  sourceAr?: string | null;
  sourceCountry?: string | number | null;
  sourceCountryEn?: string | null;
  sourceCountryAr?: string | null;
  sourceCountryId?: number | string | null;
  copyrightsType?: string | number | null;
  copyrightsTypeEn?: string | null;
  copyrightsTypeAr?: string | null;
  copyrightsTypeId?: number | string | null;
  durationInMinutes?: string | number | null;
  permitStartDate?: string | null;
  permitEndDate?: string | null;
  permitValidityPeriod?: [string, string] | string[] | null;
  applyingPermitForLocalCinematicFilms?: "Yes" | "No" | boolean | null;
  isLocalFilm?: boolean | null;
  filmDirector?: string | null;
  filmWriter?: string | null;
  ministryOfEconomyRegistrationCertificate?: string | null;
  attachmentUrl?: string | null;
  writerEmiratesId?: string | null;
  writerNationalityId?: number | string | null;
  writerEmiratesIdCopy?: string | null;
  writerEmiratesIdCopyUrl?: string | null;
};

const mapPosterTrailerPermitByProfileIdOption = (
  item: PosterTrailerPermitByProfileIdApiItem,
): TODOPermitOption => {
  const value =
    item.id ??
    item.value ??
    item.posterTrailerPermitId ??
    item.applicationDetailId ??
    item.applicationNumber ??
    "";
  const title =
    item.title ?? item.titleEn ?? item.titleAr ?? stringifyPermitValue(value);
  const category = item.category ?? item.artistWorkType ?? item.artistWorkTypeId;
  const categoryEn = item.categoryEn ?? item.artistWorkTypeEn ?? undefined;
  const categoryAr = item.categoryAr ?? item.artistWorkTypeAr ?? undefined;
  const languages = item.languages ?? item.language ?? item.languageId;
  const languagesEn = item.languagesEn ?? item.languageEn ?? undefined;
  const languagesAr = item.languagesAr ?? item.languageAr ?? undefined;
  const originCountry =
    item.originCountry ?? item.sourceCountry ?? item.source ?? item.sourceCountryId;
  const originCountryEn = item.originCountryEn ?? item.sourceCountryEn ?? item.sourceEn ?? undefined;
  const originCountryAr = item.originCountryAr ?? item.sourceCountryAr ?? item.sourceAr ?? undefined;
  const copyrightsType = item.copyrightsType ?? item.copyrightsTypeId;
  const labelParts = [
    item.applicationNumber,
    title,
    typeof languages === "string" ? languages : undefined,
  ].filter((part): part is string => Boolean(String(part ?? "").trim()));
  const label =
    (item.label ?? item.labelEn ?? labelParts.join(" | ")) || stringifyPermitValue(title);
  const permitStartDate =
    item.permitStartDate ??
    item.permitValidityPeriod?.[0] ??
    "";
  const permitEndDate =
    item.permitEndDate ??
    item.permitValidityPeriod?.[1] ??
    "";
  const applyingPermitForLocalCinematicFilms =
    item.applyingPermitForLocalCinematicFilms === "Yes" || item.isLocalFilm === true
      ? "Yes"
      : "No";

  return {
    value,
    label,
    labelEn: item.labelEn ?? label,
    labelAr: item.labelAr ?? undefined,
    title: stringifyPermitValue(title),
    titleEn: item.titleEn ?? item.title ?? undefined,
    titleAr: item.titleAr ?? undefined,
    category: stringifyPermitValue(category),
    categoryEn,
    categoryAr,
    languages: stringifyPermitValue(languages),
    languagesEn,
    languagesAr,
    originCountry: stringifyPermitValue(originCountry),
    originCountryEn,
    originCountryAr,
    copyrightsType: stringifyPermitValue(copyrightsType),
    copyrightsTypeEn: item.copyrightsTypeEn ?? undefined,
    copyrightsTypeAr: item.copyrightsTypeAr ?? undefined,
    requestType: stringifyPermitValue(item.posterTypeId),
    applyingPermitForLocalCinematicFilms,
    filmDirector: item.filmDirector ?? "",
    filmWriter: item.filmWriter ?? "",
    durationInMinutes: stringifyPermitValue(item.durationInMinutes),
    permitValidityPeriod:
      permitStartDate || permitEndDate
        ? [stringifyPermitValue(permitStartDate), stringifyPermitValue(permitEndDate)]
        : undefined,
    ministryOfEconomyRegistrationCertificate:
      item.ministryOfEconomyRegistrationCertificate ?? item.attachmentUrl ?? undefined,
    writerEmiratesId: item.writerEmiratesId ?? undefined,
    writerNationalityId:
      item.writerNationalityId === undefined || item.writerNationalityId === null
        ? undefined
        : Number(item.writerNationalityId),
    writerEmiratesIdCopy:
      item.writerEmiratesIdCopy ?? item.writerEmiratesIdCopyUrl ?? undefined,
    sourceCountryId:
      item.sourceCountryId === undefined || item.sourceCountryId === null
        ? undefined
        : item.sourceCountryId,
  };
};

export const getPosterTrailerPermitByProfileId = async (
  profileId: string,
  serviceCode?: string | number | null,
): Promise<TODOPermitOption[]> => {
  if (!String(profileId || "").trim()) {
    return [];
  }

  const normalizedServiceCode = String(serviceCode ?? "").trim();
  const response = await request.get<
    PosterTrailerPermitByProfileIdApiItem[] | { data?: PosterTrailerPermitByProfileIdApiItem[] | null }
  >(`/api/FormOptions/PosterTrailerPermitByProfileId`, {
    profileId,
    ...(normalizedServiceCode ? { serviceCode: normalizedServiceCode } : {}),
  });

  const payload =
    response && typeof response === "object" && "data" in response && Array.isArray(response.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

  return payload.map(mapPosterTrailerPermitByProfileIdOption);
};

export const TODOpermitApi = async (
  profileId?: string,
  serviceCode?: string | number | null,
) => {
  return {
    data: await getPosterTrailerPermitByProfileId(
      String(profileId || ""),
      serviceCode,
    ),
  };
};

export interface AgeRatingPermitOption {
  value: number | string;
  label: string;
  labelEn?: string;
  labelAr?: string;
  title: string;
  titleEn?: string;
  titleAr?: string;
  type: string;
  artistWorkTypeId?: string;
  typeEn?: string;
  typeAr?: string;
  language: string;
  languageEn?: string;
  languageAr?: string;
  source: string;
  sourceEn?: string;
  sourceAr?: string;
  copyrightsType: string;
  copyrightsTypeEn?: string;
  copyrightsTypeAr?: string;
  applyingPermitForLocalCinematicFilms: "Yes" | "No";
  filmDirector: string;
  filmWriter: string;
  writerEmiratesId?: string;
  nationalityId?: number;
  durationInMinutes: string;
  copyrightsValidityPeriod: [string, string];
  economyCertificate?: string;
  writerEmiratesIdCopy?: string;
}

export const getAgeRatingPermitAPI = async () => {
  return request.get<AgeRatingPermitOption[]>(
    `/api/FormOptions/AgeRatingPermit`
  );
};

/**
 * Age classification dictionary for the Service204 Self-Monitor flow.
 *
 * Do NOT confuse with `getAgeRatingPermitAPI` above: that one reads the
 * AgeRatingPermit business table (a user's historical permits, filtered by
 * profile) and carries no self-monitor flag. This one is the static
 * Lookup.AgeClassifications dictionary and is the only source that reports
 * `isSelfMonitored` (auto-approval condition 6).
 */
/**
 * One age classification row, keyed to a media material type.
 *
 * The published contract documents PascalCase (`Id` / `NameEn`) and a bare
 * array, but the deployed API answers in camelCase inside the standard
 * `{ isSuccess, data }` envelope — these names match what the service actually
 * returns.
 *
 * `logoUrl` is a bare file name (e.g. "BP-E.png"), not an absolute URL, so it
 * needs a base prefix before it can be rendered.
 *
 * Under an Arabic request the backend overwrites `nameEn`/`descEn` with the
 * Arabic text rather than adding new fields, so `nameEn` is "current language",
 * not "English".
 */
export interface AgeClassificationOption {
  id: number;
  nameEn: string;
  nameAr: string;
  mediaMaterialTypeId: number;
  logoUrl?: string | null;
  descEn?: string | null;
  descAr?: string | null;
  /** Auto-approval condition 6. NULL means "not self-monitored". */
  isSelfMonitored: boolean | null;
}

/**
 * Age classifications are scoped per media material type — films, games and
 * books each use their own rating scale — so the caller has to say which set it
 * wants. Mirrors `ARTIST_WORK_TYPE_MEDIA_MATERIAL_TYPE_BY_SERVICE_CODE` above.
 *
 * 204 (Book Trading) uses Book = 9, confirmed against the MediaMaterialTypes
 * lookup. Unmapped services return undefined so the caller skips the request
 * instead of silently offering another material's ratings.
 */
const AGE_CLASSIFICATION_MEDIA_MATERIAL_TYPE_BY_SERVICE_CODE: Record<
  string,
  number
> = {
  "204": 9,
};

export const resolveAgeClassificationMediaMaterialTypeId = (
  serviceCode?: string | number | null,
): number | undefined =>
  AGE_CLASSIFICATION_MEDIA_MATERIAL_TYPE_BY_SERVICE_CODE[
    String(serviceCode ?? "").trim()
  ];

export const getAgeClassifications = (mediaMaterialTypeId: number) => {
  return request.get<AgeClassificationOption[]>(
    `/api/Lookup/GetAgeClassifications`,
    { mediaMaterialTypeId },
  );
};

type AgeRatingPermitByProfileIdApiItem = {
  id?: number | string | null;
  value?: number | string | null;
  applicationDetailId?: number | string | null;
  posterTrailerPermitId?: number | string | null;
  applicationNumber?: string | null;
  label?: string | null;
  labelEn?: string | null;
  labelAr?: string | null;
  title?: string | null;
  titleEn?: string | null;
  titleAr?: string | null;
  type?: string | number | null;
  typeEn?: string | null;
  typeAr?: string | null;
  typeId?: number | string | null;
  artistWorkTypeId?: number | string | null;
  language?: string | number | null;
  languageEn?: string | null;
  languageAr?: string | null;
  languageId?: number | string | null;
  source?: string | number | null;
  sourceEn?: string | null;
  sourceAr?: string | null;
  sourceCountryId?: number | string | null;
  copyrightsType?: string | number | null;
  copyrightsTypeEn?: string | null;
  copyrightsTypeAr?: string | null;
  copyrightsTypeId?: number | string | null;
  isLocalFilm?: boolean | null;
  filmDirector?: string | null;
  filmWriter?: string | null;
  writerEmiratesId?: string | null;
  writerNationalityId?: number | string | null;
  durationInMinutes?: string | number | null;
  permitStartDate?: string | null;
  permitEndDate?: string | null;
  permitValidityPeriod?: [string, string] | string[] | null;
  copyrightsValidityPeriod?: [string, string] | null;
  attachmentUrl?: string | null;
  ministryOfEconomyRegistrationCertificate?: string | null;
  economyCertificate?: string | null;
  contentLink?: string | null;
  writerEmiratesIdCopy?: string | null;
  writerEmiratesIdCopyUrl?: string | null;
};

const stringifyPermitValue = (value: unknown) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const mapAgeRatingPermitByProfileIdOption = (
  item: AgeRatingPermitByProfileIdApiItem,
): AgeRatingPermitOption => {
  const value =
    item.id ??
    item.value ??
    item.posterTrailerPermitId ??
    item.applicationDetailId ??
    item.applicationNumber ??
    "";
  const title =
    item.title ?? item.titleEn ?? item.titleAr ?? stringifyPermitValue(value);
  const type = item.type ?? item.typeId ?? item.artistWorkTypeId;
  const language = item.language ?? item.languageId;
  const source = item.source ?? item.sourceCountryId;
  const copyrightsType = item.copyrightsType ?? item.copyrightsTypeId;
  const label =
    item.label ??
    item.labelEn ??
    item.applicationNumber ??
    (typeof title === "string" && title.trim() ? title : stringifyPermitValue(value));
  const permitStartDate =
    item.permitStartDate ??
    item.permitValidityPeriod?.[0] ??
    item.copyrightsValidityPeriod?.[0] ??
    "";
  const permitEndDate =
    item.permitEndDate ??
    item.permitValidityPeriod?.[1] ??
    item.copyrightsValidityPeriod?.[1] ??
    "";
  const applyingPermitForLocalCinematicFilms = item.isLocalFilm === true ? "Yes" : "No";

  return {
    value,
    label,
    labelEn: item.labelEn ?? label,
    labelAr: item.labelAr ?? undefined,
    title: stringifyPermitValue(title),
    titleEn: item.titleEn ?? item.title ?? undefined,
    titleAr: item.titleAr ?? undefined,
    type: stringifyPermitValue(type),
    artistWorkTypeId: stringifyPermitValue(item.artistWorkTypeId) || undefined,
    typeEn: item.typeEn ?? undefined,
    typeAr: item.typeAr ?? undefined,
    language: stringifyPermitValue(language),
    languageEn: item.languageEn ?? undefined,
    languageAr: item.languageAr ?? undefined,
    source: stringifyPermitValue(source),
    sourceEn: item.sourceEn ?? undefined,
    sourceAr: item.sourceAr ?? undefined,
    copyrightsType: stringifyPermitValue(copyrightsType),
    copyrightsTypeEn: item.copyrightsTypeEn ?? undefined,
    copyrightsTypeAr: item.copyrightsTypeAr ?? undefined,
    applyingPermitForLocalCinematicFilms,
    filmDirector: item.filmDirector ?? "",
    filmWriter: item.filmWriter ?? "",
    writerEmiratesId: item.writerEmiratesId ?? undefined,
    nationalityId:
      item.writerNationalityId === undefined || item.writerNationalityId === null
        ? undefined
        : Number(item.writerNationalityId),
    durationInMinutes: stringifyPermitValue(item.durationInMinutes),
    copyrightsValidityPeriod: [
      stringifyPermitValue(permitStartDate),
      stringifyPermitValue(permitEndDate),
    ],
    economyCertificate:
      item.ministryOfEconomyRegistrationCertificate ??
      item.attachmentUrl ??
      item.economyCertificate ??
      undefined,
    writerEmiratesIdCopy:
      item.writerEmiratesIdCopy ?? item.writerEmiratesIdCopyUrl ?? undefined,
  };
};

export const getAgeRatingPermitByProfileId = async (
  profileId: string,
  serviceCode?: string | number | null,
): Promise<AgeRatingPermitOption[]> => {
  if (!String(profileId || "").trim()) {
    return [];
  }

  const resolvedServiceCode =
    serviceCode ?? useServicesStore.getState().userInfo.servicesCode;
  const normalizedServiceCode = String(resolvedServiceCode ?? "").trim();
  const response = await request.get<
    AgeRatingPermitByProfileIdApiItem[] | { data?: AgeRatingPermitByProfileIdApiItem[] | null }
  >(`/api/FormOptions/AgeRatingPermitByProfileId`, {
    profileId,
    ...(normalizedServiceCode ? { serviceCode: normalizedServiceCode } : {}),
  });

  const payload =
    response && typeof response === "object" && "data" in response && Array.isArray(response.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

  return payload.map(mapAgeRatingPermitByProfileIdOption);
};

export const getLanguages = () => {
  return request.get(`/api/ContentLibrary/Languages`, {}, {
    skipUnauthorizedRedirect: true,
  });
};

export interface PublicationNameExistsRequest {
  serviceCode: string;
  name: string;
  excludeApplicationId?: number;
  excludeMediaLicenseId?: number;
}

export interface PublicationNameExistsResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string | null;
  data: {
    exists: boolean;
    normalizedName: string;
  } | null;
}

export const checkPublicationNameExists = (
  data: PublicationNameExistsRequest,
) => {
  return request.post<
    PublicationNameExistsResponse,
    PublicationNameExistsResponse
  >("/api/MediaLicense/CheckPublicationNameExists", data, {
    skipErrorToast: true,
  });
};

export interface BookApprovedStatusItem {
  isbn: string;
  BookApprovedStatus: number;
}
export interface BookApprovedStatusResponse {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: BookApprovedStatusItem[];
}
export const getISBNstatus = (data: string[]) => {
  return request.post<BookApprovedStatusResponse, BookApprovedStatusResponse>(
    "/api/MyRequest/GetBookApprovedStatusByIsbns",
    data,
  );
};
export const GetAllUserType = () => {
  return request.get(`/api/ServiceInfo/GetAllUserType`);
};

export const AddFavorite = (serviceId: number) => {
  return request.post(`/api/Service/AddFavorite?serviceId=${serviceId}`);
};

export const getFieldDictionaryList = () => {
  return request.get(`/api/Lookup/GetFieldDictionaryList`);
};
export const getPortsList = () => {
  return request.get(`/api/Lookup/GetPortsList`);
};

export interface CourierLookupItem {
  id?: number | string | null;
  value?: number | string | null;
  key?: number | string | null;
  code?: string | null;
  name?: string | null;
  label?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
  descEn?: string | null;
  descAr?: string | null;
  courierId?: number | string | null;
  courierCompanyId?: number | string | null;
  courierName?: string | null;
  courierNameEn?: string | null;
  courierNameAr?: string | null;
  companyName?: string | null;
  companyNameEn?: string | null;
  companyNameAr?: string | null;
}

export const getCourierList = () => {
  return request.get<{ data?: CourierLookupItem[] | null } | CourierLookupItem[]>(
    `/api/Lookup/GetCourierList`,
  );
};

export const getPhotographyServiceVerify = (PurposeOfPhotographys:Array<string>) => {
  return request.post(`/api/MyRequest/PhotographyServiceVerify`,PurposeOfPhotographys);
};

export const getPrintingPermitByProfileId = (
  profileId: string,
  publicationTypeId: number,
  photographyPurpose?: string | string[],
) => {
  return request.get(`/api/FormOptions/PrintingPermitByProfileId`, {
    profileId,
    publicationTypeId,
    PhotographyPurpose: Array.isArray(photographyPurpose)
      ? photographyPurpose.join(",")
      : photographyPurpose,
  });
};

export const getPressCardByProfileId = (profileId: string) => {
  return request.get(`/api/FormOptions/PressCardByProfileId`, {
    profileId,
  });
};

export const getPhotographyPermitExistingMember = (data: {
  pageIndex: number;
  pageSize: number;
  searchText?: string;
}) => {
  return request.post(`/api/FormOptions/PhotographyPermit/GetExistingMember`, data);
};

export const getRegulateEntryByProfileId = (profileId: string) => {
  return request.get(`/api/FormOptions/RegulateEntryByProfileId`, {
    profileId,
  });
};

export interface RegulateEntryBookOption {
  id?: number | string | null;
  Id?: number | string | null;
  bookId?: number | string | null;
  BookId?: number | string | null;
  title?: string | null;
  isbn?: string | null;
  authorName?: string | null;
  languageId?: Array<number | string> | null;
  numberOfCopies?: number | string | null;
  nationalDepositoryNo?: string | null;
  NationalDepositoryNo?: string | null;
  printYear?: number | string | null;
  PrintYear?: number | string | null;
  versionNumber?: number | string | null;
  VersionNumber?: number | string | null;
  subjectCategory?: number | string | null;
  subjectCategoryId?: number | string | null;
  SubjectCategory?: number | string | null;
  subjectSubCategory?: number | string | null;
  subjectSubCategoryId?: number | string | null;
  SubjectSubCategory?: number | string | null;
  distributorAgency?: string | null;
  DistributorAgency?: string | null;
  ageClassificationId?: number | string | null;
  ageClassification?: number | string | null;
  AgeClassification?: number | string | null;
  isApproved?: boolean | number | null;
  hasExistingService204Application?: boolean;
  existingService204ApplicationNumber?: string | null;
}

interface RegulateEntryBookOptionsResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string;
  data?: RegulateEntryBookOption[] | null;
}

export const getRegulateEntryBooksByApplicationNumber = async (
  applicationNumber?: string | number | null,
): Promise<RegulateEntryBookOption[]> => {
  const normalizedApplicationNumber = String(applicationNumber ?? "").trim();

  if (!normalizedApplicationNumber) {
    return [];
  }

  try {
    const response = await request.get<
      RegulateEntryBookOption[] | RegulateEntryBookOptionsResponse,
      RegulateEntryBookOption[] | RegulateEntryBookOptionsResponse
    >(
      `/api/FormOptions/RegulateEntryBooksByApplicationNumber`,
      {
        applicationNumber: normalizedApplicationNumber,
      },
      {
        skipErrorToast: true,
      },
    );

    if (Array.isArray(response)) {
      return response;
    }

    if (
      response &&
      typeof response === "object" &&
      Array.isArray(response.data)
    ) {
      return response.data;
    }
  } catch (error) {
    console.error("Failed to fetch regulate entry books:", error);
  }

  return [];
};

export interface FeeQuoteEnginePayload {
  actionType: number;
  expectedFeeVersion?: string;
  request: {
    serviceId: number;
    correlationId?: string;
    licensePermitNo?: string;
    mediaLicenseId?: number;
    applicant: {
      userId: string;
      userTypeCode: string;
      establishmentId: string;
      licensePermitNo?: string;
    };
    payload?: Record<string, unknown>;
    requestTime: string;
  };
}

export type FeeQuoteRequest = FeeQuoteEnginePayload;
export type FeeQuoteEnvelope = CustomerEngineEnvelope<FeeQuoteEnginePayload>;

export interface FeeBreakdownItem {
  legacyG3Code?: string;
  legacyCode?: string;
  code?: string;
  chargeName: string;
  chargeNameAr?: string | null;
  description?: string;
  amount: number;
  basis?: string;
  currency?: string;
}

export interface FeeQuoteFreeDecision {
  code?: string;
  reason?: string;
}

export interface FeeQuoteResponse {
  totalAmount: number;
  currency: string;
  breakdown: FeeBreakdownItem[];
  warnings?: Array<string | RuleStrategyIssue | Record<string, unknown>>;
  freeDecision?: FeeQuoteFreeDecision | null;
  quotedAt?: string;
}

export const getFeeStrategyQuote = (data: FeeQuoteEnvelope) => {
  return request.post<
    RuleStrategyEnvelope<FeeQuoteResponse>,
    RuleStrategyEnvelope<FeeQuoteResponse>
  >(
    "/api/customer-engines/fee/quote",
    data,
  );
};

export interface PenaltyEnginePayload {
  penaltyScenarioCode?: string;
  serviceId: number;
  referenceType: string;
  referenceId: number | string;
  correlationId?: string;
  requestTime?: string;
}

export interface PenaltyEvaluateRequest {
  serviceId: number;
  applicationId?: number;
  applicationNo?: string;
  penaltyScenarioCode: string;
  enginePayload: PenaltyEnginePayload;
}

export interface PenaltyEvaluateItem {
  code?: string;
  penaltyCode?: string;
  name?: string;
  penaltyName?: string;
  title?: string;
  description?: string;
  amount?: number;
  currentAmount?: number;
  fineAmount?: number;
  [key: string]: unknown;
}

export interface PenaltyEvaluateResponse {
  applies?: boolean;
  totalAmount?: number;
  currency?: string;
  items?: PenaltyEvaluateItem[];
  warnings?: Array<string | RuleStrategyIssue | Record<string, unknown>>;
  suggestedActions?: Array<
    string | RuleStrategyIssue | Record<string, unknown>
  >;
  expectedPenaltyVersion?: string;
  [key: string]: unknown;
}

export interface PenaltyEvaluateEnvelope {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string;
  data?: PenaltyEvaluateResponse | null;
}

export const getPenaltyEvaluate = (
  data: PenaltyEvaluateRequest,
  correlationId: string,
) => {
  return request.post<
    PenaltyEvaluateResponse | PenaltyEvaluateEnvelope,
    PenaltyEvaluateResponse | PenaltyEvaluateEnvelope
  >(
    "/api/customer-engines/penalty/evaluate",
    data,
    {
      headers: {
        "x-correlation-id": correlationId,
      },
      customErrorMessage: "Failed to evaluate penalty.",
    } as RequestConfig,
  );
};


export interface MediaLicenseByNumberResponse {
  mediaLicenseId: number;
  mediaLicenseNumber: string;
  establishmentId: number | null;
  establishmentNameEn: string | null;
  establishmentNameAr: string | null;
  establishmentLicenseNumber: string | null;
  certificateExpiryDate: string | null;
  certificateValid: boolean;
  numberOfBooksRegulateEntriesApplications: 0 | 1;
  numberOfComputerProgramsRegulateEntriesApplications: 0 | 1;
  numberOfVideoGamesRegulateEntriesApplications: 0 | 1;
  numberOfCinemaRegulateEntriesApplications: 0 | 1;
}

export interface MediaLicenseByNumberEnvelope {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string;
  data?: MediaLicenseByNumberResponse | null;
}

const unwrapMediaLicenseByNumber = (
  response: MediaLicenseByNumberResponse | MediaLicenseByNumberEnvelope | null,
): MediaLicenseByNumberResponse => {
  // The shared response interceptor resolves with the raw payload, which for this
  // endpoint is the `{ isSuccess, statusCode, message, data }` envelope. Unwrap it so
  // callers always receive the media license record itself.
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    !("certificateValid" in response)
  ) {
    const payload = (response as MediaLicenseByNumberEnvelope).data;
    if (payload) {
      return payload;
    }

    const error = new Error(
      (response as MediaLicenseByNumberEnvelope).message ||
        "Media license not found.",
    ) as Error & { statusCode?: number };
    error.statusCode =
      (response as MediaLicenseByNumberEnvelope).statusCode ?? 404;
    throw error;
  }

  return response as MediaLicenseByNumberResponse;
};

export const getMediaLicenseByNumber = async (mediaLicenseNumber: string) => {
  const normalizedMediaLicenseNumber = String(mediaLicenseNumber ?? "").trim();

  const response = await request.get<
    MediaLicenseByNumberResponse | MediaLicenseByNumberEnvelope,
    MediaLicenseByNumberResponse | MediaLicenseByNumberEnvelope
  >(`/api/FormOptions/MediaLicenseByNumber`, {
    mediaLicenseNumber: normalizedMediaLicenseNumber,
  });

  return unwrapMediaLicenseByNumber(response);
};
