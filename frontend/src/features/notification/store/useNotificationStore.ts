import { create } from 'zustand';
import { notificationApi } from '../api/notificationApi';

// 1. Khai báo kiểu dữ liệu cho 1 đối tượng thông báo
export interface NotificationItem {
    _id: string;
    title?: string;
    message: string;
    is_read: boolean;
    type: string;
    created_at: string;
    sender_id?: { full_name: string; avatar_url: string };
    reference_id?: string;
}

// 2. Khai báo kiểu dữ liệu cho toàn bộ State của Zustand
interface NotificationState {
    notifications: NotificationItem[];
    unreadCount: number;
    fetchNotifications: (page?: number) => Promise<void>;
    addNotification: (notif: NotificationItem) => void;
    markAsRead: (id: string) => Promise<void>;
}

// 3. Khởi tạo store với Type
export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,

    fetchNotifications: async (page = 1) => {
        try {
            const response = await notificationApi.getMyNotifications(page);
            // Ép kiểu mảng trả về thành mảng NotificationItem[]
            const data: NotificationItem[] = response.data?.data?.content || response.data?.content || [];
            
            set({ 
                notifications: data,
                // Đã khai báo n là NotificationItem
                unreadCount: data.filter((n: NotificationItem) => !n.is_read).length
            });
        } catch (error) {
            console.error('Lỗi tải thông báo:', error);
        }
    },

    addNotification: (notif) => {
        set((state) => {
            // Đã khai báo n là NotificationItem
            if (state.notifications.some((n: NotificationItem) => n._id === notif._id)) return state;
            
            return {
                notifications: [notif, ...state.notifications],
                unreadCount: state.unreadCount + 1
            };
        });
    },

    markAsRead: async (id) => {
        try {
            await notificationApi.markAsRead(id);
            set((state) => ({
                // Đã khai báo n là NotificationItem
                notifications: state.notifications.map((n: NotificationItem) => 
                    n._id === id ? { ...n, is_read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }));
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã đọc:', error);
        }
    }
}));