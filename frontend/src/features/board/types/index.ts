// features/board/types/boardTypes.ts

// 1. CÁC TYPE CƠ BẢN
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | string;

// 2. INTERFACE CHO TASK & SUBTASK
export interface Task {
  id?: string;
  _id?: string; // Hỗ trợ cả MongoDB ID nếu backend trả về
  title: string;
  description?: string;
  priority?: PriorityLevel | string;
  status?: TaskStatus;
  
  // Hỗ trợ cả 2 chuẩn naming convention (phòng ngừa backend trả về lệch)
  story_points?: number;
  story_point?: number;
  estimated_days?: number;
  
  start_date?: string | null;
  due_date?: string | null;
  parent_task_id?: string | null;
  column_id?: string;
  
  // Xử lý linh hoạt danh sách người được gán
  assignees_user_id?: string[] | any[];
  assigneesUserId?: string[] | any[];
  assignees?: any[];
  
  // Việc con và AI
  subtasks?: Task[]; 
  is_done?: boolean; // Dành cho subtask
  ai_estimation_reason?: string;
  ai_suggested_points?: number;
}

// 3. INTERFACE CHO COLUMN (LIST)
export interface BoardColumn {
  id?: string;
  _id?: string;
  list_name: string;
  order?: number;
  tasks: Task[];
  project_id?: string;
  projectId?: string;
}

// 4. INTERFACE CHO BOARD
export interface Board {
  id?: string;
  _id?: string;
  board_name: string;
  projectId?: string;
  project_id?: string;
  columns: BoardColumn[];
}

// ==========================================
// 5. INTERFACES CHO COMPONENT PROPS
// ==========================================

export interface ColumnProps {
  list: BoardColumn;
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
}

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
}