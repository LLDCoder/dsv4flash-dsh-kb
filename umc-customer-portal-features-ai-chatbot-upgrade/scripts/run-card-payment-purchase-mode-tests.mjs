import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const server = await createServer({
  root: projectRoot,
  mode: "development",
  appType: "custom",
  logLevel: "error",
});

let exitCode = 0;

try {
  const purchaseModeModule = await server.ssrLoadModule(
    "/src/pages/Detail/CardPayment/purchaseMode.ts",
  );
  const { resolveCardPaymentPurchaseMode } = purchaseModeModule;
  const finePurchaseModeModule = await server.ssrLoadModule(
    "/src/pages/ViolationsFines/utils/payment.ts",
  );
  const { resolveFineCardPaymentPurchaseMode } = finePurchaseModeModule;

  assert.equal(typeof resolveCardPaymentPurchaseMode, "function");
  assert.equal(typeof resolveFineCardPaymentPurchaseMode, "function");

  assert.equal(resolveCardPaymentPurchaseMode(true), "merged");
  console.log("PASS selects merged purchase for a payable penalty");

  assert.equal(
    resolveCardPaymentPurchaseMode(false),
    "service-application",
  );
  console.log("PASS selects service application purchase without a penalty");

  assert.equal(resolveFineCardPaymentPurchaseMode(0), null);
  console.log("PASS prevents fine payment without a selection");

  assert.equal(resolveFineCardPaymentPurchaseMode(1), "single");
  console.log("PASS selects single fine purchase for one fine");

  assert.equal(resolveFineCardPaymentPurchaseMode(2), "batched");
  assert.equal(resolveFineCardPaymentPurchaseMode(5), "batched");
  console.log("PASS selects batched fine purchase for multiple fines");
} catch (error) {
  exitCode = 1;
  console.error("FAIL card payment purchase mode tests");
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  await server.close();
}

process.exit(exitCode);
