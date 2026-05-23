import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingApi } from '../api/settingApi';
import { useAuthStore } from '../../auth/store/useAuthStore'; // Nạp store Zustand của hệ thống để đồng bộ danh tính toàn cục

export const SETTING_KEYS = {
  profile: ['settings', 'profile'] as const,
  notifications: ['settings', 'notifications'] as const,
  sessions: ['settings', 'sessions'] as const,
  logs: ['settings', 'logs'] as const,
};

export const useProfileOverview = () => {
  return useQuery({
    queryKey: SETTING_KEYS.profile,
    queryFn: async () => {
      const res: any = await settingApi.getProfileOverview();
      // Loại bỏ bớt 1 tầng .data do interceptor của axiosClient đã xử lý sẵn lớp bọc vỏ ngoài
      return res.data;
    }
  });
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: SETTING_KEYS.notifications,
    queryFn: async () => {
      const res: any = await settingApi.getNotificationSettings();
      return res.data;
    }
  });
};

export const useUpdateNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settingsData: any) => {
      const res: any = await settingApi.updateNotificationSettings(settingsData);
      return res.data;
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(SETTING_KEYS.notifications, updatedData);
    }
  });
};

export const useActiveSessions = () => {
  return useQuery({
    queryKey: SETTING_KEYS.sessions,
    queryFn: async () => {
      const res: any = await settingApi.getActiveSessions();
      return res.data;
    }
  });
};

export const useSecurityLogs = () => {
  return useQuery({
    queryKey: SETTING_KEYS.logs,
    queryFn: async () => {
      const res: any = await settingApi.getSecurityLogs();
      return res.data;
    }
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File | null }) => {
      let avatarUrl = undefined;

      if (file) {
        const presignedRes: any = await settingApi.getAvatarPresignedUrl(file.name, file.type);
        const { uploadUrl, fileUrl } = presignedRes.data;

        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });
        avatarUrl = fileUrl;
      }

      const updatePayload: { full_name: string; avatar_url?: string } = { full_name: name };
      if (avatarUrl) updatePayload.avatar_url = avatarUrl;

      const res: any = await settingApi.updateProfileInfo(updatePayload);
      return res.data; // Backend trả về tài liệu User dạng phẳng bao gồm { full_name, avatar_url, email }
    },
    onSuccess: (resData) => {
      // 💡 Bước 1: Cập nhật lại chuỗi dữ liệu trong localStorage để phòng hờ trường hợp F5 vẫn giữ tên mới
      const cachedUserRaw = localStorage.getItem('user');
      if (cachedUserRaw) {
        const userObj = JSON.parse(cachedUserRaw);
        userObj.full_name = resData.full_name;
        if (resData.avatar_url) userObj.avatar_url = resData.avatar_url;
        localStorage.setItem('user', JSON.stringify(userObj));
      }

      // 💡 Bước 2: Kích hoạt ghi đè trạng thái của Zustand Store để buộc TopNavbar re-render phản ứng ngay lập tức
      try {
        const authStore = useAuthStore.getState();
        if (authStore && authStore.user) {
          useAuthStore.setState({
            user: {
              ...authStore.user,
              full_name: resData.full_name,
              avatar_url: resData.avatar_url || authStore.user.avatar_url
            }
          });
        }
      } catch (error) {
        console.error('Failed to synchronize memory auth store state:', error);
      }

      // Làm mới dữ liệu cache của React Query ngầm
      queryClient.invalidateQueries({ queryKey: SETTING_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    }
  });
};

export const useSignOutAllSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingApi.signOutAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTING_KEYS.sessions });
    }
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingApi.revokeSessionById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTING_KEYS.sessions });
    }
  });
};