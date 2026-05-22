import React, { useState, useEffect, forwardRef, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, AlignLeft, CheckSquare, Clock, Calendar, Flag,
  Target, Sparkles, Plus, Square, Save, Trash2, User, ChevronDown,
  KanbanSquare, Check, Paperclip, File, Download, Loader2
} from "lucide-react";
import axios from 'axios';

import { useBoardStore } from "../stores/useBoardStore";
import { useUserStore } from "../../user/store/useUserStore"; 
import { useGetBoardDetail, useUpdateTask, useDeleteTask, useCreateTask, useGetProjectMembers, getPresignedUrl, useAddAttachmentToTask } from '../hooks/useBoardQueries';

import { TaskDetailModalProps, Task } from '../types/index';

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {vi} from "date-fns/locale/vi";

registerLocale("vi", vi);

const priorityColors: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

interface CustomDateInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
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
          className={value ? "text-indigo-500" : "text-slate-400 group-hover:text-indigo-400 transition-colors"}
        />
        <span className={value ? "font-bold text-slate-800" : "text-slate-400 font-medium"}>
          {value || placeholder}
        </span>
      </div>
      <ChevronDown size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
    </button>
  )
);

CustomDateInput.displayName = 'CustomDateInput';

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task, listId }) => {
  const { activeBoardId } = useBoardStore();
  const { data: board } = useGetBoardDetail(activeBoardId as string);
  const getUser = useUserStore((state) => state.getUser);
  
  const projectId = board?.projectId || board?.project_id;
  const { data: apiMembers, isLoading: isMembersLoading } = useGetProjectMembers(projectId as string);

  const { mutateAsync: updateApiTask } = useUpdateTask();
  const { mutateAsync: deleteApiTask } = useDeleteTask();
  const { mutateAsync: createApiTask } = useCreateTask();

  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM"); 
  const [editColumnId, setEditColumnId] = useState(listId); 
  const [editStoryPoints, setEditStoryPoints] = useState<number | string>(0);
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  
  const [isDone, setIsDone] = useState(false);
  
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [isAssigneePopupOpen, setIsAssigneePopupOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // LOGIC UPLOAD FILE
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { mutateAsync: addAttachment } = useAddAttachmentToTask();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeBoardId) return;

    setIsUploading(true);
    try {
      const urls = await getPresignedUrl(file.name, file.type);
      
      // 1. Lấy uploadUrl từ API trả về (tùy key backend sếp viết)
      const uploadUrl = urls.uploadUrl || urls.upload_url || urls.url;

      // 🚀 2. BÍ KÍP: Tự động chế ra Public URL bằng cách cắt bỏ phần token sau dấu '?'
      const finalPublicUrl = urls.publicUrl || urls.public_url || uploadUrl.split('?')[0];

      // Đẩy file lên Cloud
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type }
      });

      // Gọi API nộp link vào Task
      await addAttachment({
        taskId: String(task.id || task._id),
        boardId: activeBoardId,
        payload: {
          file_name: file.name,
          file_url: finalPublicUrl, // Đã có link chuẩn, không bao giờ bị null nữa!
          content_type: file.type,
          file_size: file.size
        }
      });

      if (fileInputRef.current) fileInputRef.current.value = ''; 

    } catch (error) {
      console.error("Lỗi upload:", error);
      alert("Tải lên thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (isOpen && task) {
      setEditTitle(task.title || "");
      setEditDesc(task.description || "");
      
      const rawPriority = task.priority ? String(task.priority).toUpperCase() : "MEDIUM";
      setEditPriority(rawPriority);
      setEditColumnId(listId);
      setEditStoryPoints(task.story_points || task.story_point || 0);
      setEditStartDate(task.start_date ? new Date(task.start_date) : null);
      setEditDueDate(task.due_date ? new Date(task.due_date) : null);
      
      setIsDone(task.status === "DONE");
      
      const assigneesList = task.assignees_user_id || task.assigneesUserId || task.assignees || [];
      const normalizedIds = assigneesList
        .map((item: any) => {
          if (typeof item === 'object') {
            return item.user_id || item.id || item._id;
          }
          return item;
        })
        .filter((id: any) => id !== undefined && id !== null && String(id) !== "undefined" && String(id) !== "")
        .map((id: any) => String(id));
      setEditAssignees(normalizedIds);
      
      setIsSaving(false);
      setIsAssigneePopupOpen(false); 
    }
  }, [isOpen, task, listId]);

  const projectMembers = useMemo(() => {
    if (!apiMembers) return [];
    if (Array.isArray(apiMembers)) return apiMembers;
    if (apiMembers.data && Array.isArray(apiMembers.data)) return apiMembers.data;
    return apiMembers.content || [];
  }, [apiMembers]);

  const toggleAssignee = (userId: string) => {
    if (!userId || userId.startsWith('temp-') || userId === "undefined") return;
    setEditAssignees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId); 
      } else {
        return [...prev, userId]; 
      }
    });
  };

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

  if (!isOpen || !task) return null;

  const handleSave = async () => {
    if (!activeBoardId || !board) return;
    setIsSaving(true); 

    const cleanAssignees = editAssignees.filter(id => id && id !== "undefined" && !id.startsWith('temp-'));
    const finalPriority = editPriority ? editPriority.toUpperCase() : "MEDIUM";

    try {
      await updateApiTask({
        taskId: String(task.id || task._id),
        boardId: activeBoardId,
        updateData: {
          title: editTitle.trim() || "Task không tên",
          description: editDesc,
          priority: finalPriority, 
          status: isDone ? "DONE" : (task.status === "DONE" ? "TODO" : task.status || "TODO"), 
          story_point: Number(editStoryPoints) || 0, 
          start_date: editStartDate ? editStartDate.toISOString() : null,
          due_date: editDueDate ? editDueDate.toISOString() : null,
          assignees_user_id: cleanAssignees, 
          column_id: String(editColumnId), 
          parent_task_id: task.parent_task_id
        }
      });
      onClose(); 
    } catch (error) {
      console.error("Lỗi khi cập nhật Task:", error);
      alert("Lưu thất bại! Vui lòng kiểm tra lại dữ liệu.");
    } finally {
      setIsSaving(false); 
    }
  };

  const handleDelete = async () => {
    if (!activeBoardId) return;
    if (window.confirm(`Bạn có chắc muốn xóa task "${task.title}"?`)) {
      try {
        await deleteApiTask({ taskId: String(task.id || task._id), boardId: activeBoardId });
        onClose();
      } catch (error) {
        console.error("Lỗi khi xóa Task:", error);
      }
    }
  };

  const handleToggleSubtask = async (subtask: Task) => {
    if (!activeBoardId) return;
    const newStatus = (subtask.status === "DONE" || subtask.is_done) ? "TODO" : "DONE";
    const subtaskPriority = subtask.priority ? String(subtask.priority).toUpperCase() : "MEDIUM";
    
    const subAssignees = subtask.assignees_user_id || subtask.assigneesUserId || subtask.assignees || [];
    const cleanSubAssignees = subAssignees
      .map((item: any) => {
        if (typeof item === 'object') return item.user_id || item.id || item._id;
        return item;
      })
      .filter((id: any) => id && String(id) !== "undefined" && !String(id).startsWith('temp-'))
      .map((id: any) => String(id));

    try {
      await updateApiTask({
        taskId: String(subtask.id || subtask._id),
        boardId: activeBoardId,
        updateData: {
          title: subtask.title,
          description: subtask.description || "",
          priority: subtaskPriority, 
          status: newStatus,
          story_point: Number(subtask.story_point || subtask.story_points) || 0,
          start_date: subtask.start_date || null,
          due_date: subtask.due_date || null,
          assignees_user_id: cleanSubAssignees,
          column_id: String(listId),
          parent_task_id: String(task.id || task._id)
        }
      });
    } catch (error) {
      console.error("Lỗi khi toggle subtask:", error);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !activeBoardId) return;
    try {
      await createApiTask({
        boardId: activeBoardId,
        taskData: {
          title: newSubtaskTitle.trim(),
          description: "",
          priority: "MEDIUM",
          status: "TODO",
          story_point: 0,
          assignees_user_id: [],
          column_id: String(listId),
          parent_task_id: String(task.id || task._id)
        }
      });
      setNewSubtaskTitle(""); 
    } catch (error) {
      console.error("Lỗi tạo subtask:", error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!activeBoardId || String(subtaskId) === "undefined" || String(subtaskId).startsWith('temp-')) return;
    try {
      await deleteApiTask({ taskId: subtaskId, boardId: activeBoardId });
    } catch (error) {
      console.error("Lỗi xóa subtask:", error);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>

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
              Vị trí hiện tại: <span className="font-bold px-2 py-0.5 rounded-md border border-slate-200/60 bg-indigo-50 text-indigo-700">
                {board?.columns?.find((c: any) => String(c.id || c._id) === String(editColumnId))?.list_name || "Không rõ"}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0 mt-1">
            <button
              onClick={() => setIsDone(!isDone)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                isDone 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm ring-2 ring-emerald-100 ring-offset-1' 
                  : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-500'
              }`}
            >
              <CheckSquare size={18} className={isDone ? "text-emerald-500" : "text-slate-300"} />
              {isDone ? 'Đã hoàn thành' : 'Đánh dấu xong'}
            </button>

            <button onClick={onClose} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nội dung cuộn */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
            
            {/* 🚀 CỘT TRÁI */}
            <div className="flex-1 flex flex-col gap-8">
              
              {/* Mô tả */}
              <div>
                <div className="flex items-center gap-2.5 text-slate-800 mb-4 font-bold text-lg">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><AlignLeft size={18} /></div>
                  <h3>Mô tả chi tiết</h3>
                </div>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Thêm mô tả chi tiết hơn cho công việc này..."
                  className="w-full min-h-[140px] p-5 bg-white border border-slate-200/80 rounded-2xl text-[15px] leading-relaxed text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all resize-y custom-scrollbar shadow-sm"
                />
              </div>

              {/* 🚀 KHU VỰC TÀI LIỆU ĐÍNH KÈM Ở ĐÂY */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5 text-slate-800 font-bold text-lg">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Paperclip size={18} /></div>
                    <h3>Tài liệu đính kèm</h3>
                    <span className="ml-1.5 text-xs font-black bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                      {(task.attachments || []).length}
                    </span>
                  </div>
                  
                  {/* Nút Upload Trực Tiếp */}
                  <div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Plus size={16} />}
                      {isUploading ? "Đang tải..." : "Thêm file"}
                    </button>
                  </div>
                </div>

                {/* Danh sách File đã up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(task.attachments || []).length === 0 ? (
                    <div className="col-span-full p-6 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-center text-sm font-medium text-slate-400 bg-slate-50/30">
                      Chưa có file nào. Hãy nhấn "Thêm file" để nộp tài liệu!
                    </div>
                  ) : (
                    (task.attachments || []).map((file: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer" onClick={() => window.open(file.file_url || file.fileUrl, '_blank')}>
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
                          <File size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors" title={file.file_name || file.fileName}>
                            {file.file_name || file.fileName}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">
                            {file.content_type?.split('/')[1] || 'FILE'} • {((file.file_size || file.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
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

              {/* Checklist Việc Con */}
              <div>
                <div className="flex items-center gap-2.5 text-slate-800 mb-4 font-bold text-lg">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckSquare size={18} /></div>
                  <h3>Checklist Việc Con</h3>
                  <span className="ml-1.5 text-xs font-black bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">{(task.subtasks || []).length}</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-sm">
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {(task.subtasks || []).map((st: Task, idx: number) => {
                      const subtaskId = st.id || st._id;
                      return (
                        <div key={`subtask-${subtaskId || idx}`} className="group/st flex items-center gap-3 p-2.5 hover:bg-slate-50/80 rounded-xl transition-all border border-transparent hover:border-slate-100">
                          <button onClick={() => handleToggleSubtask(st)} className="shrink-0 transition-transform active:scale-90">
                            {st.status === "DONE" ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} className="text-slate-300 hover:text-indigo-400 transition-colors" />}
                          </button>
                          <span className={`text-[15px] flex-1 truncate ${st.status === "DONE" ? "line-through text-slate-400" : "text-slate-700 font-medium"}`}>{st.title}</span>
                          <button onClick={() => handleDeleteSubtask(String(subtaskId))} className="opacity-0 group-hover/st:opacity-100 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 p-1.5 pt-3 border-t border-slate-100 flex items-center gap-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400"><Plus size={16} /></div>
                    <input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSubtaskTitle.trim()) {
                          e.preventDefault();
                          handleAddSubtask();
                        }
                      }}
                      placeholder="Thêm một việc con (Nhấn Enter để lưu)..."
                      className="flex-1 text-[15px] font-medium bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* AI Suggestion */}
              {(task.ai_estimation_reason) && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/60 rounded-2xl p-5 flex gap-4 shadow-sm relative overflow-hidden">
                  <Sparkles size={120} className="absolute -bottom-6 -right-6 text-amber-500/5 rotate-12" />
                  <div className="p-2.5 bg-amber-100/80 text-amber-600 rounded-xl h-fit shadow-sm backdrop-blur-sm relative z-10"><Sparkles size={22} /></div>
                  <div className="relative z-10">
                    <h4 className="text-[15px] font-black text-amber-900 tracking-tight flex items-center gap-2 mb-1.5">
                      AI Phân tích & Đánh giá
                      <span className="bg-amber-200/50 text-amber-800 text-[11px] px-2 py-0.5 rounded-full border border-amber-300/30">
                        {task.ai_suggested_points || 0} Pts
                      </span>
                    </h4>
                    <p className="text-[14px] text-amber-800/80 leading-relaxed font-medium">
                      {task.ai_estimation_reason}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 🚀 CỘT PHẢI */}
            <div className="w-full md:w-[280px] flex flex-col gap-6 shrink-0">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Thông số
                </h4>

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
                            {col.list_name}
                          </option>
                        );
                      })}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={16} /></div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2"><User size={15} className="text-slate-400" /> Người thực hiện</label>
                  <div className="flex flex-wrap gap-2 relative">
                    {editAssignees.filter(id => id && id !== "undefined" && !id.startsWith('temp-')).length > 0 ? (
                      editAssignees.filter(id => id && id !== "undefined" && !id.startsWith('temp-')).map((userId: string, idx: number) => {
                        const member = getUser(userId, projectId);
                        const displayName = member?.full_name || "Unnamed";
                        const avatarUrl = member?.avatar_url;
                        const initial = String(displayName).charAt(0).toUpperCase();

                        return (
                          <div key={`assignee-${userId || idx}`} className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm group/name">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover border border-indigo-200 shadow-sm" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">{initial}</div>
                            )}
                            <span className="text-[12px] font-bold text-indigo-700 pr-1 truncate max-w-[120px]">{displayName}</span>
                            <button 
                              onClick={() => toggleAssignee(userId)}
                              className="opacity-0 group-hover/name:opacity-100 p-0.5 hover:bg-indigo-200 rounded-full transition-all text-indigo-400 hover:text-indigo-600"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <span className="w-full text-[13px] text-slate-400 italic bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 border-dashed font-medium text-center">Chưa có ai nhận việc</span>
                    )}

                    <button 
                      onClick={() => setIsAssigneePopupOpen(!isAssigneePopupOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[12px]"
                    >
                      <Plus size={14} /> <span>Thêm người</span>
                    </button>

                    {isAssigneePopupOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAssigneePopupOpen(false)}></div>
                        <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar">
                          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Thành viên dự án</h5>
                          {isMembersLoading ? (
                             <div className="text-xs text-center text-slate-400 p-3 italic">Đang tải danh sách...</div>
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
                                  key={`member-${safeMemberId}`} 
                                  onClick={() => toggleAssignee(safeMemberId)}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {member.avatar_url ? (
                                       <img src={member.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                       <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{initial}</div>
                                    )}
                                    <span className={`text-[13px] ${isSelected ? 'font-bold text-indigo-700' : 'font-medium text-slate-700'}`}>{displayName}</span>
                                  </div>
                                  {isSelected && <Check size={16} className="text-indigo-600" />}
                                </div>
                              )
                            })
                          ) : (
                            <div className="text-xs text-center text-slate-400 p-3 italic">Dự án chưa có thành viên nào.</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2"><Flag size={15} className="text-slate-400" /> Mức Ưu tiên</label>
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
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={16} /></div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2"><Target size={15} className="text-slate-400" /> Story Points</label>
                  <input
                    type="number"
                    min="0"
                    value={editStoryPoints}
                    onChange={(e) => setEditStoryPoints(e.target.value)}
                    className="w-full text-sm font-black text-indigo-600 border border-slate-200/80 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all bg-white shadow-sm"
                  />
                </div>
              </div>

              {/* Box Thời Gian */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Thời gian
                </h4>

                <div className="flex flex-col gap-2 relative">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2"><Calendar size={15} className="text-slate-400" /> Bắt đầu</label>
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
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2"><Calendar size={15} className="text-slate-400" /> Kết thúc (Due)</label>
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
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2"><Clock size={15} className="text-slate-400" /> Thời lượng dự kiến</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={calculatedDays}
                      readOnly
                      title="Tính tự động dựa trên ngày bắt đầu và kết thúc"
                      className="w-full text-sm font-black text-amber-700 border border-amber-200/60 rounded-xl px-3.5 py-2.5 outline-none bg-amber-50/50 cursor-not-allowed transition-all"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md">Ngày</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/80 backdrop-blur-sm px-6 py-4 border-t border-slate-200/60 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 z-10">
          <button onClick={handleDelete} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-rose-100">
            <Trash2 size={18} /> Xóa công việc
          </button>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-3 sm:py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-xl text-[15px] font-bold transition-all">
              Đóng
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-8 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[15px] font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 border border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={18} /> {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskDetailModal;