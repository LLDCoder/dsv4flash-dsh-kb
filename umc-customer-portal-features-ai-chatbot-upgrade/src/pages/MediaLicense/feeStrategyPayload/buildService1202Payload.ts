import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
} from "./feeStrategyPayloadUtils";

const resolveApplicationContext = (
  sourceApplicationId?: number | null,
  sourceApplicationDetailId?: number | null,
) => {
  const applicationId = coerceNumber(sourceApplicationId);
  const applicationDetailId = coerceNumber(sourceApplicationDetailId);

  if (applicationId === undefined || applicationDetailId === undefined) {
    throw new Error(
      "Unable to build service 1202 fee payload: applicationId and applicationDetailId are required.",
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
  const resolved = coerceString(licensePermitNo)?.trim();

  if (!resolved || resolved === "-") {
    throw new Error(
      "Unable to build service 1202 fee payload: licensePermitNo is required.",
    );
  }

  return resolved;
};

export const buildService1202FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1202FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1202FeeEnginePayload = async ({
  config,
  currentProfileId,
  userInfo,
  licensePermitNo,
  sourceApplicationId,
  sourceApplicationDetailId,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const { applicationId, applicationDetailId } = resolveApplicationContext(
    sourceApplicationId,
    sourceApplicationDetailId,
  );

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
      applicationDetailId,
    },
  });
};
