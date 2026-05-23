import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/projectDetailApi'; // Sửa lại đường dẫn import đúng

// 1. Định nghĩa Query Keys
export const PROJECT_KEYS = {
  all: ['projects'] as const,
  detail: (projectId: string) => [...PROJECT_KEYS.all, 'detail', projectId] as const,
  members: (projectId: string) => [...PROJECT_KEYS.all, 'members', projectId] as const,
};

// ==========================================
// 🚀 QUERIES
// ==========================================

// Hook lấy chi tiết dự án (Dùng thay cho getProjectOverview vì trả về 1 object duy nhất)
export const useProjectDetail = (projectId: string) => {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(projectId),
    queryFn: () => projectApi.getProjectDetail(projectId),
    enabled: !!projectId,
  });
};

// Hook lấy danh sách thành viên
export const useProjectMembersDetail = (projectId: string) => {
  return useQuery({
    queryKey: PROJECT_KEYS.members(projectId),
    // Lấy members từ object project đã fetch ở useProjectDetail
    queryFn: async () => {
        const project = await projectApi.getProjectDetail(projectId);
        return project.members || [];
    },
    enabled: !!projectId,
  });
};

// ==========================================
// 🚀 MUTATIONS
// ==========================================

// Hook thêm thành viên mới
export const useAddProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) => 
      projectApi.addMemberToProject(projectId, userId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
    },
  });
};

// Hook cập nhật thông tin chung dự án
export const useUpdateProjectInfo = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => projectApi.updateProjectInfo(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
    },
  });
};

// Hook xóa dự án
export const useDeleteProject = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
};
export const useUpdateProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, roleIds, isActive }: { memberId: string; roleIds: string[]; isActive: boolean }) => 
      // Sếp kiểm tra xem trong projectApi đã có hàm updateProjectMember chưa
      // Nếu chưa có, Sếp nhớ thêm vào projectApi.ts nhé!
      projectApi.updateProjectMember(projectId, memberId, roleIds, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
    },
  });
};

// Hook xóa thành viên
export const useRemoveProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => projectApi.removeProjectMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
    },
  });
};

export const useProjectOverview = useProjectDetail;