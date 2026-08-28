import { nowGst, toApi } from "@/utils/gstTime";
import type { Service801RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
  resolveSelectTableSingleValue,
} from "../ruleStrategyPayloadShared";

type Service801ActivityRule = {
  isRadio: boolean;
  isEncrypted: boolean;
};

const SERVICE_801_ACTIVITY_RULES: Record<number, Service801ActivityRule> = {
  25: { isRadio: true, isEncrypted: true },
  27: { isRadio: true, isEncrypted: false },
  26: { isRadio: false, isEncrypted: true },
  5: { isRadio: false, isEncrypted: false },
};

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

const resolveUploadUrl = (value: unknown): string | undefined => {
  if (typeof value === "string") return coerceString(value);
  if (Array.isArray(value)) return resolveUploadUrl(value[0]);
  if (value && typeof value === "object") {
    return coerceString(
      getFirstDefined([
        get(value, "url"),
        get(value, "fileUrl"),
        get(value, "path"),
        get(value, "response.data"),
        get(value, "response.url"),
        get(value, "name"),
      ]),
    );
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
          get(formValues, "termsAccepted"),
          get(formValues, "termsAgreed"),
          get(formValues, "terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

const resolveActivityId = (
  selectTableSingle?: {
    selectedKey?: string | string[];
    tableData?: Array<{ Id?: unknown }>;
  },
) => {
  const selectedKey = selectTableSingle?.selectedKey;
  const firstSelectedKey = Array.isArray(selectedKey) ? selectedKey[0] : selectedKey;

  return coerceNumber(
    getFirstDefined([firstSelectedKey, get(selectTableSingle, "tableData.0.Id")]),
  );
};

const resolveIdSelector = (formValuesList: Array<Record<string, unknown>>) => {
  return formValuesList
    .map(
      (formValues) =>
        getFirstDefined([
          get(formValues, "idSelector"),
          get(formValues, "SelectTableSingle.idSelector"),
        ]) as Record<string, unknown> | undefined,
    )
    .find((value) => value && typeof value === "object");
};

export const buildService801Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service801RuleStrategyValidatePayload => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  if (!selectTableSingle) {
    throw new Error("SelectTableSingle data is missing for service 801.");
  }

  const activityId = resolveActivityId(selectTableSingle);
  const activityRule = activityId ? SERVICE_801_ACTIVITY_RULES[activityId] : undefined;
  if (!activityRule) {
    throw new Error("Unable to derive service 801 broadcast type from selected activity.");
  }

  const rawLanguageIds = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "SelectTableSingle.Languages"),
      get(formValues, "Languages"),
      get(formValues, "languageIds"),
    ]),
  );
  const rawLanguageIdList = Array.isArray(rawLanguageIds)
    ? rawLanguageIds
    : isFilledValue(rawLanguageIds)
      ? [rawLanguageIds]
      : [];
  const languageIds = rawLanguageIdList
    .map((languageId) => coerceNumber(languageId))
    .filter((languageId): languageId is number => languageId !== undefined);

  const idSelector = resolveIdSelector(formValuesList);
  const chiefEditor = idSelector
    ? {
        fullName:
          coerceString(
            getFirstDefined([
              get(idSelector, "fullNameEnglish"),
              get(idSelector, "fullNameArabic"),
              get(idSelector, "name"),
            ]),
          ) ?? "",
        identityNumber: coerceString(
          getFirstDefined([
            get(idSelector, "emiratesId"),
            get(idSelector, "uid"),
            get(idSelector, "passportNumber"),
            get(idSelector, "identityNumber"),
          ]),
        ),
        photoUrl: resolveUploadUrl(
          getFirstDefined([get(idSelector, "PersonalPhoto"), get(idSelector, "photoUrl")]),
        ),
        acquaintanceFormDocumentUrl: resolveUploadUrl(
          getFirstDefined([
            get(idSelector, "acquaintanceFormDocumentUrl"),
            get(idSelector, "AcquaintanceForm"),
            get(idSelector, "PassportScan"),
          ]),
        ),
      }
    : undefined;

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      isRadio: activityRule.isRadio,
      isEncrypted: activityRule.isEncrypted,
      languageIds,
      capitalAmount: coerceNumber(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "SelectTableSingle.Capital"),
            get(formValues, "Capital"),
            get(formValues, "capitalAmount"),
          ]),
        ),
      ),
      fundingSources: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "SelectTableSingle.EnterProgramsCategory"),
            get(formValues, "SouresofFunding"),
            get(formValues, "fundingSources"),
          ]),
        ),
      ),
      channelName: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "SelectTableSingle.SuggestedName"),
            get(formValues, "SuggestedName"),
            get(formValues, "channelName"),
          ]),
        ),
      ),
      programsOffered: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "SelectTableSingle.ProducerNocAuthorizationLetter"),
            get(formValues, "ProducerNocAuthorizationLetter"),
            get(formValues, "ProgramsOfferedServices"),
          ]),
        ),
      ),
      companyObjectiveFileUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "SelectTableSingle.CompanysObjectives"),
            get(formValues, "CompanysObjectives"),
            get(formValues, "companyObjectiveFileUrl"),
          ]),
        ),
      ),
      feasibilityStudyFileUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "SelectTableSingle.FeasibilityStudy"),
            get(formValues, "FeasibilityStudy"),
            get(formValues, "feasibilityStudyFileUrl"),
          ]),
        ),
      ),
      frequencyFileUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "SelectTableSingle.TRABroadcastFrequency"),
            get(formValues, "TRABroadcastFrequency"),
            get(formValues, "frequencyFileUrl"),
          ]),
        ),
      ),
      chiefEditor,
      termsAccepted: resolveTermsAccepted(formValuesList),
    },
  };
};
