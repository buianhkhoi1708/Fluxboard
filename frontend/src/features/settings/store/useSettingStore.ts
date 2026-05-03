import { create } from 'zustand';
import { settingApi } from '../api/settingApi';
import { userApi } from '../../user/api/userApi'; 

interface SettingState {
  // --- States ---
  isSaving: boolean;
  message: { type: 'success' | 'error' | ''; text: string };
  
  notificationToggles: {
    tasks: boolean;
    comments: boolean;
    reminders: boolean;
    announcements: boolean;
    messages: boolean;
    mentions: boolean;
  };

  // --- Actions ---
  setMessage: (type: 'success' | 'error' | '', text: string) => void;
  clearMessage: () => void;
  
  // Profile Logic
  saveProfile: (params: { 
    userId: string | number; 
    name: string; 
    selectedFile: File | null; 
    currentAvatar: string; 
    updateAuthStore: (data: any) => void 
  }) => Promise<void>;

  // Notification Logic
  toggleNotification: (key: keyof SettingState['notificationToggles']) => void;
  fetchNotificationSettings: () => Promise<void>;
  saveNotificationSettings: () => Promise<void>;
}

export const useSettingStore = create<SettingState>((set, get) => ({
  isSaving: false,
  message: { type: '', text: '' },
  
  notificationToggles: {
    tasks: true,
    comments: true,
    reminders: false,
    announcements: true,
    messages: true,
    mentions: true,
  },

  setMessage: (type, text) => set({ message: { type, text } }),
  clearMessage: () => set({ message: { type: '', text: '' } }),

  // 🚀 Logic cập nhật Profile
  saveProfile: async ({ userId, name, selectedFile, currentAvatar, updateAuthStore }) => {
    set({ isSaving: true, message: { type: '', text: '' } });

    try {
      // 1. Cập nhật tên
      await userApi.updateUser(userId, { full_name: name });

      let newAvatarUrl = currentAvatar;

      // 2. Upload avatar 
      if (selectedFile) {
        const uploadResponse: any = await userApi.uploadAvatar(userId, selectedFile);
        
        if (uploadResponse) {
          // Bóc tách url từ object trả về, dự phòng nhiều trường hợp cấu trúc backend
          newAvatarUrl = uploadResponse.data?.url || uploadResponse.data || uploadResponse; 
        }
      }

      // 3. Update Auth Store
      updateAuthStore({ full_name: name, avatar_url: newAvatarUrl });

      set({ message: { type: 'success', text: 'Cập nhật hồ sơ thành công!' } });
    } catch (error: any) {
      console.error("Lỗi cập nhật profile:", error);
      set({ message: { type: 'error', text: error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!' } });
    } finally {
      set({ isSaving: false });
    }
  },

  // 🚀 Logic xử lý Notifications
  toggleNotification: (key) => {
    set((state) => ({
      notificationToggles: {
        ...state.notificationToggles,
        [key]: !state.notificationToggles[key],
      }
    }));
  },

  fetchNotificationSettings: async () => {
    try {
    } catch (error) {
      console.error("Lỗi tải thông báo:", error);
    }
  },

  saveNotificationSettings: async () => {
    set({ isSaving: true });
    try {
      const { notificationToggles } = get();
      await settingApi.updateNotificationSettings(notificationToggles);
      set({ message: { type: 'success', text: 'Đã lưu cấu hình thông báo!' } });
    } catch (error) {
      set({ message: { type: 'error', text: 'Lỗi lưu thông báo!' } });
    } finally {
      set({ isSaving: false });
    }
  }
}));