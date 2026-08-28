import { nowGst, toApi } from "@/utils/gstTime";
import type { Service904RuleStrategyValidatePayload } from "@/services/services";
import { useUpdateFormStore } from "@/store/update-form";
import get from "lodash/get";
import {
  coerceNumber,
  resolveUploadUrl,
  resolveSelectedIds,
  resolveSelectTableValue,
  resolveTermsAgreed,
} from "../ruleStrategyPayloadUtils";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

const resolveActivityIds = (formValuesList: Array<Record<string, unknown>>) => {
  const selectTableValue = resolveSelectTableValue(formValuesList);
  const selectedIds = resolveSelectedIds(selectTableValue);

  return selectedIds
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService904Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service904RuleStrategyValidatePayload => {
  const applicationId = useUpdateFormStore.getState().applicationId;

  return {
    actionType: 3,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicationId: applicationId ?? undefined,
      applicationDetailId: applicationId ?? undefined,
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: resolveActivityIds(formValuesList),
      initialApprovalDocumentUrl: resolveUploadUrl(
        formValuesList
          .map((formValues) => get(formValues, "EconomicDepartmentApprovalLetter"))
          .find((value) => value !== undefined),
      ),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
