import React from 'react';
import Logo from '../../src/assets/icon.svg'; 
import { ChevronDown, CircleUser, Search } from 'lucide-react';
import Notification from '../pages/Notification' 

const TopNavbar = () => {
  return (
    <nav className="flex justify-between items-center px-4 md:px-6 h-[60px] border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      
      {/* LEFT SECTION: Logo & Workspace */}
      <div className="flex items-center gap-6 md:gap-8">
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <img 
            src={Logo}
            alt="Fluxboard" 
            className="h-8 w-auto object-contain" 
          />
          <span className="font-extrabold text-xl tracking-tight text-slate-900">Fluxboard</span>
        </div>
        
        {/* Workspace Selector */}
        <div className="hidden md:flex items-center gap-2.5 border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all group">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold shadow-sm">
            F
          </div>
          <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Flux Workspace</span>
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>

      {/* MIDDLE SECTION: Search Bar */}
      <div className="flex-1 max-w-md hidden lg:block px-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
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

      {/* RIGHT SECTION: Notifications & Profile */}
      <div className="flex items-center gap-4 md:gap-5">
        
        {/* ------------------------------------------------ */}
        {/* COMPONENT NOTIFICATION ĐỘNG ĐƯỢC ĐẶT VÀO ĐÂY  */}
        {/* ------------------------------------------------ */}
        <Notification />
        
        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

        {/* User Profile Button */}
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <CircleUser size={32} strokeWidth={1.5} className="text-slate-600" />
        </button>
      </div>
    </nav>
  );
};

export default TopNavbar;