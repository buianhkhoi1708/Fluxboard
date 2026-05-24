import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

import { userApi } from '../../../features/user/api/userApi';
import { settingApi } from '../api/settingApi';

export const USER_KEYS = {
  me: ['user', 'me'] as const,
};

export const SETTING_KEYS = {
  notifications: ['settings', 'notifications'] as const,
};

// ======================================================
// UPDATE PROFILE
// ======================================================

export const useUpdateProfile = () => {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: async ({
      userId,
      name,
      file
    }: {
      userId: string | number;
      name: string;
      file: File | null;
    }) => {

      // ====================================
      // STEP 1
      // update name
      // ====================================

      await userApi.updateUser(
        userId,
        {
          full_name: name
        }
      );

      // ====================================
      // STEP 2
      // upload avatar
      // ====================================

      let avatarUrl: string | undefined;

      if (file) {

        const uploadRes =
          await userApi.uploadAvatar(
            String(userId),
            file
          );

        avatarUrl = uploadRes.url;
      }

      return {
        name,
        avatarUrl
      };
    },

    onSuccess: (data) => {

      // ====================================
      // UPDATE CACHE NGAY LẬP TỨC
      // ====================================

      queryClient.setQueryData(
        USER_KEYS.me,
        (old: any) => {

          if (!old) {
            return old;
          }

          return {
            ...old,

            full_name: data.name,

            avatar_url:
              data.avatarUrl
                ? `${data.avatarUrl}?t=${Date.now()}`
                : old.avatar_url
          };
        }
      );

      // ====================================
      // BACKGROUND REFETCH
      // ====================================

      queryClient.invalidateQueries({
        queryKey: USER_KEYS.me
      });
    },

    onError: (error) => {
      console.error(
        'Update profile failed:',
        error
      );
    }
  });
};

// ======================================================
// NOTIFICATION SETTINGS
// ======================================================

export const useNotificationSettings = () => {

  return useQuery({
    queryKey:
      SETTING_KEYS.notifications,

    queryFn:
      settingApi.getNotificationSettings,
  });
};

export const useUpdateNotifications = () => {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn:
      settingApi.updateNotificationSettings,

    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey:
          SETTING_KEYS.notifications
      });
    }
  });
};