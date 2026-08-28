import { nowGst, toApi } from "@/utils/gstTime";
import type {
  Service9RuleStrategyValidatePayload,
  Service901AccountBinding,
} from "@/services/services";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
  resolveSelectTableSingleValue,
  toActivityIds,
} from "../ruleStrategyPayloadShared";

export const buildService9Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service9RuleStrategyValidatePayload => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  if (!selectTableSingle) {
    throw new Error("SelectTableSingle data is missing for service 9.");
  }

  const rawAccountBindings = formValuesList
    .map((formValues) => get(formValues, ["activityAccountBindings"]))
    .find((value) => value !== undefined && value !== null && value !== "");
  const activityAccountBindings = Array.isArray(rawAccountBindings)
    ? (rawAccountBindings as Service901AccountBinding[])
    : [];

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: toActivityIds(selectTableSingle.tableData),
      activityAccountBindings,
      termsAgreed: true,
    },
  };
};
