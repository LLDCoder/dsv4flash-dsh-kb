import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import {
  resolveBookCollectTypeKindById,
  type BookCollectTypeKind,
} from "@/utils/bookCollectTypeKind";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const PUBLICATION_TYPE_ID = 2;

type CirculationScenarioCode =
  | "LOCAL_PUBLICATION_IN_STATE"
  | "FOREIGN_FIRST_IN_STATE"
  | "FOREIGN_POST_BOOK_FAIR";

type Service204ApplicationItem = {
  titleKey: string;
  copiesCount: number;
  format: "PRINT" | "EBOOK";
};

const normalizeLookupName = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getBookTradingValue = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
  path: string,
) => {
  return getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, `BookTrading.${path}`),
      get(formValues, path),
    ]),
  );
};

const resolveBookCollectTypeKindFromValue = async ({
  formValuesList,
}: Pick<BuildServiceFeeStrategyPayloadParams, "formValuesList">): Promise<BookCollectTypeKind> => {
  const rawBookCollectType = getBookTradingValue(
    formValuesList,
    "HowDidYouGetTheBook",
  );
  const rawBookCollectTypeId =
    coerceNumber(rawBookCollectType) ?? coerceString(rawBookCollectType);
  if (rawBookCollectTypeId === undefined) {
    throw new Error(
      "Unable to build service 204 fee payload: HowDidYouGetTheBook is required.",
    );
  }

  const kind = resolveBookCollectTypeKindById(rawBookCollectTypeId);
  if (kind === "Unknown") {
    throw new Error(
      `Unable to build service 204 fee payload: unsupported BookCollectType ${String(rawBookCollectTypeId)}.`,
    );
  }

  return kind;
};

const resolveCirculationScenarioCode = async ({
  formValuesList,
}: Pick<BuildServiceFeeStrategyPayloadParams, "formValuesList">): Promise<CirculationScenarioCode> => {
  const bookCollectTypeKind = await resolveBookCollectTypeKindFromValue({
    formValuesList,
  });

  if (bookCollectTypeKind === "PrintingPermit") {
    return "LOCAL_PUBLICATION_IN_STATE";
  }

  if (bookCollectTypeKind === "RegulateEntryPermit") {
    return "FOREIGN_FIRST_IN_STATE";
  }

  return "FOREIGN_POST_BOOK_FAIR";
};

const resolvePrintingPermitId = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  return coerceString(
    getBookTradingValue(formValuesList, "PublicationsPrintingPermit"),
  );
};

const resolveRegulateEntryPermitId = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  return coerceString(
    getBookTradingValue(formValuesList, "RegulateEntryMediaMaterial"),
  );
};

const resolveApplicationItems = ({
  circulationScenarioCode,
  formValuesList,
}: {
  circulationScenarioCode: CirculationScenarioCode;
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"];
}) => {
  if (circulationScenarioCode === "LOCAL_PUBLICATION_IN_STATE") {
    return undefined;
  }

  const titleKey = coerceString(
    getFirstDefined([
      getBookTradingValue(formValuesList, "PleaseSelectBook"),
      getBookTradingValue(formValuesList, "BookTitle"),
    ]),
  );
  const copiesCount = coerceNumber(
    getBookTradingValue(formValuesList, "NumberOfCopies"),
  );
  const rawBookType = coerceString(getBookTradingValue(formValuesList, "BookType"));

  if (!titleKey) {
    throw new Error(
      "Unable to build service 204 fee payload: titleKey requires PleaseSelectBook or BookTitle.",
    );
  }

  if (copiesCount === undefined) {
    throw new Error(
      "Unable to build service 204 fee payload: NumberOfCopies is required for foreign circulation scenarios.",
    );
  }

  const items: Service204ApplicationItem[] = [
    {
      titleKey,
      copiesCount,
      format:
        normalizeLookupName(rawBookType) === normalizeLookupName("Electronic")
          ? "EBOOK"
          : "PRINT",
    },
  ];

  return items;
};

export const buildService204FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService204FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService204FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const circulationScenarioCode = await resolveCirculationScenarioCode({
    formValuesList,
  });
  const printingPermitId = resolvePrintingPermitId(formValuesList);
  const regulateEntryPermitId = resolveRegulateEntryPermitId(formValuesList);
  const items = resolveApplicationItems({
    circulationScenarioCode,
    formValuesList,
  });

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      publicationTypeId: PUBLICATION_TYPE_ID,
      circulationScenarioCode,
      requestedUrgent: false,
      printingPermitId: printingPermitId ?? null,
      regulateEntryPermitId: regulateEntryPermitId ?? null,
      ...(items ? { items } : {}),
    },
  });
};
