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
  __serviceEntryGateGetResponses: Map<string, unknown>;
};

runtime.__serviceEntryGateGetResponses ??= new Map();

test.afterEach(() => {
  useUserStore.setState(initialUserState, true);
  useServicesStore.setState(initialServicesState, true);
  useUpdateFormStore.getState().resetUpdateForm();
  runtime.__serviceEntryGateGetResponses.clear();
  localStorage.clear();
});

const createHistory = () => {
  const pushes: Array<{ path: string; state?: unknown }> = [];
  const replacements: Array<{ path: string; state?: unknown }> = [];

  return {
    history: {
      location: { search: "?serviceEntryGate=1" },
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

const createPayload = (
  applicationStatus: string | null | undefined,
  finalAction: "Allow" | "Block" = "Block",
): ServiceEntryGatePayload => ({
  serviceId: 3120,
  serviceCode: "6",
  serviceType: "NEW",
  parentServiceId: null,
  documentType: "LICENSE",
  serviceName: null,
  applicant: {
    userId: "a1859002-88b1-4386-b88a-563970a93679",
    profileId: 9353,
    userTypeId: 1,
    userTypeCode: "1",
    applicantKind: "Individual",
    applicantType: "Individual",
    profileState: "complete",
    hasProfile: true,
    currentUserTypeCode: "1",
    personId: 45,
    establishmentId: 0,
    governmentTypeId: null,
    missingEstablishmentContext: false,
    promptCode: null,
  },
  documentInfo: null,
  inProgressInfo: {
    applicationId: 578,
    applicationNumber: "ML-1-6-3790319",
    applicationStatus,
  },
  results: [
    {
      rule: "C1",
      action: "Block",
      factSource: "Application+ApplicationDetail",
      reasonCode: "InProgressApplication",
      promptCode: "IN_PROGRESS_APPLICATION",
      targetServiceId: null,
      targetServiceCode: null,
    },
    {
      rule: "C4",
      action: "Block",
      factSource: "LicensePermitIndex",
      reasonCode: "ExistingValidDocument",
      promptCode: "EXISTING_VALID_DOCUMENT",
      targetServiceId: null,
      targetServiceCode: null,
    },
  ],
  decision:
    finalAction === "Allow"
      ? {
          finalAction: "Allow",
          allowed: true,
        }
      : {
          finalAction: "Block",
          allowed: false,
          action: "SHOW_EXISTING_DOCUMENT_MODAL",
          reasonCode: "ExistingValidDocument",
          promptCode: "EXISTING_VALID_DOCUMENT",
          requiredApplicantType: "Individual",
          targetServiceId: null,
          targetServiceCode: null,
          variables: null,
        },
});

const createConflictingExpiredRenewalPayload = (): ServiceEntryGatePayload => ({
  serviceId: 3170,
  serviceCode: "901",
  serviceType: "NEW",
  parentServiceId: null,
  documentType: "LICENSE",
  serviceName: null,
  applicant: {
    userId: "dcec0ec6-abb8-4c5a-94f0-c0c6697d40e7",
    profileId: 9571,
    userTypeId: 2,
    userTypeCode: "2",
    applicantKind: "Establishment",
    applicantType: "Establishment",
    profileState: "complete",
    hasProfile: true,
    currentUserTypeCode: "2",
    personId: null,
    establishmentId: 260,
    governmentTypeId: null,
    missingEstablishmentContext: false,
    promptCode: null,
  },
  documentInfo: {
    applicationId: 2172,
    applicationNumber: "ML-2-901-1155763",
    identifierLabel: "License Number",
    identifierValue: "2297988",
    showLicenseNumber: "1193847",
    issueDate: "2026-08-07T16:34:15",
    expiryDate: "2026-07-07T16:40:13",
    graceDays: null,
    penaltyApplies: true,
    expiredState: "penalty",
    detailRoute: "/my-requests/detail?id=2172",
  },
  inProgressInfo: {
    applicationId: 2172,
    applicationNumber: null,
    applicationStatus: null,
  },
  uiHints: {
    variant: "expired-penalty",
    requiredUserTypeCodes: ["99", "2", "3"],
    currentUserTypeCode: "2",
    hasQualifiedProfile: false,
    qualifyingProfiles: [],
  },
  results: [
    {
      rule: "C1",
      action: "Block",
      factSource: "LicensePermitIndex",
      reasonCode: "InProgressApplication",
      promptCode: "IN_PROGRESS_APPLICATION",
      targetServiceId: null,
      targetServiceCode: null,
    },
    {
      rule: "C2",
      action: "RedirectRenewal",
      factSource: "LicensePermitIndex+Services",
      reasonCode: "RedirectToRenewal",
      promptCode: "REDIRECT_TO_RENEWAL",
      targetServiceId: 3172,
      targetServiceCode: "902",
    },
  ],
  decision: {
    finalAction: "Block",
    allowed: false,
    action: "SHOW_IN_PROGRESS_MODAL",
    reasonCode: "InProgressApplication",
    promptCode: "IN_PROGRESS_APPLICATION",
    requiredApplicantType: "Establishment",
    targetServiceId: null,
    targetServiceCode: null,
    variables: null,
  },
});

const openGate = async (
  payload: ServiceEntryGatePayload,
  result: ServiceEntryGateDialogResult = { actionKey: "back" },
  onInProgressApplication?: () => void,
) => {
  const { history, pushes, replacements } = createHistory();
  let openedDialog: ServiceEntryGateDialogConfig | null = null;

  const gateResult = await openServiceGateWithPayload({
    history,
    payload,
    onInProgressApplication,
    openDialog: async (dialog) => {
      openedDialog = dialog;
      return result;
    },
  });

  return { gateResult, openedDialog, pushes, replacements };
};

test("uses the existing-application dialog for non-excluded in-progress statuses", async () => {
  for (const applicationStatus of ["PendingPayment", "UnderReview"]) {
    const { openedDialog } = await openGate(createPayload(applicationStatus));

    assert.ok(openedDialog);
    assert.equal(openedDialog.kind, "license-status");
    assert.equal(openedDialog.variant, "existing-application");
    assert.equal(openedDialog.title, "Existing Application Found");
    assert.equal(
      openedDialog.description,
      "An application for this service is already in progress. You cannot submit another application at this time.",
    );

    if (openedDialog.kind !== "license-status") {
      continue;
    }

    assert.equal(openedDialog.identifierLabel, "Application Number");
    assert.equal(openedDialog.identifierValue, "ML-1-6-3790319");
    assert.deepEqual(
      openedDialog.actions.map((action) => action.key),
      ["back", "view-details"],
    );
  }
});

test("preserves the backend decision for Completed and Draft statuses", async () => {
  for (const applicationStatus of [" completed ", "DRAFT"]) {
    const { openedDialog } = await openGate(createPayload(applicationStatus));

    assert.ok(openedDialog);
    assert.equal(openedDialog.variant, "existing-license");
  }
});

test("preserves the backend decision when the in-progress status is empty", async () => {
  for (const applicationStatus of [undefined, null, "   "]) {
    const { openedDialog } = await openGate(createPayload(applicationStatus));

    assert.ok(openedDialog);
    assert.equal(openedDialog.variant, "existing-license");
  }

  for (const inProgressInfo of [undefined, null]) {
    const payload = createPayload("PendingPayment");
    payload.inProgressInfo = inProgressInfo;
    const { openedDialog } = await openGate(payload);

    assert.ok(openedDialog);
    assert.equal(openedDialog.variant, "existing-license");
  }
});

test("does not block an allowed response with in-progress information", async () => {
  const { gateResult, openedDialog, pushes } = await openGate(
    createPayload("PendingPayment", "Allow"),
  );

  assert.equal(gateResult.allowed, true);
  assert.equal(openedDialog, null);
  assert.equal(
    pushes[0]?.path,
    "/services/media-license?serviceId=3120&serviceCode=6&serviceEntryGate=1",
  );
});

test("opens the real in-progress application detail route", async () => {
  const payload = createPayload("PendingPayment");
  payload.documentInfo = {
    applicationId: 999,
    detailRoute: "/permits-license?search=WRONG-DOCUMENT",
  };

  const { pushes } = await openGate(payload, {
    actionKey: "view-details",
  });

  assert.equal(pushes[0]?.path, "/my-requests/detail?id=578");
});

test("does not fall back to document details without a real in-progress application id", async () => {
  const payload = createPayload("PendingPayment");
  payload.inProgressInfo = {
    applicationNumber: "ML-1-6-3790319",
    applicationStatus: "PendingPayment",
  };
  payload.documentInfo = {
    applicationId: 999,
    detailRoute: "/permits-license?search=WRONG-DOCUMENT",
  };

  const { openedDialog } = await openGate(payload);

  assert.ok(openedDialog);
  assert.deepEqual(
    openedDialog.actions.map((action) => action.key),
    ["back"],
  );
});

test("prefers the expired-penalty renewal when the in-progress record is the source application", async () => {
  let inProgressCalls = 0;
  const { openedDialog, pushes } = await openGate(
    createConflictingExpiredRenewalPayload(),
    { actionKey: "pay-renew" },
    () => {
      inProgressCalls += 1;
    },
  );

  assert.ok(openedDialog);
  assert.equal(openedDialog.variant, "expired-penalty");
  assert.deepEqual(
    openedDialog.actions.map((action) => action.key),
    ["back", "pay-renew"],
  );
  assert.equal(
    pushes[0]?.path,
    "/services/media-license?serviceId=3172&serviceCode=902&actions=RENEW&serviceEntryGate=1",
  );
  assert.equal(useUpdateFormStore.getState().applicationId, 2172);
  assert.equal(inProgressCalls, 0);
});

test("replaces a conflicting direct URL with the expired-penalty renewal service", async () => {
  const payload = createConflictingExpiredRenewalPayload();
  const { history, pushes, replacements } = createHistory();
  let openedDialog: ServiceEntryGateDialogConfig | null = null;
  runtime.__serviceEntryGateGetResponses.set("/api/Service/3170/Check", {
    isSuccess: true,
    statusCode: 200,
    message: "Request successful",
    data: payload,
  });

  await ensureServiceEntryGateAccess({
    history,
    serviceId: 3170,
    serviceCode: "901",
    openDialog: async (dialog) => {
      openedDialog = dialog;
      return { actionKey: "pay-renew" };
    },
  });

  assert.ok(openedDialog);
  assert.equal(openedDialog.variant, "expired-penalty");
  assert.deepEqual(
    openedDialog.actions.map((action) => action.key),
    ["back", "pay-renew"],
  );
  assert.deepEqual(pushes, []);
  assert.equal(
    replacements[0]?.path,
    "/services/media-license?serviceId=3172&serviceCode=902&actions=RENEW&serviceEntryGate=1",
  );
  assert.equal(useUpdateFormStore.getState().applicationId, 2172);
});

test("preserves the in-progress block when it refers to another application", async () => {
  const payload = createConflictingExpiredRenewalPayload();
  let inProgressCalls = 0;
  payload.inProgressInfo = {
    ...payload.inProgressInfo,
    applicationId: 3627,
  };

  const { openedDialog, pushes } = await openGate(
    payload,
    { actionKey: "back" },
    () => {
      inProgressCalls += 1;
    },
  );

  assert.equal(openedDialog, null);
  assert.equal(inProgressCalls, 1);
  assert.deepEqual(pushes, []);
});

test("preserves the in-progress block without an explicit C2 renewal result", async () => {
  const payload = createConflictingExpiredRenewalPayload();
  let inProgressCalls = 0;
  payload.results = payload.results?.filter((result) => result.rule !== "C2");

  const { openedDialog, pushes } = await openGate(
    payload,
    { actionKey: "back" },
    () => {
      inProgressCalls += 1;
    },
  );

  assert.equal(openedDialog, null);
  assert.equal(inProgressCalls, 1);
  assert.deepEqual(pushes, []);
});

test("preserves the in-progress block when the C2 renewal target is invalid", async () => {
  const payload = createConflictingExpiredRenewalPayload();
  let inProgressCalls = 0;
  payload.results = payload.results?.map((result) =>
    result.rule === "C2" ? { ...result, targetServiceId: 0 } : result,
  );

  const { openedDialog, pushes } = await openGate(
    payload,
    { actionKey: "back" },
    () => {
      inProgressCalls += 1;
    },
  );

  assert.equal(openedDialog, null);
  assert.equal(inProgressCalls, 1);
  assert.deepEqual(pushes, []);
});

test("keeps a conflicting direct URL blocked for another in-progress application", async () => {
  const payload = createConflictingExpiredRenewalPayload();
  const { history, pushes, replacements } = createHistory();
  let openedDialog: ServiceEntryGateDialogConfig | null = null;
  payload.inProgressInfo = {
    ...payload.inProgressInfo,
    applicationId: 3627,
  };
  runtime.__serviceEntryGateGetResponses.set("/api/Service/3170/Check", {
    isSuccess: true,
    statusCode: 200,
    message: "Request successful",
    data: payload,
  });

  await ensureServiceEntryGateAccess({
    history,
    serviceId: 3170,
    serviceCode: "901",
    openDialog: async (dialog) => {
      openedDialog = dialog;
      return { actionKey: "back" };
    },
  });

  assert.ok(openedDialog);
  assert.equal(openedDialog.variant, "existing-application");
  assert.deepEqual(pushes, []);
  assert.deepEqual(replacements, []);
});
