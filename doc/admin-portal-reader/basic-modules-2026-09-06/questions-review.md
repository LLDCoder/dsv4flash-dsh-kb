# Basic Modules Questions Review

Status: **READY FOR REVIEW / MANUAL PREPARATION**. Engineering question set for live coverage review only; not a user manual. Live scans and semantic reconciliation are complete for the four listed modules; manual preparation and execution verification remain separate. Actual tests were not run. No fixed answers, counts, record IDs, routes, export, download, or business mutations are assumed.

Expected-outcome convention: each Chinese outcome describes the evidence shape and boundary, not a predetermined value. A detail step may reuse the first visible record only when the preceding step established its identity; otherwise it must ask for or establish a permitted record before continuing.

## Customer Happiness

### CH01 Refund overview to assignment scope

1. **Question:** What refund requests are currently in the Customer Happiness queue?
   **Expected outcome:** 返回 Refunds 页面已确认的队列概览和可见范围；To Do 只能称为当前队列，不能自行解释为个人待办。
2. **Question:** Show me up to five of those refund requests.
   **Expected outcome:** 在同一 Refunds 队列中返回最多五条有界行，保留 Application No.、Refund Category、Reference No.、Status 等实际可见身份/状态字段；无匹配行时按明确空状态分类。
3. **Question:** Are these requests assigned to me, or are they simply queue items?
   **Expected outcome:** 根据页面是否明确提供指派证据回答；Current Handler 或队列行不能单独证明“我的”归属，证据不足时返回范围未确认。

### CH02 Enquiries and complaints queue continuity

1. **Question:** Show the current enquiries and complaints, including their statuses.
   **Expected outcome:** 返回 Enquiries & Complaints 列表的有界行和实际状态字段，并保留 Ticket No. 等稳定身份；不以 Refunds 或概览数字替代。
2. **Question:** How about the completed enquiries and complaints?
   **Expected outcome:** 切换同一列表的 Completed 标签并验证标签与行集变化；不得把原 To Do 行重复当作已完成记录。
3. **Question:** What is the difference between a record's status and the To Do or Completed tab?
   **Expected outcome:** 解释行级 Status 与队列标签的不同证据层级；如果当前行或标签没有足够关系证据，明确标为未确认。

### CH03 Appeal and violation identity

1. **Question:** Show the current appeals, including Appeal No., Appeal Reason, Violation No., and Status where available.
   **Expected outcome:** 返回 Appeals 列表中实际可见的有界字段；页面标题曾出现不稳定时保留这一限制，不用路由名称冒充标题证据。
2. **Question:** What is the difference between the Appeal No. and Violation No. on these appeals?
   **Expected outcome:** 依据字段标签和知识区分申诉身份与关联违规身份；不能把其中一个编号当作另一个对象的详情入口。
3. **Question:** For those same appeals, what does Last Updated tell us?
   **Expected outcome:** 仅当当前布局实际提供 Last Updated 时解释其为更新字段；若当前角色/布局显示 Submission Time 或没有该字段，不替换字段含义并返回未确认。

### CH04 Account identifier search and reset

1. **Question:** Show the customer accounts and identify one Account ID without revealing extra personal details.
   **Expected outcome:** 返回 Accounts 表的有界结构和一个已绑定的可见 Account ID；最小化 PII，不输出姓名、邮箱或手机号。
2. **Question:** Find that same account by its Account ID.
   **Expected outcome:** 在已绑定的 Account ID 上执行只读搜索并验证结果收窄到匹配账户；若前一步没有唯一 ID，则不猜测搜索值并返回未确认。
3. **Question:** Clear the account search and confirm the list returns to its earlier state.
   **Expected outcome:** 清除搜索条件并验证列表恢复到前一步的有界状态；不得声称恢复了未观察的完整总量。

### CH05 Accounts and Profiles distinction

1. **Question:** What is the difference between Accounts and Profiles in Customer Management?
   **Expected outcome:** 说明 Accounts 与 Profiles 是不同表结构和业务对象；仅使用当前证据中的字段，不猜测二者存在未显示的关联。
2. **Question:** Show the profiles and the information used to identify them.
   **Expected outcome:** 切换到 Profiles 后返回有界行和实际字段（例如 Media File No.、Account ID、Profile Type、Profile Name）；若权限或页面状态未确认则不编造列表。
3. **Question:** How are Account ID and Media File No. related on these profile records?
   **Expected outcome:** 只有同一行明确同时显示两字段时，说明该行展示的关联；不能据此推断账户拥有的其他档案或跨行关系。

## Content

### CT01 Application queue and status

1. **Question:** Show the current My Application Tasks queue and the application information shown for each row.
   **Expected outcome:** 返回有界应用行和实际可见字段（包括 Application No.、Service Name、Status、SLA 等）；必须有实时业务结果，不能只返回页面标题或数量。
2. **Question:** How about the completed applications?
   **Expected outcome:** 切换同一应用列表的 Completed 队列并返回有界结果，验证标签和行集变化；不得重复 To Do 行或把缺少数据解释为已完成。
3. **Question:** What is the difference between an application's Status and the To Do or Completed queue?
   **Expected outcome:** 解释行级 Status 与队列标签的不同证据层级；应用行结果必须来自当前选定队列，不能由标签推导状态。

### CT02 Application No. search and reset

1. **Question:** From this application queue, give me one Application No. and only the surrounding information needed to identify it.
   **Expected outcome:** 返回一条已绑定的可见 Application No. 及最小必要字段，不保留额外个人或业务内容；没有唯一可见编号时返回未确认，不猜搜索值。
2. **Question:** Find that same application by its Application No.
   **Expected outcome:** 使用已绑定编号执行只读输入搜索，等待页面稳定并返回匹配应用行；必须验证结果确实收窄到该编号。
3. **Question:** Clear the search and confirm the original application queue is back.
   **Expected outcome:** 清除 Application No. 搜索并验证回到此前有界队列状态；不得声称恢复了未观察的完整总量。

### CT03 Permit fields and status evidence

1. **Question:** Show the current permits, including Application No., Permit No., Effective Date, Expiry Date, and Status where available.
   **Expected outcome:** 返回有界许可行和实际字段；若该许可列表不可访问或没有结果，分别分类 no_permission 或明确 no_data，不以列表标题代替业务结果。
2. **Question:** What is the difference between a permit's Effective Date and Expiry Date?
   **Expected outcome:** 根据字段标签解释生效与到期字段的区别；不补造日期边界、时区或当前值，也不把 Application No. 当作 Permit No.。
3. **Question:** Which permit statuses are shown in this list?
   **Expected outcome:** 仅列出当前有界结果中观察到的状态值，不声称状态枚举穷尽，也不为状态赋予未经知识和页面证据支持的定义。

### CT04 Books and Movies category comparison

1. **Question:** Show the books and their statuses, including the information that identifies each one.
   **Expected outcome:** 返回 Books 的有界行及实际列（如 ISBN、Book Title、Author Name、Version No.、Status）；状态值仅按当前结果报告，不宣称完整枚举。
2. **Question:** How about movies? Show them with their statuses and identifying information.
   **Expected outcome:** 切换 Content Library 的 Movies 标签并返回有界电影行，验证其实际列（如 Title、Type、Language、Copyrights Type、Status）；不得访问失败的独立 Cinema 子路径。
3. **Question:** What information differs between the Books and Movies lists?
   **Expected outcome:** 对比两次观察到的列和状态信息，说明表结构差异；不把 Books 的 ISBN/Version No. 或 Movies 的 Copyrights Type 推广到另一类别，也不猜状态含义。

### CT05 Other Content Library categories

1. **Question:** Show the newspapers and magazines, including their statuses and the information shown for each one.
   **Expected outcome:** 返回该标签下有界行及 Title、Type、Periodical Type、Subject Category、Language、Copies、Status 等实际字段；本题不要求筛选或分页，也不得声称未验证的操作已经生效。
2. **Question:** How about video games? Show the information used to identify them.
   **Expected outcome:** 切换同一 Content Library 的 Video Games 标签并返回有界行，保留 Game Title、Category、Copyrights Type、Language、Status 等已观察字段；不把 Books/Movies 列套用过来。
3. **Question:** Finally, show the Regulate Entry Items and explain which information identifies each material entry.
   **Expected outcome:** 切换到 Regulate Entry Items 并返回有界行，使用 Title、HS Code、Material Type、Language、Number of Titles、Material Status 等实际字段；本题不要求使用 Filter 或 Reset，不得声称未执行的筛选已生效。

## Inspection

### IN01 Queued task overview

1. **Question:** Show the current inspection task queue and the information shown for each task.
   **Expected outcome:** 对 Inspection Manager 使用已确认的 Queued Tasks；对 Inspector 使用已确认的 To Do 队列。两种角色都必须返回实际有界任务行和 Task No.、Inspection Target、Priority、Due Date、SLA、Status 等当前布局支持的字段，不能只返回页面标题或数量。
2. **Question:** Show me up to five tasks from that queue.
   **Expected outcome:** 在上一问建立的同一队列中返回最多五条有稳定 Task No. 的任务；若明确没有结果才报告 no_data，不能把未加载或未确认当作空列表。
3. **Question:** Are these tasks assigned to me, or are they simply in the inspection queue?
   **Expected outcome:** 根据当前权限和页面是否提供指派证据回答；Queued Tasks 或 To Do、Inspector 字段单独不能证明个人归属，证据不足时保留范围未确认。

### IN02 Team task queues and time fields

**工程前置条件：** 仅当当前会话确认 Inspection Manager 具有 Team Tasks 权限且页面布局匹配时执行本组；本组不是 Inspector 的基线流程。

1. **Question:** Show the inspection team's To Do tasks and their current statuses.
   **Expected outcome:** 仅在当前权限确认 Team Tasks 且 manager 布局可用时执行；返回实际有界任务行和 Task No.、Inspector、Priority、Due Date、SLA、Status 等字段。Inspector 不应被要求找到该 manager-only Team Tasks view。
2. **Question:** Now show the team's completed inspection tasks.
   **Expected outcome:** 在同一获准的 Team Tasks 视图切换 Completed 并返回有界结果，验证队列标签和行集变化，并报告当前结果中实际出现的状态；Inspector 不以自己的 To Do/Completed 页面替代该团队流程。
3. **Question:** What is the difference between Assigned Time and Last Update on these team tasks?
   **Expected outcome:** 仅对已确认 Team Tasks 的 manager 布局解释两个队列各自实际显示的时间字段；不得把 Assigned Time 或 Last Update 换成未观察的时间语义或日期边界。

### IN03 Task No. search and reset

**工程前置条件：** 仅在 manager 会话已建立 Queued Tasks 列表并确认 Task No. 搜索/重置控件后执行本组；Inspector 的搜索/重置行为未在角色 delta 中重新验证。

1. **Question:** From the queued task list, give me one Task No. and only the information needed to identify it.
   **Expected outcome:** 仅在当前权限确认 manager Queued Tasks 且该列表提供唯一可见编号时执行；返回最小必要行上下文，没有唯一编号时不猜测搜索值并返回未确认。Inspector 不应被要求使用此 manager-only search flow。
2. **Question:** Find that same inspection task by its Task No.
   **Expected outcome:** 对已确认的 manager Queued Tasks 使用绑定 Task No. 执行只读输入搜索，等待页面稳定并返回匹配任务；必须验证结果确实收窄到该编号。
3. **Question:** Clear the search and confirm the queued task list is restored.
   **Expected outcome:** 对 manager Queued Tasks 清除 Task No. 搜索并验证回到此前的有界状态；不得声称恢复了未观察的完整总量。Inspector 的 To Do 搜索/Reset 行为未在本轮 delta 中重测，不得用此组代替该证据。

### IN04 Inspector task queues and time fields

**工程前置条件：** 仅当当前会话确认 Inspector 的主 `To Do` 与 `Completed` 任务视图时执行本组；不得用 manager 的 Queued Tasks 或 Team Tasks 布局替代。

1. **Question:** Show up to five inspection tasks in To Do.
   **Expected outcome:** 返回 Inspector To Do 中实际存在的最多五条任务行，并使用当前布局支持的 Task No.、Inspection Target、Priority、Due Date、SLA、Status 和 Assigned Time 等字段；不能只返回标签或数量。
2. **Question:** How about the completed tasks?
   **Expected outcome:** 切换 Inspector 的 Completed 标签并返回实际有界任务行，验证标签和行集变化；只报告当前行中观察到的状态，不把 To Do 行重复为 Completed。
3. **Question:** Why does one list show Assigned Time and the other Last Update?
   **Expected outcome:** 依据 Inspector To Do 与 Completed 的实际列结构说明两个时间字段的页面区分；不推断时区、边界或字段背后的未观察业务规则。

### IN05 Violation records and source tasks

1. **Question:** Show the current inspection violations with their numbers, types, statuses, and source tasks.
   **Expected outcome:** 返回 Violation Management 中实际存在的有界违规行，并使用 Violation No., Violation Type, Status, SLA 和 Source Task 等已确认字段；只能报告当前观察到的状态值，不能声称状态枚举完整。
2. **Question:** What is the difference between a Violation No. and its Source Task?
   **Expected outcome:** 依据同一行的字段关系区分违规记录身份与产生该记录的任务引用；Source Task 只是已显示的关联字段，不得未经详情权限打开任务或推断任务内容。
3. **Question:** How is a violation record different from an inspection task?
   **Expected outcome:** 依据当前已绑定的违规行字段和知识语义区分 Violation No./Violation Type/Status/Source Task 与任务对象；不得要求上一组任务行，也不得用 Task No. 或任务状态替代违规字段。

## Finance

### FN01 Transaction list and status meaning

1. **Question:** Show the current payment transactions and the information shown for each one.
   **Expected outcome:** 返回 Transactions 的有界业务行，包括 Transaction No.、Type、Apply For、Payment Method、Amount、Status 和 Transaction Time 等实际字段；必须有实时交易结果，不能只返回页面标题或 Service Application、Fines、Refunds 按钮。
2. **Question:** Show me up to five of those transactions with their statuses.
   **Expected outcome:** 在同一 Payments 视图中返回最多五条有稳定 Transaction No. 的行，并报告当前观察到的状态；不得声称这些状态等同于结算、对账或账本最终性。
3. **Question:** What does a transaction's status tell us, and what does it not tell us?
   **Expected outcome:** 解释 Failed/Completed 等行级状态只代表当前列表显示的状态证据；不能由此推断 settlement、reconciliation 或 ledger finality。

### FN02 Transaction No. search and reset

1. **Question:** From the transaction list, give me one Transaction No. and only the information needed to identify it.
   **Expected outcome:** 返回一条已绑定的可见 Transaction No. 及最小必要行上下文；没有唯一编号时不猜测搜索值并返回未确认。
2. **Question:** Find that same transaction by its Transaction No.
   **Expected outcome:** 使用已绑定编号执行只读输入搜索，等待页面稳定并返回匹配交易；必须验证结果确实收窄到该编号。
3. **Question:** Clear the search and confirm the original transaction list is back.
   **Expected outcome:** 清除 Transaction No. 搜索并验证回到此前的有界 Payments 状态；不得声称恢复了未观察的完整总量。

### FN03 Finance refund records

1. **Question:** Show the current Finance refund records with their transaction and application references.
   **Expected outcome:** 返回 Finance Refunds 中实际存在的有界行，并使用 Application No.、Transaction No.、Type、Apply For、Payment Method、Amount、Status 和 Last Updated 等已确认字段；不能用 Customer Happiness 队列行替代。
2. **Question:** Which refund statuses are shown in this Finance list?
   **Expected outcome:** 仅报告当前 Finance Refunds 行中观察到的 Refunded、Pending Refund 或其他实际状态；不声称状态枚举完整，也不把它们解释为 Customer Happiness refund workflow 状态。
3. **Question:** How is a Finance refund record different from a Customer Happiness refund request?
   **Expected outcome:** 区分 Finance 的交易/支付字段与 Customer Happiness 的退款工作流字段；不能因 Application No. 相似就宣称两条记录可互换或代表相同状态。

### FN04 Amount and time fields

1. **Question:** What information is shown for a transaction's amount, payment method, and transaction time?
   **Expected outcome:** 返回当前 Transactions 行实际提供的 Amount、Payment Method 和 Transaction Time 字段；不补造金额、币种、时区或日期边界。
2. **Question:** How does Transaction Time differ from Last Updated on a Finance refund?
   **Expected outcome:** 根据两个已确认列表的字段语境解释交易发生时间与退款记录更新时间的区别；不能把一个字段替换成另一个，也不推断时间值或边界。
3. **Question:** Can the amount and status fields confirm that a payment is finally settled?
   **Expected outcome:** 只能返回当前行显示的 Amount/Status 证据，并明确该列表未确认 settlement、reconciliation 或 ledger finality；不得把 Completed 当作最终结算证明。

### FN05 Finance access and result states

1. **Question:** What scope does the Finance data in this session represent?
   **Expected outcome:** 依据 GetUserInfo 与当前 Finance 页面证据说明个人、团队、全局或未知范围；不凭 Finance Officer 职称或列表标签推断所有权。
2. **Question:** Can this session read both the Transactions and Finance Refunds lists?
   **Expected outcome:** 依据当前 GetUserInfo 分别确认两个页面的读取权限，不必为了权限问句枚举业务行；缺少权限时明确 no_permission 且不导航越权。有权限不等于页面已成功加载，也不等于两个列表数据范围相同。
3. **Question:** If one Finance list cannot be shown, is it empty, failed, or forbidden?
   **Expected outcome:** 按明确空状态、加载失败、无权限、未确认分别分类；不把被阻止、未加载或未执行的读取报告为零条记录。

## Review Notes

- Known page identities are evidence inputs for reconciliation, not claims beyond the finalized scans: Customer Happiness, Content, Inspection, and Finance each have scoped page evidence; deeper routes and deferred controls remain outside this question set.
- No question requests approval, submission, modification, deletion, assignment, sending, export, upload, or download.
- This engineering question set is never a knowledge-base import candidate. Native scans and manual review are complete for the declared scope; question execution and Reader acceptance remain pending.
