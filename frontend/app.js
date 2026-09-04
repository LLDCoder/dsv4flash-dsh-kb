const state = { ws: null, connectPromise: null, wsGeneration: 0, conversationId: null, seq: 0, assistantNode: null, assistantContent: "", statusNode: null, configItems: [], umcToken: "", umcUserId: "", umcTokenPromise: null, testCases: [], testResults: [], auditConversations: [], auditScope: "owner", auditLoaded: false, auditConversationPage: 1, auditConversationPageSize: 25, auditConversationTotal: 0, auditConversationId: null, auditItems: [], auditRecordPage: 1, auditRecordPageSize: 25, auditRecordTotal: 0, auditRecordHasMore: false, auditRecordLoading: false, auditRecordRequestId: 0, consoleAuthenticated: false };
const $ = (id) => document.getElementById(id);
const dshBasePath = window.location.pathname === "/dsh-audit" || window.location.pathname.startsWith("/dsh-audit/")
  ? "/dsh-audit"
  : "";
const dshUrl = (path) => `${dshBasePath}${path}`;

function opensAuditByDefault() {
  return window.location.pathname.replace(/\/+$/, "") === "/dsh-audit";
}

function debounce(callback, delay = 250) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}

function renderPager(id, { page, pageSize, total, onPage }) {
  const container = $(id);
  if (!container) return;
  container.replaceChildren();
  if (total <= pageSize) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "list-pager-button";
  previous.textContent = "<";
  previous.title = "上一页";
  previous.setAttribute("aria-label", "上一页");
  previous.disabled = page <= 1;
  previous.addEventListener("click", () => onPage(page - 1));
  const label = document.createElement("span");
  label.textContent = `第 ${page} / ${totalPages} 页 · ${total} 条`;
  const next = document.createElement("button");
  next.type = "button";
  next.className = "list-pager-button";
  next.textContent = ">";
  next.title = "下一页";
  next.setAttribute("aria-label", "下一页");
  next.disabled = page >= totalPages;
  next.addEventListener("click", () => onPage(page + 1));
  container.append(previous, label, next);
}

function createClientMessageId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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

function clearAssistantStatus() {
  const row = state.statusNode?.closest(".event");
  if (row) row.remove();
  state.statusNode = null;
}

function showAssistantStatus(data, meta = "") {
  if (!state.statusNode) {
    state.statusNode = addEvent("assistant.status", "", meta);
    const row = state.statusNode.closest(".event");
    row.classList.add("status-event");
    row.setAttribute("role", "status");
    row.setAttribute("aria-live", "polite");
  }
  const row = state.statusNode.closest(".event");
  renderLocalizedContent(state.statusNode, data.message || data.content || "Working…");
  const metaNode = row.querySelector(".event-meta small");
  if (metaNode) metaNode.textContent = [data.phase || "working", meta].filter(Boolean).join(" · ");
  // Keep the live progress card at the end of the timeline so the newest
  // waiting state remains visible below any route/tool events.
  $("events").appendChild(row);
  $("events").scrollTop = $("events").scrollHeight;
}

async function api(path, options = {}) {
  const rawToken = state.umcToken || $("umcToken")?.value.trim() || "";
  const headers = { "Content-Type": "application/json", "X-User-Id": $("userId").value, "X-Tenant-Id": $("tenantId").value, ...(options.headers || {}) };
  if (rawToken && !headers.Authorization) headers.Authorization = rawToken.toLowerCase().startsWith("bearer ") ? rawToken : `Bearer ${rawToken}`;
  const response = await fetch(dshUrl(path), { credentials: "same-origin", ...options, headers });
  if (response.status === 401 && !path.startsWith("/api/v1/console/")) {
    state.consoleAuthenticated = false;
    showConsoleGate("控制台会话已过期，请重新输入密码。", true);
  }
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function consoleApi(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const response = await fetch(dshUrl(path), { credentials: "same-origin", ...options, headers });
  if (response.status === 401) {
    state.consoleAuthenticated = false;
    showConsoleGate("控制台会话已过期，请重新输入密码。", true);
  }
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function showConsoleGate(message = "请输入测试控制台密码。", focus = false) {
  const gate = $("consoleGate");
  if (!gate) return;
  gate.hidden = false;
  const status = $("consoleAuthStatus");
  if (status) status.textContent = message;
  if (focus) setTimeout(() => $("consolePassword")?.focus(), 0);
}

function hideConsoleGate() {
  const gate = $("consoleGate");
  if (gate) gate.hidden = true;
  const status = $("consoleAuthStatus");
  if (status) status.textContent = "";
  const input = $("consolePassword");
  if (input) input.value = "";
}

async function checkConsoleSession() {
  const response = await fetch(dshUrl("/api/v1/console/session"), { credentials: "same-origin" });
  if (!response.ok) return false;
  const data = await response.json();
  return data.authenticated === true;
}

async function loginConsole(event) {
  event.preventDefault();
  const password = $("consolePassword").value;
  const status = $("consoleAuthStatus");
  status.textContent = "正在验证…";
  try {
    const response = await fetch(dshUrl("/api/v1/console/login"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw new Error("密码不正确或服务不可用");
    state.consoleAuthenticated = true;
    hideConsoleGate();
    if (opensAuditByDefault()) setTab("auditPanel");
    await loadUmcToken().catch(() => {});
  } catch (error) {
    status.textContent = error.message;
    $("consolePassword").select();
  }
}

function tokenClaims(rawToken) {
  try {
    const segment = String(rawToken || "").split(".")[1];
    if (!segment) return {};
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(segment.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(normalized), (value) => value.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {};
  }
}

function syncUmcIdentity(rawToken, session = {}) {
  const claims = tokenClaims(rawToken);
  const candidate = session.userId || session.userID || session.user_id || claims.UserID || claims.UserId || claims.userId || claims.userID || claims.sub;
  const userId = String(candidate || "").trim();
  if (!userId) return;
  state.umcUserId = userId;
  // The REST API and browser WebSocket must use the same validated UMC
  // identity.  Keep the field visible for diagnostics, but remove the old
  // demo-user placeholder automatically after service-account login.
  const input = $("userId");
  if (input && (!input.value.trim() || input.value.trim() === "demo-user" || input.dataset.umcAuto === "1")) {
    input.value = userId;
    input.dataset.umcAuto = "1";
  }
}

async function logoutConsole() {
  await fetch(dshUrl("/api/v1/console/logout"), { method: "POST", credentials: "same-origin" }).catch(() => {});
  state.consoleAuthenticated = false;
  state.umcToken = "";
  $("umcToken").value = "";
  setUmcSessionStatus("未登录", false);
  if (state.ws && state.ws.readyState <= 1) state.ws.close();
  setConnection("未连接", false);
  showConsoleGate("已退出测试控制台。", true);
}

async function bootstrapConsole() {
  try {
    state.consoleAuthenticated = await checkConsoleSession();
  } catch {
    state.consoleAuthenticated = false;
  }
  if (!state.consoleAuthenticated) {
    showConsoleGate("请输入测试控制台密码。", true);
    return;
  }
  hideConsoleGate();
  if (opensAuditByDefault()) setTab("auditPanel");
  await loadUmcToken().catch(() => {});
}

function setUmcSessionStatus(text, online = false) {
  const field = $("umcSessionStatus");
  if (!field) return;
  field.value = text;
  field.classList.toggle("session-ready", online);
  field.classList.toggle("session-error", !online && /失败|未配置|无法|要求/.test(text));
}

async function loadUmcToken(force = false) {
  if (!force && state.umcToken) {
    syncUmcIdentity(state.umcToken);
    return { token: state.umcToken };
  }
  if (!state.umcTokenPromise || force) {
    state.umcTokenPromise = (async () => {
      setUmcSessionStatus("正在自动获取…");
      try {
        const data = await api(`/api/v1/umc/session${force ? "?refresh=true" : ""}`, { method: "POST", body: "{}" });
        const token = String(data.token || "").trim();
        if (!token) throw new Error("UMC 登录响应未返回 Token");
        state.umcToken = token;
        syncUmcIdentity(token, data);
        // Keep this only in current page memory for request authorization.
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
          optionNode.value = typeof option === "object" ? option.value : option;
          optionNode.textContent = typeof option === "object" ? option.label : option;
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
    case "assistant.status": return payload.message || "处理中…";
    case "assistant.chunk": return content ? `流式片段：${content.slice(0, 180)}` : "流式回答片段";
    case "assistant.welcome": return "初始化欢迎语";
    case "skill.route": return `Skill：${payload.skillId || payload.skill_id || "未标识"} · 模式：${payload.mode || "answer"}`;
    case "reader.evidence": {
      const permission = payload.permission || {};
      const account = permission.account || "未确认";
      const currentRole = permission.currentRole || (Array.isArray(permission.roles) ? permission.roles[0] : "") || "未确认";
      return `Reader 审计：登录账号 ${account} · 当前角色 ${currentRole} · 阶段 ${payload.stage || "未标识"}`;
    }
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
  $("auditConversationCount").textContent = `${state.auditConversationTotal} 个`;
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
    const owner = state.auditScope === "admin" && (item.ownerUserId || item.ownerTenantId)
      ? `用户 ID ${item.ownerUserId || "-"} · 租户 ${item.ownerTenantId || "-"}`
      : "";
    meta.textContent = [owner, auditStatusLabel(item.status), `${item.lastSeq || 0} 个事件`, auditTime(item.lastActivityAt || item.createdAt)].filter(Boolean).join(" · ");
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
  const readerIdentity = conversation.readerIdentity || {};
  const fields = [
    ["创建时间", auditTime(conversation.createdAt)],
    ["最近活动", auditTime(conversation.lastActivityAt)],
    ["登录账号", readerIdentity.account || "未记录"],
    ["当前角色", readerIdentity.currentRole || "未记录"],
    ["运行时", conversation.runtimeId || "尚未分配"],
    ["DSH Session", conversation.dshSessionId || "-"],
    ["Skill Profile", conversation.skillProfile || "default"],
    ["事件序号", String(conversation.lastSeq ?? 0)],
  ];
  if (state.auditScope === "admin" && conversation.owner) {
    fields.splice(4, 0, ["所属用户 ID", conversation.owner.userId || "-"]);
    fields.splice(5, 0, ["所属租户", conversation.owner.tenantId || "-"]);
  }
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
    const isSkillRoute = item.recordType === "skill.route";
    record.className = `audit-record audit-record-${String(item.category || "runtime").toLowerCase()}${isSkillRoute ? " audit-record-skill-route" : ""}`;
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

function renderAuditRecordLoadState() {
  const node = $("auditRecordLoadState");
  if (!node) return;
  if (!state.auditConversationId || !state.auditRecordTotal) {
    node.textContent = "";
    return;
  }
  node.textContent = state.auditRecordLoading
    ? "正在加载更多记录…"
    : `已加载 ${state.auditItems.length} / ${state.auditRecordTotal} 条记录`;
}

async function loadAuditDetail(conversationId, { append = false } = {}) {
  if (!conversationId) {
    state.auditRecordRequestId += 1;
    state.auditRecordLoading = false;
    state.auditRecordHasMore = false;
    state.auditRecordTotal = 0;
    state.auditItems = [];
    renderAuditOverview(null);
    renderAuditRecords([]);
    $("auditRecordLoadState").textContent = "";
    $("auditStatus").textContent = "尚未选择会话。";
    return;
  }
  const isSameConversation = state.auditConversationId === conversationId;
  if (state.auditRecordLoading && (append || isSameConversation)) return;
  const page = append && isSameConversation ? state.auditRecordPage + 1 : 1;
  if (append && (!state.auditRecordHasMore || !isSameConversation)) return;
  state.auditConversationId = conversationId;
  state.auditRecordPage = page;
  state.auditRecordLoading = true;
  const requestId = ++state.auditRecordRequestId;
  if (!append) {
    state.auditItems = [];
    state.auditRecordTotal = 0;
    state.auditRecordHasMore = false;
    renderAuditRecords([]);
  }
  renderAuditConversationList();
  renderAuditRecordLoadState();
  $("auditStatus").textContent = append ? "正在加载更多审计记录…" : "正在读取审计…";
  const category = $("auditCategoryFilter").value;
  const params = new URLSearchParams({ page: String(page), pageSize: String(state.auditRecordPageSize) });
  if (category) params.set("category", category);
  const search = $("auditRecordSearchInput")?.value.trim();
  if (search) params.set("search", search);
  try {
    const data = await consoleApi(`/api/v1/console/audit/conversations/${encodeURIComponent(conversationId)}?${params}`);
    if (requestId !== state.auditRecordRequestId) return;
    state.auditScope = data.scope || state.auditScope || "owner";
    const scopeNode = $("auditScope");
    if (scopeNode) scopeNode.textContent = state.auditScope === "admin" ? "管理员范围：全部账号 / 租户" : "当前账号范围";
    renderAuditConversationList();
    const receivedItems = data.items || [];
    state.auditItems = append ? [...state.auditItems, ...receivedItems] : receivedItems;
    state.auditRecordPage = data.page || page;
    state.auditRecordTotal = data.total || 0;
    state.auditRecordHasMore = state.auditItems.length < state.auditRecordTotal;
    renderAuditOverview(data.conversation);
    renderAuditRecords(state.auditItems);
    const sourceNote = data.source === "session_event_history" ? "（该会话使用历史事件兼容展示）" : "";
    $("auditStatus").textContent = `已加载 ${state.auditItems.length} / ${state.auditRecordTotal} 条记录${sourceNote}。`;
  } catch (error) {
    if (requestId !== state.auditRecordRequestId) return;
    if (!append) {
      state.auditItems = [];
      renderAuditOverview(null);
      renderAuditRecords([]);
    }
    $("auditStatus").textContent = `读取审计失败：${error.message}`;
  } finally {
    if (requestId === state.auditRecordRequestId) {
      state.auditRecordLoading = false;
      renderAuditRecordLoadState();
    }
  }
}

async function loadAuditConversations(page = state.auditConversationPage) {
  const requestedPage = Number(page);
  page = Number.isInteger(requestedPage) && requestedPage >= 1
    ? requestedPage
    : state.auditConversationPage;
  state.auditConversationPage = page;
  $("auditStatus").textContent = "正在读取会话列表…";
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(state.auditConversationPageSize) });
    const search = $("auditConversationSearchInput")?.value.trim();
    if (search) params.set("search", search);
    const data = await consoleApi(`/api/v1/console/audit/conversations?${params}`);
    state.auditConversations = data.conversations || data.items || [];
    state.auditConversationPage = data.page || page;
    state.auditConversationTotal = data.total || 0;
    state.auditScope = data.scope || "owner";
    state.auditLoaded = true;
    const scopeNode = $("auditScope");
    if (scopeNode) scopeNode.textContent = state.auditScope === "admin" ? "管理员范围：全部账号 / 租户" : "当前账号范围";
    renderAuditConversationList();
    renderPager("auditConversationPager", {
      page: state.auditConversationPage,
      pageSize: data.pageSize || state.auditConversationPageSize,
      total: state.auditConversationTotal,
      onPage: loadAuditConversations,
    });
    const current = state.auditConversations.find((item) => item.conversationId === state.auditConversationId)
      || state.auditConversations.find((item) => item.conversationId === state.conversationId)
      || state.auditConversations[0];
    await loadAuditDetail(current?.conversationId || "");
  } catch (error) {
    state.auditLoaded = false;
    $("auditConversationList").innerHTML = `<div class="empty">读取会话失败：${error.message}</div>`;
    $("auditConversationPager").replaceChildren();
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
  state.statusNode = null;
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
  if (state.ws?.readyState === WebSocket.OPEN) return state.ws;
  if (state.connectPromise) return state.connectPromise;
  state.connectPromise = (async () => {
    await loadUmcToken();
    const previous = state.ws;
    if (previous && previous.readyState <= 1) previous.close();
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${location.host}${dshUrl("/api/v1/ws")}?userId=${encodeURIComponent($("userId").value)}&tenantId=${encodeURIComponent($("tenantId").value)}`);
    state.ws = ws;
    const generation = ++state.wsGeneration;
    const ready = new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      ws.onopen = async () => {
        try {
          setConnection("已连接", true);
          const umcToken = state.umcToken || $("umcToken")?.value.trim() || "";
          if (umcToken) ws.send(JSON.stringify({ type: "auth", umctoken: umcToken }));
          if (!state.conversationId && !$("conversationId").value) {
            await createConversation();
          } else {
            state.conversationId = state.conversationId || $("conversationId").value;
            ws.send(JSON.stringify({ type: "subscribe", conversationId: state.conversationId, afterSeq: state.seq }));
          }
          if (!settled) {
            settled = true;
            resolve(ws);
          }
        } catch (error) {
          setConnection("连接错误", false);
          fail(error);
        }
      };
      ws.onclose = (event) => {
        if (state.ws === ws && state.wsGeneration === generation) {
          if (event.code === 4401) {
            state.consoleAuthenticated = false;
            showConsoleGate("控制台会话已过期，请重新输入密码。", true);
          }
          setConnection("已断开", false);
        }
        fail(new Error(event.code === 4401 ? "控制台会话已过期" : "WebSocket 已断开"));
      };
      ws.onerror = () => {
        if (state.ws === ws && state.wsGeneration === generation) setConnection("连接错误", false);
        fail(new Error("WebSocket 连接失败"));
      };
      ws.onmessage = (message) => {
        let packet;
        try {
          packet = JSON.parse(message.data);
        } catch {
          addEvent("system.error", "收到无法解析的 WebSocket 消息。", "ws");
          return;
        }
        if (packet.type === "accepted") {
          $("requestId").textContent = packet.requestId || "-";
          $("runtimeId").textContent = packet.runtimeId || $("runtimeId").textContent;
        }
        if (packet.type === "error") {
          const messages = {
            conversation_not_found: "会话不存在或当前 UMC 身份/租户无权访问。请新建会话后重试。",
            identity_mismatch: "UMC 身份与当前用户 ID 不一致，请重新获取登录会话。",
            umc_token_required: "UMC 会话尚未准备好，请稍后重试。",
          };
          addEvent("system.error", messages[packet.code] || packet.code || "WebSocket 请求失败。", packet.code || "ws");
          return;
        }
        if (packet.type !== "event") return;
        state.seq = Math.max(state.seq, packet.seq || 0);
        $("lastSeq").textContent = state.seq;
        const data = packet.data || {};
        if (packet.eventType === "assistant.welcome") {
          addEvent("assistant.welcome", data.content || "", `seq ${packet.seq}`);
        } else if (packet.eventType === "assistant.status") {
          showAssistantStatus(data, `seq ${packet.seq}`);
        } else if (packet.eventType === "assistant.chunk") {
          clearAssistantStatus();
          if (!state.assistantNode) state.assistantNode = addEvent("assistant.message", "", `seq ${packet.seq}`);
          state.assistantContent += data.content || "";
          renderLocalizedContent(state.assistantNode, state.assistantContent);
          $("events").scrollTop = $("events").scrollHeight;
        } else if (packet.eventType === "assistant.message") {
          clearAssistantStatus();
          state.assistantContent = data.content || state.assistantContent;
          if (!state.assistantNode) state.assistantNode = addEvent("assistant.message", state.assistantContent, `seq ${packet.seq}`);
          else renderLocalizedContent(state.assistantNode, state.assistantContent);
        } else if (packet.eventType === "user.message") {
          clearAssistantStatus();
          addEvent("user.message", data.content || "", `seq ${packet.seq}`);
          state.assistantNode = null;
          state.assistantContent = "";
        } else if (packet.eventType === "turn.completed") {
          clearAssistantStatus();
          addEvent(packet.eventType, JSON.stringify(data), `seq ${packet.seq}`);
          if (document.querySelector("#auditPanel.active") && state.auditConversationId === state.conversationId) {
            void loadAuditDetail(state.conversationId);
          }
        } else {
          if (packet.eventType === "runtime.error" || packet.eventType === "turn.cancelled") clearAssistantStatus();
          addEvent(packet.eventType, JSON.stringify(data), `seq ${packet.seq}`);
        }
      };
    });
    return await ready;
  })().finally(() => {
    state.connectPromise = null;
  });
  return state.connectPromise;
}

$("createBtn").addEventListener("click", async () => { try { await createConversation(); } catch (error) { addEvent("system.error", error.message); } });
$("connectBtn").addEventListener("click", () => { void connect().catch((error) => addEvent("system.error", error.message)); });
$("consoleAuthForm").addEventListener("submit", loginConsole);
$("consoleLogoutBtn").addEventListener("click", () => { void logoutConsole(); });
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
$("reloadConfigBtn").addEventListener("click", loadConfig);
$("saveConfigBtn").addEventListener("click", saveConfig);
$("reloadAuditBtn").addEventListener("click", () => { void loadAuditConversations(); });
$("auditConversationSearchInput").addEventListener("input", debounce(() => { void loadAuditConversations(1); }));
$("auditRecordSearchInput").addEventListener("input", debounce(() => { void loadAuditDetail(state.auditConversationId); }));
$("auditCategoryFilter").addEventListener("change", () => loadAuditDetail(state.auditConversationId));
$("auditConversationList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-conversation-id]");
  if (button) void loadAuditDetail(button.dataset.conversationId);
});
$("auditRecordList").addEventListener("scroll", (event) => {
  const list = event.currentTarget;
  const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 160;
  if (nearBottom && state.auditRecordHasMore && !state.auditRecordLoading) {
    void loadAuditDetail(state.auditConversationId, { append: true });
  }
});
$("generateTestsBtn").addEventListener("click", generateTests);
$("runTestsBtn").addEventListener("click", runTests);
$("selectAllTests").addEventListener("change", (event) => document.querySelectorAll(".case-check").forEach((node) => { node.checked = event.target.checked; }));
$("messageForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = $("message").value.trim();
  if (!content) return;
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    try {
      await connect();
    } catch (error) {
      addEvent("system.error", `连接失败：${error.message}`);
      return;
    }
  }
  state.conversationId = state.conversationId || $("conversationId").value;
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    addEvent("system.error", "WebSocket 尚未连接，请先点击“连接 WS”。");
    return;
  }
  state.ws.send(JSON.stringify({ type: "message", conversationId: state.conversationId, content, clientMessageId: createClientMessageId() }));
  $("message").value = "";
});

// Unlock the console before obtaining the configured account's UMC session;
// operators should never need to paste a token before connecting.
void bootstrapConsole();
