const resolveComponentProps = (node: Record<string, unknown>) =>
  typeof node["x-component-props"] === "object" &&
  node["x-component-props"] !== null &&
  !Array.isArray(node["x-component-props"])
    ? (node["x-component-props"] as Record<string, unknown>)
    : {};

const patchSchemaNode = (schemaNode: unknown): unknown => {
  if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) {
    return schemaNode;
  }

  const currentNode = schemaNode as Record<string, unknown>;
  const componentName = String(currentNode["x-component"] ?? "");
  const properties = currentNode.properties;
  const nextNode = { ...currentNode };

  if (componentName === "SelectTableSingle") {
    nextNode["x-pattern"] = "disabled";
  }

  if (componentName === "TradeLicenseDetails") {
    nextNode["x-component-props"] = {
      ...resolveComponentProps(currentNode),
      readOnlyDetails: true,
    };
  }

  if (componentName === "SocialMediaManager") {
    nextNode["x-component-props"] = {
      ...resolveComponentProps(currentNode),
      autoRefreshEmiratesIdExpiry: true,
    };
  }

  if (properties && typeof properties === "object" && !Array.isArray(properties)) {
    nextNode.properties = Object.entries(properties as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((acc, [nodeKey, nodeValue]) => {
      acc[nodeKey] = patchSchemaNode(nodeValue);
      return acc;
    }, {});
  }

  return nextNode;
};

export const patchFormDataWithService80021ReadOnlyLock = ({
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
