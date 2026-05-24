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

      // 1. TẠO BOARD TRỐNG TRƯỚC
      const boardRes: any = await axiosClient.post("/boards", {
        name: `Dự án AI: ${prompt.substring(0, 15)}...`,
        project_id: project_id,
        status: "ACTIVE",
        create_default_cols: generation_mode === "SIMPLE"
      });

      const newBoardId =
        boardRes?.data?._id ||
        boardRes?.data?.id ||
        boardRes?._id ||
        boardRes?.id ||
        boardRes?.data?.data?._id ||
        boardRes?.data?.data?.id;

      if (!newBoardId) {
        throw new Error("Không lấy được Board ID sau khi tạo bảng rỗng.");
      }

      // 2. GỌI API GEMINI ĐỂ BƠM TASK VÀO BẢNG ĐÓ
      try {
        await axiosClient.post(
          `/ai/generate-board`,
          {
            board_id: newBoardId, // Backend (ai.service.js) đang dùng boardId
            project_id: project_id, // Backend đang dùng projectId
            prompt: prompt,
            member_ids: member_ids || [], // Đảm bảo không undefined
            generation_mode: generation_mode || "SIMPLE",
            start_date: project_start_date, //
          },
          {
            timeout: 180000, // Đợi 3 phút cho AI thoải mái vẽ Task
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
