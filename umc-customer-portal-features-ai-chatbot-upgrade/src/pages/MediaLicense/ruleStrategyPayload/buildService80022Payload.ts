import { nowGst, toApi } from "@/utils/gstTime";
import type { Service80022RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  getFirstDefined,
  resolveTermsAgreed,
} from "../ruleStrategyPayloadUtils";

const SERVICE_80022_RULE_VERSION = "1.0.0";

const APPLICATION_ID_PATHS = [
  "applicationId",
  "payload.applicationId",
  "sourceApplicationId",
  "SelectTable.applicationId",
  "SelectTable.sourceApplicationId",
  "SelectTableSingle.applicationId",
  "SelectTableSingle.sourceApplicationId",
];

const APPLICATION_DETAIL_ID_PATHS = [
  "applicationDetailId",
  "payload.applicationDetailId",
  "sourceApplicationDetailId",
  "SelectTable.applicationDetailId",
  "SelectTable.sourceApplicationDetailId",
  "SelectTableSingle.applicationDetailId",
  "SelectTableSingle.sourceApplicationDetailId",
];

const resolveApplicationId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;

  return coerceNumber(
    getFirstDefined([
      ...formValuesList.flatMap((formValues) =>
        APPLICATION_ID_PATHS.map((path) => get(formValues, path)),
      ),
      lifecycleSource?.sourceApplicationId,
    ]),
  );
};

const resolveApplicationDetailId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;

  return coerceNumber(
    getFirstDefined([
      ...formValuesList.flatMap((formValues) =>
        APPLICATION_DETAIL_ID_PATHS.map((path) => get(formValues, path)),
      ),
      lifecycleSource?.sourceApplicationDetailId,
    ]),
  );
};

const resolveActivityIds = (formValuesList: Array<Record<string, unknown>>) => {
  const rawActivityIds = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "activityIds"),
      get(formValues, "SelectTableSingle.activityIds"),
      get(formValues, "SelectTableSingle.selectedKey"),
      get(formValues, "selectedKey"),
    ]),
  );

  return (Array.isArray(rawActivityIds) ? rawActivityIds : [rawActivityIds])
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService80022Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service80022RuleStrategyValidatePayload => {
  return {
    actionType: 2,
    expectedRuleVersion: SERVICE_80022_RULE_VERSION,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicationId: resolveApplicationId(formValuesList),
      applicationDetailId: 80022002,
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: resolveActivityIds(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
