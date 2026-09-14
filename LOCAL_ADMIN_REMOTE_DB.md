# Local Admin DSH with the existing internal database

This deployment was explicitly requested on 2026-09-14 and overrides the
local-copy database defaults in AGENTS.md for this environment only.

- Repository is next to `ff-ai-platform-old`, in `admin-dsv4flash-dsh-kb`.
- Source branch: `codex/reader-answer-formatting`.
- Audit console: http://localhost:18112/
- Backend Swagger: http://localhost:8001/docs
- OpenAPI: http://localhost:8001/openapi.json
- Existing Admin database: `10.255.1.157:15432/dsh_admin_import_20260907_040500`.

Use the authorized credentials in ignored `.env.admin.remote.local`. Never
commit that file or copy customer runtime settings. No local Postgres is started.
The database must already contain the current schema and console configuration.
`DATABASE_INIT_ENABLED=false` skips schema creation and builtin Skill seeding;
`AUDIT_CLEANUP_ENABLED=false` disables this instance's scheduled audit deletion.
Both controls default to true in other deployments and require a restart.
Existing operator configuration is still loaded. Normal interactions share
conversation/configuration data with the remote Admin instance; use disposable
local data instead when developing migrations or destructive behavior.

Start or rebuild:

The knowledge API is bound to the remote server loopback. First run
`sh scripts/start-local-knowledge-tunnel.sh` in a separate terminal and keep it
running (SSH authentication required). It forwards only localhost:18002 to
the existing remote knowledge API on localhost:18001. The local knowledge
gateway uses `host.docker.internal:18002/api/knowledge`. Restart the tunnel
after a computer/network restart; no server firewall or service is changed.

```sh
bash scripts/build-admin-local.sh
docker compose --env-file .env.admin.remote.local -f docker-compose.admin.remote.yml up -d --no-build
```

Stop only this stack:

```sh
docker compose --env-file .env.admin.remote.local -f docker-compose.admin.remote.yml down
```

Backend source is mounted with reload. Gateway/frontend changes require rebuild.
The build helper omits AppleDouble metadata and xattrs from its tar stream,
so edits on an external Mac volume do not break subsequent Docker builds.
For a single service, use `bash scripts/build-admin-local.sh frontend`.
The local knowledge gateway also requires `KNOWLEDGE_GATEWAY_AUTH` from the
authorized MailGraph runtime in the ignored env file. It sends this only to
the configured knowledge upstream; anonymous deployments retain their current
behavior when the credential is absent. Do not print or commit the credential.
On 2026-09-14 the user explicitly authorized the local gateway to use the existing
MailGraph service context: tenant `internal-knowledge-gateway`, subject
`knowledge-gateway`, role `system_admin`, for the existing read/search routes.
The Compose file configures these values; the gateway sends them only when the
service credential is present. This context may read across user-specific
knowledge scopes. It does not change business Portal permissions or server ACLs.
After modifications, verify locally, commit and push the intended branch, then
pull that branch on the server and use its existing production deployment setup.
Do not use the local remote-DB Compose file for production. Local Docker Desktop
and access to the internal network are required.
