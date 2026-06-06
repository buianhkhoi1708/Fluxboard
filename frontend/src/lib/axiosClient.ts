import axios, {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const FINAL_API_URL = API_BASE_URL
  ? `${API_BASE_URL}`
  : "http://localhost:8080/api/v1";

const axiosClient = axios.create({
  baseURL: FINAL_API_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

const getAccessToken = () => localStorage.getItem("token");

const getRefreshToken = () => localStorage.getItem("refreshToken");

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("lastActivityAt");
};

const redirectToLogin = () => {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const isAuthBypassUrl = (url?: string) => {
  if (!url) return false;

  return (
    url.includes("/auth/login") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/reset-password") ||
    url.includes("/auth/refresh-token") ||
    url.includes("/auth/refresh")
  );
};

const unwrapRefreshResponse = (response: any) => {
  return response?.data?.data ?? response?.data ?? response;
};

const saveSessionFromRefresh = (payload: any) => {
  const newAccessToken =
    payload?.accessToken || payload?.access_token || payload?.token;

  const newRefreshToken = payload?.refreshToken || payload?.refresh_token;

  const refreshedUser = payload?.user;

  if (!newAccessToken) {
    throw new Error("Không lấy được access token mới từ máy chủ.");
  }

  localStorage.setItem("token", newAccessToken);

  if (newRefreshToken) {
    localStorage.setItem("refreshToken", newRefreshToken);
  }

  if (refreshedUser) {
    localStorage.setItem("user", JSON.stringify(refreshedUser));
  }

  window.dispatchEvent(
    new CustomEvent("auth:session-refreshed", {
      detail: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: refreshedUser,
      },
    }),
  );

  return newAccessToken;
};

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: any) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },

  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (!error.response) {
      console.error("[Network Error]: Không thể kết nối tới máy chủ");
      return Promise.reject(error);
    }

    const status = error.response.status;
    const errorData = error.response.data as any;

    console.error(
      `[API Error ${status}]:`,
      errorData || "Đã có lỗi xảy ra từ máy chủ",
    );

    if (status !== 401) {
      return Promise.reject(error);
    }

    if (!originalRequest || isAuthBypassUrl(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      clearAuthStorage();
      redirectToLogin();
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthStorage();
      redirectToLogin();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosClient(originalRequest);
        })
        .catch((queueError) => Promise.reject(queueError));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      console.warn("🔄 Đang âm thầm gia hạn phiên đăng nhập...");

      const refreshResponse = await axios.post(
        `${FINAL_API_URL}/auth/refresh-token`,
        {
          refreshToken,
        },
      );

      const refreshPayload = unwrapRefreshResponse(refreshResponse);
      const newAccessToken = saveSessionFromRefresh(refreshPayload);

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      console.error("🔴 Refresh token thất bại. Đăng xuất bắt buộc.");

      processQueue(refreshError, null);
      clearAuthStorage();
      redirectToLogin();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export interface ApiResponse<T = any> {
  success: boolean;
  code: number | string;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
}

export default axiosClient;
