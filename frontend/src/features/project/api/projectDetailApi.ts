import axiosClient from '../../../lib/axiosClient';

export interface ProjectMemberDetail {
    id: string;
    projectId: string;
    userId: string;
    user: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
    roleIds: string[];
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export const projectApi = {
    // 🚀 LẤY DANH SÁCH & BÓC VỎ DỮ LIỆU
    getProjectMembersDetail: async (projectId: string): Promise<ProjectMemberDetail[]> => {
        const response: any = await axiosClient.get(`/projects/${projectId}/members`);
        return response.data?.data || response.data?.content || response.data || [];
    },

    // THÊM MEMBER
    addProjectMember: async (projectId: string, userId: string, roleIds: string[]) => {
        const payload = {
            user_id: userId,
            role_ids: roleIds
        };
        const response: any = await axiosClient.post(`/projects/${projectId}/members`, payload);
        return response.data?.data || response.data;
    },

    // SỬA MEMBER (Quyền/Trạng thái)
    updateProjectMember: async (projectId: string, userId: string, roleIds: string[], isActive: boolean) => {
        // 🚀 ĐÃ FIX: Chỉ gửi role_ids chuẩn snake_case, gọt bỏ field active để Backend khỏi báo lỗi Unknown Field
        const payload = {
            role_ids: roleIds
        };
        const response: any = await axiosClient.put(`/projects/${projectId}/members/${userId}`, payload);
        return response.data?.data || response.data;
    },

    // XÓA MEMBER
    removeProjectMember: async (projectId: string, userId: string) => {
        const response: any = await axiosClient.delete(`/projects/${projectId}/members/${userId}`);
        return response.data?.data || response.data;
    },

    // LẤY TỔNG QUAN
    getProjectOverview: async (projectId: string) => {
        const response: any = await axiosClient.get(`/projects/${projectId}/overview`);
        return response.data?.data || response.data;
    },

    // SỬA DỰ ÁN
    updateProjectInfo: async (projectId: string, payload: any) => {
        const response: any = await axiosClient.put(`/projects/${projectId}`, payload);
        return response.data?.data || response.data;
    },

    // XÓA DỰ ÁN
    deleteProject: async (projectId: string) => {
        const response: any = await axiosClient.delete(`/projects/${projectId}`);
        return response.data?.data || response.data;
    }
};