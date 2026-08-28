import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1204RuleStrategyValidatePayload } from "@/services/services";
import { useUpdateFormStore } from "@/store/update-form";
import get from "lodash/get";
import { coerceNumber, getFirstDefined } from "../ruleStrategyPayloadUtils";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
  resolveSelectTableSingleValue,
} from "../ruleStrategyPayloadShared";

const SERVICE_1204_RULE_VERSION = "1.0.0";
const SERVICE_1204_BASE_RENEWAL_FIELD_CODES = ["NUMBER_OF_LANGUAGES"];
const SERVICE_1204_PERIODICAL_TYPE_ID_BY_ACTIVITY_ID: Record<number, number | null> = {
  1008: 1,
  1010: 2,
  1029: 2,
  1031: 3,
  1011: 4,
  1012: 5,
  1014: 6,
  1015: 1,
  1016: 2,
  1030: 2,
  1032: 3,
  1017: 4,
  1018: 5,
  1019: 6,
  1020: null,
  2093: 1,
  2094: 2,
  2095: 2,
  2096: 3,
  2097: 4,
  2098: 5,
  2099: 6,
};

const resolveRenewalFieldCodes = (
  formValuesList: Array<Record<string, unknown>>,
  periodicalTypeId: number | null | undefined,
) => {
  getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "renewalFieldCodes"),
      get(formValues, "SelectTable.renewalFieldCodes"),
      get(formValues, "SelectTableSingle.renewalFieldCodes"),
    ]),
  );

  if (periodicalTypeId === undefined) {
    return SERVICE_1204_BASE_RENEWAL_FIELD_CODES;
  }

  return [...SERVICE_1204_BASE_RENEWAL_FIELD_CODES, periodicalTypeId];
};

const resolveActivityId = (formValuesList: Array<Record<string, unknown>>) => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  const selectedKey = selectTableSingle?.selectedKey;
  const firstSelectedKey = Array.isArray(selectedKey) ? selectedKey[0] : selectedKey;

  return coerceNumber(
    getFirstDefined([firstSelectedKey, get(selectTableSingle, "tableData.0.Id")]),
  );
};

const resolvePeriodicalTypeId = (formValuesList: Array<Record<string, unknown>>) => {
  const activityId = resolveActivityId(formValuesList);
  if (activityId === undefined) return undefined;

  return SERVICE_1204_PERIODICAL_TYPE_ID_BY_ACTIVITY_ID[activityId];
};

export const buildService1204Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service1204RuleStrategyValidatePayload => {
  const applicationId = useUpdateFormStore.getState().applicationId;
  const periodicalTypeId = resolvePeriodicalTypeId(formValuesList);
  const request: Service1204RuleStrategyValidatePayload["request"] & {
    periodicalTypeId?: number | null;
    renewalFieldCodes: Array<string | number | null>;
  } = {
    serviceId: config.serviceId,
    applicantUserId: currentProfileId,
    establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
    applicationId: applicationId ?? undefined,
    submissionMode,
    requestTime: toApi(nowGst()),
    renewalFieldCodes: resolveRenewalFieldCodes(formValuesList, periodicalTypeId),
  };

  if (periodicalTypeId !== undefined) {
    request.periodicalTypeId = periodicalTypeId;
  }

  return {
    actionType: 2,
    expectedRuleVersion: SERVICE_1204_RULE_VERSION,
    request,
  };
};
