import type { Service1203RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { nowGst, toApi } from "@/utils/gstTime";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";
import { ModifyEnginePayloadError } from "../modifyEnginePayloadError";

const toPositiveInteger = (value: unknown): number | undefined => {
  const normalizedValue =
    typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isSafeInteger(normalizedValue) && normalizedValue > 0
    ? normalizedValue
    : undefined;
};

export const buildService1203Payload = ({
  config,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service1203RuleStrategyValidatePayload => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;
  const applicantUserId = String(currentProfileId ?? "").trim();
  const establishmentId = String(
    resolveEstablishmentId(userInfo, currentProfileId),
  ).trim();
  const applicationId = toPositiveInteger(lifecycleSource?.sourceApplicationId);
  const applicationDetailId = toPositiveInteger(
    lifecycleSource?.sourceApplicationDetailId,
  );
  const mediaLicenseId = toPositiveInteger(
    lifecycleSource?.sourceMedialLicenseId,
  );
  const licensePermitNo = String(
    lifecycleSource?.licensePermitNo ?? "",
  ).trim();

  if (
    !applicantUserId ||
    !establishmentId ||
    applicationId === undefined ||
    applicationDetailId === undefined ||
    mediaLicenseId === undefined ||
    !licensePermitNo ||
    licensePermitNo === "-"
  ) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 1203 rule payload: applicant, establishment, application, license permit, and media license context are required.",
    );
  }

  return {
    actionType: 4,
    request: {
      serviceId: config.serviceId,
      applicantUserId,
      establishmentId,
      applicationId,
      applicationDetailId,
      licensePermitNo,
      mediaLicenseId,
      termsAgreed: true,
      submissionMode,
      requestTime: toApi(nowGst()),
    },
  };
};
