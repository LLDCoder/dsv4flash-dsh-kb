import { nowGst, toApi } from "@/utils/gstTime";
import type { Service80042RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { useUpdateFormStore } from "@/store/update-form";
import get from "lodash/get";
import {
  coerceNumber,
  getFirstDefined,
  resolveSelectedIds,
  resolveSelectTableValue,
  resolveTermsAgreed,
  resolveUploadUrl,
} from "../ruleStrategyPayloadUtils";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

const SERVICE_80042_RULE_VERSION = "1.0.0";

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

const resolveActivitySelectionValue = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const selectTableValue = resolveSelectTableValue(formValuesList);
  if (selectTableValue) return selectTableValue;

  for (const formValues of formValuesList) {
    const selectTableSingleValue = get(formValues, "SelectTableSingle");
    if (selectTableSingleValue) {
      return selectTableSingleValue as {
        selectedKey?: string | number | Array<string | number>;
        prefilledSelectedKey?: string | number | Array<string | number>;
        tableData?: Array<{ Id?: unknown }>;
      };
    }
  }

  return undefined;
};

const resolveActivityIds = (formValuesList: Array<Record<string, unknown>>) => {
  const selectTableValue = resolveActivitySelectionValue(formValuesList);
  const selectedIds = resolveSelectedIds(selectTableValue);
  const prefilledIdSet = new Set(
    resolveSelectedIds({
      selectedKey: selectTableValue?.prefilledSelectedKey,
      tableData: [],
    }).map((item) => String(item)),
  );

  const cancellationIds =
    prefilledIdSet.size > 0 &&
    selectedIds.some((item) => !prefilledIdSet.has(String(item)))
      ? selectedIds.filter((item) => !prefilledIdSet.has(String(item)))
      : selectedIds;

  return cancellationIds
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

const resolveCancellationDocumentUrl = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  return resolveUploadUrl(
    formValuesList
      .map((formValues) =>
        [
          get(formValues, "cancellationDocumentUrl"),
          get(formValues, "CancellationDocumentUrl"),
          get(formValues, "EconomicDepartmentApprovalLetter"),
          get(formValues, "economicDepartmentApprovalLetter"),
          get(formValues, "SelectTable.cancellationDocumentUrl"),
          get(formValues, "SelectTable.CancellationDocumentUrl"),
          get(formValues, "SelectTable.EconomicDepartmentApprovalLetter"),
          get(formValues, "SelectTable.economicDepartmentApprovalLetter"),
          get(formValues, "SelectTableSingle.cancellationDocumentUrl"),
          get(formValues, "SelectTableSingle.CancellationDocumentUrl"),
          get(formValues, "SelectTableSingle.EconomicDepartmentApprovalLetter"),
          get(formValues, "SelectTableSingle.economicDepartmentApprovalLetter"),
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

export const buildService80042Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service80042RuleStrategyValidatePayload => {
  return {
    actionType: 3,
    expectedRuleVersion: SERVICE_80042_RULE_VERSION,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicationId: resolveApplicationId(formValuesList),
      applicationDetailId: resolveApplicationDetailId(formValuesList),
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: resolveActivityIds(formValuesList),
      cancellationDocumentUrl: resolveCancellationDocumentUrl(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
