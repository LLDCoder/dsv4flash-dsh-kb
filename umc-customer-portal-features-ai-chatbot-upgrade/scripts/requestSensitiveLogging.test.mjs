import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const requestSource = await readFile(
  new URL("../src/utils/request.ts", import.meta.url),
  "utf8",
);

test("network error logging redacts sensitive request body fields", () => {
  assert.match(requestSource, /redactSensitiveRequestData/);
  assert.match(requestSource, /token\|password\|secret\|authorization/i);
  assert.match(requestSource, /\[REDACTED REQUEST BODY\]/);
  assert.match(
    requestSource,
    /requestData: redactSensitiveRequestData\(requestConfig\.data\)/,
  );
  assert.doesNotMatch(
    requestSource,
    /Network request failed:[\s\S]*details: error/,
  );
  assert.doesNotMatch(requestSource, /console\.log\([^\n]*error[^\n]*\)/);
});
