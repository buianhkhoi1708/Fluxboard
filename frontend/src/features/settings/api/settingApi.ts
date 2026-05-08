import axiosClient from '../../../lib/axiosClient'; // Nhớ điều chỉnh lại đường dẫn import này cho đúng với dự án của bạn

export const settingApi = {
  getNotificationSettings: () => {
    return axiosClient.get('/settings/notifications');
  },

  // Cập nhật cấu hình thông báo
  updateNotificationSettings: (settingsData: any) => {
    return axiosClient.put('/settings/notifications', settingsData);
  }
};