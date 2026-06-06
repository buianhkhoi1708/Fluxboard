import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

// ======================================================
// BASE URL
// ======================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

// ======================================================
// AXIOS INSTANCE
// ======================================================

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ======================================================
// REFRESH QUEUE
// ======================================================

let isRefreshing = false;

let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (
  error: any,
  token: string | null = null,
) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

// ======================================================
// STORAGE HELPERS
// ======================================================

const getAccessToken = (): string | null => {
  return localStorage.getItem("token");
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem("refreshToken");
};

const clearAuthStorage = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("lastActivityAt");
};

const redirectToLogin = (): void => {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

// ======================================================
// AUTH BYPASS
// ======================================================

const isAuthBypassUrl = (url?: string): boolean => {
  if (!url) return false;

  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/reset-password") ||
    url.includes("/auth/refresh-token")
  );
};

// ======================================================
// REFRESH RESPONSE
// ======================================================

const unwrapRefreshResponse = (response: any) => {
  return response?.data?.data ?? response?.data ?? response;
};

const saveSessionFromRefresh = (payload: any): string => {
  const newAccessToken =
    payload?.accessToken ||
    payload?.access_token ||
    payload?.token;

  const newRefreshToken =
    payload?.refreshToken ||
    payload?.refresh_token;

  const refreshedUser = payload?.user;

  if (!newAccessToken) {
    throw new Error(
      "Không lấy được access token mới từ server",
    );
  }

  localStorage.setItem("token", newAccessToken);

  if (newRefreshToken) {
    localStorage.setItem(
      "refreshToken",
      newRefreshToken,
    );
  }

  if (refreshedUser) {
    localStorage.setItem(
      "user",
      JSON.stringify(refreshedUser),
    );
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

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => Promise.reject(error),
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },

  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // ==================================================
    // NETWORK ERROR
    // ==================================================

    if (!error.response) {
      console.error(
        "[NETWORK ERROR]: Không thể kết nối server",
      );

      return Promise.reject(error);
    }

    const status = error.response.status;

    console.error(
      `[API ERROR ${status}]`,
      error.response.data,
    );

    // ==================================================
    // NOT 401
    // ==================================================

    if (status !== 401) {
      return Promise.reject(error);
    }

    // ==================================================
    // BYPASS AUTH API
    // ==================================================

    if (
      !originalRequest ||
      isAuthBypassUrl(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    // ==================================================
    // AVOID INFINITE LOOP
    // ==================================================

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

    // ==================================================
    // WAIT IF REFRESHING
    // ==================================================

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
        });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization =
            `Bearer ${newToken}`;

          return axiosClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // ==================================================
    // REFRESH TOKEN
    // ==================================================

    originalRequest._retry = true;

    isRefreshing = true;

    try {
      console.warn(
        "🔄 Đang refresh access token...",
      );

      // ⚠️ KHÔNG dùng axiosClient
      // để tránh interceptor loop

      const refreshResponse = await axios.post(
        `${API_BASE_URL}/auth/refresh-token`,
        {
          refreshToken,
        },
      );

      const refreshPayload =
        unwrapRefreshResponse(refreshResponse);

      const newAccessToken =
        saveSessionFromRefresh(refreshPayload);

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      console.error(
        "🔴 Refresh token thất bại",
      );

      processQueue(refreshError, null);

      clearAuthStorage();

      redirectToLogin();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ======================================================
// API TYPES
// ======================================================

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

// ======================================================
// EXPORT
// ======================================================

export default axiosClient;

