// src/features/dashboard/api/dashboardApi.ts
import axiosClient from '../../../lib/axiosClient';

// ==========================================
// INTERFACE KHỚP VỚI DTO BACKEND JAVA
// ==========================================

export interface AdminDashboardData {
  organization_kpi: {
    total_users: number;
    total_departments: number;
    total_teams: number;
  };
  company_deadline_health: {
    on_track: number;
    at_risk: number;
    overdue: number;
    total_extensions: number;
  };
  department_points_distribution: Array<{
    department_id: string;
    total_points: number;
    completed_points: number;
    overdue_tasks: number;
  }>;
}

export interface ManagerDashboardData {
  team_workload_capacity: Array<{
    user_id: string;
    full_name: string;
    current_points: number;
    status: string; // "AVAILABLE" hoặc "OVERLOADED"
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

// Kiểu dữ liệu gộp chung (Tùy role mà Backend sẽ trả về trường tương ứng)
export type DashboardResponse = AdminDashboardData & ManagerDashboardData & MemberDashboardData;

// ==========================================
// API CALL - 1 ĐƯỜNG DẪN DUY NHẤT
// ==========================================
export const dashboardApi = {
  getMetrics: async (params?: { time_range?: string; department_id?: string; team_id?: string }): Promise<DashboardResponse> => {
    
    // axiosClient trả về cục JSON bọc ngoài của Spring Boot
    const res: any = await axiosClient.get('/dashboard/metrics', { params });
    
    // 🚀 BÓC VỎ JAVA: Lấy cái lõi res.data trả về cho Frontend dùng
    return res.data; 
  },
};