# DSH 核心改动与 77 旧版硬编码问题

日期：2026-08-30  
分支：`staging`  
远端：`origin/staging`

## 一、今日核心改动

### 1. 以客户门户实际业务重新梳理 Skill

根据客户门户的 `My Requests` 和 `License and Permits` 页面及实际网络接口，重新定义了只读业务边界。

My Requests 相关能力：

- 查询申请列表、状态、分页和历史
- 查询单个申请详情、时间线、服务和费用
- 查询 Pending Payment 申请及付款详情
- 查询 My Requests 中的待处理事项

License and Permits 相关能力：

- 查询 License/Permit 列表、数量、状态、有效期和到期日
- 查询需要处理或续期的记录
- 查询续期/动作资格，但不发起续期
- 查询指定证件的下载信息
- 下载前必须获得用户明确确认

这些 Skill 均明确禁止付款、编辑、取消、复制、提交、续期和其他写操作。

### 2. 增加真实的只读 Tool

新增客户门户实际使用的申请付款详情接口：

```text
GET /api/payment-center/service-applications/{applicationId}/payment
```

对应 Tool：

```text
umc.application_payment_detail
```

该 Tool 被标记为只读，不会发起或确认付款。

### 3. 拆分 My Requests 待处理事项

新增：

```text
my_requests_pending_actions
```

它专门处理“我的待办、待处理事项、哪些申请需要关注”等问题，避免误用 `profile_status`。

同时修正了历史绑定：`profile_status` 不再调用 `umc.pending-actions`。

### 4. 修正 Pending Payment 路由优先级

发现 `waiting for payment` 可能被通用 `payment_receipt` 路由抢先匹配，已增加：

- `waiting for payment`
- `awaiting payment`

并确保 Pending Payment 优先于通用 Payment/Receipt 意图。

### 5. 保留系统默认能力与业务 Tool Registry 的双轨模型

知识库和 OCR 仍由运行配置管理，不进入业务 Tool Registry：

```text
系统默认能力：knowledge.search、ocr.layout_parsing
业务 Tool Registry：从 Swagger 导入的客户业务接口
```

业务 Skill 的工具绑定只能引用已发布且启用的业务 Tool；Tool Registry 负责接口、参数、认证和执行定义。

### 6. 保留并验证分阶段 Skill 路由

当前运行配置使用 `shadow`：

```text
关键词路由负责实际执行
LLM 路由只做分类和差异审计
```

同时保留最近 4 条历史消息、当前消息、`activeSkillId` 和 `activeDomain` 作为路由上下文基础。

## 二、77 旧版的核心硬编码问题

### 1. `service.py` 根据 Skill ID 硬编码 Tool

旧版存在类似逻辑：

```python
elif not tool_request and route.skill_id == "application_status":
    tool_request = ("umc.applications", {"page_index": 1, "page_size": 100})
```

因此只要路由命中 `application_status`，运行时就会直接调用 `umc.applications`，不以 Skill 编辑页面的工具绑定为准。

### 2. `tool_gateway.py` 用大量 `if tool_name == ...`

旧版通过代码分支维护具体业务接口，例如：

```python
if tool_name == "umc.applications":
    ...
```

Tool 的业务定义、参数和执行逻辑分散在代码里，界面中的 Tool 配置无法真正成为唯一来源。

### 3. `allowedTools` 没有成为运行时强约束

旧版 Skill 页面保存的 `allowedTools` 主要用于展示、提示词或配置记录。

旧版实际链路是：

```text
resolve_skill()
→ service.py 根据 skill_id 指定 tool
→ tool_gateway.py 根据 tool_name 执行
```

所以即使界面里没有配置 `umc.applications`，运行时仍然可能调用它。

### 4. 代码默认 Skill 与 77 数据库记录可能不一致

旧版代码中的 `application_status` 默认定义包含：

```text
umc.applications
umc.application_detail
```

但 77 审计界面显示的 Skill 记录可能只有：

```text
umc.application_detail
```

这说明数据库中的人工修改或历史版本没有和运行时代码同步，进一步放大了配置与执行结果不一致的问题。

### 5. 路由分支重复且顺序敏感

旧版 `resolve_skill` 中存在重复的状态、付款、下载和投诉分支。通用 `payment` 可能抢先于 Pending Payment 匹配，导致：

```text
waiting for payment
→ payment_receipt
```

而不是：

```text
waiting for payment
→ application_payment
```

### 6. 申请编号识别能力不足

旧版详情解析主要匹配纯数字 `applicationId`。客户门户实际使用的申请编号包括：

```text
MC-3-203-2852058
APP-2026-000001
```

这类业务编号无法稳定触发详情 Tool，容易回退到通用回答或知识库查询。

### 7. 路由和会话上下文没有真正联动

旧版通常只根据最新一句话做关键词判断。例如：

```text
用户：What applications do I have in My Requests?
用户：Show only the ones that are not completed.
```

第二句单独看没有明确业务关键词，旧版可能路由到 `general`，即使上一轮已经明确处于 My Requests 场景。

### 8. 审计记录的是实际执行，不是 Skill 配置推断

审计里的：

```text
tool.call → umc.applications
```

表示运行时实际调用了该 Tool，不代表它一定来自 Skill 编辑页面的 `allowedTools`。在旧版中，实际执行路径由硬编码决定。

## 三、新旧架构对比

| 项目 | 77 旧版 | 当前改造版 |
| --- | --- | --- |
| Skill 工具绑定 | 主要是配置展示/提示 | 作为运行时允许集合 |
| Tool 选择 | `service.py` 按 Skill 硬编码 | 从 Skill 允许列表中选择 |
| Tool 定义 | 分散在代码 `if` 分支 | Tool Registry 统一维护 |
| Swagger | 文档/代理来源 | 可扫描、导入、去重并发布 Tool |
| 接口去重 | 无统一治理 | `HTTP Method + 标准化 Path` 唯一 |
| 知识库/OCR | 与业务 Tool 混杂风险 | 运行配置管理的系统默认能力 |
| 下载控制 | Skill 文案约束为主 | Skill 确认要求 + Tool 安全层 |
| 路由模式 | 关键词硬编码 | `keyword / shadow / llm` 可切换 |
| 审计含义 | 只能看到实际调用结果 | 可同时审计关键词路由、LLM 路由和候选 Skill |

## 四、实际回归发现

本地 `shadow` 模式执行了 5 组 My Requests 连续对话，共 10 轮。完整记录见：

[my_requests_followup_results.md](./my_requests_followup_results.md)

已验证：

- My Requests 列表可以查询并返回真实状态统计
- Pending Payment 首问已正确调用 `umc.applications`
- 只读付款信息不会发起付款
- LLM Shadow 路由可以识别部分正确意图

仍暴露的问题：

- 关键词路由对上下文追问保留不足
- 申请编号格式需要更稳定的解析和上下文实体记忆
- “Media License applications” 容易被误判为新许可证知识咨询
- Shadow 模式下 LLM 识别正确时，实际仍执行关键词结果，这是设计行为，不是执行错误

## 五、今日提交

```text
a7b03b6 feat: align portal skills with read-only flows
5a309a3 test: cover read-only portal skill routing
78a30cc fix: prioritize pending payment application intent
a7c7052 test: record My Requests follow-up execution
```

当前分支已经推送到：

```text
origin/staging
```
