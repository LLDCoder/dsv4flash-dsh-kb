# Admin Portal Reader First-Gate Results

Date: 2026-09-04

## Gate definition

This result covers the first Dashboard and Licensing list/overview feasibility
gate with representative accounts. It does not claim completion of every
permission fingerprint, list tab, filter, date range, or detail workflow.
Those capabilities remain in `TODO.md` and the probe tier of
`feasibility-test-plan.yaml`.

## Automated verification

- Backend tests: 276 passed.
- Python compile checks: passed for `backend/app` and `platform-gateway`.
- Git whitespace check: passed.
- Compose configuration using the authorized local Admin environment: valid.
- Local routes: Portal `/`, DSH audit `/dsh-audit/`, and Swagger `/swagger/`
  returned 200.
- Audit CSS and JavaScript were served as their correct content types with
  non-empty bodies and `no-store` caching.

## Live representative results

| Case | Representative | Result | Verified behavior |
| --- | --- | --- | --- |
| FEAS-DASH-001 | L2_L3 Licensing Officer | PASS | `/dashboard`, `My Tasks`, two visible rows matched the same-session baseline; bounded sample wording was explicit. |
| FEAS-DASH-005 | Dashboard-denied representative | PASS | Returned `no_permission` without Dashboard navigation in the earlier permission-negative run. |
| FEAS-DASH-002 | L1 Manager | BLOCKED | The supplied representative account was rejected by Portal authentication, so Manager attention data was not read or inferred. |
| FEAS-DASH-004 | L1 Manager | BLOCKED | Same authentication blocker; role and team scope were not guessed. |
| FEAS-APP-001 | L2_L3 Licensing Officer | PASS | `/licensing/applications`, `My Application Tasks`; first four visible records matched the baseline and the Actions column was excluded. |
| FEAS-PROFILE-001 | L2_L3 Licensing Officer | PASS | `/licensing/profile`, `My Profile Verification Tasks`; first four visible records matched the baseline and were described as a partial read. |
| FEAS-LICENSE-001 | L2_L3 Licensing Officer | PASS | `/licensing/licenses`, `Status overview`; Total, Active, Expire Soon, Expired, Cancelled, and Suspended counts matched the visible cards. |

The live checks confirmed `admin_portal_reader` routing, current-session
`GetUserInfo`, a pure read-only `observe` plan, bounded semantic observations,
and `completed_from_observation` results. No approval, rejection, export,
download, modification, or other Admin business write was dispatched.

## Evidence boundary

- No full HTML, full page, complete table, credential, cookie, or token value
  was passed to the response model.
- Visible hidden/error/loading states cannot establish data or an empty result.
- Credential-like values are redacted at both the platform gateway and backend
  public/audit boundary.
- List results are explicitly partial. Four returned rows are not presented as
  the complete result set.
- Data scope remains `unknown` when `GetUserInfo` does not explicitly confirm
  personal, team, or global scope.

## Remaining work

- Repair or replace the L1 Manager test login, then rerun Manager attention and
  Dashboard scope cases.
- Execute the remaining applicable permission fingerprints; the current result
  proves the representative core path, not the complete 18-account matrix.
- Add the deferred list tabs, compound filters, date ranges, pagination,
  list-to-detail continuity, detail tabs, and deeper module hierarchy probes.
- Improve manuals with exact filter control types, date semantics, detail
  fields, role differences, and verified empty/loading/error states.
- Scope column-header observation to the selected data table on future
  multi-table pages; row extraction is already scoped to the first visible data
  table.

## Conclusion

The generic knowledge plus `GetUserInfo` plus read-only Portal observation
architecture is feasible for the tested Dashboard and Licensing list/overview
paths. The first gate passes for those representative paths, with the Manager
cases explicitly blocked and deeper interactions deferred rather than treated
as completed.
