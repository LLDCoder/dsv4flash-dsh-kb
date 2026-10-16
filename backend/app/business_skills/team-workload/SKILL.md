# umc.team-workload.read

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

## TEAM01: GET /api/Team/MyTeamMembers
Enabled: True
可信负责人上下文后，可与已知范围的团队任务并行；需按姓名解析MemberId时必须先此接口再成员任务。模块人员归属须另有可信来源。
UserId/UserName；isLeave默认false，true表示排除离岗。返回全部本人领导部门的成员，不带DepartmentId；不可直接称为某一模块完整成员名单。

## TL1: POST /api/Application/MyTeamTodoPage
Enabled: True
先模块权限及负责人→选择待办/已处理表。位置未知可最多两路并行；成员清单与此查询互不依赖时可并行。不能拿本人MyReviewDetail读取他人团队详情。
团队任务分页、StatusCount；状态卡片统计在搜索过滤前计算；带筛选条件的结果数量用Page.Total。含离岗信息时按最小字段返回。

## TL2: POST /api/Application/MyTeamComplatedPage
Enabled: True
先模块权限及负责人→选择待办/已处理表。位置未知可最多两路并行；成员清单与此查询互不依赖时可并行。不能拿本人MyReviewDetail读取他人团队详情。
团队任务分页、StatusCount；状态卡片统计在搜索过滤前计算；带筛选条件的结果数量用Page.Total。含离岗信息时按最小字段返回。

## TL3: POST /api/Application/MyTeamMemberTask
Enabled: True
先确定模块和负责人；姓名→TEAM01→可信MemberId→此接口。MemberId已受信可省查名；仅需要计数就不额外拉团队明细。空结果不能直接解释为0。
成员任务总数/完成数/超时数等；按请求MemberId精确保留，去掉跨模块零值成员。SLA有整数除法/分母口径问题，不作为准确百分比；离岗原因等不传模型。

## TC1: POST /api/Content/MyTeamTodoPage
Enabled: True
先模块权限及负责人→选择待办/已处理表。位置未知可最多两路并行；成员清单与此查询互不依赖时可并行。不能拿本人MyReviewDetail读取他人团队详情。
团队任务分页、StatusCount；状态卡片统计在搜索过滤前计算；带筛选条件的结果数量用Page.Total。含离岗信息时按最小字段返回。

## TC2: POST /api/Content/MyTeamComplatedPage
Enabled: True
先模块权限及负责人→选择待办/已处理表。位置未知可最多两路并行；成员清单与此查询互不依赖时可并行。不能拿本人MyReviewDetail读取他人团队详情。
团队任务分页、StatusCount；状态卡片统计在搜索过滤前计算；带筛选条件的结果数量用Page.Total。含离岗信息时按最小字段返回。

## TC3: POST /api/Content/MyTeamMemberTask
Enabled: True
先确定模块和负责人；姓名→TEAM01→可信MemberId→此接口。MemberId已受信可省查名；仅需要计数就不额外拉团队明细。空结果不能直接解释为0。
成员任务总数/完成数/超时数等；按请求MemberId精确保留，去掉跨模块零值成员。SLA有整数除法/分母口径问题，不作为准确百分比；离岗原因等不传模型。

