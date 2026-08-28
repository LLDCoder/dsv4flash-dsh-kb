import create from "zustand";

export interface ProfileSwitchTarget {
  profileId: string;
  userTypeId: string;
}

export type ProfileSwitchGuard = (
  target: ProfileSwitchTarget,
) => boolean | Promise<boolean>;

interface ProfileSwitchGuardStore {
  guard: ProfileSwitchGuard | null;
  setGuard: (guard: ProfileSwitchGuard | null) => void;
  confirmSwitch: (target: ProfileSwitchTarget) => Promise<boolean>;
}

export const useProfileSwitchGuardStore = create<ProfileSwitchGuardStore>(
  (set, get) => ({
    guard: null,
    setGuard: (guard) => set({ guard }),
    confirmSwitch: async (target) => {
      const guard = get().guard;
      if (!guard) {
        return true;
      }

      return guard(target);
    },
  }),
);
