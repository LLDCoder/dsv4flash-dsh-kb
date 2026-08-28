import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1101RuleStrategyValidatePayload } from "@/services/services";
import { getLanguages } from "@/services/services";
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

type Service1101ActivityRule = {
  periodicalTypeId: number;
};

const SERVICE_1101_ACTIVITY_RULES: Record<number, Service1101ActivityRule> = {
  2071: { periodicalTypeId: 1 },
};

const UAE_COUNTRY_CODE = "AE";

const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getFirstDefined = (values: unknown[]) => values.find(isFilledValue);

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

const coerceNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

const resolveUploadUrl = (value: unknown): string | undefined => {
  if (typeof value === "string") return coerceString(value);
  if (Array.isArray(value)) return resolveUploadUrl(value[0]);
  if (value && typeof value === "object") {
    return coerceString(
      getFirstDefined([
        get(value, "url"),
        get(value, "fileUrl"),
        get(value, "path"),
        get(value, "response.data"),
        get(value, "response.url"),
        get(value, "name"),
      ]),
    );
  }
  return undefined;
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

const resolveActivityId = (
  selectTableSingle?: {
    selectedKey?: string | number | Array<string | number>;
    tableData?: Array<{ Id?: unknown }>;
  },
) => {
  const selectedKey = selectTableSingle?.selectedKey;
  const firstSelectedKey = Array.isArray(selectedKey) ? selectedKey[0] : selectedKey;

  return coerceNumber(
    getFirstDefined([firstSelectedKey, get(selectTableSingle, "tableData.0.Id")]),
  );
};

const resolveActivityLabel = (
  selectTableSingle?: {
    tableData?: Array<Record<string, unknown>>;
  },
) => {
  return coerceString(
    getFirstDefined([
      get(selectTableSingle, "tableData.0.ActivityEn"),
      get(selectTableSingle, "tableData.0.Activity"),
      get(selectTableSingle, "tableData.0.ActivityAr"),
    ]),
  );
};

const resolvePeriodicalTypeId = (
  activityId: number | undefined,
  activityLabel: string | undefined,
) => {
  const activityRule = activityId ? SERVICE_1101_ACTIVITY_RULES[activityId] : undefined;
  if (activityRule) return activityRule.periodicalTypeId;

  const normalizedLabel = activityLabel?.trim().toLowerCase();
  if (!normalizedLabel) return undefined;
  if (normalizedLabel.includes("daily") || normalizedLabel.includes("يومي")) return 1;
  if (normalizedLabel.includes("weekly") || normalizedLabel.includes("أسبوع")) return 2;
  if (normalizedLabel.includes("monthly") || normalizedLabel.includes("شهري")) return 4;

  return undefined;
};

const resolveCirculationValue = (
  formValuesList: Array<Record<string, unknown>>,
): Record<string, unknown> | undefined => {
  return formValuesList
    .map((formValues) =>
      getFirstDefined([
        get(formValues, "NewsMagazineCirculation"),
        get(formValues, "newpaperMagazineCirculation"),
        get(formValues, "newspaperMagazineCirculation"),
        get(formValues, "NewpaperMagazineCirculation"),
        get(formValues, "NewspaperMagazineCirculation"),
        get(formValues, "circulationDetails"),
        get(formValues, "CirculationDetails"),
      ]),
    )
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;
};

const findLanguageId = (languages: LanguageOption[], value: unknown): number | undefined => {
  const numericValue = coerceNumber(value);
  if (numericValue !== undefined) return numericValue;

  const normalized = coerceString(value)?.toLowerCase();
  if (!normalized) return undefined;

  return languages.find((option) => {
    return [option.nameEn, option.nameAr, option.code, option.alpha2Code, option.alpha3Code]
      .filter(Boolean)
      .some((item) => String(item).trim().toLowerCase() === normalized);
  })?.id;
};

const resolveSourceCountryCode = (
  formValuesList: Array<Record<string, unknown>>,
  circulationValue: Record<string, unknown> | undefined,
  nationalityList: NationalityInfo[],
) => {
  const directCountryCode = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "sourceCountryCode"),
        get(formValues, "Source"),
        get(formValues, "source"),
        get(formValues, "countryCode"),
        get(formValues, "sourceCode"),
        get(formValues, "SelectTableSingle.Source"),
        get(formValues, "SelectTableSingle.sourceCountryCode"),
        get(circulationValue, "sourceCountryCode"),
        get(circulationValue, "sourceCode"),
      ]),
    ),
  );

  if (directCountryCode) return directCountryCode.toUpperCase();

  const sourceId = coerceNumber(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "sourceId"),
        get(formValues, "SourceId"),
        get(circulationValue, "sourceId"),
      ]),
    ),
  );

  if (sourceId === undefined) return undefined;

  const matchedNationality = nationalityList.find((item) => item.id === sourceId);
  return coerceString(matchedNationality?.isocode2)?.toUpperCase();
};

const buildSubjectCategoryIds = (
  formValuesList: Array<Record<string, unknown>>,
  circulationValue: Record<string, unknown> | undefined,
) => {
  const rawValue = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "subjectCategoryIds"),
      get(formValues, "SubjectCategoryIds"),
      get(formValues, "SubjectCategory"),
      get(formValues, "subjectCategory"),
      get(formValues, "SelectTableSingle.SubjectCategory"),
      get(formValues, "SelectTableSingle.subjectCategoryIds"),
      get(circulationValue, "subjectCategoryIds"),
    ]),
  );

  if (Array.isArray(rawValue)) return coerceNumberArray(rawValue);

  const singleValue = coerceNumber(rawValue);
  return singleValue !== undefined ? [singleValue] : [];
};

const buildDistributionEmirateIds = (
  formValuesList: Array<Record<string, unknown>>,
  circulationValue: Record<string, unknown> | undefined,
) => {
  const rawValue = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "distributionEmirateIds"),
      get(formValues, "DistributionScope"),
      get(formValues, "distributionScope"),
      get(formValues, "SelectTableSingle.DistributionScope"),
      get(circulationValue, "distributionScopeIds"),
    ]),
  );

  if (Array.isArray(rawValue)) return coerceNumberArray(rawValue);

  const singleValue = coerceNumber(rawValue);
  return singleValue !== undefined ? [singleValue] : [];
};

const buildLanguageItems = (
  formValuesList: Array<Record<string, unknown>>,
  circulationValue: Record<string, unknown> | undefined,
  languages: LanguageOption[],
) => {
  const rawValue = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "languageItems"),
      get(formValues, "LanguageItems"),
      get(formValues, "languageNameList"),
      get(formValues, "LanguageNameList"),
      get(circulationValue, "NewsMagazineCirculation.languageItems"),
      get(circulationValue, "NewsMagazineCirculation.languageNameList"),
      get(circulationValue, "languageItems"),
      get(circulationValue, "languageNameList"),
    ]),
  );

  const rawList = Array.isArray(rawValue) ? rawValue : [];
  const mappedItems = rawList
    .map((item) => {
      const languageId = findLanguageId(
        languages,
        getFirstDefined([
          get(item, "languageId"),
          get(item, "LanguageId"),
          get(item, "language"),
          get(item, "Language"),
        ]),
      );
      const name = coerceString(
        getFirstDefined([
          get(item, "name"),
          get(item, "publication_title"),
          get(item, "publicationTitle"),
          get(item, "title"),
        ]),
      );

      return languageId !== undefined && name
        ? {
            languageId,
            name,
          }
        : undefined;
    })
    .filter(
      (
        item,
      ): item is {
        languageId: number;
        name: string;
      } => item !== undefined,
    );

  if (mappedItems.length > 0) return mappedItems;

  const fallbackLanguageId = findLanguageId(
    languages,
    getFirstDefined([
      get(circulationValue, "NewsMagazineCirculation.languageId"),
      get(circulationValue, "NewsMagazineCirculation.language"),
      get(circulationValue, "languageId"),
      get(circulationValue, "language"),
      get(circulationValue, "Language"),
    ]),
  );
  const fallbackPublicationName = coerceString(
    getFirstDefined([
      get(circulationValue, "NewsMagazineCirculation.publicationTitle"),
      get(circulationValue, "publicationTitle"),
      get(circulationValue, "publicationName"),
      get(circulationValue, "title"),
    ]),
  );

  if (fallbackLanguageId !== undefined && fallbackPublicationName) {
    return [
      {
        languageId: fallbackLanguageId,
        name: fallbackPublicationName,
      },
    ];
  }

  return [];
};

export const buildService1101Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1101RuleStrategyValidatePayload> => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  if (!selectTableSingle) {
    throw new Error("SelectTableSingle data is missing for service 1101.");
  }

  const [nationalityResponse, languageResponse] = await Promise.all([
    getNationalityList(),
    getLanguages(),
  ]);

  const nationalityList = nationalityResponse?.data ?? [];
  const languageList = languageResponse?.data ?? [];
  const circulationValue = resolveCirculationValue(formValuesList);
  const activityId = resolveActivityId(selectTableSingle);
  const activityLabel = resolveActivityLabel(selectTableSingle);
  const periodicalTypeId = resolvePeriodicalTypeId(activityId, activityLabel);

  if (periodicalTypeId === undefined) {
    throw new Error("Unable to derive service 1101 newspaper frequency from selected activity.");
  }

  const hasOwnerLicense =
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "hasOwnerLicense"),
          get(formValues, "HasOwnerLicense"),
          get(formValues, "isLicensed"),
          get(formValues, "IsLicensed"),
          get(formValues, "SelectTableSingle.hasOwnerLicense"),
          get(circulationValue, "hasOwnerLicense"),
          get(circulationValue, "isLicensed"),
        ]),
      ),
    ) ?? false;

  const sourceCountryCode = resolveSourceCountryCode(
    formValuesList,
    circulationValue,
    nationalityList,
  );
  const copyrightFileUrl = resolveUploadUrl(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "copyrightFileUrl"),
        get(formValues, "CopyrightFileUrl"),
        get(formValues, "distributionCopyrights"),
        get(formValues, "DistributionCopyrights"),
        get(formValues, "MinistryOfEconomyRegistrationCertificate"),
        get(formValues, "SelectTableSingle.MinistryOfEconomyRegistrationCertificate"),
        get(circulationValue, "distributionCopyrights"),
      ]),
    ),
  );
  const explicitLocalLicenseFileUrl = resolveUploadUrl(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "localLicenseFileUrl"),
        get(formValues, "LocalLicenseFileUrl"),
        get(formValues, "publicationLicenseCopy"),
        get(formValues, "PublicationLicenseCopy"),
        get(formValues, "localLicense"),
        get(formValues, "LocalLicense"),
        get(circulationValue, "publicationLicenseCopy"),
        get(circulationValue, "localLicenseFileUrl"),
      ]),
    ),
  );
  const localLicenseFileUrl =
    explicitLocalLicenseFileUrl ||
    (sourceCountryCode === UAE_COUNTRY_CODE && !hasOwnerLicense ? copyrightFileUrl : undefined);

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),

      submissionMode,
      requestTime: toApi(nowGst()),
      hasOwnerLicense,
      isMagazine: false,
      mediaLicenseNumber: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "mediaLicenseNumber"),
            get(formValues, "MediaLicenseNumber"),
            get(formValues, "SelectTableSingle.mediaLicenseNumber"),
            get(circulationValue, "mediaLicenseNumber"),
          ]),
        ),
      ),
      periodicalTypeId,
      sourceCountryCode,
      subjectCategoryIds: buildSubjectCategoryIds(formValuesList, circulationValue),
      versionNumber: coerceNumber(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "versionNumber"),
            get(formValues, "VersionNumber"),
            get(formValues, "LastVersionNumber"),
            get(formValues, "lastVersionNumber"),
            get(formValues, "SelectTableSingle.LastVersionNumber"),
            get(circulationValue, "lastVersionNumber"),
          ]),
        ),
      ),
      publishingHouse: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "publishingHouse"),
            get(formValues, "PublishingHouse"),
            get(formValues, "SelectTableSingle.PublishingHouse"),
            get(circulationValue, "publishingHouse"),
          ]),
        ),
      ),
      distributionStartDate: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "distributionStartDate"),
            get(formValues, "DistributionStartDate"),
            get(formValues, "DistributionPeriod.0"),
            get(circulationValue, "distributionStartingDate"),
          ]),
        ),
      ),
      distributionEndDate: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "distributionEndDate"),
            get(formValues, "DistributionEndDate"),
            get(formValues, "DistributionPeriod.1"),
            get(circulationValue, "distributionEndingDate"),
          ]),
        ),
      ),
      distributionEmirateIds: buildDistributionEmirateIds(formValuesList, circulationValue),
      numberOfCopies: coerceNumber(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "numberOfCopies"),
            get(formValues, "NumberOfCopies"),
            get(formValues, "NumberOfDistributedCopies"),
            get(formValues, "SelectTableSingle.NumberOfDistributedCopies"),
            get(circulationValue, "numberOfCopies"),
          ]),
        ),
      ),
      copyrightFileUrl,
      localLicenseFileUrl,
      languageItems: buildLanguageItems(formValuesList, circulationValue, languageList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
