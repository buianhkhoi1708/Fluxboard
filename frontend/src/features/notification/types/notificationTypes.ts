export interface NotificationMetadata {
  task_id?: string;
  board_id?: string;
  task_title?: string;
  priority?: string;

  requester_id?: string;
  requester_name?: string;

  current_due_date?: string | Date | null;
  requested_due_date?: string | Date | null;
  approved_due_date?: string | Date | null;

  reason?: string;
  reject_reason?: string;

  destination_column_id?: string;
  destination_column_name?: string;

  due_date?: string | Date | null;
  is_overdue?: boolean;

  completed_by_id?: string;
  completed_by_name?: string;
  completed_at?: string | Date | null;

  [key: string]: any;
}

export interface AppNotification {
  id: string;

  title?: string;
  message: string;
  type?: string;

  referenceId?: string;
  referenceType?: string;

  /**
   * URL nội bộ frontend.
   * Ví dụ: /board/:boardId?taskId=:taskId
   */
  actionUrl?: string;

  /**
   * Dữ liệu phụ để dựng popup hoặc điều hướng.
   */
  metadata?: NotificationMetadata;

  timestamp: number;
  isRead: boolean;
}

export interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;

  /**
   * Giữ lại field này để không làm vỡ code cũ,
   * dù hiện tại pipeline chính đang dùng Long Polling.
   */
  stompClient: any | null;

  // Realtime pipeline
  connectWebSocket: (userId: string) => Promise<void> | void;
  disconnectWebSocket: () => void;

  // UI actions
  addNotification: (message: string, extra?: Partial<AppNotification>) => void;
  markAsRead: (id: string) => Promise<void> | void;
  markAllAsRead: () => Promise<void> | void;
}