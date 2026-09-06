/** Render the parent-owned acceptance scores and explicitly approved run logs. */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseReviewedGroups } from "./run_reader_question_review.mjs";

const ROOT = resolve(import.meta.dirname, "../doc/admin-portal-reader/acceptance-2026-09-06");
const REVIEW = resolve(import.meta.dirname, "../doc/admin-portal-reader/dashboard-licensing-question-review.md");
const DEFAULT_FILES = ["officer-smoke.jsonl", "officer-dashboard.jsonl", "officer-licensing.jsonl", "officer-detail-repair.jsonl", "officer-date-repair.jsonl", "manager-dashboard.jsonl", "manager-licensing.jsonl", "denied-dashboard.jsonl", "denied-licensing.jsonl"];

const oneLine = (value, max = 4000) => {
  const text = String(value ?? "").replace(/[\r\n]+/g, " / ").replace(/\|/g, "\\|");
  return text.length > max ? `${text.slice(0, max - 19)}...[内容已截断]` : text;
};
const keyFor = (groupId, step) => `${groupId}.${step}`;

function parseExpected(markdown) {
  const expected = new Map();
  let groupId = "";
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^###\s+([DL]\d{2})\s+/);
    if (heading) groupId = heading[1];
    if (!groupId || !/^\|/.test(line) || /^\|\s*-+/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length >= 3 && /^\d+$/.test(cells[0])) expected.set(keyFor(groupId, Number(cells[0])), cells[2]);
  }
  return expected;
}

function parseScores(raw) {
  const parsed = JSON.parse(raw);
  return {
    values: parsed?.scores && typeof parsed.scores === "object" ? parsed.scores : {},
    selectedConversations: parsed?.selectedConversations && typeof parsed.selectedConversations === "object" ? parsed.selectedConversations : {},
    summary: parsed?.summary && typeof parsed.summary === "string" ? parsed.summary : "",
  };
}

async function loadJsonl(path) {
  const raw = await readFile(path, "utf8");
  return raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch { throw new Error(`invalid JSONL at ${path}:${index + 1}`); }
  });
}

function classify(record, score) {
  if (!record || !record.groupId) return "unexecuted";
  if (record.skipped) return "skipped";
  if (score && score.score !== null && score.score !== undefined) return "graded";
  if (score?.function === "prerequisite_missing") return "conditional";
  if (score?.function === "verification_pending") return "verification_pending";
  return "score_pending";
}

export async function renderReport({ root = ROOT, reviewFile = REVIEW, outputFile = resolve(ROOT, "results.md"), inputFiles = DEFAULT_FILES, scoresFile = resolve(ROOT, "scores.json") } = {}) {
  const groups = parseReviewedGroups(await readFile(reviewFile, "utf8"), { runId: "REPORT" });
  const expectedByKey = parseExpected(await readFile(reviewFile, "utf8"));
  if (groups.length !== 40 || groups.reduce((sum, group) => sum + group.questions.length, 0) !== 120) throw new Error("review draft must contain exactly 40 groups and 120 steps");
  const scoreDoc = parseScores(await readFile(scoresFile, "utf8"));
  const scores = scoreDoc.values;
  const recordsByKey = new Map();
  for (const filename of inputFiles) {
    if (!/^(officer|manager|denied)-[^/]+\.jsonl$/.test(filename)) continue;
    let lines;
    try { lines = await loadJsonl(resolve(root, filename)); } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const record of lines) {
      const key = keyFor(record.groupId, record.step);
      const bucket = recordsByKey.get(key) || [];
      bucket.push(record);
      recordsByKey.set(key, bucket);
    }
  }
  let retryExcluded = 0;
  const byKey = new Map();
  for (const [key, bucket] of recordsByKey) {
    if (bucket.length === 1) { byKey.set(key, bucket[0]); continue; }
    const selectedConversation = scoreDoc.selectedConversations[key] || scoreDoc.selectedConversations[bucket[0].groupId];
    if (!selectedConversation) throw new Error(`duplicate live record: ${key}`);
    const selected = bucket.find((record) => record.conversationId === selectedConversation);
    if (!selected) throw new Error(`selected conversation missing for duplicate: ${key}`);
    byKey.set(key, selected);
    retryExcluded += bucket.length - 1;
  }
  const records = [...byKey.values()];
  const rows = [];
  let submitted = 0, skipped = 0, conditional = 0, verificationPending = 0, scorePending = 0, graded = 0, gradedMax = 0, gradedSum = 0;
  let scoreTwo = 0, scoreOne = 0, scoreZero = 0;
  const moduleStats = { Dashboard: { submitted: 0, graded: 0, sum: 0, two: 0 }, Licensing: { submitted: 0, graded: 0, sum: 0, two: 0 } };
  for (const group of groups) {
    rows.push(`### ${group.groupId} ${oneLine(group.title, 220)}`);
    rows.push("");
    rows.push("| 步骤 | 原题 | 预期 | 实际回答 | 分数 | 原因 | 对话 |");
    rows.push("| --- | --- | --- | --- | ---: | --- | --- |");
    for (const step of group.questions) {
      const key = keyFor(group.groupId, step.step);
      const record = byKey.get(key);
      const score = scores[key];
      if (record && !record.skipped) { submitted += 1; moduleStats[group.area].submitted += 1; }
      const status = classify(record || {}, score);
      if (status === "skipped") skipped += 1;
      if (status === "conditional") conditional += 1;
      if (status === "verification_pending") verificationPending += 1;
      if (status === "score_pending" && record && !record.skipped) scorePending += 1;
      if (status === "graded") {
        graded += 1; gradedSum += Number(score.score); gradedMax += 2; moduleStats[group.area].graded += 1; moduleStats[group.area].sum += Number(score.score);
        if (Number(score.score) === 2) { scoreTwo += 1; moduleStats[group.area].two += 1; }
        else if (Number(score.score) === 1) scoreOne += 1;
        else if (Number(score.score) === 0) scoreZero += 1;
      }
      const expected = expectedByKey.get(key) || "见审核稿预期";
      const answer = record ? (record.answer || (record.skipped ? `未执行：${record.skipReason || "前提不足"}` : "（无回答）")) : "未执行";
      const scoreText = status === "graded" ? String(score.score) : status === "conditional" ? "条件不足" : status === "skipped" || status === "unexecuted" ? "未执行" : status === "verification_pending" ? "待核实" : "待评分";
      const reason = score?.reason || record?.skipReason || (record ? "主 Agent 尚未评分" : "无运行记录");
      const conversation = record?.conversationId ? `\`${oneLine(record.conversationId, 100)}\`` : "-";
      rows.push(`| ${step.step} | ${oneLine(record?.question || step.question)} | ${oneLine(expected)} | ${oneLine(answer)} | ${scoreText} | ${oneLine(reason)} | ${conversation} |`);
    }
    rows.push("");
  }
  const noRecord = 120 - recordsByKey.size;
  const unsubmitted = 120 - submitted;
  const unsubmittedPrerequisite = groups.flatMap((group) => group.questions.map((step) => ({ ...step, groupId: group.groupId }))).filter((step) => !byKey.has(keyFor(step.groupId, step.step)) && scores[keyFor(step.groupId, step.step)]?.function === "prerequisite_missing").length;
  const scoreRate = gradedMax ? `${gradedSum}/${gradedMax} (${((gradedSum / gradedMax) * 100).toFixed(1)}%)` : "0/0 (未形成可评分分母)";
  const report = [
    "# Dashboard / Licensing 多轮验收结果",
    "",
    `生成时间：${new Date().toISOString()}。本报告仅汇总明确列出的真实 JSONL；未列入的文件（包括 mock 输出）不参与统计。`,
    "",
    `- 总覆盖：120 步；已提交 ${submitted}；未提交 ${unsubmitted}（跳过 ${skipped}，无运行记录 ${noRecord}，其中前提不足评分标记 ${unsubmittedPrerequisite}）。`,
    `- 已提交状态：可评分 ${graded}，前提不足 ${conditional}，待核实 ${verificationPending}，待评分 ${scorePending}。`,
    `- 分数分布（仅 parent-owned scores.json）：2 分 ${scoreTwo}，1 分 ${scoreOne}，0 分 ${scoreZero}；可评分得分率 ${scoreRate}。`,
    `- 提交覆盖率：${submitted}/120 (${((submitted / 120) * 100).toFixed(1)}%)。Dashboard：已提交 ${moduleStats.Dashboard.submitted}/60，已评分 ${moduleStats.Dashboard.graded}/60，2 分 ${moduleStats.Dashboard.two}。Licensing：已提交 ${moduleStats.Licensing.submitted}/60，已评分 ${moduleStats.Licensing.graded}/60，2 分 ${moduleStats.Licensing.two}。`,
    `- 分模块得分：Dashboard ${moduleStats.Dashboard.sum}/${moduleStats.Dashboard.graded * 2}；Licensing ${moduleStats.Licensing.sum}/${moduleStats.Licensing.graded * 2}。分母仅包含可评分步骤，不能代表未执行或前提不足的步骤通过。`,
    "- 模块覆盖：Dashboard 20 组、Licensing 20 组；每组固定展示原题、预期、实际回答和主 Agent 评分，不以百分比替代组覆盖。",
    "- 对话编号仅作为本地审计定位 ID；未验证审计 UI 深链接，因此不生成 URL。",
    `- 重试记录排除：${retryExcluded} 条（仅按 parent-owned selectedConversations 选择，不按得分择优）。`,
    scoreDoc.summary ? `- 主 Agent 汇总：${oneLine(scoreDoc.summary)}` : "",
    "- 运行说明与版本指纹：[验收 README](README.md)。工作区与运行网关差异及只读约束以 README 记录为准。",
    "- 验证备注：[verification-notes.md](verification-notes.md)。",
    "",
    ...rows,
  ].join("\n");
  await writeFile(outputFile, report, "utf8");
  return { outputFile, groups: groups.length, steps: 120, submitted, unsubmitted, skipped, noRecord, unsubmittedPrerequisite, conditional, verificationPending, scorePending, graded, scoreTwo, scoreOne, scoreZero, gradedSum, gradedMax };
}

if (import.meta.main) {
  renderReport().then((summary) => console.log(JSON.stringify(summary))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
