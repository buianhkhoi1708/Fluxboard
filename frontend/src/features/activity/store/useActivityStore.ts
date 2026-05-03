// useActivityStore.js
import { create } from 'zustand';
import { activityApi } from '../api/activityApi';

export const useActivityStore = create((set) => ({
  activities: [], // Luôn khởi tạo là mảng rỗng để tránh lỗi .map()
  loading: false,

fetchAdminLogs: async (page = 0) => {
  set({ loading: true });
  try {
    const res = await activityApi.getAdminLogs(page);
    
    // ĐIỂM SỬA CHÍNH: Trong JSON của sếp, data là mảng luôn, không có .content
    const logs = res?.data || []; 
    
    set({ 
      activities: logs, 
      pagination: res.meta, // Lấy từ cục meta thay vì cục data
      loading: false 
    });
  } catch (error) {
    console.error("Lỗi fetch:", error);
    set({ activities: [], loading: false });
  }
}
}));