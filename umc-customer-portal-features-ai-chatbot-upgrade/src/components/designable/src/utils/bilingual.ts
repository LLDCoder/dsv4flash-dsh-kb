import type {
  FormLanguageHost,
  PortalFormLang,
} from "@/components/designable/playground/FormPreviewLangContext";

type MaybeString = unknown;

interface BilingualValueInput {
  en?: MaybeString;
  ar?: MaybeString;
  legacy?: MaybeString;
}

interface BilingualResolveOptions extends BilingualValueInput {
  lang: PortalFormLang;
  host?: FormLanguageHost;
  fallback?: string;
}

export function asOptionalString(value: MaybeString): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getBilingualValueByLang({
  lang,
  host = "runtime",
  en,
  ar,
  legacy,
  fallback = "",
}: BilingualResolveOptions): string {
  const primary = lang === "ar" ? asOptionalString(ar) : asOptionalString(en);
  const secondary = lang === "ar" ? asOptionalString(en) : asOptionalString(ar);
  const legacyValue = asOptionalString(legacy);
  const isDesigner = host === "designer";

  if (typeof primary === "string") {
    if (primary !== "") {
      return primary;
    }
    if (isDesigner && lang === "en") {
      return fallback;
    }
  }

  if (isDesigner) {
    if (lang === "ar" && typeof secondary === "string" && secondary !== "") {
      return secondary;
    }
    return fallback;
  }

  if (lang === "ar" && typeof secondary === "string" && secondary !== "") {
    return secondary;
  }

  if (typeof legacyValue === "string" && legacyValue !== "") {
    return legacyValue;
  }

  return fallback;
}
