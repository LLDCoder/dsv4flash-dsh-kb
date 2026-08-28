export const IGNORE_ICP_VERIFICATION_RESULT_ON_SUBMIT = true;

export function shouldContinueAfterIdentityVerification(
  verificationSucceeded: boolean,
  ignoreVerificationResult = IGNORE_ICP_VERIFICATION_RESULT_ON_SUBMIT,
): boolean {
  return ignoreVerificationResult || verificationSucceeded;
}

export function shouldReuseCompletedIdentityVerification(
  hasMatchingCompletedVerification: boolean,
  forceFreshRequest: boolean,
): boolean {
  return hasMatchingCompletedVerification && !forceFreshRequest;
}

export function canRunIdentityVerification(options: {
  isAddMode: boolean;
  isEditWithInitialData: boolean;
  detailAutoSyncFromLoadedForm: boolean;
  canRunEditManualVerification: boolean;
  isSubmitAttempt: boolean;
}): boolean {
  return (
    options.isSubmitAttempt ||
    options.isAddMode ||
    options.detailAutoSyncFromLoadedForm ||
    options.isEditWithInitialData ||
    options.canRunEditManualVerification
  );
}
