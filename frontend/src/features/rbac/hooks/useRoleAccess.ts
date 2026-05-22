import { useMemo } from 'react';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useRolesDictionary } from './useRbacQueries';

export const useRoleAccess = () => {
  const { user } = useAuthStore();
  
  // Lấy từ điển Role (đã được cache 1 tiếng, gọi 100 lần cũng chỉ tốn 1 request)
  const { data: roles = [], isLoading } = useRolesDictionary();

  // 🚀 DỊCH ROLE ID SANG TÊN ROLE
  const currentRoleName = useMemo(() => {
    if (!user) return "GUEST";

    // Trường hợp 1: Nếu Backend đã tốt bụng trả về sẵn tên Role trong object user
    const rawRoleName = user.system_role;
    if (rawRoleName) return String(rawRoleName).toUpperCase().trim();

    // Trường hợp 2: Nếu Backend chỉ trả về role_id, ta dùng Từ điển để tra cứu
    const roleId = user.role_id;
    if (roleId && roles.length > 0) {
      const matchedRole = roles.find(r => r.id === roleId);
      if (matchedRole) return matchedRole.name.toUpperCase().trim();
    }

    // Fallback mặc định an toàn nhất
    return "MEMBER"; 
  }, [user, roles]);

  // 🚀 HÀM KIỂM TRA QUYỀN
  const hasAccess = (allowedRoles: string[]) => {
    // Nếu chưa load xong từ điển, tạm thời chặn (hoặc cho qua tùy bạn)
    if (isLoading) return false;

    // "Kim bài miễn tử": Nếu tên Role có chữ ADMIN thì cho qua hết mọi chốt
    if (currentRoleName.includes('ADMIN')) return true;
    
    // Ngược lại, xem Role hiện tại có nằm trong danh sách cho phép không
    return allowedRoles.some(role => currentRoleName.includes(role.toUpperCase()));
  };

  return { currentRoleName, hasAccess, isLoadingRoles: isLoading };
};