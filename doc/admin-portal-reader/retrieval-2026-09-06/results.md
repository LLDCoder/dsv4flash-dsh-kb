# Post-Upload Retrieval Review

## Main-Agent Verdict

Representative post-upload retrieval passes for the four new v1 manuals.
The tested business nodes and their important authored role/layout conditions
survive the current Reader projection. Dashboard and Licensing v3 unchanged
samples also remain retrievable.

This is not a business-answer acceptance pass. No authenticated Reader dialogue,
live business list, account switch, or new 60-step question-set run was performed
in this batch. Source filename/version metadata plus matching representative
content establishes the tested version evidence, not byte-for-byte verification
of every uploaded file or exhaustive coverage of all 30 semantic nodes.

## Evidence Reviewed

Bounded probe records: `probe-evidence.json`. The main agent validated its JSON
structure, 17 unique probe IDs, retained source ranks, and the four local v1
manual hashes. Full raw chunks were not persisted.

The Sol verifier executed 17 sequential live searches through the configured
local Admin knowledge gateway: 15 direct natural-language/diagnostic probes and
two production-shaped probes using the deployed `knowledge_search_query`
function. The latter used explicitly synthetic Inspector and Finance permission
contexts, not fresh `GetUserInfo` results.

All 17 original input questions are recorded. The two generated wrapper strings
were not retained and are explicitly marked unavailable; their inputs, synthetic
contexts, and deployed code version remain recorded. Many probes intentionally
name distinguishing fields or role conditions. Their success is not evidence of
robust recall for arbitrary short questions or elliptical follow-ups.

The gateway returned 20 chunks per probe; the deployed Reader projection retained
the first eight. Main-agent review considers a required node outside that window
unavailable to the planner, even if it appears in raw retrieval.

| Area | Representative evidence and business interpretation | Verdict |
| --- | --- | --- |
| Customer Happiness v1 | Accounts search/filter and communication boundaries; the alternate ticket layout retains its not-solely-role qualification; Appeals remains a qualified column-anchor surface. | Sampled retrieval passes |
| Content v1 | Permit fields/boundaries; Movies parent-page tab, Cinema child permission, and direct-route failure qualification; Regulate Entry object-specific fields. | Sampled retrieval passes |
| Inspection v1 | Manager queued/team views remain distinct from Inspector primary tabs; violation fields and the report-download prohibition remain available. | Sampled retrieval passes |
| Finance v1 | Payments fields and search behavior; Finance refund payment/transaction fields remain distinct from Customer Happiness refund-workflow fields. | Sampled retrieval passes |
| Dashboard v3 | Attention and role-view samples retain relevant existing manual evidence. | Retrieval sample passes only |
| Licensing v3 | Electronic Media export-form semantics and Team Management permission/title conditions remain available. | Retrieval sample passes only |

## Ranking Risks

- Content Regulate Entry: three requirements-document chunks precede the v1
  semantic node at rank 4. The needed node is retained, so this is contamination
  and a ranking risk rather than a demonstrated missing-node failure.
- Cross-module refunds: Customer Happiness chunks occupy ranks 1-3 while the
  Finance refund node is rank 4. Both distinct business objects remain available;
  a later answer must not substitute one workflow for the other.
- Production-shaped Inspector query: Dashboard v3 and an Inspection Dashboard
  requirements document occupy ranks 1-2; Inspection v1 occupies ranks 3-8 and
  retains the tested layout anchors. Query context changes ranking, but this
  probe did not lose the required role distinction.
- Relevant chunks being available does not prove the LLM selects or explains
  them correctly. These cases should be watched in representative live dialogue.

An initial compound ticket-field literal did not match because the manual lists
other fields between the requested terms. Independent source anchors confirmed
the fields and layout qualification were present. This is a probe-assertion
defect, not a manual or retrieval failure; it must not be reported as a Reader
repair or silently converted into a pristine initial automated pass.

## Root-Cause Classification

- Manual missing: not demonstrated for the sampled nodes.
- Wrong or missing retrieval: no blocking sampled miss; mixed-source ranking
  remains a recorded risk.
- Reader projection: no required sampled node/condition was lost; this is not an
  exhaustive truncation or ranking test.
- Reader understanding, operation, and final answer: untested in this batch.
  Prior Dashboard/Licensing business failures remain open.

No manual revision, knowledge publication/version change, runtime-code fix, or
full-module rescan is justified solely by these retrieval results. The next
business checkpoint is the proposed CH02/H1, CT04/C1, IN02/I1, and FN02/F1
representative conversations, followed by main-agent grading. Execute account
changes serially and obtain fresh `GetUserInfo`; do not claim live permission
coverage from the synthetic retrieval contexts used here.

## Safety and Remaining Gates

Only engineering evidence artifacts were added. Existing uncommitted runtime
changes and prior acceptance evidence were preserved. Knowledge searches and
scoped configuration checks were read-only; there were no database writes,
business mutations, uploads, downloads, exports, account changes, or customer
system operations. No browser task space was created or claimed.

The full question-set approval remains distinct from the user's upload
confirmation. Before bulk execution, confirm the approved questions, adapt the
legacy-format runner, and record role prerequisites and per-version results.
The expansion Skill kept publication, retrieval, and live answer acceptance as
separate gates; no Skill update was required by this batch.
