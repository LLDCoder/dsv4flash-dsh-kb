import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1202RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  resolveSelectedIds,
  resolveSelectTableValue,
} from "../ruleStrategyPayloadUtils";

type ActivitySelectionValue = {
  selectedKey?: string | number | Array<string | number>;
  prefilledSelectedKey?: string | number | Array<string | number>;
  tableData?: Array<{ Id?: unknown }>;
};

const resolveActivitySelectionValue = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const selectTableValue = resolveSelectTableValue(formValuesList);
  if (selectTableValue) {
    return selectTableValue;
  }

  for (const formValues of formValuesList) {
    const selectTableSingleValue = formValues.SelectTableSingle;
    if (
      selectTableSingleValue &&
      typeof selectTableSingleValue === "object" &&
      !Array.isArray(selectTableSingleValue)
    ) {
      return selectTableSingleValue as ActivitySelectionValue;
    }
  }

  return undefined;
};

const resolveActivityIds = (formValuesList: Array<Record<string, unknown>>) => {
  const selectTableValue = resolveActivitySelectionValue(formValuesList);
  const selectedIds = resolveSelectedIds({
    selectedKey: selectTableValue?.prefilledSelectedKey,
    tableData: [],
  });
  const retainedSelection =
    selectTableValue?.selectedKey !== undefined
      ? {
          selectedKey: selectTableValue.selectedKey,
          tableData: [],
        }
      : selectTableValue;
  const retainedIds = new Set(
    resolveSelectedIds(retainedSelection).map((item) => String(item)),
  );

  return selectedIds
    .filter((item) => !retainedIds.has(String(item)))
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

const SERVICE_1202_RULE_VERSION = "1.0.0";

export const buildService1202Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service1202RuleStrategyValidatePayload => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;

  return {
    actionType: 3,
    expectedRuleVersion: SERVICE_1202_RULE_VERSION,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicationId: lifecycleSource?.sourceApplicationId ?? undefined,
      applicationDetailId: lifecycleSource?.sourceApplicationDetailId ?? undefined,
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: resolveActivityIds(formValuesList),
    },
  };
};
