import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';

const ProtectedRoute = () => {
  // 🚀 TỐI ƯU Ở ĐÂY: Chỉ "đăng ký" lắng nghe sự thay đổi của đúng biến token
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;