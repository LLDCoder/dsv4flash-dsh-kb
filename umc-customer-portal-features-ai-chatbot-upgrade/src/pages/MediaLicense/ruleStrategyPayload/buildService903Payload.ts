import { nowGst, toApi } from "@/utils/gstTime";
import type { Service903RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { ModifyEnginePayloadError } from "../modifyEnginePayloadError";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import { buildService903ModifyFacts } from "../service903ModifyFacts";

export const buildService903Payload = ({
  config,
  formValuesList,
  modifyChangeSets,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service903RuleStrategyValidatePayload => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;
  const applicationId = lifecycleSource?.sourceApplicationId;
  const applicationDetailId = lifecycleSource?.sourceApplicationDetailId;

  if (applicationId == null || applicationDetailId == null) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 903 rule payload: applicationId and applicationDetailId are required.",
    );
  }

  const facts = buildService903ModifyFacts({
    formValuesList,
    modifyChangeSets,
  });
  if (facts.modificationItems.length === 0) {
    throw new ModifyEnginePayloadError(
      "no-supported-changes",
      "Unable to build service 903 rule payload: at least one supported modification is required.",
    );
  }
  if (
    facts.modificationItems.includes("TRADE_LICENSE_NUMBER") &&
    !facts.tradeLicenseNumber
  ) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 903 rule payload: tradeLicenseNumber is required when the Trade License Number changes.",
    );
  }

  return {
    actionType: 4,
    request: {
      serviceId: config.serviceId,
      applicationId,
      applicationDetailId,
      ...facts,
      termsAgreed: true,
      submissionMode,
      requestTime: toApi(nowGst()),
    },
  };
};
