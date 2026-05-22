import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient'; // Trỏ đúng đường dẫn của sếp nhé

export const useGetMyTasks = () => {
  return useQuery({
    queryKey: ['tasks', 'my-tasks'],
    queryFn: async () => {
      const response: any = await axiosClient.get('/tasks/my-tasks');
      return response.data?.data || response.data || [];
    },
    staleTime: 1000 * 60 * 2, // Cache 2 phút
  });
};