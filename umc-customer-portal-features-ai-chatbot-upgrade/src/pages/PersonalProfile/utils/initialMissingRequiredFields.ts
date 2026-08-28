interface MomentLikeValue {
  _isAMomentObject?: boolean;
  isValid?: () => boolean;
}

function isInitialFormValueMissing(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";

  if (typeof value === "object") {
    const momentLikeValue = value as MomentLikeValue;
    if (
      momentLikeValue._isAMomentObject &&
      typeof momentLikeValue.isValid === "function"
    ) {
      return !momentLikeValue.isValid();
    }
  }

  return false;
}

export function getInitialMissingRequiredFields(
  requiredFieldNames: readonly string[],
  identityFieldName: string,
  initialValues: Record<string, unknown>,
): ReadonlySet<string> {
  return new Set(
    [...requiredFieldNames, identityFieldName].filter((fieldName) =>
      isInitialFormValueMissing(initialValues[fieldName]),
    ),
  );
}
