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

  // 1. GỌI API THẬT ĐỂ LẤY DANH SÁCH ROLES VÀ PERMISSIONS
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
      // 🚀 FIX: Kiểm tra cả .id và ._id (đề phòng backend trả về _id của MongoDB)
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

  // 2. GỌI API THẬT LẤY QUYỀN CỦA ROLE ĐANG CHỌN
  setActiveRole: async (roleId: string) => {
    // 🚀 FIX: Chặn gọi API nếu ID không chuẩn
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

  // 3. GỌI API THẬT ĐỂ GÁN/XÓA QUYỀN KHI BẤM CÔNG TẮC
  togglePermission: async (
    roleId: string,
    permissionId: string,
    currentStatus: boolean,
  ) => {
    // Optimistic Update: Đổi UI trước cho mượt
    set((state) => {
      const newIds = currentStatus
        ? state.activeRolePermissionIds.filter((id) => id !== permissionId)
        : [...state.activeRolePermissionIds, permissionId];
      return { activeRolePermissionIds: newIds };
    });

    // Gọi API thật phía sau
    try {
      if (currentStatus) {
        await rbacApi.removePermission(roleId, permissionId);
      } else {
        await rbacApi.assignPermission(roleId, permissionId);
      }
    } catch (error) {
      console.error("❌ Lỗi thay đổi quyền:", error);
      // Trả lại trạng thái cũ nếu API báo lỗi
      get().setActiveRole(roleId);
    }
  },
}));
