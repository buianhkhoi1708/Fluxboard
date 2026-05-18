import axiosClient from '../../../lib/axiosClient';

export const notificationApi = {
  // 💡 Lấy danh sách thông báo cá nhân có phân trang
  getMyNotifications: (page = 1) => axiosClient.get('/api/v1/notifications', { params: { page } }),
  
  // 💡 Đánh dấu một thông báo cụ thể là đã đọc
  markAsRead: (id: string) => axiosClient.put(`/api/v1/notifications/${id}/read`),
  
  // 💡 Đồng bộ long polling để liên tục nhận thông báo mới từ backend
  getLongPolling: () => axiosClient.get('/api/v1/notifications/poll')
};