import { create } from 'zustand';
import { rbacApi } from '../api/rbacApi';

interface IRbacState {
  roles: any[];
  permissions: any[];
  activeRoleId: string | null;
  activeRolePermissionIds: string[]; 
  isLoading: boolean;

  fetchInitialData: () => Promise<void>;
  setActiveRole: (roleId: string) => Promise<void>;
  togglePermission: (roleId: string, permissionId: string, currentStatus: boolean) => Promise<void>;
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
        rbacApi.getPermissions()
      ]);
      
      // Xử lý đúng chuẩn ResponseFactory.paged của Mạnh
      const rolesData = rolesRes.data?.data?.content || rolesRes.data?.content || rolesRes.data || [];
      const permsData = permsRes.data?.data?.content || permsRes.data?.content || permsRes.data || [];
      
      set({ 
        roles: rolesData, 
        permissions: permsData,
        isLoading: false 
      });

      // Mặc định load quyền của Role đầu tiên
      if (rolesData.length > 0) {
        get().setActiveRole(rolesData[0].id);
      }
    } catch (error) {
      console.error("❌ Lỗi tải dữ liệu RBAC gốc:", error);
      set({ isLoading: false });
    }
  },

  // 2. GỌI API THẬT LẤY QUYỀN CỦA ROLE ĐANG CHỌN
  setActiveRole: async (roleId: string) => {
    set({ activeRoleId: roleId, isLoading: true });
    try {
      const res = await rbacApi.getPermissionsByRole(roleId);
      // Xử lý đúng chuẩn ResponseFactory.ok của Mạnh
      const activePerms = res.data?.data || res.data || [];
      
      const activeIds = activePerms.map((p: any) => p.id);
      set({ activeRolePermissionIds: activeIds, isLoading: false });
    } catch (error) {
      console.error("❌ Lỗi tải quyền của Role:", error);
      set({ activeRolePermissionIds: [], isLoading: false });
    }
  },

  // 3. GỌI API THẬT ĐỂ GÁN/XÓA QUYỀN KHI BẤM CÔNG TẮC
  togglePermission: async (roleId: string, permissionId: string, currentStatus: boolean) => {
    // Optimistic Update: Đổi UI trước cho mượt
    set((state) => {
      const newIds = currentStatus 
        ? state.activeRolePermissionIds.filter(id => id !== permissionId) 
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
  }
}));