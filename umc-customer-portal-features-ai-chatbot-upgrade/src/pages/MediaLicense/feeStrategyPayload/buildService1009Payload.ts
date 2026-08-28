import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceBoolean,
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  findFirstFormValue,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const DIGITAL_ACTIVITY_IDS = new Set([2081]);

const PLATFORM_CODE_BY_VALUE: Record<string, string> = {
  playstation: "PS5",
  xbox: "XBOX",
  nintendo: "SWITCH",
  pc: "PC",
  mobile: "MOBILE",
  other: "OTHER",
};

const resolveSelectedPlatformCodes = (formValuesList: Array<Record<string, unknown>>) => {
  const rawPlatforms =
    (getFirstDefined(
      formValuesList.flatMap((formValues) => [
        findFirstFormValue([formValues], ["GameDistributionForm.gamePlatform"]),
        findFirstFormValue([formValues], ["GameDistributionForm.gamePlatforms"]),
        findFirstFormValue([formValues], ["gamePlatform"]),
      ]),
    ) as unknown[] | undefined) ?? [];

  return rawPlatforms
    .map((item) => coerceString(item)?.toLowerCase())
    .filter((item): item is string => !!item)
    .map((item) => PLATFORM_CODE_BY_VALUE[item] ?? item.toUpperCase());
};

const resolveIsDigital = (formValuesList: Array<Record<string, unknown>>) => {
  const rawDigitalFlag = findFirstFormValue(formValuesList, [
    "GameDistributionForm.addDigitalVersion",
    "addDigitalVersion",
  ]);

  const selectTable = findFirstFormValue(formValuesList, ["SelectTable.selectedKey"]);
  const selectedActivityIds = Array.isArray(selectTable) ? selectTable : [];

  return (
    coerceBoolean(rawDigitalFlag) ??
    (coerceString(rawDigitalFlag)?.toLowerCase() === "yes"
      ? true
      : selectedActivityIds.some(
          (item) => typeof item === "number" && DIGITAL_ACTIVITY_IDS.has(item),
        ))
  );
};

export const buildService1009FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1009FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1009FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      flag: 4,
      mediaMaterialTypeCode: "04",
      isDigital: resolveIsDigital(formValuesList),
      selectedPlatformCodes: resolveSelectedPlatformCodes(formValuesList),
    },
  });
};
