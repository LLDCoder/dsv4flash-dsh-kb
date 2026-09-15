# 独立审计控制台账号与接口

独立审计控制台不复用 Docker 测试控制台的共享口令、Cookie 或权限。它只提供两个固定角色：

| 角色 | 审计会话 | 账号管理 |
| --- | --- | --- |
| `Administrator` | 全部，只读；Skill/Tool 诊断只读；管理 Customer-safe 运行配置 | 查看、新建、改角色、停用、重置密码 |
| `Auditor` | 全部，只读；不可读取 Skill/Tool 诊断 | 无 |

## 初始化首个管理员

仅当 `audit_operator` 表为空时，Backend 才会读取以下显式配置并创建首个 `Administrator`：

```env
AUDIT_BOOTSTRAP_USERNAME=audit-admin@example.test
AUDIT_BOOTSTRAP_PASSWORD=<8+-chars-with-upper-lower-number>
AUDIT_BOOTSTRAP_DISPLAY_NAME=Audit Administrator
```

用户名和密码必须同时配置。密码至少 8 个字符，并且必须同时包含数字、小写字母和大写字母，否则 Backend 会拒绝启动。首次初始化成功后从部署环境移除用户名和密码；后续启动不会更新或恢复已有账号。

## 会话安全配置

```env
AUDIT_SESSION_IDLE_SECONDS=1800
AUDIT_SESSION_MAX_AGE_SECONDS=28800
AUDIT_COOKIE_SECURE=true
AUDIT_LOGIN_MAX_FAILURES=5
AUDIT_LOGIN_LOCK_SECONDS=900
AUDIT_LOGIN_RATE_MAX_ATTEMPTS=10
AUDIT_LOGIN_RATE_WINDOW_SECONDS=60
AUDIT_SESSION_RETENTION_DAYS=7
AUDIT_SECURITY_EVENT_RETENTION_DAYS=90
```

密码以带随机盐的 PBKDF2-SHA256 保存。登录后浏览器获得独立的 `dsh_audit_session` HttpOnly、SameSite=Strict Cookie，数据库仅保存令牌摘要。客户 HTTPS 环境必须启用 `AUDIT_COOKIE_SECURE`。账号停用、角色变更和密码重置会撤销该账号的现有会话。

最后一个启用的 `Administrator` 不能被停用或降级。登录成功、失败、退出及账号变更均写入 `audit_operator_event`。

登录入口还按“来源 IP + 标准化用户名”执行单进程滑动窗口限流，默认每分钟 10 次。来源只取 ASGI 的 `request.client`，应用代码不会直接信任可伪造的 `X-Forwarded-For`。反向代理部署必须在 Uvicorn/网关层只信任已知代理地址并正确生成客户端地址；不要将任意来源加入 forwarded allowlist。多 Backend 副本的全局限流应在可信网关层补充，进程内限流只作为应用侧保护。

现有审计清理循环同时执行三类保留策略：对话审计使用 `AUDIT_RETENTION_DAYS`，已过期或已撤销的登录会话在终止 7 天后删除，安全事件默认保留 90 天。对应保留天数均可通过上方环境变量调整。

## HTTP 接口

- `POST /api/v1/audit-auth/login`
- `GET /api/v1/audit-auth/session`
- `POST /api/v1/audit-auth/logout`
- `GET /api/v1/audit/conversations?search=&status=&dateFrom=&dateTo=&page=&pageSize=`
- `GET /api/v1/audit/conversations/{dshSessionId}?category=&search=&page=&pageSize=`
- `GET /api/v1/audit/skills?search=&status=&enabled=&page=&pageSize=`（仅 Administrator）
- `GET /api/v1/audit/tools?search=&enabled=&published=&page=&pageSize=`（仅 Administrator）
- `GET /api/v1/audit/config`（仅 Administrator）
- `PATCH /api/v1/audit/config`（仅 Administrator）
- `GET /api/v1/audit/users`（仅 Administrator）
- `POST /api/v1/audit/users`（仅 Administrator）
- `PATCH /api/v1/audit/users/{id}`（仅 Administrator）
- `POST /api/v1/audit/users/{id}/password`（仅 Administrator）

详情路径使用列表返回的 `dshSessionId`。`conversationId` 只在原账号与租户范围内唯一，不能作为全局审计详情主键。

会话列表以 UMC 登录账号作为主要身份信息。新会话会把已验证的账号快照保存到 `conversation_session.owner_account`；对于升级前的历史会话，列表会先从本会话的 `user.message.auditIdentity` 恢复账号，再按相同租户和 User ID 从其他会话恢复。只有现有审计数据中完全没有可验证账号时，页面才降级显示截断后的 User ID。账号搜索同样覆盖同一用户的历史会话，不会跨租户关联身份。

Skill 诊断只返回版本、状态、作用域、业务域、Tool 绑定、缺失 Tool、依赖和是否已配置正文/工作流；不返回正文、工作流内容或正负样例。Tool 诊断只返回启用/发布状态、方法、去掉主机及查询串的路径、副作用、确认要求，以及认证/脱敏/Profile 范围是否已配置的布尔摘要；不返回请求参数、响应 Schema、认证策略原值、RBAC 策略、Swagger 来源、接口键或 Profile 范围配置。

运行配置接口复用现有 `config_entry` 数据，但使用独立的审计账号鉴权。Customer Portal 选择器、Customer Portal 地址、Document 地址以及 Database/Redis 连接只读；Admin/Public Portal 地址完全不返回。API Key、Database URL、Redis URL 和管理员 User ID 等敏感项只返回配置状态和掩码。每次成功修改会写入 `audit_operator_event.configuration.updated`，事件只记录作用域和变更键名，不记录配置值。
