import type { CSSProperties } from "react";

export type SocialMediaAccountOperation = "ADD" | "MODIFY" | "DELETE";

export type SocialMediaAccountItem = {
  id: string;
  accountId?: number | null;
  platformId?: number;
  mediaCategoryId?: number;
  subCategoryIds?: number[];
  accountName?: string;
  accountUrl?: string;
  mediaCategory?: string;
  mediaSubCategories?: string[];
  accountType?: string;
  accountTitle?: string;
  screenshot?: string;
  operation?: SocialMediaAccountOperation;
};

type EditableSocialMediaAccountValues = Omit<
  SocialMediaAccountItem,
  "id" | "operation"
>;

type SocialMediaAccountContainerAttributes = {
  id?: string;
  className: string;
  style?: CSSProperties;
  role?: string;
  tabIndex?: number;
  [key: `data-${string}`]: unknown;
  [key: `aria-${string}`]: unknown;
};

const SOCIAL_MEDIA_ACCOUNT_CHANGE_TRACKING_SERVICE_CODES = new Set([
  "80011",
  "80012",
  "80022",
]);

export const isSocialMediaAccountChangeTrackingService = (
  serviceCode?: number | string | null,
) =>
  SOCIAL_MEDIA_ACCOUNT_CHANGE_TRACKING_SERVICE_CODES.has(
    String(serviceCode ?? ""),
  );

export const resolveSocialMediaAccountModifyContext = ({
  serviceCode,
  configuredModifyMode,
  configuredOriginalItems,
  initialItems,
}: {
  serviceCode?: number | string;
  configuredModifyMode?: boolean;
  configuredOriginalItems?: SocialMediaAccountItem[];
  initialItems?: SocialMediaAccountItem[];
}) => {
  const isChangeTrackingService =
    isSocialMediaAccountChangeTrackingService(serviceCode);
  const modifyMode = configuredModifyMode === true || isChangeTrackingService;
  const hasTrackedDraftOperations = (initialItems ?? []).some((item) =>
    Boolean(item.operation),
  );
  const originalItems = Array.isArray(configuredOriginalItems) &&
    configuredOriginalItems.length > 0
      ? configuredOriginalItems
      : modifyMode && Array.isArray(initialItems) && !hasTrackedDraftOperations
        ? initialItems
        : [];

  return { modifyMode, originalItems };
};

const findOriginalItem = (
  originalItems: readonly SocialMediaAccountItem[],
  item: Pick<SocialMediaAccountItem, "id" | "accountId">,
) => {
  const accountId = Number.isSafeInteger(item.accountId) &&
    Number(item.accountId) > 0
      ? item.accountId
      : undefined;

  return accountId !== undefined
    ? originalItems.find((original) => original.accountId === accountId)
    : originalItems.find((original) => original.id === item.id);
};

const comparableItem = (item: SocialMediaAccountItem) => ({
  accountName: String(item.accountName ?? ""),
  accountUrl: String(item.accountUrl ?? ""),
  mediaCategory: String(item.mediaCategory ?? ""),
  mediaSubCategories: (item.mediaSubCategories ?? [])
    .map((value) => String(value))
    .sort(),
  accountType: String(item.accountType ?? ""),
  accountTitle: String(item.accountTitle ?? ""),
  screenshot: String(item.screenshot ?? ""),
});

const hasAccountChanged = (
  item: SocialMediaAccountItem,
  original: SocialMediaAccountItem,
) => JSON.stringify(comparableItem(item)) !== JSON.stringify(comparableItem(original));

const withoutOperation = (
  item: SocialMediaAccountItem,
): SocialMediaAccountItem => {
  const nextItem = { ...item };
  delete nextItem.operation;
  return nextItem;
};

export const resolveSocialMediaAccountOperation = (
  item: SocialMediaAccountItem,
  originalItems: readonly SocialMediaAccountItem[],
  modifyMode: boolean,
): SocialMediaAccountOperation | undefined => {
  if (!modifyMode) return undefined;
  if (item.operation) return item.operation;

  const original = findOriginalItem(originalItems, item);
  if (!original) return "ADD";
  return hasAccountChanged(item, original) ? "MODIFY" : undefined;
};

export const addSocialMediaAccount = (
  items: readonly SocialMediaAccountItem[],
  item: SocialMediaAccountItem,
  modifyMode: boolean,
): SocialMediaAccountItem[] => [
  ...items,
  modifyMode
    ? { ...withoutOperation(item), operation: "ADD" }
    : withoutOperation(item),
];

export const updateSocialMediaAccount = (
  items: readonly SocialMediaAccountItem[],
  id: string,
  values: Partial<EditableSocialMediaAccountValues>,
  originalItems: readonly SocialMediaAccountItem[],
  modifyMode: boolean,
): SocialMediaAccountItem[] =>
  items.map((item) => {
    if (item.id !== id) return item;

    const updatedItem = withoutOperation({ ...item, ...values });
    if (!modifyMode) return updatedItem;
    if (item.operation === "ADD") {
      return { ...updatedItem, operation: "ADD" };
    }

    const original = findOriginalItem(originalItems, updatedItem);
    if (!original) return { ...updatedItem, operation: "ADD" };
    return hasAccountChanged(updatedItem, original)
      ? { ...updatedItem, operation: "MODIFY" }
      : withoutOperation(updatedItem);
  });

export const deleteSocialMediaAccount = (
  items: readonly SocialMediaAccountItem[],
  id: string,
  originalItems: readonly SocialMediaAccountItem[],
  modifyMode: boolean,
): SocialMediaAccountItem[] => {
  if (!modifyMode) return items.filter((item) => item.id !== id);

  const currentItem = items.find((item) => item.id === id);
  const original = findOriginalItem(originalItems, currentItem ?? { id });
  if (!original) return items.filter((item) => item.id !== id);

  return items.map((item) =>
    item.id === id ? { ...withoutOperation(original), operation: "DELETE" } : item,
  );
};

export const restoreSocialMediaAccount = (
  items: readonly SocialMediaAccountItem[],
  id: string,
  originalItems: readonly SocialMediaAccountItem[],
  modifyMode: boolean,
): SocialMediaAccountItem[] => {
  if (!modifyMode) return [...items];

  const currentItem = items.find((item) => item.id === id);
  const original = findOriginalItem(originalItems, currentItem ?? { id });
  if (!original) return [...items];
  return items.map((item) =>
    item.id === id ? withoutOperation(original) : item,
  );
};

export const getSocialMediaAccountContainerAttributes = (
  props: Record<string, unknown>,
): SocialMediaAccountContainerAttributes => {
  const classNames = [
    "social-media-account-container",
    typeof props.className === "string" ? props.className.trim() : "",
  ].filter(Boolean);
  const attributes: SocialMediaAccountContainerAttributes = {
    className: Array.from(new Set(classNames)).join(" "),
  };

  if (typeof props.id === "string") attributes.id = props.id;
  if (typeof props.role === "string") attributes.role = props.role;
  if (typeof props.tabIndex === "number") attributes.tabIndex = props.tabIndex;
  if (props.style && typeof props.style === "object") {
    attributes.style = props.style as CSSProperties;
  }

  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith("data-") || key.startsWith("aria-")) {
      (attributes as Record<string, unknown>)[key] = value;
    }
  });

  return attributes;
};
