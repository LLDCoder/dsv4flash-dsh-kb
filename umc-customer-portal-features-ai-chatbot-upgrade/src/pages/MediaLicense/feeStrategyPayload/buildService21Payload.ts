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
} from "./feeStrategyPayloadUtils";

const REQUEST_TYPE_BY_ACTIVITY_ID: Record<number, string> = {
  2062: "Poster",
  2063: "Trailer",
};

const resolveService21IsLocalFilm = (
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

export const buildService21FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService21FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService21FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const selectedActivityIds = resolveSelectedNumberIdsFromSelectTable(formValuesList);
  const requestTypes = selectedActivityIds
    .map((item) => REQUEST_TYPE_BY_ACTIVITY_ID[item])
    .filter((item): item is string => !!item);

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      activityIds: selectedActivityIds,
      isLocalfilm: resolveService21IsLocalFilm(formValuesList),
      requestTypes,
    },
  });
};
