import axiosClient from '../../../lib/axiosClient';

export const rbacApi = {
  // Bỏ '/api/v1' đi vì axiosClient đã tự động gắn rồi!
  getRoles: () => axiosClient.get('/rbac/roles?size=100'),
  getPermissions: () => axiosClient.get('/rbac/permissions?size=500'),
  
  getPermissionsByRole: (roleId: string) => axiosClient.get(`/rbac/roles/${roleId}/permissions`),

  assignPermission: (roleId: string, permissionId: string) => 
    axiosClient.post(`/rbac/roles/${roleId}/permissions/${permissionId}`),
    
  removePermission: (roleId: string, permissionId: string) => 
    axiosClient.delete(`/rbac/roles/${roleId}/permissions/${permissionId}`),
};