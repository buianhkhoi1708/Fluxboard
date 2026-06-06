import axiosClient from "../../../lib/axiosClient";

const isValidObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);

export const rbacApi = {
  getRoles: () => axiosClient.get("/rbac/roles?size=100"),
  getPermissions: () => axiosClient.get("/rbac/permissions?size=500"),

  getPermissionsByRole: (roleId: string) => {
    if (!roleId || !isValidObjectId(roleId)) {
      console.warn("RBAC API: roleId không hợp lệ, hủy request:", roleId);

      return Promise.reject(new Error("Invalid Role ID format"));
    }
    return axiosClient.get(`/rbac/roles/${roleId}/permissions`);
  },

  assignPermission: (roleId: string, permissionId: string) => {
    if (!isValidObjectId(roleId) || !isValidObjectId(permissionId)) {
      throw new Error("Invalid ID format for RBAC assignment");
    }
    return axiosClient.post(
      `/rbac/roles/${roleId}/permissions/${permissionId}`,
    );
  },

  removePermission: (roleId: string, permissionId: string) => {
    if (!isValidObjectId(roleId) || !isValidObjectId(permissionId)) {
      throw new Error("Invalid ID format for RBAC removal");
    }
    return axiosClient.delete(
      `/rbac/roles/${roleId}/permissions/${permissionId}`,
    );
  },
};
