import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import {
  collectDirectImportedRawMessageFunctionNames,
  collectDynamicI18nTemplateReferences,
  collectFiniteValueSourceValues,
  compareFiniteValueDomain,
  collectInterpolations,
  collectRawMessageReturningFunctionNames,
  collectRawMessageStateVariableNames,
  collectTags,
  containsExactLocaleComparison,
  containsRawErrorMessageSource,
  containsRawMessageReference,
  containsArabicPresentationForm,
  containsUnexpectedArabicLocaleScript,
  expandContextKeys,
  expandValueKeys,
  flattenResource,
  hasResourcePath,
  hasI18nextPluralVariant,
  hasQuotedStringLiteral,
  hashResource,
  isDirectRawMessageReference,
  isRegisteredDynamicI18nTemplate,
  isVerifiedDeletionEvidence,
  isPotentialUserMessageSetterName,
  isPotentialVisibleText,
  isValidResourceDirectoryPath,
  shouldCollectUnusedCandidates,
  shouldReportMissingStaticKey,
} from "./i18n-audit-lib.mjs";
import { visibleJsxAttributes } from "./i18n-audit.config.mjs";

test("flattens nested resources and arrays", () => {
  const flattened = flattenResource({ page: { title: "Title", options: ["One"] } });
  assert.equal(flattened.get("page.title").value, "Title");
  assert.equal(flattened.get("page.options.0").value, "One");
});

test("requires lowerCamel module directories and allows component-scoped paths", () => {
  assert.equal(isValidResourceDirectoryPath("home"), true);
  assert.equal(isValidResourceDirectoryPath("myRequests"), true);
  assert.equal(
    isValidResourceDirectoryPath("components/common/ActionFooter"),
    true,
  );
  assert.equal(
    isValidResourceDirectoryPath("components/common/ocr"),
    true,
  );
  assert.equal(isValidResourceDirectoryPath("Formily"), false);
  assert.equal(isValidResourceDirectoryPath("my-requests"), false);
});

test("collects interpolation names including repetitions", () => {
  assert.deepEqual(
    collectInterpolations("{{count}} of {{total}} / {{count}}"),
    ["count", "count", "total"],
  );
});

test("validates rich-text tag order and balance", () => {
  assert.deepEqual(collectTags("<terms>Terms</terms>").errors, []);
  assert.notDeepEqual(collectTags("<terms>Terms").errors, []);
});

test("detects Arabic Presentation Forms", () => {
  assert.equal(containsArabicPresentationForm("هذا الحقل مطلوب"), false);
  assert.equal(containsArabicPresentationForm("\uFE91"), true);
});

test("detects unexpected scripts in Arabic resources", () => {
  assert.equal(
    containsUnexpectedArabicLocaleScript(
      "ตรวจสอบ صندوق الوارد الخاص بك ودخله أدناه.",
    ),
    true,
  );
  assert.equal(
    containsUnexpectedArabicLocaleScript(
      "الحد الأقصى 5 MB، ونوع الملف PDF.",
    ),
    false,
  );
});

test("detects English and Arabic user-visible text", () => {
  assert.equal(isPotentialVisibleText("Verify Code"), true);
  assert.equal(isPotentialVisibleText("تمت إعادة تعيين كلمة المرور"), true);
  assert.equal(isPotentialVisibleText("NMA", new Set(["NMA"])), false);
  assert.equal(isPotentialVisibleText("/api/User/Login"), false);
});

test("detects raw exception messages in user-visible expressions", () => {
  assert.equal(
    containsRawErrorMessageSource(
      "error instanceof Error ? error.message : t('common.error')",
    ),
    true,
  );
  assert.equal(
    containsRawErrorMessageSource("t('common.error')"),
    false,
  );
  assert.equal(containsRawErrorMessageSource("resolution.message"), true);
  assert.equal(
    containsRawErrorMessageSource("responseData.customMessage"),
    true,
  );
});

test("detects raw message helpers used by user-visible sinks", () => {
  const helperNames = collectRawMessageReturningFunctionNames(`
    const getErrorMessage = (error, fallback) =>
      error instanceof Error ? error.message : fallback;
    function getSafeMessage(fallback) {
      return fallback;
    }
  `);

  assert.deepEqual([...helperNames], ["getErrorMessage"]);
  assert.equal(
    containsRawMessageReference("getErrorMessage(error, fallback)", {
      functionNames: helperNames,
    }),
    true,
  );
  assert.equal(
    containsRawMessageReference("getSafeMessage(fallback)", {
      functionNames: helperNames,
    }),
    false,
  );

  const shortParameterHelperNames =
    collectRawMessageReturningFunctionNames(
      "const getMessage = (e) => e.message;",
    );
  assert.deepEqual([...shortParameterHelperNames], ["getMessage"]);
  assert.equal(
    isDirectRawMessageReference("getMessage(error)", {
      functionNames: shortParameterHelperNames,
    }),
    true,
  );
});

test("detects directly imported raw message helpers", () => {
  const source = `
    import {
      getRawMessage as resolveMessage,
      getSafeMessage,
    } from "./messageHelpers";
  `;
  const sourceFile = ts.createSourceFile(
    "/project/src/page.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const rawFunctionsByFile = new Map([
    [
      "/project/src/messageHelpers.ts",
      new Set(["getRawMessage"]),
    ],
  ]);

  assert.deepEqual(
    [
      ...collectDirectImportedRawMessageFunctionNames({
        filePath: "/project/src/page.tsx",
        sourceFile,
        sourceRoot: "/project/src",
        rawMessageFunctionsByFile: rawFunctionsByFile,
      }),
    ],
    ["resolveMessage"],
  );
});

test("detects raw backend messages persisted in visible React state", () => {
  const rawStateNames = collectRawMessageStateVariableNames(`
    const [feeError, setFeeError] = useState("");
    const [safeError, setSafeError] = useState("");
    const [safeValidationError, setSafeValidationError] = useState("");
    const validation = validateMobileNumber(value);
    setFeeError(response.message || error.message);
    setSafeError(t("common.error"));
    setSafeValidationError(validation.message);
  `);

  assert.deepEqual([...rawStateNames], ["feeError"]);
});

test("identifies high-confidence user-message state setters", () => {
  assert.equal(isPotentialUserMessageSetterName("setOtpError"), true);
  assert.equal(isPotentialUserMessageSetterName("setPaymentResult"), true);
  assert.equal(isPotentialUserMessageSetterName("setLockState"), true);
  assert.equal(isPotentialUserMessageSetterName("setFormValues"), false);
});

test("rejects exact locale comparisons that break language variants", () => {
  assert.equal(
    containsExactLocaleComparison('i18n.language === "ar"'),
    true,
  );
  assert.equal(
    containsExactLocaleComparison('currentLang !== "en"'),
    true,
  );
  assert.equal(
    containsExactLocaleComparison(
      '(localStorage.getItem("language") || "en") === "ar"',
    ),
    true,
  );
  assert.equal(
    containsExactLocaleComparison('(i18n.language || "en") === "ar"'),
    true,
  );
  assert.equal(
    containsExactLocaleComparison('i18n.language.startsWith("ar")'),
    false,
  );
});

test("only accepts i18next plural suffixes", () => {
  const keys = new Set(["item_one", "item_other", "foo_label"]);
  assert.equal(hasI18nextPluralVariant(keys, "item"), true);
  assert.equal(hasI18nextPluralVariant(keys, "foo"), false);
});

test("expands only registered i18next context values", () => {
  assert.deepEqual(
    expandContextKeys("profile.alert", ["oneDay", "manyDays"]),
    ["profile.alert_oneDay", "profile.alert_manyDays"],
  );
});

test("expands finite dynamic value keys", () => {
  assert.deepEqual(
    expandValueKeys("request.actions", ["edit", "delete"]),
    ["request.actions.edit", "request.actions.delete"],
  );
});

test("extracts canonical finite values from source declarations", () => {
  const source = `
    const ARRAY_VALUES = ["one", "two"] as const;
    const OPTION_VALUES = [
      { value: "first" },
      { value: "second" },
    ] as const;
    const VALUE_MAP = { first: "alpha", second: "beta" } as const;
    const NESTED_MAP = {
      status: { 1: {}, 2: {} },
    } as const;
    type UNION_VALUES = "left" | "right";
  `;

  assert.deepEqual(
    collectFiniteValueSourceValues(source, {
      identifier: "ARRAY_VALUES",
      selector: "array",
    }),
    ["one", "two"],
  );
  assert.deepEqual(
    collectFiniteValueSourceValues(source, {
      identifier: "OPTION_VALUES",
      selector: "array-property",
      property: "value",
    }),
    ["first", "second"],
  );
  assert.deepEqual(
    collectFiniteValueSourceValues(source, {
      identifier: "VALUE_MAP",
      selector: "object-values",
    }),
    ["alpha", "beta"],
  );
  assert.deepEqual(
    collectFiniteValueSourceValues(source, {
      identifier: "NESTED_MAP",
      path: ["status"],
      selector: "object-keys",
    }),
    ["1", "2"],
  );
  assert.deepEqual(
    collectFiniteValueSourceValues(source, {
      identifier: "UNION_VALUES",
      selector: "type-union",
    }),
    ["left", "right"],
  );
});

test("rejects producer values outside the configured finite domain", () => {
  const canonicalValues = collectFiniteValueSourceValues(
    'const STATUS_VALUES = ["known", "extra"] as const;',
    {
      identifier: "STATUS_VALUES",
      selector: "array",
    },
  );

  assert.deepEqual(compareFiniteValueDomain(["known"], canonicalValues), {
    missingConfiguredValues: ["extra"],
    valuesWithoutCanonicalSource: [],
  });
});

test("collects template-literal i18n calls for dynamic-key governance", () => {
  assert.deepEqual(
    collectDynamicI18nTemplateReferences(`
      const prefix = "local.status";
      t(\`registered.status.\${status}\`);
      gateT(\`gate.reason.\${reason}\`);
      t(\`\${prefix}.active\`);
      t("static.key");
    `),
    [
      {
        expression: "`registered.status.${status}`",
        prefix: "registered.status.",
      },
      {
        expression: "`gate.reason.${reason}`",
        prefix: "gate.reason.",
      },
      {
        expression: "`${prefix}.active`",
        prefix: "local.status.active",
      },
    ],
  );
});

test("resolves template-literal constants in their lexical scope", () => {
  assert.deepEqual(
    collectDynamicI18nTemplateReferences(`
      function first(status) {
        const prefix = "missing.";
        t(\`\${prefix}\${status}\`);
      }
      function second(status) {
        const prefix = "registered.";
        t(\`\${prefix}\${status}\`);
      }
    `).map(({ prefix }) => prefix),
    ["missing.", "registered."],
  );
});

test("does not resolve a template constant through a shadowing parameter", () => {
  assert.deepEqual(
    collectDynamicI18nTemplateReferences(`
      const prefix = "registered.";
      const render = (prefix, status) => t(\`\${prefix}\${status}\`);
    `).map(({ prefix }) => prefix),
    [""],
  );
});

test("requires every dynamic i18n template prefix to be registered", () => {
  const registry = {
    dynamicValueKeys: {
      "registered.status": {
        values: ["active"],
        producers: ["src/registered.tsx"],
      },
    },
    dynamicContextKeys: {},
    dynamicKeyPrefixes: ["menu."],
    externalRuntimePrefixes: [],
  };

  assert.equal(
    isRegisteredDynamicI18nTemplate(
      { prefix: "registered.status.", file: "src/registered.tsx" },
      registry,
    ),
    true,
  );
  assert.equal(
    isRegisteredDynamicI18nTemplate(
      { prefix: "unregistered.status." },
      registry,
    ),
    false,
  );
});

test("requires dynamic templates to come from a registered producer file", () => {
  const registry = {
    dynamicValueKeys: {
      "registered.status": {
        values: ["active"],
        producers: ["src/registered.tsx"],
      },
    },
  };

  assert.equal(
    isRegisteredDynamicI18nTemplate(
      { prefix: "registered.status.", file: "src/unregistered.tsx" },
      registry,
    ),
    false,
  );
});

test("requires literal producer evidence for dynamic contexts", () => {
  const producerSource = `
    const context = days <= 1 ? "oneDay" : "manyDays";
    t("profile.alert", { context });
  `;
  assert.equal(hasQuotedStringLiteral(producerSource, "profile.alert"), true);
  assert.equal(hasQuotedStringLiteral(producerSource, "oneDay"), true);
  assert.equal(hasQuotedStringLiteral("const status = 101;", "101"), true);
  assert.equal(hasQuotedStringLiteral(producerSource, "other"), false);
  assert.equal(
    hasQuotedStringLiteral('// t("comment.only")', "comment.only"),
    false,
  );
});

test("does not let dynamic prefixes hide missing literal keys", () => {
  assert.equal(
    shouldReportMissingStaticKey("menu.nonexistent", {
      exists: false,
      hasPluralVariant: false,
      hasRegisteredContext: false,
      externalRuntime: false,
    }),
    true,
  );
});

test("only collects unused candidates during a full repository scan", () => {
  assert.equal(shouldCollectUnusedCandidates(undefined), true);
  assert.equal(shouldCollectUnusedCandidates("payments"), false);
});

test("accepts only fully verified deletion evidence", () => {
  assert.equal(isVerifiedDeletionEvidence({ status: "verified" }), true);
  assert.equal(isVerifiedDeletionEvidence({ status: "legacy" }), false);
  assert.equal(isVerifiedDeletionEvidence(undefined), false);
});

test("scans CustomButton text as user-visible content", () => {
  assert.equal(visibleJsxAttributes.has("text"), true);
  assert.equal(visibleJsxAttributes.has("headerLabel"), true);
});

test("checks nested resource paths", () => {
  const resource = { common: { close: "Close" } };
  assert.equal(hasResourcePath(resource, "common.close"), true);
  assert.equal(hasResourcePath(resource, "common.open"), false);
});

test("hashes authoritative resources deterministically", () => {
  assert.equal(hashResource({ title: "Terms", item: "One" }), hashResource({
    title: "Terms",
    item: "One",
  }));
  assert.notEqual(
    hashResource({ title: "Terms", item: "One" }),
    hashResource({ title: "Terms", item: "Two" }),
  );
});

test("passes the repository strict audit", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/i18n-audit.mjs", "--strict", "--format=json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  const result = JSON.parse(output);

  assert.equal(result.counts.errors, 0);
  assert.equal(result.counts.hardcodedCandidates, 0);
});
