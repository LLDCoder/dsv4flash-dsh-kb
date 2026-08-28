import create from "zustand";

interface MyRequestDetailStore {
  isFirstApprovalRejected: boolean | null;
  statusEn: string | null;
  setIsFirstApprovalRejected: (value: boolean | null) => void;
  setStatusEn: (value: string | null) => void;
  resetMyRequestDetail: () => void;
}

export const useMyRequestDetailStore = create<MyRequestDetailStore>((set) => ({
  isFirstApprovalRejected: null,
  statusEn: null,
  setIsFirstApprovalRejected: (value) =>
    set(() => ({
      isFirstApprovalRejected: value,
    })),
  setStatusEn: (value) =>
    set(() => ({
      statusEn: value,
    })),
  resetMyRequestDetail: () =>
    set(() => ({
      isFirstApprovalRejected: null,
      statusEn: null,
    })),
}));
