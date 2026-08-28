import { DATA_LIST_ROW_ID_KEY } from "../../components/designable/src/components/DataList/dataListRules";

const SUBMISSION_ONLY_STRIPPED_FORM_KEYS = new Set([
  "__applicationDetailPrefillInitialized",
  "__service903Initialized",
  "__service903ExcludedSelectedKey",
  "__service904Initialized",
]);

interface StripSubmissionOnlyFormFieldsOptions {
  preserveDataListRowIds?: boolean;
}

export const stripSubmissionOnlyFormFields = (
  value: unknown,
  options: StripSubmissionOnlyFormFieldsOptions = {},
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stripSubmissionOnlyFormFields(item, options));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const shouldPreservePrefilledSelectedKey =
    record.__service903Initialized === true ||
    record.__service904Initialized === true;

  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => {
        if (key === "prefilledSelectedKey") {
          return shouldPreservePrefilledSelectedKey;
        }

        if (key === DATA_LIST_ROW_ID_KEY) {
          return options.preserveDataListRowIds === true;
        }

        return !SUBMISSION_ONLY_STRIPPED_FORM_KEYS.has(key);
      })
      .map(([key, nestedValue]) => [
        key,
        stripSubmissionOnlyFormFields(nestedValue, options),
      ]),
  );
};
