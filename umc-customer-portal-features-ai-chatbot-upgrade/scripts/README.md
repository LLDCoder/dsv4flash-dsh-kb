# Scripts

This directory contains local development scripts for mock generation, service-entry-gate mocking, and payload/API validation.

## Overview

### `seed-service-entry-gate-mocks.mjs`

Seeds mock responses for `GET /api/Service/:serviceId/Check` into the local Vite dev server.

Use:

```bash
npm run dev
node scripts/seed-service-entry-gate-mocks.mjs
```

After seeding, the script prints a console table with:

- `serviceId`
- `serviceCode`
- `serviceName`
- `mockStatus`
- `scenario`
- `httpStatus`

`serviceName` is resolved from the fixture when provided, otherwise the script tries to read the first activity name from `src/pages/MediaLicense/mockData/<serviceCode>mock.json`.

Custom fixture:

```bash
node scripts/seed-service-entry-gate-mocks.mjs ./scripts/fixtures/service-entry-gate-matrix.json
```

Custom dev server URL:

```bash
SERVICE_ENTRY_GATE_MOCK_BASE_URL=http://localhost:4174 node scripts/seed-service-entry-gate-mocks.mjs
```

### `clear-service-entry-gate-mocks.mjs`

Clears seeded service-entry-gate mocks from the local Vite dev server.

Clear all:

```bash
node scripts/clear-service-entry-gate-mocks.mjs
```

Clear one service:

```bash
node scripts/clear-service-entry-gate-mocks.mjs 2109
```

### `fixtures/service-entry-gate-matrix.json`

Default scenario matrix for the service-entry-gate flow. The matrix now covers:

- `Allow`
- `Block`
- `RedirectRenewal`
- `RedirectRenewal` without a target service
- applicant/profile mismatch dialogs
- missing establishment context
- page-level `applicantMode=Both` variants inside `MediaLicense`
- license status dialogs for under review, suspended, expired grace, expired penalty, and existing licenses
- fallback/error cases such as `DOCUMENT_NOT_FOUND`, `RENEWABLE_DOCUMENT_NOT_FOUND`, and prerequisite-document blockers

Entry shape:

```json
{
  "scenario": "example-scenario",
  "serviceId": "2109",
  "statusCode": 200,
  "body": {
    "isSuccess": true,
    "statusCode": 200,
    "message": "Request successful",
    "data": {}
  }
}
```

### `build-1201-mock.cjs`

Builds `src/pages/MediaLicense/mockData/1201mock.json` from `test1201skip.json` and injects dev-prefill values for the 1201 flow.

Use:

```bash
node scripts/build-1201-mock.cjs
```

### `runRuleValidateTests.mjs`

Builds rule-validate payloads for multiple services and calls:

```text
/api/customer-engines/rule/validate
```

Input sources are resolved in this order:

1. `src/doc/<serviceId>/<serviceId>requestBody.json`
2. `src/doc/<serviceId>/<serviceId>mock.json`
3. `src/pages/MediaLicense/mockData/<serviceId>mock.json`

Result files are written to:

```text
src/doc/<serviceId>/validate-test.json
```

Use:

```bash
node scripts/runRuleValidateTests.mjs
```

### `runFeeQuoteTests.mjs`

Builds fee quote payloads for multiple services and calls:

```text
/api/customer-engines/fee/quote
```

Input source:

```text
src/doc/<serviceId>/<serviceId>mock.json
```

Result files are written to:

```text
src/doc/<serviceId>/fee-quote-test.json
```

Run all default services:

```bash
node scripts/runFeeQuoteTests.mjs
```

Run selected services only:

```bash
node scripts/runFeeQuoteTests.mjs 1201 1801 1901
```

### `stubs/`

Local stub modules used by the test runners when they create a Vite SSR server:

- `stubs/servicesStub.mjs`
- `stubs/userProfileStub.mjs`
- `stubs/commonStub.mjs`

These are helper modules for local script execution only.

## Service Entry Gate Mock Flow

The service-entry-gate flow has two separate switches:

1. The page flow must be enabled in the browser URL.
2. Mock data must be seeded into the local Vite dev server.

### Enable the page flow

The feature is off by default in code. Enable it with:

```text
?serviceEntryGate=1
```

Also accepted:

```text
true
on
enabled
```

Example:

```text
http://localhost:5174/home?serviceEntryGate=1
```

Disable explicitly with:

```text
?serviceEntryGate=0
```

### Scope

The mock endpoint exists only in the Vite dev server. It does not exist in the production build.

### Behavior

- If the URL switch is off, the app bypasses the gate flow even if mocks were seeded.
- If no mock exists for a service, the request falls through to the normal `/api` proxy target.
- Seeded mocks live only in the current dev server process.
- Restarting `npm run dev` clears all seeded service-entry-gate mocks.
- For page-level gate variants, you can open the route directly:

```text
/services/media-license?serviceId=<serviceId>&serviceCode=<serviceCode>&serviceEntryGate=1
```

This is useful for `Allow` scenarios that unlock the `MediaLicense` page and then render `applicantMode=Both` selectors or inline gate blockers.

## Rule Validate And Fee Quote Scenarios

These two scripts are broader than a single page mock. They are used to cover multiple service scenarios across the Media License flows.

### Coverage model

- Each service is identified by `serviceId`.
- Input JSON is loaded from `src/doc/<serviceId>/...` or `src/pages/MediaLicense/mockData/...`.
- The script builds the real request payload for that service.
- The script then calls the target backend API and stores the request/response snapshot back into `src/doc/<serviceId>/...`.

This means the scenario coverage depends on how many service-specific mock files exist in `src/doc` and `src/pages/MediaLicense/mockData`.

## Production Impact

These scripts are for local development and testing only.

- They are not wired into `package.json`.
- The service-entry-gate mock endpoint is provided by a Vite plugin that runs only in `serve` mode.
- The validate and fee-quote runners are manual Node scripts.
- They do not run during the production build unless someone invokes them explicitly.
