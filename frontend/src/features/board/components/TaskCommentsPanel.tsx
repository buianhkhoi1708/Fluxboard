import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, Send, Trash2 } from "lucide-react";
import { useAddTaskComment, useDeleteTaskComment, useGetTaskComments } from "../hooks/useBoardQueries";
import { TaskComment } from "../types/index";

interface TaskCommentsPanelProps {
  taskId: string;
  boardId: string;
  projectId: string;
  autoFocus?: boolean;
}

const getId = (value: any) => String(value?._id || value?.id || value || "");

const getUserName = (comment: TaskComment) => {
  const user: any = comment.user_id || comment.user || {};
  return user.full_name || user.fullName || user.name || user.email || "Người dùng";
};

const getAvatar = (comment: TaskComment) => {
  const user: any = comment.user_id || comment.user || {};
  return user.avatar_url || user.avatarUrl || "";
};

const getInitial = (name: string) => String(name || "U").charAt(0).toUpperCase();

const getTimeText = (value?: string | Date | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const TaskCommentsPanel: React.FC<TaskCommentsPanelProps> = ({
  taskId,
  boardId,
  projectId,
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState("");

  const { data, isLoading } = useGetTaskComments(taskId, projectId);
  const { mutateAsync: addComment, isPending: isAdding } = useAddTaskComment();
  const { mutateAsync: deleteComment, isPending: isDeleting } = useDeleteTaskComment();

  const comments = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 120);
  }, [autoFocus, taskId]);

  const handleSubmit = async () => {
    const finalContent = content.trim();
    if (!finalContent || !taskId || !projectId) return;

    await addComment({
      taskId,
      boardId,
      projectId,
      content: finalContent,
    });

    setContent("");
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const handleResolveAndDelete = async (comment: TaskComment) => {
    const commentId = getId(comment);
    if (!commentId || !taskId || !projectId) return;

    try {
      setDeletingCommentId(commentId);
      await deleteComment({
        taskId,
        commentId,
        boardId,
        projectId,
      });
    } finally {
      setDeletingCommentId("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <MessageSquareText size={18} />
          </div>

          <div>
            <h4 className="text-sm font-black text-slate-800">Bình luận</h4>
            <p className="text-[11px] font-bold text-slate-400">{comments.length} trao đổi</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Viết bình luận... Nhấn Ctrl + Enter để gửi"
          className="w-full min-h-[92px] resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/60 placeholder:text-slate-400"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isAdding || !content.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Gửi
          </button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-4 space-y-3">
        {isLoading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <MessageSquareText size={22} />
            </div>
            <p className="text-sm font-bold text-slate-500">Chưa có bình luận nào</p>
            <p className="text-xs font-medium text-slate-400 mt-1">
              Hãy để lại ghi chú hoặc vấn đề cần xử lý.
            </p>
          </div>
        ) : (
          comments.map((comment: TaskComment) => {
            const name = getUserName(comment);
            const avatar = getAvatar(comment);
            const commentId = getId(comment);
            const isCurrentDeleting = isDeleting && deletingCommentId === commentId;

            return (
              <div
                key={commentId}
                className={`group rounded-2xl border p-3.5 transition-all ${
                  isCurrentDeleting
                    ? "bg-emerald-50 border-emerald-200 opacity-60"
                    : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                        {getInitial(name)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-800 truncate">{name}</p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {getTimeText(comment.created_at || comment.createdAt)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isCurrentDeleting}
                        onClick={() => handleResolveAndDelete(comment)}
                        title="Đã giải quyết - xóa bình luận"
                        className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isCurrentDeleting ? (
                          <Loader2 size={18} className="animate-spin text-emerald-600" />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                      </button>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                      {comment.content}
                    </p>

                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        disabled={isCurrentDeleting}
                        onClick={() => handleResolveAndDelete(comment)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-60"
                      >
                        <Trash2 size={12} />
                        Đã giải quyết
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskCommentsPanel;