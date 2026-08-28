import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const readArg = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const baseUrl = readArg("--base-url") || process.env.UMC_BASE_URL || "http://localhost:5174";
const validToken = readArg("--valid-token") || process.env.UMC_DECLARATION_VALID_TOKEN || "";
const expiredToken = readArg("--expired-token") || process.env.UMC_DECLARATION_EXPIRED_TOKEN || "";

assert(
  validToken,
  "A real signature token is required. Pass --valid-token <token> or set UMC_DECLARATION_VALID_TOKEN.",
);
const codexHome = process.env.CODEX_HOME || path.join(homedir(), ".codex");
const pwcli = process.env.PWCLI || path.join(
  codexHome,
  "skills/playwright/scripts/playwright_cli.sh",
);
const session = `inspection-declaration-route-${process.pid}`;
const socketsDir = path.join(tmpdir(), session);
const env = {
  ...process.env,
  PLAYWRIGHT_SOCKETS_DIR: socketsDir,
  UMC_PLAYWRIGHT_SOCKETS_DIR: socketsDir,
  UMC_PLAYWRIGHT_OUTPUT_DIR: path.join(socketsDir, "output"),
};
delete env.PLAYWRIGHT_CLI_SESSION;
delete env.UMC_PLAYWRIGHT_SESSION;
mkdirSync(socketsDir, { recursive: true });

const run = (...commandArgs) => {
  const result = spawnSync(
    pwcli,
    ["--session", session, "--raw", ...commandArgs],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env,
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `${path.basename(pwcli)} ${commandArgs.join(" ")} failed with exit code ${result.status}.`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout.trim();
};

const evaluate = (expression) => JSON.parse(run("eval", expression));

const waitFor = (expression, label) => {
  const timeoutAt = Date.now() + 30_000;
  let state = {};

  while (Date.now() < timeoutAt) {
    state = evaluate(expression);
    if (state.ready) return state;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }

  throw new Error(`Timed out waiting for ${label}. Last state: ${JSON.stringify(state)}`);
};

const goto = (pathname) => run("goto", new URL(pathname, baseUrl).toString());

const getLatestDeclarationRequestIndex = () => {
  const requests = run("requests");
  const matches = [...requests.matchAll(/^(\d+)\. \[GET\] .*\/api\/inspection\/signature\/context\b/gm)];
  assert(matches.length > 0, `Signature context request was not captured.\n${requests}`);
  return matches.at(-1)[1];
};

try {
  run("open", new URL(`/inspection-declaration?token=${encodeURIComponent(validToken)}`, baseUrl).toString());
  run("resize", "1920", "1200");

  const validState = waitFor(
    `() => ({
      ready: document.body.innerText.includes('Contact Person Information'),
      pathname: window.location.pathname,
      hash: window.location.hash,
      hasStandaloneRoot: Boolean(document.getElementById('inspection-declaration-root')),
      hasPortalRoot: Boolean(document.getElementById('root')),
    })`,
    "the valid declaration form",
  );
  assert.equal(validState.pathname, "/inspection-declaration");
  assert.equal(validState.hash, "");
  assert.equal(validState.hasStandaloneRoot, true);
  assert.equal(validState.hasPortalRoot, false);

  const sentinelStorageValue = JSON.stringify({
    value: "customer-portal-token-sentinel",
    timestamp: Date.now(),
  });
  run("localstorage-set", "NMA_SERVICES_AUTH_TOKEN", sentinelStorageValue);
  run("reload");
  waitFor(
    `() => ({ ready: document.body.innerText.includes('Contact Person Information') })`,
    "the declaration form after reload",
  );

  const declarationRequestIndex = getLatestDeclarationRequestIndex();
  const declarationHeaders = run("request-headers", declarationRequestIndex);
  assert.doesNotMatch(
    declarationHeaders,
    /^authorization:/im,
    `Declaration request must not include Customer Portal authorization.\n${declarationHeaders}`,
  );
  assert.equal(
    evaluate(`() => localStorage.getItem('NMA_SERVICES_AUTH_TOKEN')`),
    sentinelStorageValue,
  );

  if (expiredToken) {
    goto(`/inspection-declaration?token=${encodeURIComponent(expiredToken)}`);
    const expiredState = waitFor(
      `() => ({
        ready: document.body.innerText.includes('Link Expired'),
        pathname: window.location.pathname,
        search: window.location.search,
      })`,
      "the expired declaration result",
    );
    assert.equal(expiredState.pathname, "/inspection-declaration");
    assert.equal(
      expiredState.search,
      `?token=${encodeURIComponent(expiredToken)}`,
    );
  }

  goto("/inspection-declaration?token=invalid");
  const invalidState = waitFor(
    `() => ({
      ready: document.body.innerText.includes('Link Expired'),
      pathname: window.location.pathname,
      search: window.location.search,
    })`,
    "the invalid declaration result",
  );
  assert.equal(invalidState.pathname, "/inspection-declaration");
  assert.equal(invalidState.search, "?token=invalid");

  goto("/inspection-declaration");
  const missingState = waitFor(
    `() => ({
      ready: document.body.innerText.includes('Link Expired'),
      pathname: window.location.pathname,
    })`,
    "the missing-token result",
  );
  assert.equal(missingState.pathname, "/inspection-declaration");

  goto(`/inspection-declaration.html?token=${encodeURIComponent(validToken)}#/`);
  const legacyState = waitFor(
    `() => ({
      ready: document.body.innerText.includes('Contact Person Information'),
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    })`,
    "the legacy declaration URL redirect",
  );
  assert.equal(legacyState.pathname, "/inspection-declaration");
  assert.equal(legacyState.search, `?token=${encodeURIComponent(validToken)}`);
  assert.equal(legacyState.hash, "");


  evaluate(`() => {
    document.querySelector('.inspection-declaration__submit').click();
    return true;
  }`);
  const submittedState = waitFor(
    `() => ({
      ready: document.body.innerText.includes('Declaration Already Submitted'),
      pathname: window.location.pathname,
      search: window.location.search,
    })`,
    "the submitted declaration state",
  );
  assert.equal(submittedState.pathname, "/inspection-declaration");
  assert.equal(submittedState.search, "?token=12345");

  goto("/login");
  const loginState = waitFor(
    `() => ({
      ready: document.body.innerText.includes('Login'),
      pathname: window.location.pathname,
      hasStandaloneRoot: Boolean(document.getElementById('inspection-declaration-root')),
      hasPortalRoot: Boolean(document.getElementById('root')),
    })`,
    "the Customer Portal login route",
  );
  assert.equal(loginState.pathname, "/login");
  assert.equal(loginState.hasStandaloneRoot, false);
  assert.equal(loginState.hasPortalRoot, true);

  console.log("Inspection declaration route checks passed.");
} finally {
  try {
    run("close");
  } catch (error) {
    console.error(`Failed to close Playwright session ${session}:`, error.message);
  }
}
