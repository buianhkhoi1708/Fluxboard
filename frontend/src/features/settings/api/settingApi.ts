import axiosClient from '../../../lib/axiosClient';

export interface NotificationSettingsPayload {
  email_notifications: boolean;
  push_notifications: boolean;
  task_deadline_reminders: boolean;
}

export const settingApi = {
  /**
   * =========================================================
   * PROFILE
   * =========================================================
   */

  getProfileOverview: () => {
    return axiosClient.get('/settings/profile');
  },

  updateProfileInfo: (
    profileData: {
      full_name?: string;
      avatar_url?: string;
    },
  ) => {
    return axiosClient.put('/settings/profile', profileData);
  },

  /**
   * =========================================================
   * UPLOAD AVATAR
   * =========================================================
   */

  uploadAvatar: (file: File) => {
    const formData = new FormData();

    formData.append('file', file);

    return axiosClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * =========================================================
   * SECURITY
   * =========================================================
   */

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

  /**
   * =========================================================
   * NOTIFICATION
   * =========================================================
   */

  getNotificationSettings: () => {
    return axiosClient.get('/settings/notifications');
  },

  updateNotificationSettings: (settingsData: NotificationSettingsPayload) => {
    return axiosClient.put('/settings/notifications', {
      email_notifications: !!settingsData.email_notifications,
      push_notifications: !!settingsData.push_notifications,
      task_deadline_reminders: !!settingsData.task_deadline_reminders,
    });
  },

  /**
   * =========================================================
   * 2FA
   * =========================================================
   */

  setup2FA: () => {
    return axiosClient.post('/settings/security/2fa/setup');
  },

  toggle2FA: (data: { enable: boolean; code: string }) => {
    return axiosClient.put('/settings/security/2fa/toggle', data);
  },

  /**
   * =========================================================
   * SECURITY LOGS
   * =========================================================
   */

  getSecurityLogs: () => {
    return axiosClient.get('/settings/security/logs');
  },
};