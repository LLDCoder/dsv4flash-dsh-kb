const PENDING_LOGIN_REDIRECT_KEY = "NMA_SERVICES_PENDING_LOGIN_REDIRECT";
const PENDING_LOGIN_REDIRECT_TTL_MS = 30 * 60 * 1000;

interface PendingLoginRedirect {
  returnUrl: string;
  createdAt: number;
}

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const isLocalReturnUrl = (value: unknown): value is string =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("\\");

/**
 * Paths allowed to survive an unauthenticated visit and be restored after
 * login. Scoped to the CP-012 / CP-013 email deep links (`/my-requests/...`).
 */
const DEEP_LINK_RETURN_PATH_PREFIXES = ["/my-requests"];

export const isDeepLinkReturnPath = (value: unknown): value is string => {
  if (!isLocalReturnUrl(value) || value.includes("://")) return false;

  const path = value.split(/[?#]/)[0] || "";
  return DEEP_LINK_RETURN_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
};

export const savePendingLoginRedirect = (
  returnUrl: string,
  storage: Storage | null = getSessionStorage(),
  now = Date.now(),
): void => {
  if (!storage || !isLocalReturnUrl(returnUrl)) return;

  try {
    const value: PendingLoginRedirect = { returnUrl, createdAt: now };
    storage.setItem(PENDING_LOGIN_REDIRECT_KEY, JSON.stringify(value));
  } catch {
    // Login restoration is best-effort; storage failure must not block logout.
  }
};

export const clearPendingLoginRedirect = (
  storage: Storage | null = getSessionStorage(),
): void => {
  try {
    storage?.removeItem(PENDING_LOGIN_REDIRECT_KEY);
  } catch {
    // Storage can be disabled by browser privacy settings.
  }
};

export const readPendingLoginRedirect = (
  storage: Storage | null = getSessionStorage(),
  now = Date.now(),
): string | null => {
  if (!storage) return null;

  try {
    const raw = storage.getItem(PENDING_LOGIN_REDIRECT_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<PendingLoginRedirect>;
    if (
      !isLocalReturnUrl(value.returnUrl) ||
      !Number.isFinite(value.createdAt) ||
      now - Number(value.createdAt) > PENDING_LOGIN_REDIRECT_TTL_MS
    ) {
      clearPendingLoginRedirect(storage);
      return null;
    }

    return value.returnUrl;
  } catch {
    clearPendingLoginRedirect(storage);
    return null;
  }
};
