# UMC 三个业务接口与工作流调用文档

## 0. 无需 Backend Token 的 UMC 调用入口（2026-08-27）

77 服务器已提供匿名 Backend 代理，但这不是无鉴权接口：调用方必须携带自己的 UMC
Bearer Token。该 Token 会直接用于当前 UMC 上游请求；Backend 平台 Token、Data Gateway
Token、网关密钥均由服务端隐藏处理，调用方不需要提供。

基础地址：

```text
http://77.242.240.158:18085/api/platform/api/v1/public/data-access
```

统一调用格式：

```http
POST /{endpoint_code}
Authorization: Bearer <UMC_TOKEN>
Content-Type: application/json
```

已开放端点：

| endpoint_code | UMC 上游接口 | 请求参数 |
|---|---|---|
| `nma-application-detail` | `GET /api/MyRequest/ApplicationDetail/{applicationId}` | `parameters.applicationId` |
| `nma-book-by-isbn` | `GET /api/books/by-isbn` | `parameters.isbn` |
| `nma-add-new-application` | `POST /api/MyRequest/AddNewApplication` | `parameters` 对象 |

> 匿名代理现支持所有“已在 Data Gateway 注册并发布”的 UMC 业务端点。上表三个端点提供直接 UMC 映射；其他已发布端点由内部 Data Gateway 按端点编码路由。未注册端点、任意 URL、文件上传/解析/删除和端点管理不会被匿名开放。

ISBN 查询示例：

```bash
curl -X POST \
  -H 'Authorization: Bearer <UMC_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"parameters":{"isbn":"9781302000011"}}' \
  http://77.242.240.158:18085/api/platform/api/v1/public/data-access/nma-book-by-isbn
```

申请详情示例：

```bash
curl -X POST \
  -H 'Authorization: Bearer <UMC_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"parameters":{"applicationId":1345}}' \
  http://77.242.240.158:18085/api/platform/api/v1/public/data-access/nma-application-detail
```

新增申请示例（会产生真实业务数据，必须经过人工确认后调用）：

```bash
curl -X POST \
  -H 'Authorization: Bearer <UMC_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"parameters":{<UMC_ADD_NEW_APPLICATION_FIELDS>}}' \
  http://77.242.240.158:18085/api/platform/api/v1/public/data-access/nma-add-new-application
```

成功响应保持数据网关格式：

```json
{
  "rows": [{ "isSuccess": true, "statusCode": 200, "message": "...", "data": [] }],
  "next_cursor": null
}
```

缺少或格式错误的 UMC Token 返回 `401`；UMC 上游拒绝或过期返回其对应的 `401/403`。
上传、解析、删除、端点管理等接口不在匿名 Backend 入口中开放。

- 文档版本：`v1.2`
- 更新日期：`2026-08-27`
- Backend Swagger：`http://77.242.240.158:11499/api/v1/docs`
- 已发布端点版本：`1`

> **本文档只对接以下三个业务接口：申请详情、ISBN 查询、新增申请。**

| 重点接口 | 端点编码 | 工作流绑定键 | 读写类型 |
| --- | --- | --- | --- |
| **1. 申请详情** | `nma-application-detail` | `umc.application_detail` | 只读 |
| **2. ISBN 查询** | `nma-book-by-isbn` | `umc.book_by_isbn` | 只读 |
| **3. 新增申请** | `nma-add-new-application` | `umc.add_application` | 写入 |

> 文档中不保存平台密码、UMC 密码、JWT 或网关密钥。UMC Token 应由调用方先通过 UMC 登录获得，再放入匿名代理请求的 `Authorization` 头；服务端不会代替调用方登录，也不会使用固定账号冒充调用者。

## 工作流公共调用约定

工作流发布时，将需要的端点配置为 `data_endpoint` 资源：

```json
{
  "resource_type": "data_endpoint",
  "resource_id": "<ENDPOINT_CODE>",
  "resource_version": "1",
  "config": {
    "binding_key": "<BINDING_KEY>",
    "required": true,
    "allowed_fields": ["isSuccess", "statusCode", "message", "data"],
    "timeout_ms": 20000,
    "max_response_bytes": 2097152,
    "max_rows": 10
  }
}
```

工作流运行时根据 `binding_key` 调用资源。下文每个接口都给出需要传入的业务部分：

```json
{
  "binding_key": "<BINDING_KEY>",
  "parameters": {},
  "requested_fields": ["isSuccess", "statusCode", "message", "data"]
}
```

工作流运行时会自动补充工作流版本、组织、用户、`run_id` 和 `trace_id`，并自动完成数据网关鉴权。

三个接口均返回统一响应结构：

```json
{
  "rows": [
    {
      "isSuccess": true,
      "statusCode": 200,
      "message": "Request successful",
      "data": {}
    }
  ],
  "next_cursor": null
}
```

业务响应位于 `rows[0]`：

| 取值路径 | 说明 |
| --- | --- |
| `rows[0].isSuccess` | UMC 请求是否成功 |
| `rows[0].statusCode` | UMC 业务状态码 |
| `rows[0].message` | UMC 响应说明 |
| `rows[0].data` | 实际业务数据 |

---

## **重点接口 1：申请详情**

### 接口定义

| 项目 | 值 |
| --- | --- |
| 工作流绑定键 | `umc.application_detail` |
| 数据端点 | `nma-application-detail` |
| 发布版本 | `1` |
| UMC 上游接口 | `GET /api/MyRequest/ApplicationDetail/{applicationId}` |
| 业务用途 | 根据申请 ID 查询申请详情 |

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `applicationId` | integer | 是 | UMC 申请记录 ID |

### 工作流请求示例

```json
{
  "binding_key": "umc.application_detail",
  "parameters": {
    "applicationId": 2301
  },
  "requested_fields": ["isSuccess", "statusCode", "message", "data"]
}
```

### 响应说明

`rows[0].data` 是申请详情对象。记录不存在或当前 UMC 账号无权查看时，`data` 可能为 `null`。

已实测 `applicationId=2301`，返回的关键数据为：

```json
{
  "applicationId": 2301,
  "applicationNumber": "MC-3-203-1903194",
  "serviceId": 3193,
  "code": "203",
  "status": "Draft",
  "formData": "[]"
}
```

---

## **重点接口 2：ISBN 查询**

### 接口定义

| 项目 | 值 |
| --- | --- |
| 工作流绑定键 | `umc.book_by_isbn` |
| 数据端点 | `nma-book-by-isbn` |
| 发布版本 | `1` |
| UMC 上游接口 | `GET /api/books/by-isbn?isbn={isbn}` |
| 业务用途 | 根据 ISBN 查询图书信息 |

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `isbn` | string | 是 | ISBN；必须按字符串传递，不要转为 JavaScript `number` |

### 工作流请求示例

```json
{
  "binding_key": "umc.book_by_isbn",
  "parameters": {
    "isbn": "9781302000011"
  },
  "requested_fields": ["isSuccess", "statusCode", "message", "data"]
}
```

### 响应说明

`rows[0].data` 是图书数组，同一 ISBN 可能返回多条记录。

| 图书字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string \| null | 书名 |
| `authorName` | string \| null | 作者 |
| `isbn` | string \| null | ISBN |
| `nationalDepositoryNo` | string \| null | 国家寄存号 |
| `versionNumber` | number \| null | 版本号 |
| `printYear` | integer \| null | 出版年份 |
| `language` | string[] | 语言 |
| `subjectCategory` | string | 学科大类 |
| `subjectSubCategory` | string | 学科子类 |

已实测 `isbn=9781302000011`：HTTP `200`，UMC `statusCode=200`，返回 `2` 条图书记录。

---

## **重点接口 3：新增申请**

### 接口定义

| 项目 | 值 |
| --- | --- |
| 工作流绑定键 | `umc.add_application` |
| 数据端点 | `nma-add-new-application` |
| 发布版本 | `1` |
| UMC 上游接口 | `POST /api/MyRequest/AddNewApplication` |
| 业务用途 | 新建草稿、更新草稿或正式提交 |

### 核心请求参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `serviceId` | integer | 是 | UMC 服务内部 ID，不等于 `serviceCode` |
| `serviceCode` | string | 是 | UMC 服务编码 |
| `formData` | string | 是 | JSON 字符串，不是直接的 JSON 数组/对象 |
| `applicationId` | integer | 是 | 新建时为 `0`，更新时为现有申请 ID |
| `type` | integer | 是 | `1` 正式提交，`2` 更新草稿，`3` 新建草稿 |
| `isTest` | boolean | 否 | 测试标识；不会阻止数据持久化 |
| `platformId` | integer | 否 | 来源平台 ID |
| `browserId` | integer | 否 | 来源浏览器 ID |

### 工作流请求示例（新建测试草稿）

```json
{
  "binding_key": "umc.add_application",
  "parameters": {
    "serviceId": 3193,
    "serviceCode": "203",
    "formData": "[]",
    "applicationId": 0,
    "type": 3,
    "isTest": true,
    "platformId": 1,
    "browserId": 1
  },
  "requested_fields": ["isSuccess", "statusCode", "message", "data"]
}
```

### 写入规则

> **重要：`type=3` 也会在 UMC 创建真实、持久化的草稿数据。**

| `type` | 行为 | 使用要求 |
| --- | --- | --- |
| `1` | 正式提交 | **禁止用于普通工作流测试** |
| `2` | 更新已有草稿 | 必须确认 `applicationId` 和业务授权 |
| `3` | 新建草稿 | 可用于受控测试，但会产生真实数据 |

工作流测试时应固定 `type=3` 且 `isTest=true`，不要允许普通用户输入直接覆盖 `type`。

### 响应与回查

新增成功后，从以下路径取值：

```text
rows[0].data.id
rows[0].data.applicationNumber
rows[0].data.isTest
```

已实测创建：

```json
{
  "id": 2301,
  "applicationNumber": "MC-3-203-1903194",
  "isTest": true
}
```

工作流中应将 `rows[0].data.id` 传给 **重点接口 1：申请详情** 的 `applicationId`，完成“新增 -> 回查”闭环。

---

## 对接错误处理

| HTTP | 错误 | 工作流处理 |
| --- | --- | --- |
| `401` | 运行时鉴权缺失或过期 | 停止业务调用，检查工作流运行时配置 |
| `403` | 当前用户或组织没有已发布字段策略 | 为实际执行用户发布对应端点策略 |
| `409` | 绑定的端点版本不匹配 | 更新 `resource_version` 后重新发布工作流 |
| `422` | 参数缺失、类型错误或请求了未授权字段 | 根据本文档校验 `parameters` 和 `requested_fields` |
| `502`/`504` | UMC 上游失败或超时 | 只读请求可有限重试；新增申请不得盲目重试 |

## 已验证结果

| 接口 | 实测参数 | 结果 |
| --- | --- | --- |
| **申请详情** | `applicationId=2301` | HTTP `200`，返回已创建草稿 |
| **ISBN 查询** | `isbn=9781302000011` | HTTP `200`，返回 `2` 条图书记录 |
| **新增申请** | `type=3`、`isTest=true` | HTTP `200`，创建 `applicationId=2301`，并已回查成功 |

Swagger：`http://77.242.240.158:11499/api/v1/docs`
