# Isolated77 knowledge full-text repair

Only the isolated Admin stack at 18281 is changed; original 18081 and all UMC
business services remain untouched. No business mutations are exercised.

## Root cause and contract

`KnowledgeGatewayClient.document()` called `GET /files/{file_id}/content`, but
gateway v0.3.0 did not register that route. Its configured upstream is the
existing `mailgraph-43clone-proxy:8080/api/knowledge`, whose inspected OpenAPI
has metadata/search routes but no full-text or download route. A filename in a
manifest or search snippet is not a verified complete source.

Gateway v0.4.0 adds the internal GET route. It requires the operator-configured
root folder, checks unique file membership in fresh recursive manifests before
and after reading, accepts ready UTF-8 `.md`/`.txt`/`.json` files up to 1 MiB,
and verifies exact bytes against manifest size and SHA-256. Only digest-derived
paths under a read-only mounted object root are used. Source URLs/storage paths
are never followed; this is not an arbitrary download proxy or a business API.
Existing upstream identity and folder authorization are retained. No upstream
service or access-control configuration is modified.

The isolated deployment mounts only the two requested document objects, read-only:

| Source | Bytes | SHA-256 |
| --- | ---: | --- |
| Inspection-Admin-User-Manual-v4.md | 35669 | 8c4642b0bce6e9b2ee5609006fe046ece415979db0f6b30914a17e2109f76f14 |
| 02-09-inspection-and-field-enforcement.md | 9404 | 95d912da18d5ab89823fc8a35e9564580d6591dfaac5803ee09e5e4043ff442d |

Unconfigured scope/missing mounted object returns explicit 503; wrong root403,
missing/ambiguous scoped file404, changed manifest409, unsupported input422,
integrity/upstream error502. The internal gateway OpenAPI documents this
contract. Existing external DSH Swagger v1.1.3 describes the internal capability
and limitations under conversation message submission; no public file endpoint
or frontend is added.

## Source findings and limits

The manual's full394 lines explicitly exclude detailed execution workflows.
The engineering guide's full229 lines include pre-visit context and a sequence
outline, but its step9 submit-report -> step10 checkout conflicts with the local
Admin backend (checkout must precede report) and frontend (await checkout, then
submitPreparedReport). No write operation was used to validate running UMC
behavior. Local source is not proof of the deployed UMC build or an approved SOP.
Neither complete document supplies an approved formal materials inventory.
35 checklist catalog points and UI tool hints are not that inventory.

This repairs complete source acquisition; it does not automatically promote
Markdown reference documents into trusted navigation JSON packages or a formal
business policy. Those contracts and source gaps remain explicit.

An observed existing route alias gap is also repaired: semantic filters using
`inspection case identifier` now retain the exact inspection read, like `task
identifier`. Unknown extra filters, history, non-read requests and permission
checks continue to fail closed. The original failed browser sample is retained
in private evidence alongside the final EN/AR original/rephrased samples.

## Timing, verification and rollback

UTC/monotonic spans split manifest-before, object-read overall, filesystem read,
size/SHA-256 verification, UTF-8 decode and manifest-after. Every provider/DSH
HTTP attempt is recorded without text, token or storage path. Inclusive parents
and parallel branches must not be summed. UMC internal SQL/domain times remain
unavailable. Standalone full-document probe times are not added to chat turns.

57 focused tests pass; full regression2079 pass,129 fail,3 collection errors,
same failure identities as the preserved previous baseline,18 new passes.
`verification/knowledge-fulltext-tests.json` records the comparison.

Deployment script `scripts/enable_stage_knowledge_fulltext.py` retains the old
isolated knowledge container stopped and saves its inspect record privately.
Rollback must first restore the prior source360041f to isolated mounted source
paths (the stopped container shares those paths), then remove only the new
isolated knowledge container, restore the old name/networks and start it; restore
and restart the isolated backend too if rolling back the case alias/API docs.
Do not run the initial full-stack creation script, reset the isolated database,
or change original18081 as a rollback shortcut.
