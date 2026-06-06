import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  CalendarClock,
  X,
} from "lucide-react";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { AppNotification } from "../types/notificationTypes";

const normalizeActionUrl = (rawUrl?: string | null) => {
  if (!rawUrl) return null;

  let url = rawUrl.trim();
  if (!url) return null;

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      url = `${parsed.pathname}${parsed.search}`;
    }
  } catch {}

  if (url.startsWith("/boards/")) {
    url = url.replace("/boards/", "/board/");
  }

  return url;
};

const resolveActionUrl = (notif: AppNotification) => {
  const directUrl = normalizeActionUrl(notif.actionUrl);
  if (directUrl) return directUrl;

  const boardId = notif.metadata?.board_id;
  const taskId = notif.metadata?.task_id || notif.referenceId;

  if (boardId && taskId) {
    return `/board/${boardId}?taskId=${taskId}`;
  }

  return null;
};

const isExtensionRequestNotification = (notif: AppNotification) => {
  return notif.type === "EXTENSION_REQUEST";
};

const cleanMessage = (message: string) => {
  return message.replace(/🚨|🛑|✅|⏳/g, "").trim();
};

const getToastTitle = (notif: AppNotification) => {
  if (isExtensionRequestNotification(notif)) {
    return "Có yêu cầu dời deadline mới";
  }

  if (
    notif.type === "TASK_COMPLETED" ||
    notif.type === "TASK_COMPLETED_BY_YOU"
  ) {
    return "Có thông báo hoàn thành task";
  }

  if (notif.type === "TASK_CREATE") {
    return "Bạn có task mới";
  }

  return "Bạn có thông báo mới";
};

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);

  const {
    notifications,
    unreadCount,
    latestToastNotification,
    connectWebSocket,
    disconnectWebSocket,
    markAsRead,
    markAllAsRead,
    clearToastNotification,
  } = useNotificationStore();

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications]);

  useEffect(() => {
    const userId = user?.id || (user as any)?._id || (user as any)?.user_id;

    if (userId) {
      connectWebSocket(String(userId));
    }

    return () => {
      disconnectWebSocket();
    };
  }, [user?.id, connectWebSocket, disconnectWebSocket]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!latestToastNotification) return;

    setIsToastVisible(true);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setIsToastVisible(false);
      clearToastNotification(latestToastNotification.id);
    }, 6500);

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [latestToastNotification, clearToastNotification]);

  const getNotificationStyle = (notif: AppNotification) => {
    const content =
      `${notif.title || ""} ${notif.message || ""} ${notif.type || ""}`.toUpperCase();

    if (
      content.includes("EXTENSION_REQUEST") ||
      content.includes("REQUEST") ||
      content.includes("DỜI DEADLINE")
    ) {
      return {
        icon: <CalendarClock size={16} className="text-amber-500" />,
        bg: "bg-amber-50",
        border: "border-amber-100",
        text: "text-amber-700",
      };
    }

    if (content.includes("WARNING") || content.includes("OVERDUE")) {
      return {
        icon: <AlertTriangle size={16} className="text-orange-500" />,
        bg: "bg-orange-50",
        border: "border-orange-100",
        text: "text-orange-700",
      };
    }

    if (content.includes("REJECT")) {
      return {
        icon: <XCircle size={16} className="text-rose-500" />,
        bg: "bg-rose-50",
        border: "border-rose-100",
        text: "text-rose-700",
      };
    }

    if (
      content.includes("APPROVED") ||
      content.includes("SUCCESS") ||
      content.includes("COMPLETED") ||
      content.includes("HOÀN THÀNH")
    ) {
      return {
        icon: <Check size={16} className="text-emerald-500" />,
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        text: "text-emerald-700",
      };
    }

    if (content.includes("TASK") || content.includes("DEADLINE")) {
      return {
        icon: <Clock size={16} className="text-indigo-500" />,
        bg: "bg-indigo-50",
        border: "border-indigo-100",
        text: "text-indigo-700",
      };
    }

    return {
      icon: <Info size={16} className="text-indigo-500" />,
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      text: "text-indigo-700",
    };
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    setIsOpen(false);

    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    if (isExtensionRequestNotification(notif)) {
      navigate(
        `/notifications?reviewNotificationId=${encodeURIComponent(notif.id)}`,
      );
      return;
    }

    const actionUrl = resolveActionUrl(notif);

    if (actionUrl) {
      navigate(actionUrl);
      return;
    }

    navigate("/notifications");
  };

  const handleToastClick = async () => {
    if (!latestToastNotification) return;

    const target = latestToastNotification;

    setIsToastVisible(false);
    clearToastNotification(target.id);

    await handleNotificationClick(target);
  };

  const closeToast = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!latestToastNotification) return;

    setIsToastVisible(false);
    clearToastNotification(latestToastNotification.id);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors focus:outline-none"
        >
          <Bell size={22} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Thông báo</h3>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
              {sortedNotifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">Chưa có thông báo mới</p>
                </div>
              ) : (
                sortedNotifications.slice(0, 6).map((notif) => {
                  const style = getNotificationStyle(notif);
                  const actionUrl = resolveActionUrl(notif);
                  const canNavigate =
                    Boolean(actionUrl) || isExtensionRequestNotification(notif);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 mb-2 rounded-xl flex gap-3 cursor-pointer transition-all ${
                        notif.isRead
                          ? "opacity-70 hover:bg-slate-50"
                          : `bg-white hover:${style.bg} border ${style.border} shadow-sm`
                      }`}
                    >
                      <div
                        className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.bg}`}
                      >
                        {style.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        {notif.title && (
                          <p
                            className={`text-xs font-black mb-0.5 truncate ${notif.isRead ? "text-slate-500" : style.text}`}
                          >
                            {notif.title}
                          </p>
                        )}

                        <p
                          className={`text-sm ${notif.isRead ? "text-slate-600" : "text-slate-800 font-semibold"} leading-snug line-clamp-2`}
                        >
                          {cleanMessage(notif.message)}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-slate-400 block">
                            {new Date(notif.timestamp).toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>

                          {canNavigate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-500">
                              <ExternalLink size={10} />
                              Mở
                            </span>
                          )}
                        </div>
                      </div>

                      {!notif.isRead && (
                        <div className="shrink-0 flex items-center justify-center w-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/80">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/notifications");
                }}
                className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
              >
                Xem tất cả thông báo
              </button>
            </div>
          </div>
        )}
      </div>

      {latestToastNotification && isToastVisible && (
        <div
          onClick={handleToastClick}
          className="fixed top-20 right-5 z-[300] w-[340px] max-w-[calc(100vw-2rem)] cursor-pointer overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in slide-in-from-right-5 fade-in duration-300"
        >
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

          <div className="p-4 flex gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              {getNotificationStyle(latestToastNotification).icon}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800">
                {getToastTitle(latestToastNotification)}
              </p>

              <p className="text-sm text-slate-600 mt-1 line-clamp-2 font-medium">
                {cleanMessage(latestToastNotification.message)}
              </p>

              <p className="text-[11px] text-indigo-600 font-black mt-2 flex items-center gap-1">
                <ExternalLink size={12} />
                Bấm để xem chi tiết
              </p>
            </div>

            <button
              type="button"
              onClick={closeToast}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationDropdown;
