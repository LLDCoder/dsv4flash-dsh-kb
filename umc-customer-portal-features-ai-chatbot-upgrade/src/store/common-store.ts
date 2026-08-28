import create from 'zustand'

interface ICommonStore {
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

export const useCommonStore = create<ICommonStore>((set) => ({
        loading: false,
        setLoading: (loading: boolean) => set(() => ({ loading })),
    })
)