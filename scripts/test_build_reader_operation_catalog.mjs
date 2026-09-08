import assert from "node:assert/strict";
import { test } from "node:test";

import { buildReaderOperationCatalog } from "./build_reader_operation_catalog.mjs";

test("keeps all Swagger operations while stripping examples and defaults", () => {
  const catalog = buildReaderOperationCatalog({
    sourceSha256: "abc",
    operations: [
      {
        method: "POST",
        path: "/api/items/query",
        existingAllowlist: true,
        policySchemaMatches: [{ policyPath: "/api/items/query", matchKind: "exact" }],
        classification: "existing_allowlist",
        operationId: "queryItems",
        summary: "Query items",
        description: "Returns the matching item rows.",
        tags: ["Items"],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Query" } } } },
        responses: { 200: { content: { "application/json": { schema: { $ref: "#/components/schemas/Rows" } } } } },
      },
      { method: "DELETE", path: "/api/items/{id}", existingAllowlist: false, policySchemaMatches: [] },
    ],
    schemas: {
      Query: { properties: { page: { type: "integer", example: 7 } } },
      Rows: { properties: { items: { type: "array" }, total: { type: "integer", default: 99 } } },
    },
  });
  assert.equal(catalog.operations.length, 2);
  const query = catalog.operations.find((operation) => operation.path === "/api/items/query");
  assert.deepEqual(query.requestFields, ["page"]);
  assert.deepEqual(query.responseFields, ["items", "total"]);
  assert.equal(query.operationId, "queryItems");
  assert.equal(query.summary, "Query items");
  assert.equal(query.description, "Returns the matching item rows.");
  assert.doesNotMatch(JSON.stringify(catalog), /example|default|99/);
});

test("keeps template mappings without claiming they are newly authorized", () => {
  const catalog = buildReaderOperationCatalog({
    operations: [{
      method: "GET",
      path: "/api/items/{id}",
      existingAllowlist: false,
      policySchemaMatches: [{ policyPath: "/api/items/:id", matchKind: "template_shape_only" }],
      classification: "read_candidate",
      tags: [],
      responses: {},
    }],
    schemas: {},
  });
  assert.deepEqual(catalog.operations[0].policyPaths, ["/api/items/:id"]);
  assert.equal(catalog.operations[0].classification, "read_candidate");
  assert.match(catalog.notice, /network mode determines selectability/i);
});

test("rejects unrelated JSON", () => {
  assert.throws(() => buildReaderOperationCatalog({ paths: {} }), /Swagger inventory/);
});
