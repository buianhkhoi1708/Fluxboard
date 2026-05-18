import { create } from 'zustand';
import { boardApi } from '../api/boardApi';
import { useUserStore } from '../../user/store/useUserStore'; 

interface IBoardState {
  board: any | null; 
  isLoading: boolean; 
  
  fetchBoardData: (boardId: string) => Promise<void>;
  setBoard: (newBoard: any) => void; 
  
  addList: (listName: string) => void;
  deleteList: (columnId: string) => void;
  
  addTask: (columnId: string, taskData: any) => Promise<void>;
  deleteTask: (columnId: string, taskId: string) => void;
  updateTask: (columnId: string, taskId: string, updates: any) => void;
  updateTaskPositionApi: (taskId: string, newColumnId: string, newOrder: number) => Promise<void>;
  
  addSubtask: (columnId: string, parentTaskId: string, title: string) => Promise<void>; 
  toggleSubtask: (columnId: string, parentTaskId: string, subtaskId: string) => void;
  
  getColumnTotalPoints: (columnId: string) => number;
  getBoardTotalPoints: () => number;
}

export const useBoardStore = create<IBoardState>((set, get) => ({
  board: null, 
  isLoading: false,

  // ==========================================
  // 1. DATA FETCHING & SYNC
  // ==========================================
  
  fetchBoardData: async (boardId: string) => {
    set({ isLoading: true });
    try {
      const response = await boardApi.getBoard(boardId);
      
      let coreData = response;
      // Bóc tách lớp vỏ của Axios
      while (coreData && coreData.data && !coreData.project_id && !coreData.projectId) {
        coreData = coreData.data;
      }

      // 🚀 DATA ADAPTER: Tự động dịch tên biến từ Backend sang Frontend
      if (coreData) {
        // Ánh xạ tên Bảng
        coreData.board_name = coreData.name || "Bảng chưa đặt tên";
        
        // Ánh xạ danh sách Cột và Thẻ công việc
        coreData.columns = (coreData.column_order_ids || []).map((col: any) => ({
          ...col,
          list_name: col.name || "Danh sách",       // Backend dùng 'name', Frontend cần 'list_name'
          tasks: col.task_order_ids || []           // Backend dùng 'task_order_ids', Frontend cần 'tasks'
        }));
      }

      const projectId = coreData?.projectId || coreData?.project_id;

      if (projectId) {
        boardApi.getProjectMembers(projectId)
          .then(res => {
            const members = (res as any)?.data?.content || (res as any)?.data || res || [];
            useUserStore.getState().saveUsersToCache(members, projectId);
          })
          .catch(err => console.error("❌ Lỗi đồng bộ danh bạ dự án:", err));
      }

      set({ board: coreData, isLoading: false });
    } catch (error) {
      console.error("❌ Lỗi fetchBoardData:", error);
      set({ isLoading: false });
    }
  },

  setBoard: (newBoard) => set({ board: newBoard }),

  // ==========================================
  // 2. COLUMN (LIST) ACTIONS
  // ==========================================

  addList: (listName) => set((state) => {
    if (!state.board) return state;
    const newColumn = { 
      id: `col-${Date.now()}`, 
      list_name: listName, 
      order: (state.board.columns?.length || 0) + 1, 
      tasks: [] 
    };
    return { board: { ...state.board, columns: [...(state.board.columns || []), newColumn] } };
  }),

  deleteList: (columnId) => set((state) => {
    if (!state.board) return state;
    return { 
      board: { 
        ...state.board, 
        columns: state.board.columns.filter((c: any) => c.id !== columnId && c._id !== columnId) 
      } 
    };
  }),

  // ==========================================
  // 3. TASK ACTIONS
  // ==========================================

  addTask: async (columnId: string, taskData: any) => {
    try {
      const board = get().board;
      const taskRequest = {
        title: taskData.title.trim(),
        description: taskData.description || "",
        column_id: columnId,
        board_id: board?.id || board?._id, // Quan trọng: gửi kèm board_id
        priority: taskData.priority?.toUpperCase() || "MEDIUM", 
        status: "TODO",
        assignees_user_id: taskData.assignees_user_id || [], 
        story_point: Number(taskData.story_points) || 0,
        start_date: taskData.start_date ? new Date(taskData.start_date).toISOString() : null,
        due_date: taskData.due_date ? new Date(taskData.due_date).toISOString() : null,
        parent_task_id: null,
      };
      await boardApi.createTask(taskRequest);
      
      // Nếu Socket chậm, tự F5 lại dữ liệu luôn
      const currentBoardId = board?.id || board?._id;
      if (currentBoardId) get().fetchBoardData(currentBoardId); 

    } catch (error) {
      console.error("❌ Lỗi khi tạo task:", error);
    }
  },

  deleteTask: async (columnId, taskId) => {
    const { board, fetchBoardData } = get();
    if (!board) return;
    
    // Cập nhật mượt trên UI trước khi gọi API
    set((state: any) => ({
      board: {
        ...state.board,
        columns: state.board.columns.map((col: any) => 
          (col.id === columnId || col._id === columnId) 
          ? { ...col, tasks: col.tasks.filter((t: any) => t.id !== taskId && t._id !== taskId) } 
          : col
        )
      }
    }));
    
    try {
      await boardApi.deleteTask(taskId);
    } catch (error) {
      fetchBoardData(board.id || board._id); 
    }
  },

  updateTask: async (columnId, taskId, updates) => {
    const { board, fetchBoardData } = get();
    if (!board) return;
    
    const col = board.columns?.find((c: any) => c.id === columnId || c._id === columnId);
    const task = col?.tasks?.find((t: any) => t.id === taskId || t._id === taskId);
    if (!task) return;

    const backendUpdates = {
      title: (updates.title !== undefined ? updates.title : task.title).trim(),
      description: updates.description !== undefined ? updates.description : task.description,
      priority: (updates.priority !== undefined ? updates.priority : task.priority)?.toUpperCase() || "MEDIUM",
      story_point: Number(updates.story_points !== undefined ? updates.story_points : task.story_points) || 0,
      start_date: updates.start_date !== undefined ? (updates.start_date ? new Date(updates.start_date).toISOString() : null) : task.start_date,
      due_date: updates.due_date !== undefined ? (updates.due_date ? new Date(updates.due_date).toISOString() : null) : task.due_date,
      assignees_user_id: updates.assignees_user_id || task.assignees_user_id || [],
      column_id: columnId,
      status: task.status || "TODO",
      parent_task_id: task.parent_task_id || null
    };

    try {
      await boardApi.updateTask(taskId, backendUpdates);
    } catch (error) {
      fetchBoardData(board.id || board._id); 
    }
  },

  updateTaskPositionApi: async (taskId: string, newColumnId: string, newOrder: number) => {
    try {
      await boardApi.moveTask(taskId, newColumnId, newOrder);
    } catch (error) {
      const currentBoardId = get().board?.id || get().board?._id;
      if (currentBoardId) get().fetchBoardData(currentBoardId); 
    }
  },

  // ==========================================
  // 4. SUBTASK ACTIONS
  // ==========================================

  addSubtask: async (columnId: string, parentTaskId: string, title: string) => {
    try {
      await boardApi.addSubtask(parentTaskId, title.trim());
      
      const currentBoardId = get().board?.id || get().board?._id;
      if (currentBoardId) get().fetchBoardData(currentBoardId); 
    } catch (error) {
      console.error("❌ Lỗi khi tạo subtask:", error);
    }
  },

  toggleSubtask: async (columnId: string, parentTaskId: string, subtaskId: string) => {
    const { board, fetchBoardData } = get();
    if (!board) return;

    const col = board.columns?.find((c: any) => c.id === columnId || c._id === columnId);
    const parent = col?.tasks?.find((t: any) => t.id === parentTaskId || t._id === parentTaskId);
    const subtask = parent?.subtasks?.find((st: any) => st.id === subtaskId || st._id === subtaskId);
    if (!subtask) return;

    const currentIsDone = subtask.is_done === true || subtask.status === 'DONE';
    const newIsDone = !currentIsDone;

    try {
      await boardApi.updateSubtask(parentTaskId, subtaskId, {
        is_done: newIsDone
      });
      fetchBoardData(board.id || board._id);
    } catch (error) {
      console.error("❌ Lỗi update subtask:", error);
    }
  },

  // ==========================================
  // 5. GETTERS (TÍNH TOÁN)
  // ==========================================

  getColumnTotalPoints: (columnId) => {
    const board = get().board;
    if (!board) return 0;
    const col = board.columns?.find((c: any) => c.id === columnId || c._id === columnId);
    return col ? (col.tasks || []).reduce((sum: number, task: any) => sum + (task.story_points || task.story_point || 0), 0) : 0;
  },

  getBoardTotalPoints: () => {
    const board = get().board;
    return board ? (board.columns || []).reduce((sum: number, col: any) => sum + (col.tasks || []).reduce((s: number, t: any) => s + (t.story_points || t.story_point || 0), 0), 0) : 0;
  }
}));