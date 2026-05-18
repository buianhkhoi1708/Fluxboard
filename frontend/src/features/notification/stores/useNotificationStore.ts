import { create } from 'zustand';
import { notificationApi } from '../api/notificationApi';
import { toast } from 'react-toastify'; 

export interface AppNotification {
  id: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  addNotification: (message: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  startLongPolling: () => void; 
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const response = await notificationApi.getMyNotifications();
      const rawData: any = response.data || response;
      
      // Chuyển đổi dữ liệu MongoDB sang định dạng id, isRead, timestamp của Frontend
      const data = (rawData?.data?.content || rawData?.data || rawData || []).map((n: any) => ({
        id: n._id || n.id,
        message: n.message,
        timestamp: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
        isRead: n.is_read !== undefined ? n.is_read : n.isRead,
      }));

      set({ 
        notifications: data,
        unreadCount: data.filter((n: any) => !n.isRead).length
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  },

  addNotification: (message: string) => {
    set((state) => {
      const newNotif: AppNotification = {
        id: Math.random().toString(36).substring(2, 9), 
        message: message,
        timestamp: Date.now(),
        isRead: false,
      };
      
      return {
        notifications: [newNotif, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  markAsRead: async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      set((state) => {
        const updatedNotifs = state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        return {
          notifications: updatedNotifs,
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      const storeState = useNotificationStore.getState();
      const unreadNotifications = storeState.notifications.filter((n) => !n.isRead);
      
      await Promise.all(unreadNotifications.map((n) => notificationApi.markAsRead(n.id)));

      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },

  startLongPolling: async () => {
    if ((window as any)._isPollingActive) return;
    (window as any)._isPollingActive = true;

    const poll = async () => {
      try {
        const response = await notificationApi.getLongPolling();
        const rawData: any = response.data || response;
        const newNotifs = Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData) ? rawData : []);

        if (newNotifs && newNotifs.length > 0) {
          newNotifs.forEach((n: any) => {
            const storeState = useNotificationStore.getState();
            const targetId = n._id || n.id;
            const isDuplicate = storeState.notifications.some(item => item.id === targetId);
            
            if (!isDuplicate) {
              const formattedNotif: AppNotification = {
                id: targetId,
                message: n.message,
                timestamp: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
                isRead: n.is_read !== undefined ? n.is_read : n.isRead,
              };

              set((state) => ({
                notifications: [formattedNotif, ...state.notifications],
                unreadCount: state.unreadCount + 1,
              }));

              toast.info(n.title || 'You have a new notification!', {
                toastId: targetId
              });
            }
          });
        }
      } catch (error) {
        console.error('Long polling connection error, retrying...', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      poll(); 
    };

    poll();
  }
}));