import create from 'zustand';
import { persist } from 'zustand/middleware';
interface ActionStoreState {
  pengdingActionNum: number;
  pengdingActions: unknown;
  setData: (data: number) => void;
  setActions: (data: unknown) => void;
  resetNum: () => void;
  resetActions: () => void;
}
export const useActionStore = create<ActionStoreState>(
  persist<ActionStoreState>(
    (set) => ({
      pengdingActionNum: 0,
      pengdingActions: [],
      setData: (data: number) => set({ pengdingActionNum: data }),
      setActions: (data: unknown) => set({ pengdingActions: data }),
      resetNum: () => set({ pengdingActionNum: 0 }),
      resetActions: () => set({ pengdingActions: [] }),
    }),
    {
      name: 'action-storage', // name of the item in the storage (must be unique)
      getStorage: () => sessionStorage, // (optional) by default, 'localStorage' is used
    }
  ),
)