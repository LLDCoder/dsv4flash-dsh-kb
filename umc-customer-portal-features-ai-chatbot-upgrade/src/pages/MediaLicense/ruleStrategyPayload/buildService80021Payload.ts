import { nowGst, toApi } from "@/utils/gstTime";
import type { Service80021RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import get from "lodash/get";
import { resolveEngineActivityIds } from "../resolveEngineActivityIds";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  getFirstDefined,
  resolveSelectedIds,
  resolveSelectTableValue,
  resolveTermsAgreed,
} from "../ruleStrategyPayloadUtils";

const SERVICE_80021_RULE_VERSION = "1.0.0";

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
  const selectTableValue = resolveSelectTableValue(formValuesList);
  const selectedIds = resolveSelectedIds(selectTableValue);

  if (selectedIds.length > 0) {
    return selectedIds
      .map((item) => coerceNumber(item))
      .filter((item): item is number => item !== undefined);
  }

  return formValuesList
    .flatMap((formValues) => [
      get(formValues, "activityIds"),
      get(formValues, "SelectTable.activityIds"),
      get(formValues, "SelectTableSingle.activityIds"),
      get(formValues, "selectedActivityIds"),
      get(formValues, "SelectTable.selectedActivityIds"),
      get(formValues, "SelectTableSingle.selectedActivityIds"),
      get(formValues, "selectedKey"),
      get(formValues, "SelectTable.selectedKey"),
      get(formValues, "SelectTableSingle.selectedKey"),
      get(formValues, "SelectTable.tableData"),
      get(formValues, "SelectTableSingle.tableData"),
    ])
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value.map((item) =>
          typeof item === "object" && item !== null ? get(item, "Id") : item,
        );
      }
      return [value];
    })
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService80021Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service80021RuleStrategyValidatePayload> => {
  return {
    actionType: 2,
    expectedRuleVersion: SERVICE_80021_RULE_VERSION,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicationId: resolveApplicationId(formValuesList),
      applicationDetailId: resolveApplicationDetailId(formValuesList),
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: resolveActivityIds(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
