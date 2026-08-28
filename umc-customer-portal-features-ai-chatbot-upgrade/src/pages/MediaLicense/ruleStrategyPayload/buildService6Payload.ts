import { nowGst, toApi } from "@/utils/gstTime";
import type { Service6RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import { type BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";

const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getFirstDefined = (values: unknown[]) => values.find(isFilledValue);

const coerceString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

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
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const resolveTermsAccepted = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTableSingle.termsAccepted"),
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.terms.isAgreed"),
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

export const buildService6Payload = ({
  config,
  formValuesList,
  currentProfileId,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service6RuleStrategyValidatePayload => {
  const foreignMediaEntityNameEn =
    coerceString(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "foreignMediaEntity.nameEn"),
          get(formValues, "SelectTable.foreignMediaEntity.nameEn"),
          get(formValues, "SelectTableSingle.foreignMediaEntity.nameEn"),
          get(formValues, "EstablishmentNameEnglish"),
          get(formValues, "establishmentNameEnglish"),
          get(formValues, "NameEn"),
          get(formValues, "nameEn"),
        ]),
      ),
    ) ?? "";

  const foreignMediaEntityCountryId = coerceNumber(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "foreignMediaEntity.countryId"),
        get(formValues, "SelectTable.foreignMediaEntity.countryId"),
        get(formValues, "SelectTableSingle.foreignMediaEntity.countryId"),
        get(formValues, "EstablishmentCountryId"),
        get(formValues, "establishmentCountryId"),
        get(formValues, "CountryOrigin"),
        get(formValues, "countryId"),
      ]),
    ),
  );

  const registrationNumber = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "foreignMediaEntity.registrationNumber"),
        get(formValues, "SelectTable.foreignMediaEntity.registrationNumber"),
        get(formValues, "SelectTableSingle.foreignMediaEntity.registrationNumber"),
        get(formValues, "ReserveTradeNumber"),
        get(formValues, "reserveTradeNumber"),
        get(formValues, "RegistrationNumber"),
        get(formValues, "registrationNumber"),
      ]),
    ),
  );

  const assignmentDate = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "form.assignmentDate"),
        get(formValues, "SelectTable.form.assignmentDate"),
        get(formValues, "SelectTableSingle.form.assignmentDate"),
        get(formValues, "assignmentDate"),
        get(formValues, "DateOfAssignment"),
        get(formValues, "dateOfAssignment"),
      ]),
    ),
  );

  const acquaintancePersonId = coerceNumber(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "form.acquaintancePersonId"),
        get(formValues, "SelectTable.form.acquaintancePersonId"),
        get(formValues, "SelectTableSingle.form.acquaintancePersonId"),
        get(formValues, "acquaintancePersonId"),
        get(formValues, "acquaintanceForm.acquaintancePersonId"),
        get(formValues, "acquaintanceForm.personId"),
        get(formValues, "acquaintanceForm.id"),
      ]),
    ),
  );

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicant: {
        userId: currentProfileId || "",
      },
      form: {
        foreignMediaEntity: {
          nameEn: foreignMediaEntityNameEn,
          countryId: foreignMediaEntityCountryId,
          registrationNumber,
        },
        assignmentDate,
        acquaintancePersonId,
        termsAccepted: resolveTermsAccepted(formValuesList),
      },
      submissionMode,
      requestTime: toApi(nowGst()),
    },
  };
};
