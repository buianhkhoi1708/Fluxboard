import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import MainLayout from "./layouts/MainLayout";
import BoardPage from "./pages/BoardPage";
import { SocketProvider, useSocket } from "./context/SocketContext"; 
import AdminRBACPage from "./pages/AdminRBACPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import BoardView from "./features/board/components/BoardView";
import AiBoardGeneratorPage from "./pages/AiBoardGeneratePage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import OrganizationPage from "./pages/OrganizationPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import CreateUserTab from "./features/user/components/CreateUserTab";
import MyTasksPage from "./pages/MyTasksPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotificationsPage from "./pages/NotificationsPage";
import { useQueryClient } from "@tanstack/react-query";

// =========================================================
// THÀNH PHẦN LẮNG NGHE BẢO MẬT HỆ THỐNG (SECURITY LISTENER)
// =========================================================
const SecurityListener: React.FC = () => {
  const { socket } = useSocket(); // 💡 Sửa lỗi: Destructure lấy thực thể socket instance từ Context Object
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    // Lắng nghe tín hiệu đăng xuất cưỡng chế từ máy chủ thời gian thực
    socket.on("force_logout", (data: { reason: string }) => {
      console.warn(`[SECURITY] Force logout triggered: ${data.reason}`);
      
      // Dọn sạch token, bộ nhớ đệm ứng dụng và bộ nhớ Cache của TanStack Query
      localStorage.removeItem("accessToken");
      sessionStorage.clear();
      queryClient.clear();

      // Điều hướng ngay lập tức về trang đăng nhập kèm lý do hệ thống
      navigate("/login", { replace: true, state: { reason: data.reason } });
    });

    return () => {
      socket.off("force_logout");
    };
  }, [socket, navigate, queryClient]);

  return null; // Thành phần chạy ngầm không render giao diện
};

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <NuqsAdapter>
          {/* Đặt SecurityListener bên trong BrowserRouter để có thể sử dụng useNavigate */}
          <SecurityListener />
          
          <Routes>

            {/* ROUTE CÔNG KHAI (Không cần đăng nhập) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/403" element={<UnauthorizedPage />} />

            {/* ROUTE CẦN ĐĂNG NHẬP */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* ========================================== */}
                {/* 🟢 KHU VỰC CHUNG (Member, Manager, Admin đều xem được) */}
                {/* ========================================== */}
                <Route path="/dashboard" element={<DashboardPage/>} />
                <Route path="/board" element={<BoardPage />} />
                <Route path="/board/:id" element={<BoardView />} />
                <Route path="/workspaces" element={<WorkspacesPage />} />
                <Route path="/aigenerateboard" element={<AiBoardGeneratorPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} /> 
                <Route path="/mytasks" element={<MyTasksPage />} /> 
                <Route path="/notifications" element={<NotificationsPage />} /> 

                {/* ========================================== */}
                {/* 🔴 KHU VỰC QUẢN TRỊ (Chỉ Admin hoặc Role được cấp phép) */}
                {/* ========================================== */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SYSTEM_ADMIN']} />}>
                  <Route path="/adminrbac" element={<AdminRBACPage />} />
                  <Route path="/organization" element={<OrganizationPage />} />
                  <Route path="/createuser" element={<CreateUserTab />} />
                  <Route path="/activity" element={<ActivityLogPage />} />
                </Route>

              </Route>
            </Route>

          </Routes>
        </NuqsAdapter>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;