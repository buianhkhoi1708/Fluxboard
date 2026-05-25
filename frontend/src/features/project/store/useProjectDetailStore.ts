import { create } from 'zustand';
import { projectApi, ProjectMemberDetail } from '../api/projectDetailApi';
import { userApi } from '../../user/api/userApi'; 

interface ProjectState {
    currentProjectId: string | null;
    currentProject: any | null;
    members: ProjectMemberDetail[];
    systemUsers: any[];
    isLoading: boolean;
    isActionLoading: boolean;
    boards: any[];

    // Actions
    fetchProjectMembers: (projectId: string) => Promise<void>;
    fetchSystemUsers: () => Promise<void>;
    fetchProjectDetails: (projectId: string) => Promise<void>;
    addMember: (projectId: string, userId: string, roleIds: string[]) => Promise<boolean>;
    updateMember: (projectId: string, memberId: string, roleIds: string[], isActive: boolean) => Promise<boolean>;
    removeMember: (projectId: string, memberId: string) => Promise<boolean>;
    fetchProjectOverview: (projectId: string) => Promise<void>;
    updateProjectDetails: (projectId: string, payload: any) => Promise<boolean>;
    deleteProject: (projectId: string) => Promise<boolean>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    currentProjectId: null,
    currentProject: null,
    members: [],
    systemUsers: [],
    isLoading: false,
    isActionLoading: false,
    boards: [],

    fetchProjectMembers: async (projectId) => {
        set({ isLoading: true, currentProjectId: projectId });
        try {
            const data = await projectApi.getProjectMembersDetail(projectId);
            set({ members: data, isLoading: false });
        } catch (error) {
            console.error("Lỗi fetchProjectMembers:", error);
            set({ isLoading: false, members: [] });
        }
    },

    fetchProjectDetails: async (projectId) => {
        try {
            const data = await projectApi.getProjectById(projectId);
            set({ currentProject: data });
            } catch (error) {
            console.error("Lỗi fetchProjectDetails:", error);
        }
    },

    fetchSystemUsers: async () => {
        try {
            // Tận dụng API có sẵn của User module
            const res: any = await userApi.getAllUsers({ page: 0, size: 100 });
            const data = res?.data?.content || res?.data || [];
            set({ systemUsers: data });
        } catch (error) {
            console.error("Lỗi fetchSystemUsers:", error);
        }
    },

    addMember: async (projectId, userId, roleIds) => {
        set({ isActionLoading: true });
        try {
            await projectApi.addProjectMember(projectId, userId, roleIds);
            // Thành công thì refresh lại danh sách
            await get().fetchProjectMembers(projectId);
            set({ isActionLoading: false });
            return true;
        } catch (error) {
            console.error("Lỗi addMember:", error);
            set({ isActionLoading: false });
            return false;
        }
    },

    updateMember: async (projectId, memberId, roleIds, isActive) => {
        // Cập nhật UI ngay lập tức cho mượt
        const previousMembers = [...get().members];
        set((state) => ({
            members: state.members.map(m => 
                m.id === memberId ? { ...m, roleIds: roleIds, active: isActive } : m
            )
    }));

        try {
            await projectApi.updateProjectMember(projectId, memberId, roleIds, isActive);
            return true;
        } catch (error) {
            console.error("Lỗi updateMember:", error);
            // Lỗi thì rollback
            set({ members: previousMembers });
            return false;
        }
    },

    removeMember: async (projectId, memberId) => {
        const previousMembers = [...get().members];
        set((state) => ({
            members: state.members.filter(m => m.id !== memberId)
    }));

        try {
            await projectApi.removeProjectMember(projectId, memberId);
            return true;
        } catch (error) {
            console.error("Lỗi removeMember:", error);
            // Rollback
            set({ members: previousMembers });
            return false;
        }
    },

    fetchProjectOverview: async (projectId) => {
        set({ isLoading: true });
        try {
            const res: any = await projectApi.getProjectOverview(projectId);
            const actualData = res.data || res;

            set({ 
                currentProject: actualData.project, 
                boards: actualData.boards || [],
                isLoading: false 
            });
        } catch (error) {
            console.error("Lỗi fetchProjectOverview:", error);
            set({ isLoading: false });
        }
    },

    updateProjectDetails: async (projectId, payload) => {
        set({ isActionLoading: true });
        try {
            await projectApi.updateProjectInfo(projectId, payload);
            await get().fetchProjectOverview(projectId); // Fetch lại data mới
            set({ isActionLoading: false });
            return true;
        } catch (error) {
            console.error("Lỗi updateProjectDetails:", error);
            set({ isActionLoading: false });
            return false;
        }
    },

    deleteProject: async (projectId) => {
        set({ isActionLoading: true });
        try {
            await projectApi.deleteProject(projectId);
            set({ isActionLoading: false });
            return true;
        } catch (error) {
            console.error("Lỗi deleteProject:", error);
            set({ isActionLoading: false });
            return false;
        }
    }
}));

