import assert from "node:assert/strict";
import test from "node:test";
import {
  mapInquiryToPaymentResult,
  parsePaymentResultSearch,
} from "../src/pages/PaymentResult/paymentResultState.ts";
import { PaymentResultPollingController } from "../src/pages/PaymentResult/paymentResultPolling.ts";
import {
  createPaymentResultReturnUrl,
  runPaymentResultReceiptRequest,
} from "../src/pages/PaymentResult/paymentResultRequest.ts";
import { resolveAuthenticatedLoginRedirectPath } from "../src/pages/Login/loginRedirect.ts";
import { buildLoginUrl } from "../src/utils/loginUrl.ts";
import {
  clearPendingLoginRedirect,
  readPendingLoginRedirect,
  savePendingLoginRedirect,
} from "../src/utils/pendingLoginRedirect.ts";

test("accepts only the documented payment-result transaction number format", () => {
  assert.deepEqual(parsePaymentResultSearch("?transactionNo=A"), {
    transactionNo: "A",
    source: null,
  });
  assert.deepEqual(
    parsePaymentResultSearch(`?transactionNo=${"A".repeat(64)}`),
    { transactionNo: "A".repeat(64), source: null },
  );
  assert.deepEqual(
    parsePaymentResultSearch("?transactionNo=TXN_2026-08&src=return"),
    { transactionNo: "TXN_2026-08", source: "return" },
  );
  assert.deepEqual(
    parsePaymentResultSearch("?transactionNo=ABC123&src=unsupported"),
    { transactionNo: "ABC123", source: null },
  );
  assert.equal(parsePaymentResultSearch("?transactionNo="), null);
  assert.equal(parsePaymentResultSearch("?transactionNo=bad%20value"), null);
  assert.equal(
    parsePaymentResultSearch(
      "?transactionNo=%3Cscript%3Ealert%281%29%3C%2Fscript%3E",
    ),
    null,
  );
  assert.equal(
    parsePaymentResultSearch(`?transactionNo=${"A".repeat(65)}`),
    null,
  );
});

test("maps inquiry responses through the backend confirmation gate", () => {
  const transactionNo = "TXN-100";

  assert.equal(
    mapInquiryToPaymentResult({ success: false, isFinalConfirmed: true, statusId: 3 }, transactionNo).kind,
    "CHECKING",
  );
  assert.equal(
    mapInquiryToPaymentResult({ success: true, isFinalConfirmed: false, statusId: 3 }, transactionNo).kind,
    "CHECKING",
  );
  assert.equal(
    mapInquiryToPaymentResult({ success: true, isFinalConfirmed: true, statusId: "3" }, transactionNo).kind,
    "SUCCESS",
  );
  assert.equal(
    mapInquiryToPaymentResult({ success: true, isFinalConfirmed: true, statusId: 4 }, transactionNo).kind,
    "FAILED",
  );
  assert.equal(
    mapInquiryToPaymentResult({ success: true, isFinalConfirmed: true, statusId: 2 }, transactionNo).kind,
    "UNCONFIRMED",
  );
});

test("preserves only a safe payment-result return URL after login", () => {
  assert.equal(
    resolveAuthenticatedLoginRedirectPath(
      "?returnUrl=%2Fpayment%2Fresult%3FtransactionNo%3DTXN_123%26src%3Dreturn",
    ),
    "/payment/result?transactionNo=TXN_123&src=return",
  );
  assert.equal(
    resolveAuthenticatedLoginRedirectPath(
      "?returnUrl=https%3A%2F%2Fevil.example%2Fpayment%2Fresult",
    ),
    "/home",
  );
  assert.equal(
    resolveAuthenticatedLoginRedirectPath("?returnUrl=%2Fpayments"),
    "/home",
  );
  assert.equal(
    resolveAuthenticatedLoginRedirectPath(
      "?returnUrl=%2F%2Fevil.example%2Fpayment%2Fresult%3FtransactionNo%3DTXN_123",
    ),
    "/home",
  );
  assert.equal(
    resolveAuthenticatedLoginRedirectPath(
      "?returnUrl=javascript%3Aalert%281%29",
    ),
    "/home",
  );
  assert.equal(
    resolveAuthenticatedLoginRedirectPath(
      "?returnUrl=%2F%5Cevil.example%2Fpayment%2Fresult%3FtransactionNo%3DTXN_123",
    ),
    "/home",
  );
});

test("polls again after a non-final response and stops on success", async () => {
  const scheduled: Array<{ callback: () => void; delay: number }> = [];
  const states: string[] = [];
  let calls = 0;
  const controller = new PaymentResultPollingController({
    transactionNo: "TXN-200",
    inquire: async () => {
      calls += 1;
      return calls === 1
        ? { success: true, isFinalConfirmed: false, statusId: 2 }
        : { success: true, isFinalConfirmed: true, statusId: 3 };
    },
    onState: (state) => states.push(state.kind),
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return callback;
    },
    cancelSchedule: () => undefined,
  });

  controller.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.deepEqual(states, ["CHECKING"]);
  assert.equal(scheduled[0]?.delay, 3000);

  scheduled.shift()?.callback();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(calls, 2);
  assert.deepEqual(states, ["CHECKING", "SUCCESS"]);
  assert.equal(scheduled.length, 0);
});

test("backs off inquiry errors, pauses while hidden, and expires at the deadline", async () => {
  const scheduled: Array<{ callback: () => void; delay: number }> = [];
  const states: string[] = [];
  let now = 0;
  let calls = 0;
  const controller = new PaymentResultPollingController({
    transactionNo: "TXN-300",
    inquire: async () => {
      calls += 1;
      throw new Error("network");
    },
    onState: (state) => states.push(state.kind),
    now: () => now,
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return callback;
    },
    cancelSchedule: (handle) => {
      const index = scheduled.findIndex((item) => item.callback === handle);
      if (index >= 0) scheduled.splice(index, 1);
    },
    deadlineMs: 9000,
  });

  controller.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(scheduled[0]?.delay, 3000);

  controller.setVisible(false);
  assert.equal(scheduled.length, 0);
  controller.setVisible(true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(calls, 2);
  assert.equal(scheduled[0]?.delay, 6000);

  now = 9000;
  scheduled.shift()?.callback();
  await Promise.resolve();
  assert.deepEqual(states, ["CHECKING", "CHECKING", "UNCONFIRMED"]);
  assert.equal(calls, 2);
});

test("manual refresh performs one inquiry without starting another payment poll", async () => {
  const scheduled: Array<{ callback: () => void; delay: number }> = [];
  const states: string[] = [];
  const controller = new PaymentResultPollingController({
    transactionNo: "TXN-400",
    inquire: async () => ({
      success: true,
      isFinalConfirmed: false,
      statusId: 2,
    }),
    onState: (state) => states.push(state.kind),
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return callback;
    },
    cancelSchedule: () => undefined,
  });

  controller.refresh();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(states, ["UNCONFIRMED"]);
  assert.equal(scheduled.length, 0);
});

test("never schedules the next inquiry beyond the three-minute deadline", async () => {
  const scheduled: Array<{ callback: () => void; delay: number }> = [];
  let now = 178000;
  const controller = new PaymentResultPollingController({
    transactionNo: "TXN-500",
    inquire: async () => ({
      success: true,
      isFinalConfirmed: false,
      statusId: 2,
    }),
    onState: () => undefined,
    now: () => now,
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return callback;
    },
    cancelSchedule: () => undefined,
  });

  controller.start();
  now = 356000;
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(scheduled[0]?.delay, 2000);
});

test("caps repeated inquiry error backoff at thirty seconds", async () => {
  const scheduled: Array<{ callback: () => void; delay: number }> = [];
  const controller = new PaymentResultPollingController({
    transactionNo: "TXN-600",
    inquire: async () => {
      throw new Error("network");
    },
    onState: () => undefined,
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return callback;
    },
    cancelSchedule: () => undefined,
  });

  controller.start();
  const observedDelays: number[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await Promise.resolve();
    await Promise.resolve();
    const next = scheduled.shift();
    assert.ok(next);
    observedDelays.push(next.delay);
    next.callback();
  }

  assert.deepEqual(observedDelays, [3000, 6000, 12000, 24000, 30000, 30000]);
  controller.stop();
});

test("stop aborts an in-flight inquiry and prevents a stale state update", async () => {
  let capturedSignal: AbortSignal | null = null;
  let resolveInquiry: ((value: {
    success: boolean;
    isFinalConfirmed: boolean;
    statusId: number;
  }) => void) | null = null;
  const states: string[] = [];
  const controller = new PaymentResultPollingController({
    transactionNo: "TXN-700",
    inquire: (signal) => {
      capturedSignal = signal;
      return new Promise((resolve) => {
        resolveInquiry = resolve;
      });
    },
    onState: (state) => states.push(state.kind),
  });

  controller.start();
  controller.stop();
  assert.equal(capturedSignal?.aborted, true);
  assert.ok(resolveInquiry);
  resolveInquiry({ success: true, isFinalConfirmed: true, statusId: 3 });
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(states, []);
});

test("a 404 inquiry response becomes an invalid-link terminal state", async () => {
  const states: string[] = [];
  const scheduled: Array<unknown> = [];
  const controller = new PaymentResultPollingController({
    transactionNo: "TXN-404",
    inquire: async () => {
      const error = new Error("not found") as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    },
    onState: (state) => states.push(state.kind),
    schedule: (callback) => {
      scheduled.push(callback);
      return callback;
    },
    cancelSchedule: () => undefined,
  });

  controller.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(states, ["INVALID_LINK"]);
  assert.equal(scheduled.length, 0);
});

test("a 401 inquiry stops polling and preserves the payment result return URL", async () => {
  const scheduled: Array<unknown> = [];
  const returnUrls: string[] = [];
  const controller = new PaymentResultPollingController({
    transactionNo: "TXN-401",
    inquire: async () => {
      const error = new Error("unauthorized") as Error & {
        response: { status: number };
      };
      error.response = { status: 401 };
      throw error;
    },
    onState: () => undefined,
    onUnauthorized: () => {
      returnUrls.push(
        createPaymentResultReturnUrl(
          "/payment/result",
          "?transactionNo=TXN-401&src=return",
        ),
      );
    },
    schedule: (callback) => {
      scheduled.push(callback);
      return callback;
    },
    cancelSchedule: () => undefined,
  });

  controller.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(returnUrls, [
    "/payment/result?transactionNo=TXN-401&src=return",
  ]);
  assert.equal(scheduled.length, 0);
});

test("a 401 receipt request redirects through login without showing a download error", async () => {
  let unauthorizedCalls = 0;
  let downloadCalls = 0;
  const result = await runPaymentResultReceiptRequest({
    signal: new AbortController().signal,
    loadDetail: async () => {
      const error = new Error("unauthorized") as Error & { statusCode: number };
      error.statusCode = 401;
      throw error;
    },
    download: async () => {
      downloadCalls += 1;
    },
    onUnauthorized: () => {
      unauthorizedCalls += 1;
    },
  });

  assert.equal(result, "unauthorized");
  assert.equal(unauthorizedCalls, 1);
  assert.equal(downloadCalls, 0);
});

test("an aborted receipt request cannot start a stale download", async () => {
  const abortController = new AbortController();
  let resolveDetail: ((value: { hasReceipt: boolean }) => void) | null = null;
  let downloadCalls = 0;
  const receiptPromise = runPaymentResultReceiptRequest({
    signal: abortController.signal,
    loadDetail: () =>
      new Promise((resolve) => {
        resolveDetail = resolve;
      }),
    download: async () => {
      downloadCalls += 1;
    },
    onUnauthorized: () => undefined,
  });

  abortController.abort();
  assert.ok(resolveDetail);
  resolveDetail({ hasReceipt: true });
  assert.equal(await receiptPromise, "aborted");
  assert.equal(downloadCalls, 0);
});

test("authenticated logout can encode the payment result return URL", () => {
  assert.equal(
    buildLoginUrl({ idleSessionLogout: true }),
    "/login?idleSessionLogout=1",
  );
  assert.equal(
    buildLoginUrl({
      returnUrl: "/payment/result?transactionNo=TXN_401&src=return",
    }),
    "/login?returnUrl=%2Fpayment%2Fresult%3FtransactionNo%3DTXN_401%26src%3Dreturn",
  );
});

test("UAE PASS logout can restore a validated payment path after the external round trip", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as Storage;
  const returnUrl = "/payment/result?transactionNo=TXN_UAE_401&src=return";

  savePendingLoginRedirect(returnUrl, storage, 1000);
  assert.equal(readPendingLoginRedirect(storage, 2000), returnUrl);
  assert.equal(
    resolveAuthenticatedLoginRedirectPath("", (value) => value, returnUrl),
    returnUrl,
  );
  assert.equal(readPendingLoginRedirect(storage, 30 * 60 * 1000 + 1001), null);

  savePendingLoginRedirect("https://evil.example/payment/result", storage, 3000);
  assert.equal(readPendingLoginRedirect(storage, 3001), null);
  assert.equal(
    resolveAuthenticatedLoginRedirectPath(
      "",
      (value) => value,
      "//evil.example/payment/result?transactionNo=TXN_UAE_401",
    ),
    "/home",
  );

  savePendingLoginRedirect(returnUrl, storage, 4000);
  clearPendingLoginRedirect(storage);
  assert.equal(readPendingLoginRedirect(storage, 4001), null);

  const unavailableStorage = {
    getItem: () => {
      throw new DOMException("Storage unavailable", "SecurityError");
    },
    setItem: () => {
      throw new DOMException("Storage unavailable", "SecurityError");
    },
    removeItem: () => {
      throw new DOMException("Storage unavailable", "SecurityError");
    },
  } as unknown as Storage;
  assert.doesNotThrow(() =>
    savePendingLoginRedirect(returnUrl, unavailableStorage, 5000),
  );
  assert.equal(readPendingLoginRedirect(unavailableStorage, 5001), null);
  assert.doesNotThrow(() => clearPendingLoginRedirect(unavailableStorage));
});
