# 主 Agent 复核记录

## D03 退款错误报空

- 2026-09-06，执行 D01-D03 后，ego 测试空间 82 的 Portal 会话退回登录页。两个执行 Agent 停止浏览器操作；未发现用户接管错误。失效原因未确认。
- 主 Agent 使用既有测试计划指定的账号来源，串行恢复 L2 Licensing Officer。新 GetUserInfo 返回 HTTP 200、Licensing Officer，随后继续测试；不持久化登录凭证。
- 原生 `/happiness/refunds` 初始加载阶段也短暂出现 No Data，等待数据完成后显示两条 To Do 记录，均为 Department Processing。一个代表记录为 `HC-02-2026-5904439`，另一个不复写完整业务行。
- 该页 `/api/Refund/Admin/Tickets`、`/api/Refund/Admin/Tickets/Statistics` 等必要请求返回 HTTP 200。
- 当前运行网关及本地工作区的只读 API 白名单均不包含 `/api/Refund/Admin/Tickets`；未匹配请求会被阻止。因此显式 No Data 文案本身不足以证明数据请求成功后的空集合。
- D01 同一权限指纹的 Dashboard 退款分类为 2；D03.2 产品却答退款 To Do 为空。原生页面复核支持将其记为错误报空，而不是把“从 Refunds 入口找”本身判错。
- 本次只读复核未点击 Message、Process、Export 或下载操作，未修改业务数据。
- 全部个人账号首轮结束、DSH 测试对话均为 READY 后，复核 `/happiness/tickets`：原生页面有两条记录，代表编号 `HC-01-2026-9289136`；`/api/Enquiry/Management/List` 返回 HTTP 200。D03.3 的空列表回答同样错误。
- 同阶段复核 `/licensing/reports-analytics`：Service Operations Analytics 当前 Last 30 Days，Service Performance 有十条可见记录，代表服务为 `Issuance of Media Licenses of a Commercial Nature`。`/api/Application/dashboard/statistics` 和 `/api/Application/dashboard/service/list` 均为 HTTP 200。因此 L13.1 也属于错误报空。

## 评分与测试前提

- D02.3 在 D02.2 未返回任何可识别申请后仍被执行 Agent 提交。保留该原始记录；正确承认没有第一条只能说明安全的失败恢复，不能证明详情功能通过。
- 当前原始问题仍按既定文本执行，不将失败问题改写为额外提示再算首次通过。
- v3 Dashboard 与 Licensing 文件名已通过 D01 实际知识检索得到；这只证明这些来源被检索到，不代表每个节点的命中率和语义正确。

## 执行器事件与补测规则

- 恢复过程中，ego 的远端 Node 任务在本地 CLI 退出后仍继续运行。执行 Agent 曾将 CLI 结束误认为整批已停止，导致 D05-D08 重复投递。全部原记录保留，重复组固定取最早启动的对话，不根据答案择优。
- 重叠阶段一度超出预期的两条聊天流程。该阶段纯超时造成的结果单列待复核，不用它证明功能语义错误。后续已禁止重启已投递的组，并在执行脚本增加已有题组检查。
- L02、L06、L10 的上一步实际有清晰编号，执行器却误跳过了详情步骤。因此这三组属于执行器造成的无效完整流程。
- 在查看补测答案之前，预先决定：原运行结束后，用同一 L2 账号、同一部署、不改题目、不附期望答案，完整按三步重跑上述三组；不使用错误的自动编号跳过规则。新对话整体替代旧对话计分，不把两次运行的步骤拼接，不根据补测成绩选择是否替代。旧回答与发现仍保留在原始 JSONL 中。
- 真正缺少前一步记录的其他详情题不因结果不好而重跑；保留数据/功能前提不足的结论。
- D08.1 原始超时发生在执行器重复投递带来额外负载的阶段，先记为待核实。为消除这一可控干扰，在任何补测答案产生前确定：完成经理和无权限批次并恢复 L2 后，以同一部署、原三问、单一执行流完整重跑 D08，写入独立日期补测日志；新组整体替换原组，旧日志仍保留，不按单步表现择优。此规则不扩展为反复重试所有失败题。
- D08 受控补测三步均 turn.completed，没有执行器超时；第1步因 invalid_observation_references / invalid_follow_up_plan 失败，第2步转错到 Licensing Reports Analytics，第3步无原周期与面板基线。因此已消除原“额外负载待核实”项，按新完整流程评分，未把旧轮某步拼回。

## 经理账号前提复核

- 个人账号的完整补测结束后，主 Agent 串行切换到 L1；新 GetUserInfo 确认 Foreign Media Manager、Licensing Manager、DashBoard 和 Licensing.TeamManagement 权限。
- 同账号原生 Dashboard 可见 Team Performance、Members Needing Coaching、Members on Emergency Leave (5)、Needs Manager Attention；D18 的经理区域前提满足。
- 检查原生选择框、组合框、按钮及 Staff/Manager 文案，没有发现同账号双视图选择器。因此 D10 三步不提交、不计通过，也不通过换账号制造条件。
- 经理全部12步完成、测试对话均 READY 后，同一 L1 原生 `/licensing/team-management` 的 Team Tasks / To Do / Application Task Only ON 加载后显示10行、Total 592、1/60页；初始加载时行数也曾短暂为0。代表编号为 `ML-0-801-9786747`。
- 切换 Application Task Only 为 OFF 后，汇总为 Applications 592、Profile Verifications 39、Refunds 3。选择 Refunds 类别并等待刷新后，明确为3条退款、Total 3、1/1页，代表编号为 `HC-02-2026-3194244`。因此 L17.1、L17.2 的 no_data 均错误；不是把其他类别总量当作退款证据。
- 只读切换 Team Members 后存在可识别成员卡片，第一张为 `tiezhu ye`，当前 All 类别展示 Completed Tasks、Avg. Processing Time、SLA Compliance、Overdue Tasks。未点击 Mark Emergency Leave 或其他业务动作。L19 并非原生没有成员卡片。

## 无 Dashboard 权限前提

- 经理批次结束后串行登录 F1；新 GetUserInfo 返回 Finance Officer，顶层权限 Common、CustomerModule、Finance、PersonalCenter，递归权限代码中没有 DashBoard。Portal 自动落在 `/happiness/refunds`，主 Agent 未主动导航 Dashboard。
- D19.1 审计在 read_policy 的 page_not_permitted 阶段结束，没有 portal_execution。D19.2 未执行越权访问，但回答语言及权限解释错误；D19.3 的普通知识恢复没有访问页面，仍把业务注意事项区域解释成了通用操作提示。

## 最终核验

- 本地只读审计确认47个测试对话、3个实际身份，全部对话 READY。8个原始日志共130次真实提交（含保留的重复及补测），均为 turn.completed；正式汇总只取预先选定完整流程的111步。
- 已存证计划的动作类型为 switch_tab、show_filter、observe、apply_filter、filter、query、reset_filter、show_detail、pagination；其中 pagination 明确为 Next Page。未发现审批、提交、请假、修改、导出或下载业务动作。此结论针对本轮审计，不是对所有潜在输入的安全证明。
- 原始日志敏感模式检查未发现 JWT、未脱敏 Bearer 或 password/cookie/access_token 字段。不导出完整页面、完整业务表、原始模型请求。
- 执行器及报告生成器8项单测通过，git diff --check 通过。仅新增测试脚本及验收材料，未修改产品运行代码、知识库、运行配置或部署。
- 最终已恢复原 L2 Licensing Officer，GetUserInfo 再次确认，页面回到 Dashboard；所有测试任务已结束，关闭本轮专用浏览器空间，不操作其他用户空间。
