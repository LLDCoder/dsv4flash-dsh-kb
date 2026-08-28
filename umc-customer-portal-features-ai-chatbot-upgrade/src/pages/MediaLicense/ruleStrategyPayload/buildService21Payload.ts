import { nowGst, toApi } from "@/utils/gstTime";
import type { Service21RuleStrategyValidatePayload } from "@/services/services";
import { getArtistWorkTypesByServiceCode } from "@/services/services";
import { getNationalityList } from "@/services/userProfile";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";
import {
  coerceString,
  findLookupId,
  getFirstDefined,
  resolveDurationInMinutes,
  resolveCountryId,
  resolveSelectTableValue,
  resolveSelectedIds,
  resolveTermsAgreed,
  resolveUploadUrl,
  unwrapResponseRows,
} from "../ruleStrategyPayloadUtils";

const MEDIA_MATERIAL_TYPE_CODE = "01";
const REQUEST_TYPE_BY_ACTIVITY_ID: Record<number, string> = {
  2062: "Poster",
  2063: "Trailer",
};
const POSTER_ACTIVITY_ID = 2062;
const TRAILER_ACTIVITY_ID = 2063;

export const buildService21Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service21RuleStrategyValidatePayload> => {
  const selectTable = resolveSelectTableValue(formValuesList);
  const selectedActivityIds = resolveSelectedIds(selectTable);
  const permitRange = getFirstDefined(
    formValuesList.flatMap((formValues) => [get(formValues, "moviePackageForm.copyrightsValidityPeriod")]),
  ) as unknown[] | undefined;
  const posterValue = getFirstDefined(
    formValuesList.flatMap((formValues) => [get(formValues, "posterAndTrailerPermit.posterFiles")]),
  );
  const trailerValues = getFirstDefined(
    formValuesList.flatMap((formValues) => [get(formValues, "posterAndTrailerPermit.trailers")]),
  );
  const showPoster = selectedActivityIds.includes(POSTER_ACTIVITY_ID);
  const showTrailer = selectedActivityIds.includes(TRAILER_ACTIVITY_ID);
  const [nationalitiesResponse, artistWorkTypesResponse] = await Promise.all([
    getNationalityList(),
    getArtistWorkTypesByServiceCode(serviceCode),
  ]);
  const nationalityList = nationalitiesResponse.data ?? [];
  const artistWorkTypes = unwrapResponseRows(artistWorkTypesResponse);

  const trailerLinks = (() => {
    if (!showTrailer) {
      return [];
    }
    if (Array.isArray(trailerValues)) {
      return trailerValues
        .map((item) => resolveUploadUrl(item))
        .filter((item): item is string => !!item);
    }
    const single = resolveUploadUrl(trailerValues);
    return single ? [single] : [];
  })();

  const posterFileUrls = (() => {
    if (!showPoster) {
      return [];
    }
    if (Array.isArray(posterValue)) {
      return posterValue
        .map((item) => resolveUploadUrl(item))
        .filter((item): item is string => !!item);
    }
    const single = resolveUploadUrl(posterValue);
    return single ? [single] : [];
  })();

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      mediaMaterialTypeCode: MEDIA_MATERIAL_TYPE_CODE,
      requestTypes: selectedActivityIds
        .map((item) =>
          typeof item === "number" ? REQUEST_TYPE_BY_ACTIVITY_ID[item] : undefined,
        )
        .filter((item): item is string => !!item),
      title: coerceString(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "moviePackageForm.title")])),
      ),
      artistWorkTypeId: findLookupId(
        artistWorkTypes,
        getFirstDefined(formValuesList.flatMap((formValues) => [
          get(formValues, "ArtistWorkType"),
          get(formValues, "moviePackageForm.type"),
        ])),
      ),
      languageId: getFirstDefined(
        formValuesList.flatMap((formValues) => [get(formValues, "moviePackageForm.language")]),
      ) as string | number | undefined,
      durationInMinutes: resolveDurationInMinutes(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "moviePackageForm.durationInMinutes")])),
      ),
      countryId: getFirstDefined(
        formValuesList.flatMap((formValues) => [resolveCountryId(get(formValues, "moviePackageForm.source"), nationalityList)]),
      ) as string | number | undefined,
      copyrightsTypeId: getFirstDefined(
        formValuesList.flatMap((formValues) => [get(formValues, "moviePackageForm.copyrightsType")]),
      ) as string | number | undefined,
      permitStartDate: coerceString(permitRange?.[0]),
      permitEndDate: coerceString(permitRange?.[1]),
      trailerLinks,
      posterFileUrls,
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
