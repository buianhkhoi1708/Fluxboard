import { create } from 'zustand';
import { projectApi } from '../api/projectApi';
import { useUserStore, IncomingUser } from '../../user/store/useUserStore'; 

// ==========================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES)
// ==========================================

export interface Project {
  id?: string;
  _id?: string;
  name?: string;
  is_deleted?: boolean;
  [key: string]: any; // Mở rộng nếu Backend trả thêm field
}

export interface Board {
  id?: string;
  _id?: string;
  name?: string;
  [key: string]: any;
}

export interface NormalizedProject {
  project: Project;
  boards: Board[];
  members: IncomingUser[]; // Dùng Type của User để xài chung
}

interface ProjectStore {
  projects: NormalizedProject[];
  isLoading: boolean;
  fetchProjects: () => Promise<void>;
  addProject: (newProject: Project) => void;
  addBoardToProject: (projectId: string, newBoard: Board) => void;
  fetchProjectMembers: (projectId: string) => Promise<void>;
}

// ==========================================
// 2. LOGIC STORE
// ==========================================

const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [], 
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const response = await projectApi.getProjectOverviews({ page: 0, size: 50 });
      if (response.success) {
        // Ép kiểu (as any) tạm thời để bắt linh hoạt các dạng response
        const rawData: any[] = (response.data as any)?.content || response.data;
        
        const normalizedProjects: NormalizedProject[] = rawData.map(item => {
          if (item.project) return item; 
          return {
            project: item, 
            boards: item.boards || [],
            members: item.members || [] 
          };
        });

        const activeProjects = normalizedProjects.filter(item => {
          const p = item.project;
          return p && (p.is_deleted === false || p.is_deleted === undefined);
        });
        
        set({ projects: activeProjects });

        // TỰ ĐỘNG GỌI MEMBER CHO TỪNG PROJECT
        activeProjects.forEach(item => {
          const pid = item.project?.id || item.project?._id;
          if (pid) {
            get().fetchProjectMembers(pid); 
          }
        });
      }
    } catch (error) {
      console.error("Store Fetch Error:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  addProject: (newProject) => set((state) => ({ 
    projects: [{ project: newProject, boards: [], members: [] }, ...state.projects] 
  })),

  addBoardToProject: (projectId, newBoard) => set((state) => ({
    projects: state.projects.map((item) => {
      if (item.project && (item.project.id === projectId || item.project._id === projectId)) {
        return {
          ...item,
          boards: item.boards ? [...item.boards, newBoard] : [newBoard]
        };
      }
      return item;
    })
  })),

  fetchProjectMembers: async (projectId) => {
    try {
      const response = await projectApi.getProjectMembers(projectId);
      const membersData: IncomingUser[] = (response.data as any)?.content || (response.data as any)?.data || response.data || [];

      // 🚀 BƯỚC QUAN TRỌNG NHẤT: Bơm data vào Kho Toàn Cục!
      // Việc này giúp thẻ Task ở bên trong Board nhận diện được Avatar lập tức
      useUserStore.getState().saveUsersToCache(membersData, projectId);

      // Cập nhật vào mảng projects của Workspaces
      set((state) => ({
        projects: state.projects.map((item) => {
          if (item.project && (item.project.id === projectId || item.project._id === projectId)) {
            return { ...item, members: membersData };
          }
          return item; 
        })
      }));
    } catch (error) {
      console.error(`Lỗi khi lấy member cho project ${projectId}:`, error);
    }
  }

}));

export default useProjectStore;