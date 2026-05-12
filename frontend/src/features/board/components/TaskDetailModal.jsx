import React, { useState, useEffect, forwardRef } from "react";
import { createPortal } from "react-dom";
import {
  X, AlignLeft, CheckSquare, Clock, Calendar, Flag,
  Target, Sparkles, Plus, Square, Save, Trash2, User, ChevronDown,
} from "lucide-react";
import { useBoardStore } from "../stores/useBoardStore";
import { useUserStore } from "../../user/store/useUserStore"; 

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import vi from "date-fns/locale/vi";

registerLocale("vi", vi);

const priorityColors = {
  Low: "bg-blue-100 text-blue-700",
  Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
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
));

const TaskDetailModal = ({ isOpen, onClose, task, listId }) => {
  const { updateTask, toggleSubtask, addSubtask, deleteTask, board } = useBoardStore(); 
  const getUser = useUserStore((state) => state.getUser);
  const projectId = board?.projectId || board?.project_id;

  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");
  const [editStoryPoints, setEditStoryPoints] = useState(0);

  const [editStartDate, setEditStartDate] = useState(null);
  const [editDueDate, setEditDueDate] = useState(null);

  // 🚀 Đã XÓA State editEstimatedDays
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Chỉ giữ lại 1 useEffect duy nhất để nạp dữ liệu lần đầu khi mở Modal
  useEffect(() => {
    if (isOpen && task) {
      setEditTitle(task.title || "");
      setEditDesc(task.description || "");
      setEditPriority(task.priority || "Medium");
      setEditStoryPoints(task.story_points || task.story_point || 0);
      setEditStartDate(task.start_date ? new Date(task.start_date) : null);
      setEditDueDate(task.due_date ? new Date(task.due_date) : null);
    }
  }, [isOpen, task]);

  // 🚀 Đã XÓA useEffect tính ngày. THAY BẰNG: Tính trực tiếp (Derived State)
  let calculatedDays = "";
  if (editStartDate && editDueDate) {
    if (editDueDate >= editStartDate) {
      const diffTime = editDueDate.getTime() - editStartDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      calculatedDays = diffDays === 0 ? 1 : diffDays;
    } else {
      calculatedDays = 0;
    }
  }

  if (!isOpen || !task) return null;

  const handleSave = () => {
    updateTask(listId, task.id || task._id, {
      title: editTitle.trim() || "Task không tên",
      description: editDesc,
      priority: editPriority,
      story_points: Number(editStoryPoints),
      start_date: editStartDate ? editStartDate.toISOString() : null,
      due_date: editDueDate ? editDueDate.toISOString() : null,
      estimated_days: Number(calculatedDays), // 🚀 Dùng biến tính toán để lưu
      assignees_user_id: task.assignees_user_id || [],
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Bạn có chắc muốn xóa task "${task.title}"?`)) {
      deleteTask(listId, task.id || task._id);
      onClose();
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
              Trong danh sách <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">{task.status}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-all shrink-0 mt-1">
            <X size={20} />
          </button>
        </div>

        {/* Nội dung cuộn */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
            
            {/* CỘT TRÁI (Main Info) */}
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

              {/* Việc con */}
              <div>
                <div className="flex items-center gap-2.5 text-slate-800 mb-4 font-bold text-lg">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckSquare size={18} /></div>
                  <h3>Checklist Việc Con</h3>
                  <span className="ml-1.5 text-xs font-black bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">{(task.subtasks || []).length}</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-sm">
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {(task.subtasks || []).map((st) => (
                      <div key={st.id || st._id} className="group/st flex items-center gap-3 p-2.5 hover:bg-slate-50/80 rounded-xl transition-all border border-transparent hover:border-slate-100">
                        <button onClick={() => toggleSubtask(listId, task.id || task._id, st.id || st._id)} className="shrink-0 transition-transform active:scale-90">
                          {st.status === "DONE" ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} className="text-slate-300 hover:text-indigo-400 transition-colors" />}
                        </button>
                        <span className={`text-[15px] flex-1 truncate ${st.status === "DONE" ? "line-through text-slate-400" : "text-slate-700 font-medium"}`}>{st.title}</span>
                        <button onClick={() => deleteTask(listId, st.id || st._id)} className="opacity-0 group-hover/st:opacity-100 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><X size={16} /></button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 p-1.5 pt-3 border-t border-slate-100 flex items-center gap-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400"><Plus size={16} /></div>
                    <input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSubtaskTitle.trim()) {
                          e.preventDefault();
                          addSubtask(listId, task.id || task._id, newSubtaskTitle);
                          setNewSubtaskTitle("");
                        }
                      }}
                      placeholder="Thêm một việc con (Nhấn Enter để lưu)..."
                      className="flex-1 text-[15px] font-medium bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* AI Suggestion */}
              {task.ai_estimation_reason && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/60 rounded-2xl p-5 flex gap-4 shadow-sm relative overflow-hidden">
                  <Sparkles size={120} className="absolute -bottom-6 -right-6 text-amber-500/5 rotate-12" />
                  <div className="p-2.5 bg-amber-100/80 text-amber-600 rounded-xl h-fit shadow-sm backdrop-blur-sm relative z-10"><Sparkles size={22} /></div>
                  <div className="relative z-10">
                    <h4 className="text-[15px] font-black text-amber-900 tracking-tight flex items-center gap-2 mb-1.5">
                      AI Phân tích & Đánh giá
                      <span className="bg-amber-200/50 text-amber-800 text-[11px] px-2 py-0.5 rounded-full border border-amber-300/30">{task.ai_suggested_points} Pts</span>
                    </h4>
                    <p className="text-[14px] text-amber-800/80 leading-relaxed font-medium">{task.ai_estimation_reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* CỘT PHẢI (Sidebar Properties) */}
            <div className="w-full md:w-[280px] flex flex-col gap-6 shrink-0">
              
              {/* Box Thông Số Thẻ */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Thông số
                </h4>

                <div className="flex flex-col gap-3">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2"><User size={15} className="text-slate-400" /> Người thực hiện</label>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const assigneeArray = task.assignees_user_id || task.assigneesUserId || task.assignees || [];
                      if (assigneeArray.length > 0) {
                        return assigneeArray.map((item, idx) => {
                          const userId = typeof item === 'object' ? (item.id || item._id) : item;
                          const member = getUser(userId, projectId);
                          const displayName = member?.full_name || member?.name || "Unnamed";
                          const avatarUrl = member?.avatar_url || member?.avatarUrl;
                          const initial = displayName.charAt(0).toUpperCase();

                          return (
                            <div key={userId || idx} className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm group/name">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover border border-indigo-200 shadow-sm" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">{initial}</div>
                              )}
                              <span className="text-[12px] font-bold text-indigo-700 pr-1 truncate max-w-[120px]">{displayName}</span>
                              <button className="opacity-0 group-hover/name:opacity-100 p-0.5 hover:bg-indigo-200 rounded-full transition-all text-indigo-400 hover:text-indigo-600"><X size={10} /></button>
                            </div>
                          );
                        });
                      } else {
                        return <span className="w-full text-[13px] text-slate-400 italic bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 border-dashed font-medium text-center">Chưa có ai nhận việc</span>;
                      }
                    })()}
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[12px]">
                      <Plus size={14} /> <span>Thêm người</span>
                    </button>
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
                      {Object.keys(priorityColors).map((p) => <option key={p} value={p}>{p}</option>)}
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
                    onChange={(date) => setEditStartDate(date)}
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
                    onChange={(date) => setEditDueDate(date)}
                    selectsEnd
                    startDate={editStartDate}
                    endDate={editDueDate}
                    minDate={editStartDate}
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
                      value={calculatedDays} // 🚀 Gắn biến tính toán vào đây
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

        {/* Footer (Actions) */}
        <div className="bg-white/80 backdrop-blur-sm px-6 py-4 border-t border-slate-200/60 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 z-10">
          <button onClick={handleDelete} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-rose-100">
            <Trash2 size={18} /> Xóa công việc
          </button>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-3 sm:py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-xl text-[15px] font-bold transition-all">
              Đóng
            </button>
            <button onClick={handleSave} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-8 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[15px] font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 border border-indigo-500">
              <Save size={18} /> Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskDetailModal;