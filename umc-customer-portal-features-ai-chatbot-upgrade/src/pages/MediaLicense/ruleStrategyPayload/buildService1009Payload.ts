import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1009RuleStrategyValidatePayload } from "@/services/services";
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
  resolveSelectTableValue,
  resolveSelectedIds,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveCountryId,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const SERVICE_1009_FLAG = 4;
const SERVICE_1009_MEDIA_MATERIAL_TYPE_CODE = "04";

const DIGITAL_ACTIVITY_IDS = new Set([2081]);

const PLATFORM_CODE_BY_VALUE: Record<string, string> = {
  playstation: "PS5",
  xbox: "XBOX",
  nintendo: "SWITCH",
  pc: "PC",
  mobile: "MOBILE",
  other: "OTHER",
};

export const buildService1009Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1009RuleStrategyValidatePayload> => {
  const selectTable = resolveSelectTableValue(formValuesList);
  const selectedActivityIds = resolveSelectedIds(selectTable);
  const gameFormValue = formValuesList
    .map((formValues) =>
      getFirstDefined([
        get(formValues, "GameDistributionForm"),
        get(formValues, "Game Distribution Form"),
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

  const digitalPlatforms = (
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(gameFormValue, "gamePlatform"),
        get(gameFormValue, "gamePlatforms"),
        get(formValues, "gamePlatform"),
      ]),
    ) as unknown[] | undefined
  ) ?? [];

  const rawDigitalFlag = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(gameFormValue, "addDigitalVersion"),
      get(formValues, "addDigitalVersion"),
    ]),
  );

  const selectedPlatformCodes = digitalPlatforms
    .map((item) => coerceString(item)?.toLowerCase())
    .filter((item): item is string => !!item)
    .map((item) => PLATFORM_CODE_BY_VALUE[item] ?? item.toUpperCase());

  const isDigital =
    coerceBoolean(rawDigitalFlag) ??
    (coerceString(rawDigitalFlag)?.toLowerCase() === "yes"
      ? true
      : selectedActivityIds.some(
          (item) => typeof item === "number" && DIGITAL_ACTIVITY_IDS.has(item),
        ));

  const copyrightRange = get(
    gameFormValue,
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
      flag: SERVICE_1009_FLAG,
      mediaMaterialTypeCode: SERVICE_1009_MEDIA_MATERIAL_TYPE_CODE,
      ageRatingPermitId:
        getFirstDefined([
          get(gameFormValue, "ageRatingPermitId"),
          get(gameFormValue, "selectedAgeRatingPermitId"),
          get(gameFormValue, "ageRatingPermit"),
        ]) as string | number | undefined,
      title: coerceString(get(gameFormValue, "title")),
      artistWorkTypeId: findLookupId(artistWorkTypes, get(gameFormValue, "type")),
      languageId: findLanguageId(languageOptions, get(gameFormValue, "language")),
      sourceCountryId: resolveCountryId(get(gameFormValue, "source"), nationalityList),
      copyrightsTypeId: findLookupId(copyrightsTypes, get(gameFormValue, "copyrightsType")),
      copyrightStartDate: coerceString(copyrightRange?.[0]),
      copyrightEndDate: coerceString(copyrightRange?.[1]),
      copyrightAttachmentFileUrl: resolveUploadUrl(
        getFirstDefined([
          get(gameFormValue, "economyCertificate"),
          get(gameFormValue, "copyrightAttachment"),
        ]),
      ),
      isDigital,
      selectedPlatformCodes,
      digitalGameContentFileUrl: resolveUploadUrl(get(gameFormValue, "gameMaterialContent")),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
