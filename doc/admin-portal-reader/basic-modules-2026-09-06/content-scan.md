# Content Core Page Scan

Stage: scoped browser evidence complete; this is not a knowledge manual and does
not establish complete Content module coverage.

## Scope and permission context

- Scan date: 2026-09-06.
- Permission representative: active role `CONTENT_MANAGER` (`Content Manager`),
  freshly confirmed through `GetUserInfo` before page work.
- Authorized included routes observed in `GetUserInfo`:
  `/content/ContentApplications`, `/content/Permits`,
  `/content/ContentLibrary`, `/content/ContentLibrary/Books`,
  `/content/ContentLibrary/Newspapers`, `/content/ContentLibrary/Cinema`,
  `/content/ContentLibrary/videoGames`, and
  `/content/ContentLibrary/RegulateEntry`.
- Included question families: core application/permit queues, stable list
  columns, common search/filter definitions, and structural metadata for the
  five named Content Library category lists.
- Deferred: all record details, Team Management, Reports and Analytics,
  documents, downloads, previews, publication content, complex filter
  combinations, and business mutations.

## My Application Tasks (`/content/ContentApplications`)

The actual pathname, empty route query, rendered title `My Application Tasks`,
and columns below were captured in one ready-page observation. `To Do` was
active with rows present and a ten-row bounded baseline at the visible page-size
state. No rows were copied.

Stable list columns: Application No.; Service Name; Service Category; Status;
SLA; AI Recommendation; Apply For; Submission Time; Actions.

Visible common criteria: Search, `All Services`, and `All Statuses`. Opening
`Filter` showed Last Updated Time plus Close, Cancel, and Apply. Cancel returned
to the list; a fresh post-animation observation confirmed no dialog remained.

The `Completed` tab was selected and visibly became active with the same route
and title, then `To Do` was restored. One ordinary Search was verified using a
visible Application No. held only in memory: the list narrowed to one matching
row after the input changed and the page settled, Reset cleared the criterion,
and the ten-row baseline was restored. No Enter key or search-icon click was
used, so the observed trigger is automatic input/change handling; the exact
debounce implementation is not claimed. The identifier itself was not logged
or retained.

### Application control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| Queue tabs | `To Do` / `Completed` | `documented_readonly` | Switching changed the active tab; `To Do` was restored. Rows were present in both observed states. |
| Common criteria | Search by visible Application No. | `documented_readonly` | Narrowed the list to one matching row without retaining the identifier. |
| Common criteria | Reset | `documented_readonly` | Cleared Search and restored the original bounded row count. |
| Common criteria | Service and status selectors | `out_of_scope_with_reason` | Stable defaults (`All Services`, `All Statuses`) were observed; variants were deferred. |
| Common criteria | Filter | `documented_readonly` | Opened the `Filter` surface with Last Updated Time. |
| Filter surface | Cancel | `documented_readonly` | Returned to the list; subsequent observation confirmed the dialog was absent. |
| Filter surface | Close | `out_of_scope_with_reason` | Visible equivalent dismissal affordance; not separately exercised. |
| Filter surface | Apply | `out_of_scope_with_reason` | No filter criteria combination was exercised. |
| List action | Export | `documented_forbidden` | Business-data export/download is prohibited; not clicked. |
| Repeated row action | More actions | `out_of_scope_with_reason` | Unknown mixed-action menu may expose mutations; not opened. |
| Pagination | Page-size selector and pagination affordances | `out_of_scope_with_reason` | Pagination variants were not exercised in this shallow pass. |
| Page chrome | Dashboard breadcrumb, language switch, role menu | `out_of_scope_with_reason` | Portal navigation/session controls are outside the declared question families. |

## Permits (`/content/Permits`)

The actual pathname, empty route query, rendered title `Permits`, and columns
below were captured in one ready-page observation. Rows were present with a
ten-row bounded visible baseline at `10 / page`; no rows were copied.

Stable list columns: Application No.; Permit No.; Permit Name; Title;
Author/Publishing House; Apply For; Status; Effective Date; Expiry Date;
Actions.

Visible criteria are inline: Search, Effective Start Date, Effective End Date,
and `All Statuses`. No queue tab, Filter button, Reset button, or filter dialog
was rendered in this state, so no modal open/cancel behavior is claimed.

### Permit control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| Common criteria | Search, effective date range, status selector | `out_of_scope_with_reason` | Stable inline criteria were observed; value-entry variants were deferred after the Applications search established ordinary search capability. |
| List action | Export | `documented_forbidden` | Business-data export/download is prohibited; not clicked. |
| Repeated row action | Download | `documented_forbidden` | Business-document download is prohibited; not clicked. |
| Repeated row action | Suspend | `documented_forbidden` | Mutates permit status; not clicked. |
| Pagination | Page-size selector, Previous, Next | `out_of_scope_with_reason` | Previous was disabled and Next enabled in the observed state; neither was clicked. |
| Page chrome | Dashboard breadcrumb, language switch, role menu | `out_of_scope_with_reason` | Portal navigation/session controls are outside the declared question families. |

## Content Library (`/content/ContentLibrary`)

The five granted child permission identifiers do not appear as independent
navigable list URLs in the verified UI path. They map to named tabs on the
actual parent route `/content/ContentLibrary`, whose rendered title is
`Content Library` and whose query was empty throughout the tab observations:

| Granted child permission | Actual active tab |
| --- | --- |
| `/content/ContentLibrary/Books` | Books |
| `/content/ContentLibrary/Newspapers` | Newspapers / Magazines |
| `/content/ContentLibrary/Cinema` | Movies |
| `/content/ContentLibrary/videoGames` | Video Games |
| `/content/ContentLibrary/RegulateEntry` | Regulate Entry Items |

Each tab below was selected once. The active tab, actual parent pathname,
rendered title, columns, criteria, and bounded row state were captured together.
Ten rows were visible at the `10 / page` state for each observation; no row
identifiers, publication titles, authors, or other content values were retained.
Observed statuses are bounded evidence from those rows, not an exhaustive list
of every valid business status.

### Books

Columns: ISBN; Book Title; Author Name; Language; Subject Category; Version No.;
Print Year; Status; Actions.

Criteria: Search, `All subject categories`, `All statuses`. Bounded observed
status: Approved. Repeated row action: Change Status.

### Newspapers / Magazines

Columns: Title; Type; Periodical Type; Subject Category; Language; Copies;
Status; Actions.

Criteria: Search, `All types`, `All statuses`. Bounded observed statuses:
Approved and Rejected. Repeated row action: Change Status.

### Movies

Columns: Title; Type; Language; Copyrights Type; Status; Actions.

Criteria: Search, `All types`, `All statuses`. Bounded observed status:
Approved. Repeated row action: Change Status.

### Video Games

Columns: Game Title; Category; Copyrights Type; Language; Status; Actions.

Criteria: Search, `All categories`, `All statuses`. Bounded observed status:
Approved. Repeated row action: Change Status.

### Regulate Entry Items

Columns: Title; HS Code; Material Type; Language; Number of Titles; Material
Status.

Criteria: Search, `All material types`, `All Statuses`; Filter and Reset were
also visible. Bounded observed material status: Approved. No row action was
observed in the sampled row, and this table has no Actions column.

### Content Library control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| Category tabs | Books, Newspapers / Magazines, Movies, Video Games, Regulate Entry Items | `documented_readonly` | Each selected tab became active on the parent route and displayed its corresponding table schema. |
| Category tab | Blocked Authors | `out_of_scope_with_reason` | Visible sibling tab is outside the five-category scope and was not clicked. |
| Common criteria | Search and category/type/status selectors | `out_of_scope_with_reason` | Stable tab-specific criteria were observed; value-entry variants were not exercised across the five structural list scans. |
| Regulate Entry criteria | Filter and Reset | `out_of_scope_with_reason` | Distinct visible controls were inventoried but not exercised; complex filter variants were deferred. |
| List action | Export | `documented_forbidden` | Visible across the category lists; business-data export/download is prohibited and was not clicked. |
| Repeated row action | Change Status | `documented_forbidden` | Visible in Books, Newspapers / Magazines, Movies, and Video Games; mutates business state and was not clicked. |
| Pagination | Page numbers, Previous/Next, jump control, page-size selector | `out_of_scope_with_reason` | Visible on the parent list surface; pagination variants were not exercised. |
| Page chrome | Dashboard breadcrumb, language switch, role menu | `out_of_scope_with_reason` | Portal navigation/session controls are outside the declared question families. |

### Child-route failure evidence

A direct visit to `/content/ContentLibrary/Cinema` reached that pathname but
rendered `Content Library Details` with `404` and `Page not found or
unavailable.` This is `load_failed`, not `no_data` or `no_permission`. The
working Movies list was reached through its tab on `/content/ContentLibrary`;
no direct child route is fabricated from that tab behavior. Other child URLs
are not claimed as independently navigable.

## Outcome

### Content Officer delta

Main Agent serially logged into the C3 representative after the manager scan
completed. Fresh `GetUserInfo` confirmed `CONTENT_OFFICER` / `Content Officer`.
Applications, application details, Permits, permit details, Content Library and
all five scoped child permissions were granted. Reports and Analytics was also
granted but remains deferred; Team Management was not in the returned tree.

Atomic actual-route/title/query/column observations confirmed:

- `/content/ContentApplications`, `My Application Tasks`, empty query: the same
  nine-column schema as the manager baseline, To Do / Completed, Search,
  Filter and Reset present.
- `/content/Permits`, `Permits`, empty query: the same ten-column schema as the
  manager baseline, inline Search and Effective Start/End Date, no queue tabs.
- `/content/ContentLibrary`, `Content Library`, empty query: Books active with
  the same nine-column Books schema. All five scoped category tabs and the
  deferred Blocked Authors tab were visible.

These are structural differences checks, not repeated control verification.
The other four library categories were not selected under C3. Equal list
schemas do not prove equal records, data scope, button permissions or ownership.

### Manager scan result

- My Application Tasks: `success` for atomic route/title/column capture, queue
  tab switching, filter opening/cancellation, and one Application No.
  search/reset cycle.
- Permits: `success` for atomic route/title/column capture and stable inline
  criteria; tabs and filter dialog were not present in the observed state.
- Content Library category lists: `success` for atomic parent-route/title,
  active-tab, columns, criteria, bounded status, and control inventory across
  all five in-scope tabs. Direct Cinema child URL: `load_failed` as documented
  above.
- No login/logout, account switch, business mutation, detail traversal, export,
  download, document access, preview, or publication-content inspection was
  performed.
