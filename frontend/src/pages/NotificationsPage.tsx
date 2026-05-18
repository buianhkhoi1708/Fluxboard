import React from 'react';
import { Bell, Check, Info, AlertTriangle, XCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useNotificationStore, NotificationItem } from '../features/notification/store/useNotificationStore';

const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();

  const getNotificationStyle = (message: string) => {
    if (!message) return { icon: <Info size={18} className="text-indigo-500" />, bg: 'bg-indigo-50', border: 'border-indigo-100' };
    if (message.includes('🚨') || message.includes('WARNING')) return { icon: <AlertTriangle size={18} className="text-orange-500" />, bg: 'bg-orange-50', border: 'border-orange-100' };
    if (message.includes('🛑') || message.includes('OVERDUE')) return { icon: <XCircle size={18} className="text-rose-500" />, bg: 'bg-rose-50', border: 'border-rose-100' };
    if (message.includes('✅') || message.includes('APPROVED')) return { icon: <Check size={18} className="text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (message.includes('⏳') || message.includes('EXTENSION')) return { icon: <Clock size={18} className="text-amber-500" />, bg: 'bg-amber-50', border: 'border-amber-100' };
    return { icon: <Info size={18} className="text-indigo-500" />, bg: 'bg-indigo-50', border: 'border-indigo-100' };
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 w-full h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Notifications</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">You have {unreadCount} unread messages</p>
          </div>
        </div>
        
        {/* Nút Mark all as read */}
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
          >
            <CheckCircle2 size={18} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Bell size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-lg text-slate-500">No notifications yet</p>
            <p className="text-sm mt-1">When you get notifications, they'll show up here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif: NotificationItem) => {
              const style = getNotificationStyle(notif.message || '');
              
              return (
                <div
                  // 💡 Đã sửa tên thuộc tính thành _id
                  key={notif._id}
                  // 💡 Thêm sự kiện onClick để chuyển thành trạng thái đã đọc
                  onClick={() => markAsRead(notif._id)}
                  // 💡 Đã sửa tên thuộc tính thành is_read
                  className={`p-5 flex gap-4 cursor-pointer transition-colors ${
                    notif.is_read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/30 hover:bg-indigo-50/60'
                  }`}
                >
                  <div className={`mt-1 shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}>
                    {style.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      {/* 💡 Đã sửa tên thuộc tính thành is_read */}
                      <p className={`text-base leading-snug ${notif.is_read ? 'text-slate-600 font-medium' : 'text-slate-800 font-bold'}`}>
                        {notif.message ? notif.message.replace(/🚨|🛑|✅|⏳/g, '').trim() : ''}
                      </p>
                      {!notif.is_read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-sm shadow-indigo-200"></div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-400 mt-2 flex items-center gap-1.5">
                      <Clock size={12} />
                      {/* 💡 Đã sửa tên thuộc tính thành created_at */}
                      {notif.created_at ? new Date(notif.created_at).toLocaleString('vi-VN', { 
                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' 
                      }) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;