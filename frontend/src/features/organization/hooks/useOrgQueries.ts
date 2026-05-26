import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi } from '../api/organizationApi';

export const ORG_QUERY_KEYS = {
  tree: ['orgTree'] as const,
  departmentDetail: (id: string) => ['department', id] as const,
  unassignedUsers: ['unassignedUsers'] as const,
  searchUsers: (keyword: string) => ['searchUsers', keyword] as const,
};

const unwrapList = (res: any) => {
  const payload =
    res?.data?.data?.content ??
    res?.data?.content ??
    res?.data?.data ??
    res?.data ??
    res?.content ??
    res;

  return Array.isArray(payload) ? payload : [];
};

// ==========================================
// QUERIES
// ==========================================

export const useGetOrgTree = (params?: any) => {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.tree,
    queryFn: async () => {
      const res: any = await orgApi.getOrgTree({
        size: 100,
        ...params,
      });

      return unwrapList(res);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetUnassignedUsers = (params?: any) => {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.unassignedUsers,
    queryFn: async () => {
      const res: any = await orgApi.getUnassignedUsers(params);
      return unwrapList(res);
    },
  });
};

// ==========================================
// MUTATIONS
// ==========================================

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orgApi.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers });
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
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers });
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orgApi.deleteDepartment,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers });
    },
  });
};

// --- TEAM MUTATIONS ---

export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orgApi.createTeam,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, payload }: { teamId: string; payload: any }) =>
      orgApi.updateTeam(teamId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.tree });
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers });
    },
  });
};

// --- MEMBER MUTATIONS ---

export const useAssignUserToTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      teamId,
      departmentId,
    }: {
      userId: string;
      teamId: string;
      departmentId: string;
    }) => orgApi.assignUserToTeam(userId, teamId, departmentId),

    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.unassignedUsers });
    },
  });
};