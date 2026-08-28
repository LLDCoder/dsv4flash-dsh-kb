import type { RuleStrategySubmissionMode } from "@/services/services";
import type { IUser as PortalUserInfo } from "@/store/user";
import type {
  IDSelectorValue,
  IdSelectorType,
} from "@/components/designable/src/components/IDSelector/idSelectorUtils";
import get from "lodash/get";

export type FormValues = Record<string, unknown>;

export type ServiceRuleStrategyConfig = {
  serviceId: number;
  kind: string;
};

export interface BuildServiceRuleStrategyPayloadParams {
  config: ServiceRuleStrategyConfig;
  formValuesList: FormValues[];
  modifyChangeSets?: unknown[];
  currentProfileId: string;
  userInfo: PortalUserInfo;
  serviceCode: string | number | null | undefined;
  submissionMode?: RuleStrategySubmissionMode;
}

export const resolveIdSelectorValue = (
  formValuesList: FormValues[],
): IDSelectorValue | undefined => {
  for (const formValues of formValuesList) {
    const idSelectorValue = get(formValues, ["SelectTable", "idSelector"]) ??
                        get(formValues, [ "idSelector"]);
    if (idSelectorValue) return idSelectorValue as IDSelectorValue;
    if (
      "type" in formValues ||
      "emiratesId" in formValues ||
      "uid" in formValues ||
      "passportNumber" in formValues
    ) {
      return formValues as IDSelectorValue;
    }
  }

  return undefined;
};

export const resolveSelectTableSingleValue = (formValuesList: FormValues[]) => {
  for (const formValues of formValuesList) {
    const selectTableSingleValue = get(formValues, ["SelectTableSingle"]);
    if (selectTableSingleValue) {
      return selectTableSingleValue as {
        selectedKey?: string | string[];
        tableData?: Array<{ Id?: unknown }>;
      };
    }
    if ("selectedKey" in formValues || "tableData" in formValues) {
      return formValues as {
        selectedKey?: string | string[];
        tableData?: Array<{ Id?: unknown }>;
      };
    }
  }

  return undefined;
};

export const resolveApplicantUserTypeCode = (
  userInfo: PortalUserInfo,
  currentProfileId: string,
) => {
  const normalizeUserTypeCode = (value: unknown): string => {
    const raw = value === undefined || value === null ? undefined : String(value);
    if (!raw) return "2";
    return raw;
  };

  const establishmentUserType = userInfo.userEstablishments?.find(
    (item) => String(item.userProfileId) === String(currentProfileId),
  )?.userTypeId;

  if (establishmentUserType) {
    return normalizeUserTypeCode(establishmentUserType);
  }

  if (
    userInfo.userInvitation?.userProfileId &&
    String(userInfo.userInvitation.userProfileId) === String(currentProfileId)
  ) {
    return normalizeUserTypeCode(userInfo.userInvitation.userTypeId);
  }

  return "02";
};

export const resolveEstablishmentId = (
  userInfo: PortalUserInfo,
  currentProfileId: string,
) => {
  const establishmentId = userInfo.userEstablishments?.find(
    (item) => String(item.userProfileId) === String(currentProfileId),
  )?.id;

  if (establishmentId === undefined || establishmentId === null) {
    return String(currentProfileId || "");
  }

  return String(establishmentId);
};

export const toVisaType = (value?: IdSelectorType): number => {
  if (value === "uid") return 2;
  if (value === "passport") return 3;
  return 1;
};

export const toGenderId = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const normalized = String(value || "").toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "male" || normalized === "m") return 1;
  if (normalized === "female" || normalized === "f") return 2;

  return Number(normalized);
};

export const toActivityIds = (
  tableData?: Array<{ Id?: unknown }>,
): number[] => {
  return (tableData ?? []).map((item) => item?.Id as number);
};
