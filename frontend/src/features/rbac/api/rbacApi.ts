import axiosClient from '../../../lib/axiosClient';

// Helper để kiểm tra ID chuẩn MongoDB (24 ký tự hex)
const isValidObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);

export const rbacApi = {
  getRoles: () => axiosClient.get('/rbac/roles?size=100'),
  getPermissions: () => axiosClient.get('/rbac/permissions?size=500'),
  
  getPermissionsByRole: (roleId: string) => {
    // 🚀 CHẶN ĐỨNG TRƯỚC KHI LÊN SERVER
    if (!roleId || !isValidObjectId(roleId)) {
      console.warn("RBAC API: roleId không hợp lệ, hủy request:", roleId);
      // Trả về một Promise giả hoặc throw lỗi tùy Sếp, 
      // nhưng quan trọng là không gọi axiosClient.get nữa
      return Promise.reject(new Error("Invalid Role ID format"));
    }
    return axiosClient.get(`/rbac/roles/${roleId}/permissions`);
  },

  assignPermission: (roleId: string, permissionId: string) => {
    if (!isValidObjectId(roleId) || !isValidObjectId(permissionId)) {
        throw new Error("Invalid ID format for RBAC assignment");
    }
    return axiosClient.post(`/rbac/roles/${roleId}/permissions/${permissionId}`);
  },
    
  removePermission: (roleId: string, permissionId: string) => {
    if (!isValidObjectId(roleId) || !isValidObjectId(permissionId)) {
        throw new Error("Invalid ID format for RBAC removal");
    }
    return axiosClient.delete(`/rbac/roles/${roleId}/permissions/${permissionId}`);
  },
};