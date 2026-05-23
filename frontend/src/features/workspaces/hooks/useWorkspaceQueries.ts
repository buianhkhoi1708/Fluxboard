import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/workspaceApi'; 
import { WorkspaceOverview } from '../types/workspaceTypes';
import { useUserStore } from '../../user/store/useUserStore';

export const WORKSPACE_KEYS = {
  all: ['workspaces'] as const,
};

export const useWorkspaces = () => {
  return useInfiniteQuery({
    queryKey: WORKSPACE_KEYS.all,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      // 1. Kéo danh sách Overview các dự án
      const response: any = await workspaceApi.getProjectOverviews(pageParam as number, 2);
      const rawData = response.content || response.data?.content || response.data || [];
      
      // 🚀 2. Lọc bỏ dự án đã xóa (SỬA LẠI: Lấy trực tiếp từ item vì data đã phẳng)
      const activeProjects = rawData.filter((item: any) => {
        return item.is_deleted === false || item.is_deleted === undefined;
      });

      // 🚀 3. Lưu User vào Cache (Không cần gọi Promise.all lấy member nữa vì Backend đã trả sẵn)
      activeProjects.forEach((item: any) => {
        const pid = item.id || item._id;
        if (pid && item.members && item.members.length > 0) {
          // Bóc tách user_id ra để lưu vào Cache
          const usersToCache = item.members.map((m: any) => m.user_id || m);
          useUserStore.getState().saveUsersToCache(usersToCache, String(pid));
        }
      });

      // 4. Check xem còn trang không
      const isLastPage = response.last !== undefined ? response.last : rawData.length < 2;
      
      return {
        data: activeProjects, // Trả thẳng mảng dự án ra UI
        nextPage: !isLastPage ? (pageParam as number) + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all })
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.createBoard,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACE_KEYS.all })
  });
};