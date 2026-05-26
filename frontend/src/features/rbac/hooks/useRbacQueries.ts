import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient';

export const RBAC_KEYS = {
  roles: ['rbac', 'roles'] as const,
};

export interface Role {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  scope?: string;
}

const extractRoles = (res: any): Role[] => {
  const payload =
    res?.data?.data?.content ??
    res?.data?.content ??
    res?.data?.data ??
    res?.data ??
    res?.content ??
    res;

  return Array.isArray(payload) ? payload : [];
};

export const useRolesDictionary = () => {
  return useQuery({
    queryKey: RBAC_KEYS.roles,

    queryFn: async (): Promise<Role[]> => {
      const res: any = await axiosClient.get('/rbac/roles');
      return extractRoles(res);
    },

    staleTime: 1000 * 60 * 60,
  });
};