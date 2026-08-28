import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1004RuleStrategyValidatePayload } from "@/services/services";
import { getArtistWorkTypesByServiceCode, getLanguages, getLookupData } from "@/services/services";
import { getNationalityList } from "@/services/userProfile";
import get from "lodash/get";
import {
  resolveEstablishmentId,
  type BuildServiceRuleStrategyPayloadParams,
} from "../ruleStrategyPayloadShared";
import {
  coerceString,
  findLanguageId,
  findLookupId,
  getFirstDefined,
  resolveArtistWorkTypeMaterialTypeId,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveCountryId,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const MEDIA_MATERIAL_TYPE_ID = 3;

export const buildService1004Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1004RuleStrategyValidatePayload> => {
  const artistWorkTypeMaterialTypeId =
    resolveArtistWorkTypeMaterialTypeId(
      formValuesList,
      MEDIA_MATERIAL_TYPE_ID,
    ) ?? MEDIA_MATERIAL_TYPE_ID;
  const [languagesResponse, nationalitiesResponse, artistWorkTypesResponse, copyrightsResponse] =
    await Promise.all([
      getLanguages(),
      getNationalityList(),
      getArtistWorkTypesByServiceCode(serviceCode),
      getLookupData("CopyrightsTypes", config.serviceId),
    ]);

  const languageOptions = unwrapResponseRows(languagesResponse) as LanguageOption[];
  const nationalityList = nationalitiesResponse.data ?? [];
  const artistWorkTypes = unwrapResponseRows(artistWorkTypesResponse);
  const copyrightsTypes = unwrapResponseRows(copyrightsResponse);
  const permitRange = getFirstDefined(
    formValuesList.flatMap((formValues) => [get(formValues, "CopyrightsValidityPeriod")]),
  ) as unknown[] | undefined;

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      mediaMaterialTypeId: artistWorkTypeMaterialTypeId,
      title: coerceString(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "Title")])),
      ),
      artistWorkTypeId: findLookupId(
        artistWorkTypes,
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "ArtistWorkType")])),
      ),
      languageId: findLanguageId(
        languageOptions,
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "Language")])),
      ),
      countryId: resolveCountryId(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "Source")])),
        nationalityList,
      ),
      copyrightsTypeId: findLookupId(
        copyrightsTypes,
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "CopyrightsType")])),
      ),
      permitStartDate: coerceString(permitRange?.[0]),
      permitEndDate: coerceString(permitRange?.[1]),
      copyrightCertificateFileUrl: resolveUploadUrl(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "MinistryOfEconomyRegistrationCertificate")])),
      ),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
