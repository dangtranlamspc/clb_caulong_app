import { create } from "zustand";

interface NavLoadingState {
    isNavigating: boolean;
    start: () => void;
    stop: () => void;
}

export const useNavLoadingStore = create<NavLoadingState>((set) => ({
    isNavigating: false,
    start: () => set({ isNavigating: true }),
    stop: () => set({ isNavigating: false }),
}));