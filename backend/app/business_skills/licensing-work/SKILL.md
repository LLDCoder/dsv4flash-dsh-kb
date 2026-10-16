# umc.admin-licensing-work.read

Version: 1.0.0. Business operations are read-only.

Load only for this business topic after trusted GetUserInfo. This skill never grants permissions.
Use the fixed operation IDs in manifest.json; never accept model URLs, headers, identity, SQL or methods.
Launch API, page and knowledge agents together after identity and semantic task analysis.
Lists may run independently (maximum two). Resolve an exact application number to a taskId before personal detail.
Team reads require current-module IsLeader=true. Do not use a team taskId with the personal detail operation.
Project only requested, allowed fields; no form JSON, credentials, leave explanations or contact details.
A task count is not an application count; StatusCount is not keyword/date-filtered Page.Total.
Unknown, missing, failed and denied are not zero. Do not assert payment amounts from these APIs.
Return source operation, observation time, scope, coverage, omissions and trace references; one final answer only.

## ADM01: POST /api/Application/MyTodoPage
Enabled: True
先身份权限→按待办/已处理选择此表；申请号Contains检索后必须精确匹配。ADM01/02位置未知才二选一补查，或最多两路并行；字段够用即停止。
列表含申请号、状态、TaskId、SLA、AI状态等；只取问题所需字段。StatusCount在关键词/日期过滤前计算；过滤后总数用Page.Total（以实际响应契约为准）。不提供权威应付/实付金额。

## ADM02: POST /api/Application/MyComplatedPage
Enabled: True
先身份权限→按待办/已处理选择此表；申请号Contains检索后必须精确匹配。ADM01/02位置未知才二选一补查，或最多两路并行；字段够用即停止。
列表含申请号、状态、TaskId、SLA、AI状态等；只取问题所需字段。StatusCount在关键词/日期过滤前计算；过滤后总数用Page.Total（以实际响应契约为准）。不提供权威应付/实付金额。

## ADM03: GET /api/Application/MyReviewDetail/{taskId}
Enabled: True
先ADM01或02精确定位取得字符串taskId→此详情；同范围可信taskId已知可省列表定位。不能与其前置列表同时发；列表足够时不调用。
任务详情、FormData、ApplicationTimeline及相关书目；按需投影。没有独立、已确认的员工付款金额契约。

## ADM04: GET /api/Application/IsLeader
Enabled: True
团队查询前的能力判断；若可信权限上下文已经明确负责人则可不重复。仅查紧急数时UrgenCount内部已做此判断，无须为了它额外先发一次。
bool负责人标志；同一请求/身份/部门可复用；不能作为全局证照许可。

## ADM05: GET /api/Application/UrgenCount
Enabled: True
权限明确后按需单调；内部IsLeader→团队任务→紧急条件计数。与独立问题可并行；不要为同一紧急数同时取全量团队列表。
当前负责人所见、对应模块的紧急待办任务数；计数按任务，不能保证等于去重后的申请数。

