# Customer Happiness Core Page Scan

Search trigger clarification from the scanner's original Accounts probe: changing
the Search textbox value alone narrowed the list to the matching Account ID.
No Enter key or search-icon click was used. The observed behavior is automatic
updating after input; no exact debounce timing or implementation is asserted.

Stage: scoped browser evidence complete; this is not a knowledge manual and does
not establish complete Customer Happiness coverage.

## Scope and permission context

- Scan date: 2026-09-06.
- Permission representative: active role `HAPPINESS_CENTER_MANAGER`
  (`Happiness Center Manager`), freshly confirmed through `GetUserInfo` before
  page work.
- Authorized core routes observed in `GetUserInfo`:
  `/happiness/tickets`, `/happiness/refunds`, `/happiness/appeals`, and
  `/happiness/customerManagement`.
- Included question families: bounded list overview, stable columns, visible
  queue/status tabs, common search/filter definitions, and at most one necessary
  read-only detail transition where the control is unambiguous.
- Deferred: Team Management, Reports and Analytics, Communications, Settings,
  complex filter combinations, exports/downloads, documents, and business
  mutations.
- `To Do` is recorded only as the current authorized queue. No explicit
  assignee or department filter was observed on the Tickets list, so personal
  assignment and department ownership remain unknown.
- Refund list/workflow records are kept distinct from refund transactions and
  aggregate service metrics.

## Enquiries & Complaints (`/happiness/tickets`)

Rendered page title: `Enquiries & Complaints`. Observed baseline: `To Do`
active, no search text or date criteria, rows present. One representative row
was inspected for control functions; the table was not copied. The `Completed`
tab was selected and visibly became active, then `To Do` was restored.

Stable list columns: Ticket No.; Type; Application No.; Service Name;
Customer; Issue Category; Status; SLA; Current Handler; Submission Time;
Actions.

Visible common criteria: Search; Start Date; End Date. Opening `Filter` showed
Type, Priority, and Source criteria plus Close, Cancel, and Apply. Cancel was
selected and the filter surface closed without changing business data.

### Tickets control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| Queue tabs | `To Do` / `Completed` | `documented_readonly` | Switching changed the active tab; `To Do` was restored. Both states had rows during this observation. |
| Common criteria | Search, Start Date, End Date | `out_of_scope_with_reason` | Stable criteria were observed, but value-entry variants were deferred in this shallow scan. |
| Common criteria | Filter | `documented_readonly` | Opened a filter surface headed `Filter` with Type, Priority, and Source. |
| Filter surface | Cancel | `documented_readonly` | Closed the filter surface and returned to the unchanged list. |
| Filter surface | Close | `out_of_scope_with_reason` | Visible equivalent dismissal affordance; not separately exercised after Cancel established the safe return path. |
| Filter surface | Apply | `out_of_scope_with_reason` | Read-only query intent is plausible, but no criteria combination was exercised. |
| Common criteria | Reset | `out_of_scope_with_reason` | No active criteria existed, so reset behavior was not probed. |
| List actions | Export | `documented_forbidden` | Business-data export/download is prohibited; not clicked. |
| List actions | Add New | `documented_forbidden` | Creates business data; not clicked. |
| Repeated row actions | Message | `documented_forbidden` | Sending a business message is prohibited; sampled by function and not clicked. |
| Repeated row actions | Change Status | `documented_forbidden` | Mutates workflow state; sampled by function and not clicked. |
| Application No. cell | Application destination | `out_of_scope_with_reason` | Pointer styling was observed, but the deeper application destination is outside this shallow Customer Happiness scan and was not clicked. |
| Page chrome | Dashboard breadcrumb, language switch, role menu | `out_of_scope_with_reason` | Portal navigation/session controls are outside the declared page question families. |

## Refunds (`/happiness/refunds`)

Rendered page title: `Refunds`. Observed baseline: `To Do` active, no search
text, `All Categories`, `All Statuses`, rows present. One representative row
was inspected for control functions; the table was not copied. The `Completed`
tab was selected and visibly became active, then `To Do` was restored.

Stable list columns: Application No.; Refund Category; Reference No.; Apply
For; Amount; SLA; Current Handler; Status; Last Updated; Actions.

Opening `Filter` showed Current Handler and Last Updated criteria plus Close,
Cancel, and Apply. Cancel was selected and the filter surface closed without
changing business data.

### Refunds control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| Queue tabs | `To Do` / `Completed` | `documented_readonly` | Switching changed the active tab; `To Do` was restored. Both states had rows during this observation. |
| Common criteria | Search, category selector, status selector | `out_of_scope_with_reason` | Stable default criteria (`All Categories`, `All Statuses`) were observed; value-entry variants were deferred. |
| Common criteria | Filter | `documented_readonly` | Opened a filter surface headed `Filter` with Current Handler and Last Updated. |
| Filter surface | Cancel | `documented_readonly` | Closed the filter surface and returned to the unchanged list. |
| Filter surface | Close | `out_of_scope_with_reason` | Visible equivalent dismissal affordance; not separately exercised. |
| Filter surface | Apply | `out_of_scope_with_reason` | No filter criteria combination was exercised. |
| Common criteria | Reset | `out_of_scope_with_reason` | No active criteria existed, so reset behavior was not probed. |
| List actions | Export | `documented_forbidden` | Business-data export/download is prohibited; not clicked. |
| Repeated row actions | Message | `documented_forbidden` | Sending a business message is prohibited; sampled by function and not clicked. |
| Repeated row identifier | Application No. button | `out_of_scope_with_reason` | A single safe probe did not change the route; no detail effect is claimed (`not_confirmed`). |
| Pagination | Page-size selector and arrow controls | `out_of_scope_with_reason` | Visible pagination variants were not exercised in this shallow pass. |
| Page chrome | Dashboard breadcrumb, language switch, role menu | `out_of_scope_with_reason` | Portal navigation/session controls are outside the declared page question families. |

## Appeals (`/happiness/appeals`)

Rendered page title: `not_confirmed`. The authorized route and Appeals-specific
list columns were observed together during the initial scan, but a later direct
title verification was redirected to Customer Management. The route name is
therefore not substituted for visible heading evidence.

Observed baseline: `To Do` active, Search empty, `All Reasons`, `All Statuses`,
rows present. One representative row was inspected for control functions. The
`Completed` tab was selected and visibly became active, then `To Do` was
restored.

Stable list columns: Appeal No.; Appeal Reason; Violation No.; Apply For; SLA;
Current Handler; Status; Last Updated; Actions.

Opening `Filter` showed Current Handler and Last Updated criteria plus Close,
Cancel, and Apply. Cancel was selected and the filter surface closed without
changing business data.

### Appeals control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| Queue tabs | `To Do` / `Completed` | `documented_readonly` | Switching changed the active tab; `To Do` was restored. Rows were present in both observed states. |
| Common criteria | Search, reason selector, status selector | `out_of_scope_with_reason` | Stable defaults (`All Reasons`, `All Statuses`) were observed; value-entry variants were deferred. |
| Common criteria | Filter | `documented_readonly` | Opened a filter surface headed `Filter` with Current Handler and Last Updated. |
| Filter surface | Cancel | `documented_readonly` | Closed the filter surface and returned to the unchanged list. |
| Filter surface | Close | `out_of_scope_with_reason` | Visible equivalent dismissal affordance; not separately exercised. |
| Filter surface | Apply | `out_of_scope_with_reason` | No filter criteria combination was exercised. |
| Common criteria | Reset | `out_of_scope_with_reason` | No active criteria existed during the filter probe. |
| List actions | Export | `documented_forbidden` | Business-data export/download is prohibited; not clicked. |
| Repeated row identifiers | Appeal No. and Violation No. buttons | `out_of_scope_with_reason` | Deeper Appeal and Violation destinations were inventoried but not opened in this shallow scan. |
| Repeated row actions | Message | `documented_forbidden` | Sending a business message is prohibited; not clicked. |
| Repeated row actions | Change Status | `documented_forbidden` | Mutates workflow state; not clicked. |
| Pagination | Page-size selector and disabled arrow controls in the observed state | `out_of_scope_with_reason` | Pagination variants were not exercised. |
| Page chrome | Dashboard breadcrumb, language switch, role menu | `out_of_scope_with_reason` | Portal navigation/session controls are outside the declared page question families. |

## Customer Management (`/happiness/customerManagement`)

Rendered page title: `Customer Management`. The `Accounts` tab was initially
active with Search empty, `All Statuses`, Start Time and End Time visible. Ten
bounded rows were visible at the observed page-size state. No account values,
names, email addresses, mobile numbers, or identifiers are retained here.

Accounts columns (field labels only): Account ID; Full Name; Email; Mobile
Number; Login Method; Profiles; Status; Register Time; Actions.

The `Profiles` tab was selected and visibly became active, its distinct columns
were observed, and `Accounts` was restored. Profiles columns (field labels
only): Media File No.; Account ID; Profile Type; Profile Name; Account Holder;
Status; Submission updated; Actions. Rows were present, but none were copied.

Opening `Filter` on Accounts showed Login Methods plus Close, Cancel, and
Apply. Cancel was selected and the filter surface was verified closed.

One ordinary read-only search was verified on the Accounts list using a visible
Account ID held only in memory. The criterion was present, the list narrowed to
one matching row, Reset cleared the criterion, and the original bounded row
count was restored. The identifier itself was not logged or retained.

### Customer Management control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| Record-type tabs | `Accounts` / `Profiles` | `documented_readonly` | Switching changed the active tab and table schema; `Accounts` was restored. |
| Accounts common criteria | Search by a visible Account ID | `documented_readonly` | Narrowed to one matching row; no identifier is retained in this artifact. |
| Accounts common criteria | Reset | `documented_readonly` | Cleared the search and restored the original bounded row count. |
| Accounts common criteria | Status selector, Start Time, End Time | `out_of_scope_with_reason` | Stable fields were observed, but filter-value variants were deferred. |
| Accounts common criteria | Filter | `documented_readonly` | Opened a filter surface headed `Filter` with Login Methods. |
| Filter surface | Cancel | `documented_readonly` | Closed the filter surface and returned to the unchanged list. |
| Filter surface | Close | `out_of_scope_with_reason` | Visible equivalent dismissal affordance; not separately exercised. |
| Filter surface | Apply | `out_of_scope_with_reason` | No filter criteria combination was exercised. |
| List action | External SMS | `documented_forbidden` | Sends a business communication; not clicked. |
| List action | Export | `documented_forbidden` | Business-data export/download is prohibited; not clicked. |
| Repeated account action | Suspend | `documented_forbidden` | Mutates account status; not clicked. |
| Repeated account action | Send Email | `documented_forbidden` | Sends a business communication; not clicked. |
| Repeated account action | More actions | `out_of_scope_with_reason` | Unknown mixed-action menu; not opened because it may expose mutations. |
| Account/profile detail destinations | Row detail/profile affordances | `out_of_scope_with_reason` | Deeper customer destinations were inventoried and deferred; no personal detail was opened. |
| Pagination | Page-size selector and arrow controls | `out_of_scope_with_reason` | Pagination variants were not exercised in this shallow pass. |
| Page chrome | Dashboard breadcrumb, language switch, role menu | `out_of_scope_with_reason` | Portal navigation/session controls are outside the declared page question families. |

## Outcome

- Enquiries & Complaints core list: `success` for stable columns, queue tabs,
  filter opening, and filter cancellation.
- Refunds core list: `success` for stable columns, queue tabs, filter opening,
  and filter cancellation.
- Appeals core list: `success` for stable columns, queue tabs, filter opening,
  and filter cancellation; visible page title is `not_confirmed` because a
  later title check redirected to Customer Management.
- Customer Management: `success` for Accounts/Profiles schemas, tab switching,
  filter opening/cancellation, and one Account ID search/reset cycle, with field
  labels only retained.
- Refund detail: `not_confirmed`; the observed identifier-button probe did not
  navigate, and no alternate business-action control was substituted.
- No Department-labelled or Assignee-labelled filter was observed on these four
  list surfaces. Current Handler filters were observed for Refunds and Appeals;
  they do not by themselves establish personal assignment.
- No login/logout, account switch, business mutation, export, download,
  document access, or PII capture was performed for the evidence artifact.

## Main-Agent Permission and Layout Recheck

Account changes in this subsection were serialized by the main Agent after the
scanner stopped. Fresh GetUserInfo confirmed `Happiness Center Agent` (H2),
including all four core list routes, their listed detail permissions, and Reports
Analytics. Team Management was absent. Reports remain deferred, not denied.

- H2 Enquiries & Complaints: route `/happiness/tickets`, actual visible title
  `Enquiries & Complaints`, active workspace context `customer_happiness`.
  Columns were Ticket No.; Source; Type; Application No.; Service Name;
  Customer; Priority; SLA; Current Handler; Status; Last Updated; Actions.
  To Do/Completed and Search/Start Date/End Date were visible. Value-entry and
  filter-panel interactions were not repeated under H2.
- H2 Refunds: route/title matched, columns matched the H1 Refunds baseline,
  To Do/Completed were visible. No claim of equal row sets or data scope.
- H2 Appeals: route `/happiness/appeals` and Appeal No./Appeal Reason/Violation
  No./Apply For/SLA/Current Handler/Status/Last Updated/Actions columns were
  confirmed together, with To Do/Completed. Subsequent navigation again did
  not reliably establish the Appeals visible page title. Retain the title and
  direct-navigation limitation rather than invent a heading.
- H2 Customer Management: route/title matched, Accounts/Profiles tabs and the
  Accounts columns matched H1. H2 Profiles schema and query effects were not
  re-exercised.

The main Agent then re-authenticated H1 and rechecked GetUserInfo plus the
actual Enquiries & Complaints route, title, and columns. H1 again showed
Issue Category and Submission Time, without H2's Source/Priority/Last Updated
combination. Both observed layouts are valid evidence, but this alone does not
prove the role is the sole cause: active workspace and navigation state must
also be verified. Manuals must describe the two observed layouts separately,
not union them into a universal schema or interchange their date fields.

This recheck captured field labels and role names only. It did not open
documents, personal details, or business-action dialogs. Original H1 scan
claims above apply to that scanner run; the main Agent owns these subsequent
account changes.
