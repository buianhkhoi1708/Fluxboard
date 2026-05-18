import React, { useState, useEffect } from 'react';
import Logo from '../../src/assets/icon.svg'; 
import { ChevronDown, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 
import { useAuthStore } from '../features/auth/store/useAuthStore'; 
import NotificationDropdown from '../features/notification/components/NotificationDropdown';
// Sửa đường dẫn import thành 'stores' theo cấu trúc thư mục thực tế của dự án
import { useNotificationStore } from '../features/notification/stores/useNotificationStore';

const TopNavbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate(); 
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { fetchNotifications, startLongPolling } = useNotificationStore();

  const userName = user?.full_name || user?.fullName || "Guest User";
  const userInitial = userName.charAt(0).toUpperCase();
  const avatarUrl = user?.avatar_url || user?.avatarUrl;
  const currentRoleName = user?.role_name || "MEMBER"; 

  const handleUserProfile = () => {
    navigate('/settings'); 
    setIsProfileOpen(false);
  };

  // Kích hoạt tiến trình đồng bộ dữ liệu và vòng lặp long polling chạy ngầm
  useEffect(() => {
    fetchNotifications();
    startLongPolling();
  }, [fetchNotifications, startLongPolling]);

  return (
    <nav className="flex justify-between items-center px-4 md:px-6 h-[60px] border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-6 md:gap-8">
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <img src={Logo} alt="Fluxboard" className="h-8 w-auto object-contain" />
          <span className="font-extrabold text-xl tracking-tight text-slate-900">Fluxboard</span>
        </div>
        <div className="hidden md:flex items-center gap-2.5 border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold shadow-sm">F</div>
          <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Flux Workspace</span>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>

      <div className="flex-1 max-w-md hidden lg:block px-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input type="text" placeholder="Search cards, boards, members..." className="w-full bg-slate-100/70 border border-transparent text-sm text-slate-800 rounded-xl pl-10 pr-4 py-2 outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400" />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <span className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white shadow-sm">⌘K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-5">
        <NotificationDropdown />
        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
        <div className="relative">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 hover:opacity-80 transition-opacity p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-100">
            {avatarUrl ? <img src={avatarUrl} alt={userName} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm" /> : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm border border-indigo-200">{userInitial}</div>}
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                <p className="text-[11px] font-medium text-slate-400 truncate">{user?.email || "No email"}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded border border-indigo-100">{currentRoleName}</span>
              </div>
              <button onClick={handleUserProfile} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2"><User size={16} /> Hồ sơ cá nhân</button>
              <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2">Đăng xuất</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;