import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1003RuleStrategyValidatePayload } from "@/services/services";
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
  resolveDateRange,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveCountryId,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const MEDIA_MATERIAL_TYPE_ID = 2;

export const buildService1003Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1003RuleStrategyValidatePayload> => {
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
  const permitRange = resolveDateRange(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "CopyrightsValidityPeriod"),
        get(formValues, "rc97dvotjp7"),
      ]),
    ),
  );

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
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "Title"),
            get(formValues, "iptimse45m7"),
          ]),
        ),
      ),
      artistWorkTypeId: findLookupId(
        artistWorkTypes,
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "ArtistWorkType"),
            get(formValues, "j2hz4fb6y9l"),
          ]),
        ),
      ),
      languageId: findLanguageId(
        languageOptions,
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "Language")])),
      ),
      countryId: resolveCountryId(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "Source"),
            get(formValues, "fohql7srxm1"),
          ]),
        ),
        nationalityList,
      ),
      copyrightsTypeId: findLookupId(
        copyrightsTypes,
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "CopyrightsType")])),
      ),
      permitStartDate: permitRange.startDate,
      permitEndDate: permitRange.endDate,
      copyrightCertificateFileUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "MinistryOfEconomyRegistrationCertificate"),
            get(formValues, "v3fc4lvdg5i"),
          ]),
        ),
      ),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
