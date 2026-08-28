import type { FeeQuoteEnginePayload } from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import { ModifyEnginePayloadError } from "../modifyEnginePayloadError";
import {
  coerceNumber,
  coerceString,
  createFeeEnginePayload,
} from "./feeStrategyPayloadUtils";

const resolveApplicationContext = ({
  config,
  sourceApplicationId,
  sourceApplicationDetailId,
}: BuildServiceFeeStrategyPayloadParams) => {
  const applicationId = coerceNumber(sourceApplicationId);
  const applicationDetailId = coerceNumber(sourceApplicationDetailId);

  if (applicationId === undefined || applicationDetailId === undefined) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      `Unable to build service ${config.serviceId} fee payload: applicationId and applicationDetailId are required.`,
    );
  }

  return { applicationId, applicationDetailId };
};

const resolveLicenseContext = ({
  config,
  licensePermitNo,
  sourceMedialLicenseId,
}: BuildServiceFeeStrategyPayloadParams) => {
  const resolvedLicensePermitNo = coerceString(licensePermitNo)?.trim();
  const mediaLicenseId = coerceNumber(sourceMedialLicenseId);

  if (!resolvedLicensePermitNo || resolvedLicensePermitNo === "-") {
    throw new ModifyEnginePayloadError(
      "missing-context",
      `Unable to build service ${config.serviceId} fee payload: licensePermitNo is required.`,
    );
  }
  if (mediaLicenseId === undefined) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      `Unable to build service ${config.serviceId} fee payload: mediaLicenseId is required.`,
    );
  }

  return { licensePermitNo: resolvedLicensePermitNo, mediaLicenseId };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const collectChangeSetItems = (changeSets: unknown[] | undefined) =>
  (changeSets || []).flatMap((changeSet) => {
    if (!isRecord(changeSet) || !Array.isArray(changeSet.changes)) return [];
    return changeSet.changes.filter(isRecord);
  });

const hasSocialMediaAccountChanges = (
  formValuesList: Array<Record<string, unknown>>,
) =>
  formValuesList.some((formValues) => {
    const value = get(formValues, "socialMediaAccounts");
    return (
      Array.isArray(value) &&
      value.some(
        (item) =>
          Boolean(item) &&
          typeof item === "object" &&
          ["ADD", "MODIFY", "DELETE"].includes(
            String((item as Record<string, unknown>).operation || "").toUpperCase(),
          ),
      )
    );
  });

const resolveModificationItems = ({
  config,
  formValuesList,
  modifyChangeSets,
}: BuildServiceFeeStrategyPayloadParams): string[] => {
  const changeItems = collectChangeSetItems(modifyChangeSets);
  const hasComponentChange = (component: string) =>
    changeItems.some((change) => change.component === component);
  const hasProfileChange = changeItems.some(
    (change) =>
      change.component === "ProfileForm" ||
      change.ownerComponent === "ProfileForm",
  );

  if (config.serviceId === 803) {
    const modificationItems: string[] = [];
    if (hasProfileChange) {
      modificationItems.push("ESTABLISHMENT_INFORMATION");
    }
    if (
      changeItems.some(
        (change) =>
          change.component !== "ProfileForm" &&
          change.ownerComponent !== "ProfileForm" &&
          change.component !== "SocialMediaAccount",
      )
    ) {
      modificationItems.push("CHIEF_EDITOR");
    }
    return modificationItems;
  }

  if (config.serviceId === 80011) {
    return hasSocialMediaAccountChanges(formValuesList)
      ? ["SOCIAL_MEDIA_ACCOUNT"]
      : [];
  }

  if (config.serviceId === 80012) {
    const modificationItems: string[] = [];
    if (hasProfileChange) {
      modificationItems.push("ESTABLISHMENT_INFORMATION");
    }
    if (
      hasComponentChange("SocialMediaAccount") ||
      hasSocialMediaAccountChanges(formValuesList)
    ) {
      modificationItems.push("SOCIAL_MEDIA_ACCOUNT");
    }
    return modificationItems;
  }

  return [];
};

export const buildModifyServiceFeeEnginePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnginePayload> => {
  const { applicationId, applicationDetailId } =
    resolveApplicationContext(params);
  const { licensePermitNo, mediaLicenseId } = resolveLicenseContext(params);
  const modificationItems = resolveModificationItems(params);

  if (modificationItems.length === 0) {
    throw new ModifyEnginePayloadError(
      "no-supported-changes",
      `Unable to build service ${params.config.serviceId} fee payload: at least one supported modification section is required.`,
    );
  }

  return createFeeEnginePayload({
    config: params.config,
    currentProfileId: params.currentProfileId,
    userInfo: params.userInfo,
    actionType: 4,
    applicantOverrides: { licensePermitNo },
    requestOverrides: { licensePermitNo, mediaLicenseId },
    payload: {
      applicationId,
      applicationDetailId,
      licensePermitNo,
      mediaLicenseId,
      modificationItems,
    },
  });
};
