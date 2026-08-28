# Portal Settings 配置说明

## 1. 用途

DSH Backend 通过一组统一的 `UMC_*` 配置适配 UMC 的三个 Portal：Customer、Admin 和 Public。

Portal 配置决定以下请求使用哪个 UMC 上游地址：

- 自动登录 `POST /api/User/Login`；
- WebSocket 收到 `umcToken` 后查询用户信息 `POST /api/User/GetUserInfo`；
- 文档上传、下载等 UMC Document API；
- 其他需要将当前用户 Token 透传给 UMC 的请求。

## 2. Portal 选择

通过 `UMC_PORTAL` 选择当前 Portal：

| 值 | Portal | Base URL 配置 | 默认地址/回退 |
| --- | --- | --- | --- |
| `customer` | Customer Portal | `UMC_CUSTOMER_BASE_URL` | `https://umc-customerportal.sol.daypop.ai` |
| `admin` | Admin Portal | `UMC_ADMIN_BASE_URL` | `https://umc-adminportal.sol.daypop.ai` |
| `public` | Public Portal | `UMC_PUBLIC_BASE_URL` | 为空时复用 Customer Portal |

允许的值只有 `customer`、`admin` 和 `public`。如果配置了其他值，Backend 会自动回退到 `customer`。

## 3. 环境变量

### 3.1 Portal 基础配置

```dotenv
UMC_PORTAL=customer
UMC_CUSTOMER_BASE_URL=https://umc-customerportal.sol.daypop.ai
UMC_ADMIN_BASE_URL=https://umc-adminportal.sol.daypop.ai
UMC_PUBLIC_BASE_URL=
```

`UMC_PUBLIC_BASE_URL` 可以留空。留空时，Public 场景仍会使用 Customer Portal；如果部署环境有独立的 Public Portal，则填写对应域名。

### 3.2 可选兼容覆盖项

```dotenv
UMC_LOGIN_URL=
UMC_DOCUMENT_BASE_URL=
```

配置优先级如下：

1. `UMC_LOGIN_URL` 非空时，作为完整登录接口地址；为空时使用 `<当前 Portal Base URL>/api/User/Login`。
2. `UMC_DOCUMENT_BASE_URL` 非空时，作为文档服务 Base URL；为空时使用当前 Portal Base URL。
3. WebSocket 用户身份查询使用文档服务 Base URL 加 `/api/User/GetUserInfo`。

这两个字段主要用于兼容旧部署或独立 UMC Document 服务。新部署通常保持为空，让 `UMC_PORTAL` 和三套 Base URL 统一决定地址。

### 3.3 超时和自动登录

```dotenv
UMC_DOCUMENT_TIMEOUT_SECONDS=60
UMC_LOGIN_TIMEOUT_SECONDS=30
UMC_LOGIN_EMAIL=
UMC_LOGIN_PASSWORD=
```

`UMC_LOGIN_EMAIL` 和 `UMC_LOGIN_PASSWORD` 仅供本地测试控制台自动登录使用。生产环境应使用部署平台的 Secret，不要把真实密码提交到 Git。

## 4. 地址规范化

Backend 会对每个 Portal Base URL 做统一处理：

1. 去除首尾空格；
2. 去除末尾 `/`；
3. 如果地址以 `/login` 结尾，去除该前端路由后缀；
4. 再拼接后端 API 路径。

例如：

```text
输入： https://umc-customerportal.sol.daypop.ai/login/
结果： https://umc-customerportal.sol.daypop.ai
登录： https://umc-customerportal.sol.daypop.ai/api/User/Login
用户： https://umc-customerportal.sol.daypop.ai/api/User/GetUserInfo
```

## 5. Token 和 WebSocket 行为

浏览器不能直接为 WebSocket 设置 `Authorization` 请求头，因此前端在连接建立后发送第一帧：

```json
{
  "type": "auth",
  "umcToken": "<UMC_TOKEN>"
}
```

Backend 收到 Token 后：

1. 从当前 Portal 的文档服务 Base URL 调用 `/api/User/GetUserInfo`；
2. 从返回 JSON 递归查找 `UserID`、`UserId`、`userId`、`userID` 或 `id`；
3. 解析成功后返回 `authenticated`；
4. 解析失败时返回 `missing_user_identity`。

Token 只在当前请求和 WebSocket 连接内存中使用，不写入数据库、会话记录或普通日志。

## 6. Docker Compose 配置

`docker-compose.yml` 和 `docker-compose.lite.yml` 都应向 Backend 传入：

```yaml
UMC_PORTAL: ${UMC_PORTAL:-customer}
UMC_CUSTOMER_BASE_URL: ${UMC_CUSTOMER_BASE_URL:-https://umc-customerportal.sol.daypop.ai}
UMC_ADMIN_BASE_URL: ${UMC_ADMIN_BASE_URL:-https://umc-adminportal.sol.daypop.ai}
UMC_PUBLIC_BASE_URL: ${UMC_PUBLIC_BASE_URL:-}
UMC_DOCUMENT_BASE_URL: ${UMC_DOCUMENT_BASE_URL:-}
UMC_LOGIN_URL: ${UMC_LOGIN_URL:-}
```

修改 Portal 或地址后重启/重建 Backend：

```bash
docker compose up -d --build backend
```

## 7. 运行时配置

运行配置接口和配置页可修改以下 Portal 项：

- `umc_portal`；
- `umc_customer_base_url`；
- `umc_admin_base_url`；
- `umc_public_base_url`；
- `umc_login_url`；
- 登录账号和密码。

切换 Portal 或修改其地址后，Backend 会使内存中的自动登录 Token 失效，下一次需要时重新登录获取 Token。文档代理会同步刷新为新的派生 Base URL。

## 8. 健康检查

```bash
curl http://localhost:8000/healthz
```

重点检查：

```json
{
  "status": "ok",
  "umcPortal": "customer",
  "umcBaseUrl": "https://umc-customerportal.sol.daypop.ai"
}
```

如果 WebSocket 已收到 `umcToken`，但返回 `missing_user_identity`，优先检查：

1. `umcPortal` 是否是预期值；
2. `umcBaseUrl` 是否指向正确的 Portal；
3. `<umcBaseUrl>/api/User/GetUserInfo` 是否可访问；
4. Token 是否属于该 Portal 且仍然有效；
5. UMC 返回中是否存在支持的用户 ID 字段。

## 9. 代码位置

| 文件 | 作用 |
| --- | --- |
| `backend/app/config.py` | 定义环境变量、Portal 选择和派生地址 |
| `backend/app/api.py` | WebSocket Token 身份解析 |
| `backend/app/umc_auth.py` | UMC 自动登录和 Token 缓存 |
| `backend/app/customer_documents.py` | 文档上传/下载上游地址 |
| `backend/app/service.py` | 运行时配置更新和 Token 缓存失效 |
| `backend/app/main.py` | `/healthz` 健康检查 |
| `docker-compose.yml` | 完整部署环境变量 |
| `docker-compose.lite.yml` | Lite 部署环境变量 |
| `.env.example` | 本地配置模板 |

## 10. 新增 Portal 时的检查清单

新增或调整 Portal 时，应同步检查：

- `Settings.UMC_PORTALS` 是否包含该值；
- Portal Base URL 字段和回退规则；
- `umc_portal_base_urls` 的地址选择；
- 配置目录 `CONFIG_CATALOG`；
- 两个 Docker Compose 文件；
- `.env.example`；
- `/healthz` 返回值；
- WebSocket `GetUserInfo`、登录和文档代理是否都使用派生地址；
- 本文档中的配置表和示例是否同步更新。
