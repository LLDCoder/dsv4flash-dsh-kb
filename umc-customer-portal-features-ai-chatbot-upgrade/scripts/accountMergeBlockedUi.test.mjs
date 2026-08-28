import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [mergeModal, loginCallback, loginEntry, handoff, userService] =
  await Promise.all([
    readSource("src/pages/Home/components/AccountMergeConfirmModal/index.tsx"),
    readSource("src/pages/Login/hooks/useUaePassLoginCallback.ts"),
    readSource("src/pages/Login/LoginEntry.tsx"),
    readSource("src/utils/uaePassLoginFlow.ts"),
    readSource("src/services/user.ts"),
  ]);

test("VerifyTarget sends only normalized email and encrypted password", () => {
  assert.match(userService, /interface VerifyAccountMergeTargetPayload \{\s*email: string;\s*password: string;/);
  assert.doesNotMatch(userService, /loginProvider: string|providerKey: string|loginType: number/);
  assert.match(mergeModal, /const normalizedEmail = [\s\S]*\.toLowerCase\(\)/);
  assert.match(mergeModal, /const encryptedPassword = aesEncrypt/);
  assert.match(mergeModal, /postVerifyAccountMergeTarget\(\{\s*email: normalizedEmail,\s*password: encryptedPassword,/);
  assert.doesNotMatch(mergeModal, /console\.(?:log|error)\([^\n]*(?:encryptedPassword|providerKey|fieldsValue|normalizedEmail)/);
});

test("account-linking logs never emit errors, payloads, credentials or tokens", () => {
  const verifyCatch = mergeModal.match(
    /catch \(error: unknown\) \{\s*const errorStatus = getAccountMergeErrorStatus\(error\);[\s\S]*?setNmaLinkError\(t\('login\.emailOrPasswordIncorrect'\)\);\s*\}/,
  )?.[0];
  assert.ok(verifyCatch);
  assert.match(verifyCatch, /getAccountMergeErrorStatus\(error\)/);
  assert.doesNotMatch(verifyCatch, /console\.(?:log|error|warn|info)\([^)]*error/);
  assert.doesNotMatch(verifyCatch, /console\.(?:log|error|warn|info)\([^)]*(?:payload|email|password|token|config|fieldsValue|encryptedPassword)/i);

  const callbackCatch = loginCallback.match(
    /catch \(error\) \{\s*if \(!isCurrentCallbackRun\(\)\) \{\s*return;\s*\}[\s\S]*?history\.replace\(appendPersistentQueryToUrl\('\/login'\)\);\s*\}/,
  )?.[0];
  assert.ok(callbackCatch);
  assert.match(callbackCatch, /console\.error\('UAE PASS login callback failed\.'\)/);
  assert.doesNotMatch(callbackCatch, /console\.(?:log|error|warn|info)\([^)]*(?:error|config|code|state|token|response|payload|email|password)/i);
  assert.match(callbackCatch, /clearUaePassAccountMergeHandoff\(\)/);
  assert.match(callbackCatch, /clearUaePassLoginFlow\(\)/);
  assert.match(callbackCatch, /CustomMessage\.error\(/);

  for (const source of [mergeModal, loginCallback]) {
    const accountLinkLogs = source.match(
      /console\.(?:log|error|warn|info)\([^;]*(?:merge|linking eligibility|UAE PASS linking|account merge target|login callback)[^;]*\);/gi,
    ) ?? [];
    for (const log of accountLinkLogs) {
      assert.doesNotMatch(log, /,\s*error\b|\bpayload\b|\bemail\b|\bpassword\b|\btoken\b|\bconfig\b|\bcode\b|\bstate\b|\bresponse\b|fieldsValue|encryptedPassword/i);
    }
  }
});

test("account-linking endpoints use direct response bodies", () => {
  assert.match(userService, /request\.get<unknown, CanMergeResponse>[\s\S]*"\/api\/User\/CanMerge"/);
  assert.match(userService, /request\.post<unknown, VerifyAccountMergeTargetResponse>/);
  assert.match(userService, /request\.post<unknown, MergeAccountResponse>/);
  assert.doesNotMatch(mergeModal, /verifyRes\.data|mergeRes\.data/);
  assert.match(mergeModal, /verifyRes\.status/);
  assert.match(mergeModal, /mergeRes\.token/);
});

test("UAE PASS login user info sends the access token in a POST body", () => {
  assert.match(
    userService,
    /postUaepassUserInfoToLogin[\s\S]*request\.post<unknown, UaepassUserInfoToLoginResponse<TUser>>[\s\S]*"\/api\/UAEPASS\/GetUserInfoToLogin"[\s\S]*accessToken,[\s\S]*loginType,/,
  );
  assert.doesNotMatch(
    userService,
    /GetUserInfoToLogin\?accessToken|encodeURIComponent\(\s*accessToken/,
  );
  assert.match(loginCallback, /postUaepassUserInfoToLogin<IUser>/);
});

test("successful UAE PASS login redirects without a success toast", () => {
  const directLoginSuccess = loginCallback.match(
    /if \(mergeEligibility\.mode === 'none'\) \{[\s\S]*?history\.replace\(redirectPath\);\s*return;\s*\}/,
  )?.[0];

  assert.ok(directLoginSuccess);
  assert.doesNotMatch(
    directLoginSuccess,
    /CustomMessage\.success|notification\.success/,
  );
  assert.match(loginCallback, /CustomMessage\.error\(failureMessage, 4\.5\)/);
});

test("successful merge installs the direct-body token", () => {
  assert.match(mergeModal, /const token = String\(mergeRes\.token/);
  assert.match(mergeModal, /authStorage\.setTokenInfo\(\{\s*token,/);
  assert.match(mergeModal, /const mergedUser = currentUserResponse\?\.data/);
  assert.match(mergeModal, /setData\(\{\s*\.\.\.mergedUser,\s*token,/);
  assert.match(mergeModal, /setLinkSummary\(mergeRes\)/);
});

test("forced flow uses the CanMerge target without credential verification", () => {
  assert.match(mergeModal, /forcedTargetUserId/);
  assert.match(mergeModal, /mode === 'forced'/);
  assert.match(mergeModal, /performMergeAccount\(forcedTargetUserId\)/);
  assert.match(mergeModal, /targetStatus !== 'TARGET_ELIGIBLE'/);
  assert.match(mergeModal, /verifyRes\.canLink !== true/);
  assert.match(mergeModal, /const performMergeAccount = async \(targetUserId: string\) =>/);
  assert.match(mergeModal, /targetUserId,/);
  assert.match(mergeModal, /await performMergeAccount\(targetUserId\)/);
  assert.doesNotMatch(mergeModal, /openCredentials\(matchedAccountEmail\)/);
  assert.match(loginEntry, /forcedTargetUserId=\{accountMerge\.targetUserId\}/);
});

test("uses dedicated endpoints and never ordinary Login", () => {
  assert.match(userService, /"\/api\/User\/VerifyAccountMergeTarget"/);
  assert.match(userService, /"\/api\/User\/CanMerge"/);
  assert.match(userService, /"\/api\/User\/MergeAccount"/);
  assert.match(userService, /"\/api\/User\/DeclineMerge"/);
  assert.doesNotMatch(mergeModal, /\/api\/User\/Login|request\.post/);
});

test("target failures stay in the linking flow without a failure modal", () => {
  assert.doesNotMatch(mergeModal, /AccountLinkFailureModal/);
  assert.match(mergeModal, /TARGET_IDENTITY_MISMATCH/);
  assert.match(mergeModal, /TARGET_HAS_BUSINESS_DATA/);
  assert.match(mergeModal, /TARGET_ALREADY_LINKED/);
  assert.match(mergeModal, /TARGET_ALREADY_MERGED/);
  assert.match(mergeModal, /TARGET_NOT_ELIGIBLE/);
  assert.match(mergeModal, /setNmaLinkError\(getTargetErrorMessage\(errorStatus\)\)/);
  assert.doesNotMatch(mergeModal, /TARGET_EID_MISMATCH|TARGET_HAS_DATA_ASSETS|TARGET_LINKED_ELSEWHERE/);
});

test("closing forced linking cancels the UAE PASS login session", () => {
  assert.doesNotMatch(mergeModal, /mode === 'blocked'|status=\{accountMerge\.status\}/);
  assert.match(mergeModal, /onClose=\{onLogout\}/);
  assert.match(loginEntry, /onLogout=\{logoutAccountMergeFlow\}/);
  assert.match(loginCallback, /const logoutAccountMergeFlow/);
  assert.match(loginCallback, /performAuthenticatedLogout\(/);
});

test("optional No records the decline before continuing", () => {
  assert.match(userService, /"\/api\/User\/DeclineMerge"/);
  assert.match(mergeModal, /const handleNoClick = async \(\) =>/);
  assert.match(mergeModal, /await postDeclineMerge\(\{ skipErrorToast: true \}\)/);
  assert.match(mergeModal, /loading=\{declineSubmitting\}/);
  assert.match(mergeModal, /disabled=\{declineSubmitting\}/);
});

test("handoff stores only active optional and forced modes", () => {
  assert.match(handoff, /mode: 'optional' \| 'forced'/);
  assert.doesNotMatch(handoff, /mode: 'blocked'|ACCOUNT_MERGE_STATUSES|status: string/);
});

test("CanMerge response keeps the backend compatibility fields", () => {
  for (const field of [
    "status",
    "canLink",
    "sourceEligible",
    "canMerge",
    "forceMerge",
    "targetUserId",
    "targetEmail",
    "targetCanMerge",
  ]) {
    assert.match(userService, new RegExp(`${field}\\?:`));
  }
});
