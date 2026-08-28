import type { IDSelectorValue } from "@/components/designable/src/components/IDSelector/idSelectorUtils";
import { ModifyEnginePayloadError } from "./modifyEnginePayloadError";

export type Service803ModificationItem =
  | "ESTABLISHMENT_INFORMATION"
  | "CHIEF_EDITOR";

export interface Service803ChiefEditorFacts {
  submitted: true;
  fieldKeys: string[];
  identityDocumentType: "EMIRATES_ID" | "UID" | "PASSPORT";
  identityDocumentNumber: string;
  attachmentKeys: string[];
}

export interface Service803ModifyFacts {
  modificationItems: Service803ModificationItem[];
  establishmentFields: string[];
  chiefEditor?: Service803ChiefEditorFacts;
}

interface ChangeItem {
  component: string;
  ownerComponent?: string;
  fieldKey: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toNonEmptyString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

const unique = (values: string[]) => Array.from(new Set(values));

const collectChangeItems = (
  modifyChangeSets: unknown[] | undefined,
): ChangeItem[] =>
  (modifyChangeSets ?? []).flatMap((changeSet) => {
    if (!isRecord(changeSet) || !Array.isArray(changeSet.changes)) return [];
    return changeSet.changes.flatMap((change) => {
      if (!isRecord(change)) return [];
      const component = toNonEmptyString(change.component);
      const fieldKey = toNonEmptyString(change.fieldKey);
      if (!component || !fieldKey) return [];
      const ownerComponent = toNonEmptyString(change.ownerComponent);
      return [{ component, ownerComponent, fieldKey }];
    });
  });

const resolveIdentityDocument = (
  idSelector: IDSelectorValue | undefined,
): Pick<
  Service803ChiefEditorFacts,
  "identityDocumentType" | "identityDocumentNumber"
> => {
  const type = idSelector?.type;
  const identityByType = {
    emiratesId: {
      identityDocumentType: "EMIRATES_ID" as const,
      identityDocumentNumber: toNonEmptyString(idSelector?.emiratesId),
    },
    uid: {
      identityDocumentType: "UID" as const,
      identityDocumentNumber: toNonEmptyString(idSelector?.uid),
    },
    passport: {
      identityDocumentType: "PASSPORT" as const,
      identityDocumentNumber: toNonEmptyString(idSelector?.passportNumber),
    },
  };
  const identity = type ? identityByType[type] : undefined;

  if (!identity?.identityDocumentNumber) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 803 rule payload: the current IDSelector identity document is required for Chief Editor changes.",
    );
  }

  return {
    identityDocumentType: identity.identityDocumentType,
    identityDocumentNumber: identity.identityDocumentNumber,
  };
};

export const buildService803ModifyFacts = ({
  modifyChangeSets,
  idSelector,
}: {
  modifyChangeSets?: unknown[];
  idSelector?: IDSelectorValue;
}): Service803ModifyFacts => {
  const changeItems = collectChangeItems(modifyChangeSets);
  const establishmentChanges = changeItems.filter(
    (change) =>
      change.component === "ProfileForm" ||
      change.ownerComponent === "ProfileForm",
  );
  const chiefEditorChanges = changeItems.filter(
    (change) =>
      change.component !== "ProfileForm" &&
      change.ownerComponent !== "ProfileForm",
  );
  const establishmentFields = unique(
    establishmentChanges.map((change) => change.fieldKey),
  );
  const chiefEditorFieldKeys = unique(
    chiefEditorChanges.map((change) => change.fieldKey),
  );
  const modificationItems: Service803ModificationItem[] = [];

  if (establishmentFields.length > 0) {
    modificationItems.push("ESTABLISHMENT_INFORMATION");
  }
  if (chiefEditorFieldKeys.length > 0) {
    modificationItems.push("CHIEF_EDITOR");
  }

  return {
    modificationItems,
    establishmentFields,
    ...(chiefEditorFieldKeys.length > 0
      ? {
          chiefEditor: {
            submitted: true as const,
            fieldKeys: chiefEditorFieldKeys,
            ...resolveIdentityDocument(idSelector),
            attachmentKeys: unique(
              chiefEditorChanges
                .filter((change) => change.component === "Upload")
                .map((change) => change.fieldKey),
            ),
          },
        }
      : {}),
  };
};
