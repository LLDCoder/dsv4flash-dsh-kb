import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const readSource = (relativePath) => fs.readFileSync(relativePath, "utf8");

const loadTrustedUrlModule = () => {
  const modulePath = path.resolve("src/utils/security/trustedUrl.ts");
  const source = readSource(modulePath);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const testModule = { exports: {} };

  new Function("exports", "module", compiled)(
    testModule.exports,
    testModule,
  );

  return testModule.exports;
};

test("trusted URL resolver rejects executable and unapproved destinations", () => {
  const { resolveTrustedHttpUrl } = loadTrustedUrlModule();
  const options = {
    baseOrigin: "https://portal.example",
    allowedOrigins: ["https://files.example"],
  };
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => {
    warnings.push(args);
  };

  try {
    assert.equal(resolveTrustedHttpUrl("javascript:alert(1)", options), null);
    assert.equal(resolveTrustedHttpUrl("data:text/html,<svg>", options), null);
    assert.equal(resolveTrustedHttpUrl("//evil.example/file.pdf", options), null);
    assert.equal(resolveTrustedHttpUrl("https://evil.example/file.pdf", options), null);
    assert.equal(
      resolveTrustedHttpUrl("/api/Document/Dowload?fileName=a.pdf", options),
      "https://portal.example/api/Document/Dowload?fileName=a.pdf",
    );
    assert.equal(
      resolveTrustedHttpUrl("https://files.example/a.pdf", options),
      "https://files.example/a.pdf",
    );
    assert.equal(warnings.length, 2);
  } finally {
    console.warn = originalWarn;
  }
});

test("trusted URL resolver warns when a URL origin is blocked", () => {
  const { resolveTrustedHttpUrl } = loadTrustedUrlModule();
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => {
    warnings.push(args);
  };

  try {
    const result = resolveTrustedHttpUrl(
      "https://evil.example/file.pdf?token=secret",
      {
        baseOrigin: "https://portal.example",
        allowedOrigins: ["https://files.example"],
      },
    );

    assert.equal(result, null);
    assert.equal(warnings.length, 1);
    assert.equal(
      warnings[0][0],
      "[security] Blocked URL origin by trusted URL policy",
    );
    assert.deepEqual(warnings[0][1], {
      origin: "https://evil.example",
      host: "evil.example",
      protocol: "https:",
      allowedOrigins: ["https://portal.example", "https://files.example"],
    });
    assert.doesNotMatch(JSON.stringify(warnings), /secret|file\.pdf/);
  } finally {
    console.warn = originalWarn;
  }
});

test("UAE PASS login generates and validates per-flow authorization state", () => {
  const loginSource = readSource("src/pages/Login/index.tsx");
  const signUpSource = readSource("src/pages/SignUp/index.tsx");
  const myAccountSource = readSource("src/pages/MyAccount/index.tsx");
  const flowSource = readSource("src/utils/uaePassLoginFlow.ts");
  const callbackSource = readSource(
    "src/pages/Login/hooks/useUaePassLoginCallback.ts",
  );
  const stateSource = readSource("src/utils/security/uaePassState.ts");
  const envSources = [
    ".env.client",
    ".env.daypopdevelopment",
    ".env.daypopproduction",
    ".env.development",
    ".env.nma-development",
    ".env.nma-production",
    ".env.nma-staging",
    ".env.production",
  ].map(readSource);

  assert.match(loginSource, /createUaePassState\(\)/);
  assert.match(signUpSource, /createUaePassState\(\)/);
  assert.match(myAccountSource, /createUaePassState\(\)/);
  assert.match(loginSource, /withUaePassState\(uaepassUrl,\s*state\)/);
  assert.match(signUpSource, /withUaePassState\(uaepassUrl,\s*state\)/);
  assert.match(myAccountSource, /withUaePassState\(uaepassUrl,\s*state\)/);
  assert.match(flowSource, /state:\s*string/);
  assert.match(callbackSource, /loginFlow\.state !== state/);
  assert.match(stateSource, /cryptoApi\.getRandomValues\(bytes\)/);
  envSources.forEach((source) => {
    assert.doesNotMatch(source, /[?&]state=HnlHOJTkTb66Y5H/);
  });
});

test("security-sensitive sinks enforce their URL policies", () => {
  const fileUploadSource = readSource(
    "src/components/designable/src/components/FileUploadGrid/FileUploadGridField.tsx",
  );
  const pdfPreviewSource = readSource("src/utils/pdfPreview.ts");
  const paymentSource = readSource("src/services/violationFine.ts");

  assert.match(fileUploadSource, /resolveTrustedFilePreviewUrl\(file\.url\)/);
  assert.match(fileUploadSource, /noopener,noreferrer/);
  assert.doesNotMatch(fileUploadSource, /window\.open\(file\.url,\s*"_blank"\)/);
  assert.match(pdfPreviewSource, /resolveTrustedDocumentUrl/);
  assert.match(paymentSource, /resolveTrustedPaymentUrl\(paymentPageUrl\)/);
});

test("spreadsheet import is bounded", () => {
  const bookListSource = readSource(
    "src/components/designable/src/components/BookList/BookListUploadField.tsx",
  );

  assert.match(bookListSource, /MAX_EXCEL_UPLOAD_BYTES/);
  assert.match(bookListSource, /isBookListExcelUploadAllowed\(file\)/);
  assert.match(bookListSource, /sheetRows:\s*MAX_EXCEL_IMPORT_ROWS \+ 1/);
});
