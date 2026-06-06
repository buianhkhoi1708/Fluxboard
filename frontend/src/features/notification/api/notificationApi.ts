import axiosClient from "../../../lib/axiosClient";

export interface RequestDeadlineExtensionPayload {
  new_due_date: string;
  reason: string;
}

export interface RejectDeadlineExtensionPayload {
  reject_reason?: string;
}

export const notificationApi = {
  getNotificationHistory: (page = 1, size = 20) =>
    axiosClient.get("/notifications", {
      params: {
        page,
        limit: size,
      },
    }),
  markAsReadOnServer: (id: string) =>
    axiosClient.patch(`/notifications/${id}/read`),
  listenToLongPolling: () =>
    axiosClient.get("/notifications/long-polling", {
      timeout: 35000,
    }),

  requestDeadlineExtension: (
    taskId: string,
    payload: RequestDeadlineExtensionPayload,
  ) => axiosClient.post(`/deadlines/task/${taskId}/extend`, payload),

  approveDeadlineExtension: (taskId: string) =>
    axiosClient.put(`/deadlines/task/${taskId}/approve`),

  rejectDeadlineExtension: (taskId: string, rejectReason?: string) =>
    axiosClient.put(`/deadlines/task/${taskId}/reject`, {
      reject_reason: rejectReason || "",
    }),

  getTaskDeadline: (taskId: string) =>
    axiosClient.get(`/deadlines/task/${taskId}`),
};

export default notificationApi;
