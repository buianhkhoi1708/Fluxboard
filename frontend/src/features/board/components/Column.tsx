import React, { useState, memo, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { MoreHorizontal, Plus, Trash2, Edit2 } from "lucide-react";
import TaskItem from "./TaskItem";
import CreateTaskModal from "./CreateTaskModal";

import { useBoardStore } from "../stores/useBoardStore";
import { getColumnTotalPoints } from "../utils/boardUtils";

// 🚀 Đã import đủ 3 món để xử lý Cột và Project ID
import { useUpdateColumn, useDeleteColumn, useGetBoardDetail } from "../hooks/useBoardQueries";
import { ColumnProps } from "../types/index";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface ExtendedColumnProps extends ColumnProps {
  onOpenTaskDetail?: (taskId: string) => void;
}

// ✅ Modal xác nhận xoá (dùng Portal bên ngoài để luôn ở giữa màn hình)
const ConfirmDeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  columnName: string;
}> = ({ isOpen, onClose, onConfirm, columnName }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-800 mb-2">Xóa danh sách</h3>
        <p className="text-sm text-slate-600 mb-5">
          Bạn có chắc chắn muốn xóa danh sách{" "}
          <span className="font-semibold text-slate-800">“{columnName}”</span>?
          Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>,
    document.body 
  );
};

const Column: React.FC<ExtendedColumnProps> = memo(
  ({ list, onOpenTaskDetail }) => {
    // 🚀 1. LẤY ACTIVE BOARD ID (Phải nằm trong component)
    const { activeBoardId } = useBoardStore();
    
    // 🚀 2. LẤY BOARD DATA & PROJECT ID ĐỂ VƯỢT RBAC
    const { data: board } = useGetBoardDetail(activeBoardId as string);
    const safeProjectId = board?.project_id || board?.projectId || board?.project?._id || board?._id;

    const { mutateAsync: updateColumnApi } = useUpdateColumn();
    const { mutateAsync: deleteColumnApi } = useDeleteColumn();

    const displayName = list.name || list.list_name || "Chưa đặt tên";

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [isEditingName, setIsEditingName] = useState(false);
    const [editColName, setEditColName] = useState(displayName);
    const editNameInputRef = useRef<HTMLInputElement>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const listId = list.id || list._id;
    const safeListId = String(listId);
    const totalPoints = getColumnTotalPoints(list);
    const tasks = list.tasks || [];

    const { setNodeRef } = useDroppable({
      id: safeListId,
      data: { type: "List", listId: safeListId },
    });

    useEffect(() => {
      if (isEditingName && editNameInputRef.current) {
        editNameInputRef.current.focus();
      }
    }, [isEditingName]);

    // 🚀 HÀM LƯU TÊN CỘT ĐÃ CÓ PROJECT ID
    const handleSaveColName = async () => {
      setIsEditingName(false);
      if (
        !activeBoardId ||
        editColName.trim() === "" ||
        editColName.trim() === displayName
      ) {
        setEditColName(displayName);
        return;
      }

      if (!safeProjectId) {
         console.error("🚨 Không tìm thấy ID dự án!");
         setEditColName(displayName);
         return;
      }

      try {
        await updateColumnApi({
          columnId: safeListId,
          list_name: editColName.trim(),
          boardId: activeBoardId,
          projectId: String(safeProjectId) // Vé thông hành
        });
      } catch (error) {
        console.error("Lỗi khi sửa tên cột:", error);
        setEditColName(displayName);
      }
    };

    const handleDeleteColumnClick = () => {
      setIsMenuOpen(false);
      if (tasks.length > 0) {
        alert(
          "Cột này đang có việc. Vui lòng chuyển việc sang cột khác trước khi xóa!",
        );
        return;
      }
      setIsDeleteModalOpen(true);
    };

    // 🚀 HÀM XÓA CỘT ĐÃ CÓ PROJECT ID
    const confirmDeleteColumn = async () => {
      setIsDeleteModalOpen(false);
      
      if (!safeProjectId) {
         console.error("🚨 Không tìm thấy ID dự án để xóa!");
         return;
      }

      try {
        await deleteColumnApi({
          columnId: safeListId,
          boardId: activeBoardId,
          projectId: String(safeProjectId) // Vé thông hành
        });
      } catch (error) {
        console.error("Lỗi khi xóa cột:", error);
      }
    };

    return (
      <div className="w-[85vw] max-w-[300px] sm:w-[300px] shrink-0 flex flex-col bg-slate-100/80 backdrop-blur-md rounded-2xl max-h-full relative border border-white/60 shadow-sm">
        {/* Menu overlay khi mở menu */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
          ></div>
        )}

        {/* HEADER CỘT */}
        <div className="shrink-0 flex justify-between items-start p-3.5 pb-2 cursor-grab active:cursor-grabbing group/header">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <input
                  ref={editNameInputRef}
                  value={editColName}
                  onChange={(e) => setEditColName(e.target.value)}
                  onBlur={handleSaveColName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveColName();
                    if (e.key === "Escape") {
                      setIsEditingName(false);
                      setEditColName(displayName);
                    }
                  }}
                  className="text-sm font-extrabold text-slate-800 uppercase tracking-wide bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-indigo-100 w-full"
                />
              ) : (
                <h3
                  onDoubleClick={() => setIsEditingName(true)}
                  className="text-sm font-extrabold text-slate-800 uppercase tracking-wide truncate cursor-text"
                  title="Nhấn đúp để sửa"
                >
                  {displayName}
                </h3>
              )}
              {!isEditingName && (
                <span className="px-2 py-0.5 text-[11px] font-bold text-slate-600 bg-white shadow-sm rounded-full border border-slate-200/60 shrink-0">
                  {tasks.length}
                </span>
              )}
            </div>
            {totalPoints > 0 && (
              <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50/50 w-max px-1.5 py-0.5 rounded-md border border-indigo-100">
                {totalPoints} pts
              </span>
            )}
          </div>

          <div className="relative z-20 shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors opacity-0 group-hover/header:opacity-100 md:opacity-100"
            >
              <MoreHorizontal size={18} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-8 w-44 bg-white/90 backdrop-blur-xl rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setIsEditingName(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <Edit2 size={14} /> Sửa tên cột
                </button>
                <button
                  onClick={handleDeleteColumnClick}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                >
                  <Trash2 size={14} /> Xóa cột
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LÕI SCROLL CHỨA TASK */}
        <div
          ref={setNodeRef}
          className="flex-1 overflow-y-auto flex flex-col gap-2.5 px-2 pb-2 custom-scrollbar min-h-[50px]"
        >
          {Array.isArray(tasks) && (
            <SortableContext
              items={tasks.map((t) => String(t.id || t._id))}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <TaskItem
                  key={String(task.id || task._id)}
                  task={task}
                  listId={safeListId}
                  onOpenTaskDetail={onOpenTaskDetail}
                />
              ))}
            </SortableContext>
          )}
        </div>

        {/* FOOTER */}
        <div className="shrink-0 p-2 pt-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200/50 hover:text-indigo-600 rounded-xl transition-all"
          >
            <Plus
              size={16}
              className="text-slate-400 group-hover:text-indigo-500 transition-colors"
            />
            <span>Thêm Task mới</span>
          </button>
        </div>

        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          columnId={safeListId}
          columnName={displayName}
        />

        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteColumn}
          columnName={displayName}
        />
      </div>
    );
  }
);

export default Column;