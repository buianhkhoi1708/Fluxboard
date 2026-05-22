import axiosClient from '../../../lib/axiosClient';

export const userApi = {
  // Lấy danh sách user (Cố định size lớn)
  getUsers: () => axiosClient.get('/users?size=100'),

  // Lấy danh sách user (Có phân trang & tìm kiếm)
  getAllUsers: (params?: { page?: number; size?: number; search?: string }) => {
    const finalParams = { page: 0, size: 50, ...params };
    return axiosClient.get('/users', { params: finalParams });
  },

  // 🚀 TẠO USER MỚI
  createUser: (data: any) => {
    return axiosClient.post('/users', data);
  },

  // Gọi API lấy danh sách Role từ RbacController
  getRoles: () => axiosClient.get('/rbac/roles?size=100'),

  // Update user
  updateUser: (userId: string | number, data: any) => {
    return axiosClient.put(`/users/${userId}`, data);
  },

  // Delete user
  deleteUser: (userId: string | number) => {
    return axiosClient.delete(`/users/${userId}`);
  },

  // 🚀 Upload avatar (S3 safe)
  // 🚀 Upload avatar (S3 safe)
  uploadAvatar: async (userId: string | number, file: File) => {
    // 1. Lấy presigned URL từ Backend
    const presignRes: any = await axiosClient.get(
      `/users/${userId}/avatar/presigned-url`,
      {
        params: {
          fileName: file.name,
          contentType: file.type
        }
      }
    );

    // Bọc lót trích xuất URL an toàn
    const responseData = presignRes.data?.data || presignRes.data || {};
    const { uploadUrl, fileUrl } = responseData;

    if (!uploadUrl || !fileUrl) {
      throw new Error("Presigned URL không hợp lệ hoặc Backend không trả về URL!");
    }

    // 2. Upload file trực tiếp lên S3 bằng presigned URL (Dùng fetch để tránh lỗi Header)
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type
      },
      body: file
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload S3 thất bại: ${uploadRes.status} - ${uploadRes.statusText}`);
    }

    // 3. 🚀 BÍ KÍP ĐÂY: Gọi API báo cho Backend lưu link vào Database
    await axiosClient.put(`/users/${userId}/avatar`, {
      avatarUrl: fileUrl
    });

    // 4. 🚀 ĐỔI TÊN BIẾN TRẢ VỀ: Trả đúng field 'url' để Hook useUpdateProfile hứng được
    return {
      url: fileUrl 
    };
  }
};