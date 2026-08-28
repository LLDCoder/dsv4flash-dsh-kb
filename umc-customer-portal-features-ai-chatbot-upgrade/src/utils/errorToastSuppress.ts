let isHandlingLoggedInElsewhere = false;
let isHandlingAccountSuspension = false;
let suppressErrorToasts = false;
let networkErrorToastActive = false;

export function shouldSuppressUnauthorizedErrorToast(): boolean {
  return (
    suppressErrorToasts ||
    isHandlingLoggedInElsewhere ||
    isHandlingAccountSuspension
  );
}

export function beginLoggedInElsewhereErrorSuppress(): void {
  isHandlingLoggedInElsewhere = true;
  suppressErrorToasts = true;
}

export function beginAccountSuspensionErrorSuppress(): void {
  isHandlingAccountSuspension = true;
  suppressErrorToasts = true;
}

export function resetUnauthorizedErrorToastSuppress(): void {
  isHandlingLoggedInElsewhere = false;
  isHandlingAccountSuspension = false;
  suppressErrorToasts = false;
}

export function shouldSuppressNetworkErrorToast(): boolean {
  return networkErrorToastActive;
}

export function beginNetworkErrorToastSuppress(): void {
  networkErrorToastActive = true;
}

export function endNetworkErrorToastSuppress(): void {
  networkErrorToastActive = false;
}
