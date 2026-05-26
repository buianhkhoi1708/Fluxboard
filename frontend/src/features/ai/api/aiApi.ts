import axiosClient from '../../../lib/axiosClient';

// 🚀 Khung xương chuẩn 100% khớp với Backend
export interface GenerateBoardPayload {
  boardId: string;        // Thêm boardId vào payload để ném xuống Body
  projectId: string;      
  prompt: string;         
  memberIds: string[];    
  generationMode: string; 
  startDate: string;      
}

export const aiApi = {
  /**
   * 🤖 GỌI AI SINH TASK VÀ CẤU TRÚC BẢNG
   */
  generateBoard: async (payload: GenerateBoardPayload) => {
    // 🚀 SỬA LẠI URL CHO KHỚP ROUTER BACKEND: /ai/generate-board
    const { data } = await axiosClient.post(`/ai/generate-board`, {
      board_id: payload.boardId,
      project_id: payload.projectId, // Vé thông hành cho Middleware RBAC
      prompt: payload.prompt,
      member_ids: payload.memberIds,
      generation_mode: payload.generationMode,
      start_date: payload.startDate // Sửa key thành start_date cho khớp cái hook cũ Sếp đang viết
    }, {
      timeout: 180000 // Tăng lên 3 phút (180s) cho AI thoải mái suy luận
    });

    return data?.data || data; 
  },
};