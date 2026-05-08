import { create } from 'zustand';
import { organizationApi } from '../api/organizationApi';

export const useOrganizationStore = create((set) => ({
  orgTree: [],
  recentLogs: [],
  loading: false,

  // Gọi API 4.1 cho trang Organization
  fetchOrgTree: async () => {
    set({ loading: true });
    const res = await organizationApi.getOrgTree();
    set({ orgTree: res.data || [], loading: false });
  },

  // Gọi API 3.1 cho Dashboard
  fetchRecentLogs: async () => {
    const res = await organizationApi.getRecentActivities();
    set({ recentLogs: res.data || [] });
  }
}));