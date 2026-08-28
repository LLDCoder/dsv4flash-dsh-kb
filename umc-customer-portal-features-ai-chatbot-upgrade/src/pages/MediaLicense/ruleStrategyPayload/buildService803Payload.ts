import type { Service803RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { nowGst, toApi } from "@/utils/gstTime";
import { ModifyEnginePayloadError } from "../modifyEnginePayloadError";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import { resolveIdSelectorValue } from "../ruleStrategyPayloadShared";
import { buildService803ModifyFacts } from "../service803ModifyFacts";

export const buildService803Payload = ({
  config,
  formValuesList,
  modifyChangeSets,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service803RuleStrategyValidatePayload => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;
  const applicationId = lifecycleSource?.sourceApplicationId;
  const applicationDetailId = lifecycleSource?.sourceApplicationDetailId;

  if (applicationId == null || applicationDetailId == null) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 803 rule payload: applicationId and applicationDetailId are required.",
    );
  }

  const facts = buildService803ModifyFacts({
    modifyChangeSets,
    idSelector: resolveIdSelectorValue(formValuesList),
  });
  if (facts.modificationItems.length === 0) {
    throw new ModifyEnginePayloadError(
      "no-supported-changes",
      "Unable to build service 803 rule payload: at least one supported modification is required.",
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
