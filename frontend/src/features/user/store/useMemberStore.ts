import { create } from 'zustand';
import { userApi } from '../api/userApi';

interface IMemberState {
  members: any[];
  isLoading: boolean;
  fetchMembers: () => Promise<void>;
  updateMemberRole: (memberId: string, newRoleId: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
}

export const useMemberStore = create<IMemberState>((set, get) => ({
  members: [],
  isLoading: false,

  // 1. KÉO DỮ LIỆU THẬT TỪ BACKEND
  fetchMembers: async () => {
    set({ isLoading: true });
    try {
      const res = await userApi.getUsers();
      // Bắt chuẩn cấu trúc ResponseFactory.paged() của Mạnh
      const data = res.data?.data?.content || res.data?.content || res.data || [];
      set({ members: data, isLoading: false });
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách thành viên:", error);
      set({ isLoading: false });
    }
  },

  // 2. GỌI API ĐỔI ROLE
  updateMemberRole: async (memberId: string, newRoleId: string) => {
    const { members, fetchMembers } = get();
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

    // Optimistic Update: Đổi UI trước cho mượt
    set((state) => ({
      members: state.members.map(m => m.id === memberId ? { ...m, roleId: newRoleId } : m)
    }));

    try {
      // Gửi API update cho Backend
      await userApi.updateUser(memberId, {
        ...targetMember, 
        roleId: newRoleId 
      });
    } catch (error) {
      console.error("❌ Lỗi cập nhật Role:", error);
      // Lỗi thì fetch lại để reset UI
      fetchMembers();
    }
  },

  // 3. GỌI API XÓA MEMBER
  removeMember: async (memberId: string) => {
    const { fetchMembers } = get();
    
    // Optimistic Update: Xóa khỏi UI trước
    set((state) => ({
      members: state.members.filter(m => m.id !== memberId)
    }));

    try {
      await userApi.deleteUser(memberId);
    } catch (error) {
      console.error("❌ Lỗi xóa thành viên:", error);
      fetchMembers();
    }
  }
}));