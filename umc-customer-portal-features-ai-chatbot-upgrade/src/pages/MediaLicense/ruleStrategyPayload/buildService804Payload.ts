import { nowGst, toApi } from "@/utils/gstTime";
import type { Service804RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { useUpdateFormStore } from "@/store/update-form";
import get from "lodash/get";
import {
  coerceNumber,
  getFirstDefined,
  resolveTermsAgreed,
  resolveUploadUrl,
} from "../ruleStrategyPayloadUtils";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

const SERVICE_804_RULE_VERSION = "1.0.0";

const APPLICATION_ID_PATHS = [
  "applicationId",
  "payload.applicationId",
  "sourceApplicationId",
  "SelectTable.applicationId",
  "SelectTable.sourceApplicationId",
  "SelectTableSingle.applicationId",
  "SelectTableSingle.sourceApplicationId",
];

const resolveEconomicApprovalLetterUrl = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  return resolveUploadUrl(
    formValuesList
      .map((formValues) =>
        [
          get(formValues, "economicApprovalLetterUrl"),
          get(formValues, "EconomicApprovalLetterUrl"),
          get(formValues, "EconomicDepartmentApprovalLetter"),
          get(formValues, "SelectTable.economicApprovalLetterUrl"),
          get(formValues, "SelectTable.EconomicApprovalLetterUrl"),
          get(formValues, "SelectTable.EconomicDepartmentApprovalLetter"),
          get(formValues, "SelectTableSingle.economicApprovalLetterUrl"),
          get(formValues, "SelectTableSingle.EconomicApprovalLetterUrl"),
          get(formValues, "SelectTableSingle.EconomicDepartmentApprovalLetter"),
        ].find((value) => value !== undefined),
      )
      .find((value) => value !== undefined),
  );
};

const resolveApplicationId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;
  const storedApplicationId = useUpdateFormStore.getState().applicationId;

  return coerceNumber(
    getFirstDefined([
      ...formValuesList.flatMap((formValues) =>
        APPLICATION_ID_PATHS.map((path) => get(formValues, path)),
      ),
      lifecycleSource?.sourceApplicationId,
      storedApplicationId,
    ]),
  );
};

export const buildService804Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service804RuleStrategyValidatePayload => {
  return {
    actionType: 4,
    expectedRuleVersion: SERVICE_804_RULE_VERSION,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicationId: resolveApplicationId(formValuesList),
      submissionMode,
      requestTime: toApi(nowGst()),
      economicApprovalLetterUrl: resolveEconomicApprovalLetterUrl(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
