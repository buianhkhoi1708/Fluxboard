import { create } from 'zustand';
import { projectApi } from '../api/projectApi';

const useProjectStore = create((set) => ({
  projects: [], 
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      // MỚI: Đổi thành getProjectOverviews
const response = await projectApi.getProjectOverviews({ page: 0, size: 50 });
      if (response.success) {
        const rawData = response.data.content || response.data;
        
        // 🚀 BƯỚC 1: CHUẨN HÓA DỮ LIỆU (Bao sân cả 2 loại Backend)
        const normalizedProjects = rawData.map(item => {
          // Nếu backend ĐÃ cập nhật DTO mới (có cục project bên trong)
          if (item.project) {
            return item; 
          }
          // Nếu backend VẪN dùng DTO cũ (bản thân item chính là project)
          return {
            project: item, 
            boards: item.boards || [] // Nếu API chưa gộp boards thì để mảng rỗng
          };
        });

        // 👉 BƯỚC 2: LỌC DỮ LIỆU ĐÃ CHUẨN HÓA
        const activeProjects = normalizedProjects.filter(item => {
          const p = item.project;
          return p && (p.is_deleted === false || p.is_deleted === undefined);
        });
        
        set({ projects: activeProjects });
      }
    } catch (error) {
      console.error("Store Fetch Error:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  addProject: (newProject) => set((state) => ({ 
    projects: [{ project: newProject, boards: [] }, ...state.projects] 
  })),

  addBoardToProject: (projectId, newBoard) => set((state) => ({
    projects: state.projects.map((item) => {
      if (item.project && (item.project.id === projectId || item.project._id === projectId)) {
        return {
          ...item,
          boards: item.boards ? [...item.boards, newBoard] : [newBoard]
        };
      }
      return item;
    })
  })),
}));

export default useProjectStore;