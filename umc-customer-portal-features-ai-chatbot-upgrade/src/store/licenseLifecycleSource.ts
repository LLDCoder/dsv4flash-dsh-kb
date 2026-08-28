import create from "zustand";
import { persist } from "zustand/middleware";

export interface LicenseLifecycleSource {
  sourceServiceCode?: string | null;
  sourceMedialLicenseId?: number | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  licensePermitNo?: string | null;
  originDocumentId?: string | null;
  originDocumentType?: string | null;
  originAction?: string | null;
  serviceId?: number | null;
  serviceCode?: string | null;
}

interface LicenseLifecycleSourceState {
  licenseLifecycleSource: LicenseLifecycleSource | null;
  setLicenseLifecycleSource: (
    payload: LicenseLifecycleSource | null,
  ) => void;
  clearLicenseLifecycleSource: () => void;
}

const initialState = {
  licenseLifecycleSource: null,
};

const licenseLifecycleSourceKeys: Array<keyof LicenseLifecycleSource> = [
  "sourceServiceCode",
  "sourceMedialLicenseId",
  "sourceApplicationId",
  "sourceApplicationDetailId",
  "licensePermitNo",
  "originDocumentId",
  "originDocumentType",
  "originAction",
  "serviceId",
  "serviceCode",
];

const isSameLicenseLifecycleSource = (
  current: LicenseLifecycleSource | null,
  next: LicenseLifecycleSource | null,
) => {
  if (current === next) {
    return true;
  }

  if (!current || !next) {
    return current === next;
  }

  return licenseLifecycleSourceKeys.every(
    (key) => (current[key] ?? null) === (next[key] ?? null),
  );
};

export const useLicenseLifecycleSourceStore = create(
  persist<LicenseLifecycleSourceState>(
    (set) => ({
      ...initialState,
      setLicenseLifecycleSource: (payload) =>
        set((state) =>
          isSameLicenseLifecycleSource(state.licenseLifecycleSource, payload)
            ? state
            : {
                licenseLifecycleSource: payload,
              },
        ),
      clearLicenseLifecycleSource: () =>
        set((state) =>
          state.licenseLifecycleSource === null ? state : initialState,
        ),
    }),
    {
      name: "license-lifecycle-source",
      getStorage: () => localStorage,
    },
  ),
);
