import React, { useState, useEffect, useRef, useMemo } from 'react'; 
import Column from './Column';
import TaskItem from './TaskItem'; 
import { useUserStore } from '../../user/store/useUserStore'; 
import { useBoardStore } from '../stores/useBoardStore';

import { 
  DndContext, closestCenter, DragOverlay, useSensor, 
  useSensors, MouseSensor, TouchSensor, DragStartEvent, DragEndEvent 
} from '@dnd-kit/core';

import { arrayMove } from '@dnd-kit/sortable';
import { Save, Sparkles, Filter, Users, Plus, X } from 'lucide-react'; 
import { useRealtimeEvent } from '../../../hooks/useRealtimeEvent'
import { useParams, useSearchParams } from 'react-router-dom'; // 🚀 Đã import useSearchParams
import { useQueryClient } from '@tanstack/react-query';

import { useGetBoardDetail, useMoveTask, useCreateColumn, BOARD_QUERY_KEYS } from '../hooks/useBoardQueries';

import { Task, BoardColumn } from '../types/index';

// 🚀 IMPORT MODAL TASK DETAIL CỦA SẾP VÀO ĐÂY
import TaskDetailModal from './TaskDetailModal'; 

const BoardView = () => {
  const { id } = useParams();
  const currentBoardId = id || '69d22692ef24ae604f65ae89'; 

  // 🚀 1. LẮNG NGHE URL TỪ MY TASKS TRUYỀN SANG
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');

  const queryClient = useQueryClient();

  const { data: board, isLoading } = useGetBoardDetail(currentBoardId);
  const { mutateAsync: moveTaskApi } = useMoveTask();
  const { mutateAsync: createColumnApi } = useCreateColumn();
  
  const { userDictionary } = useUserStore();
  const { setActiveBoardId, activeBoardId } = useBoardStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const newColInputRef = useRef<HTMLInputElement>(null);

  // 🚀 2. STATE QUẢN LÝ BẬT/TẮT MODAL BẰNG ID
  const [selectedTaskDetailId, setSelectedTaskDetailId] = useState<string | null>(null);

  // 🚀 3. NẾU CÓ TASK_ID TRÊN URL -> BẬT MODAL & DỌN DẸP URL
  useEffect(() => {
    if (taskIdFromUrl && board) {
      setSelectedTaskDetailId(taskIdFromUrl);
      searchParams.delete('taskId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [taskIdFromUrl, board, searchParams, setSearchParams]);

  // 🚀 4. TRẠM TÌM KIẾM: TỰ ĐỘNG LÔI DATA TASK & COLUMN ID RA TỪ CÁI SELECTED ID
  const selectedTaskData = useMemo(() => {
    if (!selectedTaskDetailId || !board?.columns) return { task: null, listId: '' };

    for (const col of board.columns) {
      const foundTask = col.tasks?.find((t: Task) => String(t.id || t._id) === String(selectedTaskDetailId));
      if (foundTask) {
        return { task: foundTask, listId: String(col.id || col._id) };
      }
    }
    return { task: null, listId: '' };
  }, [selectedTaskDetailId, board]);

  useEffect(() => {
    if (currentBoardId) {
      setActiveBoardId(currentBoardId);
    }
  }, [currentBoardId, setActiveBoardId]);

  useEffect(() => {
    if (isAddingCol && newColInputRef.current) newColInputRef.current.focus();
  }, [isAddingCol]);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  useRealtimeEvent(`/topic/board/${currentBoardId}`, () => {
    queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(currentBoardId) });
  });

  const projectId = board?.projectId || board?.project_id;

  const activeMembersInBoard = React.useMemo(() => {
    if (!board || !board.columns) return [];
    
    const assignedUserIds = new Set<string>();
    
    board.columns.forEach((col: BoardColumn) => {
      if (!col.tasks) return;
      col.tasks.forEach((task: Task) => {
        const assignees = task.assignees_user_id || task.assigneesUserId || task.assignees || [];
        assignees.forEach((item: any) => {
          const userId = typeof item === 'object' ? (item.id || item._id) : item;
          if (userId) assignedUserIds.add(String(userId));
        });
      });
    });

    return Array.from(assignedUserIds).map(userId => {
      return userDictionary[userId] || { id: userId, full_name: 'Member', avatar_url: null }; 
    });
  }, [board, userDictionary]);

  const handleAddColumn = async () => {
    if (!newColName.trim() || !activeBoardId || !board) {
      setIsAddingCol(false);
      return;
    }

    try {
      await createColumnApi({
        list_name: newColName.trim(),
        project_id: String(board.projectId || board.project_id),
        order: board.columns ? board.columns.length + 1 : 1,
        boardId: activeBoardId
      });
      setNewColName("");
      setIsAddingCol(false);
    } catch (error) {
      console.error("Lỗi tạo cột mới:", error);
    }
  };

  if (isLoading || !board) return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 gap-4 text-center z-50">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 bg-indigo-400/20 rounded-full animate-ping"></div>
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl shadow-lg flex items-center justify-center animate-bounce z-10">
          <Sparkles className="text-white" size={20} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-base font-bold text-slate-700 tracking-tight">Đang đồng bộ không gian làm việc...</span>
        <span className="text-xs font-medium text-slate-400">Vui lòng chờ trong giây lát</span>
      </div>
    </div>
  );

  const handleDragStart = (e: DragStartEvent) => {
    if (e.active.data.current?.type === 'Task') {
      setActiveTask(e.active.data.current.task as Task);
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null); 
    const { active, over } = e;
    if (!over) return;

    const activeColId = active.data.current?.columnId || active.data.current?.listId;
    const overColId = over.data.current?.columnId || over.data.current?.listId || over.id;
    if (!activeColId || !overColId) return;

    const sourceColIndex = board.columns.findIndex((c: BoardColumn) => c.id === activeColId || c._id === activeColId);
    const destColIndex = board.columns.findIndex((c: BoardColumn) => c.id === overColId || c._id === overColId);
    if (sourceColIndex === -1 || destColIndex === -1) return;

    const newColumns = [...board.columns];
    let newOrder = 1; 

    if (activeColId === overColId) {
      const col = newColumns[sourceColIndex];
      const oldIndex = col.tasks.findIndex((t: Task) => t.id === active.id || t._id === active.id);
      const newIndex = col.tasks.findIndex((t: Task) => t.id === over.id || t._id === over.id);
      
      newColumns[sourceColIndex] = { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) };
      newOrder = newIndex + 1; 
    } else {
      const sourceCol = newColumns[sourceColIndex];
      const destCol = newColumns[destColIndex];
      const movedTask = sourceCol.tasks.find((t: Task) => t.id === active.id || t._id === active.id);
      const newSourceTasks = sourceCol.tasks.filter((t: Task) => t.id !== active.id && t._id !== active.id);
      const newDestTasks = [...(destCol.tasks || [])];
      
      if (over.data.current?.type === 'Task') {
        const newIndex = destCol.tasks.findIndex((t: Task) => t.id === over.id || t._id === over.id);
        if (movedTask) newDestTasks.splice(newIndex, 0, movedTask);
        newOrder = newIndex + 1;
      } else {
        if (movedTask) newDestTasks.push(movedTask);
        newOrder = newDestTasks.length;
      }
      newColumns[sourceColIndex] = { ...sourceCol, tasks: newSourceTasks };
      newColumns[destColIndex] = { ...destCol, tasks: newDestTasks };
    }

    const previousBoard = queryClient.getQueryData(BOARD_QUERY_KEYS.boardDetail(currentBoardId));
    queryClient.setQueryData(BOARD_QUERY_KEYS.boardDetail(currentBoardId), { ...board, columns: newColumns });

    try {
      await moveTaskApi({
        taskId: String(active.id), 
        columnId: overColId,
        order: newOrder,
        boardId: currentBoardId
      });
    } catch (error) {
      console.error("Lỗi khi di chuyển task:", error);
      queryClient.setQueryData(BOARD_QUERY_KEYS.boardDetail(currentBoardId), previousBoard);
    }
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="absolute inset-0 flex flex-col bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50 to-white overflow-hidden">

          {/* HEADER */}
          <div className="shrink-0 px-4 py-3 md:px-6 bg-white/70 backdrop-blur-xl border-b border-white shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 z-10">
            <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-md shrink-0">
                {board.board_name?.charAt(0) || 'F'}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-base md:text-xl font-black text-slate-800 tracking-tight truncate">
                  {board.board_name}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto w-full sm:w-auto justify-end">
              <div className="flex items-center -space-x-2 mr-1 md:mr-2 shrink-0">
                {activeMembersInBoard.length > 0 ? (
                  <>
                    {activeMembersInBoard.slice(0, 4).map((member: any, idx: number) => {
                      const displayName = member.full_name || 'Member';
                      const avatarUrl = member.avatar_url;
                      return (
                        <div key={member.id || idx} title={displayName} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white flex items-center justify-center overflow-hidden z-[10] shadow-sm transition-transform hover:scale-110 hover:z-50 cursor-pointer" style={{ zIndex: 10 - idx }}>
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover bg-white" />
                          ) : (
                            <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] md:text-xs font-bold">{displayName.charAt(0).toUpperCase()}</div>
                          )}
                        </div>
                      );
                    })}
                    {activeMembersInBoard.length > 4 && (
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] md:text-[10px] font-bold z-0 shadow-sm cursor-pointer hover:bg-slate-200" title={`Và ${activeMembersInBoard.length - 4} người khác`}>
                        +{activeMembersInBoard.length - 4}
                      </div>
                    )}
                  </>
                ) : (
                   <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-slate-50 text-slate-400 flex items-center justify-center shadow-sm cursor-default">
                     <Users size={14} />
                   </div>
                )}
              </div>

              <div className="h-5 md:h-6 w-px bg-slate-200 hidden sm:block shrink-0"></div>

              <button className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 md:px-3 rounded-lg text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                <Filter size={16} className="w-4 h-4" />
                <span className="hidden sm:inline">Lọc</span>
              </button>
              <button className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-1.5 md:px-4 rounded-lg text-xs md:text-sm font-bold transition-all active:scale-95 shadow-md shrink-0">
                <Save size={16} className="text-indigo-200 w-4 h-4" />
                <span className="hidden sm:inline">Lưu dự án</span>
              </button>
            </div>
          </div>

          {/* VÙNG CỘT KÉO THẢ */}
          <div className="flex-1 w-full p-4 md:p-6 overflow-x-auto overflow-y-hidden flex flex-nowrap gap-4 md:gap-6 items-start custom-scrollbar">
            {board.columns?.map((col: BoardColumn) => (
              <Column 
                key={col.id || col._id} 
                list={col} 
                // 🚀 Dòng này giúp bấm task bình thường trong Bảng cũng bật được modal:
                onOpenTaskDetail={(taskId: string) => setSelectedTaskDetailId(taskId)} 
              />
            ))}
            
            {/* UI THÊM CỘT MỚI */}
            <div className="w-[85vw] max-w-[280px] sm:w-[280px] shrink-0">
              {isAddingCol ? (
                <div className="bg-slate-100/90 backdrop-blur-md rounded-xl p-2.5 shadow-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                  <input
                    ref={newColInputRef}
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onBlur={handleAddColumn}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') { setIsAddingCol(false); setNewColName(''); }
                    }}
                    placeholder="Nhập tên danh sách..."
                    className="w-full text-sm font-bold text-slate-800 bg-white border-2 border-indigo-200 focus:border-indigo-400 rounded-lg px-3 py-2 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onMouseDown={(e) => { e.preventDefault(); handleAddColumn(); }} className="flex-1 bg-indigo-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-indigo-700 shadow-sm active:scale-95">Lưu</button>
                    <button onMouseDown={(e) => { e.preventDefault(); setIsAddingCol(false); setNewColName(''); }} className="px-3 text-slate-500 hover:bg-slate-200 rounded-lg text-xs font-bold"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingCol(true)} 
                  className="w-full flex items-center gap-2 px-4 py-3 bg-white/40 hover:bg-white/60 text-slate-600 hover:text-slate-800 font-bold text-sm rounded-xl border border-white/50 shadow-sm transition-all"
                >
                  <Plus size={18} /> Thêm danh sách khác
                </button>
              )}
            </div>
            <div className="w-4 md:w-8 shrink-0"></div>

          </div>

        </div>

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask ? <TaskItem task={activeTask} isOverlay listId="overlay" /> : null}
        </DragOverlay>
      </DndContext>

      {/* 🚀 RÁP COMPONENT TASK DETAIL VÀO CUỐI CÙNG NHƯ MỘT PORTAL */}
      {selectedTaskData.task && (
        <TaskDetailModal
          isOpen={!!selectedTaskDetailId}
          onClose={() => setSelectedTaskDetailId(null)}
          task={selectedTaskData.task}
          listId={selectedTaskData.listId}
        />
      )}
    </>
  );
};

export default BoardView;