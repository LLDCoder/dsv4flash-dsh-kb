type SchemaRecord = Record<string, unknown>;

const isPlainRecord = (value: unknown): value is SchemaRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isCapitalField = (nodeKey: string, node: SchemaRecord): boolean =>
  [nodeKey, node.name, node.uniqueValue].some((value) => value === "Capital");

const normalizeValidator = (
  validator: unknown,
  numberMessage: string,
): unknown => {
  if (!isPlainRecord(validator)) return validator;
  if (validator.format !== "number" || typeof validator.pattern !== "string") {
    return validator;
  }

  const remainingValidator = { ...validator };
  delete remainingValidator.format;
  return {
    ...remainingValidator,
    triggerType: "onInput",
    message: numberMessage,
  };
};

export const normalizeCapitalValidation = (
  schemaNode: unknown,
  numberMessage: string,
  nodeKey = "",
): unknown => {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map((item) =>
      normalizeCapitalValidation(item, numberMessage),
    );
  }

  if (!isPlainRecord(schemaNode)) return schemaNode;

  const nextNode: SchemaRecord = { ...schemaNode };

  if (isCapitalField(nodeKey, schemaNode)) {
    const validator = schemaNode["x-validator"];
    nextNode["x-validator"] = Array.isArray(validator)
      ? validator.map((item) => normalizeValidator(item, numberMessage))
      : normalizeValidator(validator, numberMessage);
  }

  if (isPlainRecord(schemaNode.properties)) {
    nextNode.properties = Object.fromEntries(
      Object.entries(schemaNode.properties).map(([key, value]) => [
        key,
        normalizeCapitalValidation(value, numberMessage, key),
      ]),
    );
  }

  if (schemaNode.items !== undefined) {
    nextNode.items = normalizeCapitalValidation(
      schemaNode.items,
      numberMessage,
    );
  }

  return nextNode;
};
