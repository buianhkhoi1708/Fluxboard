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
      
      // Lọc bỏ dự án đã xóa
      const activeProjects = rawData.filter((item: WorkspaceOverview) => {
        const p = item.project;
        return p && (p.is_deleted === false || p.is_deleted === undefined);
      }) as WorkspaceOverview[];

      // 🚀 2. GỌI THÊM API LẤY MEMBER CHO TỪNG DỰ ÁN (Chạy song song bằng Promise.all)
      const projectsWithMembers = await Promise.all(
        activeProjects.map(async (item) => {
          const pid = item.project?.id || item.project?._id;
          if (!pid) return { ...item, members: [] };

          try {
            // Gọi API lấy members mà sếp vừa nhắc
            const membersRes: any = await workspaceApi.getProjectMembers(String(pid));
            const membersData = membersRes.data?.data || membersRes.data?.content || membersRes.data || membersRes || [];
            
            // Gộp members vào trong object project để UI có cái xài
            return { ...item, members: membersData };
          } catch (error) {
            console.error(`Lỗi khi lấy member cho project ${pid}:`, error);
            return { ...item, members: [] }; // Lỗi thì trả về mảng rỗng để không crash app
          }
        })
      );

      // 3. Lưu User vào Cache toàn cục để các modal khác bốc ra nhanh
      projectsWithMembers.forEach(item => {
        const pid = item.project?.id || item.project?._id;
        if (pid && item.members && item.members.length > 0) {
          useUserStore.getState().saveUsersToCache(item.members, String(pid));
        }
      });

      // 4. Check xem còn trang không
      const isLastPage = response.last !== undefined ? response.last : rawData.length < 2;
      
      return {
        data: projectsWithMembers, // 🚀 Trả về danh sách ĐÃ CÓ MEMBERS
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