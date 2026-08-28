import type { LocationState } from "history";
import type {
  LicensePermitActionNeededItemDto,
  LicensePermitListItemDto,
} from "@/services/permitsLicense";
import type {
  ApplicationDetailsResponse,
  LifecycleActivityContext,
} from "@/services/myRequest";
import type { LicenseLifecycleSource } from "@/store/licenseLifecycleSource";

export const LICENSE_LIFECYCLE_SOURCE_STATE_KEY = "licenseLifecycleSource";

type LicenseLifecycleSourceRecord = Pick<
  LicensePermitListItemDto,
  | "documentId"
  | "documentType"
  | "licensePermitNo"
  | "serviceId"
  | "serviceCode"
  | "sourceApplicationDetailId"
  | "sourceApplicationId"
  | "sourceMedialLicenseId"
  | "sourceServiceCode"
> &
  Partial<Pick<LicensePermitActionNeededItemDto, "documentId" | "documentType">> & {
    action?: string | null;
  };

const hasValue = (value: unknown) =>
  value !== null && value !== undefined && value !== "";

export const isValidApplicationId = (value: unknown) => {
  const normalizedValue =
    typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isSafeInteger(normalizedValue) && normalizedValue > 0;
};

export const hasLicenseLifecycleSource = (
  source?: LicenseLifecycleSource | null,
) =>
  Boolean(
    source &&
      [
        source.sourceServiceCode,
        source.sourceMedialLicenseId,
        source.sourceApplicationId,
        source.sourceApplicationDetailId,
      ].some(hasValue),
  );

export const shouldRedirectMissingPermitLifecycleContext = ({
  isPermitLifecycleAction,
  applicationId,
  hasRouteApplicationId,
  source,
}: {
  isPermitLifecycleAction: boolean;
  applicationId: number | null;
  hasRouteApplicationId: boolean;
  source?: LicenseLifecycleSource | null;
}) =>
  isPermitLifecycleAction &&
  applicationId == null &&
  !hasRouteApplicationId &&
  !hasLicenseLifecycleSource(source);

const hasLicenseLifecycleSourcePayload = (
  source?: LicenseLifecycleSource | null,
) =>
  Boolean(
    hasLicenseLifecycleSource(source) || hasValue(source?.licensePermitNo),
  );

export const createLicenseLifecycleSource = (
  record: LicenseLifecycleSourceRecord,
) => {
  if (
    record.documentType !== "LICENSE" &&
    record.documentType !== "PERMIT"
  ) {
    return null;
  }

  const source = {
    sourceServiceCode: record.sourceServiceCode ?? null,
    sourceMedialLicenseId: record.sourceMedialLicenseId ?? null,
    sourceApplicationId: record.sourceApplicationId ?? null,
    sourceApplicationDetailId: record.sourceApplicationDetailId ?? null,
    licensePermitNo: record.licensePermitNo ?? null,
    originDocumentId: record.documentId ?? null,
    originDocumentType: record.documentType ?? null,
    originAction: record.action ?? null,
    serviceId: record.serviceId ?? null,
    serviceCode: record.serviceCode ?? null,
  } satisfies LicenseLifecycleSource;

  return hasLicenseLifecycleSourcePayload(source) ? source : null;
};

export const createLicenseLifecycleRouteState = (
  source: LicenseLifecycleSource | null,
) => {
  if (!hasLicenseLifecycleSourcePayload(source)) {
    return undefined;
  }

  return {
    [LICENSE_LIFECYCLE_SOURCE_STATE_KEY]: source,
  };
};

export const getLicenseLifecycleSourceFromRouteState = (
  state?: LocationState | null,
) => {
  if (!state || typeof state !== "object") {
    return null;
  }

  const source = (state as Record<string, unknown>)[
    LICENSE_LIFECYCLE_SOURCE_STATE_KEY
  ];

  if (!source || typeof source !== "object") {
    return null;
  }

  return source as LicenseLifecycleSource;
};

export const getLicenseLifecycleSourceFromApplicationDetail = (
  detail?: Partial<ApplicationDetailsResponse> | null,
) => {
  if (!detail) {
    return null;
  }

  const source = {
    sourceServiceCode: detail.sourceServiceCode ?? null,
    sourceMedialLicenseId:
      detail.sourceMedialLicenseId ?? detail.mediaLicenseId ?? null,
    sourceApplicationId: detail.sourceApplicationId ?? null,
    sourceApplicationDetailId: detail.sourceApplicationDetailId ?? null,
    licensePermitNo: detail.licensePermitNo ?? null,
  } satisfies LicenseLifecycleSource;

  return hasLicenseLifecycleSourcePayload(source) ? source : null;
};

const isValidLifecycleSourceId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const resolveLifecycleSourceId = (
  currentValue: number | null | undefined,
  activityContextValue: number | null | undefined,
) =>
  isValidLifecycleSourceId(currentValue)
    ? currentValue
    : isValidLifecycleSourceId(activityContextValue)
      ? activityContextValue
      : currentValue ?? null;

export const mergeLifecycleActivitySourceContext = ({
  source,
  activityContext,
  licensePermitNo,
}: {
  source: LicenseLifecycleSource | null;
  activityContext?: LifecycleActivityContext | null;
  licensePermitNo: string | null;
}): LicenseLifecycleSource | null => {
  if (!source) return null;

  return {
    ...source,
    sourceApplicationId: resolveLifecycleSourceId(
      source.sourceApplicationId,
      activityContext?.sourceApplicationId,
    ),
    sourceApplicationDetailId: resolveLifecycleSourceId(
      source.sourceApplicationDetailId,
      activityContext?.sourceApplicationDetailId,
    ),
    sourceMedialLicenseId: resolveLifecycleSourceId(
      source.sourceMedialLicenseId,
      activityContext?.sourceMedialLicenseId,
    ),
    licensePermitNo,
  };
};
