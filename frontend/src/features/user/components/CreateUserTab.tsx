import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Mail,
  Lock,
  Shield,
  User,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { userApi } from '../api/userApi';

interface RoleOption {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  scope?: string;
}

const normalizeRoleName = (value?: string | null) => {
  if (!value) return '';

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
};

const isSystemAdminRole = (role: RoleOption) => {
  return normalizeRoleName(role.name) === 'SYSTEM_ADMIN';
};

const extractRoles = (res: any): RoleOption[] => {
  const payload =
    res?.data?.data?.content ??
    res?.data?.content ??
    res?.data?.data ??
    res?.data ??
    res?.content ??
    res;

  return Array.isArray(payload) ? payload : [];
};

const CreateUserTab: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: '',
  });

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res: any = await userApi.getRoles();

        // Không cho chọn SYSTEM_ADMIN khi cấp tài khoản mới.
        // SYSTEM_ADMIN là tài khoản cấp cao nhất, chỉ nên được seed/quản lý riêng ở backend.
        const roleData = extractRoles(res).filter((role) => !isSystemAdminRole(role));

        setRoles(roleData);

        if (roleData.length > 0) {
          const firstRoleId = roleData[0]._id || roleData[0].id || '';

          setFormData((prev) => ({
            ...prev,
            role: firstRoleId,
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            role: '',
          }));

          setErrorMsg(
            'Không có role hợp lệ để cấp tài khoản. Role SYSTEM_ADMIN đã được ẩn khỏi màn hình này.',
          );
        }
      } catch (error) {
        console.error('Lỗi lấy danh sách Role:', error);
        setErrorMsg('Không thể tải danh sách quyền hạn. Vui lòng tải lại trang.');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    if (errorMsg) setErrorMsg('');
    if (successMsg) setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.role) {
      setErrorMsg('Vui lòng chọn quyền hạn cho người dùng.');
      setIsSubmitting(false);
      return;
    }

    const selectedRole = roles.find((role) => {
      const roleId = role._id || role.id;
      return String(roleId) === String(formData.role);
    });

    if (selectedRole && isSystemAdminRole(selectedRole)) {
      setErrorMsg('Không được cấp role SYSTEM_ADMIN từ giao diện tạo tài khoản.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role_id: formData.role,
      };

      await userApi.createUser(payload);

      setSuccessMsg('Tạo tài khoản thành công!');

      setFormData((prev) => ({
        fullName: '',
        email: '',
        password: '',
        role: prev.role,
      }));
    } catch (error: any) {
      console.error('Lỗi tạo user:', error);

      setErrorMsg(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          'Có lỗi xảy ra khi tạo người dùng.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <UserPlus className="text-indigo-600" size={24} />
              </div>
              Cấp tài khoản mới
            </h1>

            <p className="text-sm font-medium text-slate-500 pl-12">
              Tạo tài khoản và phân quyền cho nhân sự mới. Role SYSTEM_ADMIN được bảo vệ và không hiển thị tại đây.
            </p>
          </div>
        </div>

        {/* FORM CARD */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {successMsg && (
              <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-bold">
                <CheckCircle2 size={18} />
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm font-bold">
                <AlertTriangle size={18} />
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  Họ và tên
                </label>

                <input
                  required
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-slate-700"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" />
                  Địa chỉ Email
                </label>

                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@fluxboard.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-slate-700"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Lock size={16} className="text-slate-400" />
                  Mật khẩu khởi tạo
                </label>

                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  minLength={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-slate-700"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Shield size={16} className="text-slate-400" />
                  Quyền hạn (Role)
                </label>

                <div className="relative">
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    disabled={isLoadingRoles || roles.length === 0}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-700 appearance-none disabled:opacity-50"
                  >
                    {isLoadingRoles ? (
                      <option value="">Đang tải danh sách quyền...</option>
                    ) : roles.length > 0 ? (
                      roles.map((role) => {
                        const roleId = role._id || role.id || '';

                        return (
                          <option key={roleId} value={roleId}>
                            {role.name}
                          </option>
                        );
                      })
                    ) : (
                      <option value="">Chưa có quyền hạn hợp lệ</option>
                    )}
                  </select>

                  {isLoadingRoles && (
                    <Loader2
                      size={16}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                    />
                  )}
                </div>

                <p className="text-[11px] font-medium text-slate-400">
                  Role SYSTEM_ADMIN không được phép chọn khi cấp tài khoản mới.
                </p>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isLoadingRoles || roles.length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <UserPlus size={18} />
                )}

                {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo tài khoản'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUserTab;