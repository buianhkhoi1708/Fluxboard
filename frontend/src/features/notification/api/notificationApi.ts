import axiosClient from '../../../lib/axiosClient'; 

export const notificationApi = {
    // Thêm type number cho page và limit
    getMyNotifications: (page: number = 1, limit: number = 20) => {
        return axiosClient.get(`/notifications`, { params: { page, limit } });
    },
    
    // Thêm type string cho id
    markAsRead: (id: string) => {
        return axiosClient.patch(`/notifications/${id}/read`);
    },

    getLongPolling: () => {
        return axiosClient.get('/notifications/long-polling');
    }
};