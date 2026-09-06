# Business Pilot Review

## CH02 Initial Run

Main-agent grading of `h1-initial.jsonl`, compared with the independently
captured bounded native baseline in `baseline.jsonl`.

| Step | Score | Business finding | Classification |
| --- | --- | --- | --- |
| CH02.1 | 0/2 | Native To Do has records; the answer returned none and only said it could not confirm. | Reader operation/evidence failure |
| CH02.2 | 0/2 | Native Completed has records, including Cancelled and Completed statuses; the answer incorrectly described No Data without establishing the requested queue. | Reader operation, state selection, and answer failure |
| CH02.3 | 0/2 | The answer distinguished a row field from a view but asserted an unsupported transition to Completed when status becomes completed. The Reader itself rejected the explanation as ungrounded. | Knowledge-grounding and final-answer failure; root cause under investigation |

All three turns completed technically. None passed business acceptance.
Do not substitute technical completion or conservative wording for the
available business result. Initial score: 0/6 points, 0/3 passed steps.

The H1 identity, role, and route permission were freshly verified. Native
requests included `GET /api/Enquiry/Management/TeamTask/List` (200).
The local audit for `conv_993e72c7c1934c44ae40` shows unhealthy reads in
steps 1 and 2, with blocked page dependencies recorded as uncertain paths.
The blocked set includes enquiry user-info, type, status, and queue metadata
requests; some background notification requests are also present. Dependency
verification must distinguish these before changing the read-only allowlist.

Step 3 retrieved the Customer Happiness v1 source but ended at
`knowledge_grounding_repair` with `knowledge_not_grounded`. The final prose
must not replace this lack of verified facts with assumed business rules.
This does not yet establish a missing or incorrect manual.

## Expansion Gate

Paused after CH02. A C1 native baseline was briefly opened before the pause
reached the executor; no CT04 Reader turn was submitted. H1 was restored and
verified. CT04, IN02, FN02, the full 60-step corpus, and Dashboard/Licensing
samples remain unexecuted. Corrected runs must use new conversations and
separate output files, retaining the initial failure evidence.

## CH02 Correction 01

Main-agent grading of `h1-correction-01.jsonl`, conversation
`conv_02f75e8937c74864bb23`:

| Step | Score | Business finding |
| --- | --- | --- |
| CH02.1 | 1/2 | Seven bounded To Do records and their statuses now match the native queue. However, the formatter relabeled fields, including SLA as Age and Current Handler as Owner, and added unnecessary collection narration. This is partial completion, not a pass. |
| CH02.2 | 0/2 | The gateway switched to Completed and returned a post-action observation, but the Reader only reduced initial observations when the requested action was observe. It discarded this available evidence and returned missing fields. |
| CH02.3 | 0/2 | The production turn still returned knowledge_not_grounded. The answer guard correctly prevented the earlier unsupported lifecycle explanation, but inability to answer an available documented distinction is still a business failure. |

Correction 01: 1/6 points, 0/3 passed steps. No timeout or runtime error.
The remaining read-health uncertainty consists only of blocked notification
paths; independently loaded rows were retained. Empty-result behavior with
these background requests remains a separate verification item.

A subsequent current-runtime diagnostic replay of step 3 returned the two
exact relevant sentences and passed the checker. This is not a correction of
the production score: the earlier production audit did not retain the actual
repair facts/status. Correction 02 adds bounded failure diagnostics to close
that evidence gap.

## Correction 02 Changes

Initial state-changing reads with no direct facts now reduce their returned
observation through the existing semantic validation path. They no longer
require an extra observe action merely to consume evidence already returned.
The regression verifies this takes one portal call and preserves Completed.

List planning now requests original header/value pairs and minimum necessary
identity fields. Final formatting must not invent column labels from positional
strings or change field meaning. These changes are generic; no field-name or
business-page mapping was added to runtime code.

Full backend suite: 554 passed. Backend health and local database target were
verified again. The existing gateway image is unchanged from Correction 01.

| Component | SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | 9f8354a1cfc41363f5a34171802fdb338c813a262005ae9f8b7a2612205212ca |
| backend/app/llm.py | 42339a99c736c65ec096df5ffe5aac29b568d50d51c3b39d8d34f9a5b6f72c63 |
| backend/app/service.py | bd5b96d0fb97f538f49053ebaeb41d97aea5aa9bb38696f2a0b3472feaa3f0dc |

## CH02 Correction 02

Main-agent grading of `h1-correction-02.jsonl`, conversation
`conv_9051396bfb784b67adec`. The executor refreshed the native comparison at
2026-09-07 00:02:08 +04:00. The batch directory retains its original date.

| Step | Score | Business finding |
| --- | --- | --- |
| CH02.1 | 0/2 | The table and its stable node ID were returned, but the Reader discarded headingless semantic nodes. Labeled facts then failed against the flattened fallback observation despite available rows. |
| CH02.2 | 1/2 | The requested Completed view was read and one matching record/status returned. However, the result mislabeled a bounded subset complete and guessed column boundaries from multiword cell text. The native view also contains Cancelled records. |
| CH02.3 | 2/2 | The production knowledge-only answer correctly distinguishes queue views from per-record Status and does not assert an unsupported lifecycle. |

Correction 02: 3/6 points, 1/3 passed steps. The group still fails; do not mix
passing steps from different versions into a synthetic passing conversation.

## Correction 03 Changes

The gateway now returns optional bounded `rowFields` maps from native visible
header/cell positions: up to four rows, twelve fields per row, and 300
characters per value. Ambiguous spans, mismatched counts, hidden cells, empty
or duplicate headers do not produce guessed mappings. Action and sensitive
columns are excluded. Legacy row summaries remain for older consumers.

The Reader retains headingless nodes with a valid identity and semantic kind.
For list facts from `rowFields`, JSON-object strings retain the existing closed
facts schema while allowing structured parsing and exact same-row field/value
validation. Cross-column splitting, cross-row joins, duplicate JSON keys, and
unverified values are rejected. Both evidence projections retain the additional
cell level without widening row, string, or sensitive-data limits. List results
from bounded observations cannot assert completeness.

The two exact background notification requests remain blocked but no longer
make an otherwise loaded page unhealthy. Unrecognized/suffix paths remain
blocked and uncertain. No notification operation was performed by the Reader.

Full backend suite: 567 passed. Local target and both health endpoints passed;
the local Admin gateway was rebuilt without restarting dependencies.

| Component | SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | d0e219079d126838cb4fc3145b1f0cee210dec98692d96011d17d935cdd05e08 |
| backend/app/llm.py | c659b3eeb0a15f0b2dd0b4dda94af823553891b9ee0d72cef36cce366dc55e25 |
| backend/app/service.py | bd5b96d0fb97f538f49053ebaeb41d97aea5aa9bb38696f2a0b3472feaa3f0dc |
| backend/app/tool_gateway.py | 7d42cf4d1db2ffa3a3923ba85dc852a3240cc344e183dfd265a5666fa462b89f |
| platform-gateway/app.py | 0c76faf14f01b9b5c43000f5422e33bb53e4c8aee8deb041c20570cf6fb8f52e |

## CH02 Correction 03

Main-agent grading of `h1-correction-03.jsonl`, conversation
`conv_0e6f6152b09f46da9dac`:

| Step | Score | Business finding |
| --- | --- | --- |
| CH02.1 | 2/2 | Four correctly identified To Do records, original field labels, actual statuses, and an explicit bounded-list limitation. Native row comparison matches and readHealth is healthy. |
| CH02.2 | 0/2 | No portal execution occurred. The initial plan combined switch_tab with a trailing pure observe; the correction returned the wrong closed mode. Actual Completed records remain available. |
| CH02.3 | 2/2 | Grounded knowledge-only explanation passes again without an unsupported status/queue equivalence. |

Correction 03: 4/6 points, 2/3 passed steps. The group is still not passed.
The raw audit quality trace establishes the actual invalid combination;
diagnosis does not depend on a later planner replay.

Correction 04 will remove only a redundant trailing pure observe after an
already policy-validated state-changing read, because the gateway already
returns that post-action observation. Other mixed plans and unsafe metadata
remain rejected. Review also identified the need to validate claimed tab state
against actual node/parent state and to reject labeled field guesses when
native cell binding is unavailable. These are shared Reader checks, not
module-specific routing changes.

Correction 04 deployment: 578 backend tests passed, all affected files match
their running containers, both health endpoints passed, and the local Admin
database target was reverified. The inherited missing selected-state check was
a pre-existing dirty-worktree difference from Git HEAD, not a deletion by the
new cell-binding patch. It is now repaired without reverting unrelated work.

Changed hashes relative to Correction 03:

| Component | SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | 0b2f7db290c689e1124479d293b49814122ae7e813fc3e466d79e1b467eef815 |
| platform-gateway/app.py | 32052051f5287cb08a05bac08fd5bea7bde292faf0fb3a94fddb8ac41868ae03 |

## CH02 Correction 04

Main-agent grading of `h1-correction-04.jsonl`, conversation
`conv_b54551216bdc4c93bf41`:

| Step | Score | Business finding |
| --- | --- | --- |
| CH02.1 | 2/2 | Four minimal, correctly bound record identity/type/status facts from To Do; bounded scope and actual selected state are preserved. |
| CH02.2 | 1/2 | Completed is actually selected and loaded, but the Reader returns only the two Status=Completed rows and omits both Cancelled rows from the same view. This is an unjustified semantic filter, not a tab operation failure. Native cell bindings now match. |
| CH02.3 | 0/2 | The knowledge grounding repair accepts a retrieval-envelope/chunk prefix as its sole fact. The final answer says documentation is insufficient despite the retrieved manual containing the queue-versus-status distinction. |

Correction 04: 3/6 points, 1/3 passed steps. All three technical statuses are
`success`, but the conversation still fails business acceptance. No passing
steps are combined across versions. CT04, IN02, FN02, the full 60-step corpus,
and Dashboard/Licensing samples remain unexecuted.

The next correction targets generic evidence handling: strip the verified
retrieval envelope before planning/grounding, reject metadata as business facts,
and request one bounded semantic review when a selected view's native row
sample is narrowed. Explicit user predicates and limits remain valid; the code
must not automatically expand a filtered selection or encode queue semantics.

## Correction 05 Deployment

The complete verified `markdown-v2` retrieval envelope is now removed before
body truncation, with source provenance retained independently. Knowledge
grounding rejects metadata, Markdown headings, and structural field prefixes;
supported business sentences and paraphrases remain valid.

Selected-view list subsets receive at most one extra semantic review within
the original deadline. Native list facts must uniquely bind to a single row.
The review does not automatically fill omitted rows and is not a deterministic
natural-language filter validator; final business grading remains mandatory.

593 backend tests and 13 runner/report tests passed. The backend health and
local Admin database target were rechecked. The bind-mounted backend is updated;
the gateway image remains Correction 04. CH02 is rerun as one fresh conversation.

| Component | SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | 44a610b2bc84a404ec435bea290c0f889e5c2bc56f204849c2a51a7a96ec6e4c |
| backend/app/llm.py | 6d21eb41fe12a21945f8358062cf80489ca288db88a687ef7162045bd40e2def |

## CH02 Correction 05

Main-agent grading of `h1-correction-05.jsonl`, conversation
`conv_456ea45c367e4920ad8a`:

| Step | Score | Business finding |
| --- | --- | --- |
| CH02.1 | 1/2 | Four valid To Do identities and statuses are returned, with a bounded qualifier. The answer unnecessarily expands every row into customer, handler, service, SLA and time fields instead of keeping the requested identity/status result concise. Four additional unbound candidate facts were correctly rejected. |
| CH02.2 | 0/2 | The Completed read fails with `reader_selector_not_found`; the plan scopes the tab to a semantic section name. Native Completed rows remain available. The new subset-review path is not reached, so this run does not validate that repair live. |
| CH02.3 | 0/2 | The reply is only inability to confirm, with `knowledge_not_grounded`. Removing the retrieval wrapper prevents the previous metadata acceptance but has not established a passing knowledge answer. |

Correction 05: 1/6 points, 0/3 fully passed steps. No timeout occurred. Before
submission, the native browser session expired and was restored once to H1;
fresh GetUserInfo reconfirmed identity, role and permissions. The authentication
incident is separate from the submitted Reader failures.

Keep Correction 05 frozen while running CT04, IN02 and FN02 serially. These
representative probes are needed to distinguish cross-module failures before
another implementation batch. The full corpus remains gated, not abandoned or
silently marked passed.

Read-only diagnosis of Correction 05 knowledge evidence (audit 25467) found
that one repaired fact combines two supported source sentences using a
semicolon. Both clauses independently match the same retrieved chunk, but the
whole-fact/single-unit check rejects the combination. This is a grounding
false negative plus noncompliance with the repair sentence-format instruction,
not a missing manual or retrieval miss. A future clause-aware check must require
support for every clause within one source chunk; accepting one overlapping
clause as support for a whole composite assertion is unsafe.

## CT04 Pilot 01 (Correction 05 Code)

Main-agent grading of `c1-pilot-01.jsonl`, conversation
`conv_b2f36ec82dda4f69b133`. Fresh C1 GetUserInfo confirms Content Manager.
The native Books/Movies baseline has six/ten rows respectively; each comparison
retains only four samples, and these counts are not manual content.

| Step | Score | Business finding |
| --- | --- | --- |
| CT04.1 | 0/2 | No books are answered although native rows exist. Reader Books requests `/api/ContentLibrary/GetBooksCount` and `/api/ContentLibrary/GetBookList` are blocked. The unhealthy empty table is correctly prevented from becoming `no_data`, but the eventual `invalid_follow_up_plan` obscures the underlying dependency gap. |
| CT04.2 | 0/2 | No movies are answered; the Reader reports `observation_page_not_confirmed`. Exact failed-route diagnosis is pending scoped audit review. |
| CT04.3 | 0/2 | No comparison is answered. Books remains an unhealthy empty observation, and the planner returns `knowledge_only` after observation, violating the closed post-observe mode. |

CT04 Pilot 01: 0/6 points, 0/3 passed steps. No timeout occurred. Current
permission is not the blocker. Verify each missing dependency's actual method
and read-only behavior before any exact allowlist addition; do not open an API
prefix or infer a method from its endpoint name.

The scoped audit later confirms CT04.2 actually read
`/content/ContentLibrary/Cinema` and received the 404 page. The external v1
manual explicitly documents the parent-page Movies tab as the verified list
entry and distinguishes the child permission identifier from that entry. The
failing audit does not retain the retrieved chunks or filenames, so the exact
retrieval contribution to this navigation error remains unconfirmed. Record
source provenance in failure traces as well as successful outcomes.

## IN02 Pilot 01 (Correction 05 Code)

Main-agent grading of `i1-pilot-01.jsonl`, conversation
`conv_0a9000b048a04590a9c8`. Fresh I1 GetUserInfo and the populated manager Team
Tasks layout satisfy this group's prerequisite. Both native Team views have
ten visible rows; only bounded four-row comparisons are retained.

| Step | Score | Business finding |
| --- | --- | --- |
| IN02.1 | 0/2 | No team tasks are returned. Twelve observed inspection lookup/list/team dependencies are blocked, although native To Do has records. The resulting empty table cannot prove `no_data`. |
| IN02.2 | 0/2 | The Completed read fails with `reader_selector_not_found`; actions again scope tab locators using semantic names (`Inspection Tasks`, `Team Tasks`). Native Completed records exist. |
| IN02.3 | 0/2 | Technical knowledge-only `success` mixes an Inspector To Do statement with a manager Team Completed statement. The question concerns the manager's Team Tasks, whose native To Do has Assigned Time. Correctly distinguishing the two time labels does not excuse the wrong role/view context. |

IN02 Pilot 01: 0/6 points, 0/3 passed steps. The v1 manual explicitly separates
manager Team Tasks To Do/Completed from Inspector primary To Do/Completed.
This is not a missing role prerequisite. The answer must retain the current
manager/team condition when selecting and qualifying retrieved statements.

## FN02 Pilot 01 (Correction 05 Code)

Main-agent grading of `f1-pilot-01.jsonl`, conversation
`conv_13fa84fd767d4001a0e7`. Fresh F1 GetUserInfo confirms Finance Officer and
Transactions permission. Native Search narrows a confirmed Transaction No. to
one row and Reset restores the bounded baseline.

| Step | Score | Business finding |
| --- | --- | --- |
| FN02.1 | 0/2 | No transaction identity is returned despite native rows. The transaction list, three lookup endpoints and two statistics endpoints are blocked. Unhealthy emptiness is correctly not reported as no_data. |
| FN02.2 | 0/2 | No matching transaction is answered. The preceding Reader step never established an identity, and the list dependencies remain blocked. This does not verify the Reader search interaction. |
| FN02.3 | 0/2 | A nameless reset_filter/button plan fails with tool_error; it does not demonstrate clearing the search or restoring the list. Native Reset success is not Reader success. |

FN02 Pilot 01: 0/6 points, 0/3 passed steps. All four representative groups are
now submitted under Correction 05, but none is fully passed; the full question
set remains gated. The browser was restored to fresh H1/To Do after all serial
account work.

## Correction 06 Deployment

Missing dependencies were checked against actual scoped native/Reader network
observations and the local Admin Swagger schema. The gateway adds 23 exact GET
paths across the tested Content, Inspection and Finance surfaces, plus one
exact Inspection team-task query POST. There are now 72 allowed GET paths and
six POST paths. The query POST schema contains pagination, sorting, view and
filter fields. The creation POST sharing `/api/admin/inspection/tasks` remains
blocked, as do every unlisted suffix and export route. No API prefix, business
page routing, module Tool or runtime Skill was added.

Tab clicks require exactly one visible semantic match; hidden duplicates do
not count and multiple visible matches fail before clicking. No missing-region
fallback broadens a selector. Planning now distinguishes accessible region
names from manual chapter names, permission identifiers from verified entries,
and role/view applicability from merely similar field labels. These semantic
prompt changes still require real business verification.

Knowledge grounding now requires every strong clause of a compound fact to be
supported within the same chunk. Negation, missing or contradictory numbers,
and decimal values have focused regressions. Exact sentences and supported
paraphrases remain accepted. Early-failure traces and the question runner retain
bounded source filenames, not arbitrary trace payloads or source-body copies.

656 backend tests and 14 runner/report tests passed. Local database target and
both health endpoints passed; only the local gateway was rebuilt/recreated.
All affected code hashes match the running containers. Four fresh, complete
representative conversations are now being rerun serially against this frozen
version; previous failed evidence is retained.

| Component | SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | c9c3b597fb640298eecfb993e41f5b233ad347b242858b4b88999ddff488b130 |
| backend/app/llm.py | 740b3331c4703f54874242d8dfec60675511eb12508e9f093e94776d34f81be7 |
| platform-gateway/app.py | 08376d445f49638b5506d60bdb60ed8c16b1397786cbb62063637d19a21ed7d9 |
| scripts/run_reader_question_review.mjs | b7523e0cb81871546ed57a9d8568fac486bddab4a12043bbdd89a7d606f78a39 |

## Correction 06 Business Review (7 September)

The frozen four-group retest is complete. Main-agent scores below compare the
actual answers with bounded native evidence and the documented current role
and view, not with the Reader's technical success flag. No group passes.

| Group and raw evidence | Step scores | Outcome |
| --- | --- | --- |
| CH02, `h1-correction-06.jsonl`, `conv_535f325fbd8e42a0b659` | 0, 0, 2 | Queue/status explanation passes; both live lists fail. |
| CT04, `c1-correction-01.jsonl`, `conv_96326f452c314062ae79` | 0, 0, 0 | Neither list nor the category-field comparison is answered. |
| IN02, `i1-correction-01.jsonl`, `conv_1915cc355b944d25a886` | 0, 0, 0 | Team lists fail; explanation uses the wrong role/view. |
| FN02, `f1-correction-01.jsonl`, `conv_b14b522b9cc74cb4b866` | 0, N/A, N/A | No identity established; dependent search/reset cannot be accepted. |

There is one fully passed step among ten gradeable steps, two dependent steps
are N/A, and zero of four complete groups pass. This is not an estimate of
the unexecuted 20-group/60-step corpus. Refreshed Dashboard/Licensing samples
also remain unexecuted. Do not combine passing steps from different versions.

### Evidence and Root Causes

- CH02.1 has a healthy populated To Do observation. Scoped audit 25588 shows
  valid JSON row facts pointing to `observation-region-002`, an omitted parent
  referenced by the actual `observation-table-001`. Changing only the source
  reference to the emitted table makes the plan validate in a read-only replay.
  This is a generic evidence-reference failure, not missing rows or permissions.
- CH02.2 successfully reaches the populated Completed tab. Audit 25600 points
  at the correct table, but facts are plain label/value text rather than JSON
  objects and strict row validation rejects them. The candidate also omits
  Cancelled rows in the Completed queue; valid serialization alone would not
  establish business correctness. Do not loosen parsing around commas/colons.
- CH02.3 correctly distinguishes row Status from the To Do/Completed queue
  tabs, using the v1 manual. Its answer passes. The structured `scope=global`
  is not independently established and must not authorize broader data reads.
- CT04.1 times out during the Books read. CT04.2 returns
  `observation_page_not_confirmed`; the exact failing destination in this
  version is not established by the bounded record. Do not borrow the prior
  version's Cinema 404 diagnosis as proof for this run. CT04.3 has healthy,
  populated Books evidence but stops without reading Movies or comparing
  supported fields. Recovery and completion remain generic Reader gaps.
- IN02.1 reads Dashboard category/attention evidence without completing a
  qualifying Team To Do list. Rejecting that substitute is correct, but failing
  to obtain the available team result is not a pass. IN02.2 times out after a
  plan for `/inspection/tasks`, Team Tasks, Completed. IN02.3 technically
  succeeds but describes Assigned Time as specific to Inspector Tasks To Do;
  the current manager's Team Tasks To Do also has Assigned Time. The manual
  separates these views. Text grounding does not prove role applicability.
- FN02.1 returns `observation_result` before any observation, with no identity
  or usable result. FN02.2 then encounters a navigation timeout; FN02.3 emits a
  nameless `reset_filter` button action and gets `tool_error`. These downstream
  observations do not validate finding the same transaction or resetting an
  established search. Inline-reset versus overlay-reset handling remains a
  candidate contract gap requiring a valid prerequisite-based reproduction.

The new trace retains the correct v1 filenames even on failures. Mixed PRD,
Dashboard and unrelated chunks still appear, especially for Inspection, so
retrieval relevance and source qualification remain risks. Presence of the
right file does not prove the correct node was selected. No demonstrated
manual omission currently justifies changing or replacing the four manuals.

### Execution Deviation and Environment

The main agent had the executor submit FN02 steps 2/3 after step 1 failed to
establish an identity. This departed from the README prerequisite gate in both
the Correction 05 and Correction 06 runs. Preserve those raw records as
robustness observations, but classify their search/reset capability verification
as N/A. This qualification supersedes the earlier FN02 Pilot 01 downstream
numeric scores for capability acceptance; the group remains failed. Future
runs must skip dependent submissions until their prerequisites are met.

During Correction 06 account switching, the local Vite listener on 18086 had
stopped. An actual login POST failed with connection refused/status 0, not an
authentication rejection. Only the prescribed Admin Portal Vite process was
restarted. `/`, `/dsh-audit/` and `/swagger` returned 200; browser hard-refresh
confirmed 173 CSS rules, loaded app.js and the intended audit layout. I1/F1
then logged in successfully with fresh GetUserInfo and completed their runs.
The incident is resolved in `execution-incidents.jsonl`. Final identity was
restored to H1 Happiness Center Manager, `/happiness/tickets`, To Do selected.
No account fault or password change is required.
After that verification, agent-owned browser task space 85 was closed with
`completeTaskSpace(85, {keep: false})` returning `done: true`. No logout or
user-owned task-space operation was performed; the local services remain up.

### Next Bounded Repair Batch

1. Add actionable validator feedback for unknown source nodes, non-JSON row
   facts and invalid planning phase, using a bounded repair within the existing
   deadline. Preserve strict native row/state binding; do not parse arbitrary
   label/value prose or substitute unrelated nodes.
2. Verify any repaired Completed answer against the whole requested queue,
   including non-Completed statuses. Then rerun CH02 as a fresh conversation.
3. Enforce current role/view qualification of knowledge and retain verified
   entry alternatives when a first read fails. Diagnose time budgets from
   scoped traces before adding waits or broadening reads. No module routing.
4. Establish a transaction identity first, then reproduce inline search/reset
   within the generic action contract. Skip dependent steps on prerequisite
   failure. Run the other representative groups before the full corpus.

These are remaining tasks, not deployed Correction 07 changes. Correction 06
remains the tested runtime. The last full checks are 656 backend tests and 14
runner/report tests, plus YAML parsing and diff checks; none supersedes the
failed live business gate. Existing manuals, publication state, question text
and historical raw evidence remain unchanged. The Skill's incremental repair
and separate completion gates kept this batch from expanding into a full scan.
