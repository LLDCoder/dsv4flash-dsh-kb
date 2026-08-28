import create from 'zustand'
import { persist } from 'zustand/middleware'
import type { TwoFactorLockType } from '@/services/twoFactorAuth'

const DEFAULT_LOGIN_TWO_FACTOR_SESSION_MS = 10 * 60 * 1000

export interface LoginResponseData {
  token: string;
  twoFactorEnabled?: boolean;
  tokenExpireMinutes: number;
  [key: string]: unknown;
}

export interface PendingLoginContext {
  email: string;
  token: string;
  loginResponse: LoginResponseData;
}

export interface PersistedLoginOtpLockState {
  lockType?: TwoFactorLockType;
  lockUntil: number | null;
}

interface LoginTwoFactorStore {
  pendingLoginContext: PendingLoginContext | null;
  sessionExpireAt: number | null;
  lockState: PersistedLoginOtpLockState | null;
  startSession: (context: PendingLoginContext) => void;
  clearSession: () => void;
  setLockState: (lockState: PersistedLoginOtpLockState | null) => void;
}

const getSessionExpireAt = (tokenExpireMinutes: number) => {
  if (Number.isFinite(tokenExpireMinutes) && tokenExpireMinutes > 0) {
    return Date.now() + tokenExpireMinutes * 60 * 1000;
  }

  return Date.now() + DEFAULT_LOGIN_TWO_FACTOR_SESSION_MS;
}

export const useLoginTwoFactorStore = create<LoginTwoFactorStore>(
  persist(
    (set) => ({
      pendingLoginContext: null,
      sessionExpireAt: null,
      lockState: null,
      startSession: (context: PendingLoginContext) =>
        set({
          pendingLoginContext: context,
          sessionExpireAt: getSessionExpireAt(
            Number(context.loginResponse.tokenExpireMinutes),
          ),
          lockState: null,
        }),
      clearSession: () =>
        set({
          pendingLoginContext: null,
          sessionExpireAt: null,
          lockState: null,
        }),
      setLockState: (lockState: PersistedLoginOtpLockState | null) =>
        set({ lockState }),
    }),
    {
      name: 'login-two-factor-storage',
      getStorage: () => sessionStorage,
    },
  ),
)
