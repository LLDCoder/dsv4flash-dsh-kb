import { parseDigits } from "libphonenumber-js";
import {
  DATA_LIST_ROW_ID_KEY,
  getDataListRowId,
} from "../../components/designable/src/components/DataList/dataListRules";

export type ModifyChangeType = "ADDED" | "MODIFIED" | "DELETED";

export interface ModifyFormStep {
  stepNameEn?: string;
  stepNameAr?: string;
  formData?: string | null;
}

export interface ModifyChangeItem {
  kind: "field" | "list";
  component?: string;
  ownerComponent?: string;
  changeType: ModifyChangeType;
  fieldKey: string;
  labelEn: string;
  labelAr: string;
  beforeValue: unknown;
  afterValue: unknown;
  valueOptions?: ModifyChangeValueOption[];
  valueSource?: ModifyChangeValueSource;
}

export interface ModifyChangeValueOption {
  value: string | number;
  labelEn: string;
  labelAr: string;
}

export type ModifyChangeValueSource =
  | { type: "lookup"; source: string }
  | { type: "nationality" }
  | { type: "emirate" }
  | { type: "region" }
  | { type: "area" };

export interface ModifyChangeSection {
  sectionNameEn: string;
  sectionNameAr: string;
  changes: ModifyChangeItem[];
}

export interface ModifyLanguageSnapshotRow {
  key: string;
  language: string;
  name: string;
  changeType?: ModifyChangeType;
}

export interface ModifyLanguageSnapshot {
  sectionNameEn: string;
  sectionNameAr: string;
  fieldKey: string;
  beforeRows: ModifyLanguageSnapshotRow[];
  afterRows: ModifyLanguageSnapshotRow[];
  deletedRows: ModifyLanguageSnapshotRow[];
}

export const MODIFY_CHANGE_SUMMARY_SERVICE_CODES = new Set([
  "803",
  "903",
  "1203",
  "80011",
  "80012",
]);

interface BuildModifyChangeSummaryOptions {
  before: ModifyFormStep[];
  after: ModifyFormStep[];
  profileBefore?: Record<string, unknown>;
}

interface ParsedStep {
  schema: Record<string, unknown>;
  formValues: Record<string, unknown>;
}

interface SchemaField {
  key: string;
  component: string;
  node: Record<string, unknown>;
}

const PROFILE_FIELD_LABELS: Record<string, { en: string; ar: string }> = {
  hasTradeLicense: {
    en: "Do you have a Trade License?",
    ar: "هل لديك رخصة تجارية؟",
  },
  commercialLicenseNumber: {
    en: "Trade License Number",
    ar: "رقم الرخصة التجارية",
  },
  reserveTradeNumber: {
    en: "Reserve Trade Number",
    ar: "رقم حجز الاسم التجاري",
  },
  licenseExpiryDate: {
    en: "License Expiry Date",
    ar: "تاريخ انتهاء الرخصة",
  },
  commercialLicense: {
    en: "Commercial License",
    ar: "الرخصة التجارية",
  },
  reserveTradeName: {
    en: "Reserve Trade Name",
    ar: "حجز الاسم التجاري",
  },
  establishmentSubTypes: {
    en: "Establishment Sub-types",
    ar: "الأنواع الفرعية للمنشأة",
  },
  workEmail: { en: "Work Email", ar: "البريد الإلكتروني للعمل" },
  establishmentNameArabic: {
    en: "Establishment Name in Arabic",
    ar: "اسم المنشأة باللغة العربية",
  },
  establishmentNameEnglish: {
    en: "Establishment Name in English",
    ar: "اسم المنشأة باللغة الإنجليزية",
  },
  licensingAuthority: {
    en: "Licensing Authority",
    ar: "جهة الترخيص",
  },
  phoneNumber: { en: "Phone Number", ar: "رقم الهاتف" },
  tenancyContractEndDate: {
    en: "Tenancy Contract End Date",
    ar: "تاريخ انتهاء عقد الإيجار",
  },
  tenancyContract: { en: "Tenancy Contract", ar: "عقد الإيجار" },
  memorandumOfAssociation: {
    en: "Memorandum of Association",
    ar: "عقد التأسيس",
  },
  powerOfAttorney: { en: "Power of Attorney", ar: "التوكيل" },
  emirate: { en: "Emirate", ar: "الإمارة" },
  establishmentEmirateName: { en: "Emirate", ar: "الإمارة" },
  addressPicker: { en: "Address Information", ar: "معلومات العنوان" },
};

const ID_SELECTOR_FIELD_LABELS: Record<
  string,
  { en: string; ar: string }
> = {
  type: { en: "Identification Type", ar: "نوع الهوية" },
  dateOfBirth: { en: "Date of Birth", ar: "تاريخ الميلاد" },
  emiratesId: { en: "Emirates ID", ar: "الهوية الإماراتية" },
  uid: { en: "UAE Unified Number (UID)", ar: "الرقم الموحد (UID)" },
  passportNumber: { en: "Passport Number", ar: "رقم جواز السفر" },
  passportType: { en: "Passport Type", ar: "نوع جواز السفر" },
  placeOfIssueEn: {
    en: "Place of Issue in English",
    ar: "مكان الإصدار بالإنجليزية",
  },
  placeOfIssueAr: {
    en: "Place of Issue in Arabic",
    ar: "مكان الإصدار بالعربية",
  },
  fullNameArabic: { en: "Full Name in Arabic", ar: "الاسم الكامل بالعربية" },
  fullNameEnglish: {
    en: "Full Name in English",
    ar: "الاسم الكامل بالإنجليزية",
  },
  nationality: { en: "Nationality", ar: "الجنسية" },
  gender: { en: "Gender", ar: "الجنس" },
  occupation: { en: "Occupation", ar: "المهنة" },
  emiratesIdexpiryDate: { en: "Expiry Date", ar: "تاريخ الانتهاء" },
  passportExpiryDate: {
    en: "Passport Expiry Date",
    ar: "تاريخ انتهاء جواز السفر",
  },
  visaExpiryDate: {
    en: "Visa Expiry Date",
    ar: "تاريخ انتهاء التأشيرة",
  },
  emirateId: { en: "Emirate", ar: "الإمارة" },
  regionId: { en: "Region", ar: "المنطقة" },
  areaId: { en: "Area", ar: "المنطقة" },
  street: { en: "Street", ar: "الشارع" },
  mobileNo: { en: "Mobile No.", ar: "رقم الهاتف المتحرك" },
  telephoneNo: { en: "Telephone No.", ar: "رقم الهاتف" },
  fax: { en: "Fax", ar: "الفاكس" },
  workNo: { en: "Work No.", ar: "رقم العمل" },
  areaCode: { en: "Area (Contact Area)", ar: "المنطقة (منطقة الاتصال)" },
  emailAddress: { en: "Email Address", ar: "البريد الإلكتروني" },
  PersonalPhoto: { en: "Personal Photo", ar: "الصورة الشخصية" },
  EmiratesID: { en: "Emirates ID", ar: "الهوية الإماراتية" },
  Passport: { en: "Passport", ar: "جواز السفر" },
  Visa: { en: "Visa", ar: "التأشيرة" },
  PassportScan: { en: "Passport Scan", ar: "صورة جواز السفر" },
};

const ADDRESS_FIELD_LABELS: Record<string, { en: string; ar: string }> = {
  emirateId: { en: "Emirate", ar: "الإمارة" },
  regionId: { en: "Region", ar: "المنطقة" },
  areaId: { en: "Area", ar: "المنطقة السكنية" },
  street: { en: "Street", ar: "الشارع" },
  latitude: { en: "Latitude", ar: "خط العرض" },
  longitude: { en: "Longitude", ar: "خط الطول" },
};

const ID_SELECTOR_FILE_KEYS = new Set([
  "PersonalPhoto",
  "EmiratesID",
  "Passport",
  "Visa",
  "PassportScan",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const normalizeMobileNumberFields = (
  values: Record<string, unknown>,
  fieldNames: {
    phoneNumber: string;
    countryCode: string;
    localNumber: string;
  },
): Record<string, unknown> => {
  const normalized = { ...values };
  const countryCode = String(normalized[fieldNames.countryCode] ?? "").trim();
  const localNumber = String(normalized[fieldNames.localNumber] ?? "").trim();

  if (countryCode && localNumber) {
    const countryCodeDigits = parseDigits(countryCode);
    const localNumberDigits = parseDigits(localNumber);
    if (countryCodeDigits && localNumberDigits) {
      normalized[fieldNames.phoneNumber] =
        `+${countryCodeDigits}${localNumberDigits}`;
    }
  }
  delete normalized[fieldNames.countryCode];
  delete normalized[fieldNames.localNumber];

  return normalized;
};

const PERSISTED_PHONE_NUMBER_FIELD_KEYS = new Set([
  "phonenumber",
  "phonenumbercountrycode",
  "phonenumberlocalnumber",
]);

const normalizePersistedPhoneFieldKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const isPersistedProfilePhoneField = (change: ModifyChangeItem) =>
  normalizePersistedPhoneFieldKey(change.component) === "profileform" &&
  PERSISTED_PHONE_NUMBER_FIELD_KEYS.has(
    normalizePersistedPhoneFieldKey(change.fieldKey),
  );

const combinePersistedPhoneNumber = (
  countryCode: unknown,
  localNumber: unknown,
) => {
  const countryCodeDigits = parseDigits(String(countryCode ?? ""));
  const localNumberDigits = parseDigits(String(localNumber ?? ""));

  if (countryCodeDigits && localNumberDigits) {
    return `+${countryCodeDigits}${localNumberDigits}`;
  }
  if (countryCodeDigits) return `+${countryCodeDigits}`;
  return localNumberDigits;
};

const getPersistedPhoneChangeType = (
  beforeValue: unknown,
  afterValue: unknown,
): ModifyChangeType => {
  const before = String(beforeValue ?? "").trim();
  const after = String(afterValue ?? "").trim();
  if (!before && after) return "ADDED";
  if (before && !after) return "DELETED";
  return "MODIFIED";
};

const normalizePersistedPhoneNumberChanges = (
  changes: ModifyChangeItem[],
): ModifyChangeItem[] => {
  const phoneChanges = changes.filter(isPersistedProfilePhoneField);
  const hasSplitFields = phoneChanges.some(
    (change) =>
      normalizePersistedPhoneFieldKey(change.fieldKey) !== "phonenumber",
  );
  if (!hasSplitFields) return changes;

  const fullNumberChange = phoneChanges.find(
    (change) =>
      normalizePersistedPhoneFieldKey(change.fieldKey) === "phonenumber",
  );
  const countryCodeChange = phoneChanges.find(
    (change) =>
      normalizePersistedPhoneFieldKey(change.fieldKey) ===
      "phonenumbercountrycode",
  );
  const localNumberChange = phoneChanges.find(
    (change) =>
      normalizePersistedPhoneFieldKey(change.fieldKey) ===
      "phonenumberlocalnumber",
  );
  const firstPhoneIndex = changes.findIndex(isPersistedProfilePhoneField);
  const baseChange =
    fullNumberChange ?? countryCodeChange ?? localNumberChange;
  if (!baseChange || firstPhoneIndex < 0) return changes;

  const beforeValue = fullNumberChange
    ? fullNumberChange.beforeValue
    : combinePersistedPhoneNumber(
        countryCodeChange?.beforeValue,
        localNumberChange?.beforeValue,
      );
  const afterValue = fullNumberChange
    ? fullNumberChange.afterValue
    : combinePersistedPhoneNumber(
        countryCodeChange?.afterValue,
        localNumberChange?.afterValue,
      );
  const normalizedChange: ModifyChangeItem = {
    ...baseChange,
    kind: "field",
    fieldKey: "phoneNumber",
    labelEn: PROFILE_FIELD_LABELS.phoneNumber.en,
    labelAr: PROFILE_FIELD_LABELS.phoneNumber.ar,
    beforeValue,
    afterValue,
    changeType: getPersistedPhoneChangeType(beforeValue, afterValue),
  };

  return changes.flatMap((change, index) => {
    if (!isPersistedProfilePhoneField(change)) {
      return [change];
    }
    return index === firstPhoneIndex ? [normalizedChange] : [];
  });
};

const parseStep = (step: ModifyFormStep | undefined): ParsedStep | null => {
  if (!step?.formData) return null;
  try {
    const parsed = JSON.parse(step.formData);
    if (!isRecord(parsed)) return null;
    return {
      schema: isRecord(parsed.schema) ? parsed.schema : {},
      formValues: isRecord(parsed.formValues) ? parsed.formValues : {},
    };
  } catch {
    return null;
  }
};

const parseRawStep = (
  step: ModifyFormStep | undefined,
): Record<string, unknown> | null => {
  if (!step?.formData) return null;
  try {
    const parsed = JSON.parse(step.formData);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parsePersistedChangeSection = (
  value: unknown,
): ModifyChangeSection | null => {
  if (!isRecord(value) || !Array.isArray(value.changes)) return null;
  const sectionNameEn = String(value.sectionNameEn ?? "").trim();
  const sectionNameAr = String(value.sectionNameAr ?? sectionNameEn).trim();
  const changes = value.changes.filter((change): change is ModifyChangeItem => {
    if (!isRecord(change)) return false;
    return (
      (change.kind === "field" || change.kind === "list") &&
      (change.changeType === "ADDED" ||
        change.changeType === "MODIFIED" ||
        change.changeType === "DELETED") &&
      typeof change.fieldKey === "string" &&
      typeof change.labelEn === "string" &&
      typeof change.labelAr === "string"
    );
  });

  if (!sectionNameEn || changes.length !== value.changes.length) return null;
  return {
    sectionNameEn,
    sectionNameAr,
    changes: normalizePersistedPhoneNumberChanges(changes),
  };
};

export const resolveSubmittedModifyChangeSummary = (
  forms: ModifyFormStep[],
): ModifyChangeSection[] => {
  let hasPersistedChangeSet = false;
  const persistedSections = forms.flatMap((step) => {
    const parsed = parseRawStep(step);
    if (!parsed || !("modifyChangeSet" in parsed)) return [];
    hasPersistedChangeSet = true;
    const section = parsePersistedChangeSection(parsed.modifyChangeSet);
    return section && section.changes.length > 0 ? [section] : [];
  });

  if (hasPersistedChangeSet) return persistedSections;

  const hasTrustedOriginalValues = forms.some((step) => {
    const parsed = parseRawStep(step);
    return isRecord(parsed?.modifyOriginalFormValues);
  });
  if (!hasTrustedOriginalValues) return [];

  const before = forms.map((step) => {
    const parsed = parseRawStep(step);
    if (!parsed || !isRecord(parsed.modifyOriginalFormValues)) return step;
    return {
      ...step,
      formData: JSON.stringify({
        ...parsed,
        formValues: parsed.modifyOriginalFormValues,
      }),
    };
  });
  return buildModifyChangeSummary({ before, after: forms });
};

const normalizeName = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase();

const stepIdentity = (step: ModifyFormStep): string =>
  `${normalizeName(step.stepNameEn)}|${normalizeName(step.stepNameAr)}`;

const collectSchemaFields = (
  node: unknown,
  propertyKey = "",
): SchemaField[] => {
  if (!isRecord(node)) return [];
  const component = String(node["x-component"] ?? "");
  const current = component && propertyKey
    ? [{ key: propertyKey, component, node }]
    : [];
  if (!isRecord(node.properties)) return current;
  return [
    ...current,
    ...Object.entries(node.properties).flatMap(([key, child]) =>
      collectSchemaFields(child, key),
    ),
  ];
};

const getComponentProps = (node: Record<string, unknown>) =>
  isRecord(node["x-component-props"])
    ? node["x-component-props"]
    : {};

const getFieldLabels = (
  key: string,
  node: Record<string, unknown>,
): { en: string; ar: string } => {
  const componentProps = getComponentProps(node);
  const fallback = String(node.title ?? key);
  return {
    en: String(componentProps.titleEn ?? componentProps.title ?? fallback),
    ar: String(componentProps.titleAr ?? componentProps.titleEn ?? fallback),
  };
};

const toOptionText = (value: unknown): string => String(value ?? "").trim();

const getValueOptions = (
  node: Record<string, unknown>,
  values: unknown[],
): ModifyChangeValueOption[] | undefined => {
  const componentProps = getComponentProps(node);
  const rawOptions = Array.isArray(node.enum)
    ? node.enum
    : Array.isArray(componentProps.dataSource)
      ? componentProps.dataSource
      : [];
  const valueKeys = new Set(values.map(toOptionText).filter(Boolean));
  const options = rawOptions.flatMap((rawOption) => {
    if (!isRecord(rawOption)) return [];
    const value = rawOption.value;
    if (typeof value !== "string" && typeof value !== "number") return [];
    if (!valueKeys.has(toOptionText(value))) return [];
    const labelEn = toOptionText(
      rawOption.labelEn ?? rawOption.nameEn ?? rawOption.label ?? value,
    );
    const labelAr = toOptionText(
      rawOption.labelAr ?? rawOption.nameAr ?? labelEn,
    );
    return [{ value, labelEn, labelAr }];
  });
  return options.length > 0 ? options : undefined;
};

const getValueSource = (
  node: Record<string, unknown>,
): ModifyChangeValueSource | undefined => {
  const source = toOptionText(getComponentProps(node).Source);
  return source ? { type: "lookup", source } : undefined;
};

const getNestedValueSource = (
  component: "IDSelector" | "AddressPicker",
  key: string,
): ModifyChangeValueSource | undefined => {
  if (component === "IDSelector" && key === "nationality") {
    return { type: "nationality" };
  }
  if (key === "emirateId") return { type: "emirate" };
  if (key === "regionId") return { type: "region" };
  if (key === "areaId") return { type: "area" };
  return undefined;
};

const normalizeComparable = (value: unknown): unknown => {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return value.map(normalizeComparable);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalizeComparable(child)])
        .filter(([, child]) => child !== undefined && child !== null),
    );
  }
  return value ?? null;
};

const valuesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(normalizeComparable(left)) ===
  JSON.stringify(normalizeComparable(right));

const buildNestedRecordChanges = ({
  component,
  fieldKey,
  beforeValue,
  afterValue,
  labels,
  fileKeys = new Set<string>(),
  ownerComponent,
}: {
  component: "IDSelector" | "AddressPicker";
  fieldKey: string;
  beforeValue: unknown;
  afterValue: unknown;
  labels: Record<string, { en: string; ar: string }>;
  fileKeys?: Set<string>;
  ownerComponent?: string;
}): ModifyChangeItem[] => {
  const rawBeforeRecord = isRecord(beforeValue) ? beforeValue : {};
  const rawAfterRecord = isRecord(afterValue) ? afterValue : {};
  const beforeRecord =
    component === "IDSelector"
      ? normalizeMobileNumberFields(rawBeforeRecord, {
          phoneNumber: "mobileNo",
          countryCode: "mobileNoCountryCode",
          localNumber: "mobileNoLocalNumber",
        })
      : rawBeforeRecord;
  const afterRecord =
    component === "IDSelector"
      ? normalizeMobileNumberFields(rawAfterRecord, {
          phoneNumber: "mobileNo",
          countryCode: "mobileNoCountryCode",
          localNumber: "mobileNoLocalNumber",
        })
      : rawAfterRecord;
  const keys = new Set([
    ...Object.keys(beforeRecord),
    ...Object.keys(afterRecord),
  ]);

  return Array.from(keys).flatMap((key) => {
    if (key.startsWith("_") || valuesEqual(beforeRecord[key], afterRecord[key])) {
      return [];
    }
    const label = labels[key] ?? { en: key, ar: key };
    const valueSource = getNestedValueSource(component, key);
    return [
      {
        kind: "field" as const,
        component: fileKeys.has(key) ? "Upload" : component,
        ...(ownerComponent ? { ownerComponent } : {}),
        changeType: "MODIFIED" as const,
        fieldKey: `${fieldKey}.${key}`,
        labelEn: label.en,
        labelAr: label.ar,
        beforeValue: beforeRecord[key] ?? null,
        afterValue: afterRecord[key] ?? null,
        ...(valueSource ? { valueSource } : {}),
      },
    ];
  });
};

const getLanguageRowKey = (
  row: Record<string, unknown>,
  index: number,
): string => {
  const rowId = getDataListRowId(row);
  if (rowId) return `row:${rowId}`;
  const languageId = row.languageId;
  if (languageId !== undefined && languageId !== null && languageId !== "") {
    return `id:${String(languageId)}`;
  }
  const language = normalizeName(row.language);
  return language ? `language:${language}` : `index:${index}`;
};

/** The row id is bookkeeping, never a user-visible change. */
const withoutRowId = (
  row: Record<string, unknown>,
): Record<string, unknown> => {
  if (!(DATA_LIST_ROW_ID_KEY in row)) return row;
  const nextRow = { ...row };
  delete nextRow[DATA_LIST_ROW_ID_KEY];
  return nextRow;
};

/**
 * Identity of a Language & Name List row for diffing purposes.
 *
 * DataList seeds every row loaded from the server with `pos:<index>` and mints
 * a fresh `new:` id for every row created through Add (see ensureDataListRowIds
 * in dataListRules.ts). The "before" snapshot comes straight from the server
 * and therefore carries no ids, so an id-less before row is matched to the
 * `pos:<index>` seeded onto the same row on the current side.
 */
const getLanguageRowIdentity = (
  row: Record<string, unknown>,
  index: number,
): string => getDataListRowId(row) || `pos:${index}`;

/**
 * Row-id diff: exact, no guessing.
 *
 * Because an edited row keeps its id and an added row always gets a brand new
 * one, "row edited in place" and "row deleted, another row added" are now
 * distinguishable — which pairing by languageId, by name or by list position
 * could never do reliably.
 */
const buildLanguageChangesByRowId = (
  field: SchemaField,
  beforeRows: Record<string, unknown>[],
  afterRows: Record<string, unknown>[],
): ModifyChangeItem[] => {
  const labels = getFieldLabels(field.key, field.node);
  const base = {
    kind: "list" as const,
    component: field.component,
    fieldKey: field.key,
    labelEn: labels.en,
    labelAr: labels.ar,
  };
  const afterByIdentity = new Map(
    afterRows.map((row, index) => [getLanguageRowIdentity(row, index), row]),
  );
  const beforeByIdentity = new Map(
    beforeRows.map((row, index) => [getLanguageRowIdentity(row, index), row]),
  );

  const deletedAndModified = beforeRows.flatMap<ModifyChangeItem>(
    (beforeRow, index) => {
      const afterRow = afterByIdentity.get(
        getLanguageRowIdentity(beforeRow, index),
      );
      if (!afterRow) {
        return [
          {
            ...base,
            changeType: "DELETED",
            beforeValue: withoutRowId(beforeRow),
            afterValue: null,
          },
        ];
      }
      if (valuesEqual(withoutRowId(beforeRow), withoutRowId(afterRow))) {
        return [];
      }
      return [
        {
          ...base,
          changeType: "MODIFIED",
          beforeValue: withoutRowId(beforeRow),
          afterValue: withoutRowId(afterRow),
        },
      ];
    },
  );

  const added = afterRows.flatMap<ModifyChangeItem>((afterRow, index) =>
    beforeByIdentity.has(getLanguageRowIdentity(afterRow, index))
      ? []
      : [
          {
            ...base,
            changeType: "ADDED",
            beforeValue: null,
            afterValue: withoutRowId(afterRow),
          },
        ],
  );

  return [...deletedAndModified, ...added];
};

const buildLanguageChanges = (
  field: SchemaField,
  beforeValue: unknown,
  afterValue: unknown,
): ModifyChangeItem[] => {
  const beforeRows = Array.isArray(beforeValue)
    ? beforeValue.filter(isRecord)
    : [];
  const afterRows = Array.isArray(afterValue) ? afterValue.filter(isRecord) : [];

  const order: Record<ModifyChangeType, number> = {
    MODIFIED: 0,
    DELETED: 1,
    ADDED: 2,
  };

  // Current pipeline: every row on the edited side carries a stable row id, so
  // the diff is exact. Legacy applications saved before row ids existed fall
  // through to the heuristic pairing below.
  if (
    afterRows.length > 0 &&
    afterRows.every((row) => getDataListRowId(row))
  ) {
    return buildLanguageChangesByRowId(field, beforeRows, afterRows).sort(
      (left, right) => order[left.changeType] - order[right.changeType],
    );
  }

  const beforeByKey = new Map(
    beforeRows.map((row, index) => [getLanguageRowKey(row, index), row]),
  );
  const afterByKey = new Map(
    afterRows.map((row, index) => [getLanguageRowKey(row, index), row]),
  );
  const beforeIndexByRow = new Map(
    beforeRows.map((row, index) => [row, index]),
  );
  const afterIndexByRow = new Map(afterRows.map((row, index) => [row, index]));
  const labels = getFieldLabels(field.key, field.node);
  const changes: ModifyChangeItem[] = [];

  beforeByKey.forEach((beforeRow, key) => {
    const afterRow = afterByKey.get(key);
    if (!afterRow) {
      changes.push({
        kind: "list",
        component: field.component,
        changeType: "DELETED",
        fieldKey: field.key,
        labelEn: labels.en,
        labelAr: labels.ar,
        beforeValue: beforeRow,
        afterValue: null,
      });
      return;
    }
    if (!valuesEqual(beforeRow, afterRow)) {
      changes.push({
        kind: "list",
        component: field.component,
        changeType: "MODIFIED",
        fieldKey: field.key,
        labelEn: labels.en,
        labelAr: labels.ar,
        beforeValue: beforeRow,
        afterValue: afterRow,
      });
    }
  });

  afterByKey.forEach((afterRow, key) => {
    if (beforeByKey.has(key)) return;
    changes.push({
      kind: "list",
      component: field.component,
      changeType: "ADDED",
      fieldKey: field.key,
      labelEn: labels.en,
      labelAr: labels.ar,
      beforeValue: null,
      afterValue: afterRow,
    });
  });

  if (beforeRows.length !== afterRows.length) {
    return changes.sort(
      (left, right) => order[left.changeType] - order[right.changeType],
    );
  }

  // Legacy fallback only. Without row ids an in-place edit changes the row's
  // identity key, so an equal-length replacement first shows up as
  // DELETED + ADDED; re-pair those leftovers by name, then by list position.
  const pairedChanges = new Set<ModifyChangeItem>();
  const replacements: ModifyChangeItem[] = [];
  const deletedChanges = changes.filter(
    (change) => change.changeType === "DELETED",
  );
  const addedChanges = changes.filter(
    (change) => change.changeType === "ADDED",
  );

  const pairDeletedChange = (
    deletedChange: ModifyChangeItem,
    matches: (addedChange: ModifyChangeItem) => boolean,
  ): boolean => {
    if (pairedChanges.has(deletedChange)) return false;
    const addedChange = addedChanges.find(
      (candidate) => !pairedChanges.has(candidate) && matches(candidate),
    );
    if (!addedChange) return false;

    pairedChanges.add(deletedChange);
    pairedChanges.add(addedChange);
    replacements.push({
      ...deletedChange,
      changeType: "MODIFIED",
      afterValue: addedChange.afterValue,
    });
    return true;
  };

  deletedChanges.forEach((deletedChange) => {
    if (!isRecord(deletedChange.beforeValue)) return;
    const beforeName = normalizeName(deletedChange.beforeValue.suggested_name);
    if (!beforeName) return;
    pairDeletedChange(
      deletedChange,
      (candidate) =>
        isRecord(candidate.afterValue) &&
        normalizeName(candidate.afterValue.suggested_name) === beforeName,
    );
  });

  deletedChanges.forEach((deletedChange) => {
    if (!isRecord(deletedChange.beforeValue)) return;
    const beforeIndex = beforeIndexByRow.get(deletedChange.beforeValue);
    if (beforeIndex === undefined) return;
    pairDeletedChange(
      deletedChange,
      (candidate) =>
        isRecord(candidate.afterValue) &&
        afterIndexByRow.get(candidate.afterValue) === beforeIndex,
    );
  });

  if (replacements.length > 0) {
    changes.splice(
      0,
      changes.length,
      ...changes.filter((change) => !pairedChanges.has(change)),
      ...replacements,
    );
  }

  return changes.sort(
    (left, right) => order[left.changeType] - order[right.changeType],
  );
};

const normalizeLanguageSnapshotRows = (
  value: unknown,
  changeTypes = new Map<Record<string, unknown>, ModifyChangeType>(),
): ModifyLanguageSnapshotRow[] | null => {
  if (!Array.isArray(value) || !value.every(isRecord)) return null;
  return value.map((row, index) => {
    const changeType = changeTypes.get(row);
    return {
      key: getLanguageRowKey(row, index),
      language: typeof row.language === "string" ? row.language : "",
      name:
        typeof row.suggested_name === "string" ? row.suggested_name : "",
      ...(changeType ? { changeType } : {}),
    };
  });
};

const buildLanguageAfterChangeTypes = (
  beforeValue: unknown,
  afterValue: unknown,
  languageChanges: ModifyChangeItem[],
): Map<Record<string, unknown>, ModifyChangeType> => {
  const afterChangeTypes = new Map<
    Record<string, unknown>,
    ModifyChangeType
  >();
  const beforeRows = Array.isArray(beforeValue)
    ? beforeValue.filter(isRecord)
    : [];
  const afterRows = Array.isArray(afterValue) ? afterValue.filter(isRecord) : [];

  if (
    afterRows.length > 0 &&
    afterRows.every((row) => getDataListRowId(row))
  ) {
    const beforeByIdentity = new Map(
      beforeRows.map((row, index) => [
        getLanguageRowIdentity(row, index),
        row,
      ]),
    );
    afterRows.forEach((afterRow, index) => {
      const beforeRow = beforeByIdentity.get(
        getLanguageRowIdentity(afterRow, index),
      );
      if (!beforeRow) {
        afterChangeTypes.set(afterRow, "ADDED");
      } else if (
        !valuesEqual(withoutRowId(beforeRow), withoutRowId(afterRow))
      ) {
        afterChangeTypes.set(afterRow, "MODIFIED");
      }
    });
    return afterChangeTypes;
  }

  const matchedAfterRows = new Set<Record<string, unknown>>();
  languageChanges.forEach((change) => {
    const changeAfterValue = change.afterValue;
    if (!isRecord(changeAfterValue)) return;
    const afterRow = afterRows.find(
      (row) =>
        !matchedAfterRows.has(row) &&
        (row === changeAfterValue ||
          valuesEqual(withoutRowId(row), withoutRowId(changeAfterValue))),
    );
    if (!afterRow) return;
    matchedAfterRows.add(afterRow);
    afterChangeTypes.set(afterRow, change.changeType);
  });
  return afterChangeTypes;
};

const buildStepLanguageSnapshots = (
  beforeStep: ParsedStep | null,
  afterStep: ParsedStep,
  step: ModifyFormStep,
  persistedChanges?: ModifyChangeItem[],
): ModifyLanguageSnapshot[] =>
  collectSchemaFields(afterStep.schema).flatMap((field) => {
    if (field.component !== "DataList") return [];
    const componentProps = getComponentProps(field.node);
    const fieldSource = isRecord(componentProps.fieldSource)
      ? componentProps.fieldSource
      : {};
    if (fieldSource.dataSource !== "languages_name_list") return [];

    const beforeValue = getFormValueBySchemaKey(
      beforeStep?.formValues,
      field.key,
    );
    const afterValue = getFormValueBySchemaKey(afterStep.formValues, field.key);
    const languageChanges =
      persistedChanges === undefined
        ? buildLanguageChanges(field, beforeValue, afterValue)
        : persistedChanges.filter(
            (change) =>
              change.kind === "list" &&
              change.fieldKey === field.key &&
              (!change.component || change.component === field.component),
          );
    const afterChangeTypes = buildLanguageAfterChangeTypes(
      beforeValue,
      afterValue,
      languageChanges,
    );
    const beforeRows = normalizeLanguageSnapshotRows(beforeValue);
    const afterRows = normalizeLanguageSnapshotRows(
      afterValue,
      afterChangeTypes,
    );
    const deletedRows = languageChanges.flatMap((change, index) => {
      if (change.changeType !== "DELETED" || !isRecord(change.beforeValue)) {
        return [];
      }
      const [row] =
        normalizeLanguageSnapshotRows(
          [change.beforeValue],
          new Map([[change.beforeValue, change.changeType]]),
        ) ?? [];
      return row
        ? [
            {
              ...row,
              key: `deleted:${getLanguageRowKey(change.beforeValue, index)}`,
            },
          ]
        : [];
    });
    if (
      !beforeRows ||
      !afterRows ||
      languageChanges.length === 0
    ) {
      return [];
    }

    return [
      {
        sectionNameEn: String(step.stepNameEn ?? "").trim(),
        sectionNameAr: String(
          step.stepNameAr ?? step.stepNameEn ?? "",
        ).trim(),
        fieldKey: field.key,
        beforeRows,
        afterRows,
        deletedRows,
      },
    ];
  });

export const buildModifyLanguageSnapshots = ({
  before,
  after,
}: Pick<BuildModifyChangeSummaryOptions, "before" | "after">):
  ModifyLanguageSnapshot[] => {
  if (!Array.isArray(before) || !Array.isArray(after)) return [];
  const beforeByIdentity = new Map(before.map((step) => [stepIdentity(step), step]));

  return after.flatMap((afterStep, index) => {
    const parsedAfter = parseStep(afterStep);
    if (!parsedAfter) return [];
    const beforeStep = beforeByIdentity.get(stepIdentity(afterStep)) ?? before[index];
    return buildStepLanguageSnapshots(
      parseStep(beforeStep),
      parsedAfter,
      afterStep,
    );
  });
};

export const resolveSubmittedModifyLanguageSnapshots = (
  forms: ModifyFormStep[],
): ModifyLanguageSnapshot[] =>
  forms.flatMap((step) => {
    const parsed = parseRawStep(step);
    if (
      !parsed ||
      !isRecord(parsed.schema) ||
      !isRecord(parsed.modifyOriginalFormValues) ||
      !isRecord(parsed.formValues)
    ) {
      return [];
    }

    const persistedChanges = parsePersistedChangeSection(
      parsed.modifyChangeSet,
    )?.changes;
    return buildStepLanguageSnapshots(
      {
        schema: parsed.schema,
        formValues: parsed.modifyOriginalFormValues,
      },
      {
        schema: parsed.schema,
        formValues: parsed.formValues,
      },
      step,
      persistedChanges && persistedChanges.length > 0
        ? persistedChanges
        : undefined,
    );
  });

const getSocialMediaRowKey = (
  row: Record<string, unknown>,
  index: number,
): string => {
  const id = String(row.id ?? "").trim();
  return id ? `id:${id}` : `index:${index}`;
};

const withoutOperation = (
  row: Record<string, unknown>,
): Record<string, unknown> => {
  const nextRow = { ...row };
  delete nextRow.operation;
  return nextRow;
};

const buildSocialMediaChanges = (
  field: SchemaField,
  beforeValue: unknown,
  afterValue: unknown,
): ModifyChangeItem[] => {
  const beforeRows = Array.isArray(beforeValue)
    ? beforeValue.filter(isRecord)
    : [];
  const afterRows = Array.isArray(afterValue) ? afterValue.filter(isRecord) : [];
  const beforeByKey = new Map(
    beforeRows.map((row, index) => [getSocialMediaRowKey(row, index), row]),
  );
  const labels = getFieldLabels(field.key, field.node);
  const changes: ModifyChangeItem[] = [];

  afterRows.forEach((row, index) => {
    const key = getSocialMediaRowKey(row, index);
    const original = beforeByKey.get(key);
    const operation = String(row.operation ?? "").toUpperCase();
    const current = withoutOperation(row);

    if (operation === "DELETE") {
      if (original) {
        changes.push({
          kind: "list",
          component: "SocialMediaAccount",
          changeType: "DELETED",
          fieldKey: field.key,
          labelEn: labels.en,
          labelAr: labels.ar,
          beforeValue: original,
          afterValue: null,
        });
      }
      return;
    }

    if (operation === "ADD" || !original) {
      changes.push({
        kind: "list",
        component: "SocialMediaAccount",
        changeType: "ADDED",
        fieldKey: field.key,
        labelEn: labels.en,
        labelAr: labels.ar,
        beforeValue: null,
        afterValue: current,
      });
      return;
    }

    if (operation === "MODIFY" || !valuesEqual(original, current)) {
      changes.push({
        kind: "list",
        component: "SocialMediaAccount",
        changeType: "MODIFIED",
        fieldKey: field.key,
        labelEn: labels.en,
        labelAr: labels.ar,
        beforeValue: original,
        afterValue: current,
      });
    }
  });

  const order: Record<ModifyChangeType, number> = {
    MODIFIED: 0,
    DELETED: 1,
    ADDED: 2,
  };
  return changes.sort(
    (left, right) => order[left.changeType] - order[right.changeType],
  );
};

const buildProfileChanges = (
  profileBefore: Record<string, unknown>,
  afterValue: unknown,
): ModifyChangeItem[] => {
  if (!isRecord(afterValue)) return [];
  const normalizeProfileBranch = (
    values: Record<string, unknown>,
  ): Record<string, unknown> => {
    const normalized = normalizeMobileNumberFields(values, {
      phoneNumber: "phoneNumber",
      countryCode: "phoneNumberCountryCode",
      localNumber: "phoneNumberLocalNumber",
    });
    if (normalized.hasTradeLicense === true) {
      delete normalized.reserveTradeNumber;
      delete normalized.reserveTradeName;
    } else if (normalized.hasTradeLicense === false) {
      delete normalized.commercialLicenseNumber;
      delete normalized.licenseExpiryDate;
      delete normalized.commercialLicense;
    }
    return normalized;
  };
  const normalizedBefore = normalizeProfileBranch(profileBefore);
  const normalizedAfter = normalizeProfileBranch(afterValue);
  const keys = new Set([
    ...Object.keys(normalizedBefore),
    ...Object.keys(normalizedAfter),
  ]);
  return Array.from(keys).flatMap((key) => {
    const beforeFieldValue = normalizedBefore[key];
    const afterFieldValue = normalizedAfter[key];
    if (valuesEqual(beforeFieldValue, afterFieldValue)) return [];
    if (key === "addressPicker") {
      return buildNestedRecordChanges({
        component: "AddressPicker",
        ownerComponent: "ProfileForm",
        fieldKey: key,
        beforeValue: beforeFieldValue,
        afterValue: afterFieldValue,
        labels: ADDRESS_FIELD_LABELS,
      });
    }
    const label = PROFILE_FIELD_LABELS[key] ?? { en: key, ar: key };
    return [
      {
        kind: "field" as const,
        component: "ProfileForm",
        changeType: "MODIFIED" as const,
        fieldKey: key,
        labelEn: label.en,
        labelAr: label.ar,
        beforeValue: beforeFieldValue ?? null,
        afterValue: afterFieldValue ?? null,
      },
    ];
  });
};

const normalizeFormValueKey = (value: string): string =>
  value.replace(/\s+/g, "").toLowerCase();

const getFormValueBySchemaKey = (
  values: Record<string, unknown> | undefined,
  schemaKey: string,
): unknown => {
  if (!values) return undefined;
  if (Object.prototype.hasOwnProperty.call(values, schemaKey)) {
    return values[schemaKey];
  }
  const normalizedKey = normalizeFormValueKey(schemaKey);
  const candidates = Object.entries(values).filter(
    ([key]) => normalizeFormValueKey(key) === normalizedKey,
  );
  return candidates.length === 1 ? candidates[0][1] : undefined;
};

const normalizeSelectedKeys = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
};

const buildSelectTableChanges = (
  field: SchemaField,
  afterValue: unknown,
): ModifyChangeItem[] => {
  if (!isRecord(afterValue)) return [];

  const selectedKeys = normalizeSelectedKeys(afterValue.selectedKey);
  const prefilledKeySet = new Set(
    normalizeSelectedKeys(afterValue.prefilledSelectedKey),
  );
  const addedKeys = selectedKeys.filter((key) => !prefilledKeySet.has(key));
  if (addedKeys.length === 0) return [];

  const tableRows = Array.isArray(afterValue.tableData)
    ? afterValue.tableData.filter(isRecord)
    : [];
  const rowById = new Map(
    tableRows.map((row) => [String(row.Id ?? row.id ?? ""), row]),
  );
  const componentProps = getComponentProps(field.node);
  const fallbackLabels = getFieldLabels(field.key, field.node);

  return [
    {
      kind: "list",
      component: field.component,
      changeType: "ADDED",
      fieldKey: field.key,
      labelEn: String(
        componentProps.activityLabelNameEn ?? fallbackLabels.en,
      ),
      labelAr: String(
        componentProps.activityLabelNameAr ??
          componentProps.activityLabelNameEn ??
          fallbackLabels.ar,
      ),
      beforeValue: null,
      afterValue: addedKeys.map((key) => {
        const row = rowById.get(key);
        const displayValue = String(
          row?.Activity ?? row?.ActivityEn ?? row?.ActivityAr ?? "",
        ).trim();
        return displayValue || key;
      }),
    },
  ];
};

const buildStepChanges = (
  beforeStep: ParsedStep | null,
  afterStep: ParsedStep,
  profileBefore: Record<string, unknown> | undefined,
): ModifyChangeItem[] => {
  const fields = collectSchemaFields(afterStep.schema);
  return fields.flatMap((field) => {
    const beforeValue = getFormValueBySchemaKey(
      beforeStep?.formValues,
      field.key,
    );
    const afterValue = getFormValueBySchemaKey(afterStep.formValues, field.key);

    if (field.component === "ProfileForm") {
      const embeddedProfileBefore =
        isRecord(beforeValue) && Object.keys(beforeValue).length > 0
          ? beforeValue
          : undefined;
      const originalProfile = embeddedProfileBefore ?? profileBefore;
      return originalProfile
        ? buildProfileChanges(originalProfile, afterValue)
        : [];
    }

    if (
      field.component === "SelectTable" &&
      isRecord(afterValue) &&
      Object.prototype.hasOwnProperty.call(afterValue, "prefilledSelectedKey")
    ) {
      return buildSelectTableChanges(field, afterValue);
    }

    if (field.component === "DataList") {
      const componentProps = getComponentProps(field.node);
      const fieldSource = isRecord(componentProps.fieldSource)
        ? componentProps.fieldSource
        : {};
      if (fieldSource.dataSource === "languages_name_list") {
        return buildLanguageChanges(field, beforeValue, afterValue);
      }
    }

    if (field.component === "SocialMediaAccount") {
      return buildSocialMediaChanges(field, beforeValue, afterValue);
    }

    if (field.component === "IDSelector") {
      return buildNestedRecordChanges({
        component: "IDSelector",
        fieldKey: field.key,
        beforeValue,
        afterValue,
        labels: ID_SELECTOR_FIELD_LABELS,
        fileKeys: ID_SELECTOR_FILE_KEYS,
      });
    }

    if (field.component === "AddressPicker") {
      return buildNestedRecordChanges({
        component: "AddressPicker",
        fieldKey: field.key,
        beforeValue,
        afterValue,
        labels: ADDRESS_FIELD_LABELS,
      });
    }

    if (field.component === "Card" || field.component === "FormGrid" ||
      field.component === "FormGrid.GridColumn" || field.component === "Divider" ||
      field.component === "Information") {
      return [];
    }

    if (valuesEqual(beforeValue, afterValue)) return [];
    const labels = getFieldLabels(field.key, field.node);
    const valueOptions = getValueOptions(field.node, [beforeValue, afterValue]);
    const valueSource = getValueSource(field.node);
    return [
      {
        kind: "field" as const,
        component: field.component,
        changeType: "MODIFIED" as const,
        fieldKey: field.key,
        labelEn: labels.en,
        labelAr: labels.ar,
        beforeValue: beforeValue ?? null,
        afterValue: afterValue ?? null,
        ...(valueOptions ? { valueOptions } : {}),
        ...(valueSource ? { valueSource } : {}),
      },
    ];
  });
};

export const buildModifyChangeSummary = ({
  before,
  after,
  profileBefore,
}: BuildModifyChangeSummaryOptions): ModifyChangeSection[] => {
  if (!Array.isArray(before) || !Array.isArray(after)) return [];
  const beforeByIdentity = new Map(before.map((step) => [stepIdentity(step), step]));

  return after.flatMap((afterStep, index) => {
    const parsedAfter = parseStep(afterStep);
    if (!parsedAfter) return [];
    const beforeStep = beforeByIdentity.get(stepIdentity(afterStep)) ?? before[index];
    const changes = buildStepChanges(
      parseStep(beforeStep),
      parsedAfter,
      profileBefore,
    );
    if (changes.length === 0) return [];
    return [
      {
        sectionNameEn: String(afterStep.stepNameEn ?? "").trim(),
        sectionNameAr: String(
          afterStep.stepNameAr ?? afterStep.stepNameEn ?? "",
        ).trim(),
        changes,
      },
    ];
  });
};

const normalizeDisplayFieldToken = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const isAddressCoordinateChange = (change: ModifyChangeItem): boolean => {
  const pathParts = change.fieldKey.split(".").filter(Boolean);
  const terminalField = normalizeDisplayFieldToken(
    pathParts[pathParts.length - 1] ?? change.fieldKey,
  );

  if (terminalField !== "latitude" && terminalField !== "longitude") {
    return false;
  }

  return (
    pathParts
      .slice(0, -1)
      .some((part) => normalizeDisplayFieldToken(part) === "addresspicker") ||
    [change.component, change.ownerComponent].some(
      (component) =>
        normalizeDisplayFieldToken(component) === "addresspicker",
    )
  );
};

export const filterModifyChangeSummaryForDisplay = (
  sections: ModifyChangeSection[],
  serviceCode?: string | number | null,
): ModifyChangeSection[] =>
  sections
    .map((section) => ({
      ...section,
      changes: section.changes.filter(
        (change) =>
          !isAddressCoordinateChange(change) &&
          !(
            ["80011", "80012"].includes(String(serviceCode ?? "").trim()) &&
            change.component === "SocialMediaAccount"
          ),
      ),
    }))
    .filter((section) => section.changes.length > 0);

export const formatModifyChangeValue = (
  value: unknown,
  options?: {
    fileLike?: boolean;
    dateOnly?: boolean;
    booleanLabels?: { true: string; false: string };
  },
): string => {
  if (value === undefined || value === null || value === "") return "-";
  if (options?.fileLike && typeof value === "string") {
    return value.split("/").filter(Boolean).pop() || value;
  }
  if (
    options?.dateOnly &&
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
  ) {
    return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
  }
  if (typeof value === "boolean") {
    if (options?.booleanLabels) {
      return options.booleanLabels[value ? "true" : "false"];
    }
    return value ? "Yes" : "No";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatModifyChangeValue(item)).join(", ");
  }
  if (isRecord(value)) {
    const language = String(value.language ?? "").trim();
    const suggestedName = String(
      value.suggested_name ?? value.suggestedName ?? "",
    ).trim();
    if (language || suggestedName) {
      return [language, suggestedName].filter(Boolean).join(" / ");
    }
    const accountName = String(
      value.accountTitle ?? value.accountName ?? "",
    ).trim();
    const accountUrl = String(value.accountUrl ?? value.url ?? "").trim();
    if (accountName || accountUrl) {
      return [accountName, accountUrl].filter(Boolean).join(" / ");
    }
    return Object.values(value)
      .filter((child) => child !== undefined && child !== null && child !== "")
      .map((child) => formatModifyChangeValue(child))
      .join(", ");
  }
  return String(value);
};
