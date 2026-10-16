# umc.admin-inspection.read

Version: 1.1.1. Business operations are read-only.

Load only for this business topic after trusted GetUserInfo. This skill never grants permissions.
Use the fixed operation IDs in manifest.json; never accept model URLs, headers, identity, SQL or methods.
Launch API, page and knowledge agents together after identity and semantic task analysis.
Lists may run independently (maximum two). Resolve an exact application number to a taskId before personal detail.
Team reads require current-module IsLeader=true. Do not use a team taskId with the personal detail operation.
Project only requested, allowed fields; no form JSON, credentials, leave explanations or contact details.
A task count is not an application count; StatusCount is not keyword/date-filtered Page.Total.
Unknown, missing, failed and denied are not zero. Do not assert payment amounts from these APIs.
Return source operation, observation time, scope, coverage, omissions and trace references; one final answer only.

## Exact task status and visit preparation (page capability)

The Page Agent may use the gateway-owned `inspectionTaskNumber` workflow on
`/inspection/tasks`. This is not a new arbitrary API adapter or authorization.
The default Queued tab cannot prove absence from Team Tasks. Search only queues
named by fresh TaskManagement button permissions: Queued, and TeamTodo /
TeamCompleted (or personal Todo/Completed when Team Tasks is not permitted).
Independent exact-keyword queue queries run at most two at a time. Require a
unique exact taskNo match, retain its returned reference, then GET its own task
detail. Validate the returned taskNo and numeric ID; never derive an ID.

For materials/preparation questions in either language, GET checklist-template
only after the detail identity is verified. Require matching taskId and preserve
every visible active checklist point within the 200-item bound. No start-visit,
check-in, checklist submission, download or other write is permitted.
Checklist points are not a formal document list or a complete procedure. Report
those source gaps explicitly, even when the checklist read succeeds. Missing or
denied detail/checklist reads must never say the task was verified as visible.
The current AllChecklistItems catalog also does not prove that every returned
criterion applies to this visit. Pre-visit UI guidance and an engineering guide
are references, not a versioned, approved formal document inventory or full SOP.
Preserve disagreements between guide order and execution prerequisites.

Trace queue searches, detail, checklist, each supplemental HTTP attempt, decode,
retry and backoff. UMC service-internal processing remains uninstrumented.

