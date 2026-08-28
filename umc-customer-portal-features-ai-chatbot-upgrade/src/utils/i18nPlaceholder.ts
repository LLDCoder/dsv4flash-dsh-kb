import type { TFunction } from "i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";

type PlaceholderParams = Record<string, unknown>;

interface PlaceholderI18n {
  exists?: (key: string, options?: PlaceholderParams) => boolean;
}

interface ResolveI18nPlaceholderOptions {
  isAr: boolean;
  i18n?: PlaceholderI18n;
  t: TFunction;
  placeholder?: unknown;
  placeholderEn?: unknown;
  placeholderAr?: unknown;
  placeholderKey?: unknown;
  placeholderParams?: PlaceholderParams;
  defaultPlaceholder?: unknown;
}

export function resolveI18nPlaceholder({
  isAr,
  i18n,
  t,
  placeholder,
  placeholderEn,
  placeholderAr,
  placeholderKey,
  placeholderParams,
  defaultPlaceholder,
}: ResolveI18nPlaceholderOptions) {
  const localizedPlaceholder = preferLocalizedEnAr(
    isAr,
    typeof placeholderEn === "string" ? placeholderEn : undefined,
    typeof placeholderAr === "string" ? placeholderAr : undefined,
  );

  if (localizedPlaceholder) {
    return localizedPlaceholder;
  }

  if (typeof placeholderKey === "string" && placeholderKey.trim()) {
    const trimmedKey = placeholderKey.trim();
    if (!i18n?.exists || i18n.exists(trimmedKey, placeholderParams)) {
      return t(trimmedKey, placeholderParams);
    }
  }

  if (placeholder !== undefined && placeholder !== null && placeholder !== "") {
    return placeholder;
  }

  return defaultPlaceholder;
}
