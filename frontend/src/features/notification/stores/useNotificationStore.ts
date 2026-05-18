import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { NotificationStore, AppNotification } from '../types/notificationTypes';

// URL của Backend Spring Boot (Thay đổi port nếu cần)
const WEBSOCKET_URL = 'http://localhost:8080/ws'; 

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  stompClient: null,

  connectWebSocket: (userId: string) => {
    // Nếu đang kết nối rồi thì bỏ qua
    if (get().stompClient) return;

    const client = new Client({
      // Dùng SockJS làm fallback nếu trình duyệt không hỗ trợ WS chuẩn
      webSocketFactory: () => new SockJS(WEBSOCKET_URL),
      debug: (str) => console.log('STOMP: ' + str),
      reconnectDelay: 5000, // Tự động kết nối lại sau 5s nếu đứt cáp
      onConnect: () => {
        console.log('✅ Đã kết nối WebSocket thành công!');
        
        // Subscribe đúng cái kênh mà NotificationDispatcher.java đang gửi tới
        client.subscribe(`/topic/notifications/${userId}`, (message) => {
          if (message.body) {
            get().addNotification(message.body);
          }
        });
      },
      onStompError: (frame) => {
        console.error('❌ STOMP Error:', frame.headers['message']);
      },
    });

    client.activate();
    set({ stompClient: client });
  },

  disconnectWebSocket: () => {
    const client = get().stompClient;
    if (client) {
      client.deactivate();
      set({ stompClient: null });
      console.log('🔌 Đã ngắt kết nối WebSocket.');
    }
  },

  addNotification: (message: string) => {
    set((state) => {
      const newNotif: AppNotification = {
        id: Math.random().toString(36).substring(2, 9), // Random ID
        message: message,
        timestamp: Date.now(),
        isRead: false,
      };
      
      // Đẩy thông báo mới lên đầu mảng
      return {
        notifications: [newNotif, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  markAsRead: (id: string) => {
    set((state) => {
      const updatedNotifs = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return {
        notifications: updatedNotifs,
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));