# Changelog

本文记录 DSH External Service 的重要代码、接口、部署和测试变化。日期使用 Asia/Shanghai 时区。

## 2026-08-28

### 用户端 Token 与测试控制台认证解耦

- 修复用户端在未登录测试控制台时访问 DSH 对话接口返回 401 的问题。用户端携带 UMC Bearer Token 后可直接访问 `/api/v1/conversations*`，不再依赖测试控制台 Cookie。
- WebSocket `/api/v1/ws` 不再在握手阶段强制要求控制台 Cookie，浏览器连接后通过首个 `auth` 消息传递 UMC Token 并完成会话认证。
- 配置、Skills、测试用例和 UMC 管理代理等测试控制台管理接口继续由控制台 Cookie 保护。

### 77 public 知识库 503 修复

- Knowledge Gateway 改为直接调用当前匿名只读接口 `/public/knowledge/search`，不再预先调用已失效的 `/api/ai/knowledge/datasets/{id}` 获取版本。
- 匿名 public 请求不再生成空的 `Authorization: Bearer ` 请求头，修复 `httpx` 在请求发出前报非法 Header、DSH 最终显示 `knowledge.search status=503` 的问题。
- 目录树、文件列表和分页文件接口同步切换到 `/public/knowledge/*`，分页参数现在会真实转发给 77；检索继续传递 `bm25,graph,vector` 兼容提示并以 77 返回的 `completed_channels` 为实际完成通道。

### 控制台 WebSocket 对话链路修复

- 修复浏览器 WebSocket 认证后将租户强制改写为 `umc:global:<UserID>`，导致 REST 创建的 `demo-tenant` 会话无法订阅、消息被静默丢弃的问题。
- WebSocket 现在解析测试控制台传入的 `userId`/`tenantId`，并与 REST 会话使用同一租户；前端自动从 UMC JWT 提取 UserID，避免 `demo-user` 占位身份与真实账号不一致。
- 前端等待 WebSocket 真正完成建连后再发送消息，并将 `conversation_not_found`、身份不一致等错误显示在对话时间线中；同时更新资源版本号，避免浏览器继续使用旧缓存。
- 扩展 `application_status` Skill 对 “What's my license status?” / 阿语许可状态表达的识别；无申请编号时自动调用当前 UMC 账号的申请列表，再由模型总结真实状态。

### WS 安全进度提示

- 新增 `assistant.status` WebSocket 会话事件，在 Skill 路由、知识库检索、OCR、UMC 查询、结果整理和回答生成阶段发送本地化短提示。
- 测试对话台将进度事件合并为单个状态卡片，首个提示在 LLM 请求前发送，收到回答首片段后自动移除，降低长 TTFT 带来的持续 loading 感。
- 状态事件不暴露系统提示词、工具参数或原始 LLM reasoning；原始 reasoning 仍仅保留在受权限保护的链路审计中。

### 对话审计查看

- 测试控制台新增“对话审计”功能切换：先按会话查看内容摘要、运行状态和 DSH Session 信息，再进入对应会话的完整执行链路。
- 新增 `GET /api/v1/conversations/{conversationId}/audit`，支持按会话和审计类别读取对话、Skill、Tool、LLM 与运行时记录；原始 Payload 可展开查看，凭据仍由后端脱敏。
- 修复部署环境审计列表为空的问题：默认仍按当前账号/租户隔离；新增 `AUDIT_ADMIN_ENABLED` 与 `AUDIT_ADMIN_USER_IDS` 显式 allowlist，部署环境值作为可信引导配置且不会被历史数据库关闭值遮蔽；管理员命中后返回 `scope=admin`，可查看任意账号和租户的对话审计，列表和详情同时标注所属账号/租户。

### 测试控制台密码保护

- 测试控制台新增固定密码登录，首次启动将密码写入 PostgreSQL `config_entry` 的 `console_password` 配置项，遗失时可由数据库管理员恢复。
- 登录成功后使用短期 HttpOnly Cookie；测试 REST API 与 WebSocket 均校验控制台会话，未登录请求返回 401；密码不回显到前端或普通日志。

### UMC Portal 环境切换

- 新增 `UMC_PORTAL=customer|admin|public` 环境开关及 Customer/Admin 两套 Base URL；`public` 复用 Customer Portal 地址，登录、附件上传和下载按所选 Portal 自动拼接后端 API 地址。
- 附件上传统一经 DSH Backend 代理，不再由前端 Nginx 固定指向 77 测试服务器；保留旧门户 `file/files` 字段兼容逻辑。

### 可编辑系统提示词与 Skill 配置

- 运行配置新增多行系统提示词字段，支持通过页面保存全局追加指令并热更新后续请求；内置语言、安全和知识证据规则保持更高优先级。
- 新增独立“Skills 配置”页签，以列表暴露 system Skill 的名称、Tool、依赖、发布状态和启用状态；点击列表操作可在弹窗中编辑并保存行为指令。
- 对话测试页新增附件区域，选择本地 PDF/图片后自动调用 UMC `POST /api/Document/Upload`（multipart `file`），解析 URL/对象 key 返回值，并发送不带问题文本的仅附件消息。
- DSH 每轮请求按路由加载最高版本、`PUBLISHED` 且启用的 Skill 内容，注入系统提示词，保存后无需重启即可对新请求生效。
- 前端 Skill 表单通过既有 `/api/v1/skills` 接口保存，继续沿用 Principal 所有权边界。
- Skills 配置新增“新增 Skill”入口，可创建新的 system Skill 并填写 Skill ID、名称、Tools、依赖条件、状态、启用开关和行为指令。

### Docker Release 离线分发

- 增加可重复执行的 Docker 镜像导出和恢复脚本。
- Release 包覆盖 Compose 使用的全部 9 个 `linux/amd64` 镜像，包括 PaddleOCR-VL-1.6 两个官方 GPU 离线镜像。
- 使用 zstd 压缩并按 1900 MiB 分卷，满足 GitHub Release 单文件小于 2 GiB 的限制。
- 为每个分卷及完整压缩包生成 SHA-256，并在恢复前强制校验。
- `dist/docker-release/` 仅用于本地生成 Release 资产，不进入普通 Git 历史。

### PaddleOCR-VL-1.6 Docker 部署

- 将 OCR 从可选 Compose profile 调整为 DSH 默认必需工具服务，执行 `docker compose up -d` 时自动启动 OCR Gateway、PaddleOCR-VL API 和 VLM 推理服务。
- 显式固定官方模型为 `PaddleOCR-VL-1.6-0.9B`，避免容器默认值切换到其他模型。
- 增加 `OCR_MODEL_NAME` 配置、OCR Gateway `/readyz` 完整链路检查，以及 `fileType=0/1` 参数校验。
- 为官方 `pipeline_config_vllm.yaml` 增加 `paddleocr-vlm-server` Docker 网络别名，修复 API 健康但实际推理连接失败的问题。
- 升级本机 Docker/CUDA 容器运行环境以解决 GPU `named symbol not found`，验证 RTX 4090 可加载 PaddleOCR-VL-1.6。
- 使用 Term1 罚款通知图片完成真实 OCR：成功识别 `TEST-FINE-1456`、`AED 300.00`、`2026-06-25` 和申诉说明。

### 回答语言与会话初始化

- 将系统默认输出语言由中文改为英文。
- 英文输入使用英文回答；主要为阿语的输入使用阿语回答；中文及其他语言使用英文回答。
- 系统提示词为每轮写入明确目标语言，并规定 Tool、知识库证据和内部提示不得改变回答语言。
- 将流程型 Skill 的交互提示改为英文，避免中文内部指令影响最终输出。
- 新会话新增持久化 `assistant.welcome` 事件，展示固定的 NMA 英阿双语欢迎语。
- 前端在首次连接和切换新会话时从 `afterSeq=0` 订阅，确保欢迎语不会遗漏或重复。
- 实际 DSH 模型验证通过：英文问题返回英文、阿语问题返回阿语、中文问题返回英文；页面初始化和再次新建会话均只显示一条欢迎语。

## 2026-08-27

### `58894d5` - Public 知识库代理协议修复

- 对齐 77 服务器 `public/knowledge` 匿名只读代理协议。
- 知识库目录、文件和搜索上游请求不再携带 UMC Authorization。
- README 明确 public 知识库与需要 UMC Token 的 Data Access 代理属于不同鉴权边界。

### `3720dc1` - Term2 Docker 全量测试

- 使用当前 Docker 平台执行 Term2 全量测试。
- 保存 `UMC_Term2_Docker_全量测试记录_20260827.xlsx` 测试记录。

### `94e0f18` - Term1 客户门户 Token 复测

- 使用客户门户真实 UMC Token 重新执行 Term1。
- 保存 `UMC_Term1_Docker_复测记录_20260827_login.xlsx` 测试记录。

### `0179b7e` - UMC 客户登录端点修正

- 将客户门户 Token 登录地址修正为 `POST /api/User/Login`。
- 明确 `/api/v1/login/umc/access-token` 是 FF AI 平台会话交换接口，DSH 不再将其当作客户登录接口。
- 更新测试页面 Token 输入说明。

### `9d172b8` - Term1 知识库 top_k 修复后复测

- DSH 逻辑继续使用 `top_k=32`，Knowledge Gateway 根据 77 public 代理限制将单路上游值截断为可配置上限 20，避免 422。
- 保持 `bm25,graph,vector` 三路召回提示，并在文档中说明实际上游完成线路应以响应为准。
- 重新运行 Term1 并保存 v2 测试记录。

### `7c4c206` - 草稿写入确认保护

- `umc.add_application` 要求显式 `confirmed=true`。
- 继续拒绝正式提交 `type=1`；受控测试仅允许 `type=3` 且 `isTest=true`。

### `0da7d54` - 请求级 UMC Token 与匿名代理

- 移除固定平台 Token，改为透传前端当前请求的 `Authorization: Bearer <UMC_TOKEN>`。
- HTTP 和 WebSocket 均支持请求级 UMC Token；原始 Token 只保存在请求/会话内存中，不写入数据库和普通日志。
- 接入 UMC Data Access 的申请详情、ISBN 查询和受控新增草稿端点。
- 更新 Principal、Tool Gateway、运行配置及测试控制台的 Token 处理。

### `daa78c7` - Docker DSH 基线

- 建立 FastAPI Backend、Nginx 测试前端、PostgreSQL、Redis 和 Docker Compose 全套运行环境。
- 实现会话所有权、追加式事件、WebSocket/SSE 回放、消息幂等和 Runtime Lease。
- 建立 LLM、OCR、Knowledge、Platform Tool Gateway 边界和配置/Skill API。
- 建立英文/阿语业务测试生成、批量运行和 5 分制评分能力。
- 纳入首批 Term1 图片、工作流用例及 38 题三路检索测试记录。
- 自动获取 UMC 会话：Backend 使用客户门户 `POST /api/User/Login` 的 AES 加密登录格式，以本机 Docker `.env` 中的既有测试账号获取并缓存短期 Token；对话页移除手工 Token 输入，附件上传和 WebSocket 自动复用内存会话，密码/原始 Token 不落库。
- 兼容 77 测试门户当前上传行为：`Document/Upload` 按文档先使用 `file`，若 200 响应没有对象引用则自动回退历史前端使用的 `files` 字段。
- 修复 PaddleOCR-VL-1.6 附件 502：UMC 下载内容改为纯 Base64 传给官方 serving API，避免 `data:image/...;base64,` 前缀被错误解码。
- 新增链路审计：会话内容、Skill/DSH Tool 路由与结果、LLM 请求/回答/可用 reasoning 内容写入 PostgreSQL `audit_record`，凭据字段脱敏；新增可热更新的审计留存天数与清理周期，后台周期任务自动删除过期审计记录。
