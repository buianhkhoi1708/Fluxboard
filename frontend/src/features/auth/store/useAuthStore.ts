import { create } from 'zustand';
import axiosClient from '../../../lib/axiosClient';

export interface UserProfile {
  id: string | number;
  _id?: string | number;
  user_id?: string | number;

  email: string;

  full_name: string;
  fullName?: string;

  avatar_url?: string | null;
  avatarUrl?: string | null;

  department?: string | null;
  department_id?: string | null;
  departmentId?: string | null;

  role_id?: string | number | {
    _id?: string | number;
    id?: string | number;
    name?: string;
  };

  role?: string;
  role_name?: string;
  roleName?: string;
  system_role?: string;
  systemRole?: string;

  status?: string;
}

interface LogoutOptions {
  redirect?: boolean;
  redirectTo?: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<{
    success: boolean;
    message?: string;
  }>;

  logout: (options?: LogoutOptions) => void;
  checkAuth: () => boolean;
  syncFromStorage: () => void;

  forgotPassword: (email: string) => Promise<any>;
  verifyResetToken: (token: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<any>;

  updateUserProfile: (updatedData: Partial<UserProfile>) => void;
}

const getRoleNameFromRawUser = (rawUser: any) => {
  return (
    rawUser?.system_role ||
    rawUser?.systemRole ||
    rawUser?.role_name ||
    rawUser?.roleName ||
    rawUser?.role ||
    rawUser?.role_id?.name ||
    null
  );
};

const getRoleIdFromRawUser = (rawUser: any) => {
  const rawRoleId = rawUser?.role_id || rawUser?.roleId;

  if (rawRoleId && typeof rawRoleId === 'object') {
    return rawRoleId._id || rawRoleId.id || rawRoleId;
  }

  return rawRoleId || null;
};

const normalizeUser = (rawUser: any): UserProfile => {
  const userId = rawUser?.id || rawUser?._id || rawUser?.user_id;
  const roleName = getRoleNameFromRawUser(rawUser);
  const roleId = getRoleIdFromRawUser(rawUser);

  return {
    ...rawUser,

    id: userId,
    _id: rawUser?._id || userId,
    user_id: rawUser?.user_id || userId,

    email: rawUser?.email || '',

    full_name:
      rawUser?.full_name ||
      rawUser?.fullName ||
      rawUser?.name ||
      'Người dùng',

    fullName:
      rawUser?.fullName ||
      rawUser?.full_name ||
      rawUser?.name ||
      'Người dùng',

    avatar_url:
      rawUser?.avatar_url ||
      rawUser?.avatarUrl ||
      null,

    avatarUrl:
      rawUser?.avatarUrl ||
      rawUser?.avatar_url ||
      null,

    department_id:
      rawUser?.department_id ||
      rawUser?.departmentId ||
      null,

    departmentId:
      rawUser?.departmentId ||
      rawUser?.department_id ||
      null,

    role_id: roleId || rawUser?.role_id || null,

    role_name:
      rawUser?.role_name ||
      rawUser?.roleName ||
      roleName ||
      undefined,

    roleName:
      rawUser?.roleName ||
      rawUser?.role_name ||
      roleName ||
      undefined,

    system_role:
      rawUser?.system_role ||
      rawUser?.systemRole ||
      roleName ||
      undefined,

    systemRole:
      rawUser?.systemRole ||
      rawUser?.system_role ||
      roleName ||
      undefined,
  };
};

const parseStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('lastActivityAt');

  // Dọn thêm key cũ nếu trước đây app từng lưu accessToken.
  localStorage.removeItem('accessToken');
};

const unwrapResponse = (res: any) => {
  return res?.data?.data ?? res?.data ?? res;
};

const decodeJwtPayload = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

const saveSession = (payload: any) => {
  const finalAccessToken =
    payload?.accessToken ||
    payload?.access_token ||
    payload?.token;

  const finalRefreshToken =
    payload?.refreshToken ||
    payload?.refresh_token;

  const tokenPayload = finalAccessToken
    ? decodeJwtPayload(finalAccessToken)
    : null;

  const finalUser = normalizeUser({
    ...(tokenPayload || {}),
    ...(payload?.user || payload),
  });

  if (!finalAccessToken) {
    throw new Error('Không nhận được access token từ máy chủ.');
  }

  localStorage.setItem('token', finalAccessToken);
  localStorage.setItem('user', JSON.stringify(finalUser));
  localStorage.setItem('lastActivityAt', String(Date.now()));

  if (finalRefreshToken) {
    localStorage.setItem('refreshToken', finalRefreshToken);
  }

  return {
    token: finalAccessToken,
    user: finalUser,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: parseStoredUser(),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });

    try {
      const res: any = await axiosClient.post('/auth/login', {
        email,
        password,
      });

      const payload = unwrapResponse(res);
      const session = saveSession(payload);

      set({
        token: session.token,
        user: session.user,
        isLoading: false,
      });

      return { success: true };
    } catch (error: any) {
      set({ isLoading: false });

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error?.message ||
          error.message ||
          'Đăng nhập thất bại!',
      };
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true });

    try {
      const res: any = await axiosClient.post('/auth/forgot-password', {
        email,
      });

      const payload = unwrapResponse(res);

      set({ isLoading: false });

      return {
        success: true,
        message: payload?.message || 'Đã gửi yêu cầu.',
      };
    } catch (error: any) {
      set({ isLoading: false });

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error?.message ||
          'Lỗi hệ thống.',
      };
    }
  },

  verifyResetToken: async (token: string) => {
    try {
      await axiosClient.get(
        `/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
      );

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error?.message ||
          'Token không hợp lệ.',
      };
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    set({ isLoading: true });

    try {
      const res: any = await axiosClient.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });

      const payload = unwrapResponse(res);

      set({ isLoading: false });

      return {
        success: true,
        message: payload?.message || 'Đổi mật khẩu thành công!',
      };
    } catch (error: any) {
      set({ isLoading: false });

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error?.message ||
          'Có lỗi xảy ra.',
      };
    }
  },

  updateUserProfile: (updatedData) => {
    const currentUser = get().user;

    if (!currentUser) return;

    const newUser = normalizeUser({
      ...currentUser,
      ...updatedData,
    });

    localStorage.setItem('user', JSON.stringify(newUser));

    set({
      user: newUser,
    });
  },

  logout: (options: LogoutOptions = {}) => {
    const {
      redirect = true,
      redirectTo = '/login',
    } = options;

    clearAuthStorage();

    set({
      token: null,
      user: null,
    });

    window.dispatchEvent(new Event('auth:logout'));

    if (redirect) {
      window.location.href = redirectTo;
    }
  },

  checkAuth: () => {
    const token = get().token || localStorage.getItem('token');
    const user = get().user || parseStoredUser();
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token || !user) {
      return false;
    }

    const payload = decodeJwtPayload(token);

    if (!payload) {
      get().logout();
      return false;
    }

    if (payload.exp * 1000 < Date.now()) {
      // Access token hết hạn nhưng còn refresh token thì vẫn cho vào app.
      // Request API kế tiếp sẽ tự gọi silent refresh qua axios interceptor.
      if (refreshToken) {
        return true;
      }

      get().logout();
      return false;
    }

    return true;
  },

  syncFromStorage: () => {
    set({
      token: localStorage.getItem('token') || null,
      user: parseStoredUser(),
    });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-refreshed', (event: Event) => {
    const customEvent = event as CustomEvent<{
      accessToken?: string;
      user?: any;
    }>;

    const accessToken =
      customEvent.detail?.accessToken ||
      localStorage.getItem('token');

    const refreshedUser =
      customEvent.detail?.user ||
      parseStoredUser();

    useAuthStore.setState({
      token: accessToken || null,
      user: refreshedUser ? normalizeUser(refreshedUser) : null,
    });
  });
}