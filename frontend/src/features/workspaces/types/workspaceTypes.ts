import { IncomingUser } from "../../user/store/useUserStore";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Project {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  departmentId?: string;
  is_deleted?: boolean;
}

export interface Board {
  id: string;
  _id?: string;
  name: string;
  project_id?: string;
}

export interface Task {
  id: string;
  _id?: string;
  name: string;
  status?: string;
}

export interface WorkspaceOverview {
  project: Project;
  boards: Board[];
  members: IncomingUser[];
  tasks?: Task[];
}
export interface CreateProjectPayload {
  name: string;
  description?: string;
  departmentId?: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload> & {
  is_deleted?: boolean;
};

export interface CreateBoardPayload {
  project_id: string;
  name: string;
}
