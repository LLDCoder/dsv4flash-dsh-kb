import { nowGst, toApi } from "@/utils/gstTime";
import type {
  Service901AccountBinding,
  Service901RuleStrategyValidatePayload,
} from "@/services/services";
import get from "lodash/get";
import {
  resolveEstablishmentId,
  type BuildServiceRuleStrategyPayloadParams,
} from "../ruleStrategyPayloadShared";

const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getFirstDefined = (values: unknown[]) => values.find(isFilledValue);

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
};

const resolveActivityIds = (formValuesList: Array<Record<string, unknown>>) => {
  const rawSelectedKeys = getFirstDefined(
    formValuesList.map((formValues) => get(formValues, "SelectTable.selectedKey")),
  );

  if (!Array.isArray(rawSelectedKeys)) {
    return [];
  }

  return rawSelectedKeys
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

const resolveActivityAccountBindings = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const rawBindings = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "activityAccountBindings"),
      get(formValues, "SelectTable.activityAccountBindings"),
    ]),
  );

  return Array.isArray(rawBindings)
    ? (rawBindings as Service901AccountBinding[])
    : [];
};

const resolveTermsAgreed = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "termsAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "terms.isAgreed"),
          get(formValues, "SelectTable.termsAgreed"),
          get(formValues, "SelectTable.termsAccepted"),
          get(formValues, "SelectTable.terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

export const buildService901Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service901RuleStrategyValidatePayload => {
  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: resolveActivityIds(formValuesList),
      activityAccountBindings: resolveActivityAccountBindings(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
