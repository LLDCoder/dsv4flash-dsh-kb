# Excel row 9 — personal completion-period counts

## Scope

Admin DSH only. Preserve Excel's human-owned acceptance/status cells. No business
database writes, migrations, Portal changes, Customer operations or new Tools.
The existing generic `admin.portal.read` performs the bounded read-only projection.

## Root cause and verified source

`MyComplatedPage` date filters use LastUpdatedTime, which can include a later
application timeline event. They do not prove when the current user's review
completed. The response nevertheless contains `assignee`, `id`, and
`taskApprovalAt`, verified against the deployed Admin business service:

- `GetMyReviewListAsync`: reads tasks by current-user assignee and department.
- `ReviewTaskProjection.SelectCompleted`: current-instance Completed projection,
  deduplicated by application ID, preserving the existing page's membership.
- `BuildReviewResponseAsync`: TaskApprovalAt comes from task.ApprovalAt, whereas
  LastUpdatedTime prefers the latest timeline event.
- DateTimeHelper/UmcClock: naive database times are Dubai wall-clock time (UTC+4).
- WorkflowTaskAuthorization's existing calendar week calculation starts Monday.

The measured object is **distinct applications in the user's current Completed
view, by that row's task approval time**. It is not licenses issued, final
application approvals, or all historical approval actions across repeated reviews.
Answers state this scope and explicit date boundaries.

## Implementation and safety

- Fetch current GetUserInfo; validate current identity and page permission.
- Retrieve available manual context, observe the native page, and bind its
  uniquely observed Completed tab. Do not invent controls.
- Only after observing the existing allowlisted personal Completed operation,
  read its pages with server-owned pageIndex/pageSize. No arbitrary endpoint,
  target user, date field, filter body, or whitelist expansion is accepted.
- Do not send StartTime/EndTime to that API (they filter the wrong date).
- Reduce rows internally to application ID, assignee and approval timestamp.
  Require valid dates, exact current user, distinct IDs, full pagination and
  stable totals. Read twice and compare reduced snapshots. Maximum 3000 rows,
  100/page, within the existing gateway timeout. No cached result substitution.
- Count with inclusive start/exclusive end in Dubai time. Return only compact
  aggregate evidence; full scanned rows never enter the LLM or audit payload.
- Missing dates, foreign owners, incomplete/overlapping/changing pages and
  unsupported scope fail closed. A verified empty count is zero, not an error.
- Carry only the count measure/source between turns, never previous numbers.
  Fix nested countSource label serialization so repeated period follow-ups work.

## Verification

Command: `PYTHONPATH=backend python -m pytest -q backend/tests`.
Final executed result: **2055 passed, 4 subtests passed**.
Includes 62 new focused checks for time boundaries, leap/month/year changes,
UTC conversion, zero, wrong actor, missing dates, duplicates, partial/changing
pagination, policy/provenance, permission/ambiguity and conversation continuity.

Real authenticated candidate Q&A uses Login/GetUserInfo, DSH messages/history
and real Portal reads, not mocked data. No separate browser-widget click test.
Manager `header@license.com`: Completed 665; this week 3; last week 21;
standalone last-week question 21. Repeated follow-ups this week -> last week ->
this month -> last year: **3 -> 21 -> 78 -> 0**, all successful after the nested
label correction. Current date at validation: 2026-09-16.
Second account `Test-Admin-Staff@gmail.com`: Completed **588**, this week **2**,
last-week follow-up **33**, standalone last-week question **33**. Independent
authenticated read-only pagination verified 588 distinct rows, no foreign
assignees and no missing approval timestamps. These different values confirm
the second account did not inherit the manager's totals.

Candidate `/docs` and `/openapi.json` returned 200 and contain taskApprovalAt
and pagination-boundary documentation. Gateway OpenAPI documents completionPeriod.

## Deployment contract

Commit/push after candidate checks, then server fetch/verify the exact commit.
Deploy Admin backend and Admin read-only platform gateway together, retaining
their prior compose configuration for rollback. Preserve the production network
policy and database-init/cleanup disables. Post-deployment Q&A and public Swagger
checks are recorded separately in the task evidence report.

This is technical verification, not human bug acceptance. Row 26 remains a
separate missing-question/missing-expected-result entry and is not claimed fixed.
