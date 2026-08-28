import type { ModifyFormStep } from "./modifyChangeSummary";

export type CanonicalSocialMediaAccount = {
  accountId: number;
  platformId: number;
  mediaCategoryId: number;
  subCategoryIds: number[];
  displayName: string;
  websiteUrl: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toPositiveInteger = (value: unknown): number | undefined => {
  if (typeof value !== "number") return undefined;
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
};

const normalizeBusinessText = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

const normalizeExactText = (value: unknown) => String(value ?? "").trim();

const toPositiveIntegerValue = (value: unknown) => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[1-9]\d*$/.test(value.trim())
        ? Number(value.trim())
        : undefined;
  return numericValue !== undefined &&
    Number.isSafeInteger(numericValue) &&
    numericValue > 0
    ? numericValue
    : undefined;
};

const getLegacyMediaCategoryId = (item: Record<string, unknown>) => {
  return (
    toPositiveIntegerValue(item.mediaCategoryId) ??
    toPositiveIntegerValue(item.mediaCategory)
  );
};

const getLegacyPlatformId = (item: Record<string, unknown>) =>
  toPositiveIntegerValue(item.platformId) ??
  toPositiveIntegerValue(item.accountType);

const normalizeIdentifierSet = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const identifiers = value.map(toPositiveIntegerValue);
  if (identifiers.some((identifier) => identifier === undefined)) {
    return undefined;
  }
  return Array.from(new Set(identifiers as number[])).sort((a, b) => a - b);
};

const getLegacySubCategoryIds = (item: Record<string, unknown>) =>
  normalizeIdentifierSet(item.subCategoryIds) ??
  normalizeIdentifierSet(item.mediaSubCategories);

const identifierSetsEqual = (
  left: readonly number[] | undefined,
  right: unknown,
) => {
  const normalizedRight = normalizeIdentifierSet(right);
  return Boolean(
    left &&
      normalizedRight &&
      left.length === normalizedRight.length &&
      left.every(
        (identifier, index) => identifier === normalizedRight[index],
      ),
  );
};

const hasCanonicalAccountIdentifiers = (item: Record<string, unknown>) =>
  toPositiveInteger(item.accountId) !== undefined &&
  toPositiveInteger(item.platformId) !== undefined &&
  toPositiveInteger(item.mediaCategoryId) !== undefined &&
  Array.isArray(item.subCategoryIds) &&
  item.subCategoryIds.every(
    (value) => toPositiveInteger(value) !== undefined,
  );

const canonicalFields = (item: CanonicalSocialMediaAccount) => ({
  accountId: item.accountId,
  platformId: item.platformId,
  mediaCategoryId: item.mediaCategoryId,
  subCategoryIds: [...item.subCategoryIds],
});

const canonicalAccountToFormItem = (
  item: CanonicalSocialMediaAccount,
) => ({
  id: `canonical-${item.accountId}`,
  ...canonicalFields(item),
  accountName: item.displayName,
  accountTitle: item.displayName,
  accountUrl: item.websiteUrl,
  accountType: String(item.platformId),
  mediaCategory: String(item.mediaCategoryId),
  mediaSubCategories: item.subCategoryIds.map(String),
});

const matchesCanonicalAccount = (
  item: Record<string, unknown>,
  canonical: CanonicalSocialMediaAccount,
) =>
  normalizeBusinessText(item.accountName ?? item.accountTitle) ===
    normalizeBusinessText(canonical.displayName) &&
  normalizeExactText(item.accountUrl) ===
    normalizeExactText(canonical.websiteUrl) &&
  getLegacyMediaCategoryId(item) === canonical.mediaCategoryId &&
  getLegacyPlatformId(item) === canonical.platformId &&
  identifierSetsEqual(getLegacySubCategoryIds(item), canonical.subCategoryIds);

const hydrateAccountItems = (
  value: unknown,
  canonicalAccounts: readonly CanonicalSocialMediaAccount[],
  canonicalByStableId: ReadonlyMap<string, Record<string, unknown>>,
) => {
  if (!Array.isArray(value)) return value;
  const canonicalAccountIds = new Set(
    canonicalAccounts.map((account) => account.accountId),
  );

  return value.map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }
    const accountId = toPositiveInteger(entry.accountId);
    if (
      hasCanonicalAccountIdentifiers(entry) &&
      accountId !== undefined &&
      canonicalAccountIds.has(accountId)
    ) {
      return entry;
    }

    const stableId = String(entry.id ?? "").trim();
    const stableMatch = stableId ? canonicalByStableId.get(stableId) : undefined;
    const stableAccountId = toPositiveInteger(stableMatch?.accountId);
    if (
      stableMatch &&
      hasCanonicalAccountIdentifiers(stableMatch) &&
      stableAccountId !== undefined &&
      canonicalAccountIds.has(stableAccountId)
    ) {
      return {
        ...entry,
        accountId: stableMatch.accountId,
        platformId: stableMatch.platformId,
        mediaCategoryId: stableMatch.mediaCategoryId,
        subCategoryIds: [...(stableMatch.subCategoryIds as number[])],
      };
    }

    const matches = canonicalAccounts.filter((canonical) =>
      matchesCanonicalAccount(entry, canonical),
    );
    return matches.length === 1
      ? { ...entry, ...canonicalFields(matches[0]) }
      : entry;
  });
};

const appendMissingCanonicalAccounts = (
  items: unknown[],
  canonicalAccounts: readonly CanonicalSocialMediaAccount[],
  canonicalByStableId: ReadonlyMap<string, Record<string, unknown>>,
) => {
  const recordItems = items.filter(isRecord);
  const canonicalAccountIds = new Set(
    canonicalAccounts.map((account) => account.accountId),
  );
  const matchedAccountIds = new Set<number>();
  const ambiguousAccountIds = new Set<number>();
  recordItems.forEach((item) => {
    const accountId = toPositiveIntegerValue(item.accountId);
    if (
      accountId !== undefined &&
      canonicalAccountIds.has(accountId)
    ) {
      matchedAccountIds.add(accountId);
      return;
    }

    let matches = canonicalAccounts.filter((canonical) =>
      matchesCanonicalAccount(item, canonical),
    );
    const stableId = String(item.id ?? "").trim();
    const stableMatch = stableId ? canonicalByStableId.get(stableId) : undefined;
    if (matches.length === 0 && stableMatch) {
      matches = canonicalAccounts.filter((canonical) =>
        matchesCanonicalAccount(stableMatch, canonical),
      );
    }
    if (matches.length === 1) {
      matchedAccountIds.add(matches[0].accountId);
    } else if (matches.length > 1) {
      matches.forEach((match) => ambiguousAccountIds.add(match.accountId));
    }
  });

  return [
    ...items,
    ...canonicalAccounts
      .filter(
        (item) =>
          !matchedAccountIds.has(item.accountId) &&
          !ambiguousAccountIds.has(item.accountId),
      )
      .map(canonicalAccountToFormItem),
  ];
};

const hasTrackedAccountOperations = (items: unknown[]) =>
  items.some((item) => isRecord(item) && typeof item.operation === "string");

const stripTrackedAccountOperations = (items: unknown[]) =>
  items.map((item) => {
    if (!isRecord(item) || !("operation" in item)) {
      return item;
    }
    const nextItem = { ...item };
    delete nextItem.operation;
    return nextItem;
  });

const hydrateFormValues = (
  value: unknown,
  canonicalAccounts: readonly CanonicalSocialMediaAccount[],
  canonicalByStableId: ReadonlyMap<string, Record<string, unknown>>,
  options: { appendMissing?: boolean; stripOperations?: boolean } = {},
) => {
  if (!isRecord(value) || !Array.isArray(value.socialMediaAccounts)) {
    return value;
  }
  const hydratedItems = hydrateAccountItems(
    value.socialMediaAccounts,
    canonicalAccounts,
    canonicalByStableId,
  ) as unknown[];
  const normalizedItems = options.stripOperations
    ? stripTrackedAccountOperations(hydratedItems)
    : hydratedItems;

  return {
    ...value,
    socialMediaAccounts:
      options.appendMissing === false
        ? normalizedItems
        : appendMissingCanonicalAccounts(
            normalizedItems,
            canonicalAccounts,
            canonicalByStableId,
          ),
  };
};

const filterValidCanonicalAccounts = (
  canonicalAccounts: readonly CanonicalSocialMediaAccount[] | null | undefined,
) =>
  (canonicalAccounts ?? []).filter(
    (item) =>
      toPositiveInteger(item.accountId) !== undefined &&
      toPositiveInteger(item.platformId) !== undefined &&
      toPositiveInteger(item.mediaCategoryId) !== undefined &&
      Array.isArray(item.subCategoryIds) &&
      item.subCategoryIds.every(
        (value) => toPositiveInteger(value) !== undefined,
      ),
  );

export const applySocialMediaCanonicalAccountContext = (
  formsList: ModifyFormStep[],
  canonicalAccounts: readonly CanonicalSocialMediaAccount[] | null | undefined,
): ModifyFormStep[] => {
  const validCanonicalAccounts = filterValidCanonicalAccounts(canonicalAccounts);
  if (validCanonicalAccounts.length === 0) return formsList;

  return formsList.map((step) => {
    if (!step.formData) return step;
    try {
      const parsed = JSON.parse(step.formData);
      if (!isRecord(parsed)) return step;

      const hydratedOriginal = hydrateFormValues(
        parsed.modifyOriginalFormValues,
        validCanonicalAccounts,
        new Map(),
      );
      const originalItems = isRecord(hydratedOriginal) &&
        Array.isArray(hydratedOriginal.socialMediaAccounts)
          ? hydratedOriginal.socialMediaAccounts.filter(isRecord)
          : [];
      const canonicalByStableId = new Map(
        originalItems
          .map((item) => [String(item.id ?? "").trim(), item] as const)
          .filter(([id]) => Boolean(id)),
      );
      const currentSocialMediaAccounts = isRecord(parsed.formValues) &&
        Array.isArray(parsed.formValues.socialMediaAccounts)
          ? parsed.formValues.socialMediaAccounts
          : [];
      const hasPersistedDeltaMarkers = hasTrackedAccountOperations(
        currentSocialMediaAccounts,
      );
      const shouldAppendMissingCanonicalAccounts = !hasPersistedDeltaMarkers;
      const hydratedCurrent = hydrateFormValues(
        parsed.formValues,
        validCanonicalAccounts,
        canonicalByStableId,
        {
          // Persisted ADD/MODIFY/DELETE markers identify a saved delta list
          // coming from formValues.socialMediaAccounts. On load, that list is
          // the display baseline: do not append certificate snapshot accounts,
          // and clear persisted markers so tags only reflect edits made in the
          // current page session.
          appendMissing: shouldAppendMissingCanonicalAccounts,
          stripOperations: hasPersistedDeltaMarkers,
        },
      );

      return {
        ...step,
        formData: JSON.stringify({
          ...parsed,
          formValues: hydratedCurrent,
          ...(isRecord(parsed.modifyOriginalFormValues)
            ? { modifyOriginalFormValues: hydratedOriginal }
            : {}),
        }),
      };
    } catch {
      return step;
    }
  });
};

// Renew is not a change-tracking flow: it needs the certificate's resolved
// current accounts, not the delta list a Modify application stores (which keeps
// DELETE markers and account ids that the backend re-issues on approval).
// Rebuilding from the canonical snapshot handles add, edit and delete in one
// pass, and is why this is keyed on the action rather than on a service code.
const carryOverFormOnlyFields = (
  canonical: CanonicalSocialMediaAccount,
  previousItems: readonly Record<string, unknown>[],
) => {
  const byAccountId = previousItems.filter(
    (item) => toPositiveIntegerValue(item.accountId) === canonical.accountId,
  );
  // Account ids are re-issued on approval, so fall back to the pair a person
  // would recognise the account by.
  const candidates =
    byAccountId.length > 0
      ? byAccountId
      : previousItems.filter(
          (item) =>
            normalizeBusinessText(item.accountName ?? item.accountTitle) ===
              normalizeBusinessText(canonical.displayName) &&
            normalizeExactText(item.accountUrl) ===
              normalizeExactText(canonical.websiteUrl),
        );
  // Two accounts can share a display name; guessing would attach the wrong
  // screenshot, so only reuse an unambiguous match.
  if (candidates.length !== 1) return {};

  const [match] = candidates;
  const carried: Record<string, unknown> = {};
  const stableId = String(match.id ?? "").trim();
  if (stableId) carried.id = stableId;
  // The canonical snapshot carries no screenshot; it only exists in form data.
  if (typeof match.screenshot === "string" && match.screenshot) {
    carried.screenshot = match.screenshot;
  }
  return carried;
};

export const applySocialMediaCanonicalAccountReset = (
  formsList: ModifyFormStep[],
  canonicalAccounts: readonly CanonicalSocialMediaAccount[] | null | undefined,
): ModifyFormStep[] => {
  const validCanonicalAccounts = filterValidCanonicalAccounts(canonicalAccounts);
  // Bail unless the snapshot positively describes the accounts. An empty or
  // absent list is indistinguishable from "this service does not track
  // accounts centrally" - several forms that carry a socialMediaAccounts field
  // are not backed by a certificate snapshot at all (press card, for one), and
  // rebuilding from nothing there would erase what the applicant entered.
  // Showing a stale list is recoverable; wiping the field is not.
  if (validCanonicalAccounts.length === 0) return formsList;

  return formsList.map((step) => {
    if (!step.formData) return step;
    try {
      const parsed = JSON.parse(step.formData);
      if (!isRecord(parsed)) return step;
      if (!isRecord(parsed.formValues)) return step;
      if (!Array.isArray(parsed.formValues.socialMediaAccounts)) return step;

      const previousItems =
        parsed.formValues.socialMediaAccounts.filter(isRecord);
      const rebuiltAccounts = validCanonicalAccounts.map((canonical) => ({
        ...canonicalAccountToFormItem(canonical),
        ...carryOverFormOnlyFields(canonical, previousItems),
      }));

      return {
        ...step,
        formData: JSON.stringify({
          ...parsed,
          formValues: {
            ...parsed.formValues,
            socialMediaAccounts: rebuiltAccounts,
          },
        }),
      };
    } catch {
      return step;
    }
  });
};

const applyContextToSchemaNode = (
  node: unknown,
  formValues: Record<string, unknown>,
  fixedMediaCategory?: string,
  propertyKey = "",
): { node: unknown; changed: boolean } => {
  if (!isRecord(node)) return { node, changed: false };

  let changed = false;
  let nextNode: Record<string, unknown> = node;

  if (node["x-component"] === "SocialMediaAccount" && propertyKey) {
    const originalItems = formValues[propertyKey];
    nextNode = {
      ...node,
      "x-component-props": {
        ...(isRecord(node["x-component-props"])
          ? node["x-component-props"]
          : {}),
        modifyMode: true,
        originalItems: Array.isArray(originalItems) ? originalItems : [],
        ...(fixedMediaCategory ? { fixedMediaCategory } : {}),
      },
    };
    changed = true;
  }

  if (isRecord(node.properties)) {
    const nextProperties = Object.fromEntries(
      Object.entries(node.properties).map(([key, child]) => {
        const result = applyContextToSchemaNode(
          child,
          formValues,
          fixedMediaCategory,
          key,
        );
        changed = changed || result.changed;
        return [key, result.node];
      }),
    );
    if (changed) {
      nextNode = { ...nextNode, properties: nextProperties };
    }
  }

  return { node: nextNode, changed };
};

export const applySocialMediaModifySchemaContext = (
  formsList: ModifyFormStep[],
  options: { fixedMediaCategory?: string } = {},
): ModifyFormStep[] =>
  formsList.map((step) => {
    if (!step.formData) return step;
    try {
      const parsed = JSON.parse(step.formData);
      if (!isRecord(parsed) || !isRecord(parsed.schema)) return step;
      const formValues = isRecord(parsed.formValues) ? parsed.formValues : {};
      const originalFormValues = isRecord(parsed.modifyOriginalFormValues)
        ? parsed.modifyOriginalFormValues
        : formValues;
      const result = applyContextToSchemaNode(
        parsed.schema,
        originalFormValues,
        options.fixedMediaCategory,
      );
      if (!result.changed) return step;
      return {
        ...step,
        formData: JSON.stringify({ ...parsed, schema: result.node }),
      };
    } catch {
      return step;
    }
  });
