import create from "zustand";

export interface MyRequestDetailTitle {
  applicationId: number;
  serviceNameEn?: string | null;
  serviceNameAr?: string | null;
  isResolved: boolean;
}

interface MyRequestDetailTitleStore {
  titlesByApplicationId: Record<number, MyRequestDetailTitle>;
  setDetailTitle: (
    title: Omit<MyRequestDetailTitle, "isResolved"> &
      Partial<Pick<MyRequestDetailTitle, "isResolved">>,
  ) => void;
  clearDetailTitle: (applicationId: number) => void;
}

export const useMyRequestDetailTitleStore = create<MyRequestDetailTitleStore>(
  (set) => ({
    titlesByApplicationId: {},
    setDetailTitle: (title) =>
      set((state) => ({
        titlesByApplicationId: {
          ...state.titlesByApplicationId,
          [title.applicationId]: {
            ...title,
            isResolved: title.isResolved ?? true,
          },
        },
      })),
    clearDetailTitle: (applicationId) =>
      set((state) => {
        const nextTitles = { ...state.titlesByApplicationId };
        delete nextTitles[applicationId];
        return {
          titlesByApplicationId: nextTitles,
        };
      }),
  }),
);
