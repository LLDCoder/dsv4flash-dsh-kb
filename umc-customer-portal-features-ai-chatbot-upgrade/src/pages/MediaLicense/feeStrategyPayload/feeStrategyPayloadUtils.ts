import { nowGst, toApi } from "@/utils/gstTime";
import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import {
  resolveApplicantUserTypeCode,
  resolveEstablishmentId,
  resolveSelectTableSingleValue,
  type FormValues,
} from "../ruleStrategyPayloadShared";
import {
  coerceBoolean,
  coerceNumber,
  coerceString,
  getFirstDefined,
  resolveAddedSelectedIds,
  resolveSelectTableValue,
  resolveSelectedIds,
} from "../ruleStrategyPayloadUtils";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";

type BuildRequestOptions = Pick<
  BuildServiceFeeStrategyPayloadParams,
  "config" | "currentProfileId" | "userInfo"
> & {
  applicantOverrides?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  requestOverrides?: Record<string, unknown>;
  actionType?: number;
};

export {
  coerceBoolean,
  coerceNumber,
  coerceString,
  getFirstDefined,
  resolveSelectTableSingleValue,
  type FormValues,
};

export const createFeeQuoteEnvelope = ({
  config,
  enginePayload,
}: Pick<
  BuildServiceFeeStrategyPayloadParams,
  "config" | "applicationId" | "applicationNo"
> & {
  enginePayload: FeeQuoteEnginePayload;
}): FeeQuoteEnvelope => {
  return {
    serviceId: config.serviceId,
    enginePayload,
  };
};

export const createFeeEnginePayload = ({
  config,
  currentProfileId,
  userInfo,
  applicantOverrides,
  payload,
  requestOverrides,
  actionType = 1,
}: BuildRequestOptions): FeeQuoteEnginePayload => {
  const request: Record<string, unknown> = {
    serviceId: config.serviceId,
    correlationId: `fee-quote-${config.serviceId}-${Date.now()}`,
    applicant: {
      userId: currentProfileId || "",
      userTypeCode: resolveApplicantUserTypeCode(userInfo, currentProfileId),
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      ...(applicantOverrides || {}),
    },
    requestTime: toApi(nowGst()),
    ...(requestOverrides || {}),
  };

  if (payload && Object.keys(payload).length > 0) {
    request.payload = payload;
  }

  return {
    actionType,
    ...(config.expectedFeeVersion
      ? { expectedFeeVersion: config.expectedFeeVersion }
      : {}),
    request: request as FeeQuoteEnginePayload["request"],
  };
};

export const normalizeActionType4ApplicationNo = (value: unknown) => {
  const normalized = coerceString(value)?.trim();
  if (!normalized || normalized === "-") {
    return "";
  }

  return normalized;
};

export const overrideFeeEnginePayloadApplicationNoForActionType4 = (
  enginePayload: FeeQuoteEnginePayload | undefined,
  actionType4ApplicationNo?: string,
) => {
  if (!enginePayload || enginePayload.actionType !== 4) {
    return enginePayload;
  }

  const currentPayload =
    typeof enginePayload.request?.payload === "object" &&
    enginePayload.request.payload !== null
      ? enginePayload.request.payload
      : {};

  return {
    ...enginePayload,
    request: {
      ...enginePayload.request,
      payload: {
        ...currentPayload,
        applicationNo: normalizeActionType4ApplicationNo(
          actionType4ApplicationNo,
        ),
      },
    },
  };
};

export const findFirstFormValue = (
  formValuesList: FormValues[],
  paths: string[],
) => {
  return getFirstDefined(
    formValuesList.flatMap((formValues) => paths.map((path) => get(formValues, path))),
  );
};

export const resolveSelectedNumberIdsFromSelectTable = (
  formValuesList: FormValues[],
) => {
  const selectTable = resolveSelectTableValue(formValuesList);
  return (resolveSelectedIds(selectTable) || [])
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const resolveSelectedNumberIdsFromAddedSelectTable = (
  formValuesList: FormValues[],
) => {
  const selectTable = resolveSelectTableValue(formValuesList);
  return (resolveAddedSelectedIds(selectTable) || [])
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const resolveSelectedNumberIdsFromSelectTableSingle = (
  formValuesList: FormValues[],
) => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  const selectedKey = selectTableSingle?.selectedKey;
  const normalized = Array.isArray(selectedKey)
    ? selectedKey
    : selectedKey !== undefined && selectedKey !== null
      ? [selectedKey]
      : [];

  return normalized
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const normalizeDateValue = (value: unknown): string | undefined => {
  const normalized = coerceString(value);
  if (!normalized) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return normalized;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

export const resolveDateRangeValue = (value: unknown) => {
  if (!Array.isArray(value)) {
    return {
      startDate: undefined,
      endDate: undefined,
    };
  }

  return {
    startDate: normalizeDateValue(value[0]),
    endDate: normalizeDateValue(value[1]),
  };
};

export const DEFAULT_TEST_VALUE = "DEFAULT_TEST";

export const defaultStringValue = (value: unknown) => {
  return coerceString(value) ?? DEFAULT_TEST_VALUE;
};

export const defaultNumberValue = (value: unknown) => {
  return coerceNumber(value) ?? 0;
};

export const defaultBooleanValue = (value: unknown) => {
  return coerceBoolean(value) ?? false;
};

export const defaultStringArrayValue = (value: unknown) => {
  if (!Array.isArray(value)) return [DEFAULT_TEST_VALUE];
  const normalized = value
    .map((item) => coerceString(item))
    .filter((item): item is string => !!item);
  return normalized.length > 0 ? normalized : [DEFAULT_TEST_VALUE];
};

export const defaultNumberArrayValue = (value: unknown) => {
  if (!Array.isArray(value)) return [0];
  const normalized = value
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
  return normalized.length > 0 ? normalized : [0];
};

export const SELECTEDPACKAGETYPES_MAP: Record<string, number> = {
  "1002": 1,
  "2201": 2,
  "21": 5,
  "2202": 6,
  "1009": 7,
  "1001": 8,
  "1010": 9,
}
