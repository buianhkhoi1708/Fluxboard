export interface OrgMember {
  id?: string;
  user_id?: string;
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
  leadId?: string;
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

export interface OrgModalState {
  isOpen: boolean;
  mode: "DEPARTMENT" | "TEAM";
  action: "CREATE" | "EDIT";
  targetDeptId: string | null;
  targetTeam: any | null;
  targetDept?: any | null;
}

export interface OrgTargetIds {
  deptId: string | null;
  teamId: string | null;
}

export interface OrganizationPageProps {
  readOnly?: boolean;
}
