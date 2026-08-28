import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceString,
  resolveSelectedIds,
  resolveSelectTableValue,
} from "../ruleStrategyPayloadUtils";
import {
  coerceNumber,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
} from "./feeStrategyPayloadUtils";

const SERVICE_80041_APPLICATION_DETAIL_ID = 804004;

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
      "Unable to build service 80041 fee payload: licensePermitNo is required.",
    );
  }

  return resolved;
};

const resolveActivitySelectionValue = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const selectTableValue = resolveSelectTableValue(formValuesList);
  if (selectTableValue) return selectTableValue;

  for (const formValues of formValuesList) {
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

const resolveActivityIds = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const selectTableValue = resolveActivitySelectionValue(formValuesList);

  return resolveSelectedIds(selectTableValue)
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService80041FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService80041FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService80041FeeEnginePayload = async ({
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
      "Unable to build service 80041 fee payload: at least one activityId is required.",
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
      // Docs/sample payload show 80041002, but implementation must use 804004.
      applicationDetailId: SERVICE_80041_APPLICATION_DETAIL_ID,
      activityIds,
    },
  });
};
