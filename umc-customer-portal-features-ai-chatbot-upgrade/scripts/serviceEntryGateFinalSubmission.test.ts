import assert from "node:assert/strict";
import test from "node:test";
import type { ServiceEntryGateEnvelope } from "../src/services/services.ts";
import { useUserStore } from "../src/store/user.ts";
import * as serviceEntryGate from "../src/utils/serviceEntryGate.ts";

const runtime = globalThis as typeof globalThis & {
  __serviceEntryGateGetResponses: Map<string, unknown>;
  __serviceEntryGateRequests: Array<{
    method: string;
    url: string;
    params?: unknown;
    config?: { skipErrorToast?: boolean };
  }>;
};

runtime.__serviceEntryGateGetResponses ??= new Map();
runtime.__serviceEntryGateRequests ??= [];

const initialUserState = useUserStore.getState();
const originalConsoleError = console.error;
let loggedErrors: unknown[][] = [];
const checkFinalSubmissionServiceEntryGate = (
  serviceEntryGate as typeof serviceEntryGate & {
    checkFinalSubmissionServiceEntryGate?: (options: {
      serviceId: number;
      search?: string | null;
    }) => Promise<boolean>;
  }
).checkFinalSubmissionServiceEntryGate;

const createEnvelope = (
  finalAction: "Allow" | "Block" | "RedirectRenewal",
): ServiceEntryGateEnvelope => ({
  isSuccess: true,
  statusCode: 200,
  message: "Request successful",
  data: {
    serviceId: 3170,
    serviceCode: "901",
    serviceType: "NEW",
    parentServiceId: null,
    documentType: "LICENSE",
    applicant: null,
    results: [],
    documentInfo: null,
    inProgressInfo: null,
    uiHints: null,
    decision: {
      finalAction,
      allowed: finalAction === "Allow",
      targetServiceId: null,
      targetServiceCode: null,
    },
  },
});

test.beforeEach(() => {
  useUserStore.setState(initialUserState, true);
  useUserStore.getState().setCurrentProfileId("9353");
  runtime.__serviceEntryGateGetResponses.clear();
  runtime.__serviceEntryGateRequests.length = 0;
  loggedErrors = [];
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args);
  };
});

test.after(() => {
  console.error = originalConsoleError;
  useUserStore.setState(initialUserState, true);
});

test("checks the gate with suppressed request toasts when final submission gating is enabled", async () => {
  assert.equal(typeof checkFinalSubmissionServiceEntryGate, "function");
  runtime.__serviceEntryGateGetResponses.set(
    "/api/Service/3170/Check",
    createEnvelope("Allow"),
  );

  const allowed = await checkFinalSubmissionServiceEntryGate({
    serviceId: 3170,
    search: "?serviceEntryGate=1&actions=Duplicate",
  });

  assert.equal(allowed, true);
  assert.deepEqual(runtime.__serviceEntryGateRequests, [
    {
      method: "get",
      url: "/api/Service/3170/Check",
      params: {},
      config: { skipErrorToast: true },
    },
  ]);
});

test("uses the existing query rules before checking a final submission", async () => {
  assert.equal(typeof checkFinalSubmissionServiceEntryGate, "function");

  for (const search of [
    "",
    "?actions=Duplicate",
    "?serviceEntryGate=0",
    "?serviceEntryGate=disabled",
    "?serviceEntryGate=unexpected",
  ]) {
    const allowed = await checkFinalSubmissionServiceEntryGate({
      serviceId: 3170,
      search,
    });
    assert.equal(allowed, true, `expected Gate to be skipped for ${search}`);
  }

  assert.deepEqual(runtime.__serviceEntryGateRequests, []);
});

test("checks final submissions for the global profile even when the query disables the gate", async () => {
  assert.equal(typeof checkFinalSubmissionServiceEntryGate, "function");
  useUserStore.getState().setCurrentProfileId("0");
  runtime.__serviceEntryGateGetResponses.set(
    "/api/Service/3170/Check",
    createEnvelope("Allow"),
  );

  const allowed = await checkFinalSubmissionServiceEntryGate({
    serviceId: 3170,
    search: "?serviceEntryGate=0&actions=MODIFY",
  });

  assert.equal(allowed, true);
  assert.equal(runtime.__serviceEntryGateRequests.length, 1);
});

test("blocks every non-Allow final decision", async () => {
  assert.equal(typeof checkFinalSubmissionServiceEntryGate, "function");

  for (const finalAction of ["Block", "RedirectRenewal"] as const) {
    runtime.__serviceEntryGateGetResponses.set(
      "/api/Service/3170/Check",
      createEnvelope(finalAction),
    );

    const allowed = await checkFinalSubmissionServiceEntryGate({
      serviceId: 3170,
      search: "?serviceEntryGate=enabled",
    });

    assert.equal(allowed, false, `expected ${finalAction} to block submission`);
  }
});

test("fails closed for unsuccessful and malformed gate envelopes", async () => {
  assert.equal(typeof checkFinalSubmissionServiceEntryGate, "function");
  const invalidEnvelopes: unknown[] = [
    null,
    { isSuccess: false, statusCode: 409, data: null },
    { isSuccess: true, statusCode: 200, data: null },
    {
      isSuccess: true,
      statusCode: 200,
      data: { serviceId: 3170, decision: null },
    },
  ];

  for (const envelope of invalidEnvelopes) {
    runtime.__serviceEntryGateGetResponses.set(
      "/api/Service/3170/Check",
      envelope,
    );

    const allowed = await checkFinalSubmissionServiceEntryGate({
      serviceId: 3170,
      search: "?serviceEntryGate=true",
    });

    assert.equal(allowed, false);
  }

  assert.equal(loggedErrors.length, invalidEnvelopes.length);
});

test("fails closed when the gate request rejects", async () => {
  assert.equal(typeof checkFinalSubmissionServiceEntryGate, "function");
  runtime.__serviceEntryGateGetResponses.set(
    "/api/Service/3170/Check",
    Promise.reject(new Error("network unavailable")),
  );

  const allowed = await checkFinalSubmissionServiceEntryGate({
    serviceId: 3170,
    search: "?serviceEntryGate=on",
  });

  assert.equal(allowed, false);
  assert.equal(loggedErrors.length, 1);
});
