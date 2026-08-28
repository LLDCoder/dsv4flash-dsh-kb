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
  defaultNumberValue,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const normalizeBeneficiaryType = (value: unknown): 1 | 2 | 3 | 4 | undefined => {
  const beneficiaryType = coerceNumber(value);

  if (beneficiaryType === 5) {
    return 4;
  }

  if (
    beneficiaryType === 1 ||
    beneficiaryType === 2 ||
    beneficiaryType === 3 ||
    beneficiaryType === 4
  ) {
    return beneficiaryType;
  }

  return undefined;
};

const resolveService304MaterialTypeIds = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const materialList =
    (getFirstDefined(
      formValuesList.map((formValues) =>
        get(formValues, "beneficiaryType.materialList"),
      ),
    ) as Array<Record<string, unknown>> | undefined) ?? [];

  return materialList
    .map((item) => coerceNumber(get(item, "materialTypeId")))
    .filter((item): item is number => item !== undefined);
};

const resolveService304ArrivalPortId = (
  formValuesList: Array<Record<string, unknown>>,
) =>
  defaultNumberValue(
    getFirstDefined(
      formValuesList.map((formValues) => get(formValues, "ArrivalPort")),
    ),
  );

const resolveService304BeneficiaryType = (
  formValuesList: Array<Record<string, unknown>>,
) =>
  normalizeBeneficiaryType(
    getFirstDefined(
      formValuesList.map((formValues) =>
        get(formValues, "beneficiaryType.beneficiaryType"),
      ),
    ),
  ) ?? 0;

export const buildService304FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService304FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService304FeeEnginePayload = async ({
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
      materialTypeIds: resolveService304MaterialTypeIds(formValuesList),
      arrivalPortId: resolveService304ArrivalPortId(formValuesList),
      beneficiaryType: resolveService304BeneficiaryType(formValuesList),
    },
  });
};
