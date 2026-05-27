import React, { useState, memo } from "react";
import {
  Trash2,
  Edit2,
  AlignLeft,
  Flag,
  CheckSquare,
  Square,
  Calendar,
  Clock,
  Check,
  MessageSquareText,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useBoardStore } from "../stores/useBoardStore";
import { useUserStore } from "../../user/store/useUserStore";
import {
  useDeleteTask,
  useUpdateTask,
  useGetBoardDetail,
} from "../hooks/useBoardQueries";

import DeleteConfirmModal from "./DeleteConfirmModal";

import {
  TaskItemProps as BaseTaskItemProps,
  Task,
  TaskModalInitialFocus,
} from "../types/index";

interface TaskItemProps extends BaseTaskItemProps {
  onOpenTaskDetail?: (taskId: string, mode?: TaskModalInitialFocus) => void;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const formatDateForDisplay = (dateString?: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const TaskItem: React.FC<TaskItemProps> = memo(
  ({ task, listId, isOverlay, onOpenTaskDetail }) => {
    const { activeBoardId } = useBoardStore();
    const { data: board } = useGetBoardDetail(activeBoardId as string);
    const projectId = board?.projectId || board?.project_id;

    const getUser = useUserStore((state) => state.getUser);

    const { mutateAsync: deleteApiTask } = useDeleteTask();
    const { mutateAsync: updateApiTask } = useUpdateTask();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const safeTaskId = String(task.id || task._id);
    const isTaskDone = task.status === "DONE" || task.is_done;

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: safeTaskId,
      data: { type: "Task", task, listId },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
    };

    const handleDeleteTask = async () => {
      if (!activeBoardId || !board) return;

      const safeProjectId = board.project_id || board.projectId || board._id;

      if (!safeProjectId) {
        console.error("🚨 Không tìm thấy ID dự án!");
        alert("Lỗi: Không tìm thấy ID dự án để xóa!");
        return;
      }

      try {
        await deleteApiTask({
          taskId: safeTaskId,
          boardId: activeBoardId,
          projectId: String(safeProjectId),
        });

        setIsDeleteModalOpen(false);
      } catch (error) {
        console.error("Lỗi khi xóa Task:", error);
        alert("Xóa task thất bại. Vui lòng thử lại.");
      }
    };

    const handleToggleSubtask = async (e: React.MouseEvent, subtaskId: string) => {
      e.stopPropagation();
      if (!activeBoardId) return;

      const subtask = task.subtasks?.find((st: Task) => st.id === subtaskId || st._id === subtaskId);
      if (!subtask) return;

      const newStatus = subtask.status === "DONE" || subtask.is_done ? "TODO" : "DONE";
      const rawAssignees = subtask.assignees_user_id || subtask.assigneesUserId || subtask.assignees || subtask.assignee_id || [];
      const assigneeArray = Array.isArray(rawAssignees) ? rawAssignees : [rawAssignees];

      const cleanAssignees = assigneeArray
        .map((item: any) => typeof item === "object" ? item.user_id || item.id || item._id : item)
        .filter((id: any) => id && String(id) !== "undefined" && !String(id).startsWith("temp-"))
        .map((id: any) => String(id));

      try {
        await updateApiTask({
          taskId: subtaskId,
          boardId: activeBoardId,
          updateData: {
            title: subtask.title,
            description: subtask.description || "",
            column_id: listId,
            parent_task_id: safeTaskId,
            status: newStatus,
            priority: subtask.priority ? String(subtask.priority).toUpperCase() : "MEDIUM",
            story_point: Number(subtask.story_point || subtask.story_points) || 0,
            assignees_user_id: cleanAssignees,
            start_date: subtask.start_date || null,
            due_date: subtask.due_date || null,
          },
        });
      } catch (error) {
        console.error("Lỗi khi cập nhật Subtask:", error);
      }
    };

    const openDetail = (e: React.MouseEvent, mode: TaskModalInitialFocus = "detail") => {
      e.stopPropagation();
      if (onOpenTaskDetail) onOpenTaskDetail(safeTaskId, mode);
    };

    return (
      <>
        <div
          ref={isOverlay ? null : setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={() => {
            if (!isOverlay && onOpenTaskDetail) {
              onOpenTaskDetail(safeTaskId, "detail");
            }
          }}
          className={`group relative flex flex-col p-3.5 sm:p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all 
          ${isTaskDone ? "bg-slate-50/80 border-slate-200/60 opacity-85 hover:border-slate-300" : "bg-white border-slate-200 hover:border-indigo-300"} 
          ${isOverlay ? "rotate-3 scale-105 shadow-2xl border-indigo-500 ring-4 ring-indigo-50/80 z-50" : ""}`}
        >
          <div className="flex justify-between items-start gap-2 pr-24">
            <h4 className={`text-sm font-semibold break-words leading-snug transition-all ${isTaskDone ? "line-through text-slate-400 font-medium" : "text-slate-800"}`}>
              {task.title}
            </h4>
            {isTaskDone && (
              <span className="shrink-0 text-emerald-600 bg-emerald-50 p-0.5 rounded-full border border-emerald-200 shadow-sm animate-in fade-in zoom-in-50 duration-300">
                <Check size={10} strokeWidth={3} />
              </span>
            )}
          </div>

          {task.description && (
            <div className="mt-2 flex items-start gap-1.5 text-slate-500">
              <AlignLeft size={12} className="shrink-0 mt-0.5 text-slate-400" />
              <p className={`text-xs line-clamp-2 leading-relaxed ${isTaskDone ? "text-slate-400/70" : ""}`}>
                {task.description}
              </p>
            </div>
          )}

          {(task.start_date || task.due_date || (task.estimated_days && task.estimated_days > 0)) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-medium text-slate-500">
              {(task.start_date || task.due_date) && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100 whitespace-nowrap">
                  <Calendar size={10} className="text-slate-400" />
                  <span>
                    {task.start_date ? formatDateForDisplay(task.start_date) : "?"}
                    {" - "}
                    {task.due_date ? formatDateForDisplay(task.due_date) : "?"}
                  </span>
                </div>
              )}

              {task.estimated_days && task.estimated_days > 0 ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100 whitespace-nowrap">
                  <Clock size={10} />
                  <span>{task.estimated_days} days</span>
                </div>
              ) : null}
            </div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1 border-t border-slate-100 pt-2 cursor-default">
              {task.subtasks.map((st: Task) => (
                <div
                  key={String(st.id || st._id)}
                  onClick={(e) => handleToggleSubtask(e, String(st.id || st._id))}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
                >
                  {st.status === "DONE" || st.is_done ? (
                    <CheckSquare size={13} className="text-emerald-500 shrink-0" />
                  ) : (
                    <Square size={13} className="text-slate-300 shrink-0" />
                  )}
                  <span className={`text-[11px] flex-1 truncate ${st.status === "DONE" || st.is_done ? "line-through text-slate-400" : "text-slate-600 font-medium"}`} title={st.title}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-2">
              {task.priority && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${isTaskDone ? "bg-slate-100 text-slate-400 border border-slate-200/60" : priorityColors[String(task.priority).toUpperCase()] || priorityColors.MEDIUM}`}>
                  <Flag size={10} />
                  <span className="text-[10px] font-bold uppercase">{task.priority}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(() => {
                const rawAssignees = task.assignees_user_id || task.assigneesUserId || task.assignees || task.assignee_id || task.assignee_ids;
                const assigneeArray = Array.isArray(rawAssignees) ? rawAssignees : (rawAssignees ? [rawAssignees] : []);

                if (assigneeArray.length > 0) {
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {assigneeArray.map((item: any, idx: number) => {
                        const userId = typeof item === "object" ? item.user_id || item.id || item._id : item;
                        if (!userId) return null;

                        const member = getUser(userId, projectId);
                        const displayName = member?.full_name || member?.name || "Thành viên";
                        const avatarUrl = member?.avatar_url || member?.avatarUrl;
                        const initial = displayName.charAt(0).toUpperCase();

                        return (
                          <span
                            key={userId || idx}
                            title={displayName}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all shadow-sm ${isTaskDone ? "bg-slate-100 text-slate-400 border-slate-200/60" : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"}`}
                          >
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className={`w-4 h-4 rounded-full object-cover border shrink-0 ${isTaskDone ? "border-slate-200/80 grayscale" : "border-indigo-200"}`}
                              />
                            ) : (
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white shrink-0 ${isTaskDone ? "bg-slate-300" : "bg-indigo-600"}`}>
                                {initial}
                              </div>
                            )}
                            <span className="truncate max-w-[80px]">{displayName}</span>
                          </span>
                        );
                      })}
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </div>

          <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-slate-100">
            <button
              type="button"
              title="Mở chi tiết"
              onClick={(e) => openDetail(e, "detail")}
              className="p-2 md:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            >
              <Edit2 size={14} />
            </button>

            <button
              type="button"
              title="Bình luận nhanh"
              onClick={(e) => openDetail(e, "comments")}
              className="p-2 md:p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
            >
              <MessageSquareText size={14} />
            </button>

            <button
              type="button"
              title="Xóa công việc"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteModalOpen(true);
              }}
              className="p-2 md:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteTask}
          taskTitle={task.title}
        />
      </>
    );
  },
);

TaskItem.displayName = "TaskItem";

export default TaskItem;