// Imported directly (not through the MobileNumberInput package index) so this
// module stays free of React/alias imports and keeps running under the
// esbuild+node test harness. It is the same library the input component's
// form rule uses, so field-level and list-level validity cannot disagree.
import { isValidPhoneNumber } from "libphonenumber-js";

export type DataListRuleRecord = Record<string, unknown>;

export type DataListRuleOptions = {
  minItems?: unknown;
  maxItems?: unknown;
  uniqueLanguageRequired?: boolean;
  traineeRulesEnabled?: boolean;
};

/** Spec 7.1: Self-Monitor Program requires at least two trainees. */
export const TRAINEE_DEFAULT_MIN_ITEMS = 2;

export type DataListRuleViolation =
  | { type: "maxItems"; maxItems: number }
  | { type: "duplicateLanguage" }
  | { type: "minItems"; minItems: number }
  | { type: "duplicateEmiratesId" }
  | { type: "duplicateEmail" }
  | { type: "duplicateMobile" };

const normalizeLanguageId = (value: unknown) => {
  if (typeof value !== "number" && typeof value !== "string") {
    return "";
  }
  return String(value).trim();
};

const normalizeLanguageName = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const normalizePublicationName = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const getPublicationNameComparisonKey = (value: unknown) =>
  normalizePublicationName(value).toLowerCase();

export const isDuplicateDataListPublicationName = (
  rows: DataListRuleRecord[],
  candidate: DataListRuleRecord,
  excludedIndex?: number | null,
) => {
  const candidateKey = getPublicationNameComparisonKey(
    candidate.suggested_name,
  );
  if (!candidateKey) return false;

  return rows.some(
    (row, index) =>
      index !== excludedIndex &&
      getPublicationNameComparisonKey(row.suggested_name) === candidateKey,
  );
};

export const isPublicationNameServiceCode = (value: unknown) =>
  String(value ?? "").trim() === "1201";

const toPositiveInteger = (value: unknown) => {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0
    ? normalized
    : undefined;
};

export interface PublicationNameCheckExclusionContext {
  isLifecycleAction: boolean;
  /** Service the form is currently running as (route param wins over the store). */
  currentServiceCode?: unknown;
  /**
   * Identifiers from a lifecycle source that was validated against the current
   * page identity: either the route state that opened this flow, or an
   * application detail whose owning applicationId matches the loaded one.
   * A persisted/stale store value must never reach these fields.
   */
  expectedSourceApplicationId?: unknown;
  expectedSourceMediaLicenseId?: unknown;
  /**
   * Identifiers echoed by the lifecycle activity lookup. Optional: only a
   * subset of services performs that lookup (e.g. 1201 never does), so their
   * absence must not disable the exclusion. When present they are treated as a
   * cross-check and any mismatch discards the exclusion entirely.
   */
  targetServiceCode?: unknown;
  sourceApplicationId?: unknown;
  sourceMediaLicenseId?: unknown;
}

export interface PublicationNameCheckExclusions {
  excludeApplicationId?: number;
  excludeMediaLicenseId?: number;
}

export const resolvePublicationNameCheckExclusions = ({
  isLifecycleAction,
  currentServiceCode,
  expectedSourceApplicationId,
  expectedSourceMediaLicenseId,
  targetServiceCode,
  sourceApplicationId,
  sourceMediaLicenseId,
}: PublicationNameCheckExclusionContext): PublicationNameCheckExclusions => {
  if (!isLifecycleAction) return {};

  const normalizedCurrentServiceCode = String(currentServiceCode ?? "").trim();
  if (!isPublicationNameServiceCode(normalizedCurrentServiceCode)) return {};

  // The validated lifecycle source is the only anchor allowed to open an
  // exclusion; without it the check must stay fully strict.
  const excludeApplicationId = toPositiveInteger(expectedSourceApplicationId);
  if (!excludeApplicationId) return {};

  const normalizedTargetServiceCode = String(targetServiceCode ?? "").trim();
  const activitySourceApplicationId = toPositiveInteger(sourceApplicationId);
  const activitySourceMediaLicenseId = toPositiveInteger(sourceMediaLicenseId);
  const hasActivityContext = Boolean(
    normalizedTargetServiceCode ||
      activitySourceApplicationId ||
      activitySourceMediaLicenseId,
  );

  if (hasActivityContext) {
    if (
      normalizedTargetServiceCode &&
      normalizedTargetServiceCode !== normalizedCurrentServiceCode
    ) {
      return {};
    }
    if (
      activitySourceApplicationId &&
      activitySourceApplicationId !== excludeApplicationId
    ) {
      return {};
    }
  }

  const excludeMediaLicenseId =
    activitySourceMediaLicenseId ??
    toPositiveInteger(expectedSourceMediaLicenseId);

  return {
    excludeApplicationId,
    ...(excludeMediaLicenseId ? { excludeMediaLicenseId } : {}),
  };
};

export const normalizeDataListMaxItems = (value: unknown) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value >= 1
    ? value
    : undefined;

export const normalizeDataListMinItems = (value: unknown) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value >= 1
    ? value
    : undefined;

export const resolveDataListMinItems = ({
  minItems,
  maxItems,
  dataSource,
  required,
  serviceCode,
  uniqueLanguageRequired,
}: {
  minItems?: unknown;
  maxItems?: unknown;
  dataSource?: string;
  required?: boolean;
  serviceCode?: number | string;
  uniqueLanguageRequired?: boolean;
}) => {
  if (dataSource !== "languages_name_list") {
    return undefined;
  }

  const normalizedMinItems = normalizeDataListMinItems(minItems);
  if (normalizedMinItems !== undefined) {
    return normalizedMinItems;
  }

  return String(serviceCode ?? "").trim() === "1203" &&
    required &&
    normalizeDataListMaxItems(maxItems) === 2 &&
    uniqueLanguageRequired === true
    ? 1
    : undefined;
};

export const hasReachedDataListMaxItems = (
  itemCount: number,
  maxItems: unknown,
) => {
  const normalizedMaxItems = normalizeDataListMaxItems(maxItems);
  return (
    normalizedMaxItems !== undefined && itemCount >= normalizedMaxItems
  );
};

export const isSameDataListLanguage = (
  left: DataListRuleRecord,
  right: DataListRuleRecord,
) => {
  const leftId = normalizeLanguageId(left.languageId);
  const rightId = normalizeLanguageId(right.languageId);

  if (leftId && rightId) {
    return leftId === rightId;
  }

  const leftName = normalizeLanguageName(left.language);
  const rightName = normalizeLanguageName(right.language);
  return Boolean(leftName && rightName && leftName === rightName);
};

export const isDuplicateDataListLanguage = (
  rows: DataListRuleRecord[],
  candidate: DataListRuleRecord,
  excludedIndex?: number | null,
) =>
  rows.some(
    (row, index) =>
      index !== excludedIndex && isSameDataListLanguage(row, candidate),
  );

export const createDataListLanguageCandidate = ({
  value,
  label,
  saveLabel,
}: {
  value: unknown;
  label?: unknown;
  saveLabel?: unknown;
}): DataListRuleRecord => ({
  language:
    typeof saveLabel === "string" && saveLabel.trim()
      ? saveLabel
      : label,
  languageId: value,
});

export const getDataListLanguageEditFallback = (
  record: DataListRuleRecord,
): DataListRuleRecord => {
  const storedLanguageId = record.languageId;
  if (
    (typeof storedLanguageId === "number" ||
      typeof storedLanguageId === "string") &&
    String(storedLanguageId).trim()
  ) {
    const numericLanguageId = Number(storedLanguageId);
    const languageId = Number.isFinite(numericLanguageId)
      ? numericLanguageId
      : storedLanguageId;
    return { language: languageId, languageId };
  }

  const storedLanguage = record.language;
  return (typeof storedLanguage === "number" ||
    typeof storedLanguage === "string") &&
    String(storedLanguage).trim()
    ? { language: storedLanguage }
    : {};
};

export const getDataListStoredLanguageFields = (
  record: DataListRuleRecord,
): DataListRuleRecord => {
  const storedFields: DataListRuleRecord = {};
  if (
    (typeof record.language === "number" ||
      typeof record.language === "string") &&
    String(record.language).trim()
  ) {
    storedFields.language = record.language;
  }
  if (
    (typeof record.languageId === "number" ||
      typeof record.languageId === "string") &&
    String(record.languageId).trim()
  ) {
    storedFields.languageId = record.languageId;
  }
  return storedFields;
};

const hasDuplicateDataListLanguages = (rows: DataListRuleRecord[]) =>
  rows.some((row, index) =>
    isDuplicateDataListLanguage(rows, row, index),
  );

// ---- Stable row identity --------------------------------------------------

/**
 * Client-side stable row id.
 *
 * The Language & Name List rows carry no server-side primary key, and
 * `languageId` / `suggested_name` both change while editing, so a snapshot diff
 * cannot tell "row edited in place" apart from "row deleted + another row
 * added" — both produce the same before/after arrays. This key is written into
 * the stored form values so the modify change summary can pair rows by identity
 * instead of guessing from list position.
 *
 * Rows loaded without an id are seeded positionally (`pos:<index>`), which is
 * exactly the identity the untouched "before" snapshot implies, so legacy
 * applications keep working. Rows created through Add get a fresh `new:` id
 * that can never collide with a positional one.
 */
export const DATA_LIST_ROW_ID_KEY = "__rowId";

/** Only lists whose changes are reported row-by-row need stable ids. */
export const dataListUsesRowIds = (dataSource?: string) =>
  dataSource === "languages_name_list";

let dataListRowIdCounter = 0;

export const createDataListRowId = () =>
  `new:${Date.now().toString(36)}-${(dataListRowIdCounter += 1)}`;

export const getDataListRowId = (record: DataListRuleRecord): string => {
  const rowId = record[DATA_LIST_ROW_ID_KEY];
  return typeof rowId === "string" || typeof rowId === "number"
    ? String(rowId).trim()
    : "";
};

/**
 * Seeds a stable id on every row that lacks one. Returns the original array
 * when nothing changed so callers can skip a redundant form update.
 */
export const ensureDataListRowIds = <T extends DataListRuleRecord>(
  rows: T[],
  dataSource?: string,
): T[] => {
  if (!dataListUsesRowIds(dataSource) || !Array.isArray(rows)) {
    return rows;
  }

  let changed = false;
  const next = rows.map((row, index) => {
    if (!row || typeof row !== "object" || getDataListRowId(row)) {
      return row;
    }
    changed = true;
    return { ...row, [DATA_LIST_ROW_ID_KEY]: `pos:${index}` } as T;
  });

  return changed ? next : rows;
};

// ---- Trainee (List of Trainees) list-level rules --------------------------

/**
 * Single source of truth for the trainee field formats.
 *
 * DataList.tsx imports these for its per-field Form rules, so the entry-time
 * checks and the list-level `isValidTraineeRecord` below can never drift apart
 * — a mismatch would silently drop a row from the minItems count (§7.1) while
 * showing no field-level error.
 *
 * Emirates ID uses the dashed form because the field renders EmiratesIdInput,
 * which emits "784-1990-1234567-1" (same as MoviePackageFormField). The
 * undashed EMIRATES_ID_REGEX exported by IDSelector/idSelectorUtils.ts targets
 * raw-digit inputs and must not be used here.
 *
 * Mobile numbers are deliberately absent: they are validated by
 * createMobileNumberFormRule / isValidPhoneNumber, which share libphonenumber-js.
 */
export const EMIRATES_ID_REGEX = /^784-\d{4}-\d{7}-\d$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;
export const FULL_NAME_MAX_LENGTH = 200;

const normalizeTraineeText = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

// Compare Emirates ID irrespective of dash formatting (digits only).
const normalizeEmiratesIdKey = (value: unknown) =>
  normalizeTraineeText(value).replace(/\D/g, "");

const normalizeEmailKey = (value: unknown) =>
  normalizeTraineeText(value).toLowerCase();

const normalizeMobileKey = (value: unknown) =>
  normalizeTraineeText(value).replace(/\D/g, "");

/**
 * A trainee row is "valid" when all four required fields are present and pass
 * their format checks. Only valid rows count toward the minItems rule (§7.1).
 */
export const isValidTraineeRecord = (row: DataListRuleRecord) => {
  const fullName = normalizeTraineeText(row.fullName);
  const emiratesId = normalizeTraineeText(row.emiratesIdNumber);
  const mobile = normalizeTraineeText(row.mobileNumber);
  const email = normalizeTraineeText(row.email);

  if (!fullName || fullName.length > FULL_NAME_MAX_LENGTH) return false;
  if (!EMIRATES_ID_REGEX.test(emiratesId)) return false;
  // Any country is accepted; the dial-code-only intermediate value the input
  // stores while the local number is empty (e.g. "+971") fails this check.
  if (!isValidPhoneNumber(mobile)) return false;
  if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(email)) {
    return false;
  }
  return true;
};

export const countValidTrainees = (rows: DataListRuleRecord[]) =>
  rows.reduce((count, row) => (isValidTraineeRecord(row) ? count + 1 : count), 0);

/**
 * Duplicate check for a single field key, ignoring blank values and the
 * optionally excluded row (the row being edited).
 */
const isDuplicateTraineeField = (
  rows: DataListRuleRecord[],
  candidate: DataListRuleRecord,
  normalize: (value: unknown) => string,
  field: keyof DataListRuleRecord,
  excludedIndex?: number | null,
) => {
  const candidateKey = normalize(candidate[field]);
  if (!candidateKey) return false;
  return rows.some(
    (row, index) =>
      index !== excludedIndex && normalize(row[field]) === candidateKey,
  );
};

export const isDuplicateTraineeEmiratesId = (
  rows: DataListRuleRecord[],
  candidate: DataListRuleRecord,
  excludedIndex?: number | null,
) =>
  isDuplicateTraineeField(
    rows,
    candidate,
    normalizeEmiratesIdKey,
    "emiratesIdNumber",
    excludedIndex,
  );

export const isDuplicateTraineeEmail = (
  rows: DataListRuleRecord[],
  candidate: DataListRuleRecord,
  excludedIndex?: number | null,
) =>
  isDuplicateTraineeField(
    rows,
    candidate,
    normalizeEmailKey,
    "email",
    excludedIndex,
  );

export const isDuplicateTraineeMobile = (
  rows: DataListRuleRecord[],
  candidate: DataListRuleRecord,
  excludedIndex?: number | null,
) =>
  isDuplicateTraineeField(
    rows,
    candidate,
    normalizeMobileKey,
    "mobileNumber",
    excludedIndex,
  );

const findTraineeDuplicateViolation = (
  rows: DataListRuleRecord[],
): DataListRuleViolation | undefined => {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (isDuplicateTraineeEmiratesId(rows, row, index)) {
      return { type: "duplicateEmiratesId" };
    }
  }
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (isDuplicateTraineeEmail(rows, row, index)) {
      return { type: "duplicateEmail" };
    }
  }
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (isDuplicateTraineeMobile(rows, row, index)) {
      return { type: "duplicateMobile" };
    }
  }
  return undefined;
};

export const getDataListRuleViolation = (
  value: unknown,
  options: DataListRuleOptions,
): DataListRuleViolation | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const maxItems = normalizeDataListMaxItems(options.maxItems);
  if (maxItems !== undefined && value.length > maxItems) {
    return { type: "maxItems", maxItems };
  }

  const minItems = normalizeDataListMinItems(options.minItems);
  if (minItems !== undefined && value.length < minItems) {
    return { type: "minItems", minItems };
  }

  if (
    options.uniqueLanguageRequired === true &&
    hasDuplicateDataListLanguages(value)
  ) {
    return { type: "duplicateLanguage" };
  }

  if (options.traineeRulesEnabled === true) {
    const duplicate = findTraineeDuplicateViolation(
      value as DataListRuleRecord[],
    );
    if (duplicate) {
      return duplicate;
    }

    // Spec 7.1 / AC-09: Self-Monitor requires at least two trainees. Services
    // published before the designer exposed a Min Items setter carry no
    // minItems in their schema, so fall back to the spec default instead of
    // skipping the check entirely.
    const minItems =
      normalizeDataListMinItems(options.minItems) ?? TRAINEE_DEFAULT_MIN_ITEMS;
    if (countValidTrainees(value as DataListRuleRecord[]) < minItems) {
      return { type: "minItems", minItems };
    }
  }

  return undefined;
};
