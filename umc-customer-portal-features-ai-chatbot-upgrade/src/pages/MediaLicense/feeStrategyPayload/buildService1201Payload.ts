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

type Service1201ActivityRule = {
  isElectronic: boolean;
  isMagazine: boolean;
  releaseTypeId: number;
  periodicalTypeId?: number;
};

const SERVICE_1201_ACTIVITY_RULES: Record<number, Service1201ActivityRule> = {
  1008: { isElectronic: false, isMagazine: false, releaseTypeId: 1, periodicalTypeId: 1 },
  1010: { isElectronic: false, isMagazine: false, releaseTypeId: 1, periodicalTypeId: 2 },
  1029: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 2 },
  1031: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 3 },
  1011: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 4 },
  1012: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 5 },
  1014: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 6 },
  1015: { isElectronic: false, isMagazine: false, releaseTypeId: 2, periodicalTypeId: 1 },
  1016: { isElectronic: false, isMagazine: false, releaseTypeId: 2, periodicalTypeId: 2 },
  1030: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 2 },
  1032: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 3 },
  1017: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 4 },
  1018: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 5 },
  1019: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 6 },
  1020: { isElectronic: true, isMagazine: false, releaseTypeId: 0, periodicalTypeId: undefined },
  2093: { isElectronic: true, isMagazine: false, releaseTypeId: 0, periodicalTypeId: 1 },
  2094: { isElectronic: true, isMagazine: false, releaseTypeId: 0, periodicalTypeId: 2 },
  2095: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 2 },
  2096: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 3 },
  2097: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 4 },
  2098: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 5 },
  2099: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 6 },
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

const resolveLanguageCount = (formValuesList: Array<Record<string, unknown>>) => {
  const rawLanguages = findFirstFormValue(formValuesList, [
    "dataList",
  ]);

  if (Array.isArray(rawLanguages)) {
    return rawLanguages.length > 0 ? rawLanguages.length : 0;
  }

  const singleLanguage = findFirstFormValue(formValuesList, ["Language"]);
  return singleLanguage !== undefined && singleLanguage !== null ? 1 : 0;
};

export const buildService1201FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1201FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1201FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const activityId = resolveActivityId(formValuesList);
  const activityRule = activityId ? SERVICE_1201_ACTIVITY_RULES[activityId] : undefined;

  if (!activityRule) {
    throw new Error("Unable to derive service 1201 fee payload from selected activity.");
  }

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      isMagazine: activityRule.isMagazine,
      isElectronic: activityRule.isElectronic,
      releaseTypeId: activityRule.releaseTypeId,
      periodicalTypeId: activityRule.periodicalTypeId ?? 0,
      languageCount: resolveLanguageCount(formValuesList),
    },
  });
};
