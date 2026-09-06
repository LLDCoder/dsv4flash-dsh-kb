# Reader Business Answer Quality Improvements

## Scope

User-authorized incremental repair of the generic Admin Portal Reader, based on
the Dashboard/Licensing acceptance run in `../acceptance-2026-09-06/`.
The main agent owns diagnosis, integration, and live grading; implementation is
delegated by file ownership. The previous acceptance evidence is immutable.

Business answers take priority over incidental structural restrictions. Known
read-only queries, filter editing/apply/cancel, tabs, pagination, and details may
be supported without treating UI-only state as a business mutation. Current
GetUserInfo permissions remain authoritative. Approval, submission, assignment,
modification, deletion, sending, upload, download, and export remain prohibited.

No module-specific runtime Skills or business Tools, no manual replacement or
knowledge-base publication, and no customer or remote Admin database operations.

## Work Items

- [x] Inspect prior failures and confirm local Admin database target.
- [x] Establish baseline: 450 relevant unit tests pass before this repair.
- [x] Gateway: allow verified read endpoints and distinguish failed loading from empty data.
- [x] Reader: preserve useful knowledge nodes and finish bounded read continuations.
- [x] Planning and answers: maintain business object, scope, record, and language.
- [x] Main-agent review, 474 shared tests, and local deployment version verification.
- [x] Real question regression, independent grading, and remaining-gap report (business acceptance still fails).

## Verification Plan

Use the unchanged reviewed questions in independent conversations, preserving
the three-step sequence within each selected group. Representative groups:
D03 (refunds and enquiries), D08 (date state), L02 (list/detail/return),
L05 (field meaning and date draft), L10 (license details), L13 (analytics),
L17-L18 (team scope), and D19 (permission refusal and knowledge recovery).
Select the same account representatives serially; never run multiple account
logins concurrently. Record actual answers and bounded evidence separately from
the previous acceptance run. Do not treat a non-error response as a correct
business answer, and do not substitute a retry's best individual steps.

The initial deployment includes a stale platform gateway while backend source
is bind-mounted with auto-reload. No real question run starts until all edited
components pass tests and the gateway has been rebuilt and verified locally.

## First Regression Deployment

All four runtime files matched their workspace hashes before the first live
regression batch. Database configuration was verified as `postgres:5432/dsh`,
`UMC_PORTAL=admin`. Only the local platform-gateway container was rebuilt.

| Component | SHA-256 |
| --- | --- |
| platform-gateway/app.py | f176ab7194a2ea86a0d3d271ee9237c67f186b21b8f88a2a57a179df88c3beb4 |
| backend/app/portal_reader.py | 7d6cb57a74eebab874bb7a414b449c5eb64792f47d70fc697b940eba762d66cf |
| backend/app/service.py | 778c9b7f111f1730a731eae8ba4fce0cd0dc9a793dc51b73e7f8f1e6944cfc03 |
| backend/app/llm.py | e16e197950a4f49cdb03936f64f73305c0071b7d1688c63e29caffe6c64cc057 |

## First Live Findings

`officer-first.jsonl` preserves all nine submitted D03/L02/L05 steps, with no
runner-level interruption. Individual Reader calls can still time out; a
completed chat turn does not imply successful page reading.

- D03.2 and D03.3 now return the actual refund and enquiry rows instead of the
  previous false `no_data`. D03.1 still failed because the model emitted a valid
  page with an empty action list.
- L02.1 returned five application rows. L02.2 opened an unbound detail route and
  failed; L02.3 failed on a Reader timeout. Main-agent native verification under
  the same L2 identity confirmed that clicking visible application reference
  `ML-1-8007-7258611` opens the detail route with a runtime-provided query and
  displays the matching identity. No business action was clicked.
- L05.1 still misclassified a stable field-definition question as live reading.
  L05.2 failed to open the filter, so L05.3 cannot verify cancel/restore.

The next scoped correction handles empty navigation plans, stable definition
classification, and record-specific entry prerequisites. The original first
batch is retained; subsequent runs are separate deployment regressions, not
substitutions for the original acceptance score.

## Second Regression Deployment

Before `officer-final.jsonl`, all backend tests passed (520), and the deployed
backend files matched the following hashes. Gateway and service hashes remain
unchanged from the first regression deployment.

| Component | SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | a7505f89401149b25f63a18bc09263e969a5b9804963098d14e439bf65de6997 |
| backend/app/llm.py | f5cd980854f220fa77718302f15e83a9756581ada55f81f6eba11970b283b30f |

The second correction normalizes a missing action on a valid read destination
to one observation while retaining permission checks, distinguishes stable
filter-definition questions from active live filter state, and makes the
planner honor documented source-row entry requirements for record details.

## Final Scoped Correction

The second regression still exposed functional failures; see `results.md`.
The final correction normalizes omitted roles only for known single-role
read-only UI actions, retaining explicitly supplied roles and gateway checks.
Knowledge paraphrase polarity is checked within a candidate sentence rather
than against unrelated warnings in the whole node. A non-live knowledge
success rejected by grounding gets one source-sentence repair; a failed repair
terminates as `knowledge_not_grounded`, not a forced page read.

Main-agent review added branch assertions using the original L05.1 wording,
verified that failed repair cannot dispatch a page request, and checked implied
roles without allowing forbidden actions. All backend tests pass (528), and
the runner/report tests pass (8).

Only `backend/app/portal_reader.py` changed in this final runtime correction.
Its workspace and deployed SHA-256 both equal
`31c02b99542db632f1b061d25d124496e3be954358474249c1df8d0457c0b208`.
The gateway/service/LLM hashes remain the second-deployment values. Final
targeted runs use separate `*-correction.jsonl` files and do not replace any
second-deployment scores.

The final scoped runs are complete. Across all three repair versions, 36
submitted steps in 12 conversations finished; local conversation states are
all READY. The original L2 Officer identity was restored. D19 passes its final
three-step run, while L05 remains a functional failure. See `results.md` for
the independent per-step scores and the explicit untested scope.
