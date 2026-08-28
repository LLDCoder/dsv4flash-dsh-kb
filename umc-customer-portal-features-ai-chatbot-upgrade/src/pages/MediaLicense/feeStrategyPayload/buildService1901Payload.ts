import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultNumberValue,
  findFirstFormValue,
} from "./feeStrategyPayloadUtils";

const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getFirstDefined = (values: unknown[]) => values.find(isFilledValue);

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const buildService1901FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1901FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};


const resolveSelectedService18ApplicationId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const rawValue = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "pressCardSelector.applicationId"),
      get(formValues, "pressCardSelector.ApplicationId"),
      get(formValues, "pressCardSelector.id"),
      get(formValues, "pressCardSelector.Id"),
      get(formValues, "pressCardSelector.value"),
      get(formValues, "pressCardSelector.selectedKey"),
      get(formValues, "pressCardSelector.pressCardApplicationId"),
      get(formValues, "pressCardSelector.service18ApplicationId"),
      get(formValues, "PressCardSelector.applicationId"),
      get(formValues, "PressCardSelector.ApplicationId"),
      get(formValues, "selectedService18ApplicationId"),
      get(formValues, "service18ApplicationId"),
      get(formValues, "SelectTable.selectedService18ApplicationId"),
      get(formValues, "SelectTable.service18ApplicationId"),
      get(formValues, "pressCardSelector"),
      get(formValues, "PressCardSelector"),
    ]),
  );

  if (Array.isArray(rawValue)) {
    return coerceNumber(rawValue[0]);
  }

  if (rawValue && typeof rawValue === "object") {
    return coerceNumber(
      getFirstDefined([
        get(rawValue, "applicationId"),
        get(rawValue, "ApplicationId"),
        get(rawValue, "id"),
        get(rawValue, "Id"),
        get(rawValue, "value"),
        get(rawValue, "selectedKey"),
        get(rawValue, "pressCardApplicationId"),
        get(rawValue, "service18ApplicationId"),
      ]),
    );
  }

  return coerceNumber(rawValue);
};

export const buildService1901FeeEnginePayload = async ({
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
      selectedService18ApplicationId:
        resolveSelectedService18ApplicationId(formValuesList),
    },
  });
};
