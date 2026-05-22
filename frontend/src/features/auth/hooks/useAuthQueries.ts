import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient';


export interface UserProfile {
  id: string | number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  department?: string | null;
  system_role?: string;
  role_id?: string;
}

// Định nghĩa Key tập trung cho Auth
export const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
};

// ===============================
// 2. HOOK QUẢN LÝ USER HIỆN TẠI
// ===============================
export const useAuthUser = () => {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: (): UserProfile | null => {
      // Đọc user từ localStorage (hoặc gọi API /me nếu sếp có endpoint này)
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return null;

      const token = localStorage.getItem('token');
      if (!token) return null;

      // Kiểm tra JWT hết hạn
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
      } catch {
        return null;
      }

      return JSON.parse(storedUser);
    },
    // Giữ data liên tục, không tự động gọi lại trừ khi mình ra lệnh
    staleTime: Infinity, 
  });
};

// ===============================
// 3. HOOK ĐĂNG NHẬP (LOGIN)
// ===============================
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: Record<string, string>) => {
      const res: any = await axiosClient.post('/auth/login', { email, password });
      
      const payload = res.data || res;
      const finalAccessToken = payload.accessToken || payload.access_token;
      const finalUser = payload.user || payload;

      if (!finalAccessToken) {
        throw new Error("Không tìm thấy Access Token từ server trả về.");
      }

      const normalizedUser: UserProfile = {
        ...finalUser,
        id: finalUser.id || finalUser.user_id
      };

      // Ghi vào LocalStorage
      localStorage.setItem('token', finalAccessToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));

      return normalizedUser;
    },
    onSuccess: (normalizedUser) => {
      // 🚀 Bơm ngay data user vào Query Cache thay vì dùng Zustand
      queryClient.setQueryData(AUTH_KEYS.me, normalizedUser);
    },
    onError: (error: any) => {
      console.error("Lỗi đăng nhập:", error.response?.data?.message || error.message);
    }
  });
};

// ===============================
// 4. HOOK ĐĂNG XUẤT (LOGOUT)
// ===============================
export const useLogout = () => {
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Xóa sạch toàn bộ Cache liên quan đến user
    queryClient.removeQueries(); 
    
    window.location.href = '/login';
  };
};

// ===============================
// 5. CÁC HOOK QUÊN MẬT KHẨU
// ===============================
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const res: any = await axiosClient.post('/auth/forgot-password', { email });
      return res;
    }
  });
};

export const useVerifyResetToken = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const res: any = await axiosClient.get(`/auth/verify-reset-token?token=${token}`);
      return res;
    }
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string, newPassword: string }) => {
      const res: any = await axiosClient.post('/auth/reset-password', {
        token,
        new_password: newPassword
      });
      return res;
    }
  });
};

// ===============================
// 6. HOOK UPDATE PROFILE TRỰC TIẾP
// ===============================
export const useUpdateLocalProfile = () => {
  const queryClient = useQueryClient();

  return (updatedData: Partial<UserProfile>) => {
    queryClient.setQueryData(AUTH_KEYS.me, (oldData: UserProfile | undefined) => {
      if (!oldData) return oldData;
      
      const newUser = { ...oldData, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  };
};