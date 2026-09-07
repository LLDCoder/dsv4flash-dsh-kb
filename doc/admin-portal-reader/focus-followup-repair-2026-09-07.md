# Business Focus Follow-up Repair

## Scope

Incremental generic Reader repair for the reported Foreign Media Manager
conversation `conv_3d0d9d03753243cea6e4`: attention summary, "show me the list",
then "show me the blocked task list". No module rescan, manual replacement,
knowledge upload, business mutation, customer service operation, or remote
database write is included. The local network-whitelist setting is unchanged.

## Confirmed Causes

- Original audits 25882 and 25894 lost the verified semantic region after the
  successful attention result in audit 25869. Retrieval for the third question
  contained Licensing v3 but not Dashboard. There was no page read in either
  failed follow-up, so these were not failures to extract already-loaded rows.
- Seven slots conflated omitted conditions with explicit removal. Human-readable
  verified section labels were unavailable as semantic provenance, and changing
  answer shape lost the business focus. Failed turns then persisted that loss.
- After repairing continuity, audit 25918 correctly inherited the focus,
  retrieved Dashboard v3, observed Dashboard, and attempted the Blocked tab.
  It failed at exact control-name lookup: the live tab includes a numeric badge.
- A local read-only control check verified that the Blocked tab changes the
  matching table and marks selection through a BEM `--active` class. It has
  role=tab but no aria-selected attribute. This is a generic execution gap,
  separate from intent continuity.
- Audit 25943 subsequently exposed scoped lookup of a visible section title as
  an accessible region name. The verified DOM has one matching H2 in its nearest
  SECTION, containing only Urgent and Blocked tabs, but no region role or aria
  label. Scoped fallback must stay inside that unique semantic container.

## Implemented Intent Changes

- Separate businessFocus from answerShape and state/filter conditions.
- Represent omission as unspecified; require current-question evidence for
  explicit clear. Normalize compatible omissions only within continue/refine.
- Preserve a bounded verified page/section as an advisory source hint, never
  a route requirement, permission grant, or source of current business facts.
- Recover only compatible focus across older failed refinements; stop at topic
  changes, explicit removal, clarification, or intent-resolution failures.
- Do not implicitly turn the first row of an initial broad list into the
  selected record. Explicit one-record lists and verified single details retain
  identity references for a fresh lookup.
- Match separate numeric tab badges only after exact-name matching fails, with
  the same region, role, mutation checks, and unique visible target requirement.
- When aria-selected is absent, verify one active/selected tab in a stable
  group with a bounded render wait. Explicit aria-selected=false is never
  overridden by a class. Observations use the same selection signals.
- When a tab's named scope is not an accessible region, allow one exact visible
  heading's nearest semantic section/region. Missing or duplicate scope never
  widens to a global tab search.
- Audit 25955 exposed unnecessary follow-up schema repair for a redundant
  trailing pure observe. The repair invented a tab action for the region title.
  Follow-up normalization must preserve the original permitted state change
  after checking its original policy and cumulative budget, as initial-read
  normalization already does.

## Verification Evidence

- Final backend suite including tab execution and continuation regressions: 959 passed; Node
  scripts: 25 passed. Engineering YAML parses and diff check passes.
- Configured production-model probes preserve the attention focus for list
  follow-ups, put Blocked in a separate condition, and distinguish switching to
  invoices from broadening to personal work across categories.
- Fresh GetUserInfo confirmed Foreign Media Manager and Licensing Manager for
  the same account throughout browser checks. Expanded Reader permission count
  was 23. No account switching or concurrent browser scans occurred.
- Browser conversation `conv_25008dbbc67a47cbbb48`, audit 25906, reproduced a
  separate first-question evidence-selection failure: My Tasks evidence was
  combined with incompatible observation references. This initial-question
  run is a business failure, not a successful end-to-end follow-up regression.
- The original conversation was resumed through its UI history. Audit 25918
  verifies repaired focus/retrieval and exposes the tab blocker; it is not yet
  a passing business answer.
- A standalone-question probe `conv_030aeef78e704322bca4`, audit 25930, did not
  carry the original conversation after the chat window was reopened. It
  substituted Customer Happiness tickets for a requested blocked-task list.
  This is a separate business failure, not evidence of follow-up correctness.

The local Admin platform-gateway was rebuilt with the prescribed layered
environment and Compose files using `--no-deps`. Health verified Admin mode and
the unchanged local whitelist-disabled setting. No other service was restarted.

The browser later returned to the login page with no stored authentication.
The same authorized account was logged in again and fresh GetUserInfo verified
the identical user ID and manager roles. No account switch was performed;
the cause of the lost login state was not established.

## Final Business Verification

The original screenshot conversation was reopened through history and its
successful attention answer was verified before submitting either follow-up.

| Follow-up | Evidence Audit | Outcome |
| --- | --- | --- |
| show me the list | 25967; result 25968 | success, list, four matching Blocked task rows |
| show me the blocked task list | 25980; result 25981 | success, list, the same four matching Blocked task rows from a fresh read |

Both final reads selected Dashboard / Needs Manager Attention / Blocked 4 with
the generic scoped switch_tab action. Fresh GetUserInfo preceded execution.
Results were bounded, with unknown ownership scope rather than an inferred
team/global grant, and no missing items. Native checks matched the task identity
and waiting/status fields. The answers returned business records instead of
generic inability text. No historical count or row was used as fresh evidence.

Both runs used the existing structured_unique_evidence fallback because the
model still cited incompatible observation references. This is a passing
bounded business answer, not proof that model reference selection is repaired.
The displayed rows remain flattened rather than a labeled table; they do not
invent column relationships, but richer presentation remains desirable.

## Remaining Work and Classification

- The reported follow-up failure now has deterministic regressions and two
  successful actual user-path checks. Conditional topic switching/broadening
  has unit and configured-model verification, not a complete multi-module
  browser acceptance run.
- First-question region selection and model observation-reference accuracy
  remain separate generic Reader defects, demonstrated by the failed probes
  above. The complete 20-group/60-step corpus remains unexecuted.
- These findings belong in generic Reader code, execution behavior, and
  engineering regressions. No missing manual content has been established by
  this repair; no module rescan or manual publication was performed.
- Tests: 959 backend and 25 Node passed; YAML and diff checks passed. Code was
  deployed only to the existing local Admin runtime and was not committed or
  pushed during this repair.
