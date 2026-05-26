import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useRoleAccess } from '../features/rbac/hooks/useRoleAccess';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const location = useLocation();

  const { user, token, checkAuth } = useAuthStore();

  const {
    hasAccess,
    isLoadingRoles,
    currentRoleName,
  } = useRoleAccess();

  const isAuthenticated = Boolean(token && user && checkAuth());

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoadingRoles) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />

          <span className="text-slate-500 font-medium text-sm animate-pulse">
            Đang xác thực quyền truy cập...
          </span>
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasAccess(allowedRoles)) {
      return (
        <Navigate
          to="/403"
          replace
          state={{
            from: location,
            requiredRoles: allowedRoles,
            currentRoleName,
          }}
        />
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;