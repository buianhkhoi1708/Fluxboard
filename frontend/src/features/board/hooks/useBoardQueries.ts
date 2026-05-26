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
      
      // Sửa lại: Dùng response.data nếu có để tránh lỗi cấu trúc
      const coreData = response?.data || response;

      // 🚀 FIX: Dữ liệu an toàn hơn
      const formattedBoard = {
        ...coreData,
        board_name: coreData?.name || 'Bảng công việc',
        columns: Array.isArray(coreData?.column_order_ids) 
          ? coreData.column_order_ids.map((col: any) => ({
              ...col,
              // Check kỹ xem task_order_ids có tồn tại không
              tasks: col.task_order_ids || [] 
            }))
          : []
      };

      // Đồng bộ member (giữ nguyên)
      const projectId = coreData?.projectId || coreData?.project_id;
      if (projectId) {
        boardApi.getProjectMembers(projectId).then(res => {
            const members = (res as any)?.data?.data || (res as any)?.data || res || [];
            useUserStore.getState().saveUsersToCache(members, projectId);
        }).catch(err => console.error("❌ Lỗi đồng bộ:", err));
      }

      return formattedBoard as unknown as Board;
    },
    enabled: !!boardId,
  });
};

// 🚀 FIX MỌI NƠI: Đảm bảo tất cả dùng chung 1 KEY CHUẨN
export const useMoveTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 🚀 ĐÃ FIX: Truyền nguyên cục `data` (Object) thẳng vào boardApi
    mutationFn: (data: any) => boardApi.moveTask(data), 
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    }
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
    // Sếp chỉ cần nhận 1 tham số là taskData
    mutationFn: (taskData: Partial<Task>) => boardApi.createTask(taskData),
    onSuccess: (_, variables) => {
      // Dùng board_id trong biến gửi đi để invalidate cache
      const boardId = variables.board_id;
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(boardId as string) });
      }
    },
  });
};

// Trong useBoardQueries.ts
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Đảm bảo updateData là một object chứa các dữ liệu cập nhật
    mutationFn: ({ taskId, updateData, boardId }: { taskId: string; updateData: any; boardId: string }) => 
      boardApi.updateTask(taskId, updateData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};


export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 🚀 THÊM projectId VÀO ĐÂY ĐỂ ĐÓN NÓ
    mutationFn: ({ taskId, boardId, projectId }: { taskId: string; boardId: string; projectId: string }) => 
      boardApi.deleteTask({ taskId, projectId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

// --- COLUMN MUTATIONS ---

// --- COLUMN MUTATIONS ---

export const useCreateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ list_name, project_id, order, boardId }: { list_name: string, project_id: string, order: number, boardId: string }) => 
      // 🚀 Bơm project_id vào chung với payload
      boardApi.createColumn({ name: list_name, board_id: boardId, order, project_id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

export const useUpdateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 🚀 Mở cổng đón projectId từ UI
    mutationFn: ({ columnId, list_name, boardId, projectId }: { columnId: string, list_name: string, boardId: string, projectId: string }) => 
      // Gửi project_id xuống API
      boardApi.updateColumn(columnId, { name: list_name, project_id: projectId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
    },
  });
};

export const useDeleteColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 🚀 Mở cổng đón projectId từ UI
    mutationFn: ({ columnId, boardId, projectId }: { columnId: string, boardId: string, projectId: string }) => 
      // Gọi qua API với cú pháp object
      boardApi.deleteColumn({ columnId, projectId }),
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
      const res: any = await boardApi.addAttachmentToTask(taskId, payload);
      return res.data || res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) }); 
      // 🚀 THÊM DÒNG NÀY ĐỂ REFETCH FILE NGAY LẬP TỨC
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] }); 
    }
  });
};

export const useUpdateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, payload }: { boardId: string, payload: any }) => 
      boardApi.updateBoard(boardId, payload),
    onSuccess: (_, variables) => {
      // Refresh lại chi tiết bảng
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId) });
      // Refresh lại danh sách project/workspace nếu cần
      queryClient.invalidateQueries({ queryKey: ['workspaces'] }); 
    },
  });
};

export const useDeleteBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, projectId }: { boardId: string, projectId: string }) => 
      boardApi.deleteBoard(boardId),
    onSuccess: (_, variables) => {
      // Refresh lại danh sách board trong project đó
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.boardsByProject(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
};

export const useUploadFile = () => {
  return useMutation({
    mutationFn: (file: File) => boardApi.uploadFile(file),
    onSuccess: (data) => {
      // data ở đây sẽ là { url: 'https://s3...' } (theo backend sếp viết)
      console.log("Upload thành công! URL:", data?.url);
    },
    onError: (error) => {
      console.error("Lỗi upload file:", error);
    }
  });
};

// Trong useBoardQueries.ts
export const useGetTaskAttachments = (taskId: string, projectId: string) => {
  return useQuery({
    // 🚀 Đưa projectId vào key để React Query cache cho chuẩn
    queryKey: ['task-attachments', taskId, projectId],
    queryFn: () => boardApi.getTaskAttachments(taskId, projectId),
    // 🚀 BẢO VỆ: Chỉ gọi API khi đã có CẢ HAI cái ID này
    enabled: !!taskId && !!projectId && String(projectId) !== "undefined", 
  });
};

// Trong useBoardQueries.ts
export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, attachmentId, boardId, projectId }: { taskId: string; attachmentId: string; boardId: string; projectId: string }) => 
      boardApi.deleteAttachment({ taskId, attachmentId, projectId }),
    onSuccess: (_, variables) => {
      // 🚀 Xoá xong thì ép React Query tải lại danh sách file của Task này
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] }); 
    }
  });
};