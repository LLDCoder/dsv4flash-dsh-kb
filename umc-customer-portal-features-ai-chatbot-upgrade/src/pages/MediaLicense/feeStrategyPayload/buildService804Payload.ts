import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  coerceNumber,
  getFirstDefined,
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

const APPLICATION_ID_PATHS = [
  "applicationId",
  "payload.applicationId",
  "SelectTable.applicationId",
  "SelectTableSingle.applicationId",
  "sourceApplicationId",
  "payload.sourceApplicationId",
  "SelectTable.sourceApplicationId",
  "SelectTableSingle.sourceApplicationId",
];

const APPLICATION_DETAIL_ID_PATHS = [
  "applicationDetailId",
  "payload.applicationDetailId",
  "SelectTable.applicationDetailId",
  "SelectTableSingle.applicationDetailId",
  "sourceApplicationDetailId",
  "payload.sourceApplicationDetailId",
  "SelectTable.sourceApplicationDetailId",
  "SelectTableSingle.sourceApplicationDetailId",
];

const resolveRequiredLicensePermitNo = (
  licensePermitNo?: string | null,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;
  const resolved = coerceString(
    licensePermitNo ?? lifecycleSource?.licensePermitNo,
  )?.trim();

  if (!resolved || resolved === "-") {
    throw new Error(
      "Unable to build service 804 fee payload: licensePermitNo is required.",
    );
  }

  return resolved;
};

const resolveFormValueByPaths = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
  paths: string[],
) => {
  return getFirstDefined(
    formValuesList.flatMap((formValues) => paths.map((path) => get(formValues, path))),
  );
};

const resolveApplicationContext = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;

  const applicationId = coerceNumber(
    getFirstDefined([
      resolveFormValueByPaths(formValuesList, APPLICATION_ID_PATHS),
      lifecycleSource?.sourceApplicationId,
    ]),
  );

  const applicationDetailId =
    coerceNumber(
      getFirstDefined([
        resolveFormValueByPaths(formValuesList, APPLICATION_DETAIL_ID_PATHS),
        lifecycleSource?.sourceApplicationDetailId,
      ]),
    ) ?? 804002;

  if (applicationId === undefined) {
    throw new Error(
      "Unable to build service 804 fee payload: applicationId is required.",
    );
  }

  return {
    applicationId,
    applicationDetailId,
  };
};

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

export const buildService804PartnerDeltaSummary = (
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
    return buildService804PartnerDeltaSummary(formValuesList).addedCount;
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
    return buildService804PartnerDeltaSummary(formValuesList).removedCount;
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
    return buildService804PartnerDeltaSummary(formValuesList).retainedCount;
  }

  return resolvePartnerList(formValuesList).filter((partner) => {
    return !isTemporaryPartnerId(get(partner, "id"));
  }).length;
};

export const buildService804FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService804FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService804FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  licensePermitNo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const { applicationId, applicationDetailId } = resolveApplicationContext(
    formValuesList,
  );

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 4,
    applicantOverrides: {
      licensePermitNo: resolveRequiredLicensePermitNo(licensePermitNo),
    },
    payload: {
      // applicationContext: {
        applicationId,
        applicationDetailId: String(applicationDetailId),
      // },
      // applicationData: {
        addedPartnerCount: resolveAddedPartnerCount(formValuesList),
        removedPartnerCount: resolveRemovedPartnerCount(formValuesList),
        retainedPartnerCount: resolveRetainedPartnerCount(formValuesList),
      // },
    },
  });
};
