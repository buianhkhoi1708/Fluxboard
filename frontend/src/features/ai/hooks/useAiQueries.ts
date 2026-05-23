import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../../user/api/userApi";
import axiosClient from "../../../lib/axiosClient";

// ==========================================
// 1. Hook lấy danh sách User
// ==========================================
export const useAllUsers = () => {
  return useQuery({
    queryKey: ["users", "all"],
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

export const useGenerateAiBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      // 🚀 BƯỚC 1: Bóc tách dữ liệu
      const {
        project_id,
        member_ids,
        prompt,
        generation_mode,
        project_start_date,
      } = payload;

      if (!member_ids) {
        throw new Error("Danh sách nhân sự không hợp lệ.");
      }

      // 🚀 BƯỚC 2: CHỮA CHÁY LỖI 404 Ở ĐÂY
      // Sửa `/boards/ai` thành `/boards` và map đúng payload tạo Board chuẩn
      const boardRes: any = await axiosClient.post("/boards", {
        name: `Dự án AI: ${prompt.substring(0, 15)}...`,
        project_id: project_id, // 👈 ĐỔI TỪ projectId THÀNH project_id ĐỂ KHỚP BACKEND
        status: "ACTIVE",
      });

      console.log("DEBUG - Phản hồi từ /boards:", boardRes); // Log ra để xem cấu trúc thật

      const newBoardId =
        boardRes?.data?._id || // Dạng: { data: { _id: "..." } }
        boardRes?.data?.id || // Dạng: { data: { id: "..." } }
        boardRes?._id || // Dạng: { _id: "..." }
        boardRes?.id || // Dạng: { id: "..." }
        boardRes?.data?.data?._id || // Dạng: { data: { data: { _id: "..." } } }
        boardRes?.data?.data?.id; // Dạng: { data: { data: { id: "..." } } }

      if (!newBoardId) {
        throw new Error(
          "Không lấy được ID! Sếp kiểm tra console log bên trên để thấy cấu trúc trả về thật.",
        );
      }

      // 🚀 BƯỚC 3: Gọi API AI (Đường dẫn này đã chuẩn với ai.routes.js của sếp)
      try {
        await axiosClient.post(
          `/ai/generate-board`,
          {
            board_id: newBoardId, // Sếp phải gửi thêm boardId vào body cho Backend
            project_id: project_id,
            prompt: prompt,
            member_ids: member_ids,
            generation_mode,
            project_start_date,
          },
          {
            timeout: 180000,
          },
        );

        return newBoardId;
      } catch (err: any) {
        console.error("🚨 Lỗi Gemini API:", err.response?.data || err.message);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
};
