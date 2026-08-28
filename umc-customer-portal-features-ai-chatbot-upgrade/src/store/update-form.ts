import create from "zustand";
import { persist } from "zustand/middleware";

export interface UpdateFormState {
  applicationId: number | null;
  type: number | null;
  setUpdateForm: (payload: {
    applicationId?: number | null;
    type?: number | null;
  }) => void;
  resetUpdateForm: () => void;
}

const initialUpdateFormState = {
  applicationId: null,
  type: null,
};

export const useUpdateFormStore = create(
  persist(
    (set) => ({
      ...initialUpdateFormState,
      setUpdateForm: (payload: {
        applicationId?: number | null;
        type?: number | null;
      }) =>
        set((state: UpdateFormState) => {
          const nextApplicationId =
            payload.applicationId === undefined
              ? state.applicationId
              : payload.applicationId;
          const nextType =
            payload.type === undefined ? state.type : payload.type;

          if (
            state.applicationId === nextApplicationId &&
            state.type === nextType
          ) {
            return state;
          }

          return {
            ...state,
            applicationId: nextApplicationId,
            type: nextType,
          };
        }),
      resetUpdateForm: () =>
        set((state: UpdateFormState) => {
          if (
            state.applicationId === initialUpdateFormState.applicationId &&
            state.type === initialUpdateFormState.type
          ) {
            return state;
          }

          return initialUpdateFormState;
        }),
    }),
    {
      name: "update-form",
      getStorage: () => localStorage,
    },
  ),
);
