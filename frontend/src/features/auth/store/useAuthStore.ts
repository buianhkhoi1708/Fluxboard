import { create } from 'zustand';
import axiosClient from '../../../lib/axiosClient'; 

// 1. ĐỊNH NGHĨA KHUÔN CHO STATE & ACTION
interface AuthState {
  token: string | null;
  user: any | null; // Khuyến nghị: Sau này sếp tạo một interface UserProfile thay cho 'any' nhé
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => boolean;
}

// 2. 🚀 GẮN <AuthState> VÀO HÀM CREATE (Và thêm tham số 'get')
export const useAuthStore = create<AuthState>((set, get) => ({
  // Khởi tạo state từ LocalStorage
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isLoading: false,

  // Hàm xử lý Đăng nhập
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await axiosClient.post('/auth/login', { 
        email, 
        password 
      });
      
      // 🚀 TỐI ƯU: Bóc tách token ra khỏi user data
      const { access_token, ...userData } = response.data; 

      // Lưu xuống LocalStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Cập nhật State
      set({ token: access_token, user: userData, isLoading: false });
      return { success: true };

    } catch (error: any) {
      set({ isLoading: false });
      return { 
        success: false, 
        message: error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!' 
      };
    }
  },

  // Hàm xử lý Quên mật khẩu
  forgotPassword: async (email: string) => {
    set({ isLoading: true });
    try {
      // Gọi API quên mật khẩu
      const response: any = await axiosClient.post('/auth/forgot-password', { email });
      set({ isLoading: false });
      return { success: true, message: response.message || 'Đã gửi yêu cầu khôi phục.' };
    } catch (error: any) {
      set({ isLoading: false });
      return { 
        success: false, 
        message: error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.' 
      };
    }
  },

  // Hàm kiểm tra Token ngay khi vừa bấm từ Email vào
  verifyResetToken: async (token: string) => {
    try {
      await axiosClient.get(`/auth/verify-reset-token?token=${token}`);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Đường dẫn không hợp lệ hoặc đã hết hạn.' 
      };
    }
  },

  // Hàm gửi mật khẩu mới
  resetPassword: async (token: string, newPassword: string) => {
    set({ isLoading: true });
    try {
      const response: any = await axiosClient.post('/auth/reset-password', { 
        token, 
        new_password: newPassword 
      });
      set({ isLoading: false });
      return { success: true, message: response.message || 'Đổi mật khẩu thành công!' };
    } catch (error: any) {
      set({ isLoading: false });
      return { 
        success: false, 
        message: error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.' 
      };
    }
  },

  // Hàm xử lý Đăng xuất
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
    
    window.location.href = '/login'; 
  },

  // 🚀 THÊM HÀM CHECK AUTH ĐỂ KIỂM TRA TOKEN HẾT HẠN
  checkAuth: () => {
    const token = get().token;
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Kiểm tra hạn sử dụng (exp tính bằng giây, Date.now tính bằng ms)
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