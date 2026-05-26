import axiosClient from '../../../lib/axiosClient';
import { IncomingUser } from '../../user/store/useUserStore';
import {
  ApiResponse,
  CreateProjectPayload,
  UpdateProjectPayload,
  CreateBoardPayload,
} from '../types/workspaceTypes';

// ============================================================================
// HELPER FUNCTIONS (LOCAL UTILS)
// ============================================================================

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

const isCurrentUserSystemAdmin = () => {
  return getRoleName(getCurrentUser()) === 'SYSTEM_ADMIN';
};

const getUserVisibilityParams = () => {
  const currentUser = getCurrentUser();

  return {
    exclude_system_admin: true,
    include_current_system_admin: isCurrentUserSystemAdmin(),
    current_user_id: getUserId(currentUser) || undefined,
  };
};


// ============================================================================
// API SERVICE: WORKSPACE
// ============================================================================

export const workspaceApi = {
  // --------------------------------------------------------------------------
  // 1. PROJECTS - READ (QUERIES)
  // --------------------------------------------------------------------------
  getProjects: (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<ApiResponse<any>> => {
    return axiosClient.get('/projects', {
      params: {
        ...getUserVisibilityParams(),
        ...params,
      },
    });
  },

  getProjectById: (projectId: string): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/${projectId}`, {
      params: getUserVisibilityParams(),
    });
  },

  getProjectOverviews: (
    page: number = 0,
    size: number = 50,
  ): Promise<ApiResponse<any>> => {
    return axiosClient.get('/projects/overviews', {
      params: {
        ...getUserVisibilityParams(),
        page,
        size,
      },
    });
  },

  getProjectOverview: (projectId: string): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/${projectId}/overview`, {
      params: getUserVisibilityParams(),
    });
  },

  getProjectsByDepartment: (
    departmentId: string,
    params?: {
      page?: number;
      size?: number;
    },
  ): Promise<ApiResponse<any>> => {
    return axiosClient.get(`/projects/departments/${departmentId}`, {
      params: {
        ...getUserVisibilityParams(),
        ...params,
      },
    });
  },

  // --------------------------------------------------------------------------
  // 2. PROJECTS - WRITE (MUTATIONS)
  // --------------------------------------------------------------------------
  createProject: (data: CreateProjectPayload): Promise<ApiResponse<any>> => {
    return axiosClient.post('/projects', data);
  },

  updateProject: (
    projectId: string,
    data: UpdateProjectPayload,
  ): Promise<ApiResponse<any>> => {
    return axiosClient.put(`/projects/${projectId}`, data);
  },

  // --------------------------------------------------------------------------
  // 3. PROJECT MEMBERS
  // --------------------------------------------------------------------------
  getProjectMembers: (
    projectId: string,
  ): Promise<ApiResponse<IncomingUser[] | any>> => {
    return axiosClient.get(`/projects/${projectId}/members`, {
      params: getUserVisibilityParams(),
    });
  },

  // --------------------------------------------------------------------------
  // 4. BOARDS
  // --------------------------------------------------------------------------
  createBoard: (data: CreateBoardPayload): Promise<ApiResponse<any>> => {
    return axiosClient.post('/boards', data);
  },

  deleteBoard: async ({
    boardId,
    projectId,
  }: {
    boardId: string;
    projectId: string;
  }): Promise<any> => {
    const response: any = await axiosClient.delete(`/boards/${boardId}`, {
      params: {
        project_id: projectId, // Truyền project_id để Backend (RBAC) verify quyền
      },
    });

    return response.data || response;
  },
};