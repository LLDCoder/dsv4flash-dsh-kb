type IcpResponseErrorData = {
  responseDescription?: unknown;
  responseDescriptionArabic?: unknown;
};

const normalizeDescription = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

export function resolveIcpResponseErrorMessage(
  body: unknown,
  language: string,
  fallbackMessage?: string,
): string | undefined {
  const data = (body as { data?: IcpResponseErrorData } | undefined)?.data;
  const english = normalizeDescription(data?.responseDescription);
  const arabic = normalizeDescription(data?.responseDescriptionArabic);
  const fallback = normalizeDescription(fallbackMessage);

  return language.toLowerCase().startsWith("ar")
    ? arabic ?? english ?? fallback
    : english ?? arabic ?? fallback;
}
