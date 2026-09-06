import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { boundedEvidence, parseReviewedGroups, runGroups } from "./run_reader_question_review.mjs";

test("retains source versions from early-failure traces without copying arbitrary trace payloads", () => {
  const result = boundedEvidence({ qualityTrace: [{
    stage: "knowledge_retrieval", status: "passed", output: {
      sourceNames: Array.from({ length: 10 }, (_, i) => `Manual-v${i}.md`),
      chunkContent: "Do not retain the source body", token: "private-token",
    },
  }] });
  assert.equal(result.qualityTrace[0].sourceNames.length, 8);
  assert.equal(result.qualityTrace[0].sourceNames[0], "Manual-v0.md");
  assert.ok(!JSON.stringify(result).includes("private-token"));
  assert.ok(!JSON.stringify(result).includes("Do not retain"));
});

const LEGACY_REVIEW_FILE = new URL("../doc/admin-portal-reader/dashboard-licensing-question-review.md", import.meta.url);
const BASIC_REVIEW_FILE = new URL("../doc/admin-portal-reader/basic-modules-2026-09-06/questions-review.md", import.meta.url);

test("records bounded read health and selected state without URL secrets or extra rows", () => {
  const result = boundedEvidence({ observation: {
    readHealth: { healthy: false, blocked: Array(30).fill("https://user:secret@example.test/api/Records/List?token=private#secret"), cookie: "private" },
    sectionSummaries: Array(12).fill({ nodeId: "table-1", heading: "Records", selectedState: "Completed", rowSummaries: ["row-secret"], html: "<secret>" }),
  } });
  assert.deepEqual(result.observation.readHealth, { healthy: false, blocked: ["/api/Records/List"] });
  assert.equal(result.observation.sections.length, 8);
  assert.equal(result.observation.sections[0].selectedState, "Completed");
  assert.equal(result.observation.sections[0].observedRowSampleCount, 1);
  assert.doesNotMatch(JSON.stringify(result), /private|secret|example.test/);
});

test("parses the basic corpus as 20 unique groups with 60 exact steps", async () => {
  const groups = parseReviewedGroups(await readFile(BASIC_REVIEW_FILE, "utf8"));
  assert.equal(groups.length, 20);
  assert.equal(new Set(groups.map((group) => group.groupId)).size, 20);
  assert.equal(groups.flatMap((group) => group.questions).length, 60);
  assert.deepEqual([...new Set(groups.map((group) => group.area))], ["Customer Happiness", "Content", "Inspection", "Finance"]);
  assert(groups.every((group) => group.questions.map((question) => question.step).join(",") === "1,2,3"));
  assert(groups.every((group) => group.questions.every((question) => question.question && question.expectedOutcome)));
  assert.deepEqual(groups.find((group) => group.groupId === "IN02")?.preconditions, ["仅当当前会话确认 Inspection Manager 具有 Team Tasks 权限且页面布局匹配时执行本组；本组不是 Inspector 的基线流程。"]);
});

test("keeps the legacy Dashboard and Licensing corpus at 40 groups and 120 steps", async () => {
  const groups = parseReviewedGroups(await readFile(LEGACY_REVIEW_FILE, "utf8"), { runId: "legacy-run" });
  assert.equal(groups.length, 40);
  assert.equal(groups.flatMap((group) => group.questions).length, 120);
  assert.deepEqual([...new Set(groups.map((group) => group.area))], ["Dashboard", "Licensing"]);
  assert.deepEqual(groups.find((group) => group.groupId === "D01")?.questions.map((question) => question.step), [1, 2, 3]);
  assert.equal(groups.find((group) => group.groupId === "L08")?.questions[0].question, "Search Profile Verification for QA-NO-MATCH-legacy-run.");
});

test("fails closed for malformed numbered groups and duplicate group or step identifiers", () => {
  const basicHeader = "## Customer Happiness\n\n### CH01 Example\n\n";
  assert.throws(
    () => parseReviewedGroups(`${basicHeader}1. **Question:** First\n   **Expected outcome:** First result\n2. **Question:** Second\n   **Expected outcome:** Second result\n3. **Question:** Third`),
    /missing Expected outcome for CH01 step 3/,
  );
  assert.throws(
    () => parseReviewedGroups(`${basicHeader}1. **Question:** First\n   **Expected outcome:** First result\n1. **Question:** Duplicate\n   **Expected outcome:** Duplicate result\n3. **Question:** Third\n   **Expected outcome:** Third result`),
    /duplicate step 1 in CH01/,
  );
  assert.throws(
    () => parseReviewedGroups(`${basicHeader}1. **Question:** First\n   **Expected outcome:** First result\n2. **Question:** Second\n   **Expected outcome:** Second result\n3. **Question:** Third\n   **Expected outcome:** Third result\n\n### CH01 Again\n\n1. **Question:** First\n   **Expected outcome:** First result\n2. **Question:** Second\n   **Expected outcome:** Second result\n3. **Question:** Third\n   **Expected outcome:** Third result`),
    /duplicate group CH01/,
  );
});

test("records basic outcomes and preconditions without sending them to the Reader", async () => {
  const originalFetch = globalThis.fetch;
  const postedContent = [];
  let seq = 0;
  const events = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname;
    if (path === "/api/v1/conversations" && init.method === "POST") return Response.json({ conversationId: "conv_basic", lastSeq: 0 });
    if (path.endsWith("/messages")) {
      postedContent.push(JSON.parse(init.body).content);
      seq += 1;
      events.push({ seq, eventType: "assistant.message", data: { content: `answer-${seq}` } }, { seq: seq + 1, eventType: "turn.completed", data: {} });
      seq += 1;
      return Response.json({ accepted: true, conversationId: "conv_basic", seq });
    }
    if (path.endsWith("/history")) return Response.json({ events });
    if (path.endsWith("/audit")) return Response.json({ items: [] });
    throw new Error(`unexpected mock path ${path}`);
  };
  const directory = await mkdtemp(join(tmpdir(), "reader-review-basic-"));
  const reviewFile = join(directory, "basic.md");
  try {
    await writeFile(reviewFile, `## Customer Happiness\n\n### CH01 Example\n\n**工程前置条件：** Permission is confirmed.\n\n1. **Question:** First question\n   **Expected outcome:** First expected result\n2. **Question:** Second question\n   **Expected outcome:** Second expected result\n3. **Question:** Third question\n   **Expected outcome:** Third expected result\n`);
    const result = await runGroups({ token: "secret-token", userId: "user-1", groupIds: ["CH01"], outputFile: join(directory, "out.jsonl"), reviewFile, currentGetUserInfo: async () => ({ id: "user-1" }) });
    assert.deepEqual(postedContent, ["First question", "Second question", "Third question"]);
    assert.deepEqual(result.results[0].preconditions, ["Permission is confirmed."]);
    assert.equal(result.results[0].expectedOutcome, "First expected result");
    const output = await readFile(join(directory, "out.jsonl"), "utf8");
    assert.match(output, /First expected result/);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  }
});

test("runs all three steps in one conversation and isolates each cursor", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let seq = 0;
  const events = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const path = new URL(url).pathname;
    if (path === "/api/v1/conversations" && init.method === "POST") return Response.json({ conversationId: "conv_test", lastSeq: 0 });
    if (path.endsWith("/messages")) {
      seq += 1;
      events.push({ seq, eventType: "user.message", data: {} }, { seq: seq + 1, eventType: "assistant.message", data: { content: `answer-${seq}` } }, { seq: seq + 2, eventType: "turn.completed", data: {} });
      seq += 2;
      return Response.json({ accepted: true, conversationId: "conv_test", seq });
    }
    if (path.endsWith("/history")) {
      return Response.json({ events });
    }
    if (path.endsWith("/audit")) return Response.json({ items: [] });
    throw new Error(`unexpected mock path ${path}`);
  };
  const directory = await mkdtemp(join(tmpdir(), "reader-review-"));
  try {
    const result = await runGroups({ token: "secret-token", userId: "user-1", groupIds: ["D01"], outputFile: join(directory, "out.jsonl"), currentGetUserInfo: async () => ({ data: { id: "user-1" } }) });
    assert.equal(result.steps, 3);
    assert.equal(new Set(result.results.map((item) => item.conversationId)).size, 1);
    assert.deepEqual(result.results.map((item) => item.answer), ["answer-1", "answer-4", "answer-7"]);
    const output = await readFile(join(directory, "out.jsonl"), "utf8");
    assert.match(output, /answer-7/);
    assert.match(output, /Give me a brief overview of my Dashboard/);
    assert.doesNotMatch(output, /secret-token/);
    assert.equal(calls.filter((call) => call.url.endsWith("/messages")).length, 3);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects non-local targets before making a request", async () => {
  await assert.rejects(() => runGroups({ token: "secret-token", userId: "user-1", groupIds: ["D01"], baseUrl: "http://localhost:8000", currentGetUserInfo: async () => ({ id: "user-1" }) }), /local Admin DSH API/);
});

test("requires identity verification and rejects mismatches", async () => {
  await assert.rejects(
    () => runGroups({ token: "secret-token", userId: "user-1", groupIds: ["D01"], currentGetUserInfo: async () => ({ data: { id: "other-user" } }) }),
    /identity mismatch/,
  );
});

test("stops the batch after a terminal runtime error", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const path = new URL(url).pathname;
    if (path === "/api/v1/conversations" && init.method === "POST") return Response.json({ conversationId: "conv_error", lastSeq: 0 });
    if (path.endsWith("/messages")) return Response.json({ accepted: true, conversationId: "conv_error", seq: 1 });
    if (path.endsWith("/history")) return Response.json({ events: [{ seq: 1, eventType: "runtime.error", data: { code: "mock" } }] });
    throw new Error(`unexpected mock path ${path}`);
  };
  const directory = await mkdtemp(join(tmpdir(), "reader-review-error-"));
  try {
    const result = await runGroups({ token: "secret-token", userId: "user-1", groupIds: ["D01", "D02"], outputFile: join(directory, "out.jsonl"), currentGetUserInfo: async () => ({ id: "user-1" }) });
    assert.equal(result.stopped, true);
    assert.equal(result.stopReason, "runtime.error");
    assert.equal(calls.filter((call) => call.url.endsWith("/conversations") && call.init.method === "POST").length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  }
});

test("skips a prerequisite step without posting it and preserves its question", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let seq = 0;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const path = new URL(url).pathname;
    if (path === "/api/v1/conversations" && init.method === "POST") return Response.json({ conversationId: "conv_skip", lastSeq: 0 });
    if (path.endsWith("/messages")) { seq += 3; return Response.json({ accepted: true, conversationId: "conv_skip", seq }); }
    if (path.endsWith("/history")) return Response.json({ events: [{ seq, eventType: "assistant.message", data: { content: "ok" } }, { seq: seq + 1, eventType: "turn.completed", data: {} }] });
    if (path.endsWith("/audit")) return Response.json({ items: [] });
    throw new Error(`unexpected mock path ${path}`);
  };
  const directory = await mkdtemp(join(tmpdir(), "reader-review-skip-"));
  try {
    const result = await runGroups({ token: "secret-token", userId: "user-1", groupIds: ["D01"], outputFile: join(directory, "out.jsonl"), currentGetUserInfo: async () => ({ id: "user-1" }), beforeStep: ({ step }) => step.step === 2 ? { skip: true, reason: "no record" } : undefined });
    assert.equal(result.results.filter((item) => item.skipped).length, 1);
    assert.equal(calls.filter((call) => call.url.endsWith("/messages")).length, 2);
    assert.match(await readFile(join(directory, "out.jsonl"), "utf8"), /How many tasks are there in each category/);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  }
});
