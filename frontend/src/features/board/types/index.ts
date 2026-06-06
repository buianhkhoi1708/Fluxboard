export type PriorityLevel = "Low" | "Medium" | "High" | "Critical";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | string;
export type TaskModalInitialFocus = "detail" | "comments";

export interface TaskCommentUser {
  id?: string;
  _id?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  email?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
}

export interface TaskComment {
  id?: string;
  _id?: string;
  task_id?: string;
  taskId?: string;
  user_id?: string | TaskCommentUser;
  user?: TaskCommentUser;
  content: string;
  is_resolved?: boolean;
  isResolved?: boolean;
  resolved_by_user_id?: string | TaskCommentUser | null;
  resolvedByUserId?: string | TaskCommentUser | null;
  resolved_at?: string | null;
  resolvedAt?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface Task {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  priority?: PriorityLevel | string;
  status?: TaskStatus;
  story_points?: number;
  story_point?: number;
  estimated_days?: number;
  start_date?: string | null;
  due_date?: string | null;
  parent_task_id?: string | null;
  column_id?: string;
  assignees_user_id?: string[] | any[];
  assigneesUserId?: string[] | any[];
  assignees?: any[];
  assignee_id?: string | any;
  assignee_ids?: string[] | any[];
  subtasks?: Task[];
  is_done?: boolean;
  ai_estimation_reason?: string;
  ai_suggested_points?: number;
}

export interface BoardColumn {
  id?: string;
  _id?: string;
  list_name: string;
  name?: string;
  title?: string;
  order?: number;
  tasks: Task[];
  project_id?: string;
  projectId?: string;
}

export interface Board {
  id?: string;
  _id?: string;
  name?: string;
  board_name: string;
  projectId?: string;
  project_id?: string;
  project?: any;
  columns: BoardColumn[];
}

export interface ColumnProps {
  list: BoardColumn;
  onOpenTaskDetail?: (taskId: string, mode?: TaskModalInitialFocus) => void;
}

export interface TaskItemProps {
  task: Task;
  listId: string;
  isOverlay?: boolean;
}

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  listId: string;
  initialFocus?: TaskModalInitialFocus;
}

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
}
