import axiosClient from '../../../lib/axiosClient';

export const settingApi = {
  // Luồng 1: Trích xuất và cập nhật hồ sơ cá nhân / tổ chức liên kết
  getProfileOverview: () => {
    return axiosClient.get('/settings/profile');
  },

  updateProfileInfo: (profileData: { full_name?: string; avatar_url?: string }) => {
    return axiosClient.put('/settings/profile', profileData);
  },

  getAvatarPresignedUrl: (fileName: string, contentType: string) => {
    return axiosClient.get('/media/presigned-url', {
      params: { fileName, contentType }
    });
  },

  // Luồng 2: Quản lý bảo mật thông tin tin cậy & phiên thiết bị
  changePassword: (passwordData: any) => {
    return axiosClient.put('/settings/security/password', passwordData);
  },

  getActiveSessions: () => {
    return axiosClient.get('/settings/security/sessions');
  },

  signOutAllSessions: () => {
    return axiosClient.delete('/settings/security/sessions');
  },

  revokeSessionById: (sessionId: string) => {
    return axiosClient.delete(`/settings/security/sessions/${sessionId}`);
  },

  // Luồng 3: Đồng bộ tùy chọn trung tâm thông báo (Notification Preferences)
  getNotificationSettings: () => {
    return axiosClient.get('/settings/notifications');
  },

  updateNotificationSettings: (settingsData: any) => {
    return axiosClient.put('/settings/notifications', settingsData);
  },

  // Luồng nâng cao bổ sung: Xác thực hai lớp (2FA) & Nhật ký bảo mật
  setup2FA: () => {
    return axiosClient.post('/settings/security/2fa/setup');
  },

  toggle2FA: (data: { enable: boolean; code: string }) => {
    return axiosClient.put('/settings/security/2fa/toggle', data);
  },

  getSecurityLogs: () => {
    return axiosClient.get('/settings/security/logs');
  }
};