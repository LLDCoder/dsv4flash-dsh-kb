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
  defaultNumberValue,
  findFirstFormValue,
} from "./feeStrategyPayloadUtils";

const SERVICE_205_PUBLICATION_TYPE_ID = 3;

const SERVICE_205_PRINTED_TYPE_ID_BY_VALUE: Record<string, number> = {
  "3": 3,
  mv: 3,
  movie: 3,
  "14": 14,
  tl: 14,
  theatrical: 14,
};

const resolveService205PrintedTypeId = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const directPrintedTypeId = defaultNumberValue(
    findFirstFormValue(formValuesList, [
      "ScriptPublicationForm.printedTypeId",
      "printedTypeId",
    ]),
  );

  if (directPrintedTypeId) {
    return directPrintedTypeId;
  }

  const publicationType = coerceString(
    findFirstFormValue(formValuesList, ["ScriptPublicationForm.typeOfPublication"]),
  )?.toLowerCase();

  return (
    SERVICE_205_PRINTED_TYPE_ID_BY_VALUE[publicationType || ""] ?? 0
  );
};

const resolveService205IsLocalFilm = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const localMaterialValue = coerceString(
    findFirstFormValue(formValuesList, ["ScriptPublicationForm.applyingLocalMaterial"]),
  )?.toLowerCase();

  if (localMaterialValue === "yes") {
    return true;
  }

  if (localMaterialValue === "no") {
    return false;
  }

  return defaultBooleanValue(
    findFirstFormValue(formValuesList, [
      "ScriptPublicationForm.isLocalFilm",
      "isLocalFilm",
    ]),
  );
};

export const buildService205FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService205FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService205FeeEnginePayload = async ({
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
      publicationTypeId:
        defaultNumberValue(
          findFirstFormValue(formValuesList, [
            "ScriptPublicationForm.typeOfPublication",
            "ScriptPublicationForm.publicationTypeId",
            "publicationTypeId",
          ]),
        ) || SERVICE_205_PUBLICATION_TYPE_ID,
      printedTypeId: resolveService205PrintedTypeId(formValuesList),
      isLocalFilm: resolveService205IsLocalFilm(formValuesList),
      requestedUrgent: defaultBooleanValue(
        findFirstFormValue(formValuesList, [
          "ScriptPublicationForm.requestedUrgent",
          "ScriptPublicationForm.isUrgentRequested",
          "requestedUrgent",
          "isUrgentRequested",
        ]),
      ),
    },
  });
};
