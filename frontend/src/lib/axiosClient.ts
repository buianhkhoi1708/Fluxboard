import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// ==========================================
// THUẬT TOÁN SILENT REFRESH (XỬ LÝ ĐỒNG THỜI)
// ==========================================
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ==========================================
// 1. REQUEST INTERCEPTOR: Tự động nhét Token vào
// ==========================================
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data as any;
      
      console.error(`[API Error ${status}]:`, errorData || 'Đã có lỗi xảy ra từ máy chủ');
      
      if (status === 401) {
        // 1. Bỏ qua nếu là API login hoặc chính API refresh bị 401
        if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
            return Promise.reject(error);
        }

        // 2. Nếu ĐANG trong quá trình lấy lại token -> Cho các API lỗi vào hàng đợi (Queue)
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axiosClient(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        // 3. Đánh dấu cờ đang refresh và chưa thử lại
        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          // Không có thuốc chữa -> Đá ra login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        try {
          console.warn("🔄 Đang âm thầm gia hạn Token mới...");
          
          // 🚀 BÍ KÍP: Dùng thư viện `axios` gốc (không phải axiosClient) để gọi API refresh
          // Điều này giúp tránh bị vòng lặp vô tận dội ngược lại cái interceptor này
          const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          // Linh hoạt hứng data trả về từ Backend (Sếp check lại JSON backend trả về nhé)
          const newAccessToken = res.data?.data?.accessToken || res.data?.accessToken || res.data?.access_token;
          const newRefreshToken = res.data?.data?.refreshToken || res.data?.refreshToken || res.data?.refresh_token;

          if (!newAccessToken) throw new Error("Không lấy được token mới");

          // Lưu token mới vào kho
          localStorage.setItem('token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          // Kích hoạt lại toàn bộ các API đang chờ trong Queue
          processQueue(null, newAccessToken);

          // Gắn token mới cho API đang bị xịt và gọi lại nó
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return axiosClient(originalRequest);

        } catch (refreshError) {
          console.error("🔴 Refresh Token thất bại. Bắt buộc đăng xuất.");
          processQueue(refreshError, null);
          
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          
          return Promise.reject(refreshError);
        } finally {
          // Dọn dẹp cờ
          isRefreshing = false;
        }
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

export interface PaginatedData<T> {
  content: T[];
  pageable: { pageNumber: number; pageSize: number };
  totalElements: number;
  totalPages: number;
}

export default axiosClient;