import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import {
  allowedVisibleLiterals,
  authoritativeResourceHashes,
  deletionEvidence,
  dynamicContextKeys,
  dynamicKeyPrefixes,
  dynamicValueKeys,
  expectedTermsSections,
  externalRuntimePrefixes,
  hardcodedExcludedPathParts,
  hardcodedObjectPropertyExcludedPathParts,
  removedResourceKeys,
  replacedResourceKeys,
  verifiedUnusedKeys,
  visibleJsxAttributes,
} from "./i18n-audit.config.mjs";
import {
  collectDynamicI18nTemplateReferences,
  collectFiniteValueSourceValues,
  compareFiniteValueDomain,
  collectInterpolations,
  collectDirectImportedRawMessageFunctionNames,
  collectRawMessageReturningFunctionNames,
  collectRawMessageStateVariableNames,
  collectTags,
  containsExactLocaleComparison,
  containsArabicPresentationForm,
  containsRawMessageReference,
  containsUnexpectedArabicLocaleScript,
  expandContextKeys,
  expandValueKeys,
  flattenResource,
  hasI18nextPluralVariant,
  hasQuotedStringLiteral,
  hasStringLiteralFragment,
  hasResourcePath,
  hashResource,
  isPotentialVisibleText,
  isValidResourceDirectoryPath,
  isDirectRawMessageReference,
  isPotentialUserMessageSetterName,
  isRegisteredDynamicI18nTemplate,
  isVerifiedDeletionEvidence,
  shouldCollectUnusedCandidates,
  shouldReportMissingStaticKey,
} from "./i18n-audit-lib.mjs";

const workspaceRoot = process.cwd();
const i18nRoot = path.join(workspaceRoot, "src/localization");
const sourceRoot = path.join(workspaceRoot, "src");
const manifestPath = path.join(i18nRoot, "resourceManifest.json");
const strict = process.argv.includes("--strict");
const jsonOutput = process.argv.includes("--format=json");
const scopeArgument = process.argv.find((argument) => argument.startsWith("--scope="));
const scope = scopeArgument?.slice("--scope=".length);

const errors = [];
const warnings = [];
const hardcoded = [];
const staticKeys = new Set();

const report = (collection, code, message, details = {}) => {
  collection.push({ code, message, ...details });
};

const readJson = (filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  const parsedSource = ts.parseJsonText(filePath, source);

  if (parsedSource.parseDiagnostics.length > 0) {
    parsedSource.parseDiagnostics.forEach((diagnostic) => {
      report(errors, "json-syntax", ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"), {
        file: path.relative(workspaceRoot, filePath),
      });
    });
    return null;
  }

  const inspectDuplicates = (node, prefix = "") => {
    if (ts.isObjectLiteralExpression(node)) {
      const seen = new Set();
      node.properties.forEach((property) => {
        if (!ts.isPropertyAssignment(property)) return;
        const name = property.name.getText(parsedSource).replace(/^["']|["']$/g, "");
        const propertyPath = prefix ? `${prefix}.${name}` : name;
        if (seen.has(name)) {
          report(errors, "duplicate-json-key", `Duplicate JSON key: ${propertyPath}`, {
            file: path.relative(workspaceRoot, filePath),
          });
        }
        seen.add(name);
        inspectDuplicates(property.initializer, propertyPath);
      });
    } else if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) => inspectDuplicates(element, `${prefix}.${index}`));
    }
  };

  if (parsedSource.statements[0] && ts.isExpressionStatement(parsedSource.statements[0])) {
    inspectDuplicates(parsedSource.statements[0].expression);
  }

  return JSON.parse(source);
};

const manifest = readJson(manifestPath);
if (!Array.isArray(manifest)) {
  report(errors, "manifest", "resourceManifest.json must contain an array.");
}

const manifestPaths = new Set(
  Array.isArray(manifest) ? manifest.map((entry) => entry?.path) : [],
);
const resourceDirectories = new Set();
const collectResourceDirectories = (directory) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectResourceDirectories(filePath);
      return;
    }
    if (entry.name === "en.json" || entry.name === "ar.json") {
      resourceDirectories.add(
        path.relative(i18nRoot, path.dirname(filePath)).split(path.sep).join("/"),
      );
    }
  });
};
collectResourceDirectories(i18nRoot);
new Set([...manifestPaths, ...resourceDirectories]).forEach((resourcePath) => {
  if (
    typeof resourcePath === "string" &&
    !isValidResourceDirectoryPath(resourcePath)
  ) {
    report(
      errors,
      "resource-directory-naming",
      `Resource directory must use lowerCamelCase: ${resourcePath}`,
    );
  }
});
resourceDirectories.forEach((resourcePath) => {
  if (!manifestPaths.has(resourcePath)) {
    report(
      errors,
      "unregistered-resource",
      `Resource directory is missing from the manifest: ${resourcePath}`,
    );
  }
});

const translations = { en: {}, ar: {} };
const topLevelOwners = { en: new Map(), ar: new Map() };
const pairResources = [];

for (const entry of Array.isArray(manifest) ? manifest : []) {
  if (!entry || typeof entry.path !== "string" || (entry.mount !== null && typeof entry.mount !== "string")) {
    report(errors, "manifest-entry", "Every manifest entry requires path and mount.");
    continue;
  }

  const pair = { entry };

  for (const language of ["en", "ar"]) {
    const filePath = path.join(i18nRoot, entry.path, `${language}.json`);
    if (!fs.existsSync(filePath)) {
      report(errors, "missing-locale-file", `Missing ${language} resource for ${entry.path}.`, {
        file: path.relative(workspaceRoot, filePath),
      });
      continue;
    }

    const resource = readJson(filePath);
    pair[language] = { filePath, resource };
    if (!resource) continue;

    if (entry.mount) {
      if (topLevelOwners[language].has(entry.mount)) {
        report(errors, "resource-collision", `Duplicate mount "${entry.mount}".`, {
          first: topLevelOwners[language].get(entry.mount),
          second: entry.path,
        });
      }
      topLevelOwners[language].set(entry.mount, entry.path);
      translations[language][entry.mount] = resource;
      continue;
    }

    Object.entries(resource).forEach(([key, value]) => {
      if (topLevelOwners[language].has(key)) {
        report(errors, "resource-collision", `Root resource key "${key}" is overwritten.`, {
          first: topLevelOwners[language].get(key),
          second: entry.path,
        });
      }
      topLevelOwners[language].set(key, entry.path);
      translations[language][key] = value;
    });
  }

  pairResources.push(pair);
}

for (const pair of pairResources) {
  if (!pair.en?.resource || !pair.ar?.resource) continue;

  const enFlat = flattenResource(pair.en.resource);
  const arFlat = flattenResource(pair.ar.resource);
  const allPaths = new Set([...enFlat.keys(), ...arFlat.keys()]);

  allPaths.forEach((resourcePath) => {
    const enEntry = enFlat.get(resourcePath);
    const arEntry = arFlat.get(resourcePath);
    const mountedPath = pair.entry.mount
      ? `${pair.entry.mount}.${resourcePath}`
      : resourcePath;

    if (!enEntry || !arEntry) {
      report(errors, "locale-parity", `Missing ${!enEntry ? "English" : "Arabic"} value: ${mountedPath}`, {
        scope: pair.entry.path,
      });
      return;
    }

    if (enEntry.type !== arEntry.type) {
      report(errors, "locale-type", `Value type mismatch: ${mountedPath}`, {
        en: enEntry.type,
        ar: arEntry.type,
      });
      return;
    }

    if (enEntry.type !== "string") return;

    const enInterpolations = collectInterpolations(enEntry.value);
    const arInterpolations = collectInterpolations(arEntry.value);
    if (JSON.stringify(enInterpolations) !== JSON.stringify(arInterpolations)) {
      report(errors, "interpolation", `Interpolation mismatch: ${mountedPath}`, {
        en: enInterpolations,
        ar: arInterpolations,
      });
    }

    const enTags = collectTags(enEntry.value);
    const arTags = collectTags(arEntry.value);
    if (enTags.errors.length || arTags.errors.length) {
      report(errors, "tag-balance", `Unbalanced rich-text tag: ${mountedPath}`, {
        en: enTags.errors,
        ar: arTags.errors,
      });
    } else if (JSON.stringify(enTags.tags) !== JSON.stringify(arTags.tags)) {
      report(errors, "tag-parity", `Rich-text tag mismatch: ${mountedPath}`, {
        en: enTags.tags,
        ar: arTags.tags,
      });
    }

    if (containsArabicPresentationForm(arEntry.value)) {
      report(errors, "arabic-presentation-form", `Arabic Presentation Form found: ${mountedPath}`, {
        file: path.relative(workspaceRoot, pair.ar.filePath),
      });
    }

    if (
      !mountedPath.startsWith("termsModal.") &&
      containsUnexpectedArabicLocaleScript(arEntry.value)
    ) {
      report(
        errors,
        "arabic-unexpected-script",
        `Unexpected script found in Arabic resource: ${mountedPath}`,
        {
          file: path.relative(workspaceRoot, pair.ar.filePath),
        },
      );
    }
  });
}

Object.entries(authoritativeResourceHashes).forEach(([resourceKey, evidence]) => {
  for (const language of ["en", "ar"]) {
    const resource = translations[language][resourceKey];
    const expectedHash = evidence[language];
    if (!resource || typeof expectedHash !== "string") {
      report(
        errors,
        "authoritative-resource",
        `Missing authoritative ${language} resource or hash: ${resourceKey}`,
      );
      continue;
    }

    const actualHash = hashResource(resource);
    if (actualHash !== expectedHash) {
      report(
        errors,
        "authoritative-resource-drift",
        `Authoritative ${language} resource changed: ${resourceKey}`,
        {
          source: evidence.source,
          capturedOn: evidence.capturedOn,
          expectedHash,
          actualHash,
        },
      );
    }
  }
});

const terms = translations.en.termsModal;
if (terms && typeof terms === "object") {
  [
    "title",
    "confirm",
    "introduction",
    "introParagraph1",
    "introParagraph2",
  ].forEach((key) => staticKeys.add(`termsModal.${key}`));

  Object.entries(expectedTermsSections).forEach(([section, count]) => {
    staticKeys.add(`termsModal.${section}Title`);
    for (let index = 1; index <= count; index += 1) {
      staticKeys.add(`termsModal.${section}${index}`);
      if (!(section + index in terms)) {
        report(errors, "terms-structure", `Missing Terms clause: termsModal.${section}${index}`);
      }
    }
    if (`${section}${count + 1}` in terms) {
      report(errors, "terms-structure", `Unexpected Terms clause: termsModal.${section}${count + 1}`);
    }
  });
}

const sourceFiles = [];
const visitDirectory = (directory) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visitDirectory(filePath);
    } else if (/\.[jt]sx?$/.test(entry.name)) {
      sourceFiles.push(filePath);
    }
  });
};
visitDirectory(sourceRoot);

const sourceRecords = sourceFiles.map((filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  return {
    filePath,
    source,
    sourceFile: ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  };
});
const rawMessageFunctionsByFile = new Map(
  sourceRecords.map(({ filePath, source }) => [
    filePath,
    collectRawMessageReturningFunctionNames(source),
  ]),
);

const isI18nCall = (expression) => {
  if (ts.isIdentifier(expression)) {
    return expression.text === "t" || expression.text === "gateT";
  }
  return ts.isPropertyAccessExpression(expression) && expression.name.text === "t";
};

const collectStaticI18nKeys = (expression) => {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    staticKeys.add(expression.text);
    return;
  }

  if (ts.isConditionalExpression(expression)) {
    collectStaticI18nKeys(expression.whenTrue);
    collectStaticI18nKeys(expression.whenFalse);
  }
};

const visibleMessageOwners = new Set(["message", "notification", "CustomMessage"]);
const visibleMessageMethods = new Set(["error", "info", "open", "success", "warning"]);
const normalizeVisibleText = (value) => value.replace(/\s+/g, " ").trim();
const isVisibleUserText = (value) =>
  isPotentialVisibleText(value, allowedVisibleLiterals);
const containsIdentifierFromSet = (node, names) => {
  let found = false;
  const inspect = (child) => {
    if (ts.isIdentifier(child) && names.has(child.text)) {
      found = true;
      return;
    }
    ts.forEachChild(child, inspect);
  };
  inspect(node);
  return found;
};

for (const { filePath, source, sourceFile } of sourceRecords) {
  const relativePath = `/${path.relative(workspaceRoot, filePath)}`;
  const hardcodedExcluded = hardcodedExcludedPathParts.some((part) =>
    relativePath.includes(part),
  );
  const hardcodedObjectPropertyExcluded =
    hardcodedObjectPropertyExcludedPathParts.some((part) =>
      relativePath.includes(part),
    );
  if (scope && !relativePath.toLowerCase().includes(scope.toLowerCase())) continue;

  collectDynamicI18nTemplateReferences(source).forEach((reference) => {
    const relativeFile = path
      .relative(workspaceRoot, filePath)
      .replaceAll("\\", "/");
    if (
      !isRegisteredDynamicI18nTemplate(
        { ...reference, file: relativeFile },
        {
          dynamicValueKeys,
          dynamicContextKeys,
          dynamicKeyPrefixes,
          externalRuntimePrefixes,
        },
      )
    ) {
      report(
        errors,
        "unregistered-dynamic-template",
        `Dynamic i18n template is not registered: ${reference.expression}`,
        { file: path.relative(workspaceRoot, filePath) },
      );
    }
  });

  if (containsExactLocaleComparison(source)) {
    report(
      errors,
      "locale-variant-comparison",
      "Use a language-prefix check so locale variants such as ar-AE remain supported.",
      { file: path.relative(workspaceRoot, filePath) },
    );
  }

  const fileRawMessageFunctionNames = new Set(
    rawMessageFunctionsByFile.get(filePath) ?? [],
  );
  collectDirectImportedRawMessageFunctionNames({
    filePath,
    sourceFile,
    sourceRoot,
    rawMessageFunctionsByFile,
  }).forEach((name) => fileRawMessageFunctionNames.add(name));

  const rawMessageVariableNames = new Set();
  const rawMessageStateVariableNames =
    collectRawMessageStateVariableNames(source);
  let foundRawMessageVariable = true;
  while (foundRawMessageVariable) {
    foundRawMessageVariable = false;
    const collectRawMessageVariable = (node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        !rawMessageVariableNames.has(node.name.text) &&
        (/(?:error|response|result|raw|backend).*message|message.*(?:error|response|result|raw|backend)/i.test(
          node.name.text,
        )
          ? containsRawMessageReference(node.initializer.getText(sourceFile), {
              functionNames: fileRawMessageFunctionNames,
              variableNames: rawMessageVariableNames,
            })
          : isDirectRawMessageReference(node.initializer.getText(sourceFile), {
              functionNames: fileRawMessageFunctionNames,
              variableNames: rawMessageVariableNames,
            }))
      ) {
        rawMessageVariableNames.add(node.name.text);
        foundRawMessageVariable = true;
      }
      ts.forEachChild(node, collectRawMessageVariable);
    };
    collectRawMessageVariable(sourceFile);
  }

  const inspectNode = (node) => {
    if (ts.isCallExpression(node) && isI18nCall(node.expression)) {
      const firstArgument = node.arguments[0];
      if (firstArgument) {
        collectStaticI18nKeys(firstArgument);
      }

    }

    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "i18nKey" &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      staticKeys.add(node.initializer.text);
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      !hardcodedExcluded &&
      visibleMessageOwners.has(node.expression.expression.text) &&
      visibleMessageMethods.has(node.expression.name.text)
    ) {
      const firstArgument = node.arguments[0];
      if (
        firstArgument &&
        containsRawMessageReference(firstArgument.getText(sourceFile), {
          functionNames: fileRawMessageFunctionNames,
          variableNames: rawMessageVariableNames,
        })
      ) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          firstArgument.getStart(sourceFile),
        );
        report(
          hardcoded,
          "raw-error-message",
          "Raw exception message is displayed to the user.",
          {
            file: path.relative(workspaceRoot, filePath),
            line: line + 1,
          },
        );
      } else if (
        firstArgument &&
        (ts.isStringLiteral(firstArgument) ||
          ts.isNoSubstitutionTemplateLiteral(firstArgument)) &&
        isVisibleUserText(firstArgument.text)
      ) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          firstArgument.getStart(sourceFile),
        );
        report(hardcoded, "hardcoded-message", firstArgument.text, {
          file: path.relative(workspaceRoot, filePath),
          line: line + 1,
        });
      } else if (firstArgument && ts.isObjectLiteralExpression(firstArgument)) {
        firstArgument.properties.forEach((property) => {
          if (!ts.isPropertyAssignment(property)) return;
          const name = property.name.getText(sourceFile).replace(/^["']|["']$/g, "");
          if (!["description", "message"].includes(name)) return;
          const value = property.initializer;
          if (
            (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) &&
            isVisibleUserText(value.text)
          ) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(
              value.getStart(sourceFile),
            );
            report(hardcoded, "hardcoded-message", value.text, {
              file: path.relative(workspaceRoot, filePath),
              line: line + 1,
            });
          }
        });
      }
    }

    if (
      !hardcodedExcluded &&
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      isPotentialUserMessageSetterName(node.expression.text) &&
      node.arguments.some((argument) =>
        containsRawMessageReference(argument.getText(sourceFile), {
          functionNames: fileRawMessageFunctionNames,
          variableNames: rawMessageVariableNames,
        }),
      )
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      report(
        hardcoded,
        "raw-error-state",
        "Raw backend or exception message is persisted in user-visible state.",
        {
          file: path.relative(workspaceRoot, filePath),
          line: line + 1,
        },
      );
    }

    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && /(?:^|[A-Z])(?:i18n|label|title|action|message|placeholder)Key$/.test(node.name.text)) {
      if (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
        staticKeys.add(node.initializer.text);
      }
    }

    if (
      !hardcodedExcluded &&
      !hardcodedObjectPropertyExcluded &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      visibleJsxAttributes.has(node.name.text) &&
      (ts.isStringLiteral(node.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(node.initializer)) &&
      isVisibleUserText(node.initializer.text)
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      report(
        hardcoded,
        "hardcoded-object-property",
        normalizeVisibleText(node.initializer.text),
        {
          file: path.relative(workspaceRoot, filePath),
          line: line + 1,
        },
      );
    }

    if (!hardcodedExcluded && ts.isJsxText(node) && isVisibleUserText(node.text)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      report(hardcoded, "hardcoded-jsx", normalizeVisibleText(node.text), {
        file: path.relative(workspaceRoot, filePath),
        line: line + 1,
      });
    }

    if (
      !hardcodedExcluded &&
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      visibleJsxAttributes.has(node.name.text)
    ) {
      const initializer = node.initializer;
      if (initializer && ts.isStringLiteral(initializer) && isVisibleUserText(initializer.text)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        report(hardcoded, "hardcoded-prop", normalizeVisibleText(initializer.text), {
          file: path.relative(workspaceRoot, filePath),
          line: line + 1,
        });
      }
    }

    if (
      !hardcodedExcluded &&
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      visibleJsxAttributes.has(node.name.text) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression &&
      containsIdentifierFromSet(
        node.initializer.expression,
        rawMessageStateVariableNames,
      )
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      report(
        hardcoded,
        "raw-error-state",
        "Raw backend or exception message state is displayed to the user.",
        {
          file: path.relative(workspaceRoot, filePath),
          line: line + 1,
        },
      );
    }

    if (
      !hardcodedExcluded &&
      ts.isJsxExpression(node) &&
      !ts.isJsxAttribute(node.parent) &&
      node.expression &&
      containsIdentifierFromSet(
        node.expression,
        rawMessageStateVariableNames,
      )
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      report(
        hardcoded,
        "raw-error-state",
        "Raw backend or exception message state is rendered in JSX.",
        {
          file: path.relative(workspaceRoot, filePath),
          line: line + 1,
        },
      );
    }

    if (
      !hardcodedExcluded &&
      ts.isBindingElement(node) &&
      ts.isIdentifier(node.name) &&
      visibleJsxAttributes.has(node.name.text) &&
      node.initializer &&
      (ts.isStringLiteral(node.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(node.initializer)) &&
      isVisibleUserText(node.initializer.text)
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      report(
        hardcoded,
        "hardcoded-default-prop",
        normalizeVisibleText(node.initializer.text),
        {
          file: path.relative(workspaceRoot, filePath),
          line: line + 1,
        },
      );
    }

    ts.forEachChild(node, inspectNode);
  };
  inspectNode(sourceFile);
}

const flattenedEnglish = flattenResource(translations.en);
const flattenedEnglishKeys = new Set(flattenedEnglish.keys());
const registeredContextKeys = new Set(Object.keys(dynamicContextKeys));

Object.entries(dynamicContextKeys).forEach(([key, definition]) => {
  const contexts = Array.isArray(definition.contexts) ? definition.contexts : [];
  const producers = Array.isArray(definition.producers) ? definition.producers : [];

  if (contexts.length === 0) {
    report(errors, "dynamic-context-empty", `Dynamic context key has no values: ${key}`);
  }
  if (producers.length === 0) {
    report(
      errors,
      "dynamic-context-producer",
      `Dynamic context key has no registered producer: ${key}`,
    );
  }

  let producerSource = "";
  producers.forEach((producer) => {
    const producerPath = path.join(workspaceRoot, producer);
    if (!fs.existsSync(producerPath)) {
      report(
        errors,
        "dynamic-context-producer",
        `Dynamic context producer does not exist: ${producer}`,
      );
      return;
    }
    producerSource += `\n${fs.readFileSync(producerPath, "utf8")}`;
  });

  if (
    producers.length > 0 &&
    !hasQuotedStringLiteral(producerSource, key)
  ) {
    report(
      errors,
      "dynamic-context-evidence",
      `Dynamic context producer does not reference the base key: ${key}`,
    );
  }

  contexts.forEach((context) => {
    if (
      producers.length > 0 &&
      !hasQuotedStringLiteral(producerSource, context)
    ) {
      report(
        errors,
        "dynamic-context-evidence",
        `Dynamic context producer does not declare "${context}" for ${key}`,
      );
    }
  });

  expandContextKeys(key, contexts).forEach((expandedKey) => {
    staticKeys.add(expandedKey);
    if (
      !hasResourcePath(translations.en, expandedKey) ||
      !hasResourcePath(translations.ar, expandedKey)
    ) {
      report(
        errors,
        "dynamic-context-resource",
        `Dynamic context key does not exist in both locales: ${expandedKey}`,
      );
    }
  });
});

Object.entries(dynamicValueKeys).forEach(([key, definition]) => {
  const values = Array.isArray(definition.values) ? definition.values : [];
  const producers = Array.isArray(definition.producers) ? definition.producers : [];
  const valueSources = Array.isArray(definition.valueSources)
    ? definition.valueSources
    : [];
  const extraValues = Array.isArray(definition.extraValues)
    ? definition.extraValues
    : [];

  if (values.length === 0) {
    report(errors, "dynamic-value-empty", `Dynamic value key has no values: ${key}`);
  }
  if (producers.length === 0) {
    report(
      errors,
      "dynamic-value-producer",
      `Dynamic value key has no registered producer: ${key}`,
    );
  }
  if (valueSources.length === 0) {
    report(
      errors,
      "dynamic-value-source",
      `Dynamic value key has no canonical finite-value source: ${key}`,
    );
  }

  let producerSource = "";
  producers.forEach((producer) => {
    const producerPath = path.join(workspaceRoot, producer);
    if (!fs.existsSync(producerPath)) {
      report(
        errors,
        "dynamic-value-producer",
        `Dynamic value producer does not exist: ${producer}`,
      );
      return;
    }
    producerSource += `\n${fs.readFileSync(producerPath, "utf8")}`;
  });

  const canonicalValues = new Set(extraValues);
  valueSources.forEach(({ file, ...sourceDefinition }) => {
    const sourcePath = path.join(workspaceRoot, file);
    if (!fs.existsSync(sourcePath)) {
      report(
        errors,
        "dynamic-value-source",
        `Dynamic finite-value source does not exist: ${file}`,
      );
      return;
    }
    const sourceValues = collectFiniteValueSourceValues(
      fs.readFileSync(sourcePath, "utf8"),
      sourceDefinition,
    );
    if (sourceValues.length === 0) {
      report(
        errors,
        "dynamic-value-source",
        `Dynamic finite-value source could not be extracted: ${file}#${sourceDefinition.identifier}`,
      );
      return;
    }
    sourceValues.forEach((value) => canonicalValues.add(value));
  });

  const {
    missingConfiguredValues,
    valuesWithoutCanonicalSource,
  } = compareFiniteValueDomain(values, canonicalValues);
  if (
    valueSources.length > 0 &&
    (missingConfiguredValues.length > 0 ||
      valuesWithoutCanonicalSource.length > 0)
  ) {
    report(
      errors,
      "dynamic-value-domain",
      `Dynamic value domain differs from its canonical source: ${key}`,
      {
        missingConfiguredValues,
        valuesWithoutCanonicalSource,
      },
    );
  }

  if (
    producers.length > 0 &&
    !hasStringLiteralFragment(producerSource, `${key}.`)
  ) {
    report(
      errors,
      "dynamic-value-evidence",
      `Dynamic value producer does not reference the base key: ${key}`,
    );
  }

  values.forEach((value) => {
    if (
      producers.length > 0 &&
      !hasQuotedStringLiteral(producerSource, value)
    ) {
      report(
        errors,
        "dynamic-value-evidence",
        `Dynamic value producer does not declare "${value}" for ${key}`,
      );
    }
  });

  expandValueKeys(key, values).forEach((expandedKey) => {
    staticKeys.add(expandedKey);
    if (
      !hasResourcePath(translations.en, expandedKey) ||
      !hasResourcePath(translations.ar, expandedKey)
    ) {
      report(
        errors,
        "dynamic-value-resource",
        `Dynamic value key does not exist in both locales: ${expandedKey}`,
      );
    }
  });
});

staticKeys.forEach((key) => {
  const hasPluralVariant = hasI18nextPluralVariant(
    flattenedEnglishKeys,
    key,
  );
  if (shouldReportMissingStaticKey(key, {
    exists: hasResourcePath(translations.en, key),
    hasPluralVariant,
    hasRegisteredContext: registeredContextKeys.has(key),
    externalRuntime: externalRuntimePrefixes.some((prefix) =>
      key.startsWith(prefix),
    ),
  })) {
    report(errors, "missing-static-key", `Static i18n key does not exist: ${key}`);
  }
});

const validateDeletionRecord = (record, ledgerName) => {
  if (
    !record ||
    typeof record.key !== "string" ||
    typeof record.evidenceId !== "string"
  ) {
    report(errors, "deletion-evidence", `Invalid ${ledgerName} record.`);
    return null;
  }

  const evidence = deletionEvidence[record.evidenceId];
  const requiredFields = [
    "verifiedAt",
    "staticSearch",
    "dynamicReview",
    "backendReview",
    "browserReview",
  ];
  if (
    !evidence ||
    !requiredFields.every(
      (field) =>
        typeof evidence[field] === "string" && evidence[field].trim(),
    )
  ) {
    report(
      errors,
      "deletion-evidence",
      `Incomplete deletion evidence for ${record.key}: ${record.evidenceId}`,
    );
    return null;
  }
  if (!isVerifiedDeletionEvidence(evidence)) {
    report(
      errors,
      "deletion-evidence",
      `Deletion evidence is not verified for ${record.key}: ${evidence.status}`,
    );
  }
  return record.key;
};

verifiedUnusedKeys.forEach((record) => {
  const key = validateDeletionRecord(record, "verified-unused");
  if (!key) return;
  if (hasResourcePath(translations.en, key) || hasResourcePath(translations.ar, key)) {
    report(errors, "verified-unused-key", `Verified unused key still exists: ${key}`);
  }
});

removedResourceKeys.forEach((record) => {
  const key = validateDeletionRecord(record, "removed-resource");
  if (!key) return;
  if (hasResourcePath(translations.en, key) || hasResourcePath(translations.ar, key)) {
    report(errors, "removed-key", `Removed resource key still exists: ${key}`);
  }
});

Object.entries(replacedResourceKeys).forEach(([removedKey, definition]) => {
  const record = {
    key: removedKey,
    evidenceId: definition?.evidenceId,
  };
  const validatedRemovedKey = validateDeletionRecord(
    record,
    "replaced-resource",
  );
  if (!validatedRemovedKey) return;
  const replacementKeys = Array.isArray(definition?.replacementKeys)
    ? definition.replacementKeys
    : [];
  if (replacementKeys.length === 0) {
    report(
      errors,
      "replacement-key",
      `Replaced resource key has no replacements: ${removedKey}`,
    );
  }
  if (
    hasResourcePath(translations.en, removedKey) ||
    hasResourcePath(translations.ar, removedKey)
  ) {
    report(errors, "replaced-key", `Replaced resource key still exists: ${removedKey}`);
  }

  replacementKeys.forEach((replacementKey) => {
    if (
      !hasResourcePath(translations.en, replacementKey) ||
      !hasResourcePath(translations.ar, replacementKey)
    ) {
      report(
        errors,
        "replacement-key",
        `Replacement resource key does not exist in both locales: ${replacementKey}`,
      );
    }
  });
});

const unusedCandidates = shouldCollectUnusedCandidates(scope)
  ? [...flattenedEnglish.keys()].filter(
      (key) =>
        !staticKeys.has(key) &&
        !dynamicKeyPrefixes.some((prefix) => key.startsWith(prefix)) &&
        !externalRuntimePrefixes.some((prefix) => key.startsWith(prefix)),
    )
  : [];

if (hardcoded.length > 0) {
  report(warnings, "hardcoded-summary", `${hardcoded.length} high-confidence user-visible hardcoded text candidates found.`);
}
if (unusedCandidates.length > 0) {
  report(warnings, "unused-summary", `${unusedCandidates.length} unused candidates require manual dynamic-key review.`);
}
if (strict && hardcoded.length > 0) {
  report(errors, "strict-hardcoded", "Strict mode rejects high-confidence hardcoded English candidates.");
}

const result = {
  counts: {
    resourcePairs: pairResources.length,
    englishKeys: flattenedEnglish.size,
    staticKeys: staticKeys.size,
    hardcodedCandidates: hardcoded.length,
    unusedCandidates: unusedCandidates.length,
    governedRemovedKeys:
      verifiedUnusedKeys.length +
      removedResourceKeys.length +
      Object.keys(replacedResourceKeys).length,
    errors: errors.length,
    warnings: warnings.length,
  },
  errors,
  warnings,
  hardcoded: hardcoded.slice(0, 200),
  unusedCandidates,
};

if (jsonOutput) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  console.log(`i18n audit: ${result.counts.resourcePairs} resource pairs, ${result.counts.englishKeys} English keys`);
  errors.forEach((item) => console.error(`ERROR [${item.code}] ${item.message}`));
  warnings.forEach((item) => console.warn(`WARN  [${item.code}] ${item.message}`));
  hardcoded.slice(0, 50).forEach((item) =>
    console.warn(`WARN  [${item.code}] ${item.file}:${item.line} ${item.message}`),
  );
  if (hardcoded.length > 50) {
    console.warn(`WARN  ${hardcoded.length - 50} additional hardcoded candidates omitted.`);
  }
  console.log(
    `Summary: ${errors.length} errors, ${warnings.length} warnings, ${hardcoded.length} hardcoded candidates, ${unusedCandidates.length} unused candidates`,
  );
}

process.exitCode = errors.length > 0 ? 1 : 0;
