# Reader Network Policy

## Local Business Validation

The user explicitly requested disabling the API whitelist on 7 September 2026
to separate business-answer defects from blocked page dependencies. This is a
temporary network-policy opt-out, not evidence of strict read-only safety.

The local override `.env.admin.postgres18.local` contains:

```dotenv
PORTAL_READER_WHITELIST_ENABLED=false
```

With `false`, same-origin HTTP requests bypass method/path checks, including
unlisted GET/POST queries and paths in `blockedExactPaths`. PUT/PATCH/DELETE
requests also bypass that network filter. No business write request was used
to verify this behavior; write-method tests use synthetic requests only.

The switch does not bypass GetUserInfo identity checks, page permissions,
declared navigation limits, action/locator mutation prohibitions, cross-origin
or stream restrictions, or browser download cancellation. An automatically
issued business write can still reach the server in this mode. Do not describe
the disabled mode as providing network-level read-only enforcement.

The protected `.env.lite` is unchanged. Outside this local opt-in, the gateway
and base Compose configuration default to `true`. Only `true`, `false`, `1`
and `0` are accepted; misspellings fail startup instead of disabling checks.

## Configuration

The single runtime path inventory is
`platform-gateway/config/reader-network-policy.json`. It preserves the existing
72 GET and six POST allowlist entries; the Swagger inventory does not silently
add unreviewed operations to this file.

- `version`: currently `1`.
- `allowedMethods.GET`: exact paths and the existing `:id` / `:taskId` patterns.
- `allowedMethods.POST`: exact query paths, not prefixes.
- `staticFetchPaths`: extra same-origin GET fetch resources such as config.json.
- `blockedExactPaths`: explicit path blocks used only with enforcement enabled.

The file is copied into the gateway image and mounted read-only by Compose at
`/app/config/reader-network-policy.json`. `PORTAL_READER_WHITELIST_FILE` can
select a different file for direct gateway execution; Compose uses the fixed
mounted path. Invalid files fail startup in either mode. Configuration is read
at startup, not hot-reloaded, so changes require a gateway restart/recreation.

## Apply or Restore

Set `PORTAL_READER_WHITELIST_ENABLED=true` in the local override to restore the
configured network whitelist. Apply either mode from the Admin DSH repository:

```bash
docker compose --env-file .env.lite --env-file .env.admin.postgres18.local \
  -f docker-compose.lite.yml -f docker-compose.admin.local.yml \
  up -d --build --no-deps platform-gateway
```

No database or other service recreation is required. The gateway `/healthz`
reports `readerWhitelistEnabled`, `readerNetworkMode`, `readerWhitelistFile`
and configured GET/POST counts. Counts describe the file, not active enforcement.
Disabled mode also emits a startup warning. New request health follows the
actual routing decision, so bypassed APIs are not falsely reported as blocked.

## Swagger Inventory

See `swagger-2026-09-07/` for the full static API inventory and reproduction
command. Classification is a review aid, not authorization. GET may export or
download, and POST may query. The scan fetches only the OpenAPI document and
does not invoke its listed operations or expand the runtime tool surface.

Per the expansion Skill, this change stays in the generic gateway/contract;
manual content, flat knowledge nodes and runtime Skill routing are unchanged.
Business-question acceptance must be rerun in the recorded network mode and
must not be inferred from unit tests or successful Swagger parsing.

## Verification on 7 September 2026

- 711 backend tests passed, including 55 new configuration/bypass tests.
- 25 Node tests passed, including 11 new Swagger inventory tests.
- Contract/regression YAML parsing and `git diff --check` passed.
- Only `dsh-admin-local-platform-gateway-1` was rebuilt/recreated. Its live
  health reports `readerWhitelistEnabled=false` and
  `readerNetworkMode=same-origin-unrestricted`.
- A synthetic Appeals GET passed the deployed guard with no blocked-health
  entry. This probe sent no request to a business endpoint.
- Portal `/`, audit `/dsh-audit/`, Swagger `/swagger` and backend health are
  reachable. No frontend routing or static assets changed in this batch.
- The approved question corpus hash remains
  `ca46fa206975d3a400f271287b9112870c9d72cfc30401ad17557da4ef31ad01`.

Host and deployed container SHA-256 values match:

| File | SHA-256 |
| --- | --- |
| platform-gateway/app.py | 17c65ed760e4cf3b9814f8ca61e5af91987e2497ca32f69289c9d8dcab72ff27 |
| platform-gateway/config/reader-network-policy.json | a69fb630019d8817a76d40c2bcecde1167792f5d1f9cfd8c2093481215cbf4ec |

The Swagger scan inventoried 697 operations across 686 paths and 937 schema
definitions. It did not invoke listed endpoints. Existing business-pilot scores
remain historical results under the earlier enabled policy; no new live
business answer is claimed as passing by this configuration change.
