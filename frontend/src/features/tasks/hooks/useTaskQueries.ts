import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../../lib/axiosClient";

export const useGetMyTasks = () => {
  return useQuery({
    queryKey: ["tasks", "my-tasks"],
    queryFn: async () => {
      const response: any = await axiosClient.get("/tasks/my-tasks");

      const tasksData =
        response?.data?.data || response?.data || response || [];

      return Array.isArray(tasksData) ? tasksData : [];
    },
    staleTime: 1000 * 60 * 2,
  });
};
