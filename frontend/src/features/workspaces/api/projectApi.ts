import axiosClient from '../../../lib/axiosClient';
import { CreateProjectPayload, AddMemberPayload } from '../types/projectTypes';

export const projectApi = {
  // Lấy danh sách dự án của user đang đăng nhập (GET /projects)
  getUserProjects: () => axiosClient.get('/projects'),

  // Lấy chi tiết dự án kèm Board và Member (GET /projects/:id)
  getProjectDetail: (projectId: string) => axiosClient.get(`/projects/${projectId}`),

  // Tạo dự án mới (POST /projects)
  createProject: (data: CreateProjectPayload) => axiosClient.post('/projects', data),

  // Sửa dự án (PUT /projects/:id)
  updateProject: (projectId: string, data: Partial<CreateProjectPayload>) => 
    axiosClient.put(`/projects/${projectId}`, data),

  // Xóa dự án (DELETE /projects/:id)
  deleteProject: (projectId: string) => axiosClient.delete(`/projects/${projectId}`),

  // ================= QUẢN LÝ THÀNH VIÊN =================
  // Thêm thành viên (POST /projects/members)
  addMember: (data: AddMemberPayload) => axiosClient.post('/projects/members', data),

  // Xóa thành viên (DELETE /projects/members)
  removeMember: (projectId: string, userId: string) => 
    axiosClient.delete('/projects/members', { data: { project_id: projectId, user_id: userId } }),

  // Cập nhật Role thành viên (PUT /projects/:projectId/members/:userId)
  updateMemberRole: (projectId: string, userId: string, role_name: string) => 
    axiosClient.put(`/projects/${projectId}/members/${userId}`, { role_name })
};