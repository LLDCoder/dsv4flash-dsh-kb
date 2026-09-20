const basePath = /^\/DSH(?:\/|$)/i.test(window.location.pathname) ? "/DSH" : "";
const $ = (id) => document.getElementById(id);
const state = { sessions: [], selectedId: "", messages: [], busy: false };

function apiUrl(path) { return `${basePath}${path}`; }
function headers() { return { "Content-Type": "application/json", "X-User-Id": $("userId").value.trim(), "X-Tenant-Id": $("tenantId").value.trim() }; }
function setStatus(text, error = false) { $("status").textContent = text; $("status").style.color = error ? "#a63d3d" : ""; }
function time(value) { if (!value) return "时间未知"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(); }
async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), { credentials: "same-origin", ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const text = await response.text(); let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }
  if (!response.ok) throw new Error(data.detail || `请求失败（${response.status}）`);
  return data;
}

async function login(event) {
  event.preventDefault(); $("loginStatus").textContent = "正在登录…";
  try {
    const response = await fetch(apiUrl("/api/v1/console/login"), { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("password").value }) });
    if (!response.ok) throw new Error("密码不正确或服务不可用");
    $("loginGate").hidden = true; $("workspace").hidden = false; await loadSessions();
  } catch (error) { $("loginStatus").textContent = error.message; }
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

function renderMessages() {
  const list = $("messages"); list.replaceChildren();
  if (!state.messages.length) { list.innerHTML = '<div class="empty">该会话还没有问题，发送第一条问题开始测试。</div>'; return; }
  state.messages.forEach((item) => { const node = document.createElement("article"); node.className = `message ${item.role === "user" ? "user" : "assistant"}`; const role = document.createElement("span"); role.className = "role"; role.textContent = item.role === "user" ? "问题" : "回答"; const content = document.createElement("div"); content.textContent = item.content || ""; node.append(role, content); list.append(node); }); list.scrollTop = list.scrollHeight;
}

async function createSession() {
  try { const data = await request("/api/v1/conversations", { method: "POST", body: JSON.stringify({ title: "新会话", workspace: "default", skillProfile: "default", runtimeProfile: "default" }) }); await loadSessions(data.conversationId); } catch (error) { setStatus(error.message, true); }
}
async function saveTitle() {
  if (!state.selectedId) return; const title = $("titleInput").value.trim(); if (!title) { setStatus("会话标题不能为空", true); return; }
  try { const data = await request(`/api/v1/ai-chat/conversations/${encodeURIComponent(state.selectedId)}`, { method: "PATCH", body: JSON.stringify({ title }) }); const item = state.sessions.find((entry) => entry.conversationId === state.selectedId); if (item) item.title = data.title || title; renderSessions(); setStatus("标题已保存"); } catch (error) { setStatus(error.message, true); }
}
async function deleteSession() {
  if (!state.selectedId || !window.confirm("确认删除这个会话及其问题、回答记录吗？")) return;
  try { await request(`/api/v1/ai-chat/conversations/${encodeURIComponent(state.selectedId)}`, { method: "DELETE" }); state.selectedId = ""; await loadSessions(); } catch (error) { setStatus(error.message, true); }
}

function appendStreamMessage(content) { const node = document.createElement("article"); node.className = "message assistant"; const role = document.createElement("span"); role.className = "role"; role.textContent = "回答 · 流式输出"; const body = document.createElement("div"); body.textContent = content; node.append(role, body); $("messages").append(node); $("messages").scrollTop = $("messages").scrollHeight; return body; }
async function sendMessage(event) {
  event.preventDefault(); const content = $("message").value.trim(); if (!content || !state.selectedId || state.busy) return; state.busy = true; $("sendBtn").disabled = true; $("message").value = ""; $("streamStatus").textContent = "正在检索知识库并生成回答…";
  let assistant = ""; let body = null;
  try {
    const response = await fetch(apiUrl("/api/v1/ai-chat/messages/stream"), { method: "POST", credentials: "same-origin", headers: { ...headers(), "X-FF-Conversation-ID": state.selectedId }, body: JSON.stringify({ message: content, conversation_id: state.selectedId, request_id: crypto.randomUUID() }) });
    if (!response.ok || !response.body) throw new Error(`流式请求失败（${response.status}）`);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const blocks = buffer.split("\n\n"); buffer = blocks.pop() || ""; for (const block of blocks) { const lines = block.split("\n"); const type = lines.find((line) => line.startsWith("event:"))?.slice(6).trim(); const raw = lines.find((line) => line.startsWith("data:"))?.slice(5).trim() || ""; if (type === "token") { assistant += raw; if (!body) body = appendStreamMessage(""); body.textContent = assistant; $("streamStatus").textContent = "正在接收回答…"; } else if (type === "status") { try { $("streamStatus").textContent = JSON.parse(raw).message || "正在处理…"; } catch {} } else if (type === "error") { throw new Error(JSON.parse(raw).detail || "回答失败"); } } }
    if (!body) { body = appendStreamMessage(assistant || "未收到回答内容"); }
    $("streamStatus").textContent = "回答完成"; await selectSession(state.selectedId); await loadSessions(state.selectedId);
  } catch (error) { $("streamStatus").textContent = error.message; setStatus(error.message, true); }
  finally { state.busy = false; $("sendBtn").disabled = false; }
}

$("loginForm").addEventListener("submit", login); $("refreshBtn").addEventListener("click", () => loadSessions()); $("newBtn").addEventListener("click", createSession); $("newSmallBtn").addEventListener("click", createSession); $("search").addEventListener("input", renderSessions); $("saveTitleBtn").addEventListener("click", saveTitle); $("deleteBtn").addEventListener("click", deleteSession); $("messageForm").addEventListener("submit", sendMessage);
$("logoutBtn").addEventListener("click", async () => { await fetch(apiUrl("/api/v1/console/logout"), { method: "POST", credentials: "same-origin" }); window.location.reload(); });
