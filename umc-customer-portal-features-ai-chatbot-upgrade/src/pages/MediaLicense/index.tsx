import { nowGst, toApi as toGstApi } from "@/utils/gstTime";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useHistory, useLocation } from "react-router-dom";
import {
  CardPaymentProgressModal,
  CustomMessage,
} from "@/components/common";
import ApplicationProgress from "./components/ApplicationProgress";
import PaymentMethodSelectionModal from "@/components/common/PaymentMethodSelectionModal";

import ServiceDetails from "./components/ServiceDetails";
import { resolveServiceDeliveryTime } from "./components/serviceDetailsDeliveryTime";
import ReviewProfileInfo, {
  type ProfileInfoInter,
} from "./components/ReviewProfileInfo";
import { ReviewPersonalInformation } from "@/components/common";
import ReviewDeclaration from "./components/ReviewDeclaration";
import { CheckProfile, CheckService } from "@/services/services";
import warning from "@/assets/images/warning.svg";
import { appendPersistentQueryToUrl } from "@/utils/history";
import WarningModal from "./components/WarningModal";
import type { WarningModalProps } from "./components/WarningModal";
import { userChangeIdentity } from "@/services/userProfile";
import { completeIdentitySwitch } from "@/utils/identitySwitch";
import {
  finishProfileSwitchSession,
  startProfileSwitchSession,
} from "@/utils/profileSwitchSession";
import { Modal, Spin } from "antd";
import FormliyView from "@/components/common/FormliyView";
import { resolvePublicationNameCheckExclusions } from "@/components/designable/src/components/DataList/dataListRules";
import {
  hasProfileFormSchema,
  isProfileFormSourceBaselinePending,
  normalizeProfileFormBranches,
  resolveProfileFormSourceBaseline,
  type ProfileFormSource,
  type ProfileFormValues,
} from "@/components/designable/src/components/ProfileForm/profileFormRules";
import RequestModification from "../Detail/RequestModification";

import {
  AlertBanner,
  SubmissionResult,
  type ResultType,
} from "@/components/common";
import "./index.less";
import { ActionFooter, CustomButton } from "@/components/common";
import {
  getApplicationPartnerManagementContext,
  getMyRequestDelivery,
  saveMyRequestDelivery,
  type ApplicationDetailsResponse,
  type LifecycleActivityContext,
  type MyRequestDeliveryRequest,
  type PartnerManagementContext,
} from "@/services/myRequest";
import {
  useLicenseLifecycleSourceStore,
  type LicenseLifecycleSource,
} from "@/store/licenseLifecycleSource";
import { useServicesStore } from "@/store/services";
import { useUpdateFormStore } from "@/store/update-form";
import authStorage from "@/storage/authStorage";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import { useProfileSwitchGuardStore } from "@/store/profileSwitchGuard";
import { APPLICATION_STATUS_ID, TIME } from "@/config/constants";
import i18n from "@/localization/config";
import { useTranslation } from "react-i18next";
import { resolveStepNameLabel } from "@/utils/bilingualDisplay";
import { useCardPayment } from "../Detail/CardPayment/useCardPayment";
import CardPaymentFailurePage from "../Detail/CardPayment/CardPaymentFailurePage";

import {
  getUserEstablishments,
  getServiceLearn,
  AddNewApplication,
  GetUserEstablishmentByUserProfileID,
  getApplicationDetail,
  getArtistWorkTypesByServiceCode,
  getCourierList,
  resolveArtistWorkTypeMediaMaterialTypeId,
  type CourierLookupItem,
  type FeeQuoteResponse,
  type ServiceEntryGatePayload,
  type ServiceEntryGateProfileState,
} from "@/services/services";
import {
  getPublicationLanguageValidationKey,
  normalizePublicationLanguageSubmission,
} from "./ruleStrategyPayloadUtils";
import {
  getUserIndividual,
  type UserIndividualProfileResponse,
} from "@/services/userProfile";
import {
  getAreaList,
  getEmirateList,
  getRegionList,
  type AreaItem,
  type EmirateItem,
  type RegionItem,
} from "@/services/address";
import { postUserServiceRating } from "@/services/complaints";
import { getLicenseList } from "@/services/permitsLicense";
import { fillMissingLicenseLifecycleSourceFields } from "./licenseLifecycleSourceEnrichment";
import FormilyReviewList from "@/components/common/FormilyReviewList";
import {
  applyMockFormsListByServicesCode,
  getMockFormsListByServicesCode,
  resolveMockFormsListByServicesCode,
} from "./mockDataPayload";
import {
  getVisibleFormilyList,
  getVisibleFormilyListWithLiveValues,
} from "./stepVisibility";
import {
  normalizeService1801IdSelectorFormilyList,
  resolveService1801IdSelectorRuntimeType,
} from "./service1801IdSelectorRuntime";
import {
  buildMediaLicenseFeeStrategyEnginePayload,
  getMediaLicenseFeeStrategyConfig,
} from "./feeStrategyPayload";
import { buildService804PartnerDeltaSummary } from "./feeStrategyPayload/buildService804Payload";
import { buildService905PartnerDeltaSummary } from "./feeStrategyPayload/buildService905Payload";
import { buildService1205PartnerDeltaSummary } from "./feeStrategyPayload/buildService1205Payload";
import {
  PARTNER_MANAGEMENT_SERVICE_CODES,
  isPartnerManagementOwner,
  normalizePartnerManagementPartnerId,
  resolvePartnerManagementContextValues,
} from "./partnerManagementContext";
import { mergePartnerManagementContextFormValues } from "./partnerManagementFormValues";
import {
  normalizeActionType4ApplicationNo,
  overrideFeeEnginePayloadApplicationNoForActionType4,
} from "./feeStrategyPayload/feeStrategyPayloadUtils";
import { attachCustomerEngineRequestContext } from "./customerEngineRequestContext";
import {
  buildMediaLicenseRuleStrategyPayload,
  getMediaLicenseRuleStrategyConfig,
} from "./ruleStrategyPayload";
import { runRuleStrategyValidation } from "./runRuleStrategyValidation";
import { resolveEstablishmentId } from "./ruleStrategyPayloadShared";
import { resolveMyRequestStatus } from "@/utils/myRequestApproval";
import FeeQuoteDisplay from "./components/FeeQuoteDisplay";
import PenaltyDisplay from "./components/PenaltyDisplay";
import { shouldRenderFeeAndPenaltySection } from "./reviewFeeSectionVisibility";
import ModifyChangeSummary from "./components/ModifyChangeSummary";
import {
  isModifyFeeQuotePending,
  resolveModifyFeeSourceApplicationDetailId,
} from "./modifyFeeQuoteRules";
import { useMediaLicenseFeeQuote } from "./requestFeeQuote";
import { useMediaLicensePenaltyPreview } from "./requestPenaltyPreview";
import {
  patchFormDataWithArtistWorkTypeOptions,
  patchFormDataWithLifecycleActivityContext,
  patchFormDataWithService1007ScreeningPeriodRestriction,
  patchFormDataWithService1802ReadOnlyLock,
  patchFormDataWithService80021ReadOnlyLock,
  patchFormDataWithService80022ExpiryRefresh,
  patchFormDataWithService802ReadOnlyLock,
  patchFormDataWithService1204ReadOnlyLock,
  patchFormDataWithSelectTableOptions,
  type ArtistWorkTypeSelectOption,
} from "./specialServiceLogic";
import { useLifecycleDetailResolver } from "./useLifecycleDetailResolver";
import {
  PERMITS_LICENSE_ACTIONS,
  shouldLoadMediaLicenseProfile,
} from "./mediaLicenseProfileLoad";
import {
  ApplicantProfileModeSelector,
  RelatedEstablishmentSelector,
  useServiceEntryGateDialogController,
} from "@/components/ServiceEntryGate";
import { renderGateDialogIcon } from "@/components/ServiceEntryGate/dialogShared";
import {
  checkFinalSubmissionServiceEntryGate,
  ensureServiceEntryGateAccess,
  isServiceEntryGateEnabled,
  resolveServiceEntryGateProfileOptions,
} from "@/utils/serviceEntryGate";
import DeliveryInformation, {
  type DeliveryInformationErrors,
  type DeliveryInformationValues,
} from "@/pages/Detail/DeliveryInformation";
import {
  createDeliveryProfileRequestGuard,
  EMPTY_DELIVERY_INFORMATION_VALUES,
  isAbuDhabiEmirate,
  resolveInitialDeliveryInformation,
  shouldClearDeliveryCourierSelection,
} from "@/pages/Detail/DeliveryInformation/formValues";
import { firstNullableId } from "@/utils/nullableId";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import {
  DEFAULT_COUNTRY_DIAL_CODE,
  validateMobileNumber,
} from "@/components/common/MobileNumberInput";
import { normalizeDynamicMobileNumberFormValues } from "@/components/designable/src/components/MobileNumberInput";
import {
  getLicenseLifecycleSourceFromApplicationDetail,
  getLicenseLifecycleSourceFromRouteState,
  hasLicenseLifecycleSource,
  isValidApplicationId,
  mergeLifecycleActivitySourceContext,
  shouldRedirectMissingPermitLifecycleContext,
} from "@/utils/licenseLifecycleSource";
import {
  SERVICE_302,
  getService302FrontEndValidationMessage,
} from "./service302Utils";
import {
  hasValidApplicationFormDataBaseline,
  mergeApplicationFormValuesIntoFormsList,
  parseMediaLicenseStepFormData,
  type MediaLicenseFormStep,
} from "./applicationFormValuesMerge";
import {
  buildPenaltyEnginePayload,
  getPenaltyPayloadBlockingMessage,
  isPenaltyEnabledRenewServiceCode,
} from "./penaltyPayload";
import {
  buildModifyLifecycleActivityPayload,
  resolveModifyLifecycleActivityIds,
  resolveModifySourceApplicationActivityIds,
} from "./modifyLifecycleActivityPayload";
import {
  buildModifyLanguageSnapshots,
  buildModifyChangeSummary,
  MODIFY_CHANGE_SUMMARY_SERVICE_CODES,
  type ModifyFormStep,
} from "./modifyChangeSummary";
import { getMissingRequiredModifyEnginePayload } from "./modifyFinalSubmitRules";
import {
  applySocialMediaCanonicalAccountContext,
  applySocialMediaCanonicalAccountReset,
  applySocialMediaModifySchemaContext,
} from "./socialMediaModifySchema";
import {
  isSocialMediaAccountChangeTrackingService,
} from "@/components/designable/src/components/SocialMediaAccount/socialMediaAccountModify";
import {
  attachModifyReviewMetadata,
  clearModifyReviewMetadata,
  hasEmbeddedModifyOriginalValues,
  resolveModifyOriginalForms,
} from "./modifyOriginalFormValues";
import { stripSubmissionOnlyFormFields } from "./submissionFormFields";

const ARTIST_WORK_TYPE_SERVICE_CODES = new Set([
  "21",
  "1001",
  "1002",
  "1003",
  "1004",
  "1008",
  "1009",
  "1010",
  "2201",
  "2202",
]);
// Service 803 is excluded because its Modify scope does not include activities.
const LIFECYCLE_ACTIVITY_SERVICE_CODES = new Set([
  "1802",
  "806",
  "902",
  "903",
  "904",
  "1202",
  "1203",
  "1204",
  "802",
  "80041",
  "80042",
  "80022",
  "80021",
  "80011",
  "80012",
]);
const LIFECYCLE_ACTIVITY_SELECTION_SERVICE_CODES = new Set([
  "1802",
  "806",
  "902",
  "903",
  "904",
  "1202",
  "1203",
  "1204",
  "802",
  "80041",
  "80042",
  "80022",
  "80021",
  "80011",
  "80012",
]);
const MODIFY_ACTIVITY_PASSTHROUGH_SERVICE_CODES = new Set([
  "1203",
  "80011",
  "80012",
]);
const MODIFY_SOURCE_ACTIVITY_PASSTHROUGH_SERVICE_CODES = new Set(["803"]);
const CANCEL_SERVICE_CODES_WITHOUT_ECONOMIC_APPROVAL_PREFILL = new Set([
  "806",
  "904",
  "1202",
  "80041",
  "80042",
]);
const ECONOMIC_DEPARTMENT_APPROVAL_LETTER_FORM_VALUE_KEY =
  "EconomicDepartmentApprovalLetter";
const SERVICE_CODE_806 = "806";
const SERVICE_CODE_802 = "802";
const SERVICE_CODE_1802 = "1802";
const SERVICE_CODE_80021 = "80021";
const SERVICE_CODE_80022 = "80022";
const SERVICE_CODE_80041 = "80041";
const SERVICE_CODE_904 = "904";
const SERVICE_CODE_1007 = "1007";
const SERVICE_CODE_1202 = "1202";
const SERVICE_CODE_1204 = "1204";
const SERVICE_CODE_80042 = "80042";
const ACTION_TYPE4_CONTEXT_FEE_SERVICE_KINDS = new Set([
  "service803",
  "service804",
  "service903",
  "service1203",
  "service1205",
  "service80011",
  "service80012",
]);
type ArtistWorkTypeContext = {
  materialTypeId: number | null;
  options: ArtistWorkTypeSelectOption[];
  errorKey?:
    | "mediaLicensePage.artistWorkTypeOptionsUnavailable"
    | "mediaLicensePage.artistWorkTypeLoadFailed";
};

const EMPTY_ARTIST_WORK_TYPE_CONTEXT: ArtistWorkTypeContext = {
  materialTypeId: null,
  options: [],
};

type ServiceLookupConfig = {
  processId: number | null;
  isExpressSupported: boolean | null;
};

type DeliverySerializedValues = Omit<DeliveryInformationValues, "mobile"> &
  Pick<
    MyRequestDeliveryRequest,
    "mobile" | "mobileCountryCode" | "mobileLocalNumber"
  >;

const toApi = (
  values: DeliveryInformationValues,
): DeliverySerializedValues => {
  const { mobile, ...rest } = values;
  const mobileCountryCode = String(
    mobile.mobileCountryCode ?? "",
  ).trim();
  const mobileLocalNumber = String(
    mobile.mobileLocalNumber ?? "",
  ).trim();
  const hasMobileNumber = mobileLocalNumber.length > 0;

  return {
    ...rest,
    mobile: hasMobileNumber ? `${mobileCountryCode}${mobileLocalNumber}` : "",
    mobileCountryCode: hasMobileNumber ? mobileCountryCode : "",
    mobileLocalNumber: hasMobileNumber ? mobileLocalNumber : "",
  };
};

const EMPTY_FORM_VALUES: Record<string, unknown> = {};

type MediaLicenseServiceResponseData = Record<string, unknown> & {
  formsList?: MediaLicenseFormStep[];
  serviceDescriptionEn?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveApplicationDetailsResponse = (
  value: unknown,
): ApplicationDetailsResponse | null => {
  if (
    !isObjectRecord(value) ||
    typeof value.applicationId !== "number" ||
    (value.formData !== null && typeof value.formData !== "string")
  ) {
    return null;
  }

  return value as unknown as ApplicationDetailsResponse;
};

const resolveMediaLicenseServiceResponseData = (
  value: unknown,
): MediaLicenseServiceResponseData | null => {
  if (
    !isObjectRecord(value) ||
    (value.formsList !== undefined && !Array.isArray(value.formsList)) ||
    (value.serviceDescriptionEn !== undefined &&
      value.serviceDescriptionEn !== null &&
      typeof value.serviceDescriptionEn !== "string") ||
    (value.nameEn !== undefined &&
      value.nameEn !== null &&
      typeof value.nameEn !== "string") ||
    (value.nameAr !== undefined &&
      value.nameAr !== null &&
      typeof value.nameAr !== "string")
  ) {
    return null;
  }

  return value as MediaLicenseServiceResponseData;
};

const resolvePaymentServiceName = (
  serviceData: MediaLicenseServiceResponseData | null,
) => {
  const nameEn = serviceData?.nameEn?.trim() ?? "";

  return nameEn || serviceData?.nameAr?.trim() || "";
};

const isArtistWorkTypeLookupServiceCode = (serviceCode: unknown) =>
  ARTIST_WORK_TYPE_SERVICE_CODES.has(String(serviceCode ?? "").trim());

const isLifecycleActivityServiceCode = (serviceCode: unknown) =>
  LIFECYCLE_ACTIVITY_SERVICE_CODES.has(String(serviceCode || ""));

const resolveServiceCodeFromDetail = (detail: any): string | null => {
  const candidate = detail?.code ?? detail?.serviceCode;
  const normalizedValue = String(candidate ?? "").trim();

  return normalizedValue || null;
};

const normalizeNullableNumber = (value: unknown): number | null => {
  const normalizedValue = Number(value);

  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? normalizedValue
    : null;
};

const normalizeNullableBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true") return true;
    if (normalizedValue === "false") return false;
  }

  return null;
};

const buildFeeQuoteDraftSnapshot = (
  quote: FeeQuoteResponse | null,
): Pick<
  Parameters<typeof AddNewApplication>[0],
  "amount" | "currencyCode" | "feeBreakdownJson" | "feeQuoteRawResponseJson"
> => {
  if (!quote) {
    return {};
  }

  return {
    amount: Number(quote.totalAmount || 0),
    currencyCode: quote.currency || "AED",
    feeBreakdownJson: JSON.stringify(quote.breakdown || []),
    feeQuoteRawResponseJson: JSON.stringify(quote),
  };
};

const normalizeActivityIds = (value: unknown): number[] => {
  const rawValues = Array.isArray(value) ? value : value == null ? [] : [value];

  return rawValues
    .map((item) => {
      if (typeof item === "number") {
        return Number.isInteger(item) ? item : null;
      }

      const normalizedValue = String(item).trim();
      if (!normalizedValue) {
        return null;
      }

      const parsedValue = Number(normalizedValue);
      return Number.isInteger(parsedValue) ? parsedValue : null;
    })
    .filter((item): item is number => item !== null);
};

const normalizeCourierLookupItems = (
  response: { data?: CourierLookupItem[] | null } | CourierLookupItem[] | null | undefined,
): CourierLookupItem[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

const getCourierOptionValue = (item: CourierLookupItem) => {
  const candidates = [
    item.id,
    item.value,
    item.courierId,
    item.courierCompanyId,
    item.key,
    item.code,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const text = String(candidate).trim();
    if (!text) {
      continue;
    }

    const numericValue = Number(text);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }

    return text;
  }

  return null;
};

const getCourierOptionLabel = (
  item: CourierLookupItem,
  isArabic: boolean,
) => {
  const orderedCandidates = isArabic
    ? [
        item.nameAr,
        item.courierNameAr,
        item.companyNameAr,
        item.nameEn,
        item.courierNameEn,
        item.companyNameEn,
        item.name,
        item.label,
        item.courierName,
        item.companyName,
        item.descAr,
        item.descEn,
      ]
    : [
        item.nameEn,
        item.courierNameEn,
        item.companyNameEn,
        item.nameAr,
        item.courierNameAr,
        item.companyNameAr,
        item.name,
        item.label,
        item.courierName,
        item.companyName,
        item.descEn,
        item.descAr,
      ];

  for (const candidate of orderedCandidates) {
    const text = String(candidate || "").trim();
    if (text) {
      return text;
    }
  }

  return null;
};

const collectMediaLicenseFormValues = (formilyList: MediaLicenseFormStep[]) => {
  if (!Array.isArray(formilyList)) return [];

  return formilyList.map((step) => {
    const parsed = parseMediaLicenseStepFormData(step);
    return parsed?.formValues && typeof parsed.formValues === "object"
      ? parsed.formValues
      : {};
  });
};

const ADDRESS_PICKER_FEE_IGNORED_SERVICE_KINDS = new Set([
  "service801",
  "service1201",
]);

const stripAddressPickerFeeIgnoredValues = (values: Record<string, unknown>) => {
  const rest = { ...(values || {}) };
  delete rest.addressPicker;
  return rest;
};

const isOnlyAddressPickerFeeIgnoredValuesChanged = (
  previousValues: Record<string, unknown>,
  nextValues: Record<string, unknown>,
) =>
  JSON.stringify(stripAddressPickerFeeIgnoredValues(previousValues)) ===
  JSON.stringify(stripAddressPickerFeeIgnoredValues(nextValues));

const resolveSelectedActivityIdsFromFormValues = (
  formValues: Record<string, unknown> | null | undefined,
) => {
  if (!formValues || typeof formValues !== "object") {
    return [];
  }

  const selectedKeySources = [
    (formValues.SelectTable as { selectedKey?: unknown } | undefined)?.selectedKey,
    (formValues.SelectTableSingle as { selectedKey?: unknown } | undefined)
      ?.selectedKey,
    formValues.selectedKey,
  ];

  for (const selectedKey of selectedKeySources) {
    const normalizedIds = normalizeActivityIds(selectedKey);
    if (normalizedIds.length > 0) {
      return normalizedIds;
    }
  }

  return [];
};

const resolveUnselectedActivityIdsFromFormValues = (
  formValues: Record<string, unknown> | null | undefined,
) => {
  if (!formValues || typeof formValues !== "object") {
    return [];
  }

  const selectTableValue =
    (formValues.SelectTable as
      | {
          selectedKey?: unknown;
          prefilledSelectedKey?: unknown;
        }
      | undefined) ??
    (formValues.SelectTableSingle as
      | {
          selectedKey?: unknown;
          prefilledSelectedKey?: unknown;
        }
      | undefined) ??
    (formValues as {
      selectedKey?: unknown;
      prefilledSelectedKey?: unknown;
    });

  const prefilledIds = normalizeActivityIds(
    selectTableValue?.prefilledSelectedKey,
  );

  if (prefilledIds.length === 0) {
    return [];
  }

  const selectedIdSet = new Set(
    normalizeActivityIds(selectTableValue?.selectedKey),
  );

  return prefilledIds.filter((item) => !selectedIdSet.has(item));
};

const resolveSelectedActivityIdsFromFormValuesList = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  for (const formValues of formValuesList) {
    const selectedIds = resolveSelectedActivityIdsFromFormValues(formValues);
    if (selectedIds.length > 0) {
      return selectedIds;
    }
  }

  return [];
};

const resolveUnselectedActivityIdsFromFormValuesList = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  for (const formValues of formValuesList) {
    const unselectedIds = resolveUnselectedActivityIdsFromFormValues(formValues);
    if (unselectedIds.length > 0) {
      return unselectedIds;
    }
  }

  return [];
};

const sanitizeFormilyListForSubmission = (
  formilyList: MediaLicenseFormStep[] | null | undefined,
  options?: {
    preserveDataListRowIds?: boolean;
  },
) => {
  if (!Array.isArray(formilyList)) {
    return [];
  }

  return formilyList.map((step) => {
    if (!step?.formData) {
      return step;
    }

    try {
      const parsedFormData = JSON.parse(step.formData);
      const normalizedFormValues = sanitizePartnerManagementFormValues(
        normalizeDynamicMobileNumberFormValues(
          parsedFormData?.formValues,
          parsedFormData?.schema,
        ),
      );
      const normalizedProfileFormValues = normalizeProfileFormBranches(
        normalizedFormValues,
      );
      return {
        ...step,
        formData: JSON.stringify(
          stripSubmissionOnlyFormFields(
            {
              ...parsedFormData,
              formValues: normalizedProfileFormValues || {},
            },
            options,
          ),
        ),
      };
    } catch {
      return step;
    }
  });
};

/**
 * GET ApplicationDetail omits `sourceApplicationDetailId`, so draft/edit
 * sessions rebuilt from it break every modify engine that needs the id
 * (803/903/1203/80011/...). Backfill the missing fields from the same
 * licenses-permits list the fresh entry flow uses. Lookup failures keep the
 * original source so existing error handling still applies.
 */
const enrichApplicationSourceDetail = async (
  source: LicenseLifecycleSource | null,
): Promise<LicenseLifecycleSource | null> => {
  const keyword = String(source?.licensePermitNo ?? "").trim();

  if (!source || source.sourceApplicationDetailId != null || !keyword) {
    return source;
  }

  try {
    const response = await getLicenseList({
      keyword,
      statuses: [],
      documentTypes: [],
      pageIndex: 1,
      pageSize: 10,
      sortBy: "lastUpdateTime",
      sortDirection: 1,
    });

    return fillMissingLicenseLifecycleSourceFields(
      source,
      response?.data?.items ?? [],
    );
  } catch (error) {
    console.error("Failed to enrich license lifecycle source:", error);
    return source;
  }
};

const getService302ValidationMessage = (
  formilyList: MediaLicenseFormStep[],
) => {
  const firstStepFormValues = collectMediaLicenseFormValues(formilyList)[0] as
    | Record<string, unknown>
    | undefined;
  return getService302FrontEndValidationMessage(firstStepFormValues);
};

const isPartnerManagementChangeMissing = (
  serviceCode: string | number | null | undefined,
  formilyList: MediaLicenseFormStep[],
) => {
  if (!PARTNER_MANAGEMENT_SERVICE_CODES.has(String(serviceCode || ""))) {
    return false;
  }

  const serviceCodeValue = String(serviceCode || "");
  const formValuesList = collectMediaLicenseFormValues(formilyList);
  let deltaSummary = buildService905PartnerDeltaSummary(formValuesList);
  if (serviceCodeValue === "804") {
    deltaSummary = buildService804PartnerDeltaSummary(formValuesList);
  } else if (serviceCodeValue === "1205") {
    deltaSummary = buildService1205PartnerDeltaSummary(formValuesList);
  }
  const { addedCount, removedCount } = deltaSummary;

  return addedCount === 0 && removedCount === 0;
};

const shouldUseDynamicFormCreateDefaults = (search: string): boolean => {
  const searchParams = new URLSearchParams(search);
  const action = String(searchParams.get("actions") || "").toUpperCase();
  const routeApplicationId = Number(searchParams.get("applicationId") || "");
  const hasExistingApplication =
    searchParams.has("applicationId") &&
    Number.isFinite(routeApplicationId) &&
    routeApplicationId > 0;

  return action === "DUPLICATE" || !hasExistingApplication;
};
const gateT = (key: string, fallback: string, values?: Record<string, unknown>) => {
  const translated = i18n.t(key, values);
  if (typeof translated === "string" && translated !== key) {
    return translated;
  }
  return fallback;
};

const RELATED_ESTABLISHMENT_SELECTION_CACHE_KEY =
  "media-license-related-establishment-selection";

const readRelatedEstablishmentSelectionCache = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(
    RELATED_ESTABLISHMENT_SELECTION_CACHE_KEY,
  );

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      serviceId?: string;
      targetProfileId?: string;
    };

    if (!parsed.serviceId || !parsed.targetProfileId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const writeRelatedEstablishmentSelectionCache = (
  serviceId: number,
  targetProfileId: string,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    RELATED_ESTABLISHMENT_SELECTION_CACHE_KEY,
    JSON.stringify({
      serviceId: String(serviceId),
      targetProfileId,
    }),
  );
};

const clearRelatedEstablishmentSelectionCache = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(RELATED_ESTABLISHMENT_SELECTION_CACHE_KEY);
};

type GatePageActionKey =
  | "add-personal"
  | "complete-personal"
  | "add-establishment"
  | "switch-establishment";

interface GatePageBlockerAction {
  key: GatePageActionKey;
  label: string;
  variant: "primary" | "outline";
}

interface GatePageBlockerState {
  title: string;
  description: string;
  variant: string;
  helperText?: string;
  bulletItems?: string[];
  actions: GatePageBlockerAction[];
  blocksForm: boolean;
  autoSwitchProfileId?: string;
  autoSwitchUserTypeId?: string;
}

const normalizeGateProfileState = (
  value?: string | null,
): ServiceEntryGateProfileState | null => {
  if (value === "missing" || value === "incomplete" || value === "complete") {
    return value;
  }
  return null;
}

const normalizeArtistWorkTypeOptions = (rows: unknown[]): ArtistWorkTypeSelectOption[] => {
  return rows.reduce<ArtistWorkTypeSelectOption[]>((result, row) => {
      const item = row as Record<string, unknown>;
      const label = String(
        item.NameEn ?? item.nameEn ?? item.NameAr ?? item.nameAr ?? "",
      ).trim();
      const value = item.id ?? item.Id;
      const code = item.Code ?? item.code;
      if (
        !label ||
        (typeof value !== "string" && typeof value !== "number") ||
        String(value).trim() === ""
      ) {
        return result;
      }

      result.push({
        label,
        value,
        code:
          typeof code === "string" || typeof code === "number" ? code : undefined,
        description: "",
        showDescription: false,
      });
      return result;
    }, []);
};

const sanitizePartnerManagementFormValues = (formValues: unknown) => {
  if (!formValues || typeof formValues !== "object") {
    return formValues;
  }

  const nextFormValues = { ...(formValues as Record<string, unknown>) };

  if (Array.isArray(nextFormValues.PartnerList)) {
    nextFormValues.PartnerList = nextFormValues.PartnerList.filter(
      (partner) => !isPartnerManagementOwner(partner as Record<string, unknown>),
    );
  }

  if (Array.isArray(nextFormValues.partnerManagementInitialPartnerIds)) {
    nextFormValues.partnerManagementInitialPartnerIds = nextFormValues.partnerManagementInitialPartnerIds
      .map((id) => normalizePartnerManagementPartnerId(id))
      .filter(Boolean);
  }

  return nextFormValues;
};

const stripEconomicDepartmentApprovalLetterFormValue = (formValues: unknown) => {
  if (!isObjectRecord(formValues)) {
    return formValues;
  }

  const nextFormValues = { ...formValues };
  delete nextFormValues[ECONOMIC_DEPARTMENT_APPROVAL_LETTER_FORM_VALUE_KEY];

  ["SelectTable", "SelectTableSingle"].forEach((fieldKey) => {
    const fieldValue = nextFormValues[fieldKey];
    if (!isObjectRecord(fieldValue)) {
      return;
    }

    const nextFieldValue = { ...fieldValue };
    delete nextFieldValue[ECONOMIC_DEPARTMENT_APPROVAL_LETTER_FORM_VALUE_KEY];
    nextFormValues[fieldKey] = nextFieldValue;
  });

  return nextFormValues;
};

const applyPartnerManagementContext = ({
  parsedFormData,
  partnerManagementContext,
}: {
  parsedFormData: Record<string, unknown>;
  partnerManagementContext: PartnerManagementContext;
}) => {
  const currentFormValues =
    parsedFormData.formValues && typeof parsedFormData.formValues === "object"
      ? (parsedFormData.formValues as Record<string, unknown>)
      : {};
  const { editablePartners, initialPartnerIds } =
    resolvePartnerManagementContextValues(partnerManagementContext);

  return {
    ...parsedFormData,
    formValues: mergePartnerManagementContextFormValues({
      currentFormValues,
      hasDraft: partnerManagementContext.hasDraft,
      editablePartners,
      initialPartnerIds,
    }),
  };
};

export default function MediaLicense() {
  const { t, i18n } = useTranslation();
  const ServicesStore = useServicesStore();
  const location = useLocation();
  const [dynamicMobileNumberRuntimeConfig] = useState(() => ({
    defaultCountryCode: shouldUseDynamicFormCreateDefaults(location.search)
      ? DEFAULT_COUNTRY_DIAL_CODE
      : "",
  }));
  const userInfo = useUserStore((state) => state.userInfo);
  const currentProfileId = useUserStore((state) => state.currentProfileId);

  const setCurrentIdentity = useUserStore((state) => state.setCurrentIdentity);
  const updateServicesId = useServicesStore((state) => state.updateServicesId);
  const updateServicesCode = useServicesStore(
    (state) => state.updateServicesCode,
  );
  const updateServiceProcessId = useServicesStore(
    (state) => state.updateServiceProcessId,
  );
  const updateServiceExpressSupport = useServicesStore(
    (state) => state.updateServiceExpressSupport,
  );
  const updateFormilyData = useServicesStore(
    (state) => state.updateFormilyData,
  );
  const setProfileSwitchGuard = useProfileSwitchGuardStore(
    (state) => state.setGuard,
  );
  const updateServicesDepartment = useServicesStore(
    (state) => state.updateServicesDepartment,
  );
  const storedApplicationId = useUpdateFormStore((state) => state.applicationId);
  const storedRequestType = useUpdateFormStore((state) => state.type);
  const resetUpdateForm = useUpdateFormStore((state) => state.resetUpdateForm);
  const storedLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.licenseLifecycleSource,
  );
  const setLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.setLicenseLifecycleSource,
  );
  const clearLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.clearLicenseLifecycleSource,
  );
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const { openDialog: openGateDialog, dialogNode } =
    useServiceEntryGateDialogController();
  const [FormilyOption, setFormilyOption] = useState({});
  const [hasProfile, sethasProfile] = useState(true);
  const [allowApply, setallowApply] = useState(true);
  const [warningModal, setWarningModal] = useState<WarningModalProps>({
    visible: false,
    title: "",
    content: "",
    needCancel: false,
    needConfirm: false,
    onCancel: () => {},
    onConfirm: () => {},
    supportService: [],
    ownedProfile: [],
  });
  const [addapplicationstatus, setaddapplicationstatus] = useState(false);
  const [savedraftstatus, setsavedraftstatus] = useState(false);
  const [choosestatus, setchoosestatus] = useState(false);
  const [showDeclarationError, setShowDeclarationError] = useState(false);
  const reviewDeclarationRef = useRef<HTMLDivElement>(null);
  const [formDeatils, setFormDetails] = useState<string>("");
  const [paymentServiceName, setPaymentServiceName] = useState("");
  const paymentServiceNameRequestIdRef = useRef(0);
  const [applicationId, setapplicationId] = useState<number | null>(null);
  const [applicationNumber, setApplicationNumber] = useState("");
  const [servicesStatus, setservicesStatus] = useState<string>("");
  const [servicesActions, setservicesActions] = useState<string>("");
  const [requestType, setRequestType] = useState<number | null>(null);
  const [applicationSourceDetail, setApplicationSourceDetail] =
    useState<LicenseLifecycleSource | null>(null);
  const [
    applicationSourceDetailOwnerApplicationId,
    setApplicationSourceDetailOwnerApplicationId,
  ] = useState<number | null>(null);
  const [lifecycleActivityContext, setLifecycleActivityContext] =
    useState<LifecycleActivityContext | null>(null);
  const [modifySourceActivityIds, setModifySourceActivityIds] = useState<
    number[]
  >([]);
  const [partnerManagementContext, setPartnerManagementContext] =
    useState<PartnerManagementContext | null>(null);
  const [lifecycleActivityLoading, setLifecycleActivityLoading] =
    useState(false);
  const [lifecycleActivityError, setLifecycleActivityError] = useState("");
  const [modifyBaselineLoadFailed, setModifyBaselineLoadFailed] =
    useState(false);
  const [FormilyList, setFormilyList] = useState<any[]>([]);
  const [modifyOriginalFormilyList, setModifyOriginalFormilyList] = useState<
    ModifyFormStep[]
  >([]);
  const [liveStepFormValues, setLiveStepFormValues] = useState<
    Record<string, unknown>
  >({});

  const [fileList, setFileList] = useState<
    Array<{ name: string; fileType: number }>
  >([]);

  const [ProfileInfoIndex, setProfileInfoIndex] =
    useState<ProfileInfoInter>({});
  const [profileFormSource, setProfileFormSource] =
    useState<ProfileFormSource>({});
  const [resolvedProfileFormSource, setResolvedProfileFormSource] =
    useState<ProfileFormValues>();
  const [profileInfoLoaded, setProfileInfoLoaded] = useState(false);
  const [personalDeliveryProfile, setPersonalDeliveryProfile] =
    useState<UserIndividualProfileResponse | null>(null);
  const hasModifyProfileForm = useMemo(
    () => hasProfileFormSchema(getVisibleFormilyList(FormilyList)),
    [FormilyList],
  );
  const modifyProfileBefore = useMemo(
    () =>
      resolveProfileFormSourceBaseline(
        profileFormSource,
        resolvedProfileFormSource,
      ),
    [profileFormSource, resolvedProfileFormSource],
  );
  const isModifyProfileBaselinePending = useMemo(
    () =>
      isProfileFormSourceBaselinePending(
        hasModifyProfileForm &&
          MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(
            String(ServicesStore.userInfo.servicesCode ?? ""),
          ),
        profileInfoLoaded,
        profileFormSource,
        modifyProfileBefore,
      ),
    [
      ServicesStore.userInfo.servicesCode,
      hasModifyProfileForm,
      modifyProfileBefore,
      profileFormSource,
      profileInfoLoaded,
    ],
  );
  const isModifyBaselineBlocking =
    modifyBaselineLoadFailed || isModifyProfileBaselinePending;
  const handleProfileSourceResolutionError = useCallback(() => {
    setModifyBaselineLoadFailed(true);
  }, []);
  const [accountType, setaccountType] = useState(false);
  const [gateGuardReady, setGateGuardReady] = useState(false);
  const isPersonalProfileActive =
    String(userInfo.userInvitation?.userProfileId || "") ===
    String(currentProfileId || "");
  const [gatePayload, setGatePayload] = useState<ServiceEntryGatePayload | null>(
    null,
  );
  const [relatedEstablishmentProfileId, setRelatedEstablishmentProfileId] =
    useState("");
  const [displayApplicantMode, setDisplayApplicantMode] = useState<
    "Individual" | "Establishment"
  >(() => (isPersonalProfileActive ? "Individual" : "Establishment"));
  const [
    hasCompletedRelatedEstablishmentSelection,
    setHasCompletedRelatedEstablishmentSelection,
  ] = useState(false);
  const [checkProfile, setCheckProfile] = React.useState<{
    profileId: number;
    userTypeId: number;
  }>();
  // 101	ApplicationStatuses	Draft
  // 102	ApplicationStatuses	Under Review
  // 103	ApplicationStatuses	Pending Payment
  // 104	ApplicationStatuses	Pending Modification
  // 105	ApplicationStatuses	Completed
  // 106	ApplicationStatuses	Rejected
  // 107	ApplicationStatuses	Cancelled
  const currentServiceId = Number(ServicesStore.userInfo.servicesCode || 0);
  const routeLicenseLifecycleSource = useMemo(
    () => getLicenseLifecycleSourceFromRouteState(location.state),
    [location.state],
  );
  const [artistWorkTypeOptions, setArtistWorkTypeOptions] = useState<
    ArtistWorkTypeSelectOption[]
  >([]);
  const [artistWorkTypeOptionsLoading, setArtistWorkTypeOptionsLoading] =
    useState(false);
  const [serviceMaterialTypeId, setServiceMaterialTypeId] = useState<number | null>(
    null,
  );
  const artistWorkTypeErrorRef = useRef("");
  const [TotalAmount, setTotalAmount] = useState(0);
  const activeFeeStrategyConfig = useMemo(
    () => getMediaLicenseFeeStrategyConfig(currentServiceId),
    [currentServiceId],
  );
  const [Department, setDepartment] = useState<null | number>(0);
  const [serviceLookupConfig, setServiceLookupConfig] = useState<ServiceLookupConfig>({
    processId: ServicesStore.userInfo.serviceProcessId ?? null,
    isExpressSupported: ServicesStore.userInfo.isExpressSupported ?? null,
  });
  const syncServiceRuntimeConfig = useCallback(
    (serviceDetail: any): string | null => {
      const nextServiceCode = resolveServiceCodeFromDetail(serviceDetail);
      const nextConfig: ServiceLookupConfig = {
        processId: normalizeNullableNumber(serviceDetail?.processId),
        isExpressSupported: normalizeNullableBoolean(
          serviceDetail?.isExpressSupported,
        ),
      };

      if (nextServiceCode) {
        const currentStoreServiceCode = String(
          useServicesStore.getState().userInfo.servicesCode ?? "",
        );

        if (currentStoreServiceCode !== nextServiceCode) {
          updateServicesCode(nextServiceCode);
        }
      }

      setServiceLookupConfig((currentConfig) => {
        if (
          currentConfig.processId === nextConfig.processId &&
          currentConfig.isExpressSupported === nextConfig.isExpressSupported
        ) {
          return currentConfig;
        }

        return nextConfig;
      });
      updateServiceProcessId(nextConfig.processId);
      updateServiceExpressSupport(nextConfig.isExpressSupported);

      return nextServiceCode;
    },
    [
      updateServiceExpressSupport,
      updateServiceProcessId,
      updateServicesCode,
    ],
  );
  const [deliveryInformationValues, setDeliveryInformationValues] =
    useState<DeliveryInformationValues>(EMPTY_DELIVERY_INFORMATION_VALUES);
  const [deliveryInformationErrors, setDeliveryInformationErrors] =
    useState<DeliveryInformationErrors>({});
  const [deliveryEmirates, setDeliveryEmirates] = useState<EmirateItem[]>([]);
  const [deliveryRegions, setDeliveryRegions] = useState<RegionItem[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<AreaItem[]>([]);
  const [deliveryAddressLoading, setDeliveryAddressLoading] = useState(false);
  const [deliveryCourierLookup, setDeliveryCourierLookup] = useState<
    CourierLookupItem[]
  >([]);
  const [deliveryCourierLoading, setDeliveryCourierLoading] = useState(false);
  const [deliveryCourierLookupResolved, setDeliveryCourierLookupResolved] =
    useState(false);
  const deliveryInformationTouchedRef = useRef(false);
  const deliveryInitializationKeyRef = useRef("");
  const mediaLicenseContainerRef = useRef<HTMLDivElement>(null);
  const scrollToFirstValidationError = useCallback(() => {
    requestAnimationFrame(() => {
      const formContainer = mediaLicenseContainerRef.current;
      const validationErrors = formContainer?.querySelectorAll<HTMLElement>(
        '[data-form-validation-error="true"], .FormliyView .ant-formily-item-error',
      );
      const firstValidationError = Array.from(validationErrors ?? []).find(
        (element) =>
          element.dataset.formValidationError === "true" ||
          !element.querySelector('[data-form-validation-error="true"]'),
      );
      const validationError =
        firstValidationError?.classList.contains(
          "book-list-validation-error",
        )
          ? firstValidationError.parentElement?.querySelector<HTMLElement>(
              '[data-form-validation-error-target="true"]',
            ) || firstValidationError
          : firstValidationError;

      validationError?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, []);
  const scrollToFirstDeliveryInformationError = useCallback(() => {
    requestAnimationFrame(() => {
      mediaLicenseContainerRef.current
        ?.querySelector<HTMLElement>(
          '.delivery-information-card [data-form-validation-error="true"]',
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }, []);
  const profileInfoRequestGuardRef = useRef<ReturnType<
    typeof createDeliveryProfileRequestGuard
  > | null>(null);
  if (!profileInfoRequestGuardRef.current) {
    profileInfoRequestGuardRef.current = createDeliveryProfileRequestGuard();
  }
  const deliveryInitializationContextRef = useRef<{
    serviceId: number;
    profileId: string;
    applicationId: number | null;
  } | null>(null);
  const skipReviewFeeQuoteRef = useRef(false);
  const skipSyncedApplicationReloadRef = useRef<number | null>(null);
  const preparedPaymentApplicationRef = useRef<{
    applicationId: number;
    applicationNumber: string;
    applicationDetail: ApplicationDetailsResponse;
  } | null>(null);
  const gateGuardInFlightRef = useRef(false);
  const profileSwitchNavigationRef = useRef(false);
  const prevDepsRef = useRef<{
    serviceCode: number | null;
    servicesId: number | null;
    applicationId: number | null;
    requestType: number | null;
  }>({
    serviceCode: null,
    servicesId: null,
    applicationId: null,
    requestType: null,
  });
  const [currentSteps, setCurrentSteps] = useState<
    Array<{ title: string; status: string }>
  >([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionResult, setSubmissionResult] = useState<ResultType | null>(
    null,
  );
  const [serviceDeliveryTime, setServiceDeliveryTime] = useState("-");
  const deliveryCourierOptions = useMemo(() => {
    if (!deliveryCourierLookup.length) {
      return [];
    }

    const localizedOptions = deliveryCourierLookup
      .map((item) => {
        const valueCandidate = getCourierOptionValue(item);
        const labelCandidate = getCourierOptionLabel(
          item,
          i18n.language.startsWith("ar"),
        );

        if (
          valueCandidate === undefined ||
          valueCandidate === null ||
          String(valueCandidate).trim() === "" ||
          !labelCandidate
        ) {
          return null;
        }

        return {
          label: labelCandidate,
          value:
            typeof valueCandidate === "number"
              ? valueCandidate
              : String(valueCandidate),
        };
      })
      .filter(
        (
          item,
        ): item is {
          label: string;
          value: string | number;
        } => item !== null,
      );

    return localizedOptions;
  }, [deliveryCourierLookup, i18n.language]);
  const routeServiceId = Number(
    new URLSearchParams(location.search).get("serviceId") || 0,
  );
  const routeSearchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const defaultPaymentTimeline = useMemo(
    () =>
      t("serviceApplicationSidebar.paymentTimelineValue", {
        count: 21,
      }),
    [t],
  );
  const [paymentTimeline, setPaymentTimeline] = useState<string>(
    defaultPaymentTimeline,
  );
  const formatPaymentTimeline = useCallback(
    (value: unknown) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return defaultPaymentTimeline;
      }

      return t("serviceApplicationSidebar.paymentTimelineValue", {
        count: numericValue,
      });
    },
    [defaultPaymentTimeline, t],
  );
  const serviceDetailsServiceId =
    routeServiceId || Number(ServicesStore.userInfo.servicesId || 0);
  useEffect(() => {
    const serviceId = serviceDetailsServiceId;
    let cancelled = false;

    if (!serviceId) {
      setServiceDeliveryTime("-");
      setPaymentTimeline(defaultPaymentTimeline);
      return () => {
        cancelled = true;
      };
    }

    setServiceDeliveryTime("-");
    setPaymentTimeline(defaultPaymentTimeline);
    getServiceLearn(serviceId)
      .then((response) => {
        if (cancelled) return;
        setPaymentTimeline(
          formatPaymentTimeline(response.data?.paymentTimeline),
        );
        setServiceDeliveryTime(
          resolveServiceDeliveryTime({
            isArabic: i18n.language.startsWith("ar"),
            serviceDeliveryTimeEn: response.data?.serviceDeliveryTimeEn,
            serviceDeliveryTimeAr: response.data?.serviceDeliveryTimeAr,
          }),
        );
      })
      .catch((error) => {
        console.error("Failed to load service delivery time:", error);
        if (!cancelled) {
          setServiceDeliveryTime("-");
          setPaymentTimeline(defaultPaymentTimeline);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    defaultPaymentTimeline,
    formatPaymentTimeline,
    i18n.language,
    serviceDetailsServiceId,
  ]);
  // const routeServiceId = Number(routeSearchParams.get("serviceId") || 0);
  const routeServicesAction = routeSearchParams.get("actions") || "";
  const routeServiceCode = routeSearchParams.get("serviceCode") || "";
  const routeApplicationId = Number(
    routeSearchParams.get("applicationId") || "",
  );
  const hasRouteApplicationIdParam = routeSearchParams.has("applicationId");
  const hasRouteApplicationId =
    hasRouteApplicationIdParam && isValidApplicationId(routeApplicationId);
  const selectionCacheServiceId =
    routeServiceId || Number(ServicesStore.userInfo.servicesId || 0);
  const currentApplicationId = isValidApplicationId(applicationId)
    ? Number(applicationId)
    : null;
  const isEntryFlow =
    !currentApplicationId && !hasRouteApplicationId && !routeServicesAction;
  const isPermitLifecycleAction = PERMITS_LICENSE_ACTIONS.has(
    servicesActions || routeServicesAction,
  );
  const effectiveLicenseLifecycleSource = useMemo(() => {
    

     if (hasLicenseLifecycleSource(routeLicenseLifecycleSource)) {
      return routeLicenseLifecycleSource;
    }
   
    if (hasLicenseLifecycleSource(applicationSourceDetail)) {
      return applicationSourceDetail;
    }

    if (
      isPermitLifecycleAction &&
      hasLicenseLifecycleSource(storedLicenseLifecycleSource)
    ) {
      return storedLicenseLifecycleSource;
    }

    return null;
  }, [
    applicationSourceDetail,
    isPermitLifecycleAction,
    routeLicenseLifecycleSource,
    storedLicenseLifecycleSource,
  ]);
  const permitLifecycleLicensePermitNo = useMemo(() => {
    const candidate =
      applicationSourceDetail?.licensePermitNo ??
      routeLicenseLifecycleSource?.licensePermitNo ??
      (isPermitLifecycleAction
        ? storedLicenseLifecycleSource?.licensePermitNo
        : null);

    const normalized = normalizeActionType4ApplicationNo(candidate);
    return normalized || null;
  }, [
    applicationSourceDetail,
    isPermitLifecycleAction,
    routeLicenseLifecycleSource,
    storedLicenseLifecycleSource,
  ]);
  const effectiveLicenseLifecycleSourceWithPermitNo = useMemo(() => {
    return mergeLifecycleActivitySourceContext({
      source: effectiveLicenseLifecycleSource,
      activityContext: lifecycleActivityContext,
      licensePermitNo: permitLifecycleLicensePermitNo,
    });
  }, [
    effectiveLicenseLifecycleSource,
    lifecycleActivityContext,
    permitLifecycleLicensePermitNo,
  ]);
  const lifecycleSourceApplicationId = Number(
    effectiveLicenseLifecycleSourceWithPermitNo?.sourceApplicationId ?? 0,
  );
  const lifecycleActivitySourceApplicationId =
    lifecycleActivityContext?.sourceApplicationId ?? null;
  const lifecycleSourceApplicationDetailId =
    lifecycleActivityContext?.sourceApplicationDetailId ?? null;
  const isService1202 =
    String(ServicesStore.userInfo.servicesCode || "") === SERVICE_CODE_1202;
  const lifecycleFeeSourceApplicationId =
    isService1202
      ? lifecycleActivitySourceApplicationId
      : effectiveLicenseLifecycleSourceWithPermitNo?.sourceApplicationId ?? null;
  const lifecycleFeeSourceApplicationDetailId =
    resolveModifyFeeSourceApplicationDetailId({
      strategyKind: activeFeeStrategyConfig?.kind,
      lifecycleActivityDetailId: lifecycleSourceApplicationDetailId,
      effectiveLifecycleDetailId:
        effectiveLicenseLifecycleSourceWithPermitNo?.sourceApplicationDetailId,
    });
  const shouldUseLifecycleActivityContext = useMemo(
    () =>
      isLifecycleActivityServiceCode(ServicesStore.userInfo.servicesCode) &&
      (lifecycleActivityLoading ||
        !!lifecycleActivityError ||
        !!lifecycleActivityContext),
    [
      ServicesStore.userInfo.servicesCode,
      lifecycleActivityContext,
      lifecycleActivityError,
      lifecycleActivityLoading,
    ],
  );
  const lifecycleMediaLicenseId = useMemo(() => {
    const nextValue =
      lifecycleActivityContext?.sourceMedialLicenseId ??
      effectiveLicenseLifecycleSourceWithPermitNo?.sourceMedialLicenseId ??
      null;

    return typeof nextValue === "number" && Number.isFinite(nextValue)
      ? nextValue
      : null;
  }, [
    effectiveLicenseLifecycleSourceWithPermitNo?.sourceMedialLicenseId,
    lifecycleActivityContext?.sourceMedialLicenseId,
  ]);
  /**
   * Lifecycle source that provably belongs to the page identity currently on
   * screen: either the route state that opened this flow, or the application
   * detail whose owning applicationId still matches the loaded application.
   * The persisted store value is deliberately NOT consulted here — it survives
   * navigation and identity changes and would leak a stale exclusion into a
   * brand new request.
   */
  const publicationNameValidatedLifecycleSource = useMemo(() => {
    if (hasLicenseLifecycleSource(routeLicenseLifecycleSource)) {
      return routeLicenseLifecycleSource;
    }

    if (
      currentApplicationId &&
      applicationSourceDetailOwnerApplicationId === currentApplicationId &&
      hasLicenseLifecycleSource(applicationSourceDetail)
    ) {
      return applicationSourceDetail;
    }

    return null;
  }, [
    applicationSourceDetail,
    applicationSourceDetailOwnerApplicationId,
    currentApplicationId,
    routeLicenseLifecycleSource,
  ]);
  const publicationNameCheckExclusions = useMemo(
    () =>
      resolvePublicationNameCheckExclusions({
        isLifecycleAction: isPermitLifecycleAction,
        currentServiceCode:
          routeServiceCode || ServicesStore.userInfo.servicesCode,
        expectedSourceApplicationId:
          publicationNameValidatedLifecycleSource?.sourceApplicationId,
        expectedSourceMediaLicenseId:
          publicationNameValidatedLifecycleSource?.sourceMedialLicenseId,
        targetServiceCode: lifecycleActivityContext?.targetServiceCode,
        sourceApplicationId: lifecycleActivityContext?.sourceApplicationId,
        sourceMediaLicenseId:
          lifecycleActivityContext?.sourceMedialLicenseId,
      }),
    [
      ServicesStore.userInfo.servicesCode,
      isPermitLifecycleAction,
      lifecycleActivityContext?.sourceApplicationId,
      lifecycleActivityContext?.sourceMedialLicenseId,
      lifecycleActivityContext?.targetServiceCode,
      publicationNameValidatedLifecycleSource,
      routeServiceCode,
    ],
  );
  const partnerManagementOwnerPartners = useMemo(
    () => resolvePartnerManagementContextValues(partnerManagementContext).ownerPartners,
    [partnerManagementContext],
  );
  const isLifecycleActivityBlocking =
    lifecycleActivityLoading || !!lifecycleActivityError;
  const stopForLifecycleActivityBlock = useCallback(() => {
    if (!isLifecycleActivityBlocking) {
      return false;
    }

    if (lifecycleActivityError) {
      CustomMessage.error(lifecycleActivityError);
      return true;
    }

    return true;
  }, [isLifecycleActivityBlocking, lifecycleActivityError]);
  const stopForModifyBaselineBlock = useCallback(
    (options?: { allowPending?: boolean }) => {
      if (isModifyProfileBaselinePending && !options?.allowPending) {
        return true;
      }
      if (!modifyBaselineLoadFailed) {
        return false;
      }

      CustomMessage.error(t("mediaLicensePage.modifyBaselineLoadFailed"));
      return true;
    },
    [isModifyProfileBaselinePending, modifyBaselineLoadFailed, t],
  );
  const {
    fetchLifecycleActivityContextBySourceApplicationId,
    resolveLifecycleDetailRequest,
  } = useLifecycleDetailResolver({
    serviceCode: ServicesStore.userInfo.servicesCode,
    lifecycleSourceApplicationId,
    permitLifecycleLicensePermitNo,
    lifecycleActivityLoadErrorMessage: t(
      "mediaLicensePage.lifecycleActivityLoadFailed",
    ),
    isLifecycleActivityServiceCode,
    setLifecycleActivityLoading,
    setLifecycleActivityError,
    setLifecycleActivityContext,
  });
  const actionType4FeeEngineApplicationNo =
    permitLifecycleLicensePermitNo || "";
  const feeQuoteApplicationNo =
    permitLifecycleLicensePermitNo || applicationNumber;
  const isPenaltyEnabledLifecycleService = useMemo(
    () => isPenaltyEnabledRenewServiceCode(ServicesStore.userInfo.servicesCode),
    [ServicesStore.userInfo.servicesCode],
  );
  const {
    quoteData,
    quoteLoading,
    quoteError,
    requestFeeQuote,
    resetFeeQuote,
    markFeeResolved,
    resetResolvedFormFee,
    resolvedFeeQuoteKeyRef,
  } = useMediaLicenseFeeQuote({
    activeFeeStrategyConfig,
    currentProfileId,
    userInfo,
    applicationId,
    applicationNumber: feeQuoteApplicationNo,
    actionType4ApplicationNo: actionType4FeeEngineApplicationNo,
    licensePermitNo: permitLifecycleLicensePermitNo,
    sourceApplicationId: lifecycleFeeSourceApplicationId,
    sourceApplicationDetailId: lifecycleFeeSourceApplicationDetailId,
    sourceMedialLicenseId: lifecycleMediaLicenseId,
    setTotalAmount,
  });
  const isCurrentModifyFeeQuotePending = isModifyFeeQuotePending(
    activeFeeStrategyConfig,
    quoteLoading,
    quoteData,
  );
  const {
    penaltyData,
    penaltyLoading,
    penaltyError,
    requestPenaltyPreview,
    resetPenaltyPreview,
  } = useMediaLicensePenaltyPreview({
    serviceCode: ServicesStore.userInfo.servicesCode,
    applicationId,
    rootApplicationId: lifecycleActivityContext?.rootApplicationId ?? null,
    applicationNumber,
    penaltyFor: lifecycleActivityContext?.penaltyFor ?? null,
  });
  // handle 1201 service , skip step .
  const visibleFormilyList = useMemo(
    () => getVisibleFormilyList(FormilyList),
    [FormilyList],
  );
  const idSelectorRuntimeType = useMemo(
    () =>
      currentServiceId === 1801
        ? resolveService1801IdSelectorRuntimeType(FormilyList)
        : undefined,
    [FormilyList, currentServiceId],
  );
  useEffect(() => {
    if (currentServiceId !== 1801 || FormilyList.length === 0) return;

    const nextFormilyList = normalizeService1801IdSelectorFormilyList(FormilyList);
    if (nextFormilyList === FormilyList) return;

    setFormilyList(nextFormilyList);
    updateFormilyData(nextFormilyList);
  }, [FormilyList, currentServiceId, updateFormilyData]);
  const currentStepHasProfileForm = useMemo(
    () => hasProfileFormSchema([visibleFormilyList[currentStep - 1]]),
    [currentStep, visibleFormilyList],
  );
  const hasLaterProfileForm = useMemo(
    () => hasProfileFormSchema(visibleFormilyList.slice(currentStep)),
    [currentStep, visibleFormilyList],
  );
  const canAdvanceToPendingProfileFormStep =
    isModifyProfileBaselinePending &&
    !currentStepHasProfileForm &&
    hasLaterProfileForm;
  const isNextModifyBaselineBlocking =
    modifyBaselineLoadFailed ||
    (isModifyProfileBaselinePending && !canAdvanceToPendingProfileFormStep);
  const isPenaltyContextMissing = useMemo(
    () =>
      isPenaltyEnabledLifecycleService &&
      !lifecycleActivityLoading &&
      !lifecycleActivityError &&
      !lifecycleActivityContext?.penaltyFor,
    [
      isPenaltyEnabledLifecycleService,
      lifecycleActivityContext?.penaltyFor,
      lifecycleActivityError,
      lifecycleActivityLoading,
    ],
  );
  const serviceFeeTotalAmount = Number(quoteData?.totalAmount ?? 0);
  const penaltyTotalAmount =
    Number(
      isPenaltyEnabledLifecycleService &&
        !penaltyError &&
        !isPenaltyContextMissing &&
        penaltyData?.totalAmount,
    ) || 0;

  const fetchArtistWorkTypeContext = useCallback(
    async (serviceCode: number): Promise<ArtistWorkTypeContext> => {
      if (!isArtistWorkTypeLookupServiceCode(serviceCode)) {
        return EMPTY_ARTIST_WORK_TYPE_CONTEXT;
      }

      try {
        const materialTypeId =
          resolveArtistWorkTypeMediaMaterialTypeId(serviceCode);
        const artistWorkTypeResponse =
          await getArtistWorkTypesByServiceCode(serviceCode);
        const options = normalizeArtistWorkTypeOptions(
          Array.isArray(artistWorkTypeResponse?.data)
            ? artistWorkTypeResponse.data
            : [],
        );

        return {
          materialTypeId,
          options,
          errorKey:
            options.length === 0
              ? "mediaLicensePage.artistWorkTypeOptionsUnavailable"
              : undefined,
        };
      } catch {
        return {
          materialTypeId: null,
          options: [],
          errorKey: "mediaLicensePage.artistWorkTypeLoadFailed",
        };
      }
    },
    [],
  );

  const applyArtistWorkTypeContext = useCallback(
    (context: ArtistWorkTypeContext, serviceCode: number) => {
      if (!isArtistWorkTypeLookupServiceCode(serviceCode)) {
        artistWorkTypeErrorRef.current = "";
        setServiceMaterialTypeId(null);
        setArtistWorkTypeOptions((currentOptions) =>
          currentOptions.length === 0 ? currentOptions : [],
        );
        return;
      }

      setServiceMaterialTypeId(context.materialTypeId);
      setArtistWorkTypeOptions(context.options);

      if (context.errorKey) {
        const errorSignature = `${serviceCode}:${context.errorKey}`;
        if (artistWorkTypeErrorRef.current !== errorSignature) {
          artistWorkTypeErrorRef.current = errorSignature;
          CustomMessage.error(t(context.errorKey));
        }
      } else {
        artistWorkTypeErrorRef.current = "";
      }
    },
    [t],
  );

  const regFormily = (
    res: any,
    artistWorkTypeContext: ArtistWorkTypeContext = EMPTY_ARTIST_WORK_TYPE_CONTEXT,
    options?: {
      lockPrefilledActivities?: boolean;
      lifecycleActivityContext?: LifecycleActivityContext | null;
      partnerManagementContext?: PartnerManagementContext | null;
      serviceCode?: string | number | null;
    },
  ) => {
    const serviceDetail = res.data || {};
    const serviceCodeForForm =
      options?.serviceCode ??
      resolveServiceCodeFromDetail(serviceDetail) ??
      ServicesStore.userInfo.servicesCode;
    const formsList = serviceDetail?.formsList || [];
    const shouldPatchArtistWorkType =
      isArtistWorkTypeLookupServiceCode(
        Number(serviceCodeForForm || 0),
      );

    const lifecycleActivityPatchContext =
      options?.lifecycleActivityContext ?? null;
    const partnerManagementPatchContext =
      options?.partnerManagementContext ?? null;
    const shouldApplyService802ReadOnlyLock =
      String(serviceCodeForForm || "") === SERVICE_CODE_802;
    const shouldApplyService1802ReadOnlyLock =
      String(serviceCodeForForm || "") === SERVICE_CODE_1802;
    const shouldApplyService80021ReadOnlyLock =
      String(serviceCodeForForm || "") === SERVICE_CODE_80021;
    const shouldApplyService80022ExpiryRefresh =
      String(serviceCodeForForm || "") === SERVICE_CODE_80022;
    const shouldApplyService1204ReadOnlyLock =
      String(serviceCodeForForm || "") === SERVICE_CODE_1204;
    const shouldApplyService1007ScreeningPeriodRestriction =
      String(serviceCodeForForm || "") === SERVICE_CODE_1007;

    const nextFormsList = resolveMockFormsListByServicesCode({
      formsList,
      servicesCode: Number(serviceCodeForForm || 0),
      applicationId,
      isDev: import.meta.env.DEV,
    }).map((item: any, index: number) => {
      const shouldPatchCurrentStep =
        shouldPatchArtistWorkType ||
        shouldApplyService802ReadOnlyLock ||
        shouldApplyService1802ReadOnlyLock ||
        shouldApplyService80021ReadOnlyLock ||
        shouldApplyService80022ExpiryRefresh ||
        shouldApplyService1204ReadOnlyLock ||
        shouldApplyService1007ScreeningPeriodRestriction ||
        ((lifecycleActivityPatchContext || partnerManagementPatchContext) &&
          index === 0);

      if (!shouldPatchCurrentStep || !item?.formData) {
        return item;
      }

      let parsedFormData: Record<string, any> = {};
      try {
        parsedFormData = JSON.parse(item.formData) || {};
      } catch {
        return item;
      }

      let nextFormData = parsedFormData;

      if (shouldPatchArtistWorkType) {
        nextFormData = patchFormDataWithArtistWorkTypeOptions({
          parsedFormData: nextFormData,
          materialTypeId: artistWorkTypeContext.materialTypeId,
          artistWorkTypeOptions: artistWorkTypeContext.options,
        });
      }

      if (lifecycleActivityPatchContext && index === 0) {
        nextFormData = patchFormDataWithLifecycleActivityContext({
          parsedFormData: nextFormData,
          lifecycleActivityContext: lifecycleActivityPatchContext,
        });
      }

      if (partnerManagementPatchContext && index === 0) {
        nextFormData = applyPartnerManagementContext({
          parsedFormData: nextFormData,
          partnerManagementContext: partnerManagementPatchContext,
        });
      }

      if (shouldApplyService1204ReadOnlyLock) {
        nextFormData = patchFormDataWithService1204ReadOnlyLock({
          parsedFormData: nextFormData,
        });
      }

      if (shouldApplyService1007ScreeningPeriodRestriction) {
        nextFormData = patchFormDataWithService1007ScreeningPeriodRestriction({
          parsedFormData: nextFormData,
        });
      }

      if (shouldApplyService802ReadOnlyLock) {
        nextFormData = patchFormDataWithService802ReadOnlyLock({
          parsedFormData: nextFormData,
        });
      }

      if (shouldApplyService1802ReadOnlyLock) {
        nextFormData = patchFormDataWithService1802ReadOnlyLock({
          parsedFormData: nextFormData,
        });
      }

      if (shouldApplyService80021ReadOnlyLock) {
        nextFormData = patchFormDataWithService80021ReadOnlyLock({
          parsedFormData: nextFormData,
        });
      }

      if (shouldApplyService80022ExpiryRefresh) {
        nextFormData = patchFormDataWithService80022ExpiryRefresh({
          parsedFormData: nextFormData,
        });
      }

      const nextFormDataString = JSON.stringify(nextFormData);
      if (nextFormDataString === item.formData) {
        return item;
      }

      return {
        ...item,
        formData: nextFormDataString,
      };
    });
    setFormilyList(nextFormsList);
    updateFormilyData(nextFormsList);
    updateServicesDepartment(serviceDetail.serviceDepartment);
    setDepartment(serviceDetail.serviceDepartment);
  };

  useEffect(() => {
    if (visibleFormilyList.length === 0) return;
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    setCurrentSteps([
      ...visibleFormilyList.map((item: any, i: number) => ({
        title: resolveStepNameLabel(isAr, item, t),
        status:
          currentStep === i + 1
            ? "process"
            : currentStep > i + 1
              ? "finish"
              : "wait",
      })),
      {
        title: t("mediaLicensePage.reviewSubmit"),
        status:
          currentStep === visibleFormilyList.length + 1 ? "process" : "wait",
      },
    ]);
  }, [visibleFormilyList, currentStep, i18n.language, t]);

  const reviewStepIndex = visibleFormilyList.length + 1;
  const isReviewStep = currentStep === reviewStepIndex;
  const modifyChangeSections = useMemo(() => {
    const normalizedServiceCode = String(
      ServicesStore.userInfo.servicesCode ?? "",
    );
    if (
      !MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(normalizedServiceCode) ||
      isModifyProfileBaselinePending ||
      modifyOriginalFormilyList.length === 0
    ) {
      return [];
    }

    return buildModifyChangeSummary({
      before: modifyOriginalFormilyList,
      after: visibleFormilyList,
      profileBefore: modifyProfileBefore,
    });
  }, [
    ServicesStore.userInfo.servicesCode,
    isModifyProfileBaselinePending,
    modifyOriginalFormilyList,
    modifyProfileBefore,
    visibleFormilyList,
  ]);
  const modifyLanguageSnapshots = useMemo(() => {
    const normalizedServiceCode = String(
      ServicesStore.userInfo.servicesCode ?? "",
    );
    if (
      !MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(normalizedServiceCode) ||
      isModifyProfileBaselinePending ||
      modifyOriginalFormilyList.length === 0
    ) {
      return [];
    }

    return buildModifyLanguageSnapshots({
      before: modifyOriginalFormilyList,
      after: visibleFormilyList,
    });
  }, [
    ServicesStore.userInfo.servicesCode,
    isModifyProfileBaselinePending,
    modifyOriginalFormilyList,
    visibleFormilyList,
  ]);
  const attachCurrentModifyReviewMetadata = useCallback(
    (forms: unknown[]): unknown[] => {
      const normalizedServiceCode = String(
        ServicesStore.userInfo.servicesCode ?? "",
      );
      if (
        !MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(normalizedServiceCode) ||
        isModifyProfileBaselinePending ||
        modifyOriginalFormilyList.length === 0
      ) {
        return forms;
      }
      return attachModifyReviewMetadata(
        forms as ModifyFormStep[],
        modifyOriginalFormilyList,
        modifyProfileBefore,
      );
    },
    [
      ServicesStore.userInfo.servicesCode,
      isModifyProfileBaselinePending,
      modifyOriginalFormilyList,
      modifyProfileBefore,
    ],
  );

  useEffect(() => {
    if (!isReviewStep) {
      setchoosestatus(false);
      setShowDeclarationError(false);
    }
  }, [isReviewStep]);

  const handleDeclarationChoose = useCallback((checked: boolean) => {
    setchoosestatus(checked);
    if (checked) {
      setShowDeclarationError(false);
    }
  }, []);

  const validateReviewDeclaration = useCallback(() => {
    if (choosestatus) {
      return true;
    }

    setShowDeclarationError(true);
    requestAnimationFrame(() => {
      reviewDeclarationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return false;
  }, [choosestatus]);

  const isDaypopEnv = import.meta.env.MODE.startsWith("daypop");
  const isTestEnvFormAutoFillEnabled =
    isDaypopEnv && import.meta.env.VITE_ENABLE_FORM_AUTOFILL === "true";
  const hasServiceMockData = useMemo(
    () =>
      !!getMockFormsListByServicesCode(
        Number(ServicesStore.userInfo.servicesCode || 0),
      ),
    [ServicesStore.userInfo.servicesCode],
  );
  const shouldShowTestEnvAutoFill =
    isTestEnvFormAutoFillEnabled &&
    !applicationId &&
    !isReviewStep &&
    hasServiceMockData;
  const effectiveProcessId =
    serviceLookupConfig.processId ?? (Department === 2 ? 2 : 1);
  const isPaymentFirstProcess = effectiveProcessId === 2;
  // Pay-first (Content) applications returned by the admin's Request Modification
  // (status 104) were ALREADY paid on the original submit. Editing and resubmitting
  // must go through the normal Apply path (backend pushes the workflow back to
  // review), never through Pay Now again — otherwise the user gets charged twice.
  const isResubmissionAfterModification = servicesStatus === "104";
  const shouldUsePaymentFirstReviewState =
    isPaymentFirstProcess && TotalAmount > 0 && !isResubmissionAfterModification;
  const isExpressSupported = serviceLookupConfig.isExpressSupported === true;
  const showDeliveryInformationCard = isReviewStep && isExpressSupported;
  const deliveryInitializationServiceId = Number(
    ServicesStore.userInfo.servicesId || 0,
  );
  const deliveryInitializationProfileId = String(currentProfileId || "");

  useEffect(() => {
    const nextContext = {
      serviceId: deliveryInitializationServiceId,
      profileId: deliveryInitializationProfileId,
      applicationId: currentApplicationId,
    };
    const previousContext = deliveryInitializationContextRef.current;
    const identityChanged = Boolean(
      previousContext &&
        (previousContext.serviceId !== nextContext.serviceId ||
          previousContext.profileId !== nextContext.profileId),
    );
    const applicationChanged = Boolean(
      previousContext &&
        previousContext.applicationId !== nextContext.applicationId,
    );
    const promotedTouchedApplication = Boolean(
      applicationChanged &&
        previousContext?.applicationId === null &&
        nextContext.applicationId !== null &&
        deliveryInformationTouchedRef.current,
    );
    const initializationKey = `${nextContext.serviceId}:${nextContext.profileId}:${nextContext.applicationId ?? "new"}`;

    deliveryInitializationContextRef.current = nextContext;

    if (promotedTouchedApplication) {
      deliveryInitializationKeyRef.current = initializationKey;
      return;
    }

    if (!previousContext || identityChanged || applicationChanged) {
      deliveryInformationTouchedRef.current = false;
      deliveryInitializationKeyRef.current = "";
      setDeliveryInformationValues(EMPTY_DELIVERY_INFORMATION_VALUES);
      setDeliveryInformationErrors({});
    }
  }, [
    currentApplicationId,
    deliveryInitializationProfileId,
    deliveryInitializationServiceId,
  ]);

  useEffect(() => {
    if (!isExpressSupported || !currentApplicationId) {
      return;
    }

    const initializationKey = `${deliveryInitializationServiceId}:${deliveryInitializationProfileId}:${currentApplicationId}`;

    if (deliveryInitializationKeyRef.current === initializationKey) {
      return;
    }

    deliveryInitializationKeyRef.current = initializationKey;
    let cancelled = false;

    getMyRequestDelivery(currentApplicationId)
      .then((response) => {
        if (cancelled || deliveryInformationTouchedRef.current) {
          return;
        }

        setDeliveryInformationValues(
          resolveInitialDeliveryInformation({
            applicationId: currentApplicationId,
            savedDelivery: response.data,
            personalProfile: null,
          }),
        );
      })
      .catch((error) => {
        console.error("Failed to load delivery information:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentApplicationId,
    deliveryInitializationProfileId,
    deliveryInitializationServiceId,
    isExpressSupported,
  ]);

  useEffect(() => {
    if (!isExpressSupported || currentApplicationId) {
      return;
    }

    const initializationKey = `${deliveryInitializationServiceId}:${deliveryInitializationProfileId}:new`;

    if (deliveryInitializationKeyRef.current === initializationKey) {
      return;
    }

    if (isPersonalProfileActive && !profileInfoLoaded) {
      return;
    }

    deliveryInitializationKeyRef.current = initializationKey;

    if (deliveryInformationTouchedRef.current) {
      return;
    }

    setDeliveryInformationValues(
      resolveInitialDeliveryInformation({
        applicationId: null,
        savedDelivery: null,
        personalProfile: isPersonalProfileActive
          ? personalDeliveryProfile
          : null,
      }),
    );
  }, [
    currentApplicationId,
    deliveryInitializationProfileId,
    deliveryInitializationServiceId,
    isExpressSupported,
    isPersonalProfileActive,
    personalDeliveryProfile,
    profileInfoLoaded,
  ]);

  useEffect(() => {
    if (!isExpressSupported) {
      return;
    }

    let cancelled = false;
    setDeliveryAddressLoading(true);

    Promise.all([getEmirateList(), getRegionList(), getAreaList()])
      .then(([emiratesResponse, regionsResponse, areasResponse]) => {
        if (cancelled) {
          return;
        }

        setDeliveryEmirates(emiratesResponse.data || []);
        setDeliveryRegions(regionsResponse.data || []);
        setDeliveryAreas(areasResponse.data || []);
      })
      .catch((error) => {
        console.error("Failed to load delivery address lookups:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setDeliveryAddressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isExpressSupported]);

  useEffect(() => {
    if (!isExpressSupported) {
      setDeliveryCourierLookup([]);
      setDeliveryCourierLoading(false);
      setDeliveryCourierLookupResolved(false);
      return;
    }

    let cancelled = false;
    setDeliveryCourierLoading(true);
    setDeliveryCourierLookupResolved(false);

    getCourierList()
      .then((response) => {
        if (cancelled) {
          return;
        }

        setDeliveryCourierLookup(normalizeCourierLookupItems(response.data));
        setDeliveryCourierLookupResolved(true);
      })
      .catch((error) => {
        console.error("Failed to load courier list:", error);

        if (!cancelled) {
          setDeliveryCourierLookup([]);
          setDeliveryCourierLookupResolved(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDeliveryCourierLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isExpressSupported]);

  useEffect(() => {
    if (!showDeliveryInformationCard) {
      return;
    }

    if (deliveryCourierLoading) {
      return;
    }

    if (
      shouldClearDeliveryCourierSelection({
        courierService: deliveryInformationValues.courierService,
        courierLookupResolved: deliveryCourierLookupResolved,
        courierOptions: deliveryCourierOptions,
      })
    ) {
      setDeliveryInformationValues((previous) => ({
        ...previous,
        courierService: "",
      }));
    }
  }, [
    deliveryCourierOptions,
    deliveryCourierLoading,
    deliveryCourierLookupResolved,
    deliveryInformationValues.courierService,
    showDeliveryInformationCard,
  ]);

  const handleDeliveryInformationFieldChange = useCallback(
    <K extends keyof DeliveryInformationValues>(
      key: K,
      value: DeliveryInformationValues[K],
    ) => {
      deliveryInformationTouchedRef.current = true;
      setDeliveryInformationValues((previous) => {
        const nextValues: DeliveryInformationValues = {
          ...previous,
          [key]: value,
        };

        if (key === "emirateId") {
          nextValues.regionId = undefined;
          nextValues.areaId = undefined;
        }

        if (key === "regionId") {
          nextValues.areaId = undefined;
        }

        return nextValues;
      });

      setDeliveryInformationErrors((previous) => ({
        ...previous,
        [key]: undefined,
        ...(key === "emirateId"
          ? { regionId: undefined, areaId: undefined }
          : key === "regionId"
            ? { areaId: undefined }
            : {}),
      }));
    },
    [],
  );

  const validateDeliveryInformation = useCallback(() => {
    if (!isExpressSupported) {
      return true;
    }

    const nextErrors: DeliveryInformationErrors = {};
    const shouldRequireRegion = isAbuDhabiEmirate(
      deliveryInformationValues.emirateId,
      deliveryEmirates,
    );
    const mobileDigits = String(
      deliveryInformationValues.mobile.mobileLocalNumber || "",
    ).trim();
    const mobileNumberValidation = validateMobileNumber({
      countryCode: deliveryInformationValues.mobile.mobileCountryCode,
      phoneNumber: mobileDigits,
    });

    if (!deliveryInformationValues.courierService) {
      nextErrors.courierService = t("common.required");
    }

    if (!String(deliveryInformationValues.recipientName || "").trim()) {
      nextErrors.recipientName = t("common.required");
    }

    if (!deliveryInformationValues.emirateId) {
      nextErrors.emirateId = t("common.required");
    }

    if (shouldRequireRegion && !deliveryInformationValues.regionId) {
      nextErrors.regionId = t("common.required");
    }

    if (!deliveryInformationValues.areaId) {
      nextErrors.areaId = t("common.required");
    }

    if (!String(deliveryInformationValues.street || "").trim()) {
      nextErrors.street = t("common.required");
    }

    if (!mobileNumberValidation.isValid) {
      nextErrors.mobile = mobileNumberValidation.message;
    }

    const isValid = Object.keys(nextErrors).length === 0;
    setDeliveryInformationErrors(nextErrors);
    if (!isValid) {
      scrollToFirstDeliveryInformationError();
    }
    return isValid;
  }, [
    deliveryEmirates,
    deliveryInformationValues,
    isExpressSupported,
    scrollToFirstDeliveryInformationError,
    t,
  ]);

  const hasDeliveryInformationInput = useCallback(() => {
    return Object.entries(deliveryInformationValues).some(([key, value]) => {
      if (key === "mobile") {
        return Boolean(
          String(
            deliveryInformationValues.mobile.mobileLocalNumber || "",
          ).trim(),
        );
      }

      return String(value ?? "").trim().length > 0;
    });
  }, [deliveryInformationValues]);

  const appendDeliveryInformationToFormilyList = useCallback(
    (targetFormilyList: MediaLicenseFormStep[]) => {
      if (!isExpressSupported || !Array.isArray(targetFormilyList)) {
        return targetFormilyList;
      }

      const targetIndex = targetFormilyList.length - 1;
      if (targetIndex < 0) {
        return targetFormilyList;
      }

      return targetFormilyList.map((step, index) => {
        if (index !== targetIndex || !step?.formData) {
          return step;
        }

        const parsedFormData = parseMediaLicenseStepFormData(step);
        const currentFormValues =
          parsedFormData?.formValues && typeof parsedFormData.formValues === "object"
            ? (parsedFormData.formValues as Record<string, unknown>)
            : {};

        return {
          ...step,
          formData: JSON.stringify({
            ...parsedFormData,
            formValues: {
              ...currentFormValues,
              deliveryInfo: {
                physicalCertificateDeliveryRequested: true,
                ...toApi(deliveryInformationValues),
                courierCompanyId:
                  typeof deliveryInformationValues.courierService === "number"
                    ? deliveryInformationValues.courierService
                    : Number(deliveryInformationValues.courierService) || undefined,
              },
            },
          }),
        };
      });
    },
    [deliveryInformationValues, isExpressSupported],
  );

  const buildDeliverySavePayload = useCallback(
    (applicationDetailId: number): MyRequestDeliveryRequest | null => {
      if (!isExpressSupported) {
        return null;
      }

      const toPositiveId = (value: unknown) => {
        const id = Number(value);
        return Number.isFinite(id) && id > 0 ? id : null;
      };
      const deliveryApiValues = toApi(deliveryInformationValues);
      const { courierService, ...rest } = deliveryApiValues;
      const courierId = toPositiveId(courierService);
      const emirateId = toPositiveId(rest.emirateId);
      const areaId = toPositiveId(rest.areaId);
      const selectedArea = areaId
        ? deliveryAreas.find((area) => area.id === areaId)
        : null;
      const regionId =
        toPositiveId(rest.regionId) ||
        selectedArea?.regionId ||
        null;

      return {
        ...rest,
        applicationDetailId,
        courierId,
        recipientName: String(rest.recipientName || "").trim(),
        emirateId,
        regionId,
        areaId,
        street: String(rest.street || "").trim(),
      };
    },
    [deliveryAreas, deliveryInformationValues, isExpressSupported],
  );

  const resolveApplicationDetailId = useCallback(
    (detail?: ApplicationDetailsResponse | null) => {
      const detailIdText = firstNullableId(
        detail?.applicationDetailId,
        detail?.id,
      );
      const detailId = Number(detailIdText);

      if (!detailId || Number.isNaN(detailId)) {
        return null;
      }

      return detailId;
    },
    [],
  );

  const persistDeliveryInformation = useCallback(
    async (
      targetApplicationId: number,
      detail?: ApplicationDetailsResponse | null,
      options?: { blockOnFailure?: boolean },
    ) => {
      if (!isExpressSupported) {
        return true;
      }

      const blockOnFailure = options?.blockOnFailure !== false;
      let resolvedDetail = detail ?? null;
      let applicationDetailId = resolveApplicationDetailId(resolvedDetail);

      if (!applicationDetailId) {
        const { resolvedApplicationId } = await resolveLifecycleDetailRequest(
          targetApplicationId,
        );
        const detailResponse = await getApplicationDetail(resolvedApplicationId);
        resolvedDetail = (detailResponse?.data || null) as ApplicationDetailsResponse | null;
        applicationDetailId = resolveApplicationDetailId(resolvedDetail);

        if (resolvedDetail) {
          setStatusEn(resolvedDetail);
          setCardPaymentApplicationDetail(resolvedDetail);
          setapplicationId(resolvedDetail.applicationId || targetApplicationId);
          setApplicationNumber(resolvedDetail.applicationNumber || "");
          setfinalId(String(resolvedDetail.applicationId || targetApplicationId));
        }
      }

      if (!applicationDetailId) {
        if (!blockOnFailure) {
          return true;
        }

        CustomMessage.error(
          t("mediaLicensePage.deliverySaveFailed"),
        );
        return false;
      }

      const payload = buildDeliverySavePayload(applicationDetailId);

      if (!payload) {
        if (!blockOnFailure) {
          return true;
        }

        CustomMessage.error(t("mediaLicensePage.deliveryRequired"));
        return false;
      }

      try {
        await saveMyRequestDelivery(payload);
        return true;
      } catch (error) {
        console.error("Failed to save delivery information:", error);

        if (!blockOnFailure) {
          return true;
        }

        CustomMessage.error(t("mediaLicensePage.deliverySaveFailed"));
        return false;
      }
    },
    [
      buildDeliverySavePayload,
      isExpressSupported,
      resolveApplicationDetailId,
      resolveLifecycleDetailRequest,
      t,
    ],
  );

  const [ShowSpin, setShowSpin] = useState(false);
  const [statusEn, setStatusEn] = useState<ApplicationDetailsResponse | null>(
    null,
  );
  const [cardPaymentApplicationDetail, setCardPaymentApplicationDetail] =
    useState<ApplicationDetailsResponse | null>(null);
  const [isDraftAmountStale, setIsDraftAmountStale] = useState(false);
  const openedFormFeeKeyRef = useRef("");
  const pendingFormFeeKeyRef = useRef("");
  const quoteLoadingRef = useRef(quoteLoading);
  const feeQuoteChangeTimerRef = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null);
  useEffect(() => {
    quoteLoadingRef.current = quoteLoading;
  }, [quoteLoading]);
  useEffect(() => {
    return;
    const currentServicesId = ServicesStore.userInfo.servicesId;
    const currentServiceCode = Number(ServicesStore.userInfo.servicesCode || 0);
    const currentApplicationId = applicationId;
    const shouldLoadApplicationDetail =
      currentApplicationId != null &&
      (requestType == null || requestType !== 2);

    const serviceCodeChanged =
      prevDepsRef.current.serviceCode !== currentServiceCode;
    const servicesIdChanged =
      prevDepsRef.current.servicesId !== currentServicesId;
    const applicationIdChanged =
      prevDepsRef.current.applicationId !== currentApplicationId;
    const requestTypeChanged = prevDepsRef.current.requestType !== requestType;

    if (
      !serviceCodeChanged &&
      !servicesIdChanged &&
      !applicationIdChanged &&
      !requestTypeChanged
    ) {
      return;
    }

    prevDepsRef.current = {
      serviceCode: currentServiceCode,
      servicesId: currentServicesId,
      applicationId: currentApplicationId,
      requestType,
    };
    resetResolvedFormFee();
    setTotalAmount(0);

    if (currentServicesId) {
      const shouldLoadArtistWorkTypeContext =
        isArtistWorkTypeLookupServiceCode(currentServiceCode);
      const artistWorkTypeContextPromise = shouldLoadArtistWorkTypeContext
        ? fetchArtistWorkTypeContext(currentServiceCode)
        : Promise.resolve(EMPTY_ARTIST_WORK_TYPE_CONTEXT);

      setArtistWorkTypeOptionsLoading(shouldLoadArtistWorkTypeContext);
      if (!shouldLoadArtistWorkTypeContext) {
        applyArtistWorkTypeContext(EMPTY_ARTIST_WORK_TYPE_CONTEXT, currentServiceCode);
      }

      setShowSpin(true);
      CheckProfile(currentServicesId!)
        .then((res) => {
          if (!res.data) {
            setArtistWorkTypeOptionsLoading(false);
            sethasProfile(false);
            showCustomConfirm();
          } else {
            if (!shouldLoadApplicationDetail) {
              Promise.all([
                getUserEstablishments(currentServicesId!),
                artistWorkTypeContextPromise,
              ])
                .then(([serviceRes, artistWorkTypeContext]) => {
                  applyArtistWorkTypeContext(
                    artistWorkTypeContext,
                    currentServiceCode,
                  );
                  regFormily(serviceRes, artistWorkTypeContext);
                  setFormDetails(serviceRes?.data?.serviceDescriptionEn);
                })
                .finally(() => {
                  setArtistWorkTypeOptionsLoading(false);
                });
            } else {
              Promise.all([
                getApplicationDetail(currentApplicationId),
                getUserEstablishments(currentServicesId!),
                artistWorkTypeContextPromise,
              ])
                .then(([applicationRes, serviceRes, artistWorkTypeContext]) => {
                  applyArtistWorkTypeContext(
                    artistWorkTypeContext,
                    currentServiceCode,
                  );
                  if (applicationRes.data) {
                    setStatusEn(applicationRes.data);
                    setCardPaymentApplicationDetail(applicationRes.data);
                    setFormDetails(serviceRes.data.serviceDescriptionEn);

                    regFormily(
                      {
                        ...applicationRes,
                        data: {
                          ...applicationRes.data,
                          formsList: JSON.parse(applicationRes.data.formData),
                          slaTimeStr: serviceRes.data?.slaTimeStr,
                          slaType: serviceRes.data?.slaType,
                        },
                      },
                      artistWorkTypeContext,
                      {
                        lockPrefilledActivities: true,
                      },
                    );
                  }
                })
                .finally(() => {
                  setArtistWorkTypeOptionsLoading(false);
                });
            }
            if (
              userInfo.userInvitation &&
              userInfo.userInvitation.userProfileId === currentProfileId
            ) {
              setaccountType(true);
              getUserIndividual(userInfo.id).then((res) => {
                setProfileInfoIndex(res.data);
                setProfileFormSource({});
              });
            } else {
              setaccountType(false);
              GetUserEstablishmentByUserProfileID().then((res) => {
                const profileData = res.data || {};
                setProfileInfoIndex(profileData);
                setProfileFormSource(profileData);
              });
            }
          }
        })
        .catch(() => {
          setArtistWorkTypeOptionsLoading(false);
        });
      if (currentServicesId) {
        CheckService(currentServicesId!).then((res) => {
          // if (!res.data.isPublish) {
          //   // When the Service is Unavailable
          //   setallowApply(false);
          //   return setWarningModal({
          //     visible: true,
          //     title: "Service Unavailable",
          //     content:
          //       "This service is currently unavailable due to maintenance or temporary suspension.",
          //     needConfirm: false,
          //     cancelText: "Back",
          //     onCancel: () => {
          //       history.goBack();
          //     },
          //   });
          // }
          // if (res.data.isHasLicense) { // When a License Already Exists
          //   setallowApply(false);
          //   return setComfirmModal({
          //     visible: true,
          //     licenseNumber: res.data.licenseInfoObj?.applicationNumber
          //   })
          // }
          // Individual Services
          // if (res.data.serverUseType == 1) {
          //   if (!res.data.isCanApplyService) {
          //     // No individual profile
          //     if (!res.data.isPessional) {
          //       // Wrong profile type
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Switch to Personal Profile",
          //         content:
          //           "This service is for individual applicants only. Switch to your Personal Profile to continue.",
          //         needCancel: false,
          //         confirmText: "Switch Now",
          //         onConfirm: () => {},
          //       });
          //     }
          //     if (res.data.profileStatus != 3) {
          //       // To create
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Add Personal Profile",
          //         content:
          //           "You don't have a Personal Profile. Add one to apply for individual services.",
          //         needCancel: false,
          //         confirmText: "Add Now",
          //         onConfirm: () => {
          //           history.push(`/my-account/personal-profile?mode=add`);
          //         },
          //       });
          //     } else {
          //       // To complete
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Complete Your Profile",
          //         content:
          //           "Complete your Personal Profile to apply for this service.",
          //         needCancel: false,
          //         confirmText: "Complete Now",
          //         onConfirm: () => {
          //           history.push(`/my-account/personal-profile?mode=edit`);
          //         },
          //       });
          //     }
          //   }
          // } else if (res.data.serverUseType == 2) {
          //   // Establishment Services
          //   if (res.data.isPessional) {
          //     // Wrong profile type
          //     if (res.data.serviceUserProfiles?.length) {
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Switch Establishment Profile",
          //         content:
          //           "This service is for establishments only. Switch to your Establishment Profile to continue.",
          //         confirmText: "Switch Now",
          //         cancelText: "Add Entity/Establishment",
          //         onConfirm: changeProfile,
          //         onCancel: () => {},
          //         ownedProfile: res.data.serviceUserProfiles,
          //       });
          //     } else {
          //       // No required establishment profile
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Add Establishment Profile",
          //         content:
          //           "This service is only available for the following establishment types. Please add one to apply.",
          //         confirmText: "Add Now",
          //         needCancel: false,
          //         onConfirm: () => {},
          //       });
          //     }
          //   } else {
          //     if (!res.data.isCanApplyService) {
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Switch Establishment Profile",
          //         content:
          //           "This service is only available for the following establishment types. Please switch to a qualifying establishment to continue.",
          //         confirmText: "Switch Now",
          //         cancelText: "Add Entity/Establishment",
          //         onConfirm: () => {},
          //         onCancel: () => {
          //           history.push(`/my-account/establishment-profile?mode=add`);
          //         },
          //       });
          //     }
          //   }
          // } else if (res.data.serverUseType == 3) {
          //   // Services Available to Both Individuals and Establishments
          //   if (!res.data.currentUserProfileId) {
          //     // No individual/establishment profile
          //     if (res.data.serverUseType != 3) {
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Complete Profile Verification",
          //         content:
          //           "You don't have a verified Personal or Establishment Profile. Add one to apply for this service.",
          //         confirmText: "Complete Profile",
          //         cancelText: "Add Entity/Establishment",
          //         onConfirm: () => {
          //           history.push(`/my-account/personal-profile?mode=edit`);
          //         },
          //         onCancel: () => {
          //           history.push(`/my-account/establishment-profile?mode=add`);
          //         },
          //       });
          //     } else {
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Complete Profile Verification",
          //         content:
          //           "You don't have a verified Personal or Establishment Profile. Add one to apply for this service.",
          //         confirmText: "Add Entity/Establishment",
          //         cancelText: "Add Personal Profile",
          //         onCancel: () => {
          //           history.push(`/my-account/personal-profile?mode=add`);
          //         },
          //         onConfirm: () => {
          //           history.push(`/my-account/establishment-profile?mode=add`);
          //         },
          //       });
          //     }
          //   }
          //   if (!res.data.isCanApplyService) {
          //     if (res.data.serviceUserProfiles?.length) {
          //       //Switch to required establishment profile
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Switch Establishment Profile",
          //         content:
          //           "This service is for establishments only. Switch to your Establishment Profile to continue.",
          //         confirmText: "Switch Now",
          //         cancelText: "Add Entity/Establishment",
          //         onConfirm: changeProfile,
          //         onCancel: () => {
          //           history.push(`/my-account/establishment-profile?mode=add`);
          //         },
          //         ownedProfile: res.data.serviceUserProfiles,
          //       });
          //     } else {
          //       // No required establishment profile
          //       setallowApply(false);
          //       return setWarningModal({
          //         visible: true,
          //         title: "Add Establishment Profile",
          //         content:
          //           "This service is only available for the following establishment types. Please add one to apply.",
          //         confirmText: "Add Now",
          //         needCancel: false,
          //         onConfirm: () => {
          //           history.push(`/my-account/establishment-profile?mode=add`);
          //         },
          //         supportService: res.data.serviceUserTypes,
          //       });
          //     }
          //   }
          // }
          
        });
      }
    }
    // Pre-service Application Judgment

    setTimeout(() => {
      setShowSpin(false);
    }, 300);
  }, [
    ServicesStore.userInfo.servicesCode,
    ServicesStore.userInfo.servicesId,
    applicationId,
    applyArtistWorkTypeContext,
    currentProfileId,
    fetchArtistWorkTypeContext,
    requestType,
    resetResolvedFormFee,
    userInfo.id,
    userInfo.userInvitation,
  ]);
  const showCustomConfirm = () => {
    Modal.confirm({
      centered: true,
      className: "serviceCard-custom-confirm-modal",
      content: (
        <div
          style={{ display: "flex", alignItems: "self-start" }}
          className="domain-box"
        >
          {" "}
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={warning} className="warning" />
          </div>
          <div>
            <p className="title">
              {t("serviceEntryGate.addEstablishment.title")}
            </p>
            <p className="content">
              {t("serviceEntryGate.addEstablishment.description")}
            </p>
          </div>
        </div>
      ),
      okText: t("serviceEntryGate.actions.addNow"),
      okType: "default",
      cancelText: null,
      okButtonProps: {
        style: {
          borderColor: "#C9A066",
          color: "#8B6E48",
          borderRadius: "4px",
        },
      },
      icon: null,
      onOk() {
        history.push(`/my-account/establishment-profile?mode=add`);
      },
    });
  };
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const nextServicesAction = searchParams.get("actions") || "";
    const hasUrlApplicationId = searchParams.has("applicationId");
    const hasUrlRequestType = searchParams.has("type");
    const parsedApplicationId = Number(searchParams.get("applicationId") || "");
    const parsedRequestType = Number(searchParams.get("type") || "");
    const shouldUseStoredUpdateForm =
      PERMITS_LICENSE_ACTIONS.has(nextServicesAction) && !hasUrlApplicationId;
    if (!nextServicesAction && !hasUrlApplicationId) {
      resetUpdateForm();
    }
    const resolvedApplicationId = hasUrlApplicationId
      ? isValidApplicationId(parsedApplicationId)
        ? parsedApplicationId
        : null
      : shouldUseStoredUpdateForm
        ? isValidApplicationId(storedApplicationId)
          ? Number(storedApplicationId)
          : null
        : null;
    const resolvedRequestType = hasUrlApplicationId
      ? hasUrlRequestType && !Number.isNaN(parsedRequestType)
        ? parsedRequestType
        : null
      : shouldUseStoredUpdateForm
        ? storedRequestType
        : null;

    setapplicationId((prev) =>
      prev === resolvedApplicationId ? prev : resolvedApplicationId,
    );
    setRequestType((prev) =>
      prev === resolvedRequestType ? prev : resolvedRequestType,
    );
    setservicesStatus(searchParams.get("status") || "");
    setservicesActions(nextServicesAction);

    const urlServiceId = Number(searchParams.get("serviceId") || 0);
    if (urlServiceId && !Number.isNaN(urlServiceId)) {
      const currentStoreServiceId = Number(
        useServicesStore.getState().userInfo.servicesId || 0,
      );

      if (currentStoreServiceId !== urlServiceId) {
        updateServicesId(urlServiceId);
      }
    }

    const nextServiceCode = searchParams.get("serviceCode");
    if (nextServiceCode) {
      const currentStoreServiceCode = String(
        useServicesStore.getState().userInfo.servicesCode || "",
      );

      if (currentStoreServiceCode !== String(nextServiceCode)) {
        updateServicesCode(nextServiceCode);
      }
    }
  }, [
    location.search,
    resetUpdateForm,
    storedApplicationId,
    storedRequestType,
    updateServicesCode,
    updateServicesId,
  ]);

  useEffect(() => {
    if (hasLicenseLifecycleSource(effectiveLicenseLifecycleSourceWithPermitNo)) {
      setLicenseLifecycleSource(effectiveLicenseLifecycleSourceWithPermitNo);
      return;
    }

    if (
      !currentApplicationId &&
      !isPermitLifecycleAction &&
      !hasLicenseLifecycleSource(routeLicenseLifecycleSource)
    ) {
      clearLicenseLifecycleSource();
    }
  }, [
    clearLicenseLifecycleSource,
    currentApplicationId,
    effectiveLicenseLifecycleSourceWithPermitNo,
    isPermitLifecycleAction,
    routeLicenseLifecycleSource,
    setLicenseLifecycleSource,
  ]);

  const history = useHistory();
  const persistedApplicationId =
    isPermitLifecycleAction &&
    !hasRouteApplicationIdParam &&
    isValidApplicationId(storedApplicationId)
      ? Number(storedApplicationId)
      : null;
  const missingPermitLifecycleContext =
    shouldRedirectMissingPermitLifecycleContext({
      isPermitLifecycleAction,
      applicationId: currentApplicationId ?? persistedApplicationId,
      hasRouteApplicationId,
      source: effectiveLicenseLifecycleSourceWithPermitNo,
    });

  useEffect(() => {
    if (!missingPermitLifecycleContext) return;

    CustomMessage.error(
      t("permitsLicensePage.messages.routingUnavailable"),
    );
    history.replace("/permits-license");
  }, [history, missingPermitLifecycleContext, t]);

  const loadProfileInfo = useCallback(async () => {
    const requestGuard = profileInfoRequestGuardRef.current;
    if (!requestGuard) {
      return;
    }
    const requestId = requestGuard.begin();
    if (requestId === null) {
      return;
    }
    setProfileInfoLoaded(false);
    setPersonalDeliveryProfile(null);
    setProfileInfoIndex({});
    setProfileFormSource({});
    setResolvedProfileFormSource(undefined);
    try {
      if (userInfo.userInvitation && isPersonalProfileActive) {
        setaccountType(true);
        const response = await getUserIndividual(userInfo.id);
        if (!requestGuard.isCurrent(requestId)) {
          return;
        }
        const profileData = response.data || {};
        setProfileInfoIndex(profileData as ProfileInfoInter);
        setPersonalDeliveryProfile(profileData);
        return;
      }

      setaccountType(false);
      setPersonalDeliveryProfile(null);
      const response = await GetUserEstablishmentByUserProfileID();
      if (!requestGuard.isCurrent(requestId)) {
        return;
      }
      const profileData = response.data || {};
      setProfileInfoIndex(profileData as ProfileInfoInter);
      setProfileFormSource(profileData);
    } finally {
      if (requestGuard.isCurrent(requestId)) {
        setProfileInfoLoaded(true);
      }
    }
  }, [isPersonalProfileActive, userInfo]);

  useEffect(
    () => () => {
      profileInfoRequestGuardRef.current?.invalidate();
    },
    [],
  );

  const loadServicePage = useCallback(
    async (
      serviceId: number,
      currentApplicationId: number | null,
      currentRequestType: number | null,
    ) => {
      preparedPaymentApplicationRef.current = null;
      resetResolvedFormFee();
      setTotalAmount(0);
      setIsDraftAmountStale(false);
      openedFormFeeKeyRef.current = "";
      pendingFormFeeKeyRef.current = "";
      if (feeQuoteChangeTimerRef.current) {
        window.clearTimeout(feeQuoteChangeTimerRef.current);
        feeQuoteChangeTimerRef.current = null;
      }
      setLifecycleActivityLoading(false);
      setLifecycleActivityError("");
      setLifecycleActivityContext(null);
      setApplicationSourceDetailOwnerApplicationId(null);
      setModifySourceActivityIds([]);
      setPartnerManagementContext(null);
      setModifyOriginalFormilyList([]);
      setModifyBaselineLoadFailed(false);
      setPaymentServiceName("");
      const paymentServiceNameRequestId =
        paymentServiceNameRequestIdRef.current + 1;
      paymentServiceNameRequestIdRef.current = paymentServiceNameRequestId;
      const updatePaymentServiceName = (
        serviceData: MediaLicenseServiceResponseData | null,
      ) => {
        if (
          paymentServiceNameRequestIdRef.current ===
          paymentServiceNameRequestId
        ) {
          setPaymentServiceName(resolvePaymentServiceName(serviceData));
        }
      };
      try {
        const shouldLoadApplicationDetail =
          currentApplicationId != null && currentRequestType !== 2;
        const storeServiceCode = String(
          ServicesStore.userInfo.servicesCode || "",
        );
        const partnerManagementContextApplicationId = Number(
          shouldLoadApplicationDetail
            ? currentApplicationId
            : lifecycleSourceApplicationId,
        );

        if (!shouldLoadApplicationDetail) {
          setApplicationSourceDetail(null);
          const serviceResponse = await getUserEstablishments(serviceId);
          const serviceData = resolveMediaLicenseServiceResponseData(
            serviceResponse.data,
          );
          updatePaymentServiceName(serviceData);
          const effectiveServiceCode =
            syncServiceRuntimeConfig(serviceData) ?? storeServiceCode;
          const shouldLoadPartnerManagementContext =
            PARTNER_MANAGEMENT_SERVICE_CODES.has(effectiveServiceCode);
          const partnerManagementResponse =
            shouldLoadPartnerManagementContext &&
            partnerManagementContextApplicationId > 0
              ? await getApplicationPartnerManagementContext(
                  partnerManagementContextApplicationId,
                  effectiveServiceCode,
                )
              : null;
          const nextPartnerManagementContext =
            partnerManagementResponse?.data || null;

          setPartnerManagementContext(nextPartnerManagementContext);
          regFormily(
            serviceResponse,
            EMPTY_ARTIST_WORK_TYPE_CONTEXT,
            {
              partnerManagementContext: nextPartnerManagementContext,
              serviceCode: effectiveServiceCode,
            },
          );
          setFormDetails(serviceData?.serviceDescriptionEn || "");
        } else {
          const applicationDetailRequestId = Number(currentApplicationId);
          const [applicationRes, serviceRes] =
            await Promise.all([
              getApplicationDetail(applicationDetailRequestId),
              getUserEstablishments(serviceId),
            ]);

          const applicationData = resolveApplicationDetailsResponse(
            applicationRes.data,
          );
          const serviceData = resolveMediaLicenseServiceResponseData(
            serviceRes.data,
          );
          updatePaymentServiceName(serviceData);

          if (applicationData && serviceData) {
            const effectiveServiceCode =
              syncServiceRuntimeConfig(serviceData) ?? storeServiceCode;
            setModifySourceActivityIds(
              resolveModifySourceApplicationActivityIds(
                applicationData.formData,
              ),
            );
            const shouldLoadPartnerManagementContext =
              PARTNER_MANAGEMENT_SERVICE_CODES.has(effectiveServiceCode);
            const partnerManagementResponse =
              shouldLoadPartnerManagementContext && currentApplicationId > 0
                ? await getApplicationPartnerManagementContext(
                    currentApplicationId,
                    effectiveServiceCode,
                  )
                : null;
            const nextApplicationSourceDetail =
              await enrichApplicationSourceDetail(
                getLicenseLifecycleSourceFromApplicationDetail(applicationData),
              );
            const detailSourceApplicationId = Number(
              applicationData.sourceApplicationId,
            );
            let nextLifecycleActivityContext: LifecycleActivityContext | null =
              null;

            if (
              isLifecycleActivityServiceCode(effectiveServiceCode) &&
              detailSourceApplicationId > 0
            ) {
              setLifecycleActivityLoading(true);
              setLifecycleActivityError("");
              try {
                nextLifecycleActivityContext =
                  await fetchLifecycleActivityContextBySourceApplicationId(
                    detailSourceApplicationId,
                    {
                      licensePermitNo: applicationData.licensePermitNo ?? null,
                      targetServiceCode: effectiveServiceCode,
                    },
                  );
                setLifecycleActivityContext(nextLifecycleActivityContext);
                setLifecycleActivityError("");
              } catch (error) {
                console.error("Failed to load lifecycle activities:", error);
                setLifecycleActivityError(
                  t("mediaLicensePage.lifecycleActivityLoadFailed"),
                );
              } finally {
                setLifecycleActivityLoading(false);
              }
            }
            if (
              MODIFY_ACTIVITY_PASSTHROUGH_SERVICE_CODES.has(
                effectiveServiceCode,
              ) &&
              resolveModifyLifecycleActivityIds(
                nextLifecycleActivityContext?.selectedActivityIds,
              ).length === 0
            ) {
              setLifecycleActivityError(
                t("mediaLicensePage.lifecycleActivityLoadFailed"),
              );
            }
            const nextPartnerManagementContext =
              partnerManagementResponse?.data || null;

            setApplicationSourceDetail(nextApplicationSourceDetail);
            setApplicationSourceDetailOwnerApplicationId(
              applicationData.applicationId,
            );
            setPartnerManagementContext(nextPartnerManagementContext);
            setStatusEn(applicationData);
            setCardPaymentApplicationDetail(applicationData);
            setApplicationNumber(applicationData.applicationNumber || "");
            setFormDetails(serviceData.serviceDescriptionEn || "");
            const shouldStripCancelEconomicApprovalLetter =
              CANCEL_SERVICE_CODES_WITHOUT_ECONOMIC_APPROVAL_PREFILL.has(
                effectiveServiceCode,
              ) &&
              applicationData.applicationStatusId !== APPLICATION_STATUS_ID.draft;
            const transformLoadedApplicationFormValues = (
              formValues: Record<string, unknown>,
            ) => {
              const sanitizedFormValues =
                sanitizePartnerManagementFormValues(formValues);

              return shouldStripCancelEconomicApprovalLetter
                ? stripEconomicDepartmentApprovalLetterFormValue(
                    sanitizedFormValues,
                  )
                : sanitizedFormValues;
            };
            const mergedFormsList = mergeApplicationFormValuesIntoFormsList(
              serviceData.formsList || [],
              applicationData.formData,
              {
                transformFormValues: transformLoadedApplicationFormValues,
              },
            );

            // Renew seeds from the certificate's current accounts, not from the
            // loaded application's form snapshot - that snapshot is a Modify
            // delta list whenever the licence has been modified. Keyed on the
            // action rather than a service code, so it covers every service
            // that carries accounts; it is a no-op when the response has none.
            // Change-tracking services are left on their existing hydration:
            // whether they can be renewed at all is unverified, and this fix
            // does not need to alter a path that already has behaviour.
            const shouldRebuildAccountsFromSnapshot =
              routeServicesAction === "RENEW" &&
              !isSocialMediaAccountChangeTrackingService(effectiveServiceCode);
            const canonicalizedFormsList = shouldRebuildAccountsFromSnapshot
              ? applySocialMediaCanonicalAccountReset(
                  mergedFormsList,
                  applicationData.socialMediaAccounts,
                )
              : isSocialMediaAccountChangeTrackingService(effectiveServiceCode)
                ? applySocialMediaCanonicalAccountContext(
                    mergedFormsList,
                    applicationData.socialMediaAccounts,
                  )
                : mergedFormsList;
            const isModifyEditSession = routeServicesAction === "MODIFY";
            const formsListForSession = isModifyEditSession
              ? clearModifyReviewMetadata(canonicalizedFormsList)
              : canonicalizedFormsList;
            const contextualizedFormsList =
              isSocialMediaAccountChangeTrackingService(effectiveServiceCode)
                ? applySocialMediaModifySchemaContext(formsListForSession, {
                    fixedMediaCategory:
                      effectiveServiceCode === "80011" ? "2" : undefined,
                  })
                : formsListForSession;
            const sessionFormsList = contextualizedFormsList;

            if (
              MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(effectiveServiceCode)
            ) {
              let originalFormsList: ModifyFormStep[] = [];
              const hasEmbeddedOriginalValues =
                hasEmbeddedModifyOriginalValues(contextualizedFormsList);
              if (isModifyEditSession) {
                originalFormsList = sessionFormsList;
              } else if (hasEmbeddedOriginalValues) {
                originalFormsList = contextualizedFormsList;
              } else if (
                detailSourceApplicationId > 0 &&
                detailSourceApplicationId === applicationDetailRequestId
              ) {
                if (
                  hasValidApplicationFormDataBaseline(
                    applicationData.formData,
                  )
                ) {
                  originalFormsList = contextualizedFormsList;
                } else {
                  setModifyBaselineLoadFailed(true);
                }
              } else if (detailSourceApplicationId > 0) {
                try {
                  const sourceApplicationRes = await getApplicationDetail(
                    detailSourceApplicationId,
                  );
                  const sourceApplicationData =
                    resolveApplicationDetailsResponse(
                      sourceApplicationRes.data,
                    );
                  if (
                    !sourceApplicationData ||
                    !hasValidApplicationFormDataBaseline(
                      sourceApplicationData.formData,
                    )
                  ) {
                    throw new Error(
                      "Source application form data is unavailable or invalid.",
                    );
                  }
                  const sourceMergedFormsList =
                    mergeApplicationFormValuesIntoFormsList(
                      serviceData.formsList || [],
                      sourceApplicationData.formData,
                      {
                        transformFormValues:
                          sanitizePartnerManagementFormValues,
                      },
                    );
                  const canonicalizedSourceFormsList =
                    isSocialMediaAccountChangeTrackingService(
                      effectiveServiceCode,
                    )
                      ? applySocialMediaCanonicalAccountContext(
                          sourceMergedFormsList,
                          sourceApplicationData.socialMediaAccounts,
                        )
                      : sourceMergedFormsList;
                  originalFormsList = isSocialMediaAccountChangeTrackingService(
                    effectiveServiceCode,
                  )
                    ? applySocialMediaModifySchemaContext(
                        canonicalizedSourceFormsList,
                        {
                          fixedMediaCategory:
                            effectiveServiceCode === "80011"
                              ? "2"
                              : undefined,
                        },
                      )
                    : canonicalizedSourceFormsList;
                } catch (error) {
                  console.error(
                    "Failed to load the source application for Modify review:",
                    error,
                  );
                  setModifyBaselineLoadFailed(true);
                  originalFormsList = [];
                }
              } else {
                setModifyBaselineLoadFailed(true);
              }
              setModifyOriginalFormilyList(
                resolveModifyOriginalForms(originalFormsList),
              );
            }

            const shouldPreserveService903SavedActivities =
              effectiveServiceCode === "903" &&
              routeServicesAction === "edit" &&
              (applicationData.applicationStatusId ===
                APPLICATION_STATUS_ID.draft ||
                applicationData.applicationStatusId ===
                  APPLICATION_STATUS_ID.pendingModification);

            regFormily({
              ...serviceRes,
              data: {
                ...serviceData,
                ...applicationData,
                formsList: sessionFormsList,
                slaTimeStr: serviceData.slaTimeStr,
                slaType: serviceData.slaType,
              },
            }, EMPTY_ARTIST_WORK_TYPE_CONTEXT, {
              lockPrefilledActivities: true,
              lifecycleActivityContext: shouldPreserveService903SavedActivities
                ? null
                : nextLifecycleActivityContext,
              partnerManagementContext: nextPartnerManagementContext,
              serviceCode: effectiveServiceCode,
            });
          }
        }

        if (
          shouldLoadMediaLicenseProfile({
            routeAction: routeServicesAction,
            hasRouteApplicationId,
            applicationId: currentApplicationId,
          })
        ) {
          await loadProfileInfo();
        }
      } finally {
        setLifecycleActivityLoading(false);
      }
    },
    [
      ServicesStore.userInfo.servicesCode,
      fetchLifecycleActivityContextBySourceApplicationId,
      hasRouteApplicationId,
      lifecycleSourceApplicationId,
      loadProfileInfo,
      resetResolvedFormFee,
      routeServicesAction,
      syncServiceRuntimeConfig,
      t,
    ],
  );

  useEffect(() => {
    const currentServicesId = Number(ServicesStore.userInfo.servicesId || 0);
    const currentServiceCode = String(ServicesStore.userInfo.servicesCode || "");
    const gateEnabled =
      isServiceEntryGateEnabled(location.search) ||
      isGlobalProfileId(currentProfileId);

    if (!currentServicesId) {
      return;
    }

    if (
      (routeServiceId && currentServicesId !== routeServiceId) ||
      (routeServiceCode && currentServiceCode !== routeServiceCode) ||
      (hasRouteApplicationId && currentApplicationId !== routeApplicationId)
    ) {
      return;
    }

    if (isEntryFlow && !gateEnabled && !gateGuardReady) {
      gateGuardInFlightRef.current = false;
      setGateGuardReady(true);
      return;
    }

    if (isEntryFlow && !gateGuardReady) {
      if (gateGuardInFlightRef.current) {
        return;
      }

      gateGuardInFlightRef.current = true;
      setShowSpin(true);
      void ensureServiceEntryGateAccess({
        history,
        serviceId: currentServicesId,
        serviceCode: String(ServicesStore.userInfo.servicesCode || ""),
        state: location.state,
        serviceName: ServicesStore.userInfo.servicesName,
        openDialog: openGateDialog,
      })
        .then((result) => {
          if (!result.allowed) {
            return;
          }

          setGatePayload(result.payload);
          setGateGuardReady(true);
        })
        .finally(() => {
          gateGuardInFlightRef.current = false;
          setShowSpin(false);
        });
      return;
    }

    if (isEntryFlow && !gateGuardReady) {
      return;
    }

    if (!isEntryFlow && !gateGuardReady) {
      setGateGuardReady(true);
    }

    const nextDeps = {
      serviceCode: Number(ServicesStore.userInfo.servicesCode || 0),
      servicesId: currentServicesId,
      applicationId: currentApplicationId,
      requestType,
    };
    const shouldSkipSyncedApplicationReload =
      skipSyncedApplicationReloadRef.current != null &&
      skipSyncedApplicationReloadRef.current === currentApplicationId;

    if (submissionResult || shouldSkipSyncedApplicationReload) {
      if (shouldSkipSyncedApplicationReload) {
        skipSyncedApplicationReloadRef.current = null;
      }
      prevDepsRef.current = nextDeps;
      return;
    }

    if (missingPermitLifecycleContext) {
      return;
    }

    const servicesIdChanged =
      prevDepsRef.current.servicesId !== currentServicesId;
    const applicationIdChanged =
      prevDepsRef.current.applicationId !== currentApplicationId;
    const requestTypeChanged =
      prevDepsRef.current.requestType !== requestType;

    if (!servicesIdChanged && !applicationIdChanged && !requestTypeChanged) {
      return;
    }

    prevDepsRef.current = nextDeps;

    setShowSpin(true);
    void loadServicePage(
      currentServicesId,
      currentApplicationId,
      requestType,
    ).finally(() => {
      setShowSpin(false);
    });
  }, [
    ServicesStore.userInfo.servicesCode,
    ServicesStore.userInfo.servicesId,
    ServicesStore.userInfo.servicesName,
    applicationId,
    currentApplicationId,
    currentProfileId,
    gateGuardReady,
    hasRouteApplicationId,
    history,
    isEntryFlow,
    loadServicePage,
    location.search,
    location.state,
    missingPermitLifecycleContext,
    openGateDialog,
    routeApplicationId,
    routeServiceCode,
    routeServiceId,
    requestType,
    servicesActions,
    submissionResult,
  ]);
  const handleRetryLifecycleActivities = useCallback(() => {
    const currentServicesId = Number(ServicesStore.userInfo.servicesId || 0);

    if (!currentServicesId) {
      return;
    }

    setShowSpin(true);
    void loadServicePage(
      currentServicesId,
      currentApplicationId,
      requestType,
    ).finally(() => {
      setShowSpin(false);
    });
  }, [
    ServicesStore.userInfo.servicesId,
    currentApplicationId,
    loadServicePage,
    requestType,
  ]);

  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [profileInfoExpanded, setProfileInfoExpanded] = useState(false);
  const [finalId, setfinalId] = useState("");
  const [delivery, setDelivery] = useState(0 as number);
  const paymentAmount = TotalAmount + delivery;
  const activeCardPaymentDetail = cardPaymentApplicationDetail ?? statusEn;
  const serviceDetailsStatusKey = useMemo(
    () =>
      resolveMyRequestStatus({
        statusId: activeCardPaymentDetail?.applicationStatusId ?? servicesStatus,
        statusName:
          activeCardPaymentDetail?.statusEn || activeCardPaymentDetail?.statusAr,
      }),
    [
      activeCardPaymentDetail?.applicationStatusId,
      activeCardPaymentDetail?.statusAr,
      activeCardPaymentDetail?.statusEn,
      servicesStatus,
    ],
  );
  const serviceDetailsTotalAmount = useMemo(() => {
    if (isReviewStep) {
      return quoteError ? null : TotalAmount;
    }

    if (quoteData && !quoteError) {
      const quotedAmount = Number(quoteData.totalAmount);
      return Number.isFinite(quotedAmount) ? quotedAmount : null;
    }

    if (serviceDetailsStatusKey === "draft" && !isDraftAmountStale) {
      const detailAmount = activeCardPaymentDetail?.amount;
      return typeof detailAmount === "number" && Number.isFinite(detailAmount)
        ? detailAmount
        : null;
    }
    return null;
  }, [
    activeCardPaymentDetail?.amount,
    isDraftAmountStale,
    isReviewStep,
    quoteData,
    quoteError,
    serviceDetailsStatusKey,
    TotalAmount,
  ]);
  const buildApplicationIdPayload = useCallback(
    (targetApplicationId?: number | null) => {
      const normalizedApplicationId = Number(targetApplicationId);
      const currentApplicationStatusId = Number(
        activeCardPaymentDetail?.applicationStatusId ??
          statusEn?.applicationStatusId ??
          servicesStatus,
      );

      if (
        !normalizedApplicationId ||
        Number.isNaN(normalizedApplicationId) ||
        (currentApplicationStatusId !== 101 &&
          currentApplicationStatusId !== 104)
      ) {
        return {};
      }

      return { applicationId: normalizedApplicationId };
    },
    [
      activeCardPaymentDetail?.applicationStatusId,
      servicesStatus,
      statusEn?.applicationStatusId,
    ],
  );
  const buildApplicationSourcePayload = useCallback(() => {
    const source = effectiveLicenseLifecycleSourceWithPermitNo;

    if (!source || !hasLicenseLifecycleSource(source)) {
      return {};
    }

    const sourceApplicationDetailId =
      isService1202
        ? lifecycleSourceApplicationDetailId
        : source.sourceApplicationDetailId ?? null;
    const sourceApplicationId =
      isService1202
        ? lifecycleActivitySourceApplicationId
        : source.sourceApplicationId ?? null;

    return {
      sourceServiceCode: source.sourceServiceCode ?? null,
      sourceMedialLicenseId: source.sourceMedialLicenseId ?? null,
      sourceApplicationId,
      sourceApplicationDetailId,
    };
  }, [
    effectiveLicenseLifecycleSourceWithPermitNo,
    isService1202,
    lifecycleActivitySourceApplicationId,
    lifecycleSourceApplicationDetailId,
  ]);

  const activeRuleStrategyConfig = useMemo(
    () => getMediaLicenseRuleStrategyConfig(currentServiceId),
    [currentServiceId],
  );
  const buildAddApplicationEnginePayloads = useCallback(
    async (
      targetFormilyList: unknown[],
      options?: {
        submissionMode?: "save" | "submit";
        targetApplicationId?: number | null;
        targetApplicationNo?: string;
      },
    ) => {
      const {
        submissionMode = "submit",
        targetApplicationId,
        targetApplicationNo,
      } = options || {};
      const resolvedTargetApplicationNo =
        permitLifecycleLicensePermitNo || targetApplicationNo;
      const payloads: Pick<
        Parameters<typeof AddNewApplication>[0],
        "breEnginePayload" | "feeEnginePayload" | "penaltyEnginePayload"
      > & {
        penaltyPayloadError?: string;
      } = {};

      if (submissionMode !== "submit") {
        return payloads;
      }

      const engineFormilyList = attachCurrentModifyReviewMetadata(
        targetFormilyList,
      );

      if (activeRuleStrategyConfig) {
        const breEnginePayload = await buildMediaLicenseRuleStrategyPayload({
          config: activeRuleStrategyConfig,
          formilyList: engineFormilyList,
          currentProfileId,
          userInfo,
          serviceCode: ServicesStore.userInfo?.servicesCode,
          submissionMode,
        });

        payloads.breEnginePayload = attachCustomerEngineRequestContext(
          breEnginePayload,
          {
            licensePermitNo: permitLifecycleLicensePermitNo,
            mediaLicenseId: lifecycleMediaLicenseId,
          },
        );
      }

      if (activeFeeStrategyConfig) {
        const feeEnginePayload =
          await buildMediaLicenseFeeStrategyEnginePayload({
            config: activeFeeStrategyConfig,
            formilyList: engineFormilyList,
            currentProfileId,
            userInfo,
            applicationId: targetApplicationId,
            applicationNo: resolvedTargetApplicationNo,
            licensePermitNo: permitLifecycleLicensePermitNo,
            sourceApplicationId: lifecycleFeeSourceApplicationId,
            sourceApplicationDetailId: lifecycleFeeSourceApplicationDetailId,
            sourceMedialLicenseId: lifecycleMediaLicenseId,
          });

        const finalFeeEnginePayload =
          ACTION_TYPE4_CONTEXT_FEE_SERVICE_KINDS.has(
            activeFeeStrategyConfig.kind,
          )
            ? feeEnginePayload
            : overrideFeeEnginePayloadApplicationNoForActionType4(
                feeEnginePayload,
                actionType4FeeEngineApplicationNo,
              ) ?? feeEnginePayload;

        payloads.feeEnginePayload = attachCustomerEngineRequestContext(
          finalFeeEnginePayload,
          {
            licensePermitNo: permitLifecycleLicensePermitNo,
            mediaLicenseId: lifecycleMediaLicenseId,
          },
        );
      }

      if (isPenaltyEnabledLifecycleService) {
        const penaltyPayloadError = getPenaltyPayloadBlockingMessage(
          ServicesStore.userInfo.servicesCode,
          lifecycleActivityContext?.penaltyFor ?? null,
        );

        if (penaltyPayloadError) {
          payloads.penaltyPayloadError = penaltyPayloadError;
          return payloads;
        }

        payloads.penaltyEnginePayload = buildPenaltyEnginePayload({
          serviceCode: ServicesStore.userInfo.servicesCode,
          penaltyFor: lifecycleActivityContext?.penaltyFor ?? null,
        })!;
      }

      return payloads;
    },
    [
      activeFeeStrategyConfig,
      actionType4FeeEngineApplicationNo,
      activeRuleStrategyConfig,
      attachCurrentModifyReviewMetadata,
      currentProfileId,
      isPenaltyEnabledLifecycleService,
      lifecycleMediaLicenseId,
      lifecycleActivityContext?.penaltyFor,
      lifecycleFeeSourceApplicationId,
      lifecycleFeeSourceApplicationDetailId,
      permitLifecycleLicensePermitNo,
      ServicesStore.userInfo?.servicesCode,
      userInfo,
    ],
  );
  const buildAddApplicationActivityPayload = useCallback(
    (targetFormilyList: unknown[]) => {
      const currentServiceCode = String(ServicesStore.userInfo.servicesCode || "");

      if (
        !LIFECYCLE_ACTIVITY_SELECTION_SERVICE_CODES.has(currentServiceCode) &&
        !MODIFY_SOURCE_ACTIVITY_PASSTHROUGH_SERVICE_CODES.has(
          currentServiceCode,
        )
      ) {
        return {};
      }

      if (
        MODIFY_SOURCE_ACTIVITY_PASSTHROUGH_SERVICE_CODES.has(
          currentServiceCode,
        )
      ) {
        return buildModifyLifecycleActivityPayload(modifySourceActivityIds);
      }

      if (
        MODIFY_ACTIVITY_PASSTHROUGH_SERVICE_CODES.has(currentServiceCode)
      ) {
        return buildModifyLifecycleActivityPayload(
          lifecycleActivityContext?.selectedActivityIds,
        );
      }

      const formValuesList = collectMediaLicenseFormValues(
        targetFormilyList as MediaLicenseFormStep[],
      );
      const usesRemovedActivityIds =
        currentServiceCode === SERVICE_CODE_904 ||
        currentServiceCode === SERVICE_CODE_1202 ||
        currentServiceCode === SERVICE_CODE_806 ||
        currentServiceCode === SERVICE_CODE_80041 ||
        currentServiceCode === SERVICE_CODE_80042;
      const usesSelectedActivityIds =
        currentServiceCode === SERVICE_CODE_1204 || !usesRemovedActivityIds;
      const currentSelectedActivityIds = usesSelectedActivityIds
        ? resolveSelectedActivityIdsFromFormValuesList(formValuesList)
        : resolveUnselectedActivityIdsFromFormValuesList(formValuesList);

      return {
        activityIds: currentSelectedActivityIds,
      };
    },
    [
      ServicesStore.userInfo.servicesCode,
      lifecycleActivityContext?.selectedActivityIds,
      modifySourceActivityIds,
    ],
  );
  const currentEstablishmentId = useMemo(
    () => resolveEstablishmentId(userInfo, currentProfileId),
    [currentProfileId, userInfo],
  );
  const applicantModeOptions = useMemo(
    () => [
      {
        value: "Individual" as const,
        label: t("serviceEntryGate.selectors.applicantMode.individualLabel"),
        description: t(
          "serviceEntryGate.selectors.applicantMode.individualDescription",
        ),
      },
      {
        value: "Establishment" as const,
        label: t("serviceEntryGate.selectors.applicantMode.establishmentLabel"),
        description: t(
          "serviceEntryGate.selectors.applicantMode.establishmentDescription",
        ),
      },
    ],
    [t],
  );
  const gateApplicantMode = gatePayload?.uiHints?.applicantMode || null;
  const gatePageVariant = String(gatePayload?.uiHints?.variant || "");
  const explicitApplicantProfileState = normalizeGateProfileState(
    gatePayload?.applicant?.profileState || null,
  );
  const activeApplicantMode = isPersonalProfileActive
    ? "Individual"
    : "Establishment";
  const personalProfileId = String(userInfo.userInvitation?.userProfileId || "");
  const personalUserTypeId = String(userInfo.userInvitation?.userTypeId || "");
  const allEstablishmentSelectorOptions = useMemo(
    () => {
      const isAr = Boolean(i18n.language?.startsWith("ar"));

      return (userInfo.userEstablishments || []).map((item) => ({
        value: String(item.userProfileId),
        label:
          preferLocalizedEnAr(isAr, item.nameEn, item.nameAr) ||
          String(item.userProfileId),
        subtitle: isAr ? item.nameEn || undefined : item.nameAr || undefined,
        userTypeId: String(item.userTypeId || ""),
        avatarUrl: item.establishmentUrl || undefined,
      }));
    },
    [i18n.language, userInfo.userEstablishments],
  );
  const hasExplicitQualifyingProfilesHint = Array.isArray(
    gatePayload?.uiHints?.qualifyingProfiles,
  );
  const qualifyingEstablishmentOptions = useMemo(() => {
    return resolveServiceEntryGateProfileOptions(gatePayload).map((profile) => ({
      value: profile.profileId,
      label: profile.title,
      subtitle: profile.subtitle || undefined,
      userTypeId: String(profile.userTypeId || ""),
      avatarUrl: profile.avatarUrl || undefined,
    }));
  }, [gatePayload]);
  const establishmentSelectorOptions = hasExplicitQualifyingProfilesHint
    ? qualifyingEstablishmentOptions
    : allEstablishmentSelectorOptions;
  const resolvedPersonalProfileState = useMemo<ServiceEntryGateProfileState>(() => {
    if (explicitApplicantProfileState === "missing") {
      return "missing";
    }
    if (!personalProfileId) {
      return "missing";
    }
    if (explicitApplicantProfileState === "incomplete") {
      return "incomplete";
    }
    return "complete";
  }, [explicitApplicantProfileState, personalProfileId]);
  const resolvedEstablishmentProfileState = useMemo<ServiceEntryGateProfileState>(
    () => {
      if (explicitApplicantProfileState === "missing") {
        return "missing";
      }
      if (!allEstablishmentSelectorOptions.length) {
        return "missing";
      }
      return "complete";
    },
    [allEstablishmentSelectorOptions.length, explicitApplicantProfileState],
  );
  const currentEstablishmentMatchesGate = useMemo(
    () =>
      establishmentSelectorOptions.some(
        (option) => String(option.value) === String(currentProfileId),
      ),
    [currentProfileId, establishmentSelectorOptions],
  );
  const gatePageBlocker = useMemo<GatePageBlockerState | null>(() => {
    if (!i18n.language) {
      return null;
    }

    if (!gateGuardReady || !isEntryFlow || gateApplicantMode !== "Both") {
      return null;
    }

    if (displayApplicantMode === "Individual") {
      debugger;
      if (
        gatePageVariant === "both-add-personal" ||
        resolvedPersonalProfileState === "missing"
      ) {
        return {
          title: gateT(
            "serviceEntryGate.addPersonal.title",
            "Add Personal Profile",
          ),
          description: gateT(
            "serviceEntryGate.bothModes.addPersonal.description",
            "You don't have a Personal Profile. Add one to apply as an individual, or switch to your Establishment Profile to continue.",
          ),
          variant: "add-personal-inline",
          actions: [
            {
              key: "add-personal",
              label: gateT("serviceEntryGate.actions.addNow", "Add Now"),
              variant: "primary",
            },
          ],
          blocksForm: true,
        };
      }

      if (
        gatePageVariant === "both-complete-personal" ||
        resolvedPersonalProfileState === "incomplete"
      ) {
        return {
          title: gateT(
            "serviceEntryGate.completePersonal.title",
            "Complete Your Profile",
          ),
          description: gateT(
            "serviceEntryGate.bothModes.completePersonal.description",
            "Your Personal Profile is incomplete. Complete it to apply as an individual, or switch to your Establishment Profile to continue.",
          ),
          variant: "complete-personal-inline",
          actions: [
            {
              key: "complete-personal",
              label: gateT(
                "serviceEntryGate.actions.completeNow",
                "Complete Now",
              ),
              variant: "primary",
            },
          ],
          blocksForm: true,
        };
      }

      return null;
    }

    if (
      gatePageVariant === "both-add-establishment-basic" ||
      resolvedEstablishmentProfileState === "missing"
    ) {
      return {
        title: gateT(
          "serviceEntryGate.addEstablishment.title",
          "Add Establishment Profile",
        ),
        description: gateT(
          "serviceEntryGate.bothModes.addEstablishment.description",
          "You don't have an Establishment Profile. Add one to apply as an establishment, or switch to your Personal Profile to continue.",
        ),
        variant: "add-establishment-inline",
        actions: [
          {
            key: "add-establishment",
            label: gateT("serviceEntryGate.actions.addNow", "Add Now"),
            variant: "primary",
          },
        ],
        blocksForm: true,
      };
    }

    if (
      gatePageVariant === "both-add-required-establishment" ||
      (hasExplicitQualifyingProfilesHint && !qualifyingEstablishmentOptions.length)
    ) {
      return {
        title: gateT(
          "serviceEntryGate.addEstablishment.title",
          "Add Establishment Profile",
        ),
        description: gateT(
          "serviceEntryGate.requiredEstablishment.description",
          "This service is only available for the following establishment types. Please add one to apply.",
        ),
        variant: "add-required-establishment-inline",
        bulletItems: gatePayload?.uiHints?.establishmentTypes?.map(String) || undefined,
        actions: [
          {
            key: "add-establishment",
            label: gateT("serviceEntryGate.actions.addNow", "Add Now"),
            variant: "primary",
          },
        ],
        blocksForm: true,
      };
    }

    if (
      gatePageVariant === "both-switch-establishment" &&
      establishmentSelectorOptions.length > 1
    ) {
      return {
        title: gateT(
          "serviceEntryGate.switchEstablishment.title",
          "Switch Establishment Profile",
        ),
        description: gateT(
          "serviceEntryGate.bothModes.selectEstablishment.description",
          "Select a qualifying establishment to continue with this service.",
        ),
        variant: "switch-establishment-selector-inline",
        helperText: gateT(
          "serviceEntryGate.bothModes.selectEstablishment.helper",
          "The application form will unlock after you choose an eligible establishment profile.",
        ),
        actions: [],
        blocksForm: true,
      };
    }

    if (
      gatePageVariant === "both-switch-establishment" ||
      establishmentSelectorOptions.length === 1
    ) {
      const [targetEstablishment] = establishmentSelectorOptions;

      if (targetEstablishment && String(targetEstablishment.value) !== String(currentProfileId)) {
        return {
          title: gateT(
            "serviceEntryGate.switchEstablishment.title",
            "Switch Establishment Profile",
          ),
          description: gateT(
            "serviceEntryGate.switchEstablishment.description",
            "This service is only available for the following establishment types. Please switch to a qualifying establishment to continue.",
          ),
          variant: "switch-required-establishment-inline",
          actions: targetEstablishment.userTypeId
            ? [
                {
                  key: "switch-establishment",
                  label: gateT(
                    "serviceEntryGate.actions.switchNow",
                    "Switch Now",
                  ),
                  variant: "primary",
                },
              ]
            : [],
          blocksForm: true,
          autoSwitchProfileId: String(targetEstablishment.value),
          autoSwitchUserTypeId: String(targetEstablishment.userTypeId || ""),
        };
      }

      return null;
    }

    if (!currentEstablishmentMatchesGate || !hasCompletedRelatedEstablishmentSelection) {
      return {
        title: gateT(
          "serviceEntryGate.switchEstablishment.title",
          "Switch Establishment Profile",
        ),
        description: gateT(
          "serviceEntryGate.bothModes.selectEstablishment.description",
          "Select a qualifying establishment to continue with this service.",
        ),
        variant: "switch-establishment-selector-inline",
        helperText: gateT(
          "serviceEntryGate.bothModes.selectEstablishment.helper",
          "The application form will unlock after you choose an eligible establishment profile.",
        ),
        actions: [],
        blocksForm: true,
      };
    }

    return null;
  }, [
    currentProfileId,
    currentEstablishmentMatchesGate,
    displayApplicantMode,
    resolvedEstablishmentProfileState,
    establishmentSelectorOptions,
    gateApplicantMode,
    gateGuardReady,
    gatePayload?.uiHints?.establishmentTypes,
    hasCompletedRelatedEstablishmentSelection,
    hasExplicitQualifyingProfilesHint,
    isEntryFlow,
    qualifyingEstablishmentOptions,
    resolvedPersonalProfileState,
    gatePageVariant,
    i18n.language,
  ]);
  const isBothApplicantModeGate =
    gateGuardReady && isEntryFlow && gateApplicantMode === "Both";
  const showApplicantModeSelector = isBothApplicantModeGate;
  const showRelatedEstablishmentSelector =
    isBothApplicantModeGate &&
    displayApplicantMode === "Establishment" &&
    resolvedEstablishmentProfileState !== "missing" &&
    gatePageVariant !== "both-add-establishment-basic" &&
    gatePageVariant !== "both-add-required-establishment" &&
    establishmentSelectorOptions.length > 1;
  const requiresRelatedEstablishmentSelection = showRelatedEstablishmentSelector;
  const hasUnlockedApplicationForm =
    !gatePageBlocker?.blocksForm &&
    (!requiresRelatedEstablishmentSelection ||
      hasCompletedRelatedEstablishmentSelection);
  const showServiceEntryGateCard =
    showApplicantModeSelector ||
    showRelatedEstablishmentSelector ||
    Boolean(gatePageBlocker);

  useEffect(() => {
    setDisplayApplicantMode((prev) =>
      prev === activeApplicantMode ? prev : activeApplicantMode,
    );
  }, [currentProfileId, activeApplicantMode]);

  useEffect(() => {
    if (!gateGuardReady || !currentProfileId) {
      return;
    }

    if (profileSwitchNavigationRef.current) {
      return;
    }

    if (!isBothApplicantModeGate) {
      return;
    }

    if (!isEntryFlow) {
      clearRelatedEstablishmentSelectionCache();
      setHasCompletedRelatedEstablishmentSelection(false);
      return;
    }

    const pendingSelection = readRelatedEstablishmentSelectionCache();

    if (
      pendingSelection &&
      pendingSelection.serviceId === String(selectionCacheServiceId) &&
      pendingSelection.targetProfileId === String(currentProfileId)
    ) {
      setDisplayApplicantMode("Establishment");
      setRelatedEstablishmentProfileId(String(currentProfileId));
      setHasCompletedRelatedEstablishmentSelection(true);
      clearRelatedEstablishmentSelectionCache();
      return;
    }

    if (
      pendingSelection &&
      pendingSelection.serviceId === String(selectionCacheServiceId)
    ) {
      clearRelatedEstablishmentSelectionCache();
    }

    if (displayApplicantMode !== "Establishment") {
      setHasCompletedRelatedEstablishmentSelection(false);
      setRelatedEstablishmentProfileId("");
      clearRelatedEstablishmentSelectionCache();
      return;
    }

    if (
      resolvedEstablishmentProfileState === "missing" ||
      gatePageVariant === "both-add-establishment-basic" ||
      gatePageVariant === "both-add-required-establishment"
    ) {
      setHasCompletedRelatedEstablishmentSelection(false);
      setRelatedEstablishmentProfileId("");
      clearRelatedEstablishmentSelectionCache();
      return;
    }

    if (establishmentSelectorOptions.length <= 1) {
      const onlyOption = establishmentSelectorOptions[0];
      setRelatedEstablishmentProfileId(onlyOption?.value || "");
      setHasCompletedRelatedEstablishmentSelection(
        Boolean(
          onlyOption?.value &&
            String(onlyOption.value) === String(currentProfileId),
        ),
      );
      return;
    }

    if (currentEstablishmentMatchesGate) {
      setRelatedEstablishmentProfileId(String(currentProfileId));
      setHasCompletedRelatedEstablishmentSelection(true);
      return;
    }

    if (!hasCompletedRelatedEstablishmentSelection) {
      setRelatedEstablishmentProfileId("");
    }
  }, [
    gateGuardReady,
    currentProfileId,
    currentEstablishmentMatchesGate,
    displayApplicantMode,
    establishmentSelectorOptions,
    hasCompletedRelatedEstablishmentSelection,
    isBothApplicantModeGate,
    gatePageVariant,
    isEntryFlow,
    resolvedEstablishmentProfileState,
    selectionCacheServiceId,
  ]);

  const refreshCardPaymentApplicationDetail = useCallback(
    async (nextApplicationId?: number) => {
      const targetApplicationId = Number(nextApplicationId ?? applicationId);

      if (!targetApplicationId || Number.isNaN(targetApplicationId)) {
        return;
      }

      const { resolvedApplicationId } = await resolveLifecycleDetailRequest(
        targetApplicationId,
      );
      const response = await getApplicationDetail(resolvedApplicationId);

      if (!response.data) {
        return;
      }

      setApplicationSourceDetail(
        await enrichApplicationSourceDetail(
          getLicenseLifecycleSourceFromApplicationDetail(response.data),
        ),
      );
      setApplicationSourceDetailOwnerApplicationId(
        response.data.applicationId,
      );
      setStatusEn(response.data);
      setCardPaymentApplicationDetail(response.data);
      setapplicationId(response.data.applicationId);
      setApplicationNumber(response.data.applicationNumber || "");
      setfinalId(String(response.data.applicationId));
    },
    [applicationId, resolveLifecycleDetailRequest],
  );

  const {
    cardPaymentVisible,
    cardPaymentStatus,
    cardPaymentLoading,
    cardPaymentConfirmLoading,
    cardPaymentCancelLoading,
    cardPaymentResultMessage,
    cardPaymentFailureDetails,
    cardPaymentDocumentNumber,
    handleCardPaymentPurchase,
    handleCardPaymentProgressClose,
    handleCardPaymentConfirmCompleted,
    handleCardPaymentTryAgain,
    resetCardPaymentFlow,
  } = useCardPayment({
    applicationId: Number(
      activeCardPaymentDetail?.applicationId ?? applicationId,
    ),
    paymentAmount,
    hasPayablePenalty: penaltyTotalAmount > 0,
    applicationDetail: activeCardPaymentDetail,
    search: location.search,
    replacePathSearch: (nextSearch) => {
      history.replace(`${location.pathname}${nextSearch}`);
    },
    refreshDetails: () => {
      refreshCardPaymentApplicationDetail();
    },
  });

  const syncPaymentApplicationSearch = useCallback(
    (nextApplicationId: number) => {
      const searchParams = new URLSearchParams(location.search);
      const nextApplicationIdString = String(nextApplicationId);

      if (searchParams.get("applicationId") === nextApplicationIdString) {
        return location.search || `?applicationId=${nextApplicationIdString}`;
      }

      searchParams.set("applicationId", nextApplicationIdString);
      const nextSearch = `?${searchParams.toString()}`;

      skipSyncedApplicationReloadRef.current = nextApplicationId;
      history.replace(`${location.pathname}${nextSearch}`);
      return nextSearch;
    },
    [history, location.pathname, location.search],
  );

  const buildCardPaymentApplicationDetail = useCallback(
    (
      nextApplicationId: number,
      nextApplicationNumber: string | null,
      nextApplicationDetailId?: number | null,
    ): ApplicationDetailsResponse => ({
      id:
        nextApplicationDetailId ??
        nextApplicationId ??
        activeCardPaymentDetail?.id ??
        null,
      applicationDetailId:
        nextApplicationDetailId ??
        nextApplicationId ??
        activeCardPaymentDetail?.applicationDetailId ??
        null,
      applicationId: nextApplicationId,
      applicationNumber: nextApplicationNumber,
      sourceServiceCode:
        activeCardPaymentDetail?.sourceServiceCode ??
        effectiveLicenseLifecycleSource?.sourceServiceCode ??
        null,
      sourceMedialLicenseId:
        activeCardPaymentDetail?.sourceMedialLicenseId ??
        activeCardPaymentDetail?.mediaLicenseId ??
        effectiveLicenseLifecycleSource?.sourceMedialLicenseId ??
        null,
      sourceApplicationId:
        activeCardPaymentDetail?.sourceApplicationId ??
        effectiveLicenseLifecycleSource?.sourceApplicationId ??
        null,
      sourceApplicationDetailId:
        activeCardPaymentDetail?.sourceApplicationDetailId ??
        effectiveLicenseLifecycleSource?.sourceApplicationDetailId ??
        null,
      statusEn: activeCardPaymentDetail?.statusEn || null,
      statusAr: activeCardPaymentDetail?.statusAr || null,
      createdOn: activeCardPaymentDetail?.createdOn || toGstApi(nowGst()),
      updatedOn: activeCardPaymentDetail?.updatedOn || null,
      formData:
        activeCardPaymentDetail?.formData ||
        JSON.stringify((ServicesStore.userInfo as any).formilyData),
      serviceDepartment: Department || undefined,
      certificateId: activeCardPaymentDetail?.certificateId || null,
      referenceNumber:
        activeCardPaymentDetail?.referenceNumber || nextApplicationNumber,
    }),
    [
      Department,
      ServicesStore.userInfo,
      activeCardPaymentDetail,
      effectiveLicenseLifecycleSource,
    ],
  );

  const triggerPaymentByMethod = useCallback(
    async () => {
      if (stopForLifecycleActivityBlock()) {
        return false;
      }

      const targetApplicationId = Number(
        activeCardPaymentDetail?.applicationId ?? applicationId,
      );

      if (!targetApplicationId || Number.isNaN(targetApplicationId)) {
        CustomMessage.error(
          t("mediaLicensePage.applicationDetailUnavailableRetry"),
        );
        return false;
      }

      const targetApplicationDetail =
        activeCardPaymentDetail ||
        buildCardPaymentApplicationDetail(
          targetApplicationId,
          applicationNumber || null,
        );
      const nextSearch = syncPaymentApplicationSearch(targetApplicationId);

      return handleCardPaymentPurchase({
        applicationId: targetApplicationId,
        applicationDetail: targetApplicationDetail,
        search: nextSearch,
        refreshDetails: () => {
          refreshCardPaymentApplicationDetail(targetApplicationId);
        },
      });
    },
    [
      applicationId,
      applicationNumber,
      buildCardPaymentApplicationDetail,
      handleCardPaymentPurchase,
      refreshCardPaymentApplicationDetail,
      stopForLifecycleActivityBlock,
      syncPaymentApplicationSearch,
      t,
      activeCardPaymentDetail,
    ],
  );

  const prepareReviewApplication = useCallback(
    async (options?: {
      onMissingApplicationMessage?: string;
      reusePreparedApplication?: boolean;
    }) => {
      if (stopForModifyBaselineBlock()) {
        return null;
      }

      const isEligibleToSubmit =
        await checkFinalSubmissionServiceEntryGate({
          serviceId: Number(ServicesStore.userInfo.servicesId || 0),
          search: location.search,
        });

      if (!isEligibleToSubmit) {
        CustomMessage.error(
          t("serviceEntryGate.messages.submissionEligibilityFailed"),
        );
        return null;
      }

      const missingApplicationMessage =
        options?.onMissingApplicationMessage ||
        "Unable to continue right now. Please try again.";
      const existingApplicationId = Number(
        activeCardPaymentDetail?.applicationId ?? applicationId,
      );
      const existingApplicationNumber = String(
        activeCardPaymentDetail?.applicationNumber ?? applicationNumber,
      ).trim();
      const existingApplicationStatusId = Number(
        activeCardPaymentDetail?.applicationStatusId ??
          statusEn?.applicationStatusId ??
          servicesStatus,
      );
      const preparedPaymentApplication =
        preparedPaymentApplicationRef.current;
      const isPreparedPaymentApplicationMatch =
        preparedPaymentApplication?.applicationId === existingApplicationId;
      const canReusePreparedApplication =
        isPreparedPaymentApplicationMatch ||
        existingApplicationStatusId === APPLICATION_STATUS_ID.pendingPayment;

      if (
        options?.reusePreparedApplication &&
        canReusePreparedApplication &&
        Number.isFinite(existingApplicationId) &&
        existingApplicationId > 0 &&
        existingApplicationNumber
      ) {
        const existingApplicationDetail =
          (isPreparedPaymentApplicationMatch
            ? preparedPaymentApplication?.applicationDetail
            : null) ||
          activeCardPaymentDetail ||
          buildCardPaymentApplicationDetail(
            existingApplicationId,
            existingApplicationNumber,
          );

        syncPaymentApplicationSearch(existingApplicationId);
        setapplicationId(existingApplicationId);
        setApplicationNumber(existingApplicationNumber);
        setfinalId(String(existingApplicationId));
        setCardPaymentApplicationDetail(existingApplicationDetail);
        setStatusEn(existingApplicationDetail);

        return {
          applicationId: existingApplicationId,
          applicationNumber: existingApplicationNumber,
          applicationDetail: existingApplicationDetail,
        };
      }

      const latestFormilyData = appendDeliveryInformationToFormilyList(
        (ServicesStore.userInfo as any).formilyData as MediaLicenseFormStep[],
      );
      const normalizedFormilyData = await normalizePublicationLanguageSubmission(
        latestFormilyData as MediaLicenseFormStep[],
      );
      const activityNormalizedFormilyData =
        currentServiceId === 1801
          ? normalizeService1801IdSelectorFormilyList(normalizedFormilyData)
          : normalizedFormilyData;
      const formilyDataWithModifyReviewMetadata =
        MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(
          String(ServicesStore.userInfo.servicesCode ?? ""),
        )
            ? attachModifyReviewMetadata(
              activityNormalizedFormilyData,
              modifyOriginalFormilyList,
              modifyProfileBefore,
            )
          : activityNormalizedFormilyData;
      const submissionFormilyData = sanitizeFormilyListForSubmission(
        formilyDataWithModifyReviewMetadata,
      );

      if (currentServiceId === SERVICE_302) {
        const validationMessage = getService302ValidationMessage(
          normalizedFormilyData,
        );
        if (validationMessage) {
          CustomMessage.error(validationMessage);
          return null;
        }
      }

      const {
        penaltyPayloadError,
        ...addApplicationEnginePayloads
      } =
        await buildAddApplicationEnginePayloads(normalizedFormilyData, {
          submissionMode: "submit",
          targetApplicationId:
            servicesActions == "Duplicate" ? 0 : applicationId,
          targetApplicationNo: applicationNumber,
        });

      if (penaltyPayloadError) {
        CustomMessage.error(penaltyPayloadError);
        return null;
      }

      const missingModifyEnginePayload =
        getMissingRequiredModifyEnginePayload(
          ServicesStore.userInfo.servicesCode,
          addApplicationEnginePayloads,
        );
      if (missingModifyEnginePayload) {
        CustomMessage.error(
          t(
            missingModifyEnginePayload === "bre"
              ? "mediaLicensePage.ruleValidationUnavailable"
              : "mediaLicensePage.feeCalculationPending",
          ),
        );
        return null;
      }

      const addApplicationActivityPayload =
        buildAddApplicationActivityPayload(submissionFormilyData);
      const createdApplication = await AddNewApplication({
        serviceId: ServicesStore.userInfo.servicesId!,
        ServiceCode: String(ServicesStore.userInfo.servicesCode || ""),
        ...addApplicationActivityPayload,
        formData: JSON.stringify(submissionFormilyData),
        type: 1,
        ...buildApplicationIdPayload(applicationId),
        ...buildApplicationSourcePayload(),
        ...addApplicationEnginePayloads,
        ...(userInfo?.isTestAccount === true ? { IsTest: true } : {}),
      });
      const createdApplicationData = (createdApplication?.data || {}) as {
        id?: unknown;
        applicationDetailId?: unknown;
        detailId?: unknown;
        applicationNumber?: unknown;
      };

      const nextApplicationId = Number(createdApplicationData.id);
      const nextApplicationDetailId = Number(
        firstNullableId(
          createdApplicationData.applicationDetailId,
          createdApplicationData.detailId,
          createdApplicationData.id,
        ),
      );

      if (!nextApplicationId || Number.isNaN(nextApplicationId)) {
        CustomMessage.error(missingApplicationMessage);
        return null;
      }

      let nextApplicationNumber = String(
        createdApplicationData.applicationNumber || "",
      ).trim();
      let recoveredApplicationDetail: ApplicationDetailsResponse | null = null;

      if (!nextApplicationNumber) {
        try {
          const detailResponse = await getApplicationDetail(nextApplicationId);
          const detailData = detailResponse?.data as
            | ApplicationDetailsResponse
            | null
            | undefined;
          recoveredApplicationDetail =
            resolveApplicationDetailsResponse(detailData);
          nextApplicationNumber = String(
            detailData?.applicationNumber || "",
          ).trim();
        } catch (error) {
          console.error(
            "Failed to recover the created application number:",
            error,
          );
        }
      }

      const nextApplicationDetail =
        recoveredApplicationDetail ||
        buildCardPaymentApplicationDetail(
          nextApplicationId,
          nextApplicationNumber || null,
          !Number.isNaN(nextApplicationDetailId) && nextApplicationDetailId > 0
            ? nextApplicationDetailId
            : null,
        );

      syncPaymentApplicationSearch(nextApplicationId);
      setapplicationId(nextApplicationId);
      setApplicationNumber(nextApplicationNumber);
      setfinalId(String(nextApplicationId));
      setCardPaymentApplicationDetail(nextApplicationDetail);
      setStatusEn(nextApplicationDetail);

      if (!nextApplicationNumber) {
        CustomMessage.error(
          t("mediaLicensePage.applicationNumberUnavailable"),
        );
        history.replace(`/my-requests/detail?id=${nextApplicationId}`);
        return null;
      }

      const preparedApplication = {
        applicationId: nextApplicationId,
        applicationNumber: nextApplicationNumber,
        applicationDetail: nextApplicationDetail,
      };
      preparedPaymentApplicationRef.current = preparedApplication;

      return preparedApplication;
    },
    [
      ServicesStore.userInfo,
      activeCardPaymentDetail,
      appendDeliveryInformationToFormilyList,
      applicationId,
      applicationNumber,
      buildAddApplicationActivityPayload,
      buildAddApplicationEnginePayloads,
      buildApplicationIdPayload,
      buildApplicationSourcePayload,
      buildCardPaymentApplicationDetail,
      currentServiceId,
      history,
      location.search,
      modifyOriginalFormilyList,
      modifyProfileBefore,
      servicesActions,
      servicesStatus,
      statusEn?.applicationStatusId,
      stopForModifyBaselineBlock,
      syncPaymentApplicationSearch,
      t,
      userInfo,
    ],
  );

  const handlePayNow = async () => {
    if (isCurrentModifyFeeQuotePending) {
      CustomMessage.warning(t("mediaLicensePage.feeCalculationPending"));
      return;
    }

    if (stopForLifecycleActivityBlock()) {
      return;
    }

    if (stopForModifyBaselineBlock()) {
      return;
    }

    if (TotalAmount <= 0) {
      await handleSubmit();
      return;
    }

    if (!choosestatus) {
      return;
    }

    if (!validateDeliveryInformation()) {
      CustomMessage.error(t("mediaLicensePage.deliveryRequired"));
      return;
    }

    setaddapplicationstatus(true);
    try {
      const preparedApplication = await prepareReviewApplication({
        onMissingApplicationMessage:
          t("mediaLicensePage.paymentPrepareFailed"),
        reusePreparedApplication: true,
      });

      if (!preparedApplication) {
        return;
      }

      if (showDeliveryInformationCard) {
        const deliverySaved = await persistDeliveryInformation(
          preparedApplication.applicationId,
          preparedApplication.applicationDetail,
        );

        if (!deliverySaved) {
          return;
        }
      }

      if (TotalAmount) {
        setPaymentMethodModalVisible(true);
      } else {
        setSubmissionResult("submission-successful");
      }
    } catch (error) {
      console.error("Failed to prepare payment application:", error);
      const publicationLanguageKey =
        getPublicationLanguageValidationKey(error);
      CustomMessage.error(
        publicationLanguageKey
          ? t(publicationLanguageKey)
          : t("mediaLicensePage.paymentPrepareFailed"),
      );
    } finally {
      setaddapplicationstatus(false);
    }
  };

  const handlePaymentMethodModalClose = () => {
    setPaymentMethodModalVisible(false);

    const preparedApplicationId = Number(
      activeCardPaymentDetail?.applicationId ?? applicationId,
    );

    if (!Number.isFinite(preparedApplicationId) || preparedApplicationId <= 0) {
      CustomMessage.error(
        t("mediaLicensePage.applicationDetailUnavailableRetry"),
      );
      return;
    }

    history.replace(`/my-requests/detail?id=${preparedApplicationId}`);
  };

  const handlePaymentMethodProceed = async () => {
    const started = await triggerPaymentByMethod();

    if (started) {
      setPaymentMethodModalVisible(false);
    }
  };

  const handleCardPaymentUseDifferentMethod = () => {
    resetCardPaymentFlow();
  };

  const handleBack = () => {
    if (submissionResult) {
      setSubmissionResult(null);
      history.goBack();
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      history.goBack();
    }
  };
  const btnFun = () => {
    // const cookies = FormilyOption as any;
    // if(cookies.schema && cookies.schema.properties && selectTableKey) {
    //    cookies.schema.properties[selectTableKey]["x-component-props"].value = selectedActivities;
    // }
    // setFormilyOption(cookies);
    // const formDatacookies = [...formsList] as any[];
    // if(formDatacookies[currentStep - 1]){
    //     formDatacookies[currentStep - 1].formData = JSON.stringify(cookies);
    // }
    // setFormsList(formDatacookies as any);
  };
  const [currentFormInstance, setCurrentFormInstance] = useState<any>(null);
  const [canSaveDraft, setCanSaveDraft] = useState(false);

  const clearTransientFormState = useCallback(() => {
    setFileList([]);
    setSelectedActivities([]);
    setCanSaveDraft(false);
    setCurrentStep(1);
    setFormilyList([]);
    setLifecycleActivityContext(null);
    setModifySourceActivityIds([]);
    setLifecycleActivityError("");
    setLifecycleActivityLoading(false);
    updateFormilyData([]);
    resetFeeQuote();
    resetResolvedFormFee();
  }, [resetFeeQuote, resetResolvedFormFee, updateFormilyData]);

  const confirmProfileSwitchIfNeeded = useCallback(async () => {
    const result = await openGateDialog({
      kind: "danger-confirm",
      tone: "danger",
      variant: "switch-profile-dirty",
      title: gateT("serviceEntryGate.dirtySwitch.title", "Switch Profile?"),
      description: gateT(
        "serviceEntryGate.dirtySwitch.description",
        "You have already entered application information. Switching will clear this data. Do you want to continue?",
      ),
      actions: [
        {
          key: "cancel",
          label: gateT("serviceEntryGate.actions.cancel", "Cancel"),
          variant: "outline",
        },
        {
          key: "continue",
          label: gateT("serviceEntryGate.actions.continue", "Continue"),
          variant: "danger",
        },
      ],
      dismissActionKey: "cancel",
    });

    return result.actionKey === "continue";
  }, [openGateDialog]);

  useEffect(() => {
    setProfileSwitchGuard(async (target) => {
      const activeProfileId = String(
        useUserStore.getState().currentProfileId || "",
      );
      if (String(target.profileId) === activeProfileId) {
        return true;
      }

      const canContinue = await confirmProfileSwitchIfNeeded();
      if (canContinue) {
        clearTransientFormState();
        profileSwitchNavigationRef.current = true;
      }

      return canContinue;
    });

    return () => {
      setProfileSwitchGuard(null);
    };
  }, [
    clearTransientFormState,
    confirmProfileSwitchIfNeeded,
    setProfileSwitchGuard,
  ]);

  const switchIdentityProfile = async (
    targetProfileId: string,
    targetUserTypeId: string,
  ) => {
    if (!targetProfileId || !targetUserTypeId) {
      return false;
    }

    if (String(targetProfileId) === String(currentProfileId)) {
      return true;
    }

    const canContinue = await confirmProfileSwitchIfNeeded();
    if (!canContinue) {
      return false;
    }

    clearTransientFormState();
    profileSwitchNavigationRef.current = true;

    const response = (await userChangeIdentity({
      userProFileID: targetProfileId,
      userTypeID: targetUserTypeId,
    })) as { data?: { token?: string } };
    const token = String(response.data?.token || "").trim();

    if (!token) {
      throw new Error("ChangeIdentity did not return a token");
    }

    setCurrentIdentity(targetProfileId, targetUserTypeId);
    authStorage.setTokenInfo({
      token,
      refreshToken: "",
      expiresIn: TIME.REFRESH_TOKEN_EXPIRE,
      remember: true,
    });

    window.location.assign(
      appendPersistentQueryToUrl(`${location.pathname}${location.search}`),
    );
    return true;
  };

  const handleGatePageAction = async (actionKey: GatePageActionKey) => {
    if (actionKey === "add-personal") {
      history.push("/my-account/personal-profile?mode=add");
      return;
    }

    if (actionKey === "complete-personal") {
      history.push("/my-account/personal-profile?mode=edit");
      return;
    }

    if (actionKey === "add-establishment") {
      history.push("/my-account/establishment-profile?mode=add");
      return;
    }

    if (actionKey === "switch-establishment") {
      const targetProfileId = gatePageBlocker?.autoSwitchProfileId;
      const targetUserTypeId = gatePageBlocker?.autoSwitchUserTypeId;

      if (!targetProfileId || !targetUserTypeId) {
        CustomMessage.error(
          gateT(
            "serviceEntryGate.serviceUnavailable.title",
            "Service Unavailable",
          ),
        );
        return;
      }

      await switchIdentityProfile(targetProfileId, targetUserTypeId);
    }
  };

  const handleApplicantModeChange = async (
    nextMode: "Individual" | "Establishment",
  ) => {
    if (nextMode === displayApplicantMode) {
      return;
    }

    const previousRelatedEstablishmentProfileId = relatedEstablishmentProfileId;
    const previousSelectionCompletionState =
      hasCompletedRelatedEstablishmentSelection;

    setDisplayApplicantMode(nextMode);

    if (nextMode === "Individual") {
      setRelatedEstablishmentProfileId("");
      setHasCompletedRelatedEstablishmentSelection(false);
      clearRelatedEstablishmentSelectionCache();

      if (personalProfileId && personalUserTypeId) {
        const switched = await switchIdentityProfile(
          personalProfileId,
          personalUserTypeId,
        );

        if (!switched) {
          setDisplayApplicantMode(activeApplicantMode);
          setRelatedEstablishmentProfileId(
            previousRelatedEstablishmentProfileId,
          );
          setHasCompletedRelatedEstablishmentSelection(
            previousSelectionCompletionState,
          );
        }
      }
      return;
    }

    if (!establishmentSelectorOptions.length) {
      return;
    }

    if (establishmentSelectorOptions.length > 1) {
      setRelatedEstablishmentProfileId("");
      setHasCompletedRelatedEstablishmentSelection(false);
      return;
    }

    const nextEstablishment = establishmentSelectorOptions[0];
    if (nextEstablishment?.value && nextEstablishment.userTypeId) {
      setRelatedEstablishmentProfileId(String(nextEstablishment.value));
      setHasCompletedRelatedEstablishmentSelection(true);
      const switched = await switchIdentityProfile(
        String(nextEstablishment.value),
        String(nextEstablishment.userTypeId),
      );

      if (!switched) {
        setDisplayApplicantMode(activeApplicantMode);
        setRelatedEstablishmentProfileId(
          previousRelatedEstablishmentProfileId,
        );
        setHasCompletedRelatedEstablishmentSelection(
          previousSelectionCompletionState,
        );
      }
    }
  };

  const handleRelatedEstablishmentChange = async (value: string) => {
    const previousRelatedEstablishmentProfileId = relatedEstablishmentProfileId;
    const previousSelectionCompletionState =
      hasCompletedRelatedEstablishmentSelection;

    setRelatedEstablishmentProfileId(value);
    const target = establishmentSelectorOptions.find((item) => item.value === value);
    if (!target) {
      return;
    }

    if (String(target.value) === String(currentProfileId)) {
      setHasCompletedRelatedEstablishmentSelection(true);
      return;
    }

    if (target.userTypeId) {
      writeRelatedEstablishmentSelectionCache(
        selectionCacheServiceId,
        String(target.value),
      );
      const switched = await switchIdentityProfile(
        String(target.value),
        String(target.userTypeId),
      );

      if (!switched) {
        clearRelatedEstablishmentSelectionCache();
        setRelatedEstablishmentProfileId(previousRelatedEstablishmentProfileId);
        setHasCompletedRelatedEstablishmentSelection(
          previousSelectionCompletionState,
        );
      }
    }
  };

  const handleAddRelatedEstablishmentProfile = () => {
    history.push("/my-account/establishment-profile?mode=add");
  };

  const hasAnyValue = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "number") return !Number.isNaN(val);
    if (typeof val === "boolean") return val === true;
    if (val instanceof Date) return true;
    if (Array.isArray(val)) return val.some((v) => hasAnyValue(v));
    if (typeof val === "object") {
      return Object.values(val).some((v) => hasAnyValue(v));
    }
    return false;
  };
  const buildLiveFormilyList = useCallback(
    (liveValues: any) => {
      if (!Array.isArray(FormilyList) || FormilyList.length === 0) {
        return [];
      }

      const liveFormValues = { ...(liveValues || {}) };
      if ("formData" in liveFormValues) {
        delete liveFormValues.formData;
      }

      const visibleIndex = currentStep - 1;
      const originalIndex = FormilyList.indexOf(visibleFormilyList[visibleIndex]);
      const stepIndex = originalIndex >= 0 ? originalIndex : visibleIndex;
      const stepItem: any = FormilyList?.[stepIndex];

      let parsedFormData: any = {};
      try {
        parsedFormData = stepItem?.formData ? JSON.parse(stepItem.formData) : {};
      } catch {
        parsedFormData = {};
      }

      const persistedFormValues =
        parsedFormData?.formValues && typeof parsedFormData.formValues === "object"
          ? parsedFormData.formValues
          : {};
      const nextValues = {
        ...persistedFormValues,
        ...liveFormValues,
      };
      if ("formData" in nextValues) {
        delete nextValues.formData;
      }

      const nextFormDataObj = {
        ...parsedFormData,
        formValues: nextValues,
        fileList,
      };

      return (FormilyList || []).map((item: any, idx: number) => {
        if (idx !== stepIndex) return item;
        return {
          ...item,
          formData: JSON.stringify(nextFormDataObj),
        };
      });
    },
    [FormilyList, currentStep, fileList, visibleFormilyList],
  );
  const quoteCurrentForm = useCallback(
    (values: any, quoteKey?: string) => {
      if (
        !activeFeeStrategyConfig ||
        isReviewStep ||
        isModifyBaselineBlocking
      ) {
        return;
      }

      const nextFormilyList = buildLiveFormilyList(values);
      if (nextFormilyList.length) {
        void requestFeeQuote(
          attachCurrentModifyReviewMetadata(nextFormilyList),
          { quoteKey },
        );
      }
    },
    [
      activeFeeStrategyConfig,
      attachCurrentModifyReviewMetadata,
      buildLiveFormilyList,
      isReviewStep,
      isModifyBaselineBlocking,
      requestFeeQuote,
    ],
  );
  const scheduleFeeQuote = useCallback(
    (
      values: any,
      options?: {
        key?: string;
        markStale?: boolean;
      },
    ) => {
      if (!activeFeeStrategyConfig || isReviewStep) {
        return;
      }

      const hasMissingPartnerManagementChange = isPartnerManagementChangeMissing(
        ServicesStore.userInfo.servicesCode,
        buildLiveFormilyList(values) as MediaLicenseFormStep[],
      );

      if (hasMissingPartnerManagementChange && feeQuoteChangeTimerRef.current) {
        window.clearTimeout(feeQuoteChangeTimerRef.current);
        feeQuoteChangeTimerRef.current = null;
      }

      if (hasMissingPartnerManagementChange && options?.markStale) {
        setIsDraftAmountStale(true);
        resetFeeQuote();
      }

      if (hasMissingPartnerManagementChange) {
        return;
      }

      const hasResolvedQuoteForCurrentKey =
        !!options?.key &&
        resolvedFeeQuoteKeyRef.current === options.key;
      const hasPendingQuoteForCurrentKey =
        !!options?.key &&
        (pendingFormFeeKeyRef.current === options.key ||
          (openedFormFeeKeyRef.current === options.key &&
            quoteLoadingRef.current));

      // Skip only when the current key already has a resolved or in-flight
      // quote. Edit-driven stale recalculation must still be allowed to rerun
      // on the same step key.
      if (
        !options?.markStale &&
        (hasResolvedQuoteForCurrentKey || hasPendingQuoteForCurrentKey)
      ) {
        return;
      }

      if (options?.key) {
        pendingFormFeeKeyRef.current = options.key;
      }

      if (options?.markStale) {
        setIsDraftAmountStale(true);
        resetFeeQuote();
      }

      if (feeQuoteChangeTimerRef.current) {
        window.clearTimeout(feeQuoteChangeTimerRef.current);
      }

      feeQuoteChangeTimerRef.current = window.setTimeout(() => {
        feeQuoteChangeTimerRef.current = null;
        if (options?.key || pendingFormFeeKeyRef.current) {
          openedFormFeeKeyRef.current =
            options?.key || pendingFormFeeKeyRef.current;
          pendingFormFeeKeyRef.current = "";
        }
        quoteCurrentForm(values, options?.key);
      }, 300);
    },
    [
      activeFeeStrategyConfig,
      buildLiveFormilyList,
      isReviewStep,
      quoteCurrentForm,
      resetFeeQuote,
      resolvedFeeQuoteKeyRef,
      ServicesStore.userInfo.servicesCode,
    ],
  );
  useEffect(() => {
    if (!activeFeeStrategyConfig || !currentFormInstance || isReviewStep) {
      if (feeQuoteChangeTimerRef.current) {
        window.clearTimeout(feeQuoteChangeTimerRef.current);
        feeQuoteChangeTimerRef.current = null;
      }
      return;
    }

    const stepItem = visibleFormilyList[currentStep - 1] as
      | { id?: unknown; stepName?: unknown }
      | undefined;
    const formFeeKey = [
      ServicesStore.userInfo.servicesId,
      ServicesStore.userInfo.servicesCode,
      applicationId || "new",
      requestType || "",
      currentStep,
      stepItem?.id ?? stepItem?.stepName ?? "",
      activeFeeStrategyConfig.kind,
      feeQuoteApplicationNo || "",
      actionType4FeeEngineApplicationNo || "",
    ].join(":");

    scheduleFeeQuote(currentFormInstance.values, {
      key: formFeeKey,
      markStale: false,
    });
  }, [
    activeFeeStrategyConfig,
    applicationId,
    currentFormInstance,
    currentStep,
    feeQuoteApplicationNo,
    isReviewStep,
    requestType,
    scheduleFeeQuote,
    actionType4FeeEngineApplicationNo,
    ServicesStore.userInfo.servicesCode,
    ServicesStore.userInfo.servicesId,
    visibleFormilyList,
  ]);
  useEffect(
    () => () => {
      if (feeQuoteChangeTimerRef.current) {
        window.clearTimeout(feeQuoteChangeTimerRef.current);
      }
    },
    [],
  );
  const isNextDisabledForPartnerManagement = useMemo(() => {
    if (currentStep === visibleFormilyList.length + 1) {
      return false;
    }

    const liveFormilyList = buildLiveFormilyList(liveStepFormValues);
    return isPartnerManagementChangeMissing(
      ServicesStore.userInfo.servicesCode,
      liveFormilyList as MediaLicenseFormStep[],
    );
  }, [
    buildLiveFormilyList,
    currentStep,
    liveStepFormValues,
    visibleFormilyList.length,
    ServicesStore.userInfo.servicesCode,
  ]);

  const handleFormValuesChange = (values: any) => {
    const nextValues = { ...(values || {}) };
    const shouldSkipFeeQuote =
      ADDRESS_PICKER_FEE_IGNORED_SERVICE_KINDS.has(
        activeFeeStrategyConfig?.kind || "",
      ) &&
      isOnlyAddressPickerFeeIgnoredValuesChanged(liveStepFormValues, nextValues);

    setLiveStepFormValues(nextValues);
    if (!shouldSkipFeeQuote) {
      scheduleFeeQuote(values, {
        markStale: Boolean(openedFormFeeKeyRef.current),
      });
    }

    setCanSaveDraft(hasAnyValue(values));
  };
  const canUseDraftActions =
    canSaveDraft || hasAnyValue(currentFormInstance?.values);
  const isNextValidationPending =
    !hasAnyValue(liveStepFormValues) || isNextDisabledForPartnerManagement;

  const handleTotalFeeChange = (fee: number) => {
    markFeeResolved();
    if (activeFeeStrategyConfig) {
      return;
    }
    setTotalAmount(fee || 0);
  };
  const handleUploadComplete = (fileInfo: {
    name: string;
    fileType: number;
  }) => {
    setFileList((prevList) => {
      const exists = prevList.some((file) => file.name === fileInfo.name);
      if (exists) {
        return prevList;
      }
      return [...prevList, fileInfo];
    });
  };
  const [SelectTableOptions, setSelectTableOptions] = useState<any[]>([]);
  const selectTableOptionsSignatureRef = useRef("");
  const handleSelectTableOptionsChange = useCallback((options: any[]) => {
    const nextSignature = JSON.stringify(options || []);
    if (selectTableOptionsSignatureRef.current === nextSignature) {
      return;
    }
    selectTableOptionsSignatureRef.current = nextSignature;
    setSelectTableOptions(options);
  }, []);
  useEffect(() => {
    if (FormilyList.length === 0 || SelectTableOptions.length === 0) return;

    const visibleStep = visibleFormilyList[currentStep - 1];
    const stepIndex = visibleStep ? FormilyList.indexOf(visibleStep) : currentStep - 1;
    const originalStepItem: any = FormilyList?.[stepIndex];
    if (!originalStepItem || !originalStepItem.formData) return;

    let parsedFormData: any = {};
    try {
      parsedFormData = JSON.parse(originalStepItem.formData) || {};
    } catch {
      parsedFormData = {};
    }

    if (!parsedFormData.schema) return;

    const nextFormDataObj = patchFormDataWithSelectTableOptions({
      serviceCode: ServicesStore.userInfo?.servicesCode,
      parsedFormData,
      selectTableOptions: SelectTableOptions,
    });
    const nextFormDataString = JSON.stringify(nextFormDataObj);

    if (originalStepItem.formData === nextFormDataString) {
      return;
    }

    const cookies = (FormilyList || []).map((item: any, idx: number) => {
      if (idx !== stepIndex) return item;
      return {
        ...item,
        formData: nextFormDataString,
      };
    });
    setFormilyList(cookies);
    updateFormilyData(cookies);
  }, [
    SelectTableOptions,
    ServicesStore.userInfo?.servicesCode,
    currentStep,
    FormilyList,
    visibleFormilyList,
    updateFormilyData,
  ]);
  const SyncFormliy = async (skipValidation = false) => {
    try {
      if (!skipValidation) {
        await currentFormInstance.validate();
      }
      const values = normalizeProfileFormBranches(
        currentFormInstance.values,
      ) as Record<string, unknown>;
      if (values.formData) delete values.formData;
      const visibleIndex = currentStep - 1;
      const originalIndex = FormilyList.indexOf(visibleFormilyList[visibleIndex]);
      const stepIndex = originalIndex >= 0 ? originalIndex : visibleIndex;
      const stepItem: any = FormilyList?.[stepIndex];

      let parsedFormData: any = {};
      try {
        parsedFormData = stepItem?.formData
          ? JSON.parse(stepItem.formData)
          : {};
      } catch {
        parsedFormData = {};
      }

      // Add formValues into this step's dynamic formData
      const nextFormDataObj = {
        ...parsedFormData,
        formValues: normalizeDynamicMobileNumberFormValues(
          values,
          parsedFormData?.schema,
        ),
        fileList: fileList,
      };

      const updatedFormilyList = (FormilyList || []).map(
        (item: any, idx: number) => {
          if (idx !== stepIndex) return item;
          return {
            ...item,
            formData: JSON.stringify(nextFormDataObj),
          };
        },
      );

      return updatedFormilyList;
    } catch (e) {
      console.error("Form validation failed", e);
      return null;
    }
  };

  useEffect(() => {
    setLiveStepFormValues({ ...(currentFormInstance?.values || {}) });
  }, [currentFormInstance, currentStep]);
  const syncFormliyRef = useRef(SyncFormliy);
  syncFormliyRef.current = SyncFormliy;

  // Dev-only: merge current form into FormilyList and persist via Vite plugin (skip field validation).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as Window & {
      __DEV_exportMediaLicenseMock?: () => Promise<Record<string, unknown>>;
    };
    w.__DEV_exportMediaLicenseMock = async () => {
      const list = await syncFormliyRef.current(true);
      if (!list || !Array.isArray(list)) {
        return { ok: false, error: "sync_failed" };
      }
      const code = useServicesStore.getState().userInfo.servicesCode;
      if (code == null) {
        return { ok: false, error: "missing_service_code" };
      }
      const res = await fetch("/__dev/save-formily-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceCode: code, payload: list }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      return { ok: res.ok, ...json };
    };
    return () => {
      delete w.__DEV_exportMediaLicenseMock;
    };
  }, []);

  const advanceCurrentStep = useCallback(async () => {
    if (stopForLifecycleActivityBlock()) {
      return false;
    }

    if (
      stopForModifyBaselineBlock({
        allowPending: canAdvanceToPendingProfileFormStep,
      })
    ) {
      return false;
    }

    if (currentStep != visibleFormilyList.length + 1 && currentFormInstance) {
      const updatedFormilyList = await SyncFormliy();
      if (!updatedFormilyList) return false;

      if (
        isPartnerManagementChangeMissing(
          ServicesStore.userInfo.servicesCode,
          updatedFormilyList as MediaLicenseFormStep[],
        )
      ) {
        CustomMessage.error(
          t("mediaLicensePage.partnerChangeRequired"),
        );
        return false;
      }

      if (currentStep === 1) {
        const serviceId = Number(ServicesStore.userInfo.servicesId || 0);
        if (!serviceId) {
          CustomMessage.error(
            t("mediaLicensePage.serviceInformationMissing"),
          );
          return false;
        }
      }

      const visibleIndex = currentStep - 1;
      const originalIndex = FormilyList.indexOf(visibleFormilyList[visibleIndex]);
      const nextVisible = getVisibleFormilyListWithLiveValues(
        updatedFormilyList,
        originalIndex >= 0 ? originalIndex : visibleIndex,
        currentFormInstance.values,
      );
      const isLastVisibleStep = currentStep >= nextVisible.length;

      if (isLastVisibleStep) {
        const mockServiceCode = ServicesStore.userInfo.servicesCode;
        if (
          import.meta.env.DEV &&
          import.meta.env.VITE_MOCK === "true" &&
          mockServiceCode != null
        ) {
          void (async () => {
            try {
              const saveRes = await fetch("/__dev/save-formily-mock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  serviceCode: mockServiceCode,
                  payload: updatedFormilyList,
                }),
              });
              const saveBody = await saveRes.json().catch(() => ({}));
              if (saveBody?.ok) {
                console.info(
                  `[dev] Saved formily mock: ${mockServiceCode}mock.json`,
                );
              } else {
                console.warn("[dev] Formily mock save failed:", saveBody);
              }
            } catch (err) {
              console.warn("[dev] Formily mock save error:", err);
            }
          })();
        }
        // Rule strategy validation
        try {
          if (currentServiceId === SERVICE_302) {
            const validationMessage = getService302ValidationMessage(
              updatedFormilyList as MediaLicenseFormStep[],
            );
            if (validationMessage) {
              CustomMessage.error(validationMessage);
              return false;
            }
          }

          if (activeRuleStrategyConfig) {
            const validationFormilyList = attachCurrentModifyReviewMetadata(
              updatedFormilyList,
            );
            const isValidationPassed = await runRuleStrategyValidation({
              activeRuleStrategyConfig,
              currentServiceId,
              serviceCode: ServicesStore.userInfo?.servicesCode,
              currentProfileId,
              userInfo,
              formilyList: validationFormilyList,
              submissionMode: "submit",
              licensePermitNo: permitLifecycleLicensePermitNo,
              mediaLicenseId: lifecycleMediaLicenseId,
            });

            if (!isValidationPassed) {
              return false;
            }
          }
        } catch (error) {
          console.error("Step 1 validation failed:", error);
          return false;
        }
      }
     

      // Persist: React state + zustand + submit payload
      unstable_batchedUpdates(() => {
        setFormilyList(updatedFormilyList);
        updateFormilyData(updatedFormilyList);
        btnFun();
        setCurrentStep(currentStep + 1);
        setFileList([]);
      });
      return true;
    } else {
      btnFun();
      setCurrentStep(currentStep + 1);
      return true;
    }
  }, [
    FormilyList,
    ServicesStore.userInfo.servicesCode,
    ServicesStore.userInfo.servicesId,
    SyncFormliy,
    activeRuleStrategyConfig,
    attachCurrentModifyReviewMetadata,
    btnFun,
    canAdvanceToPendingProfileFormStep,
    currentFormInstance,
    currentProfileId,
    currentServiceId,
    currentStep,
    getService302ValidationMessage,
    lifecycleMediaLicenseId,
    permitLifecycleLicensePermitNo,
    stopForLifecycleActivityBlock,
    stopForModifyBaselineBlock,
    t,
    userInfo,
    visibleFormilyList,
    updateFormilyData,
  ]);
  const handleNext = async () => {
    const didAdvance = await advanceCurrentStep();

    if (!didAdvance) {
      scrollToFirstValidationError();
    }
  };
  const handleAutoFillMockData = useCallback(() => {
    const serviceCode = Number(ServicesStore.userInfo.servicesCode || 0);

    if (!serviceCode) {
      CustomMessage.error(t("mediaLicensePage.serviceInformationMissing"));
      return;
    }

    const nextFormilyList = applyMockFormsListByServicesCode({
      formsList: FormilyList,
      servicesCode: serviceCode,
    }) as MediaLicenseFormStep[];

    if (nextFormilyList === FormilyList) {
      CustomMessage.error(t("mediaLicensePage.mockDataUnavailable"));
      return;
    }

    setFormilyList(nextFormilyList);
    updateFormilyData(nextFormilyList);

    const visibleStep = visibleFormilyList[currentStep - 1];
    const currentStepIndex = visibleStep
      ? FormilyList.indexOf(visibleStep)
      : currentStep - 1;
    const targetStep = nextFormilyList[currentStepIndex];
    const nextStepFormData = parseMediaLicenseStepFormData(targetStep);
    const nextStepValues =
      nextStepFormData?.formValues && typeof nextStepFormData.formValues === "object"
        ? (nextStepFormData.formValues as Record<string, unknown>)
        : EMPTY_FORM_VALUES;

    currentFormInstance?.setValues(nextStepValues);
    currentFormInstance?.reset();
    setLiveStepFormValues(nextStepValues);

    CustomMessage.success(t("mediaLicensePage.mockDataApplied"));
  }, [
    FormilyList,
    ServicesStore.userInfo.servicesCode,
    currentFormInstance,
    currentStep,
    t,
    updateFormilyData,
    visibleFormilyList,
  ]);
  const handleSelectProfile = (profileId: number, userTypeId: number) => {
    setCheckProfile({ profileId, userTypeId });
  };
  const handDraft = async () => {
    if (stopForLifecycleActivityBlock()) {
      return;
    }

    if (stopForModifyBaselineBlock()) {
      return;
    }

    if (activeFeeStrategyConfig && quoteLoading) {
      CustomMessage.warning(t("mediaLicensePage.feeCalculationPending"));
      return;
    }

    const isReviewStep = currentStep === visibleFormilyList.length + 1;
    const shouldAppendDraftDelivery =
      isExpressSupported && hasDeliveryInformationInput();

    setsavedraftstatus(true);

    try {
      const updatedFormilyList = isReviewStep
        ? FormilyList
        : await SyncFormliy(true);
      if (!updatedFormilyList) return;

      const draftFormilyList = shouldAppendDraftDelivery
        ? appendDeliveryInformationToFormilyList(
            updatedFormilyList as MediaLicenseFormStep[],
          )
        : updatedFormilyList;
      const normalizedDraftFormilyList = await normalizePublicationLanguageSubmission(
        draftFormilyList as MediaLicenseFormStep[],
      );
      const activityNormalizedDraftFormilyList =
        currentServiceId === 1801
          ? normalizeService1801IdSelectorFormilyList(
              normalizedDraftFormilyList,
            )
          : normalizedDraftFormilyList;
      const formilyDataWithModifyReviewMetadata =
        MODIFY_CHANGE_SUMMARY_SERVICE_CODES.has(
          String(ServicesStore.userInfo.servicesCode ?? ""),
        )
            ? attachModifyReviewMetadata(
              activityNormalizedDraftFormilyList,
              modifyOriginalFormilyList,
              modifyProfileBefore,
            )
          : activityNormalizedDraftFormilyList;
      const submissionFormilyData = sanitizeFormilyListForSubmission(
        formilyDataWithModifyReviewMetadata,
        { preserveDataListRowIds: true },
      );
      // Persist: React state + zustand + submit payload
      setFormilyList(activityNormalizedDraftFormilyList);
      updateFormilyData(activityNormalizedDraftFormilyList);
      const addApplicationEnginePayloads =
        await buildAddApplicationEnginePayloads(activityNormalizedDraftFormilyList, {
          submissionMode: "save",
          targetApplicationId: applicationId,
          targetApplicationNo: applicationNumber,
        });
      const addApplicationActivityPayload =
        buildAddApplicationActivityPayload(submissionFormilyData);
      const feeQuoteDraftSnapshot =
        !quoteError ? buildFeeQuoteDraftSnapshot(quoteData) : {};
      const savedApplication = await AddNewApplication({
        serviceId: ServicesStore.userInfo.servicesId!,
        ServiceCode: String(ServicesStore.userInfo.servicesCode || ""),
        ...addApplicationActivityPayload,
        formData: JSON.stringify(submissionFormilyData),
        type: servicesActions == "edit" && servicesStatus == "101" ? 2 : 3,
        ...buildApplicationIdPayload(applicationId),
        ...buildApplicationSourcePayload(),
        ...addApplicationEnginePayloads,
        ...feeQuoteDraftSnapshot,
        ...(userInfo?.isTestAccount === true ? { IsTest: true } : {}),
      });

      if (shouldAppendDraftDelivery) {
        const savedApplicationData = (savedApplication?.data || {}) as any;
        const savedApplicationId = Number(
          firstNullableId(savedApplicationData.id, applicationId),
        );
        const savedApplicationDetailId = Number(
          firstNullableId(
            savedApplicationData.applicationDetailId,
            savedApplicationData.detailId,
            savedApplicationData.id,
            applicationId,
          ),
        );

        if (!savedApplicationId || Number.isNaN(savedApplicationId)) {
          console.error("Unable to resolve application id for draft delivery.");
        } else {
          await persistDeliveryInformation(
            savedApplicationId,
            buildCardPaymentApplicationDetail(
              savedApplicationId,
              savedApplicationData.applicationNumber || applicationNumber || null,
              !Number.isNaN(savedApplicationDetailId) &&
                savedApplicationDetailId > 0
                ? savedApplicationDetailId
                : null,
            ),
            { blockOnFailure: false },
          );
        }
      }

      CustomMessage.success(t("mediaLicensePage.draftSaved"));
      history.push(`/my-requests`);
    } catch (error) {
      console.error("Failed to save draft:", error);
      const publicationLanguageKey =
        getPublicationLanguageValidationKey(error);
      if (publicationLanguageKey) {
        scrollToFirstValidationError();
      }
      CustomMessage.error(
        publicationLanguageKey
          ? t(publicationLanguageKey)
          : t("mediaLicensePage.draftSaveFailed"),
      );
    } finally {
      setsavedraftstatus(false);
    }
  };

  useEffect(() => {
    if (selectedActivities.length == 0) {
      setTotalAmount(0);
    }
  }, [selectedActivities]);
  // Review page fee calculation
  useEffect(() => {
    const isReviewStep = currentStep === visibleFormilyList.length + 1;
    if (!isReviewStep) {
      skipReviewFeeQuoteRef.current = false;
    }
    if (
      isReviewStep &&
      !skipReviewFeeQuoteRef.current &&
      !addapplicationstatus &&
      activeFeeStrategyConfig &&
      !isModifyBaselineBlocking &&
      FormilyList.length
    ) {
      void requestFeeQuote(
        attachCurrentModifyReviewMetadata(FormilyList),
        {
          quoteKey: openedFormFeeKeyRef.current || undefined,
        },
      );
    }
  }, [
    addapplicationstatus,
    FormilyList,
    visibleFormilyList.length,
    activeFeeStrategyConfig,
    attachCurrentModifyReviewMetadata,
    applicationId,
    applicationNumber,
    currentProfileId,
    currentStep,
    isModifyBaselineBlocking,
    requestFeeQuote,
    userInfo,
  ]);
  useEffect(() => {
    const isReviewStep = currentStep === visibleFormilyList.length + 1;

    if (
      isReviewStep &&
      !addapplicationstatus &&
      isPenaltyEnabledLifecycleService &&
      lifecycleActivityContext?.penaltyFor
    ) {
      void requestPenaltyPreview();
    } else if (
      !isReviewStep ||
      !isPenaltyEnabledLifecycleService ||
      !lifecycleActivityContext?.penaltyFor
    ) {
      resetPenaltyPreview();
    }
  }, [
    addapplicationstatus,
    currentStep,
    isPenaltyEnabledLifecycleService,
    lifecycleActivityContext?.penaltyFor,
    requestPenaltyPreview,
    resetPenaltyPreview,
    visibleFormilyList.length,
  ]);
  useEffect(() => {
    if (!activeFeeStrategyConfig) {
      return;
    }

    const isReviewStep = currentStep === visibleFormilyList.length + 1;
    const nextTotalAmount =
      serviceFeeTotalAmount +
      (isReviewStep ? penaltyTotalAmount : 0);

    setTotalAmount(nextTotalAmount);
  }, [
    activeFeeStrategyConfig,
    currentStep,
    penaltyTotalAmount,
    serviceFeeTotalAmount,
    setTotalAmount,
    visibleFormilyList.length,
  ]);

  const handleSubmit = async () => {
    if (isCurrentModifyFeeQuotePending) {
      CustomMessage.warning(t("mediaLicensePage.feeCalculationPending"));
      return;
    }

    if (stopForLifecycleActivityBlock()) {
      return;
    }

    if (stopForModifyBaselineBlock()) {
      return;
    }

    if (!choosestatus) {
      return;
    }

    if (!validateDeliveryInformation()) {
      CustomMessage.error(t("mediaLicensePage.deliveryRequired"));
      return;
    }

    skipReviewFeeQuoteRef.current = true;
    setaddapplicationstatus(true);
    try {
      const resultTypes: ResultType[] = [
        "submission-successful",
        "under-review",
        "permit-issued",
        "permit-expired-grace",
        "permit-expired-penalty",
      ];

      const mockResult = resultTypes[0];

      const preparedApplication = await prepareReviewApplication({
        onMissingApplicationMessage:
          t("mediaLicensePage.submissionFailed"),
      });

      if (!preparedApplication) {
        return;
      }

      if (showDeliveryInformationCard) {
        const deliverySaved = await persistDeliveryInformation(
          preparedApplication.applicationId,
          preparedApplication.applicationDetail,
        );

        if (!deliverySaved) {
          return;
        }
      }

      setSubmissionResult(mockResult);
    } catch (error) {
      console.error("Submission failed:", error);
      const publicationLanguageKey =
        getPublicationLanguageValidationKey(error);
      if (publicationLanguageKey) {
        scrollToFirstValidationError();
      }
      CustomMessage.error(
        publicationLanguageKey
          ? t(publicationLanguageKey)
          : t("mediaLicensePage.submissionFailed"),
      );
    } finally {
      setaddapplicationstatus(false);
    }
  };
  // Change now Profile
  const changeProfile = async () => {
    console.log("changeProfile", checkProfile);
    if (!checkProfile || !checkProfile.profileId || !checkProfile.userTypeId)
      return;
    let keepProfileSwitchSession = false;
    const switchSession = startProfileSwitchSession({
      source: "MediaLicense",
      userId: userInfo.id,
      fromProfileId: currentProfileId,
      toProfileId: String(checkProfile.profileId),
      toUserTypeId: String(checkProfile.userTypeId),
      route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    if (!switchSession) {
      return;
    }
    try {
      const res = await userChangeIdentity({
        userProFileID: checkProfile.profileId,
        userTypeID: checkProfile.userTypeId,
      });
      const changeIdentityData = res.data as { token?: string };
      const token = String(changeIdentityData.token || "").trim();

      if (!token) {
        throw new Error("ChangeIdentity did not return a token");
      }

      keepProfileSwitchSession = true;
      completeIdentitySwitch({
        token,
        userProfileId: checkProfile.profileId,
        userTypeId: checkProfile.userTypeId,
        sessionId: switchSession.sessionId,
      });
    } catch (error) {
      console.error("changeProfile", error);
      CustomMessage.error(t("common.requestFailed"));
    } finally {
      if (!keepProfileSwitchSession) {
        finishProfileSwitchSession("failed", {
          source: "MediaLicense",
          toProfileId: checkProfile.profileId,
          toUserTypeId: checkProfile.userTypeId,
        }, switchSession.sessionId);
      }
    }
  };
  const handleViewDetails = () => {
    const detailApplicationId =
      finalId || String(activeCardPaymentDetail?.applicationId || "");

    if (!detailApplicationId) {
      return;
    }

    history.push(`/my-requests/detail?id=${detailApplicationId}`);
  };

  const submitMediaLicenseRating = useCallback(
    async (rating: number, ticketNo?: string | null) => {
      const normalizedTicketNo = String(ticketNo || "").trim();

      if (!rating || !normalizedTicketNo) {
        CustomMessage.error(t("complaintsPage.addModal.commentFailed"));
        return false;
      }

      try {
        await postUserServiceRating({
          rating,
          referenceNo: normalizedTicketNo,
          isAnonymous: true,
          sourcePage: "MediaLicense",
        });
        CustomMessage.success(t("complaintsPage.addModal.commentSuccess"));
        return true;
      } catch {
        CustomMessage.error(t("complaintsPage.addModal.commentFailed"));
        return false;
      }
    },
    [t],
  );

  const cardPaymentResultNumber =
    cardPaymentDocumentNumber ||
    activeCardPaymentDetail?.applicationNumber ||
    applicationNumber;

  // Ratings are keyed by the unambiguous ApplicationId (stored into ReferenceNo), not the
  // ApplicationNumber which is shared across New/Renew/Cancel siblings after lifecycle unification.
  const cardPaymentResultApplicationId =
    activeCardPaymentDetail?.applicationId ?? applicationId;

  const handleCardPaymentSubmitRating = useCallback(
    (rating: number) =>
      submitMediaLicenseRating(
        rating,
        cardPaymentResultApplicationId != null
          ? String(cardPaymentResultApplicationId)
          : null,
      ),
    [cardPaymentResultApplicationId, submitMediaLicenseRating],
  );

  const handleSubmissionResultSubmitRating = useCallback(
    (rating: number) =>
      submitMediaLicenseRating(
        rating,
        applicationId != null ? String(applicationId) : null,
      ),
    [applicationId, submitMediaLicenseRating],
  );

  if (cardPaymentStatus === "success") {
    return (
      <SubmissionResult
        type="submission-successful"
        applicationNumber={cardPaymentResultNumber}
        licenseNumber={cardPaymentResultNumber}
        expiryDate="15-10-2025"
        graceDays={15}
        onBack={() => history.goBack()}
        onViewDetails={handleViewDetails}
        onSubmitRating={handleCardPaymentSubmitRating}
      />
    );
  }

  if (cardPaymentStatus === "failed" || cardPaymentStatus === "cancelled") {
    return (
      <CardPaymentFailurePage
        status={cardPaymentStatus}
        message={cardPaymentResultMessage}
        details={cardPaymentFailureDetails}
        onPrimaryAction={handleCardPaymentTryAgain}
        onSecondaryAction={handleCardPaymentUseDifferentMethod}
      />
    );
  }

  // Show result page if submission is complete
  if (submissionResult) {
    return (
      <SubmissionResult
        type={submissionResult}
        applicationNumber={applicationNumber}
        licenseNumber={applicationNumber}
        expiryDate="15-10-2025"
        graceDays={15}
        onBack={handleBack}
        onViewDetails={handleViewDetails}
        onSubmitRating={handleSubmissionResultSubmitRating}
      />
    );
  }

  const showReviewFeeAndPenaltySection =
    currentStep === visibleFormilyList.length + 1 &&
    shouldRenderFeeAndPenaltySection({
      quoteLoading,
      quoteError,
      quoteData,
      penaltyLoading,
      penaltyError,
      penaltyTotalAmount,
      isPenaltyContextMissing,
    });

  return (
    <div ref={mediaLicenseContainerRef} className="media-license-container">
      {ShowSpin ? (
        <Spin className="media-license-spin" />
      ) : (
        <div className="media-license-content">
          <div className="left-section">
            {showServiceEntryGateCard ? (
              <div className="service-entry-gate-page-card">
                {showApplicantModeSelector ? (
                  <ApplicantProfileModeSelector
                    title={gateT(
                      "serviceEntryGate.selectors.applicantMode.title",
                      "Apply for Services Using Individual or Establishment Profile?",
                    )}
                    required
                    value={displayApplicantMode}
                    options={applicantModeOptions}
                    onChange={handleApplicantModeChange}
                  />
                ) : null}
                {showRelatedEstablishmentSelector ? (
                  <RelatedEstablishmentSelector
                    title={gateT(
                      "serviceEntryGate.selectors.relatedEstablishment.title",
                      "Apply for Services Through a Related Establishment",
                    )}
                    description={gateT(
                      "serviceEntryGate.selectors.relatedEstablishment.description",
                      "Select the establishment profile that should be used for this application.",
                    )}
                    required
                    value={relatedEstablishmentProfileId}
                    placeholder={t("formPlaceholders.common.select")}
                    searchPlaceholder={t("formPlaceholders.common.search")}
                    dropdownTitle={t(
                      "serviceEntryGate.selectors.relatedEstablishment.title",
                    )}
                    addProfileLabel={t(
                      "serviceEntryGate.actions.addEstablishmentProfile",
                    )}
                    options={establishmentSelectorOptions}
                    onChange={handleRelatedEstablishmentChange}
                    onAddProfile={handleAddRelatedEstablishmentProfile}
                  />
                ) : null}
                {gatePageBlocker ? (
                  <div
                    className={`service-entry-gate-page-blocker service-entry-gate-page-blocker--${gatePageBlocker.variant}`}
                  >
                    <div className="service-entry-gate-page-blocker__header">
                      <div className="service-entry-gate-dialog__icon service-entry-gate-dialog__icon--warning">
                        {renderGateDialogIcon("warning")}
                      </div>
                      <div className="service-entry-gate-dialog__copy-block service-entry-gate-dialog__copy-block--message">
                        <h3 className="service-entry-gate-dialog__title">
                          {gatePageBlocker.title}
                        </h3>
                        <p className="service-entry-gate-dialog__description">
                          {gatePageBlocker.description}
                        </p>
                      </div>
                    </div>
                    {gatePageBlocker.bulletItems?.length ? (
                      <ul className="service-entry-gate-dialog__bullet-list">
                        {gatePageBlocker.bulletItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                    {gatePageBlocker.helperText ? (
                      <div className="service-entry-gate-dialog__helper">
                        {gatePageBlocker.helperText}
                      </div>
                    ) : null}
                    {gatePageBlocker.actions.length ? (
                      <div className="service-entry-gate-page-blocker__actions">
                        {gatePageBlocker.actions.map((action) => (
                          <CustomButton
                            key={action.key}
                            variant={action.variant}
                            size="large"
                            onClick={() => {
                              void handleGatePageAction(action.key);
                            }}
                          >
                            {action.label}
                          </CustomButton>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {hasUnlockedApplicationForm &&
              statusEn?.statusEn === "Pending Modification" &&
              servicesActions != "Duplicate" && (
                <RequestModification
                  RequestDetail={statusEn}
                  className="request-media-license"
                />
              )}
            {hasUnlockedApplicationForm ? (
              currentStep != visibleFormilyList.length + 1 || currentStep == 1 ? (
              <>
                {modifyBaselineLoadFailed ? (
                  <div className="review-card1">
                    <div className="declaration-section">
                      <AlertBanner
                        type="warning"
                        content={t(
                          "mediaLicensePage.modifyBaselineLoadFailed",
                        )}
                      />
                      <div style={{ marginTop: 16 }}>
                        <CustomButton onClick={() => window.location.reload()}>
                          {t("mediaLicensePage.retry")}
                        </CustomButton>
                      </div>
                    </div>
                  </div>
                ) : shouldUseLifecycleActivityContext &&
                  lifecycleActivityError &&
                  currentStep === 1 ? (
                  <div className="review-card1">
                    <div className="declaration-section">
                      <h2 className="review-title">
                        {t("mediaLicensePage.currentActivities")}
                      </h2>
                      <AlertBanner
                        type="warning"
                        content={lifecycleActivityError}
                      />
                      <div style={{ marginTop: 16 }}>
                        <CustomButton onClick={handleRetryLifecycleActivities}>
                          {t("mediaLicensePage.retry")}
                        </CustomButton>
                      </div>
                    </div>
                  </div>
                ) : (
                  <FormliyView
                    key={`form-step-${currentStep}`}
                    setFormInstance={setCurrentFormInstance}
                    // Pass stored data if needed, e.g. from zustand or local state
                    formData={visibleFormilyList[currentStep - 1] || {}}
                    onValuesChange={handleFormValuesChange}
                    onUploadComplete={handleUploadComplete}
                    onTotalFeeChange={handleTotalFeeChange}
                    onSelectTableOptionsChange={handleSelectTableOptionsChange}
                    onTotalFeeFloat={handleTotalFeeChange}
                    serviceCode={ServicesStore.userInfo.servicesCode}
                    publicationNameCheckExclusions={
                      publicationNameCheckExclusions
                    }
                    establishmentId={currentEstablishmentId}
                    artistWorkTypeOptions={artistWorkTypeOptions}
                    artistWorkTypeOptionsLoading={artistWorkTypeOptionsLoading}
                    serviceMaterialTypeId={serviceMaterialTypeId}
                    service905OwnerPartners={partnerManagementOwnerPartners}
                    profileInfo={profileFormSource}
                    profileLoaded={profileInfoLoaded}
                    profileContextKey={String(currentProfileId || "")}
                    mobileNumberRuntimeConfig={dynamicMobileNumberRuntimeConfig}
                    onProfileSourceResolved={setResolvedProfileFormSource}
                    onProfileSourceResolutionError={
                      isModifyProfileBaselinePending
                        ? handleProfileSourceResolutionError
                        : undefined
                    }
                    idSelectorRuntimeType={idSelectorRuntimeType}
                  />
                )}
              </>
            ) : (
              <div className="review-card">
                {shouldUsePaymentFirstReviewState ? (
                  <div className="declaration-section">
                    <h2 className="review-title">
                      {t("mediaLicensePage.awaitingPayment")}
                    </h2>

                    <AlertBanner
                      type="warning"
                      content={t("mediaLicensePage.paymentDeadlineWarning", {
                        paymentTimeline,
                      })}
                    />
                  </div>
                ) : (
                  <div className="declaration-section">
                    <h2 className="review-title">
                      {t("mediaLicensePage.reviewYourApplication")}
                    </h2>

                    <AlertBanner
                      type="warning"
                      content={t("mediaLicensePage.reviewCarefullyWarning")}
                    />
                  </div>
                )}

                <div className="review-sections">
                  <ModifyChangeSummary
                    sections={modifyChangeSections}
                    languageSnapshots={modifyLanguageSnapshots}
                    serviceCode={ServicesStore.userInfo.servicesCode}
                  />
                  <FormilyReviewList
                    formilyList={visibleFormilyList}
                    formilyData={visibleFormilyList}
                    isSelectable={false}
                    hideBookListStatusColumn
                    serviceCode={
                      ServicesStore.userInfo.servicesCode ||
                      String(ServicesStore.userInfo.servicesId || "")
                    }
                    idSelectorRuntimeType={idSelectorRuntimeType}
                  />
                  {showReviewFeeAndPenaltySection && (
                    <FeeQuoteDisplay
                      quoteData={quoteData}
                      quoteLoading={quoteLoading}
                      quoteError={quoteError}
                    />
                  )}
                  {accountType ? (
                    <ReviewPersonalInformation
                      ProfileInfoIndex={ProfileInfoIndex}
                      expanded={profileInfoExpanded}
                      onToggle={() =>
                        setProfileInfoExpanded(!profileInfoExpanded)
                      }
                    />
                  ) : (
                    <ReviewProfileInfo
                      ProfileInfoIndex={ProfileInfoIndex}
                      expanded={profileInfoExpanded}
                      onToggle={() =>
                        setProfileInfoExpanded(!profileInfoExpanded)
                      }
                    />
                  )}
                  {showReviewFeeAndPenaltySection && (
                    <PenaltyDisplay
                      penaltyData={penaltyData}
                      penaltyLoading={penaltyLoading}
                      penaltyError={penaltyError}
                      missingPenaltyContext={isPenaltyContextMissing}
                    />
                  )}
                  <div ref={reviewDeclarationRef}>
                    <ReviewDeclaration
                      onChoose={handleDeclarationChoose}
                      showRequiredError={showDeclarationError}
                    />
                  </div>
                </div>
              </div>
            )
            ) : null}
          </div>

          <div className="right-section">
            {showDeliveryInformationCard && hasUnlockedApplicationForm ? (
            <DeliveryInformation
              values={deliveryInformationValues}
              errors={deliveryInformationErrors}
              emirates={deliveryEmirates}
              regions={deliveryRegions}
              areas={deliveryAreas}
              courierOptions={deliveryCourierOptions}
              loadingAddress={deliveryAddressLoading}
              loadingCourierOptions={deliveryCourierLoading}
              onFieldChange={handleDeliveryInformationFieldChange}
            />
            ) : (
              <ApplicationProgress
                currentStep={currentStep}
                steps={currentSteps}
              />
            )}
            <ServiceDetails
              TotalAmount={serviceDetailsTotalAmount}
              fullDescription={formDeatils}
              ProcessTime={serviceDeliveryTime}
              moreMode="link"
              serviceId={serviceDetailsServiceId || undefined}
              PaymentTimeline={paymentTimeline}
            />
          </div>

          {hasUnlockedApplicationForm ? (
            <ActionFooter
              onBack={handleBack}
              overflowActions={
                shouldShowTestEnvAutoFill ? (
                  <CustomButton
                    customClassName="media-license-container-save"
                    variant="outline"
                    onClick={handleAutoFillMockData}
                  >
                    {t("mediaLicensePage.autoFillTestData")}
                  </CustomButton>
                ) : undefined
              }
              actions={
                <div className="action-buttons">
                  <CustomButton
                    customClassName="media-license-container-save"
                    variant="outline"
                    loading={savedraftstatus}
                    disabled={
                      isLifecycleActivityBlocking ||
                      isModifyBaselineBlocking ||
                      (activeFeeStrategyConfig && quoteLoading) ||
                      (Department == 1 && !canUseDraftActions)
                    }
                    onClick={() => {
                      handDraft();
                    }}
                  >
                    {t("mediaLicensePage.saveDraft")}
                  </CustomButton>
                  {currentStep != visibleFormilyList.length + 1 ? (
                    <>
                      <CustomButton
                        disabled={
                          isLifecycleActivityBlocking ||
                          isNextModifyBaselineBlocking
                        }
                        aria-disabled={isNextValidationPending}
                        customClassName={
                          isNextValidationPending
                            ? "media-license-container__action--validation-pending"
                            : ""
                        }
                        onClick={handleNext}
                      >
                        {t("mediaLicensePage.next")}
                      </CustomButton>
                    </>
                  ) : (
                    <>
                      {shouldUsePaymentFirstReviewState ? (
                        <CustomButton
                          disabled={
                            isLifecycleActivityBlocking ||
                            isModifyBaselineBlocking ||
                            isCurrentModifyFeeQuotePending ||
                            cardPaymentLoading ||
                            addapplicationstatus
                          }
                          aria-disabled={!choosestatus}
                          customClassName={
                            !choosestatus
                              ? "media-license-container__action--validation-pending"
                              : ""
                          }
                          loading={cardPaymentLoading || addapplicationstatus}
                          text={t("mediaLicensePage.payNow")}
                          variant="primary"
                          onClick={() => {
                            if (validateReviewDeclaration()) {
                              void handlePayNow();
                            }
                          }}
                        />
                      ) : (
                        <CustomButton
                          loading={addapplicationstatus}
                          disabled={
                            isLifecycleActivityBlocking ||
                            isModifyBaselineBlocking ||
                            isCurrentModifyFeeQuotePending ||
                            addapplicationstatus ||
                            Boolean(quoteError)
                          }
                          aria-disabled={!choosestatus}
                          customClassName={
                            !choosestatus
                              ? "media-license-container__action--validation-pending"
                              : ""
                          }
                          onClick={() => {
                            if (validateReviewDeclaration()) {
                              void handleSubmit();
                            }
                          }}
                        >
                          {t("mediaLicensePage.apply")}
                        </CustomButton>
                      )}
                    </>
                  )}
                </div>
              }
            ></ActionFooter>
          ) : null}
        </div>
      )}
      {/* profile-check */}
      {/* <div className="profile-check">
        <Form layout="vertical" className="custorm-form">
          <Row>
            <Col span={8}>
              <Form.Item required  label="Apply for Services Using Individual or Establishment Profile?">
                <Radio.Group
                  options={[
                    { value: 1, label: 'Individual' },
                    { value: 2, label: 'Establishment' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label="Apply for Services Through a Related Establishment"
                required
              >
                <Select
                  onChange={() => {}}
                  options={[
                    { value: '1', label: <span>Option 1</span> },
                    { value: '2', label: <span>Option 2</span> }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div> */}

      <WarningModal
        visible={warningModal.visible}
        close={() => setWarningModal({ ...warningModal, visible: false })}
        content={warningModal.content}
        title={warningModal.title}
        needCancel={warningModal.needCancel}
        needConfirm={warningModal.needConfirm}
        cancelText={warningModal.cancelText}
        confirmText={warningModal.confirmText}
        onConfirm={warningModal.onConfirm}
        onCancel={warningModal.onCancel}
        supportService={warningModal.supportService}
        ownedProfile={warningModal.ownedProfile}
        hangdleSelectProfile={handleSelectProfile}
      />
      <PaymentMethodSelectionModal
        visible={paymentMethodModalVisible}
        onCancel={handlePaymentMethodModalClose}
        onProceed={handlePaymentMethodProceed}
        totalAmount={paymentAmount}
        items={[{
          title: paymentServiceName,
          reference: activeCardPaymentDetail?.applicationNumber ?? applicationNumber ?? "",
          amount: paymentAmount,
        }]}
      />
      <CardPaymentProgressModal
        visible={
          cardPaymentVisible &&
          (cardPaymentStatus === "redirecting" ||
            cardPaymentStatus === "processing")
        }
        amount={paymentAmount}
        confirmLoading={cardPaymentConfirmLoading}
        cancelLoading={cardPaymentCancelLoading}
        onClose={handleCardPaymentProgressClose}
        onConfirmCompleted={handleCardPaymentConfirmCompleted}
      />
      {dialogNode}
    </div>
  );
}
