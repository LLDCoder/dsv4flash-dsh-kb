# umc.content-library.read

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

## BOOK01: GET /api/ContentLibrary/GetBookList
Enabled: False
不执行；未来先修正角色/数据范围和字段语义，再决定是否纳入。不能仅加Bearer令牌就视为修复。
列表NumberOfCopies固定12，SourceCode固定0，Source固定Local；不能作为实际库存或来源的证据。

## BOOK02: GET /api/ContentLibrary/GetBooksCount
Enabled: False
不执行；未来先修正角色/数据范围和字段语义，再决定是否纳入。不能仅加Bearer令牌就视为修复。
统计没有员工、部门或租户限制；total只加0/1/2，其他或空状态未计入。

## BOOK03: GET /api/ContentLibrary/GetBookDetailsById
Enabled: False
不执行；未来先修正角色/数据范围和字段语义，再决定是否纳入。不能仅加Bearer令牌就视为修复。
NumberOfCopies固定12；Source由是否存在PrintingPermit推断；CenvertToStatus未知值默认Approved，不能把默认值当审批事实。

## BOOK04: GET /api/ContentLibrary/GetBookAppsInfoListById
Enabled: False
不执行；未来先修正角色/数据范围和字段语义，再决定是否纳入。不能仅加Bearer令牌就视为修复。
会返回关联申请号、申请人、用户类型；无员工业务范围过滤；UserProfile按UserId取首条，未限定对应申请档案。

## BOOK05: GET /api/ContentLibrary/GetHistoryList/{bookId}
Enabled: False
不执行；未来先修正角色/数据范围和字段语义，再决定是否纳入。不能仅加Bearer令牌就视为修复。
会返回操作人Id和姓名；未验证该bookId属于当前员工可访问的内容库范围。

## BOOK06: GET /api/ContentLibrary/GetNewspaperList
Enabled: False
不执行；未来先修正角色/数据范围和字段语义，再决定是否纳入。不能仅加Bearer令牌就视为修复。
路由叫报刊，但查询的是Book表且未见报刊类型过滤；不能用来回答真实报刊清单。

