import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(path, "utf8");

const assertOpensBefore = (
  source,
  handlerStart,
  awaitedCall,
  openCall = "window.open",
) => {
  const handler = source.slice(source.indexOf(handlerStart));
  const openIndex = handler.indexOf(openCall);
  const awaitedCallIndex = handler.indexOf(awaitedCall);

  assert.notEqual(openIndex, -1, `${handlerStart} must open a payment window`);
  assert.notEqual(
    awaitedCallIndex,
    -1,
    `${handlerStart} must contain ${awaitedCall}`,
  );
  assert.ok(
    openIndex < awaitedCallIndex,
    `${handlerStart} must open the payment window before ${awaitedCall}`,
  );
};

test("payment entry points pre-open the gateway tab before asynchronous work", () => {
  const violationDetail = readSource(
    "src/pages/ViolationsFinesViolationDetail/index.tsx",
  );
  const violationResult = readSource(
    "src/pages/ViolationsFinesPaymentResult/index.tsx",
  );
  const violationList = readSource("src/pages/ViolationsFines/index.tsx");
  const myRequests = readSource("src/pages/my-requests/index.tsx");
  const cardPayment = readSource(
    "src/pages/Detail/CardPayment/useCardPayment.ts",
  );
  const requestDetail = readSource("src/pages/Detail/index.tsx");

  assertOpensBefore(
    violationDetail,
    "const handlePaymentMethodProceed = async () =>",
    "await createViolationFineCardPurchase",
    "openFinePaymentWindow",
  );
  assertOpensBefore(
    violationResult,
    "const handleTryAgain = async () =>",
    "await createViolationFineCardPurchase",
    "openFinePaymentWindow",
  );
  assertOpensBefore(
    violationList,
    "const startBatchPaymentPurchase = useCallback",
    "await createBatchedViolationFineCardPurchase",
  );
  assertOpensBefore(
    myRequests,
    "const startBatchPaymentPurchase = useCallback",
    "await validateServiceApplicationPayNow",
  );
  assertOpensBefore(
    cardPayment,
    "const handleCardPaymentPurchase = useCallback",
    "await validateServiceApplicationPayNow",
  );
  assertOpensBefore(
    requestDetail,
    "const handlePaymentMethodProceed = async () =>",
    "await getApplicationDetail",
  );
});

test("a manually closed pre-opened tab is not reported as opened", () => {
  const source = readSource("src/services/violationFine.ts");
  const finePaymentSource = readSource(
    "src/pages/ViolationsFines/utils/payment.ts",
  );
  const openPaymentPage = source.match(
    /const openPaymentPage = \([\s\S]*?\n};/,
  )?.[0];
  const navigateFinePaymentWindow = finePaymentSource.match(
    /export const navigateFinePaymentWindow = \([\s\S]*?\n};/,
  )?.[0];

  assert.ok(openPaymentPage, "openPaymentPage helper must exist");
  assert.match(openPaymentPage, /if \(paymentWindow\?\.closed\) return false;/);
  assert.ok(
    navigateFinePaymentWindow,
    "navigateFinePaymentWindow helper must exist",
  );
  assert.match(
    navigateFinePaymentWindow,
    /if \(paymentWindow\.closed\) return false;/,
  );
});

test("validated flows stop before purchase when the pre-opened tab was closed", () => {
  const payFines = readSource("src/pages/PayFines/index.tsx");
  const payFinesDetail = readSource("src/pages/PayFinesDetail/index.tsx");
  const myRequests = readSource("src/pages/my-requests/index.tsx");
  const cardPayment = readSource(
    "src/pages/Detail/CardPayment/useCardPayment.ts",
  );

  for (const [name, source, handlerStart, purchaseCall] of [
    ["PayFines", payFines, "const handlePayByCard = async () =>", "submitViolationFinePayment"],
    ["PayFinesDetail", payFinesDetail, "const handlePayFineByCard = async () =>", "submitViolationFinePayment"],
    ["my-requests", myRequests, "const startBatchPaymentPurchase = useCallback", "createBatchedServiceApplicationPurchase"],
    ["useCardPayment", cardPayment, "const handleCardPaymentPurchase = useCallback", "createServiceApplicationPurchase"],
  ]) {
    const handler = source.slice(source.indexOf(handlerStart));
    const closedIndex = handler.indexOf("if (paymentWindow.closed)");
    const purchaseIndex = handler.indexOf(purchaseCall);

    assert.notEqual(closedIndex, -1, `${name} must detect a closed payment tab`);
    assert.ok(
      closedIndex < purchaseIndex,
      `${name} must detect a closed payment tab before ${purchaseCall}`,
    );
  }
});
