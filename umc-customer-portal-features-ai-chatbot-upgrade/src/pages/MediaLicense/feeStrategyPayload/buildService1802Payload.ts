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
  defaultBooleanValue,
  defaultNumberValue,
  getFirstDefined,
  resolveSelectedNumberIdsFromSelectTableSingle,
  coerceBoolean,
  findFirstFormValue
} from "./feeStrategyPayloadUtils";

const SERVICE_1802_DEFAULT_COURIER_COMPANY_ID = 3;

const TEMPORARY_PRESS_CARD_ACTIVITY_ID = 2035;
const REGULAR_PRESS_CARD_ACTIVITY_ID = 2036;

const DELIVERY_REQUESTED_PATHS = [
  "physicalCertificateDeliveryRequested",
  "certificateInfo.physicalCertificateDeliveryRequested",
  "deliveryInfo.physicalCertificateDeliveryRequested",
];

const COURIER_COMPANY_ID_PATHS = [
  "courierCompanyId",
  "certificateInfo.courierCompanyId",
  "deliveryInfo.courierCompanyId",
];

const resolveFormValueByPaths = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
  paths: string[],
) => {
  return getFirstDefined(
    formValuesList.flatMap((formValues) => paths.map((path) => get(formValues, path))),
  );
};

const resolveIsTemporaryPressCard = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const activityId = resolveSelectedNumberIdsFromSelectTableSingle(formValuesList)[0];

  if (activityId === TEMPORARY_PRESS_CARD_ACTIVITY_ID) return true;
  if (activityId === REGULAR_PRESS_CARD_ACTIVITY_ID) return false;

  return coerceBoolean(findFirstFormValue(formValuesList, ["isTemporaryPressCard"]));
};

// const resolveRequiredParentPressCardId = (
//   certificateId?: number | string | null,
// ) => {
//   const parentPressCardId = coerceNumber(certificateId);

//   if (parentPressCardId === undefined) {
//     throw new Error(
//       "Unable to build service 1802 fee payload: certificateId is required to derive parentPressCardId.",
//     );
//   }

//   return parentPressCardId;
// };

export const buildService1802FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1802FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1802FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const physicalCertificateDeliveryRequested = defaultBooleanValue(
    resolveFormValueByPaths(formValuesList, DELIVERY_REQUESTED_PATHS),
  );

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 2,
    requestOverrides: {
      physicalCertificateDeliveryRequested,
      courierCompanyId:1,
    },
    payload: {
      parentPressCardId: 55661,
      isTemporaryPressCard: resolveIsTemporaryPressCard(formValuesList),
    },
  });
};
