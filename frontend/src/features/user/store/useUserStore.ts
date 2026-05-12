import { create } from 'zustand';
import { userApi } from '../api/userApi';

// ==========================================
// 1. TYPES
// ==========================================

export interface Role {
  _id: string;
  name: string;
}

export interface ProjectRoles {
  [projectId: string]: string[];
}

export interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;

  // ✅ FIXED
  role_id?: Role;

  project_roles: ProjectRoles;
  status?: string;
}

export interface IncomingUser {
  id?: string;
  user_id?: string;
  _id?: string;

  full_name?: string;
  name?: string;

  email?: string;

  avatar_url?: string;
  avatarUrl?: string;

  // ✅ FIXED
  role_id?: Role;

  project_role_ids?: string[];

  status?: string;
}

export interface UserWithContext {
  id: string;
  full_name: string;

  avatar_url?: string;
  email?: string;

  // ✅ FIXED
  role_id?: Role;

  current_project_role_ids: string[];
}

// ==========================================
// 2. STORE INTERFACE
// ==========================================

interface UserStore {

  // ==========================================
  // GLOBAL CACHE
  // ==========================================
  userDictionary: Record<string, User>;

  isLoading: boolean;

  // ==========================================
  // CACHE ACTIONS
  // ==========================================
  saveUsersToCache: (
    usersArray: IncomingUser[],
    projectId?: string | null
  ) => void;

  getUser: (
    userId: string | null | undefined,
    currentProjectId?: string | null
  ) => UserWithContext | null;

  // ==========================================
  // MANAGEMENT ACTIONS
  // ==========================================
  fetchAllSystemUsers: () => Promise<void>;

  updateSystemUserRole: (
    userId: string,
    newRoleId: string
  ) => Promise<void>;

  removeSystemUser: (
    userId: string
  ) => Promise<void>;
}

// ==========================================
// 3. STORE
// ==========================================

export const useUserStore = create<UserStore>((set, get) => ({

  // ==========================================
  // STATE
  // ==========================================
  userDictionary: {},

  isLoading: false,

  // ==========================================
  // SAVE USERS TO CACHE
  // ==========================================
  saveUsersToCache: (usersArray, projectId = null) => {

    if (!usersArray || usersArray.length === 0) {
      return;
    }

    set((state) => {

      const newDict: Record<string, User> = {
        ...state.userDictionary
      };

      let hasChanges = false;

      usersArray.forEach((incomingUser) => {

        const id =
          incomingUser.user_id ||
          incomingUser.id ||
          incomingUser._id;

        if (!id) return;

        const existingUser = newDict[id] || {
          project_roles: {}
        };

        newDict[id] = {

          ...existingUser,

          id,

          full_name:
            incomingUser.full_name ||
            incomingUser.name ||
            existingUser.full_name ||
            'Unnamed',

          email:
            incomingUser.email ||
            existingUser.email,

          avatar_url:
            incomingUser.avatar_url ||
            incomingUser.avatarUrl ||
            existingUser.avatar_url,

          // ✅ FIXED
          role_id:
            incomingUser.role_id ||
            existingUser.role_id,

          project_roles:
            existingUser.project_roles || {},

          status:
            incomingUser.status ||
            existingUser.status
        };

        // ==========================================
        // PROJECT ROLES
        // ==========================================
        if (projectId && incomingUser.project_role_ids) {

          newDict[id].project_roles[projectId] =
            incomingUser.project_role_ids;
        }

        hasChanges = true;
      });

      return hasChanges
        ? { userDictionary: newDict }
        : state;
    });
  },

  // ==========================================
  // GET USER
  // ==========================================
  getUser: (
    userId,
    currentProjectId = null
  ) => {

    if (!userId) {
      return null;
    }

    const baseUser =
      get().userDictionary[userId];

    if (!baseUser) {
      return null;
    }

    const result: UserWithContext = {

      id: baseUser.id,

      full_name: baseUser.full_name,

      avatar_url: baseUser.avatar_url,

      email: baseUser.email,

      // ✅ FIXED
      role_id: baseUser.role_id,

      current_project_role_ids: []
    };

    // ==========================================
    // PROJECT ROLE CONTEXT
    // ==========================================
    if (
      currentProjectId &&
      baseUser.project_roles &&
      baseUser.project_roles[currentProjectId]
    ) {

      result.current_project_role_ids =
        baseUser.project_roles[currentProjectId];
    }

    return result;
  },

  // ==========================================
  // FETCH ALL USERS
  // ==========================================
  fetchAllSystemUsers: async () => {

    set({
      isLoading: true
    });

    try {

      const res = await userApi.getAllUsers({
        size: 100
      });

      const data =
        (res.data as any)?.content ||
        res.data ||
        [];

      get().saveUsersToCache(data);

    } catch (error) {

      console.error(
        '❌ Error fetching users:',
        error
      );

    } finally {

      set({
        isLoading: false
      });
    }
  },

  // ==========================================
  // UPDATE USER ROLE
  // ==========================================
  updateSystemUserRole: async (
    userId,
    newRoleId
  ) => {

    const targetUser =
      get().userDictionary[userId];

    if (!targetUser) {
      return;
    }

    // ==========================================
    // OPTIMISTIC UPDATE
    // ==========================================
    set((state) => {

      const updatedDict = {
        ...state.userDictionary
      };

      updatedDict[userId] = {

        ...targetUser,

        // ✅ FIXED
        role_id: {
          _id: newRoleId,
          name: targetUser.role_id?.name || ''
        }
      };

      return {
        userDictionary: updatedDict
      };
    });

    try {

      // ==========================================
      // API UPDATE
      // ==========================================
      await userApi.updateUser(
        userId,
        {
          role_id: newRoleId
        }
      );

    } catch (error) {

      console.error(
        '❌ Error updating role:',
        error
      );

      // rollback
      get().fetchAllSystemUsers();
    }
  },

  // ==========================================
  // REMOVE USER
  // ==========================================
  removeSystemUser: async (
    userId
  ) => {

    // ==========================================
    // OPTIMISTIC UPDATE
    // ==========================================
    set((state) => {

      const updatedDict = {
        ...state.userDictionary
      };

      delete updatedDict[userId];

      return {
        userDictionary: updatedDict
      };
    });

    try {

      await userApi.deleteUser(userId);

    } catch (error) {

      console.error(
        '❌ Error removing user:',
        error
      );

      // rollback
      get().fetchAllSystemUsers();
    }
  }

}));