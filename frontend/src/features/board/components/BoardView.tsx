import React, { useState, useEffect, useRef, useMemo } from 'react';
import Column from './Column';
import TaskItem from './TaskItem';
import { useUserStore } from '../../user/store/useUserStore';
import { useBoardStore } from '../stores/useBoardStore';

import {
  DndContext,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragEndEvent,
} from '@dnd-kit/core';

import { arrayMove } from '@dnd-kit/sortable';
import { Sparkles, Filter, Users, Plus, X } from 'lucide-react';
import { useRealtimeEvent } from '../../../hooks/useRealtimeEvent';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import {
  useGetBoardDetail,
  useMoveTask,
  useCreateColumn,
  BOARD_QUERY_KEYS,
} from '../hooks/useBoardQueries';

import { Task, BoardColumn, TaskModalInitialFocus } from '../types/index';
import TaskDetailModal from './TaskDetailModal';

const BoardView = () => {
  const { id } = useParams();
  const currentBoardId = id || '69d22692ef24ae604f65ae89';

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
  const [newColName, setNewColName] = useState('');
  const newColInputRef = useRef<HTMLInputElement>(null);

  const [selectedTaskDetailId, setSelectedTaskDetailId] = useState<string | null>(null);
  const [taskModalInitialFocus, setTaskModalInitialFocus] = useState<TaskModalInitialFocus>('detail');

  const activeDragId = useRef<string | null>(null);

  const boardTitle = board?.name || board?.board_name || 'Bảng công việc';

  const openTaskDetail = (taskId: string, mode: TaskModalInitialFocus = 'detail') => {
    setTaskModalInitialFocus(mode);
    setSelectedTaskDetailId(taskId);
  };

  useEffect(() => {
    if (taskIdFromUrl && board) {
      openTaskDetail(taskIdFromUrl, 'detail');
      searchParams.delete('taskId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [taskIdFromUrl, board, searchParams, setSearchParams]);

  const selectedTaskData = useMemo(() => {
    if (!selectedTaskDetailId || !Array.isArray(board?.columns)) return { task: null, listId: '' };

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

  useRealtimeEvent(`/topic/board/${currentBoardId}`, (data) => {
    if (activeDragId.current) {
      console.log('🛑 Bỏ qua Socket do đang trong phiên kéo thả!');
      return;
    }

    console.log('🔄 WebSocket có cập nhật mới! Tải lại Board...', data);

    queryClient.invalidateQueries({
      queryKey: BOARD_QUERY_KEYS.boardDetail(currentBoardId),
      exact: true,
      refetchType: 'active',
    });
  });

  const activeMembersInBoard = React.useMemo(() => {
    if (!board || !Array.isArray(board.columns)) return [];

    const assignedUserIds = new Set<string>();

    board.columns.forEach((col: BoardColumn) => {
      if (!Array.isArray(col.tasks)) return;

      col.tasks.forEach((task: Task) => {
        const assignees = task.assignees_user_id || task.assigneesUserId || task.assignees || [];
        if (!Array.isArray(assignees)) return;

        assignees.forEach((item: any) => {
          const userId = typeof item === 'object' ? item.id || item._id : item;
          if (userId) assignedUserIds.add(String(userId));
        });
      });
    });

    return Array.from(assignedUserIds).map(userId => {
      return userDictionary?.[userId] || { id: userId, full_name: 'Member', avatar_url: null };
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
        order: Array.isArray(board.columns) ? board.columns.length + 1 : 1,
        boardId: activeBoardId,
      });

      setNewColName('');
      setIsAddingCol(false);
    } catch (error) {
      console.error('Lỗi tạo cột mới:', error);
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    activeDragId.current = null;
    setActiveTask(null);

    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeColId = String(active.data.current?.columnId || active.data.current?.listId);
    const overColId = String(over.data.current?.columnId || over.data.current?.listId || over.id);

    if (!activeColId || !overColId) return;

    let newOrder = 0;

    const boardKey = BOARD_QUERY_KEYS.boardDetail(currentBoardId);
    const previousBoard = queryClient.getQueryData(boardKey);

    queryClient.setQueryData(boardKey, (oldBoard: any) => {
      if (!oldBoard || !oldBoard.columns) return oldBoard;

      const newColumns = JSON.parse(JSON.stringify(oldBoard.columns));

      const sourceCol = newColumns.find((c: any) => String(c.id || c._id) === activeColId);
      const destCol = newColumns.find((c: any) => String(c.id || c._id) === overColId);

      if (!sourceCol || !destCol) return oldBoard;

      const activeIndex = sourceCol.tasks.findIndex((t: any) => String(t.id || t._id) === activeId);
      const overIndex = destCol.tasks.findIndex((t: any) => String(t.id || t._id) === overId);

      if (activeIndex === -1) return oldBoard;

      if (activeColId === overColId) {
        if (activeIndex !== overIndex) {
          sourceCol.tasks = arrayMove(sourceCol.tasks, activeIndex, overIndex);
          newOrder = overIndex;
        } else {
          return oldBoard;
        }
      } else {
        const [movedTask] = sourceCol.tasks.splice(activeIndex, 1);

        if (over.data.current?.type === 'Task') {
          const finalIndex = overIndex >= 0 ? overIndex : destCol.tasks.length;
          destCol.tasks.splice(finalIndex, 0, movedTask);
          newOrder = finalIndex;
        } else {
          destCol.tasks.push(movedTask);
          newOrder = destCol.tasks.length - 1;
        }
      }

      return { ...oldBoard, columns: newColumns };
    });

    try {
      const pId = board?.project_id || board?.projectId || board?.project?._id;

      if (!pId) {
        console.error('🚨 Không tìm thấy Project ID! Board data:', board);
        throw new Error('Missing Project ID');
      }

      await moveTaskApi({
        taskId: activeId,
        columnId: overColId,
        order: newOrder,
        boardId: currentBoardId,
        projectId: String(pId),
      });
    } catch (error) {
      console.error('❌ Lỗi API khi di chuyển task, hoàn tác UI:', error);
      queryClient.setQueryData(boardKey, previousBoard);
    }
  };

  if (isLoading || !board) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 gap-4 text-center z-50">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 bg-indigo-400/20 rounded-full animate-ping"></div>
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl shadow-lg flex items-center justify-center animate-bounce z-10">
            <Sparkles className="text-white" size={20} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-base font-bold text-slate-700 tracking-tight">Đang tải không gian làm việc...</span>
          <span className="text-xs font-medium text-slate-400">Vui lòng chờ trong giây lát</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => {
          activeDragId.current = String(e.active.id);
          setActiveTask(e.active.data.current?.task as Task);
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="absolute inset-0 flex flex-col bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50 to-white overflow-hidden">
          <div className="shrink-0 px-4 py-3 md:px-6 bg-white/70 backdrop-blur-xl border-b border-white shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 z-10">
            <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-md shrink-0">
                {boardTitle.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-base md:text-xl font-black text-slate-800 tracking-tight truncate">
                  {boardTitle}
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
                        <div
                          key={member.id || idx}
                          title={displayName}
                          className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white flex items-center justify-center overflow-hidden z-[10] shadow-sm transition-transform hover:scale-110 hover:z-50 cursor-pointer"
                          style={{ zIndex: 10 - idx }}
                        >
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover bg-white" />
                          ) : (
                            <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] md:text-xs font-bold">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {activeMembersInBoard.length > 4 && (
                      <div
                        className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] md:text-[10px] font-bold z-0 shadow-sm cursor-pointer hover:bg-slate-200"
                        title={`Và ${activeMembersInBoard.length - 4} người khác`}
                      >
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
            </div>
          </div>

          <div className="flex-1 w-full p-4 md:p-6 overflow-x-auto overflow-y-hidden flex flex-nowrap gap-4 md:gap-6 items-start custom-scrollbar">
            {(Array.isArray(board.columns) ? board.columns : []).map((col: BoardColumn) => (
              <Column
                key={col.id || col._id}
                list={col}
                onOpenTaskDetail={openTaskDetail}
              />
            ))}

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
                      if (e.key === 'Escape') {
                        setIsAddingCol(false);
                        setNewColName('');
                      }
                    }}
                    placeholder="Nhập tên danh sách..."
                    className="w-full text-sm font-bold text-slate-800 bg-white border-2 border-indigo-200 focus:border-indigo-400 rounded-lg px-3 py-2 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />

                  <div className="flex gap-2 mt-2">
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddColumn();
                      }}
                      className="flex-1 bg-indigo-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-indigo-700 shadow-sm active:scale-95"
                    >
                      Lưu
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsAddingCol(false);
                        setNewColName('');
                      }}
                      className="px-3 text-slate-500 hover:bg-slate-200 rounded-lg text-xs font-bold"
                    >
                      <X size={16} />
                    </button>
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

      {selectedTaskData.task && (
        <TaskDetailModal
          isOpen={!!selectedTaskDetailId}
          onClose={() => setSelectedTaskDetailId(null)}
          task={selectedTaskData.task}
          listId={selectedTaskData.listId}
          initialFocus={taskModalInitialFocus}
        />
      )}
    </>
  );
};

export default BoardView;