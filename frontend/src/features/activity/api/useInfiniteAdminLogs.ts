// src/features/activity/api/useInfiniteAdminLogs.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { activityApi, ActivityFilters } from './activityApi';

export function useInfiniteAdminLogs(filters: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: ['adminLogs', 'infinite', filters], 
    queryFn: async ({ pageParam = 0 }) => {
      // 🚀 Thêm async/await để bóc lớp data của AxiosClient nếu cần
      const res: any = await activityApi.getAdminLogs(pageParam, 20, filters);
      return res.data || res; // Dự phòng trường hợp axiosClient trả về luôn object
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // 🚀 lastPage chính là ActivityListResponse
      if (lastPage?.meta?.has_next) {
        return lastPage.meta.page + 1; // Sửa lại thành lấy trang tiếp theo
      }
      return undefined;
    },
  });
}