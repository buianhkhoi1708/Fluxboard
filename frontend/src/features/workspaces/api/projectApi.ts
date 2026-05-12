import axiosClient from '../../../lib/axiosClient';
import { IncomingUser } from '../../user/store/useUserStore';

// ==========================================
// RESPONSE WRAPPER
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ==========================================
// PAYLOAD TYPES
// ==========================================

export interface CreateProjectPayload {
  name: string;
  description?: string;
  department_id?: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload> & {
  is_deleted?: boolean;
};

// ==========================================
// PROJECT API
// ==========================================

export const projectApi = {

  // ==========================================
  // CREATE PROJECT
  // ==========================================
  createProject: async (
    data: CreateProjectPayload
  ): Promise<ApiResponse<any>> => {
    const res = await axiosClient.post('/projects', data);
    return res.data;
  },

  // ==========================================
  // GET PROJECTS
  // ==========================================
  getProjects: async (
    params?: {
      page?: number;
      size?: number;
      sort?: string;
    }
  ): Promise<ApiResponse<any>> => {
    const res = await axiosClient.get('/projects', { params });
    return res.data;
  },

  // ==========================================
  // GET PROJECT DETAIL
  // ==========================================
  getProjectById: async (
    projectId: string
  ): Promise<ApiResponse<any>> => {
    const res = await axiosClient.get(`/projects/${projectId}`);
    return res.data;
  },

  // ==========================================
  // PROJECT OVERVIEW
  // ==========================================
  getProjectOverview: async (
    projectId: string
  ): Promise<ApiResponse<any>> => {
    const res = await axiosClient.get(`/projects/${projectId}/overview`);
    return res.data;
  },

  // ==========================================
  // PROJECTS BY DEPARTMENT
  // ==========================================
  getProjectsByDepartment: async (
    departmentId: string,
    params?: {
      page?: number;
      size?: number;
    }
  ): Promise<ApiResponse<any>> => {
    const res = await axiosClient.get(
      `/projects/departments/${departmentId}`,
      { params }
    );

    return res.data;
  },

  // ==========================================
  // UPDATE PROJECT
  // ==========================================
  updateProject: async (
    projectId: string,
    data: UpdateProjectPayload
  ): Promise<ApiResponse<any>> => {
    const res = await axiosClient.put(
      `/projects/${projectId}`,
      data
    );

    return res.data;
  },

  // ==========================================
  // DELETE PROJECT
  // ==========================================
  deleteProject: async (
    projectId: string
  ): Promise<ApiResponse<any>> => {
    const res = await axiosClient.delete(`/projects/${projectId}`);
    return res.data;
  },

  // ==========================================
  // GET ALL PROJECT OVERVIEWS
  // ==========================================
  getProjectOverviews: async (
    params?: {
      page?: number;
      size?: number;
    }
  ): Promise<ApiResponse<any>> => {
    const res = await axiosClient.get(
      '/projects',
      { params }
    );

    return res.data;
  },

  // ==========================================
  // GET PROJECT MEMBERS
  // ==========================================
  getProjectMembers: async (
    projectId: string
  ): Promise<ApiResponse<IncomingUser[]>> => {
    const res = await axiosClient.get(
      `/projects/${projectId}/members`
    );

    return res.data;
  }
};