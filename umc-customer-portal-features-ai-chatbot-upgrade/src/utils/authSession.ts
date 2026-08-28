import { requestUaePassLogout } from "@/services/uaePassLogout";
import authStorage, { AUTH_USER_STORAGE_KEY } from "@/storage/authStorage";
import {
  hardRedirectToLogin,
  type HardRedirectToLoginOptions,
} from "@/utils/history";
import {
  clearLogoutNotice,
  consumeLogoutNotice as consumeStoredLogoutNotice,
  storeLogoutNotice,
} from "@/utils/logoutNotice";
import {
  AUTH_SESSION_SYNC_ACTION,
  publishAuthSessionSync,
} from "@/utils/authSessionSync";
import { clearIdentityScopedBusinessContext } from "@/utils/identitySwitch";

let logoutStarted = false;
let sessionSequence = 0;

interface PerformLocalLogoutOptions {
  clearUserStorage?: boolean;
  onLocalLogout?: () => void;
  syncOtherTabs?: boolean;
}

interface PerformAuthenticatedLogoutOptions extends PerformLocalLogoutOptions {
  loginNotice?: string;
  redirectOptions?: HardRedirectToLoginOptions;
}

export function consumeLogoutNotice(): string | null {
  return consumeStoredLogoutNotice(sessionStorage, logoutStarted);
}

export function resetAuthenticatedLogoutState(): void {
  sessionSequence += 1;
  logoutStarted = false;
  clearLogoutNotice(sessionStorage);
}

export function performLocalLogout(
  options: PerformLocalLogoutOptions = {},
): void {
  authStorage.clearAuth();
  options.onLocalLogout?.();
  // Identity-scoped business context is persisted to localStorage, so it
  // outlives the session unless it is cleared here. Leaving it behind lets the
  // next account inherit a lifecycle source / update-form draft that belongs to
  // the previous user.
  clearIdentityScopedBusinessContext();
  if (options.clearUserStorage) {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }

  if (options.syncOtherTabs !== false) {
    publishAuthSessionSync(AUTH_SESSION_SYNC_ACTION.LOGOUT);
  }
}

export function performAuthenticatedLogout(
  options: PerformAuthenticatedLogoutOptions = {},
): void {
  if (logoutStarted) {
    return;
  }
  logoutStarted = true;
  const logoutSequence = ++sessionSequence;

  const token = authStorage.getToken();
  const shouldLogoutFromUaePass = authStorage.isUaePassSession();

  if (options.loginNotice) {
    storeLogoutNotice(sessionStorage, options.loginNotice);
  }

  performLocalLogout(options);
  if (!shouldLogoutFromUaePass || !token) {
    logoutStarted = false;
    hardRedirectToLogin(options.redirectOptions);
    return;
  }

  void requestUaePassLogout(token).then((logoutUrl) => {
    if (logoutSequence !== sessionSequence) {
      return;
    }
    logoutStarted = false;
    const currentToken = authStorage.getToken();
    if (currentToken) {
      clearLogoutNotice(sessionStorage);
      authStorage.clearAuth();
    }
    if (logoutUrl) {
      window.location.assign(logoutUrl);
      return;
    }
    hardRedirectToLogin(options.redirectOptions);
  });
}
