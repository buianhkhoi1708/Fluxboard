import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '../features/auth/store/useAuthStore';

// Khởi tạo Instance với Base URL
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string, // Ép kiểu string cho Env
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request Interceptor
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Đọc token từ RAM (Zustand state)
    const token = useAuthStore.getState().token;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 🚀 BƯỚC NÀY CHÍNH LÀ INTERCEPTOR "BÓC VỎ" AXIOS MÀ ANH EM CHỐT Ở BÀI TRƯỚC!
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      
      // Định nghĩa tạm kiểu cho data để tránh TS chửi
      const errorData = error.response.data as any;
      console.error(`[API Error ${status}]:`, errorData || 'Đã có lỗi xảy ra từ máy chủ');
      
      if (status === 401) {
        if (error.config?.url?.includes('/auth/login')) {
            return Promise.reject(error);
        }

        console.warn("🔴 Token không hợp lệ hoặc đã hết hạn. Đang đăng xuất...");
        useAuthStore.getState().logout();
      }
      
    } else if (error.request) {
      console.error('[Network Error]: Không thể kết nối tới máy chủ');
    } else {
      console.error('[Axios Error]:', error.message);
    }

    return Promise.reject(error);
  }
);

export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data: T;
}

// Cấu trúc dùng chung cho các API có phân trang
export interface PaginatedData<T> {
  content: T[];
  pageable: { pageNumber: number; pageSize: number };
  totalElements: number;
  totalPages: number;
}

export default axiosClient;