const state = { ws: null, conversationId: null, seq: 0, assistantNode: null, assistantContent: "", configItems: [], skills: [], skillsLoaded: false, testCases: [], testResults: [] };
const $ = (id) => document.getElementById(id);

function containsArabic(text) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u.test(text);
}

function renderLocalizedContent(node, content) {
  node.replaceChildren();
  const text = String(content || "");
  if (!text) return;
  text.split(/\n{2,}/).forEach((paragraph) => {
    const block = document.createElement("div");
    block.className = "localized-block";
    block.dir = containsArabic(paragraph) ? "rtl" : "ltr";
    block.textContent = paragraph;
    node.appendChild(block);
  });
}

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
  renderLocalizedContent(row.querySelector(".event-body"), content);
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
  if (tabId === "skillPanel" && !state.skillsLoaded) loadSkills();
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
      const input = item.multiline ? document.createElement("textarea") : document.createElement("input");
      if (!item.multiline) input.type = inputType;
      input.dataset.key = item.key;
      input.dataset.secret = item.secret ? "1" : "0";
      input.dataset.multiline = item.multiline ? "1" : "0";
      input.value = configValue(item);
      input.placeholder = item.secret ? (item.configured ? "已配置，留空表示保持不变" : "输入后保存（仅保存哈希前的密文）") : "使用当前环境/默认值";
      if (item.multiline) {
        input.rows = 8;
        input.placeholder = item.description || "输入要追加到每轮系统提示词的全局指令";
      }
      if (inputType === "number") input.step = item.key.includes("timeout") ? "1" : "1";
      label.appendChild(input);
      if (item.description) {
        const description = document.createElement("small");
        description.className = "config-description";
        description.textContent = item.description;
        label.appendChild(description);
      }
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

function splitSkillValues(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function parseSkillValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function skillField(parent, labelText, value, options = {}) {
  const label = document.createElement("label");
  label.className = `skill-field${options.wide ? " wide" : ""}`;
  const title = document.createElement("span");
  title.textContent = labelText;
  const control = options.textarea ? document.createElement("textarea") : document.createElement("input");
  if (options.textarea) control.rows = options.rows || 7;
  control.value = value || "";
  if (options.field) control.dataset.field = options.field;
  label.append(title, control);
  parent.appendChild(label);
  return control;
}

function renderSkills(items) {
  state.skills = items;
  state.skillsLoaded = true;
  const form = $("skillsForm");
  form.replaceChildren();
  if (!items.length) {
    form.innerHTML = '<div class="empty">暂未找到 system 作用域 Skill。</div>';
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "skill-editor card";
    card.dataset.skillId = item.skillId;
    card.dataset.version = String(item.version || 1);
    card.dataset.source = item.source || "ops";
    card.dataset.scope = item.scope || "system";

    const head = document.createElement("div");
    head.className = "skill-editor-head";
    const title = document.createElement("div");
    const id = document.createElement("code");
    id.textContent = item.skillId;
    const meta = document.createElement("small");
    meta.textContent = `v${item.version || 1} · ${item.source || "ops"} · ${item.scope || "system"}`;
    title.append(id, meta);
    const controls = document.createElement("div");
    controls.className = "skill-editor-controls";
    const status = document.createElement("select");
    status.dataset.field = "status";
    ["DRAFT", "PUBLISHED", "DISABLED"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = value === item.status;
      status.appendChild(option);
    });
    const statusLabel = document.createElement("label");
    statusLabel.className = "skill-status";
    statusLabel.append("状态", status);
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.dataset.field = "enabled";
    enabled.checked = Boolean(item.enabled);
    const enabledLabel = document.createElement("label");
    enabledLabel.className = "skill-toggle";
    enabledLabel.append(enabled, "启用");
    controls.append(statusLabel, enabledLabel);
    head.append(title, controls);
    card.appendChild(head);

    const fields = document.createElement("div");
    fields.className = "skill-fields";
    skillField(fields, "名称", item.name, { field: "name" });
    skillField(fields, "允许调用的 Tools（逗号分隔）", splitSkillValues(item.allowedTools), { field: "allowedTools" });
    skillField(fields, "依赖条件（逗号分隔）", splitSkillValues(item.dependencies), { field: "dependencies" });
    skillField(fields, "Skill 内容 / 行为指令", item.content, { field: "content", textarea: true, wide: true });
    card.appendChild(fields);
    form.appendChild(card);
  });
}

async function loadSkills() {
  try {
    const data = await api("/api/v1/skills?scope=system");
    renderSkills(data.items || []);
    $("skillsStatus").textContent = `已读取 ${state.skills.length} 个 system Skill；只有 PUBLISHED 且启用的版本会注入对应路由。`;
  } catch (error) {
    $("skillsStatus").textContent = `读取 Skills 失败：${error.message}`;
  }
}

async function saveSkills() {
  const cards = [...document.querySelectorAll("#skillsForm .skill-editor")];
  if (!cards.length) {
    $("skillsStatus").textContent = "没有可保存的 Skill。";
    return;
  }
  $("saveSkillsBtn").disabled = true;
  $("skillsStatus").textContent = `正在保存 ${cards.length} 个 Skill…`;
  try {
    for (const card of cards) {
      const field = (name) => card.querySelector(`[data-field="${name}"]`);
      const payload = {
        name: field("name").value.trim(),
        version: Number(card.dataset.version || 1),
        source: card.dataset.source || "ops",
        status: field("status").value,
        scope: card.dataset.scope || "system",
        enabled: field("enabled").checked,
        allowedTools: parseSkillValues(field("allowedTools").value),
        dependencies: parseSkillValues(field("dependencies").value),
        content: field("content").value,
      };
      if (!payload.name) throw new Error(`${card.dataset.skillId} 的名称不能为空`);
      await api(`/api/v1/skills/${encodeURIComponent(card.dataset.skillId)}`, { method: "PUT", body: JSON.stringify(payload) });
    }
    await loadSkills();
    $("skillsStatus").textContent = "Skills 已保存；新建会话后的后续请求会使用已发布且启用的 Skill 内容。";
  } catch (error) {
    $("skillsStatus").textContent = `保存 Skills 失败：${error.message}`;
  } finally {
    $("saveSkillsBtn").disabled = false;
  }
}

async function saveConfig() {
  const patch = {};
  document.querySelectorAll("#configForm [data-key]").forEach((input) => {
    const value = input.value.trim();
    if (input.dataset.secret === "1" && !value) return;
    if (value || input.dataset.multiline === "1") patch[input.dataset.key] = input.type === "number" ? Number(value) : value;
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
  state.assistantContent = "";
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
      state.assistantContent += data.content || "";
      renderLocalizedContent(state.assistantNode, state.assistantContent);
      $("events").scrollTop = $("events").scrollHeight;
    } else if (packet.eventType === "assistant.message") {
      state.assistantContent = data.content || state.assistantContent;
      if (!state.assistantNode) state.assistantNode = addEvent("assistant.message", state.assistantContent, `seq ${packet.seq}`);
      else renderLocalizedContent(state.assistantNode, state.assistantContent);
    } else if (packet.eventType === "user.message") {
      addEvent("user.message", data.content || "", `seq ${packet.seq}`);
      state.assistantNode = null;
      state.assistantContent = "";
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
$("reloadSkillsBtn").addEventListener("click", loadSkills);
$("saveSkillsBtn").addEventListener("click", saveSkills);
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
