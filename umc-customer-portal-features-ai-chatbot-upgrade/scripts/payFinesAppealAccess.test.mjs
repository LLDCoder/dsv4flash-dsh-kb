import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(path, "utf8");

const readSection = (source, startMarker, endMarker) => {
  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker, startIndex);

  assert.notEqual(startIndex, -1, `Missing section start: ${startMarker}`);
  assert.notEqual(endIndex, -1, `Missing section end: ${endMarker}`);

  return source.slice(startIndex, endIndex);
};

test("public Pay Fine detail does not expose appeal submission", () => {
  const detailSource = readSource("src/pages/PayFinesDetail/index.tsx");
  const actionBarSource = readSection(
    detailSource,
    '<div className="pay-fines-d-btns">',
    "<PaymentMethodSelectionModal",
  );

  assert.equal(actionBarSource.match(/<button\b/g)?.length, 2);
  assert.match(actionBarSource, /pay-fines-d-btns-back/);
  assert.match(actionBarSource, /canPayFine/);
  assert.match(actionBarSource, /pay-fines-d-btns-pay-fine/);
  assert.doesNotMatch(actionBarSource, /appeal/i);
  assert.doesNotMatch(detailSource, /submitViolationFineAppeal/);
  assert.doesNotMatch(detailSource, /uploadViolationFineAppealAttachment/);
  assert.doesNotMatch(detailSource, /getViolationFineAppealReasons/);
  assert.doesNotMatch(detailSource, /AppealSubmissionSuccessModal/);
});

test("public Pay Fine service does not expose appeal mutation APIs", () => {
  const serviceSource = readSource("src/services/violationFine.ts");

  assert.doesNotMatch(serviceSource, /export const getViolationFineAppealReasons/);
  assert.doesNotMatch(
    serviceSource,
    /export const uploadViolationFineAppealAttachment/,
  );
  assert.doesNotMatch(serviceSource, /export const submitViolationFineAppeal/);
  assert.equal(serviceSource.includes("${PUBLIC_PAY_FINES_BASE}/appeal-reasons"), false);
  assert.equal(serviceSource.includes("submitViolationFineAppeal"), false);
});

test("authenticated violations flow keeps appeal submission", () => {
  const detailSource = readSource(
    "src/pages/ViolationsFinesViolationDetail/index.tsx",
  );
  const appealServiceSource = readSource("src/services/appeal.ts");

  assert.match(detailSource, /const appealAction = violation\.canAppeal/);
  assert.match(detailSource, /<SubmitAppealModal/);
  assert.match(appealServiceSource, /export function getAppealReasons\(\)/);
  assert.match(appealServiceSource, /export function createAppeal\(/);
});
