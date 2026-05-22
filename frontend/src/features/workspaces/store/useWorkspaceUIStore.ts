import { create } from 'zustand';

interface WorkspaceUIState {
  isProjectModalOpen: boolean;
  isBoardModalOpen: boolean;
  selectedProjectId: string | null;
  
  openProjectModal: () => void;
  closeProjectModal: () => void;
  
  openBoardModal: (projectId: string) => void;
  closeBoardModal: () => void;
}

export const useWorkspaceUIStore = create<WorkspaceUIState>((set) => ({
  isProjectModalOpen: false,
  isBoardModalOpen: false,
  selectedProjectId: null,

  openProjectModal: () => set({ isProjectModalOpen: true }),
  closeProjectModal: () => set({ isProjectModalOpen: false }),

  openBoardModal: (projectId) => set({ isBoardModalOpen: true, selectedProjectId: projectId }),
  closeBoardModal: () => set({ isBoardModalOpen: false, selectedProjectId: null }),
}));