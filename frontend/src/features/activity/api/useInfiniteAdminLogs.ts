import { useInfiniteQuery } from '@tanstack/react-query';
import { activityApi, ActivityFilters } from './activityApi'; // Đường dẫn file API

export function useInfiniteAdminLogs(filters: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: ['adminLogs', 'infinite', filters], 
    
    // GỌI ĐÚNG 3 THAM SỐ NHƯ FILE BAN ĐẦU CỦA BẠN: page, size, filters
    queryFn: ({ pageParam = 0 }) => activityApi.getAdminLogs(pageParam, 20, filters),
    
    initialPageParam: 0,
    
    getNextPageParam: (lastPage, allPages) => {
      // Dựa vào file API của bạn, meta nằm ngang cấp với data
      if (lastPage?.meta?.has_next) {
        return allPages.length; 
      }
      return undefined;
    },
  });
}