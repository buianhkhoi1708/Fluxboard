import React, { useState, memo, useRef, useEffect } from 'react';
import { MoreHorizontal, Plus, Trash2, Edit2 } from 'lucide-react';
import TaskItem from './TaskItem';
import CreateTaskModal from './CreateTaskModal'; 

import { useBoardStore } from '../stores/useBoardStore';
import { getColumnTotalPoints } from '../utils/boardUtils'; 

import { useUpdateColumn, useDeleteColumn } from '../hooks/useBoardQueries'; 
import { ColumnProps } from '../types/index';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// 🚀 ĐỤC LỖ: Nhận hàm onOpenTaskDetail từ BoardView truyền xuống
interface ExtendedColumnProps extends ColumnProps {
  onOpenTaskDetail?: (taskId: string) => void;
}

const Column: React.FC<ExtendedColumnProps> = memo(({ list, onOpenTaskDetail }) => {
  const { activeBoardId } = useBoardStore();
  const { mutateAsync: updateColumnApi } = useUpdateColumn();
  const { mutateAsync: deleteColumnApi } = useDeleteColumn();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editColName, setEditColName] = useState(list.list_name);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  
  const listId = list.id || list._id;
  const safeListId = String(listId);
  const totalPoints = getColumnTotalPoints(list); 
  const tasks = list.tasks || [];

  const { setNodeRef } = useDroppable({
    id: safeListId,
    data: { type: 'List', listId: safeListId }
  });

  useEffect(() => {
    if (isEditingName && editNameInputRef.current) {
      editNameInputRef.current.focus();
    }
  }, [isEditingName]);

  const handleSaveColName = async () => {
    setIsEditingName(false);
    if (!activeBoardId || editColName.trim() === '' || editColName.trim() === list.list_name) {
      setEditColName(list.list_name); 
      return;
    }
    try {
      await updateColumnApi({ columnId: safeListId, list_name: editColName.trim(), boardId: activeBoardId });
    } catch (error) {
      console.error("Lỗi khi sửa tên cột:", error);
      setEditColName(list.list_name); 
    }
  };

  const handleDeleteColumn = async () => {
    setIsMenuOpen(false);
    if (!activeBoardId) return;
    if (tasks.length > 0) {
       alert("Cột này đang có việc. Vui lòng chuyển việc sang cột khác trước khi xóa!");
       return;
    }
    if (window.confirm(`Xóa danh sách "${list.list_name}"?`)) {
      try {
        await deleteColumnApi({ columnId: safeListId, boardId: activeBoardId });
      } catch (error) {
        console.error("Lỗi khi xóa cột:", error);
      }
    }
  };

  return (
    <div className="w-[85vw] max-w-[300px] sm:w-[300px] shrink-0 flex flex-col bg-slate-100/80 backdrop-blur-md rounded-2xl max-h-full relative border border-white/60 shadow-sm">
      {isMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>}
      
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
                   if (e.key === 'Enter') handleSaveColName();
                   if (e.key === 'Escape') { setIsEditingName(false); setEditColName(list.list_name); }
                 }}
                 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-indigo-100 w-full"
               />
            ) : (
              <h3 
                onDoubleClick={() => setIsEditingName(true)}
                className="text-sm font-extrabold text-slate-800 uppercase tracking-wide truncate cursor-text"
                title="Nhấn đúp để sửa"
              >
                {list.list_name}
              </h3>
            )}
            {!isEditingName && <span className="px-2 py-0.5 text-[11px] font-bold text-slate-600 bg-white shadow-sm rounded-full border border-slate-200/60 shrink-0">{tasks.length}</span>}
          </div>
          {totalPoints > 0 && <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50/50 w-max px-1.5 py-0.5 rounded-md border border-indigo-100">{totalPoints} pts</span>}
        </div>
        
        <div className="relative z-20 shrink-0">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors opacity-0 group-hover/header:opacity-100 md:opacity-100"><MoreHorizontal size={18} /></button>
          {isMenuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white/90 backdrop-blur-xl rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <button onClick={() => { setIsEditingName(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                <Edit2 size={14} /> Sửa tên cột
              </button>
              <button onClick={handleDeleteColumn} className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100">
                <Trash2 size={14} /> Xóa cột
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LÕI SCROLL CHỨA TASK */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto flex flex-col gap-2.5 px-2 pb-2 custom-scrollbar min-h-[50px]">
        <SortableContext items={tasks.map(t => String(t.id || t._id))} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
             <TaskItem 
               key={String(task.id || task._id)} 
               task={task} 
               listId={safeListId} 
               // 🚀 TIẾP TỤC LUỒN HÀM XUỐNG CHO TASKITEM
               onOpenTaskDetail={onOpenTaskDetail} 
             />
          ))}
        </SortableContext>
      </div>

      {/* FOOTER */}
      <div className="shrink-0 p-2 pt-0">
        <button 
          onClick={() => setIsCreateModalOpen(true)} 
          className="group w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200/50 hover:text-indigo-600 rounded-xl transition-all"
        >
          <Plus size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> 
          <span>Thêm Task mới</span>
        </button>
      </div>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        columnId={safeListId} 
        columnName={list.list_name} 
      />
    </div>
  );
});

export default Column;