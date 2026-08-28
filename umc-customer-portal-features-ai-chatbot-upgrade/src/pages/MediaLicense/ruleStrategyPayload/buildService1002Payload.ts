import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1002RuleStrategyValidatePayload } from "@/services/services";
import { getArtistWorkTypesByServiceCode, getLanguages, getLookupData } from "@/services/services";
import { getNationalityList } from "@/services/userProfile";
import get from "lodash/get";
import {
  resolveEstablishmentId,
  type BuildServiceRuleStrategyPayloadParams,
} from "../ruleStrategyPayloadShared";
import {
  coerceBoolean,
  coerceString,
  findLanguageId,
  findLookupId,
  getFirstDefined,
  resolveDurationInMinutes,
  resolveSelectTableValue,
  resolveSelectedIds,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveCountryId,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const CINEMA_PERMIT_TYPE_ID = 1;
const MEDIA_MATERIAL_TYPE_ID = 1;
const TICKET_ACTIVITY_IDS = new Set([2065]);

export const buildService1002Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1002RuleStrategyValidatePayload> => {
  const selectTable = resolveSelectTableValue(formValuesList);
  const selectedActivityIds = resolveSelectedIds(selectTable);
  const screeningFormValue = formValuesList
    .map((formValues) =>
      getFirstDefined([get(formValues, "FilmScreeningForm"), get(formValues, "Film Screening Form")]),
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
    screeningFormValue,
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
      mediaMaterialTypeId: MEDIA_MATERIAL_TYPE_ID,
      ageRatingPermitId:
        getFirstDefined([
          get(screeningFormValue, "ageRatingPermitId"),
          get(screeningFormValue, "selectedAgeRatingPermitId"),
          get(screeningFormValue, "ageRatingPermit"),
        ]) as string | number | undefined,
      title: coerceString(get(screeningFormValue, "title")),
      artistWorkTypeId: findLookupId(artistWorkTypes, get(screeningFormValue, "type")),
      languageId: findLanguageId(languageOptions, get(screeningFormValue, "language")),
      durationInMinutes: resolveDurationInMinutes(
        get(screeningFormValue, "durationInMinutes"),
      ),
      sourceCountryId: resolveCountryId(get(screeningFormValue, "source"), nationalityList),
      copyrightsTypeId: findLookupId(
        copyrightsTypes,
        get(screeningFormValue, "copyrightsType"),
      ),
      copyrightStartDate: coerceString(copyrightRange?.[0]),
      copyrightEndDate: coerceString(copyrightRange?.[1]),
      copyrightFileUrl: resolveUploadUrl(get(screeningFormValue, "economyCertificate")),
      isTicketed:
        coerceBoolean(get(screeningFormValue, "isTicketed")) ??
        selectedActivityIds.some(
          (item) => typeof item === "number" && TICKET_ACTIVITY_IDS.has(item),
        ),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
