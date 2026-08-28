export type EmirateNameLike = {
  nameEn?: string;
  nameAr?: string;
  code?: string;
};

export function normalizeEmirateName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Arabic place names differ from the list only in spelling: hamza carriers, the
 * alef maqsura, the ta marbuta and an optional "إمارة" prefix, so fold those away
 * before comparing.
 */
export function normalizeArabicEmirateName(value: unknown) {
  return String(value ?? "")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي]/g, "");
}

/**
 * GetEmirateList localizes both nameEn and nameAr to the requested language, so under
 * Accept-Language: ar the list carries no Latin name at all, while GoogleMapPicker pins
 * the Maps SDK to language=en and keeps answering with English place names. `code` is the
 * one field the backend leaves untranslated, so map what the geocoder returns onto it and
 * match on that when the names cannot meet in the same script.
 */
const EMIRATE_CODE_KEYWORDS: Array<{
  code: string;
  latin: string[];
  arabic: string[];
}> = [
  { code: "AUH", latin: ["abudhabi"], arabic: ["ابوظبي"] },
  { code: "DXB", latin: ["dubai"], arabic: ["دبي"] },
  { code: "SHJ", latin: ["sharjah"], arabic: ["شارقه"] },
  { code: "AJM", latin: ["ajman"], arabic: ["عجمان"] },
  { code: "UAQ", latin: ["ummal"], arabic: ["القيوين"] },
  { code: "RAK", latin: ["rasal"], arabic: ["الخيمه"] },
  { code: "FUJ", latin: ["fujairah", "fujayrah"], arabic: ["فجيره"] },
];

function matchesName(target: string, name: string) {
  return Boolean(target) && Boolean(name) && (name === target || target.includes(name));
}

export function findMatchingEmirate<T extends EmirateNameLike>(
  emirateName: unknown,
  emirates: T[],
): T | undefined {
  const latinTarget = normalizeEmirateName(emirateName);
  const arabicTarget = normalizeArabicEmirateName(emirateName);

  if (!latinTarget && !arabicTarget) {
    return undefined;
  }

  const matchedByName = emirates.find((emirate) =>
    [emirate.nameEn, emirate.nameAr].some(
      (name) =>
        matchesName(latinTarget, normalizeEmirateName(name)) ||
        matchesName(arabicTarget, normalizeArabicEmirateName(name)),
    ),
  );

  if (matchedByName) {
    return matchedByName;
  }

  const matchedCode = EMIRATE_CODE_KEYWORDS.find(
    (entry) =>
      entry.latin.some((keyword) => latinTarget.includes(keyword)) ||
      entry.arabic.some((keyword) => arabicTarget.includes(keyword)),
  )?.code;

  if (!matchedCode) {
    return undefined;
  }

  return emirates.find(
    (emirate) => String(emirate.code ?? "").trim().toUpperCase() === matchedCode,
  );
}
