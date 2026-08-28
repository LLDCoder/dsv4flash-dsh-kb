import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const SERVICE_80022_DEFAULT_APPLICATION_ID = 80022001;
const SERVICE_80022_DEFAULT_APPLICATION_DETAIL_ID = 80022002;

const APPLICATION_ID_PATHS = [
  "applicationId",
  "payload.applicationId",
  "sourceApplicationId",
  "payload.sourceApplicationId",
  "SelectTable.applicationId",
  "SelectTable.sourceApplicationId",
  "SelectTableSingle.applicationId",
  "SelectTableSingle.sourceApplicationId",
];

const APPLICATION_DETAIL_ID_PATHS = [
  "applicationDetailId",
  "payload.applicationDetailId",
  "sourceApplicationDetailId",
  "payload.sourceApplicationDetailId",
  "SelectTable.applicationDetailId",
  "SelectTable.sourceApplicationDetailId",
  "SelectTableSingle.applicationDetailId",
  "SelectTableSingle.sourceApplicationDetailId",
];

const ACTIVITY_ID_PATHS = [
  "activityIds",
  "payload.activityIds",
  "SelectTable.activityIds",
  "SelectTable.selectedActivityIds",
  "SelectTableSingle.activityIds",
  "SelectTableSingle.selectedActivityIds",
  "selectedActivityIds",
  "selectedKey",
  "SelectTable.selectedKey",
  "SelectTableSingle.selectedKey",
];

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
  applicationIdFromParams?: number | null,
  sourceApplicationIdFromParams?: number | null,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;

  const applicationId = coerceNumber(
    getFirstDefined([
      applicationIdFromParams,
      sourceApplicationIdFromParams,
      resolveFormValueByPaths(formValuesList, APPLICATION_ID_PATHS),
      lifecycleSource?.sourceApplicationId,
    ]),
  );

  const applicationDetailId = coerceNumber(
    getFirstDefined([
      resolveFormValueByPaths(formValuesList, APPLICATION_DETAIL_ID_PATHS),
      lifecycleSource?.sourceApplicationDetailId,
    ]),
  );

  if (applicationId === undefined && applicationDetailId === undefined) {
    return {
      applicationId: SERVICE_80022_DEFAULT_APPLICATION_ID,
      applicationDetailId: SERVICE_80022_DEFAULT_APPLICATION_DETAIL_ID,
    };
  }

  return {
    applicationId,
    applicationDetailId,
  };
};

const resolveActivityIds = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const rawActivityIds = getFirstDefined(
    formValuesList.flatMap((formValues) =>
      ACTIVITY_ID_PATHS.map((path) => get(formValues, path)),
    ),
  );

  const normalizedActivityIds = Array.isArray(rawActivityIds)
    ? rawActivityIds
    : rawActivityIds !== undefined && rawActivityIds !== null
      ? [rawActivityIds]
      : [];

  const activityIds = normalizedActivityIds
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);

  if (activityIds.length > 0) {
    return activityIds;
  }

  return formValuesList
    .flatMap((formValues) => {
      const tableData = get(formValues, "SelectTableSingle.tableData");
      return Array.isArray(tableData) ? tableData : [];
    })
    .map((item) => coerceNumber(get(item, "Id")))
    .filter((item): item is number => item !== undefined);
};

export const buildService80022FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService80022FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService80022FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  applicationId,
  sourceApplicationId,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const {  applicationId: resolvedApplicationId } =
    resolveApplicationContext(
      formValuesList,
      applicationId,
      sourceApplicationId,
    );

  const activityIds = resolveActivityIds(formValuesList);

  if (activityIds.length === 0) {
    throw new Error(
      "Unable to build service 80022 fee payload: at least one activityId is required.",
    );
  }

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 2,
    payload: {
      ...(resolvedApplicationId !== undefined
        ? { applicationId: resolvedApplicationId }
        : {}),
      applicationDetailId: 80022002,
      activityIds,
    },
  });
};
