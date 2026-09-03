# UMC Admin Module Delivery Follow-ups

## Purpose

This is the working ledger for issues, incomplete regression coverage, and
environment preconditions found while delivering Admin Portal chatbot modules.
It records evidence and next checks rather than volatile test data, credentials,
record identifiers, or live counts.

## Shared Operational Findings

| ID | Finding | Required handling | Status |
| --- | --- | --- | --- |
| OPS-01 | On 2026-09-03, `18086` was initially unavailable and port `8001` served the Customer DSH stack rather than the Admin stack. The Admin compose launch procedure restored the expected Admin backend (`8001`), audit frontend (`18112`), Admin API (`5207`), and Portal entry point (`18086`). | Before each module delivery, verify all four listeners and assert the gateway is configured for `UMC_PORTAL=admin`; recover only the missing or incorrectly scoped runtime. | Adopted |
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
| Licensing | `/api/license/dashboard/overview` | `/api/license/dashboard/needs-attention` | Registered and E2E verified after binding scope and task-category enums as numeric values |
| Content | `/api/Content/Dashboard/Overview` | `/api/Content/Dashboard/TaskList` | Registered, but the Content Manager receives `Content.Dashboard.Section.Forbidden` for the source-defined manager overview request |
| Inspection | `/api/Inspection/Dashboard/Overview` | `/api/Inspection/Dashboard/TaskList` | Registered and Manager overview E2E verified |
| Customer Happiness | `/api/CustomerHappiness/Dashboard/Overview` | `/api/CustomerHappiness/Dashboard/TaskList` | Registered and Manager overview plus same-period blocked-list E2E verified |

### Proposed Cross-Module Capability

Use database-managed, department-specific Dashboard Skills for each endpoint
contract. They answer requests such as “my current task overview”, “what needs
my attention”, and a department's overall work status without a code-defined
business router.

- Select only Dashboard Tools for modules visible to the current authenticated
  user; never infer access from the question.
- Use the module-specific overview endpoint and, only when requested, its
  module-specific task-list endpoint for a drill-down.
- Return a per-module scope and time range. Keep unavailable modules and empty
  authorized modules distinct.
- Do not call export, assignment, approval, rejection, or any business-write
  operation.
- Start with a single-module answer when the user names a module. Cross-module
  aggregation remains deferred until every visible module for the same role
  returns compatible authorized read evidence.

This must be configured in the database and added to each relevant module's
contract/regression suite. It does not require a new hard-coded business Skill
or a Portal API change.

## Dashboard Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| DASH-01 | The Licensing Dashboard Tool originally passed display labels for scope and task category, while the Portal endpoint expects numeric enums. | Resolved: publish the numeric bindings in `admin_current_work_overview`; real Chatbot E2E now returns the authenticated overview. |
| DASH-03 | Content Manager has visible Dashboard UI state, but the source-defined `Content/Dashboard/Overview` request returns `Content.Dashboard.Section.Forbidden` directly with the same browser bearer token. | Keep Content out of cross-module aggregation; repair the Portal endpoint's permitted-section contract before enabling the dashboard Skill result. Do not copy UI values into Chatbot output. |
| DASH-02 | Broad module-level write-boundary aliases can incorrectly claim an unrelated operational action even while safely refusing it. | Current-work action requests now have a higher-priority, database-declared overview-specific boundary. Future boundary rules must include module context or a more specific intent before using generic action terms. |

## Role And Fixture Matrix

| Module | Actor aliases to test | Confirmed fixture state | Required next check |
| --- | --- | --- | --- |
| Licensing | Licensing Officer; Licensing Manager/Admin | Officer flow has live task fixtures. Licensing Manager sees Licensing and Customer Happiness; personal tasks are empty while team performance, task-state, overdue, and license-distribution summaries are populated. | Distinguish personal no-data from team aggregates during the deferred Dashboard phase. |
| Content | Content Staff; Content Manager/Admin | Staff task, dashboard, library, and knowledge flows have been exercised; Content Manager sees Content/Inspection/Customer Happiness and has live Content service-application, overdue-task, and team-performance dashboard fixtures. | Verify manager dashboard and attention-list permissions during the deferred Dashboard phase. |
| Inspection | Inspection Admin; Inspector Staff; Committee Staff | Admin and Inspector Staff have authorized, non-empty task fixtures; Committee Staff sees Inspection and Customer Happiness, with no current Inspection tasks but authorized Appeals data. | Complete the remaining declared analytics, hybrid, count, and no-data cases before final module sign-off. |
| Customer Happiness | Happiness Leader; Happiness Staff | Leader has live refund, appeal, team, and analytics fixtures; both Leader and Staff have authorized empty enquiry responses. | Complete hybrid/filter correction when a compatible non-empty enquiry fixture is available; defer Dashboard comparison. |

Account details stay only in the protected test-account source. Contracts and
regression files use role aliases, never credentials.

## Content Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| CNT-01 | The final E2E run covers task status lookup plus ordinal detail, a book lookup plus ordinal detail, dashboard overview, Arabic knowledge retrieval, and the write boundary. It does not complete the entire regression matrix. | Execute all cases in `doc/modules/content/regression.yaml` with trace assertions. |
| CNT-02 | Relative-date filtering initially fell back to general knowledge when the LLM router was unavailable; a selected-skill follow-up also lost bound filters when its intent was absent. | Resolved with a declared deterministic task route plus generic database-enum extraction. Protocol E2E confirms the first turn's normalized date window and the second turn's inherited window plus `Pending Modification` status binding. |
| CNT-11 | The Portal chat component can remain visually in “Processing” after DSH has persisted `assistant.message` and `turn.completed`; the independent protocol client receives both events. | Treat this as a Portal stream-rendering issue. It does not change DSH route or Tool correctness; fix separately in the Admin Portal frontend before using the widget as the sole regression transport. |
| CNT-03 | “How many need attention today?”, urgency drill-down, and 30-day SLA questions are specified but not finally accepted under a Content Manager identity. | Assert overview parameters, task-list parameters, returned scope, and role authorization. |
| CNT-04 | Books, Cinema, newspapers/magazines, and video games now pass list-to-ordinal-detail E2E using the single Content Library Skill's database-declared multi-source selection configuration. | Complete for the supported Content Library read paths. |
| CNT-05 | The hybrid task-detail plus external-approval guidance conversation is designed but not finally accepted. | Assert both the selected live task detail and cited Content knowledge evidence. |
| CNT-06 | Content knowledge currently scopes retrieval to the shared `/umc` collection. Source-title rules reduce cross-module answers but do not make the collection module-exclusive. | Add authoritative Content metadata or a dedicated folder when the knowledge corpus supports it, then rerun citation relevance checks. |
| CNT-07 | Four concurrent protocol conversations passed, but this was a correctness check, not a load test. | Keep load testing out of the current scope; revisit only when performance acceptance criteria are defined. |
| CNT-08 | During the Cinema list/detail E2E, the model inserted an unsolicited relative “Portal page” link although the read Tool evidence supplied no navigable URL. | Resolved with the generic response-safety check: only URLs present in Tool evidence may remain linked in a generated response. |
| CNT-09 | Content Team Management's token-scoped read-only task query is registered after a Content Manager browser verification. Team task lists are supported; no task-detail endpoint is registered. | Keep ordinal task-detail prompts refused until a read-only detail endpoint is discovered and verified. |
| CNT-10 | The Content permit report list is an aggregate by license category, not a list of individual permits; it exposes no permit identifier. | Do not add a synthetic permit-detail Tool. Revisit only if a supported individual-permit read endpoint is introduced. |

## Inspection Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| INS-01 | A staff query for a live personal task list fell back to general knowledge when the LLM router was unavailable. A knowledge answer must never substitute for live, authorized operational data. | A narrowly scoped, database-managed deterministic route for “my Inspection tasks” now locks the task reader and its existing read Tool. The real staff E2E list and ordinal-detail turns both produced successful Tool calls. |
| INS-02 | The current manager and staff E2E evidence covers task list/detail, violation list/detail, task counts, risk insights, team performance, knowledge guidance, and the write boundary. | Inspection Manager protocol E2E now also proves date inheritance plus High-priority correction (`PriorityId=2`); the current Todo response is an authorized empty fixture. Run remaining hybrid and authorized-no-data cases with trace assertions. |
| INS-03 | Risk insights, team performance, and task-count prompts previously depended on LLM intent selection and could fall back to general knowledge or a list Tool. | Resolved with database-declared deterministic routes and intents. Real Manager E2E now locks the appropriate reader, passes the requested date window where applicable, and invokes the registered read Tool. |
| INS-04 | A vague “What reporting guidance applies to this task?” follow-up had no selected task identifier and incorrectly re-ran the Todo list Tool. | The Task Skill now suppresses its list fallback when active, but a new conversation still routes the deictic prompt to general knowledge. Add a generic no-context reference boundary before calling this resolved. An explicit selected-task hybrid also needs generic multi-evidence orchestration so it can combine a detail Tool with cited knowledge evidence; do not present either source alone as a hybrid answer. |

## Customer Happiness Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| CH-01 | The Happiness Leader page initially displayed eight ticket rows, while a same-bearer browser GET and the Admin DSH Tool both returned a successful empty `/api/Enquiry/Management/List` result with identical default parameters. Browser instrumentation observed no live list XHR when filtering the displayed rows. | Treat the screen rows as non-authoritative local UI state until the Portal data-loading path is independently traced. The live endpoint's authorized empty result is a valid no-data fixture; do not make the Chatbot fabricate ticket rows. |
| CH-02 | Locked routing previously did not retain a prior date window for an explicit multi-turn same-period request. | Resolved generically for database-declared `date_range` filters. Happiness Leader E2E now maps “operational insights for last 30 days” then “team performance in the same period” to the team-performance Tool with inherited `startDate` and `endDate`. |
| CH-03 | The Portal Team Management read-only task query is registered with token scope and internal-ID masking. Team task lists are supported, but no task-detail endpoint is registered. | Keep selected task detail out of scope until a supported read-only detail endpoint is discovered and verified. |
| CH-04 | Real E2E evidence now covers Happiness Leader enquiry no-data, refunds and appeals list-to-detail, operational analytics with same-period follow-up, team summary/member, cited guidance, and the write boundary. Happiness Staff returns an authorized empty enquiry result and receives 403 from team summary/task-query endpoints. | Run hybrid enquiry-plus-guidance and explicit status/date-filter correction cases when compatible non-empty enquiry fixtures are available. |
| CH-05 | The Customer Happiness refund list-to-detail selection configuration used `id` and a string parameter type, while the registered schema exposes an integer `refundId`. | Resolved: Happiness Leader E2E now calls the refund-detail Tool with a stable integer `refundId` from the first list result. |
| CH-06 | Successful refund/member answers inserted “Portal page” links even when Tool evidence contained no navigable record URL. | Resolved generically: response safety now removes unverified Markdown and bare links while preserving URLs returned by Tool evidence; the rule is unit tested. |

## Finance Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| FIN-01 | Finance transactions were initially inferred as profile-bound because the OpenAPI schema contains an optional `ProfileId`, despite the Finance Admin Portal page supporting global view. | Resolved: declared the transaction Tool's profile scope as `not_applicable` in the registry. Finance Admin list and ordinal-detail E2E then completed with successful read Tool traces; the write boundary also refused without a Tool call. |
| FIN-02 | Finance aggregate statistics and payment-method/recharge breakdown Tools expose no date parameters in Swagger. | Do not promise a date-bounded aggregate. Use date-bounded transaction/refund lists where appropriate and register a date-filtered aggregate endpoint before adding that capability. |
| FIN-03 | A generic Global View prompt caused the model to refuse a successful token-scoped payment-method Tool result, even though no profile binding was required. | Resolved: profile selection remains gateway-enforced only for `bind_parameter` Tools. Finance Admin Global View payment-method E2E now returns the authorized current snapshot. |

## CMS Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| CMS-01 | News, Event, and Job read endpoints are frontend-owned and absent from the Admin Swagger document, so no generated Tool existed. | Resolved: nine manual, token-scoped, read-only Tool Registry entries plus `admin_cms_reader` now support list, count, and selected detail paths. CMS Staff real Chatbot E2E covers News list-to-third-detail and Event count. |
| CMS-02 | The protected `CMS Staff` account authenticates, but direct navigation to `/cms/NewsManagement` is permission-routed to Notifications. | The same authenticated bearer returns `200` for News, Event, and Job read endpoints, so the module is verified through authenticated API/Chatbot E2E. UI menu visibility remains a Portal permission issue, not a read-Tool blocker. |

## Communications Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| COM-01 | Message Templates and Broadcast reuse `/api/SignalR/GetTemplateList` and `/api/SignalR/GetTemplateById`; the list endpoint is `POST` and `type` selects the business domain. | Resolved: shared manual read Tools are token-scoped and require a declared type. Separate database Skills bind template type `1` and broadcast type `2`; IT Management E2E covers both list-to-third-detail paths. |
| COM-02 | A selected detail request needed fixed domain context in addition to the item identifier. | Resolved generically: selection requests merge database-declared static arguments with the selected value. The behavior is unit tested and prevents the shared endpoint from crossing template/broadcast type. |
| COM-03 | An inherited selection context could execute a detail Tool when a new explicit write request should be refused. | Resolved generically: a current locked route now outranks active selection context. Broadcast publish/export E2E selected the read-only boundary and produced no Tool call. |

## Service Configuration Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| SC-01 | The Service Configuration list Tool had no deterministic synonym for “service configurations”, so an unavailable LLM router fell back to knowledge despite an available live reader. | Resolved with a database-declared reader route; the staff E2E list applies the requested Top-N parameter and returns live Tool evidence. |
| SC-02 | The service-detail selection bound `Id` as a string although the registered Tool schema requires an integer. | Resolved in the database workflow; list-to-first-detail E2E now calls the detail Tool with an integer. |
| SC-03 | A specialized selected-service follow-up such as “its workflow configuration” could re-run the list Tool because the framework did not retain a previous explicit ordinal selection. | Resolved generically for declared selection Tool rules. E2E inherited the first selected service and invoked the workflow Tool with its integer serviceId. |
| SC-04 | A compound requested write, “configure and publish … service”, bypassed the short phrase boundary and fell back to knowledge. | Resolved with a database-declared action-plus-service boundary pattern. The E2E refusal invokes no Tool. |

## Service Categories Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| SCAT-01 | The Service Configuration Staff Portal page displays authorized category cards, but the registered category list Tool returns `502` for the same actor. | Routing, Top-N binding, and error handling were verified. Treat list/detail functionality as blocked by the upstream API until the Tool endpoint is restored; do not substitute page data. |

## Service Reports And Analytics Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| SRA-01 | A generic “service ranking” prompt did not recall the analytics Skill and fell back to knowledge even though a registered ranking Tool exists. | Resolved with a database-declared `service + ranking` route. The real E2E invokes the service-list Tool and carries the requested Top-N page size. |
| SRA-02 | An export request was safely refused but routed to Customer Happiness due to that module's broad export boundary. | Resolved with a higher-priority, module-specific Service Operations Analytics export boundary. The E2E refusal uses no Tool call. |

## Message Log Follow-ups

| ID | Gap or risk | Completion evidence |
| --- | --- | --- |
| MSG-01 | The Message Log list reader, limit binding, and read-only Tool are registered and reachable through DSH, but the upstream list endpoint returns `502`. | Treat list/detail cases as an upstream API blocker until the endpoint is restored. Do not substitute knowledge-base content for live delivery records. |

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
