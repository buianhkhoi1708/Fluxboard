import { create } from 'zustand';
import { projectApi } from '../api/projectApi';
import { useUserStore } from '../../user/store/useUserStore';
import { Project, CreateProjectPayload } from '../types/projectTypes';

interface ProjectState {
  projects: any[];
  currentProject: Project | null;
  isLoading: boolean;
  
  fetchUserProjects: () => Promise<void>;
  fetchProjectDetail: (projectId: string) => Promise<void>;
  createNewProject: (data: CreateProjectPayload) => Promise<boolean>;
  addBoardToProject: (projectId: string, newBoard: any) => void;
  // 🚀 Thêm 2 hàm xử lý mới
  updateExistingProject: (projectId: string, data: Partial<CreateProjectPayload>) => Promise<boolean>;
  deleteExistingProject: (projectId: string) => Promise<boolean>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  fetchUserProjects: async () => {
    set({ isLoading: true });
    try {
      const res: any = await projectApi.getUserProjects();
      const rawProjects = res.data?.data || res.data || [];

      const normalizedProjects = rawProjects.map((p: any) => ({
        project: p,
        boards: [],
        members: []
      }));

      set({ projects: normalizedProjects, isLoading: false });

      normalizedProjects.forEach((item: any) => {
        const pid = item.project?._id || item.project?.id;
        if (pid) get().fetchProjectDetail(pid);
      });
    } catch (error) {
      console.error("❌ Lỗi tải danh sách dự án:", error);
      set({ isLoading: false });
    }
  },

  fetchProjectDetail: async (projectId: string) => {
    try {
      const res: any = await projectApi.getProjectDetail(projectId);
      const detailData = res.data?.data || res.data;

      if (detailData?.members) {
        const usersToCache = detailData.members.map((m: any) => ({
           ...(m.user_id || {}),
           role: m.role_id?.name
        }));
        useUserStore.getState().saveUsersToCache(usersToCache, projectId);
      }

      set((state) => ({
        projects: state.projects.map((item) => {
          const currentId = item.project?._id || item.project?.id;
          return currentId === projectId 
            ? { project: detailData, boards: detailData.boards || [], members: detailData.members || [] } 
            : item;
        })
      }));
    } catch (error) {
      console.error(`❌ Lỗi tải chi tiết dự án ${projectId}:`, error);
    }
  },

  createNewProject: async (data: CreateProjectPayload) => {
    set({ isLoading: true });
    try {
      const res: any = await projectApi.createProject(data);
      const newProjectData = res.data?.data || res.data;
      
      if (res.success || newProjectData) {
        set((state) => ({ 
          projects: [...state.projects, { project: newProjectData, boards: [], members: [] }],
          isLoading: false 
        }));
        
        const newPid = newProjectData?._id || newProjectData?.id;
        if (newPid) get().fetchProjectDetail(newPid);
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Lỗi tạo dự án:", error);
      set({ isLoading: false });
      return false;
    }
  },

  addBoardToProject: (projectId: string, newBoard: any) => {
    set((state) => ({
      projects: state.projects.map((item) => {
        const currentId = item.project?._id || item.project?.id;
        return currentId === projectId ? { ...item, boards: [...(item.boards || []), newBoard] } : item;
      })
    }));
  },

  // 🚀 HÀM CẬP NHẬT WORKSPACE TRÊN MONGODB
  updateExistingProject: async (projectId: string, data: Partial<CreateProjectPayload>) => {
    try {
      const res: any = await projectApi.updateProject(projectId, data);
      const updatedData = res.data?.data || res.data;

      if (res.success || updatedData) {
        set((state) => ({
          projects: state.projects.map((item) => {
            const currentId = item.project?._id || item.project?.id;
            return currentId === projectId 
              ? { ...item, project: { ...item.project, ...updatedData } } 
              : item;
          })
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Lỗi cập nhật dự án:", error);
      return false;
    }
  },

  // 🚀 HÀM XÓA WORKSPACE TRÊN MONGODB (Cascade delete cả Board/Member)
  deleteExistingProject: async (projectId: string) => {
    try {
      const res: any = await projectApi.deleteProject(projectId);
      if (res.status === 200 || res.success) {
        set((state) => ({
          projects: state.projects.filter((item) => {
            const currentId = item.project?._id || item.project?.id;
            return currentId !== projectId;
          })
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Lỗi xóa dự án:", error);
      return false;
    }
  }
}));