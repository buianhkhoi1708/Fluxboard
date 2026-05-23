import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// ✅ 1. Dùng trực tiếp Zustand thay vì React Query để có data tức thì
import { useAuthStore } from '../features/auth/store/useAuthStore'; 
import { useRoleAccess } from '../features/rbac/hooks/useRoleAccess'; 

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const location = useLocation();
  
  // Lấy dữ liệu siêu tốc từ bộ nhớ của Zustand (Đã parse sẵn từ LocalStorage)
  const { user, token } = useAuthStore();
  
  // Hook phân quyền của Sếp
  const { hasAccess, isLoadingRoles } = useRoleAccess();

  // ==========================================
  // BƯỚC 1: KIỂM TRA ĐĂNG NHẬP
  // ==========================================
  // Nếu chưa có token hoặc chưa có user -> Đá về Login ngay lập tức
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ==========================================
  // BƯỚC 2: CHỜ TẢI TỪ ĐIỂN ROLE
  // ==========================================
  if (isLoadingRoles) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-slate-500 font-medium text-sm animate-pulse">
            Đang xác thực quyền truy cập...
          </span>
        </div>
      </div>
    );
  }

  // ==========================================
  // BƯỚC 3: KIỂM TRA PHÂN QUYỀN
  // ==========================================
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasAccess(allowedRoles)) {
      // 🚨 Bị lỗi chỗ này với Member nè:
      // Nếu Member lỡ truy cập vào '/admin' sau khi login, thay vì đá văng ra /login
      // Ta đá họ về trang dashboard chung của họ (tránh vòng lặp vô tận)
      return <Navigate to="/dashboard" replace />;
    }
  }

  // ==========================================
  // 4. HỢP LỆ TOÀN BỘ -> CHO ĐI TIẾP
  // ==========================================
  return <Outlet />;
};

export default ProtectedRoute;