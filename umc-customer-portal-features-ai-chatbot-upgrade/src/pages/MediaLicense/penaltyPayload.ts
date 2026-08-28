import { nowGst, toApi } from "@/utils/gstTime";
import type { LifecyclePenaltyReference } from "@/services/myRequest";
import type { PenaltyEnginePayload, PenaltyEvaluateRequest } from "@/services/services";

export const PENALTY_SCENARIO_CODE = "RENEWAL_DELAY_FINE";

export const PENALTY_ENABLED_RENEW_SERVICE_CODES = new Set([
  "902",
  "904",
  "1204",
  "1202",
  "802",
  "806",
]);

const PENALTY_SERVICE_ID_BY_SERVICE_CODE: Record<string, number> = {
  "904": 902,
  "1202": 1204,
  "806": 802,
};

type PenaltyPayloadParams = {
  serviceCode: string | number | null | undefined;
  penaltyFor?: LifecyclePenaltyReference | null;
};

type PenaltyEvaluatePayloadParams = PenaltyPayloadParams & {
  applicationId?: number | null;
  applicationNo?: string | null;
};

const coercePenaltyServiceId = (
  serviceCode: string | number | null | undefined,
) => {
  const normalizedServiceCode = String(serviceCode ?? "").trim();
  const mappedServiceId = PENALTY_SERVICE_ID_BY_SERVICE_CODE[normalizedServiceCode];
  const normalized =
    mappedServiceId ??
    (typeof serviceCode === "number"
      ? serviceCode
      : Number(normalizedServiceCode));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  return normalized;
};

const normalizePenaltyReference = (
  penaltyFor?: LifecyclePenaltyReference | null,
) => {
  const referenceType = String(penaltyFor?.penaltyReferenceType ?? "").trim();
  const referenceId = penaltyFor?.penaltyReferenceId;
  const normalizedReferenceId =
    typeof referenceId === "string" ? referenceId.trim() : referenceId;

  if (
    !referenceType ||
    normalizedReferenceId === "" ||
    normalizedReferenceId == null
  ) {
    return null;
  }

  return {
    referenceType,
    referenceId: normalizedReferenceId,
  };
};

const normalizeOptionalApplicationNo = (value?: string | null) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const normalizeOptionalApplicationId = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
};

export const isPenaltyEnabledRenewServiceCode = (serviceCode: unknown) =>
  PENALTY_ENABLED_RENEW_SERVICE_CODES.has(String(serviceCode ?? "").trim());

export const buildPenaltyCorrelationId = (
  serviceCode: string | number,
  prefix: "preview" | "submit" = "preview",
) => `penalty-${prefix}-${serviceCode}-${Date.now()}`;

export const buildPenaltyEnginePayload = ({
  serviceCode,
  penaltyFor,
}: PenaltyPayloadParams): PenaltyEnginePayload | null => {
  const serviceId = coercePenaltyServiceId(serviceCode);
  const reference = normalizePenaltyReference(penaltyFor);

  if (!serviceId || !reference) {
    return null;
  }

  return {
    penaltyScenarioCode: PENALTY_SCENARIO_CODE,
    serviceId,
    referenceType: reference.referenceType,
    referenceId: reference.referenceId,
    requestTime: toApi(nowGst()),
  };
};

export const buildPenaltyEvaluatePayload = ({
  serviceCode,
  applicationId,
  applicationNo,
  penaltyFor,
}: PenaltyEvaluatePayloadParams):
  | {
      correlationId: string;
      request: PenaltyEvaluateRequest;
    }
  | null => {
  const serviceId = coercePenaltyServiceId(serviceCode);
  const reference = normalizePenaltyReference(penaltyFor);

  if (!serviceId || !reference) {
    return null;
  }

  const correlationId = buildPenaltyCorrelationId(serviceId, "preview");
  const normalizedApplicationId = normalizeOptionalApplicationId(applicationId);
  const normalizedApplicationNo = normalizeOptionalApplicationNo(applicationNo);

  return {
    correlationId,
    request: {
      serviceId,
      ...(normalizedApplicationId !== undefined
        ? { applicationId: normalizedApplicationId }
        : {}),
      ...(normalizedApplicationNo !== undefined
        ? { applicationNo: normalizedApplicationNo }
        : {}),
      penaltyScenarioCode: PENALTY_SCENARIO_CODE,
      enginePayload: {
        serviceId,
        referenceType: reference.referenceType,
        referenceId: reference.referenceId,
        correlationId,
      },
    },
  };
};

export const getPenaltyPayloadBlockingMessage = (
  serviceCode: string | number | null | undefined,
  penaltyFor?: LifecyclePenaltyReference | null,
) => {
  if (!isPenaltyEnabledRenewServiceCode(serviceCode)) {
    return null;
  }

  if (!coercePenaltyServiceId(serviceCode)) {
    return "Penalty configuration is unavailable right now. Please refresh and try again.";
  }

  if (!normalizePenaltyReference(penaltyFor)) {
    return "Penalty details are unavailable right now. Please refresh and try again.";
  }

  return null;
};
