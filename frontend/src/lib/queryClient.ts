// src/lib/queryClient.ts (Cùng thư mục với axiosClient.ts)
import { QueryClient } from '@tanstack/react-query';

// Khởi tạo và cấu hình trung tâm cho toàn bộ dự án
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Không tự động gọi lại API khi chuyển tab
      retry: 1, // Nếu lỗi API, thử lại 1 lần trước khi báo lỗi
      staleTime: 1000 * 60 * 5, // Mặc định cache dữ liệu trong 5 phút (có thể ghi đè ở từng hook)
    },
  },
});