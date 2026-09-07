# Reader Evidence Retention Repair

Date: 2026-09-07 (Asia/Dubai)

## Scope

First-stage repair of verified-data rejection in the generic Admin Portal Reader.
No module-specific Skill, business Tool, knowledge manual, permission change, or
database migration was introduced. Existing unrelated workspace edits were kept.

## Changes

- Ground both success and partial-result facts independently. Keep confirmed
  fields when another field is unavailable, and discard facts with invalid
  page, source, selected-state, numeric, or native field-binding evidence.
- Downgrade success when candidate facts are rejected. Counts alone cannot
  establish individual priorities, even when the planner labels them attention.
- Allow one bounded observation-grounding review per turn, including an
  ambiguous repeated heading in a partial result. Corrected facts use the same
  validators. Failed completion or grounding reviews do not erase facts already
  validated against the current observation.
- Detect errors through page error signals or standalone loading surfaces, not
  error-like words inside business descriptions. A selected loading region is
  still rejected; unrelated pending requests do not erase observed records.
- Preserve verified facts when answer-shape labels differ. A list of explicitly
  overdue records can answer a plain overdue question; additional date semantics
  and ordinary counts do not become a matching list or priority claim.
- Allow bounded native-row recovery for a plain request whose conditions are
  established by the selected view. A resolved filter may refer to that same
  view. Extra assignee, date, identity, and other unverified predicates still
  prevent recovery. Duplicate indistinguishable rows are not inferred.
- Retain the evidence-validation failure instead of overwriting it with an
  invalid follow-up-plan error. Partial answers show confirmed facts and a
  remaining-details limitation; native field objects are rendered as labeled
  values rather than JSON.

## Verification

Command:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend:backend/tests python3 -m pytest -q -p no:cacheprovider backend/tests
```

Result: 998 passed. The new evidence-retention module contains 39 parameterized
cases. Existing permissions, read-only actions, native field bindings, tab
continuation, negative polarity, and ungrounded numeric checks remain covered.
Both YAML contracts parse successfully; `git diff --check` passes.

Browser checks used the existing Foreign Media Manager session, with a fresh
successful GetUserInfo check. No account switching was performed. Before chat
test writes, the backend database target was verified as postgres:5432/dsh with
UMC_PORTAL=admin on the local Admin Compose stack.

- The original question, "What should I prioritize today?", retained Urgent 0
  and Blocked 6 when only counts could be grounded, with a partial-result notice.
- A later final-code run answered using the actual Pending Review task marked
  1d Overdue, rather than inferring a priority from a category count.
  Conversation: `conv_067e6793a9af4e0da8d3`; request:
  `6603c038-55db-4c95-9c59-d6852756cbee`. Reader status was success with six
  grounded facts and no missing evidence.
- A blocked-list follow-up returned four bounded matching records after the
  selected-view/grounding repair. Earlier failed smoke attempts remain in the
  local audit history; they were not deleted or rewritten.
  This successful list is in `conv_fd1de76cb2ea417a9c60` at 15:19:51.

## Remaining Live Issue

Repeated end-to-end acceptance is not fully green. In the final fresh
conversation above, the subsequent "Show me the blocked task list" stopped at
`planning_required_portal` with `portal_read_required` (request
`93058799-c1f1-4292-90b3-1daca689a834`). It did not reach portal execution.
This pre-read planning failure is distinct from discarding available evidence
and is not claimed fixed by this first-stage change. One successful list smoke
does not establish consistent follow-up planning.

Gates: targeted regressions pass; shared backend suite passes; original-question
browser smoke passes; repeated follow-up browser acceptance remains partial.

## Boundaries

This is not the second-stage structured evidence-reference redesign. Arbitrary
paraphrases still require grounding, and a complete ranking or full collection
cannot be claimed from partial evidence. Browser coverage is one current role
and the reported Dashboard question family, not every page or account.

The findings belong to generic Reader code, its contract, and regressions.
They do not require a duplicate page manual or another runtime Skill.

## Follow-up: Generic Source Binding

The 15:27 failure (`conv_564f2170c7b942fca9b6`, request
`3ba4845f-5a3f-421c-933a-98a0651e54ae`) occurred after the first-stage code
had loaded. A category control was used as sourceSection, then matched by
substring to an unrelated region heading. This was not a deployment failure.

The follow-up changes are generic, with no new business page, answer template,
module Skill, or permission rule:

- Bind section, sourceSection, and observed selectedState together. Resolve
  explicit node IDs within known region constraints and follow verified
  parentRef relationships for child evidence.
- Accept an active control's exact label without its trailing numeric count
  badge only when that control was observed in the same node. Reject conflicting
  explicit counts, arbitrary prefixes, and different selected views.
- Disambiguate repeated headings only through a unique observed state or
  equivalent evidence. Retain the canonical current-observation node ID.
- Keep the same provenance constraints in initial, post-action, replay, and
  control-recovery fallbacks; do not recover unrelated facts from another region.
- When a source is bound, supply only that node and original read health to the
  grounding-repair planner. Validate against the original observation and record
  repair acceptance, rejection, or unavailability in the quality trace.
- Clarify the required-read phase: missing live facts before observation should
  lead to a documented permitted read, not an assumption that access is missing.
  No default business route is supplied and permission checks are unchanged.

Verification after these changes: 1033 backend tests passed, including 33 new
source-binding cases and two phase-prompt cases. Both contract YAML files parse;
`git diff --check` passes. Runtime file hashes match local files and backend
reload logs confirm startup after the final implementation change.

Live checks remained serial under the same authenticated account. Earlier
iterations exposed pre-read planning failures, badge omissions, and cross-region
facts in repair output; those failed and partial attempts remain in the audit.
They are not counted as successful final-version acceptance.

Final-version original-question check at 16:02:32:
`conv_27b2ff06c4cf4888970e`, request
`bc67297c-6039-42d3-befa-d52d74f30702`. The bound-source repair returned six
validated facts from `observation-region-003`, status success, with no missing
evidence. The answer identified the observed pending-review item marked one day
overdue. Counts and task contents are live evidence, not hard-coded answers.

Two subsequent final-version checks returned partial evidence, not an empty
generic refusal:

- Repeated original question at 16:04:19: `conv_ea754a612a034bd89ada`, request
  `0ff5fe98-fcf0-4aaa-97bc-03112e9b4c79`. The source correctly bound to
  `observation-region-003` and retained the overdue task. A combined sentence
  containing several separate category controls failed the single-unit fact
  validator, so the result remained partial. Compound-fact decomposition is
  not claimed fixed here.
- Alternate wording, "Based on my dashboard, which work needs attention first?",
  at 16:05:44: `conv_7cca216ec18d4d388ed8`, request
  `aa56894b-7bb4-466c-a14f-7de6e3e41575`. The selected manager-attention region
  returned two grounded counts, but blocked-record details and their ordering
  were not read. Counts were not promoted into task priorities.

Final-version live outcome: one complete answer and two partial answers across
three fresh conversations. Source-binding regression gates pass; fully complete
end-to-end prioritization answers are still not consistently green. Further work
would concern compound fact representation and continuing a read for missing
record details, not loosening region or permission checks.

Coverage remains the current role and reported question family, plus generic
synthetic source/state/permission regressions. It does not establish universal
answer completeness, all-account coverage, or reliable planning for every
multi-turn business workflow.
