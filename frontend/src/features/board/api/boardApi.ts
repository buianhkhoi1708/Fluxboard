import axiosClient from '../../../lib/axiosClient';

// Định nghĩa Interface để code sếp không còn "any"
export interface CreateBoardPayload {
  name: string;
  projectId: string;
  status: string;
}

export const boardApi = {
  
  // 🚀 Tạo Board mới (Dùng cho Modal Create Board)
  createBoard: async (payload: CreateBoardPayload): Promise<any> => {
    const response: any = await axiosClient.post('/boards', payload);
    return response.data || response;
  },

  // 🚀 Lấy danh sách Board theo Project ID
  getBoardsByProject: async (projectId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/projects/${projectId}`);
    return response.data || response;
  },

  getBoard: async (boardId: string): Promise<any> => {
    const response: any = await axiosClient.get(`/boards/${boardId}?t=${Date.now()}`);
    return response.data || response; 
  },

  // --- PHẦN TASK (Giữ nguyên logic của sếp nhưng chuẩn hóa Snake Case) ---

  moveTask: async (taskId: string, columnId: string, order: number, boardId: string) => {
    // Đảm bảo Backend nhận đúng snake_case như sếp đã viết
    return await axiosClient.patch(`/tasks/${taskId}/move`, {
      new_column_id: columnId, 
      new_order: order,
      board_id: boardId 
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
  addProjectMember: async (projectId: string, userId: string, roleIds: string[] = ["MEMBER"]) => {
    const payload = {
      user_id: userId,
      role_ids: roleIds
    };
    const response: any = await axiosClient.post(`/projects/${projectId}/members`, payload);
    return response.data || response;
  },

  // Lấy danh bạ (Hàm cũ của sếp - giữ nguyên)
  getProjectMembers: (projectId: string) => {
    return axiosClient.get(`/projects/${projectId}/members`);
  },
};