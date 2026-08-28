import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1008RuleStrategyValidatePayload } from "@/services/services";
import { getArtistWorkTypesByServiceCode, getLanguages, getLookupData } from "@/services/services";
import { getNationalityList } from "@/services/userProfile";
import get from "lodash/get";
import {
  resolveEstablishmentId,
  type BuildServiceRuleStrategyPayloadParams,
} from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  coerceString,
  findLanguageId,
  findLookupId,
  getFirstDefined,
  resolveDurationInMinutes,
  resolveArtistWorkTypeMaterialTypeId,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveCountryId,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const CINEMA_PERMIT_TYPE_ID = 2;

export const buildService1008Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1008RuleStrategyValidatePayload> => {
  const artistWorkTypeMaterialTypeId = resolveArtistWorkTypeMaterialTypeId(
    formValuesList,
    1,
  );
  const rescreenFormValue = formValuesList
    .map((formValues) =>
      getFirstDefined([
        get(formValues, "FilmRe-screeningForm"),
        get(formValues, "Film Re-screening Form"),
        get(formValues, "FilmRescreeningForm"),
      ]),
    )
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;

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
  const copyrightRange = get(
    rescreenFormValue,
    "copyrightsValidityPeriod",
  ) as unknown[] | undefined;
  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      cinemaPermitTypeId: CINEMA_PERMIT_TYPE_ID,
      selectedFilmId:
        getFirstDefined([
          get(rescreenFormValue, "selectedFilmId"),
          get(rescreenFormValue, "filmId"),
          get(rescreenFormValue, "title"),
        ]) as string | number | undefined,
      selectedFilmTitle: coerceString(get(rescreenFormValue, "title")),
      selectedFilmPermitNumber: coerceString(get(rescreenFormValue, "permitNumber")),
      mediaMaterialTypeId:
        coerceNumber(get(rescreenFormValue, "mediaMaterialTypeId")) ??
        coerceNumber(get(rescreenFormValue, "mediaMaterialType")) ??
        artistWorkTypeMaterialTypeId,
      artistWorkTypeId: findLookupId(artistWorkTypes, get(rescreenFormValue, "type")),
      languageId: findLanguageId(languageOptions, get(rescreenFormValue, "language")),
      durationInMinutes: resolveDurationInMinutes(
        get(rescreenFormValue, "durationInMinutes"),
      ),
      sourceCountryId: resolveCountryId(get(rescreenFormValue, "source"), nationalityList),
      copyrightsTypeId: findLookupId(
        copyrightsTypes,
        get(rescreenFormValue, "copyrightsType"),
      ),
      copyrightStartDate: coerceString(copyrightRange?.[0]),
      copyrightEndDate: coerceString(copyrightRange?.[1]),
      copyrightFileUrl: resolveUploadUrl(get(rescreenFormValue, "economyCertificate")),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
