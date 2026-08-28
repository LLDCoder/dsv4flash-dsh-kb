import create from "zustand";
import { persist } from "zustand/middleware";

export interface IUser {
  servicesId: number | null;
  servicesType: string;
  servicesName: string;
  applicationId: number;
  formilyData: any[]; // Add this line
  Department: number | null;
  servicesCode: string | number | null;
  serviceProcessId: number | null;
  isExpressSupported: boolean | null;
}

const initialUserValues = {
  servicesId: null,
  servicesCode: null,
  servicesType: "",
  servicesName: "",
  applicationId: 0,
  formilyData: [], // Add this line
  Department: 0,
  serviceProcessId: null,
  isExpressSupported: null,

};

export const useServicesStore = create(
  persist(
    (set) => ({
      userInfo: initialUserValues,
      setData: (data: IUser) => set({ userInfo: data }),
      resetUserInfo: () => set(initialUserValues),
      updateServicesId: (id: number | null) =>
        set((state: { userInfo: IUser }) => {
          if (state.userInfo.servicesId === id) {
            return state;
          }

          return {
            userInfo: {
              ...state.userInfo,
              servicesId: id,
            },
          };
        }),
      updateServicesCode: (id: string | number | null) =>
        set((state: { userInfo: IUser }) => {
          if (state.userInfo.servicesCode === id) {
            return state;
          }

          return {
            userInfo: {
              ...state.userInfo,
              servicesCode: id,
            },
          };
        }),
      updateServicesDepartment: (Department: number | null) =>
        set((state: { userInfo: IUser }) => {
          if (state.userInfo.Department === Department) {
            return state;
          }

          return {
            userInfo: {
              ...state.userInfo,
              Department: Department,
            },
          };
        }),
      updateServiceProcessId: (serviceProcessId: number | null) =>
        set((state: { userInfo: IUser }) => {
          if (state.userInfo.serviceProcessId === serviceProcessId) {
            return state;
          }

          return {
            userInfo: {
              ...state.userInfo,
              serviceProcessId,
            },
          };
        }),
      updateServiceExpressSupport: (isExpressSupported: boolean | null) =>
        set((state: { userInfo: IUser }) => {
          if (state.userInfo.isExpressSupported === isExpressSupported) {
            return state;
          }

          return {
            userInfo: {
              ...state.userInfo,
              isExpressSupported,
            },
          };
        }),
      updateServicesType: (type: string) =>
        set((state: { userInfo: IUser }) => {
          if (state.userInfo.servicesType === type) {
            return state;
          }

          return {
            userInfo: {
              ...state.userInfo,
              servicesType: type,
            },
          };
        }),

      updateServicesName: (type: string) =>
        set((state: { userInfo: IUser }) => {
          if (state.userInfo.servicesName === type) {
            return state;
          }

          return {
            userInfo: {
              ...state.userInfo,
              servicesName: type,
            },
          };
        }),

      updateApplicationId: (type: number) =>
        set((state: { userInfo: IUser }) => {
          if (state.userInfo.applicationId === type) {
            return state;
          }

          return {
            userInfo: {
              ...state.userInfo,
              applicationId: type,
            },
          };
        }),
      updateFormilyData: (data: any[]) =>
        set((state: { userInfo: IUser }) => ({
          userInfo: {
            ...state.userInfo,
            formilyData: data,
          },
        })),
    }),
    {
      name: "services-storage", // name of the item in the storage (must be unique)
      getStorage: () => localStorage, // (optional) by default, 'localStorage' is used
    }
  )
);
