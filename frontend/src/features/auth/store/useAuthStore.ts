import { create } from 'zustand';
import axiosClient from '../../../lib/axiosClient'; 

// ===============================
// 1. USER INTERFACE
// ===============================
export interface UserProfile {
  id: string | number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  department?: string | null;
  system_role?: string;
  role_id?: string;
}

// ===============================
// 2. STATE & ACTION
// ===============================
interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => boolean;

  forgotPassword: (email: string) => Promise<any>;
  verifyResetToken: (token: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<any>;

  updateUserProfile: (updatedData: Partial<UserProfile>) => void;
}

// ===============================
// 3. STORE
// ===============================
export const useAuthStore = create<AuthState>((set, get) => ({
  
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isLoading: false,

  // ===============================
  // 🚀 LOGIN
  // ===============================
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res: any = await axiosClient.post('/auth/login', { email, password });
      const payload = res.data || res;

      const finalAccessToken = payload.accessToken || payload.access_token;
      // 🚀 Lấy thêm Refresh Token
      const finalRefreshToken = payload.refreshToken || payload.refresh_token; 
      const finalUser = payload.user || payload;

      if (finalRefreshToken) {
        localStorage.setItem('refreshToken', finalRefreshToken);
      }

      const normalizedUser: UserProfile = {
        ...finalUser,
        id: finalUser.id || finalUser.user_id
      };

      localStorage.setItem('token', finalAccessToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));

      set({
        token: finalAccessToken,
        user: normalizedUser,
        isLoading: false
      });

      return { success: true };
    } catch (error: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Đăng nhập thất bại!'
      };
    }
  },

  // ===============================
  // FORGOT PASSWORD
  // ===============================
  forgotPassword: async (email: string) => {
    set({ isLoading: true });
    try {
      const res: any = await axiosClient.post('/auth/forgot-password', { email });
      set({ isLoading: false });
      return { success: true, message: res.message || 'Đã gửi yêu cầu.' };
    } catch (error: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi hệ thống.'
      };
    }
  },

  verifyResetToken: async (token: string) => {
    try {
      await axiosClient.get(`/auth/verify-reset-token?token=${token}`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Token không hợp lệ.'
      };
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    set({ isLoading: true });
    try {
      const res: any = await axiosClient.post('/auth/reset-password', {
        token,
        new_password: newPassword
      });
      set({ isLoading: false });
      return { success: true, message: res.message || 'Đổi mật khẩu thành công!' };
    } catch (error: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Có lỗi xảy ra.'
      };
    }
  },

  // ===============================
  // UPDATE PROFILE
  // ===============================
  updateUserProfile: (updatedData) => {
    const currentUser = get().user;
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedData };

      localStorage.setItem('user', JSON.stringify(newUser));
      set({ user: newUser });
    }
  },

  // ===============================
  // LOGOUT
  // ===============================
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken'); // Xóa luôn refresh token
    localStorage.removeItem('user');

    set({ token: null, user: null });
    window.location.href = '/login';
  },

  // ===============================
  // CHECK AUTH (JWT)
  // ===============================
  checkAuth: () => {
    const token = get().token;
    const refreshToken = localStorage.getItem('refreshToken'); // Kiểm tra xem có refresh token không

    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.exp * 1000 < Date.now()) {
        // Nếu Access Token hết hạn NHƯNG vẫn còn Refresh Token -> Cho qua để axios interceptor làm việc
        if (refreshToken) {
            return true; 
        }
        
        get().logout();
        return false;
      }

      return true;
    } catch {
      get().logout();
      return false;
    }
  }
}));