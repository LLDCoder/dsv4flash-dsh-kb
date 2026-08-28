import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { IUser as PortalUserInfo } from "@/store/user";
import { buildService1FeeEnginePayload } from "./buildService1Payload";
import { buildService4FeeEnginePayload } from "./buildService4Payload";
import { buildService13FeeEnginePayload } from "./buildService13Payload";
import { buildService6FeeEnginePayload } from "./buildService6Payload";
import { buildService7FeeEnginePayload } from "./buildService7Payload";
import { buildService14FeeEnginePayload } from "./buildService14Payload";
import { buildService20FeeEnginePayload } from "./buildService20Payload";
import { buildService21FeeEnginePayload } from "./buildService21Payload";
import { buildService201FeeEnginePayload } from "./buildService201Payload";
import { buildService202FeeEnginePayload } from "./buildService202Payload";
import { buildService203FeeEnginePayload } from "./buildService203Payload";
import { buildService204FeeEnginePayload } from "./buildService204Payload";
import { buildService205FeeEnginePayload } from "./buildService205Payload";
import { buildService301FeeEnginePayload } from "./buildService301Payload";
import { buildService302FeeEnginePayload } from "./buildService302Payload";
import { buildService303FeeEnginePayload } from "./buildService303Payload";
import { buildService304FeeEnginePayload } from "./buildService304Payload";
import { buildService801FeeEnginePayload } from "./buildService801Payload";
import { buildService802FeeEnginePayload } from "./buildService802Payload";
import { buildModifyServiceFeeEnginePayload } from "./buildModifyServicePayload";
import { buildService804FeeEnginePayload } from "./buildService804Payload";
import { buildService806FeeEnginePayload } from "./buildService806Payload";
import { buildService901FeeEnginePayload } from "./buildService901Payload";
import { buildService902FeeEnginePayload } from "./buildService902Payload";
import { buildService903FeeEnginePayload } from "./buildService903Payload";
import { buildService904FeeEnginePayload } from "./buildService904Payload";
import { buildService905FeeEnginePayload } from "./buildService905Payload";
import { buildService1001FeeEnginePayload } from "./buildService1001Payload";
import { buildService1002FeeEnginePayload } from "./buildService1002Payload";
import { buildService1003FeeEnginePayload } from "./buildService1003Payload";
import { buildService1004FeeEnginePayload } from "./buildService1004Payload";
import { buildService1005FeeEnginePayload } from "./buildService1005Payload";
import { buildService1006FeeEnginePayload } from "./buildService1006Payload";
import { buildService1007FeeEnginePayload } from "./buildService1007Payload";
import { buildService1008FeeEnginePayload } from "./buildService1008Payload";
import { buildService1009FeeEnginePayload } from "./buildService1009Payload";
import { buildService1010FeeEnginePayload } from "./buildService1010Payload";
import { buildService1101FeeEnginePayload } from "./buildService1101Payload";
import { buildService1102FeeEnginePayload } from "./buildService1102Payload";
import { buildService1201FeeEnginePayload } from "./buildService1201Payload";
import { buildService1202FeeEnginePayload } from "./buildService1202Payload";
import { buildService1203FeeEnginePayload } from "./buildService1203Payload";
import { buildService1204FeeEnginePayload } from "./buildService1204Payload";
import { buildService1205FeeEnginePayload } from "./buildService1205Payload";
import { buildService1801FeeEnginePayload } from "./buildService1801Payload";
import { buildService1802FeeEnginePayload } from "./buildService1802Payload";
import { buildService1901FeeEnginePayload } from "./buildService1901Payload";
import { buildService2201FeeEnginePayload } from "./buildService2201Payload";
import { buildService2401FeeEnginePayload } from "./buildService2401Payload";
import { buildService2402FeeEnginePayload } from "./buildService2402Payload";
import { buildService2202FeeEnginePayload } from "./buildService2202Payload";
import { buildService8006FeeEnginePayload } from "./buildService8006Payload";
import { buildService8007FeeEnginePayload } from "./buildService8007Payload";
import { buildService8008FeeEnginePayload } from "./buildService8008Payload";
import { buildService80021FeeEnginePayload } from "./buildService80021Payload";
import { buildService80022FeeEnginePayload } from "./buildService80022Payload";
import { buildService80041FeeEnginePayload } from "./buildService80041Payload";
import { buildService80042FeeEnginePayload } from "./buildService80042Payload";

type FormValues = Record<string, unknown>;
type FormilyStepLike = { formData?: string | null };

export interface MediaLicenseFeeStrategyConfig {
  serviceId: number;
  expectedFeeVersion?: string;
  kind: string;
}

export interface BuildServiceFeeStrategyPayloadParams {
  config: MediaLicenseFeeStrategyConfig;
  formValuesList: FormValues[];
  modifyChangeSets?: unknown[];
  currentProfileId: string;
  userInfo: PortalUserInfo;
  applicationId?: number | null;
  applicationNo?: string;
  licensePermitNo?: string | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  sourceMedialLicenseId?: number | null;
}

const FEE_STRATEGY_CONFIG_BY_SERVICE_ID: Record<
  number,
  MediaLicenseFeeStrategyConfig
> = {
  1: {
    serviceId: 1,
    expectedFeeVersion: "1.1.0",
    kind: "service1",
  },
  4: {
    serviceId: 4,
    expectedFeeVersion: "4.1.0",
    kind: "service4",
  },
  6: {
    serviceId: 6,
    expectedFeeVersion: "6.1.0",
    kind: "service6",
  },
  7: {
    serviceId: 7,
    expectedFeeVersion: "7.1.0",
    kind: "service7",
  },
  13: {
    serviceId: 13,
    expectedFeeVersion: "13.1.0",
    kind: "service13",
  },
  14: {
    serviceId: 14,
    expectedFeeVersion: "14.1.0",
    kind: "service14",
  },
  20: {
    serviceId: 20,
    expectedFeeVersion: "20.1.0",
    kind: "service20",
  },
  21: {
    serviceId: 21,
    expectedFeeVersion: "21.1.0",
    kind: "service21",
  },
  201: {
    serviceId: 201,
    expectedFeeVersion: "201.1.0",
    kind: "service201",
  },
  202: {
    serviceId: 202,
    expectedFeeVersion: "202.1.0",
    kind: "service202",
  },
  203: {
    serviceId: 203,
    expectedFeeVersion: "203.1.0",
    kind: "service203",
  },
  204: {
    serviceId: 204,
    expectedFeeVersion: "204.1.0",
    kind: "service204",
  },
  205: {
    serviceId: 205,
    expectedFeeVersion: "205.1.0",
    kind: "service205",
  },
  301: {
    serviceId: 301,
    expectedFeeVersion: "301.1.0",
    kind: "service301",
  },
  302: {
    serviceId: 302,
    expectedFeeVersion: "302.1.0",
    kind: "service302",
  },
  303: {
    serviceId: 303,
    expectedFeeVersion: "303.1.0",
    kind: "service303",
  },
  304: {
    serviceId: 304,
    expectedFeeVersion: "304.1.0",
    kind: "service304",
  },
  801: {
    serviceId: 801,
    expectedFeeVersion: "801.1.0",
    kind: "service801",
  },
  802: {
    serviceId: 802,
    expectedFeeVersion: "802.2.0",
    kind: "service802",
  },
  803: {
    serviceId: 803,
    kind: "service803",
  },
  804: {
    serviceId: 804,
    expectedFeeVersion: "804.2.0",
    kind: "service804",
  },
  806: {
    serviceId: 806,
    expectedFeeVersion: "806.1.0",
    kind: "service806",
  },
  80042: {
    serviceId: 80042,
    expectedFeeVersion: "80042.1.0",
    kind: "service80042",
  },
  80011: {
    serviceId: 80011,
    kind: "service80011",
  },
  80012: {
    serviceId: 80012,
    kind: "service80012",
  },
  901: {
    serviceId: 901,
    expectedFeeVersion: "901.1.0",
    kind: "service901",
  },
  902: {
    serviceId: 902,
    expectedFeeVersion: "902.2.0",
    kind: "service902",
  },
  903: {
    serviceId: 903,
    kind: "service903",
  },
  904: {
    serviceId: 904,
    expectedFeeVersion: "904.2.0",
    kind: "service904",
  },
  905: {
    serviceId: 905,
    expectedFeeVersion: "905.1.0",
    kind: "service905",
  },
  1001: {
    serviceId: 1001,
    expectedFeeVersion: "1001.1.0",
    kind: "service1001",
  },
  1002: {
    serviceId: 1002,
    expectedFeeVersion: "1002.1.0",
    kind: "service1002",
  },
  1003: {
    serviceId: 1003,
    expectedFeeVersion: "1003.1.0",
    kind: "service1003",
  },
  1004: {
    serviceId: 1004,
    expectedFeeVersion: "1004.1.0",
    kind: "service1004",
  },
  1005: {
    serviceId: 1005,
    expectedFeeVersion: "1005.1.0",
    kind: "service1005",
  },
  1006: {
    serviceId: 1006,
    expectedFeeVersion: "1006.1.0",
    kind: "service1006",
  },
  1007: {
    serviceId: 1007,
    expectedFeeVersion: "1007.1.0",
    kind: "service1007",
  },
  1008: {
    serviceId: 1008,
    expectedFeeVersion: "1008.1.0",
    kind: "service1008",
  },
  1009: {
    serviceId: 1009,
    expectedFeeVersion: "1009.1.0",
    kind: "service1009",
  },
  1010: {
    serviceId: 1010,
    expectedFeeVersion: "1010.1.0",
    kind: "service1010",
  },
  1101: {
    serviceId: 1101,
    expectedFeeVersion: "1101.1.0",
    kind: "service1101",
  },
  1102: {
    serviceId: 1102,
    expectedFeeVersion: "1102.1.0",
    kind: "service1102",
  },
  1201: {
    serviceId: 1201,
    expectedFeeVersion: "1201.1.0",
    kind: "service1201",
  },
  1202: {
    serviceId: 1202,
    expectedFeeVersion: "1202.1.0",
    kind: "service1202",
  },
  1203: {
    serviceId: 1203,
    kind: "service1203",
  },
  1204: {
    serviceId: 1204,
    expectedFeeVersion: "1204.2.0",
    kind: "service1204",
  },
  1205: {
    serviceId: 1205,
    expectedFeeVersion: "1205.1.0",
    kind: "service1205",
  },
  1801: {
    serviceId: 1801,
    expectedFeeVersion: "1801.1.0",
    kind: "service1801",
  },
  1802: {
    serviceId: 1802,
    expectedFeeVersion: "1802.1.0",
    kind: "service1802",
  },
  1901: {
    serviceId: 1901,
    expectedFeeVersion: "1901.1.0",
    kind: "service1901",
  },
  2201: {
    serviceId: 2201,
    expectedFeeVersion: "2201.1.0",
    kind: "service2201",
  },
  2401: {
    serviceId: 2401,
    expectedFeeVersion: "2401.1.0",
    kind: "service2401",
  },
  2402: {
    serviceId: 2402,
    expectedFeeVersion: "2402.1.0",
    kind: "service2402",
  },
  2202: {
    serviceId: 2202,
    expectedFeeVersion: "2202.1.0",
    kind: "service2202",
  },
  8006: {
    serviceId: 8006,
    expectedFeeVersion: "8006.1.0",
    kind: "service8006",
  },
  8007: {
    serviceId: 8007,
    expectedFeeVersion: "8007.1.0",
    kind: "service8007",
  },
  8008: {
    serviceId: 8008,
    expectedFeeVersion: "8008.1.0",
    kind: "service8008",
  },
  80021: {
    serviceId: 80021,
    expectedFeeVersion: "80021.1.0",
    kind: "service80021",
  },
  80041: {
    serviceId: 80041,
    expectedFeeVersion: "80041.1.0",
    kind: "service80041",
  },
  80022: {
    serviceId: 80022,
    expectedFeeVersion: "80022.1.0",
    kind: "service80022",
  },
};

const parseStepFormData = (step: FormilyStepLike | unknown) => {
  try {
    const formData =
      typeof step === "object" && step !== null && "formData" in step
        ? (step as FormilyStepLike).formData
        : undefined;
    const parsed = formData ? JSON.parse(formData) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const collectFormValues = (formilyList: unknown[]): FormValues[] => {
  if (!Array.isArray(formilyList)) return [];
  return formilyList.map((step) => parseStepFormData(step)?.formValues || {});
};

const collectModifyChangeSets = (formilyList: unknown[]): unknown[] => {
  if (!Array.isArray(formilyList)) return [];
  return formilyList
    .map((step) => parseStepFormData(step)?.modifyChangeSet)
    .filter((changeSet) => changeSet !== undefined);
};

export const getMediaLicenseFeeStrategyConfig = (
  serviceId: number,
): MediaLicenseFeeStrategyConfig | undefined => {
  return FEE_STRATEGY_CONFIG_BY_SERVICE_ID[serviceId];
};

export const buildMediaLicenseFeeStrategyPayload = async ({
  config,
  formilyList,
  currentProfileId,
  userInfo,
  applicationId,
  applicationNo,
  licensePermitNo,
  sourceApplicationId,
  sourceApplicationDetailId,
  sourceMedialLicenseId,
}: {
  config: MediaLicenseFeeStrategyConfig;
  formilyList: unknown[];
  currentProfileId: string;
  userInfo: PortalUserInfo;
  applicationId?: number | null;
  applicationNo?: string;
  licensePermitNo?: string | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  sourceMedialLicenseId?: number | null;
}): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildMediaLicenseFeeStrategyEnginePayload({
    config,
    formilyList,
    currentProfileId,
    userInfo,
    applicationId,
    applicationNo,
    licensePermitNo,
    sourceApplicationId,
    sourceApplicationDetailId,
    sourceMedialLicenseId,
  });

  const payload: FeeQuoteEnvelope = {
    serviceId: config.serviceId,
    enginePayload: enginePayload,
  };

  return payload;
};

export const buildMediaLicenseFeeStrategyEnginePayload = async ({
  config,
  formilyList,
  currentProfileId,
  userInfo,
  applicationId,
  applicationNo,
  licensePermitNo,
  sourceApplicationId,
  sourceApplicationDetailId,
  sourceMedialLicenseId,
}: {
  config: MediaLicenseFeeStrategyConfig;
  formilyList: unknown[];
  currentProfileId: string;
  userInfo: PortalUserInfo;
  applicationId?: number | null;
  applicationNo?: string;
  licensePermitNo?: string | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  sourceMedialLicenseId?: number | null;
}): Promise<FeeQuoteEnginePayload> => {
  const formValuesList = collectFormValues(formilyList);
  const modifyChangeSets = collectModifyChangeSets(formilyList);

  if (config.kind === "service1") {
    return buildService1FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service4") {
    return buildService4FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service6") {
    return buildService6FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service7") {
    return buildService7FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service13") {
    return buildService13FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service14") {
    return buildService14FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service20") {
    return buildService20FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service21") {
    return buildService21FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service201") {
    return buildService201FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service202") {
    return buildService202FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service203") {
    return buildService203FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service204") {
    return buildService204FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service205") {
    return buildService205FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service301") {
    return buildService301FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service302") {
    return buildService302FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service303") {
    return buildService303FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service304") {
    return buildService304FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service801") {
    return buildService801FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service802") {
    return buildService802FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service803") {
    return buildModifyServiceFeeEnginePayload({
      config,
      formValuesList,
      modifyChangeSets,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceApplicationDetailId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service804") {
    return buildService804FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service806") {
    return buildService806FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service901") {
    return buildService901FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service902") {
    return buildService902FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service903") {
    return buildService903FeeEnginePayload({
      config,
      formValuesList,
      modifyChangeSets,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceApplicationDetailId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service904") {
    return buildService904FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service905") {
    return buildService905FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1001") {
    return buildService1001FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1002") {
    return buildService1002FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1003") {
    return buildService1003FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1004") {
    return buildService1004FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1005") {
    return buildService1005FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1006") {
    return buildService1006FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1007") {
    return buildService1007FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1008") {
    return buildService1008FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1009") {
    return buildService1009FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1010") {
    return buildService1010FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1101") {
    return buildService1101FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1102") {
    return buildService1102FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1201") {
    return buildService1201FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1202") {
    return buildService1202FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceApplicationDetailId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1203") {
    return buildService1203FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceApplicationDetailId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1204") {
    return buildService1204FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service1205") {
    return buildService1205FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
    });
  }

  if (config.kind === "service1801") {
    return buildService1801FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service1802") {
    return buildService1802FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
    });
  }

  if (config.kind === "service1901") {
    return buildService1901FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service2201") {
    return buildService2201FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service2401") {
    return buildService2401FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service2402") {
    return buildService2402FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service2202") {
    return buildService2202FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service8006") {
    return buildService8006FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service8007") {
    return buildService8007FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service8008") {
    return buildService8008FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
    });
  }

  if (config.kind === "service80021") {
    return buildService80021FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service80022") {
    return buildService80022FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service80041") {
    return buildService80041FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (config.kind === "service80042") {
    return buildService80042FeeEnginePayload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      sourceApplicationId,
      sourceMedialLicenseId,
    });
  }

  if (
    config.kind === "service80011" ||
    config.kind === "service80012"
  ) {
    return buildModifyServiceFeeEnginePayload({
      config,
      formValuesList,
      modifyChangeSets,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo,
      licensePermitNo,
      sourceApplicationId,
      sourceApplicationDetailId,
      sourceMedialLicenseId,
    });
  }

  throw new Error(`Unsupported fee strategy kind: ${config.kind}`);
};
