import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, XCircle, Clock } from 'lucide-react';
// 💡 Sửa lại đường dẫn thành 'store'
import { useNotificationStore, NotificationItem } from '../store/useNotificationStore'; 
import { useNavigate } from 'react-router-dom';

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // 💡 Chỉ lấy những hàm thực sự tồn tại trong Store
  const { 
    notifications, 
    unreadCount, 
    markAsRead 
  } = useNotificationStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationStyle = (message: string) => {
    if (!message) return { icon: <Info size={16} className="text-indigo-500" />, bg: 'bg-indigo-50', border: 'border-indigo-100' };
    if (message.includes('🚨') || message.includes('WARNING')) return { icon: <AlertTriangle size={16} className="text-orange-500" />, bg: 'bg-orange-50', border: 'border-orange-100' };
    if (message.includes('🛑') || message.includes('OVERDUE')) return { icon: <XCircle size={16} className="text-rose-500" />, bg: 'bg-rose-50', border: 'border-rose-100' };
    if (message.includes('✅') || message.includes('APPROVED')) return { icon: <Check size={16} className="text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (message.includes('⏳') || message.includes('EXTENSION')) return { icon: <Clock size={16} className="text-amber-500" />, bg: 'bg-amber-50', border: 'border-amber-100' };
    return { icon: <Info size={16} className="text-indigo-500" />, bg: 'bg-indigo-50', border: 'border-indigo-100' }; 
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors focus:outline-none"
      >
        <Bell size={22} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
            {/* Tạm ẩn nút markAllAsRead vì Store chưa có logic này, bạn có thể thêm sau */}
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No new notifications</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notif: NotificationItem) => { 
                const style = getNotificationStyle(notif.message || '');
                return (
                  <div 
                    // 💡 Cập nhật đúng thuộc tính MongoDB: _id, is_read, created_at
                    key={notif._id} 
                    onClick={() => markAsRead(notif._id)}
                    className={`p-3 mb-2 rounded-xl flex gap-3 cursor-pointer transition-all ${notif.is_read ? 'opacity-60 hover:bg-slate-50' : `bg-white hover:${style.bg} border ${style.border} shadow-sm`}`}
                  >
                    <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.bg}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${notif.is_read ? 'text-slate-600' : 'text-slate-800 font-semibold'} leading-snug`}>
                        {notif.message ? notif.message.replace(/🚨|🛑|✅|⏳/g, '').trim() : ''}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                        {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {!notif.is_read && <div className="shrink-0 flex items-center justify-center w-3"><div className="w-2 h-2 rounded-full bg-indigo-500"></div></div>}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="p-3 border-t border-slate-100 bg-slate-50/80">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
            >
              Xem tất cả thông báo
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;