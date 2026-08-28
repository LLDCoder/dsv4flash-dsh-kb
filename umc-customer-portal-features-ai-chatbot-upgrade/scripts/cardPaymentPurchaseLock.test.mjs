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
});

try {
  const { createCardPaymentPurchaseLock } = await server.ssrLoadModule(
    "/src/pages/Detail/CardPayment/purchaseLock.ts",
  );

  test("allows only one card payment purchase until the active attempt finishes", () => {
    const purchaseLock = createCardPaymentPurchaseLock();

    assert.equal(purchaseLock.tryAcquire(), true);
    assert.equal(purchaseLock.tryAcquire(), false);

    purchaseLock.release();

    assert.equal(purchaseLock.tryAcquire(), true);
  });
} finally {
  await server.close();
}
