# Basic Manual Post-Upload Retrieval Verification

Date: 2026-09-06. User reports the four v1 manuals uploaded and requests
verification. This batch verifies retrieval; it is not the unexecuted 20-group,
60-step business-answer acceptance run.

## Scope

Customer Happiness, Content, Inspection, and Finance v1 manuals, with bounded
Dashboard/Licensing v3 retrieval samples. Knowledge upload and version management
remain user-owned. No manual replacement, knowledge mutation, business-document
download/export, portal mutation, or customer-system access is authorized.

The complete reference manuals remain at the user-authorized external path
`/Users/thron/Downloads/admin-portal-reader-kb/`. This directory stores engineering
evidence only, not duplicate manuals or full retrieved chunks.

## Execution and Review

- Sol verifier: execute sequential read-only knowledge probes and record bounded
  source/version, node, authored role-condition, ranking, and projection evidence.
- Main agent: review business distinctions, classify root causes, and decide
  whether retrieval is sufficient to begin representative live conversations.
- Natural-language probes and explicit node/role diagnostic probes are reported
  separately. An anchored diagnostic success does not prove ordinary recall.
- Check both gateway results and the deployed Reader's `project_knowledge_result`
  output. A matching raw chunk outside the retained projection is not available
  to the Reader planner.
- Authored role conditions and synthetic retrieval contexts are not fresh
  `GetUserInfo` evidence. Actual page permissions and live outcomes remain
  unverified until an authenticated Reader run.
- Preserve failures and retries separately; do not select the best individual
  results to imply a passing continuous conversation or stable recall rate.

## Verified Local Baseline

Read-only environment checks found the running backend configured for
`postgres:5432/dsh`, `UMC_PORTAL=admin`, and the internal knowledge gateway at
`http://knowledge-gateway:8101`. No database writes or migrations were performed
by these checks. The verifier checked database configuration overrides before
the probes: the knowledge folder, gateway URL, and requested top-k use the
environment/default values. Their nonsecret values are in `probe-evidence.json`.

The following deployed hashes were checked directly against the running local
containers and match the preceding final repair record:

| Component | Deployed SHA-256 |
| --- | --- |
| backend/app/portal_reader.py | 31c02b99542db632f1b061d25d124496e3be954358474249c1df8d0457c0b208 |
| backend/app/llm.py | f5cd980854f220fa77718302f15e83a9756581ada55f81f6eba11970b283b30f |
| backend/app/service.py | 778c9b7f111f1730a731eae8ba4fce0cd0dc9a793dc51b73e7f8f1e6944cfc03 |
| platform-gateway/app.py | f176ab7194a2ea86a0d3d271ee9237c67f186b21b8f88a2a57a179df88c3beb4 |

Knowledge search uses the existing anonymous public knowledge contract through
the configured local gateway. It needs no browser login or account switching.
Only browser task-space metadata was inspected; no task space was created or
claimed and no business page was read during the environment preflight.

## Completion Gates

1. The deployed retrieval response identifies each uploaded v1 source and
   contains representative content matching the authorized local source.
2. Required business nodes and their role, layout, permission, and scope
   restrictions survive the Reader projection for the tested questions.
3. Failures distinguish missing manual content, upstream retrieval/ranking,
   Reader projection, and untested Reader understanding/action/answer behavior.
4. Live business-answer acceptance is explicitly separate. Available business
   results answered only with an inability to confirm are not a passing result.

See `probe-evidence.json` for the 17 bounded probe records and the main-agent
`results.md` for the final status. The previously dirty runtime code and previous
acceptance records were preserved.
