import axiosClient from '../../../lib/axiosClient';

export interface CreateBoardPayload {
  name: string;
  projectId: string;
  status: string;
}

export const boardApi = {
  // --- BOARD ---
  createBoard: async (payload: CreateBoardPayload): Promise<any> => {
    const response: any = await axiosClient.post('/boards', payload);
    return response.data || response;
  },

  getBoardsByProject: async (projectId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/projects/${projectId}`);
    return response.data || response;
  },

  getBoard: async (boardId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/${boardId}`);
    return response.data || response; 
  },

  // --- COLUMN ---
  // 🚀 ĐÃ TỐI ƯU: Chỉ lọc lấy name và board_id gửi đi, loại bỏ hoàn toàn trường 'order' để không bị gãy lỗi 400
  createColumn: async (payload: { name: string; board_id: string; order?: number }) => {
    const finalPayload = {
      name: payload.name,
      board_id: payload.board_id
    };
    const response: any = await axiosClient.post('/board-columns', finalPayload);
    return response.data || response;
  },

  // 🚀 ĐÃ FIX: Đồng bộ đổi list_name thành name gửi lên API cập nhật cột
  updateColumn: async (columnId: string, payload: { name: string }) => {
    const response: any = await axiosClient.put(`/board-columns/${columnId}`, payload);
    return response.data || response;
  },

  deleteColumn: async (columnId: string) => {
    const response: any = await axiosClient.delete(`/board-columns/${columnId}`);
    return response.data || response;
  },

  // --- TASK ---
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

  moveTask: async (taskId: string, columnId: string, order: number, boardId: string) => {
    return await axiosClient.patch(`/tasks/${taskId}/move`, {
      new_column_id: columnId, 
      new_order: order,
      board_id: boardId 
    });
  },

  // --- PROJECT MEMBERS ---
  addProjectMember: async (projectId: string, userId: string, roleIds: string[] = ["MEMBER"]) => {
    const payload = {
      user_id: userId,
      role_ids: roleIds
    };
    const response: any = await axiosClient.post(`/projects/${projectId}/members`, payload);
    return response.data || response;
  },

  getProjectMembers: (projectId: string) => {
    return axiosClient.get(`/projects/${projectId}/members`);
  },

  // --- MEDIA & ATTACHMENT ---
  getPresignedUrl: async (fileName: string, contentType: string): Promise<any> => {
    const response: any = await axiosClient.get(`/media/presigned-url`, {
      params: { fileName, contentType }
    });
    return response.data || response; 
  },

  addAttachmentToTask: async (taskId: string, payload: any): Promise<any> => {
    const response: any = await axiosClient.post(`/tasks/${taskId}/attachments`, payload);
    return response.data || response;
  },
};