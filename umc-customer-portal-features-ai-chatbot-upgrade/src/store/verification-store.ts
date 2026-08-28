import create from 'zustand'
import { persist } from 'zustand/middleware'

interface VerificationCountdownStore {
  resendDeadlines: Record<string, number>;
  startCountdown: (countdownKey: string, durationSec: number) => void;
  clearCountdown: (countdownKey: string) => void;
}

export const VERIFICATION_RESEND_SECONDS = 59;

const getDeadline = (durationSec: number) =>
  Date.now() + Math.max(durationSec, 0) * 1000;

export const getVerificationCountdownKey = (
  from: string | null | undefined,
  email: string | null | undefined,
) => `${from || 'default'}:${String(email || '').trim().toLowerCase()}`;

export const getVerificationCountdownRemaining = (
  resendDeadline: number | null,
) => {
  if (!resendDeadline) {
    return 0;
  }

  return Math.max(0, Math.ceil((resendDeadline - Date.now()) / 1000));
}

export const useVerificationCountdownStore = create<VerificationCountdownStore>(
  persist(
    (set) => ({
      resendDeadlines: {},
      startCountdown: (countdownKey: string, durationSec: number) =>
        set((state) => ({
          resendDeadlines: {
            ...state.resendDeadlines,
            [countdownKey]: getDeadline(durationSec),
          },
        })),
      clearCountdown: (countdownKey: string) =>
        set((state) => {
          const nextDeadlines = { ...state.resendDeadlines };
          delete nextDeadlines[countdownKey];
          return {
            resendDeadlines: nextDeadlines,
          };
        }),
    }),
    {
      name: 'verification-countdown-storage',
      getStorage: () => sessionStorage,
    },
  ),
)
