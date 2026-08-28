import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const cssDir = process.env.CSS_REM_BUILD_DIR
  ? resolve(process.env.CSS_REM_BUILD_DIR)
  : resolve(process.cwd(), "dist/assets");

function fail(message) {
  console.error(`[css-rem-check] ${message}`);
  process.exit(1);
}

if (!existsSync(cssDir)) {
  fail(`CSS directory not found: ${cssDir}`);
}

const cssFiles = readdirSync(cssDir).filter((file) => file.endsWith(".css"));
const forbiddenPatterns = [
  {
    label: "header padding stayed px",
    pattern: /\.header\{padding:27px\b/,
  },
  {
    label: "header logo stayed px",
    pattern: /\.header \.logo\{[^}]*\b(?:height:68px|inset-inline-start:40px|top:26px)\b/,
  },
  {
    label: "menu container stayed px",
    pattern: /\.menu\{[^}]*\b(?:column-gap:36px|padding:8px|border-radius:999px)\b/,
  },
  {
    label: "main background padding stayed px",
    pattern: /\.mainbac\{[^}]*padding:180px 0\b/,
  },
  {
    label: "layout content padding stayed px",
    pattern: /\.layout-content\{[^}]*padding:0 120px 48px\b/,
  },
];

let layoutCssCount = 0;
const convertedChecks = [
  {
    label: "header padding",
    pattern: /\.header\{[^}]*padding:1\.6875rem\b/,
  },
  {
    label: "header logo",
    pattern: /\.header \.logo\{[^}]*\bheight:4\.25rem\b[^}]*\binset-inline-start:2\.5rem\b[^}]*\btop:1\.625rem\b/,
  },
  {
    label: "menu container",
    pattern: /\.menu\{[^}]*\bcolumn-gap:2\.25rem\b[^}]*\bpadding:\.5rem\b[^}]*\bborder-radius:62\.4375rem\b/,
  },
];
const convertedHits = new Set();
const failures = [];

for (const file of cssFiles) {
  const css = readFileSync(resolve(cssDir, file), "utf8");

  if (!css.includes(".header{padding:") || !css.includes(".mainbac{")) {
    continue;
  }

  layoutCssCount += 1;

  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(css)) {
      failures.push(`${file}: ${label}`);
    }
  }

  for (const { label, pattern } of convertedChecks) {
    if (pattern.test(css)) {
      convertedHits.add(label);
    }
  }
}

if (layoutCssCount === 0) {
  fail("No CSS file containing layout/header rules was found.");
}

if (failures.length > 0) {
  fail(`Unexpected px layout rules:\n${failures.join("\n")}`);
}

const missingConvertedChecks = convertedChecks
  .map(({ label }) => label)
  .filter((label) => !convertedHits.has(label));

if (missingConvertedChecks.length > 0) {
  fail(
    `Expected rem-converted rules were not found: ${missingConvertedChecks.join(", ")}`,
  );
}

console.log(`[css-rem-check] ok (${layoutCssCount} layout CSS file checked)`);
