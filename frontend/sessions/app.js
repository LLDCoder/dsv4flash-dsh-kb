const basePath = /^\/DSH(?:\/|$)/i.test(window.location.pathname) ? "/DSH" : "";
const $ = (id) => document.getElementById(id);
const state = { sessions: [], selectedId: "", messages: [], busy: false };
const principal = { userId: "demo-user", tenantId: "kb-only" };
function requestId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `kb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function apiUrl(path) { return `${basePath}${path}`; }
function headers() { return { "Content-Type": "application/json", "X-User-Id": principal.userId, "X-Tenant-Id": principal.tenantId }; }
function setStatus(text, error = false) { $("status").textContent = text; $("status").style.color = error ? "var(--danger)" : ""; }
function setStreamStatus(text, loading = false) { $("streamStatusText").textContent = text || ""; $("loadingDots").hidden = !loading; $("streamStatus").classList.toggle("is-loading", loading); }
function time(value) { if (!value) return "时间未知"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(); }
async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), { credentials: "same-origin", ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const text = await response.text(); let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }
  if (!response.ok) throw new Error(data.detail || `请求失败（${response.status}）`);
  return data;
}

function renderSessions() {
  const search = $("search").value.trim().toLowerCase(); const list = $("sessionList"); list.replaceChildren();
  const items = state.sessions.filter((item) => `${item.title || ""} ${item.conversationId || ""}`.toLowerCase().includes(search));
  $("count").textContent = `${state.sessions.length} 个`;
  if (!items.length) { list.innerHTML = '<div class="empty">暂无会话记录。</div>'; return; }
  items.forEach((item) => {
    const button = document.createElement("button"); button.type = "button"; button.className = `session-item${item.conversationId === state.selectedId ? " active" : ""}`;
    const title = document.createElement("strong"); title.textContent = item.title || "未命名会话";
    const meta = document.createElement("span"); meta.className = "session-meta"; meta.textContent = `${item.status || "READY"} · ${time(item.lastActivityAt || item.createdAt)}`;
    button.append(title, meta); button.addEventListener("click", () => selectSession(item.conversationId)); list.append(button);
  });
}

async function loadSessions(selectId = state.selectedId) {
  setStatus("正在读取会话…");
  try { const data = await request("/api/v1/ai-chat/conversations"); state.sessions = data.conversations || []; renderSessions(); const target = state.sessions.find((item) => item.conversationId === selectId) || state.sessions[0]; if (target) await selectSession(target.conversationId); else showEmpty(); setStatus(`已读取 ${state.sessions.length} 个会话`); }
  catch (error) { setStatus(error.message, true); }
}

function showEmpty() { state.selectedId = ""; $("emptyDetail").hidden = false; $("detail").hidden = true; renderSessions(); }
async function selectSession(id) {
  state.selectedId = id; renderSessions();
  try { const data = await request(`/api/v1/ai-chat/conversations/${encodeURIComponent(id)}/messages`); state.messages = data.messages || []; const item = state.sessions.find((entry) => entry.conversationId === id); $("titleInput").value = item?.title || "未命名会话"; $("conversationId").textContent = id; $("emptyDetail").hidden = true; $("detail").hidden = false; renderMessages(); }
  catch (error) { setStatus(error.message, true); }
}

function renderRichText(target, value) {
  target.replaceChildren();
  const text = String(value || "");
  const pattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) target.append(document.createTextNode(text.slice(cursor, match.index)));
    const strong = document.createElement("strong");
    strong.textContent = match[1];
    target.append(strong);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) target.append(document.createTextNode(text.slice(cursor)));
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  const copied = document.execCommand("copy");
  helper.remove();
  if (!copied) throw new Error("浏览器未允许复制操作");
}

function createAnswerButton(className, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function addAnswerActions(node, getText, question, canRefresh) {
  const actions = document.createElement("div");
  actions.className = "answer-actions";
  const copyButton = createAnswerButton("copy-message", "复制", async () => {
    try {
      await copyText(String(getText() || ""));
      copyButton.textContent = "已复制";
      copyButton.classList.add("is-copied");
    } catch {
      copyButton.textContent = "复制失败";
    }
    window.setTimeout(() => { copyButton.textContent = "复制"; copyButton.classList.remove("is-copied"); }, 1500);
  });
  copyButton.setAttribute("aria-label", "复制回答");
  actions.append(copyButton);
  if (canRefresh && question) {
    const refreshButton = createAnswerButton("refresh-message", "重新回答", () => retryAnswer(question));
    refreshButton.setAttribute("aria-label", "重新回答");
    if (state.busy) refreshButton.disabled = true;
    actions.append(refreshButton);
  }
  node.append(actions);
}

function scrollMessagesToBottom(force = false) {
  const list = $("messages");
  if (!list) return;
  const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
  if (force || distanceFromBottom <= 48) list.scrollTop = list.scrollHeight;
}

function renderMessages() {
  const list = $("messages"); list.replaceChildren();
  if (!state.messages.length) { list.innerHTML = '<div class="empty">该会话还没有问题，发送第一条问题开始测试。</div>'; return; }
  const latestAssistantIndex = state.messages.reduce((latest, item, index) => item.role === "user" ? latest : index, -1);
  state.messages.forEach((item, index) => { const node = document.createElement("article"); node.className = `message ${item.role === "user" ? "user" : "assistant"}`; const role = document.createElement("span"); role.className = "role"; role.textContent = item.role === "user" ? "问题" : "回答"; const content = document.createElement("div"); renderRichText(content, item.content); node.append(role, content); if (item.role !== "user") { const question = [...state.messages.slice(0, index)].reverse().find((entry) => entry.role === "user")?.content || ""; addAnswerActions(node, () => content.textContent, question, index === latestAssistantIndex); } list.append(node); }); scrollMessagesToBottom(true);
}

async function createSession() {
  try { const data = await request("/api/v1/ai-chat/conversations", { method: "POST", body: JSON.stringify({ title: "新会话", workspace: "default", skillProfile: "default", runtimeProfile: "default" }) }); await loadSessions(data.conversationId); } catch (error) { setStatus(error.message, true); }
}
async function saveTitle() {
  if (!state.selectedId) return; const title = $("titleInput").value.trim(); if (!title) { setStatus("会话标题不能为空", true); return; }
  try { const data = await request(`/api/v1/ai-chat/conversations/${encodeURIComponent(state.selectedId)}`, { method: "PATCH", body: JSON.stringify({ title }) }); const item = state.sessions.find((entry) => entry.conversationId === state.selectedId); if (item) item.title = data.title || title; renderSessions(); setStatus("标题已保存"); } catch (error) { setStatus(error.message, true); }
}
async function deleteSession() {
  if (!state.selectedId || !window.confirm("确认删除这个会话及其问题、回答记录吗？")) return;
  try { await request(`/api/v1/ai-chat/conversations/${encodeURIComponent(state.selectedId)}`, { method: "DELETE" }); state.selectedId = ""; await loadSessions(); } catch (error) { setStatus(error.message, true); }
}

function appendUserMessage(content) { const node = document.createElement("article"); node.className = "message user"; const role = document.createElement("span"); role.className = "role"; role.textContent = "问题"; const body = document.createElement("div"); renderRichText(body, content); node.append(role, body); $("messages").append(node); scrollMessagesToBottom(true); }
function appendStreamMessage(content, question) { const node = document.createElement("article"); node.className = "message assistant streaming"; const role = document.createElement("span"); role.className = "role"; role.textContent = "回答 · 流式输出"; const body = document.createElement("div"); renderRichText(body, content); node.append(role, body); addAnswerActions(node, () => body.textContent, question, true); $("messages").append(node); scrollMessagesToBottom(true); return body; }
function parseSseData(raw) { try { return JSON.parse(raw); } catch { return raw; } }
function dispatchSseBlock(block, onEvent) {
  const lines = block.split(/\r?\n/); const type = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  if (!type) return; const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).replace(/^ /, "")).join("\n"); onEvent(type, parseSseData(data));
}
async function runQuestion(content) {
  if (!content || !state.selectedId || state.busy) return; state.busy = true; $("sendBtn").disabled = true; $("message").value = ""; $("messageForm").classList.add("is-busy"); appendUserMessage(content); setStreamStatus("正在检索知识库并生成回答…", true);
  let assistant = ""; let body = null;
  try {
    const response = await fetch(apiUrl("/api/v1/ai-chat/messages/stream"), { method: "POST", credentials: "same-origin", headers: { ...headers(), Accept: "text/event-stream", "X-FF-Conversation-ID": state.selectedId }, body: JSON.stringify({ message: content, conversation_id: state.selectedId, request_id: requestId() }) });
    if (!response.ok || !response.body) throw new Error(`流式请求失败（${response.status}）`);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    const handleEvent = (type, data) => { if (type === "token") { const token = typeof data === "string" ? data : String(data?.content || ""); assistant += token; if (!body) body = appendStreamMessage("", content); renderRichText(body, assistant); scrollMessagesToBottom(); setStreamStatus("正在接收回答…", false); } else if (type === "status") { setStreamStatus(data?.message || "正在处理…", true); } else if (type === "error") { throw new Error(data?.detail || "回答失败"); } else if (type === "end") { setStreamStatus("回答完成", false); } };
    while (true) { const { value, done } = await reader.read(); buffer += decoder.decode(value || new Uint8Array(), { stream: !done }); const blocks = buffer.split(/\r?\n\r?\n/); buffer = blocks.pop() || ""; blocks.forEach((block) => dispatchSseBlock(block, handleEvent)); if (done) break; }
    if (buffer.trim()) dispatchSseBlock(buffer, handleEvent);
    if (!body) { body = appendStreamMessage(assistant || "未收到回答内容", content); }
    setStreamStatus("回答完成", false); await loadSessions(state.selectedId);
  } catch (error) { setStreamStatus(error.message, false); setStatus(error.message, true); }
  finally { state.busy = false; $("sendBtn").disabled = false; $("messageForm").classList.remove("is-busy"); }
}

async function retryAnswer(question) { await runQuestion(String(question || "").trim()); }
async function sendMessage(event) { event.preventDefault(); await runQuestion($("message").value.trim()); }

$("refreshBtn").addEventListener("click", () => loadSessions()); $("newBtn").addEventListener("click", createSession); $("newSmallBtn").addEventListener("click", createSession); $("search").addEventListener("input", renderSessions); $("saveTitleBtn").addEventListener("click", saveTitle); $("deleteBtn").addEventListener("click", deleteSession); $("messageForm").addEventListener("submit", sendMessage);
loadSessions();
