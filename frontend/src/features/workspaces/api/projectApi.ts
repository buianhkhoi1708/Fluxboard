import axiosClient from '../../../lib/axiosClient';

export const projectApi = {
  /**
   * 1. Tạo dự án mới (POST /projects)
   * @param {Object} data - { name, description, departmentId, ... }
   */
  createProject: (data) => {
    return axiosClient.post('/projects', data);
  },

  /**
   * 2. Lấy danh sách dự án có phân trang (GET /projects)
   * @param {Object} params - { page: 0, size: 20, sort: 'createdAt,desc' }
   */
  getProjects: (params) => {
    return axiosClient.get('/projects', { params });
  },

  /**
   * 3. Lấy chi tiết 1 dự án (GET /projects/{projectId})
   */
  getProjectById: (projectId) => {
    return axiosClient.get(`/projects/${projectId}`);
  },

  /**
   * 4. Lấy Overview dự án để làm Dashboard (GET /projects/{projectId}/overview)
   */
  getProjectOverview: (projectId) => {
    return axiosClient.get(`/projects/${projectId}/overview`);
  },

  /**
   * 5. Lấy danh sách dự án theo Phòng ban (GET /projects/departments/{departmentId})
   */
  getProjectsByDepartment: (departmentId, params) => {
    return axiosClient.get(`/projects/departments/${departmentId}`, { params });
  },

  /**
   * 6. Cập nhật dự án (PUT /projects/{projectId})
   */
  updateProject: (projectId, data) => {
    return axiosClient.put(`/projects/${projectId}`, data);
  },

  /**
   * 7. Xóa dự án (DELETE /projects/{projectId})
   */
  deleteProject: (projectId) => {
    return axiosClient.delete(`/projects/${projectId}`);
  },

  getProjectOverviews: (params) => {
    return axiosClient.get('/projects/overviews', { params });
  },
};