import { combineInternationalMobileNumber } from "@/components/common/MobileNumberInput/utils";

export interface DynamicMobileNumberFieldNames {
  fullNumber: string;
  countryCode: string;
  localNumber: string;
}

const DEFAULT_DYNAMIC_MOBILE_NUMBER_FIELDS: DynamicMobileNumberFieldNames[] = [
  {
    fullNumber: "mobileNo",
    countryCode: "mobileNoCountryCode",
    localNumber: "mobileNoLocalNumber",
  },
  {
    fullNumber: "phoneNumber",
    countryCode: "phoneNumberCountryCode",
    localNumber: "phoneNumberLocalNumber",
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const addFieldNames = (
  fields: DynamicMobileNumberFieldNames[],
  candidate: DynamicMobileNumberFieldNames,
) => {
  const exists = fields.some(
    (item) =>
      item.fullNumber === candidate.fullNumber &&
      item.countryCode === candidate.countryCode &&
      item.localNumber === candidate.localNumber,
  );

  if (!exists) fields.push(candidate);
};

export const collectDynamicMobileNumberFieldNames = (
  schema: unknown,
): DynamicMobileNumberFieldNames[] => {
  const fields = [...DEFAULT_DYNAMIC_MOBILE_NUMBER_FIELDS];

  const visit = (value: unknown, propertyName = "") => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, propertyName));
      return;
    }
    if (!isRecord(value)) return;

    if (value["x-component"] === "MobileNumberInput") {
      const componentProps = isRecord(value["x-component-props"])
        ? value["x-component-props"]
        : {};
      const fullNumber = String(value.name || propertyName || "phoneNumber");
      addFieldNames(fields, {
        fullNumber,
        countryCode: String(
          componentProps.countryCodeFieldName || `${fullNumber}CountryCode`,
        ),
        localNumber: String(
          componentProps.localNumberFieldName || `${fullNumber}LocalNumber`,
        ),
      });
    }

    Object.entries(value).forEach(([key, nestedValue]) => {
      if (key === "properties" && isRecord(nestedValue)) {
        Object.entries(nestedValue).forEach(([nestedName, nestedSchema]) =>
          visit(nestedSchema, nestedName),
        );
        return;
      }
      if (nestedValue && typeof nestedValue === "object") {
        visit(nestedValue, propertyName);
      }
    });
  };

  visit(schema);
  return fields;
};

const collectRecordMobileNumberFieldNames = (
  record: Record<string, unknown>,
  configuredFields: DynamicMobileNumberFieldNames[],
) => {
  const fields = [...configuredFields];

  Object.keys(record).forEach((key) => {
    if (!key.endsWith("CountryCode")) return;

    const fullNumber = key.slice(0, -"CountryCode".length);
    const localNumber = `${fullNumber}LocalNumber`;
    if (!Object.prototype.hasOwnProperty.call(record, localNumber)) return;

    addFieldNames(fields, {
      fullNumber,
      countryCode: key,
      localNumber,
    });
  });

  return fields;
};

export const normalizeDynamicMobileNumberFormValues = (
  value: unknown,
  schema?: unknown,
): unknown => {
  const configuredFields = collectDynamicMobileNumberFieldNames(schema);

  const normalizeValue = (currentValue: unknown): unknown => {
    if (Array.isArray(currentValue)) {
      return currentValue.map(normalizeValue);
    }
    if (!isRecord(currentValue)) return currentValue;

    const record = Object.fromEntries(
      Object.entries(currentValue).map(([key, nestedValue]) => [
        key,
        normalizeValue(nestedValue),
      ]),
    );

    collectRecordMobileNumberFieldNames(record, configuredFields).forEach(
      (fieldNames) => {
        const hasFullNumber = Object.prototype.hasOwnProperty.call(
          record,
          fieldNames.fullNumber,
        );
        const hasCountryCode = Object.prototype.hasOwnProperty.call(
          record,
          fieldNames.countryCode,
        );
        const hasLocalNumber = Object.prototype.hasOwnProperty.call(
          record,
          fieldNames.localNumber,
        );
        if (!hasFullNumber && !hasCountryCode && !hasLocalNumber) return;

        const fullNumber = String(record[fieldNames.fullNumber] ?? "").replace(
          /\s+/g,
          "",
        );
        const localNumber = String(record[fieldNames.localNumber] ?? "").replace(
          /\s+/g,
          "",
        );
        if (hasFullNumber) record[fieldNames.fullNumber] = fullNumber;

        if (!localNumber) {
          if (hasFullNumber && !fullNumber) record[fieldNames.fullNumber] = "";
          if (hasCountryCode) record[fieldNames.countryCode] = "";
          if (hasLocalNumber) record[fieldNames.localNumber] = "";
          return;
        }

        const countryCode = String(
          record[fieldNames.countryCode] ?? "",
        ).replace(/\s+/g, "");
        if (!countryCode) return;
        record[fieldNames.countryCode] = countryCode;
        record[fieldNames.localNumber] = localNumber;
        record[fieldNames.fullNumber] = combineInternationalMobileNumber(
          countryCode,
          localNumber,
        );
      },
    );

    return record;
  };

  return normalizeValue(value);
};
