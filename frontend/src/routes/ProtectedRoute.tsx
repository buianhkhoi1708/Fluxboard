import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
// 🚀 Import cái hook thần thánh bạn vừa tạo (Nhớ trỏ đúng đường dẫn file nhé)
import { useRoleAccess } from '../features/rbac/hooks/useRoleAccess'; 

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  // Chỉ lắng nghe token để biết đã đăng nhập chưa
  const token = useAuthStore((state) => state.token);
  
  // 🚀 Gọi hook phân quyền (Nó đã tự động xử lý vụ "dịch" role_id bằng từ điển)
  const { hasAccess, isLoadingRoles } = useRoleAccess();

  // 1. KIỂM TRA ĐĂNG NHẬP
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. KIỂM TRA PHÂN QUYỀN
  if (allowedRoles && allowedRoles.length > 0) {
    
    // Nếu từ điển đang load, chặn tạm màn hình trắng 1 nhịp để tránh bị văng oan
    if (isLoadingRoles) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-50">
           <span className="text-slate-400 font-medium">Đang kiểm tra quyền truy cập...</span>
        </div>
      );
    }

    // Dùng chính hàm hasAccess để check (Nó đã lo hết vụ compare tuyệt đối === rồi)
    if (!hasAccess(allowedRoles)) {
      return <Navigate to="/403" replace />;
    }
  }

  // 3. Hợp lệ toàn bộ -> Cho đi tiếp
  return <Outlet />;
};

export default ProtectedRoute;