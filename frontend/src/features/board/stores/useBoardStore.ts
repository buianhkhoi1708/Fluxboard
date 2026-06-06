import { create } from "zustand";

interface IBoardUIState {
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useBoardStore = create<IBoardUIState>((set) => ({
  activeBoardId: null,
  setActiveBoardId: (id) => set({ activeBoardId: id }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
