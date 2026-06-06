import axiosClient from "../../../lib/axiosClient";

export interface CreateBoardPayload {
  name: string;
  projectId?: string;
  project_id?: string;
  status: string;
  create_default_cols?: boolean;
}

const normalizeRoleName = (value?: string | null) => {
  if (!value) return "";
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getCurrentUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const getUserId = (user: any) => {
  return String(user?.user_id || user?.id || user?._id || "");
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

  if (user?.role_id && typeof user.role_id === "object") {
    return normalizeRoleName(user.role_id.name || user.role_id.code);
  }

  if (Array.isArray(user?.system_role_ids)) {
    const roleName = user.system_role_ids.find(
      (item: any) => normalizeRoleName(item) === "SYSTEM_ADMIN",
    );
    if (roleName) return "SYSTEM_ADMIN";
  }

  return "";
};

const getUserVisibilityParams = () => {
  const currentUser = getCurrentUser();
  const isCurrentSystemAdmin = getRoleName(currentUser) === "SYSTEM_ADMIN";

  return {
    exclude_system_admin: true,
    include_current_system_admin: isCurrentSystemAdmin,
    current_user_id: getUserId(currentUser) || undefined,
  };
};

export const boardApi = {
  createBoard: async (payload: CreateBoardPayload): Promise<any> => {
    const finalPayload = {
      name: payload.name,
      project_id: payload.projectId || payload.project_id,
      status: payload.status || "ACTIVE",
      create_default_cols: payload.create_default_cols,
    };

    const response: any = await axiosClient.post("/boards", finalPayload);
    return response.data || response;
  },

  getBoardsByProject: async (projectId: string): Promise<any> => {
    const response: any = await axiosClient.get(
      `/boards/projects/${projectId}`,
    );
    return response.data || response;
  },

  getBoard: async (boardId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/${boardId}`);
    return response.data || response;
  },

  updateBoard: async (boardId: string, payload: any): Promise<any> => {
    const response: any = await axiosClient.put(`/boards/${boardId}`, payload);
    return response.data || response;
  },

  deleteBoard: async ({
    boardId,
    projectId,
  }: {
    boardId: string;
    projectId: string;
  }): Promise<any> => {
    const response: any = await axiosClient.delete(`/boards/${boardId}`, {
      params: { project_id: projectId },
    });

    return response.data || response;
  },

  createColumn: async (payload: {
    name: string;
    board_id: string;
    order?: number;
    project_id: string;
  }) => {
    const finalPayload = {
      name: payload.name,
      board_id: payload.board_id,
      project_id: payload.project_id,
    };

    const response: any = await axiosClient.post("/columns", finalPayload);
    return response.data || response;
  },

  updateColumn: async (
    columnId: string,
    payload: {
      name: string;
      project_id: string;
    },
  ) => {
    const response: any = await axiosClient.put(
      `/columns/${columnId}`,
      payload,
    );
    return response.data || response;
  },

  deleteColumn: async ({
    columnId,
    projectId,
  }: {
    columnId: string;
    projectId: string;
  }) => {
    const response: any = await axiosClient.delete(`/columns/${columnId}`, {
      params: { project_id: projectId },
    });

    return response.data || response;
  },

  createTask: async (taskData: any) => {
    const response: any = await axiosClient.post("/tasks", taskData);
    return response.data || response;
  },

  updateTask: async (taskId: string, updateData: any) => {
    const response: any = await axiosClient.put(`/tasks/${taskId}`, updateData);
    return response.data || response;
  },

  deleteTask: async ({
    taskId,
    projectId,
  }: {
    taskId: string;
    projectId: string;
  }) => {
    const response: any = await axiosClient.delete(`/tasks/${taskId}`, {
      params: { project_id: projectId },
    });

    return response.data || response;
  },

  moveTask: async ({
    taskId,
    columnId,
    order,
    boardId,
    projectId,
  }: {
    taskId: string;
    columnId: string;
    order: number;
    boardId: string;
    projectId: string;
  }) => {
    const response: any = await axiosClient.put(`/tasks/${taskId}/move`, {
      destColumnId: columnId,
      newOrder: order,
      board_id: boardId,
      project_id: projectId,
    });

    return response.data || response;
  },

  getTaskComments: async (taskId: string, projectId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/tasks/${taskId}/comments`, {
      params: { project_id: projectId },
    });

    return response.data || response;
  },

  addTaskComment: async (
    taskId: string,
    payload: {
      content: string;
      project_id: string;
    },
  ): Promise<any> => {
    const response: any = await axiosClient.post(
      `/tasks/${taskId}/comments`,
      payload,
    );
    return response.data || response;
  },

  updateTaskComment: async (
    taskId: string,
    commentId: string,
    payload: {
      content: string;
      project_id: string;
    },
  ): Promise<any> => {
    const response: any = await axiosClient.put(
      `/tasks/${taskId}/comments/${commentId}`,
      payload,
    );
    return response.data || response;
  },

  resolveTaskComment: async (
    taskId: string,
    commentId: string,
    payload: {
      project_id: string;
      is_resolved: boolean;
    },
  ): Promise<any> => {
    const response: any = await axiosClient.patch(
      `/tasks/${taskId}/comments/${commentId}/resolve`,
      payload,
    );
    return response.data || response;
  },

  deleteTaskComment: async ({
    taskId,
    commentId,
    projectId,
  }: {
    taskId: string;
    commentId: string;
    projectId: string;
  }): Promise<any> => {
    const response: any = await axiosClient.delete(
      `/tasks/${taskId}/comments/${commentId}`,
      {
        params: { project_id: projectId },
      },
    );

    return response.data || response;
  },

  addProjectMember: async (
    projectId: string,
    userId: string,
    roleIds: string[] = ["MEMBER"],
  ) => {
    const payload = {
      user_id: userId,
      role_ids: roleIds,
    };

    const response: any = await axiosClient.post(
      `/projects/${projectId}/members`,
      payload,
    );
    return response.data || response;
  },

  getProjectMembers: (projectId: string) => {
    return axiosClient.get(`/projects/${projectId}/members`, {
      params: getUserVisibilityParams(),
    });
  },

  getPresignedUrl: async (
    fileName: string,
    contentType: string,
  ): Promise<any> => {
    const response: any = await axiosClient.get("/media/presigned-url", {
      params: { fileName, contentType },
    });

    return response.data || response;
  },

  addAttachmentToTask: async (taskId: string, payload: any): Promise<any> => {
    const response: any = await axiosClient.post(
      `/tasks/${taskId}/attachments`,
      payload,
    );
    return response.data || response;
  },

  getTaskAttachments: async (
    taskId: string,
    projectId: string,
  ): Promise<any> => {
    const response: any = await axiosClient.get(
      `/tasks/${taskId}/attachments`,
      {
        params: { project_id: projectId },
      },
    );

    return response.data || response;
  },

  uploadFile: async (file: File): Promise<any> => {
    const formData = new FormData();

    formData.append("file", file);

    const response: any = await axiosClient.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data?.data || response.data;
  },

  deleteAttachment: async ({
    taskId,
    attachmentId,
    projectId,
  }: {
    taskId: string;
    attachmentId: string;
    projectId: string;
  }) => {
    const response: any = await axiosClient.delete(
      `/tasks/${taskId}/attachments/${attachmentId}`,
      {
        params: { project_id: projectId },
      },
    );

    return response.data || response;
  },
};
