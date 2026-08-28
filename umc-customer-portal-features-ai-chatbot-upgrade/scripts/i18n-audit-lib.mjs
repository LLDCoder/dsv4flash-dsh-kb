import { createHash } from "node:crypto";
import path from "node:path";
import ts from "typescript";

export const getValueType = (value) => {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
};

export const flattenResource = (value, prefix = "", result = new Map()) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenResource(item, prefix ? `${prefix}.${index}` : String(index), result);
    });
    return result;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      flattenResource(item, prefix ? `${prefix}.${key}` : key, result);
    });
    return result;
  }

  result.set(prefix, {
    type: getValueType(value),
    value,
  });
  return result;
};

export const hashResource = (resource) =>
  createHash("sha256").update(JSON.stringify(resource)).digest("hex");

const LOWER_CAMEL_RESOURCE_DIRECTORY = /^[a-z][A-Za-z0-9]*$/;
const COMPONENT_RESOURCE_DIRECTORY =
  /^components\/common\/[A-Za-z][A-Za-z0-9]*$/;

export const isValidResourceDirectoryPath = (resourcePath) =>
  typeof resourcePath === "string" &&
  (LOWER_CAMEL_RESOURCE_DIRECTORY.test(resourcePath) ||
    COMPONENT_RESOURCE_DIRECTORY.test(resourcePath));

export const collectDynamicI18nTemplateReferences = (source) => {
  const sourceFile = ts.createSourceFile(
    "dynamic-i18n-reference.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const references = [];
  const declaredNamesByScope = new Map();
  const stringConstantsByScope = new Map();
  const isI18nCall = (expression) =>
    (ts.isIdentifier(expression) &&
      (expression.text === "t" || expression.text === "gateT")) ||
    (ts.isPropertyAccessExpression(expression) &&
      expression.name.text === "t");
  const unwrapExpression = (expression) => {
    let current = expression;
    while (
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isSatisfiesExpression(current)
    ) {
      current = current.expression;
    }
    return current;
  };

  const isLexicalScope = (node) =>
    ts.isBlock(node) ||
    ts.isSourceFile(node) ||
    ts.isModuleBlock(node) ||
    ts.isCaseBlock(node) ||
    ts.isFunctionLike(node) ||
    ts.isCatchClause(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node);
  const getDeclarationScope = (node) => {
    const declarationList = ts.isVariableDeclaration(node)
      ? node.parent
      : undefined;
    const isBlockScoped =
      declarationList &&
      ts.isVariableDeclarationList(declarationList) &&
      (declarationList.flags & ts.NodeFlags.BlockScoped) !== 0;
    let current = node.parent;
    while (current) {
      if (
        !isBlockScoped &&
        (ts.isFunctionLike(current) || ts.isSourceFile(current))
      ) {
        return current;
      }
      if (isBlockScoped && isLexicalScope(current)) {
        return current;
      }
      current = current.parent;
    }
    return sourceFile;
  };
  const registerBindingName = (scope, name) => {
    if (ts.isIdentifier(name)) {
      const declaredNames = declaredNamesByScope.get(scope) ?? new Set();
      declaredNames.add(name.text);
      declaredNamesByScope.set(scope, declaredNames);
      return;
    }
    name.elements.forEach((element) => {
      if (ts.isBindingElement(element)) {
        registerBindingName(scope, element.name);
      }
    });
  };
  const collectStringConstants = (node) => {
    if (ts.isVariableDeclaration(node)) {
      const scope = getDeclarationScope(node);
      registerBindingName(scope, node.name);
      if (ts.isIdentifier(node.name) && node.initializer) {
        const initializer = unwrapExpression(node.initializer);
        if (
          ts.isStringLiteral(initializer) ||
          ts.isNoSubstitutionTemplateLiteral(initializer)
        ) {
          const constants = stringConstantsByScope.get(scope) ?? new Map();
          constants.set(node.name.text, initializer.text);
          stringConstantsByScope.set(scope, constants);
        }
      }
    }
    if (ts.isParameter(node) && ts.isFunctionLike(node.parent)) {
      registerBindingName(node.parent, node.name);
    }
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      registerBindingName(node, node.variableDeclaration.name);
    }
    ts.forEachChild(node, collectStringConstants);
  };
  collectStringConstants(sourceFile);

  const resolveStringConstant = (identifier) => {
    let current = identifier.parent;
    while (current) {
      if (isLexicalScope(current)) {
        if (declaredNamesByScope.get(current)?.has(identifier.text)) {
          return stringConstantsByScope.get(current)?.get(identifier.text);
        }
      }
      current = current.parent;
    }
    return undefined;
  };

  const inspect = (node) => {
    if (
      ts.isCallExpression(node) &&
      isI18nCall(node.expression) &&
      node.arguments[0] &&
      ts.isTemplateExpression(node.arguments[0])
    ) {
      const expression = node.arguments[0];
      let prefix = expression.head.text;
      for (const span of expression.templateSpans) {
        const substitution = unwrapExpression(span.expression);
        if (!ts.isIdentifier(substitution)) {
          break;
        }
        const constantValue = resolveStringConstant(substitution);
        if (constantValue === undefined) {
          break;
        }
        prefix += constantValue + span.literal.text;
      }
      references.push({
        expression: expression.getText(sourceFile),
        prefix,
      });
    }
    ts.forEachChild(node, inspect);
  };

  inspect(sourceFile);
  return references;
};

export const collectFiniteValueSourceValues = (
  source,
  {
    identifier,
    path: propertyPath = [],
    prefix = "",
    property: arrayProperty,
    selector,
  },
) => {
  const sourceFile = ts.createSourceFile(
    "finite-i18n-values.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const unwrapExpression = (expression) => {
    let current = expression;
    while (
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isSatisfiesExpression(current)
    ) {
      current = current.expression;
    }
    return current;
  };
  const getPropertyName = (name) => {
    if (
      ts.isIdentifier(name) ||
      ts.isStringLiteral(name) ||
      ts.isNumericLiteral(name) ||
      ts.isNoSubstitutionTemplateLiteral(name)
    ) {
      return name.text;
    }
    return undefined;
  };
  const getLiteralValue = (node) => {
    const current = unwrapExpression(node);
    if (
      ts.isStringLiteral(current) ||
      ts.isNumericLiteral(current) ||
      ts.isNoSubstitutionTemplateLiteral(current)
    ) {
      return current.text;
    }
    return undefined;
  };

  let declaration;
  const findDeclaration = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === identifier &&
      node.initializer
    ) {
      declaration = unwrapExpression(node.initializer);
      return;
    }
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === identifier
    ) {
      declaration = node.type;
      return;
    }
    ts.forEachChild(node, findDeclaration);
  };
  findDeclaration(sourceFile);
  if (!declaration) {
    return [];
  }

  let selected = declaration;
  for (const pathPart of propertyPath) {
    if (!ts.isObjectLiteralExpression(selected)) {
      return [];
    }
    const property = selected.properties.find(
      (candidate) =>
        ts.isPropertyAssignment(candidate) &&
        getPropertyName(candidate.name) === pathPart,
    );
    if (!property || !ts.isPropertyAssignment(property)) {
      return [];
    }
    selected = unwrapExpression(property.initializer);
  }

  let values = [];
  if (selector === "array" && ts.isArrayLiteralExpression(selected)) {
    values = selected.elements.map(getLiteralValue).filter(Boolean);
  } else if (
    selector === "array-property" &&
    ts.isArrayLiteralExpression(selected) &&
    arrayProperty
  ) {
    values = selected.elements
      .map(unwrapExpression)
      .filter(ts.isObjectLiteralExpression)
      .map((element) =>
        element.properties.find(
          (property) =>
            ts.isPropertyAssignment(property) &&
            getPropertyName(property.name) === arrayProperty,
        ),
      )
      .filter((property) => property && ts.isPropertyAssignment(property))
      .map((property) => getLiteralValue(property.initializer))
      .filter(Boolean);
  } else if (
    selector === "object-keys" &&
    ts.isObjectLiteralExpression(selected)
  ) {
    values = selected.properties
      .map((property) => getPropertyName(property.name))
      .filter(Boolean);
  } else if (
    selector === "object-values" &&
    ts.isObjectLiteralExpression(selected)
  ) {
    values = selected.properties
      .filter(ts.isPropertyAssignment)
      .map((property) => getLiteralValue(property.initializer))
      .filter(Boolean);
  } else if (selector === "type-union") {
    const typeNodes = ts.isUnionTypeNode(selected) ? selected.types : [selected];
    values = typeNodes
      .filter(ts.isLiteralTypeNode)
      .map((typeNode) => getLiteralValue(typeNode.literal))
      .filter(Boolean);
  }

  return values.map((value) => `${prefix}${value}`);
};

export const compareFiniteValueDomain = (
  configuredValues,
  canonicalValues,
) => {
  const configured = new Set(configuredValues);
  const canonical = new Set(canonicalValues);
  return {
    missingConfiguredValues: [...canonical].filter(
      (value) => !configured.has(value),
    ),
    valuesWithoutCanonicalSource: [...configured].filter(
      (value) => !canonical.has(value),
    ),
  };
};

export const isRegisteredDynamicI18nTemplate = (
  { prefix, file },
  {
    dynamicValueKeys = {},
    dynamicContextKeys = {},
    dynamicKeyPrefixes = [],
    externalRuntimePrefixes = [],
  } = {},
) => {
  const normalizedFile = file?.replaceAll("\\", "/");
  const isRegisteredProducer = (definition) =>
    Boolean(normalizedFile) &&
    (definition?.producers ?? []).some(
      (producer) => producer.replaceAll("\\", "/") === normalizedFile,
    );

  return (
    Object.entries(dynamicValueKeys).some(
      ([key, definition]) =>
        prefix === `${key}.` && isRegisteredProducer(definition),
    ) ||
    Object.entries(dynamicContextKeys).some(
      ([key, definition]) =>
        prefix === `${key}_` && isRegisteredProducer(definition),
    ) ||
    dynamicKeyPrefixes.some((registeredPrefix) =>
      prefix.startsWith(registeredPrefix),
    ) ||
    externalRuntimePrefixes.some((registeredPrefix) =>
      prefix.startsWith(registeredPrefix),
    )
  );
};

export const isVerifiedDeletionEvidence = (evidence) =>
  evidence?.status === "verified";

export const collectInterpolations = (value) => {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/\{\{\s*([^},\s]+)[^}]*\}\}/g)]
    .map((match) => match[1])
    .sort();
};

export const collectTags = (value) => {
  if (typeof value !== "string") return [];

  const stack = [];
  const tags = [];
  const errors = [];
  const tagPattern = /<\/?([A-Za-z][\w-]*)\b[^>]*>/g;

  for (const match of value.matchAll(tagPattern)) {
    const source = match[0];
    const name = match[1];
    const closing = source.startsWith("</");
    const selfClosing = source.endsWith("/>");

    tags.push(`${closing ? "/" : ""}${name}`);
    if (selfClosing) continue;

    if (closing) {
      const openName = stack.pop();
      if (openName !== name) {
        errors.push(`Expected </${openName || "none"}> but found </${name}>`);
      }
    } else {
      stack.push(name);
    }
  }

  stack.reverse().forEach((name) => errors.push(`Missing </${name}>`));
  return { tags, errors };
};

export const containsArabicPresentationForm = (value) =>
  typeof value === "string" && /[\uFB50-\uFDFF\uFE70-\uFEFF]/u.test(value);

export const containsUnexpectedArabicLocaleScript = (value) =>
  typeof value === "string" &&
  /[\p{Script=Thai}\p{Script=Han}\p{Script=Cyrillic}\p{Script=Hebrew}\p{Script=Devanagari}]/u.test(
    value,
  );

export const isPotentialVisibleText = (value, allowedLiterals = new Set()) => {
  if (typeof value !== "string") return false;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (
    !normalized ||
    (!/[A-Za-z]{2,}/u.test(normalized) &&
      !/\p{Script=Arabic}{2,}/u.test(normalized))
  ) {
    return false;
  }
  if (normalized === "&nbsp;" || allowedLiterals.has(normalized)) return false;
  if (/^(https?:|\/|\.|#|[A-Z0-9_-]+$)/u.test(normalized)) return false;
  return true;
};

const RAW_MESSAGE_PROPERTY_NAMES = new Set([
  "customMessage",
  "errorMessage",
  "failureReason",
]);

const containsRawMessageOwnerIdentifier = (node) => {
  let found = false;
  const inspect = (child) => {
    if (
      ts.isIdentifier(child) &&
      /(?:^|_)(?:err|error|response|result|resolution|exception|failure)|(?:Error|Response|Result|Resolution|Exception|Failure)(?:$|[A-Z])/u.test(
        child.text,
      )
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, inspect);
  };
  inspect(node);
  return found;
};

const nodeContainsRawMessageSource = (
  node,
  {
    anyMessageProperty = false,
    safeMessageOwnerNames = new Set(),
  } = {},
) => {
  let found = false;

  const inspect = (child) => {
    if (
      ts.isPropertyAccessExpression(child) &&
      !(
        ts.isIdentifier(child.expression) &&
        safeMessageOwnerNames.has(child.expression.text)
      ) &&
      (RAW_MESSAGE_PROPERTY_NAMES.has(child.name.text) ||
        (child.name.text === "message" &&
          (anyMessageProperty ||
            containsRawMessageOwnerIdentifier(child.expression))))
    ) {
      found = true;
      return;
    }
    if (
      ts.isElementAccessExpression(child) &&
      child.argumentExpression &&
      ts.isStringLiteral(child.argumentExpression) &&
      (RAW_MESSAGE_PROPERTY_NAMES.has(child.argumentExpression.text) ||
        (child.argumentExpression.text === "message" &&
          (anyMessageProperty ||
            containsRawMessageOwnerIdentifier(child.expression))))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, inspect);
  };

  inspect(node);
  return found;
};

export const containsRawErrorMessageSource = (source) => {
  const sourceFile = ts.createSourceFile(
    "user-message-expression.tsx",
    `const value = (${source});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  return nodeContainsRawMessageSource(sourceFile);
};

const functionReturnsRawMessage = (node) => {
  if (!node.body) {
    return false;
  }
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
    return nodeContainsRawMessageSource(node.body, {
      anyMessageProperty: true,
    });
  }

  let found = false;
  const inspect = (child) => {
    if (child !== node && ts.isFunctionLike(child)) {
      return;
    }
    if (
      ts.isReturnStatement(child) &&
      child.expression &&
      nodeContainsRawMessageSource(child.expression, {
        anyMessageProperty: true,
      })
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, inspect);
  };
  inspect(node.body);
  return found;
};

export const collectRawMessageReturningFunctionNames = (source) => {
  const sourceFile = ts.createSourceFile(
    "raw-message-functions.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const functionNames = new Set();

  const inspect = (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      functionReturnsRawMessage(node)
    ) {
      functionNames.add(node.name.text);
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer)) &&
      functionReturnsRawMessage(node.initializer)
    ) {
      functionNames.add(node.name.text);
    }
    ts.forEachChild(node, inspect);
  };

  inspect(sourceFile);
  return functionNames;
};

export const collectDirectImportedRawMessageFunctionNames = ({
  filePath,
  sourceFile,
  sourceRoot,
  rawMessageFunctionsByFile,
}) => {
  const importedRawFunctionNames = new Set();
  const resolveImport = (modulePath) => {
    const basePath = modulePath.startsWith("@/")
      ? path.join(sourceRoot, modulePath.slice(2))
      : modulePath.startsWith(".")
        ? path.resolve(path.dirname(filePath), modulePath)
        : null;
    if (!basePath) return null;

    return [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      `${basePath}.jsx`,
      path.join(basePath, "index.ts"),
      path.join(basePath, "index.tsx"),
      path.join(basePath, "index.js"),
      path.join(basePath, "index.jsx"),
    ].find((candidate) => rawMessageFunctionsByFile.has(candidate)) ?? null;
  };

  sourceFile.statements.forEach((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      return;
    }
    const importedFilePath = resolveImport(statement.moduleSpecifier.text);
    if (!importedFilePath) return;

    const importedRawFunctions =
      rawMessageFunctionsByFile.get(importedFilePath) ?? new Set();
    statement.importClause.namedBindings.elements.forEach((element) => {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedRawFunctions.has(importedName)) {
        importedRawFunctionNames.add(element.name.text);
      }
    });
  });

  return importedRawFunctionNames;
};

export const collectRawMessageStateVariableNames = (source) => {
  const sourceFile = ts.createSourceFile(
    "raw-message-state.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const stateBySetter = new Map();
  const rawStateNames = new Set();
  const safeMessageOwnerNames = new Set();

  const inspectStateDeclarations = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "validateMobileNumber"
    ) {
      safeMessageOwnerNames.add(node.name.text);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isArrayBindingPattern(node.name) &&
      node.name.elements.length >= 2 &&
      ts.isBindingElement(node.name.elements[0]) &&
      ts.isIdentifier(node.name.elements[0].name) &&
      ts.isBindingElement(node.name.elements[1]) &&
      ts.isIdentifier(node.name.elements[1].name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const callee = node.initializer.expression;
      const isUseState =
        (ts.isIdentifier(callee) && callee.text === "useState") ||
        (ts.isPropertyAccessExpression(callee) &&
          callee.name.text === "useState");
      if (isUseState) {
        stateBySetter.set(
          node.name.elements[1].name.text,
          node.name.elements[0].name.text,
        );
      }
    }
    ts.forEachChild(node, inspectStateDeclarations);
  };

  const inspectSetterCalls = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      stateBySetter.has(node.expression.text) &&
      node.arguments.some((argument) =>
        nodeContainsRawMessageSource(argument, {
          anyMessageProperty: true,
          safeMessageOwnerNames,
        }),
      )
    ) {
      rawStateNames.add(stateBySetter.get(node.expression.text));
    }
    ts.forEachChild(node, inspectSetterCalls);
  };

  inspectStateDeclarations(sourceFile);
  inspectSetterCalls(sourceFile);
  return rawStateNames;
};

export const isPotentialUserMessageSetterName = (name) =>
  /^set(?:.+(?:Error|Message|Result)|LockState)$/u.test(name);

export const containsRawMessageReference = (
  source,
  { functionNames = new Set(), variableNames = new Set() } = {},
) => {
  if (containsRawErrorMessageSource(source)) {
    return true;
  }

  const sourceFile = ts.createSourceFile(
    "raw-message-reference.tsx",
    `const value = (${source});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;

  const inspect = (node) => {
    if (ts.isIdentifier(node) && variableNames.has(node.text)) {
      found = true;
      return;
    }
    if (ts.isCallExpression(node)) {
      const functionName = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : "";
      if (functionNames.has(functionName)) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, inspect);
  };

  inspect(sourceFile);
  return found;
};

export const isDirectRawMessageReference = (
  source,
  { functionNames = new Set(), variableNames = new Set() } = {},
) => {
  const sourceFile = ts.createSourceFile(
    "direct-raw-message-reference.tsx",
    `const value = (${source});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = sourceFile.statements[0]?.declarationList?.declarations?.[0];

  const inspect = (node) => {
    if (!node) return false;
    if (ts.isParenthesizedExpression(node)) {
      return inspect(node.expression);
    }
    if (ts.isIdentifier(node)) {
      return variableNames.has(node.text);
    }
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      return nodeContainsRawMessageSource(node, {
        anyMessageProperty: true,
      });
    }
    if (ts.isCallExpression(node)) {
      const functionName = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : "";
      return functionNames.has(functionName);
    }
    if (ts.isBinaryExpression(node)) {
      return inspect(node.left) || inspect(node.right);
    }
    if (ts.isConditionalExpression(node)) {
      return inspect(node.whenTrue) || inspect(node.whenFalse);
    }
    return false;
  };

  return inspect(declaration?.initializer);
};

export const containsExactLocaleComparison = (source) => {
  const sourceFile = ts.createSourceFile(
    "locale-comparison.tsx",
    `const value = (${source});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const exactComparisonOperators = new Set([
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsToken,
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ]);
  const isLocaleLiteral = (node) =>
    ts.isStringLiteral(node) && (node.text === "ar" || node.text === "en");
  const containsLanguageSignal = (node) => {
    if (ts.isIdentifier(node)) {
      return /^(?:language|currentLang)$/i.test(node.text);
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      /^(?:language|resolvedLanguage)$/i.test(node.name.text)
    ) {
      return true;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "getItem" &&
      node.arguments.some(
        (argument) =>
          ts.isStringLiteral(argument) && argument.text === "language",
      )
    ) {
      return true;
    }
    let foundSignal = false;
    ts.forEachChild(node, (child) => {
      if (containsLanguageSignal(child)) {
        foundSignal = true;
      }
    });
    return foundSignal;
  };
  let found = false;

  const inspect = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      exactComparisonOperators.has(node.operatorToken.kind) &&
      ((isLocaleLiteral(node.left) && containsLanguageSignal(node.right)) ||
        (isLocaleLiteral(node.right) && containsLanguageSignal(node.left)))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, inspect);
  };
  inspect(sourceFile);
  return found;
};

const I18NEXT_PLURAL_SUFFIXES = [
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
  "plural",
];

export const hasI18nextPluralVariant = (resourceKeys, key) =>
  I18NEXT_PLURAL_SUFFIXES.some((suffix) =>
    resourceKeys.has(`${key}_${suffix}`),
  );

export const expandContextKeys = (key, contexts) =>
  contexts.map((context) => `${key}_${context}`);

export const expandValueKeys = (key, values) =>
  values.map((value) => `${key}.${value}`);

export const hasQuotedStringLiteral = (source, value) => {
  const sourceFile = ts.createSourceFile(
    "dynamic-key-producer.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;

  const inspect = (node) => {
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isNumericLiteral(node)) &&
      node.text === value
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, inspect);
  };

  inspect(sourceFile);
  return found;
};

export const hasStringLiteralFragment = (source, value) => {
  const sourceFile = ts.createSourceFile(
    "dynamic-key-producer.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;

  const inspect = (node) => {
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)) &&
      node.text.includes(value)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, inspect);
  };

  inspect(sourceFile);
  return found;
};

export const shouldCollectUnusedCandidates = (scope) => !scope;

export const shouldReportMissingStaticKey = (
  key,
  { exists, hasPluralVariant, hasRegisteredContext, externalRuntime },
) =>
  key.includes(".") &&
  !exists &&
  !hasPluralVariant &&
  !hasRegisteredContext &&
  !externalRuntime;

export const hasResourcePath = (resource, path) => {
  const segments = path.split(".");
  let current = resource;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return false;
    }
    current = current[segment];
  }

  return true;
};
