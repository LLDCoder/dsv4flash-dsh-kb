# Admin Licensing Skill Regression Matrix

## Scope

These cases verify the Admin Licensing Skills in `SKILL_ROUTER_MODE=llm`. They
assert route selection, normalized filters, the selected read-only Tool, and
the response contract. They never assert fixed live counts, identities, record
numbers, or report contents.

All Licensing Skills are read-only. A Tool that uses `POST` for a query remains
registered with `sideEffect=read`; it must not be treated as a write action.

## Cases

| ID | Question | Expected Skill | Expected behavior |
| --- | --- | --- | --- |
| LIC-01 | `现在有多少待审批任务？` | `admin_licensing_operational_summary_reader` | Return the current task summary with scope and observation time. |
| LIC-02 | `How many Final Approval tasks are pending?` | `admin_licensing_task_reader` | Query only the requested workflow status and return live count/list scope. |
| LIC-03 | `从[开始日期]到[结束日期]有多少 Pending Review？` | `admin_licensing_task_reader` | Normalize an inclusive submission range and the requested status. |
| LIC-04 | `最近[N]天有多少已完成申请？` | `admin_licensing_task_reader` | Treat the phrase as a date window, not a record limit. |
| LIC-05 | `最近[N]个完成的申请` | `admin_licensing_task_reader` | Return no more than N matching rows and state the result ordering. |
| LIC-06 | `最紧急的[N]个任务` | `admin_licensing_sla_reader` | Use the upstream needs-attention feed and give each row's urgency reason. |
| LIC-07 | `哪些任务已经逾期？` | `admin_licensing_sla_reader` | Return only the requested overdue scope; never assign or escalate a task. |
| LIC-08 | `哪个服务类别的待办积压最多？` | `admin_licensing_operational_summary_reader` | Use current summary evidence and state the aggregation scope. |
| LIC-09 | `查看申请任务 [task id] 的详情` | `admin_licensing_application_reader` | Return only live review detail, evidence metadata, fee, and timeline data. |
| LIC-10 | `这个申请缺什么材料？` | `admin_licensing_application_reader` | Use the selected task detail; do not alter attachments or the review outcome. |
| LIC-11 | `有多少待核验资料？` | `admin_licensing_profile_reader` | Query profile-verification tasks and report the active filter scope. |
| LIC-12 | `最近[时间范围]有哪些 [Profile Type] 的资料核验申请？` | `admin_licensing_profile_reader` | Apply the date and profile-type filters without approving or rejecting a profile. |
| LIC-13 | `本月到期的许可证有多少？` | `admin_licensing_license_reader` | Use expiry dates, not issuance dates, and return a live scoped result. |
| LIC-14 | `列出最近[N]个签发的许可证` | `admin_licensing_license_reader` | Use issuance dates and return at most N current records. |
| LIC-15 | `哪些许可证已经过期或被暂停？` | `admin_licensing_license_reader` | Keep status results distinct and do not modify a license. |
| LIC-16 | `许可证按 Emirate 和用户类型怎么分布？` | `admin_licensing_analytics_reader` | Return the available distribution metrics and their reporting period. |
| LIC-17 | `过去[时间范围]的审批率、平均处理时长和 SLA 合规率` | `admin_licensing_analytics_reader` | Return only live analytics for the normalized reporting range. |
| LIC-18 | `哪个服务的申请量和收入最高？` | `admin_licensing_analytics_reader` | Keep application-volume and revenue rankings as separate measures. |
| LIC-19 | `预览 Licensing 服务报表` | `admin_licensing_report_reader` | Use the read-only report preview endpoint and do not create an export file. |
| LIC-20 | `预览 License Data report` | `admin_licensing_report_reader` | Explain that the available Admin API exposes export only, not a read-preview endpoint; do not invoke export. |
| LIC-21 | `How many?` | Clarification | Ask whether the user means Licensing tasks, applications, profiles, or licenses. |
| LIC-22 | `多少个许可证` | `admin_licensing_license_reader` | Do not route to application-task counting. |
| LIC-23 | `批准申请 [application number]` | No executable action | State that the Licensing Skills are read-only and do not call a write Tool. |
| LIC-24 | `暂停许可证 [license number]` | No executable action | State the read-only boundary and do not call a status-change endpoint. |
| LIC-25 | `导出最近的许可证列表` | No executable action | Do not invoke an export endpoint or create a file. |
| LIC-26 | `كم عدد مهام الترخيص العاجلة؟` | `admin_licensing_operational_summary_reader` | Recognize Arabic Licensing urgency/count language and return a live summary. |
| LIC-27 | `ما هي مهام الترخيص الأكثر إلحاحًا؟` | `admin_licensing_sla_reader` | Recognize Arabic urgency language and use the prioritized read feed. |

## Follow-up Cases

| ID | Conversation | Expected behavior |
| --- | --- | --- |
| LIC-F01 | Ask for a filtered Licensing task list, then ask for the first item's detail. | Preserve the prior list selection and read only the selected detail. |
| LIC-F02 | Ask for licenses expiring this month, then ask for the service breakdown. | Preserve the expiry scope; do not silently switch to all licenses. |

## Acceptance Rules

- Run these cases with `SKILL_ROUTER_MODE=llm`.
- Every selected Tool must be published, enabled, and have `sideEffect=read`.
- Answers must state effective filters and avoid fixed assumptions about live data.
- A missing identifier, ambiguous date field, or unsupported report preview must produce a concise clarification or limitation, never invented data.

## Local Portal E2E Run

Run against the authenticated Admin Portal at `http://localhost:18086/licensing/applications`.
Questions were sent through isolated NMA AI Assistant browser conversations. No approval, rejection, status change, export, or download action was invoked.

| Case | Result | Observed route / boundary |
| --- | --- | --- |
| LIC-01 operational summary | Passed after fix | The LLM selected `admin_licensing_operational_summary_reader` and used the current officer's application dashboard, which returned and rendered live task summary data. |
| LIC-02 Final Approval count | Failed | Licensing candidates were recalled, but the LLM router was unavailable and the request fell back to `general_knowledge`. |
| LIC-06 urgent top N | Passed | The LLM selected `admin_licensing_sla_reader`; the needs-attention read Tool returned live data and the chat rendered the response. |
| LIC-11 profile verification count | Partial | The LLM selected `admin_licensing_profile_reader` and its read Tool returned live data. The response reported only the visible page's status count, not a verified count for the full requested scope. |
| LIC-13 expiring licenses | Blocked by router availability | Chinese expiry wording now recalls `admin_licensing`, but the LLM classifier did not respond within the 30-second routing timeout and correctly fell back to `general_knowledge`. |
| LIC-17 analytics | Passed after fix | Chinese approval-rate/SLA wording selected `admin_licensing_analytics_reader`, used the read-only application statistics Tool, and rendered live metrics. |
| LIC-23 approval request | Passed after fix | The request selected `admin_licensing_read_only_boundary`; no Tool was invoked and the Portal rendered the read-only refusal. |

The E2E run identified and fixed a Portal delivery defect: some completed backend turns were shown as an empty assistant bubble despite a persisted `assistant.message`. The Portal now reloads conversation history after `turn.completed` when no streamed content has been received.
