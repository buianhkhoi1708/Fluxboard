import { create } from 'zustand';
import {
  activityApi,
  Activity,
  PaginationMeta,
  ActivityFilters,
} from '../api/activityApi';

interface ActivityState {
  activities: Activity[];
  meta: PaginationMeta | null;
  loading: boolean;
  loadingMore: boolean;
  filters: ActivityFilters;

  fetchAdminLogs: (page?: number) => Promise<void>;
  setFilters: (newFilters: ActivityFilters) => void;
}

const unwrapActivityPayload = (res: any) => {
  if (res?.success !== undefined && (Array.isArray(res?.data) || res?.meta)) {
    return res;
  }

  if (res?.data?.success !== undefined) {
    return res.data;
  }

  return res;
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  meta: null,
  loading: false,
  loadingMore: false,
  filters: {},

  setFilters: (newFilters) => {
    set({
      filters: newFilters,
      activities: [],
      meta: null,
    });

    get().fetchAdminLogs(0);
  },

  fetchAdminLogs: async (page = 0) => {
    if (page === 0) {
      set({ loading: true });
    } else {
      set({ loadingMore: true });
    }

    try {
      const currentFilters = get().filters;
      const res = await activityApi.getAdminLogs(page, 20, currentFilters);
      const payload = unwrapActivityPayload(res);

      const logs = Array.isArray(payload?.data) ? payload.data : [];
      const paginationMeta = payload?.meta || null;

      set((state) => ({
        activities: page === 0 ? logs : [...state.activities, ...logs],
        meta: paginationMeta,
        loading: false,
        loadingMore: false,
      }));
    } catch (error) {
      console.error('Lỗi fetch activities:', error);

      set({
        loading: false,
        loadingMore: false,
      });
    }
  },
}));