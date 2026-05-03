// src/features/dashboard/api/dashboardApi.ts
import axiosClient from '../../../lib/axiosClient'; // Điều chỉnh path phù hợp với cấu trúc dự án của bạn

// ==========================================
// INTERFACE CHO DỮ LIỆU TỪ BACKEND
// ==========================================

export interface AdminDashboardData {
  cards: {
    total_users: number;
    total_members: number;
    projects: {
      active: number;
      archived: number;
      total: number;
    };
    total_departments: number;
  };
  project_status_distribution: Array<{
    status: string;
    count: number;
    color: string;
  }>;
  at_risk_projects: Array<{
    id?: string;
    name: string;
    status: string;
  }>;
  audit_logs: Array<{
    id: string;
    actor: string;
    action: string;
    severity: string;
    created_at?: string;
  }>;
}

export interface ManagerDashboardData {
  weekly_progress: Array<Record<string, any>>;
  task_completion_by_team: Array<{
    team: string;
    percentage: number;
  }>;
  ai_vs_actual_points: Array<{
    task_id: string;
    ai_point: number;
    actual_point: number;
  }>;
}

export interface LeadDashboardData {
  team_workload: Array<{
    user_id: string;
    name: string;
    total_points: number;
  }>;
  at_risk_tasks: Array<{
    id: string;
    title: string;
    due_date: string;
    priority: string;
    reason: string;
    assignee_name?: string;
  }>;
  recent_activities: Array<{
    user: string;
    content: string;
    time: string;
  }>;
}

export interface MemberDashboardData {
  my_contribution: {
    completed: number;
    total: number;
  };
  my_focus: Array<{
    id: string;
    title: string;
    priority: string;
    due_date: string;
  }>;
  sprint_history?: Array<{
    name: string;
    velocity: number;
    transparency: number;
    trend: number;
  }>;
}

// ==========================================
// API CALLS – SỬ DỤNG AXIOS CLIENT ĐÃ CẤU HÌNH
// ==========================================

export const dashboardApi = {
  // Admin
  getAdminMetrics: async (): Promise<AdminDashboardData> => {
    // axiosClient trả về chính là response.data nhờ interceptor
    return await axiosClient.get('/dashboard/admin');
  },

  // Manager
  getManagerMetrics: async (): Promise<ManagerDashboardData> => {
    return await axiosClient.get('/dashboard/manager');
  },

  // Lead
  getLeadMetrics: async (): Promise<LeadDashboardData> => {
    return await axiosClient.get('/dashboard/lead');
  },

  // Member
  getMemberMetrics: async (): Promise<MemberDashboardData> => {
    return await axiosClient.get('/dashboard/member');
  },
};