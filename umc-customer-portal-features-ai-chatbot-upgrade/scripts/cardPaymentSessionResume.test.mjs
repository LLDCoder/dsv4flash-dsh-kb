import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const server = await createServer({
  root: projectRoot,
  configFile: false,
  mode: "development",
  appType: "custom",
  logLevel: "error",
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
});

try {
  const { resolveCardPaymentSessionRecovery } =
    await server.ssrLoadModule(
      "/src/pages/Detail/CardPayment/sessionResume.ts",
    );

  const hostedSession = {
    applicationId: 2344,
    transactionNo: "202608121954223272",
    hostedPaymentPageUrl: "https://example.test/card-payment",
  };

  test("reopens the hosted page only after inquiry confirms processing", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: true,
        isFinalConfirmed: false,
        transactionNo: "202608121954223272",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954223272",
        gatewayStatus: "PRESENTED",
        statusId: 2,
        status: "PROCESSING",
        failureReason: null,
        errorCode: null,
        errorMessage: null,
        customMessage: "Payment is awaiting user action.",
      }),
      {
        type: "open-hosted-page",
        hostedPaymentPageUrl: "https://example.test/card-payment",
      },
    );
  });

  test("runs inquiry polling for a confirmed processing session without a hosted page", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(
        {
          applicationId: 2344,
          transactionNo: "202608121954223272",
        },
        2344,
        {
          success: true,
          isFinalConfirmed: false,
          transactionNo: "202608121954223272",
          referenceNumber: "ML-2-14-5507572",
          paymentId: "20260812155422651976",
          tranId: undefined,
          correlationId: "202608121954223272",
          gatewayStatus: "PRESENTED",
          statusId: 2,
          status: "PROCESSING",
          failureReason: null,
          errorCode: null,
          errorMessage: null,
          customMessage: "Payment is awaiting user action.",
        },
      ),
      { type: "run-inquiry" },
    );
  });

  test("retains the session when inquiry cannot confirm its status", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: false,
        isFinalConfirmed: false,
        transactionNo: "202608121954223272",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954223272",
        gatewayStatus: "PRESENTED",
        statusId: 2,
        status: "PROCESSING",
        failureReason: null,
        errorCode: "INQUIRY_TEMPORARILY_UNAVAILABLE",
        errorMessage: "Inquiry is temporarily unavailable.",
        customMessage: null,
      }),
      { type: "retain-session" },
    );
  });

  test("discards a session only when the backend says the transaction is missing", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: false,
        isFinalConfirmed: false,
        transactionNo: "202608121954223272",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954223272",
        gatewayStatus: null,
        statusId: null,
        status: null,
        failureReason: null,
        errorCode: "TRANSACTION_NOT_FOUND",
        errorMessage: "Unable to locate the requested transaction.",
        customMessage: null,
      }),
      { type: "discard-session" },
    );
  });

  test("discards a session when the backend returns the transaction-not-found error code", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: false,
        isFinalConfirmed: false,
        transactionNo: "202608121954223272",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954223272",
        gatewayStatus: null,
        statusId: null,
        status: null,
        failureReason: null,
        errorCode: "TRANSACTION_NOT_FOUND",
        errorMessage: "The inquiry could not be completed.",
        customMessage: null,
      }),
      { type: "discard-session" },
    );
  });

  test("retains a session for a generic requested-transaction validation error", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: false,
        isFinalConfirmed: false,
        transactionNo: "202608121954223272",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954223272",
        gatewayStatus: null,
        statusId: null,
        status: null,
        failureReason: null,
        errorCode: "INQUIRY_VALIDATION_FAILED",
        errorMessage: "Failed to validate requested transaction details.",
        customMessage: null,
      }),
      { type: "retain-session" },
    );
  });

  test("does not reopen a transaction already confirmed as completed", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: true,
        isFinalConfirmed: true,
        transactionNo: "202608121954223272",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954223272",
        gatewayStatus: "CAPTURED",
        statusId: 3,
        status: "COMPLETED",
        failureReason: null,
        errorCode: null,
        errorMessage: null,
        customMessage: "Payment confirmed.",
      }),
      { type: "final", status: "success" },
    );
  });

  test("retains the session when inquiry returns another transaction number", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: true,
        isFinalConfirmed: false,
        transactionNo: "202608121954229999",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954229999",
        gatewayStatus: "PRESENTED",
        statusId: 2,
        status: "PROCESSING",
        failureReason: null,
        errorCode: null,
        errorMessage: null,
        customMessage: "Payment is awaiting user action.",
      }),
      { type: "retain-session" },
    );
  });

  test("retains the session when inquiry has no explicit processing state", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: true,
        isFinalConfirmed: undefined,
        transactionNo: "202608121954223272",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954223272",
        gatewayStatus: null,
        statusId: null,
        status: null,
        failureReason: null,
        errorCode: null,
        errorMessage: null,
        customMessage: null,
      }),
      { type: "retain-session" },
    );
  });

  test("retains the session when a 200 response has no inquiry payload", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, undefined),
      { type: "retain-session" },
    );
  });

  test("retains the session when final confirmation conflicts with processing status", () => {
    assert.deepEqual(
      resolveCardPaymentSessionRecovery(hostedSession, 2344, {
        success: true,
        isFinalConfirmed: true,
        transactionNo: "202608121954223272",
        referenceNumber: "ML-2-14-5507572",
        paymentId: "20260812155422651976",
        tranId: undefined,
        correlationId: "202608121954223272",
        gatewayStatus: "PRESENTED",
        statusId: 2,
        status: "PROCESSING",
        failureReason: null,
        errorCode: null,
        errorMessage: null,
        customMessage: null,
      }),
      { type: "retain-session" },
    );
  });

  test("does not recover a missing, invalid, or cross-application session", () => {
    const processingInquiry = {
      success: true,
      isFinalConfirmed: false,
      transactionNo: "202608121954223272",
      referenceNumber: "ML-2-14-5507572",
      paymentId: "20260812155422651976",
      tranId: undefined,
      correlationId: "202608121954223272",
      gatewayStatus: "PRESENTED",
      statusId: 2,
      status: "PROCESSING",
      failureReason: null,
      errorCode: null,
      errorMessage: null,
      customMessage: "Payment is awaiting user action.",
    };

    assert.equal(
      resolveCardPaymentSessionRecovery(null, 2344, processingInquiry),
      null,
    );
    assert.equal(
      resolveCardPaymentSessionRecovery(
        { ...hostedSession, transactionNo: "" },
        2344,
        processingInquiry,
      ),
      null,
    );
    assert.equal(
      resolveCardPaymentSessionRecovery(
        { ...hostedSession, applicationId: 311 },
        2344,
        processingInquiry,
      ),
      null,
    );
  });
} finally {
  await server.close();
}
