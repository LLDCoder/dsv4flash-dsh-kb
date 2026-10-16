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
