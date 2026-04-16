import axios from 'axios';
import { useAuthStore } from '../features/auth/store/useAuthStore'; 

// Khởi tạo Instance với Base URL
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 60000, 
  // 🚀 TỐI ƯU 1: Chuyển 'Content-Type' lên đây để Axios thiết lập 1 lần lúc khởi tạo, 
  // thay vì request nào cũng phải chạy lại lệnh gán header.
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request Interceptor
axiosClient.interceptors.request.use(
  (config) => {
    // 🚀 TỐI ƯU 2: Đọc token từ RAM (Zustand state) thay vì đọc từ Ổ cứng (localStorage).
    // localStorage.getItem là một tác vụ đồng bộ chặn luồng (synchronous blocking). 
    // Gọi nó ở mọi API request sẽ làm giảm vi hiệu năng của app.
    const token = useAuthStore.getState().token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error) // Viết tắt cho gọn
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => response.data, // Viết tắt cho gọn
  (error) => {
    if (error.response) {
      const status = error.response.status;
      console.error(`[API Error ${status}]:`, error.response.data || 'Đã có lỗi xảy ra từ máy chủ');
      
      if (status === 401) {
        // 🚀 TỐI ƯU 3: Dùng .includes() thay vì ===
        // An toàn hơn nếu lỡ API của sếp có thêm query params (VD: /auth/login?method=google)
        if (error.config.url?.includes('/auth/login')) {
            return Promise.reject(error);
        }

        console.warn("🔴 Token không hợp lệ hoặc đã hết hạn. Đang đăng xuất...");
        
        // 🚀 TỐI ƯU 4: Thay vì tự xóa localStorage và redirect cứng tay, 
        // hãy gọi luôn hàm logout() của Zustand. Nó sẽ dọn sạch cả Token, User và tự Redirect mượt mà.
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

export default axiosClient;