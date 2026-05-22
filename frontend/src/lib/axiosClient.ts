import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
// KHÔNG IMPORT ZUSTAND NỮA
// import { useAuthStore } from '../features/auth/store/useAuthStore';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// ==========================================
// 1. REQUEST INTERCEPTOR: Tự động nhét Token vào
// ==========================================
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    
    // ✅ FIX: Đọc token trực tiếp từ LocalStorage (Khớp với chỗ React Query lưu)
    const token = localStorage.getItem('token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: any) => Promise.reject(error)
);

// ==========================================
// 2. RESPONSE INTERCEPTOR: Xử lý 401
// ==========================================
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Bóc vỏ data như anh em chốt!
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data as any;
      
      console.error(`[API Error ${status}]:`, errorData || 'Đã có lỗi xảy ra từ máy chủ');
      
      if (status === 401) {
        // Bỏ qua nếu là API login
        if (error.config?.url?.includes('/auth/login')) {
            return Promise.reject(error);
        }

        console.warn("🔴 Token không hợp lệ hoặc đã hết hạn. Đang đăng xuất...");
        
        // ✅ FIX: Xóa thẳng LocalStorage và ép văng ra ngoài, không qua Zustand nữa
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
    } else if (error.request) {
      console.error('[Network Error]: Không thể kết nối tới máy chủ');
    } else {
      console.error('[Axios Error]:', error.message);
    }

    return Promise.reject(error);
  }
);

// ... (Các Interface giữ nguyên)
export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  content: T[];
  pageable: { pageNumber: number; pageSize: number };
  totalElements: number;
  totalPages: number;
}

export default axiosClient;