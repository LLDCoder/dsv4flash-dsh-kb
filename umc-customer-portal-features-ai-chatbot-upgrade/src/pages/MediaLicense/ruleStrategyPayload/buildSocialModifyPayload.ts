import type {
  Service80011RuleStrategyValidatePayload,
  Service80012RuleStrategyValidatePayload,
  ServiceSocialMediaAccountChange,
} from "@/services/services";
import get from "lodash/get";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { nowGst, toApi } from "@/utils/gstTime";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import { ModifyEnginePayloadError } from "../modifyEnginePayloadError";

const findSocialMediaAccountChanges = (
  formValuesList: Array<Record<string, unknown>>,
): Record<string, unknown>[] =>
  formValuesList
    .flatMap((formValues) => {
      const value = get(formValues, "socialMediaAccounts");
      return Array.isArray(value) ? value : [];
    })
    .filter(
      (item) =>
        Boolean(item) &&
        typeof item === "object" &&
        ["ADD", "MODIFY", "DELETE"].includes(
          String((item as Record<string, unknown>).operation || "").toUpperCase(),
        ),
    ) as Record<string, unknown>[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toPositiveIntegerId = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value.trim())) {
    return undefined;
  }
  const normalizedValue = Number(value.trim());
  return Number.isSafeInteger(normalizedValue) ? normalizedValue : undefined;
};

const collectChangeItems = (modifyChangeSets: unknown[] | undefined) =>
  (modifyChangeSets ?? []).flatMap((changeSet) => {
    if (!isRecord(changeSet) || !Array.isArray(changeSet.changes)) return [];
    return changeSet.changes.filter(isRecord);
  });

const resolveEstablishmentFields = (modifyChangeSets: unknown[] | undefined) =>
  Array.from(
    new Set(
      collectChangeItems(modifyChangeSets)
        .filter(
          (change) =>
            change.component === "ProfileForm" ||
            change.ownerComponent === "ProfileForm",
        )
        .map((change) => String(change.fieldKey ?? "").trim())
        .filter(Boolean),
    ),
  );

const SERVICE_80012_ESTABLISHMENT_FIELD_ALLOWLIST = new Set([
  "workEmail",
  "establishmentNameArabic",
  "establishmentNameEnglish",
  "hasTradeLicense",
  "commercialLicenseNumber",
  "licenseExpiryDate",
  "phoneNumber",
  "tenancyContractEndDate",
  "commercialLicense",
  "tenancyContract",
  "reserveTradeName",
  "memorandumOfAssociation",
  "powerOfAttorney",
  "addressPicker.emirateId",
  "addressPicker.regionId",
  "addressPicker.areaId",
  "addressPicker.street",
  "addressPicker.latitude",
  "addressPicker.longitude",
]);

const resolveService80012EstablishmentFields = (
  modifyChangeSets: unknown[] | undefined,
) => {
  const fields = resolveEstablishmentFields(modifyChangeSets);
  const unsupportedFields = fields.filter(
    (field) => !SERVICE_80012_ESTABLISHMENT_FIELD_ALLOWLIST.has(field),
  );
  if (unsupportedFields.length > 0) {
    throw new ModifyEnginePayloadError(
      "configuration-incomplete",
      `Unable to build service 80012 rule payload: unsupported Establishment Information fields: ${unsupportedFields.join(", ")}.`,
    );
  }
  return fields;
};

const toPositiveIntegerIds = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const ids = value.map(toPositiveIntegerId);
  if (ids.some((id) => id === undefined)) return undefined;
  return Array.from(new Set(ids as number[]));
};

const requiredText = (
  item: Record<string, unknown>,
  primaryKey: string,
  fallbackKey?: string,
) =>
  String(
    item[primaryKey] ?? (fallbackKey ? item[fallbackKey] : "") ?? "",
  ).trim();

const buildSocialMediaAccountChange = (
  item: Record<string, unknown>,
  serviceId: number,
): ServiceSocialMediaAccountChange => {
  const operation = String(item.operation ?? "").toUpperCase();
  const accountId = toPositiveIntegerId(item.accountId);

  if (operation === "DELETE") {
    if (accountId === undefined) {
      throw new ModifyEnginePayloadError(
        "configuration-incomplete",
        `Unable to build service ${serviceId} rule payload: DELETE requires an authoritative accountId.`,
      );
    }
    return { operation: "DELETE", accountId };
  }

  if (operation !== "ADD" && operation !== "MODIFY") {
    throw new ModifyEnginePayloadError(
      "configuration-incomplete",
      `Unable to build service ${serviceId} rule payload: unsupported Social Media Account operation.`,
    );
  }
  if (operation === "MODIFY" && accountId === undefined) {
    throw new ModifyEnginePayloadError(
      "configuration-incomplete",
      `Unable to build service ${serviceId} rule payload: MODIFY requires an authoritative accountId.`,
    );
  }

  const platformId =
    toPositiveIntegerId(item.accountType) ??
    toPositiveIntegerId(item.platformId);
  const accountType = toPositiveIntegerId(item.accountType) ?? platformId;
  const mediaCategoryId =
    toPositiveIntegerId(item.mediaCategory) ??
    toPositiveIntegerId(item.mediaCategoryId);
  const subCategoryIds =
    toPositiveIntegerIds(item.mediaSubCategories) ??
    toPositiveIntegerIds(item.subCategoryIds);
  const displayName = requiredText(item, "accountName", "accountTitle");
  const websiteUrl = requiredText(item, "accountUrl");
  const proofDocUrl = requiredText(item, "screenshot");

  if (
    platformId === undefined ||
    accountType === undefined ||
    mediaCategoryId === undefined ||
    !subCategoryIds ||
    subCategoryIds.length === 0 ||
    !displayName ||
    !websiteUrl
  ) {
    throw new ModifyEnginePayloadError(
      "configuration-incomplete",
      `Unable to build service ${serviceId} rule payload: platform, account type, media category, sub-category, display name, and website URL are required.`,
    );
  }

  const commonFields = {
    platformId,
    accountType,
    mediaCategoryId,
    displayName,
    websiteUrl,
    proofDocUrl,
    subCategoryIds,
  };
  return operation === "ADD"
    ? { operation: "ADD", accountId: null, ...commonFields }
    : { operation: "MODIFY", accountId: accountId as number, ...commonFields };
};

const buildSocialMediaAccountChanges = (
  formValuesList: Array<Record<string, unknown>>,
  serviceId: number,
) => {
  const changes = findSocialMediaAccountChanges(formValuesList).map((item) =>
    buildSocialMediaAccountChange(item, serviceId),
  );
  const persistedAccountIds = changes.flatMap((change) =>
    change.operation === "ADD" ? [] : [change.accountId],
  );
  if (new Set(persistedAccountIds).size !== persistedAccountIds.length) {
    throw new ModifyEnginePayloadError(
      "configuration-incomplete",
      `Unable to build service ${serviceId} rule payload: an accountId may only be changed once per request.`,
    );
  }
  return changes;
};

const resolveLifecycleContext = (serviceId: number) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;
  const applicationId = toPositiveIntegerId(
    lifecycleSource?.sourceApplicationId,
  );
  const applicationDetailId = toPositiveIntegerId(
    lifecycleSource?.sourceApplicationDetailId,
  );
  const mediaLicenseId = toPositiveIntegerId(
    lifecycleSource?.sourceMedialLicenseId,
  );
  const licensePermitNo = String(
    lifecycleSource?.licensePermitNo ?? "",
  ).trim();

  if (
    applicationId === undefined ||
    applicationDetailId === undefined ||
    mediaLicenseId === undefined ||
    !licensePermitNo
  ) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      `Unable to build service ${serviceId} rule payload: application, license permit, and media license context are required.`,
    );
  }
  return {
    applicationId,
    applicationDetailId,
    mediaLicenseId,
    licensePermitNo,
  };
};

const buildSocialModifyPayload = ({
  config,
  formValuesList,
  submissionMode,
}: BuildServiceRuleStrategyPayloadParams): Service80011RuleStrategyValidatePayload => {
  const changes = buildSocialMediaAccountChanges(
    formValuesList,
    config.serviceId,
  );
  if (changes.length === 0) {
    throw new ModifyEnginePayloadError(
      "no-supported-changes",
      `Unable to build service ${config.serviceId} rule payload: at least one Social Media Account change is required.`,
    );
  }

  const context = resolveLifecycleContext(config.serviceId);
  return {
    actionType: 4,
    request: {
      serviceId: config.serviceId,
      ...context,
      modificationItems: ["SOCIAL_MEDIA_ACCOUNT"],
      establishmentFields: [],
      socialMediaAccountChanges: changes,
      termsAgreed: true,
      submissionMode: submissionMode ?? "submit",
      requestTime: toApi(nowGst()),
    },
  };
};

export const buildService80011Payload = (
  params: BuildServiceRuleStrategyPayloadParams,
) => buildSocialModifyPayload(params);

export const buildService80012Payload = (
  params: BuildServiceRuleStrategyPayloadParams,
): Service80012RuleStrategyValidatePayload => {
  const socialMediaAccountChanges = buildSocialMediaAccountChanges(
    params.formValuesList,
    params.config.serviceId,
  );
  const establishmentFields = resolveService80012EstablishmentFields(
    params.modifyChangeSets,
  );
  if (
    establishmentFields.length === 0 &&
    socialMediaAccountChanges.length === 0
  ) {
    throw new ModifyEnginePayloadError(
      "no-supported-changes",
      "Unable to build service 80012 rule payload: at least one Establishment Information change is required.",
    );
  }

  const context = resolveLifecycleContext(params.config.serviceId);
  const applicantUserId = String(params.currentProfileId ?? "").trim();

  if (toPositiveIntegerId(applicantUserId) === undefined) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 80012 rule payload: applicant, application, license permit, and media license context are required.",
    );
  }

  return {
    actionType: 4,
    request: {
      serviceId: params.config.serviceId,
      applicantUserId,
      ...context,
      modificationItems: [
        ...(establishmentFields.length > 0
          ? (["ESTABLISHMENT_INFORMATION"] as const)
          : []),
        ...(socialMediaAccountChanges.length > 0
          ? (["SOCIAL_MEDIA_ACCOUNT"] as const)
          : []),
      ],
      establishmentFields,
      socialMediaAccountChanges,
      termsAgreed: true,
      submissionMode: params.submissionMode ?? "submit",
      requestTime: toApi(nowGst()),
    },
  };
};
