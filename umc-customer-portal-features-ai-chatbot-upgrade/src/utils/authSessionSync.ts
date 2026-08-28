export const AUTH_SESSION_SYNC_ACTION = {
  LOGIN: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN",
  LOGOUT: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGOUT",
  SWITCH_IDENTITY: "@@NMA_SERVICES_AUTH_SESSION_SYNC/SWITCH_IDENTITY",
} as const;

export type AuthSessionSyncAction =
  (typeof AUTH_SESSION_SYNC_ACTION)[keyof typeof AUTH_SESSION_SYNC_ACTION];

export const AUTH_SESSION_SYNC_STORAGE_KEY = "NMA_SERVICES_AUTH_SESSION_SYNC_EVENT";
const AUTH_SESSION_LOGIN_PENDING_KEY = "NMA_SERVICES_AUTH_SESSION_LOGIN_PENDING";
const AUTH_SESSION_LOGIN_PENDING_TTL_MS = 30 * 60 * 1000;

type AuthSessionSyncMessage = {
  eventId: string;
  action: AuthSessionSyncAction;
  occurredAt: number;
};

export function parseAuthSessionSyncMessage(
  value: string | null,
): AuthSessionSyncAction | null {
  if (!value) {
    return null;
  }

  try {
    const message = JSON.parse(value) as Partial<AuthSessionSyncMessage> | null;

    if (
      !message ||
      typeof message.eventId !== "string" ||
      !message.eventId.trim() ||
      (message.action !== AUTH_SESSION_SYNC_ACTION.LOGIN &&
        message.action !== AUTH_SESSION_SYNC_ACTION.LOGOUT &&
        message.action !== AUTH_SESSION_SYNC_ACTION.SWITCH_IDENTITY)
    ) {
      return null;
    }

    return message.action;
  } catch {
    return null;
  }
}

export function publishAuthSessionSync(action: AuthSessionSyncAction): void {
  const message: AuthSessionSyncMessage = {
    eventId: `${Date.now()}-${Math.random()}`,
    action,
    occurredAt: Date.now(),
  };

  try {
    window.localStorage.removeItem(AUTH_SESSION_LOGIN_PENDING_KEY);
    window.localStorage.setItem(
      AUTH_SESSION_SYNC_STORAGE_KEY,
      JSON.stringify(message),
    );
  } catch {
    // Cross-tab synchronization must not block the current tab's auth flow.
  }
}

export function markAuthSessionLoginPending(): boolean {
  try {
    window.localStorage.setItem(
      AUTH_SESSION_LOGIN_PENDING_KEY,
      JSON.stringify({ createdAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function isAuthSessionLoginPending(): boolean {
  try {
    const value = window.localStorage.getItem(AUTH_SESSION_LOGIN_PENDING_KEY);
    if (!value) {
      return false;
    }

    const pending = JSON.parse(value) as { createdAt?: unknown } | null;
    if (
      !pending ||
      typeof pending.createdAt !== "number" ||
      !Number.isFinite(pending.createdAt) ||
      Date.now() - pending.createdAt > AUTH_SESSION_LOGIN_PENDING_TTL_MS
    ) {
      clearAuthSessionLoginPending();
      return false;
    }

    return true;
  } catch {
    clearAuthSessionLoginPending();
    return false;
  }
}

export function clearAuthSessionLoginPending(): void {
  try {
    window.localStorage.removeItem(AUTH_SESSION_LOGIN_PENDING_KEY);
  } catch {
    // Cleanup is best-effort when browser storage is unavailable.
  }
}

export function subscribeAuthSessionSync(
  listener: (action: AuthSessionSyncAction) => void,
): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (
      event.storageArea !== window.localStorage ||
      event.key !== AUTH_SESSION_SYNC_STORAGE_KEY ||
      event.newValue !== window.localStorage.getItem(AUTH_SESSION_SYNC_STORAGE_KEY)
    ) {
      return;
    }

    const action = parseAuthSessionSyncMessage(event.newValue);
    if (action) {
      listener(action);
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
