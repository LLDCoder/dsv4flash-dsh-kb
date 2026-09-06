# Basic Modules Business Pilot

The user approved the existing basic-module questions after the representative
post-upload retrieval checks. The approved source is
`../basic-modules-2026-09-06/questions-review.md` (SHA-256
`ca46fa206975d3a400f271287b9112870c9d72cfc30401ad17557da4ef31ad01`).
Questions are not rewritten or supplemented with their expected outcomes when
sent to the Reader.

## Latest Status (7 September)

Correction 06 four-group retest is complete: zero groups pass. CH02 scores
0/0/2, CT04 0/0/0, IN02 0/0/0, and FN02 0/N/A/N/A. The Finance dependent
questions were submitted despite the missing identity prerequisite; preserve
them as robustness observations, not search/reset acceptance. See `results.md`
for main-agent grading, the execution deviation and remaining generic repairs.
The full 20-group/60-step corpus and refreshed Dashboard/Licensing samples have
not been run. Retrieval sampling passed, not business acceptance.

Correction 06 passed 656 backend tests and 14 runner/report tests. A local Vite
outage during account switching was resolved and the three entry routes plus
audit styling were reverified. H1 was restored with fresh GetUserInfo and To Do
selected. No account/password fault was established. Manuals and approved
questions remain unchanged; no Correction 07 implementation has started.

## Staged Execution

| Group | Permission representative | Tested business behavior |
| --- | --- | --- |
| CH02 | H1 Happiness Center Manager | Enquiries/complaints, Completed, row status versus queue |
| CT04 | C1 Content Manager | Books, Movies, category-specific identifying fields |
| IN02 | I1 Inspection Manager | Team Tasks To Do/Completed and time-field distinctions |
| FN02 | F1 Finance Officer | Transaction identity, search, and reset continuity |

Each group uses its own conversation and output file. Run browser operations,
account changes, and Reader requests serially. Verify current `GetUserInfo`
identity and permissions after every login. Do not submit a dependent step when
its required record or state was not established; record its exact question and
the missing prerequisite instead.

Sol executes and records bounded native/audit evidence. Main agent owns business
grading, root-cause classification, fixes, and the decision to expand to all
20 groups/60 steps. Score 2 for completion, 1 for partial completion, 0 for
failure; dependent steps without prerequisites are N/A, never passes. A
`success` status or `turn.completed` event is not a business pass. Available
business data answered only with inability to confirm is a failure.

## Environment and Identity

The backend was verified against local `postgres:5432/dsh`, `UMC_PORTAL=admin`.
Repeat the target check before each test batch creates local conversations and
audit records. No remote or customer database may be accessed.

At the initial preflight the browser identity was H2 Happiness Center Agent,
matched in memory to the authorized account source. During the authentication
handoff the user manually selected H1 Happiness Center Manager and confirmed
successful login. Fresh `GetUserInfo` after the handoff confirmed that manager
role. H1 is now the restoration baseline: preserve the user's latest deliberate
account selection, not the earlier H2 or historical L2 identity. The prior scan
space is closed; this batch uses new agent space 85. Existing user-owned
knowledge task spaces were neither claimed nor operated.

Two initial H1 login attempts failed because the test-side credential parser
captured Chinese label prose instead of the password. No Reader question had
been submitted. The parser assumption was corrected by validating the source
line's two whitespace-delimited fields; the actual credential remains only in
memory. The user then confirmed the account works. This is a test-preparation
incident, not evidence of account failure or a Reader business defect. No
password or token is recorded in this artifact.

The local entry `/` is reachable; `/swagger` resolves by GET redirect to
`/swagger/index.html` (200) with Admin Service listening on 5207. The audit
entry `/dsh-audit/` was hard-refreshed and has 173 CSS rules, matching CSS/JS
cache versions, `Cache-Control: no-store` on the entry HTML, and document
width equal to viewport width. No services were restarted for this preflight.

## Initial Version

Workspace and deployed container hashes match:

| Component | SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | 31c02b99542db632f1b061d25d124496e3be954358474249c1df8d0457c0b208 |
| backend/app/llm.py | f5cd980854f220fa77718302f15e83a9756581ada55f81f6eba11970b283b30f |
| backend/app/service.py | 778c9b7f111f1730a731eae8ba4fce0cd0dc9a793dc51b73e7f8f1e6944cfc03 |
| platform-gateway/app.py | f176ab7194a2ea86a0d3d271ee9237c67f186b21b8f88a2a57a179df88c3beb4 |

The runner was extended to parse the new numbered question format while keeping
legacy table questions and their canonical module names. Expected outcomes and
role prerequisites are output metadata only. The runner and legacy report
tests pass together (12 tests); malformed step sets and duplicate groups are
rejected. New pilot reports are main-reviewed, not generated by the legacy
40-group-only report renderer.

The main agent reran the full backend baseline with
`PYTHONPATH=backend pytest -q backend/tests`: 528 passed. This is engineering
baseline evidence, not a score for the live pilot questions.

Keep initial failures and correction runs separate. Do not modify the old
acceptance records, existing manual sources, knowledge publication state, or
unrelated dirty runtime changes. No module-specific runtime Skill, Tool, or
hardcoded business route is permitted. Only verified read-only controls are in
scope; documents, exports, downloads, uploads, refund processing, approvals,
assignments, and all business mutations remain prohibited.

## Correction 01

Root reviewed the executor's controlled read-only dependency comparison:
blocking only the native enquiry UserInfo GET changed the manager list to an
alternate empty layout and prevented TeamTask/List from being requested. The
gateway now permits eight exact observed GET dependencies; POST variants,
extra path segments, fallback Role/ProblemCauses requests, notification
requests, and all prohibited business operations remain blocked. This is a
transport safety allowlist, not a runtime business router or new Tool.

The final answer now uses only confirmed facts and fixed status wording for
non-success results. It does not interpret generated missing/summary text or
history as business evidence. Success with facts retains the existing natural
language formatter and a strengthened evidence-only instruction.

The knowledge diagnostic replay found the relevant distinction in projected
chunk 2. Its two-clause source sentence was split at the comma; an expanded
paraphrase then failed the per-clause overlap check. A retry repeated that
paraphrase. The original intermediate plans were not retained, so this is a
current-configuration replay, not an exact historical planner-output trace.
Exact source quotations now retain sentence boundaries across commas, and
the repair instruction has explicit system priority to copy source sentences
without expanding or translating them. Manuals were not changed or uploaded.

Correction 01 workspace/deployed hashes:

| Component | SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | 4ab70a0fe831dff1b9b524d2f6478b6ea97de620081c217a12090984e5a0b035 |
| backend/app/llm.py | 5c591b9de47421418f7853660f5297987570faf7d36f725e1491a9af669211ff |
| backend/app/service.py | 23e8fc776ed3923daccdaba4ee20c4a4a96a0639b9de29d83de2e02e823efbb5 |
| platform-gateway/app.py | 31ca3beddf5e47a2f6dda174c5c424c586f571426b0cfa5ebc13ddd187866f90 |

Full backend suite: 553 passed. Runner/report suite: 13 passed. The runner
now retains bounded path-only read-health diagnostics and section state,
without additional record rows or URL query values. Only the local Admin
platform-gateway was rebuilt/recreated; backend uses its existing reload
mount. Both `/healthz` endpoints passed and the local database target was
rechecked before the correction run.
