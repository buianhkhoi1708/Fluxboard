import { useMemo } from 'react';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useRolesDictionary } from './useRbacQueries';

export const useRoleAccess = () => {
  const { user } = useAuthStore();
  const { data: roles = [], isLoading } = useRolesDictionary();

  const currentRoleName = useMemo(() => {
    if (!user) return "GUEST";

    // 1. Nếu Backend có sẵn tên Role (role_name, system_role...)
    const rawRoleName = user.system_role || (user as any).role_name || (user as any).role;
    if (rawRoleName) return String(rawRoleName).toUpperCase().trim();

    // 2. Tra cứu bằng role_id (FIX LỖI _id CỦA MONGODB TẠI ĐÂY)
    const roleId = user.role_id;
    if (roleId && roles.length > 0) {
      // Thêm r._id để bắt đúng ID từ MongoDB
      const matchedRole = roles.find(r => 
        String(r._id || r.id) === String(roleId)
      );
      
      if (matchedRole) return matchedRole.name.toUpperCase().trim();
    }

    return "MEMBER"; 
  }, [user, roles]);

  const hasAccess = (allowedRoles: string[]) => {
    const hasRoleNameReady = user?.system_role || (user as any).role_name || (user as any).role;
    if (isLoading && !hasRoleNameReady) return false;

    // Kích hoạt full quyền nếu là SYSTEM_ADMIN hoặc ADMIN
    if (currentRoleName.includes('ADMIN')) return true;
    
    return allowedRoles.some(role => currentRoleName.includes(role.toUpperCase()));
  };

  return { currentRoleName, hasAccess, isLoadingRoles: isLoading };
};