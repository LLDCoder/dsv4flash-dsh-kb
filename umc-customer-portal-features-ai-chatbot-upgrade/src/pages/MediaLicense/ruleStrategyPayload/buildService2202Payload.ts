import { nowGst, toApi } from "@/utils/gstTime";
import type { Service2202RuleStrategyValidatePayload } from "@/services/services";
import {
  getArtistWorkTypesByServiceCode,
  getLanguages,
  getLookupData,
} from "@/services/services";
import { getNationalityList, type NationalityInfo } from "@/services/userProfile";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
  resolveSelectTableSingleValue,
} from "../ruleStrategyPayloadShared";

type LanguageOption = {
  id?: number;
  code?: string;
  nameEn?: string;
  nameAr?: string;
  alpha2Code?: string;
  alpha3Code?: string;
};

type LookupOption = {
  Id?: number | string;
  id?: number | string;
  Code?: string;
  code?: string;
  NameEn?: string;
  nameEn?: string;
  NameAr?: string;
  nameAr?: string;
};

const SERVICE_2202_TYPE_ID = 2;
const SERVICE_2202_MEDIA_MATERIAL_TYPE_CODE = "04";

const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getFirstDefined = (values: unknown[]) => values.find(isFilledValue);
const getFirstArrayItem = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const coerceString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "no") return false;
  }
  return undefined;
};

const unwrapResponseRows = (response: unknown): unknown[] => {
  const rows = get(response as object, "data", response);
  return Array.isArray(rows) ? rows : [];
};

const resolveTermsAgreed = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTableSingle.termsAccepted"),
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.terms.isAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "termsAgreed"),
          get(formValues, "terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

const resolveGameFormValue = (
  formValuesList: Array<Record<string, unknown>>,
): Record<string, unknown> | undefined => {
  return formValuesList
    .map((formValues) =>
      getFirstDefined([
        get(formValues, "VideoGamePackageForm"),
        get(formValues, "Video Game Package Form"),
        get(formValues, "GameDistributionForm"),
        get(formValues, "Game Distribution Form"),
        get(formValues, "FilmTrailerForm"),
        get(formValues, "Film Age Rating"),
      ]),
    )
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;
};

const findLanguageId = (languages: LanguageOption[], value: unknown): number | undefined => {
  const normalizedValue = getFirstArrayItem(value);
  const numericValue = coerceNumber(normalizedValue);
  if (numericValue !== undefined) return numericValue;

  const normalized = coerceString(normalizedValue)?.toLowerCase();
  if (!normalized) return undefined;

  return languages.find((option) => {
    return [option.nameEn, option.nameAr, option.code, option.alpha2Code, option.alpha3Code]
      .filter(Boolean)
      .some((item) => String(item).trim().toLowerCase() === normalized);
  })?.id;
};

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

const resolveCountryId = (
  rawValue: unknown,
  nationalityList: NationalityInfo[],
): number | undefined => {
  const normalizedValue = getFirstArrayItem(rawValue);
  if (normalizedValue === undefined || normalizedValue === null) return undefined;

  const asNumber = coerceNumber(normalizedValue);
  if (asNumber !== undefined) {
    const byNumericCode = nationalityList.find((item) => item.numericCode === asNumber);
    if (byNumericCode) return byNumericCode.numericCode;

    const byInternalId = nationalityList.find((item) => item.id === asNumber);
    if (byInternalId) return byInternalId.numericCode;

    return asNumber;
  }

  const normalized = coerceString(normalizedValue)?.toUpperCase();
  if (!normalized) return undefined;

  const byIso2 = nationalityList.find((item) => item.isocode2?.toUpperCase() === normalized);
  if (byIso2) return byIso2.numericCode;

  const byIso3 = nationalityList.find((item) => item.isocode3?.toUpperCase() === normalized);
  if (byIso3) return byIso3.numericCode;

  const byName = nationalityList.find((item) => {
    return [item.nameEn, item.nameAr, item.fullNameEn, item.fullNameAr]
      .filter(Boolean)
      .some((name) => String(name).trim().toUpperCase() === normalized);
  });
  if (byName) return byName.numericCode;

  const digitsOnly = normalizeDigits(normalized);
  if (!digitsOnly) return undefined;

  const byDigits = coerceNumber(digitsOnly);
  return byDigits;
};

const findLookupId = (rows: unknown[], rawValue: unknown): number | undefined => {
  const normalizedValue = getFirstArrayItem(rawValue);
  const numericValue = coerceNumber(normalizedValue);
  if (numericValue !== undefined) return numericValue;

  const normalized = coerceString(normalizedValue)?.toLowerCase();
  if (!normalized) return undefined;

  const matched = rows.find((row) => {
    const option = row as LookupOption;
    return [
      option.NameEn,
      option.nameEn,
      option.NameAr,
      option.nameAr,
      option.Code,
      option.code,
    ]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalized);
  }) as LookupOption | undefined;

  return coerceNumber(getFirstDefined([matched?.Id, matched?.id]));
};

export const buildService2202Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service2202RuleStrategyValidatePayload> => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  if (!selectTableSingle) {
    throw new Error("SelectTableSingle data is missing for service 2202.");
  }

  const [languagesResponse, nationalitiesResponse, artistWorkTypesResponse, copyrightsResponse] =
    await Promise.all([
      getLanguages(),
      getNationalityList(),
      getArtistWorkTypesByServiceCode(serviceCode),
      getLookupData("CopyrightsTypes", config.serviceId),
    ]);

  const languageOptions = unwrapResponseRows(languagesResponse) as LanguageOption[];
  const nationalityList = (nationalitiesResponse.data ?? []) as NationalityInfo[];
  const artistWorkTypes = unwrapResponseRows(artistWorkTypesResponse);
  const copyrightsTypes = unwrapResponseRows(copyrightsResponse);
  const gameFormValue = resolveGameFormValue(formValuesList);

  const title = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(gameFormValue, "title"),
        get(formValues, "title"),
        get(formValues, "Title"),
      ]),
    ),
  );

  const rawArtistWorkType = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "type"),
      get(formValues, "ArtistWorkTypes"),
    ]),
  );

  const rawLanguage = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(gameFormValue, "language"),
      get(gameFormValue, "languages"),
      get(formValues, "languageId"),
      get(formValues, "Language"),
      get(formValues, "Languages"),
    ]),
  );

  const rawCountry = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(gameFormValue, "originCountry"),
      get(formValues, "OriginCountry"),
    ]),
  );

  const rawCopyrightsType = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(gameFormValue, "copyrightsType"),
      get(formValues, "copyrightsTypeId"),
      get(formValues, "CopyrightsType"),
      get(formValues, "copyrightsType"),
    ]),
  );

  const permitRange = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(gameFormValue, "permitValidityPeriod"),
      get(gameFormValue, "copyrightsValidityPeriod"),
      get(formValues, "permitValidityPeriod"),
      get(formValues, "PermitValidityPeriod"),
      get(formValues, "copyrightsValidityPeriod"),
    ]),
  ) as unknown[] | undefined;

  const permitStartDate = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        Array.isArray(permitRange) ? permitRange[0] : undefined,
        get(gameFormValue, "copyrightStartDate"),
        get(formValues, "permitStartDate"),
        get(formValues, "copyrightStartDate"),
      ]),
    ),
  );

  const permitEndDate = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        Array.isArray(permitRange) ? permitRange[1] : undefined,
        get(gameFormValue, "copyrightEndDate"),
        get(formValues, "permitEndDate"),
        get(formValues, "copyrightEndDate"),
      ]),
    ),
  );

  const contentLink = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "GameContentLink"),
        get(gameFormValue, "contentLink"),
        get(gameFormValue, "gameContentLink"),
        get(gameFormValue, "digitalGameContentLink"),
        get(gameFormValue, "movieMaterialContent"),
        get(gameFormValue, "gameMaterialContent"),
        get(formValues, "contentLink"),
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
      typeId: SERVICE_2202_TYPE_ID,
      mediaMaterialTypeCode: SERVICE_2202_MEDIA_MATERIAL_TYPE_CODE,
      title,
      artistWorkTypeId: findLookupId(artistWorkTypes, rawArtistWorkType),
      languageId: findLanguageId(languageOptions, rawLanguage),
      countryId: resolveCountryId(rawCountry, nationalityList),
      copyrightsTypeId: findLookupId(copyrightsTypes, rawCopyrightsType),
      permitStartDate,
      permitEndDate,
      contentLink,
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
