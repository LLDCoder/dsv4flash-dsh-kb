# DSH 测试控制台权限说明

本文说明 DSH Docker 测试控制台的登录保护、接口权限边界，以及对话审计的管理员查看范围。

## 1. 权限模型

控制台使用两层权限：

| 层级 | 作用 | 默认状态 |
| --- | --- | --- |
| 控制台密码 | 防止未授权人员打开测试控制台并调用测试接口 | 启用 |
| DSH Principal / 审计范围 | 控制已登录操作者能查看哪些会话 | 普通账号仅限自己的账号和租户 |

控制台密码是固定的测试口令。首次启动时，Backend 会将它写入 PostgreSQL 的 `config_entry` 表：

- `scope = system`
- `key = console_password`
- `value = {"value": "<固定口令>"}`

固定口令不在前端代码、配置页面、API 响应或普通日志中回显。遗失时只能由受控的 PostgreSQL 管理员账号恢复。

## 2. 登录会话

打开测试页面后，必须先输入控制台密码。Backend 校验成功后发放名为 `dsh_console_session` 的短期 HttpOnly Cookie，有效期为 12 小时。

以下行为会清除或使会话失效：

- 点击页面右上角“退出”；
- Cookie 超过有效期；
- 数据库中的控制台密码被更换后，旧 Cookie 不再通过签名校验。

页面只保存当前浏览器内存中的 UMC Token。控制台密码和 UMC Token 不会写入对话审计记录。

## 3. 受保护接口

控制台 Cookie 会保护以下 Backend 路径和 WebSocket：

- `/api/v1/conversations*`
- `/api/v1/config*`
- `/api/v1/skills*`
- `/api/v1/test-cases*`
- `/api/v1/umc/*`
- `/api/v1/ws`

未登录访问这些路径返回 HTTP 401；未登录 WebSocket 会在握手阶段被拒绝。`/api/v1/console/login`、`/api/v1/console/session` 和 `/api/v1/console/logout` 是登录生命周期接口。

`/api/v1/ai-chat/*` 是给外部 UMC Chatbot 使用的兼容接口，不属于本地测试控制台，仍按 UMC Bearer Token 和会话 Principal 校验。

## 4. 对话审计范围

普通已登录账号仍按 `X-User-Id + X-Tenant-Id` 做所有权过滤：

- `GET /api/v1/conversations` 返回当前账号/租户的会话；
- `GET /api/v1/conversations/{conversationId}/audit` 只能读取自己的审计链路；
- 消息、历史、删除和 WebSocket 订阅接口不会因为审计权限而扩大范围。

管理员全局审计范围必须显式配置，不能仅通过选择 `admin` Portal 推断。Backend 没有把浏览器提交的角色字段当作可信权限依据。

### 4.1 77 管理员专用部署

如果 77 服务器上的这套 Backend 只供 Chatbot 管理员控制台使用，在服务器 `.env` 中配置：

```env
AUDIT_ADMIN_ENABLED=true
AUDIT_ADMIN_USER_IDS=*
```

`*` 只应使用在已经由网关、网络策略或独立域名隔离的管理员专用实例。

### 4.2 与客户共用 Backend

如果同一套 Backend 同时服务客户和管理员，不要使用 `*`，改为填写管理员实际的 UMC User ID；多个管理员使用英文逗号分隔：

```env
AUDIT_ADMIN_ENABLED=true
AUDIT_ADMIN_USER_IDS=<admin-user-id-1>,<admin-user-id-2>
```

管理员 allowlist 是部署环境的可信引导配置，优先于数据库中历史保存的关闭值，避免升级后旧配置继续覆盖管理员权限。修改服务器 `.env` 后重建 Backend：

```bash
docker compose up -d --build backend frontend
```

管理员请求返回 `scope=admin`，可以查看任意账号和租户；普通请求返回 `scope=owner`。管理员审计列表和详情会额外显示所属账号、所属租户。

## 5. 恢复控制台密码

在受控数据库管理终端执行：

```sql
SELECT value->>'value' AS console_password
FROM config_entry
WHERE scope = 'system'
  AND key = 'console_password';
```

该查询结果属于敏感运维信息，不应写入前端、工单公开区域或 Git 提交。PostgreSQL 用户、备份文件和日志导出均应限制访问。

## 6. 常见问题

### 页面一直显示密码框

确认 Backend 和 Frontend 容器健康，并使用与页面同源的地址访问。若之前登录过但 Cookie 已过期，重新输入密码即可。浏览器缓存旧版静态文件时可执行强制刷新。

### 接口返回 `console_auth_required`

说明请求没有携带有效的控制台 Cookie。先调用页面登录流程，不要通过手工修改请求头绕过控制台认证。

### 审计页显示“当前账号范围”

检查当前请求使用的 `X-User-Id` 是否是管理员 allowlist 中的 UMC User ID，并确认服务器环境变量已生效。若数据库中存在旧的 `audit_admin_enabled=false`，必须使用当前版本 Backend 重启，让部署环境引导配置重新加载。

### 审计列表仍为空

先确认数据库中确实存在 `conversation_session` 或 `audit_record` 数据，再检查请求使用的租户和账号。管理员范围只扩大“可读范围”，不会创建或恢复已被留存策略清理的记录。

## 7. 实现位置

- 密码存储与签名 Cookie：`backend/app/console_auth.py`
- 登录接口：`backend/app/api.py`
- 全局 REST/WebSocket 保护：`backend/app/main.py`
- 首次数据库初始化：`backend/app/db.py`
- 页面密码层与登录状态：`frontend/index.html`、`frontend/app.js`
