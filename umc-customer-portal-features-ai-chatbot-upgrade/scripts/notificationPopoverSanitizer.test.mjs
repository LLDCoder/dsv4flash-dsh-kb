import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import ts from "typescript";

const modulePath = path.resolve(
  "src/components/NotificationPopover/sanitizeNotificationMessageHtml.ts",
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

const { sanitizeNotificationMessageHtml } = testModule.exports;

function assertNoActiveContent(html) {
  const fragment = JSDOM.fragment(html);

  assert.equal(
    fragment.querySelector(
      "script, style, svg, math, iframe, object, embed, form, input, button, a, img",
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
      assert.notEqual(attribute.name.toLowerCase(), "href");
      assert.notEqual(attribute.name.toLowerCase(), "src");
    }
  }
}

test("preserves notification text, inline formatting, and RTL metadata", () => {
  const clean = sanitizeNotificationMessageHtml(
    '<strong>Application</strong><br><span class="notification-ref-no" dir="rtl" lang="ar" title="reference">طلب</span>',
  );

  assert.match(clean, /<strong>Application<\/strong>/);
  assert.match(clean, /<br>/);
  assert.match(clean, /class="notification-ref-no"/);
  assert.match(clean, /dir="rtl"/);
  assert.match(clean, /lang="ar"/);
  assert.match(clean, />طلب<\/span>/);
  assertNoActiveContent(clean);
});

test("removes event handlers, inline styles, and unapproved attributes", () => {
  const clean = sanitizeNotificationMessageHtml(
    '<span onclick="alert(1)" style="background:url(javascript:alert(2))" id="target" data-secret="x" aria-label="x">Update</span><img src=x onerror="alert(3)">',
  );

  assert.equal(clean, "<span>Update</span>");
  assertNoActiveContent(clean);
});

test("removes links, dangerous URL schemes, and active elements", () => {
  const clean = sanitizeNotificationMessageHtml(
    '<a href="javascript:alert(1)">Open</a><a href="https://example.com">External</a><svg><a xlink:href="javascript:alert(2)">SVG</a></svg><math><mi href="data:text/html,x">M</mi></math><iframe srcdoc="<script>alert(3)</script>"></iframe><form><button formaction="javascript:alert(4)">Go</button></form>',
  );

  assert.match(clean, /Open/);
  assert.match(clean, /External/);
  assertNoActiveContent(clean);
});

test("sanitizes malformed markup without executable descendants", () => {
  const clean = sanitizeNotificationMessageHtml(
    '<svg><g/onload=alert(1)//<p><img src=x onerror=alert(2)><strong>Message',
  );

  assert.match(clean, /Message/);
  assertNoActiveContent(clean);
});

test("handles absent notification content safely", () => {
  assert.equal(sanitizeNotificationMessageHtml(undefined), "");
  assert.equal(sanitizeNotificationMessageHtml(null), "");
});

test("the notification popover sink renders only sanitized message HTML", () => {
  const componentSource = fs.readFileSync(
    "src/components/NotificationPopover/index.tsx",
    "utf8",
  );

  assert.match(
    componentSource,
    /__html:\s*sanitizeNotificationMessageHtml\(\s*i18n\.language\.startsWith\("ar"\)/,
  );
  assert.doesNotMatch(
    componentSource,
    /__html:\s*i18n\.language\.startsWith\("ar"\)/,
  );
});

test("the notifications page sanitizes wrapped message HTML", () => {
  const componentSource = fs.readFileSync(
    "src/pages/Notifications/index.tsx",
    "utf8",
  );

  assert.match(
    componentSource,
    /__html:\s*sanitizeNotificationMessageHtml\(\s*wrapNotificationRefNos\(/,
  );
  assert.doesNotMatch(
    componentSource,
    /__html:\s*wrapNotificationRefNos\(/,
  );
});
