import React, { useEffect } from 'react';
import Logo from '../../src/assets/icon.svg'; 
import { ChevronDown, Search } from 'lucide-react';

// 💡 Trỏ đúng vào thư mục components và store
import NotificationDropdown from '../features/notification/components/NotificationDropdown';
import { useNotificationStore } from '../features/notification/store/useNotificationStore';

const TopNavbar = () => {
  const { fetchNotifications, startLongPolling } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(); 
    startLongPolling();   
  }, [fetchNotifications, startLongPolling]);

  return (
    <nav className="flex justify-between items-center px-4 md:px-6 h-[60px] border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      
      <div className="flex items-center gap-6 md:gap-8">
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <img 
            src={Logo}
            alt="Fluxboard" 
            className="h-8 w-auto object-contain" 
          />
          <span className="font-extrabold text-xl tracking-tight text-slate-900">Fluxboard</span>
        </div>
        
        <div className="hidden md:flex items-center gap-2.5 border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs shadow-sm">
            F
          </div>
          <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">Fluxboard Workspace</span>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md px-6">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Search cards, boards, members..." 
            className="w-full bg-slate-100/70 border border-transparent text-sm text-slate-800 rounded-xl pl-10 pr-4 py-2 outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <span className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white shadow-sm">⌘K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-5">
        
        {/* 💡 Component Dropdown hiển thị chuông thông báo */}
        <NotificationDropdown />
        
        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 py-1 px-2 rounded-xl transition-colors">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
            U
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;