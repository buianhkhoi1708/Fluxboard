import { IncomingUser } from '../../user/store/useUserStore';

// Cấu trúc Response bọc ngoài của Backend
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Kiểu dữ liệu của Project
export interface Project {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  departmentId?: string;
  is_deleted?: boolean;
}

// Kiểu dữ liệu của Board
export interface Board {
  id: string;
  _id?: string;
  name: string;
  project_id?: string;
}

// Kiểu dữ liệu của Task (Công việc)
export interface Task {
  id: string;
  _id?: string;
  name: string;
  status?: string; 
}

// Cấu trúc trả về khi gọi API lấy Tổng quan Project (Kèm theo Boards, Members, Tasks)
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