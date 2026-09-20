# KB-only deployment

This deployment profile keeps the DSH conversation layer and the read-only
knowledge tools while removing OCR, UMC Portal, Platform Gateway, and local
GPU services. It is isolated under the `dsh-kb-only` Compose project with
dedicated PostgreSQL and Redis volumes.

## Files changed

- `backend/app/config.py`: adds `KB_ONLY_MODE`.
- `backend/app/tool_registry.py`: hides OCR and UMC/Platform system tools in
  KB-only mode.
- `backend/app/db.py`: seeds only Skills bound exclusively to
  `knowledge.search` and removes persisted non-KB tools/Skills in a new
  KB-only database.
- `docker-compose.kb-only.yml`: minimal five-service deployment.
- `.env.kb-only.example`: deployment variables and existing KB upstream.

## Deployment shape

The profile runs PostgreSQL, Redis, Knowledge Gateway, Backend, and Frontend.
The upstream knowledge service remains external; no knowledge files are
uploaded, parsed, indexed, or modified by this DSH profile. On the current
43.165.4.209 host, the existing `mailgraph-kb-api` is reached at port `18001`
with the `/api/knowledge` path prefix.

Copy `.env.kb-only.example` to `.env.kb-only`, fill in the PostgreSQL and LLM
secrets, then run:

```bash
docker compose --env-file .env.kb-only -f docker-compose.kb-only.yml up -d --build
```

The backend is bound to `127.0.0.1:19086` and the frontend to
`127.0.0.1:19087` by default so an existing Nginx can terminate HTTPS and
proxy the UI/API without conflicting with the existing services.
