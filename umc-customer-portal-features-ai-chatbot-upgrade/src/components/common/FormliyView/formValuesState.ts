export type FormValues = Record<string, unknown>;

export const EMPTY_FORM_VALUES: Record<string, never> = {};

const EMPTY_FORM_VALUES_SIGNATURE = JSON.stringify(EMPTY_FORM_VALUES);

const normalizeFormValues = (value: unknown): FormValues =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as FormValues)
    : EMPTY_FORM_VALUES;

export const getFormValuesSignature = (value: unknown): string =>
  JSON.stringify(normalizeFormValues(value));

export const getSchemaDataSignature = (value: unknown): string => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";

  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "formValues"),
    ),
  );
};

export const getFormValuesFromSignature = (signature: string): FormValues =>
  signature === EMPTY_FORM_VALUES_SIGNATURE
    ? EMPTY_FORM_VALUES
    : (JSON.parse(signature) as FormValues);

export const shouldApplyFormValuesSignature = (
  previousSignature: string,
  nextSignature: string,
): boolean => previousSignature !== nextSignature;
