import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const DEFAULT_INPUT = "doc/admin-portal-reader/swagger-2026-09-07/inventory.json";
const DEFAULT_OUTPUT = "platform-gateway/config/reader-operation-catalog.json";

function schemaName(ref) {
  const value = String(ref ?? "");
  return value.startsWith("#/components/schemas/") ? value.slice("#/components/schemas/".length) : "";
}

function schemaFields(inventory, refs) {
  const fields = [];
  for (const ref of refs) {
    const schema = inventory.schemas?.[schemaName(ref)];
    for (const name of Object.keys(schema?.properties ?? {})) {
      if (!fields.includes(name)) fields.push(name);
      if (fields.length >= 12) return fields;
    }
  }
  return fields;
}

function requestRefs(operation) {
  return Object.values(operation.requestBody?.content ?? {})
    .map((entry) => entry?.schema?.$ref)
    .filter(Boolean);
}

function responseRefs(operation) {
  return Object.values(operation.responses ?? {}).flatMap((response) =>
    Object.values(response?.content ?? {}).map((entry) => entry?.schema?.$ref).filter(Boolean),
  );
}

export function buildReaderOperationCatalog(inventory) {
  if (!Array.isArray(inventory?.operations) || typeof inventory?.schemas !== "object") {
    throw new Error("Expected a Reader Swagger inventory with operations and schemas");
  }
  const operations = inventory.operations
    .map((operation) => {
      const requestSchemaRefs = [...new Set(requestRefs(operation))];
      const responseSchemaRefs = [...new Set(responseRefs(operation))];
      return {
        method: operation.method,
        path: operation.path,
        policyPaths: [...new Set((operation.policySchemaMatches ?? []).map((match) => match.policyPath))],
        tags: (operation.tags ?? []).slice(0, 8),
        classification: operation.classification,
        ...(operation.operationId ? { operationId: String(operation.operationId).slice(0, 120) } : {}),
        ...(operation.summary ? { summary: String(operation.summary).slice(0, 300) } : {}),
        ...(operation.description ? { description: String(operation.description).slice(0, 600) } : {}),
        requestSchemas: requestSchemaRefs.map(schemaName).filter(Boolean),
        requestFields: schemaFields(inventory, requestSchemaRefs),
        responseSchemas: responseSchemaRefs.map(schemaName).filter(Boolean),
        responseFields: schemaFields(inventory, responseSchemaRefs),
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method));
  return {
    version: 1,
    sourceSha256: inventory.sourceSha256 ?? null,
    notice: "Swagger metadata aids selection only. Current gateway network mode determines selectability; metadata never authorizes execution.",
    operations,
  };
}

async function main() {
  const [input = DEFAULT_INPUT, output = DEFAULT_OUTPUT] = process.argv.slice(2);
  const inventory = JSON.parse(await readFile(resolve(input), "utf8"));
  const catalog = buildReaderOperationCatalog(inventory);
  await writeFile(resolve(output), `${JSON.stringify(catalog, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ output, operationCount: catalog.operations.length })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
