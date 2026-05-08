import React, { useState, memo } from 'react';
import { Trash2, Edit2, AlignLeft, Flag, CheckSquare, Square, Calendar, Clock } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../stores/useBoardStore';
// 🚀 1. IMPORT KHO TOÀN CỤC VÀO ĐÂY
import { useUserStore } from '../../user/store/useUserStore'; 
import DeleteConfirmModal from './DeleteConfirmModal'; 
import TaskDetailModal from './TaskDetailModal'; 

const priorityColors = { 
  Low: 'bg-blue-100 text-blue-700', 
  Medium: 'bg-yellow-100 text-yellow-700', 
  High: 'bg-orange-100 text-orange-700', 
  Critical: 'bg-red-100 text-red-700' 
};

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

const TaskItem = memo(({ task, listId, isOverlay }) => {
  // 🚀 2. XÓA getMemberById, CHỈ LẤY deleteTask và toggleSubtask
  const { deleteTask, toggleSubtask, board } = useBoardStore(); 
  
  // 🚀 3. LÔI HÀM getUser TỪ KHO TOÀN CỤC RA
  const getUser = useUserStore((state) => state.getUser);
  
  // Lấy ProjectID hiện tại để hàm getUser biết đường mà mò đúng Role
  const projectId = board?.projectId || board?.project_id;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); 
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id || task._id, 
    data: { type: 'Task', task, listId }
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <>
      <div 
        ref={isOverlay ? null : setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners} 
        onClick={() => setIsDetailModalOpen(true)}
        className={`group relative flex flex-col bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all ${isOverlay ? 'rotate-3 scale-105 shadow-2xl border-indigo-500 ring-4 ring-indigo-50/80 z-50' : ''}`}
      >
        <h4 className="text-sm font-semibold text-slate-800 break-words pr-14 leading-snug">{task.title}</h4>
        
        {task.description && (
          <div className="mt-2 flex items-start gap-1.5 text-slate-500">
            <AlignLeft size={12} className="shrink-0 mt-0.5 text-slate-400" />
            <p className="text-xs line-clamp-2 leading-relaxed">{task.description}</p>
          </div>
        )}

        {(task.due_date || task.estimated_days) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-medium text-slate-500">
            {task.due_date && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100 whitespace-nowrap">
                <Calendar size={10} className="text-slate-400" />
                <span>{formatDateForInput(task.due_date)}</span>
              </div>
            )}
            {task.estimated_days > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100 whitespace-nowrap">
                <Clock size={10} />
                <span>{task.estimated_days} days</span>
              </div>
            )}
          </div>
        )}

        {task.subtasks?.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-1 border-t border-slate-100 pt-2 cursor-default">
            {task.subtasks.map(st => (
              <div 
                key={st.id || st._id} 
                onClick={(e) => { e.stopPropagation(); toggleSubtask(listId, task.id || task._id, st.id || st._id); }} 
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
              >
                {st.status === 'DONE' ? <CheckSquare size={13} className="text-emerald-500 shrink-0" /> : <Square size={13} className="text-slate-300 shrink-0" />}
                <span className={`text-[11px] flex-1 truncate ${st.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-600 font-medium'}`} title={st.title}>
                  {st.title}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-2">
            {task.priority && <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${priorityColors[task.priority] || priorityColors.Medium}`}><Flag size={10} /> <span className="text-[10px] font-bold uppercase">{task.priority}</span></span>}
          </div>

          <div className="flex items-center gap-2">
            {(() => {
              const assigneeArray = task.assignees_user_id || task.assigneesUserId || task.assignees || [];

              if (assigneeArray.length > 0) {
                return (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {assigneeArray.map((item, idx) => {
                      const userId = typeof item === 'object' ? (item.id || item._id) : item;
                      
                      // 🚀 4. ĐIỂM ĂN TIỀN LÀ ĐÂY: Dùng getUser thay cho getMemberById
                      const member = getUser(userId, projectId); 
                      
                      const displayName = member?.full_name || 'Unnamed';
                      const avatarUrl = member?.avatar_url;
                      const initial = displayName.charAt(0).toUpperCase();

                      return (
                        <span
                          key={userId || idx}
                          title={displayName} 
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold transition-all hover:bg-indigo-100 shadow-sm"
                        >
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={displayName} 
                              className="w-4 h-4 rounded-full object-cover border border-indigo-200 shrink-0"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] text-white shrink-0">
                              {initial}
                            </div>
                          )}
                          <span className="truncate max-w-[80px]">
                            {displayName}
                          </span>
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
            onClick={(e) => { e.stopPropagation(); setIsDetailModalOpen(true); }} 
            className="p-2 md:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }} 
            className="p-2 md:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <DeleteConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => deleteTask(listId, task.id || task._id)} taskTitle={task.title} />
      
      <TaskDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} task={task} listId={listId} />
    </>
  );
});

export default TaskItem;