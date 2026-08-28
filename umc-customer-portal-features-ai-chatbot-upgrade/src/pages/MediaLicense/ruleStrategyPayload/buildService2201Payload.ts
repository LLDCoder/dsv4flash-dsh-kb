import { nowGst, toApi } from "@/utils/gstTime";
import type { Service2201RuleStrategyValidatePayload } from "@/services/services";
import { getArtistWorkTypesByServiceCode, getLanguages, getLookupData } from "@/services/services";
import get from "lodash/get";
import type { BuildServiceRuleStrategyPayloadParams,  } from "../ruleStrategyPayloadShared";
import  { resolveEstablishmentId } from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  coerceString,
  findLanguageId,
  findLookupId,
  getFirstDefined,
  resolveDurationInMinutes,
  resolveTermsAgreed,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const TYPE_ID = 1;
const MEDIA_MATERIAL_TYPE_CODE = "01";

export const buildService2201Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  serviceCode,
  submissionMode = "submit",
  userInfo,
}: BuildServiceRuleStrategyPayloadParams): Promise<Service2201RuleStrategyValidatePayload> => {
  const filmTrailerForm = formValuesList
    .map((formValues) =>
      getFirstDefined([get(formValues, "FilmTrailerForm"), get(formValues, "Film Trailer Form")]),
    )
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;

  const [languagesResponse, artistWorkTypesResponse, copyrightsResponse] =
    await Promise.all([
      getLanguages(),
      getArtistWorkTypesByServiceCode(serviceCode),
      getLookupData("CopyrightsTypes", config.serviceId),
    ]);

  const languageOptions = unwrapResponseRows(languagesResponse) as LanguageOption[];
  const artistWorkTypes = unwrapResponseRows(artistWorkTypesResponse);
  const copyrightsTypes = unwrapResponseRows(copyrightsResponse);
  const originCountry = get(filmTrailerForm, "originCountry");
  const permitRange = getFirstDefined([
    get(filmTrailerForm, "permitValidityPeriod"),
    get(filmTrailerForm, "PermitValidityPeriod"),
    get(filmTrailerForm, "copyrightsValidityPeriod"),
  ]) as unknown[] | undefined;

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      typeId: TYPE_ID,
      mediaMaterialTypeCode: MEDIA_MATERIAL_TYPE_CODE,
      posterTrailerPermitId: getFirstDefined([
        get(filmTrailerForm, "posterTrailerPermit"),
        get(filmTrailerForm, "posterTrailerPermitId"),
      ]) as number | string | undefined,
      title: coerceString(get(filmTrailerForm, "title")),
      artistWorkTypeId: findLookupId(
        artistWorkTypes,
        getFirstDefined([get(filmTrailerForm, "type"), get(filmTrailerForm, "category")]),
      ),
      languageId: findLanguageId(
        languageOptions,
        getFirstDefined([get(filmTrailerForm, "language"), get(filmTrailerForm, "languages")]),
      ),
      countryId: coerceNumber(originCountry) ?? coerceString(originCountry),
      copyrightsTypeId: findLookupId(copyrightsTypes, get(filmTrailerForm, "copyrightsType")),
      permitStartDate: coerceString(permitRange?.[0]),
      permitEndDate: coerceString(permitRange?.[1]),
      durationInMinutes: resolveDurationInMinutes(
        get(filmTrailerForm, "durationInMinutes"),
      ),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
