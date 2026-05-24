import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { authApi } from '../../auth/authApi';
import { Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const passwordSchema = yup.object().shape({
  currentPassword: yup.string().required('Vui lòng nhập mật khẩu hiện tại'),
  newPassword: yup.string()
    .required('Vui lòng nhập mật khẩu mới')
    .matches(
      /^(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Mật khẩu phải từ 8 ký tự, gồm ít nhất 1 chữ hoa và 1 chữ số'
    ),
  confirmPassword: yup.string()
    .required('Vui lòng xác nhận mật khẩu mới')
    .oneOf([yup.ref('newPassword')], 'Mật khẩu xác nhận không khớp'),
});

const ChangePasswordForm = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: '', text: '' });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const validateRealTime = async () => {
      try {
        await passwordSchema.validate(formData, { abortEarly: false });
        setErrors({});
      } catch (err: any) {
        const newErrors: { [key: string]: string } = {};
        err.inner.forEach((error: any) => {
          newErrors[error.path] = error.message;
        });
        setErrors(newErrors);
      }
    };
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      validateRealTime();
    } else {
      setErrors({});
    }
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerMessage({ type: '', text: '' });
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      await authApi.changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_new_password: formData.confirmPassword,
      });

      setServerMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển hướng...' });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      localStorage.removeItem('token');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setServerMessage({ type: 'error', text: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!' });
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
      setServerMessage({
        type: 'error',
        text: error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md">
      {/* Thông báo */}
      {serverMessage.text && (
        <div
          className={`p-3 mb-6 rounded-xl text-sm font-medium border flex items-center gap-2 ${
            serverMessage.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {serverMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          {serverMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mật khẩu hiện tại */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu hiện tại</label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none text-slate-800 placeholder-slate-400 transition-all bg-white/80 backdrop-blur-sm ${
                errors.currentPassword
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              tabIndex={-1}
            >
              {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.currentPassword}</p>
          )}
        </div>

        {/* Mật khẩu mới */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu mới</label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 số"
              className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none text-slate-800 placeholder-slate-400 transition-all bg-white/80 backdrop-blur-sm ${
                errors.newPassword
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              tabIndex={-1}
            >
              {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.newPassword}</p>
          )}
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Xác nhận mật khẩu</label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu mới"
              className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none text-slate-800 placeholder-slate-400 transition-all bg-white/80 backdrop-blur-sm ${
                errors.confirmPassword
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              tabIndex={-1}
            >
              {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || Object.keys(errors).length > 0}
          className={`w-full sm:w-auto mt-8 py-2.5 px-8 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 
            ${
              isLoading || Object.keys(errors).length > 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 hover:shadow-md active:scale-[0.98]'
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              Đang xử lý...
            </>
          ) : (
            'Lưu mật khẩu'
          )}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;