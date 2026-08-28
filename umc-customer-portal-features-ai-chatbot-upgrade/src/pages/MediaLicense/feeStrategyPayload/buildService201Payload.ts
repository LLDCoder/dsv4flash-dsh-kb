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
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const PUBLICATION_TYPE_ID = 3;
const PRINTED_TYPE_ID = 4;

const resolveNumberOfEpisodes = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  return defaultNumberValue(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "NumberOfEpisodes"),
        get(formValues, "numberOfEpisodes"),
      ]),
    ),
  );
};

export const buildService201FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService201FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService201FeeEnginePayload = async ({
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
      publicationTypeId: PUBLICATION_TYPE_ID,
      printedTypeId: PRINTED_TYPE_ID,
      numberOfEpisodes: resolveNumberOfEpisodes(formValuesList),
    },
  });
};
