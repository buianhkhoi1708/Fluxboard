import React, { useState, useEffect, forwardRef, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  AlignLeft,
  CheckSquare,
  Clock,
  Calendar,
  Flag,
  Target,
  Plus,
  Square,
  Save,
  Trash2,
  User,
  ChevronDown,
  KanbanSquare,
  Check,
  Paperclip,
  File,
  Download,
  Loader2,
  Send,
  MessageSquareText,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
import {
  useUploadFile,
  useGetTaskAttachments,
  useGetBoardDetail,
  useUpdateTask,
  useDeleteTask,
  useGetProjectMembers,
  useAddAttachmentToTask,
  useMoveTask,
} from "../hooks/useBoardQueries";

import { useBoardStore } from "../stores/useBoardStore";
import { useUserStore } from "../../user/store/useUserStore";
import { notificationApi } from "../../notification/api/notificationApi";

import { TaskDetailModalProps } from "../types/index";

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { vi } from "date-fns/locale/vi";

registerLocale("vi", vi);

interface CustomDateInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
}

type ConfirmActionType = "request-extension" | "delete-task" | null;

interface ConfirmActionModalProps {
  open: boolean;
  type: ConfirmActionType;
  taskTitle: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CustomDateInput = forwardRef<HTMLButtonElement, CustomDateInputProps>(
  ({ value, onClick, placeholder }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      className="w-full text-sm border border-slate-200/80 rounded-xl px-3.5 py-2.5 outline-none hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 transition-all bg-white flex items-center justify-between shadow-sm group"
    >
      <div className="flex items-center gap-2">
        <Calendar
          size={15}
          className={
            value
              ? "text-indigo-500"
              : "text-slate-400 group-hover:text-indigo-400 transition-colors"
          }
        />
        <span className={value ? "font-bold text-slate-800" : "text-slate-400 font-medium"}>
          {value || placeholder}
        </span>
      </div>
      <ChevronDown
        size={14}
        className="text-slate-300 group-hover:text-indigo-500 transition-colors"
      />
    </button>
  ),
);

CustomDateInput.displayName = "CustomDateInput";

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "Chưa có deadline";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không rõ";
  }

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  open,
  type,
  taskTitle,
  isSubmitting = false,
  onClose,
  onConfirm,
}) => {
  if (!open || !type) return null;

  const isRequestExtension = type === "request-extension";

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-white/70 animate-in zoom-in-95 fade-in duration-200">
        <div
          className={`px-6 py-5 text-white ${
            isRequestExtension
              ? "bg-gradient-to-br from-amber-500 to-orange-500"
              : "bg-gradient-to-br from-rose-500 to-red-600"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              {isRequestExtension ? <Send size={25} /> : <AlertTriangle size={25} />}
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/75">
                Xác nhận thao tác
              </p>
              <h3 className="text-xl font-black mt-1">
                {isRequestExtension ? "Gửi yêu cầu dời hạn?" : "Xóa công việc?"}
              </h3>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">
              {isRequestExtension
                ? "Bạn chắc chắn muốn gửi đơn xin dời hạn task này tới quản lý? Sau khi gửi, bạn cần chờ quản lý chấp nhận hoặc từ chối."
                : "Bạn chắc chắn muốn xóa task này? Thao tác này có thể ảnh hưởng đến bảng công việc và các tài liệu liên quan."}
            </p>

            <p className="mt-3 text-sm font-black text-slate-800">
              Task: {taskTitle || "Không rõ"}
            </p>
          </div>

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
                isRequestExtension
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200"
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
              }`}
            >
              {isSubmitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : isRequestExtension ? (
                <ShieldCheck size={17} />
              ) : (
                <Trash2 size={17} />
              )}
              {isRequestExtension ? "Xác nhận gửi" : "Xác nhận xóa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  listId,
}) => {
  const queryClient = useQueryClient();

  const { activeBoardId } = useBoardStore();
  const { data: board } = useGetBoardDetail(activeBoardId as string);
  const getUser = useUserStore((state) => state.getUser);

  const projectId = board?.projectId || board?.project_id;
  const { data: apiMembers, isLoading: isMembersLoading } = useGetProjectMembers(
    projectId as string,
  );

  const { mutateAsync: updateApiTask } = useUpdateTask();
  const { mutateAsync: deleteApiTask } = useDeleteTask();
  const { mutateAsync: moveApiTask } = useMoveTask();

  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editColumnId, setEditColumnId] = useState(listId);
  const [editStoryPoints, setEditStoryPoints] = useState<number | string>(0);
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [localSubtasks, setLocalSubtasks] = useState<any[]>([]);
  const [localAttachments, setLocalAttachments] = useState<any[]>([]);

  const [isDone, setIsDone] = useState(false);

  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [isAssigneePopupOpen, setIsAssigneePopupOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: addAttachment } = useAddAttachmentToTask();
  const { mutateAsync: uploadFile } = useUploadFile();

  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState<Date | null>(null);
  const [extensionReason, setExtensionReason] = useState("");
  const [isRequestingExtension, setIsRequestingExtension] = useState(false);
  const [extensionError, setExtensionError] = useState("");
  const [extensionSuccess, setExtensionSuccess] = useState("");

  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentTaskId = String(task?.id || task?._id || "");
  const { data: fetchedAttachments } = useGetTaskAttachments(currentTaskId);

  const projectMembers = useMemo(() => {
    if (!apiMembers) return [];
    if (Array.isArray(apiMembers)) return apiMembers;
    if (apiMembers.data && Array.isArray(apiMembers.data)) return apiMembers.data;
    return apiMembers.content || [];
  }, [apiMembers]);

  const calculatedDays = useMemo(() => {
    if (editStartDate && editDueDate) {
      if (editDueDate >= editStartDate) {
        const diffTime = editDueDate.getTime() - editStartDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 0 ? 1 : diffDays;
      }

      return 0;
    }

    return "";
  }, [editStartDate, editDueDate]);

  useEffect(() => {
    if (isOpen && task) {
      const taskAny = task as any;

      setEditTitle(task.title || "");
      setEditDesc(task.description || "");
      setLocalSubtasks(task.subtasks || []);

      const rawPriority = task.priority ? String(task.priority).toUpperCase() : "MEDIUM";
      setEditPriority(rawPriority);

      setEditColumnId(task.column_id || listId);
      setEditStoryPoints(taskAny.story_points || taskAny.story_point || 0);

      setEditStartDate(taskAny.start_date ? new Date(taskAny.start_date) : null);
      setEditDueDate(taskAny.due_date ? new Date(taskAny.due_date) : null);

      setIsDone(task.status === "DONE" || task.is_done === true);

      const rawAssignees =
        taskAny.assignees_user_id ||
        taskAny.assigneesUserId ||
        taskAny.assignees ||
        taskAny.assignee_id ||
        taskAny.assignee_ids;

      const assigneesList = Array.isArray(rawAssignees)
        ? rawAssignees
        : rawAssignees
          ? [rawAssignees]
          : [];

      const normalizedIds = assigneesList
        .map((item: any) =>
          typeof item === "object" ? item.user_id || item.id || item._id : item,
        )
        .filter(
          (id: any) =>
            id !== undefined &&
            id !== null &&
            String(id) !== "undefined" &&
            String(id) !== "" &&
            !String(id).startsWith("temp-"),
        )
        .map((id: any) => String(id));

      setEditAssignees(normalizedIds);

      setIsSaving(false);
      setIsAssigneePopupOpen(false);

      setIsExtensionModalOpen(false);
      setExtensionDate(null);
      setExtensionReason("");
      setIsRequestingExtension(false);
      setExtensionError("");
      setExtensionSuccess("");

      setConfirmAction(null);
      setIsDeleting(false);
    }
  }, [isOpen, task, listId]);

  useEffect(() => {
    if (fetchedAttachments) {
      const arr = Array.isArray(fetchedAttachments)
        ? fetchedAttachments
        : fetchedAttachments.data || [];

      setLocalAttachments(arr);
    }
  }, [fetchedAttachments]);

  if (!isOpen || !task) return null;

  const taskAny = task as any;

  const toggleAssignee = (userId: string) => {
    if (!userId || userId.startsWith("temp-") || userId === "undefined") return;

    setEditAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !activeBoardId) return;

    setIsUploading(true);

    try {
      const uploadResult = await uploadFile(file);
      const finalUrl = uploadResult?.url || uploadResult?.data?.url;

      if (!finalUrl) {
        throw new Error("Không lấy được URL từ server!");
      }

      const response = await addAttachment({
        taskId: String(task.id || task._id),
        boardId: activeBoardId,
        payload: {
          fileName: file.name,
          fileUrl: finalUrl,
          mimeType: file.type,
        },
      });

      const newFileObj = response?.data || {
        fileName: file.name,
        file_name: file.name,
        fileUrl: finalUrl,
        file_url: finalUrl,
        mimeType: file.type,
        mime_type: file.type,
        fileSize: file.size,
        file_size: file.size,
      };

      setLocalAttachments((prev) => [...prev, newFileObj]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Lỗi upload:", error);
      alert("Tải lên thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!activeBoardId || !board) return;

    setIsSaving(true);

    const cleanAssignees = editAssignees.filter(
      (id) => id && id !== "undefined" && !id.startsWith("temp-"),
    );

    const finalPriority = editPriority ? editPriority.toUpperCase() : "MEDIUM";

    try {
      await updateApiTask({
        taskId: String(task.id || task._id),
        boardId: activeBoardId,
        updateData: {
          title: editTitle.trim() || "Task không tên",
          description: editDesc,
          priority: finalPriority,
          status: isDone ? "DONE" : task.status === "DONE" ? "TODO" : task.status || "TODO",
          is_done: isDone,
          story_point: Number(editStoryPoints) || 0,
          start_date: editStartDate ? editStartDate.toISOString() : null,
          due_date: editDueDate ? editDueDate.toISOString() : null,
          assignees_user_id: cleanAssignees,
          assignee_id: cleanAssignees.length > 0 ? cleanAssignees[0] : null,
          parent_task_id: taskAny.parent_task_id,
          subtasks: localSubtasks,
        } as any,
      });

      if (String(editColumnId) !== String(listId)) {
        const destCol = board?.columns?.find(
          (c: any) => String(c.id || c._id) === String(editColumnId),
        );

        const newOrder = destCol && destCol.tasks ? destCol.tasks.length : 0;

        await moveApiTask({
          taskId: String(task.id || task._id),
          columnId: String(editColumnId),
          order: newOrder,
          boardId: activeBoardId,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["board", activeBoardId] });
      onClose();
    } catch (error) {
      console.error("Lỗi khi cập nhật Task:", error);
      alert("Lưu thất bại! Vui lòng kiểm tra lại dữ liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!activeBoardId) return;
    setConfirmAction("delete-task");
  };

  const executeDeleteTask = async () => {
    if (!activeBoardId) return;

    setIsDeleting(true);

    try {
      await deleteApiTask({
        taskId: String(task.id || task._id),
        boardId: activeBoardId,
      });

      await queryClient.invalidateQueries({ queryKey: ["board", activeBoardId] });
      setConfirmAction(null);
      onClose();
    } catch (error) {
      console.error("Lỗi khi xóa Task:", error);
      alert("Xóa task thất bại. Vui lòng thử lại.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRequestExtension = () => {
    setExtensionError("");
    setExtensionSuccess("");

    if (!extensionDate) {
      setExtensionError("Vui lòng chọn deadline mới.");
      return;
    }

    if (!extensionReason.trim()) {
      setExtensionError("Vui lòng nhập lý do xin dời hạn.");
      return;
    }

    if (editDueDate && extensionDate <= editDueDate) {
      setExtensionError("Deadline mới phải sau deadline hiện tại.");
      return;
    }

    setConfirmAction("request-extension");
  };

  const executeRequestExtension = async () => {
    if (!extensionDate) {
      setExtensionError("Vui lòng chọn deadline mới.");
      setConfirmAction(null);
      return;
    }

    setIsRequestingExtension(true);
    setExtensionError("");
    setExtensionSuccess("");

    try {
      await notificationApi.requestDeadlineExtension(String(task.id || task._id), {
        new_due_date: extensionDate.toISOString(),
        reason: extensionReason.trim(),
      });

      setExtensionSuccess("Đã gửi yêu cầu xin dời hạn tới quản lý.");
      setConfirmAction(null);

      setTimeout(() => {
        setIsExtensionModalOpen(false);
        setExtensionDate(null);
        setExtensionReason("");
        setExtensionSuccess("");
      }, 700);
    } catch (error: any) {
      console.error("Request extension error:", error);
      setExtensionError(error?.response?.data?.message || "Gửi yêu cầu thất bại.");
      setConfirmAction(null);
    } finally {
      setIsRequestingExtension(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmAction === "request-extension") {
      executeRequestExtension();
      return;
    }

    if (confirmAction === "delete-task") {
      executeDeleteTask();
    }
  };

  const currentColumn = board?.columns?.find(
    (c: any) => String(c.id || c._id) === String(editColumnId),
  );

  const currentColumnName =
    (currentColumn as any)?.name ||
    (currentColumn as any)?.list_name ||
    (currentColumn as any)?.title ||
    "Không rõ";

  const isConfirmSubmitting = isRequestingExtension || isDeleting;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[1100px] bg-slate-50/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/50">

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm px-6 py-5 border-b border-slate-200/60 flex justify-between items-start gap-6 sticky top-0 z-10">
          <div className="flex-1">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-2xl font-extrabold text-slate-800 bg-transparent border-2 border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-xl px-3 py-1.5 outline-none transition-all placeholder:text-slate-300"
              placeholder="Nhập tên công việc..."
            />

            <p className="text-[13px] text-slate-500 px-3 mt-1.5 font-medium flex items-center gap-1.5">
              Vị trí hiện tại:
              <span className="font-bold px-2 py-0.5 rounded-md border border-slate-200/60 bg-indigo-50 text-indigo-700">
                {currentColumnName}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 mt-1">
            <button
              type="button"
              onClick={() => setIsDone(!isDone)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                isDone
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm ring-2 ring-emerald-100 ring-offset-1"
                  : "bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-500"
              }`}
            >
              <CheckSquare
                size={18}
                className={isDone ? "text-emerald-500" : "text-slate-300"}
              />
              {isDone ? "Đã hoàn thành" : "Đánh dấu xong"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nội dung cuộn */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-10">

            {/* CỘT TRÁI */}
            <div className="flex-1 flex flex-col gap-8">

              {/* Mô tả */}
              <div>
                <div className="flex items-center gap-2.5 text-slate-800 mb-4 font-bold text-lg">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <AlignLeft size={18} />
                  </div>
                  <h3>Mô tả chi tiết</h3>
                </div>

                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Thêm mô tả chi tiết hơn cho công việc này..."
                  className="w-full min-h-[140px] p-5 bg-white border border-slate-200/80 rounded-2xl text-[15px] leading-relaxed text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all resize-y custom-scrollbar shadow-sm"
                />
              </div>

              {/* Tài liệu đính kèm */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5 text-slate-800 font-bold text-lg">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Paperclip size={18} />
                    </div>
                    <h3>Tài liệu đính kèm</h3>
                    <span className="ml-1.5 text-xs font-black bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                      {localAttachments.length}
                    </span>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                      ) : (
                        <Plus size={16} />
                      )}
                      {isUploading ? "Đang tải..." : "Thêm file"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {localAttachments.length === 0 ? (
                    <div className="col-span-full p-6 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-center text-sm font-medium text-slate-400 bg-slate-50/30">
                      Chưa có file nào. Hãy nhấn "Thêm file" để nộp tài liệu!
                    </div>
                  ) : (
                    localAttachments.map((file: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => window.open(file.file_url || file.fileUrl, "_blank")}
                      >
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
                          <File size={22} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[13px] font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors"
                            title={file.file_name || file.fileName}
                          >
                            {file.file_name || file.fileName}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">
                            {(file.mime_type || file.mimeType || file.content_type || "")
                              .split("/")[1] || "FILE"}{" "}
                            •{" "}
                            {(
                              (file.file_size || file.fileSize || file.size || 0) /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>

                        <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                          <Download size={16} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Checklist */}
              <div>
                <div className="flex items-center gap-2.5 text-slate-800 mb-4 font-bold text-lg">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckSquare size={18} />
                  </div>
                  <h3>Checklist Việc Con</h3>
                  <span className="ml-1.5 text-xs font-black bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                    {localSubtasks.length}
                  </span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-sm">
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {localSubtasks.map((st: any, idx: number) => (
                      <div
                        key={idx}
                        className="group/st flex items-center gap-3 p-2.5 hover:bg-slate-50/80 rounded-xl transition-all border border-transparent hover:border-slate-100"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...localSubtasks];
                            next[idx].is_done = !next[idx].is_done;
                            setLocalSubtasks(next);
                          }}
                          className="shrink-0 transition-transform active:scale-90"
                        >
                          {st.is_done ? (
                            <CheckSquare size={18} className="text-emerald-500" />
                          ) : (
                            <Square
                              size={18}
                              className="text-slate-300 hover:text-indigo-400 transition-colors"
                            />
                          )}
                        </button>

                        <span
                          className={`text-[15px] flex-1 truncate ${
                            st.is_done
                              ? "line-through text-slate-400"
                              : "text-slate-700 font-medium"
                          }`}
                        >
                          {st.title}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setLocalSubtasks(localSubtasks.filter((_, i) => i !== idx))
                          }
                          className="opacity-0 group-hover/st:opacity-100 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 p-1.5 pt-3 border-t border-slate-100 flex items-center gap-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                      <Plus size={16} />
                    </div>

                    <input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSubtaskTitle.trim()) {
                          e.preventDefault();
                          setLocalSubtasks([
                            ...localSubtasks,
                            {
                              title: newSubtaskTitle.trim(),
                              is_done: false,
                            },
                          ]);
                          setNewSubtaskTitle("");
                        }
                      }}
                      placeholder="Thêm việc con và nhấn Enter..."
                      className="flex-1 text-[15px] font-medium bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI */}
            <div className="w-full md:w-[280px] flex flex-col gap-6 shrink-0">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Thông số
                </h4>

                {/* Column */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <KanbanSquare size={15} className="text-slate-400" /> Cột / Giai đoạn
                  </label>

                  <div className="relative">
                    <select
                      value={editColumnId}
                      onChange={(e) => setEditColumnId(e.target.value)}
                      className="w-full text-sm font-bold border border-slate-200/80 rounded-xl px-3.5 py-2.5 outline-none text-slate-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 appearance-none bg-white transition-all shadow-sm"
                    >
                      {board?.columns?.map((col: any, idx: number) => {
                        const colId = col.id || col._id;

                        return (
                          <option key={`col-${colId || idx}`} value={String(colId)}>
                            {col.name || col.list_name || col.title || "Không rõ"}
                          </option>
                        );
                      })}
                    </select>

                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                {/* Assignees */}
                <div className="flex flex-col gap-3 mt-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <User size={15} className="text-slate-400" /> Người thực hiện
                  </label>

                  <div className="flex flex-wrap gap-2 relative">
                    {editAssignees.length > 0 ? (
                      editAssignees.map((userId: string, idx: number) => {
                        const member = getUser(userId, projectId);
                        const displayName =
                          member?.full_name || (member as any)?.name || "Thành viên";
                        const avatarUrl =
                          member?.avatar_url || (member as any)?.avatarUrl;
                        const initial = String(displayName).charAt(0).toUpperCase();

                        return (
                          <div
                            key={`assignee-${userId || idx}`}
                            className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm group/name"
                          >
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-6 h-6 rounded-full object-cover border border-indigo-200 shadow-sm"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                                {initial}
                              </div>
                            )}

                            <span className="text-[12px] font-bold text-indigo-700 pr-1 truncate max-w-[120px]">
                              {displayName}
                            </span>

                            <button
                              type="button"
                              onClick={() => toggleAssignee(userId)}
                              className="opacity-0 group-hover/name:opacity-100 p-0.5 hover:bg-indigo-200 rounded-full transition-all text-indigo-400 hover:text-indigo-600"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <span className="w-full text-[13px] text-slate-400 italic bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 border-dashed font-medium text-center">
                        Chưa có ai nhận việc
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsAssigneePopupOpen(!isAssigneePopupOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[12px]"
                    >
                      <Plus size={14} /> <span>Thêm người</span>
                    </button>

                    {isAssigneePopupOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsAssigneePopupOpen(false)}
                        />

                        <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar">
                          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Thành viên dự án
                          </h5>

                          {isMembersLoading ? (
                            <div className="text-xs text-center text-slate-400 p-3 italic">
                              Đang tải danh sách...
                            </div>
                          ) : projectMembers.length > 0 ? (
                            projectMembers.map((member: any, idx: number) => {
                              const rawId = member.user_id || member.id || member._id;
                              if (!rawId) return null;

                              const safeMemberId = String(rawId);
                              const isSelected = editAssignees.includes(safeMemberId);
                              const displayName = member.full_name || member.name || "Unnamed";
                              const initial = String(displayName).charAt(0).toUpperCase();

                              return (
                                <div
                                  key={`member-${safeMemberId || idx}`}
                                  onClick={() => toggleAssignee(safeMemberId)}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? "bg-indigo-50 hover:bg-indigo-100"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {member.avatar_url ? (
                                      <img
                                        src={member.avatar_url}
                                        className="w-7 h-7 rounded-full object-cover"
                                        alt={displayName}
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {initial}
                                      </div>
                                    )}

                                    <span
                                      className={`text-[13px] ${
                                        isSelected
                                          ? "font-bold text-indigo-700"
                                          : "font-medium text-slate-700"
                                      }`}
                                    >
                                      {displayName}
                                    </span>
                                  </div>

                                  {isSelected && <Check size={16} className="text-indigo-600" />}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-xs text-center text-slate-400 p-3 italic">
                              Dự án chưa có thành viên nào.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Flag size={15} className="text-slate-400" /> Mức Ưu tiên
                  </label>

                  <div className="relative">
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full text-sm font-bold border border-slate-200/80 rounded-xl px-3.5 py-2.5 outline-none text-slate-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 appearance-none bg-white transition-all shadow-sm"
                    >
                      <option value="LOW">Low (Thấp)</option>
                      <option value="MEDIUM">Medium (Trung bình)</option>
                      <option value="HIGH">High (Cao)</option>
                      <option value="CRITICAL">Critical (Khẩn cấp)</option>
                    </select>

                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                {/* Story Points */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Target size={15} className="text-slate-400" /> Story Points
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={editStoryPoints}
                    onChange={(e) => setEditStoryPoints(e.target.value)}
                    className="w-full text-sm font-black text-indigo-600 border border-slate-200/80 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all bg-white shadow-sm"
                  />
                </div>
              </div>

              {/* Time box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Thời gian
                </h4>

                <div className="flex flex-col gap-2 relative">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Calendar size={15} className="text-slate-400" /> Bắt đầu
                  </label>

                  <DatePicker
                    selected={editStartDate}
                    onChange={(date: Date | null) => setEditStartDate(date)}
                    selectsStart
                    startDate={editStartDate}
                    endDate={editDueDate}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chưa chọn ngày"
                    customInput={<CustomDateInput />}
                    isClearable
                  />
                </div>

                <div className="flex flex-col gap-2 relative">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Calendar size={15} className="text-slate-400" /> Kết thúc (Due)
                  </label>

                  <DatePicker
                    selected={editDueDate}
                    onChange={(date: Date | null) => setEditDueDate(date)}
                    selectsEnd
                    startDate={editStartDate}
                    endDate={editDueDate}
                    minDate={editStartDate || undefined}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chưa chọn ngày"
                    customInput={<CustomDateInput />}
                    isClearable
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Clock size={15} className="text-slate-400" /> Thời lượng dự kiến
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      value={calculatedDays}
                      readOnly
                      title="Tính tự động dựa trên ngày bắt đầu và kết thúc"
                      className="w-full text-sm font-black text-amber-700 border border-amber-200/60 rounded-xl px-3.5 py-2.5 outline-none bg-amber-50/50 cursor-not-allowed transition-all"
                    />

                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      Ngày
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setExtensionError("");
                    setExtensionSuccess("");
                    setIsExtensionModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-extrabold hover:bg-amber-100 transition-all shadow-sm"
                >
                  <Calendar size={16} />
                  Xin dời hạn
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Extension request modal */}
        {isExtensionModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={() => {
                if (!isRequestingExtension) setIsExtensionModalOpen(false);
              }}
            />

            <div className="relative w-full max-w-lg rounded-[2rem] bg-white shadow-2xl border border-white/70 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
              <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 px-7 py-6 text-white">
                <button
                  type="button"
                  onClick={() => setIsExtensionModalOpen(false)}
                  disabled={isRequestingExtension}
                  className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25 transition disabled:opacity-50"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Calendar size={28} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-amber-100">
                      Đơn xin dời deadline
                    </p>
                    <h2 className="text-2xl font-black">Xin thêm thời gian</h2>
                  </div>
                </div>
              </div>

              <div className="p-7 space-y-5">
                {extensionError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {extensionError}
                  </div>
                )}

                {extensionSuccess && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {extensionSuccess}
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-400 mb-1">
                    Task
                  </p>
                  <p className="font-extrabold text-slate-800">{editTitle}</p>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs font-black uppercase text-rose-500 mb-1">
                    Deadline hiện tại
                  </p>
                  <p className="font-extrabold text-rose-700">
                    {formatDateTime(editDueDate)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">
                    Deadline mới muốn xin
                  </label>

                  <DatePicker
                    selected={extensionDate}
                    onChange={(date: Date | null) => setExtensionDate(date)}
                    minDate={editDueDate || new Date()}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày mới"
                    customInput={<CustomDateInput />}
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <MessageSquareText size={16} /> Lý do xin dời
                  </label>

                  <textarea
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    placeholder="Ví dụ: Cần thêm thời gian để kiểm thử, chờ tài liệu, phát sinh lỗi kỹ thuật..."
                    className="w-full min-h-[120px] p-4 rounded-2xl border border-slate-200 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 resize-none text-sm font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsExtensionModalOpen(false)}
                    disabled={isRequestingExtension}
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 font-extrabold hover:bg-slate-200 transition disabled:opacity-60"
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestExtension}
                    disabled={isRequestingExtension}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 text-white font-extrabold hover:bg-amber-600 transition shadow-lg shadow-amber-200 disabled:opacity-60"
                  >
                    {isRequestingExtension ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    Gửi yêu cầu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white/80 backdrop-blur-sm px-6 py-4 border-t border-slate-200/60 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 z-10">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} /> Xóa công việc
          </button>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 sm:py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-xl text-[15px] font-bold transition-all"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-8 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[15px] font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 border border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={18} /> {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={!!confirmAction}
        type={confirmAction}
        taskTitle={editTitle}
        isSubmitting={isConfirmSubmitting}
        onClose={() => {
          if (!isConfirmSubmitting) setConfirmAction(null);
        }}
        onConfirm={handleConfirmAction}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskDetailModal;