# Local deployment verification — 2026-09-14

Source: `codex/reader-answer-formatting`, upstream base `8d7b642`.
All checks below targeted the local `admin-dsh-local` stack unless noted.

| Check | Result |
| --- | --- |
| Backend regression suite, isolated container without runtime credentials | 1,841 passed |
| Knowledge gateway credential/anonymous/health/request-ID tests | 4 passed |
| Actual internal Admin database identity | Passed |
| Configuration and Skill fingerprints before/after startup | Unchanged, 2 rows each |
| Shared database initialization and audit cleanup disabled | Passed |
| Local frontend HTML, JS, CSS, no-store headers | HTTP 200, passed |
| Missing CSS returns 404 rather than HTML | Passed |
| Browser-rendered login layout | Passed |
| Invalid console password / valid existing console password | 401 / 200 |
| Authenticated config and Skill reads, logout | Passed |
| Backend Swagger and OpenAPI | HTTP 200 |
| Portal gateway health | HTTP 200 |
| Existing model completion endpoint | HTTP 200, nonempty choices |
| Knowledge folders / search | Blocked; see below |

The existing remote Admin knowledge gateway also returns an upstream 403.
The local gateway now supports the authorized MailGraph service credential,
but the upstream additionally requires its service role context. The remaining
response is `MailGraph role context is incomplete`. Automatic approval review
rejected activating `system_admin` identity headers without explicit user
authorization. Those headers have not been added or activated; do not describe
knowledge retrieval or full business chat as verified yet.

No production service was redeployed. No database initialization, Skill reseeding,
manual duplication, or audit cleanup was performed. The user workflow is local
modification/testing, commit/push, then an explicitly requested server deployment.
The active knowledge SSH tunnel must be restarted after host/network restarts.

Regression command: run `python -m pytest backend/tests -q -p no:cacheprovider`
inside the backend image with a credential-free source snapshot and pytest.
Gateway tests: `python -m unittest test_gateway_auth -v` inside the gateway image
with `knowledge-gateway/test_gateway_auth.py` mounted at `/app/test_gateway_auth.py`.
