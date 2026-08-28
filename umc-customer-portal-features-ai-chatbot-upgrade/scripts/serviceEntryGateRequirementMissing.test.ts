import assert from "node:assert/strict";
import test from "node:test";
import type { History } from "history";
import type { ServiceEntryGateDialogConfig } from "../src/components/ServiceEntryGate/types.ts";
import type {
  ServiceEntryGateDecisionVariables,
  ServiceEntryGatePayload,
} from "../src/services/services.ts";
import { useServicesStore } from "../src/store/services.ts";
import { useUserStore } from "../src/store/user.ts";
import { openServiceGateWithPayload } from "../src/utils/serviceEntryGate.ts";

const initialUserState = useUserStore.getState();
const initialServicesState = useServicesStore.getState();

test.afterEach(() => {
  useUserStore.setState(initialUserState, true);
  useServicesStore.setState(initialServicesState, true);
  localStorage.clear();
});

const createPayload = (
  variables: ServiceEntryGateDecisionVariables,
): ServiceEntryGatePayload => ({
  serviceId: 4000,
  serviceCode: "1002",
  serviceType: "NEW",
  parentServiceId: null,
  documentType: "LICENSE",
  applicant: {
    profileId: 9353,
    applicantType: "Establishment",
    profileState: "complete",
    hasProfile: true,
  },
  results: [
    {
      rule: "C6",
      action: "Block",
      factSource: "PrerequisiteConfig+LicensePermitIndex",
      reasonCode: "PREREQUISITE_MISSING",
      promptCode: "PREREQUISITE_MISSING",
      targetServiceId: null,
      targetServiceCode: null,
    },
  ],
  decision: {
    finalAction: "Block",
    allowed: false,
    action: "SHOW_REQUIREMENT_MISSING_MODAL",
    reasonCode: "PREREQUISITE_MISSING",
    promptCode: "PREREQUISITE_MISSING",
    requiredApplicantType: "Establishment",
    targetServiceId: null,
    targetServiceCode: null,
    variables,
  },
});

const openGate = async (payload: ServiceEntryGatePayload) => {
  let openedDialog: ServiceEntryGateDialogConfig | null = null;
  const history = {
    location: { search: "?serviceEntryGate=1" },
    push: () => undefined,
    replace: () => undefined,
  } as unknown as History;

  const gateResult = await openServiceGateWithPayload({
    history,
    payload,
    openDialog: async (dialog) => {
      openedDialog = dialog;
      return { actionKey: "ok" };
    },
  });

  return { gateResult, openedDialog };
};

test("shows only the media-license activity requirement when no prerequisite services are missing", async () => {
  const { openedDialog } = await openGate(
    createPayload({
      requirementDescription:
        "An active Media License with one of the required activities.",
    }),
  );

  assert.ok(openedDialog);
  assert.deepEqual(openedDialog.orderedItems, [
    "An active Media License with one of the required activities.",
  ]);
});

test("shows a missing prerequisite service without a media-license activity requirement", async () => {
  const { openedDialog } = await openGate(
    createPayload({
      missingPrerequisiteServices: [
        {
          serviceCode: "2201",
          serviceName: "Cinematic Film Age Classification Permit",
          description: "Completed Cinematic Film Age Classification Permit",
        },
      ],
    }),
  );

  assert.ok(openedDialog);
  assert.deepEqual(openedDialog.orderedItems, [
    "Completed Cinematic Film Age Classification Permit",
  ]);
});

test("shows the media-license activity before missing prerequisite services", async () => {
  const { openedDialog } = await openGate(
    createPayload({
      requirementDescription:
        "An active Media License with one of the required activities.",
      missingPrerequisiteServices: [
        {
          serviceCode: "2201",
          serviceName: "Cinematic Film Age Classification Permit",
          description: "Completed Cinematic Film Age Classification Permit",
        },
      ],
    }),
  );

  assert.ok(openedDialog);
  assert.deepEqual(openedDialog.orderedItems, [
    "An active Media License with one of the required activities.",
    "Completed Cinematic Film Age Classification Permit",
  ]);
});

test("shows every missing prerequisite service in backend order", async () => {
  const { openedDialog } = await openGate(
    createPayload({
      missingPrerequisiteServices: [
        {
          serviceCode: "1002",
          serviceName: "Cinematic Film Screening and Ticket Sale Permit",
          description:
            "Completed Cinematic Film Screening and Ticket Sale Permit",
        },
        {
          serviceCode: "1001",
          serviceName: "Film Screening Permit",
          description: "Completed Film Screening Permit",
        },
      ],
    }),
  );

  assert.ok(openedDialog);
  assert.deepEqual(openedDialog.orderedItems, [
    "Completed Cinematic Film Screening and Ticket Sale Permit",
    "Completed Film Screening Permit",
  ]);
});

test("keeps duplicate prerequisite descriptions as separate requirements", async () => {
  const { openedDialog } = await openGate(
    createPayload({
      missingPrerequisiteServices: [
        {
          serviceCode: "2201",
          description: "Completed shared prerequisite",
        },
        {
          serviceCode: "2202",
          description: "Completed shared prerequisite",
        },
      ],
    }),
  );

  assert.ok(openedDialog);
  assert.deepEqual(openedDialog.orderedItems, [
    "Completed shared prerequisite",
    "Completed shared prerequisite",
  ]);
});

test("ignores missing prerequisite entries without a non-empty description", async () => {
  const { openedDialog } = await openGate(
    createPayload({
      missingPrerequisiteServices: [
        null,
        {
          serviceCode: "2201",
          serviceName: "Cinematic Film Age Classification Permit",
          description: null,
        },
        {
          serviceCode: "2202",
          serviceName: "Video Game Age Classification Permit",
          description: "   ",
        },
        {
          serviceCode: "21",
          serviceName: "Media License",
          description: "Completed Media License",
        },
      ],
    }),
  );

  assert.ok(openedDialog);
  assert.deepEqual(openedDialog.orderedItems, ["Completed Media License"]);
});

test("keeps the existing payload fallback when decision variables contain no requirements", async () => {
  const payload = createPayload({
    requirementDescription: "   ",
    missingPrerequisiteServices: [],
  });
  payload.requiredParentServiceCode = "Legacy prerequisite service";

  const { openedDialog } = await openGate(payload);

  assert.ok(openedDialog);
  assert.deepEqual(openedDialog.orderedItems, ["Legacy prerequisite service"]);
});

test("ignores a non-array missing-prerequisite value", async () => {
  const payload = createPayload({
    missingPrerequisiteServices: {
      description: "Malformed prerequisite value",
    },
  } as unknown as ServiceEntryGateDecisionVariables);
  payload.requiredParentServiceCode = "Legacy prerequisite service";

  const { openedDialog } = await openGate(payload);

  assert.ok(openedDialog);
  assert.deepEqual(openedDialog.orderedItems, ["Legacy prerequisite service"]);
});

test("does not treat requirement variables as a blocker for an allowed decision", async () => {
  const payload = createPayload({
    missingPrerequisiteServices: [
      {
        serviceCode: "2201",
        serviceName: "Cinematic Film Age Classification Permit",
        description: "Completed Cinematic Film Age Classification Permit",
      },
    ],
  });
  payload.decision = {
    finalAction: "Allow",
    allowed: true,
    variables: payload.decision?.variables ?? null,
  };

  const { gateResult, openedDialog } = await openGate(payload);

  assert.equal(gateResult.allowed, true);
  assert.equal(openedDialog, null);
});
