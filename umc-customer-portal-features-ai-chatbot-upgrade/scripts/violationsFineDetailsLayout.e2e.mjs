import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const DEFAULT_BASE_URL = "http://localhost:5174";
const DEFAULT_VIEWPORT_WIDTH = 1920;
const DEFAULT_VIEWPORT_HEIGHT = 1200;
const TEST_CASES = [
  {
    violationNo: "VN-2026-6330050",
    countHeader: { en: "Count", ar: "العدد" },
    violationText: {
      en: "Printing, circulating, or publishing media content without a permit",
      ar: "طباعة أو تداول أو نشر محتوى إعلامي مقروء أو مسموع أو مرئي دون الحصول على تصريح من المجلس أو السلطة المختصة، بحسب الأحوال.",
    },
  },
  {
    violationNo: "VN-2026-0322175",
    countHeader: { en: "Degree", ar: "الدرجة" },
    violationText: {
      en: "Inciting sectarian, regional, tribal strife, inciting violence, hatred, terrorist acts, stirring up resentment, and sowing discord in society.",
      ar: "إثارة النعرات المذهبية والجهوية والقبلية والتحريض على العنف والكراهية والأعمال الإرهابية وإثارة البغضاء وبث روح الشقاق في المجتمع.",
    },
    reportedTag: { en: "Degree 2:", ar: "الدرجة 2:" },
  },
];

const args = process.argv.slice(2);
const readArg = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const email = readArg("--email") || process.env.UMC_LOGIN_EMAIL;
const password = readArg("--password") || process.env.UMC_LOGIN_PASSWORD;
const baseUrl = readArg("--base-url") || process.env.UMC_BASE_URL || DEFAULT_BASE_URL;
const viewportWidth = Number(
  readArg("--width") || process.env.UMC_VIEWPORT_WIDTH || DEFAULT_VIEWPORT_WIDTH,
);
const viewportHeight = Number(
  readArg("--height") || process.env.UMC_VIEWPORT_HEIGHT || DEFAULT_VIEWPORT_HEIGHT,
);
const isMobileViewport = viewportWidth <= 768;
const loginViewportWidth = isMobileViewport ? DEFAULT_VIEWPORT_WIDTH : viewportWidth;
const loginViewportHeight = isMobileViewport ? DEFAULT_VIEWPORT_HEIGHT : viewportHeight;
const capture = args.includes("--capture");
const outputDir = path.resolve(readArg("--output-dir") || "output/playwright");
const codexHome = process.env.CODEX_HOME || path.join(homedir(), ".codex");
const pwcli = process.env.PWCLI || path.join(codexHome, "skills/playwright/scripts/playwright_cli.sh");
const loginHelper = path.join(
  codexHome,
  "skills/umc-customer-browser-test/scripts/login_and_prepare_session.sh",
);
const socketsDir = path.join(tmpdir(), `umc-fine-details-${process.pid}`);

assert(email, "Pass --email or set UMC_LOGIN_EMAIL.");
assert(password, "Pass --password or set UMC_LOGIN_PASSWORD.");
assert(Number.isFinite(viewportWidth) && viewportWidth > 0, "Viewport width must be a positive number.");
assert(Number.isFinite(viewportHeight) && viewportHeight > 0, "Viewport height must be a positive number.");

mkdirSync(socketsDir, { recursive: true });
if (capture) mkdirSync(outputDir, { recursive: true });

const commandEnv = {
  ...process.env,
  PLAYWRIGHT_SOCKETS_DIR: socketsDir,
};
delete commandEnv.PLAYWRIGHT_CLI_SESSION;
delete commandEnv.UMC_PLAYWRIGHT_SESSION;

const run = (file, commandArgs, options = {}) => {
  const result = spawnSync(file, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: commandEnv,
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `${path.basename(file)} ${commandArgs.join(" ")} failed with exit code ${result.status}.`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout.trim();
};

const loginOutput = run(loginHelper, [
  "--base-url",
  baseUrl,
  "--email",
  email,
  "--password",
  password,
  "--width",
  String(loginViewportWidth),
  "--height",
  String(loginViewportHeight),
  "--target-path",
  `/violations-fines/violations/${TEST_CASES[0].violationNo}`,
]);
const sessionMatch = loginOutput.match(/Playwright session '([^']+)' is ready\./);
assert(sessionMatch, `Unable to read the Playwright session name.\n${loginOutput}`);
const session = sessionMatch[1];

const cli = (...commandArgs) =>
  run(pwcli, ["--session", session, "--raw", ...commandArgs]);

if (isMobileViewport) {
  cli("resize", String(viewportWidth), String(viewportHeight));
}

const evaluateJson = (expression) => JSON.parse(cli("eval", expression));

const waitForFineDetails = () => {
  const timeoutAt = Date.now() + 30_000;
  let lastState = {};

  while (Date.now() < timeoutAt) {
    lastState = evaluateJson(
      "() => { const cell = document.querySelector('.violations-fines-table--fine .ant-table-tbody > .ant-table-row td'); const text = cell?.textContent?.trim() || ''; return { url: location.href, title: document.title, hasLogin: Boolean(document.querySelector('#loginProvider')), hasTable: Boolean(document.querySelector('.violations-fines-table--fine')), cellText: text, ready: Boolean(text && !/^-+$/.test(text) && document.querySelector('.violations-fines-total-fee strong')) }; }",
    );
    if (lastState.ready) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }

  throw new Error(`Timed out waiting for the Fine Details table. Last state: ${JSON.stringify(lastState)}`);
};

const setLanguage = (language) => {
  cli("localstorage-set", "language", language);
  cli("reload");
  waitForFineDetails();
};

const getPageState = () =>
  evaluateJson(`() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const table = document.querySelector('.violations-fines-table--fine table');
    const tableWrap = document.querySelector('.violations-fines-fine-details-table-wrap');
    const headers = [...document.querySelectorAll('.violations-fines-table--fine thead th')];
    const rows = [...document.querySelectorAll('.violations-fines-table--fine .ant-table-tbody > .ant-table-row')];
    const total = document.querySelector('.violations-fines-total-fee');
    const totalLabel = total.querySelector('span');
    const totalValue = total.querySelector('strong');
    const reportedHeader = document.querySelector('.violations-fines-reported-item__header');
    const reportedTitle = reportedHeader?.querySelector('.violations-fines-reported-item__title');
    const reportedTitles = [...document.querySelectorAll('.violations-fines-reported-item__title')];
    const reportedTag = reportedHeader?.querySelector('.violations-fines-reported-item__tag');
    const reportedLeft = reportedHeader?.querySelector('.violations-fines-reported-item__left');
    const headerRects = headers.map(rect);
    const rowRects = rows.map((row) => [...row.cells].map(rect));
    const tableWrapRect = rect(tableWrap);
    const isInsideTableWrap = (value) =>
      value.left >= tableWrapRect.left - 1 && value.right <= tableWrapRect.right + 1;

    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      viewportWidth: window.innerWidth,
      documentFitsViewport: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      tableVisible: Boolean(table && table.getBoundingClientRect().height > 0),
      tableWidth: table?.getBoundingClientRect().width || 0,
      tableWrapWidth: tableWrap.clientWidth,
      tableWrapScrollable: tableWrap.scrollWidth > tableWrap.clientWidth,
      allColumnsVisible: headerRects.every(isInsideTableWrap) && rowRects.flat().every(isInsideTableWrap),
      tableHeaders: headers.map((header) => header.textContent.trim()),
      rowCount: rows.length,
      rowTexts: rows.map((row) => [...row.cells].map((cell) => cell.textContent.trim())),
      columnWidthsAligned: rowRects.every((cells) => cells.length === headerRects.length && cells.every((cell, index) => Math.abs(cell.width - headerRects[index].width) < 1)),
      amountColumnWidth: headerRects[2]?.width || 0,
      amountCellsFit: rows.every((row) => row.cells[2].scrollWidth <= row.cells[2].clientWidth),
      totalLabel: totalLabel.textContent.trim(),
      totalLabelWidth: totalLabel.clientWidth,
      totalLabelFits: totalLabel.scrollWidth <= totalLabel.clientWidth,
      totalValueFits: totalValue.scrollWidth <= totalValue.clientWidth,
      totalPartsOverlap: intersects(rect(totalLabel), rect(totalValue)),
      reportedTitle: reportedTitle?.textContent.trim() || '',
      reportedTextAlign: reportedTitle ? getComputedStyle(reportedTitle).textAlign : '',
      reportedTitlesPresent: reportedTitles.length > 0 && reportedTitles.every((title) => title.textContent.trim()),
      reportedTitlesFullyVisible: reportedTitles.length > 0 && reportedTitles.every(
        (title) => title.scrollWidth <= title.clientWidth && title.scrollHeight <= title.clientHeight,
      ),
      violationCellsFullyVisible: rows.length > 0 && rows.every((row) => {
        const cell = row.cells[0];
        return cell && cell.scrollWidth <= cell.clientWidth && cell.scrollHeight <= cell.clientHeight;
      }),
      reportedTag: reportedTag?.textContent.replace(/\s+/g, ' ').trim() || '',
      reportedPartsOverlap: reportedTag && reportedLeft ? intersects(rect(reportedTag), rect(reportedLeft)) : false,
      reportedTagInsideHeader: reportedTag ? rect(reportedTag).left >= rect(reportedHeader).left && rect(reportedTag).right <= rect(reportedHeader).right : true,
    };
  }`);

const addAnnotationsAndCapture = (testCase, language) => {
  const viewportSuffix =
    viewportWidth === DEFAULT_VIEWPORT_WIDTH && viewportHeight === DEFAULT_VIEWPORT_HEIGHT
      ? ""
      : `-${viewportWidth}x${viewportHeight}`;
  const screenshotPath = path.join(
    outputDir,
    `${testCase.violationNo}-${language}${viewportSuffix}-annotated.png`,
  );
  const labels =
    language === "ar"
      ? [
          [".violations-fines-reported-item__header", "RTL reported row: localized and aligned"],
          [".violations-fines-fine-details-table-wrap", "Fine table: Arabic content and flexible total label"],
        ]
      : [
          [".violations-fines-reported-item__header", "Reported row: aligned"],
          [".violations-fines-fine-details-table-wrap", "Fine table: columns aligned without overflow"],
        ];
  const screenshotLabels = isMobileViewport ? [labels[0]] : labels;

  cli(
    "eval",
    `() => {
      const labels = ${JSON.stringify(screenshotLabels)};
      document.querySelectorAll('[data-layout-annotation]').forEach((node) => node.remove());
      for (const [selector, text] of labels) {
        const target = document.querySelector(selector);
        if (!target) continue;
        target.style.outline = '3px solid #e53935';
        target.style.outlineOffset = '4px';
        const label = document.createElement('div');
        label.dataset.layoutAnnotation = 'true';
        label.textContent = text;
        label.style.cssText = 'background:#e53935;color:#fff;font:600 14px/20px Arial;padding:4px 8px;border-radius:4px;position:absolute;z-index:99999;pointer-events:none;';
        const box = target.getBoundingClientRect();
        label.style.left = Math.max(8, box.left) + window.scrollX + 'px';
        label.style.top = Math.max(8, box.top - 32) + window.scrollY + 'px';
        document.body.appendChild(label);
      }
      const mobileTarget = document.querySelector('.violations-fines-reported-item__header');
      if (window.innerWidth <= 768 && mobileTarget) {
        mobileTarget.scrollIntoView({ block: 'center', inline: 'nearest' });
      } else {
        window.scrollTo(0, 0);
      }
      return true;
    }`,
  );
  const screenshotOutput = cli("screenshot");
  const generatedPath = screenshotOutput.match(/\(([^)]+\.png)\)/)?.[1] || screenshotOutput.trim();
  assert(generatedPath.endsWith(".png"), `Unable to read screenshot path.\n${screenshotOutput}`);
  copyFileSync(path.resolve(generatedPath), screenshotPath);

  if (
    viewportWidth !== DEFAULT_VIEWPORT_WIDTH ||
    viewportHeight !== DEFAULT_VIEWPORT_HEIGHT
  ) {
    const fineDetailsScreenshotPath = path.join(
      outputDir,
      `${testCase.violationNo}-${language}${viewportSuffix}-fine-details-annotated.png`,
    );
    cli(
      "eval",
      `() => {
        document.querySelectorAll('[data-layout-annotation]').forEach((node) => node.remove());
        const target = document.querySelector('.violations-fines-fine-details-table-wrap');
        if (!target) throw new Error('Fine Details table wrapper not found.');
        target.scrollIntoView({ block: 'center', inline: 'nearest' });
        target.style.outline = '3px solid #e53935';
        target.style.outlineOffset = '4px';
        const label = document.createElement('div');
        label.dataset.layoutAnnotation = 'true';
        label.textContent = ${JSON.stringify(labels[1][1])};
        label.style.cssText = 'background:#e53935;color:#fff;font:600 14px/20px Arial;padding:4px 8px;border-radius:4px;position:fixed;left:8px;top:8px;z-index:99999;pointer-events:none;';
        document.body.appendChild(label);
        return true;
      }`,
    );
    const fineDetailsScreenshotOutput = cli("screenshot");
    const generatedFineDetailsPath =
      fineDetailsScreenshotOutput.match(/\(([^)]+\.png)\)/)?.[1] ||
      fineDetailsScreenshotOutput.trim();
    assert(
      generatedFineDetailsPath.endsWith(".png"),
      `Unable to read Fine Details screenshot path.\n${fineDetailsScreenshotOutput}`,
    );
    copyFileSync(path.resolve(generatedFineDetailsPath), fineDetailsScreenshotPath);

    const amountScreenshotPath = path.join(
      outputDir,
      `${testCase.violationNo}-${language}${viewportSuffix}-fine-amount-annotated.png`,
    );
    cli(
      "eval",
      `() => {
        const target = document.querySelector('.violations-fines-fine-details-table-wrap');
        if (!target) throw new Error('Fine Details table wrapper not found.');
        target.scrollLeft = document.documentElement.dir === 'rtl'
          ? -target.scrollWidth
          : target.scrollWidth;
        const label = document.querySelector('[data-layout-annotation]');
        if (label) {
          label.textContent = ${JSON.stringify(
            language === "ar"
              ? "Fine table: Arabic amount and total columns fit"
              : "Fine table: amount and total columns fit",
          )};
        }
        return true;
      }`,
    );
    const amountScreenshotOutput = cli("screenshot");
    const generatedAmountPath =
      amountScreenshotOutput.match(/\(([^)]+\.png)\)/)?.[1] ||
      amountScreenshotOutput.trim();
    assert(
      generatedAmountPath.endsWith(".png"),
      `Unable to read amount screenshot path.\n${amountScreenshotOutput}`,
    );
    copyFileSync(path.resolve(generatedAmountPath), amountScreenshotPath);
  }
};

try {
  for (const [testCaseIndex, testCase] of TEST_CASES.entries()) {
    if (testCaseIndex > 0) {
      cli("goto", `${baseUrl}/violations-fines/violations/${testCase.violationNo}`);
    }
    waitForFineDetails();

    for (const language of ["en", "ar"]) {
      setLanguage(language);
      const state = getPageState();
      const expectedDir = language === "ar" ? "rtl" : "ltr";
      const minimumTotalLabelWidth = 120;

      assert.equal(state.lang, language, `${testCase.violationNo} must render with lang=${language}.`);
      assert.equal(state.dir, expectedDir, `${testCase.violationNo} must render with dir=${expectedDir}.`);
      assert.equal(state.viewportWidth, viewportWidth, `${testCase.violationNo} ${language}: viewport width is incorrect.`);
      assert(state.documentFitsViewport, `${testCase.violationNo} ${language}: page must not overflow the viewport horizontally.`);
      assert(state.tableVisible, `${testCase.violationNo} ${language}: fine table must be visible.`);
      assert.equal(state.tableHeaders.length, 3, `${testCase.violationNo} ${language}: fine table must have three columns.`);
      assert.equal(state.tableHeaders[1], testCase.countHeader[language], `${testCase.violationNo} ${language}: count/degree header is incorrect.`);
      assert(state.rowCount > 0, `${testCase.violationNo} ${language}: fine table must contain rows.`);
      assert.equal(state.rowTexts[0][0], testCase.violationText[language], `${testCase.violationNo} ${language}: localized violation text is incorrect.`);
      assert(state.columnWidthsAligned, `${testCase.violationNo} ${language}: header and body column widths must align.`);
      assert(state.amountColumnWidth >= 120, `${testCase.violationNo} ${language}: amount column must be at least 120px.`);
      assert(state.amountCellsFit, `${testCase.violationNo} ${language}: amount cells must not overflow.`);
      if (isMobileViewport) {
        assert(state.tableWidth <= state.tableWrapWidth + 1, `${testCase.violationNo} ${language}: mobile fine table must fit its card.`);
        assert(!state.tableWrapScrollable, `${testCase.violationNo} ${language}: mobile fine table must not require horizontal scrolling.`);
        assert(state.allColumnsVisible, `${testCase.violationNo} ${language}: every mobile table column must be visible at once.`);
        assert(state.reportedTitlesPresent, `${testCase.violationNo} ${language}: reported violation titles must exist.`);
        assert(state.reportedTitlesFullyVisible, `${testCase.violationNo} ${language}: every reported violation title must be fully visible.`);
        assert(state.violationCellsFullyVisible, `${testCase.violationNo} ${language}: every violation table cell must be fully visible.`);
      }
      assert(state.totalLabelWidth >= minimumTotalLabelWidth, `${testCase.violationNo} ${language}: total label column must be at least ${minimumTotalLabelWidth}px.`);
      assert(state.totalLabelFits, `${testCase.violationNo} ${language}: total label must expand to fit its text.`);
      assert(state.totalValueFits, `${testCase.violationNo} ${language}: total value must not overflow.`);
      assert(!state.totalPartsOverlap, `${testCase.violationNo} ${language}: total label and value must not overlap.`);
      assert(!state.reportedPartsOverlap, `${testCase.violationNo} ${language}: reported title and tag must not overlap.`);
      assert(state.reportedTagInsideHeader, `${testCase.violationNo} ${language}: reported tag must stay inside its header.`);
      assert(
        language === "ar"
          ? ["right", "start"].includes(state.reportedTextAlign)
          : ["left", "start"].includes(state.reportedTextAlign),
        `${testCase.violationNo} ${language}: reported title must use locale-aware text alignment. Actual: ${state.reportedTextAlign}`,
      );

      if (testCase.reportedTag) {
        assert(
          state.reportedTag.startsWith(testCase.reportedTag[language]),
          `${testCase.violationNo} ${language}: reported tag is not localized correctly. Actual: ${state.reportedTag}`,
        );
      }

      if (capture) addAnnotationsAndCapture(testCase, language);
      console.log(`PASS ${testCase.violationNo} ${language}`);
    }
  }
} finally {
  try {
    cli("close");
  } catch (error) {
    console.error(`Failed to close Playwright session ${session}:`, error.message);
  }
}
