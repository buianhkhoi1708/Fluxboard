import React, { useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import { useQueryClient } from '@tanstack/react-query';

import MainLayout from './layouts/MainLayout';
import BoardPage from './pages/BoardPage';
import { SocketProvider, useSocket } from './context/SocketContext';
import AdminRBACPage from './pages/AdminRBACPage';
import WorkspacesPage from './pages/WorkspacesPage';
import BoardView from './features/board/components/BoardView';
import AiBoardGeneratorPage from './pages/AiBoardGeneratePage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './routes/ProtectedRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ActivityLogPage from './pages/ActivityLogPage';
import OrganizationPage from './pages/OrganizationPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import CreateUserTab from './features/user/components/CreateUserTab';
import MyTasksPage from './pages/MyTasksPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotificationsPage from './pages/NotificationsPage';

import { useAuthStore } from './features/auth/store/useAuthStore';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'lastActivityAt';

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'click',
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'wheel',
  'touchstart',
];

const publicPaths = new Set([
  '/login',
  '/forgot-password',
  '/reset-password',
]);

const SecurityListener: React.FC = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!socket) return;

    const handleForceLogout = (data: { reason?: string }) => {
      console.warn(`[SECURITY] Force logout triggered: ${data?.reason || 'No reason'}`);

      queryClient.clear();

      logout({
        redirect: false,
      });

      navigate('/login', {
        replace: true,
        state: {
          reason: data?.reason || 'Phiên đăng nhập của bạn đã bị kết thúc.',
        },
      });
    };

    socket.on('force_logout', handleForceLogout);

    return () => {
      socket.off('force_logout', handleForceLogout);
    };
  }, [socket, navigate, queryClient, logout]);

  return null;
};

const IdleSessionGuard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);

  const isLoggingOutRef = useRef(false);

  const isPublicPath = publicPaths.has(location.pathname);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    if (!token || !user || isPublicPath) {
      return;
    }

    const markActivity = () => {
      if (isLoggingOutRef.current) return;

      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    };

    const logoutByIdle = () => {
      if (isLoggingOutRef.current) return;

      isLoggingOutRef.current = true;

      queryClient.clear();

      logout({
        redirect: false,
      });

      navigate('/login', {
        replace: true,
        state: {
          reason: 'Bạn đã không thao tác trong 20 phút. Vui lòng đăng nhập lại.',
        },
      });
    };

    const checkIdle = () => {
      const rawLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      const lastActivity = rawLastActivity ? Number(rawLastActivity) : Date.now();

      if (!rawLastActivity || Number.isNaN(lastActivity)) {
        markActivity();
        return;
      }

      const idleTime = Date.now() - lastActivity;

      if (idleTime >= IDLE_TIMEOUT_MS) {
        logoutByIdle();
      }
    };

    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      markActivity();
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, {
        passive: true,
      });
    });

    document.addEventListener('visibilitychange', checkIdle);

    const intervalId = window.setInterval(checkIdle, 10000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });

      document.removeEventListener('visibilitychange', checkIdle);
      window.clearInterval(intervalId);
    };
  }, [token, user, isPublicPath, navigate, queryClient, logout]);

  useEffect(() => {
    isLoggingOutRef.current = false;
  }, [token, user]);

  return null;
};

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <NuqsAdapter>
          <SecurityListener />
          <IdleSessionGuard />

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/403" element={<UnauthorizedPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/board" element={<BoardPage />} />
                <Route path="/board/:id" element={<BoardView />} />
                <Route path="/workspaces" element={<WorkspacesPage />} />
                <Route path="/aigenerateboard" element={<AiBoardGeneratorPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/mytasks" element={<MyTasksPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />

                <Route
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SYSTEM_ADMIN']} />
                  }
                >
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