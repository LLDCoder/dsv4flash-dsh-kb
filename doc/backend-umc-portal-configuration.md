# 后端 UMC 三 Portal 配置说明

本文说明 DSH Backend 如何适配 UMC 的 Customer、Admin 和 Public 三种 Portal，以及本地 `.env`、Docker Compose 和运行时配置页的使用方式。

## 1. 支持的 Portal

| Portal | `UMC_PORTAL` 值 | Base URL 配置 | 默认值/回退规则 |
| --- | --- | --- | --- |
| Customer Portal | `customer` | `UMC_CUSTOMER_BASE_URL` | `https://umc-customerportal.sol.daypop.ai` |
| Admin Portal | `admin` | `UMC_ADMIN_BASE_URL` | `https://umc-adminportal.sol.daypop.ai` |
| Public Portal | `public` | `UMC_PUBLIC_BASE_URL` | 为空时复用 Customer Portal |

`UMC_PORTAL` 是当前请求所使用的 Portal 选择器。值不在 `customer`、`admin`、`public` 中时，后端安全回退到 `customer`。

Public Portal 默认复用 Customer Portal，是为了兼容当前没有独立 Public 域名的部署。如果 Public 入口有独立域名，只需设置 `UMC_PUBLIC_BASE_URL`，不需要修改业务代码。

## 2. 配置优先级和地址规范化

后端通过 `Settings.umc_portal_base_urls` 统一生成三套地址，再由 `Settings.umc_base_url` 选择当前 Portal。地址会执行以下规范化：

1. 去掉首尾空格和末尾 `/`；
2. 如果地址以 `/login` 结尾，去掉该前端路由后缀；
3. Public 地址为空时回退到 Customer 地址；
4. 再由各功能拼接对应的 `/api/...` 路径。

业务端点的覆盖项仍然保留，用于兼容旧环境：

| 覆盖项 | 作用 | 为空时 |
| --- | --- | --- |
| `UMC_LOGIN_URL` | 覆盖 UMC 登录完整地址 | 使用 `<当前 Portal Base URL>/api/User/Login` |
| `UMC_DOCUMENT_BASE_URL` | 覆盖文档服务 Base URL | 使用当前 Portal Base URL |

WebSocket 认证后的 `GetUserInfo` 查询和文档代理都使用派生后的 `umc_document_service_base_url`，不会再从空的旧登录配置反推地址。

## 3. 推荐的本地配置

复制 `.env.example` 为 `.env`，按部署环境填写。推荐的三 Portal 配置如下：

```dotenv
UMC_PORTAL=customer
UMC_CUSTOMER_BASE_URL=https://umc-customerportal.sol.daypop.ai
UMC_ADMIN_BASE_URL=https://umc-adminportal.sol.daypop.ai
UMC_PUBLIC_BASE_URL=

# 仅在旧环境或独立文档服务需要时填写；通常保持为空
UMC_LOGIN_URL=
UMC_DOCUMENT_BASE_URL=
UMC_DOCUMENT_TIMEOUT_SECONDS=60
UMC_LOGIN_TIMEOUT_SECONDS=30
```

切换到 Admin：

```dotenv
UMC_PORTAL=admin
```

切换到独立 Public Portal：

```dotenv
UMC_PORTAL=public
UMC_PUBLIC_BASE_URL=https://<public-portal-host>
```

不要把包含账号、密码、API Key 或 Token 的实际 `.env` 文件提交到 Git。账号密码只应放在本地未跟踪配置或部署平台的 Secret 中。

## 4. Docker Compose 配置

`docker-compose.yml` 和 `docker-compose.lite.yml` 均向 Backend 注入以下变量：

```yaml
UMC_PORTAL: ${UMC_PORTAL:-customer}
UMC_CUSTOMER_BASE_URL: ${UMC_CUSTOMER_BASE_URL:-https://umc-customerportal.sol.daypop.ai}
UMC_ADMIN_BASE_URL: ${UMC_ADMIN_BASE_URL:-https://umc-adminportal.sol.daypop.ai}
UMC_PUBLIC_BASE_URL: ${UMC_PUBLIC_BASE_URL:-}
UMC_DOCUMENT_BASE_URL: ${UMC_DOCUMENT_BASE_URL:-}
UMC_LOGIN_URL: ${UMC_LOGIN_URL:-}
```

修改 Portal 或 Base URL 后需要重建/重启 Backend，使容器重新读取环境变量：

```bash
docker compose up -d --build backend
```

## 5. 后端调用路径

所有需要 UMC 上游地址的功能都从同一套派生配置读取：

| 功能 | 后端使用的配置 | 上游路径示例 |
| --- | --- | --- |
| 自动登录 | `umc_login_endpoint` | `/api/User/Login` |
| WebSocket Token 身份解析 | `umc_document_service_base_url` | `/api/User/GetUserInfo` |
| 文档上传/下载代理 | `umc_document_service_base_url` | `/api/Document/...` |
| UMC Data Access Tool | 请求级 `Authorization: Bearer <UMC_TOKEN>` | `/api/platform/api/v1/...` |

前端通过 WebSocket 首帧发送当前用户 Token：

```json
{"type":"auth","umcToken":"<UMC_TOKEN>"}
```

后端只在请求处理期间使用原始 Token，并通过 `GetUserInfo` 解析用户 ID。Token 不写入会话、数据库或普通日志。

## 6. 健康检查和排查

查看当前 Backend 实际选择的 Portal 和 Base URL：

```bash
curl http://localhost:8000/healthz
```

正常响应应包含类似字段：

```json
{
  "status": "ok",
  "umcPortal": "customer",
  "umcBaseUrl": "https://umc-customerportal.sol.daypop.ai"
}
```

如果 WebSocket 能收到 `umcToken`，但返回 `missing_user_identity`，按以下顺序检查：

1. `/healthz` 的 `umcBaseUrl` 是否是预期的 Portal 地址；
2. 该地址是否能访问 `/api/User/GetUserInfo`；
3. Token 是否属于当前 Portal 且仍然有效；
4. UMC 返回结果中是否包含 `UserID`、`UserId`、`userId`、`userID` 或 `id` 字段。

## 7. 代码对应关系

- 配置模型和派生地址：`backend/app/config.py`
- WebSocket 身份解析：`backend/app/api.py`
- 自动登录：`backend/app/umc_auth.py`
- 文档服务代理：`backend/app/customer_documents.py`
- 运行时配置更新：`backend/app/service.py`
- 健康检查：`backend/app/main.py`

新增 Portal 时，应同时更新 `Settings.UMC_PORTALS`、Portal Base URL 字段、`umc_portal_base_urls`、配置目录、两个 Compose 文件和本说明文档，避免出现配置可选但调用路径未切换的问题。
