import assert from "node:assert/strict";
import test from "node:test";
import type { History } from "history";
import type {
  ServiceEntryGateDialogConfig,
  ServiceEntryGateDialogResult,
} from "../src/components/ServiceEntryGate/types.ts";
import type { ServiceEntryGatePayload } from "../src/services/services.ts";
import { useUpdateFormStore } from "./stubs/updateFormStub.mjs";
import { useServicesStore } from "../src/store/services.ts";
import { useUserStore } from "../src/store/user.ts";
import {
  ensureServiceEntryGateAccess,
  openServiceGateWithPayload,
} from "../src/utils/serviceEntryGate.ts";

const initialUserState = useUserStore.getState();
const initialServicesState = useServicesStore.getState();
const runtime = globalThis as typeof globalThis & {
  __serviceEntryGateRedirects: string[];
  __serviceEntryGateRequests: Array<{
    method: "get" | "post";
    url: string;
    payload?: unknown;
  }>;
  __serviceEntryGateGetResponses: Map<string, unknown>;
};

runtime.__serviceEntryGateGetResponses ??= new Map();

test.afterEach(() => {
  useUserStore.setState(initialUserState, true);
  useServicesStore.setState(initialServicesState, true);
  runtime.__serviceEntryGateRedirects.length = 0;
  runtime.__serviceEntryGateRequests.length = 0;
  runtime.__serviceEntryGateGetResponses.clear();
  useUpdateFormStore.getState().resetUpdateForm();
  localStorage.clear();
});

const history = {
  location: { search: "" },
  push: () => undefined,
  replace: () => undefined,
} as unknown as History;

const openGate = async (
  payload: ServiceEntryGatePayload,
  result: ServiceEntryGateDialogResult = { actionKey: "close" },
  currentSearch = "",
  serviceCode?: string | null,
) => {
  let openedDialog: ServiceEntryGateDialogConfig | null = null;

  await openServiceGateWithPayload({
    history,
    payload,
    serviceCode,
    currentSearch,
    openDialog: async (dialog): Promise<ServiceEntryGateDialogResult> => {
      openedDialog = dialog;
      return result;
    },
  });

  return openedDialog;
};

const setProfileInventory = () => {
  useUserStore.setState((state) => ({
    ...state,
    currentProfileId: "9341",
    userInfo: {
      ...state.userInfo,
      currentUserProfileId: "9341",
      currentUserTypeId: "2",
      userInvitation: {
        id: 1,
        name: "Personal Profile",
        photoUrl: "",
        userProfileId: "9338",
        userTypeId: "1",
        email: "user@example.com",
      },
      userEstablishments: [
        {
          id: 10,
          nameAr: "",
          nameEn: "Commercial Profile",
          userProfileId: "9341",
          userTypeId: "2",
          userTypeCode: "2",
          email: "user@example.com",
          establishmentUrl: null,
          profileStatus: "3",
        },
      ],
    },
  }));
};

const setExpiredCurrentProfileWithApprovedGovernment = () => {
  useUserStore.setState((state) => ({
    ...state,
    currentProfileId: "9335",
    userInfo: {
      ...state.userInfo,
      currentUserProfileId: "9335",
      currentUserTypeId: "2",
      userInvitation: {
        id: 1,
        name: "Daisy",
        photoUrl: "",
        userProfileId: "9322",
        userTypeId: "1",
        email: "daisy92wr@gmail.com",
        profileStatus: "5",
      },
      userEstablishments: [
        {
          id: 7,
          nameAr: "",
          nameEn: "Test Commercial - Daisy",
          userProfileId: "9335",
          userTypeId: "2",
          userTypeCode: "2",
          email: "daisy92wr@gmail.com",
          establishmentUrl: null,
          profileStatus: "5",
        },
        {
          id: 15,
          nameAr: "",
          nameEn: "Test Government - Daisy",
          userProfileId: "9346",
          userTypeId: "3",
          userTypeCode: "3",
          email: "ruictcs@gov.ae",
          establishmentUrl: null,
          profileStatus: "3",
        },
      ],
    },
  }));
};

test("offers an approved matching establishment when backend qualification hints are empty", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  const dialog = await openGate({
    serviceId: 3394,
    serviceCode: "1201",
    applicant: {
      profileId: 9335,
      userTypeId: 2,
      profileState: "complete",
    },
    decision: {
      finalAction: "Block",
      allowed: false,
      action: "SHOW_COMPLETE_PROFILE_MODAL",
      reasonCode: "PERSONAL_PROFILE_INCOMPLETE",
      promptCode: "PERSONAL_PROFILE_INCOMPLETE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      variant: "add-establishment-no-eligible-profile",
      requiredUserTypeCodes: ["99", "2", "5", "3"],
      currentUserTypeCode: "2",
      hasQualifiedProfile: false,
      qualifyingProfiles: [],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");

  if (dialog.kind !== "profile-list") {
    return;
  }

  assert.equal(dialog.title, "Switch Establishment Profile");
  assert.deepEqual(
    dialog.profiles.map((profile) => profile.profileId),
    ["9346"],
  );
});

test("uses the requested service code when the 1201 payload omits it", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  const dialog = await openGate(
    {
      serviceId: 3394,
      applicant: {
        profileId: 9335,
        userTypeId: 2,
        profileState: "complete",
      },
      decision: {
        finalAction: "Block",
        allowed: false,
        action: "SHOW_COMPLETE_PROFILE_MODAL",
        reasonCode: "PERSONAL_PROFILE_INCOMPLETE",
        promptCode: "PERSONAL_PROFILE_INCOMPLETE",
        requiredApplicantType: "Establishment",
      },
      uiHints: {
        requiredUserTypeCodes: ["3"],
        hasQualifiedProfile: false,
        qualifyingProfiles: [],
      },
    },
    { actionKey: "close" },
    "",
    "1201",
  );

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");
});

test("uses a false qualification flag when the profile list is omitted", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  const dialog = await openGate({
    serviceId: 3394,
    serviceCode: "1201",
    applicant: {
      profileId: 9335,
      userTypeId: 2,
      profileState: "complete",
    },
    decision: {
      finalAction: "Block",
      allowed: false,
      action: "SHOW_COMPLETE_PROFILE_MODAL",
      reasonCode: "PERSONAL_PROFILE_INCOMPLETE",
      promptCode: "PERSONAL_PROFILE_INCOMPLETE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      requiredUserTypeCodes: ["3"],
      hasQualifiedProfile: false,
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");
});

test("uses an empty profile list when the qualification flag is omitted", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  const dialog = await openGate({
    serviceId: 3394,
    serviceCode: "1201",
    applicant: {
      profileId: 9335,
      userTypeId: 2,
      profileState: "complete",
    },
    decision: {
      finalAction: "Block",
      allowed: false,
      action: "SHOW_COMPLETE_PROFILE_MODAL",
      reasonCode: "PERSONAL_PROFILE_INCOMPLETE",
      promptCode: "PERSONAL_PROFILE_INCOMPLETE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      requiredUserTypeCodes: ["3"],
      qualifyingProfiles: [],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");
});

test("keeps the backend block when approved establishments do not match the required type", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  const dialog = await openGate({
    serviceId: 3394,
    serviceCode: "1201",
    applicant: {
      profileId: 9335,
      userTypeId: 2,
      profileState: "complete",
    },
    decision: {
      finalAction: "Block",
      allowed: false,
      action: "SHOW_COMPLETE_PROFILE_MODAL",
      reasonCode: "PERSONAL_PROFILE_INCOMPLETE",
      promptCode: "PERSONAL_PROFILE_INCOMPLETE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      requiredUserTypeCodes: ["5"],
      hasQualifiedProfile: false,
      qualifyingProfiles: [],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "complete-personal");
});

test("keeps the backend block when required establishment types are unavailable", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  const dialog = await openGate({
    serviceId: 3394,
    serviceCode: "1201",
    applicant: {
      profileId: 9335,
      userTypeId: 2,
      profileState: "complete",
    },
    decision: {
      finalAction: "Block",
      allowed: false,
      action: "SHOW_COMPLETE_PROFILE_MODAL",
      reasonCode: "PERSONAL_PROFILE_INCOMPLETE",
      promptCode: "PERSONAL_PROFILE_INCOMPLETE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      requiredUserTypeCodes: [],
      hasQualifiedProfile: false,
      qualifyingProfiles: [],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "complete-personal");
});

test("does not override an unrelated backend denial with local profile choices", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  const dialog = await openGate({
    serviceId: 3394,
    serviceCode: "1201",
    applicant: {
      profileId: 9335,
      userTypeId: 2,
      profileState: "complete",
    },
    decision: {
      finalAction: "Block",
      allowed: false,
      action: "SHOW_LOCAL_AUTHORITY_MODAL",
      reasonCode: "LOCAL_AUTHORITY_SERVICE",
      promptCode: "LOCAL_AUTHORITY_SERVICE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      requiredUserTypeCodes: ["3"],
      hasQualifiedProfile: false,
      qualifyingProfiles: [],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "local-authority");
});

test("does not apply the 1201 fallback to another service", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  const dialog = await openGate({
    serviceId: 3133,
    serviceCode: "13",
    applicant: {
      profileId: 9335,
      userTypeId: 2,
      profileState: "complete",
    },
    decision: {
      finalAction: "Block",
      allowed: false,
      action: "SHOW_COMPLETE_PROFILE_MODAL",
      reasonCode: "PERSONAL_PROFILE_INCOMPLETE",
      promptCode: "PERSONAL_PROFILE_INCOMPLETE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      requiredUserTypeCodes: ["3"],
      hasQualifiedProfile: false,
      qualifyingProfiles: [],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "complete-personal");
});

test("switches to a locally resolved approved establishment", async () => {
  setExpiredCurrentProfileWithApprovedGovernment();

  await openGate(
    {
      serviceId: 3394,
      serviceCode: "1201",
      applicant: {
        profileId: 9335,
        userTypeId: 2,
        profileState: "complete",
      },
      decision: {
        finalAction: "Block",
        allowed: false,
        action: "SHOW_COMPLETE_PROFILE_MODAL",
        reasonCode: "PERSONAL_PROFILE_INCOMPLETE",
        promptCode: "PERSONAL_PROFILE_INCOMPLETE",
        requiredApplicantType: "Establishment",
      },
      uiHints: {
        requiredUserTypeCodes: ["3"],
        hasQualifiedProfile: false,
        qualifyingProfiles: [],
      },
    },
    {
      actionKey: "switch-establishment",
      selectedProfileId: "9346",
    },
    "?serviceEntryGate=0",
  );

  assert.deepEqual(runtime.__serviceEntryGateRequests, [
    {
      method: "post",
      url: "/api/User/ChangeIdentity",
      payload: {
        userProFileID: "9346",
        userTypeID: 3,
      },
    },
  ]);
  assert.deepEqual(runtime.__serviceEntryGateRedirects, [
    "/services/media-license?serviceId=3394&serviceCode=1201&serviceEntryGate=1",
  ]);
});

const createHistory = (search = "") => {
  const pushes: Array<{ path: string; state?: unknown }> = [];
  const replacements: Array<{ path: string; state?: unknown }> = [];

  return {
    history: {
      location: { search },
      push: (path: string, state?: unknown) => {
        pushes.push({ path, state });
      },
      replace: (path: string, state?: unknown) => {
        replacements.push({ path, state });
      },
    } as unknown as History,
    pushes,
    replacements,
  };
};

const expiredPenaltyPayload = (
  finalAction: "Block" | "RedirectRenewal",
): ServiceEntryGatePayload => ({
  serviceId: 2318,
  serviceCode: "2318",
  decision: {
    finalAction,
    allowed: false,
    promptCode:
      finalAction === "Block" ? "DOCUMENT_STATUS_INVALID" : "REDIRECT_TO_RENEWAL",
    targetServiceId: 2401,
    targetServiceCode: "2401",
  },
  documentInfo: {
    applicationId: 2297988,
    licenseNumber: "2297988",
    expiredState: "penalty",
  },
});

test("shows eligible profile choices when applicant type hints are incomplete", async () => {
  const dialog = await openGate({
    serviceId: 3133,
    serviceCode: "13",
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: null,
    },
    uiHints: {
      hasQualifiedProfile: true,
      qualifyingProfiles: [
        {
          profileId: 9323,
          userTypeId: 2,
          title: "Commercial",
          isEligible: true,
        },
        {
          profileId: 9350,
          userTypeId: 5,
          title: "Government",
          isEligible: false,
        },
        {
          profileId: 9367,
          userTypeId: 1,
          title: "Individual",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");

  if (dialog.kind !== "profile-list") {
    return;
  }

  assert.deepEqual(
    dialog.profiles.map((profile) => profile.profileId),
    ["9323", "9367"],
  );
  assert.deepEqual(
    dialog.actions.map((action) => action.key),
    ["switch-establishment"],
  );
  assert.equal(dialog.title, "Select profile for this application");
  assert.doesNotMatch(dialog.description, /unavailable|maintenance/i);
});

test("ignores an unsupported variant when qualified profiles are available", async () => {
  const dialog = await openGate({
    serviceId: 3133,
    serviceCode: "13",
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: null,
    },
    uiHints: {
      variant: "unsupported-applicant-dialog",
      hasQualifiedProfile: true,
      qualifyingProfiles: [
        {
          profileId: 9323,
          userTypeId: 2,
          title: "Commercial",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");
  assert.equal(dialog.variant, "switch-to-qualified-profile");
});

test("shows qualified profiles when the required applicant type is Either", async () => {
  const dialog = await openGate({
    serviceId: 3133,
    serviceCode: "13",
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: null,
      requiredApplicantType: "Either",
    },
    uiHints: {
      hasQualifiedProfile: true,
      qualifyingProfiles: [
        {
          profileId: 9323,
          userTypeId: 2,
          title: "Commercial",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");
  assert.equal(dialog.variant, "switch-to-qualified-profile");
});

test("preserves the Either dual action dialog for a different reason", async () => {
  const dialog = await openGate({
    serviceId: 3133,
    serviceCode: "13",
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "MissingEstablishmentContext",
      promptCode: null,
      requiredApplicantType: "Either",
    },
    uiHints: {
      hasQualifiedProfile: true,
      qualifyingProfiles: [
        {
          profileId: 9323,
          userTypeId: 2,
          title: "Commercial",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "complete-profile-verification-dual-cta");
});

test("preserves the dedicated personal-profile dialog for complete hints", async () => {
  setProfileInventory();

  const dialog = await openGate({
    serviceId: 3120,
    serviceCode: "6",
    applicant: {
      profileId: 9341,
      profileState: "complete",
    },
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: "SWITCH_PERSONAL_PROFILE",
      requiredApplicantType: "Individual",
    },
    uiHints: {
      variant: "switch-personal",
      hasQualifiedProfile: true,
      qualifyingProfiles: [
        {
          profileId: "9338",
          userTypeId: "Individual",
          userTypeCode: "1",
          title: "Profile 9338",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "switch-to-personal");
  assert.equal(dialog.title, "Switch to Personal Profile");
});

test("does not replace an explicit individual decision when already personal", async () => {
  setProfileInventory();
  useUserStore.setState((state) => ({
    ...state,
    currentProfileId: "9338",
    userInfo: {
      ...state.userInfo,
      currentUserProfileId: "9338",
      currentUserTypeId: "1",
    },
  }));

  const dialog = await openGate({
    serviceId: 3120,
    serviceCode: "6",
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: null,
      requiredApplicantType: "Individual",
    },
    uiHints: {
      hasQualifiedProfile: true,
      qualifyingProfiles: [
        {
          profileId: 9338,
          userTypeId: 1,
          title: "Personal Profile",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "service-unavailable");
});

test("preserves the dedicated establishment dialog for complete hints", async () => {
  setProfileInventory();

  const dialog = await openGate({
    serviceId: 3133,
    serviceCode: "13",
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: "SWITCH_ESTABLISHMENT_PROFILE",
      requiredApplicantType: "Establishment",
    },
    uiHints: {
      variant: "switch-establishment-qualified-types",
      hasQualifiedProfile: true,
      qualifyingProfiles: [
        {
          profileId: 9341,
          userTypeId: 2,
          title: "Commercial Profile",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");
  assert.equal(dialog.variant, "switch-establishment-qualified-types");
  assert.deepEqual(
    dialog.actions.map((action) => action.key),
    ["add-establishment", "switch-establishment"],
  );
});

test("keeps the existing fallback when no eligible profile can be resolved", async () => {
  const dialog = await openGate({
    serviceId: 3133,
    serviceCode: "13",
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: null,
    },
    uiHints: {
      hasQualifiedProfile: true,
      qualifyingProfiles: [
        {
          profileId: 9350,
          userTypeId: 5,
          title: "Government",
          isEligible: false,
        },
        {
          profileId: 9999,
          userTypeId: "Individual",
          title: "Unresolved",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "service-unavailable");
});

test("does not show profile choices when the backend denies a qualified profile", async () => {
  const dialog = await openGate({
    serviceId: 3133,
    serviceCode: "13",
    decision: {
      finalAction: "Block",
      allowed: false,
      action: null,
      reasonCode: "ApplicantTypeNotAllowed",
      promptCode: null,
    },
    uiHints: {
      hasQualifiedProfile: false,
      qualifyingProfiles: [
        {
          profileId: 9323,
          userTypeId: 2,
          title: "Commercial",
          isEligible: true,
        },
      ],
    },
  });

  assert.ok(dialog);
  assert.equal(dialog.kind, "message");
  assert.equal(dialog.variant, "service-unavailable");
});

test("switches to the selected qualified profile and redirects", async () => {
  const dialog = await openGate(
    {
      serviceId: 3133,
      serviceCode: "13",
      decision: {
        finalAction: "Block",
        allowed: false,
        action: null,
        reasonCode: "ApplicantTypeNotAllowed",
        promptCode: null,
      },
      uiHints: {
        hasQualifiedProfile: true,
        qualifyingProfiles: [
          {
            profileId: 9323,
            userTypeId: 2,
            title: "Commercial",
            isEligible: true,
          },
        ],
      },
    },
    {
      actionKey: "switch-establishment",
      selectedProfileId: "9323",
    },
  );

  assert.ok(dialog);
  assert.equal(dialog.kind, "profile-list");
  assert.deepEqual(runtime.__serviceEntryGateRequests, [
    {
      method: "post",
      url: "/api/User/ChangeIdentity",
      payload: {
        userProFileID: "9323",
        userTypeID: 2,
      },
    },
  ]);
  assert.equal(useUserStore.getState().currentProfileId, "9323");
  assert.equal(useUserStore.getState().userInfo.currentUserTypeId, "2");
  assert.equal(
    JSON.parse(localStorage.getItem("NMA_SERVICES_AUTH_TOKEN") || "{}").value,
    "test-access-token",
  );
  assert.deepEqual(runtime.__serviceEntryGateRedirects, [
    "/services/media-license?serviceId=3133&serviceCode=13&serviceEntryGate=1",
  ]);
});

test("routes a blocked expired-penalty document to its renewal service", async () => {
  const { history, pushes } = createHistory("?serviceEntryGate=0");
  const payload = expiredPenaltyPayload("Block");
  payload.decision = {
    ...payload.decision,
    targetServiceCode: null,
  };
  let openedDialog: ServiceEntryGateDialogConfig | null = null;

  await openServiceGateWithPayload({
    history,
    payload,
    currentSearch: "?serviceEntryGate=1",
    openDialog: async (dialog) => {
      openedDialog = dialog;
      return { actionKey: "pay-renew" };
    },
  });

  assert.ok(openedDialog);
  assert.deepEqual(
    openedDialog.actions.map((action) => action.key),
    ["back", "pay-renew"],
  );
  assert.equal(pushes.length, 1);
  assert.equal(
    pushes[0]?.path,
    "/services/media-license?serviceId=2401&actions=RENEW&serviceEntryGate=1",
  );
  assert.equal(useUpdateFormStore.getState().applicationId, 2297988);
  assert.deepEqual(runtime.__serviceEntryGateRequests, []);
  assert.equal(
    (pushes[0]?.state as { __serviceEntryGate?: { gatePassed?: boolean } })
      ?.__serviceEntryGate?.gatePassed,
    true,
  );
  assert.equal(
    (
      pushes[0]?.state as {
        __serviceEntryGate?: { payload?: { serviceCode?: string | null } };
      }
    )?.__serviceEntryGate?.payload?.serviceCode,
    null,
  );
});

test("routes an existing expired-penalty document to its renewal service", async () => {
  const { history, pushes } = createHistory("?serviceEntryGate=1");
  const payload = expiredPenaltyPayload("Block");
  payload.decision = {
    ...payload.decision,
    promptCode: "EXISTING_VALID_DOCUMENT",
  };

  await openServiceGateWithPayload({
    history,
    payload,
    openDialog: async () => ({ actionKey: "pay-renew" }),
  });

  assert.equal(pushes.length, 1);
  assert.equal(
    pushes[0]?.path,
    "/services/media-license?serviceId=2401&serviceCode=2401&actions=RENEW&serviceEntryGate=1",
  );
  assert.equal(useUpdateFormStore.getState().applicationId, 2297988);
  assert.deepEqual(runtime.__serviceEntryGateRequests, []);
});

test("routes a service-card expired-penalty renewal with passed gate state", async () => {
  const { history, pushes } = createHistory("?serviceEntryGate=1");
  let beforeAllowCalls = 0;

  await openServiceGateWithPayload({
    history,
    payload: expiredPenaltyPayload("RedirectRenewal"),
    serviceName: "Source service",
    source: "services-card",
    createAllowPath: () => "/permits-license",
    onBeforeAllowNavigate: () => {
      beforeAllowCalls += 1;
      useUpdateFormStore.getState().setUpdateForm({ applicationId: 9999 });
    },
    extraState: { staleApplicationId: 9999 },
    openDialog: async () => ({ actionKey: "pay-renew" }),
  });

  assert.equal(pushes.length, 1);
  assert.equal(
    pushes[0]?.path,
    "/services/media-license?serviceId=2401&serviceCode=2401&actions=RENEW&serviceEntryGate=1",
  );
  assert.equal(useUpdateFormStore.getState().applicationId, 2297988);
  assert.equal(useServicesStore.getState().userInfo.servicesName, "");
  assert.equal(beforeAllowCalls, 0);
  assert.equal(
    (pushes[0]?.state as { staleApplicationId?: number })
      ?.staleApplicationId,
    undefined,
  );
  assert.deepEqual(runtime.__serviceEntryGateRequests, []);
  assert.equal(
    (pushes[0]?.state as { __serviceEntryGate?: { gatePassed?: boolean } })
      ?.__serviceEntryGate?.gatePassed,
    true,
  );
});

test("routes a direct-url expired-penalty renewal with replacement state", async () => {
  const { history, replacements } = createHistory("?serviceEntryGate=1");
  useServicesStore.getState().updateServicesId(2318);
  useServicesStore.getState().updateServicesCode("2318");
  useServicesStore.getState().updateServicesName("Source service");
  const payload = expiredPenaltyPayload("RedirectRenewal");
  payload.decision = {
    ...payload.decision,
    targetServiceCode: null,
  };
  runtime.__serviceEntryGateGetResponses.set("/api/Service/2318/Check", {
    isSuccess: true,
    statusCode: 200,
    data: payload,
  });

  await ensureServiceEntryGateAccess({
    history,
    serviceId: 2318,
    serviceCode: "2318",
    openDialog: async () => ({ actionKey: "pay-renew" }),
  });

  assert.equal(replacements.length, 1);
  assert.equal(
    replacements[0]?.path,
    "/services/media-license?serviceId=2401&actions=RENEW&serviceEntryGate=1",
  );
  assert.equal(useUpdateFormStore.getState().applicationId, 2297988);
  assert.equal(useServicesStore.getState().userInfo.servicesId, 2401);
  assert.equal(useServicesStore.getState().userInfo.servicesCode, null);
  assert.equal(useServicesStore.getState().userInfo.servicesName, "");
  assert.deepEqual(runtime.__serviceEntryGateRequests, [
    { method: "get", url: "/api/Service/2318/Check" },
  ]);
  assert.equal(
    (replacements[0]?.state as {
      __serviceEntryGate?: { gatePassed?: boolean };
    })?.__serviceEntryGate?.gatePassed,
    true,
  );
  assert.equal(
    (
      replacements[0]?.state as {
        __serviceEntryGate?: { payload?: { serviceCode?: string | null } };
      }
    )?.__serviceEntryGate?.payload?.serviceCode,
    null,
  );
});

test("replaces a direct-url blocked expired-penalty document with its renewal service", async () => {
  const { history, pushes, replacements } = createHistory("?serviceEntryGate=1");
  const payload = expiredPenaltyPayload("Block");
  runtime.__serviceEntryGateGetResponses.set("/api/Service/2318/Check", {
    isSuccess: true,
    statusCode: 200,
    data: payload,
  });

  await ensureServiceEntryGateAccess({
    history,
    serviceId: 2318,
    serviceCode: "2318",
    openDialog: async () => ({ actionKey: "pay-renew" }),
  });

  assert.deepEqual(pushes, []);
  assert.equal(replacements.length, 1);
  assert.equal(
    replacements[0]?.path,
    "/services/media-license?serviceId=2401&serviceCode=2401&actions=RENEW&serviceEntryGate=1",
  );
  assert.equal(useUpdateFormStore.getState().applicationId, 2297988);
  assert.deepEqual(runtime.__serviceEntryGateRequests, [
    { method: "get", url: "/api/Service/2318/Check" },
  ]);
});

test("does not offer Pay & Renew when an expired-penalty document has no renewal target", async () => {
  let openedDialog: ServiceEntryGateDialogConfig | null = null;
  const payload = expiredPenaltyPayload("RedirectRenewal");
  payload.decision = {
    ...payload.decision,
    targetServiceId: null,
    targetServiceCode: null,
  };

  await openServiceGateWithPayload({
    history,
    payload,
    openDialog: async (dialog) => {
      openedDialog = dialog;
      return { actionKey: "back" };
    },
  });

  assert.ok(openedDialog);
  assert.deepEqual(
    openedDialog.actions.map((action) => action.key),
    ["back"],
  );
});

test("does not offer Pay & Renew when the renewal target service ID is invalid", async () => {
  let openedDialog: ServiceEntryGateDialogConfig | null = null;
  const payload = expiredPenaltyPayload("RedirectRenewal");
  payload.decision = {
    ...payload.decision,
    targetServiceId: -1,
  };

  await openServiceGateWithPayload({
    history: createHistory("?serviceEntryGate=1").history,
    payload,
    openDialog: async (dialog) => {
      openedDialog = dialog;
      return { actionKey: "back" };
    },
  });

  assert.ok(openedDialog);
  assert.deepEqual(
    openedDialog.actions.map((action) => action.key),
    ["back"],
  );
});

test("does not offer Pay & Renew when the source application ID is missing", async () => {
  let openedDialog: ServiceEntryGateDialogConfig | null = null;
  const payload = expiredPenaltyPayload("RedirectRenewal");
  payload.documentInfo = {
    ...payload.documentInfo,
    applicationId: null,
  };

  await openServiceGateWithPayload({
    history: createHistory("?serviceEntryGate=1").history,
    payload,
    openDialog: async (dialog) => {
      openedDialog = dialog;
      return { actionKey: "back" };
    },
  });

  assert.ok(openedDialog);
  assert.deepEqual(
    openedDialog.actions.map((action) => action.key),
    ["back"],
  );
  assert.equal(openedDialog.helperText, undefined);
});

test("does not reuse the original service code when the renewal target omits one", async () => {
  const { history, pushes } = createHistory("?serviceEntryGate=1");
  const payload = expiredPenaltyPayload("RedirectRenewal");
  payload.decision = {
    ...payload.decision,
    targetServiceCode: null,
  };

  await openServiceGateWithPayload({
    history,
    payload,
    openDialog: async () => ({ actionKey: "pay-renew" }),
  });

  assert.equal(pushes.length, 1);
  assert.equal(
    pushes[0]?.path,
    "/services/media-license?serviceId=2401&actions=RENEW&serviceEntryGate=1",
  );
  assert.equal(
    (
      pushes[0]?.state as {
        __serviceEntryGate?: { payload?: { serviceCode?: string | null } };
      }
    )?.__serviceEntryGate?.payload?.serviceCode,
    null,
  );
});
