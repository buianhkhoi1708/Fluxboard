import { create } from "zustand";
import { projectApi, ProjectMemberDetail } from "../api/projectDetailApi";
import { userApi } from "../../user/api/userApi";

interface ProjectState {
  currentProjectId: string | null;
  currentProject: any | null;
  members: ProjectMemberDetail[];
  systemUsers: any[];
  isLoading: boolean;
  isActionLoading: boolean;
  boards: any[];

  fetchProjectMembers: (projectId: string) => Promise<void>;
  fetchSystemUsers: () => Promise<void>;
  fetchProjectDetails: (projectId: string) => Promise<void>;
  addMember: (
    projectId: string,
    userId: string,
    roleIds: string[],
  ) => Promise<boolean>;
  updateMember: (
    projectId: string,
    memberId: string,
    roleIds: string[],
    isActive: boolean,
  ) => Promise<boolean>;
  removeMember: (projectId: string, memberId: string) => Promise<boolean>;
  fetchProjectOverview: (projectId: string) => Promise<void>;
  updateProjectDetails: (projectId: string, payload: any) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
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
  if (member?.user_id && typeof member.user_id === "object") {
    return member.user_id;
  }

  if (member?.user && typeof member.user === "object") {
    return member.user;
  }

  return member;
};

const filterMembers = (members: any[]) => {
  return members.filter((member) => shouldExposeUser(getMemberUser(member)));
};

const extractList = (res: any) => {
  const payload =
    res?.data?.data?.content ??
    res?.data?.content ??
    res?.data?.data ??
    res?.data ??
    res?.content ??
    res;

  return Array.isArray(payload) ? payload : [];
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProjectId: null,
  currentProject: null,
  members: [],
  systemUsers: [],
  isLoading: false,
  isActionLoading: false,
  boards: [],

  fetchProjectMembers: async (projectId) => {
    set({
      isLoading: true,
      currentProjectId: projectId,
    });

    try {
      const data = await projectApi.getProjectMembersDetail(projectId);

      set({
        members: filterMembers(data),
        isLoading: false,
      });
    } catch (error) {
      console.error("Lỗi fetchProjectMembers:", error);

      set({
        isLoading: false,
        members: [],
      });
    }
  },

  fetchProjectDetails: async (projectId) => {
    try {
      const data = await projectApi.getProjectById(projectId);

      set({
        currentProject: {
          ...data,
          members: Array.isArray(data?.members)
            ? filterMembers(data.members)
            : data?.members,
        },
      });
    } catch (error) {
      console.error("Lỗi fetchProjectDetails:", error);
    }
  },

  fetchSystemUsers: async () => {
    try {
      const res: any = await userApi.getAllUsers({
        page: 0,
        size: 100,
        include_role: true,
        include_session: true,
      });

      const data = extractList(res).filter(shouldExposeUser);

      set({
        systemUsers: data,
      });
    } catch (error) {
      console.error("Lỗi fetchSystemUsers:", error);
    }
  },

  addMember: async (projectId, userId, roleIds) => {
    set({
      isActionLoading: true,
    });

    try {
      await projectApi.addMemberToProject(projectId, userId, roleIds);
      await get().fetchProjectMembers(projectId);

      set({
        isActionLoading: false,
      });

      return true;
    } catch (error) {
      console.error("Lỗi addMember:", error);

      set({
        isActionLoading: false,
      });

      return false;
    }
  },

  updateMember: async (projectId, memberId, roleIds, isActive) => {
    const previousMembers = [...get().members];

    set((state) => ({
      members: state.members.map((member: any) =>
        member.id === memberId || member._id === memberId
          ? {
              ...member,
              roleIds,
              role_ids: roleIds,
              active: isActive,
              is_active: isActive,
            }
          : member,
      ),
    }));

    try {
      await projectApi.updateProjectMember(
        projectId,
        memberId,
        roleIds,
        isActive,
      );
      return true;
    } catch (error) {
      console.error("Lỗi updateMember:", error);

      set({
        members: previousMembers,
      });

      return false;
    }
  },

  removeMember: async (projectId, memberId) => {
    const previousMembers = [...get().members];

    set((state) => ({
      members: state.members.filter((member: any) => {
        return member.id !== memberId && member._id !== memberId;
      }),
    }));

    try {
      await projectApi.removeProjectMember(projectId, memberId);
      return true;
    } catch (error) {
      console.error("Lỗi removeMember:", error);

      set({
        members: previousMembers,
      });

      return false;
    }
  },

  fetchProjectOverview: async (projectId) => {
    set({
      isLoading: true,
    });

    try {
      const actualData: any = await projectApi.getProjectOverview(projectId);

      const project = actualData.project || actualData;

      set({
        currentProject: project
          ? {
              ...project,
              members: Array.isArray(project.members)
                ? filterMembers(project.members)
                : project.members,
            }
          : null,
        boards: actualData.boards || project?.boards || [],
        isLoading: false,
      });
    } catch (error) {
      console.error("Lỗi fetchProjectOverview:", error);

      set({
        isLoading: false,
      });
    }
  },

  updateProjectDetails: async (projectId, payload) => {
    set({
      isActionLoading: true,
    });

    try {
      await projectApi.updateProjectInfo(projectId, payload);
      await get().fetchProjectOverview(projectId);

      set({
        isActionLoading: false,
      });

      return true;
    } catch (error) {
      console.error("Lỗi updateProjectDetails:", error);

      set({
        isActionLoading: false,
      });

      return false;
    }
  },

  deleteProject: async (projectId) => {
    set({
      isActionLoading: true,
    });

    try {
      await projectApi.deleteProject(projectId);

      set({
        isActionLoading: false,
      });

      return true;
    } catch (error) {
      console.error("Lỗi deleteProject:", error);

      set({
        isActionLoading: false,
      });

      return false;
    }
  },
}));
