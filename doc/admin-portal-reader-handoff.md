# Admin Portal Reader Handoff

This document is the starting context for the next engineering conversation
about `/Users/thron/Documents/odt/admin-dsv4flash-dsh-kb`.

Read `AGENTS.md` first. It defines the Admin-only boundary, local ports,
database rules, and the read-only safety policy. This document explains the
current architecture and the page-coverage delivery method; it does not
replace those repository rules.

## Latest Business Answer Review

On 7 September the user explicitly requested a local API-whitelist bypass for
business validation. See `doc/admin-portal-reader/network-policy.md`. The local
override now sets `PORTAL_READER_WHITELIST_ENABLED=false`; configured paths
live in `platform-gateway/config/reader-network-policy.json`. This bypasses
same-origin HTTP method/path filtering, not account/navigation/action guards.
Do not claim network-level strict read-only guarantees in this mode. Swagger
inventory and unit tests are separate from live business acceptance. Restore
`true` and recreate only platform-gateway to re-enable the policy.

The basic-module post-upload run now continues into 7 September 2026. The user
confirmed the four v1 manuals are uploaded and approved the existing question
corpus. See `doc/admin-portal-reader/retrieval-2026-09-06/results.md` for 17
representative retrieval probes, and
`doc/admin-portal-reader/business-pilot-2026-09-06/results.md` for current
version-separated CH02 trials and main-agent business scores. Retrieval passed
its sampled checks, but the basic-module business acceptance is not passed.
All four representative groups failed under Correction 05 and Correction 06.
The latest frozen, serial retest is complete: CH02 0/0/2, CT04 0/0/0, IN02
0/0/0 and FN02 0/N/A/N/A. Finance downstream questions were submitted without
an established identity; retain them as robustness observations, not validated
search/reset tests. The full 60 steps and refreshed Dashboard/Licensing samples
remain gated and unexecuted. No Correction 07 implementation has started.
The last full code check passed 656 backend tests and 14 runner/report tests;
these counts are not a live answer-quality score.

The H1 manager login issue was an account-source parser error, not a confirmed
account fault. The user verified login; the parser was corrected without
recording credentials. The current restoration baseline is H1, not the L2
account from the earlier manual-preparation batch. Continue serialized account
switching and refresh GetUserInfo. Preserve each failed run instead of replacing
it with a later success. Do not aggregate passing steps across code versions.

A later local Vite outage produced connection-refused login requests, not
credential rejection. The prescribed Vite process was restored; all three
entry routes and styled audit assets were reverified. I1/F1 completed and H1
was restored with fresh GetUserInfo and To Do selected. See the incident log.

Prioritize bounded validator feedback for invalid source references, non-JSON
row facts and invalid planning phases, then role/view-qualified knowledge,
read recovery/time budgets and prerequisite-based inline search/reset. Healthy
populated observations still produce inability-only answers. Correct retrieval
filenames and strict grounding do not prove business completion. No new manual
omission has been demonstrated; keep repairs generic and avoid a full re-scan.

The live Dashboard/Licensing acceptance on 6 September 2026 did not pass.
Generic Reader and gateway repairs, deployment hashes, version-separated
regressions, and remaining failures are recorded in
`doc/admin-portal-reader/improvement-2026-09-06/results.md` and its README.
Read those results before extending module coverage. The primary remaining
problems are execution plans, semantic fact binding, conversation scope, and
knowledge-answer grounding; do not assume additional scanning will fix them.
User-managed manual publication remains separate from this code repair.

## What This System Is

The project is a chat service for the live Admin Portal. It answers two
different kinds of questions:

- `general_knowledge`: stable guidance from the knowledge base only.
- `admin_portal_reader`: current, permission-scoped facts from the Admin
  Portal, interpreted with the knowledge-base user manual.

There are exactly these two runtime Skills. Dashboard, Licensing, and later
business areas are coverage areas, not Skills, routers, or business-specific
Tools. Their page meaning and control meaning belong in the knowledge base;
generic safety and reading behavior belong in code.

## Runtime Architecture

```text
Chatbot UI
  |
  v
DSH API / session runtime
  |  owns session, streaming, language, audit, and final concise response
  |
  +-- routes a current-portal question to admin_portal_reader
  |     |
  |     +-- GetUserInfo (mandatory first step; trusted current permissions)
  |     +-- knowledge.search (retrieves the relevant page-manual nodes)
  |     +-- Reader planner / reducer (LLM plus deterministic validators)
  |     +-- admin.portal.read (bounded, read-only observation/actions)
  |     |      |
  |     |      v
  |     |   Platform Gateway -> Admin Portal APIs / rendered page
  |     |
  |     +-- structured ReaderResult
  |
  +-- routes non-live guidance to general_knowledge
        |
        +-- knowledge.search

All runtime evidence, plans, Tool outcomes, and final result metadata
  -> PostgreSQL audit_record / session_event
```

### Main Chatbot Agent / DSH Runtime

The main runtime owns the conversation, but it does not directly interpret a
full Admin page. Its responsibilities are:

- authenticate the caller/principal and preserve the current UMC token only as
  an in-request credential;
- choose the fixed runtime capability, create `skill.route`, stream status and
  answer events, and persist session/audit events;
- pass a bounded, redacted previous intent to the Reader for elliptical
  follow-ups such as "show me the list";
- turn the Reader's bounded result into a concise response in the user's
  language; and
- never turn a partial page payload, a previous assistant assertion, or a
  guessed business mapping into a fact.

Relevant implementation: `backend/app/service.py`, `backend/app/skills.py`,
and `backend/app/llm.py`.

### `admin_portal_reader` Subagent

The Reader is the only runtime component that reasons over live portal state.
For every Reader turn it must:

1. Call `GetUserInfo` before any page work. It is the source of truth for the
   current role, department, data scope, page/subpage permission, and button
   permission.
2. Retrieve the relevant knowledge-base manual nodes itself.
3. Resolve the question's requested answer shape: `overview`, `count`,
   `list`, `attention`, `due`, `detail`, or `unspecified`.
4. Plan a small number of authorized reads, then obtain only the needed page
   evidence. The default hard limits are at most 3 pages, 12 actions, 90
   seconds, 20 facts, and bounded field sizes.
5. Reduce observations into an evidence-backed `ReaderResult`, using
   deterministic checks to prevent unsupported claims.
6. Return one of `success`, `no_data`, `no_permission`, `load_failed`, or
   `not_confirmed` along with a bounded `page`, `section`, `sourceSection`,
   `answerShape`, scope, facts, and missing evidence.

The Reader may only use `knowledge.search` and `admin.portal.read`. It must
not return full HTML, a full page, an unbounded table, tokens/cookies, or
irrelevant fields to the main runtime.

Relevant implementation: `backend/app/portal_reader.py` and
`backend/app/tool_gateway.py`.

### `admin.portal.read` Tool and Platform Gateway

`admin.portal.read` is a generic read-only capability, not a business Tool.
The Platform Gateway enforces the policy in code. It may navigate, query,
filter, paginate, switch a tab, and expand a detail when permission and
knowledge/evidence make the action safe. It rejects approval, submission,
modification, deletion, assignment, sending, exporting, uploading,
downloading, and other business mutations.

The Tool returns a bounded semantic observation rather than raw HTML. It is
also the boundary at which allowed Admin APIs are explicitly whitelisted.
Relevant implementation: `platform-gateway/app.py` and
`backend/app/portal_reader.py` (`ReadOnlyPortalPolicy`).

### Knowledge Base and Audit

The knowledge base supplies stable semantics: page/section purpose, control
meaning, expected answer source, role differences, scope, and distinctions
between similar regions. It must not store current counts, user data, secrets,
selectors, or answer templates.

The audit trail stores the technical chain needed to explain quality problems:
`skill.route`, knowledge retrieval, Reader planning, `reader.evidence`,
`reader.result`, Tool outcomes, and redacted LLM request/response metadata.
The user-facing answer should not narrate that chain. Inspect it in the
`/dsh-audit` UI when diagnosing a result.

## Evidence Policy: Hard Constraints and Light Guidance

The current design deliberately avoids a rigid "one question -> one fixed
page/tree" contract. A reliable answer may start on Dashboard and then read a
permitted Licensing page if that page is the better evidence source. This is
important as more modules are added.

Hard constraints that remain non-negotiable:

- `GetUserInfo` is obtained first for every Reader turn.
- Only read-only allowed actions are dispatched.
- Page and action permissions are enforced from the live permission context.
- A count/summary alone cannot prove individual rows or a detail.
- Returned facts must be directly supported by the bounded observation.
- A list with visible records must contain bounded row-level facts, not only
  headings or an overview count.
- Missing/ambiguous evidence produces `not_confirmed`, not an invented answer.

Light semantic signals that guide rather than block the Reader:

- heading, source section, selected tab/state, parent reference, and known
  manual semantics;
- a visible category control can be used on the current page when it exposes
  children;
- the Reader may instead navigate to another permitted, knowledge-supported
  page that exposes the requested records;
- duplicated semantic nodes, an omitted parent node, or a missing
  `selectedState` do not invalidate directly supported visible facts;
- a same-page duplicate `observe` is rejected, but a pure `observe` after
  moving to a different permitted page is valid because it establishes that
  page's evidence.

This balance is intentional: safety and factual grounding are strict; route
selection is allowed to be useful and adaptable rather than hardcoded.

## Dashboard and Licensing: Current Coverage

Dashboard and Licensing are the first coverage areas. They are documented in
the knowledge base and represented in the generic engineering artifacts:

- `doc/admin-portal-reader/module-contract.yaml`
- `doc/admin-portal-reader/regression.yaml`

They are not repository copies of business manuals and are not separate
runtime Skills.

The 6 September Licensing expansion inventory is recorded separately in
`doc/admin-portal-reader/licensing-coverage.yaml`. It includes Applications,
Profile Verification, Licenses, the combined Reports & Analytics page, and
manager-only Team Management. Four representative permission contexts were
checked serially. Reports contains export configuration forms, not an ordinary
readable report table. Scanning and generic code tests do not establish manual
publication or deployed Reader acceptance; those gates remain explicit in the
coverage artifact.

Expected answer-source behavior:

| Question shape | Typical authoritative evidence | Important restriction |
| --- | --- | --- |
| Dashboard workload overview or category count | Dashboard `My Tasks` category counts | Do not substitute attention rows or a Licensing list. |
| "What should I pay attention to?" | Dashboard `Needs Your Attention` rows/labels | Category counts and an overdue metric alone are insufficient. |
| "Show my Service Application tasks" | Bounded task rows, often on a permitted Licensing list page | A Dashboard category count proves quantity only. |
| Follow-up "show me the list" | Previous bounded intent plus fresh matching task rows | Do not repeat the old answer or rely only on its count. |
| Task detail | A uniquely identified visible task followed by an allowed detail read | Never guess a target record or use a sibling record. |

The current Dashboard implementation has been real-browser checked for the
two important paths: a Service Application list can move to the permitted
Licensing list and return concrete rows; an attention question uses Dashboard
attention rows and does not claim a unique priority when the page does not
mark one.

## Recent Quality Lesson and Current Working-Tree Changes

The reported failures were not mainly an LLM-model issue. The prior Reader
contract had become too strict about the semantic scan topology:

- Dashboard can expose duplicate `My Tasks` regions and a table/region pair
  with the same heading.
- Some scans omit a parent node while retaining an explicit empty-state table.
- A reasonable list answer could require moving from Dashboard to a permitted
  Licensing page, but the prior logic treated the current category control as
  the only legal next step.
- A pure observation after moving to a new page was incorrectly treated as a
  repeated observation.
- Correct table facts could be rejected when the LLM included structural
  column labels, while an LLM response that collapsed rows into prose could
  leave only headings in a list answer.

The current uncommitted changes address this generically, without adding
Dashboard/Licensing mappings in code:

- choose the narrower matching table when a region and table share a heading;
- accept equivalent duplicate evidence and a uniquely explicit empty table;
- make `parentRef` and `selectedState` helpful signals instead of required
  graph invariants;
- require child evidence for requested lists/details, while allowing a
  knowledge-supported cross-page read;
- permit a pure observation after navigation to a different permitted page;
- validate row facts against values and structural headers from the same row;
- require list output to retain a bounded fact per visible task row, with a
  row-level fallback if the model returns prose/headings only; and
- preserve only bounded previous intent (`question`, answer shape, verified
  page/section/state), never prior facts or page payloads.

Changed files currently include `backend/app/llm.py`,
`backend/app/portal_reader.py`, `backend/app/service.py`, focused Reader
tests, and `doc/admin-portal-reader/regression.yaml`. They are not committed
yet. Before further editing, inspect `git status` and the current diff rather
than assuming the last commit contains this behavior.

The shared backend suite passed after these changes:

```bash
PYTHONPATH=backend pytest -q backend/tests
# 441 passed (last verification)
```

## How to Deliver Coverage for One New or Improved Page

Use the installed `admin-portal-reader-expansion` Skill as the delivery
procedure. The following roles are engineering roles for a task; they are not
new runtime Agents or Skills.

| Role | Owns | Must not do |
| --- | --- | --- |
| Main agent | scope, integration, final acceptance, any knowledge deletion | delegate safety decisions or knowledge deletion |
| Page scanner | rendered page, semantic/accessibility structure, safe control effects, coverage matrix | make business writes or scan multiple accounts concurrently |
| Manual author | retrieval-friendly page-manual nodes from verified evidence | encode dynamic values, selectors, or runtime answer templates |
| Implementer | a minimal generic Reader change when a generic capability is missing | add module routes, business Tools, or hardcoded business labels |
| Verifier | independent contract, regression, browser, and answer-quality checks | receive the intended answer as its conclusion |

Delivery sequence:

1. Lock scope: routes, page regions, roles, answer shapes, included controls,
   explicit exclusions, and whether knowledge publication is authorized.
2. Reproduce the reported failure. For a targeted failure, scan only the
   affected boundary unless that cannot establish the cause.
3. Obtain `GetUserInfo`, then scan the page serially. Combine rendered view,
   semantic structure, safe interaction outcomes, and live permission context.
   Every visible control must be classified as `documented_readonly`,
   `documented_forbidden`, or `out_of_scope_with_reason`.
4. Write or correct the knowledge-base manual. It records stable business
   meaning, read-only controls, destinations, distinctions, scope, and empty
   states. Do not create a manual duplicate in this repository.
5. Change generic code only when the verified page needs a missing generic
   read action or demonstrates a generic safety/evidence defect. Do not
   hardcode a business label just to satisfy an example question.
6. Add a regression for the reported question and meaningful follow-ups. Test
   answer shape, selected evidence, permitted actions, identity continuity,
   and forbidden substitutes.
7. Run focused tests, then the shared Reader suite if shared code changed.
   Perform one real browser smoke for the user path. Account switching must be
   serialized; call `GetUserInfo` again after login.
8. Publish knowledge only when explicitly authorized. Merge into the complete
   existing manual source, validate it, upload, verify retrieval, and delete a
   superseded version only under the exact Skill safeguards.

Classify lessons at the end of each task:

- page-specific business/control meaning -> knowledge manual;
- demonstrated bad answer/interaction -> regression;
- generic read-only or evidence gap -> Reader code and generic contract;
- repeated process failure across pages -> propose a focused update to the
  expansion Skill;
- account/data/environment incident -> task report, not a runtime Skill.

## Local Environment and Verification

The sole Admin local entry is `http://localhost:18086`:

| Public route | Expected service |
| --- | --- |
| `/` | Admin Portal Vite server on `18086` |
| `/dsh-audit` | DSH frontend proxied from `127.0.0.1:18112` |
| `/swagger` | Admin Service Swagger proxied from `127.0.0.1:5207` |

Start the DSH stack from this repository with the local Admin PostgreSQL layer:

```bash
docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml up --build -d
```

Start the Admin Portal Vite proxy from the separately authorized portal
frontend repository:

```bash
cd /Users/thron/Documents/odt/umc/front/umc-admin-portal
npm run dev:daypop
```

Verify all three public routes individually. For `/dsh-audit`, a `200` alone
is not enough: open it in a browser, confirm `styles.css` and `app.js` are
served through the proxy, and confirm the intended styled layout after a hard
refresh. Do not bind the DSH frontend to `18086`.

The working database is Admin PostgreSQL at `127.0.0.1:15433/dsh` on the host
or `postgres:5432/dsh` in Compose, always with `UMC_PORTAL=admin`. The remote
Admin database is read-only and is not a normal development target. Never
touch the customer repository, customer services, or customer database.

## Suggested First Prompt for the Next Conversation

> Read `AGENTS.md` and `doc/admin-portal-reader-handoff.md` in the Admin DSH
> repository. Inspect the current uncommitted Reader diff before editing. Keep
> exactly the two generic runtime Skills, use `GetUserInfo` first for every
> live page question, preserve read-only enforcement and fact grounding, and
> treat page manuals as knowledge-base content rather than repository files.
> For the requested page, reproduce the actual question in audit/browser,
> diagnose whether the gap is manual, generic Reader behavior, or regression,
> then make the smallest generic change and verify it end to end.
