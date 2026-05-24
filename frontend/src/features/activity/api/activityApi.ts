// src/features/activity/api/activityApi.ts
import axiosClient from '../../../lib/axiosClient';

export interface PaginationMeta {
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface Activity {
  id: string; // Backend có thể trả về _id, ta sẽ xử lý ở UI
  message: string;
  actor: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  };
  created_at: string;
  action: string;
  source_type: string;
}

export interface ActivityFilters {
  sourceTypes?: string;
  actions?: string;
  from?: string;
  to?: string;
}

export interface ActivityListResponse {
  success: boolean;
  code: string;
  message: string;
  data: Activity[];
  meta: PaginationMeta;
}

export const activityApi = {
  getAdminLogs: (page = 0, size = 20, filters: ActivityFilters = {}): Promise<ActivityListResponse> => {
    const paramsToSend: any = { page, size };

    if (filters.sourceTypes) paramsToSend.source_type = filters.sourceTypes;
    if (filters.actions) paramsToSend.action = filters.actions;
    if (filters.from) paramsToSend.from = filters.from;
    if (filters.to) paramsToSend.to = filters.to;

    // 🚀 ĐẢM BẢO BACKEND CÓ ĐỊNH NGHĨA ROUTER NÀY: GET /api/v1/activities
    return axiosClient.get(`/activities`, { params: paramsToSend });
  }
};