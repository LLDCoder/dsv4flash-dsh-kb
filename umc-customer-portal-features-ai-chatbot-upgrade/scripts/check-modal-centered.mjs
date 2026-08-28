import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const staticModalMethods = new Set([
  "confirm",
  "info",
  "success",
  "error",
  "warning",
]);

function collectSourceFiles(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
  });
}

function getModalBindings(sourceFile, checker) {
  const modalSymbols = new Set();
  const antdNamespaceSymbols = new Set();

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== "antd") {
      return;
    }

    const clause = node.importClause;
    if (!clause?.namedBindings) return;

    if (ts.isNamespaceImport(clause.namedBindings)) {
      antdNamespaceSymbols.add(checker.getSymbolAtLocation(clause.namedBindings.name));
      return;
    }

    clause.namedBindings.elements.forEach((specifier) => {
      if ((specifier.propertyName?.text || specifier.name.text) === "Modal") {
        modalSymbols.add(checker.getSymbolAtLocation(specifier.name));
      }
    });
  });

  return { modalSymbols, antdNamespaceSymbols };
}

function isCenteredValueTrue(attribute) {
  return (
    !attribute.initializer ||
    (ts.isJsxExpression(attribute.initializer) &&
      attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword)
  );
}

function hasCenteredProperty(objectLiteral) {
  let effectiveValue = false;

  objectLiteral.properties.forEach((property) => {
    if (ts.isSpreadAssignment(property)) {
      effectiveValue = false;
      return;
    }

    if (
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === "centered") ||
        (ts.isStringLiteral(property.name) && property.name.text === "centered"))
    ) {
      effectiveValue = property.initializer.kind === ts.SyntaxKind.TrueKeyword;
    }
  });

  return effectiveValue;
}

function hasCenteredAttribute(attributes) {
  let effectiveValue = false;

  attributes.forEach((attribute) => {
    if (ts.isJsxSpreadAttribute(attribute)) {
      effectiveValue = false;
      return;
    }

    if (ts.isJsxAttribute(attribute) && attribute.name.text === "centered") {
      effectiveValue = isCenteredValueTrue(attribute);
    }
  });

  return effectiveValue;
}

function locationOf(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${path.relative(projectRoot, sourceFile.fileName)}:${line + 1}:${character + 1}`;
}

function checkSourceFile(sourceFile, checker) {
  const { modalSymbols, antdNamespaceSymbols } = getModalBindings(sourceFile, checker);
  const errors = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const isModalIdentifier =
        ts.isIdentifier(node.tagName) && modalSymbols.has(checker.getSymbolAtLocation(node.tagName));
      const isAntdNamespaceModal =
        ts.isPropertyAccessExpression(node.tagName) &&
        ts.isIdentifier(node.tagName.expression) &&
        antdNamespaceSymbols.has(checker.getSymbolAtLocation(node.tagName.expression)) &&
        node.tagName.name.text === "Modal";

      if (isModalIdentifier || isAntdNamespaceModal) {
        const isCentered = hasCenteredAttribute(node.attributes.properties);
        if (!isCentered) {
          errors.push(`${locationOf(sourceFile, node)} JSX Modal is missing centered`);
        }
      }
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const { expression, name } = node.expression;
      const isModalIdentifier =
        ts.isIdentifier(expression) && modalSymbols.has(checker.getSymbolAtLocation(expression));
      const isAntdNamespaceModal =
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        antdNamespaceSymbols.has(checker.getSymbolAtLocation(expression.expression)) &&
        expression.name.text === "Modal";

      if ((isModalIdentifier || isAntdNamespaceModal) && staticModalMethods.has(name.text)) {
        const [config] = node.arguments;
        if (!config || !ts.isObjectLiteralExpression(config) || !hasCenteredProperty(config)) {
          errors.push(`${locationOf(sourceFile, node)} Modal.${name.text} is missing centered: true`);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return errors;
}

const sourceFiles = collectSourceFiles(sourceRoot);
const program = ts.createProgram(sourceFiles, {
  allowJs: true,
  jsx: ts.JsxEmit.ReactJSX,
  noEmit: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const errors = sourceFiles.flatMap((filePath) => {
  const sourceFile = program.getSourceFile(filePath);
  return sourceFile ? checkSourceFile(sourceFile, checker) : [];
});

if (errors.length > 0) {
  console.error("Modal centering check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("Modal centering check passed.");
}
