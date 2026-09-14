# Local deployment verification — 2026-09-14

Source: `codex/reader-answer-formatting`, upstream base `8d7b642`.
All checks below targeted the local `admin-dsh-local` stack unless noted.

| Check | Result |
| --- | --- |
| Backend regression suite, isolated container without runtime credentials | 1,841 passed in initial deployment; backend unchanged in the service-context follow-up |
| Knowledge gateway credential/context/anonymous/health/request-ID/HTTP forwarding tests | 6 passed |
| Actual internal Admin database identity | Passed |
| Configuration and Skill fingerprints before/after startup | Unchanged, 2 rows each |
| Shared database initialization and audit cleanup disabled | Passed |
| Local frontend HTML, JS, CSS, no-store headers | HTTP 200, passed |
| Missing CSS returns 404 rather than HTML | Passed |
| Browser-rendered login layout | Passed |
| Invalid console password / valid existing console password | 401 / 200 |
| Authenticated config and Skill reads, logout | Passed |
| Backend and knowledge gateway Swagger/OpenAPI | HTTP 200; service identity documented in gateway schema |
| Portal gateway health | HTTP 200 |
| Existing model completion endpoint | HTTP 200, nonempty choices |
| Knowledge folders / search | HTTP 200, passed |
| Content knowledge query | HTTP 200, 3 chunks, degraded=false |
| Inspection knowledge query | HTTP 200, 3 chunks, degraded=false |
| Customer Happiness knowledge query | HTTP 200, 3 chunks, degraded=false |

The user explicitly authorized the existing MailGraph service identity on
2026-09-14. The local gateway now sends its configured tenant, subject and role
only when the service credential is present. This resolves the prior
`MailGraph role context is incomplete` response. The live checks above use the
configured Admin knowledge folder and request at most three chunks per query.
All three queries returned nonempty results without retrieval degradation.
This is deployment and retrieval verification, not a new full-account business
question/answer acceptance run.

No production service was redeployed. No database initialization, Skill reseeding,
manual duplication, or audit cleanup was performed. The user workflow is local
modification/testing, commit/push, then an explicitly requested server deployment.
The active knowledge SSH tunnel must be restarted after host/network restarts.

Regression command: run `python -m pytest backend/tests -q -p no:cacheprovider`
inside the backend image with a credential-free source snapshot and pytest.
Gateway tests: `python -m unittest test_gateway_auth -v` inside the gateway image
with `knowledge-gateway/test_gateway_auth.py` mounted at `/app/test_gateway_auth.py`.
