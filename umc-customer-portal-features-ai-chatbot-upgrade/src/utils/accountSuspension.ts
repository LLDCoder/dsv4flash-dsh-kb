import { beginAccountSuspensionErrorSuppress } from "./errorToastSuppress";
import { destroyAllFeedbackMessages } from "./feedbackMessages";

export const ACCOUNT_SUSPENSION_EVENT =
  "NMA_SERVICES_AUTH_ACCOUNT_SUSPENDED";

let isHandlingAccountSuspension = false;

export function isAccountSuspensionActive(): boolean {
  return isHandlingAccountSuspension;
}

export function resetAccountSuspensionHandling(): void {
  isHandlingAccountSuspension = false;
}

export function handleAccountSuspension(): void {
  if (isHandlingAccountSuspension) {
    return;
  }

  isHandlingAccountSuspension = true;
  beginAccountSuspensionErrorSuppress();
  destroyAllFeedbackMessages();
  window.dispatchEvent(new Event(ACCOUNT_SUSPENSION_EVENT));
}
