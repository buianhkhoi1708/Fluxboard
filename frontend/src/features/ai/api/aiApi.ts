import axiosClient from "../../../lib/axiosClient";

export interface GenerateBoardPayload {
  boardId: string;
  projectId: string;
  prompt: string;
  memberIds: string[];
  generationMode: string;
  startDate: string;
}

export const aiApi = {
  generateBoard: async (payload: GenerateBoardPayload) => {
    const { data } = await axiosClient.post(
      `/ai/generate-board`,
      {
        board_id: payload.boardId,
        project_id: payload.projectId,
        prompt: payload.prompt,
        member_ids: payload.memberIds,
        generation_mode: payload.generationMode,
        start_date: payload.startDate,
      },
      {
        timeout: 180000,
      },
    );

    return data?.data || data;
  },
};
