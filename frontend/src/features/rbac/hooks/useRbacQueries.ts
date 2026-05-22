import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient';

export const RBAC_KEYS = {
  roles: ['rbac', 'roles'] as const,
};

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export const useRolesDictionary = () => {
  return useQuery({
    queryKey: RBAC_KEYS.roles,
    queryFn: async (): Promise<Role[]> => {
      const { data } = await axiosClient.get('/rbac/roles');
      return data?.data?.content || data?.data || data || [];
    },
    staleTime: 1000 * 60 * 60, // Cache cứng 1 tiếng
  });
};
