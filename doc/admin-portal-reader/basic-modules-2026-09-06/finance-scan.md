# Finance Core Page Scan

Stage: scoped browser evidence complete; this is not a knowledge manual and does
not establish complete Finance coverage.

## Scope and permission context

- Scan date: 2026-09-06.
- Permission representative: active role `FINANCE_OFFICER` (`Finance Officer`),
  freshly confirmed through `GetUserInfo` before page work.
- Authorized included routes observed in `GetUserInfo`:
  `/financial-payment/transactions` and `/financial-payment/refunds`.
- Granted but deferred routes: transaction detail, refund detail, and Finance
  Reports and Analytics.
- `/happiness/refunds` was also granted to this account but is outside this
  Finance scan and was not revisited.
- Included question families: Finance transaction/refund list fields, actual
  visible tabs and statuses, common search/filter definitions, and one
  business-identifier search/reset.
- Excluded interactions: settlement or other transaction mutation, refund
  approval/processing, sending, export/download, documents, details, and
  reports.

## Transactions (`/financial-payment/transactions`)

The actual path `/financial-payment/transactions`, empty route query, rendered
title `Transactions`, active `Payments` view, and columns below were captured
in one ready-page observation. Rows were present at the visible `10 / page`
state; no records, identifiers, amounts, or current metric counts were retained.

Columns: Transaction No.; Type; Apply For; Payment Method; Amount; Status;
Transaction Time.

Bounded observed Status labels: Failed and Completed. These are rendered list
statuses only; this evidence does not establish settlement, reconciliation, or
ledger finality.

Visible common criteria: Search, `All Types`, and `All Statuses`. Opening
`Filter` showed Payment Method and Transaction Time plus Close, Cancel, and
Apply. Cancel returned to the same route/title and the filter surface was
verified closed.

One ordinary Search was verified using a visible Transaction No. held only in
memory. The input change automatically narrowed the list to one matching row
after the page settled; no Enter key or search-icon click was used. Reset
cleared the criterion and restored the bounded baseline. The identifier itself
was not logged or retained.

Three count-bearing buttons were visible with stable labels Service
Application, Fines, and Refunds. Their current counts were masked during
inspection and are not retained. Their effects were not probed.

### Transaction control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| View tab | Payments | `out_of_scope_with_reason` | The single visible tab was already active; no alternate tab or state transition existed to verify. |
| Common criteria | Search by visible Transaction No. | `documented_readonly` | Automatic input handling narrowed to one matching row without retaining the identifier. |
| Common criteria | Reset | `documented_readonly` | Cleared Search and restored the bounded baseline. |
| Common criteria | Type and status selectors | `out_of_scope_with_reason` | Stable defaults (`All Types`, `All Statuses`) were observed; value variants were deferred. |
| Common criteria | Filter | `documented_readonly` | Opened the named filter surface with Payment Method and Transaction Time. |
| Filter surface | Cancel | `documented_readonly` | Closed the filter surface and preserved route/title. |
| Filter surface | Close | `out_of_scope_with_reason` | Visible equivalent dismissal affordance; not separately exercised. |
| Filter surface | Apply | `out_of_scope_with_reason` | No filter criteria combination was exercised. |
| Type summary buttons | Service Application, Fines, Refunds | `out_of_scope_with_reason` | Count-bearing filter/navigation effects were not probed; counts were not retained. |
| Sortable column | Transaction Time | `out_of_scope_with_reason` | Sort affordance was observed but not exercised. |
| List action | Export | `documented_forbidden` | Business-data export/download is prohibited; not clicked. |
| Pagination | Page-size selector and Previous/Next | `out_of_scope_with_reason` | Pagination variants were not exercised. |
| Page chrome | Language switch and role menu | `out_of_scope_with_reason` | Portal session controls are outside the declared question families. |

## Finance Refunds (`/financial-payment/refunds`)

The actual path `/financial-payment/refunds`, empty route query, rendered title
`Refunds`, and columns below were captured in one ready-page observation. No
tabs were rendered. Rows were present at the visible `10 / page` state; no
records, identifiers, amounts, or current metric counts were retained.

Columns: Application No.; Transaction No.; Type; Apply For; Payment Method;
Amount; Status; Last Updated; Actions.

Bounded observed Status labels: Refunded and Pending Refund. These are
Finance-refund list statuses only; they do not establish transaction settlement,
accounting finality, or the state of a Customer Happiness refund workflow.

Visible criteria are inline: Search, `All Statuses`, Start date, and End date.
No tab, Filter button, Reset button, filter dialog, or Export control was
rendered in this state, so none is claimed.

Two count-bearing summary affordances were visible with stable labels Wallet
Refund and Card Refund. Their current counts were masked and their effects were
not probed. Across the bounded visible rows, the sole row action function
observed was Refund; it was not clicked.

### Finance Refund control coverage

| Region | Control function | Classification | Verified effect or reason |
| --- | --- | --- | --- |
| Inline criteria | Search, status selector, Start date, End date | `out_of_scope_with_reason` | Stable controls were observed; value variants were deferred after Transactions established ordinary identifier-search behavior. |
| Summary affordances | Wallet Refund, Card Refund | `out_of_scope_with_reason` | Count-bearing filter/navigation effects were not probed; current counts were not retained. |
| Sortable column | Last Updated | `out_of_scope_with_reason` | Sort affordance was observed but not exercised. |
| Repeated row action | Refund | `documented_forbidden` | Initiates refund processing and mutates business state; not clicked. |
| Detail destinations | Finance refund detail | `out_of_scope_with_reason` | Granted deeper route is explicitly deferred; no visible row detail control was substituted or opened. |
| Pagination | Page-size selector and Previous/Next | `out_of_scope_with_reason` | Pagination variants were not exercised. |
| Page chrome | Language switch and role menu | `out_of_scope_with_reason` | Portal session controls are outside the declared question families. |

## Outcome

- Transactions: `success` for atomic route/title/query/view/column capture,
  stable criteria and statuses, filter opening/cancellation, and one
  Transaction No. automatic search/reset cycle.
- Finance Refunds: `success` for atomic route/title/query/column capture and
  stable criteria/status/control inventory. No tabs or modal filter controls
  were rendered in the observed state.
- Finance Refunds remains distinct from the Customer Happiness refund workflow
  and report aggregates; no cross-page equivalence or ledger finality is
  inferred.
- No login/logout, account switch, settlement/mutation, refund processing,
  export, download, document, detail, or report workflow was performed.
