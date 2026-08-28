import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1205RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  resolveTermsAgreed,
  resolveUploadUrl,
} from "../ruleStrategyPayloadUtils";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

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

export const buildService1205Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service1205RuleStrategyValidatePayload => {
  return {
    actionType: 4,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      EconomicApprovalLetterUrl: resolveInitialApprovalDocumentUrl(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
