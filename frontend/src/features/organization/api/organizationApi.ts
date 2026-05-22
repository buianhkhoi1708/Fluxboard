import axiosClient from '../../../lib/axiosClient';

export const orgApi = {
  /* =========================
     DEPARTMENTS & TREE
  ========================= */
  
  getOrgTree: (params?: any) =>
    axiosClient.get('/organizations/tree', { params }),

  createDepartment: (payload: any) =>
    axiosClient.post('/organizations/departments', payload),

  updateDepartment: (id: string, payload: any) => 
    axiosClient.put(`/organizations/departments/${id}`, payload),

  deleteDepartment: (id: string) => 
    axiosClient.delete(`/organizations/departments/${id}`),

  /* =========================
     TEAMS
  ========================= */
  
  createTeam: (payload: any) =>
    axiosClient.post('/organizations/teams', payload),

  updateTeam: (teamId: string, payload: any) =>
    axiosClient.put(`/organizations/teams/${teamId}`, payload),

  deleteTeam: (teamId: string) =>
    axiosClient.delete(`/organizations/teams/${teamId}`),

  /* =========================
     MEMBERS & ASSIGNMENTS
  ========================= */

  assignUserToTeam: (userId: string, teamId: string, departmentId: string) =>
    axiosClient.post(`/organizations/teams/${teamId}/users`, {
      user_id: userId,           // 🚀 FIX: Chuyển thành snake_case cho Backend
      department_id: departmentId // 🚀 FIX: Chuyển thành snake_case cho Backend
    }),

  removeUserFromTeam: (teamId: string, userId: string) =>
    axiosClient.delete(`/organizations/teams/${teamId}/users/${userId}`),

  /* =========================
     USERS & SEARCH
  ========================= */
  
  searchOrgUsers: (keyword: string) =>
    // 🚀 FIX: Mã hóa từ khóa để không bị lỗi 400 Bad Request
    axiosClient.get(`/organizations/search?keyword=${encodeURIComponent(keyword)}`),
    
  getUnassignedUsers: (params?: any) =>
    axiosClient.get('/organizations/users/unassigned', { params }),
};