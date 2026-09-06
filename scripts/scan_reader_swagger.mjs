import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_SOURCE = "http://localhost:18086/swagger/v1/swagger.json";
const METHODS = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);
const PROHIBITED = new Set("approve reject submit create update modify delete remove assign reassign send refund export upload download import cancel revoke activate deactivate execute generate publish unpublish reset login logout register pay paymentprocess save add set mark start stop complete close reopen release transfer resend renew restore terminate withdraw bind unbind".split(" "));
const READ = new Set("get list query search find lookup lookups detail details count counts statistics stats summary summaries page todo metadata options tree history preview check validate exists available availability".split(" "));

function tokens(value) {
  return String(value).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function normalizePath(value) {
  const url = new URL(value, "http://inventory.invalid");
  return url.pathname.replace(/%7B/gi, "{").replace(/%7D/gi, "}");
}

function resolveRef(document, value, unresolved, seen = new Set()) {
  if (!value?.$ref) return value;
  const ref = value.$ref;
  if (!ref.startsWith("#/") || seen.has(ref)) {
    unresolved.add(ref);
    return value;
  }
  let target = document;
  for (const part of ref.slice(2).split("/")) {
    const key = decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~");
    target = target?.[key];
  }
  if (!target) {
    unresolved.add(ref);
    return value;
  }
  return resolveRef(document, target, unresolved, new Set([...seen, ref]));
}

// Keep schema structure, not example/default values that can contain real data.
function schemaShape(schema) {
  if (!schema || typeof schema !== "object") return schema ?? null;
  const result = {};
  for (const key of ["$ref", "type", "format", "nullable", "readOnly", "writeOnly", "required", "minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum"]) {
    if (schema[key] !== undefined) result[key] = schema[key];
  }
  if (schema.enum) result.enumValueCount = schema.enum.length;
  if (schema.properties) result.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, schemaShape(value)]));
  for (const key of ["items", "additionalProperties", "not"]) {
    if (schema[key] !== undefined) result[key] = schemaShape(schema[key]);
  }
  for (const key of ["allOf", "anyOf", "oneOf"]) {
    if (schema[key]) result[key] = schema[key].map(schemaShape);
  }
  return result;
}

function references(value, found = new Set()) {
  if (!value || typeof value !== "object") return found;
  if (typeof value.$ref === "string") found.add(value.$ref);
  for (const child of Object.values(value)) references(child, found);
  return found;
}

function mediaSchemas(content = {}) {
  return Object.fromEntries(Object.entries(content).map(([media, value]) => [media, { schema: schemaShape(value.schema) }]));
}

export function comparePolicyPath(policyPath, swaggerPath) {
  const configured = normalizePath(policyPath);
  const documented = normalizePath(swaggerPath);
  if (configured === documented) return "exact";
  const left = configured.split("/");
  const right = documented.split("/");
  if (left.length !== right.length) return null;
  let hasConcreteRestriction = false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index]) continue;
    if (!/^\{[^{}]+\}$/.test(right[index])) return null;
    if (!/^:[A-Za-z][A-Za-z0-9_]*$/.test(left[index]) && !/^\{[^{}]+\}$/.test(left[index])) hasConcreteRestriction = true;
  }
  return hasConcreteRestriction ? "concrete_path_under_swagger_template" : "template_shape_only";
}

function classify(method, path, operation, policy) {
  const words = tokens(`${path} ${operation.operationId ?? ""}`);
  const prohibited = [...new Set(words.filter((word) => PROHIBITED.has(word)))];
  const read = [...new Set(words.filter((word) => READ.has(word)))];
  let candidate;
  let reasons;
  if ((policy.blockedExactPaths ?? []).includes(path)) {
    candidate = "prohibited_candidate";
    reasons = ["explicitly blocked path in the comparison policy"];
  } else if (["PUT", "PATCH", "DELETE", "TRACE"].includes(method) || prohibited.length) {
    candidate = "prohibited_candidate";
    reasons = [...(["PUT", "PATCH", "DELETE", "TRACE"].includes(method) ? ["method warrants prohibition review"] : []), ...prohibited.map((word) => `potential mutation or prohibited operation term: ${word}`)];
  } else if (["GET", "HEAD"].includes(method) || (method === "POST" && read.length)) {
    candidate = "read_candidate";
    reasons = [method === "POST" ? `POST query-like identifier terms: ${read.join(", ")}` : `${method} is a read candidate only, not proof of no side effects`];
  } else {
    candidate = "needs_review";
    reasons = ["metadata does not establish a read-only operation"];
  }
  const existing = (policy.allowedMethods?.[method] ?? []).includes(path);
  return {
    classification: existing ? "existing_allowlist" : candidate,
    heuristicClassification: candidate,
    existingAllowlist: existing,
    reasons,
    verifiedReadOnly: false,
  };
}

export function inventorySwagger(document, { policy = {}, source = "local input", sourceSha256 = null, generatedAt = new Date().toISOString() } = {}) {
  if (!String(document.openapi ?? "").startsWith("3.") || !document.paths || typeof document.paths !== "object") throw new Error("Expected an OpenAPI 3 document with paths");
  const unresolved = new Set();
  const operations = [];
  for (const [rawPath, rawItem] of Object.entries(document.paths)) {
    const path = normalizePath(rawPath);
    const item = resolveRef(document, rawItem, unresolved);
    for (const [key, operation] of Object.entries(item)) {
      if (!METHODS.has(key)) continue;
      const method = key.toUpperCase();
      const merged = new Map();
      for (const rawParameter of [...(item.parameters ?? []), ...(operation.parameters ?? [])]) {
        const parameter = resolveRef(document, rawParameter, unresolved);
        merged.set(`${parameter.in}:${parameter.name}:${parameter.$ref ?? ""}`, {
          ...(rawParameter.$ref ? { sourceRef: rawParameter.$ref } : {}),
          name: parameter.name ?? null, in: parameter.in ?? null, required: parameter.required ?? false,
          description: parameter.description ?? null, schema: schemaShape(parameter.schema),
          ...(parameter.content ? { content: mediaSchemas(parameter.content) } : {}),
        });
      }
      const requestBody = resolveRef(document, operation.requestBody, unresolved);
      const responses = Object.fromEntries(Object.entries(operation.responses ?? {}).map(([status, rawResponse]) => {
        const response = resolveRef(document, rawResponse, unresolved);
        return [status, { ...(rawResponse.$ref ? { sourceRef: rawResponse.$ref } : {}), description: response.description ?? null, content: mediaSchemas(response.content) }];
      }));
      const entry = {
        method, path, ...(rawPath !== path ? { originalPath: rawPath } : {}),
        operationId: operation.operationId ?? null, tags: operation.tags ?? [],
        summary: operation.summary ?? null, description: operation.description ?? null,
        deprecated: operation.deprecated ?? false, security: operation.security ?? document.security ?? [],
        parameters: [...merged.values()],
        requestBody: requestBody ? { ...(operation.requestBody.$ref ? { sourceRef: operation.requestBody.$ref } : {}), required: requestBody.required ?? false, description: requestBody.description ?? null, content: mediaSchemas(requestBody.content) } : null,
        responses,
        ...classify(method, path, operation, policy),
      };
      entry.policySchemaMatches = (policy.allowedMethods?.[method] ?? []).flatMap((policyPath) => {
        const matchKind = comparePolicyPath(policyPath, path);
        return matchKind ? [{ policyPath, matchKind }] : [];
      });
      entry.schemaRefs = [...references({ parameters: entry.parameters, requestBody: entry.requestBody, responses })].sort();
      operations.push(entry);
    }
  }
  operations.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  const schemas = Object.fromEntries(Object.entries(document.components?.schemas ?? {}).map(([name, schema]) => [name, schemaShape(schema)]));
  for (const ref of references({ operations, schemas })) resolveRef(document, { $ref: ref }, unresolved);
  const policyMappings = Object.entries(policy.allowedMethods ?? {}).flatMap(([method, paths]) => paths.map((path) => {
    const matches = operations.filter((op) => op.method === method.toUpperCase()).flatMap((op) => {
      const matchKind = comparePolicyPath(path, op.path);
      return matchKind ? [{ path: op.path, matchKind }] : [];
    });
    const exact = matches.filter((match) => match.matchKind === "exact");
    return { method, path, swaggerMatches: exact.length ? exact : matches };
  }));
  const unmappedAllowlist = policyMappings.filter((mapping) => !mapping.swaggerMatches.length).map(({ method, path }) => ({ method, path }));
  const countBy = (field) => operations.reduce((counts, operation) => ({ ...counts, [operation[field]]: (counts[operation[field]] ?? 0) + 1 }), {});
  return {
    version: 1, generatedAt, source, sourceSha256,
    api: { openapi: document.openapi, title: document.info?.title ?? null, version: document.info?.version ?? null },
    notice: "Static metadata inventory only. No business operation was invoked. Candidate classes do not establish read-only safety and do not modify the runtime policy. Missing metadata and ambiguous semantics require implementation or authorized page-network review.",
    summary: { pathCount: Object.keys(document.paths).length, operationCount: operations.length, byMethod: countBy("method"), byClassification: countBy("classification"), missingSummary: operations.filter((op) => !op.summary?.trim()).length, missingDescription: operations.filter((op) => !op.description?.trim()).length, schemaCount: Object.keys(schemas).length, unresolvedReferenceCount: unresolved.size, unmappedAllowlistCount: unmappedAllowlist.length },
    unmappedAllowlist, policyMappings, unresolvedReferences: [...unresolved].sort(),
    comparisonPolicy: { version: policy.version ?? null, allowedMethodCounts: Object.fromEntries(Object.entries(policy.allowedMethods ?? {}).map(([method, paths]) => [method, paths.length])), staticFetchPaths: policy.staticFetchPaths ?? [], blockedExactPaths: policy.blockedExactPaths ?? [] },
    operations, schemas,
  };
}

export function renderInventory(inventory) {
  const cell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  const lines = ["# Admin Reader Swagger Inventory", "", `Generated: ${inventory.generatedAt}`, "", `Source: ${inventory.source}`, "", `SHA-256: ${inventory.sourceSha256 ?? "not supplied"}`, "", inventory.notice, "", "## Summary", "", `- ${inventory.summary.pathCount} paths, ${inventory.summary.operationCount} operations, ${inventory.summary.schemaCount} schemas.`, `- Methods: ${JSON.stringify(inventory.summary.byMethod)}.`, `- Classifications: ${JSON.stringify(inventory.summary.byClassification)}.`, `- Missing operation summaries: ${inventory.summary.missingSummary}; missing operation descriptions: ${inventory.summary.missingDescription}.`, `- Unresolved references: ${inventory.summary.unresolvedReferenceCount}.`, `- Existing allowlist entries absent from this Swagger: ${inventory.summary.unmappedAllowlistCount}.`, "", "`existing_allowlist` records configuration membership, not a new safety certification. `read_candidate` includes GET/HEAD and query-like POST identifiers; even these can have side effects. `prohibited_candidate` is a conservative lexical/method warning and can over-match business nouns. `needs_review` has insufficient metadata. The full JSON contains parameter and request/response schema structure, local schema definitions, and reasons; example/default payload values are omitted.", "", "## Reproduce", "", "```sh", "node scripts/scan_reader_swagger.mjs --policy platform-gateway/config/reader-network-policy.json --out-dir doc/admin-portal-reader/swagger-2026-09-07", "node --test scripts/test_scan_reader_swagger.mjs", "```", "", "The command fetches only the local Swagger document using GET and refuses redirects. It does not invoke any operation listed in that document. `--input <local-openapi.json>` supports an offline rerun; `--policy` is optional. No runtime policy is generated or overwritten.", "", "## Unmapped Allowlist Entries", "", "| Method | Path |", "| --- | --- |", ...inventory.unmappedAllowlist.map((item) => `| ${cell(item.method)} | ${cell(item.path)} |`), "", "Unmapped entries are not automatically removed: this Swagger may omit routes or differ from the deployed portal API. Compare the implementation or authorized page requests before editing policy.", "", "## Operations", "", "| Method | Path | Classification | Heuristic | Tags | Request Body | Responses |", "| --- | --- | --- | --- | --- | --- | --- |", ...inventory.operations.map((op) => `| ${op.method} | ${cell(op.path)} | ${op.classification} | ${op.heuristicClassification} | ${cell(op.tags.join(", "))} | ${op.requestBody ? "yes" : "no"} | ${cell(Object.keys(op.responses).join(", "))} |`), ""];
  const mappings = inventory.policyMappings.flatMap((entry) => entry.swaggerMatches.filter((match) => match.matchKind !== "exact").map((match) => `| ${entry.method} | ${cell(entry.path)} | ${cell(match.path)} | ${match.matchKind} |`));
  lines.splice(lines.indexOf("## Operations"), 0,
    "## Approximate Schema Mappings", "",
    "These mappings prevent false missing-route reports. They do not mean the full Swagger template is allowed: a concrete path can cover only one parameter value, and runtime colon placeholders may impose additional value constraints. Only exact method/path matches receive the `existing_allowlist` classification.", "",
    "| Method | Policy Path | Swagger Path | Match Kind |", "| --- | --- | --- | --- |", ...mappings, "",
    "## Runtime Boundary", "",
    "This inventory does not enable or disable enforcement. The local runtime switch and hand-maintained policy are managed separately. Disabling the method/path whitelist is a business-validation override, not read-only certification; other action, origin and navigation checks do not prove that every automatically issued API request is safe. No candidate classifications are automatically promoted into the policy.", "");
  return lines.join("\n");
}

async function main() {
  const options = {};
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    if (!["--input", "--policy", "--out-dir"].includes(args[index]) || !args[index + 1]) throw new Error("Usage: node scripts/scan_reader_swagger.mjs [--input file] [--policy file] [--out-dir directory]");
    options[args[index].slice(2)] = args[index + 1];
  }
  const source = options.input ? resolve(options.input) : DEFAULT_SOURCE;
  let sourceText;
  if (options.input) sourceText = await readFile(source, "utf8");
  else {
    const response = await fetch(DEFAULT_SOURCE, { method: "GET", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Swagger request failed: HTTP ${response.status}`);
    sourceText = await response.text();
  }
  const policy = options.policy ? JSON.parse(await readFile(options.policy, "utf8")) : {};
  const inventory = inventorySwagger(JSON.parse(sourceText), { policy, source, sourceSha256: createHash("sha256").update(sourceText).digest("hex") });
  const outDir = resolve(options["out-dir"] ?? "doc/admin-portal-reader/swagger-2026-09-07");
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
  await writeFile(resolve(outDir, "README.md"), renderInventory(inventory));
  console.log(JSON.stringify({ outDir, ...inventory.summary }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
