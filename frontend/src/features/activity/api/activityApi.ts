import axiosClient from '../../../lib/axiosClient';

export interface PaginationMeta {
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ActivityActor {
  user_id?: string;
  id?: string;
  _id?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  email?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  role_id?: string | { _id?: string; id?: string; name?: string };
  role_name?: string;
  role?: string;
  system_role?: string;
}

export interface Activity {
  id?: string;
  _id?: string;
  message: string;
  actor?: ActivityActor;
  created_at: string;
  action: string;
  source_type: string;
  source?: string;
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

export interface SecurityLog {
  id?: string;
  _id?: string;
  action: string;
  type?: string;
  message?: string;
  description?: string;
  details?: {
    message?: string;
    [key: string]: any;
  };
  actor?: ActivityActor;
  user?: ActivityActor;
  actor_name?: string;
  role_id?: string;
  role_name?: string;
  created_at: string;
}

const buildPaginationParams = (page = 0, size = 20) => ({
  page,
  size,
});

export const activityApi = {
  getAdminLogs: (
    page = 0,
    size = 20,
    filters: ActivityFilters = {},
  ): Promise<ActivityListResponse> => {
    const paramsToSend: any = buildPaginationParams(page, size);

    if (filters.sourceTypes) {
      paramsToSend.source_type = filters.sourceTypes;
    }

    if (filters.actions) {
      paramsToSend.action = filters.actions;
    }

    if (filters.from) {
      paramsToSend.from = filters.from;
    }

    if (filters.to) {
      paramsToSend.to = filters.to;
    }

    return axiosClient.get('/activities', {
      params: paramsToSend,
    });
  },

  /**
   * Tab "Bảo mật hệ thống" trong trang Hoạt động.
   *
   * Backend tương ứng nên tạo:
   * GET /api/v1/activities/security?page=0&size=100
   *
   * Dữ liệu nên gồm:
   * - CREATE_USER: SYSTEM_ADMIN tạo tài khoản mới
   * - CHANGE_PASSWORD: người dùng đổi mật khẩu
   */
  getSystemSecurityLogs: (
    page = 0,
    size = 100,
  ): Promise<{
    success: boolean;
    code: string;
    message: string;
    data: SecurityLog[];
    meta?: PaginationMeta;
  }> => {
    return axiosClient.get('/activities/security', {
      params: buildPaginationParams(page, size),
    });
  },
};