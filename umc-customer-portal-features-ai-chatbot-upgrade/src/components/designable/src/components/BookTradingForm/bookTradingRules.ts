import type { RegulateEntryBookOption } from "../../../../../services/services";

export type RegulateEntryBookPrefill = {
  BookTitle?: string;
  AuthorName?: string;
  NationalDepositoryNo?: string;
  ISBN?: string;
  PrintYear?: string;
  VersionNumber?: string;
  Language?: Array<string | number>;
  SubjectCategory?: number;
  SubjectSubCategory?: number;
  DistributorAgency?: string;
  AgeClassification?: number;
  NumberOfCopies?: string;
};

export type RegulateEntryBookSelectOption = RegulateEntryBookOption & {
  label: string;
  value: string | number;
  disabled?: boolean;
};

type DisplayOption = {
  label: string;
  value: string | number;
};

const firstDefined = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null);

const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  const normalizedValue = String(value).trim();
  return normalizedValue || undefined;
};

const toOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : undefined;
};

const toPositiveNumber = (value: unknown) => {
  const normalizedValue = toOptionalNumber(value);
  return normalizedValue !== undefined && normalizedValue > 0
    ? normalizedValue
    : undefined;
};

const toLanguageIds = (value: unknown) => {
  if (typeof value === "string") {
    const languageIds = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return languageIds.length > 0 ? languageIds : undefined;
  }

  if (!Array.isArray(value)) return undefined;

  const languageIds = value.filter(
    (languageId): languageId is string | number =>
      languageId !== undefined && languageId !== null && languageId !== "",
  );

  return languageIds.length > 0 ? languageIds : undefined;
};

export const buildRegulateEntryBookPrefill = (
  book?: Partial<RegulateEntryBookOption>,
  ageClassificationOptions: DisplayOption[] = [],
): RegulateEntryBookPrefill => {
  if (!book) return {};

  const prefill: RegulateEntryBookPrefill = {};
  const values: Array<[keyof RegulateEntryBookPrefill, unknown]> = [
    ["BookTitle", book.title],
    ["AuthorName", book.authorName],
    [
      "NationalDepositoryNo",
      firstDefined(book.nationalDepositoryNo, book.NationalDepositoryNo),
    ],
    ["ISBN", book.isbn],
    ["PrintYear", firstDefined(book.printYear, book.PrintYear)],
    ["VersionNumber", firstDefined(book.versionNumber, book.VersionNumber)],
    [
      "DistributorAgency",
      firstDefined(book.distributorAgency, book.DistributorAgency),
    ],
    ["NumberOfCopies", book.numberOfCopies],
  ];

  values.forEach(([key, value]) => {
    const normalizedValue = toOptionalString(value);
    if (normalizedValue) {
      (prefill as Record<string, unknown>)[key] = normalizedValue;
    }
  });

  const languageIds = toLanguageIds(book.languageId);
  if (languageIds) {
    prefill.Language = languageIds;
  }

  const subjectCategory = toOptionalNumber(
    firstDefined(
      book.subjectCategoryId,
      book.subjectCategory,
      book.SubjectCategory,
    ),
  );
  if (subjectCategory !== undefined) {
    prefill.SubjectCategory = subjectCategory;
  }

  const subjectSubCategory = toOptionalNumber(
    firstDefined(
      book.subjectSubCategoryId,
      book.subjectSubCategory,
      book.SubjectSubCategory,
    ),
  );
  if (subjectSubCategory !== undefined) {
    prefill.SubjectSubCategory = subjectSubCategory;
  }

  const ageClassification = firstDefined(
    book.ageClassificationId,
    book.ageClassification,
    book.AgeClassification,
  );
  if (
    toPositiveNumber(ageClassification) !== undefined &&
    (ageClassificationOptions.length === 0 ||
      hasDisplayableAgeClassification(
        ageClassification,
        ageClassificationOptions,
      ))
  ) {
    prefill.AgeClassification = Number(ageClassification);
  }

  return prefill;
};

export const getRegulateEntryBookOptionValue = (
  book: RegulateEntryBookOption,
) => toOptionalString(book.isbn);

export const buildRegulateEntryBookOptions = (
  books: RegulateEntryBookOption[],
): RegulateEntryBookSelectOption[] =>
  books.flatMap((book) => {
    if (book.isApproved === false || book.isApproved === 0) {
      return [];
    }

    const value = getRegulateEntryBookOptionValue(book);
    if (value === undefined || value === null || value === "") {
      return [];
    }

    return [
      {
        ...book,
        label:
          toOptionalString(book.title) ||
          toOptionalString(book.isbn) ||
          String(value),
        value,
      },
    ];
  });

export const hasDisplayableAgeClassification = (
  value: unknown,
  options: DisplayOption[],
) => {
  const ageClassificationId = toPositiveNumber(value);
  if (ageClassificationId === undefined) return false;

  return options.some(
    (option) =>
      Number(option.value) === ageClassificationId &&
      Boolean(toOptionalString(option.label)),
  );
};

/**
 * True when the chosen book is already Approved in the content library.
 *
 * Such a book carries the classification its content reviewer already decided, and its Regulate
 * Entry 204 is auto-approved straight off the library with no applicant or reviewer step in
 * between, so the Age Classification row is not the applicant's to fill. Books still awaiting
 * review and books with no library record at all both arrive as `isApproved == null` and stay
 * classifiable. Rejected books never reach this point — `buildRegulateEntryBookOptions` drops them.
 */
export const isLibraryApprovedBook = (
  book: Pick<RegulateEntryBookOption, "isApproved"> | undefined,
) => book?.isApproved === true || book?.isApproved === 1;

export const shouldDisplayAgeClassification = (
  serviceCode: string | number | undefined,
  isRegulateEntry: boolean,
  defaultVisibility: boolean,
) => !(Number(serviceCode) === 204 && isRegulateEntry) && defaultVisibility;

export const hasDistributorAgency = (value: unknown) =>
  Boolean(toOptionalString(value));
