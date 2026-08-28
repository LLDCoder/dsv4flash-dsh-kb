import assert from "node:assert/strict";
import test from "node:test";
import {
  getRequestCount,
  getRequestedUrls,
  rejectRequest,
  resetRequestStub,
  resolveRequest,
} from "./fixtures/homePageRequestStub";
import {
  collectServiceList,
  getPendingActionCounts,
} from "../src/services/homePage";

test.beforeEach(() => {
  resetRequestStub();
});

test("deduplicates concurrent pending-action count requests", async () => {
  const first = getPendingActionCounts();
  const second = getPendingActionCounts();

  assert.equal(getRequestCount(), 1);
  resolveRequest(0, { data: [{ profileId: 1, count: 3 }] });

  assert.deepEqual(await first, { data: [{ profileId: 1, count: 3 }] });
  assert.deepEqual(await second, { data: [{ profileId: 1, count: 3 }] });
});

test("shares a concurrent failure and allows a later retry", async () => {
  const failure = new Error("pending counts failed");
  const first = getPendingActionCounts();
  const second = getPendingActionCounts();

  assert.equal(getRequestCount(), 1);
  rejectRequest(0, failure);

  await assert.rejects(first, failure);
  await assert.rejects(second, failure);
  assert.equal(getRequestCount(), 1);

  const retry = getPendingActionCounts();
  assert.equal(getRequestCount(), 2);
  resolveRequest(1, { data: [] });
  await retry;
});

test("does not share in-flight state with other home-page endpoints", async () => {
  const counts = getPendingActionCounts();
  const services = collectServiceList();

  assert.equal(getRequestCount(), 2);
  assert.deepEqual(getRequestedUrls(), [
    "/api/HomePage/PendingActionCounts",
    "/api/HomePage/CollectServiceList",
  ]);

  resolveRequest(0, { data: [] });
  resolveRequest(1, { data: [] });
  await Promise.all([counts, services]);
});
