/**
 * Run the reviewed Dashboard/Licensing question groups through the DSH REST
 * conversation API. The UMC token is supplied by the caller and is never
 * serialized, logged, or included in returned objects.
 *
 * This module intentionally has no CLI token option. Import runGroups() and
 * pass the already-authenticated token in memory from the approved runner.
 */
import { mkdir, readFile, appendFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const REVIEW_FILE = resolve(import.meta.dirname, "../doc/admin-portal-reader/dashboard-licensing-question-review.md");
const DEFAULT_OUTPUT = resolve(import.meta.dirname, "../doc/admin-portal-reader/acceptance-2026-09-06/results.jsonl");
const DEFAULT_BASE_URL = "http://localhost:8001";
const TERMINAL_EVENTS = new Set(["turn.completed", "runtime.error", "turn.cancelled"]);
const MAX_ANSWER_CHARS = 4000;
const MAX_FACT_CHARS = 400;
const MAX_FACTS = 24;
const MAX_MISSING = 24;
const DEFAULT_USER_INFO_ENDPOINT = "https://umc-adminportal.sol.daypop.ai/api/AdminUser/GetUserInfo";

function requireLocalBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "http:" || parsed.hostname !== "localhost" || parsed.port !== "8001") {
    throw new Error("runner only permits the local Admin DSH API at http://localhost:8001");
  }
  return parsed.origin;
}

function replaceRunId(value, runId) {
  return String(value).replaceAll("{RUN_ID}", runId);
}

const LEGACY_GROUP_ID = /^([DL]\d{2})$/;

function finalizeReviewedGroup(group) {
  if (group.pendingQuestion) {
    throw new Error(`missing Expected outcome for ${group.groupId} step ${group.pendingQuestion.step}`);
  }
  delete group.pendingQuestion;
  const expectedSteps = [1, 2, 3];
  const actualSteps = group.questions.map((question) => question.step).sort((left, right) => left - right);
  if (actualSteps.length !== expectedSteps.length || actualSteps.some((step, index) => step !== expectedSteps[index])) {
    throw new Error(`group ${group.groupId} must contain exactly steps 1, 2, and 3`);
  }
  return group;
}

function parseReviewedGroups(markdown, { runId = `review-${new Date().toISOString().replace(/[-:.TZ]/g, "")}` } = {}) {
  const lines = markdown.split(/\r?\n/);
  const groups = [];
  let currentArea = "";
  let current = null;
  for (const line of lines) {
    const area = line.match(/^##\s+(Dashboard|Licensing|Customer Happiness|Content|Inspection|Finance)\b/);
    if (area) currentArea = area[1];
    const heading = line.match(/^###\s+((?:[DL]|CH|CT|IN|FN)\d{2})\s+(.+?)\s*$/);
    if (heading) {
      if (current) groups.push(finalizeReviewedGroup(current));
      current = {
        groupId: heading[1],
        area: currentArea,
        title: heading[2],
        questions: [],
        preconditions: [],
        format: LEGACY_GROUP_ID.test(heading[1]) ? "legacy_table" : "numbered_questions",
      };
      continue;
    }
    if (!current) continue;

    if (current.format === "legacy_table") {
      if (!/^\|/.test(line) || /^\|\s*-+/.test(line)) continue;
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      if (!/^\d+$/.test(cells[0] || "")) continue;
      if (cells.length < 2 || !cells[1]) throw new Error(`malformed question table row for ${current.groupId}`);
      const step = Number(cells[0]);
      if (current.questions.some((question) => question.step === step)) throw new Error(`duplicate step ${step} in ${current.groupId}`);
      current.questions.push({
        step,
        question: replaceRunId(cells[1], runId),
        ...(cells[2] ? { expectedOutcome: cells[2] } : {}),
      });
      continue;
    }

    const precondition = line.match(/^\s*\*\*(?:工程)?前置条件[：:]\*\*\s*(.+?)\s*$/u);
    if (precondition) {
      current.preconditions.push(precondition[1]);
      continue;
    }
    const numberedQuestion = line.match(/^\s*(\d+)\.\s+\*\*Question:\*\*\s*(.*?)\s*$/);
    if (numberedQuestion) {
      if (current.pendingQuestion) throw new Error(`missing Expected outcome for ${current.groupId} step ${current.pendingQuestion.step}`);
      const step = Number(numberedQuestion[1]);
      if (!numberedQuestion[2]) throw new Error(`missing question text for ${current.groupId} step ${step}`);
      if (current.questions.some((question) => question.step === step)) throw new Error(`duplicate step ${step} in ${current.groupId}`);
      const question = { step, question: replaceRunId(numberedQuestion[2], runId) };
      current.questions.push(question);
      current.pendingQuestion = question;
      continue;
    }
    const expectedOutcome = line.match(/^\s*\*\*Expected outcome:\*\*\s*(.*?)\s*$/);
    if (expectedOutcome) {
      if (!current.pendingQuestion) throw new Error(`Expected outcome without a question in ${current.groupId}`);
      if (!expectedOutcome[1]) throw new Error(`missing Expected outcome for ${current.groupId} step ${current.pendingQuestion.step}`);
      current.pendingQuestion.expectedOutcome = expectedOutcome[1];
      current.pendingQuestion = null;
    }
  }
  if (current) groups.push(finalizeReviewedGroup(current));
  if (!groups.length) throw new Error("no reviewed question groups found");
  const groupIds = new Set();
  for (const group of groups) {
    if (groupIds.has(group.groupId)) throw new Error(`duplicate group ${group.groupId}`);
    groupIds.add(group.groupId);
  }
  return groups.map((group) => ({ ...group, questions: group.questions.sort((left, right) => left.step - right.step) }));
}

function boundedText(value, max = MAX_ANSWER_CHARS) {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...[truncated]` : text;
}

function serializeResult(result, token) {
  return JSON.stringify(result)
    .replaceAll(token, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [redacted]");
}

function boundedEvidence(eventData = {}) {
  const allowed = ["result", "page", "section", "sourceSection", "selectedState", "scope", "workflowState", "answerShape", "completeness", "policyError", "invalidPlanError", "errorType"];
  const output = {};
  for (const key of allowed) {
    if (typeof eventData[key] === "string" || typeof eventData[key] === "number") output[key] = boundedText(eventData[key], 300);
  }
  output.facts = Array.isArray(eventData.facts)
    ? eventData.facts.slice(0, MAX_FACTS).map((item) => boundedText(item, MAX_FACT_CHARS))
    : [];
  output.missing = Array.isArray(eventData.missing)
    ? eventData.missing.slice(0, MAX_MISSING).map((item) => boundedText(item, MAX_FACT_CHARS))
    : [];
  if (typeof eventData.stage === "string") output.stage = boundedText(eventData.stage, 160);
  if (typeof eventData.status === "string") output.status = boundedText(eventData.status, 120);
  if (typeof eventData.failureCode === "string") output.failureCode = boundedText(eventData.failureCode, 160);
  if (eventData.rootCause) output.rootCause = boundedText(eventData.rootCause, 1200);
  if (Array.isArray(eventData.qualityTrace)) {
    output.qualityTrace = eventData.qualityTrace.slice(0, 35).map((entry) => {
      const safe = {};
      for (const key of ["stage", "status", "failureCode", "durationMs", "inputSummary", "outputSummary"]) {
        if (entry[key] !== undefined) safe[key] = boundedText(entry[key], 800);
      }
      if (entry.stage === "knowledge_retrieval" && Array.isArray(entry.output?.sourceNames)) {
        safe.sourceNames = entry.output.sourceNames.slice(0, 8).map((name) => boundedText(name, 160));
      }
      return safe;
    });
  }
  if (eventData.permission && typeof eventData.permission === "object") {
    const permission = eventData.permission;
    output.permission = {};
    for (const key of ["fingerprint", "dataScope"]) if (typeof permission[key] === "string") output.permission[key] = boundedText(permission[key], 300);
    for (const key of ["roles", "departments", "pages", "subpages", "buttons"]) {
      if (Array.isArray(permission[key])) output.permission[key] = permission[key].slice(0, 30).map((item) => boundedText(item, 180));
    }
  }
  if (eventData.knowledge && typeof eventData.knowledge === "object") {
    const knowledge = eventData.knowledge;
    output.knowledge = { ok: knowledge.ok === true, code: boundedText(knowledge.code, 120) };
    if (Array.isArray(knowledge.chunks)) output.knowledge.sources = knowledge.chunks.slice(0, 8).map((item) => boundedText(item?.source_name || item?.sourceName || item?.title, 300)).filter(Boolean);
  }
  if (eventData.plan && typeof eventData.plan === "object") {
    const plan = eventData.plan;
    output.plan = { mode: boundedText(plan.mode, 80), result: boundedText(plan.result, 80) };
    const request = plan.portalRequest || (plan.startPath ? plan : null);
    if (request && typeof request === "object") {
      output.plan.startPath = boundedText(request.startPath, 300);
      output.plan.actions = Array.isArray(request.actions) ? request.actions.slice(0, 12).map((action) => {
        const safe = {};
        for (const key of ["type", "role", "name", "value", "path", "permissionCode", "section"]) if (typeof action?.[key] === "string") safe[key] = boundedText(action[key], 220);
        return safe;
      }) : [];
    }
  }
  if (eventData.observation && typeof eventData.observation === "object") {
    const observation = eventData.observation;
    output.observation = { page: boundedText(observation.page, 300), section: boundedText(observation.section, 300) };
    for (const key of ["facts", "rowSummaries", "cardSummaries", "controls", "selectedStates", "emptyStates"]) {
      if (Array.isArray(observation[key])) output.observation[key] = observation[key].slice(0, key === "rowSummaries" ? 3 : 12).map((item) => boundedText(item, MAX_FACT_CHARS));
    }
    if (observation.readHealth && typeof observation.readHealth === "object") {
      output.observation.readHealth = { healthy: observation.readHealth.healthy === true };
      for (const key of ["blocked", "failed", "pending", "uncertain"]) {
        const paths = observation.readHealth[key];
        if (Array.isArray(paths)) output.observation.readHealth[key] = [...new Set(paths.filter((path) => typeof path === "string").map((path) => {
          try { return new URL(path, "http://reader.invalid").pathname.slice(0, 240); } catch { return "[invalid-path]"; }
        }))].slice(0, 16);
      }
    }
    output.observation.sections = [
      ...(Array.isArray(observation.sectionSummaries) ? observation.sectionSummaries : []),
      ...(Array.isArray(observation.regionSummaries) ? observation.regionSummaries : []),
    ].slice(0, 8).map((section) => {
      const safe = {};
      for (const key of ["nodeId", "kind", "heading", "parentRef", "selectedState", "emptyState"]) {
        if (typeof section?.[key] === "string") safe[key] = boundedText(section[key], 200);
      }
      if (Array.isArray(section?.rowSummaries)) safe.observedRowSampleCount = section.rowSummaries.length;
      return safe;
    });
  }
  return output;
}

function eventSnapshot(events) {
  const route = events.find((event) => event.eventType === "skill.route")?.data || {};
  const reader = events.find((event) => event.eventType === "reader.result")?.data || {};
  const plan = events.find((event) => event.eventType === "reader.plan")?.data || {};
  const actionEvents = events.filter((event) => event.eventType === "reader.action" || event.eventType === "tool.call");
  const assistant = [...events].reverse().find((event) => event.eventType === "assistant.message")?.data || {};
  return {
    skillId: typeof route.skillId === "string" ? route.skillId : "",
    category: typeof route.category === "string" ? route.category : "",
    reader: boundedEvidence(reader),
    plan: boundedEvidence(plan),
    actionEvidence: actionEvents.slice(-12).map((event) => ({
      eventType: event.eventType,
      data: boundedEvidence(event.data || {}),
    })),
    answer: boundedText(assistant.content || ""),
    terminalEvent: events.findLast((event) => TERMINAL_EVENTS.has(event.eventType))?.eventType || "",
    eventTypes: [...new Set(events.map((event) => event.eventType).filter(Boolean))].slice(0, 40),
  };
}

function auditSnapshot(audit, requestId) {
  const items = Array.isArray(audit?.items) ? audit.items : [];
  return items
    .filter((item) => typeof item?.recordType === "string" && item.recordType === "reader.evidence" && (!requestId || item.requestId === requestId))
    .slice(-20)
    .map((item) => ({
      recordType: item.recordType,
      category: typeof item.category === "string" ? item.category : "",
      payload: boundedEvidence(item.payload || {}),
    }));
}

async function requestJson(baseUrl, path, { token, userId, tenantId, requestId, method = "GET", body, signal, requestTimeoutMs = 15000 } = {}) {
  const headers = { accept: "application/json", "x-user-id": userId, "x-tenant-id": tenantId };
  if (requestId) headers["x-request-id"] = requestId;
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const controller = signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), requestTimeoutMs) : null;
  let response;
  let text;
  try {
    response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: signal || controller.signal });
    text = await response.text();
  } finally {
    if (timer) clearTimeout(timer);
  }
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: boundedText(text, 500) }; }
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status})`);
  return data;
}

/** Fetch the current Admin identity/permission envelope without persisting it. */
export async function getCurrentGetUserInfo({ token, endpoint = DEFAULT_USER_INFO_ENDPOINT, timeoutMs = 30000 } = {}) {
  if (!token) throw new Error("an in-memory UMC token is required");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
      body: "{}",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GetUserInfo failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function pollConversation(baseUrl, conversationId, afterSeq, options) {
  const deadline = Date.now() + options.timeoutMs;
  let lastEvents = [];
  let transientFailures = 0;
  while (Date.now() < deadline) {
    let data;
    try {
      data = await requestJson(baseUrl, `/api/v1/conversations/${encodeURIComponent(conversationId)}/history`, options);
    } catch (error) {
      const transient = error instanceof TypeError && error.message === "fetch failed";
      if (!transient || ++transientFailures > 3) throw error;
      // Retry only the idempotent history read, never resubmit a user message.
      await new Promise(resolveDelay => setTimeout(resolveDelay, 500));
      continue;
    }
    lastEvents = (Array.isArray(data.events) ? data.events : []).filter((event) => Number(event.seq || 0) > afterSeq);
    if (lastEvents.some((event) => event.eventType === "runtime.error" || event.eventType === "turn.cancelled" || event.eventType === "turn.completed")) return { events: lastEvents, timedOut: false, transientFailures };
    await new Promise((resolveDelay) => setTimeout(resolveDelay, Math.min(500, Math.max(50, deadline - Date.now()))));
  }
  return { events: lastEvents, timedOut: true, transientFailures };
}

async function runQuestion(baseUrl, group, step, conversationId, afterSeq, options) {
  const started = Date.now();
  const requestId = `review-${randomUUID()}`;
  const stepOptions = { ...options, requestId };
  const accepted = await requestJson(baseUrl, `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
    ...stepOptions,
    method: "POST",
    body: { content: step.question, clientMessageId: requestId },
  });
  const polled = await pollConversation(baseUrl, conversationId, afterSeq, stepOptions);
  let audit = {};
  if (!polled.timedOut) {
    try {
      audit = await requestJson(baseUrl, `/api/v1/conversations/${encodeURIComponent(conversationId)}/audit?search=reader.evidence&page=1&pageSize=100`, stepOptions);
    } catch {
      // History remains the authoritative bounded fallback if audit pagination
      // is unavailable for this owner-scoped request.
    }
  }
  return {
    runId: options.runId,
    accountLabel: options.accountLabel || "",
    groupId: group.groupId,
    area: group.area,
    ...(group.preconditions.length ? { preconditions: group.preconditions } : {}),
    step: step.step,
    question: step.question,
    ...(step.expectedOutcome ? { expectedOutcome: step.expectedOutcome } : {}),
    conversationId,
    accepted: Boolean(accepted.accepted),
    duplicate: Boolean(accepted.duplicate),
    timedOut: polled.timedOut,
    historyReadRetries: polled.transientFailures,
    maxSeq: polled.events.reduce((max, event) => Math.max(max, Number(event.seq || 0)), afterSeq),
    durationMs: Date.now() - started,
    ...eventSnapshot(polled.events),
    auditEvidence: auditSnapshot(audit, requestId),
  };
}

/**
 * Execute selected groups serially. `token` must be an in-memory UMC token.
 * `currentGetUserInfo` is an optional async callback; it is invoked before
 * each group and must return the current identity/permission summary. Its
 * return value is bounded to an identity check and is never written raw.
 */
export async function runGroups({
  token,
  groupIds,
  outputFile = DEFAULT_OUTPUT,
  baseUrl = DEFAULT_BASE_URL,
  accountLabel = "",
  userId,
  tenantId = "default",
  runId = `review-${Date.now()}`,
  timeoutMs = 180000,
  currentGetUserInfo = getCurrentGetUserInfo,
  userInfoEndpoint = DEFAULT_USER_INFO_ENDPOINT,
  beforeStep,
  reviewFile = REVIEW_FILE,
} = {}) {
  if (!token || typeof token !== "string") throw new Error("an in-memory UMC token is required");
  if (typeof currentGetUserInfo !== "function") throw new Error("GetUserInfo verification is mandatory");
  if (!userId || typeof userId !== "string") throw new Error("userId is required; do not derive it from untrusted question data");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10000 || timeoutMs > 180000) throw new Error("timeoutMs must be between 10000 and 180000");
  const localBaseUrl = requireLocalBaseUrl(baseUrl);
  const groups = parseReviewedGroups(await readFile(reviewFile, "utf8"), { runId });
  const selected = groupIds?.length ? groups.filter((group) => groupIds.includes(group.groupId)) : groups;
  if (!selected.length) throw new Error("no reviewed groups selected");
  await mkdir(resolve(outputFile, ".."), { recursive: true });
  let existingGroups = new Set();
  try {
    existingGroups = new Set((await readFile(outputFile, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line).groupId));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const repeated = selected.filter((group) => existingGroups.has(group.groupId));
  if (repeated.length) throw new Error(`groups already recorded in this output: ${repeated.map((group) => group.groupId).join(", ")}`);
  const results = [];
  for (const group of selected) {
    if (typeof currentGetUserInfo === "function") {
      const identity = await currentGetUserInfo({ token, userId, tenantId, endpoint: userInfoEndpoint });
      const identityData = identity?.data && typeof identity.data === "object" ? identity.data : identity;
      if (!identityData || String(identityData.userId || identityData.userID || identityData.id || "") !== String(userId)) {
        throw new Error(`GetUserInfo identity mismatch before ${group.groupId}`);
      }
    }
    const conversation = await requestJson(localBaseUrl, "/api/v1/conversations", {
      token, userId, tenantId, method: "POST", body: { workspace: `reader-review-${runId}` },
    });
    const conversationId = conversation.conversationId;
    let afterSeq = Number(conversation.lastSeq || 0);
    for (const step of group.questions) {
      if (typeof beforeStep === "function") {
        const decision = await beforeStep({ group, step, results, conversationId });
        if (decision?.skip) {
          const skipped = {
            runId,
            accountLabel,
            groupId: group.groupId,
            area: group.area,
            ...(group.preconditions.length ? { preconditions: group.preconditions } : {}),
            step: step.step,
            question: step.question,
            ...(step.expectedOutcome ? { expectedOutcome: step.expectedOutcome } : {}),
            conversationId,
            skipped: true,
            skipReason: boundedText(decision.reason || "prerequisite_not_met", 300),
          };
          await appendFile(outputFile, `${serializeResult(skipped, token)}\n`, "utf8");
          results.push(skipped);
          continue;
        }
      }
      const result = await runQuestion(localBaseUrl, group, step, conversationId, afterSeq, { token, userId, tenantId, runId, accountLabel, timeoutMs });
      await appendFile(outputFile, `${serializeResult(result, token)}\n`, "utf8");
      results.push(result);
      const maxSeq = result.maxSeq;
      afterSeq = Number.isFinite(maxSeq) ? maxSeq : afterSeq;
      if (result.timedOut) return { runId, accountLabel, groups: selected.map((item) => item.groupId), steps: results.length, outputFile, results, stopped: true, stopReason: "turn_timeout" };
      if (result.terminalEvent === "runtime.error" || result.terminalEvent === "turn.cancelled") return { runId, accountLabel, steps: results.length, outputFile, results, stopped: true, stopReason: result.terminalEvent };
    }
  }
  return { runId, accountLabel, groups: selected.map((group) => group.groupId), steps: results.length, outputFile, results };
}

export { parseReviewedGroups, boundedEvidence, eventSnapshot };
