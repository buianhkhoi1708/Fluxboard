import { create } from 'zustand';
import { notificationApi } from '../api/notificationApi';
import { toast } from 'react-toastify'; 

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

interface NotificationState {
    notifications: NotificationItem[];
    unreadCount: number;
    fetchNotifications: (page?: number) => Promise<void>;
    addNotification: (notif: NotificationItem) => void;
    markAsRead: (id: string) => Promise<void>;
    startLongPolling: () => void; 
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,

    fetchNotifications: async (page = 1) => {
        try {
            const response = await notificationApi.getMyNotifications(page);
            const rawData: any = response.data || response;
            const data: NotificationItem[] = rawData?.data?.content || rawData?.data || rawData?.content || [];
            
            set({ 
                notifications: data,
                unreadCount: data.filter((n: NotificationItem) => !n.is_read).length
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    },

    addNotification: (notif) => {
        set((state) => {
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
                notifications: state.notifications.map((n: NotificationItem) => 
                    n._id === id ? { ...n, is_read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    },

    // 💡 ĐỘNG CƠ LONG POLLING (PHIÊN BẢN DIỆT BÓNG MA VITE HMR)
    startLongPolling: async () => {
        // 🛑 Khóa chặt ở cấp độ Browser Window, cấm tuyệt đối việc tạo 2 vòng lặp!
        if ((window as any)._isPollingActive) return;
        (window as any)._isPollingActive = true;

        const poll = async () => {
            try {
                const response = await notificationApi.getLongPolling();
                const rawData: any = response.data || response;
                const newNotifs = Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData) ? rawData : []);

                if (newNotifs && newNotifs.length > 0) {
                    newNotifs.forEach((newNotif: NotificationItem) => {
                        // 1. Kiểm tra lớp khiên 1 (Có trong Store chưa?)
                        const isDuplicate = get().notifications.some(n => n._id === newNotif._id);
                        
                        if (!isDuplicate) {
                            get().addNotification(newNotif);
                            
                            // 2. Lớp khiên 2 (Thuốc đặc trị của react-toastify)
                            toast.info(newNotif.title || 'You have a new notification!', {
                                toastId: newNotif._id 
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Long polling connection error, retrying...', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            } finally {
                poll(); 
            }
        };

        poll();
    }
}));