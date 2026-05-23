// src/features/dashboard/hooks/useDashboardQueries.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export const useDashboardMetrics = (filters?: { time_range?: string; department_id?: string; team_id?: string }) => {
  return useQuery({
    // Sử dụng || {} để đảm bảo key luôn là object, không bao giờ là null/undefined
    queryKey: ['dashboard', 'metrics', filters || {}], 
    queryFn: () => dashboardApi.getMetrics(filters),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};