export interface AppNotification {
  id: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

export interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  stompClient: any | null; // Kiểu Client của @stomp/stompjs
  
  // Hành động WebSocket
  connectWebSocket: (userId: string) => void;
  disconnectWebSocket: () => void;
  
  // Hành động UI
  addNotification: (message: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}