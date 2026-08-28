# 18085 Chatbot 附件上传接口文档

## 1. 代理关系

18085 前端使用相对路径请求附件接口，Nginx 将 `/api/` 转发到 UMC Customer Portal：

```text
客户端地址： http://77.242.240.158:18085/api/...
上游地址：   https://umc-customerportal.sol.daypop.ai/api/...
```

附件不会保存到 `/data/project/dsv4flash-dsh-kb`、Flowise 或 18085 Nginx 容器本地。

## 2. 登录用户上传

### 请求

```http
POST /api/Document/Upload
Host: 77.242.240.158:18085
Authorization: Bearer <UMC_TOKEN>
Content-Type: multipart/form-data
```

完整地址：

```text
http://77.242.240.158:18085/api/Document/Upload
```

真实上游地址：

```text
https://umc-customerportal.sol.daypop.ai/api/Document/Upload
```

### curl 示例

```bash
curl -X POST \
  'http://77.242.240.158:18085/api/Document/Upload' \
  -H 'Authorization: Bearer <UMC_TOKEN>' \
  -F 'file=@./document.pdf'
```

### 说明

- 前端使用 `multipart/form-data`；
- 需要有效的 UMC 登录 token；
- 上传成功后，UMC 返回文件对象标识、文件路径或 URL；
- Chatbot 后续交互使用该返回对象，不直接读取服务器本地路径。

## 3. 公共上传

### 请求

```http
POST /api/Document/public/Upload
Host: 77.242.240.158:18085
Content-Type: multipart/form-data
```

完整地址：

```text
http://77.242.240.158:18085/api/Document/public/Upload
```

真实上游地址：

```text
https://umc-customerportal.sol.daypop.ai/api/Document/public/Upload
```

该接口是否允许匿名及其业务字段限制，以 UMC 上游实际鉴权策略为准。

## 4. 原始文件名查询

```http
POST /api/Document/OriginalNames
Content-Type: application/json
Authorization: Bearer <UMC_TOKEN>
```

请求体：

```json
{
  "keys": ["<object-key-1>", "<object-key-2>"]
}
```

完整地址：

```text
http://77.242.240.158:18085/api/Document/OriginalNames
```

## 5. OCR 提取

前端调用：

```http
POST /api/Document/OcrExtract
Content-Type: application/json
Authorization: Bearer <UMC_TOKEN>
```

该请求使用前端配置的 OCR Base URL；它不是 DSV Chatbot 的消息接口。OCR 的文件输入通常引用上传接口返回的对象 key/URL。

## 6. 与 Chatbot 消息接口的关系

Chatbot 消息本身仍通过：

```http
POST /api/platform/api/v1/ai-chat/messages/stream
```

该接口接收消息 JSON，不接收 multipart 文件。正确顺序是：

1. 调用 `Document/Upload` 上传文件；
2. 保存 UMC 返回的文件对象标识或 URL；
3. 将文件对象作为工作流交互参数提交；
4. 工作流按需调用 OCR 或其他工具。

## 7. 错误码

| 状态码 | 含义 |
|---:|---|
| 200 | 上传或查询成功，具体业务结果以 UMC 响应体为准 |
| 400 | multipart 字段、文件格式或参数错误 |
| 401 | UMC token 缺失、过期或无效 |
| 413 | 文件超过 UMC 限制 |
| 500/502/503 | UMC 上游、对象存储或 OCR 服务异常 |
