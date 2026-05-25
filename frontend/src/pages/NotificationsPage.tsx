import React, { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle2,
  CalendarClock,
  UserRound,
  MessageSquareText,
  X,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../features/notification/stores/useNotificationStore';
import { notificationApi } from '../features/notification/api/notificationApi';
import { AppNotification } from '../features/notification/types/notificationTypes';

const formatDate = (value?: string | Date | null) => {
  if (!value) return 'Không rõ';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không rõ';
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const normalizeActionUrl = (rawUrl?: string | null) => {
  if (!rawUrl) return null;

  let url = rawUrl.trim();
  if (!url) return null;

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      url = `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Giữ nguyên rawUrl nếu URL parse lỗi
  }

  // App hiện đang khai báo route /board/:id, không phải /boards/:id
  if (url.startsWith('/boards/')) {
    url = url.replace('/boards/', '/board/');
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

interface ConfirmActionModalProps {
  open: boolean;
  type: 'approve' | 'reject' | null;
  taskTitle?: string;
  isSubmitting?: boolean;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  open,
  type,
  taskTitle,
  isSubmitting = false,
  rejectReason,
  onRejectReasonChange,
  onClose,
  onConfirm,
}) => {
  if (!open || !type) return null;

  const isApprove = type === 'approve';

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-white/70 animate-in zoom-in-95 fade-in duration-200">
        <div
          className={`px-6 py-5 text-white ${
            isApprove
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : 'bg-gradient-to-br from-rose-500 to-red-600'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              {isApprove ? <ShieldCheck size={26} /> : <XCircle size={26} />}
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/75">
                Xác nhận thao tác
              </p>
              <h3 className="text-xl font-black mt-1">
                {isApprove ? 'Chấp nhận dời hạn?' : 'Từ chối dời hạn?'}
              </h3>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">
              {isApprove
                ? 'Bạn chắc chắn muốn chấp nhận yêu cầu dời deadline cho task này? Sau khi xác nhận, deadline mới sẽ được áp dụng.'
                : 'Bạn chắc chắn muốn từ chối yêu cầu dời deadline cho task này? Nhân viên sẽ nhận được thông báo kết quả.'}
            </p>

            {taskTitle && (
              <p className="mt-3 text-sm font-black text-slate-800">
                Task: {taskTitle}
              </p>
            )}
          </div>

          {!isApprove && (
            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <MessageSquareText size={16} />
                Lý do từ chối
              </label>

              <textarea
                value={rejectReason}
                onChange={(event) => onRejectReasonChange(event.target.value)}
                disabled={isSubmitting}
                placeholder="Nhập lý do từ chối, hoặc để trống nếu không cần..."
                className="w-full min-h-[110px] rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 outline-none resize-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:opacity-60"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 hover:bg-slate-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black text-white transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
              }`}
            >
              {isSubmitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : isApprove ? (
                <CheckCircle2 size={17} />
              ) : (
                <XCircle size={17} />
              )}
              {isApprove ? 'Chấp nhận' : 'Từ chối'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExtensionReviewModalProps {
  open: boolean;
  notification: AppNotification | null;
  onClose: () => void;
  onDone: (notificationId: string) => void;
}

const ExtensionReviewModal: React.FC<ExtensionReviewModalProps> = ({
  open,
  notification,
  onClose,
  onDone,
}) => {
  const navigate = useNavigate();

  const [confirmType, setConfirmType] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const meta = notification?.metadata || {};
  const taskId = meta.task_id || notification?.referenceId;
  const actionUrl = notification ? resolveActionUrl(notification) : null;

  const taskTitle = meta.task_title || notification?.title || 'Task cần xử lý';

  if (!open || !notification) return null;

  const handleGoToTask = async () => {
    if (!actionUrl) {
      setLocalError('Thông báo này chưa có đường dẫn task. Cần backend gửi action_url hoặc metadata.board_id/task_id.');
      return;
    }

    if (!notification.isRead) {
      await notificationApi.markAsReadOnServer(notification.id);
      onDone(notification.id);
    }

    onClose();
    navigate(actionUrl);
  };

  const openApproveConfirm = () => {
    setLocalError('');
    setConfirmType('approve');
  };

  const openRejectConfirm = () => {
    setLocalError('');
    setRejectReason('');
    setConfirmType('reject');
  };

  const handleConfirmAction = async () => {
    if (!taskId) {
      setLocalError('Không tìm thấy task_id của yêu cầu này.');
      setConfirmType(null);
      return;
    }

    if (!confirmType) return;

    setIsSubmitting(true);
    setLocalError('');

    try {
      if (confirmType === 'approve') {
        await notificationApi.approveDeadlineExtension(String(taskId));
      } else {
        await notificationApi.rejectDeadlineExtension(String(taskId), rejectReason.trim());
      }

      await notificationApi.markAsReadOnServer(notification.id);
      onDone(notification.id);
      setConfirmType(null);
      onClose();
    } catch (error: any) {
      console.error('Deadline extension action error:', error);
      setLocalError(
        error?.response?.data?.message ||
          'Thao tác thất bại. Vui lòng kiểm tra lại trạng thái yêu cầu hoặc thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          onClick={isSubmitting ? undefined : onClose}
        />

        <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-white/70 animate-in zoom-in-95 fade-in duration-200">
          <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-7 py-6 text-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25 transition disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shadow-lg">
                <CalendarClock size={28} />
              </div>

              <div>
                <p className="text-sm font-bold text-indigo-100">
                  Yêu cầu dời deadline
                </p>
                <h2 className="text-2xl font-black leading-tight mt-1">
                  {taskTitle}
                </h2>
              </div>
            </div>
          </div>

          <div className="p-7 space-y-5">
            {localError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {localError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-wider mb-2">
                  <UserRound size={15} /> Người xin
                </div>
                <p className="font-extrabold text-slate-800">
                  {meta.requester_name || 'Không rõ'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-wider mb-2">
                  <CalendarClock size={15} /> Deadline hiện tại
                </div>
                <p className="font-extrabold text-rose-600">
                  {formatDate(meta.current_due_date)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider mb-2">
                  <CalendarClock size={15} /> Deadline mới đề xuất
                </div>
                <p className="font-extrabold text-emerald-700">
                  {formatDate(meta.requested_due_date)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase tracking-wider mb-2">
                <MessageSquareText size={15} /> Lý do xin dời
              </div>
              <p className="text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap">
                {meta.reason || 'Không có lý do'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleGoToTask}
                disabled={!actionUrl || isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-extrabold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ExternalLink size={18} /> Chi tiết task
              </button>

              <button
                type="button"
                onClick={openRejectConfirm}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 font-extrabold text-white hover:bg-rose-700 transition shadow-lg shadow-rose-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <XCircle size={18} />
                Từ chối
              </button>

              <button
                type="button"
                onClick={openApproveConfirm}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-extrabold text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={18} />
                Chấp nhận
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={!!confirmType}
        type={confirmType}
        taskTitle={taskTitle}
        isSubmitting={isSubmitting}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onClose={() => {
          if (!isSubmitting) setConfirmType(null);
        }}
        onConfirm={handleConfirmAction}
      />
    </>
  );
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();

  const [reviewNotification, setReviewNotification] = useState<AppNotification | null>(null);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications]);

  const getNotificationStyle = (notif: AppNotification) => {
    const message = `${notif.title || ''} ${notif.message || ''} ${notif.type || ''}`.toUpperCase();

    if (message.includes('WARNING') || message.includes('REQUEST') || message.includes('EXTENSION_REQUEST')) {
      return {
        icon: <AlertTriangle size={18} className="text-amber-500" />,
        bg: 'bg-amber-50',
        border: 'border-amber-100',
      };
    }

    if (message.includes('OVERDUE') || message.includes('REJECT')) {
      return {
        icon: <XCircle size={18} className="text-rose-500" />,
        bg: 'bg-rose-50',
        border: 'border-rose-100',
      };
    }

    if (
      message.includes('APPROVED') ||
      message.includes('SUCCESS') ||
      message.includes('DONE') ||
      message.includes('COMPLETED') ||
      message.includes('HOÀN THÀNH')
    ) {
      return {
        icon: <Check size={18} className="text-emerald-500" />,
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
      };
    }

    if (message.includes('DEADLINE') || message.includes('TASK')) {
      return {
        icon: <Clock size={18} className="text-indigo-500" />,
        bg: 'bg-indigo-50',
        border: 'border-indigo-100',
      };
    }

    return {
      icon: <Info size={18} className="text-indigo-500" />,
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    };
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (notif.type === 'EXTENSION_REQUEST') {
      setReviewNotification(notif);

      if (!notif.isRead) {
        await markAsRead(notif.id);
      }

      return;
    }

    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    const actionUrl = resolveActionUrl(notif);

    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  const handleModalDone = (notificationId: string) => {
    useNotificationStore.setState((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(
        0,
        state.notifications.filter((n) => !n.isRead && n.id !== notificationId).length,
      ),
    }));
  };

  return (
    <>
      <div className="flex-1 bg-slate-50 h-full overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-3xl mx-auto">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Bell size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Tất cả thông báo
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Bạn có <strong className="text-indigo-600">{unreadCount}</strong> thông báo chưa đọc.
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 hover:text-indigo-600 transition-all shadow-sm"
              >
                <CheckCircle2 size={16} /> Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {sortedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Bell size={48} className="opacity-20 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Trống trơn!</h3>
                <p className="text-sm">Bạn chưa có bất kỳ thông báo nào.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sortedNotifications.map((notif) => {
                  const style = getNotificationStyle(notif);
                  const actionUrl = resolveActionUrl(notif);
                  const canNavigate = Boolean(actionUrl);
                  const isExtensionRequest = notif.type === 'EXTENSION_REQUEST';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-5 flex gap-4 cursor-pointer transition-all hover:bg-slate-50 ${
                        notif.isRead ? 'opacity-70' : 'bg-indigo-50/30'
                      }`}
                    >
                      <div className={`mt-1 shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}>
                        {style.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            {notif.title && (
                              <p className={`text-sm mb-1 ${notif.isRead ? 'text-slate-500 font-bold' : 'text-indigo-700 font-black'}`}>
                                {notif.title}
                              </p>
                            )}

                            <p className={`text-base leading-snug ${notif.isRead ? 'text-slate-600 font-medium' : 'text-slate-800 font-bold'}`}>
                              {notif.message.replace(/🚨|🛑|✅|⏳/g, '').trim()}
                            </p>

                            {(isExtensionRequest || canNavigate) && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {isExtensionRequest && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 text-[11px] font-black">
                                    <CalendarClock size={12} /> Cần xử lý
                                  </span>
                                )}

                                {canNavigate && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 text-[11px] font-black">
                                    <ExternalLink size={12} /> Mở chi tiết
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {!notif.isRead && (
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-sm shadow-indigo-200" />
                          )}
                        </div>

                        <span className="text-xs font-semibold text-slate-400 mt-2 flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(notif.timestamp).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
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

      <ExtensionReviewModal
        open={!!reviewNotification}
        notification={reviewNotification}
        onClose={() => setReviewNotification(null)}
        onDone={handleModalDone}
      />
    </>
  );
};

export default NotificationsPage;