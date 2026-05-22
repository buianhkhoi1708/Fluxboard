import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi } from '../api/organizationApi';

// 1. QUẢN LÝ QUERY KEYS TẬP TRUNG
export const ORG_QUERY_KEYS = {
  tree: ['orgTree'] as const,
  departmentDetail: (id: string) => ['department', id] as const, // Có thể xóa nếu UI không còn dùng
  unassignedUsers: ['unassignedUsers'] as const,
  searchUsers: (keyword: string) => ['searchUsers', keyword] as const,
};

// ==========================================
// 2. QUERIES (LẤY DỮ LIỆU - GET)
// ==========================================

export const useGetOrgTree = (params?: any) => {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.tree,
    queryFn: async () => {
      // 🚀 GỌI ĐÚNG 1 LẦN: Lấy toàn bộ cây phòng ban, teams, và members từ Backend
      const res: any = await orgApi.getOrgTree({ size: 100, ...params }); 
      
      // Bóc tách dữ liệu an toàn tùy theo format response của hệ thống
      const fullTree = res.data?.data?.content || res.data?.data || res.data || res || [];
      
      return fullTree;
    },
    // Tối ưu UI: Giữ cache trong 5 phút để chuyển tab không bị giật/load lại liên tục
    staleTime: 5 * 60 * 1000, 
  });
};

export const useGetUnassignedUsers = (params?: any) => {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.unassignedUsers,
    queryFn: async () => {
      const res: any = await orgApi.getUnassignedUsers(params);
      return res.data?.data || res.data?.content || res.data || [];
    },
  });
};

// ==========================================
// 3. MUTATIONS (THAY ĐỔI DỮ LIỆU - POST, PUT, DELETE)
// ==========================================

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orgApi.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => 
      orgApi.updateDepartment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orgApi.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
    },
  });
};

// --- TEAM MUTATIONS ---

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orgApi.createTeam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree }),
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, payload }: { teamId: string; payload: any }) => 
      orgApi.updateTeam(teamId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree }),
  });
};

// --- MEMBER MUTATIONS ---

export const useAssignUserToTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, teamId, departmentId }: { userId: string; teamId: string; departmentId: string }) => 
      orgApi.assignUserToTeam(userId, teamId, departmentId),
    onSuccess: () => {
      // 🚀 Cập nhật lại sơ đồ và làm mới luôn danh sách người rảnh
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers });
    },
  });
};

export const useRemoveUserFromTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => 
      orgApi.removeUserFromTeam(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
      // Thêm dòng này nếu muốn refetch danh sách unassigned user ngay khi vừa gỡ ai đó ra
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers });
    },
  });
};