import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { authApi } from '../../auth/authApi'; 

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
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const validateRealTime = async () => {
      try {
        await passwordSchema.validate(formData, { abortEarly: false });
        setErrors({}); 
      } catch (err: any) {
        const newErrors: { [key: string]: string } = {};
        err.inner.forEach((error: any) => { newErrors[error.path] = error.message; });
        setErrors(newErrors);
      }
    };
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      validateRealTime();
    } else { setErrors({}); }
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
        confirm_new_password: formData.confirmPassword
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
      setServerMessage({ type: 'error', text: error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Đổi mật khẩu</h2>
      
      {serverMessage.text && (
        <div className={`p-3 mb-5 rounded-xl text-sm font-medium border ${
          serverMessage.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
        }`}>
          {serverMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu hiện tại</label>
          <input
            type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange}
            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-slate-800 placeholder-slate-400 transition-all ${errors.currentPassword ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
          />
          {errors.currentPassword && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.currentPassword}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu mới</label>
          <input
            type="password" name="newPassword" value={formData.newPassword} onChange={handleChange}
            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-slate-800 placeholder-slate-400 transition-all ${errors.newPassword ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
          />
          {errors.newPassword && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.newPassword}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Xác nhận mật khẩu</label>
          <input
            type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-slate-800 placeholder-slate-400 transition-all ${errors.confirmPassword ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
          />
          {errors.confirmPassword && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || Object.keys(errors).length > 0}
          className={`w-full mt-6 py-2.5 px-4 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 
            ${(isLoading || Object.keys(errors).length > 0)
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang xử lý...
            </>
          ) : ('Lưu mật khẩu')}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;