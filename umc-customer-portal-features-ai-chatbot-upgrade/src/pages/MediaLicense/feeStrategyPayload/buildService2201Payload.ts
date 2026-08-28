import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultBooleanValue,
  findFirstFormValue,
  getFirstDefined,
  resolveSelectedNumberIdsFromSelectTable,
  resolveSelectedNumberIdsFromSelectTableSingle,
} from "./feeStrategyPayloadUtils";

const TYPE_ID = 1;
const MEDIA_MATERIAL_TYPE_CODE = "01";

const resolveActivityIds = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const activityIds = [
    ...resolveSelectedNumberIdsFromSelectTable(formValuesList),
    ...resolveSelectedNumberIdsFromSelectTableSingle(formValuesList),
  ];

  return Array.from(new Set(activityIds));
};

const resolveService2201IsLocalFilm = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const localFilmValue = coerceString(
    findFirstFormValue(formValuesList, [
      "FilmTrailerForm.applyingPermitForLocalCinematicFilms",
      "Film Trailer Form.applyingPermitForLocalCinematicFilms",
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
      "FilmTrailerForm.isLocalFilm",
      "Film Trailer Form.isLocalFilm",
      "isLocalFilm",
    ]),
  );
};

const resolvePosterTrailerPermitId = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const filmTrailerForm = formValuesList
    .map((formValues) =>
      getFirstDefined([
        get(formValues, "FilmTrailerForm"),
        get(formValues, "Film Trailer Form"),
      ]),
    )
    .find(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null,
    );

  return getFirstDefined([
    get(filmTrailerForm, "posterTrailerPermit"),
    get(filmTrailerForm, "posterTrailerPermitId"),
  ]);
};

export const buildService2201FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService2201FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService2201FeeEnginePayload = async ({
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
      typeId: TYPE_ID,
      mediaMaterialTypeCode: MEDIA_MATERIAL_TYPE_CODE,
      activityIds: resolveActivityIds(formValuesList),
      isLocalFilm: resolveService2201IsLocalFilm(formValuesList),
      posterTrailerPermitId: resolvePosterTrailerPermitId(formValuesList),
    },
  });
};
