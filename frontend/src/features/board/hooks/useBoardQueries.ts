import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi, CreateBoardPayload } from '../api/boardApi';
import { useUserStore } from '../../user/store/useUserStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { Board, Task } from '../types/index';

export const BOARD_QUERY_KEYS = {
  boardsByProject: (projectId: string) => ['boards', 'project', projectId] as const,
  boardDetail: (boardId: string) => ['board', boardId] as const,
  projectMembers: (projectId: string) => ['members', 'project', projectId] as const,
  taskComments: (taskId: string, projectId: string) => ['task-comments', taskId, projectId] as const,
};

const normalizeRoleName = (value?: string | null) => {
  if (!value) return '';

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
};

const getUserId = (user: any) => {
  return String(user?.user_id || user?.id || user?._id || '');
};

const getRoleName = (user: any) => {
  const directRole =
    user?.role_name ||
    user?.roleName ||
    user?.system_role ||
    user?.systemRole ||
    user?.role ||
    user?.role_code ||
    user?.roleCode;

  if (directRole) return normalizeRoleName(directRole);

  if (user?.role_id && typeof user.role_id === 'object') {
    return normalizeRoleName(user.role_id.name || user.role_id.code);
  }

  if (Array.isArray(user?.system_role_ids)) {
    const roleName = user.system_role_ids.find((item: any) => normalizeRoleName(item) === 'SYSTEM_ADMIN');
    if (roleName) return 'SYSTEM_ADMIN';
  }

  return '';
};

const isSystemAdminUser = (user: any) => {
  return getRoleName(user) === 'SYSTEM_ADMIN';
};

const isCurrentUserSystemAdmin = () => {
  return getRoleName(useAuthStore.getState().user) === 'SYSTEM_ADMIN';
};

const shouldExposeUserInAssignableList = (candidate: any) => {
  if (!candidate) return false;
  if (!isSystemAdminUser(candidate)) return true;

  const currentUser = useAuthStore.getState().user;
  return isCurrentUserSystemAdmin() && getUserId(currentUser) === getUserId(candidate);
};

const extractList = (res: any) => {
  const payload =
    res?.data?.data?.content ??
    res?.data?.content ??
    res?.data?.data ??
    res?.data ??
    res?.content ??
    res;

  return Array.isArray(payload) ? payload : [];
};

const filterAssignableUsers = (users: any[]) => {
  return users.filter(shouldExposeUserInAssignableList);
};

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
      const coreData = response?.data || response;

      const formattedBoard = {
        ...coreData,
        board_name: coreData?.name || 'Bảng công việc',
        columns: Array.isArray(coreData?.column_order_ids)
          ? coreData.column_order_ids.map((col: any) => ({
              ...col,
              tasks: col.task_order_ids || [],
            }))
          : [],
      };

      const projectId = coreData?.projectId || coreData?.project_id;

      if (projectId) {
        boardApi
          .getProjectMembers(projectId)
          .then((res) => {
            const members = filterAssignableUsers(extractList(res));
            useUserStore.getState().saveUsersToCache(members, projectId);
          })
          .catch((err) => console.error('❌ Lỗi đồng bộ members:', err));
      }

      return formattedBoard as unknown as Board;
    },
    enabled: !!boardId,
  });
};

export const useGetProjectMembers = (projectId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.projectMembers(projectId),
    queryFn: async () => {
      const res: any = await boardApi.getProjectMembers(projectId);
      return filterAssignableUsers(extractList(res));
    },
    enabled: !!projectId,
  });
};

export const useMoveTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => boardApi.moveTask(data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBoardPayload) => boardApi.createBoard(payload),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardsByProject(variables.projectId),
      });
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: Partial<Task>) => boardApi.createTask(taskData),

    onSuccess: (_, variables) => {
      const boardId = (variables as any).board_id;

      if (boardId) {
        queryClient.invalidateQueries({
          queryKey: BOARD_QUERY_KEYS.boardDetail(boardId as string),
        });
      }
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      updateData,
    }: {
      taskId: string;
      updateData: any;
      boardId: string;
    }) => boardApi.updateTask(taskId, updateData),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      projectId,
    }: {
      taskId: string;
      boardId: string;
      projectId: string;
    }) => boardApi.deleteTask({ taskId, projectId }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useGetTaskComments = (taskId: string, projectId: string) => {
  return useQuery({
    queryKey: BOARD_QUERY_KEYS.taskComments(taskId, projectId),
    queryFn: async () => {
      const res: any = await boardApi.getTaskComments(taskId, projectId);
      return extractList(res);
    },
    enabled: !!taskId && !!projectId && String(projectId) !== 'undefined',
  });
};

export const useAddTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      projectId,
      content,
    }: {
      taskId: string;
      boardId: string;
      projectId: string;
      content: string;
    }) =>
      boardApi.addTaskComment(taskId, {
        content,
        project_id: projectId,
      }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.taskComments(variables.taskId, variables.projectId),
      });

      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useUpdateTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      projectId,
      content,
    }: {
      taskId: string;
      commentId: string;
      boardId: string;
      projectId: string;
      content: string;
    }) =>
      boardApi.updateTaskComment(taskId, commentId, {
        content,
        project_id: projectId,
      }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.taskComments(variables.taskId, variables.projectId),
      });

      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useResolveTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      projectId,
      is_resolved,
    }: {
      taskId: string;
      commentId: string;
      boardId: string;
      projectId: string;
      is_resolved: boolean;
    }) =>
      boardApi.resolveTaskComment(taskId, commentId, {
        project_id: projectId,
        is_resolved,
      }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.taskComments(variables.taskId, variables.projectId),
      });

      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useDeleteTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      projectId,
    }: {
      taskId: string;
      commentId: string;
      boardId: string;
      projectId: string;
    }) => boardApi.deleteTaskComment({ taskId, commentId, projectId }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.taskComments(variables.taskId, variables.projectId),
      });

      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useCreateColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      list_name,
      project_id,
      order,
      boardId,
    }: {
      list_name: string;
      project_id: string;
      order: number;
      boardId: string;
    }) =>
      boardApi.createColumn({
        name: list_name,
        board_id: boardId,
        order,
        project_id,
      }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useUpdateColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      columnId,
      list_name,
      projectId,
    }: {
      columnId: string;
      list_name: string;
      boardId: string;
      projectId: string;
    }) =>
      boardApi.updateColumn(columnId, {
        name: list_name,
        project_id: projectId,
      }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const useDeleteColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      columnId,
      projectId,
    }: {
      columnId: string;
      boardId: string;
      projectId: string;
    }) => boardApi.deleteColumn({ columnId, projectId }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};

export const getPresignedUrl = async (
  fileName: string,
  contentType: string,
) => {
  const res: any = await boardApi.getPresignedUrl(fileName, contentType);
  return res.data || res;
};

export const useAddAttachmentToTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      payload,
    }: {
      taskId: string;
      boardId: string;
      payload: any;
    }) => {
      const res: any = await boardApi.addAttachmentToTask(taskId, payload);
      return res.data || res;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });

      queryClient.invalidateQueries({
        queryKey: ['task-attachments', variables.taskId],
      });
    },
  });
};

export const useUpdateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      payload,
    }: {
      boardId: string;
      payload: any;
    }) => boardApi.updateBoard(boardId, payload),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });

      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
    },
  });
};

export const useDeleteBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      projectId,
    }: {
      boardId: string;
      projectId: string;
    }) => boardApi.deleteBoard({ boardId, projectId }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardsByProject(variables.projectId),
      });

      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
    },
  });
};

export const useUploadFile = () => {
  return useMutation({
    mutationFn: (file: File) => boardApi.uploadFile(file),

    onSuccess: (data) => {
      console.log('Upload thành công! URL:', data?.url);
    },

    onError: (error) => {
      console.error('Lỗi upload file:', error);
    },
  });
};

export const useGetTaskAttachments = (taskId: string, projectId: string) => {
  return useQuery({
    queryKey: ['task-attachments', taskId, projectId],

    queryFn: () => boardApi.getTaskAttachments(taskId, projectId),

    enabled:
      !!taskId &&
      !!projectId &&
      String(projectId) !== 'undefined',
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      attachmentId,
      projectId,
    }: {
      taskId: string;
      attachmentId: string;
      boardId: string;
      projectId: string;
    }) => boardApi.deleteAttachment({ taskId, attachmentId, projectId }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['task-attachments', variables.taskId, variables.projectId],
      });

      queryClient.invalidateQueries({
        queryKey: BOARD_QUERY_KEYS.boardDetail(variables.boardId),
      });
    },
  });
};