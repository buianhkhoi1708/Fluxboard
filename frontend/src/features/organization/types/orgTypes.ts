// ==========================================
// 1. ENTITY INTERFACES
// ==========================================

export interface OrgMember {
  id?: string;
  user_id?: string; // Hỗ trợ trường hợp API search trả về user_id
  userId?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  email?: string;
  status?: string;
  avatar_url?: string;
}

export interface OrgTeam {
  id: string;
  name: string;
  code?: string;
  department_id?: string;
  lead_id?: string;
  leadId?: string;       // Bổ sung thêm đề phòng backend trả camelCase
  leadName?: string;
  lead_name?: string;
  description?: string;
  members: OrgMember[];
}

export interface OrgDepartment {
  id: string;
  name: string;
  code?: string;
  manager_id?: string;
  manager_name?: string;
  description?: string;
  status?: string;
  teams: OrgTeam[];
}

// ==========================================
// 2. UI STATE INTERFACES
// ==========================================

export interface OrgModalState {
  isOpen: boolean;
  mode: 'DEPARTMENT' | 'TEAM';
  action: 'CREATE' | 'EDIT'; // <--- Thêm dòng này
  targetDeptId: string | null;
  targetTeam: any | null;    // <--- Thêm dòng này
  targetDept?: any | null;
}

export interface OrgTargetIds {
  deptId: string | null;
  teamId: string | null;
}

export interface OrganizationPageProps {
  readOnly?: boolean;
}