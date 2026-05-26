import React, { useState } from 'react';
import { CalendarClock, UserRound, MessageSquareText, X, CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/notificationApi';

interface Props {
  open: boolean;
  notification: any | null;
  onClose: () => void;
  onDone?: () => void;
}

const formatDate = (value?: string | Date) => {
  if (!value) return 'Không rõ';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const ExtensionRequestReviewModal: React.FC<Props> = ({ open, notification, onClose, onDone }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open || !notification) return null;

  const meta = notification.metadata || {};
  const taskId = meta.task_id || notification.referenceId;
  const actionUrl = notification.actionUrl || (meta.board_id && meta.task_id ? `/board/${meta.board_id}?taskId=${meta.task_id}` : null);

  const goToTask = () => {
    if (actionUrl) {
      onClose();
      navigate(actionUrl);
    }
  };

  const approve = async () => {
    if (!taskId) return;

    const ok = window.confirm('Sếp chắc chắn muốn CHẤP NHẬN yêu cầu dời deadline này?');
    if (!ok) return;

    setIsSubmitting(true);
    try {
      await notificationApi.approveDeadlineExtension(String(taskId));
      await notificationApi.markAsReadOnServer(notification.id);
      onDone?.();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Chấp nhận thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reject = async () => {
    if (!taskId) return;

    const rejectReason = window.prompt('Nhập lý do từ chối, hoặc để trống nếu không cần:');
    const ok = window.confirm('Sếp chắc chắn muốn TỪ CHỐI yêu cầu dời deadline này?');
    if (!ok) return;

    setIsSubmitting(true);
    try {
      await notificationApi.rejectDeadlineExtension(String(taskId), rejectReason || '');
      await notificationApi.markAsReadOnServer(notification.id);
      onDone?.();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Từ chối thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-white/70 animate-in zoom-in-95 fade-in duration-200">
        <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-7 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25 transition"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shadow-lg">
              <CalendarClock size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-100">Yêu cầu dời deadline</p>
              <h2 className="text-2xl font-black leading-tight mt-1">
                {meta.task_title || 'Task cần xử lý'}
              </h2>
            </div>
          </div>
        </div>

        <div className="p-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-wider mb-2">
                <UserRound size={15} /> Người xin
              </div>
              <p className="font-extrabold text-slate-800">{meta.requester_name || 'Không rõ'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-wider mb-2">
                <CalendarClock size={15} /> Deadline hiện tại
              </div>
              <p className="font-extrabold text-rose-600">{formatDate(meta.current_due_date)}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider mb-2">
                <CalendarClock size={15} /> Deadline mới đề xuất
              </div>
              <p className="font-extrabold text-emerald-700">{formatDate(meta.requested_due_date)}</p>
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
              onClick={goToTask}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-extrabold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm"
            >
              <ExternalLink size={18} /> Chi tiết task
            </button>

            <button
              onClick={reject}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 font-extrabold text-white hover:bg-rose-700 transition shadow-lg shadow-rose-200 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
              Từ chối
            </button>

            <button
              onClick={approve}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-extrabold text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              Chấp nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensionRequestReviewModal;