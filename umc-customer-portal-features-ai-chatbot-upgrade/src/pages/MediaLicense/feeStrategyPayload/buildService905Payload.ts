import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  coerceNumber,
} from "./feeStrategyPayloadUtils";

type PartnerRecord = Record<string, unknown>;

const PARTNER_LIST_PATHS = [
  "PartnerList",
  "partnerList",
  "payload.partnerList",
  "partnerChange.partnerList",
];

const ADDED_PARTNER_COUNT_PATHS = [
  "addedPartnerCount",
  "payload.addedPartnerCount",
];

const REMOVED_PARTNER_COUNT_PATHS = [
  "removedPartnerCount",
  "payload.removedPartnerCount",
];

const RETAINED_PARTNER_COUNT_PATHS = [
  "retainedPartnerCount",
  "payload.retainedPartnerCount",
];

const INITIAL_PARTNER_IDS_PATHS = [
  "partnerManagementInitialPartnerIds",
  "initialPartnerIds",
  "payload.partnerManagementInitialPartnerIds",
  "payload.initialPartnerIds",
  "partnerChange.partnerManagementInitialPartnerIds",
  "partnerChange.initialPartnerIds",
];

const REMOVED_PARTNER_LIST_PATHS = [
  "removedPartnerList",
  "RemovedPartnerList",
  "removedPartners",
  "deletedPartnerList",
  "deletedPartners",
  "payload.removedPartnerList",
  "payload.removedPartners",
];

const getFirstDefinedValue = (
  formValuesList: Array<Record<string, unknown>>,
  paths: string[],
) => {
  for (const formValues of formValuesList) {
    for (const path of paths) {
      const value = get(formValues, path);
      if (value !== undefined) return value;
    }
  }

  return undefined;
};

const resolvePartnerList = (
  formValuesList: Array<Record<string, unknown>>,
): PartnerRecord[] => {
  const value = getFirstDefinedValue(formValuesList, PARTNER_LIST_PATHS);
  return Array.isArray(value) ? (value as PartnerRecord[]) : [];
};

const isTemporaryPartnerId = (value: unknown) => {
  const normalized = String(value || "").trim();
  return !normalized || normalized.startsWith("partner-");
};

const resolveInitialPartnerIds = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const value = getFirstDefinedValue(formValuesList, INITIAL_PARTNER_IDS_PATHS);
  if (!Array.isArray(value)) return [];

  return value
    .map((id) => String(id || "").trim())
    .filter(Boolean);
};

export const buildService905PartnerDeltaSummary = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const initialPartnerIds = new Set(resolveInitialPartnerIds(formValuesList));
  const currentPartnerIds = resolvePartnerList(formValuesList)
    .map((partner) => String(get(partner, "id") || "").trim())
    .filter(Boolean);

  let addedCount = 0;
  let retainedCount = 0;

  currentPartnerIds.forEach((id) => {
    if (isTemporaryPartnerId(id)) {
      addedCount += 1;
      return;
    }

    if (initialPartnerIds.has(id)) {
      retainedCount += 1;
    }
  });

  const removedCount = Math.max(initialPartnerIds.size - retainedCount, 0);

  return {
    addedCount,
    removedCount,
    retainedCount,
  };
};

const resolveAddedPartnerCount = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const explicitValue = coerceNumber(
    getFirstDefinedValue(formValuesList, ADDED_PARTNER_COUNT_PATHS),
  );
  if (explicitValue !== undefined) return explicitValue;

  const initialPartnerIds = resolveInitialPartnerIds(formValuesList);
  if (initialPartnerIds.length > 0) {
    return buildService905PartnerDeltaSummary(formValuesList).addedCount;
  }

  return resolvePartnerList(formValuesList).filter((partner) =>
    isTemporaryPartnerId(get(partner, "id")),
  ).length;
};

const resolveRemovedPartnerCount = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const explicitValue = coerceNumber(
    getFirstDefinedValue(formValuesList, REMOVED_PARTNER_COUNT_PATHS),
  );
  if (explicitValue !== undefined) return explicitValue;

  const initialPartnerIds = resolveInitialPartnerIds(formValuesList);
  if (initialPartnerIds.length > 0) {
    return buildService905PartnerDeltaSummary(formValuesList).removedCount;
  }

  const removedPartnerList = getFirstDefinedValue(
    formValuesList,
    REMOVED_PARTNER_LIST_PATHS,
  );
  return Array.isArray(removedPartnerList) ? removedPartnerList.length : 0;
};

const resolveRetainedPartnerCount = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const explicitValue = coerceNumber(
    getFirstDefinedValue(formValuesList, RETAINED_PARTNER_COUNT_PATHS),
  );
  if (explicitValue !== undefined) return explicitValue;

  const initialPartnerIds = resolveInitialPartnerIds(formValuesList);
  if (initialPartnerIds.length > 0) {
    return buildService905PartnerDeltaSummary(formValuesList).retainedCount;
  }

  return resolvePartnerList(formValuesList).filter((partner) => {
    return !isTemporaryPartnerId(get(partner, "id"));
  }).length;
};

export const buildService905FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService905FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService905FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  applicationNo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 4,
    payload: {
      applicationNo: applicationNo || "",
      addedPartnerCount: resolveAddedPartnerCount(formValuesList),
      removedPartnerCount: resolveRemovedPartnerCount(formValuesList),
      retainedPartnerCount: resolveRetainedPartnerCount(formValuesList),
    },
  });
};
