# Admin Portal Reader Follow-up

This file records the second-stage improvements intentionally deferred until the
current Dashboard and Licensing end-to-end feasibility run is complete.

## Current validation gate

Run the existing first-release Reader against representative permission
fingerprints before expanding its interaction model. The current batch is a
feasibility gate, not proof that every filter and nested detail workflow is
already supported.

The batch may pass when:

- Dashboard and the current Licensing list/overview paths work end to end for the
  applicable representative accounts.
- `GetUserInfo` is revalidated for every account and the reported scope does not
  exceed the current session.
- Results distinguish `success`, `no_data`, `no_permission`, `load_failed`, and
  `not_confirmed` without inventing unavailable facts.
- Model-visible evidence remains bounded and no complete page or table is
  returned.
- No Admin business write, export, or download is attempted.
- Unsupported compound-filter or deeply nested workflows return
  `not_confirmed` and are recorded as follow-up gaps rather than forced through
  unsafe selectors.
- List-to-detail identity continuity, detail tabs, and advanced list tabs are
  second-stage probes and are not part of this first list/overview gate.

## Deferred interaction capabilities

- Model page hierarchy explicitly: module, child module, overview, list,
  filter dialog or drawer, row menu, detail page, detail tab, and expandable
  detail section.
- Add closed read-only actions for opening a filter surface, selecting an
  option, setting a date range, applying or resetting filters, sorting a
  column, opening a row menu, opening a detail, and switching detail tabs.
- Treat page limits as unique permitted routes rather than DOM, popup, or menu
  depth. Reassess the action budget for compound filters without weakening the
  route and duration bounds.
- Extend semantic observation to visible named buttons, comboboxes, date
  inputs, dialogs, drawers, active filter values, row links, row menus, and
  detail tabs. Do not depend on broad or guessed CSS selectors.
- Replace the current text-input-only filter execution with verified control
  handling for text, single-select, multi-select, and date-range widgets.
- Add a dedicated `open_detail` policy. Verify the selected list identifier,
  destination route, current permission, and detail identifier after
  navigation. Do not require `aria-expanded` for ordinary row links.
- Permit only explicitly classified read-only menu items. Continue blocking
  Approve, Reject, Request Modification, Send Back, Suspend, Reinstate,
  Export, Download, and unknown actions before dispatch.
- Register future modules' server-confirmed read endpoints in the generic tool
  network policy without reintroducing module-level Skills.
- Clear or replace the prior conversation's completion indicator immediately
  when a new Widget conversation starts. Test completion must remain tied to
  the new conversation's `turn.completed` event rather than stale UI text.
- Preserve and verify the active role, department, and page-level time-range
  context when the Reader opens its isolated browser context. A matching token
  and GetUserInfo fingerprint alone do not prove that the visible view matches
  the user's current tab.
- Add a bounded page-stability signal for dynamic overview counts. Record the
  observation time and active view context, and avoid comparing an isolated
  Reader observation with an unstamped UI baseline as if both were an atomic
  snapshot. The 2026-09-04 L2/L3 smoke run observed Service Application `16`
  in the Reader while the surrounding user browser showed `15` before and
  after the turn; list questions must not include that unrelated volatile card.

## Licensing manual v1.1

- Document all five Licensing child modules and identify which remain outside
  the first release.
- For every supported page, document the overview cards, list, filter surface,
  detail entry, detail tabs, and expandable sections.
- For every filter, record its visible label, control type, option source,
  allowed values, defaults, combination behavior, and role differences.
- Confirm date format, portal timezone, inclusive or exclusive boundaries,
  default range, Apply/Cancel/Reset behavior, and whether pagination preserves
  the active range.
- Record exact empty, loading, failed, and permission-denied states.
- Describe semantic control names and page behavior; do not place credentials,
  brittle CSS selectors, or account-specific data in the knowledge base.

## Detailed regression additions

- Relative date questions such as the last three portal-calendar days.
- Explicit inclusive ranges such as 2026-09-01 through 2026-09-03.
- Same-day, empty, invalid, and ambiguous date ranges.
- Type plus status, status plus date, Profile Type plus Last Updated, and
  License Status plus Effective Date combinations.
- Apply, cancel, reset, sort, and filter-preserving pagination behavior.
- List-to-detail identity continuity for Application No., Profile Application
  No., and License No.
- Detail tabs, related applications, rejection reasons, and permitted partner
  details where current-session permissions allow them.
- Same question across Officer, Manager, Supervisor, and global fingerprints,
  with page-specific scope derived from current evidence.
- Negative cases for direct detail URL access, missing details, load failures,
  forbidden write buttons, exports, downloads, and unknown overflow-menu
  actions.
- Make the regression grader require an explicit observed network method before
  awarding the read-only-network check; a missing method must not count as
  read-only evidence.
- Keep the grader's documented and asserted POST allowlist count synchronized
  with the four current server-owned read endpoints.

## Optimization trigger

Start these changes after the current feasibility batch has a reviewed result.
Use its failures and `not_confirmed` cases to prioritize the smallest required
manual and Reader changes, then rerun only the affected cases plus the core
read-only regression suite.
