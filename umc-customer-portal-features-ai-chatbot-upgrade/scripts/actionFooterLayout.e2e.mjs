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
const email = readArg("--email") || process.env.UMC_LOGIN_EMAIL;
const password = readArg("--password") || process.env.UMC_LOGIN_PASSWORD;
const capture = args.includes("--capture");
const outputDir = path.resolve(
  readArg("--output-dir") || "output/playwright/action-footer-layout",
);
const codexHome = process.env.CODEX_HOME || path.join(homedir(), ".codex");
const pwcli = path.join(codexHome, "skills/playwright/scripts/playwright_cli.sh");
const loginHelper = path.join(
  codexHome,
  "skills/umc-customer-browser-test/scripts/login_and_prepare_session.sh",
);

assert(email, "Pass --email or set UMC_LOGIN_EMAIL.");
assert(password, "Pass --password or set UMC_LOGIN_PASSWORD.");
if (capture) mkdirSync(outputDir, { recursive: true });

const run = (file, commandArgs, env) => {
  const result = spawnSync(file, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const safeArgs = commandArgs.map((argument, index) =>
      commandArgs[index - 1] === "--password" ? "[REDACTED]" : argument,
    );
    throw new Error(
      [
        `${path.basename(file)} ${safeArgs.join(" ")} failed with exit code ${result.status}.`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout.trim();
};

const startSession = (name, targetPath, height) => {
  const socketsDir = path.join(tmpdir(), `umc-action-footer-${name}-${process.pid}`);
  mkdirSync(socketsDir, { recursive: true });
  const env = {
    ...process.env,
    PLAYWRIGHT_SOCKETS_DIR: socketsDir,
    UMC_PLAYWRIGHT_SOCKETS_DIR: socketsDir,
    UMC_PLAYWRIGHT_OUTPUT_DIR: path.join(socketsDir, "output"),
  };
  delete env.PLAYWRIGHT_CLI_SESSION;
  delete env.UMC_PLAYWRIGHT_SESSION;

  const loginOutput = run(
    loginHelper,
    [
      "--base-url",
      baseUrl,
      "--email",
      email,
      "--password",
      password,
      "--width",
      "1920",
      "--height",
      String(height),
      "--target-path",
      targetPath,
      "--headless",
    ],
    env,
  );
  const sessionMatch = loginOutput.match(/Playwright session '([^']+)' is ready\./);
  assert(sessionMatch, `Unable to read the Playwright session name.\n${loginOutput}`);
  const session = sessionMatch[1];
  const cli = (...commandArgs) =>
    run(pwcli, ["--session", session, "--raw", ...commandArgs], env);

  return {
    cli,
    close: () => cli("close"),
    evaluate: (expression) => JSON.parse(cli("eval", expression)),
  };
};

const waitFor = (session, expression, label) => {
  const timeoutAt = Date.now() + 30_000;
  let state = {};

  while (Date.now() < timeoutAt) {
    state = session.evaluate(expression);
    if (state.ready) return state;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }

  throw new Error(`Timed out waiting for ${label}. Last state: ${JSON.stringify(state)}`);
};

const measure = (session, contentSelector) =>
  session.evaluate(`async () => {
    const query = (selector) => document.querySelector(selector);
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { top: value.top, bottom: value.bottom, height: value.height };
    };
    const scrollWrapper = query('.layout-scroll .simplebar-content-wrapper');
    const actionFooter = query('.action-footer');
    const footer = query('.footer');
    const content = query(${JSON.stringify(contentSelector)});
    const scrollRect = rect(scrollWrapper);
    const initial = {
      action: rect(actionFooter),
      footer: rect(footer),
      content: rect(content),
      offset: getComputedStyle(actionFooter).getPropertyValue('--action-footer-offset'),
      expectedActionBottom: Math.min(rect(footer).top, scrollRect.bottom),
    };

    scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
    await new Promise((resolve) => setTimeout(resolve, 120));

    const bottom = {
      action: rect(actionFooter),
      footer: rect(footer),
      content: rect(content),
      offset: getComputedStyle(actionFooter).getPropertyValue('--action-footer-offset'),
    };

    return {
      initial,
      bottom,
      initialGap: initial.expectedActionBottom - initial.action.bottom,
      footerGapAtBottom: bottom.footer.top - bottom.action.bottom,
      contentOverlapAtBottom: Math.max(0, bottom.content.bottom - bottom.action.top),
    };
  }`);

const assertLayout = (name, state) => {
  assert(
    Math.abs(state.initialGap) <= 1,
    `${name}: ActionFooter must be correctly positioned before the first scroll. ` +
      `Measured gap: ${state.initialGap}px. State: ${JSON.stringify(state)}`,
  );
  assert(
    Math.abs(state.footerGapAtBottom) <= 1,
    `${name}: ActionFooter must meet the global footer at the bottom. ` +
      `Measured gap: ${state.footerGapAtBottom}px. State: ${JSON.stringify(state)}`,
  );
  assert(
    state.contentOverlapAtBottom <= 1,
    `${name}: page content must not be covered by ActionFooter. ` +
      `Measured overlap: ${state.contentOverlapAtBottom}px. State: ${JSON.stringify(state)}`,
  );
};

const myRequests = startSession("my-requests", "/my-requests", 1200);
let myRequestsState;
let myRequestsMobileState;
try {
  waitFor(
    myRequests,
    `() => {
      const rows = [...document.querySelectorAll('.ant-table-tbody > tr')];
      const visibleRow = rows.find((row) => row.getBoundingClientRect().height > 0);
      return { ready: Boolean(visibleRow), visibleRows: rows.filter((row) => row.getBoundingClientRect().height > 0).length };
    }`,
    "the My Requests table",
  );
  const opened = myRequests.evaluate(`() => {
    const rows = [...document.querySelectorAll('.ant-table-tbody > tr')];
    const row = rows.find((candidate) => candidate.getBoundingClientRect().height > 0);
    const target = row?.querySelector('td:nth-child(2)') || row;
    target?.click();
    return { clicked: Boolean(row) };
  }`);
  assert(opened.clicked, "A real My Requests row must be available.");
  waitFor(
    myRequests,
    "() => ({ ready: location.pathname === '/my-requests/detail' && Boolean(document.querySelector('.my-requests-box') && document.querySelector('.action-footer')), path: location.pathname, hasBox: Boolean(document.querySelector('.my-requests-box')), hasActionFooter: Boolean(document.querySelector('.action-footer')) })",
    "the My Requests detail page",
  );
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
  myRequestsState = measure(myRequests, ".my-requests-box");
  if (capture) {
    myRequests.cli(
      "screenshot",
      "--filename",
      path.join(outputDir, "my-requests-detail.png"),
    );
  }

  myRequests.cli("localstorage-set", "language", "ar");
  myRequests.cli("resize", "375", "956");
  myRequests.cli("reload");
  waitFor(
    myRequests,
    "() => ({ ready: document.documentElement.dir === 'rtl' && Boolean(document.querySelector('.my-requests-box') && document.querySelector('.action-footer')), path: location.pathname })",
    "the Arabic mobile My Requests detail page",
  );
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
  myRequestsMobileState = measure(myRequests, ".my-requests-box");
  if (capture) {
    myRequests.cli(
      "screenshot",
      "--filename",
      path.join(outputDir, "my-requests-detail-375x956-ar.png"),
    );
  }
} finally {
  myRequests.close();
}

const violation = startSession(
  "violation-detail",
  "/violations-fines/violations/VN-2026-2148422",
  800,
);
let violationState;
try {
  waitFor(
    violation,
    "() => ({ ready: Boolean(document.querySelector('.violations-fines-detail-layout .violations-fines-table')) })",
    "the Violation Details page",
  );
  violationState = measure(violation, ".violations-fines-detail-layout");
  if (capture) {
    violation.cli(
      "screenshot",
      "--filename",
      path.join(outputDir, "violation-detail.png"),
    );
  }
} finally {
  violation.close();
}

console.log(
  JSON.stringify(
    {
      myRequests: myRequestsState,
      myRequestsMobile: myRequestsMobileState,
      violation: violationState,
    },
    null,
    2,
  ),
);
assertLayout("My Requests detail", myRequestsState);
assertLayout("My Requests detail mobile RTL", myRequestsMobileState);
assertLayout("Violation Details", violationState);
console.log("ActionFooter layout checks passed.");
