import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const moduleUrl = new URL(
  "../src/pages/MediaLicense/partnerManagementFormValues.ts",
  import.meta.url,
);
const source = readFileSync(moduleUrl, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleDataUrl = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
const { mergePartnerManagementContextFormValues } = await import(moduleDataUrl);

const historicalDeletedPartner = { id: "7", fullNameEnglish: "Historical" };
const currentDeletedPartner = { id: "8", fullNameEnglish: "Current" };
const canonicalPartner = { id: "9", fullNameEnglish: "Canonical" };

test("new partner-management applications discard historical change markers", () => {
  const currentFormValues = {
    supportingDocument: "keep.pdf",
    pendingDeletePartnerList: [historicalDeletedPartner],
    removedPartnerList: [historicalDeletedPartner],
    PartnerList: [historicalDeletedPartner],
    partnerManagementInitialPartnerIds: ["7"],
  };

  const result = mergePartnerManagementContextFormValues({
    currentFormValues,
    hasDraft: false,
    editablePartners: [canonicalPartner],
    initialPartnerIds: ["9"],
  });

  assert.deepEqual(result, {
    supportingDocument: "keep.pdf",
    PartnerList: [canonicalPartner],
    partnerManagementInitialPartnerIds: ["9"],
  });
  assert.deepEqual(currentFormValues.pendingDeletePartnerList, [
    historicalDeletedPartner,
  ]);
  assert.deepEqual(currentFormValues.removedPartnerList, [
    historicalDeletedPartner,
  ]);
});

test("current partner-management drafts preserve their own change markers", () => {
  const result = mergePartnerManagementContextFormValues({
    currentFormValues: {
      pendingDeletePartnerList: [currentDeletedPartner],
      removedPartnerList: [currentDeletedPartner],
      PartnerList: [historicalDeletedPartner],
      partnerManagementInitialPartnerIds: ["7"],
    },
    hasDraft: true,
    editablePartners: [canonicalPartner],
    initialPartnerIds: ["9"],
  });

  assert.deepEqual(result, {
    pendingDeletePartnerList: [currentDeletedPartner],
    removedPartnerList: [currentDeletedPartner],
    PartnerList: [canonicalPartner],
    partnerManagementInitialPartnerIds: ["9"],
  });
});
