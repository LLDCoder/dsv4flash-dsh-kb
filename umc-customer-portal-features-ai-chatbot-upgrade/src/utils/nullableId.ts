export const normalizeNullableId = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const normalized = text.toLowerCase();
  if (
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "nan"
  ) {
    return null;
  }

  return text;
};

export const firstNullableId = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = normalizeNullableId(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};
