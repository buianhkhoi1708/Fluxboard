import axiosClient from '../../../lib/axiosClient';
// 🚀 Nhớ import type IncomingUser từ file User Store để xài chung
import { IncomingUser } from '../../user/store/useUserStore';

// ==========================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES)
// ==========================================

// Cấu trúc Response bọc ngoài của Backend (Nên tách ra 1 file type chung nếu sếp muốn)
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Kiểu dữ liệu gửi đi khi TẠO dự án
export interface CreateProjectPayload {
  name: string;
  description?: string;
  departmentId?: string; // Hoặc department_id tùy chuẩn của Backend
  // Có thể mở rộng thêm: startDate, endDate...
}

// Kiểu dữ liệu gửi đi khi CẬP NHẬT (Dùng Partial để cho phép gửi 1 vài field)
export type UpdateProjectPayload = Partial<CreateProjectPayload> & {
  is_deleted?: boolean;
};

// ==========================================
// 2. PROJECT API CLIENT
// ==========================================

export const projectApi = {
  /**
   * 1. Tạo dự án mới (POST /projects)
   */
  createProject: (data: CreateProjectPayload): Promise<ApiResponse<any>> => {
    return axiosClient.post('/projects', data);
  },

  /**
   * 2. Lấy danh sách dự án có phân trang (GET /projects)
   */
  getProjects: (params?: { page?: number; size?: number; sort?: string }): Promise<ApiResponse<any>> => {
    return axiosClient.get('/projects', { params });
  },

  /**
   * 3. Lấy chi tiết 1 dự án (GET /projects/{projectId})
   */
  getProjectById: (projectId: string): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/${projectId}`);
  },

  /**
   * 4. Lấy Overview dự án để làm Dashboard (GET /projects/{projectId}/overview)
   */
  getProjectOverview: (projectId: string): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/${projectId}/overview`);
  },

  /**
   * 5. Lấy danh sách dự án theo Phòng ban (GET /projects/departments/{departmentId})
   */
  getProjectsByDepartment: (departmentId: string, params?: { page?: number; size?: number }): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/departments/${departmentId}`, { params });
  },

  /**
   * 6. Cập nhật dự án (PUT /projects/{projectId})
   */
  updateProject: (projectId: string, data: UpdateProjectPayload): Promise<ApiResponse<any>> => {
    return axiosClient.put(`/projects/${projectId}`, data);
  },

  /**
   * 7. Xóa dự án (DELETE /projects/{projectId})
   */
  deleteProject: (projectId: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/projects/${projectId}`);
  },

  /**
   * 8. Lấy tổng quan TẤT CẢ dự án (Kèm Boards & Members)
   */
  getProjectOverviews: (params?: { page?: number; size?: number }): Promise<ApiResponse<any>> => {
    return axiosClient.get('/projects/overviews', { params });
  },

  /**
   * 9. Lấy danh sách thành viên của 1 dự án
   */
  // 🚀 Điểm ăn tiền: Trả về thẳng mảng IncomingUser để Store tự động map
  getProjectMembers: (projectId: string): Promise<ApiResponse<IncomingUser[] | any>> => {
    return axiosClient.get(`/projects/${projectId}/members`);
  },
};