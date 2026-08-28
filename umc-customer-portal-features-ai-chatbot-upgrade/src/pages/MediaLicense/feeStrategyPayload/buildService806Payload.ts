import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
} from "./feeStrategyPayloadUtils";

const SERVICE_806_APPLICATION_DETAIL_ID = 806002;

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
      "Unable to build service 806 fee payload: licensePermitNo is required.",
    );
  }

  return resolved;
};

const resolveActivitySelectionValue = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  for (const formValues of formValuesList) {
    const selectTableValue = get(formValues, "SelectTable");
    if (selectTableValue) {
      return selectTableValue as {
        selectedKey?: string | number | Array<string | number>;
        prefilledSelectedKey?: string | number | Array<string | number>;
        tableData?: Array<{ Id?: unknown }>;
      };
    }

    const selectTableSingleValue = get(formValues, "SelectTableSingle");
    if (selectTableSingleValue) {
      return selectTableSingleValue as {
        selectedKey?: string | number | Array<string | number>;
        prefilledSelectedKey?: string | number | Array<string | number>;
        tableData?: Array<{ Id?: unknown }>;
      };
    }
  }

  return undefined;
};

const resolveSelectedIds = (
  selectValue?: {
    selectedKey?: string | number | Array<string | number>;
    prefilledSelectedKey?: string | number | Array<string | number>;
    tableData?: Array<{ Id?: unknown }>;
  },
) => {
  const selectedKey = selectValue?.selectedKey;
  if (Array.isArray(selectedKey)) {
    const ids = selectedKey
      .map((item) => coerceNumber(item) ?? String(item).trim())
      .filter((item): item is number | string => item !== undefined && item !== "");

    if (ids.length > 0) {
      return ids;
    }
  }

  return (selectValue?.tableData ?? [])
    .map((item) => coerceNumber(item?.Id) ?? String(item?.Id ?? "").trim())
    .filter((item): item is number | string => item !== undefined && item !== "");
};

const resolveActivityIds = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const selectTableValue = resolveActivitySelectionValue(formValuesList);
  return resolveSelectedIds(selectTableValue)
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService806FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService806FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService806FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  applicationId,
  licensePermitNo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const activityIds = resolveActivityIds(formValuesList);

  if (activityIds.length === 0) {
    throw new Error(
      "Unable to build service 806 fee payload: at least one activityId is required.",
    );
  }

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 3,
    applicantOverrides: {
      licensePermitNo: resolveRequiredLicensePermitNo(licensePermitNo),
    },
    payload: {
      applicationId,
      applicationDetailId: SERVICE_806_APPLICATION_DETAIL_ID,
      activityIds,
    },
  });
};
