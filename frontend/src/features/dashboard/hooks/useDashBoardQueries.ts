import { useQuery } from '@tanstack/react-query';
import { dashboardApi, DashboardFilters } from '../api/dashboardApi';

export const useDashboardMetrics = (filters?: DashboardFilters) => {
  return useQuery({
    queryKey: ['dashboard', 'metrics', filters || {}],
    queryFn: () => dashboardApi.getMetrics(filters),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useAiDeviationInsights = (projectId?: string | null) => {
  return useQuery({
    queryKey: ['dashboard', 'ai-deviation', projectId],
    queryFn: () => dashboardApi.getAiDeviationInsights(String(projectId)),
    enabled: !!projectId && String(projectId) !== 'undefined' && String(projectId) !== 'null',
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};