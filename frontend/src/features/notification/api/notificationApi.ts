import axiosClient from '../../../lib/axiosClient';

export const notificationApi = {
  // Tương lai nếu sếp có endpoint lưu thông báo vào DB:
  // getNotificationHistory: (page = 0, size = 20) => axiosClient.get('/notifications', { params: { page, size } }),
  // markAsReadOnServer: (id: string) => axiosClient.put(`/notifications/${id}/read`),
};