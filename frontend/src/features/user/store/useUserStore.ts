import { create } from 'zustand';
import { userApi } from '../api/userApi';

export interface ProjectRoles {
  [projectId: string]: string[];
}

export interface User {
  id: string;
  _id?: string;
  user_id?: string;

  full_name: string;
  fullName?: string;
  name?: string;

  avatar_url?: string | null;
  avatarUrl?: string | null;

  email?: string;

  role_id?: string | {
    _id?: string;
    id?: string;
    name?: string;
    code?: string;
  } | null;

  role_name?: string;
  roleName?: string;
  role?: string;
  role_code?: string;
  roleCode?: string;
  system_role?: string;
  systemRole?: string;

  system_role_ids: string[];
  project_roles: ProjectRoles;

  status?: string;

  is_online?: boolean;
  isOnline?: boolean;
  online?: boolean;
  session_status?: string;

  last_activity?: string | null;
  lastActivity?: string | null;
  last_seen_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface IncomingUser {
  id?: string;
  user_id?: string;
  _id?: string;

  full_name?: string;
  fullName?: string;
  name?: string;

  email?: string;

  avatar_url?: string | null;
  avatarUrl?: string | null;

  role_id?: string | {
    _id?: string;
    id?: string;
    name?: string;
    code?: string;
  } | null;

  role_name?: string;
  roleName?: string;
  role?: string;
  role_code?: string;
  roleCode?: string;
  system_role?: string;
  systemRole?: string;

  system_role_ids?: string[];
  project_role_ids?: string[];

  status?: string;

  is_online?: boolean;
  isOnline?: boolean;
  online?: boolean;
  session_status?: string;

  last_activity?: string | null;
  lastActivity?: string | null;
  last_seen_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface UserWithContext {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  email?: string;

  role_id?: User['role_id'];
  role_name?: string;
  role_code?: string;
  system_role?: string;

  system_role_ids: string[];
  current_project_role_ids: string[];

  status?: string;

  is_online?: boolean;
  last_activity?: string | null;
}

interface UserStore {
  userDictionary: Record<string, User>;
  isLoading: boolean;

  saveUsersToCache: (
    usersArray: IncomingUser[],
    projectId?: string | null,
  ) => void;

  getUser: (
    userId: string | null | undefined,
    currentProjectId?: string | null,
  ) => UserWithContext | null;

  fetchAllSystemUsers: () => Promise<void>;
  updateSystemUserRole: (userId: string, newRoleIds: string[]) => Promise<void>;
  removeSystemUser: (userId: string) => Promise<void>;
}

const normalizeRoleName = (value?: string | null) => {
  if (!value) return '';

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
};

const getUserId = (user: IncomingUser | User | any) => {
  return String(user?.user_id || user?.id || user?._id || '');
};

const getRoleName = (user: IncomingUser | User | any) => {
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
      const normalized = normalizeRoleName(item);

      return (
        normalized === 'SYSTEM_ADMIN' ||
        normalized === 'ADMIN' ||
        normalized === 'MANAGER' ||
        normalized === 'MEMBER' ||
        normalized === 'USER'
      );
    });

    if (roleName) {
      return normalizeRoleName(roleName);
    }
  }

  return '';
};

const getRoleCode = (user: IncomingUser | User | any) => {
  const directCode =
    user?.role_code ||
    user?.roleCode ||
    user?.role_id?.code ||
    user?.role_id?.name ||
    getRoleName(user);

  return normalizeRoleName(directCode) || 'UNKNOWN_ROLE';
};

const getOnlineStatus = (incomingUser: IncomingUser | User, existingUser?: User) => {
  const directOnline =
    incomingUser.is_online ??
    incomingUser.isOnline ??
    incomingUser.online;

  if (typeof directOnline === 'boolean') {
    return directOnline;
  }

  const sessionStatus =
    incomingUser.session_status ||
    existingUser?.session_status ||
    '';

  if (String(sessionStatus).toUpperCase() === 'ONLINE') {
    return true;
  }

  if (String(sessionStatus).toUpperCase() === 'OFFLINE') {
    return false;
  }

  return existingUser?.is_online ?? false;
};

const getLastActivity = (incomingUser: IncomingUser | User, existingUser?: User) => {
  return (
    incomingUser.last_activity ||
    incomingUser.lastActivity ||
    incomingUser.last_seen_at ||
    incomingUser.updated_at ||
    existingUser?.last_activity ||
    existingUser?.lastActivity ||
    existingUser?.last_seen_at ||
    existingUser?.updated_at ||
    incomingUser.created_at ||
    existingUser?.created_at ||
    null
  );
};

const extractUserList = (res: any): IncomingUser[] => {
  const payload =
    res?.data?.data?.content ??
    res?.data?.content ??
    res?.data?.data ??
    res?.data ??
    res?.content ??
    res;

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
};

const normalizeIncomingUser = (
  incomingUser: IncomingUser,
  existingUser?: User,
): User | null => {
  const id = getUserId(incomingUser);

  if (!id) return null;

  const roleName = getRoleName(incomingUser) || existingUser?.role_name || '';
  const roleCode = getRoleCode(incomingUser) || existingUser?.role_code || 'UNKNOWN_ROLE';

  const existingProjectRoles = existingUser?.project_roles || {};

  const systemRoleIds =
    incomingUser.system_role_ids ||
    existingUser?.system_role_ids ||
    (roleName ? [roleName] : []);

  return {
    ...existingUser,
    ...incomingUser,

    id,
    _id: incomingUser._id || existingUser?._id || id,
    user_id: incomingUser.user_id || existingUser?.user_id || id,

    full_name:
      incomingUser.full_name ||
      incomingUser.fullName ||
      incomingUser.name ||
      existingUser?.full_name ||
      'Unnamed',

    fullName:
      incomingUser.fullName ||
      incomingUser.full_name ||
      incomingUser.name ||
      existingUser?.fullName ||
      existingUser?.full_name ||
      'Unnamed',

    email: incomingUser.email || existingUser?.email,

    avatar_url:
      incomingUser.avatar_url ??
      incomingUser.avatarUrl ??
      existingUser?.avatar_url ??
      null,

    avatarUrl:
      incomingUser.avatarUrl ??
      incomingUser.avatar_url ??
      existingUser?.avatarUrl ??
      null,

    role_id:
      incomingUser.role_id ??
      existingUser?.role_id ??
      null,

    role_name: roleName || existingUser?.role_name || 'UNKNOWN_ROLE',
    roleName: roleName || existingUser?.roleName || 'UNKNOWN_ROLE',

    role_code: roleCode,
    roleCode: roleCode,

    system_role:
      incomingUser.system_role ||
      incomingUser.systemRole ||
      roleName ||
      existingUser?.system_role,

    systemRole:
      incomingUser.systemRole ||
      incomingUser.system_role ||
      roleName ||
      existingUser?.systemRole,

    system_role_ids: systemRoleIds,

    project_roles: existingProjectRoles,

    status: incomingUser.status || existingUser?.status,

    is_online: getOnlineStatus(incomingUser, existingUser),
    isOnline: getOnlineStatus(incomingUser, existingUser),
    online: getOnlineStatus(incomingUser, existingUser),
    session_status:
      incomingUser.session_status ||
      existingUser?.session_status ||
      (getOnlineStatus(incomingUser, existingUser) ? 'ONLINE' : 'OFFLINE'),

    last_activity: getLastActivity(incomingUser, existingUser),
    lastActivity: getLastActivity(incomingUser, existingUser),
  };
};

export const useUserStore = create<UserStore>((set, get) => ({
  userDictionary: {},
  isLoading: false,

  saveUsersToCache: (usersArray, projectId = null) => {
    if (!usersArray || usersArray.length === 0) return;

    set((state) => {
      const newDict: Record<string, User> = { ...state.userDictionary };
      let hasChanges = false;

      usersArray.forEach((incomingUser) => {
        const id = getUserId(incomingUser);

        if (!id) return;

        const existingUser = newDict[id];
        const normalizedUser = normalizeIncomingUser(incomingUser, existingUser);

        if (!normalizedUser) return;

        newDict[id] = normalizedUser;

        if (projectId && incomingUser.project_role_ids) {
          newDict[id].project_roles = {
            ...(newDict[id].project_roles || {}),
            [projectId]: incomingUser.project_role_ids,
          };
        }

        hasChanges = true;
      });

      return hasChanges ? { userDictionary: newDict } : state;
    });
  },

  getUser: (userId, currentProjectId = null) => {
    if (!userId) return null;

    const baseUser = get().userDictionary[String(userId)];

    if (!baseUser) return null;

    const result: UserWithContext = {
      id: baseUser.id,
      full_name: baseUser.full_name,
      avatar_url: baseUser.avatar_url,
      email: baseUser.email,

      role_id: baseUser.role_id,
      role_name: baseUser.role_name || getRoleName(baseUser) || 'UNKNOWN_ROLE',
      role_code: baseUser.role_code || getRoleCode(baseUser),
      system_role: baseUser.system_role || baseUser.role_name,

      system_role_ids: baseUser.system_role_ids,
      current_project_role_ids: [],

      status: baseUser.status,

      is_online: baseUser.is_online,
      last_activity: baseUser.last_activity,
    };

    if (
      currentProjectId &&
      baseUser.project_roles &&
      baseUser.project_roles[currentProjectId]
    ) {
      result.current_project_role_ids = baseUser.project_roles[currentProjectId];
    }

    return result;
  },

  fetchAllSystemUsers: async () => {
    set({ isLoading: true });

    try {
      const res = await userApi.getAllUsers({
        page: 0,
        size: 200,
        include_role: true,
        include_session: true,
      });

      const users = extractUserList(res);

      get().saveUsersToCache(users);
    } catch (error) {
      console.error('❌ Lỗi lấy danh sách thành viên hệ thống:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSystemUserRole: async (userId: string, newRoleIds: string[]) => {
    const targetUser = get().userDictionary[userId];

    if (!targetUser) return;

    set((state) => {
      const updatedDict = { ...state.userDictionary };

      updatedDict[userId] = {
        ...targetUser,
        system_role_ids: newRoleIds,
        role_id: newRoleIds[0] || targetUser.role_id,
      };

      return { userDictionary: updatedDict };
    });

    try {
      await userApi.updateUser(userId, {
        role_id: newRoleIds[0],
        system_role_ids: newRoleIds,
      });
    } catch (error) {
      console.error('❌ Lỗi cập nhật System Role:', error);
      get().fetchAllSystemUsers();
    }
  },

  removeSystemUser: async (userId: string) => {
    set((state) => {
      const updatedDict = { ...state.userDictionary };
      delete updatedDict[userId];

      return { userDictionary: updatedDict };
    });

    try {
      await userApi.deleteUser(userId);
    } catch (error) {
      console.error('❌ Lỗi xóa thành viên:', error);
      get().fetchAllSystemUsers();
    }
  },
}));