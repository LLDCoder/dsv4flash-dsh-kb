import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1010RuleStrategyValidatePayload } from "@/services/services";
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
  resolveTermsAgreed,
  resolveCountryId,
  resolveUploadUrl,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";
import {
  SELECTEDPACKAGETYPES_MAP
} from "@/pages/MediaLicense/feeStrategyPayload/feeStrategyPayloadUtils";

const FLAG = 5;
const MEDIA_MATERIAL_TYPE_CODE = "04";

const REQUESTED_PACKAGE_ITEMS = [
  "VideoGameApprovalBase",
  "VideoGameApprovalChecklist",
  "VideoGameApprovalRouting",
];

const PLATFORM_CODE_BY_VALUE: Record<string, string> = {
  playstation: "PS5",
  ps5: "PS5",
  xbox: "XBOX",
  nintendo: "SWITCH",
  switch: "SWITCH",
  pc: "PC",
  mobile: "MOBILE",
  other: "OTHER",
};

const resolvePlatformCodes = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => coerceString(item)?.toLowerCase())
    .filter((item): item is string => !!item)
    .map((item) => PLATFORM_CODE_BY_VALUE[item] ?? item.toUpperCase());
};

export const buildService1010Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1010RuleStrategyValidatePayload> => {
  const gamePackageForm = formValuesList
    .map((formValues) =>
      getFirstDefined([
        get(formValues, "VideoGamePackageForm"),
        get(formValues, "Video Game Package Form"),
        formValues,
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

  const copyrightRange = getFirstDefined([
    get(gamePackageForm, "PermitValidityPeriod"),
    get(gamePackageForm, "permitValidityPeriod"),
    get(gamePackageForm, "copyrightsValidityPeriod"),
  ]) as unknown[] | undefined;

  const selectedPlatformCodes = resolvePlatformCodes(
    getFirstDefined([
      get(gamePackageForm, "GamePlatform"),
      get(gamePackageForm, "gamePlatform"),
      get(gamePackageForm, "gamePlatforms"),
    ]),
  );

  const rawContentLink = getFirstDefined([
    get(gamePackageForm, "GameContentLink"),
    get(gamePackageForm, "gameContentLink"),
    get(gamePackageForm, "contentLink"),
  ]);

  const rawIsDigital = getFirstDefined([
    get(gamePackageForm, "isDigitalForPackage"),
    get(gamePackageForm, "IsDigitalForPackage"),
    get(gamePackageForm, "addDigitalVersion"),
  ]);

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      flag: FLAG,
      packageTypeId: SELECTEDPACKAGETYPES_MAP[config.serviceId],
      mediaMaterialTypeCode: MEDIA_MATERIAL_TYPE_CODE,
      requestedPackageItems: REQUESTED_PACKAGE_ITEMS,
      title: coerceString(getFirstDefined([get(gamePackageForm, "Title"), get(gamePackageForm, "title")])),
      artistWorkTypeId: findLookupId(
        artistWorkTypes,
        getFirstDefined([
          get(gamePackageForm, "ArtistWorkTypes"),
          get(gamePackageForm, "artistWorkTypes"),
          get(gamePackageForm, "ArtistWorkType"),
          get(gamePackageForm, "type"),
          get(gamePackageForm, "category"),
        ]),
      ),
      languageId: findLanguageId(
        languageOptions,
        getFirstDefined([get(gamePackageForm, "Language"), get(gamePackageForm, "language")]),
      ),
      sourceCountryId: resolveCountryId(
        getFirstDefined([
          get(gamePackageForm, "OriginCountry"),
          get(gamePackageForm, "originCountry"),
          get(gamePackageForm, "source"),
        ]),
        nationalityList,
      ),
      copyrightsTypeId: findLookupId(
        copyrightsTypes,
        getFirstDefined([
          get(gamePackageForm, "CopyrightsType"),
          get(gamePackageForm, "copyrightsType"),
        ]),
      ),
      copyrightStartDate: coerceString(copyrightRange?.[0]),
      copyrightEndDate: coerceString(copyrightRange?.[1]),
      contentLink: coerceString(rawContentLink),
      copyrightAttachmentFileUrl: resolveUploadUrl(
        getFirstDefined([
          get(gamePackageForm, "MinistryOfEconomyRegistrationCertificate"),
          get(gamePackageForm, "economyCertificate"),
          get(gamePackageForm, "copyrightAttachment"),
          get(gamePackageForm, "GameContentMaterial"),
          get(gamePackageForm, "gameContentMaterial"),
        ]),
      ),
      isDigitalForPackage:
        coerceBoolean(rawIsDigital) !== undefined
          ? coerceBoolean(rawIsDigital)
          : selectedPlatformCodes.length > 0,
      selectedPlatformCodes,
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
