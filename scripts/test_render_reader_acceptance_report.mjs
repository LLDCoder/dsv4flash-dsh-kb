import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { renderReport } from "./render_reader_acceptance_report.mjs";

test("renders the approved 40-group/120-step draft and ignores unlisted inputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "reader-report-"));
  try {
    await writeFile(join(root, "mock-results.jsonl"), JSON.stringify({ groupId: "D01", step: 1, answer: "must not load" }) + "\n");
    const result = await renderReport({ root, inputFiles: ["unknown.jsonl"], outputFile: join(root, "results.md") });
    assert.equal(result.groups, 40);
    assert.equal(result.steps, 120);
    assert.equal(result.submitted, 0);
    assert.doesNotMatch(await (await import("node:fs/promises")).readFile(join(root, "results.md"), "utf8"), /must not load/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects duplicate group-step records across explicitly selected files", async () => {
  const root = await mkdtemp(join(tmpdir(), "reader-report-duplicate-"));
  try {
    const record = JSON.stringify({ groupId: "D01", step: 1, answer: "one" }) + "\n";
    await writeFile(join(root, "officer-one.jsonl"), record);
    await writeFile(join(root, "officer-two.jsonl"), record);
    await assert.rejects(() => renderReport({ root, inputFiles: ["officer-one.jsonl", "officer-two.jsonl"], outputFile: join(root, "results.md") }), /duplicate live record: D01\.1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("counts submitted, graded, conditional, verification, and unexecuted separately", async () => {
  const root = await mkdtemp(join(tmpdir(), "reader-report-counts-"));
  try {
    const records = Array.from({ length: 9 }, (_, index) => ({ groupId: `D0${Math.floor(index / 3) + 1}`, step: (index % 3) + 1, question: `Q-${index}`, answer: `A-${index}`, conversationId: `conv-${index}` }));
    await writeFile(join(root, "officer-counts.jsonl"), records.map((record) => JSON.stringify(record)).join("\n") + "\n");
    const scores = { reviewer: "test", scores: {} };
    records.forEach((record, index) => { scores.scores[`${record.groupId}.${record.step}`] = index === 7 ? { score: null, function: "prerequisite_missing", reason: "sample unavailable" } : index === 8 ? { score: null, function: "verification_pending", reason: "needs review" } : { score: index % 3 === 0 ? 1 : 2, reason: "test fixture" }; });
    await writeFile(join(root, "scores.json"), JSON.stringify(scores));
    const result = await renderReport({ root, scoresFile: join(root, "scores.json"), inputFiles: ["officer-counts.jsonl"], outputFile: join(root, "results.md") });
    assert.equal(result.submitted, 9);
    assert.equal(result.graded, 7);
    assert.equal(result.conditional, 1);
    assert.equal(result.scorePending, 0);
    assert.equal(result.scoreTwo, 4);
    assert.equal(result.scoreOne, 3);
    assert.equal(result.scoreZero, 0);
    assert.equal(result.unsubmitted, 111);
    assert.equal(result.steps - result.submitted, 111);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
