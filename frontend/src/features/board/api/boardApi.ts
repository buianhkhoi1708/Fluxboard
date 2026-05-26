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

  updateBoard: async (boardId: string, payload: any): Promise<any> => {
    const response: any = await axiosClient.put(`/boards/${boardId}`, payload);
    return response.data || response;
  },

  deleteBoard: async (boardId: string): Promise<any> => {
    const response: any = await axiosClient.delete(`/boards/${boardId}`);
    return response.data || response;
  },

  // --- COLUMN ---
  // 🚀 ĐÃ TỐI ƯU: Chỉ lọc lấy name và board_id gửi đi, loại bỏ hoàn toàn trường 'order' để không bị gãy lỗi 400
  createColumn: async (payload: { name: string; board_id: string; order?: number; project_id: string }) => {
    // 🚀 Đảm bảo project_id được gửi đi trong Body
    const finalPayload = {
      name: payload.name,
      board_id: payload.board_id,
      project_id: payload.project_id 
    };
    const response: any = await axiosClient.post('/columns', finalPayload);
    return response.data || response;
  },

  updateColumn: async (columnId: string, payload: { name: string; project_id: string }) => {
    // 🚀 Gửi project_id trong Body khi PUT
    const response: any = await axiosClient.put(`/columns/${columnId}`, payload);
    return response.data || response;
  },

  deleteColumn: async ({ columnId, projectId }: { columnId: string; projectId: string }) => {
    // 🚀 RIÊNG DELETE LÀ PHẢI KẸP project_id VÀO PARAMS!
    const response: any = await axiosClient.delete(`/columns/${columnId}`, {
      params: {
        project_id: projectId
      }
    });
    return response.data || response;
  },

  // --- TASK ---
  // boardApi.ts
// Trong file src/modules/task/api/boardApi.ts
// Đảm bảo hàm này đang trông như thế này:
createTask: async (taskData: any) => {
    // Không cần truyền thêm config header phức tạp nếu axiosClient đã cấu hình tốt
    const response = await axiosClient.post('/tasks', taskData);
    return response.data || response;
},

  updateTask: async (taskId: string, updateData: any) => {
    // Sếp đã truyền updateData (có chứa project_id) từ Hook xuống chưa?
    const response: any = await axiosClient.put(`/tasks/${taskId}`, updateData);
    return response.data || response;
  },

// Cập nhật lại deleteTask trong boardApi.ts
  deleteTask: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
    const response: any = await axiosClient.delete(`/tasks/${taskId}`, {
      // 🚀 KẸP VÀO PARAMS THAY VÌ BODY (Vì Axios mặc định bỏ qua Body của DELETE)
      params: { 
        project_id: projectId 
      }
    });
    return response.data || response;
  },

  moveTask: async ({ taskId, columnId, order, boardId, projectId }: { 
    taskId: string; 
    columnId: string; 
    order: number; 
    boardId: string; 
    projectId: string; // 🚀 Đón chuẩn key từ BoardView.tsx truyền sang
  }) => {
    const response: any = await axiosClient.put(`/tasks/${taskId}/move`, {
      destColumnId: columnId, 
      newOrder: order,
      board_id: boardId,
      project_id: projectId // 🚀 Đổi sang chuẩn snake_case cho Backend đọc
    });
    return response.data || response;
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
    // Bỏ chữ /projects/ nếu Router của sếp đang ghép nó vào từ file index chính
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

 // Trong boardApi.ts
  getTaskAttachments: async (taskId: string, projectId: string): Promise<any> => {
    // 🚀 Lệnh GET bắt buộc nhét project_id vào params
    const response: any = await axiosClient.get(`/tasks/${taskId}/attachments`, {
      params: {
        project_id: projectId
      }
    });
    return response.data || response;
  },

  uploadFile: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file); 

    // 🚀 ĐÃ FIX: Sửa '/upload' thành '/media/upload'
    const response: any = await axiosClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data?.data || response.data; 
  },

  // Trong boardApi.ts
  deleteAttachment: async ({ taskId, attachmentId, projectId }: { taskId: string; attachmentId: string; projectId: string }) => {
    // 🚀 Nhét project_id vào params để vượt ải RBAC
    const response: any = await axiosClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`, {
      params: { project_id: projectId }
    });
    return response.data || response;
  },
};