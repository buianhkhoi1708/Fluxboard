import axiosClient from '../../../lib/axiosClient';

export interface UserQueryParams {
  page?: number;
  size?: number;
  search?: string;
  include_role?: boolean;
  include_session?: boolean;
}

const buildUserQueryParams = (params?: UserQueryParams) => {
  return {
    page: 0,
    size: 100,
    include_role: true,
    include_session: true,
    ...params,
  };
};

export const userApi = {
  // Lấy danh sách user dùng cho cache hệ thống.
  // Backend nên trả thêm role_id/role_name/is_online/last_activity nếu có.
  getUsers: () => {
    return axiosClient.get('/users', {
      params: buildUserQueryParams({
        size: 100,
      }),
    });
  },

  // Lấy danh sách user có phân trang & tìm kiếm.
  getAllUsers: (params?: UserQueryParams) => {
    return axiosClient.get('/users', {
      params: buildUserQueryParams(params),
    });
  },

  // Tạo user mới.
  createUser: (data: any) => {
    return axiosClient.post('/users', data);
  },

  // Lấy danh sách role từ RBAC.
  getRoles: () => {
    return axiosClient.get('/rbac/roles?size=100');
  },

  // Update user.
  updateUser: (userId: string | number, data: any) => {
    return axiosClient.put(`/users/${userId}`, data);
  },

  // Delete / deactivate user.
  deleteUser: (userId: string | number) => {
    return axiosClient.delete(`/users/${userId}`);
  },

  // Upload avatar bằng presigned URL.
  uploadAvatar: async (userId: string | number, file: File) => {
    const presignRes: any = await axiosClient.get(
      `/users/${userId}/avatar/presigned-url`,
      {
        params: {
          fileName: file.name,
          contentType: file.type,
        },
      },
    );

    const responseData = presignRes.data?.data || presignRes.data || {};
    const { uploadUrl, fileUrl } = responseData;

    if (!uploadUrl || !fileUrl) {
      throw new Error('Presigned URL không hợp lệ hoặc Backend không trả về URL.');
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(
        `Upload S3 thất bại: ${uploadRes.status} - ${uploadRes.statusText}`,
      );
    }

    await axiosClient.put(`/users/${userId}/avatar`, {
      avatarUrl: fileUrl,
    });

    return {
      url: fileUrl,
    };
  },
};