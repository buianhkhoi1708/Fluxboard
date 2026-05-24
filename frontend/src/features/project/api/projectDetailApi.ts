import axiosClient from '../../../lib/axiosClient';

// --- Interfaces ---
export interface Member {
    _id: string;
    project_id: string;
    user_id: {
        _id: string;
        email: string;
        full_name: string;
        avatar_url: string | null;
    };
    role_ids: { _id: string, name: string }[];
    is_active: boolean;
}

export interface Board {
    _id: string;
    name: string;
    created_at: string;
}

export interface Project {
    id: string;
    _id: string;
    name: string;
    description?: string;
    owner_id: string;
    status: string;
    boards: Board[];
    members: Member[];
    created_at: string;
    updated_at: string;
}

// --- API Service ---
export const projectApi = {
    // 1. Danh sách dự án (Trả về mảng)
    getUserProjects: async (): Promise<Project[]> => {
        const response: any = await axiosClient.get('/projects');
        return response.data?.data || [];
    },

    // 2. Chi tiết dự án (Trả về 1 object)
    // 🚀 LƯU Ý: Đảm bảo Backend trả về data trực tiếp hoặc qua key 'data'
    getProjectDetail: async (projectId: string): Promise<Project> => {
        const response: any = await axiosClient.get(`/projects/${projectId}`);
        // Xử lý linh hoạt: lấy data nếu API bọc trong object
        return response.data?.data || response.data;
    },

    // 3. Tổng quan
    getProjectOverview: async () => {
        const response: any = await axiosClient.get('/projects/overviews');
        return response.data?.data || response.data;
    },

    // 4. Các mutation...
    createProject: async (payload: any) => {
        const response: any = await axiosClient.post('/projects', payload);
        return response.data?.data || response.data;
    },

    updateProjectInfo: async (projectId: string, payload: any) => {
        const response: any = await axiosClient.put(`/projects/${projectId}`, payload);
        return response.data?.data || response.data;
    },

    deleteProject: async (projectId: string) => {
        const response: any = await axiosClient.delete(`/projects/${projectId}`);
        return response.data?.data || response.data;
    },


    assignProjectToTeam: async (projectId: string, teamId: string) => {
        const response: any = await axiosClient.post(`/projects/${projectId}/teams/assign`, { team_id: teamId });
        return response.data?.data || response.data;
    },


    // 🚀 THÊM HÀM XÓA MEMBER ĐỂ FIX LỖI TYPE ERROR
    removeProjectMember: async (projectId: string, userId: string) => {
        const response: any = await axiosClient.delete(`/projects/${projectId}/members/${userId}`);
        return response.data?.data || response.data;
    },

    addMemberToProject: async (projectId: string, userId: string, roleIds: string[]) => {
        const response: any = await axiosClient.post(`/projects/${projectId}/members`, {
            user_id: userId,
            role_ids: roleIds
        });
        return response.data?.data || response.data;
    },

    // 🚀 GỌI XUỐNG PUT /projects/:id/members/:userId
    updateProjectMember: async (projectId: string, memberId: string, roleIds: string[], isActive: boolean) => {
        const response: any = await axiosClient.put(`/projects/${projectId}/members/${memberId}`, {
            role_ids: roleIds, // Backend mong đợi key này
            is_active: isActive // Backend mong đợi key này
        });
        return response.data?.data || response.data;
    },
};