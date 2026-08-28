import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  findFirstFormValue,
  getFirstDefined,
  resolveSelectTableSingleValue,
} from "./feeStrategyPayloadUtils";

type Service801ActivityRule = {
  isRadio: boolean;
  isEncrypted: boolean;
};

const SERVICE_801_ACTIVITY_RULES: Record<number, Service801ActivityRule> = {
  25: { isRadio: true, isEncrypted: true },
  27: { isRadio: true, isEncrypted: false },
  26: { isRadio: false, isEncrypted: true },
  5: { isRadio: false, isEncrypted: false },
};

const resolveActivityId = (formValuesList: Array<Record<string, unknown>>) => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  const selectedKey = selectTableSingle?.selectedKey;
  const firstSelectedKey = Array.isArray(selectedKey) ? selectedKey[0] : selectedKey;

  return coerceNumber(
    getFirstDefined([
      firstSelectedKey,
      get(selectTableSingle, "tableData.0.Id"),
    ]),
  );
};

const resolveSelectedLanguageIds = (formValuesList: Array<Record<string, unknown>>) => {
  const rawValue = findFirstFormValue(formValuesList, [
    "SelectTableSingle.Languages",
    "Languages",
    "languageIds",
  ]);

  const rawList = Array.isArray(rawValue)
    ? rawValue
    : rawValue === undefined ||
        rawValue === null ||
        (typeof rawValue === "string" && rawValue.trim() === "")
      ? []
      : [rawValue];

  return rawList
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService801FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService801FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService801FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const activityId = resolveActivityId(formValuesList);
  const activityRule = activityId ? SERVICE_801_ACTIVITY_RULES[activityId] : undefined;

  if (!activityRule) {
    throw new Error("Unable to derive service 801 fee payload from selected activity.");
  }

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      isRadio: activityRule.isRadio,
      isEncrypted: activityRule.isEncrypted,
      selectedLanguageIds: resolveSelectedLanguageIds(formValuesList),
      emirateId: 1,
    },
  });
};
