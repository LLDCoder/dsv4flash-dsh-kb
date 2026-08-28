import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import { ModifyEnginePayloadError } from "../modifyEnginePayloadError";
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
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 1203 fee payload: applicationId and applicationDetailId are required.",
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
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 1203 fee payload: licensePermitNo is required.",
    );
  }

  return resolved;
};

const resolveRequiredMediaLicenseId = (
  sourceMedialLicenseId?: number | null,
) => {
  const mediaLicenseId = coerceNumber(sourceMedialLicenseId);

  if (mediaLicenseId === undefined) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 1203 fee payload: mediaLicenseId is required.",
    );
  }

  return mediaLicenseId;
};

export const buildService1203FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1203FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1203FeeEnginePayload = async ({
  config,
  currentProfileId,
  userInfo,
  licensePermitNo,
  sourceApplicationId,
  sourceApplicationDetailId,
  sourceMedialLicenseId,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const { applicationId, applicationDetailId } = resolveApplicationContext(
    sourceApplicationId,
    sourceApplicationDetailId,
  );
  const resolvedLicensePermitNo =
    resolveRequiredLicensePermitNo(licensePermitNo);
  resolveRequiredMediaLicenseId(sourceMedialLicenseId);

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 4,
    applicantOverrides: {
      licensePermitNo: resolvedLicensePermitNo,
    },
    payload: {
      applicationId,
      applicationDetailId,
      licensePermitNo: resolvedLicensePermitNo,
    },
  });
};
