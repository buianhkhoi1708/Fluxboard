import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../../features/user/api/userApi';
import { settingApi } from '../../settings/api/settingApi';

export const SETTING_KEYS = {
  notifications: ['settings', 'notifications'] as const,
};

//cập nhật Profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, name, file }: { userId: string | number, name: string, file: File | null }) => {
      await userApi.updateMyProfile({ full_name: name });

      if (file) {
        const uploadRes: any = await userApi.uploadAvatar(userId || 'me', file);
        return { name, avatarUrl: uploadRes.url || uploadRes.data?.url };
      }
      return { name };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    }
  });
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: SETTING_KEYS.notifications,
    queryFn: settingApi.getNotificationSettings,
  });
};

export const useUpdateNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingApi.updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTING_KEYS.notifications });
    }
  });
};