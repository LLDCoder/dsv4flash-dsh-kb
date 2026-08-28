import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import { resolveEngineActivityIds } from "../resolveEngineActivityIds";
import {
  coerceNumber,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultBooleanValue,
  defaultNumberValue,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const SERVICE_80021_DEFAULT_COURIER_COMPANY_ID = 4;
const SERVICE_80021_APPLICATION_DETAIL_ID = 80021002;

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
  "SelectTable.selectedKey",
  "SelectTableSingle.activityIds",
  "SelectTableSingle.selectedActivityIds",
  "SelectTableSingle.selectedKey",
  "selectedActivityIds",
  "selectedKey",
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
    throw new Error(
      "Unable to build service 80021 fee payload: applicationId or applicationDetailId is required.",
    );
  }

  return {
    applicationId,
    applicationDetailId,
  };
};

const resolveRequiredLicensePermitNo = (
  licensePermitNo?: string | null,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;
  const resolved = getFirstDefined([
    licensePermitNo,
    lifecycleSource?.licensePermitNo,
  ]);
  const normalized = typeof resolved === "string" ? resolved.trim() : "";

  if (!normalized || normalized === "-") {
    throw new Error(
      "Unable to build service 80021 fee payload: licensePermitNo is required.",
    );
  }

  return normalized;
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
    .flatMap((formValues) => [
      get(formValues, "SelectTable.tableData"),
      get(formValues, "SelectTableSingle.tableData"),
      get(formValues, "tableData"),
    ])
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map((item) => coerceNumber(get(item, "Id")))
    .filter((item): item is number => item !== undefined);
};

export const buildService80021FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService80021FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService80021FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  applicationId,
  licensePermitNo,
  sourceApplicationId,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const physicalCertificateDeliveryRequested = defaultBooleanValue(
    resolveFormValueByPaths(formValuesList, [
      "physicalCertificateDeliveryRequested",
      "certificateInfo.physicalCertificateDeliveryRequested",
      "deliveryInfo.physicalCertificateDeliveryRequested",
    ]),
  );

  const courierCompanyId = defaultNumberValue(
    resolveFormValueByPaths(formValuesList, [
      "courierCompanyId",
      "certificateInfo.courierCompanyId",
      "deliveryInfo.courierCompanyId",
    ]),
  );

  const {
    applicationId: resolvedApplicationId,
    applicationDetailId,
  } = resolveApplicationContext(
    formValuesList,
    applicationId,
    sourceApplicationId,
  );

  const activityIds = resolveActivityIds(formValuesList);

  if (activityIds.length === 0) {
    throw new Error(
      "Unable to build service 80021 fee payload: at least one activityId is required.",
    );
  }

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 2,
    applicantOverrides: {
      licensePermitNo: resolveRequiredLicensePermitNo(licensePermitNo),
    },
    requestOverrides: {
      physicalCertificateDeliveryRequested,
      courierCompanyId:
        courierCompanyId > 0
          ? courierCompanyId
          : SERVICE_80021_DEFAULT_COURIER_COMPANY_ID,
    },
    payload: {
      ...(resolvedApplicationId !== undefined
        ? { applicationId: resolvedApplicationId }
        : {}),
      applicationDetailId:
        applicationDetailId ?? SERVICE_80021_APPLICATION_DETAIL_ID,
      activityIds,
    },
  });
};
