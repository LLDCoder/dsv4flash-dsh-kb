import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const PUBLICATION_TYPE_ID = 1;

const PRINTED_TYPE_ID_BY_VALUE: Record<string, number> = {
  "1": 1,
  bk: 1,
  book: 1,
  "2": 2,
  mp: 2,
  map: 2,
  "3": 3,
  mv: 3,
  movie: 3,
  "4": 4,
  sr: 4,
  series: 4,
  "5": 5,
  ad: 5,
  advertisment: 5,
  advertisement: 5,
  "6": 6,
  ot: 6,
  other: 6,
  brochure: 6,
  brochures: 6,
  poster: 6,
  posters: 6,
  "14": 14,
  tl: 14,
  theatrical: 14,
};

const resolvePrintedTypeId = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const printingPermit = formValuesList
    .map((formValues) =>
      getFirstDefined([
        get(formValues, "PrintingPermit"),
        get(formValues, "Printing Permit"),
      ]),
    )
    .find(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null,
    );

  const rawPrintedType = getFirstDefined([
    get(printingPermit, "TypeOfPublication"),
    get(printingPermit, "printedTypeId"),
    get(printingPermit, "printedType"),
  ]);

  const normalizedPrintedType = coerceString(rawPrintedType)?.toLowerCase();

  return (
    (normalizedPrintedType
      ? PRINTED_TYPE_ID_BY_VALUE[normalizedPrintedType]
      : undefined) ?? coerceNumber(rawPrintedType) ?? 0
  );
};

export const buildService203FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService203FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService203FeeEnginePayload = async ({
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
      printedTypeId: resolvePrintedTypeId(formValuesList),
      isUrgent: false,
    },
  });
};
