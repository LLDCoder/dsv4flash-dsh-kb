const state = { ws: null, conversationId: null, seq: 0, assistantNode: null, assistantContent: "", configItems: [], skills: [], skillsLoaded: false, editingSkillId: null, attachment: null, umcToken: "", umcTokenPromise: null, testCases: [], testResults: [], auditConversations: [], auditLoaded: false, auditConversationId: null, auditItems: [] };
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
  const rawToken = state.umcToken || $("umcToken")?.value.trim() || "";
  const headers = { "Content-Type": "application/json", "X-User-Id": $("userId").value, "X-Tenant-Id": $("tenantId").value, ...(options.headers || {}) };
  if (rawToken && !headers.Authorization) headers.Authorization = rawToken.toLowerCase().startsWith("bearer ") ? rawToken : `Bearer ${rawToken}`;
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function setUmcSessionStatus(text, online = false) {
  const field = $("umcSessionStatus");
  if (!field) return;
  field.value = text;
  field.classList.toggle("session-ready", online);
  field.classList.toggle("session-error", !online && /失败|未配置|无法|要求/.test(text));
}

async function loadUmcToken(force = false) {
  if (!force && state.umcToken) return { token: state.umcToken };
  if (!state.umcTokenPromise || force) {
    state.umcTokenPromise = (async () => {
      setUmcSessionStatus("正在自动获取…");
      try {
        const data = await api(`/api/v1/umc/session${force ? "?refresh=true" : ""}`, { method: "POST", body: "{}" });
        const token = String(data.token || "").trim();
        if (!token) throw new Error("UMC 登录响应未返回 Token");
        state.umcToken = token;
        // Keep this only in the current page memory. The hidden field exists
        // solely for compatibility with the request header helper.
        $("umcToken").value = token;
        const minutes = Number(data.expiresInMinutes || 0);
        const suffix = minutes > 0 ? `（约 ${minutes} 分钟有效）` : "";
        setUmcSessionStatus(`已自动登录：${data.account || "UMC 账号"}${suffix}`, true);
        return data;
      } catch (error) {
        state.umcToken = "";
        $("umcToken").value = "";
        setUmcSessionStatus(`自动登录失败：${error.message}`);
        throw error;
      }
    })();
  }
  try {
    return await state.umcTokenPromise;
  } finally {
    state.umcTokenPromise = null;
  }
}

function setTab(tabId) {
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
  if (tabId === "configPanel" && !state.configItems.length) loadConfig();
  if (tabId === "skillPanel" && !state.skillsLoaded) loadSkills();
  if (tabId === "auditPanel" && !state.auditLoaded) loadAuditConversations();
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
      const options = Array.isArray(item.options) ? item.options : [];
      const inputType = item.secret ? "password" : /timeout|seconds|days|top_k/.test(item.key) ? "number" : "text";
      const configured = item.configured ? "已配置" : "未配置";
      label.innerHTML = `<span>${item.label}<small>${item.env || ""} · ${configured}${item.restartRequired ? " · 重启生效" : " · 可热更新"}</small></span>`;
      const input = item.multiline ? document.createElement("textarea") : options.length ? document.createElement("select") : document.createElement("input");
      if (options.length) {
        options.forEach((option) => {
          const optionNode = document.createElement("option");
          optionNode.value = option;
          optionNode.textContent = option;
          input.appendChild(optionNode);
        });
      } else if (!item.multiline) {
        input.type = inputType;
      }
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
      if (item.key === "audit_retention_days") input.min = "1";
      if (item.key === "audit_cleanup_interval_seconds") input.min = "60";
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

function renderSkills(items) {
  state.skills = items;
  state.skillsLoaded = true;
  const body = $("skillsTable").querySelector("tbody");
  body.replaceChildren();
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">暂未找到 system 作用域 Skill。</td></tr>';
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("tr");
    row.dataset.skillId = item.skillId;
    const idCell = document.createElement("td");
    const id = document.createElement("code");
    id.className = "skill-id";
    id.textContent = item.skillId;
    idCell.appendChild(id);
    const nameCell = document.createElement("td");
    nameCell.className = "skill-name";
    nameCell.textContent = item.name || "—";
    const versionCell = document.createElement("td");
    versionCell.textContent = `v${item.version || 1}`;
    const sourceCell = document.createElement("td");
    sourceCell.textContent = `${item.source || "ops"} / ${item.scope || "system"}`;
    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `skill-badge skill-status-${String(item.status || "DRAFT").toLowerCase()}`;
    status.textContent = item.status || "DRAFT";
    statusCell.appendChild(status);
    const enabledCell = document.createElement("td");
    enabledCell.textContent = item.enabled ? "启用" : "停用";
    enabledCell.className = item.enabled ? "skill-enabled" : "skill-disabled";
    const actionCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary skill-edit-button";
    editButton.dataset.action = "edit-skill";
    editButton.dataset.skillId = item.skillId;
    editButton.textContent = "编辑";
    actionCell.appendChild(editButton);
    row.append(idCell, nameCell, versionCell, sourceCell, statusCell, enabledCell, actionCell);
    body.appendChild(row);
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

function openSkillEditor(skillId) {
  const item = state.skills.find((skill) => skill.skillId === skillId);
  if (!item) return;
  state.editingSkillId = skillId;
  $("skillDialogTitle").textContent = `编辑 ${item.name || item.skillId}`;
  $("skillDialogMeta").textContent = `${item.skillId} · v${item.version || 1} · ${item.source || "ops"} / ${item.scope || "system"}`;
  $("skillNameInput").value = item.name || "";
  $("skillStatusInput").value = item.status || "DRAFT";
  $("skillEnabledInput").checked = Boolean(item.enabled);
  $("skillAllowedToolsInput").value = splitSkillValues(item.allowedTools);
  $("skillDependenciesInput").value = splitSkillValues(item.dependencies);
  $("skillContentInput").value = item.content || "";
  $("skillDialog").showModal();
  $("skillNameInput").focus();
}

function closeSkillEditor() {
  const dialog = $("skillDialog");
  if (dialog.open) dialog.close();
  state.editingSkillId = null;
}

async function saveSkillEditor(event) {
  event.preventDefault();
  const skillId = state.editingSkillId;
  const item = state.skills.find((skill) => skill.skillId === skillId);
  if (!item) {
    closeSkillEditor();
    return;
  }
  const name = $("skillNameInput").value.trim();
  if (!name) {
    $("skillNameInput").focus();
    $("skillsStatus").textContent = `${skillId} 的名称不能为空。`;
    return;
  }
  $("saveSkillBtn").disabled = true;
  $("skillsStatus").textContent = `正在保存 ${skillId}…`;
  try {
    const payload = {
      name,
      version: Number(item.version || 1),
      source: item.source || "ops",
      status: $("skillStatusInput").value,
      scope: item.scope || "system",
      enabled: $("skillEnabledInput").checked,
      allowedTools: parseSkillValues($("skillAllowedToolsInput").value),
      dependencies: parseSkillValues($("skillDependenciesInput").value),
      content: $("skillContentInput").value,
    };
    await api(`/api/v1/skills/${encodeURIComponent(skillId)}`, { method: "PUT", body: JSON.stringify(payload) });
    await loadSkills();
    closeSkillEditor();
    $("skillsStatus").textContent = "Skill 已保存；后续请求会使用已发布且启用的 Skill 内容。";
  } catch (error) {
    $("skillsStatus").textContent = `保存 Skill 失败：${error.message}`;
  } finally {
    $("saveSkillBtn").disabled = false;
  }
}

function auditTime(value) {
  if (!value) return "时间未知";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function auditCategoryLabel(value) {
  return { conversation: "对话", dsh: "DSH / Tool", llm: "LLM", runtime: "运行时" }[value] || value || "运行时";
}

function auditStatusLabel(value) {
  return { READY: "就绪", BUSY: "执行中", DEAD: "异常", CANCELLED: "已取消" }[value] || value || "未知";
}

function auditRecordSummary(item) {
  const payload = item.payload || {};
  const content = String(payload.content || "").replace(/\s+/g, " ").trim();
  switch (item.recordType) {
    case "user.message": return content ? `用户：${content.slice(0, 180)}` : "用户提交消息";
    case "assistant.message": return content ? `助手：${content.slice(0, 180)}` : "助手返回消息";
    case "assistant.chunk": return content ? `流式片段：${content.slice(0, 180)}` : "流式回答片段";
    case "assistant.welcome": return "初始化欢迎语";
    case "skill.route": return `Skill：${payload.skillId || payload.skill_id || "未标识"} · 模式：${payload.mode || "answer"}`;
    case "tool.call": return `调用 Tool：${payload.toolName || "未标识"}`;
    case "tool.result": return `Tool 结果：${payload.toolName || "未标识"} · ${payload.ok === false ? "失败" : "成功"}`;
    case "llm.request": return `LLM 请求：${payload.model || "未标识"} · ${Array.isArray(payload.messages) ? `${payload.messages.length} 条消息` : ""}`;
    case "llm.response": return content ? `LLM 回答：${content.slice(0, 180)}` : "LLM 返回完成";
    case "llm.thought": return content ? `LLM 思考：${content.slice(0, 180)}` : "LLM 思考内容";
    case "llm.error": return `LLM 异常：${String(payload.error || "未知错误").slice(0, 180)}`;
    case "runtime.error": return `运行异常：${String(payload.error || "未知错误").slice(0, 180)}`;
    case "turn.started": return "开始执行本轮请求";
    case "turn.completed": return "本轮执行完成";
    case "turn.cancelled": return "本轮执行已取消";
    default: return content ? content.slice(0, 180) : item.recordType || "审计记录";
  }
}

function renderAuditConversationList() {
  const list = $("auditConversationList");
  list.replaceChildren();
  const items = state.auditConversations;
  $("auditConversationCount").textContent = items.length ? `${items.length} 个` : "";
  if (!items.length) {
    list.innerHTML = '<div class="empty">暂无可查看的对话。</div>';
    return;
  }
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `audit-conversation-item${item.conversationId === state.auditConversationId ? " active" : ""}`;
    button.dataset.conversationId = item.conversationId;
    const title = document.createElement("strong");
    title.textContent = item.title || item.conversationId || "未命名会话";
    const id = document.createElement("code");
    id.textContent = item.conversationId || "-";
    const meta = document.createElement("span");
    meta.className = "audit-conversation-meta";
    meta.textContent = `${auditStatusLabel(item.status)} · ${item.lastSeq || 0} 个事件 · ${auditTime(item.lastActivityAt || item.createdAt)}`;
    button.append(title, id, meta);
    list.appendChild(button);
  });
}

function renderAuditOverview(conversation) {
  const overview = $("auditOverview");
  overview.replaceChildren();
  if (!conversation) {
    overview.innerHTML = '<div class="empty">选择一个会话查看审计。</div>';
    return;
  }
  const title = state.auditConversations.find((item) => item.conversationId === conversation.conversationId)?.title;
  const heading = document.createElement("div");
  heading.className = "audit-overview-head";
  const headingText = document.createElement("div");
  const h3 = document.createElement("h3");
  h3.textContent = title || conversation.conversationId || "对话详情";
  const id = document.createElement("code");
  id.textContent = conversation.conversationId || "-";
  headingText.append(h3, id);
  const status = document.createElement("span");
  status.className = `audit-status audit-status-${String(conversation.status || "").toLowerCase()}`;
  status.textContent = auditStatusLabel(conversation.status);
  heading.append(headingText, status);
  const grid = document.createElement("div");
  grid.className = "audit-overview-grid";
  const fields = [
    ["创建时间", auditTime(conversation.createdAt)],
    ["最近活动", auditTime(conversation.lastActivityAt)],
    ["运行时", conversation.runtimeId || "尚未分配"],
    ["DSH Session", conversation.dshSessionId || "-"],
    ["Skill Profile", conversation.skillProfile || "default"],
    ["事件序号", String(conversation.lastSeq ?? 0)],
  ];
  fields.forEach(([label, value]) => {
    const field = document.createElement("div");
    const caption = document.createElement("span");
    caption.textContent = label;
    const content = document.createElement("code");
    content.textContent = value;
    field.append(caption, content);
    grid.appendChild(field);
  });
  overview.append(heading, grid);
  if (conversation.lastError) {
    const error = document.createElement("p");
    error.className = "audit-error";
    error.textContent = `最近错误：${conversation.lastError}`;
    overview.appendChild(error);
  }
}

function renderAuditRecords(items) {
  const list = $("auditRecordList");
  list.replaceChildren();
  if (!items.length) {
    list.innerHTML = '<div class="empty">该会话暂无匹配的审计记录。</div>';
    return;
  }
  items.forEach((item) => {
    const record = document.createElement("article");
    record.className = `audit-record audit-record-${String(item.category || "runtime").toLowerCase()}`;
    const head = document.createElement("div");
    head.className = "audit-record-head";
    const category = document.createElement("span");
    category.className = "audit-category";
    category.textContent = auditCategoryLabel(item.category);
    const type = document.createElement("code");
    type.textContent = item.recordType || "unknown";
    const time = document.createElement("time");
    time.textContent = auditTime(item.createdAt);
    head.append(category, type, time);
    const summary = document.createElement("p");
    summary.className = "audit-record-summary";
    summary.textContent = auditRecordSummary(item);
    const meta = document.createElement("p");
    meta.className = "audit-record-meta";
    meta.textContent = [item.requestId && `request ${item.requestId}`, item.runtimeId && `runtime ${item.runtimeId}`].filter(Boolean).join(" · ") || "无请求关联 ID";
    const details = document.createElement("details");
    const detailsSummary = document.createElement("summary");
    detailsSummary.textContent = "查看原始审计数据";
    const payload = document.createElement("pre");
    payload.textContent = JSON.stringify(item.payload || {}, null, 2);
    details.append(detailsSummary, payload);
    record.append(head, summary, meta, details);
    list.appendChild(record);
  });
}

async function loadAuditDetail(conversationId) {
  if (!conversationId) {
    renderAuditOverview(null);
    renderAuditRecords([]);
    $("auditStatus").textContent = "尚未选择会话。";
    return;
  }
  state.auditConversationId = conversationId;
  renderAuditConversationList();
  $("auditStatus").textContent = "正在读取审计…";
  const category = $("auditCategoryFilter").value;
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  try {
    const data = await api(`/api/v1/conversations/${encodeURIComponent(conversationId)}/audit${query}`);
    state.auditItems = data.items || [];
    renderAuditOverview(data.conversation);
    renderAuditRecords(state.auditItems);
    const sourceNote = data.source === "session_event_history" ? "（该会话使用历史事件兼容展示）" : "";
    $("auditStatus").textContent = `已读取 ${state.auditItems.length} 条记录${data.limit && state.auditItems.length >= data.limit ? "（已达到显示上限）" : ""}${sourceNote}。`;
  } catch (error) {
    state.auditItems = [];
    renderAuditOverview(null);
    renderAuditRecords([]);
    $("auditStatus").textContent = `读取审计失败：${error.message}`;
  }
}

async function loadAuditConversations() {
  $("auditStatus").textContent = "正在读取会话列表…";
  try {
    const data = await api("/api/v1/conversations");
    state.auditConversations = data.items || [];
    state.auditLoaded = true;
    renderAuditConversationList();
    const current = state.auditConversations.find((item) => item.conversationId === state.auditConversationId)
      || state.auditConversations.find((item) => item.conversationId === state.conversationId)
      || state.auditConversations[0];
    await loadAuditDetail(current?.conversationId || "");
  } catch (error) {
    state.auditLoaded = false;
    $("auditConversationList").innerHTML = `<div class="empty">读取会话失败：${error.message}</div>`;
    $("auditStatus").textContent = "无法读取会话列表。";
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

function inferMimeType(fileName) {
  const name = String(fileName || "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function readAttachment() {
  const uploaded = state.attachment;
  const selectedFile = $("attachmentPicker").files?.[0];
  if (!uploaded) {
    if (selectedFile) throw new Error("附件正在上传或上传失败，请等待上传完成后再发送。");
    return null;
  }
  const fileRef = uploaded.fileRef;
  const fileName = $("attachmentName").value.trim() || uploaded.fileName;
  const mimeType = $("attachmentMime").value.trim() || uploaded.mimeType || inferMimeType(fileName);
  if (!fileName || !mimeType) throw new Error("附件文件名和 MIME 类型不能为空。");
  return { fileRef, fileName, mimeType, fileType: Number($("attachmentType").value) };
}

function extractUploadReference(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map((item) => extractUploadReference(item, depth + 1)).find(Boolean) || "";
  if (typeof value !== "object") return "";
  for (const key of ["url", "fileUrl", "filePath", "fileRef", "key", "objectKey", "objectName", "path", "data"]) {
    const reference = extractUploadReference(value[key], depth + 1);
    if (reference) return reference;
  }
  return "";
}

async function postAttachment(file, token, fieldName) {
  const formData = new FormData();
  formData.append(fieldName, file, file.name);
  const response = await fetch("/api/v1/umc/documents/upload", {
    method: "POST",
    headers: { Authorization: token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}` },
    body: formData,
  });
  const rawBody = await response.text();
  let payload = rawBody;
  try { payload = rawBody ? JSON.parse(rawBody) : rawBody; } catch { /* UMC may return a plain object key. */ }
  return { response, payload, fileRef: response.ok ? extractUploadReference(payload) : "" };
}

async function uploadAttachment(file) {
  try {
    await loadUmcToken();
  } catch {
    $("attachmentStatus").textContent = "UMC 自动登录失败，附件未上传。";
    $("attachmentPicker").value = "";
    return;
  }
  const rawToken = state.umcToken;
  state.attachment = null;
  $("attachmentRef").value = "";
  $("attachmentName").value = file.name;
  $("attachmentMime").value = file.type || inferMimeType(file.name);
  $("attachmentType").value = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "0" : "1";
  $("attachmentStatus").textContent = `正在上传 ${file.name}…`;
  try {
    let result = await postAttachment(file, rawToken, "file");
    // The documented field is singular, but the current 77 portal build has
    // a compatibility quirk: it may answer 200/data=[] for `file` and return
    // the object reference only for the frontend's historical `files` field.
    if (result.response.status === 401) {
      state.umcToken = "";
      $("umcToken").value = "";
      await loadUmcToken(true);
      result = await postAttachment(file, state.umcToken, "file");
    }
    if (!result.fileRef && result.response.status !== 401) result = await postAttachment(file, state.umcToken, "files");
    const { response, payload, fileRef } = result;
    if (!response.ok) throw new Error(typeof payload === "string" ? payload || `HTTP ${response.status}` : JSON.stringify(payload));
    if (!fileRef) throw new Error("上传成功但 UMC 响应中没有文件对象引用。");
    state.attachment = { fileRef, fileName: file.name, mimeType: file.type || inferMimeType(file.name) };
    $("attachmentRef").value = fileRef;
    $("attachmentStatus").textContent = `上传成功：${file.name}；现在可以发送问题或仅提交附件。`;
  } catch (error) {
    state.attachment = null;
    $("attachmentRef").value = "";
    $("attachmentPicker").value = "";
    $("attachmentStatus").textContent = `附件上传失败：${error.message}`;
  }
}

function clearAttachment() {
  $("attachmentPicker").value = "";
  $("attachmentRef").value = "";
  $("attachmentName").value = "";
  $("attachmentMime").value = "";
  $("attachmentType").value = "0";
  state.attachment = null;
  $("attachmentStatus").textContent = "附件已清除。";
}

function onAttachmentPicked(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  uploadAttachment(file);
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

async function connect() {
  try {
    await loadUmcToken();
  } catch {
    setConnection("UMC 未登录", false);
    return;
  }
  if (state.ws && state.ws.readyState <= 1) state.ws.close();
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  state.ws = new WebSocket(`${protocol}://${location.host}/api/v1/ws?userId=${encodeURIComponent($("userId").value)}&tenantId=${encodeURIComponent($("tenantId").value)}`);
  state.ws.onopen = async () => {
    setConnection("已连接", true);
    const umcToken = state.umcToken || $("umcToken")?.value.trim() || "";
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
      const attachmentNote = data.attachment ? `附件：${data.attachment.fileName || "未命名文件"}` : "";
      addEvent("user.message", data.content || attachmentNote, `seq ${packet.seq}`);
      state.assistantNode = null;
      state.assistantContent = "";
    } else if (packet.eventType === "turn.completed") {
      addEvent(packet.eventType, JSON.stringify(data), `seq ${packet.seq}`);
      if (document.querySelector("#auditPanel.active") && state.auditConversationId === state.conversationId) {
        void loadAuditDetail(state.conversationId);
      }
    } else {
      addEvent(packet.eventType, JSON.stringify(data), `seq ${packet.seq}`);
    }
  };
}

$("createBtn").addEventListener("click", async () => { try { await createConversation(); } catch (error) { addEvent("system.error", error.message); } });
$("connectBtn").addEventListener("click", () => { void connect(); });
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
$("reloadConfigBtn").addEventListener("click", loadConfig);
$("saveConfigBtn").addEventListener("click", saveConfig);
$("reloadSkillsBtn").addEventListener("click", loadSkills);
$("reloadAuditBtn").addEventListener("click", loadAuditConversations);
$("auditCategoryFilter").addEventListener("change", () => loadAuditDetail(state.auditConversationId));
$("auditConversationList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-conversation-id]");
  if (button) void loadAuditDetail(button.dataset.conversationId);
});
$("skillsTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action=edit-skill]");
  if (button) openSkillEditor(button.dataset.skillId);
});
$("skillEditForm").addEventListener("submit", saveSkillEditor);
$("cancelSkillBtn").addEventListener("click", closeSkillEditor);
$("closeSkillDialogBtn").addEventListener("click", closeSkillEditor);
$("skillDialog").addEventListener("click", (event) => {
  if (event.target === $("skillDialog")) closeSkillEditor();
});
$("attachmentPicker").addEventListener("change", onAttachmentPicked);
$("clearAttachmentBtn").addEventListener("click", clearAttachment);
$("generateTestsBtn").addEventListener("click", generateTests);
$("runTestsBtn").addEventListener("click", runTests);
$("selectAllTests").addEventListener("change", (event) => document.querySelectorAll(".case-check").forEach((node) => { node.checked = event.target.checked; }));
$("messageForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = $("message").value.trim();
  let attachment = null;
  try {
    attachment = readAttachment();
  } catch (error) {
    $("attachmentStatus").textContent = error.message;
    return;
  }
  if (!content && !attachment) return;
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) await connect();
  await new Promise((resolve) => setTimeout(resolve, 50));
  state.conversationId = state.conversationId || $("conversationId").value;
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    $("attachmentStatus").textContent = "WebSocket 尚未连接，请先点击“连接 WS”。";
    return;
  }
  state.ws.send(JSON.stringify({ type: "message", conversationId: state.conversationId, content, attachment, clientMessageId: crypto.randomUUID() }));
  $("message").value = "";
  if (attachment) $("attachmentStatus").textContent = `已发送附件：${attachment.fileName}`;
});

// Obtain the configured account's UMC session as soon as the console opens;
// operators should never need to paste a token before uploading or connecting.
void loadUmcToken().catch(() => {});
