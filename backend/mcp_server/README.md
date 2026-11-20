# Customer MCP

The Customer DSH validates the selected Profile, skill allowlist, registered operation and any required confirmation in its existing tool gateway. Its platform, knowledge and OCR adapters invoke a separate MCP service using the Python SDK and Streamable HTTP. The service executes operations using the Customer gateway clients. Identity and request correlation travel with each platform call. Ordinary login, document services and model streaming retain their existing paths.

Both Compose files run `mcp-server` alongside `backend`. They share a private Unix socket in the `customer_mcp_runtime` volume. Start both services when upgrading. DSH establishes the MCP connection during startup. The same volume carries an atomically updated snapshot of gateway URLs, timeouts and retry count from the effective DSH configuration. For a manual two-process installation, set the same `DSH_MCP_SOCKET` and `DSH_MCP_GATEWAY_CONFIG` in both processes and ensure their service users can access the shared directory. The MCP process uses the three existing gateway services.

The backend exposes Swagger at `/docs`, its OpenAPI schema at `/openapi.json` and its health status at `GET /healthz`. `toolTransport: mcp` means the running backend installed the adapter after SDK initialization. Upstream UMC availability requires a separate authenticated business check.

This integration was applied to the Customer application read from the 18485 deployment on 2026-11-20. Its 12 source differences against the November 14 snapshot are preserved in the preceding Git commit. The platform, knowledge, OCR gateway and OCR CPU entrypoint files matched the snapshot. The October 29 archive supplied the MCP tool contract and adapter reference.

The regression suite exercises concurrent identities, Profile binding, upstream errors, confirmation, no write replay on timeout, plus the current payment list/detail reader over the private socket and live gateway configuration. From the repository root run `PYTHONPATH=backend python -m pytest backend/tests` with the backend dependencies, pytest, pytest-asyncio and aiosqlite installed. These cases use isolated upstream data.

On the isolated test run, the pre-MCP application had 236 passing and 9 failing checks. The integrated application had 260 passing and the same 9 failing checks (registry and routing expectations, including six parametrized cases). The local DSH and MCP processes started against an isolated PostgreSQL database, served the 43-path OpenAPI schema, and rejected an unauthenticated conversations request with HTTP 401.
