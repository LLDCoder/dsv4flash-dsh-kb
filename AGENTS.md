# Repository Rules

- Do not perform write operations against the `admin` Git remote.
- Do not run `git push admin ...`, create or update pull requests targeting `admin`, or modify branches or tags on `admin`.
- Read-only operations against `admin`, such as `git fetch admin`, `git log admin/...`, and `git diff admin/...`, are allowed.
- Before any operation that could write to `admin`, explain the impact and wait for the user's explicit authorization.

## Customer Environment Allowlist

- Customer Portal frontend: `https://umc-customerportal.sol.daypop.ai`.
- Customer Portal local Vite proxy workspace: `/Users/thron/Documents/odt/umc/front/umc-customer-portal`.
- Customer Portal local Vite proxy: `http://localhost:18085/`. It may be started only with `npm run dev` from the Customer Portal local Vite proxy workspace.
- Customer DSH audit interface through the local Vite proxy: `http://localhost:18085/dsh-audit`.
- Customer Service Swagger through the local Vite proxy: `http://localhost:18085/swagger`, proxied only to Customer Service at `http://127.0.0.1:5206`.
- The Customer portal selector must remain `UMC_PORTAL=customer` unless the user explicitly authorizes an environment change.
- Do not treat `https://umc-adminportal.sol.daypop.ai`, any admin endpoint, or any address mentioned only in documentation as a Customer environment target.
- Customer DSH Backend source workspace: `/Users/thron/Documents/odt/dsv4flash-dsh-kb`. This is the only Customer DSH backend source tree that may be modified.
- Customer DSH Backend external address: not yet confirmed. Do not deploy to, restart, or call a remote backend until the user records its exact address here.
- Customer database: `10.255.1.157:5432/dsh` (PostgreSQL). This is the only remote Customer database that may be connected to or operated.
- Do not connect to, query, migrate, import into, back up, or otherwise operate any database other than the Customer database above unless the user explicitly authorizes it.
- Local Docker services (for example `postgres:5432/dsh` and localhost frontend ports) are development-only. They are not Customer environment infrastructure.
