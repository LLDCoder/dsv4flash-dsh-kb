import { nowGst, toApi } from "@/utils/gstTime";
import type { Service802RuleStrategyValidatePayload } from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";
import {
  coerceBoolean,
  coerceNumber,
  coerceString,
  getFirstDefined,
  resolveTermsAgreed,
  resolveUploadUrl,
} from "../ruleStrategyPayloadUtils";

const SERVICE_802_RULE_VERSION = "1.0.0";

const APPLICATION_ID_PATHS = [
  "applicationId",
  "payload.applicationId",
  "sourceApplicationId",
  "SelectTable.applicationId",
  "SelectTable.sourceApplicationId",
  "SelectTableSingle.applicationId",
  "SelectTableSingle.sourceApplicationId",
];

const APPLICATION_DETAIL_ID_PATHS = [
  "applicationDetailId",
  "payload.applicationDetailId",
  "sourceApplicationDetailId",
  "SelectTable.applicationDetailId",
  "SelectTable.sourceApplicationDetailId",
  "SelectTableSingle.applicationDetailId",
  "SelectTableSingle.sourceApplicationDetailId",
];

const resolveApplicationId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;

  return coerceNumber(
    getFirstDefined([
      ...formValuesList.flatMap((formValues) =>
        APPLICATION_ID_PATHS.map((path) => get(formValues, path)),
      ),
      lifecycleSource?.sourceApplicationId,
    ]),
  );
};

const resolveApplicationDetailId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;

  return coerceNumber(
    getFirstDefined([
      ...formValuesList.flatMap((formValues) =>
        APPLICATION_DETAIL_ID_PATHS.map((path) => get(formValues, path)),
      ),
      lifecycleSource?.sourceApplicationDetailId,
    ]),
  );
};

const resolveChiefEditor = (formValuesList: Array<Record<string, unknown>>) => {
  const idSelector = formValuesList
    .map(
      (formValues) =>
        getFirstDefined([
          get(formValues, "idSelector"),
          get(formValues, "SelectTable.idSelector"),
          get(formValues, "SelectTableSingle.idSelector"),
        ]) as Record<string, unknown> | undefined,
    )
    .find((value) => value && typeof value === "object");

  const acquaintanceForm = formValuesList
    .map(
      (formValues) =>
        getFirstDefined([
          get(formValues, "acquaintanceForm"),
          get(formValues, "SelectTable.acquaintanceForm"),
          get(formValues, "SelectTableSingle.acquaintanceForm"),
        ]) as Record<string, unknown> | undefined,
    )
    .find((value) => value && typeof value === "object");

  const chiefEditor = {
    fullName:
      coerceString(
        getFirstDefined([
          get(idSelector, "fullNameEnglish"),
          get(idSelector, "fullNameArabic"),
          get(idSelector, "name"),
          get(acquaintanceForm, "fullName"),
          get(acquaintanceForm, "fullNameEnglish"),
          get(acquaintanceForm, "fullNameArabic"),
        ]),
      ) ?? "",
    identityNumber: coerceString(
      getFirstDefined([
        get(idSelector, "emiratesId"),
        get(idSelector, "uid"),
        get(idSelector, "passportNumber"),
        get(idSelector, "identityNumber"),
        get(acquaintanceForm, "passportNumber"),
        get(acquaintanceForm, "residencyNumber"),
      ]),
    ),
    photoUrl: resolveUploadUrl(
      getFirstDefined([
        get(idSelector, "PersonalPhoto"),
        get(idSelector, "photoUrl"),
      ]),
    ),
    acquaintanceFormDocumentUrl: resolveUploadUrl(
      getFirstDefined([
        get(idSelector, "acquaintanceFormDocumentUrl"),
        get(idSelector, "AcquaintanceForm"),
        get(acquaintanceForm, "documentUrl"),
        get(acquaintanceForm, "attachmentUrl"),
        get(acquaintanceForm, "fileUrl"),
      ]),
    ),
  };

  const hasChiefEditorData = Boolean(
    chiefEditor.fullName ||
      chiefEditor.identityNumber ||
      chiefEditor.photoUrl ||
      chiefEditor.acquaintanceFormDocumentUrl,
  );

  if (!hasChiefEditorData) return undefined;

  return chiefEditor;
};

const resolveTermsAccepted = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "termsAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "terms.isAgreed"),
          get(formValues, "SelectTable.termsAgreed"),
          get(formValues, "SelectTable.termsAccepted"),
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.termsAccepted"),
        ]),
      ),
    ) ?? resolveTermsAgreed(formValuesList)
  );
};

export const buildService802Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service802RuleStrategyValidatePayload => {
  return {
    actionType: 2,
    expectedRuleVersion: SERVICE_802_RULE_VERSION,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicationId: resolveApplicationId(formValuesList),
      applicationDetailId: resolveApplicationDetailId(formValuesList),
      submissionMode,
      requestTime: toApi(nowGst()),
      chiefEditor: resolveChiefEditor(formValuesList),
      termsAgreed: resolveTermsAccepted(formValuesList),
    },
  };
};
