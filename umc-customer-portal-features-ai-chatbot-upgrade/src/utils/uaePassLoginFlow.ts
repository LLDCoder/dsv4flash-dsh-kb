const UAE_PASS_LOGIN_FLOW_KEY = 'uaePassLoginFlow';
const UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY = 'uaePassAccountMergeHandoff';
const FLOW_TTL_MS = 30 * 60 * 1000;
type StoredRedirectContext = {
  redirectPath: string;
  createdAt: number;
};

type StoredFlow = StoredRedirectContext & {
  state: string;
};

export type UaePassAccountMergeHandoff = StoredRedirectContext & {
  mode: 'optional' | 'forced';
  matchedAccountEmail: string;
  targetUserId: string;
};

export type UaePassAccountMergeHandoffReadResult = {
  handoff: UaePassAccountMergeHandoff | null;
  expired: boolean;
};

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage;
};

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

const isLocalRedirectPath = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

const readStoredValueWithStatus = <T extends { createdAt: number }>(
  storage: Storage | null,
  key: string,
  maxAgeMs = FLOW_TTL_MS,
): { value: T | null; expired: boolean } => {
  if (!storage) {
    return { value: null, expired: false };
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return { value: null, expired: false };
    }

    const value = JSON.parse(raw) as T;
    if (
      !value ||
      typeof value !== 'object' ||
      !Number.isFinite(value.createdAt)
    ) {
      storage.removeItem(key);
      return { value: null, expired: false };
    }
    if (Date.now() - value.createdAt > maxAgeMs) {
      storage.removeItem(key);
      return { value: null, expired: true };
    }

    return { value, expired: false };
  } catch {
    storage.removeItem(key);
    return { value: null, expired: false };
  }
};

const readStoredValue = <T extends { createdAt: number }>(
  storage: Storage | null,
  key: string,
  maxAgeMs = FLOW_TTL_MS,
): T | null => readStoredValueWithStatus<T>(storage, key, maxAgeMs).value;

export const startUaePassLoginFlow = (redirectPath: string, state: string) => {
  const storage = getSessionStorage();
  if (!storage || !state) {
    return null;
  }

  const flow: StoredFlow = {
    redirectPath: isLocalRedirectPath(redirectPath) ? redirectPath : '/',
    state,
    createdAt: Date.now(),
  };
  storage.setItem(UAE_PASS_LOGIN_FLOW_KEY, JSON.stringify(flow));
  getLocalStorage()?.removeItem(UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY);
  return flow;
};

export const registerUaePassRedirectRestore = (
  onRestore: () => void,
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = window,
) => {
  const handlePageShow = () => onRestore();

  target.addEventListener('pageshow', handlePageShow);
  return () => target.removeEventListener('pageshow', handlePageShow);
};

export const getUaePassLoginFlow = (): StoredFlow | null => {
  const flow = readStoredValue<StoredFlow>(
    getSessionStorage(),
    UAE_PASS_LOGIN_FLOW_KEY,
  );
  if (
    !flow ||
    !isLocalRedirectPath(flow.redirectPath) ||
    typeof flow.state !== 'string' ||
    !flow.state
  ) {
    clearUaePassLoginFlow();
    return null;
  }

  return flow;
};

export const clearUaePassLoginFlow = () => {
  getSessionStorage()?.removeItem(UAE_PASS_LOGIN_FLOW_KEY);
};

export const saveUaePassAccountMergeHandoff = (
  handoff: Omit<UaePassAccountMergeHandoff, 'createdAt'>,
) => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(
    UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY,
    JSON.stringify({ ...handoff, createdAt: Date.now() }),
  );
};

export const markUaePassAccountMergeHandoffInactive = () => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    const raw = storage.getItem(UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY);
    if (!raw) {
      return;
    }

    const handoff = JSON.parse(raw) as UaePassAccountMergeHandoff;
    if (!handoff || typeof handoff !== 'object') {
      storage.removeItem(UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY);
      return;
    }

    storage.setItem(
      UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY,
      JSON.stringify({ ...handoff, createdAt: Date.now() }),
    );
  } catch {
    storage.removeItem(UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY);
  }
};

export const readUaePassAccountMergeHandoff =
  (): UaePassAccountMergeHandoffReadResult => {
    const result = readStoredValueWithStatus<UaePassAccountMergeHandoff>(
      getLocalStorage(),
      UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY,
    );
    const handoff = result.value;

    if (!handoff) {
      return { handoff: null, expired: result.expired };
    }

    if (
      !['optional', 'forced'].includes(handoff.mode) ||
      !isLocalRedirectPath(handoff.redirectPath) ||
      typeof handoff.matchedAccountEmail !== 'string' ||
      typeof handoff.targetUserId !== 'string'
    ) {
      clearUaePassAccountMergeHandoff();
      return { handoff: null, expired: false };
    }

    return { handoff, expired: false };
  };

export const clearUaePassAccountMergeHandoff = () => {
  getLocalStorage()?.removeItem(UAE_PASS_ACCOUNT_MERGE_HANDOFF_KEY);
};
