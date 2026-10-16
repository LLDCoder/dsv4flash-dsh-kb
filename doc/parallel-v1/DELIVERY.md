# Admin parallel read pipeline, 2026-10-16

## Deployment and recovery

The implementation starts from the public, independent-root server snapshot
`6da0317c27dc05d15f1141d7572a06b9a48da683`, not the unrelated workstation checkout.
Running-container `generic_reader.py` and knowledge gateway source take precedence
where the deployed host copy differed. The baseline mirrors remain unchanged.

The original server backup is
`/data/backups/admin-dsh-before-multi-agent-20261016T080833Z`.
The original 18081 deployment is not modified by `scripts/stage_server77.py`.
That helper creates only `admin77-parallel-20261016-*` containers, an isolated
DSH test database, and the 18281 test entry. It copies model/read settings on the
server without publishing their values. Never commit `private-stage/` or runtime
configuration. The test PostgreSQL data is ephemeral; export evidence before
removing or restarting that database container. There is no UMC migration.

Select `READER_PIPELINE=parallel_v1` for the new pipeline. Each deployment runs
one selected pipeline. Legacy modes remain selectable for isolated regression;
the original production containers are the recovery version. No simultaneous
execution of two complete readers occurs within a turn.

## Phase 1: trace the real work

`backend/app/timing.py` supplies request-scoped Trace/Span contexts, UTC start/end,
monotonic durations, component source fingerprints, correlation propagation,
HTTP attempt/transport/backoff measurements, and a single-writer audit receipt.
The two gateways contain identical copies, checked during verification.

- DSH receive/accept, session writer queue, input preparation and DSH SQL/commit.
- Trusted GetUserInfo, semantic model and loaded skill/content hashes.
- Three result-agent parents, per-capability queues and the common join.
- Every direct UMC HTTP call, DSH gateway call and KB upstream HTTP attempt.
- Browser lock queue, launch/context/auth/navigation/readiness/DOM/actions/close.
- Browser API requests with action index, headers status, completion/failure and
  browser network-phase offsets when Playwright supplies them.
- Final assembly, model first content and first verified published answer.

A child's parent is the exact caller span. Request/response bodies, tokens,
cookies, SQL text and model reasoning are not timing fields. Agent tasks never
share a SQLAlchemy session. The existing conversation writer persists events;
when all agent cleanup is complete, one bounded audit flush saves reader.timing.
A cancelled turn still emits terminal timing spans. Audit flush is outside the
user-facing turn total and may complete up to five seconds later.

`totalMs` measures backend question receipt through terminal turn completion;
it excludes browser-to-server transit and any conversation setup before that
question. Parent spans are inclusive. Concurrent agent spans overlap. Do not sum
all spans, or add API/Page/KB branch times. `agentWallMs`, `criticalBranch`,
`firstVerifiedAnswerMs` and `longestHttp` are separate measurements.

HTTP transport timing stops when the response body is complete. Remote timing-receipt
processing is a separate DSH span. A DSH gateway service span is linked to its
exact caller and exposed separately from transport. The deployed portal proxy
routes ordinary `/api/` to the UMC domain; `/api/v1/` and the DSH prefixes route
to DSH. Static local UMC code is not proof of the external service build.

UMC HTTP duration is client round trip including the response body, not the UMC
server's SQL/auth/domain/serialization breakdown. Those internals remain null.
KB transport/manifest/document stages are measured; internal embedding, vector,
BM25, graph and reranker timings are not established by those measurements.
Model HTTP/stream duration includes client/network/provider wait; provider
internal queue/compute is not independently measured. Never guess old gaps.

## Phase 2: business skills and the Admin read adapter

Seven app-owned `SKILL.md` + manifest themes live under
`backend/app/business_skills/`. They are not personal Codex skills and are not
DB-seeded business modules. Existing generic DB skills still provide the
published runtime shell; no shared-DB skill migration is required.

`readonly_api.py` implements the `umc.readonly.invoke` capability internally.
It accepts a loaded skill ID, fixed operation ID and strict typed parameters.
No public arbitrary HTTP execution endpoint is added. It is not an editable
registry tool: the model cannot supply URLs, methods, credentials or identity.
The configured Admin origin, fresh permission snapshot, module page permission
and current-module IsLeader guard constrain all calls. HTTP redirects are denied.

The manifest contains 26 audited routes: 17 basic read capabilities, three
certificate routes disabled for lack of global-scope authorization, and six
content-library routes disabled for authorization/source gaps. Personal and
team list APIs, personal detail, module leader/urgent counts, team members and
bounded nonzero member-task projections have fixed safe response fields.
FormData, contact/credential/leave fields and the unreliable member SLA formula
are excluded. MemberId is applied to the returned projection even if upstream
ignores it. A zero-task row does not prove module membership. TEAM01 describes
all caller-led departments, not a verified complete single-module population.

List -> exact application number -> string taskId -> PERSONAL detail is ordered.
A team taskId cannot be used to infer access to personal detail. Independent
list reads may run together, with at most two requests per capability. Exact
requests share one in-flight result within one authenticated turn. Ambiguous
module/count populations and unsupported filters return explicit gaps.

Automatic API planning initially covers exact current application status,
explicitly scoped task queue counts and module-leader urgent task counts.
All 17 fixed adapters exist, but arbitrary dates, groupings, sort conditions,
full staffing populations and unverified finance/inspection fields are not
silently approximated. Those requirements continue through the existing page
reader, with explicit API coverage gaps. Source-interface availability is not
the same as complete automatic semantic mapping for every question.

## Phase 3: three result agents and one final answer

`parallel_agents.py` obtains one trusted GetUserInfo snapshot and a validated
TaskSpec, loads matching skill manifests, then creates API, Page and Knowledge
agent tasks at one dispatch point. Each task has an independent result/status,
context, permitted capability and trace parent. A task without a verified
applicable API returns not_applicable rather than guessing an endpoint.

The deployed permission-checked reader is reused inside Page Agent, not run
three times. It reuses only the turn's verified identity/semantic task. Browser
execution still revalidates identity, retains READER_LOCK, disables downloads,
and enforces the existing network/action policy. Knowledge calls are delegated
to the turn-scoped KB broker. Completed exact retrieval reuse retains the
original verified manifest receipt; no cache crosses a turn or principal.

For a completely mapped exact status question, Page Agent performs one
independent authorized observation while API Agent obtains scoped facts. If
API coverage is incomplete, Page Agent continues the existing detailed reader.
Thus a successful API does not suppress all page work, but it removes the old
repeated semantic drill for this fully covered capability. Other questions may
still require multiple justified reads. This is not a blanket browser cache.

Knowledge Agent retrieves in parallel, preserves document integrity checks and
selects original-prose passages relevant to the whole task. Engineering JSON
and graph summaries do not become independent policy assertions. Every excerpt
must exactly match a supplied original passage; offsets and quote hashes are
recorded. Successful retrieval without an applicable answer is not a successful
policy answer. Knowledge cannot supply current identity or live business values.

Ordinary agent failures are isolated. There is one absolute reader deadline,
a final-answer reserve, parent cancellation propagation and awaited child
cleanup. The final presenter also observes the remaining turn budget and uses
only already-verified facts on timeout. One merger deduplicates facts, retains
scope/coverage, blocks conflicting status claims and preserves explicit denials.
One existing grounded/language-checked presenter publishes the final answer;
agent drafts are not streamed to users. Requested record/count guards remain.

## API documentation and verification

- GET /api/v1/readonly/skills: authenticated engineering catalog, not a grant.
- GET /api/v1/conversations/{conversation_id}/timings: existing owner/admin audit
  authorization, optional requestId and bounded turn limit. Includes typed spans,
  inclusive-time warning and unavailable-internal measurements.
- POST conversations/{id}/messages: unchanged submission contract, new pipeline
  selected by deployment configuration, not by untrusted model arguments.

Swagger: `/dsh-api/docs` on the 18281 test entry.
Run `backend/tests/test_parallel_agents_v1.py` first, then the existing regression
suite. `verification/baseline-comparison.json` distinguishes failures already
present in the snapshot from new regressions. Real-business evidence and
credentials belong in private test outputs, never in this public repository.
There is no live approval/assignment/write-refusal test in this delivery.

## Verification status on the isolated server

The final source suite has 2,022 passing tests, 129 failures and three collection
errors. The same deployed-source baseline has 1,968 passing tests and the same
129 failures / three errors: 54 additional passing checks, zero new failing test
identities. This is not an all-green suite. Collection errors concern old tests
importing helpers/constants absent from the deployed snapshot.

Authorized License queries verified the original and rephrased status questions
in English and Arabic. Live adapter probes passed nine License/team read
contracts. Eight Content contracts remain blocked by the available account's
permissions; no additional account was authorized. Nine certificate/library
contracts remain deliberately disabled. Inspection uses the existing page
fallback: status lookup limitations reproduced on the unchanged deployment,
and visit-preparation queries did not establish the requested checklist.

These are isolated-stage results, not approval to replace the original entry.
Keep the original 18081 deployment and the private rollback backup. Exported
private Excel/evidence distinguishes diagnostic iterations, final samples,
unavailable upstream internals and unexecuted write-operation tests.

## Follow-up: exact inspection identity and preparation reads

The default Inspection Queued tab does not cover manager Team Tasks. The new
gateway-owned `inspectionTaskNumber` workflow searches only current button-
permitted native queues, at most two independent searches concurrently. One
exact taskNo must bind a unique returned reference before the detail GET. The
detail taskNo / numeric ID and the checklist taskId must agree. Ambiguity,
denial, missing fields or a failed read cannot become a visible-record claim.

English/Arabic status and preparation variants use the same typed capability.
History/violation/collection questions and unsupported semantic fields retain
their separate readers. Checklist projection keeps every visible active point
within a separate 200-item limit, including beyond the UI's sixty-item bound.
The response explicitly distinguishes a task checklist from a formal materials
directory and a complete visit procedure: those cannot be invented when the
source does not provide them. No UMC deployment or business mutation is added.

Supplemental Playwright APIRequestContext reads now emit each actual UMC HTTP
attempt, correlated headers, status, body-completion latency, decode and retry
backoff. Previously page network listeners did not observe that separate API
transport. UMC internal processing remains uninstrumented. This change is
deployed and tested only on the isolated 18281 entry; 18081 is retained.

### Follow-up verification (isolated environment only)

The final build was exercised through the real portal assistant with eight
English/Arabic original/rephrased questions: four current-status variants
returned the identity-bound status, and four preparation variants returned all
35 active task checklist codes. Preparation remains partially confirmed: the
source does not provide a separate formal documents list or complete visit
procedure. A checklist is not a substitute for those missing business fields.

Fourteen observed turns include six diagnostic/intermediate/repeated samples;
all are retained privately, including one same-build Arabic preparation answer
whose final prose was incomplete after validation/generation. A repeat completed,
but this does not establish that the intermittent presentation issue is fixed.
The unpublished rejected text was not retained, so its exact cause is unknown.

Every final variant performed one portal read/browser startup. Its native
business requests were three permission-scoped searches, one bound detail,
and (for preparation only) one checklist read. These are not four/five full
page reloads. Native HTTP round trips were measured separately from navigation,
readiness, DOM extraction and final model output. The 3,159 collected stages and
412 HTTP attempts have unique span identities, complete parents, nonnegative
durations and zero dropped spans. Attempts include failed page requests, not
just successful upstream execution. UMC internal processing is still unknown.

The follow-up source suite has 2,046 passing tests, the same 129 failures and
three collection errors as the previous implementation: 24 new passing checks
and zero new failure identities. The new tests include bounded concurrency,
permission denial, ambiguous/wrong identity rejection, complete checklist
projection and ToolGateway argument forwarding. No customer service, UMC
deployment, business mutation or original 18081 replacement was performed.

## Follow-up: validated checklist tail completion and source discovery

The old presenter could publish all validated checklist items, reject an
unpublished final paragraph and then mark the answer partial. The historical
unpublished sentence and precise rejection clause were not retained; they
cannot be reconstructed from a successful model-duration span. New payload-free
diagnostics distinguish language/grounding rejection codes, presentation
exception type, model finishReason/DONE and the recovery decision.

Only the exact inspection checklist workflow may complete this case with a
fixed source-gap/account-scope close. It requires the identity-bound status and
every verified item code already present as a labelled item in the immutable,
guarded public prefix. It never accepts the rejected model paragraph. Missing
items, wrong identity, denied reads and HTTP/transport failures stay partial.
The recovered answer retains its original prefix and uses the ordinary
verified_projection publication contract. Tests replay this failure path,
including negative coverage/identity/transport cases. The existing historical
35-code prefix was also replayed privately without issuing any business write.

Source discovery found that the live task has no attachments and its template
is AllChecklistItems, which does not establish that every point applies to the
visit. Local UI sources define three pre-visit preparation checks and separate
field/digital execution steps; they are UI guidance, not an approved complete
SOP. Knowledge metadata lists an inspection user manual and an engineering
guide. Search yields bounded snippets, but full-content reads return 404 because
the current knowledge gateway has no /files/{id}/content route. Do not interpret
that as proof that upstream documents do not exist. A guide snippet lists report
submission before checkout, while local execution code explicitly requires
checkout before submit-report. No workflow write was used to test that order.
An applicable, versioned formal documents inventory and approved SOP remain
unconfirmed; they require the inspection business owner's authoritative source.

This change exposes Swagger 1.1.2 on the isolated entry only. Focused checks are
39 passing; the full suite is 2,061 passing with the same 129 failures and three
collection errors: 15 new passing checks, no new failing test identities.
