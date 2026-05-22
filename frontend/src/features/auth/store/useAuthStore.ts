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
  // 🚀 LOGIN (FIX CHÍNH Ở ĐÂY)
  // ===============================
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      // 1. axiosClient interceptor đã trả về response.data (Cục ApiResponse của Java)
      const res: any = await axiosClient.post('/auth/login', { email, password });

      console.log("📦 DỮ LIỆU TỪ BACKEND GỬI VỀ:", res);

      // 2. Lấy đúng lõi payload (Chứa token và user)
      const payload = res.data || res;

      // 3. 🚀 CHÌA KHÓA: Hứng cả chuẩn Java (camelCase) lẫn JS (snake_case)
      const finalAccessToken = payload.accessToken || payload.access_token;
      const finalUser = payload.user || payload;

      // 🚨 Báo động đỏ nếu không tìm thấy token
      if (!finalAccessToken) {
        console.error("🔴 CẢNH BÁO: Không tìm thấy Access Token! Code Java đang trả về cái gì thế này?");
      } else {
        // Típ nhỏ: In 10 ký tự đầu của Token ra để đối chiếu xem có đúng Access Token không
        console.log("🔑 Đang lưu Access Token:", finalAccessToken.substring(0, 10) + "...");
      }

      // 4. Chuẩn hóa User
      const normalizedUser: UserProfile = {
        ...finalUser,
        id: finalUser.id || finalUser.user_id
      };

      // 5. Ghi vào LocalStorage (Đảm bảo là ghi biến finalAccessToken chuẩn)
      localStorage.setItem('token', finalAccessToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));

      // 6. Cập nhật State
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
    localStorage.removeItem('user');

    set({ token: null, user: null });

    window.location.href = '/login';
  },

  // ===============================
  // CHECK AUTH (JWT)
  // ===============================
  checkAuth: () => {
    const token = get().token;
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.exp * 1000 < Date.now()) {
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
