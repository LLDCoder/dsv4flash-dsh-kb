import { nowGst, toApi } from "@/utils/gstTime";
import type { Service905RuleStrategyValidatePayload } from "@/services/services";
import { useUpdateFormStore } from "@/store/update-form";
import get from "lodash/get";
import {
  resolveTermsAgreed,
  resolveUploadUrl,
} from "../ruleStrategyPayloadUtils";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

const SERVICE_905_RULE_VERSION = "1.0.0";

const resolveInitialApprovalDocumentUrl = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  return resolveUploadUrl(
    formValuesList
      .map((formValues) =>
        [
          get(formValues, "initialApprovalDocumentUrl"),
          get(formValues, "InitialApprovalDocumentUrl"),
          get(formValues, "EconomicDepartmentApprovalLetter"),
          get(formValues, "SelectTableSingle.initialApprovalDocumentUrl"),
          get(formValues, "SelectTableSingle.InitialApprovalDocumentUrl"),
          get(formValues, "SelectTableSingle.EconomicDepartmentApprovalLetter"),
        ].find((value) => value !== undefined),
      )
      .find((value) => value !== undefined),
  );
};

export const buildService905Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service905RuleStrategyValidatePayload => {
  // const applicationId = useUpdateFormStore.getState().applicationId;

  return {
    actionType: 4,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      // applicationId: applicationId ?? undefined,
      // applicationDetailId: applicationId ?? undefined,
      submissionMode,
      requestTime: toApi(nowGst()),
      initialApprovalDocumentUrl: resolveInitialApprovalDocumentUrl(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
