import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingApi, NotificationSettingsPayload } from '../api/settingApi';
import { useAuthStore } from '../../auth/store/useAuthStore';

export const SETTING_KEYS = {
  profile: ['settings', 'profile'] as const,
  notifications: ['settings', 'notifications'] as const,
  sessions: ['settings', 'sessions'] as const,
  logs: ['settings', 'logs'] as const,
};

const unwrapData = (res: any) => {
  return res?.data?.data ?? res?.data ?? res;
};

const normalizeNotificationSettings = (raw: any): NotificationSettingsPayload => {
  return {
    email_notifications: raw?.email_notifications ?? true,
    push_notifications: raw?.push_notifications ?? true,
    task_deadline_reminders: raw?.task_deadline_reminders ?? true,
  };
};

export const useProfileOverview = () => {
  return useQuery({
    queryKey: SETTING_KEYS.profile,
    queryFn: async () => {
      const res: any = await settingApi.getProfileOverview();
      return unwrapData(res);
    },
  });
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: SETTING_KEYS.notifications,
    queryFn: async () => {
      const res: any = await settingApi.getNotificationSettings();
      return normalizeNotificationSettings(unwrapData(res));
    },
  });
};

export const useUpdateNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData: NotificationSettingsPayload) => {
      const res: any = await settingApi.updateNotificationSettings(settingsData);
      return normalizeNotificationSettings(unwrapData(res));
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(SETTING_KEYS.notifications, updatedData);
    },
  });
};

export const useActiveSessions = () => {
  return useQuery({
    queryKey: SETTING_KEYS.sessions,
    queryFn: async () => {
      const res: any = await settingApi.getActiveSessions();
      return unwrapData(res);
    },
  });
};

export const useSecurityLogs = () => {
  return useQuery({
    queryKey: SETTING_KEYS.logs,
    queryFn: async () => {
      const res: any = await settingApi.getSecurityLogs();
      return unwrapData(res);
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File | null }) => {
      let avatarUrl = undefined;

      if (file) {
        const uploadRes: any = await settingApi.uploadAvatar(file);
        const uploadData = unwrapData(uploadRes);
        avatarUrl = uploadData?.url;
      }

      const updatePayload: { full_name: string; avatar_url?: string } = {
        full_name: name,
      };

      if (avatarUrl) {
        updatePayload.avatar_url = avatarUrl;
      }

      const res: any = await settingApi.updateProfileInfo(updatePayload);
      return unwrapData(res);
    },
    onSuccess: (resData) => {
      const cachedUserRaw = localStorage.getItem('user');

      if (cachedUserRaw) {
        const userObj = JSON.parse(cachedUserRaw);
        userObj.full_name = resData.full_name;
        userObj.fullName = resData.full_name;

        if (resData.avatar_url) {
          userObj.avatar_url = resData.avatar_url;
          userObj.avatarUrl = resData.avatar_url;
        }

        localStorage.setItem('user', JSON.stringify(userObj));
      }

      try {
        const authStore = useAuthStore.getState();

        if (authStore && authStore.user) {
          useAuthStore.setState({
            user: {
              ...authStore.user,
              full_name: resData.full_name,
              fullName: resData.full_name,
              avatar_url: resData.avatar_url || authStore.user.avatar_url,
              avatarUrl: resData.avatar_url || authStore.user.avatarUrl,
            },
          });
        }
      } catch (error) {
        console.error('Failed to synchronize memory auth store state:', error);
      }

      queryClient.invalidateQueries({ queryKey: SETTING_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
};

export const useSignOutAllSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingApi.signOutAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTING_KEYS.sessions });
    },
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingApi.revokeSessionById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTING_KEYS.sessions });
    },
  });
};