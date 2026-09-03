# UMC Admin Module Delivery Follow-ups

## Purpose

This is the working ledger for issues, incomplete regression coverage, and
environment preconditions found while delivering Admin Portal chatbot modules.
It records evidence and next checks rather than volatile test data, credentials,
record identifiers, or live counts.

## Shared Operational Findings

| ID | Finding | Required handling | Status |
| --- | --- | --- | --- |
| OPS-01 | On 2026-09-03, the Admin DSH backend (`8001`), audit frontend (`18112`), and Admin API (`5207`) were listening while the Admin Portal Vite entry point (`18086`) was not. This establishes an unavailable local entry point, not a proven causal link to a module change. | Run the four-listener and proxy health check before and after each module delivery. Recover only the missing process. | Open |
| OPS-02 | Published Skill changes made through the DSH API invalidate the Skill catalog immediately. A direct database update can remain cached for up to 60 seconds. | Do not restart services for ordinary database-managed Skill or Tool changes. Publish through the API where possible; otherwise wait for cache expiry and verify routing. | Adopted |
| OPS-03 | Backend code, Admin API code, and Portal frontend each have different lifecycle requirements. | Rebuild/restart only the changed runtime: DSH backend for backend code, `5207` for Admin API code, and `18086` only when Vite is absent or requires recovery. Vite hot reload is expected for normal frontend edits. | Adopted |
| OPS-04 | A module test can appear to fail because the selected role has no suitable fixtures, rather than because routing or a Tool is broken. | Record actor alias, required fixture type, and no-data outcome for every E2E case. Treat an authorized empty result as a valid response, not an automatic product defect. | Adopted |

The exact recovery commands and public proxy checks remain in
[`LOCAL_ADMIN_STARTUP.md`](../LOCAL_ADMIN_STARTUP.md). The end-of-module
operational gate is:

1. Check listeners for `18086`, `8001`, `18112`, and `5207`.
2. Verify `/`, `/dsh-audit/`, and `/swagger` through `18086` when the Portal
   entry point is needed for UI E2E.
3. Run the module's protocol E2E cases first, then a small authenticated Portal
   smoke test.
4. Record whether an empty response was expected for the actor and fixture.

## Dashboard Model

The current implementation is not one shared endpoint for every department.
`GET /api/license/dashboard/overview` is the Licensing dashboard's merged
personal/team task overview. Other department dashboards use their own
read-only endpoints:

| Module | Overview endpoint | Drill-down endpoint | Registry status |
| --- | --- | --- | --- |
| Licensing | `/api/license/dashboard/overview` | `/api/license/dashboard/needs-attention` | Available |
| Content | `/api/Content/Dashboard/Overview` | `/api/Content/Dashboard/TaskList` | Available |
| Inspection | `/api/Inspection/Dashboard/Overview` | `/api/Inspection/Dashboard/TaskList` | Available |
| Customer Happiness | `/api/CustomerHappiness/Dashboard/Overview` | `/api/CustomerHappiness/Dashboard/TaskList` | Available |

### Proposed Cross-Module Capability

Add one database-managed, read-only `admin_current_work_overview` Skill after
the role/fixture checks are complete. It should answer requests such as “my
current task overview”, “what needs my attention”, and “overall work status”.

- Select only Dashboard Tools for modules visible to the current authenticated
  user; never infer access from the question.
- Use the module-specific overview endpoint and, only when requested, its
  module-specific task-list endpoint for a drill-down.
- Return a per-module scope and time range. Keep unavailable modules and empty
  authorized modules distinct.
- Do not call export, assignment, approval, rejection, or any business-write
  operation.
- Start with a single-module answer when the user names a module; use a bounded
  cross-module aggregation only for an explicit whole-work question.

This must be configured in the database and added to each relevant module's
contract/regression suite. It does not require a new hard-coded business Skill
or a Portal API change.

## Role And Fixture Matrix

| Module | Actor aliases to test | Confirmed fixture state | Required next check |
| --- | --- | --- | --- |
| Licensing | Licensing Officer; Licensing Manager/Admin | Officer flow has live task fixtures. Licensing Manager sees Licensing and Customer Happiness; personal tasks are empty while team performance, task-state, overdue, and license-distribution summaries are populated. | Distinguish personal no-data from team aggregates during the deferred Dashboard phase. |
| Content | Content Staff; Content Manager/Admin | Staff task, dashboard, library, and knowledge flows have been exercised; Content Manager sees Content/Inspection/Customer Happiness and has live Content service-application, overdue-task, and team-performance dashboard fixtures. | Verify manager dashboard and attention-list permissions during the deferred Dashboard phase. |
| Inspection | Inspection Admin; Inspector Staff; Committee Staff | Admin and Inspector Staff have authorized, non-empty task fixtures; Committee Staff sees Inspection and Customer Happiness, with no current Inspection tasks but authorized Appeals data. | Complete the remaining declared analytics, hybrid, count, and no-data cases before final module sign-off. |
| Customer Happiness | Role aliases still to be discovered from the protected source and Portal permissions | Not yet verified. | Identify roles with representative task and dashboard fixtures before implementation. |

Account details stay only in the protected test-account source. Contracts and
regression files use role aliases, never credentials.

## Content Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| CNT-01 | The final E2E run covers task status lookup plus ordinal detail, a book lookup plus ordinal detail, dashboard overview, Arabic knowledge retrieval, and the write boundary. It does not complete the entire regression matrix. | Execute all cases in `doc/modules/content/regression.yaml` with trace assertions. |
| CNT-02 | Relative-date filtering and a second-turn filter correction are specified but not yet finally accepted. | Verify normalized start/end dates and inherited status scope without fixed live counts. |
| CNT-03 | “How many need attention today?”, urgency drill-down, and 30-day SLA questions are specified but not finally accepted under a Content Manager identity. | Assert overview parameters, task-list parameters, returned scope, and role authorization. |
| CNT-04 | Books, Cinema, newspapers/magazines, and video games now pass list-to-ordinal-detail E2E using the single Content Library Skill's database-declared multi-source selection configuration. | Complete for the supported Content Library read paths. |
| CNT-05 | The hybrid task-detail plus external-approval guidance conversation is designed but not finally accepted. | Assert both the selected live task detail and cited Content knowledge evidence. |
| CNT-06 | Content knowledge currently scopes retrieval to the shared `/umc` collection. Source-title rules reduce cross-module answers but do not make the collection module-exclusive. | Add authoritative Content metadata or a dedicated folder when the knowledge corpus supports it, then rerun citation relevance checks. |
| CNT-07 | Four concurrent protocol conversations passed, but this was a correctness check, not a load test. | Keep load testing out of the current scope; revisit only when performance acceptance criteria are defined. |
| CNT-08 | During the Cinema list/detail E2E, the model inserted an unsolicited relative “Portal page” link although the read Tool evidence supplied no navigable URL. | Add an answer-level regression assertion that live-record responses do not invent links or citations; decide whether to enforce it in the response-safety layer after observing it in another module. |
| CNT-09 | Content Team Management summary and date-bounded members E2E paths passed with the Content Manager. Its live team-task fixtures still use a read-only endpoint that is not registered as a Tool. | Register the existing task query with full Tool ownership review before enabling task list/detail prompts. |
| CNT-10 | Content Permit analytics and date-bounded list E2E paths passed with the Content Manager. No registered permit-detail Tool exists. | Register a detail endpoint before enabling ordinal permit detail. |

## Inspection Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| INS-01 | A staff query for a live personal task list fell back to general knowledge when the LLM router was unavailable. A knowledge answer must never substitute for live, authorized operational data. | A narrowly scoped, database-managed deterministic route for “my Inspection tasks” now locks the task reader and its existing read Tool. The real staff E2E list and ordinal-detail turns both produced successful Tool calls. |
| INS-02 | The current manager and staff E2E evidence covers task list/detail, violation list/detail, operational analytics, knowledge guidance, and the write boundary, but not every declared regression case. | Run remaining status-count, risk, team-performance, hybrid, date/filter-correction, and authorized-no-data cases with trace assertions. |

## Customer Happiness Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| CH-01 | The Happiness Leader Portal page returns active enquiry/complaint rows, while the same authenticated DSH Tool call to `/api/Enquiry/Management/List` returns an authorized empty result. The Portal's `IsEnquiryComplete=false` and list defaults were mirrored in the Skill and the mismatch remains. | Compare the downstream identity/profile headers and service-side scope used by the Portal request versus the DSH platform gateway. Do not treat the empty Tool result as a valid no-data fixture until the scopes agree. |
| CH-02 | When the LLM router is unavailable, deterministic routing can protect a live analytics request from falling back to knowledge, but the current route directive does not extract relative-date filters into Tool parameters. | Add or restore a general, database-contract-driven relative-date parameter path, then assert `startDate` and `endDate` for each module's date-range regressions. |
| CH-03 | The Portal Team Management page has a read-only task query endpoint, but the Tool Registry has only team summary/member/metadata Tools. | Register the existing read endpoint through normal Tool ownership, including side-effect, profile-scope, response schema, and masking review. Then extend the team Skill and its multi-turn task-detail regression. |
| CH-04 | Real E2E evidence currently covers the portal role inventory, enquiry Tool invocation and mismatch, operational analytics Tool invocation, and the write boundary. | Run refund, appeal, team-summary/member, knowledge, hybrid, and Happiness Staff cases after CH-01 is resolved or explicitly classified. |

## Finance Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| FIN-01 | Finance transactions were initially inferred as profile-bound because the OpenAPI schema contains an optional `ProfileId`, despite the Finance Admin Portal page supporting global view. | Resolved: declared the transaction Tool's profile scope as `not_applicable` in the registry. Finance Admin list and ordinal-detail E2E then completed with successful read Tool traces; the write boundary also refused without a Tool call. |

## CMS Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| CMS-01 | The CMS frontend exposes read endpoints for News, Events, Jobs, and page configuration, but no corresponding read Tool is published in the Tool Registry. | Register the existing read operations through normal Tool ownership, including schema, side effect, RBAC, masking, and profile-scope review. Do not substitute Content Library tools. |
| CMS-02 | The protected `CMS Staff` account authenticates, but direct navigation to `/cms/NewsManagement` is permission-routed to Notifications. | Provide or authorize an account with CMS menu read access, then perform the intended role-aware Portal and Chatbot E2E suite. |

## System Management Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| SYS-01 | System Management user list-to-third-user-detail, role list-to-third-role-detail, and the read-only action boundary passed with the IT Management actor. The Portal was not mutated. | Complete for the tested paths. |
| SYS-02 | Security Log routing and the last-7-days parameter contract passed, but `admin.log.post-log-securitylogpage` consistently returns `502` from the Admin Portal API. | Treat as an external Tool/API blocker until the upstream endpoint is restored. |
| SYS-03 | Locked routes previously lost relative date and Top-N filters when the LLM router was unavailable. | Resolved with declared generic deterministic filters and intent rules; no business keywords were added to runtime code. |

## Module Delivery Rule For Tomorrow

For each next module, discovery starts with two short checks before Skill
authoring: (1) which role sees which module and dashboard, and (2) whether the
role has non-empty, safe read fixtures. The module contract then separates
live-record lookup, dashboard summary, knowledge guidance, hybrid questions,
multi-turn references, and prohibited writes. The regression suite must cover
both expected-data and authorized-no-data outcomes. For frequent, unambiguous
live-data prompts such as “my tasks”, it must also assert that router failure
does not turn the response into a knowledge-only answer.
