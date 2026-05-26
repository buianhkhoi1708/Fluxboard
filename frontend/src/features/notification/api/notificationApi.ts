import axiosClient from '../../../lib/axiosClient';

export interface RequestDeadlineExtensionPayload {
  new_due_date: string;
  reason: string;
}

export interface RejectDeadlineExtensionPayload {
  reject_reason?: string;
}

export const notificationApi = {
  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  // Lấy lịch sử thông báo phân trang từ MongoDB
  getNotificationHistory: (page = 1, size = 20) =>
    axiosClient.get('/notifications', {
      params: {
        page,
        limit: size,
      },
    }),

  // Đánh dấu một thông báo đã đọc
  markAsReadOnServer: (id: string) =>
    axiosClient.patch(`/notifications/${id}/read`),

  // Long polling nhận thông báo realtime
  listenToLongPolling: () =>
    axiosClient.get('/notifications/long-polling', {
      timeout: 35000,
    }),

  // ==========================================
  // DEADLINE EXTENSION
  // ==========================================

  // Nhân viên gửi yêu cầu xin dời hạn
  requestDeadlineExtension: (
    taskId: string,
    payload: RequestDeadlineExtensionPayload,
  ) =>
    axiosClient.post(`/deadlines/task/${taskId}/extend`, payload),

  // Admin/Sếp chấp nhận yêu cầu dời hạn
  approveDeadlineExtension: (taskId: string) =>
    axiosClient.put(`/deadlines/task/${taskId}/approve`),

  // Admin/Sếp từ chối yêu cầu dời hạn
  rejectDeadlineExtension: (
    taskId: string,
    rejectReason?: string,
  ) =>
    axiosClient.put(`/deadlines/task/${taskId}/reject`, {
      reject_reason: rejectReason || '',
    }),

  // Lấy thông tin deadline của task nếu FE cần xem trực tiếp
  getTaskDeadline: (taskId: string) =>
    axiosClient.get(`/deadlines/task/${taskId}`),
};

export default notificationApi;