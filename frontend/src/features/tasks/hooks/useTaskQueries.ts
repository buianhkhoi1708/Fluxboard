import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient'; 

export const useGetMyTasks = () => {
  return useQuery({
    queryKey: ['tasks', 'my-tasks'],
    queryFn: async () => {
      const response: any = await axiosClient.get('/tasks/my-tasks');
      
      // Bắt mọi trường hợp trả về từ backend
      const tasksData = response?.data?.data || response?.data || response || [];
      
      // Đảm bảo luôn trả về mảng, nếu không map() bên React sẽ crash
      return Array.isArray(tasksData) ? tasksData : [];
    },
    staleTime: 1000 * 60 * 2, // Cache 2 phút
  });
};