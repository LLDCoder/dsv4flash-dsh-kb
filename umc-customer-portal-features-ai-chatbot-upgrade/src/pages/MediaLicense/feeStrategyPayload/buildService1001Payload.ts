import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultBooleanValue,
  findFirstFormValue,
  resolveSelectedNumberIdsFromSelectTable,
  resolveSelectedNumberIdsFromSelectTableSingle,
  SELECTEDPACKAGETYPES_MAP,
} from "./feeStrategyPayloadUtils";

const MEDIA_MATERIAL_TYPE_CODE = "01";

const resolveService1001ActivityIds = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const activityIds = [
    ...resolveSelectedNumberIdsFromSelectTable(formValuesList),
    ...resolveSelectedNumberIdsFromSelectTableSingle(formValuesList),
  ];

  return Array.from(new Set(activityIds));
};

const resolveService1001IsLocalFilm = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const localFilmValue = coerceString(
    findFirstFormValue(formValuesList, [
      "moviePackageForm.applyingPermitForLocalCinematicFilms",
    ]),
  )?.toLowerCase();

  if (localFilmValue === "yes") {
    return true;
  }

  if (localFilmValue === "no") {
    return false;
  }

  return defaultBooleanValue(
    findFirstFormValue(formValuesList, [
      "moviePackageForm.isLocalFilm",
      "isLocalFilm",
    ]),
  );
};

export const buildService1001FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1001FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1001FeeEnginePayload = async ({
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
      mediaMaterialTypeCode: MEDIA_MATERIAL_TYPE_CODE,
      activityIds: resolveService1001ActivityIds(formValuesList),
      isLocalFilm: resolveService1001IsLocalFilm(formValuesList),
      selectedPackageTypeIds: [SELECTEDPACKAGETYPES_MAP[config.serviceId]],
      isUrgentRequested: resolveService1001ActivityIds(formValuesList).includes(2069) ? true: false,
    },
  });
};
