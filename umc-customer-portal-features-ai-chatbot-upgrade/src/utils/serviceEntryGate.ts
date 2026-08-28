import { fromApi } from "@/utils/gstTime";
import type { History, LocationState } from "history";
import i18n from "@/localization/config";
import { completeIdentitySwitch } from "@/utils/identitySwitch";
import { CustomMessage } from "@/components/common";
import { appendPersistentQueryToUrl } from "@/utils/history";
import type {
  ServiceEntryGateDialogAction,
  ServiceEntryGateDialogConfig,
  ServiceEntryGateDialogOpener,
  ServiceEntryGateProfileOption,
} from "@/components/ServiceEntryGate/types";
import { useServicesStore } from "@/store/services";
import { useUpdateFormStore } from "@/store/update-form";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import {
  checkServiceEntryGate,
  type ServiceEntryGateDecision,
  type ServiceEntryGateDecisionVariables,
  type ServiceEntryGateDocumentInfo,
  type ServiceEntryGateEnvelope,
  type ServiceEntryGateExpiredState,
  type ServiceEntryGatePayload,
  type ServiceEntryGateProfileState,
  type ServiceEntryGatePromptCode,
  type ServiceEntryGateRequiredApplicantType,
} from "@/services/services";
import { userChangeIdentity } from "@/services/userProfile";
import {
  SERVICE_ENTRY_GATE_QUERY_KEY,
  isServiceEntryGateEnabled,
  resolveServiceEntryGateQueryOverride,
} from "@/utils/serviceEntryGateQuery";

export { isServiceEntryGateEnabled } from "@/utils/serviceEntryGateQuery";

const SERVICE_ENTRY_GATE_STATE_KEY = "__serviceEntryGate";

const t = (key: string, fallback: string, values?: Record<string, unknown>) => {
  const translated = i18n.t(key, values);
  if (typeof translated === "string" && translated !== key) {
    return translated;
  }
  return fallback;
};

const DEFAULT_BACK_ACTION: ServiceEntryGateDialogAction = {
  key: "back",
  label: t("serviceEntryGate.actions.back", "Back"),
  variant: "outline",
};

const DEFAULT_OK_ACTION: ServiceEntryGateDialogAction = {
  key: "ok",
  label: t("serviceEntryGate.actions.ok", "OK"),
  variant: "primary",
};

const MEDIA_LICENSE_RENEW_ACTION = "RENEW";
const IN_PROGRESS_MODAL_EXCLUDED_STATUSES = new Set(["completed", "draft"]);

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const d = fromApi(value);
  if (!d) {
    return value;
  }

  const locale = i18n.language?.startsWith("ar") ? "ar-AE" : "en-GB";

  // Format via toLocaleDateString anchored to the Dubai timezone so month
  // names stay locale-aware without browser-TZ day shifting.
  return d.toDate().toLocaleDateString(locale, {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toNumber = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toStringValue = (value?: string | number | null) => {
  if (value === undefined || value === null) {
    return null;
  }
  return String(value);
};

const toNumericUserTypeId = (value?: string | number | null) => {
  const normalizedValue = toStringValue(value)?.trim() || "";
  const numericValue = Number(normalizedValue);

  return normalizedValue && Number.isInteger(numericValue) && numericValue > 0
    ? String(numericValue)
    : "";
};

const readString = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value);
      if (text) {
        return text;
      }
    }
  }
  return null;
};

const readNumber = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = toNumber(source[key] as string | number | null);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

const isValidPositiveInteger = (value: number | null): value is number =>
  value !== null && Number.isSafeInteger(value) && value > 0;

const normalizeRequiredApplicantType = (
  value?: string | null,
): ServiceEntryGateRequiredApplicantType | null => {
  if (!value) {
    return null;
  }

  if (
    value === "Individual" ||
    value === "Establishment" ||
    value === "Either"
  ) {
    return value;
  }

  return null;
};

const normalizeProfileState = (
  value?: string | null,
): ServiceEntryGateProfileState | null => {
  if (!value) {
    return null;
  }

  if (value === "missing" || value === "incomplete" || value === "complete") {
    return value;
  }

  return null;
};

const normalizeExpiredState = (
  value?: string | null,
): ServiceEntryGateExpiredState | null => {
  if (!value) {
    return null;
  }

  if (value === "grace" || value === "penalty") {
    return value;
  }

  return null;
};

const resolveBlockedPromptCode = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
): ServiceEntryGatePromptCode | undefined => {
  const applicationStatus = payload.inProgressInfo?.applicationStatus
    ?.trim()
    .toLowerCase();

  if (
    decision.finalAction === "Block" &&
    applicationStatus &&
    !IN_PROGRESS_MODAL_EXCLUDED_STATUSES.has(applicationStatus)
  ) {
    return "IN_PROGRESS_APPLICATION";
  }

  return decision.promptCode ?? undefined;
};

const syncServiceStore = (options: {
  serviceId: number;
  serviceCode?: string | null;
  serviceName?: string | null;
}) => {
  const serviceStore = useServicesStore.getState();
  serviceStore.updateServicesId(options.serviceId);
  serviceStore.updateServicesCode(options.serviceCode ?? null);
  if (options.serviceName !== undefined) {
    serviceStore.updateServicesName(options.serviceName ?? "");
  }
};

const isCurrentIdentityGlobal = () => {
  const userState = useUserStore.getState();

  return (
    isGlobalProfileId(userState.currentProfileId) ||
    isGlobalProfileId(userState.userInfo?.currentUserProfileId)
  );
};

const shouldUseServiceEntryGate = (search?: string | null) =>
  isServiceEntryGateEnabled(search) || isCurrentIdentityGlobal();

const appendServiceEntryGateQuery = (
  searchParams: URLSearchParams,
  currentSearch?: string | null,
) => {
  const override = resolveServiceEntryGateQueryOverride(currentSearch);

  if (override === null) {
    return;
  }

  searchParams.set(SERVICE_ENTRY_GATE_QUERY_KEY, override ? "1" : "0");
};

const appendMediaLicenseActionQuery = (
  searchParams: URLSearchParams,
  action?: string | null,
) => {
  if (!action) {
    return;
  }

  searchParams.set("actions", action);
};

const createMediaLicensePath = (
  serviceId: number,
  serviceCode?: string | null,
  currentSearch?: string | null,
  action?: string | null,
) => {
  const searchParams = new URLSearchParams({
    serviceId: String(serviceId),
  });
  if (serviceCode) {
    searchParams.set("serviceCode", serviceCode);
  }
  appendMediaLicenseActionQuery(searchParams, action);
  appendServiceEntryGateQuery(searchParams, currentSearch);
  return `/services/media-license?${searchParams.toString()}`;
};

const createGateRouteState = (
  serviceId: number,
  payload: ServiceEntryGatePayload,
  source?: string,
  extraState?: LocationState | null,
) => ({
  ...(extraState && typeof extraState === "object" ? extraState : {}),
  [SERVICE_ENTRY_GATE_STATE_KEY]: {
    gatePassed: true,
    serviceId,
    serviceCode: payload.serviceCode ?? null,
    checkedAt: new Date().toISOString(),
    payload,
    source: source || null,
  },
});

type ServiceEntryGatePathResolver = (
  payload: ServiceEntryGatePayload,
) => string;

type ServiceEntryGateAllowCallback = (payload: ServiceEntryGatePayload) => void;

type ServiceEntryGateInProgressHandler = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
) => void | Promise<void>;

const getGateRouteState = (state?: LocationState | null) => {
  if (!state || typeof state !== "object") {
    return null;
  }

  const data = (state as Record<string, unknown>)[SERVICE_ENTRY_GATE_STATE_KEY];
  if (!data || typeof data !== "object") {
    return null;
  }

  return data as {
    gatePassed?: boolean;
    serviceId?: number;
    payload?: ServiceEntryGatePayload;
  };
};

const resolveDetailRoute = (
  payload: ServiceEntryGatePayload,
  documentInfo?: ServiceEntryGateDocumentInfo | null,
) => {
  const payloadRecord = payload as Record<string, unknown>;
  const documentRecord = (documentInfo || {}) as Record<string, unknown>;
  const inProgressRecord = (payloadRecord.inProgressInfo || {}) as Record<
    string,
    unknown
  >;
  if (documentInfo?.detailRoute) {
    return documentInfo.detailRoute;
  }

  const applicationId =
    readNumber(inProgressRecord, ["applicationId"]) ||
    readNumber(documentRecord, ["applicationId"]) ||
    readNumber(payloadRecord, ["applicationId", "applicationDetailId"]);
  if (applicationId) {
    return `/my-requests/detail?id=${applicationId}`;
  }

  const searchValue =
    readString(documentRecord, ["licenseNumber", "identifierValue"]) ||
    documentInfo?.identifierValue ||
    readString(payloadRecord, [
      "licenseNumber",
      "documentNumber",
      "applicationNumber",
      "applicationNo",
    ]);

  if (searchValue) {
    return `/permits-license?search=${encodeURIComponent(searchValue)}`;
  }

  return "/permits-license";
};

const resolveDocumentIdentifier = (
  payload: ServiceEntryGatePayload,
  promptCode?: ServiceEntryGatePromptCode,
) => {
  const documentInfo = payload.documentInfo;
  const payloadRecord = payload as Record<string, unknown>;
  const documentRecord = (documentInfo || {}) as Record<string, unknown>;
  const inProgressRecord = (payloadRecord.inProgressInfo || {}) as Record<
    string,
    unknown
  >;
  const isApplicationIdentifier = promptCode === "IN_PROGRESS_APPLICATION";

  if (isApplicationIdentifier) {
    return {
      label: t(
        "serviceEntryGate.labels.applicationNumber",
        "Application Number",
      ),
      value:
        readString(inProgressRecord, ["applicationNumber", "applicationNo"]) ||
        readString(documentRecord, ["applicationNumber", "applicationNo"]) ||
        readString(payloadRecord, [
          "applicationNumber",
          "applicationNo",
          "targetApplicationNo",
        ]) ||
        readString(documentRecord, ["identifierValue"]) ||
        readString(inProgressRecord, ["applicationId"]) ||
        readString(documentRecord, ["applicationId"]) ||
        readString(payloadRecord, ["applicationId", "applicationDetailId"]),
    };
  }

  return {
    label:
      documentInfo?.identifierLabel ||
      t("serviceEntryGate.labels.licenseNumber", "License Number"),
    // showLicenseNumber carries the media license number for the families that own one; it falls back to
    // the certificate number server-side. identifierValue stays last so the dialog still shows something
    // against a backend that predates the field.
    value:
      readString(documentRecord, [
        "showLicenseNumber",
        "licenseNumber",
        "identifierValue",
      ]) ||
      readString(payloadRecord, [
        "showLicenseNumber",
        "licenseNumber",
        "documentNumber",
      ]),
  };
};

const buildPrerequisiteBulletItems = (payload: ServiceEntryGatePayload) => {
  const documentRecord = (payload.documentInfo || {}) as Record<
    string,
    unknown
  >;
  const payloadRecord = payload as Record<string, unknown>;
  const source = {
    ...payloadRecord,
    ...documentRecord,
  };
  const items = [
    readString(source, ["requiredParentLicenseName"]),
    readString(source, ["requiredParentLicenseType"]),
    readString(source, ["requiredParentServiceCode"]),
    readString(source, ["missingReason"]),
  ].filter(Boolean) as string[];

  return Array.from(new Set(items));
};

const resolveDecisionVariables = (decision: ServiceEntryGateDecision) => {
  const variables = decision.variables;
  if (!variables || typeof variables !== "object") {
    return {} as ServiceEntryGateDecisionVariables;
  }
  return variables;
};

const parseRequirementItems = (value?: string | null) =>
  String(value || "")
    .split(/\r?\n/)
    .map((item) => item.replace(/^\s*(?:[-•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

const resolveMissingPrerequisiteDescriptions = (
  variables: ServiceEntryGateDecisionVariables,
) => {
  if (!Array.isArray(variables.missingPrerequisiteServices)) {
    return [];
  }

  return variables.missingPrerequisiteServices.flatMap((item) => {
    const description = item?.description?.trim();
    return description ? [description] : [];
  });
};

const buildLocalAuthorityDialog = (
  decision: ServiceEntryGateDecision,
): ServiceEntryGateDialogConfig => {
  const variables = resolveDecisionVariables(decision);
  const isArabic = i18n.language?.startsWith("ar");
  const nameEn = readString(variables, [
    "localAuthorityNameEn",
    "LocalAuthorityNameEn",
    "localAuthorityName",
  ]);
  const nameAr = readString(variables, [
    "localAuthorityNameAr",
    "LocalAuthorityNameAr",
  ]);
  const authorityName =
    (isArabic ? nameAr || nameEn : nameEn || nameAr) ||
    t("serviceEntryGate.localAuthority.fallbackName", "the Local Authority");
  const serviceUrl = readString(variables, [
    "localAuthorityServiceUrl",
    "LocalAuthorityServiceUrl",
  ]);

  return {
    kind: "message",
    tone: "info",
    variant: "local-authority",
    title: t(
      "serviceEntryGate.localAuthority.title",
      "Service Provided by Local Authority",
    ),
    description: t(
      "serviceEntryGate.localAuthority.description",
      `The requested media service is provided by ${authorityName}. Please visit the following link to apply:`,
      { authorityName },
    ),
    descriptionHighlightText: authorityName,
    link: serviceUrl
      ? {
          label: t(
            "serviceEntryGate.localAuthority.linkLabel",
            `${authorityName} - Media Services`,
            { authorityName },
          ),
          url: serviceUrl,
        }
      : undefined,
    actions: [DEFAULT_OK_ACTION],
    dismissActionKey: "ok",
  };
};

const buildRequirementMissingDialog = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
): ServiceEntryGateDialogConfig => {
  const variables = resolveDecisionVariables(decision);
  const requirementItems = [
    ...parseRequirementItems(
      readString(variables, [
        "requirementDescription",
        "RequirementDescription",
      ]),
    ),
    ...resolveMissingPrerequisiteDescriptions(variables),
  ];
  const items = requirementItems.length
    ? requirementItems
    : buildPrerequisiteBulletItems(payload);

  return {
    kind: "message",
    tone: "info",
    variant: "requirement-missing",
    title: t(
      "serviceEntryGate.requirementMissing.title",
      "Prerequisites Required",
    ),
    description: t(
      "serviceEntryGate.requirementMissing.description",
      "Before applying for this service, you need to complete the following requirements.",
    ),
    orderedItems: items.length ? items : undefined,
    actions: [DEFAULT_OK_ACTION],
    dismissActionKey: "ok",
  };
};

const buildAddPersonalProfileRequiredDialog =
  (): ServiceEntryGateDialogConfig => ({
    kind: "message",
    tone: "warning",
    variant: "add-personal",
    title: t("serviceEntryGate.addPersonal.title", "Add Personal Profile"),
    description: t(
      "serviceEntryGate.addPersonalRequired.description",
      "You need a verified Personal Profile before applying for this service. Please add and complete your Personal Profile to continue.",
    ),
    actions: [
      {
        key: "add-personal",
        label: t("serviceEntryGate.actions.addNow", "Add Now"),
        variant: "primary",
      },
    ],
    dismissActionKey: "close",
  });

const buildCompletePersonalProfileRequiredDialog =
  (): ServiceEntryGateDialogConfig => ({
    kind: "message",
    tone: "warning",
    variant: "complete-personal",
    title: t(
      "serviceEntryGate.completePersonal.title",
      "Complete Profile Verification",
    ),
    description: t(
      "serviceEntryGate.completePersonalRequired.description",
      "Your profile is currently under verification. You can apply for this serviceonce your profile has been verified.",
    ),
    actions: [
      {
        key: "complete-personal",
        label: t("serviceEntryGate.actions.completeNow", "Complete Now"),
        variant: "primary",
      },
    ],
    dismissActionKey: "close",
  });

const buildEmirateRequiredDialog = (): ServiceEntryGateDialogConfig => ({
  kind: "message",
  tone: "warning",
  variant: "emirate-required",
  title: t(
    "serviceEntryGate.emirateRequired.title",
    "Profile Address Required",
  ),
  description: t(
    "serviceEntryGate.emirateRequired.description",
    "Please complete the Emirate information in your profile address before applying for this service.",
  ),
  actions: [
    {
      key: "complete-personal",
      label: t("serviceEntryGate.actions.completeNow", "Complete Now"),
      variant: "primary",
    },
  ],
  dismissActionKey: "close",
});

const resolveDecisionDirective = (decision: ServiceEntryGateDecision) => {
  const action = String(decision.action || "")
    .trim()
    .toUpperCase();
  if (action) {
    return action;
  }

  // Older gate responses may miss `action`; mirror the backend
  // reasonCode -> action mapping for the new gate rules only.
  switch (
    String(decision.reasonCode || "")
      .trim()
      .toUpperCase()
  ) {
    case "NO_PERSONAL_PROFILE":
      return "SHOW_ADD_PERSONAL_PROFILE_MODAL";
    case "PERSONAL_PROFILE_INCOMPLETE":
    case "PERSONAL_PROFILE_EXPIRED":
      return "SHOW_COMPLETE_PROFILE_MODAL";
    case "EMIRATE_UNKNOWN":
      return "SHOW_EMIRATE_REQUIRED_MODAL";
    case "LOCAL_AUTHORITY_SERVICE":
      return "SHOW_LOCAL_AUTHORITY_MODAL";
    case "REQUIRED_ACTIVITY_MISSING":
    case "PREREQUISITE_SERVICE_MISSING":
    case "PREREQUISITE_MISSING":
      return "SHOW_REQUIREMENT_MISSING_MODAL";
    default:
      return "";
  }
};

const handleDecisionActionDirective = async (options: {
  history: History;
  payload: ServiceEntryGatePayload;
  decision: ServiceEntryGateDecision;
  openDialog: ServiceEntryGateDialogOpener;
  currentSearch?: string | null;
}): Promise<boolean> => {
  switch (resolveDecisionDirective(options.decision)) {
    case "SHOW_LOCAL_AUTHORITY_MODAL": {
      await options.openDialog(buildLocalAuthorityDialog(options.decision));
      return true;
    }
    case "SHOW_REQUIREMENT_MISSING_MODAL": {
      await options.openDialog(
        buildRequirementMissingDialog(options.payload, options.decision),
      );
      return true;
    }
    case "SHOW_ADD_PERSONAL_PROFILE_MODAL": {
      const result = await options.openDialog(
        buildAddPersonalProfileRequiredDialog(),
      );
      await handleActionRouting({
        history: options.history,
        actionKey: result.actionKey,
        payload: options.payload,
        openDialog: options.openDialog,
        currentSearch: options.currentSearch,
      });
      return true;
    }
    case "SHOW_COMPLETE_PROFILE_MODAL": {
      const result = await options.openDialog(
        buildCompletePersonalProfileRequiredDialog(),
      );
      await handleActionRouting({
        history: options.history,
        actionKey: result.actionKey,
        payload: options.payload,
        openDialog: options.openDialog,
        currentSearch: options.currentSearch,
      });
      return true;
    }
    case "SHOW_EMIRATE_REQUIRED_MODAL": {
      const result = await options.openDialog(buildEmirateRequiredDialog());
      await handleActionRouting({
        history: options.history,
        actionKey: result.actionKey,
        payload: options.payload,
        openDialog: options.openDialog,
        currentSearch: options.currentSearch,
      });
      return true;
    }
    default:
      return false;
  }
};

const getProfileInventory = () => {
  const userState = useUserStore.getState();
  const currentProfileId = String(userState.currentProfileId || "");
  const individualProfileId = toStringValue(
    userState.userInfo.userInvitation?.userProfileId,
  );

  const personalProfile = individualProfileId
    ? {
        profileId: individualProfileId,
        userTypeId: toStringValue(
          userState.userInfo.userInvitation?.userTypeId,
        ),
        title:
          userState.userInfo.userInvitation?.name ||
          [userState.userInfo.firstName, userState.userInfo.lastName]
            .filter(Boolean)
            .join(" "),
      }
    : null;

  const establishments = (userState.userInfo.userEstablishments || []).map(
    (item) => ({
      profileId: String(item.userProfileId),
      userTypeId: toStringValue(item.userTypeId),
      userTypeCode: toStringValue(item.userTypeCode),
      profileStatus: toStringValue(item.profileStatus),
      nameEn: item.nameEn || null,
      nameAr: item.nameAr || null,
      title: item.nameEn || item.nameAr || `#${item.id}`,
      subtitle:
        item.nameAr && item.nameAr !== item.nameEn ? item.nameAr : undefined,
      avatarUrl: item.establishmentUrl || undefined,
    }),
  );

  return {
    currentProfileId,
    personalProfile,
    establishments,
  };
};

const resolveSwitchUserTypeId = (
  profileId?: string | number | null,
  userTypeId?: string | number | null,
  inventory = getProfileInventory(),
) => {
  const directUserTypeId = toNumericUserTypeId(userTypeId);

  if (directUserTypeId) {
    return directUserTypeId;
  }

  const normalizedProfileId = toStringValue(profileId)?.trim();

  if (!normalizedProfileId) {
    return "";
  }

  if (inventory.personalProfile?.profileId === normalizedProfileId) {
    return toNumericUserTypeId(inventory.personalProfile.userTypeId);
  }

  const establishmentProfile = inventory.establishments.find(
    (item) => item.profileId === normalizedProfileId,
  );

  return toNumericUserTypeId(establishmentProfile?.userTypeId);
};

const hasExplicitQualifyingProfiles = (payload: ServiceEntryGatePayload) =>
  Array.isArray(payload.uiHints?.qualifyingProfiles);

const hasNoEligibleEstablishmentProfileHint = (
  payload: ServiceEntryGatePayload,
) =>
  payload.uiHints?.hasQualifiedProfile === false ||
  (Array.isArray(payload.uiHints?.qualifyingProfiles) &&
    payload.uiHints.qualifyingProfiles.length === 0);

const resolveRequiredUserTypeCodes = (
  payload?: ServiceEntryGatePayload | null,
) => {
  return new Set(
    (payload?.uiHints?.requiredUserTypeCodes || [])
      .map((code) => toStringValue(code))
      .filter(Boolean) as string[],
  );
};

const resolveRequiredApplicantType = (payload: ServiceEntryGatePayload) => {
  return normalizeRequiredApplicantType(
    toStringValue(payload.decision?.requiredApplicantType) ||
      toStringValue(payload.uiHints?.applicantMode),
  );
};

const resolveApplicantProfileState = (
  payload: ServiceEntryGatePayload,
  requiredApplicantType: ServiceEntryGateRequiredApplicantType | null,
) => {
  const inventory = getProfileInventory();

  if (
    requiredApplicantType === "Individual" &&
    !inventory.personalProfile?.profileId
  ) {
    return "missing";
  }

  if (
    requiredApplicantType === "Establishment" &&
    !inventory.establishments.length
  ) {
    return "missing";
  }

  const explicitState = normalizeProfileState(
    toStringValue(payload.applicant?.profileState),
  );

  if (explicitState) {
    return explicitState;
  }

  if (requiredApplicantType === "Individual") {
    return inventory.personalProfile?.profileId ? "complete" : "missing";
  }
  if (requiredApplicantType === "Establishment") {
    return inventory.establishments.length ? "complete" : "missing";
  }
  return null;
};

const resolveRenewalTarget = (
  payload: ServiceEntryGatePayload,
  decision?: ServiceEntryGateDecision | null,
) => {
  const sourceDecision = decision || payload.decision;
  const payloadRecord = payload as Record<string, unknown>;
  const documentRecord = (payload.documentInfo || {}) as Record<
    string,
    unknown
  >;
  const decisionRecord = (sourceDecision || {}) as Record<string, unknown>;
  const targetServiceId =
    readNumber(decisionRecord, ["targetServiceId", "renewalServiceId"]) ||
    readNumber(documentRecord, ["renewalServiceId"]) ||
    readNumber(payloadRecord, ["renewalServiceId"]);

  if (!isValidPositiveInteger(targetServiceId)) {
    return null;
  }

  const targetServiceCode =
    readString(decisionRecord, ["targetServiceCode", "renewalServiceCode"]) ||
    readString(documentRecord, ["renewalServiceCode"]) ||
    readString(payloadRecord, ["renewalServiceCode"]);

  return {
    serviceId: targetServiceId,
    serviceCode: targetServiceCode,
  };
};

const resolveRenewalApplicationId = (payload: ServiceEntryGatePayload) => {
  const documentRecord = (payload.documentInfo || {}) as Record<
    string,
    unknown
  >;
  const payloadRecord = payload as Record<string, unknown>;

  const applicationIds = [
    readNumber(documentRecord, ["applicationId"]),
    readNumber(payloadRecord, ["applicationId", "applicationDetailId"]),
  ];

  return applicationIds.find(isValidPositiveInteger) ?? null;
};

const syncRenewalUpdateForm = (payload: ServiceEntryGatePayload) => {
  useUpdateFormStore.getState().setUpdateForm({
    applicationId: resolveRenewalApplicationId(payload),
    type: null,
  });
};

const createRenewalTargetPath = (
  payload: ServiceEntryGatePayload,
  decision?: ServiceEntryGateDecision | null,
  currentSearch?: string | null,
) => {
  const target = resolveRenewalTarget(payload, decision);
  if (!target) {
    return null;
  }

  return createMediaLicensePath(
    target.serviceId,
    target.serviceCode ?? null,
    currentSearch,
    MEDIA_LICENSE_RENEW_ACTION,
  );
};

export const switchServiceProfileIdentity = async (
  profileId?: string | number | null,
  userTypeId?: string | number | null,
) => {
  const targetProfileId = toStringValue(profileId)?.trim();

  if (!targetProfileId || isGlobalProfileId(targetProfileId)) {
    throw new Error("ChangeIdentity target profile must not be Global");
  }

  const targetUserTypeId = resolveSwitchUserTypeId(
    targetProfileId,
    userTypeId,
  );

  if (!targetUserTypeId) {
    throw new Error("ChangeIdentity userTypeID must be a positive numeric id");
  }

  const response = (await userChangeIdentity({
    userProFileID: targetProfileId,
    userTypeID: targetUserTypeId,
  })) as { data?: { token?: string } };
  const token = String(response.data?.token || "").trim();

  if (!token) {
    throw new Error("ChangeIdentity did not return a token");
  }

  completeIdentitySwitch({
    token,
    userProfileId: targetProfileId,
    userTypeId: targetUserTypeId,
  });
};

const performProfileSwitch = async (
  profileId: string,
  userTypeId: string,
  nextPath: string,
) => {
  await switchServiceProfileIdentity(profileId, userTypeId);
  window.location.assign(appendPersistentQueryToUrl(nextPath));
};

const showGenericErrorDialog = async (
  openDialog: ServiceEntryGateDialogOpener,
) => {
  await openDialog({
    kind: "message",
    tone: "warning",
    variant: "service-unavailable",
    title: t(
      "serviceEntryGate.serviceUnavailable.title",
      "Service Unavailable",
    ),
    description: t(
      "serviceEntryGate.serviceUnavailable.description",
      "This service is currently unavailable due to maintenance or temporary suspension.",
    ),
    actions: [DEFAULT_BACK_ACTION],
    dismissActionKey: "back",
  });
};

export const resolveServiceEntryGateProfileOptions = (
  payload?: ServiceEntryGatePayload | null,
  fallbackToAllEstablishments = false,
) => {
  if (!payload && !fallbackToAllEstablishments) {
    return [];
  }

  const inventory = getProfileInventory();
  const hintedProfiles = (payload?.uiHints?.qualifyingProfiles || [])
    .filter((item) => item.isEligible !== false)
    .map((item) => {
      const profileId = toStringValue(item.profileId)?.trim();
      const userTypeId = resolveSwitchUserTypeId(
        profileId,
        item.userTypeId,
        inventory,
      );

      if (
        !profileId ||
        profileId === "0" ||
        !userTypeId
      ) {
        return null;
      }

      const title =
        toStringValue(item.title)?.trim() ||
        toStringValue(item.nameEn)?.trim() ||
        toStringValue(item.nameAr)?.trim() ||
        t("serviceEntryGate.labels.profileNumber", `Profile #${profileId}`, {
          id: profileId,
        });

      return {
        profileId,
        userTypeId,
        userTypeCode: toStringValue(item.userTypeCode)?.trim() || null,
        title,
        subtitle: toStringValue(item.subtitle)?.trim() || null,
        avatarUrl: toStringValue(item.avatarUrl)?.trim() || null,
        isEligible: true,
        group:
          profileId === inventory.personalProfile?.profileId
            ? "individual"
            : "establishment",
      };
    })
    .filter(Boolean) as ServiceEntryGateProfileOption[];

  if (payload?.uiHints && Array.isArray(payload.uiHints.qualifyingProfiles)) {
    return hintedProfiles;
  }

  const requiredUserTypeCodes = resolveRequiredUserTypeCodes(payload);

  return inventory.establishments
    .filter(
      (item) =>
        item.profileStatus === "3" &&
        Boolean(item.userTypeId) &&
        (!requiredUserTypeCodes.size ||
          requiredUserTypeCodes.has(item.userTypeCode || "")),
    )
    .map((item) => ({
      profileId: item.profileId,
      userTypeId: item.userTypeId,
      title: item.title,
      subtitle: item.subtitle,
      avatarUrl: item.avatarUrl,
      isEligible: true,
      group: "establishment" as const,
    }));
};

const resolveLocalApprovedEstablishmentProfiles = (
  payload: ServiceEntryGatePayload,
  serviceCode?: string | null,
) => {
  const decision = payload.decision;

  if (!decision) {
    return [];
  }

  if (String(payload.serviceCode ?? serviceCode ?? "").trim() !== "1201") {
    return [];
  }

  if (resolveRequiredApplicantType(payload) !== "Establishment") {
    return [];
  }

  const qualifyingProfiles = payload.uiHints?.qualifyingProfiles;

  if (Array.isArray(qualifyingProfiles) && qualifyingProfiles.length > 0) {
    return [];
  }

  if (!hasNoEligibleEstablishmentProfileHint(payload)) {
    return [];
  }

  const normalizedDecisionCodes = [
    decision.promptCode,
    decision.reasonCode,
  ].map((value) =>
    String(value || "")
      .replace(/[\s_-]/g, "")
      .toLowerCase(),
  );
  const applicantTypeDecisionCodes = new Set([
    "applicanttypenotallowed",
    "addestablishmentprofile",
    "missingestablishmentcontext",
    "switchestablishmentprofile",
  ]);
  const hasProfileQualificationDenial =
    resolveDecisionDirective(decision) ===
      "SHOW_COMPLETE_PROFILE_MODAL" ||
    normalizedDecisionCodes.some((code) =>
      applicantTypeDecisionCodes.has(code),
    );

  if (!hasProfileQualificationDenial) {
    return [];
  }

  const inventory = getProfileInventory();
  const currentEstablishment = inventory.establishments.find(
    (profile) => profile.profileId === inventory.currentProfileId,
  );

  if (currentEstablishment?.profileStatus !== "5") {
    return [];
  }

  const requiredUserTypeCodes = resolveRequiredUserTypeCodes(payload);

  if (!requiredUserTypeCodes.size) {
    return [];
  }

  return inventory.establishments
    .filter(
      (profile) =>
        profile.profileStatus === "3" &&
        Boolean(profile.userTypeId) &&
        Boolean(profile.userTypeCode) &&
        requiredUserTypeCodes.has(profile.userTypeCode || ""),
    )
    .map((profile) => ({
      profileId: profile.profileId,
      userTypeId: profile.userTypeId,
      userTypeCode: profile.userTypeCode,
      title: profile.title,
      subtitle: profile.subtitle,
      avatarUrl: profile.avatarUrl,
      isEligible: true,
    }));
};

const resolveEligibleQualifyingProfileOptions = (
  payload: ServiceEntryGatePayload,
) => {
  const qualifyingProfiles = payload.uiHints?.qualifyingProfiles;

  if (!Array.isArray(qualifyingProfiles)) {
    return [];
  }

  return resolveServiceEntryGateProfileOptions(
    {
      ...payload,
      uiHints: {
        ...payload.uiHints,
        qualifyingProfiles: qualifyingProfiles.filter(
          (profile) => profile.isEligible !== false,
        ),
      },
    },
    false,
  );
};

const resolveTargetSwitchProfile = (payload: ServiceEntryGatePayload) => {
  const payloadRecord = payload as Record<string, unknown>;
  const decisionRecord = (payload.decision || {}) as Record<string, unknown>;
  const targetProfileId =
    readString(decisionRecord, ["targetProfileId"]) ||
    readString(payloadRecord, ["targetProfileId"]);
  const targetUserTypeId =
    readString(decisionRecord, ["targetUserTypeId"]) ||
    readString(payloadRecord, ["targetUserTypeId"]);

  if (!targetProfileId) {
    return null;
  }

  const hintedProfile = resolveServiceEntryGateProfileOptions(
    payload,
    true,
  ).find((profile) => profile.profileId === targetProfileId);

  return {
    profileId: targetProfileId,
    userTypeId: targetUserTypeId || hintedProfile?.userTypeId || null,
  };
};

const buildApplicantTypeDialog = (
  payload: ServiceEntryGatePayload,
): {
  dialog: ServiceEntryGateDialogConfig;
  profiles?: ServiceEntryGateProfileOption[];
} => {
  const inventory = getProfileInventory();
  const payloadRecord = payload as Record<string, unknown>;
  const fallbackVariant = String(
    payload.uiHints?.variant || payloadRecord.uiVariant || "",
  );
  const applicantMode = String(
    payload.uiHints?.applicantMode || "",
  ).toLowerCase();
  const requiredApplicantType = resolveRequiredApplicantType(payload);
  const profileState = resolveApplicantProfileState(
    payload,
    requiredApplicantType,
  );
  const explicitQualifyingProfiles = hasExplicitQualifyingProfiles(payload);
  const qualifyingProfiles = resolveServiceEntryGateProfileOptions(
    payload,
    false,
  );
  const eligibleQualifyingProfiles =
    resolveEligibleQualifyingProfileOptions(payload);
  const shouldSwitchToQualifiedProfile =
    payload.decision?.finalAction === "Block" &&
    payload.decision.allowed === false &&
    normalizeDecisionCode(payload.decision.reasonCode) ===
      "applicanttypenotallowed" &&
    (requiredApplicantType === null || requiredApplicantType === "Either") &&
    payload.uiHints?.hasQualifiedProfile === true &&
    eligibleQualifyingProfiles.length > 0;
  const hasEstablishmentTypeHints = Boolean(
    payload.uiHints?.establishmentTypes?.length,
  );
  const isNoEligibleEstablishmentProfileBlock =
    payload.decision?.finalAction === "Block" &&
    requiredApplicantType === "Establishment" &&
    hasNoEligibleEstablishmentProfileHint(payload);
  const currentIsPersonal =
    inventory.personalProfile?.profileId === inventory.currentProfileId;
  let uiVariant = fallbackVariant;

  if (uiVariant !== "service-unavailable") {
    if (requiredApplicantType === "Individual") {
      if (profileState === "missing") {
        uiVariant = "add-personal";
      } else if (profileState === "incomplete") {
        uiVariant = "complete-personal";
      } else if (!currentIsPersonal) {
        uiVariant = "switch-to-personal";
      }
    } else if (requiredApplicantType === "Establishment") {
      if (isNoEligibleEstablishmentProfileBlock) {
        uiVariant = "add-establishment-no-eligible-profile";
      } else if (profileState === "missing") {
        uiVariant =
          hasEstablishmentTypeHints || explicitQualifyingProfiles
            ? "add-establishment-qualified-types"
            : "add-establishment-basic";
      } else if (explicitQualifyingProfiles && !qualifyingProfiles.length) {
        uiVariant = "add-establishment-qualified-types";
      } else if (!currentIsPersonal) {
        uiVariant = explicitQualifyingProfiles
          ? "switch-establishment-qualified-types"
          : "switch-to-establishment";
      } else {
        uiVariant = explicitQualifyingProfiles
          ? "switch-to-required-establishment"
          : "switch-to-establishment";
      }
    } else if (
      requiredApplicantType === "Either" &&
      !inventory.personalProfile?.profileId &&
      !inventory.establishments.length &&
      !shouldSwitchToQualifiedProfile
    ) {
      uiVariant = "complete-profile-verification-dual-cta";
    }
  }

  if (uiVariant === "complete-profile-verification-dual-cta") {
    const hasPersonalProfile = Boolean(inventory.personalProfile?.profileId);
    const primaryActionLabel = hasPersonalProfile
      ? t("serviceEntryGate.actions.completeProfile", "Complete Profile")
      : t(
          "serviceEntryGate.actions.addPersonalProfile",
          "Add Personal Profile",
        );
    return {
      dialog: {
        kind: "message",
        tone: "warning",
        variant: uiVariant,
        title: t(
          "serviceEntryGate.completeProfileVerification.title",
          "Complete Profile Verification",
        ),
        description: t(
          "serviceEntryGate.completeProfileVerification.description",
          "You don't have a verified Personal or Establishment Profile. Add one to apply for this service.",
        ),
        actions: [
          {
            key: hasPersonalProfile ? "complete-personal" : "add-personal",
            label: primaryActionLabel,
            variant: "primary",
          },
          {
            key: "add-establishment",
            label: t(
              "serviceEntryGate.actions.addEstablishmentProfile",
              "Add Entity/Establishment",
            ),
            variant: "primary",
          },
        ],
        dismissActionKey: "close",
      },
    };
  }

  if (uiVariant === "add-personal") {
    return {
      dialog: {
        kind: "message",
        tone: "warning",
        variant: uiVariant,
        title: t("serviceEntryGate.addPersonal.title", "Add Personal Profile"),
        description: t(
          "serviceEntryGate.addPersonal.description",
          "You don't have a Personal Profile. Add one to apply for individual services.",
        ),
        actions: [
          {
            key: "add-personal",
            label: t("serviceEntryGate.actions.addNow", "Add Now"),
            variant: "primary",
          },
        ],
        dismissActionKey: "close",
      },
    };
  }

  if (uiVariant === "complete-personal") {
    return {
      dialog: {
        kind: "message",
        tone: "warning",
        variant: uiVariant,
        title: t(
          "serviceEntryGate.completePersonal.title",
          "Complete Your Profile",
        ),
        description: t(
          "serviceEntryGate.completePersonal.description",
          "Complete your Personal Profile to apply for this service.",
        ),
        actions: [
          {
            key: "complete-personal",
            label: t("serviceEntryGate.actions.completeNow", "Complete Now"),
            variant: "primary",
          },
        ],
        dismissActionKey: "close",
      },
    };
  }

  if (uiVariant === "add-establishment-no-eligible-profile") {
    return {
      dialog: {
        kind: "message",
        tone: "warning",
        variant: uiVariant,
        title: t(
          "serviceEntryGate.addEstablishment.title",
          "Add Establishment Profile",
        ),
        description: t(
          "serviceEntryGate.eligibleEstablishment.description",
          "Your account does not have an eligible establishment profile for this service. Please add a relevant profile with the relevant establishment sub-type before applying.",
        ),
        actions: [
          {
            key: "add-establishment",
            label: t("serviceEntryGate.actions.addNow", "Add Now"),
            variant: "primary",
          },
        ],
        dismissActionKey: "close",
        width: 720,
      },
    };
  }

  if (uiVariant === "add-establishment-basic") {
    return {
      dialog: {
        kind: "message",
        tone: "warning",
        variant: uiVariant,
        title: t(
          "serviceEntryGate.addEstablishment.title",
          "Add Establishment Profile",
        ),
        description: t(
          "serviceEntryGate.addEstablishment.description",
          "You don't have an Establishment Profile. Add one to apply for establishment services.",
        ),
        actions: [
          {
            key: "add-establishment",
            label: t("serviceEntryGate.actions.addNow", "Add Now"),
            variant: "primary",
          },
        ],
        dismissActionKey: "close",
      },
    };
  }

  if (
    uiVariant === "add-establishment-qualified-types" ||
    uiVariant === "service-unavailable"
  ) {
    return {
      dialog: {
        kind: "message",
        tone: "warning",
        variant: uiVariant,
        title:
          uiVariant === "service-unavailable"
            ? t(
                "serviceEntryGate.serviceUnavailable.title",
                "Service Unavailable",
              )
            : t(
                "serviceEntryGate.addEstablishment.title",
                "Add Establishment Profile",
              ),
        description:
          uiVariant === "service-unavailable"
            ? t(
                "serviceEntryGate.serviceUnavailable.description",
                "This service is currently unavailable due to maintenance or temporary suspension.",
              )
            : t(
                "serviceEntryGate.requiredEstablishment.description",
                "This service is only available for the following establishment types. Please add one to apply.",
              ),
        bulletItems:
          uiVariant === "service-unavailable"
            ? undefined
            : payload.uiHints?.establishmentTypes?.map(String) || undefined,
        actions:
          uiVariant === "service-unavailable"
            ? [DEFAULT_BACK_ACTION]
            : [
                {
                  key: "add-establishment",
                  label: t("serviceEntryGate.actions.addNow", "Add Now"),
                  variant: "primary",
                },
              ],
        dismissActionKey:
          uiVariant === "service-unavailable" ? "back" : "close",
      },
    };
  }

  if (uiVariant === "switch-to-personal") {
    return {
      dialog: {
        kind: "message",
        tone: "warning",
        variant: uiVariant,
        title: t(
          "serviceEntryGate.switchToPersonal.title",
          "Switch to Personal Profile",
        ),
        description: t(
          "serviceEntryGate.switchToPersonal.description",
          "This service is for individual applicants only. Switch to your Personal Profile to continue.",
        ),
        actions: [
          {
            key: "switch-personal",
            label: t("serviceEntryGate.actions.switchNow", "Switch Now"),
            variant: "primary",
          },
        ],
        dismissActionKey: "close",
      },
    };
  }

  if (
    uiVariant === "switch-to-establishment" ||
    uiVariant === "switch-establishment-qualified-types" ||
    uiVariant === "switch-to-required-establishment"
  ) {
    const profiles = resolveServiceEntryGateProfileOptions(payload, true);
    const isQualifiedEstablishmentVariant =
      uiVariant === "switch-establishment-qualified-types" ||
      uiVariant === "switch-to-required-establishment";
    return {
      dialog: {
        kind: "profile-list",
        tone: "warning",
        variant: uiVariant,
        title: isQualifiedEstablishmentVariant
          ? t(
              "serviceEntryGate.switchEstablishment.title",
              "Switch Establishment Profile",
            )
          : t(
              "serviceEntryGate.switchToEstablishment.title",
              "Switch to Establishment Profile",
            ),
        description: isQualifiedEstablishmentVariant
          ? t(
              "serviceEntryGate.switchEstablishment.description",
              "This service is only available for the following establishment types. Please switch to a qualifying establishment to continue.",
            )
          : t(
              "serviceEntryGate.switchToEstablishment.description",
              "This service is for establishments only. Switch to your Establishment Profile to continue.",
            ),
        profiles,
        selectedProfileId: null,
        actions: [
          {
            key: "add-establishment",
            label: t(
              "serviceEntryGate.actions.addEstablishmentProfile",
              "Add Entity/Establishment",
            ),
            variant: "outline",
          },
          {
            key: "switch-establishment",
            label: t("serviceEntryGate.actions.switchNow", "Switch Now"),
            variant: "primary",
          },
        ],
        dismissActionKey: "close",
      },
      profiles,
    };
  }

  if (applicantMode === "individual") {
    if (!inventory.personalProfile?.profileId) {
      return buildApplicantTypeDialog({
        ...payload,
        uiHints: { ...payload.uiHints, variant: "add-personal" },
      });
    }

    if (!currentIsPersonal) {
      return buildApplicantTypeDialog({
        ...payload,
        uiHints: { ...payload.uiHints, variant: "switch-to-personal" },
      });
    }
  }

  if (applicantMode === "establishment") {
    if (!inventory.establishments.length) {
      return buildApplicantTypeDialog({
        ...payload,
        uiHints: { ...payload.uiHints, variant: "add-establishment-basic" },
      });
    }

    return buildApplicantTypeDialog({
      ...payload,
      uiHints: {
        ...payload.uiHints,
        variant: explicitQualifyingProfiles
          ? "switch-to-required-establishment"
          : "switch-to-establishment",
      },
    });
  }

  if (shouldSwitchToQualifiedProfile) {
    return {
      dialog: {
        kind: "profile-list",
        tone: "warning",
        variant: "switch-to-qualified-profile",
        title: t(
          "serviceEntryGate.profileSelection.title",
          "Select profile for this application",
        ),
        description: t(
          "serviceEntryGate.profileSelection.description",
          "This application will be tied to the profile you select - pick personal or one of your registered establishments.",
        ),
        profiles: qualifyingProfiles,
        selectedProfileId: null,
        actions: [
          {
            key: "switch-establishment",
            label: t("serviceEntryGate.actions.switchNow", "Switch Now"),
            variant: "primary",
          },
        ],
        dismissActionKey: "close",
      },
      profiles: qualifyingProfiles,
    };
  }

  return {
    dialog: {
      kind: "message",
      tone: "warning",
      variant: "service-unavailable",
      title: t(
        "serviceEntryGate.serviceUnavailable.title",
        "Service Unavailable",
      ),
      description: t(
        "serviceEntryGate.serviceUnavailable.description",
        "This service is currently unavailable due to maintenance or temporary suspension.",
      ),
      actions: [DEFAULT_BACK_ACTION],
      dismissActionKey: "back",
    },
  };
};

const openRedirectRenewalDialog = async (
  openDialog: ServiceEntryGateDialogOpener,
) => {
  return openDialog({
    kind: "message",
    tone: "warning",
    variant: "redirect-renewal",
    title: t(
      "serviceEntryGate.redirectRenewal.title",
      "Continue to Renewal Service?",
    ),
    description: t(
      "serviceEntryGate.redirectRenewal.description",
      "This request must continue through the renewal service. Continue to open the correct renewal flow.",
    ),
    actions: [
      DEFAULT_BACK_ACTION,
      {
        key: "continue",
        label: t("serviceEntryGate.actions.continue", "Continue"),
        variant: "primary",
      },
    ],
    dismissActionKey: "back",
  });
};

const handleActionRouting = async (options: {
  history: History;
  actionKey: string;
  payload: ServiceEntryGatePayload;
  openDialog: ServiceEntryGateDialogOpener;
  profiles?: ServiceEntryGateProfileOption[];
  selectedProfileId?: string | null;
  currentSearch?: string | null;
}) => {
  const profileSwitchSearchParams = new URLSearchParams(
    options.currentSearch || "",
  );
  profileSwitchSearchParams.set(SERVICE_ENTRY_GATE_QUERY_KEY, "1");
  const nextPath = createMediaLicensePath(
    options.payload.serviceId,
    options.payload.serviceCode ?? null,
    `?${profileSwitchSearchParams.toString()}`,
  );
  const renewalTargetPath = createRenewalTargetPath(options.payload);

  switch (options.actionKey) {
    case "add-personal":
      options.history.push("/my-account/personal-profile?mode=add");
      return;
    case "complete-personal":
      options.history.push("/my-account/personal-profile?mode=edit");
      return;
    case "add-establishment":
      options.history.push("/my-account/establishment-profile?mode=add");
      return;
    case "view-details":
      options.history.push(
        resolveDetailRoute(options.payload, options.payload.documentInfo),
      );
      return;
    case "renew-now":
    case "pay-renew":
      if (!renewalTargetPath) {
        await showGenericErrorDialog(options.openDialog);
        return;
      }
      options.history.push(renewalTargetPath);
      return;
    case "switch-personal": {
      const inventory = getProfileInventory();
      const targetProfile = resolveTargetSwitchProfile(options.payload);
      const profileId =
        targetProfile?.profileId || inventory.personalProfile?.profileId;
      const userTypeId =
        targetProfile?.userTypeId || inventory.personalProfile?.userTypeId;

      if (!profileId || !userTypeId) {
        CustomMessage.error(
          t("serviceEntryGate.serviceUnavailable.title", "Service Unavailable"),
        );
        return;
      }
      await performProfileSwitch(profileId, userTypeId, nextPath);
      return;
    }
    case "switch-establishment": {
      const selectedProfile = options.profiles?.find(
        (profile) => profile.profileId === options.selectedProfileId,
      );
      if (
        !selectedProfile?.userTypeId ||
        !selectedProfile.profileId ||
        selectedProfile.isEligible === false
      ) {
        CustomMessage.error(
          t("serviceEntryGate.serviceUnavailable.title", "Service Unavailable"),
        );
        return;
      }
      await performProfileSwitch(
        selectedProfile.profileId,
        selectedProfile.userTypeId,
        nextPath,
      );
      return;
    }
    default:
      return;
  }
};

const handleLocalApprovedEstablishmentOverride = async (options: {
  history: History;
  payload: ServiceEntryGatePayload;
  serviceCode?: string | null;
  openDialog: ServiceEntryGateDialogOpener;
  currentSearch?: string | null;
}) => {
  const localProfiles = resolveLocalApprovedEstablishmentProfiles(
    options.payload,
    options.serviceCode,
  );

  if (!localProfiles.length) {
    return false;
  }

  const overridePayload: ServiceEntryGatePayload = {
    ...options.payload,
    decision: {
      ...options.payload.decision,
      finalAction: options.payload.decision?.finalAction || "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: "SWITCH_ESTABLISHMENT_PROFILE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      ...options.payload.uiHints,
      variant: "switch-establishment-qualified-types",
      hasQualifiedProfile: true,
      qualifyingProfiles: localProfiles,
    },
  };
  const { dialog, profiles } = buildApplicantTypeDialog(overridePayload);
  const result = await options.openDialog(dialog);

  await handleActionRouting({
    history: options.history,
    actionKey: result.actionKey,
    payload: overridePayload,
    openDialog: options.openDialog,
    profiles,
    selectedProfileId: result.selectedProfileId,
    currentSearch: options.currentSearch,
  });

  return true;
};

const normalizeDecisionCode = (value?: string | null) =>
  String(value || "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();

const isExpiredPenaltyVariant = (value?: string | null) => {
  const normalizedVariant = normalizeDecisionCode(value);
  return (
    normalizedVariant === "penalty" || normalizedVariant === "expiredpenalty"
  );
};

const isExpiredGraceVariant = (value?: string | null) => {
  const normalizedVariant = normalizeDecisionCode(value);
  return normalizedVariant === "grace" || normalizedVariant === "expiredgrace";
};

const isApplicantProfilePrompt = (decision: ServiceEntryGateDecision) => {
  const promptCode = normalizeDecisionCode(decision.promptCode);
  const reasonCode = normalizeDecisionCode(decision.reasonCode);
  const applicantProfileCodes = new Set([
    "addestablishmentprofile",
    "applicanttypenotallowed",
    "missingestablishmentcontext",
    "switchestablishmentprofile",
  ]);

  return (
    applicantProfileCodes.has(promptCode) ||
    applicantProfileCodes.has(reasonCode)
  );
};

const isExpiredPenaltyDocument = (payload: ServiceEntryGatePayload) => {
  const documentInfo = payload.documentInfo;
  if (!documentInfo) {
    return false;
  }

  const expiredState = normalizeExpiredState(
    toStringValue(documentInfo.expiredState),
  );

  return (
    expiredState === "penalty" ||
    documentInfo.penaltyRequired === true ||
    documentInfo.penaltyApplies === true ||
    isExpiredPenaltyVariant(payload.uiHints?.variant)
  );
};

const resolveEffectiveDecision = (payload: ServiceEntryGatePayload) => {
  const decision = payload.decision as ServiceEntryGateDecision;
  const documentApplicationId = toNumber(payload.documentInfo?.applicationId);
  const inProgressApplicationId = toNumber(
    payload.inProgressInfo?.applicationId,
  );

  if (
    decision.finalAction !== "Block" ||
    decision.promptCode !== "IN_PROGRESS_APPLICATION" ||
    !isExpiredPenaltyDocument(payload) ||
    !isValidPositiveInteger(documentApplicationId) ||
    documentApplicationId !== inProgressApplicationId
  ) {
    return decision;
  }

  const renewalResult = payload.results?.find(
    (result) =>
      result.rule === "C2" &&
      result.action === "RedirectRenewal" &&
      isValidPositiveInteger(toNumber(result.targetServiceId)),
  );

  if (!renewalResult) {
    return decision;
  }

  return {
    ...decision,
    finalAction: "RedirectRenewal",
    action: renewalResult.action,
    reasonCode: renewalResult.reasonCode,
    promptCode: renewalResult.promptCode,
    targetServiceId: renewalResult.targetServiceId,
    targetServiceCode: renewalResult.targetServiceCode,
  } satisfies ServiceEntryGateDecision;
};

const buildExpiredPenaltyDialog = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
  renewalTargetPath?: string | null,
) => {
  const hasRenewalTarget = Boolean(renewalTargetPath);
  const canStartRenewal =
    hasRenewalTarget && resolveRenewalApplicationId(payload) !== null;
  const identifier = resolveDocumentIdentifier(
    payload,
    decision.promptCode as ServiceEntryGatePromptCode | undefined,
  );
  const expiryDateLabel = payload.documentInfo?.expiryDate
    ? formatDate(payload.documentInfo.expiryDate)
    : "[Expiry Date]";

  return {
    kind: "license-status",
    tone: "danger",
    variant: "expired-penalty",
    width: 720,
    title: t(
      "serviceEntryGate.expiredPenalty.title",
      "Your License Has Expired",
    ),
    description: t(
      "serviceEntryGate.expiredPenalty.description",
      "You already hold this license. It expired on {{expiryDate}}. The 30-day grace period has passed, and penalties apply.",
      {
        expiryDate: expiryDateLabel,
      },
    ),
    identifierLabel: identifier.label,
    identifierValue: identifier.value,
    helperText: hasRenewalTarget
      ? undefined
      : t(
          "serviceEntryGate.redirectRenewal.missingTarget",
          "Renewal is currently unavailable because the renewal target was not provided.",
        ),
    actions: canStartRenewal
      ? [
          DEFAULT_BACK_ACTION,
          {
            key: "pay-renew",
            label: t("serviceEntryGate.actions.payAndRenew", "Pay & Renew"),
            variant: "primary",
          },
        ]
      : [DEFAULT_BACK_ACTION],
    dismissActionKey: "back",
  } satisfies ServiceEntryGateDialogConfig;
};

const isExpiredGraceDocument = (payload: ServiceEntryGatePayload) => {
  if (isExpiredPenaltyDocument(payload)) {
    return false;
  }

  const documentInfo = payload.documentInfo;
  if (!documentInfo) {
    return false;
  }

  const expiredState = normalizeExpiredState(
    toStringValue(documentInfo.expiredState),
  );

  return (
    expiredState === "grace" || isExpiredGraceVariant(payload.uiHints?.variant)
  );
};

const buildExpiredGraceDialog = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
  renewalTargetPath?: string | null,
) => {
  const identifier = resolveDocumentIdentifier(
    payload,
    decision.promptCode as ServiceEntryGatePromptCode | undefined,
  );
  const documentInfo = payload.documentInfo;
  const expiryDateLabel = documentInfo?.expiryDate
    ? formatDate(documentInfo.expiryDate)
    : "[Expiry Date]";
  const graceDays = documentInfo?.graceDays ?? documentInfo?.remainingGraceDays;
  const graceDaysLabel =
    graceDays !== undefined && graceDays !== null
      ? t("serviceEntryGate.values.graceDays", "{{count}} days", {
          count: graceDays,
        })
      : "[X] days";

  return {
    kind: "license-status",
    tone: "danger",
    variant: "expired-grace",
    width: 720,
    title: t("serviceEntryGate.expiredGrace.title", "Your License Has Expired"),
    description: t(
      "serviceEntryGate.expiredGrace.description",
      "You already hold this license. It expired on {{expiryDate}}. You have {{graceDays}} remaining to renew without penalties.",
      {
        expiryDate: expiryDateLabel,
        graceDays: graceDaysLabel,
      },
    ),
    identifierLabel: identifier.label,
    identifierValue: identifier.value,
    helperText: renewalTargetPath
      ? undefined
      : t(
          "serviceEntryGate.redirectRenewal.missingTarget",
          "Renewal is currently unavailable because the renewal target was not provided.",
        ),
    actions: renewalTargetPath
      ? [
          DEFAULT_BACK_ACTION,
          {
            key: "renew-now",
            label: t("serviceEntryGate.actions.renewNow", "Renew Now"),
            variant: "primary",
          },
        ]
      : [DEFAULT_BACK_ACTION],
    dismissActionKey: "back",
  } satisfies ServiceEntryGateDialogConfig;
};

const isIncompleteEstablishmentProfileGate = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
) => {
  const requiredApplicantType = normalizeRequiredApplicantType(
    toStringValue(decision.requiredApplicantType) ||
      toStringValue(payload.decision?.requiredApplicantType) ||
      toStringValue(payload.uiHints?.applicantMode),
  );
  const normalizedVariant = normalizeDecisionCode(payload.uiHints?.variant);
  return (
    requiredApplicantType === "Establishment" &&
    normalizedVariant === "incompleteestablishmentprofile"
  );
};

const isSwitchableIncompleteEstablishmentProfileBlock = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
) => {
  const qualifyingProfiles = resolveServiceEntryGateProfileOptions(
    payload,
    false,
  );

  return (
    isIncompleteEstablishmentProfileGate(payload, decision) &&
    payload.uiHints?.hasQualifiedProfile !== false &&
    qualifyingProfiles.length > 0
  );
};

const isIncompleteEstablishmentProfileBlock = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
) => {
  return (
    isIncompleteEstablishmentProfileGate(payload, decision) &&
    !isSwitchableIncompleteEstablishmentProfileBlock(payload, decision)
  );
};

const isProfileUnderVerificationBlock = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
) => {
  const normalizedReasonCode = normalizeDecisionCode(decision.reasonCode);
  const normalizedVariant = normalizeDecisionCode(payload.uiHints?.variant);
  const hasResolvedProfile =
    payload.applicant?.hasProfile === true ||
    Boolean(toNumber(payload.applicant?.profileId));
  const underVerificationCodes = new Set([
    "profileunderverification",
    "profilependingapproval",
    "profilependingverification",
    "profileapprovalpending",
    "profileunderreview",
    "profilenotapproved",
  ]);

  if (
    underVerificationCodes.has(normalizedReasonCode) ||
    underVerificationCodes.has(normalizedVariant)
  ) {
    return true;
  }

  if (isIncompleteEstablishmentProfileGate(payload, decision)) {
    return false;
  }

  if (
    normalizedReasonCode === "profileverificationrequired" &&
    hasResolvedProfile
  ) {
    return true;
  }

  const profileState = normalizeProfileState(
    toStringValue(payload.applicant?.profileState),
  );
  return hasResolvedProfile && profileState === "complete";
};

const buildCompleteProfileVerificationDialog = (
  payload: ServiceEntryGatePayload,
  decision: ServiceEntryGateDecision,
) => {
  if (isProfileUnderVerificationBlock(payload, decision)) {
    return {
      kind: "message",
      tone: "warning",
      variant: "complete-profile-verification-under-review",
      title: t(
        "serviceEntryGate.completeProfileVerification.title",
        "Complete Profile Verification",
      ),
      description: t(
        "serviceEntryGate.completeProfileVerification.underVerificationDescription",
        "Your profile is currently under verification. You can apply for this service once your profile has been verified.",
      ),
      actions: [DEFAULT_OK_ACTION],
      dismissActionKey: "ok",
    } satisfies ServiceEntryGateDialogConfig;
  }

  if (isSwitchableIncompleteEstablishmentProfileBlock(payload, decision)) {
    return {
      kind: "profile-list",
      tone: "warning",
      variant: "switch-to-required-establishment",
      title: t(
        "serviceEntryGate.switchEstablishment.title",
        "Switch Establishment Profile",
      ),
      description: t(
        "serviceEntryGate.switchToEstablishment.description",
        "This service is for establishments only. Switch to your Establishment Profile to continue.",
      ),
      profiles: resolveServiceEntryGateProfileOptions(payload, false),
      selectedProfileId: null,
      actions: [
        {
          key: "add-establishment",
          label: t(
            "serviceEntryGate.actions.addEstablishmentProfile",
            "Add Entity/Establishment",
          ),
          variant: "outline",
        },
        {
          key: "switch-establishment",
          label: t("serviceEntryGate.actions.switchNow", "Switch Now"),
          variant: "primary",
        },
      ],
      dismissActionKey: "close",
    } satisfies ServiceEntryGateDialogConfig;
  }

  if (isIncompleteEstablishmentProfileBlock(payload, decision)) {
    return {
      kind: "message",
      tone: "warning",
      variant: "add-establishment-basic",
      title: t(
        "serviceEntryGate.addEstablishment.title",
        "Add Establishment Profile",
      ),
      description: t(
        "serviceEntryGate.addEstablishment.description",
        "You don't have an Establishment Profile. Add one to apply for establishment services.",
      ),
      actions: [
        {
          key: "add-establishment",
          label: t("serviceEntryGate.actions.addNow", "Add Now"),
          variant: "primary",
        },
      ],
      dismissActionKey: "close",
    } satisfies ServiceEntryGateDialogConfig;
  }

  const inventory = getProfileInventory();
  const hasPersonalProfile = Boolean(inventory.personalProfile?.profileId);
  const primaryActionLabel = hasPersonalProfile
    ? t("serviceEntryGate.actions.completeProfile", "Complete Profile")
    : t("serviceEntryGate.actions.addPersonalProfile", "Add Personal Profile");

  return {
    kind: "message",
    tone: "warning",
    variant: hasPersonalProfile
      ? "complete-profile-verification-complete-profile"
      : "complete-profile-verification-add-profile",
    title: t(
      "serviceEntryGate.completeProfileVerification.title",
      "Complete Profile Verification",
    ),
    description: t(
      "serviceEntryGate.completeProfileVerification.description",
      "You don't have a verified Personal or Establishment Profile. Add one to apply for this service.",
    ),
    actions: [
      {
        key: hasPersonalProfile ? "complete-personal" : "add-personal",
        label: primaryActionLabel,
        variant: "primary",
      },
      {
        key: "add-establishment",
        label: t(
          "serviceEntryGate.actions.addEstablishmentProfile",
          "Add Entity/Establishment",
        ),
        variant: "primary",
      },
    ],
    dismissActionKey: "close",
  } satisfies ServiceEntryGateDialogConfig;
};

const handleBlockedDecision = async (options: {
  history: History;
  payload: ServiceEntryGatePayload;
  decision: ServiceEntryGateDecision;
  openDialog: ServiceEntryGateDialogOpener;
  currentSearch?: string | null;
  source?: string;
  replace?: boolean;
}) => {
  const { history, payload, decision, openDialog } = options;
  const currentSearch = options.currentSearch ?? history.location.search;
  const promptCode = resolveBlockedPromptCode(payload, decision);
  const documentInfo = payload.documentInfo;
  const detailRoute = resolveDetailRoute(payload, documentInfo);
  const handleExpiredPenaltyRenewal = async () => {
    const target = resolveRenewalTarget(payload, decision);
    const result = await openDialog(
      buildExpiredPenaltyDialog(
        payload,
        decision,
        createRenewalTargetPath(payload, decision, currentSearch),
      ),
    );
    if (
      result.actionKey !== "pay-renew" ||
      !target ||
      resolveRenewalApplicationId(payload) === null
    ) {
      return;
    }

    syncRenewalUpdateForm(payload);
    navigateAllow({
      history,
      payload: {
        ...payload,
        serviceId: target.serviceId,
        serviceCode: target.serviceCode ?? null,
      },
      serviceName: null,
      source: options.source,
      replace: options.replace,
      currentSearch,
      mediaLicenseAction: MEDIA_LICENSE_RENEW_ACTION,
    });
  };

  if (promptCode === "IN_PROGRESS_APPLICATION") {
    const inProgressApplicationId = payload.inProgressInfo?.applicationId;
    const inProgressDetailRoute =
      inProgressApplicationId !== undefined && inProgressApplicationId !== null
        ? `/my-requests/detail?id=${inProgressApplicationId}`
        : null;
    const actions: ServiceEntryGateDialogAction[] = [DEFAULT_BACK_ACTION];

    if (inProgressDetailRoute) {
      actions.push({
        key: "view-details",
        label: t("serviceEntryGate.actions.viewDetails", "View Details"),
        variant: "primary",
      });
    }

    const result = await openDialog({
      kind: "license-status",
      tone: "danger",
      variant: "existing-application",
      title: t(
        "serviceEntryGate.existingApplication.title",
        "Existing Application Found",
      ),
      description: t(
        "serviceEntryGate.existingApplication.description",
        "An application for this service is already in progress. You cannot submit another application at this time.",
      ),
      identifierLabel: t(
        "serviceEntryGate.labels.applicationNumber",
        "Application Number",
      ),
      identifierValue: payload.inProgressInfo?.applicationNumber ?? null,
      actions,
      dismissActionKey: "back",
    });
    if (result.actionKey === "view-details" && inProgressDetailRoute) {
      history.push(inProgressDetailRoute);
    }
    return false;
  }

  if (
    promptCode === "EXISTING_VALID_DOCUMENT" &&
    isExpiredPenaltyDocument(payload)
  ) {
    await handleExpiredPenaltyRenewal();
    return false;
  }

  if (promptCode === "EXISTING_VALID_DOCUMENT") {
    const identifier = resolveDocumentIdentifier(payload, promptCode);
    const issueDateLabel = documentInfo?.issueDate
      ? formatDate(documentInfo.issueDate)
      : "[Issue Date]";
    const result = await openDialog({
      kind: "license-status",
      tone: "danger",
      variant: "existing-license",
      title: t(
        "serviceEntryGate.existingLicense.title",
        "Your License Already Exists",
      ),
      description: t(
        "serviceEntryGate.existingLicense.description",
        "You already hold this license, issued on {{issueDate}}. Please avoid duplicate applications.",
        {
          issueDate: issueDateLabel,
        },
      ),
      identifierLabel: identifier.label,
      identifierValue: identifier.value,
      actions: [
        DEFAULT_BACK_ACTION,
        {
          key: "view-details",
          label: t("serviceEntryGate.actions.viewDetails", "View Details"),
          variant: "primary",
        },
      ],
      dismissActionKey: "back",
    });
    if (result.actionKey === "view-details") {
      history.push(detailRoute);
    } else {
      history.replace("/services");
    }
    return false;
  }

  if (promptCode === "SUSPENDED_DOCUMENT_EXISTS") {
    const identifier = resolveDocumentIdentifier(payload, promptCode);
    const result = await openDialog({
      kind: "license-status",
      tone: "danger",
      variant: "suspended",
      title: t("serviceEntryGate.suspended.title", "License Suspended"),
      description: t(
        "serviceEntryGate.suspended.description",
        "Your license under the current profile has been suspended. You may switch to another profile to apply for this service.",
      ),
      identifierLabel: identifier.label,
      identifierValue: identifier.value,
      actions: [
        DEFAULT_BACK_ACTION,
        {
          key: "view-details",
          label: t("serviceEntryGate.actions.viewDetails", "View Details"),
          variant: "primary",
        },
      ],
      dismissActionKey: "back",
    });
    if (result.actionKey === "view-details") {
      history.push(detailRoute);
    }
    return false;
  }

  if (promptCode === "DOCUMENT_STATUS_INVALID") {
    if (isExpiredPenaltyDocument(payload)) {
      await handleExpiredPenaltyRenewal();
      return false;
    }

    const renewalTargetPath = createRenewalTargetPath(payload, decision);
    const result = await openDialog(
      buildExpiredGraceDialog(payload, decision, renewalTargetPath),
    );
    if (result.actionKey === "renew-now") {
      if (!renewalTargetPath) {
        await showGenericErrorDialog(openDialog);
        return false;
      }
      syncRenewalUpdateForm(payload);
      history.push(renewalTargetPath);
    }
    return false;
  }

  if (promptCode === "COMPLETE_PROFILE_VERIFICATION") {
    const dialog = buildCompleteProfileVerificationDialog(payload, decision);
    const result = await openDialog(dialog);
    await handleActionRouting({
      history,
      actionKey: result.actionKey,
      payload,
      openDialog,
      profiles: dialog.kind === "profile-list" ? dialog.profiles : undefined,
      selectedProfileId: result.selectedProfileId,
      currentSearch,
    });
    return false;
  }

  if (promptCode === "DOCUMENT_NOT_FOUND") {
    await openDialog({
      kind: "message",
      tone: "warning",
      variant: "service-unavailable",
      title: t(
        "serviceEntryGate.serviceUnavailable.title",
        "Service Unavailable",
      ),
      description: t(
        "serviceEntryGate.serviceUnavailable.description",
        "This service is currently unavailable due to maintenance or temporary suspension.",
      ),
      actions: [DEFAULT_BACK_ACTION],
      dismissActionKey: "back",
    });
    return false;
  }

  if (promptCode === "RENEWABLE_DOCUMENT_NOT_FOUND") {
    await openDialog({
      kind: "message",
      tone: "warning",
      variant: "service-unavailable",
      title: t(
        "serviceEntryGate.serviceUnavailable.title",
        "Service Unavailable",
      ),
      description: t(
        "serviceEntryGate.serviceUnavailable.description",
        "This service is currently unavailable due to maintenance or temporary suspension.",
      ),
      actions: [DEFAULT_BACK_ACTION],
      dismissActionKey: "back",
    });
    return false;
  }

  if (isApplicantProfilePrompt(decision)) {
    const { dialog, profiles } = buildApplicantTypeDialog(payload);
    const result = await openDialog(dialog);
    await handleActionRouting({
      history,
      actionKey: result.actionKey,
      payload,
      openDialog,
      profiles,
      selectedProfileId: result.selectedProfileId,
      currentSearch,
    });
    return false;
  }

  if (
    promptCode === "MissingPrerequisiteDocument" ||
    promptCode === "PrerequisiteDocumentUnavailable"
  ) {
    const bulletItems = buildPrerequisiteBulletItems(payload);
    await openDialog({
      kind: "message",
      tone: "warning",
      variant: "missing-prerequisite",
      title: t(
        "serviceEntryGate.missingPrerequisite.title",
        "Prerequisite Document Required",
      ),
      description: t(
        "serviceEntryGate.missingPrerequisite.description",
        "This service requires a prerequisite document before you can apply.",
      ),
      bulletItems: bulletItems.length ? bulletItems : undefined,
      actions: [DEFAULT_BACK_ACTION],
      dismissActionKey: "back",
    });
    return false;
  }

  if (promptCode === "REDIRECT_TO_RENEWAL") {
    const target = resolveRenewalTarget(payload, decision);
    if (!target) {
      await showGenericErrorDialog(openDialog);
      return false;
    }
    const result = await openRedirectRenewalDialog(openDialog);
    if (result.actionKey === "continue") {
      syncServiceStore({
        serviceId: target.serviceId,
        serviceCode: target.serviceCode ?? null,
      });
      history.push(
        createMediaLicensePath(target.serviceId, target.serviceCode ?? null),
        createGateRouteState(target.serviceId, {
          ...payload,
          serviceId: target.serviceId,
          serviceCode: target.serviceCode ?? payload.serviceCode ?? null,
        }),
      );
    }
    return false;
  }

  await showGenericErrorDialog(openDialog);
  return false;
};

const validateEnvelope = (
  envelope: ServiceEntryGateEnvelope | null | undefined,
  serviceId: number,
) => {
  if (!envelope) {
    throw new Error("empty_envelope");
  }

  if (!envelope.isSuccess) {
    throw new Error(envelope.message || "gate_unsuccessful");
  }

  if (!envelope.data) {
    throw new Error("gate_missing_data");
  }

  if (!envelope.data.decision?.finalAction) {
    throw new Error("gate_missing_decision");
  }

  return {
    ...envelope.data,
    serviceId: envelope.data.serviceId || serviceId,
  } as ServiceEntryGatePayload;
};

export const checkFinalSubmissionServiceEntryGate = async (options: {
  serviceId: number;
  search?: string | null;
}): Promise<boolean> => {
  if (!shouldUseServiceEntryGate(options.search)) {
    return true;
  }

  try {
    const envelope = await checkServiceEntryGate(options.serviceId, {
      skipErrorToast: true,
    });
    const payload = validateEnvelope(envelope, options.serviceId);
    const decision = resolveEffectiveDecision(payload);

    return decision.finalAction === "Allow" || decision.allowed === true;
  } catch (error) {
    console.error("Final submission service entry gate check failed:", error);
    return false;
  }
};

const navigateAllow = (options: {
  history: History;
  payload: ServiceEntryGatePayload;
  serviceCode?: string | null;
  serviceName?: string | null;
  source?: string;
  replace?: boolean;
  currentSearch?: string | null;
  createAllowPath?: ServiceEntryGatePathResolver;
  onBeforeAllowNavigate?: ServiceEntryGateAllowCallback;
  extraState?: LocationState | null;
  mediaLicenseAction?: string | null;
}) => {
  const serviceCode =
    options.payload.serviceCode ?? options.serviceCode ?? null;
  const payload =
    serviceCode === (options.payload.serviceCode ?? null)
      ? options.payload
      : {
          ...options.payload,
          serviceCode,
        };

  syncServiceStore({
    serviceId: payload.serviceId,
    serviceCode,
    serviceName: options.serviceName,
  });
  options.onBeforeAllowNavigate?.(payload);

  const path = options.createAllowPath
    ? options.createAllowPath(payload)
    : createMediaLicensePath(
        payload.serviceId,
        serviceCode,
        options.currentSearch,
        options.mediaLicenseAction,
      );
  const state = createGateRouteState(
    payload.serviceId,
    payload,
    options.source,
    options.extraState,
  );

  if (options.replace) {
    options.history.replace(path, state);
    return;
  }
  options.history.push(path, state);
};

export const openServiceWithGate = async (options: {
  history: History;
  serviceId: number;
  serviceName?: string;
  serviceCode?: string | null;
  source?: string;
  openDialog: ServiceEntryGateDialogOpener;
  createAllowPath?: ServiceEntryGatePathResolver;
  onBeforeAllowNavigate?: ServiceEntryGateAllowCallback;
  onInProgressApplication?: ServiceEntryGateInProgressHandler;
  extraState?: LocationState | null;
}) => {
  const currentSearch = options.history.location.search;
  const shouldUseEntryGate = shouldUseServiceEntryGate(currentSearch);

  if (!shouldUseEntryGate) {
    syncServiceStore({
      serviceId: options.serviceId,
      serviceCode: options.serviceCode ?? null,
      serviceName: options.serviceName,
    });
    options.history.push(
      createMediaLicensePath(
        options.serviceId,
        options.serviceCode ?? null,
        currentSearch,
      ),
    );
    return { allowed: true, payload: null };
  }

  try {
    const envelope = await checkServiceEntryGate(options.serviceId);
    const payload = validateEnvelope(envelope, options.serviceId);
    return await openServiceGateWithPayload({
      history: options.history,
      payload,
      serviceName: options.serviceName,
      serviceCode: options.serviceCode,
      source: options.source,
      openDialog: options.openDialog,
      createAllowPath: options.createAllowPath,
      onBeforeAllowNavigate: options.onBeforeAllowNavigate,
      onInProgressApplication: options.onInProgressApplication,
      extraState: options.extraState,
      currentSearch,
    });
  } catch (error) {
    void error;
    await showGenericErrorDialog(options.openDialog);
    return { allowed: false, payload: null };
  }
};

export const openServiceGateWithPayload = async (options: {
  history: History;
  payload: ServiceEntryGatePayload;
  serviceName?: string;
  serviceCode?: string | null;
  source?: string;
  openDialog: ServiceEntryGateDialogOpener;
  createAllowPath?: ServiceEntryGatePathResolver;
  onBeforeAllowNavigate?: ServiceEntryGateAllowCallback;
  onInProgressApplication?: ServiceEntryGateInProgressHandler;
  extraState?: LocationState | null;
  currentSearch?: string | null;
}) => {
  const currentSearch =
    options.currentSearch ?? options.history.location.search;
  const { payload } = options;
  const decision = resolveEffectiveDecision(payload);

  syncServiceStore({
    serviceId: payload.serviceId,
    serviceCode: payload.serviceCode ?? options.serviceCode ?? null,
    serviceName: options.serviceName,
  });

  if (decision.finalAction === "Allow" || decision.allowed === true) {
    navigateAllow({
      history: options.history,
      payload,
      serviceCode: options.serviceCode ?? null,
      serviceName: options.serviceName,
      source: options.source,
      currentSearch,
      createAllowPath: options.createAllowPath,
      onBeforeAllowNavigate: options.onBeforeAllowNavigate,
      extraState: options.extraState,
    });
    return { allowed: true, payload };
  }

  if (decision.finalAction === "RedirectRenewal") {
    const target = resolveRenewalTarget(payload, decision);
    if (isExpiredPenaltyDocument(payload)) {
      const result = await options.openDialog(
        buildExpiredPenaltyDialog(
          payload,
          decision,
          createRenewalTargetPath(payload, decision, currentSearch),
        ),
      );
      if (
        result.actionKey === "pay-renew" &&
        target &&
        resolveRenewalApplicationId(payload) !== null
      ) {
        syncRenewalUpdateForm(payload);
        const redirectPayload: ServiceEntryGatePayload = {
          ...payload,
          serviceId: target.serviceId,
          serviceCode: target.serviceCode ?? null,
        };
        navigateAllow({
          history: options.history,
          payload: redirectPayload,
          serviceCode: target.serviceCode ?? null,
          serviceName: null,
          source: options.source,
          currentSearch,
          mediaLicenseAction: MEDIA_LICENSE_RENEW_ACTION,
        });
      }
      return { allowed: false, payload };
    }

    if (!target) {
      await showGenericErrorDialog(options.openDialog);
      return { allowed: false, payload };
    }

    if (isExpiredGraceDocument(payload)) {
      const result = await options.openDialog(
        buildExpiredGraceDialog(
          payload,
          decision,
          createMediaLicensePath(
            target.serviceId,
            target.serviceCode ?? null,
            currentSearch,
            MEDIA_LICENSE_RENEW_ACTION,
          ),
        ),
      );

      if (result.actionKey === "renew-now") {
        syncRenewalUpdateForm(payload);
        const redirectPayload: ServiceEntryGatePayload = {
          ...payload,
          serviceId: target.serviceId,
          serviceCode: target.serviceCode ?? payload.serviceCode ?? null,
        };
        navigateAllow({
          history: options.history,
          payload: redirectPayload,
          serviceCode: target.serviceCode ?? options.serviceCode ?? null,
          serviceName: options.serviceName,
          source: options.source,
          currentSearch,
          createAllowPath: options.createAllowPath,
          onBeforeAllowNavigate: options.onBeforeAllowNavigate,
          extraState: options.extraState,
          mediaLicenseAction: MEDIA_LICENSE_RENEW_ACTION,
        });
      }
      return { allowed: false, payload };
    }

    const result = await openRedirectRenewalDialog(options.openDialog);

    if (result.actionKey === "continue") {
      const redirectPayload: ServiceEntryGatePayload = {
        ...payload,
        serviceId: target.serviceId,
        serviceCode: target.serviceCode ?? payload.serviceCode ?? null,
      };
      navigateAllow({
        history: options.history,
        payload: redirectPayload,
        serviceCode: target.serviceCode ?? options.serviceCode ?? null,
        serviceName: options.serviceName,
        source: options.source,
        currentSearch,
        createAllowPath: options.createAllowPath,
        onBeforeAllowNavigate: options.onBeforeAllowNavigate,
        extraState: options.extraState,
      });
    }
    return { allowed: false, payload };
  }

  if (decision.finalAction === "Block") {
    if (
      decision.promptCode === "IN_PROGRESS_APPLICATION" &&
      options.onInProgressApplication
    ) {
      await options.onInProgressApplication(payload, decision);
      return { allowed: false, payload };
    }
  }

  if (
    await handleLocalApprovedEstablishmentOverride({
      history: options.history,
      payload,
      serviceCode: options.serviceCode,
      openDialog: options.openDialog,
      currentSearch,
    })
  ) {
    return { allowed: false, payload };
  }

  if (
    await handleDecisionActionDirective({
      history: options.history,
      payload,
      decision,
      openDialog: options.openDialog,
      currentSearch,
    })
  ) {
    return { allowed: false, payload };
  }

  if (decision.finalAction === "Block") {
    await handleBlockedDecision({
      history: options.history,
      payload,
      decision,
      openDialog: options.openDialog,
      currentSearch,
      source: options.source,
    });
    return { allowed: false, payload };
  }

  await showGenericErrorDialog(options.openDialog);
  return { allowed: false, payload };
};

export const ensureServiceEntryGateAccess = async (options: {
  history: History;
  serviceId: number;
  serviceCode?: string | null;
  serviceName?: string;
  state?: LocationState | null;
  openDialog: ServiceEntryGateDialogOpener;
}) => {
  const currentSearch = options.history.location.search;
  const shouldUseEntryGate = shouldUseServiceEntryGate(currentSearch);

  if (!shouldUseEntryGate) {
    return { allowed: true, payload: null };
  }

  const gateState = getGateRouteState(options.state);
  if (
    gateState?.gatePassed &&
    Number(gateState.serviceId) === options.serviceId
  ) {
    if (gateState.payload) {
      syncServiceStore({
        serviceId: gateState.payload.serviceId,
        serviceCode:
          gateState.payload.serviceCode ?? options.serviceCode ?? null,
        serviceName: options.serviceName,
      });
      return { allowed: true, payload: gateState.payload };
    }
    return { allowed: true, payload: null };
  }

  try {
    const envelope = await checkServiceEntryGate(options.serviceId);
    const payload = validateEnvelope(envelope, options.serviceId);
    const decision = resolveEffectiveDecision(payload);

    if (decision.finalAction === "Allow" || decision.allowed === true) {
      navigateAllow({
        history: options.history,
        payload,
        serviceCode: options.serviceCode ?? null,
        serviceName: options.serviceName,
        replace: true,
        source: "direct-url-guard",
        currentSearch,
      });
      return { allowed: true, payload };
    }

    if (decision.finalAction === "RedirectRenewal") {
      const target = resolveRenewalTarget(payload, decision);
      if (isExpiredPenaltyDocument(payload)) {
        const result = await options.openDialog(
          buildExpiredPenaltyDialog(
            payload,
            decision,
            createRenewalTargetPath(payload, decision, currentSearch),
          ),
        );
        if (
          result.actionKey === "pay-renew" &&
          target &&
          resolveRenewalApplicationId(payload) !== null
        ) {
          syncRenewalUpdateForm(payload);
          navigateAllow({
            history: options.history,
            payload: {
              ...payload,
              serviceId: target.serviceId,
              serviceCode: target.serviceCode ?? null,
            },
            serviceCode: target.serviceCode ?? null,
            serviceName: null,
            source: "direct-url-guard",
            replace: true,
            currentSearch,
            mediaLicenseAction: MEDIA_LICENSE_RENEW_ACTION,
          });
        }
        return { allowed: false, payload };
      }

      if (!target) {
        await showGenericErrorDialog(options.openDialog);
        return { allowed: false, payload };
      }

      if (isExpiredGraceDocument(payload)) {
        const result = await options.openDialog(
          buildExpiredGraceDialog(
            payload,
            decision,
            createMediaLicensePath(
              target.serviceId,
              target.serviceCode ?? null,
              currentSearch,
              MEDIA_LICENSE_RENEW_ACTION,
            ),
          ),
        );

        if (result.actionKey === "renew-now") {
          syncRenewalUpdateForm(payload);
          options.history.replace(
            createMediaLicensePath(
              target.serviceId,
              target.serviceCode ?? null,
              currentSearch,
              MEDIA_LICENSE_RENEW_ACTION,
            ),
            createGateRouteState(target.serviceId, {
              ...payload,
              serviceId: target.serviceId,
              serviceCode: target.serviceCode ?? payload.serviceCode ?? null,
            }),
          );
        }
        return { allowed: false, payload };
      }

      const result = await openRedirectRenewalDialog(options.openDialog);
      if (result.actionKey === "continue") {
        options.history.replace(
          createMediaLicensePath(
            target.serviceId,
            target.serviceCode ?? null,
            currentSearch,
          ),
          createGateRouteState(target.serviceId, {
            ...payload,
            serviceId: target.serviceId,
            serviceCode: target.serviceCode ?? payload.serviceCode ?? null,
          }),
        );
      }
      return { allowed: false, payload };
    }

    if (
      await handleLocalApprovedEstablishmentOverride({
        history: options.history,
        payload,
        serviceCode: options.serviceCode,
        openDialog: options.openDialog,
        currentSearch,
      })
    ) {
      return { allowed: false, payload };
    }

    if (
      await handleDecisionActionDirective({
        history: options.history,
        payload,
        decision,
        openDialog: options.openDialog,
        currentSearch,
      })
    ) {
      return { allowed: false, payload };
    }

    if (decision.finalAction === "Block") {
      await handleBlockedDecision({
        history: options.history,
        payload,
        decision,
        openDialog: options.openDialog,
        currentSearch,
        source: "direct-url-guard",
        replace: true,
      });
      return { allowed: false, payload };
    }

    await showGenericErrorDialog(options.openDialog);
    return { allowed: false, payload };
  } catch (error) {
    void error;
    await showGenericErrorDialog(options.openDialog);
    return { allowed: false, payload: null };
  }
};

export const createServiceEntryGatePath = createMediaLicensePath;
