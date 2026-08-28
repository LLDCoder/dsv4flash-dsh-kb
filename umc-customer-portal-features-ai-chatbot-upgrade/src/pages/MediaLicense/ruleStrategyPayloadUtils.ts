import type { NationalityInfo } from "@/services/userProfile";
import { getLanguages } from "@/services/services";
import get from "lodash/get";
import set from "lodash/set";
import type { FormValues } from "./ruleStrategyPayloadShared";

export type LanguageOption = {
  id?: number | string;
  Id?: number | string;
  value?: number | string;
  label?: string;
  code?: string;
  nameEn?: string;
  nameAr?: string;
  NameEn?: string;
  NameAr?: string;
  alpha2Code?: string;
  alpha3Code?: string;
};

export type PublicationLanguageListPaths = {
  materialListPaths: string[];
  bookListPaths: string[];
};

export const collectPublicationLanguageListPaths = (
  schema: unknown,
): PublicationLanguageListPaths => {
  const paths: PublicationLanguageListPaths = {
    materialListPaths: [],
    bookListPaths: [],
  };

  const visitProperties = (node: unknown, parentPath: string) => {
    const properties = get(node, "properties");
    if (!properties || typeof properties !== "object") return;

    Object.entries(properties).forEach(([key, child]) => {
      const isVoid = get(child, "type") === "void";
      const fieldPath = isVoid
        ? parentPath
        : [parentPath, key].filter(Boolean).join(".");
      const component = get(child, "x-component");

      if (
        component === "DataList" &&
        get(child, "x-component-props.fieldSource.dataSource") === "material_list"
      ) {
        paths.materialListPaths.push(fieldPath);
      } else if (component === "BeneficiaryType") {
        paths.materialListPaths.push(`${fieldPath}.materialList`);
      } else if (component === "BookList") {
        paths.bookListPaths.push(`${fieldPath}.bookList`);
      }

      visitProperties(child, fieldPath);
    });
  };

  visitProperties(schema, "");
  return paths;
};

export type LookupOption = {
  Id?: number | string;
  id?: number | string;
  Code?: string;
  code?: string;
  NameEn?: string;
  nameEn?: string;
  NameAr?: string;
  nameAr?: string;
};

export const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const getFirstDefined = (values: unknown[]) => values.find(isFilledValue);

export const getFirstArrayItem = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const coerceString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

export const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const resolveDurationInMinutes = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? value : undefined;
  }

  const normalized = coerceString(value);
  if (!normalized) return undefined;

  const legacyMinutes = coerceNumber(normalized);
  if (legacyMinutes !== undefined) {
    return legacyMinutes > 0 ? legacyMinutes : undefined;
  }

  const durationMatch = normalized.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
  if (!durationMatch) return undefined;

  const [, hoursRaw, minutesRaw, secondsRaw] = durationMatch;
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const seconds = Number(secondsRaw);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return undefined;
  }

  return Math.ceil(totalSeconds / 60);
};

export const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y"].includes(normalized)) return true;
    if (["false", "no", "n"].includes(normalized)) return false;
  }
  return undefined;
};

export const coerceStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => coerceString(item))
    .filter((item): item is string => !!item);
};

export const resolveUploadUrl = (value: unknown): string | undefined => {
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

export const resolveTermsAgreed = (formValuesList: FormValues[]) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTableSingle.termsAccepted"),
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.terms.isAgreed"),
          get(formValues, "SelectTable.termsAccepted"),
          get(formValues, "SelectTable.termsAgreed"),
          get(formValues, "SelectTable.terms.isAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "termsAgreed"),
          get(formValues, "terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

export const resolveTermsAccepted = (formValuesList: FormValues[]) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "termsAccepted"),
          get(formValues, "termsAgreed"),
          get(formValues, "terms.isAgreed"),
          get(formValues, "SelectTableSingle.termsAccepted"),
          get(formValues, "SelectTable.termsAccepted"),
        ]),
      ),
    ) ?? true
  );
};

export const resolveSelectTableValue = (formValuesList: FormValues[]) => {
  for (const formValues of formValuesList) {
    const selectTableValue = get(formValues, ["SelectTable"]);
    if (selectTableValue) {
      return selectTableValue as {
        selectedKey?: string | number | Array<string | number>;
        prefilledSelectedKey?: string | number | Array<string | number>;
        tableData?: Array<{ Id?: unknown }>;
      };
    }
    if (
      "selectedKey" in formValues ||
      "prefilledSelectedKey" in formValues ||
      "tableData" in formValues
    ) {
      return formValues as {
        selectedKey?: string | number | Array<string | number>;
        prefilledSelectedKey?: string | number | Array<string | number>;
        tableData?: Array<{ Id?: unknown }>;
      };
    }
  }

  return undefined;
};

export const resolveSelectedIds = (
  selectValue?: {
    selectedKey?: string | number | Array<string | number>;
    prefilledSelectedKey?: string | number | Array<string | number>;
    tableData?: Array<{ Id?: unknown }>;
  },
) => {
  const selectedKey = selectValue?.selectedKey;
  if (Array.isArray(selectedKey)) {
    const ids = selectedKey
      .map((item) => coerceNumber(item) ?? coerceString(item))
      .filter((item): item is number | string => item !== undefined);
    if (ids.length > 0) return ids;
  }

  const tableDataIds = (selectValue?.tableData ?? [])
    .map((item) => coerceNumber(item?.Id) ?? coerceString(item?.Id))
    .filter((item): item is number | string => item !== undefined);

  return tableDataIds;
};

export const resolveAddedSelectedIds = (
  selectValue?: {
    selectedKey?: string | number | Array<string | number>;
    prefilledSelectedKey?: string | number | Array<string | number>;
    tableData?: Array<{ Id?: unknown }>;
  },
) => {
  const selectedIds = resolveSelectedIds(selectValue);
  const prefilledIds = new Set(
    resolveSelectedIds({
      selectedKey: selectValue?.prefilledSelectedKey,
      tableData: [],
    }).map((item) => String(item)),
  );

  return selectedIds.filter((item) => !prefilledIds.has(String(item)));
};

export const resolveDateRange = (value: unknown) => {
  if (!Array.isArray(value)) return { startDate: undefined, endDate: undefined };
  return {
    startDate: coerceString(value[0]),
    endDate: coerceString(value[1]),
  };
};

export const resolveUrlListItems = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const type = coerceString(get(item, "type"))?.toUpperCase();
      return {
        title: coerceString(get(item, "title")) ?? "",
        url:
          coerceString(
            getFirstDefined([
              type === "FILE" ? get(item, "fileUrl") : undefined,
              type === "URL" ? get(item, "data") : undefined,
              get(item, "url"),
              get(item, "fileUrl"),
              get(item, "data"),
            ])
          ) ?? "",
      };
    })
    .filter((item) => item.title || item.url);
};

export const unwrapResponseRows = (response: unknown): unknown[] => {
  const rows = get(response as object, "data", response);
  return Array.isArray(rows) ? rows : [];
};

export const findLookupId = (rows: unknown[], rawValue: unknown): number | string | undefined => {
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

  return getFirstDefined([matched?.Id, matched?.id]) as number | string | undefined;
};

export const findLanguageId = (
  languages: LanguageOption[],
  value: unknown,
): number | string | undefined => {
  const normalizedValue = getFirstArrayItem(value);
  const numericValue = coerceNumber(normalizedValue);
  if (numericValue !== undefined) return numericValue;

  const normalized = coerceString(normalizedValue)?.toLowerCase();
  if (!normalized) return undefined;

  const matched = languages.find((option) =>
    [option.nameEn, option.nameAr, option.code, option.alpha2Code, option.alpha3Code]
      .filter(Boolean)
      .some((item) => String(item).trim().toLowerCase() === normalized),
  );

  return matched?.id ?? coerceString(normalizedValue);
};

const normalizeLanguageValues = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const normalized = coerceString(value);
  return normalized
    ? normalized
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
};

export const resolveLanguageIds = (
  languages: LanguageOption[],
  value: unknown,
): number[] => {
  return normalizeLanguageValues(value)
    .map((item) => {
      const numericValue = coerceNumber(item);
      if (numericValue !== undefined) return numericValue;

      const normalized = coerceString(item)?.toLowerCase();
      if (!normalized) return undefined;

      const matched = languages.find((option) =>
        [
          option.nameEn,
          option.NameEn,
          option.nameAr,
          option.NameAr,
          option.label,
          option.code,
          option.alpha2Code,
          option.alpha3Code,
        ]
          .filter(Boolean)
          .some((candidate) => String(candidate).trim().toLowerCase() === normalized),
      );

      return coerceNumber(matched?.id ?? matched?.Id ?? matched?.value);
    })
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item));
};

const PUBLICATION_LANGUAGE_VALIDATION_KEY_PREFIX =
  "mediaLicensePage.publicationLanguage.";
type PublicationLanguageValidationValue =
  | "invalidSelection"
  | "optionsUnavailable";
type PublicationLanguageValidationKey =
  `${typeof PUBLICATION_LANGUAGE_VALIDATION_KEY_PREFIX}${PublicationLanguageValidationValue}`;
const buildPublicationLanguageValidationKey = (
  value: PublicationLanguageValidationValue,
): PublicationLanguageValidationKey =>
  `${PUBLICATION_LANGUAGE_VALIDATION_KEY_PREFIX}${value}`;

class PublicationLanguageValidationError extends Error {
  readonly messageKey: PublicationLanguageValidationKey;

  constructor(messageKey: PublicationLanguageValidationKey) {
    super(messageKey);
    this.name = "PublicationLanguageValidationError";
    this.messageKey = messageKey;
  }
}

export const getPublicationLanguageValidationKey = (
  error: unknown,
): PublicationLanguageValidationKey | undefined => {
  return error instanceof PublicationLanguageValidationError
    ? error.messageKey
    : undefined;
};

export const resolveStrictLanguageId = (
  languages: LanguageOption[],
  value: unknown,
  fieldName: string,
): number => {
  const normalizedValue = getFirstArrayItem(value);
  const numericValue = coerceNumber(normalizedValue);
  const normalizedName = coerceString(normalizedValue)?.toLowerCase();
  const matched = languages.find((option) => {
    const optionId = coerceNumber(option.id ?? option.Id ?? option.value);
    if (numericValue !== undefined && optionId === numericValue) return true;

    return Boolean(
      normalizedName &&
        [option.nameEn, option.NameEn, option.nameAr, option.NameAr]
          .filter(Boolean)
          .some((candidate) => String(candidate).trim().toLowerCase() === normalizedName),
    );
  });
  const languageId = coerceNumber(matched?.id ?? matched?.Id ?? matched?.value);

  if (languageId === undefined) {
    console.error(`Invalid publication language selection for ${fieldName}.`);
    throw new PublicationLanguageValidationError(
      buildPublicationLanguageValidationKey("invalidSelection"),
    );
  }

  return languageId;
};

export const resolveOptionalStrictLanguageId = (
  languages: LanguageOption[],
  value: unknown,
  fieldName: string,
): number | undefined => {
  return isFilledValue(getFirstArrayItem(value))
    ? resolveStrictLanguageId(languages, value, fieldName)
    : undefined;
};

export const loadPublicationLanguageOptions = async (): Promise<
  LanguageOption[]
> => {
  try {
    const languages = unwrapResponseRows(await getLanguages()) as LanguageOption[];
    if (languages.length > 0) return languages;
  } catch {
    // The safe validation error below is shared by every publication flow.
  }

  throw new PublicationLanguageValidationError(
    buildPublicationLanguageValidationKey("optionsUnavailable"),
  );
};

export const normalizePublicationLanguageFormilyList = <
  T extends { formData?: string | null },
>(
  formilyList: T[],
  languages: LanguageOption[],
): T[] => {
  const normalizeMaterials = (rows: unknown) =>
    Array.isArray(rows)
      ? rows.map((row: Record<string, unknown>) => ({
          ...row,
          language: resolveStrictLanguageId(
            languages,
            get(row, "language"),
            "Material language",
          ),
        }))
      : rows;

  return formilyList.map((step) => {
    if (!step.formData) return step;

    const parsedFormData = JSON.parse(step.formData);
    const formValues = { ...(parsedFormData.formValues || {}) };
    const paths = collectPublicationLanguageListPaths(parsedFormData.schema);

    paths.materialListPaths.forEach((path) => {
      const materialList = get(formValues, path);
      if (Array.isArray(materialList)) {
        set(formValues, path, normalizeMaterials(materialList));
      }
    });

    paths.bookListPaths.forEach((path) => {
      const directListPath = path.endsWith(".bookList")
        ? path.slice(0, -".bookList".length)
        : path;
      const nestedBookList = get(formValues, path);
      const directBookList = get(formValues, directListPath);
      const bookList = Array.isArray(nestedBookList)
        ? nestedBookList
        : directBookList;
      const targetPath = Array.isArray(nestedBookList)
        ? path
        : directListPath;
      if (Array.isArray(bookList)) {
        set(
          formValues,
          targetPath,
          bookList.map((book: Record<string, unknown>) => {
            const language2 = resolveOptionalStrictLanguageId(
              languages,
              get(book, "language2"),
              "Book language2",
            );
            const normalizedBook: Record<string, unknown> = {
              ...book,
              language1: resolveStrictLanguageId(
                languages,
                get(book, "language1"),
                "Book language1",
              ),
            };
            if (language2 === undefined) {
              delete normalizedBook.language2;
            } else {
              normalizedBook.language2 = language2;
            }
            return normalizedBook;
          }),
        );
      }
    });

    return {
      ...step,
      formData: JSON.stringify({ ...parsedFormData, formValues }),
    };
  });
};

export const normalizePublicationLanguageSubmission = async <
  T extends { formData?: string | null },
>(
  formilyList: T[],
): Promise<T[]> => {
  const hasLanguageLists = formilyList.some((step) => {
    if (!step.formData) return false;
    const paths = collectPublicationLanguageListPaths(
      JSON.parse(step.formData).schema,
    );
    return paths.materialListPaths.length > 0 || paths.bookListPaths.length > 0;
  });
  if (!hasLanguageLists) {
    return formilyList;
  }

  const languages = await loadPublicationLanguageOptions();
  return normalizePublicationLanguageFormilyList(formilyList, languages);
};

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

export const resolveCountryId = (
  rawValue: unknown,
  nationalityList: NationalityInfo[],
): number | string | undefined => {
  const normalizedValue = getFirstArrayItem(rawValue);
  if (normalizedValue === undefined || normalizedValue === null) return undefined;

  const asNumber = coerceNumber(normalizedValue);
  if (asNumber !== undefined) {
    const byInternalId = nationalityList.find((item) => item.id === asNumber);
    if (byInternalId) return byInternalId.numericCode;

    const byNumericCode = nationalityList.find((item) => item.numericCode === asNumber);
    if (byNumericCode) return byNumericCode.numericCode;

    return asNumber;
  }

  const normalized = coerceString(normalizedValue)?.toUpperCase();
  if (!normalized) return undefined;

  const byIso2 = nationalityList.find((item) => item.isocode2?.toUpperCase() === normalized);
  if (byIso2) return byIso2.numericCode;

  const byIso3 = nationalityList.find((item) => item.isocode3?.toUpperCase() === normalized);
  if (byIso3) return byIso3.numericCode;

  const byName = nationalityList.find((item) =>
    [item.nameEn, item.nameAr, item.fullNameEn, item.fullNameAr]
      .filter(Boolean)
      .some((name) => String(name).trim().toUpperCase() === normalized),
  );
  if (byName) return byName.numericCode;

  const digitsOnly = normalizeDigits(normalized);
  if (!digitsOnly) return coerceString(normalizedValue);

  return coerceNumber(digitsOnly) ?? coerceString(normalizedValue);
};

export const resolveArtistWorkTypeMaterialTypeId = (
  formValuesList: FormValues[],
  fallback?: number,
) => {
  const rawValue = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "materialTypeId"),
      get(formValues, "mediaMaterialTypeId"),
      get(formValues, "moviePackageForm.materialTypeId"),
      get(formValues, "FilmScreeningForm.materialTypeId"),
      get(formValues, "Film Screening Form.materialTypeId"),
      get(formValues, "FilmRe-screeningForm.materialTypeId"),
      get(formValues, "Film Re-screening Form.materialTypeId"),
      get(formValues, "FilmRescreeningForm.materialTypeId"),
      get(formValues, "GameDistributionForm.materialTypeId"),
      get(formValues, "Game Distribution Form.materialTypeId"),
    ]),
  );

  return coerceNumber(rawValue) ?? fallback;
};
