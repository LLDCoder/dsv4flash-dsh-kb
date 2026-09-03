# Local Admin Portal Startup

This guide starts the local Admin Portal entry point at `http://localhost:18086`.
The portal proxies the Admin DSH audit console and the Admin API Swagger UI, so
all three services must be available for the complete local experience.

## Service Map

| Public URL | Local target | Owner |
| --- | --- | --- |
| `http://localhost:18086/` | Vite on `18086` | Admin Portal frontend |
| `http://localhost:18086/dsh-audit/` | `127.0.0.1:18112` | Admin DSH frontend |
| `http://localhost:18086/swagger` | `127.0.0.1:5207` | Admin Portal API |
| `http://localhost:18086/dsh-api/` | `127.0.0.1:8001` | Admin DSH backend |

Do not publish the DSH frontend directly on `18086`. That port belongs only to
the Admin Portal Vite process.

## Quick Recovery

Use this when the DSH services and Admin API are already listening, but the
`18086` proxy has stopped.

```bash
cd /Users/thron/Documents/odt/umc/front/umc-admin-portal
npm run dev:daypop
```

Keep the command running. Vite should print `http://localhost:18086/` when it
is ready.

## Full Startup

Start the services in this order.

### 1. Admin DSH backend and audit frontend

Use the authorized, untracked Admin DSH environment file. It must target the
Admin database and include the required remote database settings. Do not use a
Customer DSH environment file.

```bash
cd /Users/thron/Documents/odt/admin-dsv4flash-dsh-kb
docker compose --env-file /absolute/path/to/admin-dsh.env \
  -f docker-compose.lite.yml \
  -f docker-compose.admin.local.yml \
  up --build -d
```

This compose combination publishes the DSH backend on `8001` and the audit
frontend on `18112`.

### 2. Admin Portal API Swagger UI

The portal proxy expects the Admin API on `5207`. Its default launch profile
uses another port, so set `ASPNETCORE_URLS` explicitly. `SwaggerOnly=true`
matches the local proxy use case.

```bash
cd /Users/thron/Documents/odt/umc/backend/adminportalservice
ASPNETCORE_URLS=http://127.0.0.1:5207 \
  dotnet run --project UMC.AdminPortal.API -- \
  --SwaggerOnly=true --Swagger:Enabled=true
```

### 3. Admin Portal proxy

```bash
cd /Users/thron/Documents/odt/umc/front/umc-admin-portal
npm run dev:daypop
```

The local environment file configures these targets:

```text
VITE_DEV_SERVER_PORT=18086
VITE_DSH_PROXY_TARGET=http://127.0.0.1:8001
VITE_DSH_CONSOLE_PROXY_TARGET=http://127.0.0.1:18112
VITE_ADMIN_SWAGGER_PROXY_TARGET=http://127.0.0.1:5207
```

## Verification

Confirm that all local listeners are present:

```bash
lsof -nP -iTCP -sTCP:LISTEN | rg '(:18086|:8001|:18112|:5207)'
```

Then verify the public proxy routes:

```bash
curl -sS -o /dev/null -w 'portal: %{http_code}\n' http://localhost:18086/
curl -sS -o /dev/null -w 'audit: %{http_code}\n' http://localhost:18086/dsh-audit/
curl -sS -L -o /dev/null -w 'swagger: %{http_code}\n' http://localhost:18086/swagger
```

Expected results are `200` for all three. The initial `/swagger` request may
redirect to `/swagger/index.html` before returning `200`.

For the audit console, also open `http://localhost:18086/dsh-audit/` and
confirm it is styled. Its `styles.css` and `app.js` requests must be served
through the `18086` proxy as CSS and JavaScript, not as an HTML fallback.

## Common Failures

| Symptom | Check | Resolution |
| --- | --- | --- |
| Nothing listens on `18086` | `lsof -nP -iTCP:18086 -sTCP:LISTEN` | Start `npm run dev:daypop` from the Admin Portal frontend. |
| Audit route returns `502` | Check `8001` and `18112` listeners | Start the Admin DSH compose stack with the authorized Admin environment file. |
| Swagger route returns `502` | Check `5207` listener | Start the Admin API with `ASPNETCORE_URLS=http://127.0.0.1:5207`. |
| Compose asks for `POSTGRES_USER` or `POSTGRES_PASSWORD` | Inspect the specified Admin environment file | Supply the authorized Admin DSH environment file; do not add credentials to version control. |
| Audit page has no styling | Inspect `/dsh-audit/styles.css` and `/dsh-audit/app.js` response headers | Ensure the proxy targets `18112`; hard refresh once after routing or asset changes. |

## Shutdown

Stop Vite with `Ctrl+C` in its terminal. To stop the Admin DSH containers, use
the same compose files and environment file used to start them:

```bash
docker compose --env-file /absolute/path/to/admin-dsh.env \
  -f docker-compose.lite.yml \
  -f docker-compose.admin.local.yml \
  down
```

Stop the Admin API with `Ctrl+C` in its terminal.
