import { create } from 'zustand';
import { activityApi, Activity, PaginationMeta, ActivityFilters } from '../api/activityApi';

// Khai báo khuôn Interface cho toàn bộ Zustand Store
interface ActivityState {
  activities: Activity[];
  meta: PaginationMeta | null;
  loading: boolean;
  loadingMore: boolean;
  filters: ActivityFilters; // State lưu bộ lọc hiện tại

  fetchAdminLogs: (page?: number) => Promise<void>;
  setFilters: (newFilters: ActivityFilters) => void; // Action cập nhật bộ lọc
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [], // Luôn khởi tạo là mảng rỗng để tránh lỗi .map()
  meta: null, // Hứng thông tin phân trang (has_next, page)
  loading: false,
  loadingMore: false, // Trạng thái riêng cho nút "Tải thêm"
  filters: {}, // Khởi tạo bộ lọc rỗng

  // Hàm gán bộ lọc mới và tự động fetch lại từ trang 0
  setFilters: (newFilters) => {
    set({ filters: newFilters, activities: [], meta: null }); // Xóa data cũ
    get().fetchAdminLogs(0); 
  },

  fetchAdminLogs: async (page = 0) => {
    if (page === 0) set({ loading: true });
    else set({ loadingMore: true });

    try {
      // Lấy bộ lọc từ store truyền xuống API
      const currentFilters = get().filters;
      const res = await activityApi.getAdminLogs(page, 20, currentFilters);
      
      const logs = res.data || []; 
      const paginationMeta = res.meta || null;

      set((state) => ({ 
        // Nối đuôi data mới vào data cũ
        activities: page === 0 ? logs : [...state.activities, ...logs], 
        meta: paginationMeta,
        loading: false,
        loadingMore: false
      }));
    } catch (error) {
      console.error("Lỗi fetch activities:", error);
      set({ loading: false, loadingMore: false });
    }
  }
}));