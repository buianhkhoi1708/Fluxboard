// src/features/dashboard/api/dashboardApi.ts

import axiosClient from '../../../lib/axiosClient';

// ==========================================
// ADMIN (Đã cập nhật chuẩn theo JSON mới)
// ==========================================

export interface AdminDashboardData {
  organization_kpi: {
    total_active_members: number;
    total_departments: number;
    total_teams: number;
  };

  company_deadline_health: {
    on_track: number;
    at_risk: number;
    overdue: number;
    total_extensions_this_week: number;
  };

  department_performance: Array<{
    department_id: string;
    department_name: string;
    on_time_rate: number;
    overdue_tasks: number;
  }>;
}

// ==========================================
// MANAGER
// ==========================================

export interface ManagerDashboardData {
  team_workload_capacity: Array<{
    user_id: string;
    full_name: string;
    current_points: number;
    status: string;
  }>;

  at_risk_tasks: Array<{
    task_id: string;
    title: string;
    story_point: number;
    priority: string;
    due_date: string;
    deadline_status: string;
    extension_count: number;
  }>;

  ai_efficiency: Array<{
    task_title: string;
    ai_suggested_point: number;
    actual_point: number;
  }>;
}

// ==========================================
// MEMBER
// ==========================================

export interface MemberDashboardData {
  my_contribution: {
    completed_tasks: number;
    total_assigned: number;
  };

  my_focus_board: Array<{
    task_id: string;
    title: string;
    priority: string;
    story_point: number;
    due_date: string;
    deadline_status: string;
    extensions_used: number;
  }>;
}

// ==========================================
// DASHBOARD RESPONSE
// ==========================================

export type DashboardResponse =
  Partial<AdminDashboardData> &
  Partial<ManagerDashboardData> &
  Partial<MemberDashboardData>;

// ==========================================
// API
// ==========================================

export const dashboardApi = {
  getMetrics: async (
    params?: { time_range?: string; department_id?: string; team_id?: string; }
  ): Promise<DashboardResponse> => {
    // Ép kiểu res thành any vì axiosClient đã bóc vỏ thành ApiResponse
    const res: any = await axiosClient.get(
      '/dashboard/metrics',
      { params }
    );
    
    // Do Interceptor trả về thẳng object { success, data }
    // Nên res.data chính là cái lõi chứa organization_kpi mà ta cần!
    return res?.data || ({} as DashboardResponse);
  },
};