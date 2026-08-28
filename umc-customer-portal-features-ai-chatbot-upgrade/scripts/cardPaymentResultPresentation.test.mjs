import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const {
  resolveCardPaymentResultMessageKey,
  resolveCardPaymentSuccessPresentation,
} = await server.ssrLoadModule("/src/pages/Detail/CardPayment/utils.ts");

const readResource = async (language) =>
  JSON.parse(
    await readFile(
      path.join(projectRoot, "src/localization/myRequests", `${language}.json`),
      "utf8",
    ),
  );

const readSource = (relativePath) =>
  readFile(path.join(projectRoot, relativePath), "utf8");

test.after(async () => {
  await server.close();
});

test("cancelled payments use the dedicated processed-result message", () => {
  assert.equal(typeof resolveCardPaymentResultMessageKey, "function");
  assert.equal(
    resolveCardPaymentResultMessageKey("cancelled"),
    "myRequestsPage.cardPayment.messages.cancelledResult",
  );
});

test("confirmed cancellation reaches the result page with the shared message", async () => {
  const [hookSource, failurePageSource] = await Promise.all([
    readSource("src/pages/Detail/CardPayment/useCardPayment.ts"),
    readSource(
      "src/pages/Detail/CardPayment/CardPaymentFailurePage/index.tsx",
    ),
  ]);

  assert.doesNotMatch(
    hookSource,
    /resolution\.status === "cancelled" && onCardPaymentCancelled/,
  );
  assert.match(hookSource, /setCardPaymentStatus\(resolution\.status\)/);
  assert.match(hookSource, /reason: resultMessage/);
  assert.match(
    failurePageSource,
    /const resultDescription = details\?\.reason \|\| message;/,
  );
});

test("content-service payment success hides the document action", () => {
  assert.equal(typeof resolveCardPaymentSuccessPresentation, "function");
  assert.deepEqual(
    resolveCardPaymentSuccessPresentation(true),
    {
      descriptionKey:
        "myRequestsPage.paymentSuccess.contentServiceDescription",
      showViewDocument: false,
    },
  );
});

test("non-content payment success preserves the license presentation", () => {
  assert.equal(typeof resolveCardPaymentSuccessPresentation, "function");
  assert.deepEqual(
    resolveCardPaymentSuccessPresentation(false),
    {
      descriptionKey: null,
      showViewDocument: true,
    },
  );
});

test("payment result copy is paired in English and Arabic", async () => {
  const [english, arabic] = await Promise.all([
    readResource("en"),
    readResource("ar"),
  ]);

  assert.equal(
    english.cardPayment.messages.cancelledResult,
    "The payment cannot be processed right now. Please try again.",
  );
  assert.equal(
    arabic.cardPayment.messages.cancelledResult,
    "يتعذر معالجة عملية الدفع حاليًا. يُرجى المحاولة مرة أخرى.",
  );
  assert.equal(
    english.paymentSuccess.contentServiceDescription,
    "Thank you for your payment. Your application will be processed within the applicable timeline.",
  );
  assert.equal(
    arabic.paymentSuccess.contentServiceDescription,
    "شكرًا لإتمام عملية الدفع. ستتم معالجة طلبك ضمن الإطار الزمني المعمول به.",
  );
});
