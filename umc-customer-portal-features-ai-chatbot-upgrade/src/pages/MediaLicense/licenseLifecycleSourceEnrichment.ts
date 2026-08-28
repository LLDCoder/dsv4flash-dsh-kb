import type { LicensePermitListItemDto } from "@/services/permitsLicense";
import type { LicenseLifecycleSource } from "@/store/licenseLifecycleSource";

const normalizeLookupText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const toPositiveId = (value: unknown): number | null => {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0
    ? normalized
    : null;
};

const fillField = <T>(current: T | null | undefined, next: T | null | undefined) =>
  current !== null && current !== undefined && current !== ""
    ? current
    : next ?? current ?? null;

/**
 * Draft/edit sessions rebuilt from GET ApplicationDetail lack
 * `sourceApplicationDetailId` (the API does not return it), while modify
 * engines (803/903/1203/80011/...) require it. The licenses-permits list is
 * the same data source the fresh flow uses, so matching the license record
 * lets us backfill the missing fields without overwriting known values.
 */
export const fillMissingLicenseLifecycleSourceFields = (
  source: LicenseLifecycleSource | null,
  items: LicensePermitListItemDto[] | null | undefined,
): LicenseLifecycleSource | null => {
  if (!source || !Array.isArray(items) || items.length === 0) {
    return source;
  }

  const permitNo = normalizeLookupText(source.licensePermitNo);
  const sourceMediaLicenseId = toPositiveId(source.sourceMedialLicenseId);
  const sourceApplicationId = toPositiveId(source.sourceApplicationId);

  let pool: LicensePermitListItemDto[] = [];
  if (permitNo) {
    pool = items.filter(
      (item) => normalizeLookupText(item?.licensePermitNo) === permitNo,
    );
  } else if (sourceMediaLicenseId !== null) {
    pool = items.filter(
      (item) => toPositiveId(item?.sourceMedialLicenseId) === sourceMediaLicenseId,
    );
  }

  if (pool.length === 0) {
    return source;
  }

  const match =
    (sourceApplicationId !== null
      ? pool.find(
          (item) => toPositiveId(item.sourceApplicationId) === sourceApplicationId,
        )
      : undefined) ??
    (sourceMediaLicenseId !== null
      ? pool.find(
          (item) =>
            toPositiveId(item.sourceMedialLicenseId) === sourceMediaLicenseId,
        )
      : undefined) ??
    (pool.length === 1 ? pool[0] : undefined);

  if (!match) {
    return source;
  }

  return {
    ...source,
    sourceServiceCode: fillField(source.sourceServiceCode, match.sourceServiceCode),
    sourceMedialLicenseId: fillField(
      source.sourceMedialLicenseId,
      match.sourceMedialLicenseId,
    ),
    sourceApplicationId: fillField(
      source.sourceApplicationId,
      match.sourceApplicationId,
    ),
    sourceApplicationDetailId: fillField(
      source.sourceApplicationDetailId,
      match.sourceApplicationDetailId,
    ),
    licensePermitNo: fillField(source.licensePermitNo, match.licensePermitNo),
  };
};
