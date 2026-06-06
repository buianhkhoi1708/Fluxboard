import React from "react";
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useNotificationStore } from "../features/notification/stores/useNotificationStore";

const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();

  const getNotificationStyle = (message: string) => {
    if (message.includes("🚨") || message.includes("WARNING"))
      return {
        icon: <AlertTriangle size={18} className="text-orange-500" />,
        bg: "bg-orange-50",
        border: "border-orange-100",
      };
    if (message.includes("🛑") || message.includes("OVERDUE"))
      return {
        icon: <XCircle size={18} className="text-rose-500" />,
        bg: "bg-rose-50",
        border: "border-rose-100",
      };
    if (message.includes("✅") || message.includes("APPROVED"))
      return {
        icon: <Check size={18} className="text-emerald-500" />,
        bg: "bg-emerald-50",
        border: "border-emerald-100",
      };
    if (message.includes("⏳") || message.includes("EXTENSION"))
      return {
        icon: <Clock size={18} className="text-amber-500" />,
        bg: "bg-amber-50",
        border: "border-amber-100",
      };
    return {
      icon: <Info size={18} className="text-indigo-500" />,
      bg: "bg-indigo-50",
      border: "border-indigo-100",
    };
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Bell className="text-indigo-600" size={24} />
              </div>
              Tất cả thông báo
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">
              Bạn có{" "}
              <strong className="text-indigo-600 font-semibold">
                {unreadCount}
              </strong>{" "}
              thông báo chưa đọc.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
            >
              <CheckCircle2 size={18} /> Đánh dấu đã đọc tất cả
            </button>
          )}
        </div>

        {}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Bell size={48} className="opacity-20 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Trống trơn!</h3>
              <p className="text-sm">Bạn chưa có bất kỳ thông báo nào.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => {
                const style = getNotificationStyle(notif.message);

                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-5 flex gap-4 cursor-pointer transition-all hover:bg-slate-50 ${notif.isRead ? "opacity-70" : "bg-indigo-50/30"}`}
                  >
                    <div
                      className={`mt-1 shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}
                    >
                      {style.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <p
                          className={`text-base leading-snug ${notif.isRead ? "text-slate-600 font-medium" : "text-slate-800 font-bold"}`}
                        >
                          {notif.message.replace(/🚨|🛑|✅|⏳/g, "").trim()}
                        </p>
                        {!notif.isRead && (
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-sm shadow-indigo-200"></div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-400 mt-2 flex items-center gap-1.5">
                        <Clock size={12} />
                        {new Date(notif.timestamp).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
