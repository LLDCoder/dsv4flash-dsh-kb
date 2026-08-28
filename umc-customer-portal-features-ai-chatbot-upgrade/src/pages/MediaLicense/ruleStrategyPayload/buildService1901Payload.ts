import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1901RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveApplicantUserTypeCode,
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

const resolveTermsAgreed = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTable.termsAccepted"),
          get(formValues, "SelectTable.termsAgreed"),
          get(formValues, "SelectTable.terms.isAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "termsAgreed"),
          get(formValues, "terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

const resolveSelectedService18ApplicationId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const rawValue = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "pressCardSelector.applicationId"),
      get(formValues, "pressCardSelector.ApplicationId"),
      get(formValues, "pressCardSelector.id"),
      get(formValues, "pressCardSelector.Id"),
      get(formValues, "pressCardSelector.value"),
      get(formValues, "pressCardSelector.selectedKey"),
      get(formValues, "pressCardSelector.pressCardApplicationId"),
      get(formValues, "pressCardSelector.service18ApplicationId"),
      get(formValues, "PressCardSelector.applicationId"),
      get(formValues, "PressCardSelector.ApplicationId"),
      get(formValues, "selectedService18ApplicationId"),
      get(formValues, "service18ApplicationId"),
      get(formValues, "SelectTable.selectedService18ApplicationId"),
      get(formValues, "SelectTable.service18ApplicationId"),
      get(formValues, "pressCardSelector"),
      get(formValues, "PressCardSelector"),
    ]),
  );

  if (Array.isArray(rawValue)) {
    return coerceNumber(rawValue[0]);
  }

  if (rawValue && typeof rawValue === "object") {
    return coerceNumber(
      getFirstDefined([
        get(rawValue, "applicationId"),
        get(rawValue, "ApplicationId"),
        get(rawValue, "id"),
        get(rawValue, "Id"),
        get(rawValue, "value"),
        get(rawValue, "selectedKey"),
        get(rawValue, "pressCardApplicationId"),
        get(rawValue, "service18ApplicationId"),
      ]),
    );
  }

  return coerceNumber(rawValue);
};

export const buildService1901Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service1901RuleStrategyValidatePayload => {
  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      applicantUserTypeId: coerceNumber(
        resolveApplicantUserTypeCode(userInfo, currentProfileId),
      ),
      selectedService18ApplicationId:
        resolveSelectedService18ApplicationId(formValuesList),
      submissionMode,
      requestTime: toApi(nowGst()),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
