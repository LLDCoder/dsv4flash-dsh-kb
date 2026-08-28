import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultBooleanValue,
  defaultNumberValue,
  findFirstFormValue,
} from "./feeStrategyPayloadUtils";
import {
  coerceNumber,
  resolveSelectedIds,
  resolveSelectTableValue,
} from "../ruleStrategyPayloadUtils";

const SERVICE_902_DEFAULT_COURIER_COMPANY_ID = 4;

const resolveActivityIds = (
  formValuesList: Array<Record<string, unknown>>,
): number[] => {
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
      get(formValues, "selectedActivityIds"),
      get(formValues, "SelectTable.selectedActivityIds"),
    ])
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService902FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService902FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService902FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  applicationNo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const physicalCertificateDeliveryRequested = defaultBooleanValue(
    findFirstFormValue(formValuesList, [
      "physicalCertificateDeliveryRequested",
      "certificateInfo.physicalCertificateDeliveryRequested",
      "deliveryInfo.physicalCertificateDeliveryRequested",
    ]),
  );

  const courierCompanyId = defaultNumberValue(
    findFirstFormValue(formValuesList, [
      "courierCompanyId",
      "certificateInfo.courierCompanyId",
      "deliveryInfo.courierCompanyId",
    ]),
  );

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 2,
    requestOverrides: {
      physicalCertificateDeliveryRequested,
      courierCompanyId:
        courierCompanyId > 0
          ? courierCompanyId
          : SERVICE_902_DEFAULT_COURIER_COMPANY_ID,
    },
    payload: {
      applicationNo: applicationNo || "",
      activityIds: resolveActivityIds(formValuesList),
    },
  });
};
