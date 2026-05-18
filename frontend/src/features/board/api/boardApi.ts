import axiosClient from '../../../lib/axiosClient';

export interface CreateBoardPayload {
  name: string;
  project_id: string; // 🚀 Khớp backend
  status?: string;
}

export const boardApi = {
  
  // ==========================================
  // 1. QUẢN LÝ BẢNG (BOARD)
  // ==========================================
  createBoard: async (payload: CreateBoardPayload): Promise<any> => {
    const response: any = await axiosClient.post('/boards', payload);
    return response.data || response;
  },

  getBoardsByProject: async (projectId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/projects/${projectId}`);
    return response.data || response;
  },

  getBoard: async (boardId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/${boardId}?t=${Date.now()}`);
    return response.data || response; 
  },

  createColumn: async (boardId: string, name: string): Promise<any> => {
    const response: any = await axiosClient.post('/boards/columns', { board_id: boardId, name });
    return response.data || response;
  },

  // ==========================================
  // 2. QUẢN LÝ THẺ (TASK CORE)
  // ==========================================
  moveTask: async (taskId: string, destColumnId: string, newOrder: number) => {
    return await axiosClient.put(`/tasks/${taskId}/move`, {
      destColumnId: destColumnId, 
      newOrder: newOrder
    });
  },

  createTask: async (taskData: any) => {
    const response: any = await axiosClient.post('/tasks', taskData);
    return response.data || response;
  },

  updateTask: async (taskId: string, updateData: any) => {
    const response: any = await axiosClient.put(`/tasks/${taskId}`, updateData);
    return response.data || response;
  },

  deleteTask: async (taskId: string) => {
    const response: any = await axiosClient.delete(`/tasks/${taskId}`);
    return response.data || response;
  },

  // ==========================================
  // 3. QUẢN LÝ CHECKLIST (SUBTASKS) - 🚀 ĐÃ KHÔI PHỤC
  // ==========================================
  addSubtask: async (taskId: string, title: string) => {
    const response: any = await axiosClient.post(`/tasks/${taskId}/subtasks`, { title });
    return response.data || response;
  },

  updateSubtask: async (taskId: string, subtaskId: string, updateData: any) => {
    const response: any = await axiosClient.put(`/tasks/${taskId}/subtasks/${subtaskId}`, updateData);
    return response.data || response;
  },

  deleteSubtask: async (taskId: string, subtaskId: string) => {
    const response: any = await axiosClient.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
    return response.data || response;
  },

  // ==========================================
  // 4. QUẢN LÝ BÌNH LUẬN (COMMENTS) - 🚀 ĐÃ KHÔI PHỤC
  // ==========================================
  addComment: async (taskId: string, content: string) => {
    const response: any = await axiosClient.post(`/tasks/${taskId}/comments`, { content });
    return response.data || response;
  },
  
  // ==========================================
  // 5. QUẢN LÝ THÀNH VIÊN DỰ ÁN
  // ==========================================
  addProjectMember: async (projectId: string, userId: string, roleIds: string[] = ["MEMBER"]) => {
    const payload = { user_id: userId, role_ids: roleIds };
    const response: any = await axiosClient.post(`/projects/${projectId}/members`, payload);
    return response.data || response;
  },

  getProjectMembers: (projectId: string) => {
    return axiosClient.get(`/projects/${projectId}/members`);
  },
};