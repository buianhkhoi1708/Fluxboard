import axiosClient from '../../../lib/axiosClient';

export const organizationApi = {
  // 1.1 & 2.1: Lấy danh sách (Phân trang)
  getDepartments: (page = 0) => axiosClient.get('/departments', { params: { page } }),
  getTeams: (page = 0) => axiosClient.get('/teams', { params: { page } }),

  // 1.2 & 2.2: Tạo mới
  createDepartment: (data) => axiosClient.post('/departments', data),
  createTeam: (data) => axiosClient.post('/teams', data),

  // 3.1: Lấy Logs Dashboard
  getRecentActivities: () => axiosClient.get('/activities/recent'),

  // 4.1: Lấy Cây tổ chức (Dữ liệu lồng nhau)
  getOrgTree: () => axiosClient.get('/organizations/tree')
};