import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import ts from "typescript";

const modulePath = path.resolve(
  "src/components/designable/src/components/FormItemWithHtmlTooltip/sanitizeTooltipHtml.ts",
);
const source = fs.readFileSync(modulePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const testWindow = new JSDOM("").window;
const purifier = createDOMPurify(testWindow);
const testModule = { exports: {} };

new Function("exports", "module", "require", compiled)(
  testModule.exports,
  testModule,
  (specifier) => {
    if (specifier === "dompurify") {
      return { __esModule: true, default: purifier };
    }
    throw new Error(`Unexpected dependency: ${specifier}`);
  },
);

const { sanitizeTooltipHtml } = testModule.exports;

function assertNoActiveContent(html) {
  const fragment = JSDOM.fragment(html);

  assert.equal(
    fragment.querySelector(
      "script, style, svg, math, iframe, object, embed, form, input, button",
    ),
    null,
  );

  for (const element of fragment.querySelectorAll("*")) {
    for (const attribute of element.attributes) {
      assert.equal(
        attribute.name.toLowerCase().startsWith("on"),
        false,
        `unexpected event handler ${attribute.name}`,
      );
    }

    for (const attributeName of ["href", "src", "poster"]) {
      const value = element.getAttribute(attributeName);
      if (value) {
        assert.doesNotMatch(
          value,
          /^\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i,
        );
      }
    }
  }
}

test("preserves supported tooltip formatting and safe HTTPS links", () => {
  const clean = sanitizeTooltipHtml(
    '<p><strong>Upload</strong> a <a href="https://example.com/help">PDF</a>.</p>',
  );

  assert.match(clean, /<p>/);
  assert.match(clean, /<strong>Upload<\/strong>/);
  assert.match(clean, /href="https:\/\/example\.com\/help"/);
  assertNoActiveContent(clean);
});

test("removes event handlers and dangerous URL schemes", () => {
  const clean = sanitizeTooltipHtml(
    '<img src="javascript:alert(1)" onerror="alert(2)"><p onclick="alert(3)">Help</p><a href="javascript:alert(4)">Open</a>',
  );

  assert.doesNotMatch(clean, /onerror|onclick|javascript:/i);
  assertNoActiveContent(clean);
});

test("rejects SVG, MathML, and active embed content", () => {
  const clean = sanitizeTooltipHtml(
    '<svg><a xlink:href="javascript:alert(1)">x</a></svg><math><mi xlink:href="data:x,<script>alert(2)</script>">x</mi></math><iframe srcdoc="<script>alert(3)</script>"></iframe><form><input autofocus onfocus="alert(4)"></form>',
  );

  assertNoActiveContent(clean);
});

test("sanitizes malformed markup without leaving executable descendants", () => {
  const clean = sanitizeTooltipHtml(
    '<svg><g/onload=alert(1)//<p><img src=x onerror=alert(2)><strong>Help',
  );

  assert.match(clean, /Help/);
  assertNoActiveContent(clean);
});

test("the Formily tooltip sink renders only the sanitized value", () => {
  const componentSource = fs.readFileSync(
    "src/components/designable/src/components/FormItemWithHtmlTooltip/index.tsx",
    "utf8",
  );

  assert.match(
    componentSource,
    /const sanitizedTooltip = sanitizeTooltipHtml\(normalizedTooltip\)/,
  );
  assert.match(
    componentSource,
    /dangerouslySetInnerHTML=\{\{ __html: sanitizedTooltip \}\}/,
  );
  assert.doesNotMatch(
    componentSource,
    /dangerouslySetInnerHTML=\{\{ __html: normalizedTooltip \}\}/,
  );
});

test("shared tooltip renderers sanitize their HTML", () => {
  const expectations = [
    [
      "src/components/designable/src/components/FormItemWithHtmlTooltip/renderDescriptionTooltip.tsx",
      /const sanitizedContent = sanitizeTooltipHtml\(content\)[\s\S]*dangerouslySetInnerHTML=\{\{ __html: sanitizedContent \}\}/,
    ],
    [
      "src/components/designable/src/components/Card/preview.tsx",
      /const sanitizedDescTooltip = sanitizeTooltipHtml\(descTooltip \?\? ""\)[\s\S]*__html: sanitizedDescTooltip/,
    ],
  ];

  for (const [filePath, pattern] of expectations) {
    const componentSource = fs.readFileSync(filePath, "utf8");
    assert.match(componentSource, pattern, `${filePath} must sanitize its HTML`);
  }
});
