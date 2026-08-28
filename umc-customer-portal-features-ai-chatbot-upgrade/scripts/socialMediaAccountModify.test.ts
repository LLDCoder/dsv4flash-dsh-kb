import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addSocialMediaAccount,
  deleteSocialMediaAccount,
  getSocialMediaAccountContainerAttributes,
  resolveSocialMediaAccountModifyContext,
  resolveSocialMediaAccountOperation,
  restoreSocialMediaAccount,
  updateSocialMediaAccount,
  type SocialMediaAccountItem,
} from "@/components/designable/src/components/SocialMediaAccount/socialMediaAccountModify";

const original: SocialMediaAccountItem = {
  id: "account-101",
  accountName: "Original account",
  accountUrl: "https://example.com/original",
  mediaCategory: "2",
  mediaSubCategories: ["10", "11"],
  accountType: "1",
  accountTitle: "Original account",
  screenshot: "proof/original.pdf",
};

const added: SocialMediaAccountItem = {
  id: "draft-account",
  accountName: "New account",
  accountUrl: "https://example.com/new",
  mediaCategory: "2",
  mediaSubCategories: ["12"],
  accountType: "2",
  accountTitle: "New account",
};

export const runSocialMediaAccountModifyTests = () => {
  assert.deepEqual(
    resolveSocialMediaAccountModifyContext({
      serviceCode: 80011,
      configuredModifyMode: false,
      configuredOriginalItems: [],
      initialItems: [original],
    }),
    { modifyMode: true, originalItems: [original] },
    "80011 must retain Modify context when an async schema update has not refreshed mounted component props",
  );
  assert.deepEqual(
    resolveSocialMediaAccountModifyContext({
      serviceCode: 80022,
      configuredModifyMode: false,
      configuredOriginalItems: [],
      initialItems: [original],
    }),
    { modifyMode: true, originalItems: [original] },
    "80022 Renew must track social media account changes against the loaded original accounts",
  );
  assert.deepEqual(
    resolveSocialMediaAccountModifyContext({
      serviceCode: 8007,
      configuredModifyMode: false,
      configuredOriginalItems: [],
      initialItems: [original],
    }),
    { modifyMode: false, originalItems: [] },
    "ordinary services must not infer Modify mode from existing initial values",
  );
  assert.deepEqual(
    resolveSocialMediaAccountModifyContext({
      serviceCode: 80011,
      configuredModifyMode: false,
      configuredOriginalItems: [],
      initialItems: [{ ...original, operation: "MODIFY" }],
    }),
    { modifyMode: true, originalItems: [] },
    "tracked draft values must not be reused as the immutable original baseline",
  );

  assert.deepEqual(
    deleteSocialMediaAccount([original], original.id, [original], false),
    [],
    "ordinary forms must keep the existing array removal behavior",
  );

  const addedInModify = addSocialMediaAccount([], added, true);
  assert.equal(addedInModify[0].operation, "ADD");
  assert.deepEqual(
    deleteSocialMediaAccount(addedInModify, added.id, [original], true),
    [],
    "deleting an item created during Modify must remove it completely",
  );

  const modified = updateSocialMediaAccount(
    [original],
    original.id,
    { accountTitle: "Updated account", accountName: "Updated account" },
    [original],
    true,
  );
  assert.equal(modified[0].operation, "MODIFY");
  assert.equal(
    resolveSocialMediaAccountOperation(modified[0], [original], true),
    "MODIFY",
  );

  const reverted = updateSocialMediaAccount(
    modified,
    original.id,
    { accountTitle: original.accountTitle, accountName: original.accountName },
    [original],
    true,
  );
  assert.equal(reverted[0].operation, undefined);

  const deletedExisting = deleteSocialMediaAccount(
    modified,
    original.id,
    [original],
    true,
  );
  assert.deepEqual(deletedExisting, [{ ...original, operation: "DELETE" }]);
  assert.equal(
    resolveSocialMediaAccountOperation(deletedExisting[0], [original], true),
    "DELETE",
  );
  assert.deepEqual(
    restoreSocialMediaAccount(deletedExisting, original.id, [original], true),
    [original],
    "restoring a deleted existing item must recover the original snapshot",
  );

  assert.equal(
    resolveSocialMediaAccountOperation(
      { ...added, operation: undefined },
      [original],
      true,
    ),
    "ADD",
  );
  assert.equal(
    resolveSocialMediaAccountOperation(original, [original], true),
    undefined,
  );

  const unchangedOriginal: SocialMediaAccountItem = {
    ...original,
    id: "account-102",
    accountId: 102,
    accountName: "Unchanged account",
    accountTitle: "Unchanged account",
  };
  const renewContext = resolveSocialMediaAccountModifyContext({
    serviceCode: 80022,
    initialItems: [original, unchangedOriginal],
  });
  const renewedAccounts = deleteSocialMediaAccount(
    [original, unchangedOriginal],
    original.id,
    renewContext.originalItems,
    renewContext.modifyMode,
  );
  assert.equal(
    resolveSocialMediaAccountOperation(
      renewedAccounts[0],
      renewContext.originalItems,
      renewContext.modifyMode,
    ),
    "DELETE",
  );
  assert.equal(
    resolveSocialMediaAccountOperation(
      renewedAccounts[1],
      renewContext.originalItems,
      renewContext.modifyMode,
    ),
    undefined,
    "deleting one 80022 account must not mark an untouched account as New",
  );

  const reloadedOriginalAccounts: SocialMediaAccountItem[] = [
    { ...original, id: "baseline-101", accountId: 101 },
    { ...unchangedOriginal, id: "baseline-102" },
  ];
  const reloadedUnchangedAccount: SocialMediaAccountItem = {
    ...unchangedOriginal,
    id: "reloaded-102",
  };
  assert.equal(
    resolveSocialMediaAccountOperation(
      reloadedUnchangedAccount,
      reloadedOriginalAccounts,
      true,
    ),
    undefined,
    "a reloaded original account must remain unchanged when its temporary form id changes",
  );
  assert.equal(
    resolveSocialMediaAccountOperation(
      { ...original, accountUrl: "https://example.com/changed" },
      [original],
      true,
    ),
    "MODIFY",
  );

  const style = { color: "red" };
  const containerAttributes = getSocialMediaAccountContainerAttributes({
    id: "social-accounts",
    className: "schema-class",
    style,
    "data-testid": "social-accounts",
    "aria-label": "Social accounts",
    labelName: "Social Media Account",
    titleEn: "Social Media Account",
    titleAr: "حساب وسائل التواصل الاجتماعي",
    addButtonLabel: "Add",
    addButtonLabelEn: "Add",
    addButtonLabelAr: "إضافة",
    modifyMode: true,
    originalItems: [original],
    fixedMediaCategory: "2",
  });

  assert.deepEqual(containerAttributes, {
    id: "social-accounts",
    className: "social-media-account-container schema-class",
    style,
    "data-testid": "social-accounts",
    "aria-label": "Social accounts",
  });
  assert.equal("labelName" in containerAttributes, false);
  assert.equal("titleEn" in containerAttributes, false);
  assert.equal("addButtonLabelEn" in containerAttributes, false);
  assert.equal("fixedMediaCategory" in containerAttributes, false);

  const componentSource = readFileSync(
    "src/components/designable/src/components/SocialMediaAccount/SocialMediaAccountField.tsx",
    "utf8",
  );
  assert.match(
    componentSource,
    /\{statusLabel && \(\s*<Tag/,
    "Modify operation status tags must be visible in edit and review modes",
  );
  assert.match(
    componentSource,
    /<OverflowTooltip\s+className="social-media-account-name"\s+title=\{displayName\}/,
    "Social account titles must only show a tooltip when the shared wrapper detects overflow",
  );
  assert.match(
    componentSource,
    /isDeleted \? \([\s\S]*?handleRestore\(item\.id\)[\s\S]*?handleView\(item\)/,
    "Deleted cards must provide both Restore and Details actions",
  );

  const modalSource = readFileSync(
    "src/components/designable/src/components/SocialMediaAccount/AddSocialMediaModal.tsx",
    "utf8",
  );
  assert.match(
    modalSource,
    /LIMITED_MEDIA_CATEGORY_SERVICE_CODES = new Set\(\[[\s\S]*?"80011"[\s\S]*?\]\)/,
    "80011 must default to and lock the Advertisement media category",
  );
  assert.doesNotMatch(
    modalSource,
    /destroyOnClose/,
    "closing the modal must not immediately unmount Ant Design 4 Select internals",
  );
  assert.doesNotMatch(
    modalSource,
    /key=\{`media-sub-categories-/,
    "loading sub-category options must not remount the Ant Design 4 Select",
  );

  const stylesSource = readFileSync(
    "src/components/designable/src/components/SocialMediaAccount/styles.less",
    "utf8",
  );
  assert.match(
    stylesSource,
    /\.social-media-account-status--modify\s*\{\s*color:\s*#f29f0e;\s*background:\s*#fffbeb;/,
    "Modified status must use the Figma warning foreground and background colors",
  );
  assert.match(
    stylesSource,
    /\.social-media-account-status--add\s*\{\s*color:\s*#286cff;\s*background:\s*#e7f5ff;/,
    "New status must use the Figma blue foreground and background colors",
  );
  assert.match(
    stylesSource,
    /\.social-media-account-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\([\s\S]*?auto-fill,[\s\S]*?minmax\(min\(100%, 352px\), 352px\)[\s\S]*?\)[\s\S]*?max-width:\s*1088px/,
    "account cards must keep the Figma 352px maximum, cap desktop rows at three cards, and shrink in narrow containers",
  );
  assert.match(
    stylesSource,
    /\.social-media-account-card\s*\{[\s\S]*?height:\s*100%;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/,
    "cards in the same grid row must stretch to a shared height",
  );
  assert.match(
    stylesSource,
    /\.social-media-account-actions\s*\{[\s\S]*?margin-top:\s*auto;/,
    "card actions must align to the bottom when category content has different heights",
  );
  assert.match(
    stylesSource,
    /\.social-media-account-required\s*\{\s*margin-inline-start:\s*4px/,
    "required marker spacing must follow the document direction",
  );
};
