import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { workspaceApi } from '../api/workspaceApi';
import { useUserStore } from '../../user/store/useUserStore';

export const WORKSPACE_KEYS = {
  all: ['workspaces'] as const,
};

const normalizeRoleName = (value?: string | null) => {
  if (!value) return '';

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
};

const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;

  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const getUserId = (user: any) => {
  return String(user?.user_id || user?.id || user?._id || '');
};

const getRoleName = (user: any) => {
  if (!user) return '';

  const directRole =
    user.role_name ||
    user.roleName ||
    user.system_role ||
    user.systemRole ||
    user.role ||
    user.role_code ||
    user.roleCode;

  if (directRole) {
    return normalizeRoleName(directRole);
  }

  if (user.role_id && typeof user.role_id === 'object') {
    return normalizeRoleName(user.role_id.name || user.role_id.code);
  }

  if (Array.isArray(user.system_role_ids)) {
    const matched = user.system_role_ids.find((item: any) => {
      return normalizeRoleName(item) === 'SYSTEM_ADMIN';
    });

    if (matched) return 'SYSTEM_ADMIN';
  }

  return '';
};

const isSystemAdminUser = (user: any) => {
  return getRoleName(user) === 'SYSTEM_ADMIN';
};

const isCurrentUserSystemAdmin = () => {
  return getRoleName(getCurrentUser()) === 'SYSTEM_ADMIN';
};

const shouldExposeUser = (candidate: any) => {
  if (!candidate) return false;

  if (!isSystemAdminUser(candidate)) {
    return true;
  }

  const currentUser = getCurrentUser();

  return isCurrentUserSystemAdmin() && getUserId(currentUser) === getUserId(candidate);
};

const getMemberUser = (member: any) => {
  if (member?.user_id && typeof member.user_id === 'object') {
    return member.user_id;
  }

  if (member?.user && typeof member.user === 'object') {
    return member.user;
  }

  return member;
};

const sanitizeProjectOverview = (item: any) => {
  if (!item || typeof item !== 'object') return item;

  const members = Array.isArray(item.members)
    ? item.members.filter((member: any) => shouldExposeUser(getMemberUser(member)))
    : item.members;

  return {
    ...item,
    members,
  };
};

export const useWorkspaces = () => {
  return useInfiniteQuery({
    queryKey: WORKSPACE_KEYS.all,
    initialPageParam: 0,

    queryFn: async ({ pageParam }) => {
      const response: any = await workspaceApi.getProjectOverviews(
        pageParam as number,
        2,
      );

      const rawData =
        response.content ||
        response.data?.content ||
        response.data ||
        [];

      const activeProjects = rawData
        .filter((item: any) => {
          return item.is_deleted === false || item.is_deleted === undefined;
        })
        .map(sanitizeProjectOverview);

      activeProjects.forEach((item: any) => {
        const projectId = item.id || item._id;

        if (projectId && item.members && item.members.length > 0) {
          const usersToCache = item.members
            .map((member: any) => getMemberUser(member))
            .filter(shouldExposeUser);

          useUserStore.getState().saveUsersToCache(usersToCache, String(projectId));
        }
      });

      const isLastPage =
        response.last !== undefined ? response.last : rawData.length < 2;

      return {
        data: activeProjects,
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

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_KEYS.all,
      }),
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workspaceApi.createBoard,

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_KEYS.all,
      }),
  });
};