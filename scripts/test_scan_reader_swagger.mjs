import assert from "node:assert/strict";
import { test } from "node:test";
import { comparePolicyPath, inventorySwagger, normalizePath, renderInventory } from "./scan_reader_swagger.mjs";

const document = (paths, components = {}) => ({ openapi: "3.0.1", info: { title: "fixture", version: "1" }, paths, components });
const operation = (extra = {}) => ({ responses: { 200: { description: "OK" } }, ...extra });

test("inventories every standard operation without treating path metadata as an operation", () => {
  const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
  const result = inventorySwagger(document({ "/api/items": { summary: "shared", parameters: [], ...Object.fromEntries(methods.map((method) => [method, operation()])) } }));
  assert.equal(result.summary.operationCount, 8);
  assert.equal(result.summary.pathCount, 1);
  assert.deepEqual(new Set(result.operations.map((op) => op.method)), new Set(methods.map((method) => method.toUpperCase())));
});

test("POST queries can be read candidates, GET export is not automatically allowed", () => {
  const result = inventorySwagger(document({ "/api/Application/MyTodoPage": { post: operation() }, "/api/ContentLibrary/ExportCSV": { get: operation() }, "/api/opaque": { post: operation() } }));
  assert.equal(result.operations.find((op) => op.path.includes("MyTodoPage")).classification, "read_candidate");
  assert.equal(result.operations.find((op) => op.path.includes("ExportCSV")).classification, "prohibited_candidate");
  assert.equal(result.operations.find((op) => op.path.includes("opaque")).classification, "needs_review");
  assert.ok(result.operations.every((op) => op.verifiedReadOnly === false));
});

test("comparison is method-specific and reports unmapped entries without modifying policy", () => {
  const policy = { version: 1, allowedMethods: { GET: ["/api/items", "/api/missing"], POST: ["/api/query"] }, blockedExactPaths: ["/api/blocked"], staticFetchPaths: ["/config.json"] };
  const original = JSON.stringify(policy);
  const result = inventorySwagger(document({ "/api/items": { get: operation(), post: operation() }, "/api/blocked": { get: operation() } }), { policy });
  assert.equal(result.operations.find((op) => op.path === "/api/items" && op.method === "GET").classification, "existing_allowlist");
  assert.equal(result.operations.find((op) => op.path === "/api/items" && op.method === "POST").classification, "needs_review");
  assert.equal(result.operations.find((op) => op.path === "/api/blocked").classification, "prohibited_candidate");
  assert.equal(result.unmappedAllowlist.length, 2);
  assert.equal(JSON.stringify(policy), original);
});

test("resolves reusable path, parameter, request and response refs and operation parameter overrides", () => {
  const result = inventorySwagger(document({ "/api/query": { $ref: "#/components/pathItems/Query" } }, {
    pathItems: { Query: { parameters: [{ $ref: "#/components/parameters/Page" }], post: operation({ parameters: [{ name: "page", in: "query", required: true, schema: { type: "integer" } }], requestBody: { $ref: "#/components/requestBodies/Query" }, responses: { 200: { $ref: "#/components/responses/Rows" } } }) } },
    parameters: { Page: { name: "page", in: "query", schema: { type: "string" } } },
    requestBodies: { Query: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Query" } } } } },
    responses: { Rows: { description: "rows", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Row" } } } } } },
    schemas: { Query: { type: "object", properties: { page: { type: "integer" } } }, Row: { type: "object" } },
  }));
  assert.equal(result.operations[0].parameters.length, 1);
  assert.equal(result.operations[0].parameters[0].schema.type, "integer");
  assert.equal(result.operations[0].requestBody.required, true);
  assert.deepEqual(result.operations[0].schemaRefs, ["#/components/schemas/Query", "#/components/schemas/Row"]);
  assert.equal(result.summary.unresolvedReferenceCount, 0);
});

test("tracks missing and external refs without fetching anything", () => {
  const result = inventorySwagger(document({ "/api/items": { get: operation({ parameters: [{ $ref: "https://external.invalid/schema" }], responses: { 200: { content: { "application/json": { schema: { $ref: "#/components/schemas/Missing" } } } } } }) } }));
  assert.deepEqual(result.unresolvedReferences, ["#/components/schemas/Missing", "https://external.invalid/schema"]);
});

test("normalizes query strings without confusing placeholders or comparison paths", () => {
  assert.equal(normalizePath("/api/items/{id}?page=2"), "/api/items/{id}");
  const result = inventorySwagger(document({ "/api/query?format=json": { get: operation() } }), { policy: { allowedMethods: { GET: ["/api/query"] } } });
  assert.equal(result.operations[0].path, "/api/query");
  assert.equal(result.operations[0].originalPath, "/api/query?format=json");
  assert.equal(result.operations[0].classification, "existing_allowlist");
});

test("maps colon placeholders and concrete restrictions to Swagger templates without broadening allowlist claims", () => {
  assert.equal(comparePolicyPath("/api/items/:id", "/api/items/{itemId}"), "template_shape_only");
  assert.equal(comparePolicyPath("/api/types/CertificateStatus", "/api/types/{type}"), "concrete_path_under_swagger_template");
  assert.equal(comparePolicyPath("/api/items/:id", "/api/items/{id}/export"), null);
  const result = inventorySwagger(document({ "/api/items/{id}": { get: operation() }, "/api/types/{type}": { get: operation() } }), { policy: { allowedMethods: { GET: ["/api/items/:id", "/api/types/CertificateStatus"] } } });
  assert.equal(result.unmappedAllowlist.length, 0);
  assert.ok(result.operations.every((op) => op.classification === "read_candidate"));
  assert.equal(result.operations[0].policySchemaMatches[0].matchKind, "template_shape_only");
});

test("schema inventory preserves structure and refs but strips examples, defaults and enum values", () => {
  const result = inventorySwagger(document({}, { schemas: { Row: { type: "object", properties: { name: { type: "string", example: "private example", default: "private default", enum: ["private enum"] }, next: { $ref: "#/components/schemas/Row" } } } } }));
  assert.equal(result.schemas.Row.properties.name.enumValueCount, 1);
  assert.equal(result.schemas.Row.properties.next.$ref, "#/components/schemas/Row");
  assert.doesNotMatch(JSON.stringify(result), /private/);
});

test("exact policy mappings take precedence over overlapping Swagger templates", () => {
  const result = inventorySwagger(document({ "/api/items/stats": { get: operation() }, "/api/items/{id}": { get: operation() } }), { policy: { allowedMethods: { GET: ["/api/items/stats"] } } });
  assert.deepEqual(result.policyMappings[0].swaggerMatches, [{ path: "/api/items/stats", matchKind: "exact" }]);
});

test("report has exact coverage and explicitly separates candidates from verified safety", () => {
  const result = inventorySwagger(document({ "/api/query": { get: operation() } }), { generatedAt: "2026-09-07T00:00:00Z" });
  const report = renderInventory(result);
  assert.match(report, /1 paths, 1 operations/);
  assert.match(report, /No business operation was invoked/);
  assert.match(report, /GET \| \/api\/query \| read_candidate/);
  assert.equal(result.summary.missingDescription, 1);
});

test("rejects non-OpenAPI3 data instead of silently producing an empty inventory", () => {
  assert.throws(() => inventorySwagger({ swagger: "2.0", paths: {} }), /OpenAPI 3/);
});
