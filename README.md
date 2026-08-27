# DSH External Service（Docker MVP）

这是按 `dsh-external-service-architecture.docx` 落地的第一版后台 Chatbot 闭环，所有运行依赖通过 Docker Compose 管理。

## 已实现的架构边界

- API Gateway/BFF：Principal 由 `X-User-Id`、`X-Tenant-Id` 传入；前端获取的 `umctoken` 使用 `Authorization: Bearer <UMC_TOKEN>` 按请求透传，原始 Token 不写入 Session 或普通日志，仅保留短指纹引用。
- Session Router：所有会话查询先校验 tenant/user 所有权。
- Session Persistence：共享 PostgreSQL 的追加式 `session_event`，按 `conversation_id + seq` 回放。
- WS 主通道：支持 `subscribe`、`resume`、`message`、`ack`、`cancel`；SSE 提供 `afterSeq` 重放和降级订阅。
- 幂等：`clientMessageId` 有唯一约束，重复提交不会重复创建用户事件。
- Runtime/Instance Manager：每个 conversation 一个独立逻辑租约，状态包含 `CLEAN_IDLE/STARTING/READY/BUSY/DRAINING/CLEANING/DEAD`。
- LLM Adapter：未配置模型时使用 mock，配置 `LLM_BASE_URL`/`LLM_API_KEY` 后调用 OpenAI-compatible streaming API（默认模型名 `deepseek-v4-flash`）。
- 对话语言策略：英文问题使用英文回答，阿语问题使用阿语回答，中文及其他语言统一回退到英文；工具结果、知识库内容或内部流程提示的语言不会覆盖该规则。
- 会话初始化：新建会话后持久化一条 `assistant.welcome` 英阿双语欢迎事件，并通过 WS/SSE 的序号回放机制展示；该事件不参与正常问答完成判定。
- 配置与 Skill API：提供版本化配置更新和运维 Skill CRUD，终端测试界面只选择会话，不上传 Skill。
- OCR Tool Gateway：只由 DSH Runtime 调用的内部工具服务，转发到 PaddleOCR-VL-1.6 产线 API；不向前端暴露 OCR 业务接口。
- Knowledge Tool Gateway：只由 DSH Runtime 调用的内部知识库工具服务，转发到 77 服务器 `18085` 的 `public/knowledge` 匿名只读接口；目录、文件和检索请求不向上游携带 Authorization。DSH 逻辑默认 `top_k=32`，向上游传递 BM25、图谱和向量三路检索模式；当前 77 代理对单次 `top_k` 的校验上限为 20，因此网关仅将线路参数安全截断到 `KNOWLEDGE_UPSTREAM_MAX_TOP_K=20`，避免上游 422；不开放上传、解析、删除、移动或原文件下载。
- Platform Data Access Gateway：只由 DSH Runtime 调用的内部平台接口服务，连接同一台 77 服务器的 UMC Data Access 根地址；仅转发申请详情、ISBN 查询和受控新增草稿三个已发布端点，调用必须携带当前请求的 UMC Token。正式提交 `type=1` 在网关层拒绝。

当前 MVP 的运行面使用后端容器内的逻辑 Runtime Lease，接口已将实例管理边界独立出来；后续可以把 `RuntimeManager` 的启动/清理实现替换为 Docker/Kubernetes 动态容器调度，而不改变会话、事件和 WebSocket 契约。

## 对话语言与欢迎语

DSH 根据用户最新一条消息确定当前轮次的输出语言。主要为阿语时使用阿语；英文及其他语言均使用英文。系统提示词会显式写入本轮目标语言，避免上游 Tool、检索证据或内部流程提示改变回答语言。

每个新会话的首个持久化事件为以下双语欢迎语：

> Hello! 👋 I’m your AI assistant for the National Media Authority (NMA). Tell me about your work or publishing needs, and I’ll help you find the right services.
>
> مرحباً! 👋 أنا مساعدك الذكي من الهيئة الوطنية للإعلام (NMA). أخبرني عن عملك أو احتياجاتك للنشر، وسأساعدك في اختيار الخدمات المناسبة.

## PaddleOCR-VL-1.6

OCR Gateway 默认指向 `http://ocr-vl-api:8080`。`docker compose up -d` 会启动官方 PaddleOCR-VL API 和底层 NVIDIA/CUDA VLM 推理容器，模型固定为 `PaddleOCR-VL-1.6-0.9B`（可通过 `OCR_MODEL_NAME` 配置）：

```bash
docker compose up -d
```

OCR 是 DSH 的正式内部工具依赖，未配置可用 NVIDIA GPU 时 OCR 链路不会被标记为就绪。官方服务提供 `POST /layout-parsing`，其中 `file` 接受 URL 或 Base64，`fileType=0` 表示 PDF、`fileType=1` 表示图片。生产环境可通过 `OCR_VLM_BACKEND` 在 `vllm`/`fastdeploy` 间选择，并按显卡调整 `OCR_GPU_DEVICE`。

可在容器内分别检查 Gateway 存活和完整 OCR 链路就绪状态：

```bash
docker compose exec ocr-gateway python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8100/healthz').read().decode())"
docker compose exec ocr-gateway python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8100/readyz').read().decode())"
```

DSH Runtime 的本地工具边界可用以下开发标记验证（生产环境由 DSH Harness 原生 tool-call 替换）：

```bash
curl -X POST http://localhost:8000/api/v1/conversations/{conversationId}/messages \
  -H "X-User-Id: demo-user" \
  -H "Content-Type: application/json" \
  -d '{"content":"/tool ocr.layout_parsing {\"file\":\"https://example.com/sample.pdf\",\"fileType\":0}","clientMessageId":"ocr-001"}'
```

## 77 知识库 Tool

知识库服务只在 Docker 网络内暴露给 `backend`，外部客户端通过 DSH Runtime 间接调用。首期使用附件中推荐的匿名只读接口：目录树、文件元数据和目录检索。上游地址由 `KNOWLEDGE_BASE_URL` 配置，默认是 `http://77.242.240.158:18085/api/platform/api/v1`。

DSH Runtime 的开发标记示例（DSH 外层请求仍可带当前会话的 UMC Token，但知识库 public 上游不要求该 Token）：

```bash
curl -X POST http://localhost:8000/api/v1/conversations/{conversationId}/messages \
  -H "X-User-Id: demo-user" \
  -H "Authorization: Bearer <UMC_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"/tool knowledge.search {\"query\":\"media regulation\",\"folder_id\":\"34a89aa7b43b473d8326cf6540fc3894\",\"top_k\":32}","clientMessageId":"kb-001"}'
```

可用工具名：

- `knowledge.search`：必须传 `query` 和 `folder_id`；默认召回 32 条，三路模式由 `KNOWLEDGE_RETRIEVAL_MODES=bm25,graph,vector` 配置并作为兼容提示随请求传给代理。最终是否启用某一路由由 18085 上游版本决定；当前 public 返回中的 `retrieval_mode=vector`/`completed_channels=["vector"]` 只能说明向量单路完成，不能当作三路均已执行。
- `knowledge.folders_tree`：获取当前租户可见目录树。
- `knowledge.files`：读取目录文件元数据，可选 `folder_id`、`recursive`。
- `knowledge.files_page`：分页读取文件元数据，`page_size` 范围 10–100。

附件中的鉴权管理接口（上传、解析、删除、移动、原文件下载等）不在 DSH Tool 范围内；如未来开放写操作，应另行接入平台身份与权限校验。

## UMC Data Access（更新版匿名代理）

上游统一地址：`http://77.242.240.158:18085/api/platform/api/v1/public/data-access`。它是匿名 Backend 代理，但调用方必须携带自己的 UMC Bearer Token；DSH 不再配置或转发其他平台 Token。

### UMC 客户登录 Token

客户门户获取 UMC Token 使用：`POST http://77.242.240.158:18085/api/User/Login`。请求体由客户门户前端组装，字段为 `loginProvider`（邮箱）、`providerKey`（前端加密后的密码）和 `loginType`（PC 端为 `2`）；登录成功后从响应中的 `token` 获取 UMC Bearer Token。密码不应以明文 `providerKey` 发送，也不应写入 DSH 配置或日志。

`/api/v1/login/umc/access-token` 是 FF AI 平台的会话交换接口，不是客户门户登录接口，DSH 不调用该接口。拿到客户门户 Token 后，按请求放入 `Authorization: Bearer <UMC_TOKEN>`，由 DSH 透传给知识库和 UMC Data Access 代理。

当前内部 Tool 映射：

- `umc.application_detail` → `POST /data-access/application-detail` → `nma-application-detail`
- `umc.book_by_isbn` → `POST /data-access/book-by-isbn` → `nma-book-by-isbn`
- `umc.add_application` → `POST /data-access/add-application` → `nma-add-new-application`

其中新增申请只允许受控草稿（`type=3`、`isTest=true`）；正式提交 `type=1` 会被 DSH 网关拒绝。新增草稿会产生真实持久化数据，必须经过用户确认。三类 Tool 都只使用当前请求的 `umctoken`，不把 Token 写入数据库或事件。

开发环境可通过 DSH Runtime 工具边界验证，例如：

```bash
curl -X POST http://localhost:8000/api/v1/conversations/{conversationId}/messages \
  -H "X-User-Id: demo-user" \
  -H "Authorization: Bearer <UMC_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"/tool umc.book_by_isbn {\"isbn\":\"9781302000011\"}","clientMessageId":"isbn-001"}'
```

## 77 平台 Swagger Tool

平台 Swagger 与知识库使用相同服务器 IP，但挂载路径不同：

- Swagger/OpenAPI：`http://77.242.240.158:18085/api/platform/api/v1/openapi.json`
- 平台网关（Docker 内）：`http://platform-gateway:8102`
- 兼容应用分页：`POST /api/MyRequest/ApplicationPage`，请求体 `{"pageIndex":1,"pageSize":100}`；如启用，仍只转发当前请求的 UMC Token。
- 更新版 Data Access 工具见上节；申请详情、ISBN 和新增草稿使用 `umc.application_detail`、`umc.book_by_isbn`、`umc.add_application`，不会配置固定平台 Token。

新的 UMC 代理不要求 DSH 配置平台 Token、Data Gateway Token 或固定账号。前端登录后获得的 `umctoken` 必须在每次 HTTP 请求的 `Authorization` 头中传入；浏览器 WebSocket 则在连接后发送一次 `{"type":"auth","umctoken":"..."}`。本地没有可用的 UMC Token 时，DSH 只返回“需要认证”，不生成个人账户结果。

## 启动

```bash
cp .env.example .env
docker compose up --build -d
```

访问：

- 测试控制台：http://localhost:18080（可用 `FRONTEND_PORT` 覆盖）
- 运行配置：在控制台“运行配置”页维护 LLM API Key、DB/Redis URL、知识库/Swagger/OCR Tool URL 和 Tool 开关；UMC Token 可先通过客户门户 `/api/User/Login` 获取，再在对话测试栏按当前会话输入，不保存到配置页。API Key/DB/Redis 只显示配置状态，不回显密文。
- 多语言业务测试：在控制台“多语言业务测试”页从 `/umc` 知识库目录生成 English/العربية 测试集，并执行 DSH 端到端路由、检索、Tool 和 5 分制评分。
- DSH API Swagger：http://localhost:8000/docs
- DSH OpenAPI JSON：http://localhost:8000/openapi.json
- 健康检查：http://localhost:8000/healthz

`knowledge-gateway` 和 `ocr-gateway` 只在 Docker 网络内供 DSH Runtime 使用，不直接发布宿主机 Swagger 端口；外部调用应通过 DSH API/Runtime 边界完成。

停止：

```bash
docker compose down
```

### 测试控制台 API

页面使用以下开发接口，均经过 DSH Principal 边界：

- `GET/PATCH /api/v1/config?scope=system`：读取或保存运行配置；敏感值由服务端遮罩，空白 Secret 不会覆盖原值。
- `POST /api/v1/test-cases/generate`：从实时知识库目录生成 English/阿语跨业务用例，默认 `top_k=32`、`bm25,graph,vector`。
- `POST /api/v1/test-cases/run`：并发执行最多 40 条用例，返回路由、工具、完成状态、回答和 5 分制评分。

DB/Redis URL 只作为部署参数保存，修改后需要重新创建 backend 容器；LLM、知识库、平台和 OCR Tool 的地址/密钥在后续请求中热更新。生产环境应关闭开发 Principal 回退并由受信任 API Gateway 注入 `X-User-Id`/`X-Tenant-Id`。

如需删除本项目数据库和 Redis 数据，明确确认后再执行 `docker compose down -v`。

## 变更记录

- 2026-08-28：PaddleOCR-VL-1.6 改为 Docker 默认必需服务，固定 `PaddleOCR-VL-1.6-0.9B`，增加完整链路就绪检查并修复官方 VLM 服务网络解析；新增英/阿语输出策略和会话双语欢迎事件。
- 2026-08-27：完成 Docker DSH 基线、请求级 UMC Token 匿名代理、草稿写入确认、知识库 `top_k` 兼容与 public 代理鉴权修复，并执行 Term1/Term2 全量回归。

逐提交说明、验证记录和兼容性变化见 [CHANGELOG.md](CHANGELOG.md)。

## WS 示例

```json
{"type":"subscribe","conversationId":"conv_xxx","afterSeq":0}
{"type":"message","conversationId":"conv_xxx","content":"你好","clientMessageId":"client-001"}
```

## 首期验收路径（G1/G2）

1. 打开测试对话台并连接 WS。
2. 新建会话，发送一条消息，观察 `user.message`、`turn.started`、`assistant.chunk`、`assistant.message` 和 `turn.completed`。
3. 刷新或通过 `afterSeq`/`resume` 重放历史事件。
4. 使用相同 `clientMessageId` 重复提交，确认服务返回 `duplicate: true` 且不会新增用户事件。
