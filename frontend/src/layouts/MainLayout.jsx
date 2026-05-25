import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { useNotificationStore } from '../features/notification/stores/useNotificationStore';
import { useAuthStore } from '../features/auth/store/useAuthStore';

const MainLayout = () => {
  const user = useAuthStore((state) => state.user);
  const connectWebSocket = useNotificationStore((state) => state.connectWebSocket);
  const disconnectWebSocket = useNotificationStore((state) => state.disconnectWebSocket);

  useEffect(() => {
    const userId = user?.id || user?._id || user?.user_id;

    if (userId) {
      console.log('[Notification] Start pipeline for user:', userId);
      connectWebSocket(String(userId));
    }

    return () => {
      disconnectWebSocket();
    };
  }, [user?.id, user?._id, user?.user_id, connectWebSocket, disconnectWebSocket]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800">
      <TopNavbar />

      <div className="flex flex-1 w-full overflow-hidden">
        <Sidebar />

        <main className="flex-1 w-full overflow-y-auto flex flex-col bg-white shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10">
          <div className="flex-1 relative">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;