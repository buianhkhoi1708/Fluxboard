import React, { useState } from 'react';
import * as yup from 'yup';
import { settingApi } from '../api/settingApi';
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

const passwordSchema = yup.object().shape({
  currentPassword: yup
    .string()
    .required('Vui lòng nhập mật khẩu hiện tại'),

  newPassword: yup
    .string()
    .required('Vui lòng nhập mật khẩu mới')
    .matches(
      /^(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Mật khẩu phải từ 8 ký tự, gồm ít nhất 1 chữ hoa và 1 chữ số',
    ),

  confirmPassword: yup
    .string()
    .required('Vui lòng xác nhận mật khẩu mới')
    .oneOf([yup.ref('newPassword')], 'Mật khẩu xác nhận không khớp'),
});

const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('lastActivityAt');

  // Giữ thêm dòng này để dọn sạch nếu bản cũ từng lưu accessToken.
  localStorage.removeItem('accessToken');

  window.dispatchEvent(new Event('auth:logout'));
};

const ChangePasswordForm = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const [serverMessage, setServerMessage] = useState({
    type: '',
    text: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleInputChange = (field: string, value: string) => {
    const nextData = {
      ...formData,
      [field]: value,
    };

    setFormData(nextData);

    passwordSchema
      .validateAt(field, nextData)
      .then(() =>
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        }),
      )
      .catch((err) =>
        setErrors((prev) => ({
          ...prev,
          [field]: err.message,
        })),
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setServerMessage({
      type: '',
      text: '',
    });

    try {
      await passwordSchema.validate(formData, {
        abortEarly: false,
      });

      setErrors({});
    } catch (yupError: any) {
      const validationErrors: { [key: string]: string } = {};

      yupError.inner.forEach((err: any) => {
        if (err.path) {
          validationErrors[err.path] = err.message;
        }
      });

      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      await settingApi.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setServerMessage({
        type: 'success',
        text: 'Đổi mật khẩu thành công. Hệ thống sẽ chuyển bạn về trang đăng nhập...',
      });

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        clearAuthSession();
        window.location.href = '/login';
      }, 2000);
    } catch (error: any) {
      setServerMessage({
        type: 'error',
        text:
          error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          'Thay đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 max-w-xl animate-in fade-in duration-300"
    >
      <div>
        <h3 className="text-lg font-bold text-slate-800">
          Thông tin bảo mật
        </h3>

        <p className="text-xs text-slate-500">
          Đảm bảo việc cập nhật mật khẩu tuân thủ đúng các quy tắc ràng buộc hệ thống.
        </p>
      </div>

      {serverMessage.text && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            serverMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {serverMessage.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{serverMessage.text}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-bold text-slate-700">
          Mật khẩu hiện tại
        </label>

        <div className="relative">
          <input
            type={showPasswords.current ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={(e) =>
              handleInputChange('currentPassword', e.target.value)
            }
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({
                ...prev,
                current: !prev.current,
              }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
          >
            {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {errors.currentPassword && (
          <p className="text-rose-500 text-xs mt-1">
            {errors.currentPassword}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-bold text-slate-700">
          Mật khẩu mới
        </label>

        <div className="relative">
          <input
            type={showPasswords.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({
                ...prev,
                new: !prev.new,
              }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
          >
            {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {errors.newPassword && (
          <p className="text-rose-500 text-xs mt-1">
            {errors.newPassword}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-bold text-slate-700">
          Xác nhận mật khẩu mới
        </label>

        <div className="relative">
          <input
            type={showPasswords.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) =>
              handleInputChange('confirmPassword', e.target.value)
            }
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({
                ...prev,
                confirm: !prev.confirm,
              }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
          >
            {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {errors.confirmPassword && (
          <p className="text-rose-500 text-xs mt-1">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading && <Loader2 className="animate-spin" size={16} />}
          <span>Đổi mật khẩu</span>
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordForm;