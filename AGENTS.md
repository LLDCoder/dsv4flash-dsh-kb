# Admin DSH Repository Rules

## Admin System Locations

- Admin DSH code: `/Users/thron/Documents/odt/admin-dsv4flash-dsh-kb`
- Admin Portal frontend: `/Users/thron/Documents/odt/umc/front/umc-admin-portal`
- Admin Portal backend: `/Users/thron/Documents/odt/umc/backend/adminportalservice`
- Admin DSH local working database: PostgreSQL 18 at `127.0.0.1:15433/dsh` on the host, or `postgres:5432/dsh` from the Admin Compose network, with `UMC_PORTAL=admin`
- Admin DSH remote database copy source: `10.255.1.157:15432/dsh` with `UMC_PORTAL=admin`; treat it as read-only and use it only when explicitly refreshing the local database copy
- Admin Portal URL: `https://umc-adminportal.sol.daypop.ai`
- Do not infer database credentials from this document. Obtain connection credentials only from the authorized runtime configuration.

## Local Admin Entry Point

`http://localhost:18086` is owned by the Admin Portal Vite development server. It is the single local entry point; do not publish the Admin DSH frontend on this port.

| Public path | Required target | Purpose |
| --- | --- | --- |
| `/` | Admin Portal Vite application on `18086` | Admin Portal |
| `/dsh-audit` | Admin DSH frontend on `127.0.0.1:18112` | Admin DSH audit interface |
| `/swagger` | Admin Service on `127.0.0.1:5207` | Admin Service Swagger UI |

- The Admin Portal proxy configuration is `/Users/thron/Documents/odt/umc/front/umc-admin-portal/.env.daypopdevelopment.local` and its Vite configuration. Its expected targets are DSH API `8001`, DSH frontend `18112`, Admin Service Swagger `5207`, and Portal Vite `18086`.
- The Admin DSH Compose override `docker-compose.admin.local.yml` owns `8001` (backend) and `18112` (frontend). Do not bind the DSH frontend to `18086`.
- Keep `.env.lite` unchanged as the protected remote-runtime configuration. For normal Admin development, layer `.env.admin.postgres18.local` after `.env.lite`; the second file must resolve the backend database to `postgres:5432/dsh`.
- Do not substitute another local Swagger port for `5207`. Confirm the Admin Service is listening on `5207` before testing `/swagger`.
- Start the Admin Portal proxy from `/Users/thron/Documents/odt/umc/front/umc-admin-portal` with `npm run dev:daypop`. Start or recreate the Admin DSH stack from this repository using `.env.lite` followed by `.env.admin.postgres18.local`, together with `docker-compose.lite.yml` and `docker-compose.admin.local.yml`. Do not start the normal development backend against the remote Admin database.
- After startup, verify `http://localhost:18086/`, `http://localhost:18086/dsh-audit`, and `http://localhost:18086/swagger` individually. All three routes must be reachable before declaring the environment ready.
- A `200` response alone is insufficient for `/dsh-audit`. Open `http://localhost:18086/dsh-audit/` in a browser and verify that `styles.css` and `app.js` are served through the proxy, the stylesheet has nonzero CSS rules, and the console uses its intended layout rather than unstyled HTML.
- When changing DSH routing, Nginx static asset handling, or `frontend/index.html`, update the CSS and JS cache-version query values together. CSS/JS paths must return their asset or `404`, never the SPA HTML fallback, otherwise browsers can cache an HTML response as a stylesheet and make the audit page appear duplicated or unstyled.
- The DSH entry HTML and its CSS/JS must use `Cache-Control: no-store` in the local proxy environment. After changing routing or static assets, perform one browser hard refresh before visual QA so an old cached `index.html` cannot continue referencing an obsolete asset pair.

## Admin Portal Reader Architecture

- The current Admin architecture has exactly two Skills: `general_knowledge` and `admin_portal_reader`.
- Do not use the legacy module-by-module Skill delivery approach for this work. In particular, do not create or expand Dashboard, Licensing, or other business-domain Skills or business-specific page Tools.
- The generic `admin_portal_reader` may use only `knowledge.search` and the read-only `admin.portal.read` Tool. `GetUserInfo` is the runtime source of truth for the current user's role, department, page permissions, subpage permissions, button permissions, and data scope.
- `admin.portal.read` must enforce read-only behavior in code. It may navigate, query, filter, paginate, switch tabs, and expand details. It must reject approval, submission, modification, deletion, assignment, sending, export, upload, download, and every other business mutation.
- Dashboard and Licensing are the first knowledge and regression coverage areas, not separate runtime Skills. Their user manuals live only in the knowledge base; do not add a duplicate manual to the repository.
- Keep one generic `module-contract.yaml` and one corresponding `regression.yaml` for the portal-reader capability. These files describe engineering behavior and tests, not page manuals.
- The reader Subagent must obtain `GetUserInfo` before page work, retrieve relevant knowledge itself, visit only pages needed for the question, and return a bounded structured result that distinguishes `success`, `no_data`, `no_permission`, `load_failed`, and `not_confirmed`.
- Do not pass full HTML, full pages, complete tables, irrelevant fields, credentials, cookies, or tokens back to the main Agent. Technical evidence belongs in the existing audit trail; user-facing answers are concise natural language.
- Do not retain module-level Skills or their runtime routing as a compatibility layer. Recovery comes from Git history and the read-only remote database snapshot, not from keeping two architectures active in the local runtime.
- Admin Portal authentication is currently observed to synchronize across browser task spaces. Do not perform concurrent multi-account login scans unless session isolation has been independently proven. Serialize account switching and re-check `GetUserInfo` after every login.

## Scope Boundary

- This repository is the admin DSH project. Work only within `/Users/thron/Documents/odt/admin-dsv4flash-dsh-kb` unless the user explicitly authorizes another target.
- Do not read, edit, run, restart, or otherwise operate the customer DSH repository at `/Users/thron/Documents/odt/dsv4flash-dsh-kb`.
- Do not read, write, query, migrate, restore, or delete data in the customer DSH database. The customer runtime uses `10.255.1.157:5432/dsh` with `UMC_PORTAL=customer`.
- Admin DSH development and configuration writes use the local PostgreSQL 18 database at `127.0.0.1:15433/dsh` (host) or `postgres:5432/dsh` (Admin Compose network), with `UMC_PORTAL=admin`. Before every database write, verify this local target, database name, and portal mode.
- The remote Admin database at `10.255.1.157:15432/dsh` is a read-only copy source. Do not migrate it, synchronize configuration to it, or perform any other write without a new, explicit user authorization that names the remote Admin target.
- If a task could involve customer code, customer services, or the customer database, explain the impact and wait for explicit user authorization before taking any action.

## Git Safety

- Do not push, create or update pull requests, change remote branches, tags, or remote configuration without explicit user authorization.
- Read-only Git commands are allowed when needed for the current task.
