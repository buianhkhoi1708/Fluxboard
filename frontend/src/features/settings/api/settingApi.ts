import axiosClient from '../../../lib/axiosClient';

export const settingApi = {
  getNotificationSettings: () => {
    return axiosClient.get('/settings/notifications');
  },

  // Cập nhật cấu hình thông báo
  updateNotificationSettings: (settingsData: any) => {
    return axiosClient.put('/settings/notifications', settingsData);
  },

  uploadAvatar: async (
  userId: string,
  file: File
) => {

  // =========================
  // STEP 1
  // lấy presigned URL
  // =========================

  const presignedRes =
    await axiosClient.get(
      `/users/${userId}/avatar/presigned-url`,
      {
        params: {
          fileName: file.name,
          contentType: file.type
        }
      }
    );

  const {
    uploadUrl,
    fileUrl
  } = presignedRes.data.data;

  // =========================
  // STEP 2
  // upload file lên S3
  // =========================

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });

  // =========================
  // STEP 3
  // SAVE avatar url vào DB
  // =========================

  await axiosClient.put(
    `/users/${userId}/avatar`,
    {
      avatarUrl: fileUrl
    }
  );

  return {
    url: fileUrl
  };
}
};