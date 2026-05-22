import axiosClient from '../../../lib/axiosClient';
import { ApiResponse, PaginatedData } from '../../../types/api';

// Định nghĩa Meta
export interface PaginationMeta {
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}
// Định nghĩa Activity
export interface Activity {
  id: string;
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

// Interface cho params filter
export interface ActivityFilters {
  sourceTypes?: string;
  actions?: string;
  from?: string;
  to?: string;
}

// Định nghĩa response bao ngoài
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

    // Chuyển đổi tên biến sang đúng chuẩn @RequestParam của Spring Boot
    if (filters.sourceTypes) paramsToSend.source_type = filters.sourceTypes;
    if (filters.actions) paramsToSend.action = filters.actions;
    if (filters.from) paramsToSend.from = filters.from;
    if (filters.to) paramsToSend.to = filters.to;

    return axiosClient.get(`/activities`, { params: paramsToSend });
  }
};