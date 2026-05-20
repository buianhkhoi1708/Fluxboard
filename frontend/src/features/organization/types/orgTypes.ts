
export interface OrgMember {
  id: string; // Đã được Adapter tự động chuyển từ _id sang id
  user_id?: string; 
  full_name: string;
  email: string;
  status?: string;
  avatar_url?: string;
}

export interface OrgTeam {
  id: string; // Đã chuyển đổi từ _id
  name: string;
  code?: string;
  department_id?: string;
  lead_id?: string;
  description?: string;
  members: OrgMember[];
}

export interface OrgDepartment {
  id: string; // Đã chuyển đổi từ _id
  name: string;
  code?: string;
  manager_id?: string;
  manager_name?: string;
  description?: string;
  status?: string;
  teams: OrgTeam[];
}


export interface OrgModalState {
  isOpen: boolean;
  mode: 'DEPARTMENT' | 'TEAM';
  action: 'CREATE' | 'EDIT'; 
  targetDeptId: string | null;
  targetTeam: any | null;
  targetDept: any | null;
}

export interface OrgTargetIds {
  deptId: string | null;
  teamId: string | null;
}

export interface OrganizationPageProps {}