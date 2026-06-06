import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8080/api/v1",
});

export const authApi = {
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    confirm_new_password: string;
  }) => {
    const token = localStorage.getItem("token");

    return await apiClient.post("/auth/change-password", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
