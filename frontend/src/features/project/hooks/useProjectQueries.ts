import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/projectDetailApi'; // Điều chỉnh đường dẫn cho đúng cấu trúc thư mục

// 1. Định nghĩa Query Keys tập trung để quản lý Cache
export const PROJECT_KEYS = {
  all: ['projects'] as const,
  overview: (projectId: string) => [...PROJECT_KEYS.all, 'overview', projectId] as const,
  members: (projectId: string) => [...PROJECT_KEYS.all, 'members', projectId] as const,
};

// ==========================================
// 🚀 QUERIES (LẤY DỮ LIỆU)
// ==========================================

// Hook lấy thông tin tổng quan dự án (Gồm thông tin Project và danh sách Boards)
export const useProjectOverview = (projectId: string) => {
  return useQuery({
    queryKey: PROJECT_KEYS.overview(projectId),
    queryFn: () => projectApi.getProjectOverview(projectId),
    enabled: !!projectId, // Chỉ kích hoạt khi có projectId
  });
};

// Hook lấy danh sách thành viên chi tiết có phân quyền chi tiết
export const useProjectMembersDetail = (projectId: string) => {
  return useQuery({
    queryKey: PROJECT_KEYS.members(projectId),
    queryFn: () => projectApi.getProjectMembersDetail(projectId),
    enabled: !!projectId,
  });
};

// ==========================================
// 🚀 MUTATIONS (THAY ĐỔI DỮ LIỆU)
// ==========================================

// Hook thêm thành viên mới vào dự án
export const useAddProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) => 
      projectApi.addProjectMember(projectId, userId, roleIds),
    onSuccess: () => {
      // Làm mới danh sách thành viên ngay lập tức
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.members(projectId) });
    },
  });
};

// Hook chỉnh sửa quyền hạn hoặc trạng thái hoạt động của thành viên
export const useUpdateProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, roleIds, isActive }: { memberId: string; roleIds: string[]; isActive: boolean }) => 
      projectApi.updateProjectMember(projectId, memberId, roleIds, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.members(projectId) });
    },
  });
};

// Hook xóa (kick) thành viên ra khỏi dự án
export const useRemoveProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => projectApi.removeProjectMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.members(projectId) });
    },
  });
};

// Hook cập nhật thông tin chung của dự án (Tên, mô tả...) trong tab Settings
export const useUpdateProjectInfo = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => projectApi.updateProjectInfo(projectId, payload),
    onSuccess: () => {
      // Làm mới thông tin overview của dự án
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.overview(projectId) });
    },
  });
};

// Hook xóa hoàn toàn dự án
export const useDeleteProject = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectApi.deleteProject(projectId),
    onSuccess: () => {
      // Xóa toàn bộ dữ liệu liên quan đến dự án này trong bộ nhớ Cache
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
};