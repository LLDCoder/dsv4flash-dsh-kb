# Conditional Intent Repair

## Scope and Checkpoint

The user's accumulated changes were committed locally as `c07ea39`
(`feat: checkpoint reader verification and configurable network policy`).
No push was performed. Private local environment settings were not committed;
the protected `.env.lite` was unchanged.

This incremental repair concerns generic conversational intent, retrieval input,
and answer completion. It does not rescan modules, modify knowledge manuals,
upload knowledge, or introduce module-specific runtime Skills, Tools or routes.
The existing local network-whitelist bypass remains unchanged.

## Implementation

- Fresh GetUserInfo precedes follow-up resolution and all retrieval/page work.
- Seven semantic conditions independently cite current or previous wording, or
  explicitly clear a condition. The original current question is preserved.
- Only resolved conditions enter retrieval/planning. The two actual clarification
  labels may accompany a resolved selection, without old routes or filters.
  Planning uses the canonical current task and retains originalQuestion for
  literal constraints. The prior page is not a
  binding scope and cleared records, views and filters cannot return through
  historical fallback.
- Material scope ambiguity produces two concise alternatives before any
  knowledge/page query. The next reply can select a label or ordinal.
- Requested ownership scope never grants authority. Cross-category breadth is
  distinct from organization-wide ownership.
- Elliptical live-list requests require current page evidence, not definitions
  from a manual. Shape mismatches get one bounded completion review.
- Ordinary rows cannot become attention evidence through label copying;
  deterministic attention fallback needs an observed attention/action-review
  section. Other valid priority evidence remains a semantic planner decision.
- Resolver failures retain the immediately unresolved question, not older
  record anchors. Single-record detail and explicitly requested one-record
  list continuity remain supported; broad lists never implicitly select a row.
- Conceptual follow-ups remain answerable from grounded manual evidence.

The resolver uses the configured production model, with bounded JSON/schema
validation and at most two attempts. Generic contrasting examples improve
conditional inheritance; they contain no module or route mapping. Resolution
has a 20-second cap within the unchanged total Reader budget. A thinking-enabled
experiment timed out and was reverted; it is not part of the delivered runtime.

## Verification

- Backend suite: 843 passed.
- Node regression/report/Swagger scripts: 25 passed.
- Engineering contract and regression YAML parse successfully; diff check clean.
- Production-model probes distinguish continuation, state refinement, broadening
  and clarification. English/Chinese cross-category selections clear ownership
  scope; an explicit all-organization request may request global scope, without
  granting it. Ordinal selection preserves the pending attention intent.
- Account H1 was verified through fresh GetUserInfo as Happiness Center Manager.
  No account switch, concurrent browser scan, business mutation, export, upload
  or download was performed.

## Browser Evidence

First integrated replay: `conv_7eaa42b7e9b6497485db`.

| Turn | Observed result | Assessment |
| --- | --- | --- |
| Are there any appeals that need to be processed now? | Four native rows were available, but the planner cited an incompatible observation node and returned no business answer. Audit 25783. | Existing evidence-reference failure remains; fail, not a missing-manual diagnosis. |
| What tasks shoud I pay attention? | Asked whether the user meant previous appeals or tasks across categories. No knowledge/page read. Audit 25795. | Conditional scope clarification worked in the actual UI. |
| Tasks across categories. | Read Dashboard / Needs Manager Attention and returned four bounded rows spanning Refunds and Enquiries & Complaints. Audit 25807. | No stale Appeals restriction; available business results returned. |

The first replay also exposed a resolver distinction between category breadth
and ownership scope. That prompt correction was subsequently verified with
production-model cross-category, ordinal, Chinese, and all-organization probes.
The replay's verified result scope remained `unknown`; requested scope did not
grant permissions. Do not claim the earlier intermediate intent metadata passed.

Second integrated replay: `conv_96e322b67ace4d368da7`.

| Turn | Observed result | Assessment |
| --- | --- | --- |
| Original Appeals question | Returned three verified records, but the final answer inferred that processing/processed states meant no immediate work. Audit 25820. | Business-answer failure: that conclusion is not established by the observed states alone. |
| Original attention follow-up | Offered the two scope alternatives again. Audit 25833. | Clarification passes. |
| The second option | Resolved to cross-category tasks, cleared ownership scope, and read Dashboard attention data; the planner then claimed the choices were missing. Audit 25845. | Intent and navigation correct, answer failure. |

This ordinal failure led to the final bounded choice-label propagation and
canonical planning-task change. A production-model replay against the saved
observation now returns an attention result with facts and no missing-choice
claim. This is a planner-component replay, not a fresh end-to-end pass. The
browser returned to the login screen during the subsequent retry, so the final
ordinal patch's complete authenticated user-path smoke remains unverified.
No session-expiry cause or account-switch cause is asserted without evidence.

These probes are not the complete 20-group/60-step business corpus, which remains unexecuted.
Dashboard appeared as an authorized alternate source for the follow-up; this
does not constitute the full Dashboard/Licensing regression sample.

## Remaining Work

The initial Appeals question still needs a separate bounded fix for semantic
observation references/reduction and unsupported final-answer conclusions.
Available rows plus a generic inability answer is a business failure, even
when the failure guard behaves safely. Complete the final ordinal browser smoke
after re-establishing the authenticated H1 session.
Do not default to a whole-module rescan: current evidence identifies a generic
Reader evidence-selection problem, not demonstrated manual absence.

Retrospective: this change belongs in generic Reader code and engineering
regressions. No manual replacement or runtime Skill expansion was required.
