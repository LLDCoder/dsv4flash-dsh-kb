# Admin DSH Portal Reader

这是 Admin Portal 的知识库与只读页面问答服务，所有运行依赖通过 Docker Compose 管理。

## 已实现的架构边界

- API Gateway/BFF：Principal 由 `X-User-Id`、`X-Tenant-Id` 传入；前端获取的 `umctoken` 使用 `Authorization: Bearer <UMC_TOKEN>` 按请求透传，原始 Token 不写入 Session 或普通日志，仅保留短指纹引用。
- Session Router：普通会话读写接口先校验 tenant/user 所有权；对话审计接口默认同样隔离，只有显式 allowlist 的管理员审计范围才可跨账号/租户读取。
- Session Persistence：共享 PostgreSQL 的追加式 `session_event`，按 `conversation_id + seq` 回放。
- WS 主通道：支持 `subscribe`、`resume`、`message`、`ack`、`cancel`；SSE 提供 `afterSeq` 重放和降级订阅。
- 幂等：`clientMessageId` 有唯一约束，重复提交不会重复创建用户事件。
- Runtime/Instance Manager：每个 conversation 一个独立逻辑租约，状态包含 `CLEAN_IDLE/STARTING/READY/BUSY/DRAINING/CLEANING/DEAD`。
- LLM Adapter：未配置模型时使用 mock，配置 `LLM_BASE_URL`/`LLM_API_KEY` 后调用 OpenAI-compatible streaming API（默认模型名 `deepseek-v4-flash`）。
- 对话语言策略：英文问题使用英文回答，阿语问题使用阿语回答，中文及其他语言统一回退到英文；工具结果、知识库内容或内部流程提示的语言不会覆盖该规则。
- 会话初始化：新建会话后持久化一条 `assistant.welcome` 英阿双语欢迎事件，并通过 WS/SSE 的序号回放机制展示；该事件不参与正常问答完成判定。
- 固定能力边界：Admin 运行态只保留通用 `admin_portal_reader` 和 `general_knowledge`；不提供任意业务 Skill 创建、模块路由或业务 Tool 绑定入口。页面和流程差异由知识库手册与当前会话权限决定。
- Knowledge Tool Gateway：只由 DSH Runtime 调用的内部知识库工具服务，转发到 77 服务器 `18085` 的 `public/knowledge` 匿名只读接口；目录、文件和检索请求不向上游携带 Authorization。DSH 逻辑默认 `top_k=32`，向上游传递 BM25、图谱和向量三路检索模式；当前 77 代理对单次 `top_k` 的校验上限为 20，因此网关仅将线路参数安全截断到 `KNOWLEDGE_UPSTREAM_MAX_TOP_K=20`，避免上游 422；不开放上传、解析、删除、移动或原文件下载。
- Admin Portal Reader：先从 `GetUserInfo` 建立当前会话权限上下文，再由 Subagent 检索知识库手册并通过 `admin.portal.read` 读取必要页面。页面工具在执行层限制为导航、查询、筛选、分页、页签和详情展开，禁止所有业务写操作、上传、下载和导出。

## 链路审计与数据留存

Backend 会把每轮用户/助手对话、Reader 选择、知识检索、页面读取、LLM 请求元数据、完整流式回答和可用的 `reasoning_content` 写入 PostgreSQL 的 `audit_record` 表。页面地址、权限指纹、筛选条件、读取时间、受限原始提取内容和错误分类只保留在审计记录中；模型只接收精简结构化事实。生成期间的 `assistant.chunk` 仅通过 Broker 实时发送，最终 `assistant.message` 和 `llm.response` 是可回放、可审计的权威结果。Token、密码、Authorization、Cookie、Session 和 API Key 等凭据形态字段会在审计副本中脱敏，原始 UMC Token 不写入数据库。

测试控制台的“对话审计”页调用 `GET /api/v1/conversations/{conversationId}/audit`。默认按会话所有权校验，普通账号只能查看自己的租户和账号记录；每条记录可展开查看脱敏后的用户/助手内容、Reader 路由、知识和页面读取证据、LLM 请求/思考/回答及异常信息。

如果部署的是隔离的 Chatbot 管理员控制台，可通过运行环境显式开启全局审计范围：`AUDIT_ADMIN_ENABLED=true`，并将管理员的 UMC User ID 填入 `AUDIT_ADMIN_USER_IDS`（多个 ID 用逗号分隔）。仅命中 allowlist 的账号会收到 `scope=admin`，可查看任意账号和租户的审计；`*` 仅适用于已由网关隔离的管理员专用部署。部署环境中的管理员 allowlist 作为可信引导配置，优先于数据库里历史保存的关闭值，避免升级后因旧运行配置继续看不到记录。审计管理员开关和 allowlist 只能由已具备全局审计权限的管理员在控制台修改，默认关闭，不会因为选择 `admin` Portal 自动放大权限。未开启时接口返回 `scope=owner`。

## 测试控制台密码

测试控制台启动时会在 PostgreSQL `config_entry`（`scope=system`、`key=console_password`）中初始化固定控制台密码。页面登录成功后仅获得短期 HttpOnly Cookie；测试 API 和 WebSocket 均要求该 Cookie，密码不会回显到配置页、响应或普通日志。密码遗失时，使用受控的数据库管理员账号查询：

```sql
SELECT value->>'value' AS console_password
FROM config_entry
WHERE scope = 'system' AND key = 'console_password';
```

该字段按需求可恢复，但应限制 PostgreSQL 账号和备份的访问权限；不要把查询结果写入前端代码或提交到 Git。

完整的控制台登录、接口保护和审计范围说明见 [`doc/console-permissions.md`](doc/console-permissions.md)。

当前 MVP 的运行面使用后端容器内的逻辑 Runtime Lease，接口已将实例管理边界独立出来；后续可以把 `RuntimeManager` 的启动/清理实现替换为 Docker/Kubernetes 动态容器调度，而不改变会话、事件和 WebSocket 契约。

## 对话语言与欢迎语

DSH 根据用户最新一条消息确定当前轮次的输出语言。主要为阿语时使用阿语；英文及其他语言均使用英文。系统提示词会显式写入本轮目标语言，避免上游 Tool、检索证据或内部流程提示改变回答语言。

每个新会话的首个持久化事件为以下双语欢迎语：

> Hello! 👋 I’m your AI assistant for the National Media Authority (NMA). Tell me about your work or publishing needs, and I’ll help you find the right services.
>
> مرحباً! 👋 أنا مساعدك الذكي من الهيئة الوطنية للإعلام (NMA). أخبرني عن عملك أو احتياجاتك للنشر، وسأساعدك في اختيار الخدمات المناسبة.

## 77 知识库

知识库服务只在 Docker 网络内暴露给 `backend`，外部客户端通过 DSH Runtime 间接调用。首期使用附件中推荐的匿名只读接口：目录树、文件元数据和目录检索。上游地址由 `KNOWLEDGE_BASE_URL` 配置，默认是 `http://77.242.240.158:18085/api/platform/api/v1`。

模型只可调用 `knowledge.search`，必须传 `query` 和 `folder_id`。目录树和文件列表仅供内部运维检查，不暴露给 Agent。

附件中的鉴权管理接口（上传、解析、删除、移动、原文件下载等）不在 DSH Tool 范围内；如未来开放写操作，应另行接入平台身份与权限校验。

## Admin Portal Reader

Admin 请求不再通过模块级 Skill 或 Swagger 业务 Tool 路由。`admin_portal_reader` Subagent 使用当前请求的 UMC Token 调用 Admin `GetUserInfo`，检索知识库中的公共页面手册和角色差异，再通过 `admin.portal.read` 读取当前问题所需页面。详细工程契约见 [`doc/admin-portal-reader/module-contract.yaml`](doc/admin-portal-reader/module-contract.yaml)。

`admin.portal.read` 只接受封闭的读取动作；PUT、PATCH、DELETE 一律阻断，POST 仅允许服务端固定白名单内的 `GetUserInfo`、Licensing 任务列表和许可证列表查询。下载、导出、上传、客户端日志和业务操作不会被执行。Subagent 最多读取 3 个页面，并把结果压缩为 `success`、`no_data`、`no_permission`、`load_failed` 或 `not_confirmed`。

## 启动

```bash
cp .env.example .env
docker compose up --build -d
```

### Admin 本机轻量启动

Admin 本机开发使用轻量 Compose 文件：

```bash
docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml up --build -d
```

`.env.lite` 保留远端运行参数，后置的 `.env.admin.postgres18.local` 将数据库覆盖为 Docker 网络内的 `postgres:5432/dsh`。日常开发和配置写入只能使用这个本地 PostgreSQL 18；远端 Admin 数据库仅作为显式刷新本地副本时的只读来源。

访问：

- Admin 本地入口：统一使用 http://localhost:18086；`/dsh-audit` 代理到 Admin DSH 前端，`/swagger` 代理到 Admin Service。
- 运行配置：在控制台“运行配置”页维护 LLM、数据库、Redis、知识库和 Portal Reader 基础参数及可编辑的全局系统提示词；系统提示词会追加到每轮请求，但内置语言、安全和证据规则仍优先。UMC 会话只使用当前请求透传的 Token，不使用服务账号自动登录。密钥与连接凭据只显示配置状态，不回显原文。
- Reader 路由：Admin 环境的文本问题固定进入 `admin_portal_reader`，由 Reader 自己判断只检索手册还是继续读取页面。不再提供 keyword、shadow、业务域召回、附件 OCR 或模块级 fallback。
- Skills：数据库与运行态只保留 `admin_portal_reader` 和 `general_knowledge`，且不提供控制台 CRUD。
- Tools：模型只可使用 `knowledge.search` 和 `admin.portal.read`。页面 Reader 的网络策略由服务端精确白名单维护，不依赖可编辑的旧 Tool Registry。
- 回归测试：使用 [`doc/admin-portal-reader/regression.yaml`](doc/admin-portal-reader/regression.yaml) 验证权限、结果状态、只读阻断、审计和浏览器会话隔离。
- DSH API Swagger：http://localhost:8000/docs
- DSH OpenAPI JSON：http://localhost:8000/openapi.json
- 健康检查：http://localhost:8000/healthz

`knowledge-gateway` 只在 Docker 网络内供 DSH Runtime 使用，不直接发布宿主机端口；外部调用应通过 DSH API/Runtime 边界完成。

停止：

```bash
docker compose down
```

### 测试控制台 API

页面使用以下开发接口，均经过 DSH Principal 边界：

- `GET/PATCH /api/v1/config?scope=system`：读取或保存运行配置；敏感值由服务端遮罩，空白 Secret 不会覆盖原值。
- `GET /api/v1/skills?scope=system`：只读查看两个固定通用 Skill；不再提供 Skill 创建或更新 API。
- `POST /api/v1/test-cases/generate`：从实时知识库目录生成 Dashboard/Licensing Reader 用例，默认 `top_k=32`、`bm25,graph,vector`。
- `POST /api/v1/test-cases/run`：并发执行最多 40 条用例，返回路由、工具、完成状态、回答和 5 分制评分。

DB/Redis URL 只作为部署参数保存，修改后需要重新创建 backend 容器；LLM、知识库和 Portal Reader 的地址/密钥在后续请求中热更新。生产环境应关闭开发 Principal 回退并由受信任 API Gateway 注入 `X-User-Id`/`X-Tenant-Id`。

如需删除本项目数据库和 Redis 数据，明确确认后再执行 `docker compose down -v`。

## 变更记录

- 2026-09-04：Admin 运行面切换为固定 `admin_portal_reader` 与 `general_knowledge`，删除旧模块 Skill 路由、业务 Tool Registry、附件 OCR 和 Customer 流程。

逐提交说明、验证记录和兼容性变化见 [CHANGELOG.md](CHANGELOG.md)。

## WS 示例

```json
{"type":"subscribe","conversationId":"conv_xxx","afterSeq":0}
{"type":"message","conversationId":"conv_xxx","content":"你好","clientMessageId":"client-001"}
```

## 首期验收路径（G1/G2）

1. 打开测试对话台并连接 WS。
2. 新建会话，发送一条消息，观察 `user.message`、`turn.started`、`assistant.status`、`assistant.chunk`、`assistant.message` 和 `turn.completed`。`assistant.status` 会在外部 Tool 或 LLM 等待期间提供可安全展示的进度提示。
3. 刷新或通过 `afterSeq`/`resume` 重放历史事件。
4. 使用相同 `clientMessageId` 重复提交，确认服务返回 `duplicate: true` 且不会新增用户事件。
