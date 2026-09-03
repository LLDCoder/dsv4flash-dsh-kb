# Admin DSH Repository Rules

## Admin System Locations

- Admin DSH code: `/Users/thron/Documents/odt/admin-dsv4flash-dsh-kb`
- Admin Portal frontend: `/Users/thron/Documents/odt/umc/front/umc-admin-portal`
- Admin Portal backend: `/Users/thron/Documents/odt/umc/backend/adminportalservice`
- Admin DSH database: `10.255.1.157:15432/dsh` with `UMC_PORTAL=admin`
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
- Do not substitute another local Swagger port for `5207`. Confirm the Admin Service is listening on `5207` before testing `/swagger`.
- Start the Admin Portal proxy from `/Users/thron/Documents/odt/umc/front/umc-admin-portal` with `npm run dev:daypop`. Start or recreate the Admin DSH stack from this repository using the authorized Admin DSH runtime configuration and `docker-compose.lite.yml` plus `docker-compose.admin.local.yml`.
- After startup, verify `http://localhost:18086/`, `http://localhost:18086/dsh-audit`, and `http://localhost:18086/swagger` individually. All three routes must be reachable before declaring the environment ready.
- A `200` response alone is insufficient for `/dsh-audit`. Open `http://localhost:18086/dsh-audit/` in a browser and verify that `styles.css` and `app.js` are served through the proxy, the stylesheet has nonzero CSS rules, and the console uses its intended layout rather than unstyled HTML.
- When changing DSH routing, Nginx static asset handling, or `frontend/index.html`, update the CSS and JS cache-version query values together. CSS/JS paths must return their asset or `404`, never the SPA HTML fallback, otherwise browsers can cache an HTML response as a stylesheet and make the audit page appear duplicated or unstyled.
- The DSH entry HTML and its CSS/JS must use `Cache-Control: no-store` in the local proxy environment. After changing routing or static assets, perform one browser hard refresh before visual QA so an old cached `index.html` cannot continue referencing an obsolete asset pair.

## Retired Customer Skills

- The following Customer business Skills were removed from the Admin DSH database on 2026-09-03 and must not be reintroduced by defaults, migrations, Swagger rebuilds, or manual synchronization without explicit user authorization: `enquiry_followup`, `enquiry_reopen`, and `fine_appeal`.
- These retirements do not apply to knowledge-base Skills. Preserve Skills that are exclusively bound to `knowledge.search` unless the user explicitly asks to remove them.

## Scope Boundary

- This repository is the admin DSH project. Work only within `/Users/thron/Documents/odt/admin-dsv4flash-dsh-kb` unless the user explicitly authorizes another target.
- Do not read, edit, run, restart, or otherwise operate the customer DSH repository at `/Users/thron/Documents/odt/dsv4flash-dsh-kb`.
- Do not read, write, query, migrate, restore, or delete data in the customer DSH database. The customer runtime uses `10.255.1.157:5432/dsh` with `UMC_PORTAL=customer`.
- Admin DSH uses `10.255.1.157:15432/dsh` with `UMC_PORTAL=admin`. Before any database write, verify the target host, port, database name, and portal mode.
- If a task could involve customer code, customer services, or the customer database, explain the impact and wait for explicit user authorization before taking any action.

## Git Safety

- Do not push, create or update pull requests, change remote branches, tags, or remote configuration without explicit user authorization.
- Read-only Git commands are allowed when needed for the current task.
