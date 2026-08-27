const state = { ws: null, conversationId: null, seq: 0, assistantNode: null, configItems: [], testCases: [], testResults: [] };
const $ = (id) => document.getElementById(id);

function setConnection(text, online) {
  const node = $("connection");
  node.textContent = text;
  node.className = `pill ${online ? "online" : "offline"}`;
}

function addEvent(type, content, meta = "") {
  const empty = document.querySelector(".empty");
  if (empty) empty.remove();
  const row = document.createElement("article");
  row.className = `event ${type.includes("assistant") ? "assistant" : type.includes("user") ? "user" : "system"}`;
  row.innerHTML = `<div class="event-meta"><span>${type}</span><small>${meta}</small></div><div class="event-body"></div>`;
  row.querySelector(".event-body").textContent = content || "";
  $("events").appendChild(row);
  $("events").scrollTop = $("events").scrollHeight;
  return row.querySelector(".event-body");
}

async function api(path, options = {}) {
  const rawToken = $("umcToken")?.value.trim() || "";
  const headers = { "Content-Type": "application/json", "X-User-Id": $("userId").value, "X-Tenant-Id": $("tenantId").value, ...(options.headers || {}) };
  if (rawToken && !headers.Authorization) headers.Authorization = rawToken.toLowerCase().startsWith("bearer ") ? rawToken : `Bearer ${rawToken}`;
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function setTab(tabId) {
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
  if (tabId === "configPanel" && !state.configItems.length) loadConfig();
}

function configValue(item) {
  if (item.secret) return "";
  return item.value ?? "";
}

function renderConfig(items) {
  state.configItems = items;
  const form = $("configForm");
  form.innerHTML = "";
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  });
  groups.forEach((groupItems, groupName) => {
    const group = document.createElement("section");
    group.className = "config-group card";
    group.innerHTML = `<h3>${groupName}</h3><div class="config-fields"></div>`;
    const fields = group.querySelector(".config-fields");
    groupItems.forEach((item) => {
      const label = document.createElement("label");
      label.className = "config-field";
      const inputType = item.secret ? "password" : item.key.includes("timeout") || item.key.includes("top_k") ? "number" : "text";
      const configured = item.configured ? "已配置" : "未配置";
      label.innerHTML = `<span>${item.label}<small>${item.env || ""} · ${configured}${item.restartRequired ? " · 重启生效" : " · 可热更新"}</small></span>`;
      const input = document.createElement("input");
      input.type = inputType;
      input.dataset.key = item.key;
      input.dataset.secret = item.secret ? "1" : "0";
      input.value = configValue(item);
      input.placeholder = item.secret ? (item.configured ? "已配置，留空表示保持不变" : "输入后保存（仅保存哈希前的密文）") : "使用当前环境/默认值";
      if (inputType === "number") input.step = item.key.includes("timeout") ? "1" : "1";
      label.appendChild(input);
      fields.appendChild(label);
    });
    form.appendChild(group);
  });
}

async function loadConfig() {
  try {
    const data = await api("/api/v1/config?scope=system");
    renderConfig(data.items || []);
    $("configStatus").textContent = "配置已读取。敏感字段不会回显。";
  } catch (error) {
    $("configStatus").textContent = `读取配置失败：${error.message}`;
  }
}

async function saveConfig() {
  const patch = {};
  document.querySelectorAll("#configForm input[data-key]").forEach((input) => {
    const value = input.value.trim();
    if (input.dataset.secret === "1" && !value) return;
    if (value) patch[input.dataset.key] = input.type === "number" ? Number(value) : value;
  });
  if (!Object.keys(patch).length) {
    $("configStatus").textContent = "没有需要保存的变更。";
    return;
  }
  try {
    const data = await api("/api/v1/config", { method: "PATCH", body: JSON.stringify({ scope: "system", patch }) });
    renderConfig(data.items || []);
    $("configStatus").textContent = "配置已保存；可热更新项已立即作用于后续请求，DB/Redis URL 需重启容器。";
  } catch (error) {
    $("configStatus").textContent = `保存配置失败：${error.message}`;
  }
}

function renderTestTable() {
  const body = $("testCasesTable").querySelector("tbody");
  body.innerHTML = "";
  if (!state.testCases.length) {
    body.innerHTML = '<tr><td colspan="10" class="empty">点击“生成测试用例”</td></tr>';
    $("runTestsBtn").disabled = true;
    return;
  }
  const resultMap = new Map(state.testResults.map((item) => [item.caseId, item]));
  state.testCases.forEach((item) => {
    const result = resultMap.get(item.caseId);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input type="checkbox" class="case-check" data-case-id="${item.caseId}" checked /></td><td><code>${item.caseId}</code></td><td>${item.language === "ar" ? "العربية" : "English"}</td><td>${item.label}</td><td><code>${item.skillId}</code></td><td class="question-cell"></td><td>${item.knowledgeRequired ? `${item.evidenceCount || 0} 条 · top_k ${item.topK}` : "—"}</td><td class="source-cell"></td><td class="result-cell">${result ? (result.timedOut ? "超时" : result.toolOk || result.guardrailRequired ? "通过" : "已返回") : "待执行"}</td><td>${result ? `${result.score}/5` : "—"}</td>`;
    tr.querySelector(".question-cell").textContent = item.question;
    tr.querySelector(".source-cell").textContent = item.sourceTitle || "—";
    body.appendChild(tr);
  });
  $("runTestsBtn").disabled = false;
}

function renderTestSummary(data) {
  const summary = $("testSummary");
  summary.innerHTML = `<span><strong>${data.count || 0}</strong> 条用例</span><span>语言：${(data.languages || []).join(" / ")}</span><span>知识库：${data.folderId || "未确定目录"}</span><span>三路：BM25 · Graph · Vector</span><span>top_k：${data.topK || 32}</span>`;
}

async function generateTests() {
  const languages = [];
  if ($("langEn").checked) languages.push("en");
  if ($("langAr").checked) languages.push("ar");
  if (!languages.length) {
    $("testLog").textContent = "至少选择一种语言。";
    return;
  }
  $("generateTestsBtn").disabled = true;
  $("testLog").textContent = "正在从实时知识库取证并组织测试用例…";
  try {
    const data = await api("/api/v1/test-cases/generate", { method: "POST", body: JSON.stringify({ languages, folderId: $("testFolderId").value.trim() || null, limit: Number($("testLimit").value || 36) }) });
    state.testCases = data.items || [];
    state.testResults = [];
    renderTestSummary(data);
    renderTestTable();
    $("testLog").textContent = `已生成 ${state.testCases.length} 条。知识库证据已写入每一行，可点击“执行已勾选”跑 DSH 端到端测试。`;
  } catch (error) {
    $("testLog").textContent = `生成失败：${error.message}`;
  } finally {
    $("generateTestsBtn").disabled = false;
  }
}

async function runTests() {
  const selectedIds = new Set([...document.querySelectorAll(".case-check:checked")].map((node) => node.dataset.caseId));
  const cases = state.testCases.filter((item) => selectedIds.has(item.caseId));
  if (!cases.length) {
    $("testLog").textContent = "请至少勾选一条用例。";
    return;
  }
  $("runTestsBtn").disabled = true;
  $("generateTestsBtn").disabled = true;
  $("testLog").textContent = `正在执行 ${cases.length} 条，单题最长 ${$("testTimeout").value} 秒；外部 Tool 和模型调用会产生实际请求。`;
  try {
    const data = await api("/api/v1/test-cases/run", { method: "POST", body: JSON.stringify({ cases, timeoutSeconds: Number($("testTimeout").value || 90) }) });
    state.testResults = data.items || [];
    renderTestTable();
    $("testLog").textContent = JSON.stringify({ count: data.count, completed: data.completed, routeMatches: data.routeMatches, toolSuccesses: data.toolSuccesses, averageScore: data.averageScore }, null, 2);
  } catch (error) {
    $("testLog").textContent = `执行失败：${error.message}`;
  } finally {
    $("runTestsBtn").disabled = false;
    $("generateTestsBtn").disabled = false;
  }
}

async function createConversation() {
  const data = await api("/api/v1/conversations", { method: "POST", body: JSON.stringify({ workspace: "demo", skill_profile: "default", runtime_profile: "default" }) });
  state.conversationId = data.conversationId;
  state.seq = 0;
  state.assistantNode = null;
  $("conversationId").value = state.conversationId;
  $("runtimeId").textContent = data.runtimeId || "等待首条消息";
  $("lastSeq").textContent = data.lastSeq;
  $("events").innerHTML = "";
  addEvent("system", `已创建 ${state.conversationId}`, data.dshSessionId);
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "subscribe", conversationId: state.conversationId, afterSeq: 0 }));
  }
  return data;
}

function connect() {
  if (state.ws && state.ws.readyState <= 1) state.ws.close();
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  state.ws = new WebSocket(`${protocol}://${location.host}/api/v1/ws?userId=${encodeURIComponent($("userId").value)}&tenantId=${encodeURIComponent($("tenantId").value)}`);
  state.ws.onopen = async () => {
    setConnection("已连接", true);
    const umcToken = $("umcToken")?.value.trim() || "";
    if (umcToken) state.ws.send(JSON.stringify({ type: "auth", umctoken: umcToken }));
    if (!state.conversationId && !$("conversationId").value) {
      await createConversation();
    } else {
      state.conversationId = state.conversationId || $("conversationId").value;
      state.ws.send(JSON.stringify({ type: "subscribe", conversationId: state.conversationId, afterSeq: state.seq }));
    }
  };
  state.ws.onclose = () => setConnection("已断开", false);
  state.ws.onerror = () => setConnection("连接错误", false);
  state.ws.onmessage = (message) => {
    const packet = JSON.parse(message.data);
    if (packet.type === "accepted") {
      $("requestId").textContent = packet.requestId || "-";
      $("runtimeId").textContent = packet.runtimeId || $("runtimeId").textContent;
    }
    if (packet.type !== "event") return;
    state.seq = Math.max(state.seq, packet.seq || 0);
    $("lastSeq").textContent = state.seq;
    const data = packet.data || {};
    if (packet.eventType === "assistant.welcome") {
      addEvent("assistant.welcome", data.content || "", `seq ${packet.seq}`);
    } else if (packet.eventType === "assistant.chunk") {
      if (!state.assistantNode) state.assistantNode = addEvent("assistant.message", "", `seq ${packet.seq}`);
      state.assistantNode.textContent += data.content || "";
      $("events").scrollTop = $("events").scrollHeight;
    } else if (packet.eventType === "assistant.message") {
      if (!state.assistantNode) state.assistantNode = addEvent("assistant.message", data.content || "", `seq ${packet.seq}`);
      else state.assistantNode.textContent = data.content || state.assistantNode.textContent;
    } else if (packet.eventType === "user.message") {
      addEvent("user.message", data.content || "", `seq ${packet.seq}`);
      state.assistantNode = null;
    } else {
      addEvent(packet.eventType, JSON.stringify(data), `seq ${packet.seq}`);
    }
  };
}

$("createBtn").addEventListener("click", async () => { try { await createConversation(); } catch (error) { addEvent("system.error", error.message); } });
$("connectBtn").addEventListener("click", connect);
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
$("reloadConfigBtn").addEventListener("click", loadConfig);
$("saveConfigBtn").addEventListener("click", saveConfig);
$("generateTestsBtn").addEventListener("click", generateTests);
$("runTestsBtn").addEventListener("click", runTests);
$("selectAllTests").addEventListener("change", (event) => document.querySelectorAll(".case-check").forEach((node) => { node.checked = event.target.checked; }));
$("messageForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = $("message").value.trim();
  if (!content) return;
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) connect();
  await new Promise((resolve) => setTimeout(resolve, 50));
  state.conversationId = state.conversationId || $("conversationId").value;
  state.ws.send(JSON.stringify({ type: "message", conversationId: state.conversationId, content, clientMessageId: crypto.randomUUID() }));
  $("message").value = "";
});
