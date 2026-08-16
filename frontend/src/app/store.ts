import { create } from "zustand";

interface AppState {
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

/** Small local UI state (Zustand). Server state lives in TanStack Query. */
export const useAppStore = create<AppState>((set) => ({
  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),
}));
