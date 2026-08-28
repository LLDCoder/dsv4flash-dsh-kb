import assert from "node:assert/strict";
import test from "node:test";
import { orderHomeActions } from "../src/pages/Home/components/homeActionPriority.js";

test("orders actionable home items by priority and excludes rejected requests", () => {
  const result = orderHomeActions({
    pendingFines: ["fine"],
    pendingPayments: ["payment"],
    renewalsWithin7Days: ["renewal-7"],
    renewalsWithin30Days: ["renewal-30"],
    pendingModifications: ["modification"],
    rejected: ["rejected"],
    drafts: ["draft"],
  });

  assert.deepEqual(result, [
    "fine",
    "payment",
    "renewal-7",
    "renewal-30",
    "modification",
    "draft",
  ]);
});
