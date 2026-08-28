const normalizeIdentifier = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const isScreeningPeriodRangePicker = (
  nodeKey: string,
  node: Record<string, unknown>,
) => {
  if (node["x-component"] !== "DatePicker.RangePicker") {
    return false;
  }

  return [nodeKey, node.name, node.uniqueValue, node.title, node.titleEn]
    .map((value) => normalizeIdentifier(value))
    .includes("screeningperiod");
};

const patchSchemaNode = (
  nodeKey: string,
  schemaNode: unknown,
): unknown => {
  if (
    !schemaNode ||
    typeof schemaNode !== "object" ||
    Array.isArray(schemaNode)
  ) {
    return schemaNode;
  }

  const currentNode = schemaNode as Record<string, unknown>;
  const currentProps =
    currentNode["x-component-props"] &&
    typeof currentNode["x-component-props"] === "object" &&
    !Array.isArray(currentNode["x-component-props"])
      ? (currentNode["x-component-props"] as Record<string, unknown>)
      : {};
  const nextNode: Record<string, unknown> = {
    ...currentNode,
    ...(isScreeningPeriodRangePicker(nodeKey, currentNode)
      ? {
          "x-component-props": {
            ...currentProps,
            restriction: {
              beforeToday: false,
              afterToday: true,
            },
          },
        }
      : {}),
  };
  const properties = currentNode.properties;

  if (
    properties &&
    typeof properties === "object" &&
    !Array.isArray(properties)
  ) {
    nextNode.properties = Object.fromEntries(
      Object.entries(properties as Record<string, unknown>).map(
        ([key, value]) => [
          key,
          patchSchemaNode(key, value),
        ],
      ),
    );
  }

  return nextNode;
};

export const patchFormDataWithService1007ScreeningPeriodRestriction = ({
  parsedFormData,
}: {
  parsedFormData: Record<string, unknown>;
}) => {
  if (!parsedFormData.schema || typeof parsedFormData.schema !== "object") {
    return parsedFormData;
  }

  return {
    ...parsedFormData,
    schema: patchSchemaNode("", parsedFormData.schema),
  };
};
