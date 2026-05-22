import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi } from '../api/organizationApi';

// 1. QUẢN LÝ QUERY KEYS TẬP TRUNG
// Cách này giúp tránh gõ sai chính tả và dễ dàng invalidate (làm mới) data sau này
export const ORG_QUERY_KEYS = {
  tree: ['orgTree'] as const,
  departmentDetail: (id: string) => ['department', id] as const,
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
      // BƯỚC 1: Lấy danh sách các phòng ban (Chuyển từ Zustand sang đây)
      const deptRes: any = await orgApi.getOrgTree({ size: 100, ...params }); 
      
      let rawDepts = [];
      if (Array.isArray(deptRes)) rawDepts = deptRes;
      else if (Array.isArray(deptRes.data)) rawDepts = deptRes.data;
      else if (Array.isArray(deptRes.data?.data)) rawDepts = deptRes.data.data;
      else if (Array.isArray(deptRes.data?.data?.content)) rawDepts = deptRes.data.data.content;

      // BƯỚC 2: Gọi API lấy chi tiết (Hierarchy) cho từng phòng ban
      const fullTreePromises = rawDepts.map(async (dept: any) => {
        try {
          const detailRes: any = await orgApi.getDepartmentHierarchy(dept.id);
          const detailData = detailRes.data?.data || detailRes.data || {};

          return {
            ...dept,
            ...detailData, 
            teams: (detailData.teams || []).map((t: any) => ({
              ...t,
              members: t.members || []
            }))
          };
        } catch (detailError) {
          console.warn(`Không lấy được chi tiết cho phòng ban ${dept.id}`, detailError);
          return { ...dept, teams: [] }; 
        }
      });

      // Chờ tất cả tải xong và trả về dữ liệu (TanStack Query sẽ tự động gán vào biến 'data')
      const fullTree = await Promise.all(fullTreePromises);
      return fullTree;
    },
  });
};

export const useGetUnassignedUsers = (params?: any) => {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.unassignedUsers,
    queryFn: async () => {
      const { data } = await orgApi.getUnassignedUsers(params);
      return data?.data || data?.content || data;
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
      // 🚀 Tự động load lại sơ đồ tổ chức ngay khi tạo thành công!
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
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers }); // Cập nhật lại danh sách rảnh
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
    },
  });
};