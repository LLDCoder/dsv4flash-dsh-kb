import create from 'zustand'
import { persist } from 'zustand/middleware'

export const globalSearch = create(
  persist(
    (set) => ({
      globalSearch: '',
      setSearch: (globalSearch: string) => set({ globalSearch }),
      reset: () => set({ globalSearch: ''}),
    }),
    {
      name: 'globalSearch',
      getStorage: () => sessionStorage,
    },
  ),
)