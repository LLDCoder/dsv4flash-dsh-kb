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
  resolveSelectedNumberIdsFromSelectTable,
  resolveSelectedNumberIdsFromSelectTableSingle,
  SELECTEDPACKAGETYPES_MAP,
} from "./feeStrategyPayloadUtils";

const resolveService1002ActivityIds = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const activityIds = [
    ...resolveSelectedNumberIdsFromSelectTable(formValuesList),
    ...resolveSelectedNumberIdsFromSelectTableSingle(formValuesList),
  ];

  return Array.from(new Set(activityIds));
};

const resolveService1002IsLocalFilm = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const localFilmValue = coerceString(
    findFirstFormValue(formValuesList, [
      "FilmScreeningForm.applyingPermitForLocalCinematicFilms",
      "Film Screening Form.applyingPermitForLocalCinematicFilms",
    ]),
  )?.toLowerCase();

  if (localFilmValue === "yes") {
    return true;
  }

  if (localFilmValue === "no") {
    return false;
  }

  return coerceBoolean(
    findFirstFormValue(formValuesList, [
      "FilmScreeningForm.isLocalFilm",
      "Film Screening Form.isLocalFilm",
      "isLocalFilm",
    ]),
  );
};

export const buildService1002FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1002FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1002FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const isLocalFilm = resolveService1002IsLocalFilm(formValuesList);

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      mediaMaterialTypeCode: "01",
      activityIds: resolveService1002ActivityIds(formValuesList),
      ...(isLocalFilm === undefined ? {} : { isLocalFilm }),
      selectedPackageTypeIds: [SELECTEDPACKAGETYPES_MAP[config.serviceId]],
      isTicketed: true,
    },
  });
};
