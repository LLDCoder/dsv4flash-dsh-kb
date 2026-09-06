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
  Applications, Profile Verification, and Licenses.
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

## Deferred coverage

- Document and verify the Licensing Reports and Analytics child pages before
  adding them to the Reader coverage list.
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
- Complete or correct supported Licensing knowledge nodes separately using the
  minimal semantic fields defined in `module-contract.yaml`; this remains
  outside the Dashboard optimization.
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

Expand beyond Dashboard and the three supported Licensing child pages only
after the semantic-selection, interaction-boundary, and answer-presentation
regressions pass for representative current-session permission fingerprints.
