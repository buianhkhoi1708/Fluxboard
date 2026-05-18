export interface Board {
  _id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface ProjectMember {
  _id: string;
  project_id: string;
  user_id: {
    _id: string;
    full_name: string;
    email: string;
    avatar_url: string;
  };
  role_id: {
    _id: string;
    name: string;
  };
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner_id: string;
  status: string;
  boards?: Board[];       // Trả về khi gọi getProjectDetail
  members?: ProjectMember[]; // Trả về khi gọi getProjectDetail
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
}

export interface AddMemberPayload {
  project_id: string;
  user_id: string;
  role_name: string; // VD: 'MEMBER', 'PM'
}