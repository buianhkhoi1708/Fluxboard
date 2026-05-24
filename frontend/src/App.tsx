import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import MainLayout from "./layouts/MainLayout";
import BoardPage from "./pages/BoardPage";
import { SocketProvider } from "./context/SocketContext";
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

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <NuqsAdapter>
          <Routes>

            {/* ROUTE CÔNG KHAI (Không cần đăng nhập) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/403" element={<UnauthorizedPage />} /> {/* Trang báo lỗi không có quyền */}

            {/* ROUTE CẦN ĐĂNG NHẬP */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                
                {/* Đã đăng nhập thì chuyển hướng "/" về Dashboard thay vì Login */}
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
                <Route path="/settings" element={<SettingsPage />} /> {/* Thường settings cá nhân ai cũng có */}
                <Route path="/mytasks" element={<MyTasksPage />} /> {/* Thường settings cá nhân ai cũng có */}
                <Route path="/notifications" element={<NotificationsPage />} /> {/* Thường settings cá nhân ai cũng có */}


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