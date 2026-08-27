# Changelog

本文记录 DSH External Service 的重要代码、接口、部署和测试变化。日期使用 Asia/Shanghai 时区。

## 2026-08-28

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
