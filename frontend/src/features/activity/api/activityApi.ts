import axiosClient from '../../../lib/axiosClient';
import { ApiResponse, PaginatedData } from '../../../types/api';

export interface Activity {
  id: string;
  message: string;
  actor: {
    fullName: string;
    avatarUrl: string;
  };
  createdAt: string;
  // ... các field khác sếp cần
}

export const activityApi = {
  // Admin dùng cái này để lấy toàn bộ log hệ thống
  getAdminLogs: (page = 0, size = 20) => 
    axiosClient.get(`/activities`, { params: { page, size } }),
};