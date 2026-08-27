# DSH External Service（Docker MVP）

这是按 `dsh-external-service-architecture.docx` 落地的第一版后台 Chatbot 闭环，所有运行依赖通过 Docker Compose 管理。

## 已实现的架构边界

- API Gateway/BFF：Principal 由 `X-User-Id`、`X-Tenant-Id` 传入；原始 Token 不写入 Session 或普通日志，仅保留短指纹引用。
- Session Router：所有会话查询先校验 tenant/user 所有权。
- Session Persistence：共享 PostgreSQL 的追加式 `session_event`，按 `conversation_id + seq` 回放。
- WS 主通道：支持 `subscribe`、`resume`、`message`、`ack`、`cancel`；SSE 提供 `afterSeq` 重放和降级订阅。
- 幂等：`clientMessageId` 有唯一约束，重复提交不会重复创建用户事件。
- Runtime/Instance Manager：每个 conversation 一个独立逻辑租约，状态包含 `CLEAN_IDLE/STARTING/READY/BUSY/DRAINING/CLEANING/DEAD`。
- LLM Adapter：未配置模型时使用 mock，配置 `LLM_BASE_URL`/`LLM_API_KEY` 后调用 OpenAI-compatible streaming API（默认模型名 `deepseek-v4-flash`）。
- 配置与 Skill API：提供版本化配置更新和运维 Skill CRUD，终端测试界面只选择会话，不上传 Skill。
- OCR Tool Gateway：只由 DSH Runtime 调用的内部工具服务，转发到 PaddleOCR-VL-1.6 产线 API；不向前端暴露 OCR 业务接口。
- Knowledge Tool Gateway：只由 DSH Runtime 调用的内部知识库工具服务，转发到 77 服务器 `18085` 匿名只读代理；默认 `top_k=32`，向上游传递 BM25、图谱和向量三路检索模式；不转发平台 Token，也不开放上传、解析、删除、移动或原文件下载。
- Platform Swagger Gateway：只由 DSH Runtime 调用的内部平台接口服务，连接同一台 77 服务器的 Swagger 根地址 `http://77.242.240.158:18085/api/platform`；首期接入 `POST /api/MyRequest/ApplicationPage`（内部工具名 `umc.applications`），并保留 `/swagger/document` 用于读取上游 OpenAPI。需要用户态数据的其他接口必须配置平台登录/UMC Bearer Token 后再启用，不能用测试数据冒充真实账户数据。

当前 MVP 的运行面使用后端容器内的逻辑 Runtime Lease，接口已将实例管理边界独立出来；后续可以把 `RuntimeManager` 的启动/清理实现替换为 Docker/Kubernetes 动态容器调度，而不改变会话、事件和 WebSocket 契约。

## PaddleOCR-VL-1.6

OCR Gateway 默认指向 `http://ocr-vl-api:8080`。官方 PaddleOCR-VL-1.6 产线容器和底层 VLM 推理容器放在 `ocr-gpu` Compose profile 中，使用 NVIDIA/CUDA GPU：

```bash
docker compose --profile ocr-gpu up -d
```

不启用该 profile 时，主 Chat 闭环仍可启动；调用 OCR 会返回上游不可用，避免在没有 GPU 的开发机上自动拉取几十 GB 的模型镜像。官方服务默认使用 `PaddleOCR-VL-1.6-0.9B`，并提供 `POST /layout-parsing` 服务接口。生产环境可通过 `OCR_VLM_BACKEND` 在 `vllm`/`fastdeploy` 间选择，并按显卡调整 `OCR_GPU_DEVICE`。

DSH Runtime 的本地工具边界可用以下开发标记验证（生产环境由 DSH Harness 原生 tool-call 替换）：

```bash
curl -X POST http://localhost:8000/api/v1/conversations/{conversationId}/messages \
  -H "X-User-Id: demo-user" \
  -H "Content-Type: application/json" \
  -d '{"content":"/tool ocr.layout_parsing {\"file\":\"https://example.com/sample.pdf\",\"fileType\":0}","clientMessageId":"ocr-001"}'
```

## 77 知识库 Tool

知识库服务只在 Docker 网络内暴露给 `backend`，外部客户端通过 DSH Runtime 间接调用。首期使用附件中推荐的匿名只读接口：目录树、文件元数据和目录检索。上游地址由 `KNOWLEDGE_BASE_URL` 配置，默认是 `http://77.242.240.158:18085/api/platform/api/v1`。

DSH Runtime 的开发标记示例：

```bash
curl -X POST http://localhost:8000/api/v1/conversations/{conversationId}/messages \
  -H "X-User-Id: demo-user" \
  -H "Content-Type: application/json" \
  -d '{"content":"/tool knowledge.search {\"query\":\"media regulation\",\"folder_id\":\"34a89aa7b43b473d8326cf6540fc3894\",\"top_k\":32}","clientMessageId":"kb-001"}'
```

可用工具名：

- `knowledge.search`：必须传 `query` 和 `folder_id`；默认召回 32 条，三路模式由 `KNOWLEDGE_RETRIEVAL_MODES=bm25,graph,vector` 配置并随请求传给代理。最终是否启用某一路由由 18085 上游版本决定。
- `knowledge.folders_tree`：获取当前租户可见目录树。
- `knowledge.files`：读取目录文件元数据，可选 `folder_id`、`recursive`。
- `knowledge.files_page`：分页读取文件元数据，`page_size` 范围 10–100。

附件中的鉴权管理接口（上传、解析、删除、移动、原文件下载等）不在 DSH Tool 范围内；如未来开放写操作，应另行接入平台身份与权限校验。

## 77 平台 Swagger Tool

平台 Swagger 与知识库使用相同服务器 IP，但挂载路径不同：

- Swagger/OpenAPI：`http://77.242.240.158:18085/api/platform/api/v1/openapi.json`
- 平台网关（Docker 内）：`http://platform-gateway:8102`
- 应用分页：`POST /api/MyRequest/ApplicationPage`，请求体 `{"pageIndex":1,"pageSize":100}`
- DSH 内部工具：`umc.applications`；申请状态和待付款 Skill 会自动拉取第一页数据，再按申请编号继续确认。

平台登录接口在 Swagger 中为 `/api/v1/login/access-token` 和 `/api/v1/login/umc/access-token`。本地没有可用的客户账号/UMC Token 时，DSH 只记录“需要认证”，不生成个人账户结果。

## 启动

```bash
cp .env.example .env
docker compose up --build -d
```

访问：

- 测试控制台：http://localhost:18080（可用 `FRONTEND_PORT` 覆盖）
- 运行配置：在控制台“运行配置”页维护 LLM API Key、DB/Redis URL、知识库/Swagger/OCR Tool URL、Bearer Token 和 Tool 开关；API Key/DB/Redis 只显示配置状态，不回显密文。
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
