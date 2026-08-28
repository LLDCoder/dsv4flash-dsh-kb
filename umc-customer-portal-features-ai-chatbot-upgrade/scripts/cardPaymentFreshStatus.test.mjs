import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [detailPage, cardPaymentHook] = await Promise.all([
  readSource("src/pages/Detail/index.tsx"),
  readSource("src/pages/Detail/CardPayment/useCardPayment.ts"),
]);

test("Pay Now refreshes the application and only opens for Pending Payment", () => {
  const handler = detailPage.match(
    /const handlePayNow = async \(\) => \{[\s\S]*?setPaymentMethodModalVisible\(true\);\s*\};/,
  )?.[0];

  assert.ok(handler);
  assert.match(handler, /await getApplicationDetail\(/);
  assert.match(handler, /latestStatusKey !== "pendingPayment"/);
  assert.match(handler, /getDetails\(\)/);
  assert.match(handler, /setPaymentMethodModalVisible\(true\)/);
});

test("failed payment validation refreshes detail and surfaces the backend message", () => {
  const catchBlock = cardPaymentHook.match(
    /catch \(error\) \{\s*console\.error\("Failed to create card payment:", error\);[\s\S]*?return false;\s*\}/,
  )?.[0];

  assert.ok(catchBlock);
  assert.match(catchBlock, /targetRefreshDetails\?\.\(\)/);
  assert.match(catchBlock, /cardPaymentMessage\("purchaseFailed"\)/);
});

test("all card payment purchase modes pass the final Pay Now validation gate", () => {
  const purchaseHandler = cardPaymentHook.match(
    /const handleCardPaymentPurchase = useCallback\([\s\S]*?\n  \);/,
  )?.[0];

  assert.ok(purchaseHandler);
  const validationIndex = purchaseHandler.indexOf(
    "await validateServiceApplicationPayNow",
  );
  const modeBranchIndex = purchaseHandler.indexOf(
    'if (purchaseMode === "merged")',
  );
  assert.ok(validationIndex >= 0);
  assert.ok(modeBranchIndex > validationIndex);
});

test("payment method modal closes after validation completes", () => {
  const proceedHandler = detailPage.match(
    /const handlePaymentMethodProceed = async \(\) => \{[\s\S]*?\n  \};/,
  )?.[0];

  assert.ok(proceedHandler);
  assert.match(proceedHandler, /await getApplicationDetail\(/);
  assert.match(proceedHandler, /paymentMethodProceedInFlightRef\.current/);
  assert.match(proceedHandler, /setPaymentMethodProceedLoading\(true\)/);
  assert.match(proceedHandler, /latestStatusKey !== "pendingPayment"/);
  assert.match(proceedHandler, /await handleCardPaymentPurchase\(\{/);
  assert.match(proceedHandler, /setPaymentMethodModalVisible\(false\)/);
});

test("payment progress displays the active transaction amount", () => {
  const progressModal = detailPage.match(
    /<CardPaymentProgressModal[\s\S]*?\/>/,
  )?.[0];

  assert.ok(progressModal);
  assert.match(progressModal, /cardPaymentContext\?\.amount/);
  assert.match(progressModal, /: paymentAmount/);
});
