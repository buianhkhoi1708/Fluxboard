import axiosClient from '../../../lib/axiosClient';

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
  const directRole =
    user?.role_name ||
    user?.roleName ||
    user?.system_role ||
    user?.systemRole ||
    user?.role ||
    user?.role_code ||
    user?.roleCode;

  if (directRole) {
    return normalizeRoleName(directRole);
  }

  if (user?.role_id && typeof user.role_id === 'object') {
    return normalizeRoleName(user.role_id.name || user.role_id.code);
  }

  if (Array.isArray(user?.system_role_ids)) {
    const roleName = user.system_role_ids.find((item: any) => {
      return normalizeRoleName(item) === 'SYSTEM_ADMIN';
    });

    if (roleName) {
      return 'SYSTEM_ADMIN';
    }
  }

  return '';
};

const isSystemAdminUser = (user: any) => {
  return getRoleName(user) === 'SYSTEM_ADMIN';
};

const isCurrentUserSystemAdmin = () => {
  return getRoleName(getCurrentUser()) === 'SYSTEM_ADMIN';
};

const shouldExposeUserInSelectableList = (candidate: any) => {
  if (!candidate) return false;

  if (!isSystemAdminUser(candidate)) {
    return true;
  }

  const currentUser = getCurrentUser();

  return isCurrentUserSystemAdmin() && getUserId(currentUser) === getUserId(candidate);
};

const getUserVisibilityParams = () => {
  const currentUser = getCurrentUser();

  return {
    exclude_system_admin: true,
    include_current_system_admin: isCurrentUserSystemAdmin(),
    current_user_id: getUserId(currentUser) || undefined,
  };
};

const filterUsersArray = (users: any[]) => {
  return users.filter(shouldExposeUserInSelectableList);
};

const filterUsersInResponse = (response: any) => {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) {
    return {
      ...response,
      data: filterUsersArray(payload),
    };
  }

  if (Array.isArray(payload?.data)) {
    return {
      ...response,
      data: {
        ...payload,
        data: filterUsersArray(payload.data),
      },
    };
  }

  if (Array.isArray(payload?.content)) {
    return {
      ...response,
      data: {
        ...payload,
        content: filterUsersArray(payload.content),
      },
    };
  }

  if (Array.isArray(payload?.data?.content)) {
    return {
      ...response,
      data: {
        ...payload,
        data: {
          ...payload.data,
          content: filterUsersArray(payload.data.content),
        },
      },
    };
  }

  return response;
};

const sanitizeUserField = (user: any) => {
  if (!user) return user;

  return shouldExposeUserInSelectableList(user) ? user : null;
};

const sanitizeTeam = (team: any) => {
  return {
    ...team,
    lead_id: sanitizeUserField(team?.lead_id),
    lead: sanitizeUserField(team?.lead),
    members: Array.isArray(team?.members)
      ? filterUsersArray(team.members)
      : team?.members,
  };
};

const sanitizeDepartment = (department: any): any => {
  return {
    ...department,
    manager_id: sanitizeUserField(department?.manager_id),
    manager: sanitizeUserField(department?.manager),
    teams: Array.isArray(department?.teams)
      ? department.teams.map(sanitizeTeam)
      : department?.teams,
    sub_departments: Array.isArray(department?.sub_departments)
      ? department.sub_departments.map(sanitizeDepartment)
      : department?.sub_departments,
  };
};

const sanitizeOrgTreeResponse = (response: any) => {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) {
    return {
      ...response,
      data: payload.map(sanitizeDepartment),
    };
  }

  if (Array.isArray(payload?.data)) {
    return {
      ...response,
      data: {
        ...payload,
        data: payload.data.map(sanitizeDepartment),
      },
    };
  }

  if (Array.isArray(payload?.content)) {
    return {
      ...response,
      data: {
        ...payload,
        content: payload.content.map(sanitizeDepartment),
      },
    };
  }

  if (Array.isArray(payload?.data?.content)) {
    return {
      ...response,
      data: {
        ...payload,
        data: {
          ...payload.data,
          content: payload.data.content.map(sanitizeDepartment),
        },
      },
    };
  }

  return response;
};

export const orgApi = {
  /* =========================
     DEPARTMENTS & TREE
  ========================= */

  getOrgTree: (params?: any) => {
    return axiosClient
      .get('/organizations/tree', {
        params: {
          ...getUserVisibilityParams(),
          ...params,
        },
      })
      .then(sanitizeOrgTreeResponse);
  },

  createDepartment: (payload: any) => {
    return axiosClient.post('/organizations/departments', payload);
  },

  updateDepartment: (id: string, payload: any) => {
    return axiosClient.put(`/organizations/departments/${id}`, payload);
  },

  deleteDepartment: (id: string) => {
    return axiosClient.delete(`/organizations/departments/${id}`);
  },

  /* =========================
     TEAMS
  ========================= */

  createTeam: (payload: any) => {
    return axiosClient.post('/organizations/teams', payload);
  },

  updateTeam: (teamId: string, payload: any) => {
    return axiosClient.put(`/organizations/teams/${teamId}`, payload);
  },

  deleteTeam: (teamId: string) => {
    return axiosClient.delete(`/organizations/teams/${teamId}`);
  },

  /* =========================
     MEMBERS & ASSIGNMENTS
  ========================= */

  assignUserToTeam: (userId: string, teamId: string, departmentId: string) => {
    return axiosClient.post(`/organizations/teams/${teamId}/users`, {
      user_id: userId,
      department_id: departmentId,
    });
  },

  removeUserFromTeam: (teamId: string, userId: string) => {
    return axiosClient.delete(`/organizations/teams/${teamId}/users/${userId}`);
  },

  /* =========================
     USERS & SEARCH
  ========================= */

  searchOrgUsers: (keyword: string) => {
    return axiosClient
      .get('/organizations/search', {
        params: {
          keyword,
          ...getUserVisibilityParams(),
        },
      })
      .then(filterUsersInResponse);
  },

  getUnassignedUsers: (params?: any) => {
    return axiosClient
      .get('/organizations/users/unassigned', {
        params: {
          ...getUserVisibilityParams(),
          ...params,
        },
      })
      .then(filterUsersInResponse);
  },
};