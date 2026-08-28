import { performAuthenticatedLogout } from "./authSession";
import {
  beginLoggedInElsewhereErrorSuppress,
  resetUnauthorizedErrorToastSuppress,
  shouldSuppressUnauthorizedErrorToast,
} from "./errorToastSuppress";
import { destroyAllFeedbackMessages } from "./feedbackMessages";

export {
  shouldSuppressUnauthorizedErrorToast,
} from "./errorToastSuppress";

export const UNAUTHORIZED_SESSION_MESSAGE_KEY = "NMA_SERVICES_AUTH_UNAUTHORIZED_SESSION_MESSAGE";

/** English substring returned by backend for dual-browser kick-off. */
export const LOGGED_IN_ELSEWHERE_HINT = "logged in elsewhere";

/** Arabic substring for the same scenario (see login.sessionLoggedInElsewhere). */
export const LOGGED_IN_ELSEWHERE_HINT_AR = "من جهاز أو متصفح آخر";

export function isLoggedInElsewhereMessage(message?: string | null): boolean {
  const raw = String(message ?? "").trim();
  if (!raw) {
    return false;
  }

  const normalized = raw.toLowerCase();
  return (
    normalized.includes(LOGGED_IN_ELSEWHERE_HINT) ||
    raw.includes(LOGGED_IN_ELSEWHERE_HINT_AR)
  );
}

export function isUnauthorizedSessionError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { isUnauthorizedSession?: boolean }).isUnauthorizedSession,
  );
}

export function resetUnauthorizedSessionHandling(): void {
  resetUnauthorizedErrorToastSuppress();

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(UNAUTHORIZED_SESSION_MESSAGE_KEY);
  }
}

export function consumeUnauthorizedSessionMessage(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  const storedMessage = sessionStorage.getItem(UNAUTHORIZED_SESSION_MESSAGE_KEY);
  if (storedMessage) {
    sessionStorage.removeItem(UNAUTHORIZED_SESSION_MESSAGE_KEY);
    return storedMessage;
  }

  return null;
}

/** Dual-browser kick-off: block other error toasts, persist one message, logout locally. */
export function handleUnauthorizedSession(displayMessage: string): void {
  if (shouldSuppressUnauthorizedErrorToast()) {
    return;
  }

  beginLoggedInElsewhereErrorSuppress();
  destroyAllFeedbackMessages();

  performAuthenticatedLogout({ loginNotice: displayMessage });
}
