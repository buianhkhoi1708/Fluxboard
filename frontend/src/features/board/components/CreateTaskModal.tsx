import React, { useState, useEffect, forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  AlignLeft,
  Calendar,
  Flag,
  Target,
  User,
  ChevronDown,
  Plus,
  Check,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
import { useBoardStore } from "../stores/useBoardStore";
import { useUserStore } from "../../user/store/useUserStore";
import {
  useGetBoardDetail,
  useCreateTask,
  useGetProjectMembers,
} from "../hooks/useBoardQueries";

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import vi from "date-fns/locale/vi";

registerLocale("vi", vi);

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnId: string;
  columnName: string;
}

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
          className={
            value
              ? "text-indigo-500"
              : "text-slate-400 group-hover:text-indigo-400 transition-colors"
          }
        />
        <span
          className={
            value ? "font-bold text-slate-800" : "text-slate-400 font-medium"
          }
        >
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

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  columnId,
  columnName,
}) => {
  const { activeBoardId } = useBoardStore();
  const { data: board } = useGetBoardDetail(activeBoardId as string);
  const getUser = useUserStore((state) => state.getUser);

  const projectId = board?.projectId || board?.project_id;
  const { data: apiMembers, isLoading: isMembersLoading } =
    useGetProjectMembers(projectId as string);
  const { mutateAsync: createTaskApi } = useCreateTask();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setNewPriority] = useState("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<number | string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [assignees, setAssignees] = useState<string[]>([]);

  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [isAssigneePopupOpen, setIsAssigneePopupOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDesc("");
      setNewPriority("MEDIUM");
      setStoryPoints("");
      setStartDate(null);
      setDueDate(null);
      setAssignees([]);
      setSubtasks([]);
      setNewSubtaskTitle("");
      setIsSaving(false);
      setIsAssigneePopupOpen(false);
    }
  }, [isOpen]);

  const projectMembers = useMemo(() => {
    if (!apiMembers) return [];
    if (Array.isArray(apiMembers)) return apiMembers;
    if (apiMembers.data && Array.isArray(apiMembers.data))
      return apiMembers.data;
    return apiMembers.content || [];
  }, [apiMembers]);

  const toggleAssignee = (userId: string) => {
    const safeId = String(userId);
    if (!safeId || safeId === "undefined" || safeId.startsWith("temp-")) return;
    setAssignees((prev) =>
      prev.includes(safeId)
        ? prev.filter((id) => id !== safeId)
        : [...prev, safeId],
    );
  };

  const handleAddLocalSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, newSubtaskTitle.trim()]);
      setNewSubtaskTitle("");
    }
  };

  const handleRemoveLocalSubtask = (indexToRemove: number) => {
    setSubtasks(subtasks.filter((_, idx) => idx !== indexToRemove));
  };

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!title.trim() || !activeBoardId) return;
    setIsSaving(true);

    try {
      const payload = {
        project_id: String(projectId),
        board_id: String(activeBoardId),
        title: title.trim(),
        description: desc,
        column_id: String(columnId),
        priority: priority.toUpperCase(),
        status: "TODO",
        assignees_user_id: assignees,
        story_point: Number(storyPoints) || 0,
        start_date: startDate ? startDate.toISOString() : null,
        due_date: dueDate ? dueDate.toISOString() : null,
        subtasks: subtasks.map((stTitle) => ({
          title: stTitle,
          is_done: false,
        })),
      };

      await createTaskApi(payload);
      onClose();
    } catch (error) {
      console.error("Lỗi tạo Task:", error);
      alert("Tạo Task thất bại!");
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-[900px] bg-slate-50/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/50">
        {}
        <div className="bg-white/80 backdrop-blur-sm px-6 py-5 border-b border-slate-200/60 flex justify-between items-start gap-6 sticky top-0 z-10">
          <div className="flex-1">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-extrabold text-slate-800 bg-transparent border-2 border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-xl px-3 py-1.5 outline-none transition-all placeholder:text-slate-300"
              placeholder="Tiêu đề công việc mới..."
            />
            <p className="text-[13px] text-slate-500 px-3 mt-1.5 font-medium">
              Tạo trong danh sách:{" "}
              <span className="font-bold px-2 py-0.5 rounded-md border border-slate-200/60 bg-indigo-50 text-indigo-700">
                {columnName}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-all shrink-0 mt-1"
          >
            <X size={20} />
          </button>
        </div>

        {}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
            {}
            <div className="flex-1 flex flex-col gap-8">
              {}
              <div>
                <div className="flex items-center gap-2.5 text-slate-800 mb-4 font-bold text-lg">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <AlignLeft size={18} />
                  </div>
                  <h3>Mô tả công việc</h3>
                </div>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Thêm mô tả chi tiết công việc tại đây..."
                  className="w-full min-h-[140px] p-5 bg-white border border-slate-200/80 rounded-2xl text-[15px] leading-relaxed text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all resize-y shadow-sm custom-scrollbar"
                />
              </div>

              {}
              <div>
                <div className="flex items-center gap-2.5 text-slate-800 mb-4 font-bold text-lg">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckSquare size={18} />
                  </div>
                  <h3>Checklist Việc Con</h3>
                  {subtasks.length > 0 && (
                    <span className="ml-1.5 text-xs font-black bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                      {subtasks.length}
                    </span>
                  )}
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-sm">
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {subtasks.map((stTitle, idx) => (
                      <div
                        key={idx}
                        className="group/st flex items-center gap-3 p-2.5 hover:bg-slate-50/80 rounded-xl transition-all border border-transparent hover:border-slate-100"
                      >
                        <Square size={18} className="text-slate-300 shrink-0" />
                        <span className="text-[15px] flex-1 truncate text-slate-700 font-medium">
                          {stTitle}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLocalSubtask(idx)}
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
                          handleAddLocalSubtask();
                        }
                      }}
                      placeholder="Gõ tên việc con và nhấn Enter..."
                      className="flex-1 text-[15px] font-medium bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="w-full md:w-[280px] flex flex-col gap-6 shrink-0">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>{" "}
                  Thuộc tính
                </h4>

                {}
                <div className="flex flex-col gap-3">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <User size={15} className="text-slate-400" /> Người thực
                    hiện
                  </label>
                  <div className="flex flex-wrap gap-2 relative">
                    {assignees.length > 0 ? (
                      assignees.map((userId, idx) => {
                        const apiMember = projectMembers.find((m: any) => {
                          const targetId =
                            m.user_id?._id ||
                            m.user_id?.id ||
                            m.user_id ||
                            m.id ||
                            m._id;
                          return String(targetId) === String(userId);
                        });

                        const userDetail =
                          apiMember?.user_id ||
                          getUser(userId, projectId as string);
                        const displayName =
                          userDetail?.full_name ||
                          userDetail?.name ||
                          "Unnamed";
                        const avatarUrl =
                          userDetail?.avatar_url || userDetail?.avatarUrl;
                        const initial = String(displayName)
                          .charAt(0)
                          .toUpperCase();

                        return (
                          <div
                            key={`chosen-${userId || idx}`}
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
                            <span
                              className="text-[12px] font-bold text-indigo-700 truncate max-w-[100px]"
                              title={displayName}
                            >
                              {displayName}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleAssignee(userId)}
                              className="opacity-0 group-hover/name:opacity-100 p-0.5 hover:bg-indigo-200 rounded-full text-indigo-400 hover:text-indigo-600 transition-all"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <span className="w-full text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200 border-dashed text-center">
                        Chưa phân công ai
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setIsAssigneePopupOpen(!isAssigneePopupOpen)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[11px]"
                    >
                      <Plus size={12} /> Phân công
                    </button>

                    {}
                    {isAssigneePopupOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsAssigneePopupOpen(false)}
                        ></div>
                        <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Thành viên
                          </h5>
                          {isMembersLoading ? (
                            <div className="text-xs text-center text-slate-400 p-2">
                              Đang tải...
                            </div>
                          ) : projectMembers.length > 0 ? (
                            projectMembers.map((member: any, idx: number) => {
                              const userDetail = member.user_id || member;
                              const rawId = userDetail._id || userDetail.id;
                              if (!rawId) return null;

                              const safeId = String(rawId);
                              const isSelected = assignees.includes(safeId);
                              const name =
                                userDetail.full_name ||
                                userDetail.name ||
                                "Unnamed";
                              const avatarUrl =
                                userDetail.avatar_url || userDetail.avatarUrl;
                              const initial = String(name)
                                .charAt(0)
                                .toUpperCase();

                              return (
                                <div
                                  key={`pop-${safeId || idx}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleAssignee(safeId);
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        className="w-6 h-6 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                        {initial}
                                      </div>
                                    )}
                                    <span className="text-xs font-medium text-slate-700">
                                      {name}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <Check
                                      size={14}
                                      className="text-indigo-600"
                                    />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-xs text-center text-slate-400 p-2">
                              Dự án trống
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Flag size={15} className="text-slate-400" /> Mức Ưu tiên
                  </label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setNewPriority(e.target.value)}
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

                {}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Target size={15} className="text-slate-400" /> Story Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(e.target.value)}
                    placeholder="0"
                    className="w-full text-sm font-black text-indigo-600 border border-slate-200/80 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all bg-white shadow-sm"
                  />
                </div>
              </div>

              {}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Calendar size={15} className="text-slate-400" /> Ngày Bắt
                    đầu
                  </label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={dueDate}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày đầu"
                    customInput={<CustomDateInput />}
                    isClearable
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                    <Calendar size={15} className="text-slate-400" /> Ngày Hạn
                    chót
                  </label>
                  <DatePicker
                    selected={dueDate}
                    onChange={(date) => setDueDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={dueDate}
                    minDate={startDate || undefined}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày cuối"
                    customInput={<CustomDateInput />}
                    isClearable
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="bg-white/80 backdrop-blur-sm px-6 py-4 border-t border-slate-200/60 flex justify-end gap-3 items-center z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-bold transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving || !title.trim()}
            className="flex justify-center items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> {isSaving ? "Đang tạo..." : "Tạo công việc"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreateTaskModal;
