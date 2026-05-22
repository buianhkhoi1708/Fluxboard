import { create } from 'zustand';
import { userApi } from '../api/userApi'; 

// ==========================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES)
// ==========================================

export interface ProjectRoles {
  [projectId: string]: string[];
}

export interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  system_role_ids: string[];
  project_roles: ProjectRoles;
  status?: string;
}

export interface IncomingUser {
  id?: string;
  user_id?: string;
  _id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  avatarUrl?: string;
  system_role_ids?: string[];
  project_role_ids?: string[];
  status?: string;
}

export interface UserWithContext {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  system_role_ids: string[];
  current_project_role_ids: string[];
}

// ==========================================
// 2. CẤU TRÚC STORE (KẾT HỢP CACHE VÀ MANAGEMENT)
// ==========================================

interface UserStore {
  // --- A. KHO LƯU TRỮ TOÀN CỤC ---
  userDictionary: Record<string, User>;
  
  // Trạng thái chung
  isLoading: boolean;
  
  // Getter & Setter Cache
  saveUsersToCache: (usersArray: IncomingUser[], projectId?: string | null) => void;
  getUser: (userId: string | null | undefined, currentProjectId?: string | null) => UserWithContext | null;

  // --- B. ACTIONS QUẢN LÝ THÀNH VIÊN (SYSTEM LEVEL) ---
  fetchAllSystemUsers: () => Promise<void>;
  updateSystemUserRole: (userId: string, newRoleIds: string[]) => Promise<void>;
  removeSystemUser: (userId: string) => Promise<void>;
}

// ==========================================
// 3. LOGIC STORE
// ==========================================

export const useUserStore = create<UserStore>((set, get) => ({
  
  userDictionary: {},
  isLoading: false,

  // ------------------------------------------
  // LỚP CACHE (Tối ưu truy xuất)
  // ------------------------------------------
  saveUsersToCache: (usersArray, projectId = null) => {
    if (!usersArray || usersArray.length === 0) return;

    set((state) => {
      const newDict: Record<string, User> = { ...state.userDictionary };
      let hasChanges = false;

      usersArray.forEach(incomingUser => {
        const id = incomingUser.user_id || incomingUser.id || incomingUser._id;
        if (!id) return;

        const existingUser = newDict[id] || { project_roles: {} };

        newDict[id] = {
          ...existingUser,
          id: id,
          full_name: incomingUser.full_name || incomingUser.name || existingUser.full_name || 'Unnamed',
          email: incomingUser.email || existingUser.email,
          avatar_url: incomingUser.avatar_url || incomingUser.avatarUrl || existingUser.avatar_url,
          system_role_ids: incomingUser.system_role_ids || existingUser.system_role_ids || [],
          project_roles: existingUser.project_roles || {},
          status: incomingUser.status || existingUser.status
        };

        if (projectId && incomingUser.project_role_ids) {
          newDict[id].project_roles[projectId] = incomingUser.project_role_ids;
        }

        hasChanges = true;
      });

      return hasChanges ? { userDictionary: newDict } : state;
    });
  },

  getUser: (userId, currentProjectId = null) => {
    if (!userId) return null;
    
    const baseUser = get().userDictionary[userId];
    if (!baseUser) return null;

    const result: UserWithContext = {
      id: baseUser.id,
      full_name: baseUser.full_name,
      avatar_url: baseUser.avatar_url,
      email: baseUser.email,
      system_role_ids: baseUser.system_role_ids, 
      current_project_role_ids: [] 
    };

    if (currentProjectId && baseUser.project_roles && baseUser.project_roles[currentProjectId]) {
      result.current_project_role_ids = baseUser.project_roles[currentProjectId];
    }

    return result;
  },

  // ------------------------------------------
  // LỚP MANAGEMENT (Dùng cho trang Quản lý Nhân sự)
  // ------------------------------------------
  
  // Lấy toàn bộ User của Công ty đổ vào Kho
  fetchAllSystemUsers: async () => {
    set({ isLoading: true });
    try {
      const res = await userApi.getAllUsers({ size: 100 });
      
      // 🚀 Chỉ cần gọi res.data thôi vì TypeScript đã biết thừa nó là IncomingUser[] rồi!
      // Nếu Backend trả về phân trang (có content) thì lấy res.data.content, nếu không thì lấy thẳng res.data
      const data = (res.data as any)?.content || res.data || []; 
      
      get().saveUsersToCache(data);
      
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách thành viên hệ thống:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Đổi Role Toàn hệ thống (Ví dụ: Đổi từ Employee lên Manager)
  updateSystemUserRole: async (userId: string, newRoleIds: string[]) => {
    const targetUser = get().userDictionary[userId];
    if (!targetUser) return;

    // 1. Optimistic Update: Sửa ngay trong Kho để UI mượt
    set((state) => {
      const updatedDict = { ...state.userDictionary };
      updatedDict[userId] = { ...targetUser, system_role_ids: newRoleIds };
      return { userDictionary: updatedDict };
    });

    try {
      // 2. Gửi API (Chú ý: data gửi đi dùng Partial Type nên chỉ cần gửi những gì thay đổi)
      await userApi.updateUser(userId, { system_role_ids: newRoleIds });
    } catch (error) {
      console.error("❌ Lỗi cập nhật System Role:", error);
      // Lỗi thì roll back lại
      get().fetchAllSystemUsers();
    }
  },

  // Xóa / Vô hiệu hóa User
  removeSystemUser: async (userId: string) => {
    // 1. Optimistic Update: "Xóa" khỏi Kho (thực tế là lọc ra khỏi Dictionary)
    set((state) => {
      const updatedDict = { ...state.userDictionary };
      delete updatedDict[userId];
      return { userDictionary: updatedDict };
    });

    try {
      await userApi.deleteUser(userId);
    } catch (error) {
      console.error("❌ Lỗi xóa thành viên:", error);
      get().fetchAllSystemUsers();
    }
  }

}));