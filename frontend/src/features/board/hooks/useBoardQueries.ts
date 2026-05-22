import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi, CreateBoardPayload } from '../api/boardApi';
import { useUserStore } from '../../user/store/useUserStore';

// 🚀 1. IMPORT TYPE TỪ FILE TYPES CHUNG
import { Board, Task } from '../types/index';

export const BOARD_QUERY_KEYS = {
  boardsByProject: (projectId: string) => ['boards', 'project', projectId] as const,
  boardDetail: (boardId: string) => ['board', boardId] as const,
  projectMembers: (projectId: string) => ['members', 'project', projectId] as const,
};

// ==========================================
// QUERIES (LẤY DỮ LIỆU)
// ==========================================

export const useGetBoardsByProject = (projectId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.boardsByProject(projectId),
    queryFn: () => boardApi.getBoardsByProject(projectId),
    enabled: !!projectId,
  });
};

export const useGetBoardDetail = (boardId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.boardDetail(boardId),
    queryFn: async () => {
      const response = await boardApi.getBoard(boardId);
      
      let coreData = response;
      while (coreData && coreData.data && !coreData.projectId && !coreData.project_id) {
        coreData = coreData.data;
      }

      // 🚀 BƠM DATA VÀO KHO TOÀN CỤC NGẦM
      const projectId = coreData?.projectId || coreData?.project_id;
      if (projectId) {
        boardApi.getProjectMembers(projectId)
          .then(res => {
            const members = (res as any)?.data?.content || (res as any)?.data || res || [];
            useUserStore.getState().saveUsersToCache(members, projectId);
          })
          .catch(err => console.error("❌ Lỗi đồng bộ danh bạ dự án:", err));
      }

      return coreData as Board; // 🚀 ÉP KIỂU TRẢ VỀ LÀ BOARD
    },
    enabled: !!boardId,
  });
};

export const useGetProjectMembers = (projectId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.projectMembers(projectId),
    queryFn: async () => {
      const res: any = await boardApi.getProjectMembers(projectId);
      return res.data?.data || res.data || res;
    },
    enabled: !!projectId,
  });
};

// ==========================================
// MUTATIONS (THÊM, SỬA, XÓA)
// ==========================================

export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBoardPayload) => boardApi.createBoard(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardsByProject(variables.projectId) });
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 🚀 2. ÉP KIỂU TASKDATA LÀ PARTIAL<TASK> (Chấp nhận thiếu vài trường)
    mutationFn: ({ taskData, boardId }: { taskData: Partial<Task>; boardId: string }) => boardApi.createTask(taskData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 🚀 3. TƯƠNG TỰ CHO UPDATEDATA
    mutationFn: ({ taskId, updateData, boardId }: { taskId: string; updateData: Partial<Task>; boardId: string }) => 
      boardApi.updateTask(taskId, updateData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

export const useMoveTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, columnId, order, boardId }: { taskId: string; columnId: string; order: number; boardId: string }) => 
      boardApi.moveTask(taskId, columnId, order, boardId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, boardId }: { taskId: string; boardId: string }) => boardApi.deleteTask(taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

// --- COLUMN MUTATIONS ---

export const useCreateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ list_name, project_id, order, boardId }: { list_name: string, project_id: string, order: number, boardId: string }) => 
      // 🚀 FIX TẠI ĐÂY: Dịch list_name thành name, dùng boardId truyền vào board_id
      boardApi.createColumn({ name: list_name, board_id: boardId, order }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

export const useUpdateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, list_name, boardId }: { columnId: string, list_name: string, boardId: string }) => 
      // 🚀 FIX TẠI ĐÂY: Dịch list_name thành name
      boardApi.updateColumn(columnId, { name: list_name }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

export const useDeleteColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, boardId }: { columnId: string, boardId: string }) => 
      boardApi.deleteColumn(columnId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

export const getPresignedUrl = async (fileName: string, contentType: string) => {
  // 🚀 Gọi qua boardApi cho chuẩn kiến trúc
  const res: any = await boardApi.getPresignedUrl(fileName, contentType);
  return res.data || res; // Lấy ra { uploadUrl, publicUrl }
};

// 2. Hook lưu link file vào Task
export const useAddAttachmentToTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, boardId, payload }: { taskId: string, boardId: string, payload: any }) => {
      // 🚀 Gọi qua boardApi
      const res: any = await boardApi.addAttachmentToTask(taskId, payload);
      return res.data || res;
    },
    onSuccess: (_, variables) => {
      // Làm mới UI ngay lập tức
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) }); 
    }
  });
};
