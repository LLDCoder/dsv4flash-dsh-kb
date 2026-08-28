export type ArtistWorkTypeSelectOption = {
  label: string;
  value: string | number;
  code?: string | number;
  description?: string;
  showDescription?: boolean;
};

type PatchFormDataWithArtistWorkTypeParams = {
  parsedFormData: Record<string, unknown>;
  materialTypeId?: number | null;
  artistWorkTypeOptions?: ArtistWorkTypeSelectOption[];
};

const isArtistWorkTypeSelectNode = (schemaNode: Record<string, unknown>) => {
  if (schemaNode?.["x-component"] !== "Select") {
    return false;
  }

  const componentProps = schemaNode?.["x-component-props"];
  if (!componentProps || typeof componentProps !== "object") {
    return false;
  }

  return (componentProps as Record<string, unknown>).Source === "ArtistWorkTypes";
};

const getValueByPath = (source: Record<string, unknown>, path: string[]) => {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, source);
};

const setValueByPath = (
  target: Record<string, unknown>,
  path: string[],
  value: unknown,
) => {
  if (path.length === 0) {
    return;
  }

  let current = target;
  path.forEach((segment, idx) => {
    if (idx === path.length - 1) {
      (current as Record<string, unknown>)[segment] = value;
      return;
    }

    const nextValue = (current as Record<string, unknown>)[segment];
    (current as Record<string, unknown>)[segment] =
      nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)
        ? { ...(nextValue as Record<string, unknown>) }
        : {};
    current = (current as Record<string, unknown>)[segment] as Record<
      string,
      unknown
    >;
  });
};

const syncArtistWorkTypeSelectEnums = ({
  schemaNode,
  formValues,
  artistWorkTypeOptions,
  parentPath = [],
}: {
  schemaNode: Record<string, unknown>;
  formValues: Record<string, unknown>;
  artistWorkTypeOptions: ArtistWorkTypeSelectOption[];
  parentPath?: string[];
}) => {
  const properties = schemaNode?.properties;
  if (!properties || typeof properties !== "object") {
    return;
  }

  Object.entries(properties).forEach(([key, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const nextNode = value as Record<string, unknown>;
    const nextPath = [...parentPath, key];

    if (isArtistWorkTypeSelectNode(nextNode) && artistWorkTypeOptions.length > 0) {
      (nextNode as Record<string, unknown>).enum = artistWorkTypeOptions.map((option) => ({
        label: option.label,
        value: option.value,
        description: option.description ?? "",
        showDescription: option.showDescription ?? false,
      }));

      (nextNode as Record<string, unknown>)["x-component-props"] = {
        ...(((nextNode as Record<string, unknown>)["x-component-props"] as
          | Record<string, unknown>
          | undefined) || {}),
        options: artistWorkTypeOptions.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      };

      const currentValue = getValueByPath(formValues, nextPath);
      const matchedOption = artistWorkTypeOptions.find((option) =>
        [option.value, option.label, option.code].some(
          (candidate) =>
            String(candidate).trim().toLowerCase() ===
            String(currentValue ?? "").trim().toLowerCase(),
        ),
      );

      if (currentValue !== undefined && matchedOption) {
        setValueByPath(formValues, nextPath, matchedOption.value);
      } else if (currentValue !== undefined) {
        setValueByPath(formValues, nextPath, undefined);
      }
    }

    syncArtistWorkTypeSelectEnums({
      schemaNode: nextNode,
      formValues,
      artistWorkTypeOptions,
      parentPath: nextPath,
    });
  });
};

export const patchFormDataWithArtistWorkTypeOptions = ({
  parsedFormData,
  materialTypeId,
  artistWorkTypeOptions = [],
}: PatchFormDataWithArtistWorkTypeParams) => {
  const nextFormValues = { ...(parsedFormData.formValues || {}) };

  if (materialTypeId === null) {
    nextFormValues.materialTypeId = undefined;
  } else if (materialTypeId !== undefined) {
    nextFormValues.materialTypeId = materialTypeId;
  }

  const nextSchema = parsedFormData.schema
    ? { ...(parsedFormData.schema as Record<string, unknown>) }
    : parsedFormData.schema;

  if (nextSchema && typeof nextSchema === "object") {
    syncArtistWorkTypeSelectEnums({
      schemaNode: nextSchema,
      formValues: nextFormValues,
      artistWorkTypeOptions,
    });
  }

  return {
    ...parsedFormData,
    formValues: nextFormValues,
    schema: nextSchema,
  };
};
