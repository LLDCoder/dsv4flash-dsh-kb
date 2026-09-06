# Admin Portal Reader Follow-up

This file records work that remains outside the current Dashboard and Licensing
semantic-selection and read-only interaction scope. The generic Reader remains
the only Portal Skill; future coverage must not reintroduce module-level Skills
or business-specific page Tools.

## Current scope now covered by the contract and regression

The current engineering baseline now includes:

- Dashboard semantic selection for My Tasks, Needs Your Attention, Overdue
  Tasks, and Needs Manager Attention.
- Licensing list, count, overview, and mixed list-overview answer semantics for
  Applications, Profile Verification, Licenses, Reports & Analytics, and
  permission-scoped Team Management. See `licensing-coverage.yaml` for the
  distinction between scanned surfaces and unexecuted acceptance gates.
- Named tabs, pagination, sorting, supported filters, filter dialogs or drawers,
  and read-only list-to-detail surfaces when knowledge or bounded observation
  establishes their controls.
- Text, single-select, multi-select, and date-range filter handling with
  observable Apply, Reset, and Cancel outcomes; unsupported or unverifiable
  controls return `not_confirmed`.
- List-to-detail identity continuity, named read-only detail tabs and expandable
  sections, and explicit rejection of action dialogs, export, download, and
  unknown controls.
- Business-conclusion-first answers that keep page-read, visibility, snapshot,
  extraction, Tool, and audit mechanics out of ordinary successful responses.

These are engineering behavior requirements. Dashboard and Licensing page
manual content remains solely in the knowledge base.

## Business Answer Acceptance Status

The user requested a local network-policy bypass on 7 September for business
validation. It is now deployed with `PORTAL_READER_WHITELIST_ENABLED=false`;
see `network-policy.md` and `swagger-2026-09-07/`. Existing pilot scores below
precede this switch. Repeat the failed questions in the recorded new mode;
do not claim network-level strict read-only enforcement while bypassed.

The four basic v1 manuals are user-reported uploaded; 17 representative
retrieval probes are recorded in `retrieval-2026-09-06/`. The frozen, approved
basic question set is `basic-modules-2026-09-06/questions-review.md` (20 groups,
60 steps). CH02 pilot failures and successive generic repairs are recorded in
`business-pilot-2026-09-06/results.md`; this is not a passed business gate.
All four pilots (CH02/H1, CT04/C1, IN02/I1 with confirmed manager prerequisites,
and FN02/F1) failed under both Correction 05 and the completed Correction 06
serial retest. Latest scores: CH02 0/0/2, CT04 0/0/0, IN02 0/0/0, FN02
0/N/A/N/A. Finance dependent submissions lacked a confirmed identity and do
not verify search/reset. Clear the remaining business failures before the full
corpus and refreshed Dashboard/Licensing samples. Keep live grading separate
from retrieval and unit-test status.

Next: bounded actionable plan-validation feedback for invalid source IDs,
non-JSON row facts and wrong phases; current-role/view knowledge qualification;
verified alternative-entry recovery and read time budgets; then inline
search/reset after establishing identity. Recheck Completed queue coverage
without silently filtering by row Status. No Correction 07 code exists yet.
Skip dependent questions if prerequisite identity/state is missing. Preserve
all failed raw records and do not aggregate passing steps across versions.

The 6 September live acceptance and repair runs do not yet pass business
acceptance. See `improvement-2026-09-06/results.md` for main-agent grading and
version-separated raw evidence. Prioritize generic label/value binding,
valid read plans, list/detail identity continuity, personal/team scope, and
knowledge-grounded explanations before expanding page coverage. Unit-test
coverage and visible native controls are not evidence of successful answers.

## Deferred coverage

- Complete user-managed Licensing publication and post-upload acceptance. The live
  combined `/licensing/reports-analytics` page and manager Team Management
  were scanned on 6 September; this is not deployed Reader acceptance.
- Verify input-based combobox selection, Enter-to-search commitment, unlabeled
  pagination controls, and detail sidebar dependencies through the enforced
  generic executor. Do not mark unexecuted controls as supported merely because
  they were visible during a scan.
- Add future Admin business modules by registering their server-confirmed read
  endpoints and knowledge nodes in the generic Reader; do not create a module
  Skill or business-specific Tool.
- Prove browser task-space authentication isolation before allowing concurrent
  multi-account login scans. Until then, serialize account switching and
  revalidate GetUserInfo after every login.
- Preserve and verify the active role, department, and page-level time-range
  context when the Reader opens an isolated browser context. A matching token
  and permission fingerprint alone do not prove that the view context matches
  the user's current tab.
- Add a bounded page-stability signal for volatile overview counts. Record the
  observation time and active view context instead of comparing unstamped
  observations as one atomic snapshot.
- Clear or replace a prior conversation's completion indicator when a new
  Widget conversation starts; completion must be tied to the new
  `turn.completed` event.

## Manual evidence still required

- Dashboard manual v3 is published in `/umc`, passes the required semantic-node
  and control schema, and covers the verified Dashboard control matrix. Keep
  the manual only in the knowledge base.
- Licensing v3 is prepared at the user-authorized external location recorded in
  `licensing-coverage.yaml`, from the complete v2 source with all 12 original
  node titles retained and old routing assumptions explicitly corrected. The
  user uploads and manages versions; preparation does not establish publication
  or deployed retrieval correctness.
- Confirm each supported date control's portal timezone, date format, inclusive
  or exclusive boundaries, default range, and pagination behavior. Until
  confirmed, affected questions must return `not_confirmed` rather than assume
  browser-local semantics.
- Record exact empty, loading, failed, and permission-denied states for each
  supported page region.
- Record role differences and scope only where current-session evidence proves
  them; do not add account-specific examples or dynamic values to manuals.

## Remaining regression and grader work

- Run relative, inclusive, same-day, empty, invalid, and ambiguous date cases
  after their page-specific date semantics are confirmed in the knowledge base.
- Expand cross-role tests for Officer, Manager, Supervisor, and global
  fingerprints while preserving serialized account switching.
- Add negative cases for stale dialogs, interrupted detail transitions, direct
  detail URL attempts, and changing record identity between list and detail.
- Require an explicit observed network method before awarding the read-only
  network check; a missing method must not count as read-only evidence.
- Keep the grader's documented and asserted POST allowlist count synchronized
  with the current server-owned read endpoints.

## Expansion trigger

Expand beyond Dashboard and the inventoried Licensing module only after the
semantic-selection, interaction-boundary, and answer-presentation regressions
pass for representative current-session permission fingerprints. Module scan,
manual preparation, publication, and deployed acceptance are separate gates.
