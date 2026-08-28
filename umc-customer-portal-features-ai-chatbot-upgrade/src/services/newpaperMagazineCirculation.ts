import request from "@/utils/request";
import { compact, isString, map, toNumber, trim } from "lodash";

export interface NewpaperMagazineLicenseLookupResponse {
  matched: boolean;
  publicationTitle?: string;
  language?: string | number;
  subjectCategoryIds?: number[];
  sourceId?: number;
}

export interface NewpaperMagazineLicenseLookupParams {
  mediaLicenseNumber: string;
  serviceCode?: string | number;
  permitActivityId?: string | number;
}

interface ApiEnvelope<T> {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: T;
}

interface NewspaperLanguageItem {
  id?: number;
  name?: string;
  newspaperId?: number;
  languageId?: number;
  language?: {
    id?: number;
    nameAr?: string;
    nameEn?: string;
    alpha2Code?: string;
    alpha3Code?: string;
  } | null;
}

interface NewspaperSubjectCategoryItem {
  id?: number;
  newspaperId?: number;
  newspaperCategoryId?: number;
  createdOn?: string;
  newspaperCategory?: {
    id?: number;
    nameEn?: string;
    nameAr?: string;
    isFree?: boolean;
  } | null;
}

interface NewspaperLookupItem {
  id?: number;
  name?: string | null;
  language?: string | number | null;
  newspaperCategoryIds?: Array<string | number> | null;
  sourceCountryId?: number;
  newspaperLanguages?: NewspaperLanguageItem[] | null;
  newspaperSubjectCategories?: NewspaperSubjectCategoryItem[] | null;
}

const normalizeLanguageValue = (value: unknown): string | number | undefined => {
  const numericValue = toNumber(value);
  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }

  return isString(value) && trim(value) ? trim(value) : undefined;
};

const normalizeObjectPayload = (
  value: unknown
): Omit<NewpaperMagazineLicenseLookupResponse, "matched"> | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const subjectRaw =
    record.newspaperCategoryIds ??
    record.subjectCategoryIds ??
    record.subjectIds ??
    record.mediaActivityIds;
  const subjectCategoryIds = Array.isArray(subjectRaw)
    ? (compact(
        map(subjectRaw as unknown[], (item) => {
          const parsed = toNumber(item);
          return Number.isNaN(parsed) ? undefined : parsed;
        })
      ) as number[])
    : [];

  const publicationTitleValue =
    record.name ?? record.publicationTitle ?? record.publicationName ?? record.title;
  const languageValue = normalizeLanguageValue(record.language ?? record.languageName);
  const sourceIdValue = toNumber(record.sourceCountryId ?? record.sourceId);
  const publicationTitle =
    isString(publicationTitleValue) && trim(publicationTitleValue)
      ? trim(publicationTitleValue)
      : undefined;

  return {
    publicationTitle,
    language: languageValue,
    sourceId: Number.isNaN(sourceIdValue) ? undefined : sourceIdValue,
    subjectCategoryIds:
      subjectCategoryIds.length > 0 ? subjectCategoryIds : undefined,
  };
};

const normalizeNewspaperLookupItem = (
  item: NewspaperLookupItem
): Omit<NewpaperMagazineLicenseLookupResponse, "matched"> => {
  const firstLanguage = Array.isArray(item.newspaperLanguages)
    ? item.newspaperLanguages[0]
    : undefined;
  const publicationTitleValue = item.name ?? firstLanguage?.name;
  const publicationTitle =
    isString(publicationTitleValue) && trim(publicationTitleValue)
      ? trim(publicationTitleValue)
      : undefined;
  const language =
    normalizeLanguageValue(item.language ?? firstLanguage?.languageId) ??
    normalizeLanguageValue(
      firstLanguage?.language?.id ??
        firstLanguage?.language?.nameEn ??
        firstLanguage?.language?.nameAr,
    );

  const directSubjectCategoryIds = Array.isArray(item.newspaperCategoryIds)
    ? (compact(
        map(item.newspaperCategoryIds, (categoryId) => {
          const parsed = toNumber(categoryId);
          return Number.isNaN(parsed) ? undefined : parsed;
        }),
      ) as number[])
    : [];
  const relationSubjectCategoryIds = Array.isArray(item.newspaperSubjectCategories)
    ? (compact(
        map(item.newspaperSubjectCategories, (category) => {
          const parsed = toNumber(category?.newspaperCategoryId);
          return Number.isNaN(parsed) ? undefined : parsed;
        }),
      ) as number[])
    : [];
  const subjectCategoryIds =
    directSubjectCategoryIds.length > 0
      ? directSubjectCategoryIds
      : relationSubjectCategoryIds;

  const sourceIdValue = toNumber(item.sourceCountryId);

  return {
    publicationTitle,
    language,
    sourceId: Number.isNaN(sourceIdValue) ? undefined : sourceIdValue,
    subjectCategoryIds:
      subjectCategoryIds.length > 0 ? subjectCategoryIds : undefined,
  };
};

export const lookupNewpaperMagazineLicense = async (
  params: NewpaperMagazineLicenseLookupParams,
): Promise<NewpaperMagazineLicenseLookupResponse> => {
  const { mediaLicenseNumber, serviceCode, permitActivityId } = params;
  const isMagazine = String(serviceCode ?? "") === "1102";
  const response = await request.get<ApiEnvelope<unknown>>(
    `/api/FormOptions/Newspaper`,
    {
      isMagazine,
      mediaLicenseNumber,
      permitActivityId,
    },
    { skipErrorToast: true }
  );

  const payload = response?.data;
  if (!payload) {
    return { matched: false };
  }

  if (Array.isArray(payload)) {
    const firstItem = payload[0] as NewspaperLookupItem | undefined;
    if (!firstItem || typeof firstItem !== "object") {
      return { matched: false };
    }

    return {
      matched: true,
      ...normalizeNewspaperLookupItem(firstItem),
    };
  }

  const normalized = normalizeObjectPayload(payload);
  if (!normalized) {
    return { matched: false };
  }

  const explicitMatched =
    typeof (payload as Record<string, unknown>).matched === "boolean"
      ? ((payload as Record<string, unknown>).matched as boolean)
      : undefined;

  const inferredMatched =
    !!normalized.publicationTitle ||
    !!normalized.language ||
    !!normalized.sourceId ||
    !!normalized.subjectCategoryIds?.length;

  return {
    matched: explicitMatched ?? inferredMatched,
    ...normalized,
  };
};
