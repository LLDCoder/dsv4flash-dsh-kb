import type {
  RuleStrategySubmissionMode,
  RuleStrategyValidatePayload,
} from "@/services/services";
import type { IUser as PortalUserInfo } from "@/store/user";
import { buildService1Payload } from "./ruleStrategyPayload/buildService1Payload";
import { buildService13Payload } from "./ruleStrategyPayload/buildService13Payload";
import { buildService1101Payload } from "./ruleStrategyPayload/buildService1101Payload";
import { buildService1102Payload } from "./ruleStrategyPayload/buildService1102Payload";
import { buildService1201Payload } from "./ruleStrategyPayload/buildService1201Payload";
import { buildService1204Payload } from "./ruleStrategyPayload/buildService1204Payload";
import { buildService4Payload } from "./ruleStrategyPayload/buildService4Payload";
import { buildService901Payload } from "./ruleStrategyPayload/buildService901Payload";
import { buildService902Payload } from "./ruleStrategyPayload/buildService902Payload";
import { buildService8006Payload } from "./ruleStrategyPayload/buildService8006Payload";
import { buildService8007Payload } from "./ruleStrategyPayload/buildService8007Payload";
import { buildService9Payload } from "./ruleStrategyPayload/buildService9Payload";
import { buildService6Payload } from "./ruleStrategyPayload/buildService6Payload";
import { buildService7Payload } from "./ruleStrategyPayload/buildService7Payload";
import { buildService14Payload } from "./ruleStrategyPayload/buildService14Payload";
import { buildService20Payload } from "./ruleStrategyPayload/buildService20Payload";
import { buildService1801Payload } from "./ruleStrategyPayload/buildService1801Payload";
import { buildService1802Payload } from "./ruleStrategyPayload/buildService1802Payload";
import { buildService1901Payload } from "./ruleStrategyPayload/buildService1901Payload";
import { buildService2202Payload } from "./ruleStrategyPayload/buildService2202Payload";
import { buildService1009Payload } from "./ruleStrategyPayload/buildService1009Payload";
import { buildService1008Payload } from "./ruleStrategyPayload/buildService1008Payload";
import { buildService1007Payload } from "./ruleStrategyPayload/buildService1007Payload";
import { buildService1006Payload } from "./ruleStrategyPayload/buildService1006Payload";
import { buildService1005Payload } from "./ruleStrategyPayload/buildService1005Payload";
import { buildService1004Payload } from "./ruleStrategyPayload/buildService1004Payload";
import { buildService1003Payload } from "./ruleStrategyPayload/buildService1003Payload";
import { buildService1002Payload } from "./ruleStrategyPayload/buildService1002Payload";
import { buildService1001Payload } from "./ruleStrategyPayload/buildService1001Payload";
import { buildService303Payload } from "./ruleStrategyPayload/buildService303Payload";
import { buildService304Payload } from "./ruleStrategyPayload/buildService304Payload";
import { buildService302Payload } from "./ruleStrategyPayload/buildService302Payload";
import { buildService301Payload } from "./ruleStrategyPayload/buildService301Payload";
import { buildService205Payload } from "./ruleStrategyPayload/buildService205Payload";
import { buildService201Payload } from "./ruleStrategyPayload/buildService201Payload";
import { buildService202Payload } from "./ruleStrategyPayload/buildService202Payload";
import { buildService203Payload } from "./ruleStrategyPayload/buildService203Payload";
import { buildService204Payload } from "./ruleStrategyPayload/buildService204Payload";
import { buildService21Payload } from "./ruleStrategyPayload/buildService21Payload";
import { buildService804Payload } from "./ruleStrategyPayload/buildService804Payload";
import { buildService806Payload } from "./ruleStrategyPayload/buildService806Payload";
import { buildService801Payload } from "./ruleStrategyPayload/buildService801Payload";
import { buildService905Payload } from "./ruleStrategyPayload/buildService905Payload";
import { buildService904Payload } from "./ruleStrategyPayload/buildService904Payload";
import { buildService903Payload } from "./ruleStrategyPayload/buildService903Payload";
import { buildService1205Payload } from "./ruleStrategyPayload/buildService1205Payload";
import { buildService1203Payload } from "./ruleStrategyPayload/buildService1203Payload";
import { buildService1202Payload } from "./ruleStrategyPayload/buildService1202Payload";
import { buildService1010Payload } from "./ruleStrategyPayload/buildService1010Payload";
import { buildService2201Payload } from "./ruleStrategyPayload/buildService2201Payload";
import { buildService2401Payload } from "./ruleStrategyPayload/buildService2401Payload";
import { buildService2402Payload } from "./ruleStrategyPayload/buildService2402Payload";
import { buildService8008Payload } from "./ruleStrategyPayload/buildService8008Payload";
import { buildService80022Payload } from "./ruleStrategyPayload/buildService80022Payload";
import { buildService80021Payload } from "./ruleStrategyPayload/buildService80021Payload";
import { buildService802Payload } from "./ruleStrategyPayload/buildService802Payload";
import { buildService803Payload } from "./ruleStrategyPayload/buildService803Payload";
import { buildService80041Payload } from "./ruleStrategyPayload/buildService80041Payload";
import { buildService80042Payload } from "./ruleStrategyPayload/buildService80042Payload";
import {
  buildService80011Payload,
  buildService80012Payload,
} from "./ruleStrategyPayload/buildSocialModifyPayload";

type FormValues = Record<string, unknown>;
type FormilyStepLike = { formData?: string | null };

export interface MediaLicenseRuleStrategyConfig {
  serviceId: number;
  kind: string;
}

interface BuildRuleStrategyPayloadParams {
  config: MediaLicenseRuleStrategyConfig;
  formilyList: unknown[];
  currentProfileId: string;
  userInfo: PortalUserInfo;
  serviceCode: string | number | null | undefined;
  submissionMode?: RuleStrategySubmissionMode;
}

const RULE_STRATEGY_CONFIG_BY_SERVICE_ID: Record<
  number,
  MediaLicenseRuleStrategyConfig
> = {
  1: {
    serviceId: 1,
    kind: "service1",
  },
  13: {
    serviceId: 13,
    kind: "service13",
  },
  4: {
    serviceId: 4,
    kind: "service4",
  },
  6: {
    serviceId: 6,
    kind: "service6",
  },
  7: {
    serviceId: 7,
    kind: "service7",
  },
  9: {
    serviceId: 9,
    kind: "service9",
  },
  14: {
    serviceId: 14,
    kind: "service14",
  },
  20: {
    serviceId: 20,
    kind: "service20",
  },
  21: {
    serviceId: 21,
    kind: "service21",
  },
  205: {
    serviceId: 205,
    kind: "service205",
  },
  201: {
    serviceId: 201,
    kind: "service201",
  },
  202: {
    serviceId: 202,
    kind: "service202",
  },
  203: {
    serviceId: 203,
    kind: "service203",
  },
  204: {
    serviceId: 204,
    kind: "service204",
  },
  301: {
    serviceId: 301,
    kind: "service301",
  },
  302: {
    serviceId: 302,
    kind: "service302",
  },
  303: {
    serviceId: 303,
    kind: "service303",
  },
  304: {
    serviceId: 304,
    kind: "service304",
  },
  804: {
    serviceId: 804,
    kind: "service804",
  },
  806: {
    serviceId: 806,
    kind: "service806",
  },
  801: {
    serviceId: 801,
    kind: "service801",
  },
  802: {
    serviceId: 802,
    kind: "service802",
  },
  803: {
    serviceId: 803,
    kind: "service803",
  },
  901: {
    serviceId: 901,
    kind: "service901",
  },
  902: {
    serviceId: 902,
    kind: "service902",
  },
  903: {
    serviceId: 903,
    kind: "service903",
  },
  904: {
    serviceId: 904,
    kind: "service904",
  },
  905: {
    serviceId: 905,
    kind: "service905",
  },
  1205: {
    serviceId: 1205,
    kind: "service1205",
  },
  1203: {
    serviceId: 1203,
    kind: "service1203",
  },
  1204: {
    serviceId: 1204,
    kind: "service1204",
  },
  1101: {
    serviceId: 1101,
    kind: "service1101",
  },
  1102: {
    serviceId: 1102,
    kind: "service1102",
  },
  8006: {
    serviceId: 8006,
    kind: "service8006",
  },
  8007: {
    serviceId: 8007,
    kind: "service8007",
  },
  8008: {
    serviceId: 8008,
    kind: "service8008",
  },
  80022: {
    serviceId: 80022,
    kind: "service80022",
  },
  80021: {
    serviceId: 80021,
    kind: "service80021",
  },
  80041: {
    serviceId: 80041,
    kind: "service80041",
  },
  80042: {
    serviceId: 80042,
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
  1201: {
    serviceId: 1201,
    kind: "service1201",
  },
  1202: {
    serviceId: 1202,
    kind: "service1202",
  },
  1801: {
    serviceId: 1801,
    kind: "service1801",
  },
  1802: {
    serviceId: 1802,
    kind: "service1802",
  },
  1901: {
    serviceId: 1901,
    kind: "service1901",
  },
  2202: {
    serviceId: 2202,
    kind: "service2202",
  },
  2201: {
    serviceId: 2201,
    kind: "service2201",
  },
  2401: {
    serviceId: 2401,
    kind: "service2401",
  },
  2402: {
    serviceId: 2402,
    kind: "service2402",
  },
  1001: {
    serviceId: 1001,
    kind: "service1001",
  },
  1002: {
    serviceId: 1002,
    kind: "service1002",
  },
  1003: {
    serviceId: 1003,
    kind: "service1003",
  },
  1004: {
    serviceId: 1004,
    kind: "service1004",
  },
  1005: {
    serviceId: 1005,
    kind: "service1005",
  },
  1006: {
    serviceId: 1006,
    kind: "service1006",
  },
  1007: {
    serviceId: 1007,
    kind: "service1007",
  },
  1008: {
    serviceId: 1008,
    kind: "service1008",
  },
  1009: {
    serviceId: 1009,
    kind: "service1009",
  },
  1010: {
    serviceId: 1010,
    kind: "service1010",
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
  return formilyList.map(
    (step) => parseStepFormData(step)?.formValues || {},
  );
};

const collectModifyChangeSets = (formilyList: unknown[]): unknown[] => {
  if (!Array.isArray(formilyList)) return [];
  return formilyList
    .map((step) => parseStepFormData(step)?.modifyChangeSet)
    .filter((changeSet) => changeSet !== undefined);
};

export const getMediaLicenseRuleStrategyConfig = (
  serviceId: number,
): MediaLicenseRuleStrategyConfig | undefined => {
  return RULE_STRATEGY_CONFIG_BY_SERVICE_ID[serviceId];
};

export const buildMediaLicenseRuleStrategyPayload = async ({
  config,
  formilyList,
  currentProfileId,
  userInfo,
  serviceCode,
  submissionMode = "submit",
}: BuildRuleStrategyPayloadParams): Promise<RuleStrategyValidatePayload> => {
  const formValuesList = collectFormValues(formilyList);
  const modifyChangeSets = collectModifyChangeSets(formilyList);

  if (config.kind === "service1") {
    return buildService1Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service4") {
    return buildService4Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service6") {
    return buildService6Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service7") {
    return buildService7Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service9") {
    return buildService9Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service13") {
    return buildService13Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service14") {
    return buildService14Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service20") {
    return buildService20Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service21") {
    return buildService21Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service201") {
    return buildService201Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service202") {
    return buildService202Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service203") {
    return buildService203Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service204") {
    return buildService204Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service205") {
    return buildService205Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service301") {
    return buildService301Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service302") {
    return buildService302Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service303") {
    return buildService303Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service304") {
    return buildService304Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }

  if (config.kind === "service801") {
    return buildService801Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service802") {
    return buildService802Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service803") {
    return buildService803Payload({
      config,
      formValuesList,
      modifyChangeSets,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service804") {
    return buildService804Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service806") {
    return buildService806Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service901") {
    return buildService901Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service902") {
    return buildService902Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service903") {
    return buildService903Payload({
      config,
      formValuesList,
      modifyChangeSets,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service904") {
    return buildService904Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service905") {
    return buildService905Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1205") {
    return buildService1205Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1203") {
    return buildService1203Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1204") {
    return buildService1204Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1101") {
    return buildService1101Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1102") {
    return buildService1102Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service8006") {
    return buildService8006Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service8007") {
    return buildService8007Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service8008") {
    return buildService8008Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service80022") {
    return buildService80022Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service80021") {
    return buildService80021Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service80041") {
    return buildService80041Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service80042") {
    return buildService80042Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service80011") {
    return buildService80011Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service80012") {
    return buildService80012Payload({
      config,
      formValuesList,
      modifyChangeSets,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1201") {
    return buildService1201Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1202") {
    return buildService1202Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1801") {
    return buildService1801Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1802") {
    return buildService1802Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1901") {
    return buildService1901Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service2202") {
    return buildService2202Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service2201") {
    return buildService2201Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service2401") {
    return (await buildService2401Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    })) as RuleStrategyValidatePayload;
  }
  if (config.kind === "service2402") {
    return (await buildService2402Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    })) as RuleStrategyValidatePayload;
  }
  if (config.kind === "service1001") {
    return buildService1001Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1002") {
    return buildService1002Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1003") {
    return buildService1003Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1004") {
    return buildService1004Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1005") {
    return buildService1005Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1006") {
    return buildService1006Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1007") {
    return buildService1007Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1008") {
    return buildService1008Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1009") {
    return buildService1009Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  if (config.kind === "service1010") {
    return buildService1010Payload({
      config,
      formValuesList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  }
  throw new Error(`Unsupported rule strategy kind: ${config.kind}`);
};
