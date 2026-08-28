import assert from "node:assert/strict";
import test from "node:test";
import { mapViolationFineBatchPaymentStatus } from "../src/services/violationFineBatchPaymentStatus.ts";
import {
  arePaymentReceiptsReady,
  hasMatchingReceiptReferences,
  shouldRetainPendingPaymentContext,
} from "../src/pages/PayFines/paymentContext.ts";

const processingItem = {
  violationNo: "VN-2026-6245331",
  transactionNo: "202608162235301858",
  amount: 160000,
  currencyCode: "AED",
  paymentStatus: "PAID",
  failureReason: null,
  receiptId: "receipt-1.pdf",
  receiptFileName: "RCT-202608162235301858.pdf",
  receiptDownloadUrl: "/api/public/pay-fines/receipts/receipt-1.pdf",
};

test("keeps a captured batch processing until backend final confirmation", () => {
  const result = mapViolationFineBatchPaymentStatus({
    success: true,
    isFinalConfirmed: false,
    batchTransactionNo: "BATCH-001",
    transactionNo: "BATCH-001",
    gatewayStatus: "CAPTURED",
    statusId: 2,
    paymentStatus: "PROCESSING",
    receiptsReady: false,
    items: [processingItem],
  });

  assert.equal(result.status, "processing");
  assert.equal(result.success, false);
  assert.equal(result.transactionNo, "BATCH-001");
  assert.equal(result.receiptsReady, false);
  assert.deepEqual(result.receipts, []);
});

test("maps a final paid batch and all item receipts", () => {
  const result = mapViolationFineBatchPaymentStatus({
    success: true,
    isFinalConfirmed: true,
    batchTransactionNo: "BATCH-001",
    transactionNo: "BATCH-001",
    gatewayStatus: "CAPTURED",
    statusId: 3,
    paymentStatus: "PAID",
    receiptsReady: true,
    items: [
      processingItem,
      {
        violationNo: "VN-2026-9810997",
        transactionNo: "202608162235306013",
        amount: 20000,
        currencyCode: "AED",
        paymentStatus: "PAID",
        failureReason: null,
        receiptId: "receipt-2.pdf",
        receiptFileName: "RCT-202608162235306013.pdf",
        receiptDownloadUrl: "/api/public/pay-fines/receipts/receipt-2.pdf",
      },
    ],
  });

  assert.equal(result.status, "success");
  assert.equal(result.success, true);
  assert.equal(result.transactionNo, "BATCH-001");
  assert.equal(result.receiptsReady, true);
  assert.deepEqual(
    result.receipts?.map((receipt) => ({
      fineReferenceNumber: receipt.fineReferenceNumber,
      transactionNo: receipt.transactionNo,
      receiptId: receipt.receiptId,
    })),
    [
      {
        fineReferenceNumber: "VN-2026-6245331",
        transactionNo: "202608162235301858",
        receiptId: "receipt-1.pdf",
      },
      {
        fineReferenceNumber: "VN-2026-9810997",
        transactionNo: "202608162235306013",
        receiptId: "receipt-2.pdf",
      },
    ],
  );
});

test("maps only a backend-confirmed failed batch as terminal failure", () => {
  const result = mapViolationFineBatchPaymentStatus({
    success: false,
    isFinalConfirmed: true,
    batchTransactionNo: "BATCH-002",
    transactionNo: "BATCH-002",
    gatewayStatus: "FAILED",
    statusId: 4,
    paymentStatus: "FAILED",
    receiptsReady: false,
    failureReason: "Payment was declined.",
    items: [],
  });

  assert.equal(result.status, "failed");
  assert.equal(result.success, false);
  assert.equal(result.transactionNo, "BATCH-002");
  assert.equal(result.message, undefined);
});

test("retains payment recovery identifiers until delayed receipts are ready", () => {
  assert.equal(shouldRetainPendingPaymentContext("success", false), true);
  assert.equal(shouldRetainPendingPaymentContext("success", true), false);
  assert.equal(shouldRetainPendingPaymentContext("failed", false), false);
});

test("rejects a status response whose authentication identifiers do not match", () => {
  assert.throws(
    () =>
      mapViolationFineBatchPaymentStatus(
        {
          success: true,
          isFinalConfirmed: true,
          batchTransactionNo: "BATCH-001",
          paymentId: "PAYMENT-WRONG",
          correlationId: "BATCH-001",
          statusId: 3,
          paymentStatus: "PAID",
          receiptsReady: true,
          items: [processingItem],
        },
        {
          batchTransactionNo: "BATCH-001",
          paymentId: "PAYMENT-001",
          correlationId: "BATCH-001",
        },
      ),
    /identifiers do not match/i,
  );
});

test("accepts receipts only when every expected fine has one unique receipt", () => {
  assert.equal(
    hasMatchingReceiptReferences(
      ["VN-001", "VN-002"],
      [
        { fineReferenceNumber: "VN-002" },
        { fineReferenceNumber: "VN-001" },
      ],
    ),
    true,
  );
  assert.equal(
    hasMatchingReceiptReferences(
      ["VN-001", "VN-002"],
      [
        { fineReferenceNumber: "VN-001" },
        { fineReferenceNumber: "VN-001" },
      ],
    ),
    false,
  );
  assert.equal(
    hasMatchingReceiptReferences(
      ["VN-001", "VN-002"],
      [{ fineReferenceNumber: "VN-001" }],
    ),
    false,
  );
});

test("does not trust the ready flag without a complete receipt set", () => {
  assert.equal(
    arePaymentReceiptsReady(true, ["VN-001", "VN-002"], [
      { fineReferenceNumber: "VN-001" },
    ]),
    false,
  );
  assert.equal(
    arePaymentReceiptsReady(true, ["VN-001", "VN-002"], [
      { fineReferenceNumber: "VN-001" },
      { fineReferenceNumber: "VN-002" },
    ]),
    true,
  );
});
