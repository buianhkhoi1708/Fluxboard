import { create } from 'zustand';

interface IBoardUIState {
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Bạn có thể thêm các state UI khác ở đây (VD: mở modal, chế độ view dạng List/Kanban...)
}

export const useBoardStore = create<IBoardUIState>((set) => ({
  activeBoardId: null,
  setActiveBoardId: (id) => set({ activeBoardId: id }),
  
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));