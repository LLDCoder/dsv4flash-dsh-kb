# UMC Admin Module Delivery Handover

## Status

Overall delivery progress is **80%**. This is a planning measure, not a claim
that every upstream Admin Portal endpoint is healthy: completed capabilities
are counted when their database-managed Skill, read-only Tool contract,
boundary, and available E2E evidence are in place. Endpoint failures and
authorized no-data roles remain explicitly open.

Completed workstreams:

1. Read-only Skills, Tool contracts, routing, knowledge entry points, and
   regression records for Licensing, Content, Inspection, Customer Happiness,
   Finance, CMS, Broadcast, Message Templates, Message Logs, Service
   Configuration, Service Categories, Service Reports and Analytics, and
   System Management.
2. Department Dashboard behavior: an unqualified request asks for a
   department; a qualified request invokes only that department's overview
   Tool and retains a declared date range on the follow-up turn.
3. Generic safeguards for Tool-only read boundaries, ordered list selection,
   date/status inheritance, hybrid record-plus-knowledge answers, and
   unverified response links.
4. Browser and audit-backed E2E evidence for available role fixtures. The
   detailed exceptions are kept in `doc/module-delivery-followups.md`.

## Current Checkpoint: Customer Management

The Customer Management database Skill has been hardened but is deliberately
not committed yet. The current working tree contains only these intended
changes for this checkpoint:

- `backend/app/service.py`: persist a minimal raw selection snapshot for an
  ordinal follow-up while keeping the LLM evidence masked. This is generic
  framework behavior, not a Customer Management hard-coded branch.
- `backend/tests/test_registry_and_routing.py`: unit coverage proving that a
  hidden internal identifier can support ordinal selection without appearing
  in the masked Tool result.
- `doc/modules/customer-management/module-contract.yaml` and
  `doc/modules/customer-management/regression.yaml`: module contract and
  regression matrix.

The direct test-database configuration update is also complete:

- Customer Management list and detail Tool masking policies now remove profile
  identifiers, names, account identifiers, contact data, document data, and
  other personal fields from LLM evidence.
- The Customer Profile list selection contract retains only its internal stable
  identifier in the DSH audit selection snapshot. It is not exposed in the
  generated answer.

Completed authenticated browser E2E evidence for the supplied Customer
Happiness Leader account:

1. `Show the latest 3 customer Profiles.` selected
   `admin_customer_management_reader`, called the profile-list Tool, produced
   three selection entries, and completed successfully.
2. `What about the third one?` called the detail Tool using the retained third
   selection. The displayed answer contains only profile type, approval state,
   active state, and registration timestamp. It does not contain a profile ID,
   profile number, name, contact details, or credential/document values.

The one remaining Customer Management regression is a new-conversation write
boundary prompt. It must confirm refusal and zero Admin Portal Tool calls for
an activation/export request before the checkpoint is committed.

## Remaining Work, In Order

1. Finish Customer Management: run the write-boundary E2E, rerun the backend
   unit suite, run `git diff --check`, commit only the four intended files, and
   push `admin-portal`.
2. Normalize Licensing: add its standard
   `doc/modules/licensing/module-contract.yaml` and `regression.yaml` beside
   the existing historical regression record; rerun its two historically
   incomplete cases with the Licensing role and distinguish a fixture/endpoint
   block from a routing defect.
3. Module closure audit: compare each module contract against its enabled
   database Skill and published Tools. Re-run only the missing declared cases,
   not already-passing paths. Add an explicit follow-up ledger row for every
   no-data role, `502`, or `403/Forbidden` source endpoint.
4. Dashboard final phase: compare the visible module scope of the supplied
   roles, then implement only compatible cross-module aggregation. Do not
   aggregate Content until its source-defined overview endpoint is authorized
   and healthy.
5. Final release pass: check that no enabled business Skill allows a write Tool,
   execute the targeted multi-turn E2E suite, and prepare the final commit and
   push report. Load testing remains out of scope.

## Known External Or Fixture Blocks

Do not implement workarounds for these by using screen-rendered values or
invented data:

- Content Dashboard overview returns `Forbidden` or `502` for its supplied
  source-defined request.
- Service Categories list, Message Log list, and System security-log source
  endpoints return `502`.
- Customer Happiness Enquiry has an authorized empty API result for the tested
  roles even when the page renders rows; the API remains authoritative.
- Some valid role/module combinations have no records. Preserve the no-data
  result as a successful authorized outcome.

See `doc/module-delivery-followups.md` for evidence IDs and detailed handling.

## Service Recovery And Verification

The currently expected stack is Admin Portal `18086`, DSH backend `8001`, DSH
audit frontend `18112`, and Admin API `5207`. The backend has already been
rebuilt after the current framework change and reports healthy.

Use the documented Admin stack procedure when a code change requires it:

```bash
docker compose --env-file '/Users/thron/Downloads/77 Admin DSH.env' \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml up --build -d
```

For direct database Skill or Tool updates, invalidate the catalog cache rather
than restarting the runtime:

```bash
docker exec dsh-admin-local-redis-1 redis-cli DEL dsh:skills:catalog:system:v2
```

Run the relevant listener/proxy checks in `LOCAL_ADMIN_STARTUP.md` before
browser E2E. Never include test credentials, bearer tokens, user IDs, tenant
IDs, or record identifiers in docs, commits, terminal output, or responses.

## Resume Instructions

Resume from `/Users/thron/Documents/odt/admin-dsv4flash-dsh-kb` on branch
`admin-portal`. Keep unrelated working-tree changes untouched. Before editing,
read the existing module-delivery follow-up ledger and use the authenticated
browser account only for read-only Portal actions. DSH conversation and audit
writes are allowed; Admin Portal business writes are not.
