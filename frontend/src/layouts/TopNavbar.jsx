import React, { useState } from 'react';
import Logo from '../../src/assets/icon.svg';
import { User } from 'lucide-react';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useRoleAccess } from '../features/rbac/hooks/useRoleAccess';

import NotificationDropdown from '../features/notification/components/NotificationDropdown';

const TopNavbar = () => {
  const { user, logout } = useAuthStore();
  const { currentRoleName } = useRoleAccess();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const userName = user?.full_name || user?.fullName || 'Khách';
  const userInitial = userName.charAt(0).toUpperCase();
  const avatarUrl = user?.avatar_url || user?.avatarUrl;

  const handleUserProfile = () => {
    window.location.href = '/settings';
  };

  return (
    <nav className="flex justify-between items-center px-4 md:px-6 h-[64px] border-b border-slate-200/80 bg-gradient-to-r from-white/90 via-white/80 to-indigo-50/50 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-6 md:gap-8">
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <img
            src={Logo}
            alt="Fluxboard"
            className="h-8 w-auto object-contain"
          />
          <span className="font-extrabold text-xl tracking-tight text-slate-990">
            Fluxboard
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-5 ml-auto">
        <NotificationDropdown />

        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm border border-indigo-200">
                {userInitial}
              </div>
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
              <div className="px-4 py-3 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {userName}
                </p>
                <p className="text-[11px] font-medium text-slate-400 truncate">
                  {user?.email || 'Chưa có email'}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-md border border-indigo-100">
                  {currentRoleName || 'Thành viên'}
                </span>
              </div>

              <button
                onClick={handleUserProfile}
                className="w-[calc(100%-0.5rem)] text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 rounded-lg mx-1"
              >
                <User size={16} /> Hồ sơ cá nhân
              </button>

              <button
                onClick={logout}
                className="w-[calc(100%-0.5rem)] text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 rounded-lg mx-1"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;