import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/projectDetailApi';

export const PROJECT_KEYS = {
  all: ['projects'] as const,
  detail: (projectId: string) =>
    [...PROJECT_KEYS.all, 'detail', projectId] as const,
  members: (projectId: string) =>
    [...PROJECT_KEYS.all, 'members', projectId] as const,
};

export const useProjectDetail = (projectId: string) => {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(projectId),
    queryFn: () => projectApi.getProjectDetail(projectId),
    enabled: !!projectId,
  });
};

export const useProjectMembersDetail = (projectId: string) => {
  return useQuery({
    queryKey: PROJECT_KEYS.members(projectId),
    queryFn: async () => {
      return projectApi.getProjectMembersDetail(projectId);
    },
    enabled: !!projectId,
  });
};

export const useAddProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      projectApi.addMemberToProject(projectId, userId, roleIds),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_KEYS.detail(projectId),
      });

      queryClient.invalidateQueries({
        queryKey: PROJECT_KEYS.members(projectId),
      });
    },
  });
};

export const useUpdateProjectInfo = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => projectApi.updateProjectInfo(projectId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_KEYS.detail(projectId),
      });
    },
  });
};

export const useDeleteProject = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => projectApi.deleteProject(projectId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_KEYS.all,
      });
    },
  });
};

export const useUpdateProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      roleIds,
      isActive,
    }: {
      memberId: string;
      roleIds: string[];
      isActive: boolean;
    }) => projectApi.updateProjectMember(projectId, memberId, roleIds, isActive),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_KEYS.detail(projectId),
      });

      queryClient.invalidateQueries({
        queryKey: PROJECT_KEYS.members(projectId),
      });
    },
  });
};

export const useRemoveProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      projectApi.removeProjectMember(projectId, memberId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_KEYS.detail(projectId),
      });

      queryClient.invalidateQueries({
        queryKey: PROJECT_KEYS.members(projectId),
      });
    },
  });
};

export const useProjectOverview = useProjectDetail;