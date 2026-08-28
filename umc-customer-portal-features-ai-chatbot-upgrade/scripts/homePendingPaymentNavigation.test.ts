import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const homeUtilsSource = readFileSync(resolve("src/pages/Home/utils.ts"), "utf8");
const homeActionSource = readFileSync(
  resolve("src/pages/Home/components/HomeAction.tsx"),
  "utf8",
);

test("uses a shared request-detail search builder for Home pending-payment navigation", () => {
  assert.match(
    homeUtilsSource,
    /export function buildHomeRequestDetailSearch\([\s\S]*?params\.set\("action", action\)[\s\S]*?return `\?\$\{params\.toString\(\)\}`;/,
  );
});

test("passes payNow from the Home pending-payment action to request details", () => {
  assert.match(
    homeActionSource,
    /search: buildHomeRequestDetailSearch\([\s\S]*?APPLICATION_STATUS_ID\.pendingPayment[\s\S]*?"payNow"/,
  );
});
