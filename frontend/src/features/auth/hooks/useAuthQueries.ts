import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../../lib/axiosClient";

export interface UserProfile {
  id: string | number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  department?: string | null;
  system_role?: string;
  role_id?: string;
}

export const AUTH_KEYS = {
  me: ["auth", "me"] as const,
};

export const useAuthUser = () => {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: (): UserProfile | null => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;

      const token = localStorage.getItem("token");
      if (!token) return null;

      try {
        const base64Url = token.split(".")[1];

        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

        const jsonPayload = decodeURIComponent(
          window
            .atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join(""),
        );

        const payload = JSON.parse(jsonPayload);

        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          return null;
        }
      } catch (error) {
        console.error("❌ [LỖI GIẢI MÃ TOKEN]:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
      }

      return JSON.parse(storedUser);
    },

    staleTime: Infinity,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: Record<string, string>) => {
      const res: any = await axiosClient.post("/auth/login", {
        email,
        password,
      });

      const payload = res.data || res;
      const finalAccessToken = payload.accessToken || payload.access_token;
      const finalUser = payload.user || payload;

      if (!finalAccessToken) {
        throw new Error("Không tìm thấy Access Token từ server trả về.");
      }

      const normalizedUser: UserProfile = {
        ...finalUser,
        id: finalUser.id || finalUser.user_id,
      };

      localStorage.setItem("token", finalAccessToken);
      localStorage.setItem("user", JSON.stringify(normalizedUser));

      return normalizedUser;
    },
    onSuccess: (normalizedUser) => {
      queryClient.setQueryData(AUTH_KEYS.me, normalizedUser);
    },
    onError: (error: any) => {
      console.error(
        "Lỗi đăng nhập:",
        error.response?.data?.message || error.message,
      );
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    queryClient.removeQueries();

    window.location.href = "/login";
  };
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const res: any = await axiosClient.post("/auth/forgot-password", {
        email,
      });
      return res;
    },
  });
};

export const useVerifyResetToken = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const res: any = await axiosClient.get(
        `/auth/verify-reset-token?token=${token}`,
      );
      return res;
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => {
      const res: any = await axiosClient.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      return res;
    },
  });
};

export const useUpdateLocalProfile = () => {
  const queryClient = useQueryClient();

  return (updatedData: Partial<UserProfile>) => {
    queryClient.setQueryData(
      AUTH_KEYS.me,
      (oldData: UserProfile | undefined) => {
        if (!oldData) return oldData;

        const newUser = { ...oldData, ...updatedData };
        localStorage.setItem("user", JSON.stringify(newUser));
        return newUser;
      },
    );
  };
};
