# Admin DSH 团队交接与维护指南

核对日期：2026-09-07。代码基线：`97b8062`（本次文档变更之前）。

适用对象：接手架构、协作开发、知识覆盖和问题排查的同事。本文是工程交接，不是 Admin Portal 业务使用手册。仓库规则以 [AGENTS.md](../AGENTS.md) 为准。

## 1. 接手先看这些

1. 阅读 `AGENTS.md`，确认 Admin / Customer 的隔离边界。
2. 阅读本文第 2～5 节，区分运行时 Skill、开发 Skill 和知识库手册。
3. 按第 6 节准备本地环境；启动前核对数据库，不能直接套用默认 Compose 命令。
4. 遇到错误答案，按第 7 节从原会话审计定位，不要先换模型、扫全模块或改业务映射。
5. 修改前看第 9 节的最新验收状态，修改后按第 8 节验证。

交接不只是 Git 仓库：还需要开发 Skill 完整目录、受控环境配置、账号权限、知识库目录及完整手册源文件。凭据通过公司批准的安全渠道单独交接，不放进本文或 Git。

## 2. 系统是什么，不是什么

本项目让用户通过聊天查询 Admin Portal 中自己有权限看到的信息，结合知识库里的页面语义回答问题。知识库解释“字段和控件是什么意思”，实时页面证明“现在有哪些记录”。

必须保留的边界：

- 运行时只保留 `admin_portal_reader` 和 `general_knowledge` 两个 Skill。
- 当前 Admin 文本请求固定进入 `admin_portal_reader`；Reader 决定仅用知识回答，还是继续读页面。不是按 Dashboard / Licensing 分发 Skill，也不是在这两个 Skill 之间做关键词路由。
- `general_knowledge` 是保留的固定知识能力定义，不是当前 Admin 文本请求的另一个自动分流入口。
- 模型可调用的 Tool 只有 `knowledge.search` 和 `admin.portal.read`。`GetUserInfo` 是代码强制执行的前置身份查询，不是新增的业务 Tool。
- Dashboard、Licensing、Customer Happiness、Content、Inspection、Finance 都是知识与回归覆盖范围，不是独立运行时 Skill。
- Reader 不审批、不提交、不修改、不删除、不分配、不发送、不导出、不上传或下载业务资料。
- Reader Subagent 是后端代码内的受限规划与证据处理流程，不是另一台服务器，也不是 Codex 开发子任务。

**当前重要例外：本地网络白名单已临时关闭。** 本次只读检查确认网关健康信息为 `readerWhitelistEnabled=false`、`readerNetworkMode=same-origin-unrestricted`。动作、页面权限和身份检查仍在，但同源网络请求绕过方法/路径白名单，页面自动发起的业务写请求可能到达服务器。因此当前模式不能宣称有网络层严格只读保障，不能照搬到正式环境。详见第 6.5 节。

## 3. 总体架构与一轮请求

```text
用户浏览器中的 Admin Portal / Chatbot
  -> Portal Vite 本地入口 :18086
       /             -> Admin Portal
       /dsh-audit/    -> DSH Nginx 控制台 :18112
       /dsh-api/      -> DSH FastAPI :8001（容器内 :8000）
       /swagger      -> Admin Service :5207

DSH FastAPI / DSHService
  -> Principal、会话、幂等、逻辑租约、WS/SSE
  -> 固定 admin_portal_reader
       -> GetUserInfo（当前 Token，直接查询 Admin 上游）
       -> 条件化追问意图解析
       -> knowledge.search
            -> Knowledge Gateway :8101 -> 77 公共只读知识接口
       -> 受限规划 / 校验
       -> admin.portal.read
            -> Platform Gateway :8102
            -> Playwright Chromium -> Admin Portal 页面及其请求
       -> 证据归约 -> 有界 ReaderResult
  -> 回答保护 / 必要时 LLM 表述 -> 最终回答
  -> PostgreSQL：会话事件、审计、配置、固定 Skill
```

### 3.1 请求与权限

`backend/app/principal.py` 管理调用者身份；UMC Token 按请求传递，不能进入知识手册、普通日志或持久化会话。`backend/app/platform.py` 使用当前 Token 调用 `/api/AdminUser/GetUserInfo`，Reader 验证身份匹配后再工作。

GetUserInfo 是角色、部门、页面/子页/按钮权限和数据范围的依据。提问中的“所有人”“全公司”只表达用户意图，不扩大权限。控制台登录密码、UMC 登录身份、审计管理权限是不同的权限层。

### 3.2 意图、规划、执行与回答

1. 读取本轮 GetUserInfo；失败时不继续读业务页。
2. 解析当前问题及有限追问上下文。当前代码有八个语义条件：`businessObject`、`businessFocus`、`recordIdentity`、`view`、`dateRange`、`filter`、`requestedScope`、`answerShape`。
3. 区分延续、细化、换话题、扩大范围和需要澄清。省略不等于清除；“展示列表”可以继承关注事项，但不能继承旧事实当作当前数据。
4. Reader 自己检索知识节点，再规划必要的只读页面动作。历史页面/区域仅作候选来源提示，不强制走同一路径。
5. Gateway 执行动作并返回受限语义观察；Reader 检查事实来源、列表行、字段绑定、记录身份、权限和证据充足性。
6. 返回结构化结果。主流程按状态保护回答，必要时使用 LLM 表述；不是所有结果都会额外调用回答模型。

| 结果状态 | 含义 | 不应混淆为 |
| --- | --- | --- |
| `success` | 有足够证据回答当前问题 | 整个模块已经全部验收 |
| `no_data` | 当前授权范围、条件下有明确空结果证据 | 页面还没加载或读错区域 |
| `no_permission` | 身份或权限不允许读取 | 当前业务记录数量为零 |
| `load_failed` | 加载、上游或超时失败 | 用户没有权限或没有数据 |
| `not_confirmed` | 条件、语义、计划或证据不足 | 已确认不存在相关业务 |

默认边界：最多 3 页、12 个动作、20 条事实；总预算默认 90 秒，可配置在 10～180 秒内。意图解析上限 20 秒，属于总预算的一部分；单次浏览器执行上限 45 秒，平台客户端超时至少留到 50 秒。以 `reader_limits.py`、`config.py` 和实际运行配置为准。

### 3.3 会话、数据和部署限制

| 部分 | 当前实现 | 维护提示 |
| --- | --- | --- |
| 持久化 | PostgreSQL，SQLAlchemy async + asyncpg | `session_event` 用 `conversation_id + seq` 回放 |
| 幂等 | `message_idempotency` | 重复 `clientMessageId` 不应新增同一用户消息 |
| 推送 | WS 主通道，SSE/历史回放补充 | `afterSeq` / resume 用于断线恢复 |
| 广播 | `service.py` 的进程内 `EventBroker` / asyncio Queue | 不是 Redis Pub/Sub |
| 租约和锁 | `runtime.py` / `service.py` 的进程内状态 | 每个会话逻辑隔离，不是每会话一个容器 |
| Redis | Compose 启动 Redis 7 并作为依赖 | 不能据此认定已完成分布式锁或跨进程广播 |
| LLM | OpenAI-compatible 接口；默认模型名 `deepseek-v4-flash` | 实际模型和地址看受控运行配置，不看文档猜测 |
| 审计 | `audit_record`，默认保留 30 天 | 历史报告中的 audit ID 可能已被清理 |

当前是单后端进程的 embedded-lease MVP。未经改造不要直接加多 worker / 多副本，否则进程内锁、运行任务和订阅不共享。未配置模型时普通适配器有 mock 路径，但 Reader 意图/规划不能据此视为生产可用。

主要表在 `backend/app/db.py`：`conversation_session`、`session_event`、`audit_record`、`message_idempotency`、`config_entry`、`skill`。

**启动也会写数据库**：`init_db()` 建表、初始化配置，并清理不在固定两个 Skill 内的历史定义及非保留版本。数据库目标核验必须在启动 backend 之前完成。`scripts/migrate_admin_portal_reader.sql` 也含删除语句，不是可随手重跑的诊断工具。

## 4. 改哪里：代码导航

下表路径相对 Admin DSH 仓库根目录，同事换电脑后仍可使用。

| 要看或改什么 | 文件 | 关键职责 |
| --- | --- | --- |
| 请求入口、历史、审计、WS/SSE | `backend/app/api.py` | 路由和访问边界 |
| 服务装配、启动初始化 | `backend/app/main.py` | 配置加载、后台清理任务、healthz |
| 对话主链路、历史上下文、最终回答 | `backend/app/service.py` | `_run_turn`、`_reader_conversation_context`、回答与审计组装 |
| 追问继承、清除、焦点与记录身份 | `backend/app/reader_intent.py` | 语义条件和确定性校验 |
| 意图/规划提示词、模型请求 | `backend/app/llm.py` | `resolve_admin_portal_intent`、`plan_admin_portal_read` |
| Reader 计划、证据、结果和只读动作策略 | `backend/app/portal_reader.py` | `AdminPortalReader`、`ReadOnlyPortalPolicy`、`ReaderResult` |
| 固定 Skill 定义 | `backend/app/skills.py` | `DEFAULT_SKILL_DEFINITIONS`，不是业务模块配置表 |
| 两个 Tool 的调用边界 | `backend/app/tool_gateway.py` | Tool 名称限制、参数与结果约束 |
| 上游客户端 | `backend/app/platform.py`、`backend/app/knowledge.py` | 当前身份查询、页面工具和知识检索请求 |
| 真实浏览器执行、语义提取、网络拦截 | `platform-gateway/app.py` | 通用 tab/filter/detail 动作和身份/只读检查 |
| API 网络白名单 | `platform-gateway/config/reader-network-policy.json` | 精确方法/路径清单，启动加载 |
| 知识上游兼容 | `knowledge-gateway/app.py` | 匿名只读知识代理、top_k 上游截断 |
| 运行配置和时间预算 | `backend/app/config.py`、`backend/app/reader_limits.py` | 默认值、可编辑字段、超时界限 |
| 身份、控制台 Cookie、输出保护 | `backend/app/principal.py`、`backend/app/console_auth.py`、`backend/app/response_safety.py` | 认证与敏感内容防护 |
| 表结构、固定配置初始化 | `backend/app/db.py` | 启动写入规则、表定义 |
| 审计控制台 UI | `frontend/index.html`、`frontend/app.js`、`frontend/styles.css` | 不是 Admin Portal Chatbot Widget 源码 |
| 控制台路由与缓存 | `frontend/nginx.conf` | `/dsh-audit/` 静态资源与 API 代理 |
| 工程规范与耐久回归 | `doc/admin-portal-reader/module-contract.yaml`、`regression.yaml` | 只保留一套通用能力契约，不放业务手册 |
| 测试 | `backend/tests/`、`scripts/test_*.mjs` | 权限、证据、意图、Gateway、运行器和报告 |

本机相邻工程位置，仅作交接索引：

- Admin DSH：`/Users/thron/Documents/odt/admin-dsv4flash-dsh-kb`
- Admin Portal 前端：`/Users/thron/Documents/odt/umc/front/umc-admin-portal`
- Admin Service：`/Users/thron/Documents/odt/umc/backend/adminportalservice`

本次没有读取或修改相邻工程。需要调整 Widget、Vite 或 Admin Service 时，先明确授权目标，再读取目标自己的仓库规则。上游 Portal 数据不是本地 DSH 数据库里的业务副本；即使 DSH 数据库在本机，Reader 仍可能访问真实 Admin 上游。

## 5. Skill 清单、位置与迁移

### 5.1 服务运行时 Skill：已经随代码交接

| Skill | 源码位置 | 允许 Tool |
| --- | --- | --- |
| `admin_portal_reader` | `backend/app/skills.py`，执行在 `portal_reader.py` / `service.py` | `knowledge.search`、`admin.portal.read` |
| `general_knowledge` | `backend/app/skills.py` | `knowledge.search` |

它们由 `db.py` 初始化到本地数据库 `skill` 表。`GET /api/v1/skills` 是固定定义的只读查看入口，没有 Skill CRUD。它们没有各自的磁盘 `SKILL.md`，不能把 Codex 开发 Skill 上传到该表代替它们。

### 5.2 开发时给 Codex 的 Skill：在仓库外，必须单独交接

| Skill | 当前机器入口 | 什么时候使用 |
| --- | --- | --- |
| `admin-portal-reader-expansion` | `/Users/thron/.codex/skills/admin-portal-reader-expansion/SKILL.md` | 页面覆盖、手册准备、具体错答修复、上传后验证，是主要项目开发流程 |
| `browser-preference` | `/Users/thron/.codex/skills/browser-preference/SKILL.md` | 浏览器调试/QA 的选择规则 |
| `ego-browser` | `/Users/thron/.agents/skills/ego-browser/SKILL.md` | 实际浏览器观察、交互、截图和验证 |
| `openai-docs` | `/Users/thron/.codex/skills/.system/openai-docs/SKILL.md` | 查询 Codex / OpenAI 配置和 Skill 使用方式；不是 DSH 运行依赖 |

前三项是本项目开发交接的重点。不是把这台机器上所有飞书、Figma、客户项目或其他 Skill 全部交给同事；它们不构成本项目运行依赖。

`admin-portal-reader-expansion` 必须交接的完整结构：

```text
admin-portal-reader-expansion/
  SKILL.md
  agents/openai.yaml
  references/page-scan.md
  references/manual-schema.md
  references/knowledge-publication.md
  scripts/validate_manual.py
  scripts/test_validate_manual.py
```

`browser-preference` 同时包含 `agents/openai.yaml`；`ego-browser` 的安装说明在 `references/install.md`，配套脚本在 `scripts/install.sh`。安装浏览器工具本体与安装 Skill 说明是两件事，复制 Skill 不会安装浏览器，也不会授予账号权限。

### 5.3 同事电脑怎么接

1. 经审查后传递上述开发 Skill 的完整目录，不只传 `SKILL.md`。不要打包整个 `.codex`、浏览器 profile、Cookie、登录状态或个人配置目录。
2. 将项目 Skill 安装到同事的用户级 `.agents/skills`，或者由团队明确决定纳入仓库 `.agents/skills` 做版本管理。官方支持这两类发现位置，完整目录可含 `scripts`、`references`、`agents/openai.yaml`。当前本机 `.codex/skills` 是已核对的安装位置，不代表新机器必须照抄该绝对路径。[官方 Skill 说明](https://learn.chatgpt.com/docs/build-skills)
3. 检查 Skill 里的本机绝对路径，特别是手册验证器示例；在同事机器按实际安装目录运行，不要引用不存在的 `/Users/thron`。同名 Skill 不会自动合并，应避免旧副本和新副本同时启用。[官方发现规则](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)
4. 让 Codex 列出并读取 `admin-portal-reader-expansion`，确认路径正确、references 和脚本可访问。未发现时按官方说明重启 Codex。[官方说明](https://learn.chatgpt.com/docs/build-skills)
5. 浏览器按选定 Skill 配置，账号通过安全渠道取得；第一次验证只做获准的只读页面。

本次仅记录位置和迁移方法，没有复制、重新安装或修改任何 Skill。

### 5.4 页面扩展工作流

按问题选择 `new-page`、`improve-page`、`revalidate-page`。主流程：限定页面/角色/问题范围 -> 复现 -> GetUserInfo -> 串行只读扫描 -> 准备或修正手册 -> 必要时改通用 Reader -> 回归 -> 用户路径验证。

每个范围内的控件必须归类为 `documented_readonly`、`documented_forbidden` 或 `out_of_scope_with_reason`。禁止控件记录理由，不通过点击试探其写入效果。不同账号切换必须串行，切换后重新 GetUserInfo；浏览器任务空间分离不等于认证隔离。

业务手册只存在知识库；本仓库记录工程契约、测试、扫描证据和验收结果。当前知识代理访问 77 的公共只读知识接口，`KNOWLEDGE_DEFAULT_FOLDER_ID` 必须从授权配置取得。默认逻辑 `top_k=32`，网关按当前上游上限截断为 20，检索模式为 BM25、graph、vector。

手册准备、用户上传、检索命中新版本、真实问答验收是四个独立阶段。默认由用户上传和管理版本。修订前必须取得完整旧源文件，检索片段不能代替完整源；没有完整源时不能发布成完整替代版或删除旧版。

历史 Licensing 源文件/交付路径在 `doc/admin-portal-reader/licensing-coverage.yaml`，例如 `/Users/thron/Downloads/admin-portal-reader-kb/Licensing-Admin-User-Manual-v3.md`。这是历史记录路径，本次未访问该仓库外目录，不能保证文件仍在；正式交接时需由负责人确认完整源文件和线上版本。

## 6. 本地环境：启动、配置与边界

### 6.1 必要依赖和端口

准备 Docker / 支持 `!override` 的 Compose、获准的环境文件、Node/npm（Portal）、对应 .NET SDK（Admin Service）。DSH Python 与 Gateway Chromium 由各自 Dockerfile 安装；宿主机 Python 主要用于单元测试。

| 地址 | 用途 |
| --- | --- |
| `http://localhost:18086/` | 唯一统一入口，由 Portal Vite 占用 |
| `http://localhost:18086/dsh-audit/` | 审计与测试控制台，代理到 `127.0.0.1:18112` |
| `http://localhost:18086/dsh-api/` | DSH API 代理，后端宿主机端口 `8001` |
| `http://localhost:18086/swagger` | Admin Service Swagger，目标必须为 `5207` |
| `http://localhost:8001/docs` | Admin 本地 DSH API 文档，不是 Admin Service Swagger |
| `http://localhost:8001/healthz` | DSH 存活与基础运行模式 |
| `127.0.0.1:15433/dsh` | 宿主机访问 Admin 本地 PostgreSQL 18 |
| `postgres:5432/dsh` | Compose 网络中的同一个本地数据库 |

### 6.2 启动之前先核对

- `.env.lite` 是受保护远端运行配置，保持不变。
- 后置 `.env.admin.postgres18.local` 必须把数据库覆盖到 `postgres:5432/dsh`，Portal 为 `admin`。
- 新机器的私有文件由负责人安全提供，不能从文档里的默认用户名/密码推断凭据。
- 数据库备份属于敏感数据，不能直接把 `backups/` 提交或群发。本次开始时该目录为既有未跟踪内容，未读取、修改或打包。
- 正常开发不能指向远端 Admin `10.255.1.157:15432/dsh`。它仅在明确要求刷新本地副本时作只读来源，不能写入。
- 禁止访问 Customer 仓库 `/Users/thron/Documents/odt/dsv4flash-dsh-kb` 或 Customer 数据库 `10.255.1.157:5432/dsh`。

以下使用结构化 JSON 和 URL 解析，只打印数据库目标和 Portal，不打印账号、密码或完整 URL。需要宿主机 `python3`，在 Admin DSH 根目录执行：

```bash
docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml config --format json |
  python3 -c 'import json,sys; from urllib.parse import urlsplit; c=json.load(sys.stdin); e=c["services"]["backend"]["environment"]; u=urlsplit(e["DATABASE_URL"]); print(json.dumps({"project":c["name"],"portal":e["UMC_PORTAL"],"database":{"host":u.hostname,"port":u.port,"database":u.path.lstrip("/")}},indent=2))'
```

必须得到 `dsh-admin-local`、`admin`、`postgres`、`5432`、`dsh`。解析失败或目标不符就停止，不打印完整 Compose 环境排错。本次核对的 Compose 目标和正在运行的 backend 数据库环境均匹配；未连接数据库执行查询或写入。

### 6.3 正确启动顺序

确认上一节后，启动 DSH：

```bash
cd /Users/thron/Documents/odt/admin-dsv4flash-dsh-kb
docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml up --build -d
```

Admin Service 和 Portal 的启动命令见 [LOCAL_ADMIN_STARTUP.md](../LOCAL_ADMIN_STARTUP.md)。它们在相邻仓库，执行前须得到该目标的明确授权。Service 使用 `5207`；Portal 从自己的目录执行 `npm run dev:daypop`，不能让 DSH frontend 抢占 `18086`。

启动后分别核验 `/`、`/dsh-audit/`、`/swagger`。审计页 HTTP 200 不够，还要在浏览器确认样式和脚本经过代理、CSS rules 非零、页面布局正常。不能只看到健康检查通过就宣布整体可用。

### 6.4 配置和代码为什么没有生效

- `config_entry` 的 system 配置在 backend 启动时重载到运行时；很多 LLM、知识检索和 Reader 设置可热更新。因此只改环境文件可能被已保存配置覆盖，需要检查控制台“运行配置”和加载逻辑。
- 数据库/Redis URL 不热切换。数据库实际连接由进程启动配置决定，不能只改控制台显示值。连接目标变更必须调整授权部署环境并重新创建 backend，且先验证本地目标。
- backend `app` 目录是 bind mount，并使用 `--reload`；依赖或 Dockerfile 修改仍需重建。
- Platform Gateway 的 `app.py`、知识网关代码和控制台静态资源在镜像内。修改后要重建对应服务，不能认为后端热加载覆盖所有组件。
- 网络策略 JSON 虽只读挂载，但在 Gateway 启动时加载；改文件后也需重启/重建 Gateway。
- 修改 DSH 路由、Nginx 静态处理或 `frontend/index.html` 时，CSS / JS 的版本查询值一起更新。资源必须返回正确内容或 404，不能返回 SPA HTML。入口 HTML、CSS、JS 在本地代理环境应为 `Cache-Control: no-store`；之后硬刷新再验收。

### 6.5 网络白名单例外如何处理

详见 [network-policy.md](admin-portal-reader/network-policy.md)。2026-09-07 的临时放开是此前获准的本地业务验证配置，不是新的安全基线。本次没有改变这个开关。

关闭时包括 PUT/PATCH/DELETE 在内的同源请求可能绕过网络方法/路径检查。GetUserInfo、页面权限、动作/定位器防写、跨域限制、下载取消等仍在，但不补足这个缺口。

恢复严格网络策略前，明确验证安排，在本地覆盖文件设 `PORTAL_READER_WHITELIST_ENABLED=true`，只重建网关：

```bash
docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml \
  up -d --build --no-deps platform-gateway
```

之后重新查看网关 `/healthz` 的 `readerWhitelistEnabled` 和 `readerNetworkMode`。`readOnlyGetPathCount=72`、`readOnlyPostPathCount=6` 是当前配置清单数量，不代表开关已开启。Swagger 清单不是自动授权：GET 也可能导出，POST 也可能是查询，新增路径要人工核实只读语义。

需要停止 DSH 时，使用相同两层环境文件和两份 Compose 文件执行 `down`。日常停机不要使用 `down -v`，不要删除数据库卷；任何数据清理/恢复必须另行确认准确目标和恢复方案。

## 7. 出问题怎么查

### 7.1 错误答案：先找原会话，再定位出错层

在 [本地审计控制台](http://localhost:18086/dsh-audit/) 找到原 `conversationId`，搜索用户原问题，按同一 `requestId` 对齐本轮链路。追问故障必须在原会话复现，另起一段对话不能证明上下文修好了。

最小复现资料：代码 commit/本地 diff、时间、账号角色标签及权限指纹、原问题和必要前文、实际答案、业务期望、conversationId/requestId/audit ID、知识版本、白名单模式。不附 Token、密码、完整业务表或完整 HTML。

| 排查顺序 | 看什么 | 发现问题时主要定位 |
| --- | --- | --- |
| 1. 路由 | `skill.route`、`runtime_skill_unavailable` | `skills.py`、`db.py`、`service.py`；不要加模块 Skill |
| 2. 身份 | `reader.evidence` 内 GetUserInfo、identityMatch、permission | Token 过期、身份不符、缺权限、切账号后未刷新 |
| 3. 意图 | `intentResolution`、businessFocus、answerShape、清除/继承来源 | `reader_intent.py`、`llm.py`、`service.py` 历史投影 |
| 4. 知识 | query、folder、命中文件版本和区域、返回内容是否被压坏 | 知识目录/手册节点；`knowledge.py`、网关、`project_knowledge_result` |
| 5. 计划与执行 | stage、plan、startPath、actions、policyError、网络/超时证据 | `portal_reader.py`、`platform-gateway/app.py`、网络策略 |
| 6. 事实 | `reader.result` 的 result/page/section/sourceSection/facts/missing | 区域引用、字段绑定、记录身份、空状态、列表与计数混淆 |
| 7. 回答 | `reader.answer_guard`、`reader.answer_assembly`、可用的 `llm.request/response` | 事实正确但主回答错误时看 `service.py`、`llm.py` 和输出保护 |

这些中间字段通常嵌在 `reader.evidence`，并非全部是独立审计事件。模型路径不同也不保证每轮都有 `llm.request`。`assistant.chunk` 是实时通知；以持久化 `assistant.message`、`turn.completed` 和审计结果为最终依据。

典型判断：有观察数据但不能回答，优先看计划/区域引用/事实归约；完全没有页面读取，先看身份、意图、知识与规划，而不是认定 DOM 提取坏了；Reader facts 正确但答案加了未经证明的结论，应修回答层。

### 7.2 审计权限别混淆

- 常规 `GET /api/v1/conversations/{id}/audit` 默认按 tenant/user 所有权限制，全局范围依赖显式管理员 allowlist。
- 当前另有操作员入口 `GET /api/v1/console/audit/conversations` 和 `GET /api/v1/console/audit/conversations/{id}`，只接受有效控制台 Cookie，在代码中返回管理员审计范围。控制台密码持有者能看跨账号审计，因此控制台必须限制给获准同事，不能公开。
- Portal Bearer Token 不能代替操作员入口的控制台 Cookie；有控制台 Cookie 也不意味着可以用任意人的业务权限。
- 旧 [console-permissions.md](console-permissions.md) 可作背景，但其统一权限描述未完整覆盖当前操作员端点；准确实现看 `api.py` 和 `console_auth.py`。

密码经受控运维渠道恢复，不复制到命令行参数或日志。`console_auth.py` 当前存在固定默认口令常量，不能将“源码未含任何秘密”当作前提；不要提取或传播该值。正式对外部署前应单独审查凭据和访问隔离。

### 7.3 环境故障速查

| 现象 | 先检查 | 注意 |
| --- | --- | --- |
| `18086` connection refused | Portal Vite 是否存活 | 不是账号密码错误的证据 |
| 审计页 502 | `18112` frontend 和 `8001` backend | 不把 DSH 前端换到 18086 |
| Swagger 502 | Admin Service 是否监听 5207 | 不擅自换其他端口 |
| 审计页无样式/像重复 HTML | CSS/JS 内容类型、缓存和代理目标 | HTTP 200 可能实际上返回了 HTML |
| 控制台 401 / 重复登录框 | 控制台 Cookie、同源路径、有效期 | 与 UMC 登录分开排查 |
| Reader `no_permission` | 本轮 GetUserInfo、身份匹配、页面权限 | 不直接改 allowlist 或伪造角色 |
| `load_failed` / 超时 | `stage`、`timeoutKind`、网关健康 | 区分总预算、知识请求、规划和浏览器执行 |
| 知识 422 / 查不到新手册 | folder_id、文件版本、top_k 上游限制 | 用户上传完成不等于检索已验证 |
| tab 找不到或点击后状态不变 | exact label、数字 badge、唯一 scoped section、selected 状态 | 使用通用策略，不能退化成全页随便找同名按钮 |
| 审计看不到旧记录 | owner/admin 范围、搜索、分页、保留期限 | 审计权限不会恢复已清理的数据 |
| 追问换了对象或丢失关注项 | 原 conversationId、businessFocus 与条件继承 | 不能用旧列表行代替新鲜读取 |

在 Admin DSH 根目录执行以下只读诊断，分享日志前先脱敏：

```bash
docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml ps

docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml \
  logs --tail=120 backend platform-gateway knowledge-gateway

curl --fail --silent --show-error http://localhost:8001/healthz

docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml exec -T backend \
  python -c 'import urllib.request; print(urllib.request.urlopen("http://platform-gateway:8102/healthz").read().decode())'
```

健康检查只证明对应服务响应，不证明真实账号、知识内容、页面交互和业务答案全部可用。

## 8. 两个人一起改的工作约定

### 8.1 按问题归属分工

| 问题类别 | 交付位置 | 不要做 |
| --- | --- | --- |
| 页面/字段/控件业务含义错误 | 知识库完整手册的局部修订 | 在 Reader 里硬编码该模块含义 |
| 通用动作、权限、意图或事实校验缺陷 | 通用代码 + 工程契约 + 测试 | 为一个问题新增业务 Tool |
| 已确认的错答/错误交互 | 可重复回归、版本化证据 | 只留截图或修改预期掩盖失败 |
| 多页反复出现的流程问题 | 经过评审的开发 Skill 更新 | 每次任务都把个案塞进 Skill |
| 环境、账号或登录事件 | 排障记录 | 将账号或凭据写到手册/Skill |

建议一人负责 Reader 意图/证据与测试，另一人负责 Gateway 执行或手册证据，按具体需求调整。`portal_reader.py`、`llm.py`、`service.py`、`platform-gateway/app.py` 是高冲突文件，开始前确认谁正在改。

各自用独立工作树/分支；需要新分支时遵守 `codex/` 前缀，或使用团队明确指定的分支名。代码工作树隔离不等于服务隔离：当前 Compose 项目名、容器、数据库卷和端口固定，两份工作树同时启动会碰撞。共享本地环境时串行部署，部署前注明当前源码目录、commit 和操作者；不要两个人同时重建服务或改运行配置。

未经明确授权不 push、不创建/更新 PR、不改远端分支/tag/remote。本次文档未提交或推送。不要用 `git add .` 将备份、私有环境、测试原始敏感数据一起提交。

### 8.2 最小验证集

在已有隔离 Python 测试环境中、从仓库根目录执行；依赖参考 backend / gateway 的 requirements，测试另需 pytest 等测试依赖。不要为了测试导入 `main.py` 启动业务服务或自动初始化不明数据库。

```bash
# 意图与追问相关的定向测试
PYTHONPATH=backend pytest -q \
  backend/tests/test_reader_intent_schema.py \
  backend/tests/test_reader_intent_flow.py \
  backend/tests/test_reader_conversation_context.py \
  backend/tests/test_service_reader_context.py

# 通用 Reader / Gateway / 权限代码变更后跑共享测试
PYTHONPATH=backend pytest -q backend/tests

# 问题运行器、报告与 Swagger 清单工具
node --test scripts/test_*.mjs

# 提交前检查
git diff --check
git status --short
```

Gateway 动作或网络策略改动重点补 `test_platform_portal_reader.py`、`test_reader_network_policy.py`；事实/区域选择补 `test_reader_section_evidence.py`、`test_reader_field_bindings.py`、`test_reader_semantic_resolution.py`。

手册结构验证器在开发 Skill 的 `scripts/validate_manual.py`，有控件的页面使用 `--require-controls`。手册应位于用户授权的仓库外位置；结构检查通过不代表业务语义正确或线上检索成功。

最后回到原账号和原会话完成实际用户路径验证，记录 fresh GetUserInfo、代码版本、知识版本和白名单模式。真实问答会写本地 DSH 会话/审计并调用 LLM/上游，执行前确认环境和授权。`scripts/run_reader_question_review.mjs` 是需导入的运行器，Token 只能在获准运行器内存传入，没有 CLI Token 参数；不要把 Token 放进 shell history。

验收分开写：工程测试结果、手册结构、知识检索、实际问答、跨角色覆盖。不能将不同代码版本的单步成功拼成同一轮通过。

## 9. 当前进度、已知问题和阅读顺序

本节区分“本次核对”与“历史验证”，不是重新执行全量验收。

| 项目 | 已有证据 / 当前结论 |
| --- | --- |
| 最新代码 | `97b8062`：保留业务焦点并验证 tab 追问；上一个意图修复为 `a80ef13` |
| 本地运行 | 本次检查：6 个 Compose 服务运行；具备 healthcheck 的 5 个服务 healthy，frontend 无 healthcheck |
| 数据库目标 | 本次核对：Compose 和 backend 运行环境均为 Admin 本地 `postgres:5432/dsh`；未查询/写数据库 |
| 网关模式 | 本次健康检查确认白名单关闭；不宣称网络层严格只读 |
| 最新历史工程测试 | `focus-followup-repair-2026-09-07.md` 记录 959 backend + 25 Node 通过；本次文档任务未重跑 |
| 两条追问 | 原会话中 “show me the list” 和 “show me the blocked task list” 已有实际通过记录，审计 25967/25968、25980/25981 |
| 追问通过的限制 | 两次使用 `structured_unique_evidence` fallback；不证明模型 observation 引用选择已修好 |
| 仍有缺陷 | 首次提问区域选择、模型 observation 引用、部分未经证据支持的最终结论；行结果展示仍较扁平 |
| 全量业务验收 | 20 组 / 60 步完整问题集仍未执行完成，跨模块与跨角色不能宣称全部通过 |
| 本次未做 | 未浏览业务页、未重新验收三条入口的视觉布局、未刷新知识、未切账号、未部署或更改任何运行设置 |

按以下顺序读记录，避免被历史段落误导：

1. [业务焦点与 tab 追问修复](admin-portal-reader/focus-followup-repair-2026-09-07.md)：最新定向修复、通过范围和剩余缺陷。
2. [条件化意图修复](admin-portal-reader/intent-repair-2026-09-07.md)：澄清、跨类别、继承与清除规则。
3. [网络策略](admin-portal-reader/network-policy.md)：临时放开原因、影响和恢复步骤。
4. [通用契约](admin-portal-reader/module-contract.yaml) 与 [通用回归](admin-portal-reader/regression.yaml)：当前工程约束。
5. [已冻结问题集](admin-portal-reader/basic-modules-2026-09-06/questions-review.md)、[业务试跑](admin-portal-reader/business-pilot-2026-09-06/results.md)、[检索记录](admin-portal-reader/retrieval-2026-09-06/results.md)：保留失败及版本差异，不把检索成功当答案通过。
6. [旧交接](admin-portal-reader-handoff.md)、[TODO](admin-portal-reader/TODO.md)、[CHANGELOG](../CHANGELOG.md)：历史背景，状态/测试数字可能落后于上面的最新记录。

旧交接里的“未提交”、441/656 测试和较早的账号恢复基线不再能直接当当前状态；以 `git status`、最近 commit、实际 GetUserInfo 和对应日期验收记录为准。

## 10. 正式交接清单

- [ ] 同事获得 Admin DSH 仓库和约定代码基线；阅读 AGENTS.md 与本文。
- [ ] 三项主要开发 Skill 完整目录已交付，路径已调整，Codex 能发现并读取。
- [ ] 明确是否授权同事操作 Admin Portal 前端 / Admin Service，不默认扩大仓库范围。
- [ ] 通过安全渠道交接私有环境配置、控制台访问和获准 UMC 账号，不提交凭据。
- [ ] 确认知识目录、线上手册版本和完整源文件负责人，交接完整源而非搜索片段。
- [ ] 本地数据库目标验证通过，再启动；需要导入数据时另行批准准确来源/目标和备份方案。
- [ ] 记录并明确处理白名单关闭的本地例外，不能无说明沿用到正式环境。
- [ ] 三个入口与审计静态资源完成浏览器验证，完成一条身份匹配的只读问答。
- [ ] 同事能从原问题找到 reader.evidence / reader.result 并解释失败属于哪一层。
- [ ] 两人约定高冲突文件负责人、共享环境部署窗口、提交与推送权限、下次验收范围。

给同事的首条 Codex 任务可以直接写：

> 请先完整阅读本仓库 AGENTS.md 和 doc/team-handoff.zh-CN.md，检查 git status 与最近提交。保持仅两个通用运行时 Skill，不新增模块 Skill 或业务 Tool。本次只处理【具体原问题/页面/角色/期望】。使用 admin-portal-reader-expansion 的 improve-page 流程，先从【conversationId / audit ID】复现并判断是意图、知识、通用执行、证据还是回答层问题。所有页面工作前取 GetUserInfo，多账号串行；记录当前网络白名单模式。需要改动时补针对性回归并验证原用户路径，不扫描无关模块、不上传或删除知识、不接触 Customer、不操作远端数据库、不推送。相邻仓库操作需另行确认。
