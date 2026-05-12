// authApi.ts
import axios from 'axios';

// Cấu hình axios instance nếu bạn chưa có
const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
});

export const authApi = {
  // ... các hàm login, forgotPassword khác giữ nguyên

  // 🚀 Đã cập nhật Type khớp 100% với form và Backend
  changePassword: async (data: { 
    current_password: string; 
    new_password: string; 
    confirm_new_password: string 
  }) => {
    // 1. Lấy token từ nơi lưu trữ (localStorage)
    const token = localStorage.getItem('token'); 

    // 2. Kẹp token vào Header Authorization và gửi data đi
    return await apiClient.post('/auth/change-password', data, {
      headers: {
        Authorization: `Bearer ${token}` 
      }
    });
  }
};