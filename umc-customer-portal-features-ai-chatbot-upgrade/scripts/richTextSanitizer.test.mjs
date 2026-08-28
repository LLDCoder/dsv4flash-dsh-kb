import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import ts from "typescript";

const modulePath = path.resolve("src/utils/sanitizeRichTextHtml.ts");
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

const { sanitizeRichTextHtml } = testModule.exports;

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
      assert.notEqual(attribute.name.toLowerCase(), "style");
      assert.equal(attribute.name.toLowerCase().startsWith("data-"), false);
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

test("preserves supported rich text, tables, links, images, and RTL metadata", () => {
  const clean = sanitizeRichTextHtml(
    '<h2 dir="rtl">Title</h2><p><strong>Read</strong> <a href="https://example.com/help">help</a>.</p><table><tbody><tr><th scope="col">A</th><td>1</td></tr></tbody></table><img src="/assets/help.png" alt="Help">',
  );

  assert.match(clean, /<h2 dir="rtl">Title<\/h2>/);
  assert.match(clean, /<strong>Read<\/strong>/);
  assert.match(clean, /href="https:\/\/example\.com\/help"/);
  assert.match(clean, /<table>/);
  assert.match(clean, /src="\/assets\/help\.png"/);
  assertNoActiveContent(clean);
});

test("removes executable markup, event handlers, and inline styles", () => {
  const clean = sanitizeRichTextHtml(
    '<script>alert(1)</script><p onclick="alert(2)" style="background:url(javascript:alert(3))">Safe text</p><iframe srcdoc="<script>alert(4)</script>"></iframe><form><input autofocus onfocus="alert(5)"></form>',
  );

  assert.match(clean, /Safe text/);
  assertNoActiveContent(clean);
});

test("rejects dangerous URL schemes and active SVG or MathML content", () => {
  const clean = sanitizeRichTextHtml(
    '<a href="javascript:alert(1)">Open</a><img src="javascript:alert(2)"><video poster="data:text/html,<script>alert(3)</script>"></video><svg><a xlink:href="javascript:alert(4)">SVG</a></svg><math><mi href="data:text/html,x">M</mi></math>',
  );

  assert.match(clean, /Open/);
  assertNoActiveContent(clean);
});

test("sanitizes malformed markup and handles absent content", () => {
  const clean = sanitizeRichTextHtml(
    '<svg><g/onload=alert(1)//<p><img src=x onerror=alert(2)><strong>Content',
  );

  assert.match(clean, /Content/);
  assertNoActiveContent(clean);
  assert.equal(sanitizeRichTextHtml(undefined), "");
  assert.equal(sanitizeRichTextHtml(null), "");
});

test("every general rich-text sink renders only sanitized HTML", () => {
  const expectations = [
    [
      "src/pages/ServiceCard/index.tsx",
      /const sanitizedContent = sanitizeRichTextHtml\(content\)[\s\S]*dangerouslySetInnerHTML=\{\{ __html: sanitizedContent \}\}/,
    ],
    [
      "src/layout/Footer.tsx",
      /__html: sanitizeRichTextHtml\(html\.replace/,
    ],
    [
      "src/components/common/AnnouncementModal/index.tsx",
      /__html: sanitizeRichTextHtml\(content\)/,
    ],
    [
      "src/components/designable/src/components/Information/Information.tsx",
      /const displayValue = isHtmlContent[\s\S]*\? sanitizeRichTextHtml\(informationValue\)[\s\S]*__html: displayValue/,
    ],
    [
      "src/components/designable/src/components/RichText/RichText.tsx",
      /__html: sanitizeRichTextHtml\(html\)/,
    ],
  ];

  for (const [filePath, pattern] of expectations) {
    const componentSource = fs.readFileSync(filePath, "utf8");
    assert.match(componentSource, pattern, `${filePath} must sanitize its HTML`);
  }
});
