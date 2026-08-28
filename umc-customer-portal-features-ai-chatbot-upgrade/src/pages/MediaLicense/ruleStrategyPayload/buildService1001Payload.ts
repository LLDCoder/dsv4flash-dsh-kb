import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1001RuleStrategyValidatePayload } from "@/services/services";
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
  resolveDurationInMinutes,
  resolveSelectTableValue,
  resolveSelectedIds,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveUrlListItems,
  resolveCountryId,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const FLAG = 1;
const MEDIA_MATERIAL_TYPE_CODE = "01";

export const buildService1001Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1001RuleStrategyValidatePayload> => {
  const selectTable = resolveSelectTableValue(formValuesList);
  const selectedActivityIds = resolveSelectedIds(selectTable);
  const moviePackageForm = formValuesList
    .map((formValues) => getFirstDefined([get(formValues, "moviePackageForm")]))
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
    moviePackageForm,
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
      flag: FLAG,
      mediaMaterialTypeCode: MEDIA_MATERIAL_TYPE_CODE,
      activityIds: selectedActivityIds,
      isLocalFilm:
        coerceString(get(moviePackageForm, "applyingPermitForLocalCinematicFilms"))?.toLowerCase() ===
        "yes",
      title: coerceString(get(moviePackageForm, "title")),
      artistWorkTypeId: findLookupId(artistWorkTypes, get(moviePackageForm, "type")),
      languageId: findLanguageId(languageOptions, get(moviePackageForm, "language")),
      sourceCountryId: resolveCountryId(get(moviePackageForm, "source"), nationalityList),
      copyrightsTypeId: findLookupId(
        copyrightsTypes,
        get(moviePackageForm, "copyrightsType"),
      ),
      durationInMinutes: resolveDurationInMinutes(
        get(moviePackageForm, "durationInMinutes"),
      ),
      copyrightStartDate: coerceString(copyrightRange?.[0]),
      copyrightEndDate: coerceString(copyrightRange?.[1]),
      ministryOfEconomyRegistrationCertificateUrl: resolveUploadUrl(
        get(moviePackageForm, "ministryOfEconomyRegistrationCertificate"),
      ),
      trailerLinks: resolveUrlListItems(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "urlList")])),
      ).map((item) => item.url),
      posterFileUrls: (() => {
        const raw = getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "Film Poster")]));
        if (Array.isArray(raw)) {
          return raw
            .map((item) => resolveUploadUrl(item))
            .filter((item): item is string => !!item);
        }
        const single = resolveUploadUrl(raw);
        return single ? [single] : [];
      })(),
      filmDirector: coerceString(get(moviePackageForm, "filmDirector")),
      filmWriter: coerceString(get(moviePackageForm, "filmWriter")),
      writerNationalityId: get(moviePackageForm, "writerNationalityId") as
        | string
        | number
        | undefined,
      writerEmiratesId: coerceString(get(moviePackageForm, "writerEmiratesId")),
      writerEmiratesIdCopyUrl: resolveUploadUrl(get(moviePackageForm, "writerEmiratesIdCopy")),
      termsAgreed: resolveTermsAgreed(formValuesList),
       "requestedPackageItems": [
            "MoviePackageBase"
        ]
    },
  };
};
