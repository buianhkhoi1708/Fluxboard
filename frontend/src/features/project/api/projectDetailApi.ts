import axiosClient from "../../../lib/axiosClient";

export interface MemberUser {
  _id?: string;
  id?: string;
  user_id?: string;
  email?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  role_id?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        code?: string;
      }
    | null;
  role_name?: string;
  roleName?: string;
  role?: string;
  role_code?: string;
  roleCode?: string;
  system_role?: string;
  systemRole?: string;
  system_role_ids?: string[];
}

export interface Member {
  _id: string;
  id?: string;
  project_id: string;
  user_id: MemberUser | string;
  user?: MemberUser;
  role_ids: { _id?: string; id?: string; name: string; code?: string }[];
  is_active: boolean;
}

export type ProjectMemberDetail = Member;

export interface Board {
  _id: string;
  id?: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  _id: string;
  name: string;
  description?: string;
  owner_id: string;
  status: string;
  boards: Board[];
  members: Member[];
  created_at: string;
  updated_at: string;
}

const normalizeRoleName = (value?: string | null) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getCurrentUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const getUserId = (user: any) => {
  return String(user?.user_id || user?.id || user?._id || "");
};

const getRoleName = (user: any) => {
  if (!user) return "";

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

  if (user.role_id && typeof user.role_id === "object") {
    return normalizeRoleName(user.role_id.name || user.role_id.code);
  }

  if (Array.isArray(user.system_role_ids)) {
    const matched = user.system_role_ids.find((item: any) => {
      return normalizeRoleName(item) === "SYSTEM_ADMIN";
    });

    if (matched) return "SYSTEM_ADMIN";
  }

  return "";
};

const isSystemAdminUser = (user: any) => {
  return getRoleName(user) === "SYSTEM_ADMIN";
};

const isCurrentUserSystemAdmin = () => {
  return getRoleName(getCurrentUser()) === "SYSTEM_ADMIN";
};

const shouldExposeUser = (candidate: any) => {
  if (!candidate) return false;

  if (!isSystemAdminUser(candidate)) {
    return true;
  }

  const currentUser = getCurrentUser();

  return (
    isCurrentUserSystemAdmin() &&
    getUserId(currentUser) === getUserId(candidate)
  );
};

const getMemberUser = (member: any) => {
  if (!member) return null;

  if (member.user_id && typeof member.user_id === "object") {
    return member.user_id;
  }

  if (member.user && typeof member.user === "object") {
    return member.user;
  }

  return member;
};

const shouldExposeMember = (member: any) => {
  return shouldExposeUser(getMemberUser(member));
};

const filterMembers = (members: any[]) => {
  return members.filter(shouldExposeMember);
};

const getUserVisibilityParams = () => {
  const currentUser = getCurrentUser();

  return {
    exclude_system_admin: true,
    include_current_system_admin: isCurrentUserSystemAdmin(),
    current_user_id: getUserId(currentUser) || undefined,
  };
};

const sanitizeProject = (project: any) => {
  if (!project || typeof project !== "object") return project;

  return {
    ...project,
    members: Array.isArray(project.members)
      ? filterMembers(project.members)
      : project.members,
  };
};

const unwrapData = (response: any) => {
  return response?.data?.data ?? response?.data ?? response;
};

export const projectApi = {
  getUserProjects: async (): Promise<Project[]> => {
    const response: any = await axiosClient.get("/projects", {
      params: getUserVisibilityParams(),
    });

    const payload = unwrapData(response);
    const projects = Array.isArray(payload) ? payload : [];

    return projects.map(sanitizeProject);
  },

  getProjectDetail: async (projectId: string): Promise<Project> => {
    const response: any = await axiosClient.get(`/projects/${projectId}`, {
      params: getUserVisibilityParams(),
    });

    return sanitizeProject(unwrapData(response));
  },

  getProjectById: async (projectId: string): Promise<Project> => {
    return projectApi.getProjectDetail(projectId);
  },

  getProjectOverview: async (projectId?: string) => {
    if (projectId) {
      const response: any = await axiosClient.get(
        `/projects/${projectId}/overview`,
        {
          params: getUserVisibilityParams(),
        },
      );

      return sanitizeProject(unwrapData(response));
    }

    const response: any = await axiosClient.get("/projects/overviews", {
      params: getUserVisibilityParams(),
    });

    const payload = unwrapData(response);

    if (Array.isArray(payload)) {
      return payload.map(sanitizeProject);
    }

    if (Array.isArray(payload?.content)) {
      return {
        ...payload,
        content: payload.content.map(sanitizeProject),
      };
    }

    return sanitizeProject(payload);
  },

  getProjectMembersDetail: async (
    projectId: string,
  ): Promise<ProjectMemberDetail[]> => {
    const project = await projectApi.getProjectDetail(projectId);
    return Array.isArray(project.members) ? project.members : [];
  },

  createProject: async (payload: any) => {
    const response: any = await axiosClient.post("/projects", payload);
    return unwrapData(response);
  },

  updateProjectInfo: async (projectId: string, payload: any) => {
    const response: any = await axiosClient.put(
      `/projects/${projectId}`,
      payload,
    );
    return unwrapData(response);
  },

  deleteProject: async (projectId: string) => {
    const response: any = await axiosClient.delete(`/projects/${projectId}`);
    return unwrapData(response);
  },

  assignProjectToTeam: async (projectId: string, teamId: string) => {
    const response: any = await axiosClient.post(
      `/projects/${projectId}/teams/assign`,
      {
        team_id: teamId,
      },
    );

    return unwrapData(response);
  },

  removeProjectMember: async (projectId: string, userId: string) => {
    const response: any = await axiosClient.delete(
      `/projects/${projectId}/members/${userId}`,
    );

    return unwrapData(response);
  },

  addMemberToProject: async (
    projectId: string,
    userId: string,
    roleIds: string[],
  ) => {
    const response: any = await axiosClient.post(
      `/projects/${projectId}/members`,
      {
        user_id: userId,
        role_ids: roleIds,
      },
    );

    return unwrapData(response);
  },

  updateProjectMember: async (
    projectId: string,
    memberId: string,
    roleIds: string[],
    isActive: boolean,
  ) => {
    const response: any = await axiosClient.put(
      `/projects/${projectId}/members/${memberId}`,
      {
        role_ids: roleIds,
        is_active: isActive,
      },
    );

    return unwrapData(response);
  },
};
