import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../user/api/userApi';
import axiosClient from '../../../lib/axiosClient';

// ==========================================
// 1. Hook lấy danh sách User
// ==========================================
export const useAllUsers = () => {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const response = await userApi.getAllUsers();
      // Bóc tách dữ liệu linh hoạt theo cấu trúc trả về của API
      return response.data?.content || response.data || response || [];
    },
    staleTime: 1000 * 60 * 10, 
  });
};

// ==========================================
// 2. Hook Xử lý Luồng Tạo AI Board (Orchestrator)
// ==========================================
export interface GenerateAiBoardParams {
  projectId: string;
  members: Array<{ userId: string; roleId: string }>;
  prompt: string;
  mode: string;
  startDate: string;
  roleMap: Record<string, string>;
}

// Trong file useAiQueries.ts
export const useGenerateAiBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      // 🚀 BƯỚC 1: Bóc tách đúng tên biến sếp gửi từ handleFinalGenerate
      const { 
        project_id, 
        member_ids, 
        prompt, 
        generation_mode, 
        project_start_date 
      } = payload;

      // Kiểm tra an toàn để tránh lỗi .map()
      if (!member_ids) {
        console.error("Lỗi: member_ids bị undefined!", payload);
        throw new Error("Danh sách nhân sự không hợp lệ.");
      }

      // 🚀 BƯỚC 2: Tạo Board rỗng trước (Dùng project_id chuẩn snake_case)
      const boardRes: any = await axiosClient.post('/boards/ai', { 
        project_id: project_id, 
        name: `AI Board: ${prompt.substring(0, 15)}...` 
      });

      const newBoardId = boardRes.data?.id || boardRes.id || boardRes.data?.data?.id; 
      if (!newBoardId) throw new Error("Không khởi tạo được Board ID!");

      // 🚀 BƯỚC 3: Gọi AI với payload khớp hoàn toàn Java Record V6
      try {
        await axiosClient.post(`/ai/boards/${newBoardId}/generate`, { 
          project_id: project_id,
          prompt: prompt,
          member_ids: member_ids, // 🚀 Sử dụng đúng member_ids đã bóc tách
          generation_mode,
          project_start_date
        }, { 
          timeout: 180000 // Đợi 3 phút cho chắc
        });
        
        return newBoardId;
      } catch (err: any) {
        console.error("🚨 Lỗi Gemini API:", err.response?.data || err.message);
        if (err.response?.status === 401) throw new Error("Phiên đăng nhập hết hạn");
        if (err.response?.status === 400) throw new Error("Yêu cầu không hợp lệ (Check DTO)");
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    }
  });
};