import axiosClient from '../../../lib/axiosClient';

// 🚀 Khung xương chuẩn 100% khớp với AiPromptRequest.java
export interface GenerateBoardPayload {
  projectId: string;      // Đã đổi sang camelCase để khớp với Record Java
  prompt: string;         // Khớp với @NotBlank String prompt
  memberIds: string[];    // Khớp với @NotEmpty List<String> memberIds
  generationMode: string; // Khớp với @JsonProperty("generation_mode")
  startDate: string;      // Khớp với @JsonProperty("project_start_date")
}

export const aiApi = {
  /**
   * 🤖 GỌI AI SINH TASK VÀ CẤU TRÚC BẢNG
   * @param boardId ID của board trống vừa tạo
   * @param payload Dữ liệu yêu cầu cấu hình AI
   */
  generateBoard: async (boardId: string, payload: GenerateBoardPayload) => {
    // 🚀 TRUYỀN ĐÚNG URL: /ai/boards/{boardId}/generate
    const { data } = await axiosClient.post(`/ai/boards/${boardId}/generate`, {
      // Mapping lại lần cuối để đảm bảo JSON gửi đi là snake_case cho Backend dễ húp
      project_id: payload.projectId,
      prompt: payload.prompt,
      member_ids: payload.memberIds,
      generation_mode: payload.generationMode,
      project_start_date: payload.startDate
    }, {
      timeout: 120000 // Chốt 2 phút cho Gemini thoải mái suy luận sếp nhé
    });

    // Trả về data.data theo chuẩn ResponseFactory của sếp
    return data?.data || data; 
  },
};