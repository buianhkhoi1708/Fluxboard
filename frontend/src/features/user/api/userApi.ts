import axiosClient from '../../../lib/axiosClient';

export const userApi = {
  // Lấy danh sách user
  getUsers: () => axiosClient.get('/users?size=100'),

  getAllUsers: (params = { page: 0, size: 50 }) => {
    return axiosClient.get('/users', { params });
  },

  // Update user
  updateUser: (userId: string | number, data: any) => {
    return axiosClient.put(`/users/${userId}`, data);
  },

  // Delete user
  deleteUser: (userId: string | number) => {
    return axiosClient.delete(`/users/${userId}`);
  },

  // 🚀 Upload avatar (S3 safe)
uploadAvatar: async (userId: string | number, file: File) => {
  // 1. Lấy presigned URL
  const presignRes: any = await axiosClient.get(
    `/users/${userId}/avatar/presigned-url`,
    {
      params: {
        fileName: file.name,
        contentType: file.type
      }
    }
  );

  console.log("PresignRes:", presignRes);

  const { uploadUrl, fileUrl } = presignRes.data || {};

  if (!uploadUrl || !fileUrl) {
    throw new Error("Presigned URL không hợp lệ!");
  }

  // 2. Upload file lên S3
  await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });

  // 3. Return URL
  return {
    data: fileUrl
  };
}
};
