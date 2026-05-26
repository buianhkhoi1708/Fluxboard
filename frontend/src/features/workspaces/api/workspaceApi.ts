import axiosClient from '../../../lib/axiosClient';
import { IncomingUser } from '../../user/store/useUserStore';
import { 
  ApiResponse, 
  CreateProjectPayload, 
  UpdateProjectPayload, 
  CreateBoardPayload 
} from '../types/workspaceTypes';

export const workspaceApi = {
  // Lấy danh sách Overview có phân trang
  getProjectOverviews: (page: number = 0, size: number = 50): Promise<ApiResponse<any>> => {
    return axiosClient.get('/projects/overviews', { params: { page, size } });
  },

  createProject: (data: CreateProjectPayload): Promise<ApiResponse<any>> => {
    return axiosClient.post('/projects', data);
  },

  getProjects: (params?: { page?: number; size?: number; sort?: string }): Promise<ApiResponse<any>> => {
    return axiosClient.get('/projects', { params });
  },

  getProjectById: (projectId: string): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/${projectId}`);
  },

  getProjectOverview: (projectId: string): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/${projectId}/overview`);
  },

  getProjectsByDepartment: (departmentId: string, params?: { page?: number; size?: number }): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/departments/${departmentId}`, { params });
  },

  updateProject: (projectId: string, data: UpdateProjectPayload): Promise<ApiResponse<any>> => {
    return axiosClient.put(`/projects/${projectId}`, data);
  },

deleteBoard: async ({ boardId, projectId }: { boardId: string; projectId: string }): Promise<any> => {
    const response: any = await axiosClient.delete(`/boards/${boardId}`, {
      // BẮT BUỘC PHẢI CÓ ĐOẠN params NÀY
      params: { 
        project_id: projectId 
      }
    });
    return response.data || response;
  },
  getProjectMembers: (projectId: string): Promise<ApiResponse<IncomingUser[] | any>> => {
    return axiosClient.get(`/projects/${projectId}/members`);
  },

  createBoard: (data: CreateBoardPayload): Promise<ApiResponse<any>> => {
    return axiosClient.post('/boards', data);
  }
};