type SchemaObject = Record<string, unknown>;

const RESERVED_SCHEMA_KEYS = new Set([
  "type",
  "title",
  "name",
  "description",
  "default",
  "enum",
  "required",
  "properties",
  "items",
  "pattern",
  "format",
  "maxLength",
  "minLength",
  "maximum",
  "minimum",
  "multipleOf",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "maxItems",
  "minItems",
  "uniqueItems",
  "additionalProperties",
  "definitions",
  "labelName"
]);

const LOCALIZED_SCHEMA_FIELDS = [
  "title",
  "placeholder",
  "description",
  "tooltip",
  "textContent",
  "activityTitle",
  "activityLabelName",
  "labelName",
  "alertMessage",
  'existingMemberButtonLabel',
  'newMemberButtonLabel',
  "addButtonLabel",
  "descTooltip",
  "addButtonText"
] as const;

const COMPONENTS_WITH_INTERNAL_LABEL = new Set([
  "PersonsInChargeList",
  "AcquaintanceForm",
  "UrlList",
  "ProfileForm",
  "SocialMediaAccount",
  "FilmTrailerForm",
]);
const COMPONENTS_WITH_INTERNAL_FEEDBACK = new Set([
  "DataList",
  "PersonsInChargeList",
  "ProfileForm",
  "SocialMediaManager",
]);
const FORM_GRID_GAP = 24;
const TRAILING_REQUIRED_MARK_RE = /\s*\*+\s*$/;
const TRAINING_VIDEO_CARD_CLASS = "training-program-card";

function isPlainObject(value: unknown): value is SchemaObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyLocalizedValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
}

function hasDecoratorLabelFalse(target: SchemaObject): boolean {
  if (!isPlainObject(target["x-decorator-props"])) {
    return false;
  }

  return target["x-decorator-props"].label === false;
}

function localizeSchemaFieldMap(
  target: SchemaObject,
  isAr: boolean,
): SchemaObject {
  const nextTarget = { ...target };

  LOCALIZED_SCHEMA_FIELDS.forEach((fieldKey) => {
    const localizedKey = `${fieldKey}${isAr ? "Ar" : "En"}`;
    const localizedValue = target[localizedKey];

    if (isNonEmptyLocalizedValue(localizedValue)) {
      nextTarget[fieldKey] = localizedValue;
    }
  });

  return nextTarget;
}

function localizeEnumOption(
  option: SchemaObject,
  isAr: boolean,
): SchemaObject {
  const localizedLabel = option[isAr ? "labelAr" : "labelEn"];
  const localizedDescription = option[isAr ? "descriptionAr" : "descriptionEn"];
  const nextOption = { ...option };

  if (isNonEmptyLocalizedValue(localizedLabel)) {
    nextOption.label = localizedLabel;
  }

  if (isNonEmptyLocalizedValue(localizedDescription)) {
    nextOption.description = localizedDescription;
  }

  return nextOption;
}

function syncLocalizedComponentPropsToSchemaNode(
  schemaNode: SchemaObject,
  isAr: boolean,
): SchemaObject {
  if (!isPlainObject(schemaNode["x-component-props"])) {
    return schemaNode;
  }

  const componentProps = schemaNode["x-component-props"] as SchemaObject;
  const nextNode = { ...schemaNode };

  (["title", "description"] as const).forEach((fieldKey) => {
    const localizedKey = `${fieldKey}${isAr ? "Ar" : "En"}`;
    const localizedValue = componentProps[localizedKey];

    if (isNonEmptyLocalizedValue(localizedValue)) {
      nextNode[fieldKey] = localizedValue;
      return;
    }

    const fallbackValue = componentProps[fieldKey];
    if (
      !isNonEmptyLocalizedValue(nextNode[fieldKey]) &&
      isNonEmptyLocalizedValue(fallbackValue)
    ) {
      nextNode[fieldKey] = fallbackValue;
    }
  });

  return applyTrainingVideoCardTitle(nextNode);
}

function hasTrainingVideoField(schemaNode: SchemaObject): boolean {
  if (!isPlainObject(schemaNode.properties)) {
    return false;
  }

  return Object.entries(schemaNode.properties).some(([key, value]) => {
    if (!isPlainObject(value)) {
      return false;
    }

    const componentProps = isPlainObject(value["x-component-props"])
      ? value["x-component-props"]
      : {};

    return (
      key === "TrainingVideoWatched" ||
      value.name === "TrainingVideoWatched" ||
      componentProps.uniqueValue === "TrainingVideoWatched" ||
      hasTrainingVideoField(value)
    );
  });
}

function hasTrainingVideoNotice(schemaNode: SchemaObject): boolean {
  if (!isPlainObject(schemaNode.properties)) {
    return false;
  }

  return Object.values(schemaNode.properties).some((value) => {
    if (!isPlainObject(value)) {
      return false;
    }

    const componentProps = isPlainObject(value["x-component-props"])
      ? value["x-component-props"]
      : {};
    const text = String(componentProps.text ?? componentProps.textEn ?? "")
      .toLowerCase();

    return (
      (value["x-component"] === "Information" &&
        text.includes("training program video")) ||
      hasTrainingVideoNotice(value)
    );
  });
}

function isTrainingVideoNode(key: string, value: unknown): value is SchemaObject {
  if (!isPlainObject(value)) {
    return false;
  }

  const componentProps = isPlainObject(value["x-component-props"])
    ? value["x-component-props"]
    : {};

  return (
    key === "TrainingVideoWatched" ||
    value.name === "TrainingVideoWatched" ||
    componentProps.uniqueValue === "TrainingVideoWatched"
  );
}

function findTrainingVideoEntry(
  entries: Array<[string, unknown]>,
): [string, SchemaObject] | undefined {
  const explicitVideoEntry = entries.find(([key, value]) =>
    isTrainingVideoNode(key, value),
  );

  if (explicitVideoEntry && isPlainObject(explicitVideoEntry[1])) {
    return [explicitVideoEntry[0], explicitVideoEntry[1]];
  }

  const videoEntries = entries.filter(([, value]) => {
    return isPlainObject(value) && value["x-component"] === "Video";
  });

  if (videoEntries.length !== 1 || !isPlainObject(videoEntries[0][1])) {
    return undefined;
  }

  return [videoEntries[0][0], videoEntries[0][1]];
}

function mergeClassName(value: unknown, className: string): string {
  const classes = typeof value === "string" ? value.split(/\s+/) : [];
  return Array.from(new Set([...classes.filter(Boolean), className])).join(" ");
}

function hideVideoFieldLabels(schemaNode: unknown): unknown {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map(hideVideoFieldLabels);
  }

  if (!isPlainObject(schemaNode)) {
    return schemaNode;
  }

  const nextNode: SchemaObject = { ...schemaNode };

  if (nextNode["x-component"] === "Video") {
    nextNode["x-decorator-props"] = {
      ...(isPlainObject(nextNode["x-decorator-props"])
        ? nextNode["x-decorator-props"]
        : {}),
      colon: false,
      label: false,
    };
    delete nextNode.title;
  }

  if (isPlainObject(schemaNode.properties)) {
    nextNode.properties = Object.fromEntries(
      Object.entries(schemaNode.properties).map(([key, value]) => [
        key,
        hideVideoFieldLabels(value),
      ]),
    );
  }

  if (schemaNode.items !== undefined) {
    nextNode.items = hideVideoFieldLabels(schemaNode.items);
  }

  return nextNode;
}

function removeDuplicatedRequiredMark(schemaNode: SchemaObject): SchemaObject {
  if (schemaNode.required !== true || typeof schemaNode.title !== "string") {
    return schemaNode;
  }

  const title = schemaNode.title.replace(TRAILING_REQUIRED_MARK_RE, "");
  return title === schemaNode.title ? schemaNode : { ...schemaNode, title };
}

function groupTrainingVideoCardProperties(properties: SchemaObject): SchemaObject {
  const entries = Object.entries(properties);
  const cardEntry = entries.find(([, value]) => {
    return (
      isPlainObject(value) &&
      value["x-component"] === "Card" &&
      hasTrainingVideoNotice(value)
    );
  });
  const videoEntry = findTrainingVideoEntry(entries);

  if (!cardEntry || !videoEntry || !isPlainObject(cardEntry[1])) {
    return properties;
  }

  const [cardKey, cardValue] = cardEntry;
  const [videoKey, videoValue] = videoEntry;
  const cardProperties = isPlainObject(cardValue.properties)
    ? cardValue.properties
    : {};
  const nextProperties = { ...properties };

  nextProperties[cardKey] = applyTrainingVideoCardTitle({
    ...cardValue,
    properties: {
      ...cardProperties,
      [videoKey]: videoValue,
    },
  });
  delete nextProperties[videoKey];

  return nextProperties;
}

function applyTrainingVideoCardTitle(schemaNode: SchemaObject): SchemaObject {
  if (
    schemaNode["x-component"] !== "Card" ||
    (!hasTrainingVideoField(schemaNode) && !hasTrainingVideoNotice(schemaNode))
  ) {
    return schemaNode;
  }

  const componentProps = isPlainObject(schemaNode["x-component-props"])
    ? schemaNode["x-component-props"]
    : {};
  const nextComponentProps: SchemaObject = {
    ...componentProps,
    className: mergeClassName(componentProps.className, TRAINING_VIDEO_CARD_CLASS),
  };
  const nextSchemaNode: SchemaObject = {
    ...schemaNode,
    properties: hideVideoFieldLabels(schemaNode.properties),
    "x-component-props": nextComponentProps,
  };

  return nextSchemaNode;
}

export function normalizeSchemaComponentProps(schemaNode: unknown): unknown {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map((item) => normalizeSchemaComponentProps(item));
  }

  if (!isPlainObject(schemaNode)) {
    return schemaNode;
  }

  const nextNode: SchemaObject = { ...schemaNode };
  const extraComponentProps = Object.entries(schemaNode).reduce<
    SchemaObject
  >((acc, [key, value]) => {
    if (key.startsWith("x-") || RESERVED_SCHEMA_KEYS.has(key)) {
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});

  if (Object.keys(extraComponentProps).length > 0) {
    nextNode["x-component-props"] = {
      ...extraComponentProps,
      ...(isPlainObject(schemaNode["x-component-props"])
        ? schemaNode["x-component-props"]
        : {}),
    };
  }

  if (
    typeof nextNode["x-component"] === "string" &&
    COMPONENTS_WITH_INTERNAL_LABEL.has(nextNode["x-component"])
  ) {
    nextNode["x-decorator-props"] = {
      ...(isPlainObject(schemaNode["x-decorator-props"])
        ? schemaNode["x-decorator-props"]
        : {}),
      colon: false,
      label: false,
    };
  }

  if (
    typeof nextNode["x-component"] === "string" &&
    COMPONENTS_WITH_INTERNAL_FEEDBACK.has(nextNode["x-component"])
  ) {
    nextNode["x-decorator-props"] = {
      ...(isPlainObject(nextNode["x-decorator-props"])
        ? nextNode["x-decorator-props"]
        : {}),
      feedbackLayout: "none",
    };
  }

  if (nextNode["x-component"] === "FormGrid") {
    nextNode["x-component-props"] = {
      ...(isPlainObject(nextNode["x-component-props"])
        ? nextNode["x-component-props"]
        : {}),
      columnGap: FORM_GRID_GAP,
      rowGap: FORM_GRID_GAP,
    };
  }

  if (isPlainObject(schemaNode.properties)) {
    nextNode.properties = groupTrainingVideoCardProperties(Object.fromEntries(
      Object.entries(schemaNode.properties).map(([key, value]) => [
        key,
        normalizeSchemaComponentProps(value),
      ]),
    ));
  }

  if (schemaNode.items !== undefined) {
    nextNode.items = normalizeSchemaComponentProps(schemaNode.items);
  }

  return applyTrainingVideoCardTitle(nextNode);
}

export function localizeSchemaNode(schemaNode: unknown, isAr: boolean): unknown {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map((item) => localizeSchemaNode(item, isAr));
  }

  if (!isPlainObject(schemaNode)) {
    return schemaNode;
  }

  const nextNode = removeDuplicatedRequiredMark(
    applyTrainingVideoCardTitle(
      syncLocalizedComponentPropsToSchemaNode(
        localizeSchemaFieldMap(schemaNode, isAr),
        isAr,
      ),
    ),
  );

  // `label: false` is a hard-hide flag for the outer Formily decorator label.
  // Remove the schema title so Formily cannot fall back to `field.title`.
  if (hasDecoratorLabelFalse(nextNode)) {
    delete nextNode.title;
  }

  if (isPlainObject(schemaNode["x-component-props"])) {
    nextNode["x-component-props"] = localizeSchemaNode(
      schemaNode["x-component-props"],
      isAr,
    );
  }

  if (isPlainObject(schemaNode["x-decorator-props"])) {
    nextNode["x-decorator-props"] = localizeSchemaNode(
      schemaNode["x-decorator-props"],
      isAr,
    );
  }

  if (isPlainObject(schemaNode.properties)) {
    nextNode.properties = groupTrainingVideoCardProperties(Object.fromEntries(
      Object.entries(schemaNode.properties).map(([key, value]) => [
        key,
        localizeSchemaNode(value, isAr),
      ]),
    ));
  }

  if (Array.isArray(schemaNode.enum)) {
    nextNode.enum = schemaNode.enum.map((item) => {
      const localizedItem = localizeSchemaNode(item, isAr);
      return isPlainObject(localizedItem)
        ? localizeEnumOption(localizedItem, isAr)
        : localizedItem;
    });
  }

  if (schemaNode.items !== undefined) {
    nextNode.items = localizeSchemaNode(schemaNode.items, isAr);
  }

  return applyTrainingVideoCardTitle(nextNode);
}
