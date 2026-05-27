import axiosClient from '../../../lib/axiosClient';

export interface AdminDashboardData {
  organization_kpi: { total_active_members: number; total_departments: number; total_teams: number };
  company_deadline_health: { on_track: number; at_risk: number; overdue: number; total_extensions_this_week: number };
  department_performance: Array<{ department_id: string; department_name: string; on_time_rate: number; overdue_tasks: number }>;
}

export interface DashboardAssignee {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  email?: string;
}

export interface ManagerDashboardData {
  team_workload_capacity: Array<{
    team_id: string;
    team_name: string;
    team_code?: string;
    completed_points: number;
    total_points: number;
    completion_rate: number;
    member_count: number;
    status: 'NO_DATA' | 'IN_PROGRESS' | 'DONE' | string;
  }>;
  team_deadline_status?: { on_track: number; at_risk: number; overdue: number };
  at_risk_tasks: Array<{
    task_id: string;
    title: string;
    story_point: number;
    priority: string;
    due_date: string | null;
    deadline_status: 'OVERDUE' | 'AT_RISK' | string;
    extension_count: number;
    project_id?: string;
    project_name?: string;
    board_id?: string;
    board_name?: string;
    hours_left?: number | null;
    assignees?: DashboardAssignee[];
  }>;
  ai_efficiency: Array<{
    project_id: string;
    project_name: string;
    task_title?: string;
    ai_suggested_point: number;
    actual_point: number;
    tasks_count: number;
    boards_count: number;
    needs_ai_scan?: boolean;
  }>;
}

export interface AiDeviationInsight {
  project_id: string;
  project_name?: string;
  ai_suggested_point: number;
  actual_point: number;
  deviation_percent: number;
  status: 'ACCURATE' | 'UNDERESTIMATED' | 'OVERESTIMATED' | string;
  comment: string;
  tasks_count: number;
  scanned_tasks_count?: number;
  tasks?: Array<{
    task_id: string;
    title: string;
    suggested_point: number;
    actual_point: number;
    deviation_percent: number;
    status: string;
    comment: string;
  }>;
}

export interface MemberDashboardData {
  my_contribution: { tasks_completed_this_week: number; total_assigned: number; on_time_rate: number };
  my_focus_board: Array<{
    task_id: string;
    title: string;
    priority: string;
    story_point?: number;
    due_date: string | null;
    deadline_status: string;
    extensions_used: number;
    extension_limit: number;
  }>;
}

export interface DashboardFilters {
  time_range?: string;
  department_id?: string;
  team_id?: string;
}

export type DashboardResponse = Partial<AdminDashboardData> & Partial<ManagerDashboardData> & Partial<MemberDashboardData>;

const unwrapResponse = <T = any>(res: any): T => {
  return res?.data ?? res ?? {};
};

export const dashboardApi = {
  getMetrics: async (params?: DashboardFilters): Promise<DashboardResponse> => {
    const res: any = await axiosClient.get('/dashboard/metrics', { params });
    return unwrapResponse<DashboardResponse>(res);
  },

  getAdminMetrics: async (params?: DashboardFilters): Promise<DashboardResponse> => dashboardApi.getMetrics(params),
  getManagerMetrics: async (params?: DashboardFilters): Promise<DashboardResponse> => dashboardApi.getMetrics(params),
  getLeadMetrics: async (params?: DashboardFilters): Promise<DashboardResponse> => dashboardApi.getMetrics(params),
  getMemberMetrics: async (params?: DashboardFilters): Promise<DashboardResponse> => dashboardApi.getMetrics(params),

  getAiDeviationInsights: async (projectId: string): Promise<AiDeviationInsight> => {
    const res: any = await axiosClient.get(`/ai/deviation/${projectId}`);
    return unwrapResponse<AiDeviationInsight>(res);
  },
};