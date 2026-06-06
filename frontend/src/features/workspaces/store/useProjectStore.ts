import { create } from "zustand";
import { projectApi } from "../api/projectApi";
import { useUserStore, IncomingUser } from "../../user/store/useUserStore";

export interface Project {
  id?: string;
  _id?: string;
  name?: string;
  is_deleted?: boolean;
  [key: string]: any;
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
  members: IncomingUser[];
}

interface ProjectStore {
  projects: NormalizedProject[];
  isLoading: boolean;
  fetchProjects: () => Promise<void>;
  addProject: (newProject: Project) => void;
  addBoardToProject: (projectId: string, newBoard: Board) => void;
  fetchProjectMembers: (projectId: string) => Promise<void>;
}

const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const response = await projectApi.getProjectOverviews({
        page: 0,
        size: 50,
      });
      if (response.success) {
        const rawData: any[] = (response.data as any)?.content || response.data;

        const normalizedProjects: NormalizedProject[] = rawData.map((item) => {
          if (item.project) return item;
          return {
            project: item,
            boards: item.boards || [],
            members: item.members || [],
          };
        });

        const activeProjects = normalizedProjects.filter((item) => {
          const p = item.project;
          return p && (p.is_deleted === false || p.is_deleted === undefined);
        });

        set({ projects: activeProjects });

        activeProjects.forEach((item) => {
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

  addProject: (newProject) =>
    set((state) => ({
      projects: [
        { project: newProject, boards: [], members: [] },
        ...state.projects,
      ],
    })),

  addBoardToProject: (projectId, newBoard) =>
    set((state) => ({
      projects: state.projects.map((item) => {
        if (
          item.project &&
          (item.project.id === projectId || item.project._id === projectId)
        ) {
          return {
            ...item,
            boards: item.boards ? [...item.boards, newBoard] : [newBoard],
          };
        }
        return item;
      }),
    })),

  fetchProjectMembers: async (projectId) => {
    try {
      const response = await projectApi.getProjectMembers(projectId);
      const membersData: IncomingUser[] =
        (response.data as any)?.content ||
        (response.data as any)?.data ||
        response.data ||
        [];

      useUserStore.getState().saveUsersToCache(membersData, projectId);

      set((state) => ({
        projects: state.projects.map((item) => {
          if (
            item.project &&
            (item.project.id === projectId || item.project._id === projectId)
          ) {
            return { ...item, members: membersData };
          }
          return item;
        }),
      }));
    } catch (error) {
      console.error(`Lỗi khi lấy member cho project ${projectId}:`, error);
    }
  },
}));

export default useProjectStore;
