# Inspection Arabic status and document availability (isolated77)

Backend API version 1.1.4; knowledge gateway 0.4.1. The original18081 deployment and UMC business services remain unchanged.

## Arabic status publication

`inspection_public` emits an app-owned status receipt only after the native exact task and detail identity have been verified. `normalize_inspection_status` uses the six existing Admin Portal Arabic labels. For example, Pending Visit is `بانتظار الزيارة`, rather than the previously observed `قيد الزيارة`.

The normalizer runs before streamed paragraphs are published and before ordinary language/fact guards. It is idempotent for cumulative streams, preserves the English source status and task identity, skips checklist-code lines, and only consumes exact known status translations. Unknown parenthetical facts and numbers remain available to the ordinary validator. Denied, unverified and unrelated workflows are unchanged. Each pass emits `answer.inspection_status_locale` with a changed flag and label-map version, without task identity or answer content.

## Inspection knowledge objects

`scripts/enable_stage_inspection_documents.py` is a one-shot isolated77 deployment helper. It verifies nine discovered file records in the existing authorized root. They resolve to eight unique SHA256 objects (the two PRDv3 records share one body). Every object is mounted separately read-only. The six remaining inspection records that previously returned503, plus the Admin API reference, now support full-content reads. The two previously supported records remain available.

The helper retains existing upstream identity, scopes, source root, networks and environment; saves the stopped container and a private configuration snapshot; verifies container readiness before testing; and checks protected service IDs/start times. It does not mount the entire object store or modify original knowledge files. Other unmounted documents still return503. Runtime configuration and source documents must not be committed.

Rollback requires both the saved container configuration and the matching previous source revision: source mounts are shared paths, so merely restarting a saved container does not restore old code. Preserve the isolated PostgreSQL container and its tmpfs database throughout rollback.

## Source limitations

The complete inspection manual explicitly excludes detailed execution. The engineering guide lists submit-report before checkout, whereas the local backend requires checkout first and the local frontend awaits checkout before submitting. Report/dashboard PRDs describe In Progress at check-in and Completed at checkout; local code enters In Progress at start-visit and marks Completed at submit-report. These conflicts are retained; the deployed UMC build and approved business SOP have not been verified by write operations.

The local field-inspection submit validator requires contact information plus an Emirates-ID attachment; a signed declaration requires a signature image, while refusal requires a reason. These are source-code submission requirements, not an approved pre-visit materials inventory. Seized Materials in report documents means confiscated items, not items to bring. No approved formal materials inventory or complete runtime-matched SOP was established from the inspected sources. A fresh permitted task-detail GET found no candidate materials/procedure fields and zero attachments; this observation is limited to that task and that response.

## Verification and timing

Focused checks:75 passed. Full suite:2097 passed,129 failed,3 collection errors; failure/error identities match the previous2079-pass baseline, with18 additional passing tests. See `verification/inspection-documents-tests.json`. Existing failures remain unresolved and are not reported as a green suite.

Isolated browser acceptance covers status and preparation questions in English and Arabic, original and rewritten phrasing. Private receipts retain question/answer, timestamped stages, each DSH/UMC/knowledge/model HTTP attempt, component fingerprints and browser screenshots. Document/source probes are measured independently and must not be added to chat totals. UMC client round-trip time includes network/proxy time; UMC authentication/domain/SQL internals remain uninstrumented. Parent and concurrent spans are inclusive and must not be summed.

Swagger: `http://10.255.1.157:18281/dsh-api/docs`. No business write endpoint is used during acceptance.
