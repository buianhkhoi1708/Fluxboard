import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// 🚀 Đổi từ Zustand sang React Query hook của bạn
import { useAuthUser } from '../features/auth/hooks/useAuthQueries'; // Đổi đường dẫn trỏ tới file chứa hook này nhé
import { useRoleAccess } from '../features/rbac/hooks/useRoleAccess'; 

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  // 1. Dùng hook của React Query thay vì Zustand
  // Thêm cờ isLoading của user để chống nháy màn hình
  const { data: user, isLoading: isUserLoading } = useAuthUser();
  
  // 2. Hook phân quyền của bạn
  const { hasAccess, isLoadingRoles } = useRoleAccess();

  // BẮT BUỘC CHỜ 1 NHỊP ĐỂ ĐỌC XONG LOCALSTORAGE & TỪ ĐIỂN
  if (isUserLoading || isLoadingRoles) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-slate-500 font-medium text-sm animate-pulse">Đang xác thực...</span>
        </div>
      </div>
    );
  }

  // 1. KIỂM TRA ĐĂNG NHẬP
  if (!user) {
    // Nếu React Query check không thấy user hoặc token hết hạn -> Về Login
    return <Navigate to="/login" replace />;
  }

  // 2. KIỂM TRA PHÂN QUYỀN (Dành cho Route Admin/Manager)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasAccess(allowedRoles)) {
      return <Navigate to="/403" replace />;
    }
  }

  // 3. Hợp lệ toàn bộ -> Cho đi tiếp
  return <Outlet />;
};

export default ProtectedRoute;