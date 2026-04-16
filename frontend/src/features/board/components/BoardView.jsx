import React, { useState, useEffect } from 'react'; 
import Column from './Column';
import TaskItem from './TaskItem'; 
import { useBoardStore } from '../stores/useBoardStore'; 
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { X, Plus, Target, Save, Sparkles, Filter } from 'lucide-react'; 
import AiGeneratorPanel from './AiGeneratorPanel';
import { useRealtimeEvent } from '../../../hooks/useRealtimeEvent'
import { useParams } from 'react-router-dom';

const BoardView = () => {

  const { board, setBoard, getBoardTotalPoints, addList,fetchProjectMembers, fetchBoardData, updateTaskPositionApi } = useBoardStore();
  
  const [activeTask, setActiveTask] = useState(null);
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 }, // PC: Kéo 5px là ăn ngay
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { 
      delay: 250, // Mobile: Bắt buộc nhấn giữ 0.25s mới bắt đầu kéo (để phân biệt với cuộn trang)
      tolerance: 5, // Cho phép ngón tay rung lắc nhẹ 5px trong lúc nhấn giữ
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);
  const { id } = useParams();

  const currentBoardId = id || '69d22692ef24ae604f65ae89'; 

  useRealtimeEvent(`/topic/board/${currentBoardId}`, () => {
    console.log("🔔 [Real-time Module] Board changed, fetching new data...");
    fetchBoardData(currentBoardId);
  });

  useEffect(() => {
    if (currentBoardId) {
      fetchBoardData(currentBoardId); 
    }
  }, [currentBoardId, fetchBoardData]); // 🚀 Đã khai báo đủ bộ

  // ==========================================
  // NHỊP 2: CÓ BOARD RỒI -> LẤY PROJECT_ID -> TẢI DANH BẠ
  // ==========================================
  useEffect(() => {
    const projectId = board?.projectId || board?.project_id;

    if (projectId) {
      fetchProjectMembers(projectId);
    }
  }, [board?.projectId, board?.project_id, fetchProjectMembers]);

  if (!board) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 gap-4 min-h-full p-4 text-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 bg-indigo-400/20 rounded-full animate-ping"></div>
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl shadow-lg flex items-center justify-center animate-bounce">
          <Sparkles className="text-white" size={20} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-base font-bold text-slate-700 tracking-tight">Đang đồng bộ không gian làm việc...</span>
        <span className="text-xs font-medium text-slate-400">Vui lòng chờ trong giây lát</span>
      </div>
    </div>
  );

  const handleDragStart = (e) => {
    if (e.active.data.current?.type === 'Task') setActiveTask(e.active.data.current.task);
  };

  const handleDragEnd = (e) => {
    setActiveTask(null); 
    const { active, over } = e;
    if (!over) return;

    const activeColId = active.data.current?.columnId || active.data.current?.listId;
    const overColId = over.data.current?.columnId || over.data.current?.listId || over.id;
    if (!activeColId || !overColId) return;

    const sourceColIndex = board.columns.findIndex(c => c.id === activeColId || c._id === activeColId);
    const destColIndex = board.columns.findIndex(c => c.id === overColId || c._id === overColId);
    
    if (sourceColIndex === -1 || destColIndex === -1) return;

    const newColumns = [...board.columns];
    let newOrder = 1; 

    if (activeColId === overColId) {
      const col = newColumns[sourceColIndex];
      const oldIndex = col.tasks.findIndex(t => t.id === active.id || t._id === active.id);
      const newIndex = col.tasks.findIndex(t => t.id === over.id || t._id === over.id);
      
      newColumns[sourceColIndex] = { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) };
      newOrder = newIndex + 1; 
      
    } else {
      const sourceCol = newColumns[sourceColIndex];
      const destCol = newColumns[destColIndex];
      
      const movedTask = sourceCol.tasks.find(t => t.id === active.id || t._id === active.id);
      const newSourceTasks = sourceCol.tasks.filter(t => t.id !== active.id && t._id !== active.id);
      const newDestTasks = [...(destCol.tasks || [])];
      
      if (over.data.current?.type === 'Task') {
        const newIndex = destCol.tasks.findIndex(t => t.id === over.id || t._id === over.id);
        newDestTasks.splice(newIndex, 0, movedTask);
        newOrder = newIndex + 1;
      } else {
        newDestTasks.push(movedTask);
        newOrder = newDestTasks.length;
      }
      
      newColumns[sourceColIndex] = { ...sourceCol, tasks: newSourceTasks };
      newColumns[destColIndex] = { ...destCol, tasks: newDestTasks };
    }

    setBoard({ ...board, columns: newColumns });
    updateTaskPositionApi(active.id, overColId, newOrder);
  };

  const handleAddListClick = () => {
    if (newColTitle.trim()) {
      addList(newColTitle.trim());
      setNewColTitle(''); 
      setIsAddingCol(false);
    }
  };

  const handleSaveBoard = () => {
    console.log("Dữ liệu chuẩn bị gọi API Save:", board);
    alert("Tính năng lưu DB đang phát triển!");
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      
      <div className="flex flex-col h-full bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50 to-white relative overflow-hidden">

        <AiGeneratorPanel />

        <div className="px-4 py-3 md:px-6 md:py-4 bg-white/70 backdrop-blur-xl border-b border-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4 shrink-0 z-10 sticky top-0">
          
          <div className="flex items-center gap-3 w-full lg:w-auto overflow-hidden">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-md shrink-0">
              {board.board_name?.charAt(0) || 'F'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-black !text-black tracking-tight truncate">
                {board.board_name}
              </h2>
              {board.description && (
                <p className="text-[11px] md:text-xs text-slate-500 mt-0.5 truncate font-medium w-full">
                  {board.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0 shrink-0">
            
            <div className="hidden sm:flex -space-x-2 mr-1 shrink-0">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] md:text-xs font-bold z-30" title="Khôi">K</div>
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] md:text-xs font-bold z-20" title="Mạnh">M</div>
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] md:text-xs font-bold z-10" title="Quang">Q</div>
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] md:text-[10px] font-bold z-0">+2</div>
            </div>

            <div className="h-5 md:h-6 w-px bg-slate-200 hidden sm:block shrink-0"></div>

            <button className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 rounded-lg text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors shrink-0 whitespace-nowrap">
              <Filter size={14} className="md:w-4 md:h-4" />
              <span>Lọc</span>
            </button>

            {getBoardTotalPoints && (
              <div className="flex items-center gap-1.5 bg-white border border-indigo-100 px-2.5 py-1.5 md:px-3 rounded-lg text-xs md:text-sm font-bold text-indigo-600 shadow-sm shrink-0 cursor-default whitespace-nowrap">
                <Target size={14} className="text-indigo-500 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Tổng: </span>
                <span>{getBoardTotalPoints()} pt</span>
              </div>
            )}
            
            <button 
              onClick={handleSaveBoard}
              className="flex items-center gap-1.5 md:gap-2 bg-slate-900 hover:bg-black text-white px-3 py-1.5 md:px-4 rounded-lg text-xs md:text-sm font-bold transition-all active:scale-95 shadow-md shrink-0 whitespace-nowrap"
            >
              <Save size={14} className="text-indigo-200 md:w-4 md:h-4" />
              <span>Lưu dự án</span>
            </button>
          </div>
        </div>

        <div className="flex-1 w-full p-4 md:p-6 pb-8 overflow-x-auto overflow-y-hidden flex flex-nowrap gap-4 md:gap-6 items-start custom-scrollbar">
          
          {board.columns?.map((col) => <Column key={col.id || col._id} list={col} />)}
          
          {isAddingCol ? (
            <div className="w-[85vw] max-w-[300px] sm:w-[300px] shrink-0 bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl shadow-xl border border-white flex flex-col gap-3 ring-2 ring-indigo-100/50 transition-all animate-in fade-in zoom-in-95 duration-200">
              <input 
                autoFocus 
                value={newColTitle} 
                onChange={e => setNewColTitle(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAddListClick()} 
                placeholder="Nhập tên cột mới..." 
                className="text-sm font-bold border-none bg-slate-100/50 rounded-xl px-4 py-3 outline-none w-full focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all placeholder:text-slate-400 placeholder:font-medium" 
              />
              <div className="flex gap-2 items-center">
                <button 
                  onClick={handleAddListClick} 
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] transition-all active:scale-95"
                >
                  Thêm cột
                </button>
                <button 
                  onClick={() => { setIsAddingCol(false); setNewColTitle(''); }} 
                  className="p-2.5 text-slate-400 bg-slate-100 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAddingCol(true)} 
              className="group w-[85vw] max-w-[300px] sm:w-[300px] shrink-0 flex items-center justify-center gap-2 px-4 py-4 bg-slate-200/30 hover:bg-white/60 rounded-2xl text-slate-500 font-bold transition-all duration-300 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg backdrop-blur-sm"
            >
              <Plus size={20} className="transition-transform duration-300 group-hover:rotate-90" /> 
              <span>Thêm danh sách mới</span>
            </button>
          )}

          <div className="w-4 md:w-8 shrink-0"></div>
        </div>
      </div>

      <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
        {activeTask ? <TaskItem task={activeTask} isOverlay listId="overlay" /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default BoardView;