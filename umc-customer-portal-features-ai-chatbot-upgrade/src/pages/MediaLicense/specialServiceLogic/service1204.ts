const SERVICE_1204_EDITABLE_FIELD_IDENTIFIERS = new Set([
  "newspapermagazineurl",
  "ownerapproval",
  "qualificationcopy",
  "newspapermagazineownerapproval",
]);

const SERVICE_1204_ID_SELECTOR_UPLOAD_FIELDS = [
  "PersonalPhoto",
  "EmiratesID",
  "Passport",
  "Visa",
  "PassportScan",
] as const;

const NON_INTERACTIVE_COMPONENTS = new Set([
  "Card",
  "FormGrid",
  "FormGrid.GridColumn",
  "Divider",
]);

const normalizeIdentifier = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const collectFieldIdentifiers = (nodeKey: string, node: Record<string, unknown>) => {
  const candidates = [
    nodeKey,
    node.name,
    node.uniqueValue,
    node.title,
    node.titleEn,
  ];

  return candidates
    .map((candidate) => normalizeIdentifier(candidate))
    .filter(Boolean);
};

const isInteractiveFieldNode = (node: Record<string, unknown>) => {
  const componentName = String(node["x-component"] ?? "");
  if (!componentName || NON_INTERACTIVE_COMPONENTS.has(componentName)) {
    return false;
  }

  if (node["x-decorator"] === "FormItem") {
    return true;
  }

  if (componentName === "IDSelector" || componentName === "DataList") {
    return true;
  }

  return node.type !== "void";
};

const patchSchemaNode = (schemaNode: unknown): unknown => {
  if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) {
    return schemaNode;
  }

  const currentNode = schemaNode as Record<string, unknown>;
  const properties = currentNode.properties;

  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return { ...currentNode };
  }

  const nextProperties = Object.entries(properties as Record<string, unknown>).reduce<
    Record<string, unknown>
  >((acc, [nodeKey, nodeValue]) => {
    if (!nodeValue || typeof nodeValue !== "object" || Array.isArray(nodeValue)) {
      acc[nodeKey] = nodeValue;
      return acc;
    }

    const currentChildNode = nodeValue as Record<string, unknown>;
    const nextChildNode: Record<string, unknown> = {
      ...currentChildNode,
      ...(currentChildNode.properties
        ? { properties: (patchSchemaNode(currentChildNode) as Record<string, unknown>).properties }
        : {}),
    };
    const componentName = String(currentChildNode["x-component"] ?? "");
    const identifiers = collectFieldIdentifiers(nodeKey, currentChildNode);
    const isWhitelistedField = identifiers.some((identifier) =>
      SERVICE_1204_EDITABLE_FIELD_IDENTIFIERS.has(identifier),
    );

    if (componentName === "DataList") {
      // DataList editability is configured by admin. Keep its original
      // x-pattern instead of overriding it with the service 1204 whitelist.
    } else if (componentName === "IDSelector") {
      nextChildNode["x-pattern"] = "editable";
      nextChildNode["x-component-props"] = {
        ...(typeof currentChildNode["x-component-props"] === "object" &&
        currentChildNode["x-component-props"] !== null &&
        !Array.isArray(currentChildNode["x-component-props"])
          ? (currentChildNode["x-component-props"] as Record<string, unknown>)
          : {}),
        editableFieldKeys: [...SERVICE_1204_ID_SELECTOR_UPLOAD_FIELDS],
        autoRefreshEmiratesIdExpiry: true,
      };
    } else if (isInteractiveFieldNode(currentChildNode)) {
      nextChildNode["x-pattern"] = isWhitelistedField ? "editable" : "disabled";
    }

    acc[nodeKey] = nextChildNode;
    return acc;
  }, {});

  return {
    ...currentNode,
    properties: nextProperties,
  };
};

export const patchFormDataWithService1204ReadOnlyLock = ({
  parsedFormData,
}: {
  parsedFormData: Record<string, unknown>;
}) => {
  if (!parsedFormData.schema || typeof parsedFormData.schema !== "object") {
    return parsedFormData;
  }

  return {
    ...parsedFormData,
    schema: patchSchemaNode(parsedFormData.schema),
  };
};
