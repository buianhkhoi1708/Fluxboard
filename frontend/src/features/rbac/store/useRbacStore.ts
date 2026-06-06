import { create } from "zustand";
import { rbacApi } from "../api/rbacApi";

interface IRbacState {
  roles: any[];
  permissions: any[];
  activeRoleId: string | null;
  activeRolePermissionIds: string[];
  isLoading: boolean;

  fetchInitialData: () => Promise<void>;
  setActiveRole: (roleId: string) => Promise<void>;
  togglePermission: (
    roleId: string,
    permissionId: string,
    currentStatus: boolean,
  ) => Promise<void>;
}

export const useRbacStore = create<IRbacState>((set, get) => ({
  roles: [],
  permissions: [],
  activeRoleId: null,
  activeRolePermissionIds: [],
  isLoading: false,

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rbacApi.getRoles(),
        rbacApi.getPermissions(),
      ]);

      const rolesData =
        rolesRes.data?.data?.content ||
        rolesRes.data?.content ||
        rolesRes.data ||
        [];
      const permsData =
        permsRes.data?.data?.content ||
        permsRes.data?.content ||
        permsRes.data ||
        [];

      set({ roles: rolesData, permissions: permsData, isLoading: false });

      const firstRole = rolesData[0];

      const roleIdToUse = firstRole?.id || firstRole?._id;

      if (roleIdToUse && /^[a-f\d]{24}$/i.test(roleIdToUse)) {
        get().setActiveRole(roleIdToUse);
      } else {
        console.warn(
          "RBAC: Role đầu tiên không có ID hợp lệ, bỏ qua load quyền.",
        );
      }
    } catch (error) {
      console.error("❌ Lỗi tải dữ liệu RBAC gốc:", error);
      set({ isLoading: false });
    }
  },

  setActiveRole: async (roleId: string) => {
    if (!roleId || !/^[a-f\d]{24}$/i.test(roleId)) {
      console.warn("RBAC: RoleID không hợp lệ, không gọi API:", roleId);
      return;
    }

    set({ activeRoleId: roleId, isLoading: true });
    try {
      const res = await rbacApi.getPermissionsByRole(roleId);
      const activePerms = res.data?.data || res.data || [];

      const activeIds = activePerms.map((p: any) => p.id || p._id);
      set({ activeRolePermissionIds: activeIds, isLoading: false });
    } catch (error) {
      console.error("❌ Lỗi tải quyền của Role:", error);
      set({ activeRolePermissionIds: [], isLoading: false });
    }
  },

  togglePermission: async (
    roleId: string,
    permissionId: string,
    currentStatus: boolean,
  ) => {
    set((state) => {
      const newIds = currentStatus
        ? state.activeRolePermissionIds.filter((id) => id !== permissionId)
        : [...state.activeRolePermissionIds, permissionId];
      return { activeRolePermissionIds: newIds };
    });

    try {
      if (currentStatus) {
        await rbacApi.removePermission(roleId, permissionId);
      } else {
        await rbacApi.assignPermission(roleId, permissionId);
      }
    } catch (error) {
      console.error("❌ Lỗi thay đổi quyền:", error);

      get().setActiveRole(roleId);
    }
  },
}));
