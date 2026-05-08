import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { resetPasswordSchema } from '../features/auth/schema/auth.schema';
import { LockKeyhole, ArrowRight, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import logoIcon from '../assets/icon.svg';

const ResetPasswordPage = () => {
  // Lấy token từ URL xuống
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Các trạng thái của trang
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  const { verifyResetToken, resetPassword, isLoading } = useAuthStore();

  // Chạy tự động ngay khi vừa load trang
  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setIsVerifying(false);
        setIsValidToken(false);
        setStatus({ type: 'error', message: 'Không tìm thấy mã xác thực trong đường dẫn.' });
        return;
      }

      // Gọi Backend kiểm tra token
      const result = await verifyResetToken(token);
      setIsVerifying(false);
      
      if (result.success) {
        setIsValidToken(true); 
      } else {
        setIsValidToken(false);
        setStatus({ type: 'error', message: result.message });
      }
    };

    checkToken();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = async (e) => {
    const { name } = e.target;
    try {
      await resetPasswordSchema.validateAt(name, formData);
      setErrors(prev => ({ ...prev, [name]: '' }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [name]: err.message }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setErrors({});

    try {
      await resetPasswordSchema.validate(formData, { abortEarly: false });
      
      const result = await resetPassword(token, formData.password);
      if (result.success) {
        setStatus({ type: 'success', message: result.message });
      } else {
        setStatus({ type: 'error', message: result.message });
      }
    } catch (err) {
      const validationErrors = {};
      err.inner.forEach(error => {
        validationErrors[error.path] = error.message;
      });
      setErrors(validationErrors);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white relative">
      
      {/* HIỆU ỨNG VÀ TEXT */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-indigo-600 overflow-hidden items-center justify-center p-16">
        <div className="absolute -bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-indigo-800 rounded-full shadow-2xl animate-blob"></div>
        <div className="absolute bottom-[5%] left-[20%] w-[350px] h-[350px] bg-indigo-700 rounded-full shadow-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-500/30 rounded-full animate-blob animation-delay-4000"></div>
        <div className="absolute top-[10%] -right-[10%] w-[300px] h-[300px] bg-indigo-500/20 rounded-full animate-blob animation-delay-6000"></div>

        <div className="relative z-10 max-w-md w-full pointer-events-none">
          <h1 className="text-6xl font-black !text-indigo-100/90 mb-3 tracking-widest uppercase drop-shadow-md">
            Welcome to FLUXBOARD
          </h1>
          <div className="w-12 h-1 bg-indigo-400 mb-6 rounded-full"></div>
          <div className="text-sm font-medium text-indigo-100/90 leading-relaxed space-y-3">
            <p>Nền tảng quản lý công việc và tối ưu hóa hiệu suất đội ngũ</p>
            <p>Thiết lập bảo mật mới để an tâm tiếp tục công việc của bạn</p>
          </div>
        </div>
      </div>
      {/* CỘT BÊN PHẢI: FORM */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-white">
        <div className="w-full max-w-md z-10">
          
          {/* 👉 LOGO VÀ TÊN THƯƠNG HIỆU */}
          <div className="flex items-center gap-4 mb-12">
            <img 
              src={logoIcon} 
              alt="Fluxboard Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md" 
            />
            <span className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight">Fluxboard</span>
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 mb-8">Đặt lại mật khẩu</h2>

          {/* Đang kiểm tra token */}
          {isVerifying && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
              <p className="text-sm font-medium text-slate-500">Đang kiểm tra tính hợp lệ của đường dẫn...</p>
            </div>
          )}

          {/* Đã xử lý xong (Thành công hoặc Lỗi Token) */}
          {!isVerifying && status.type && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${status.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              {status.type === 'success' ? (
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
              ) : (
                <XCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
              )}
              <p className={`text-sm font-medium ${status.type === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                {status.message}
              </p>
            </div>
          )}

          {/* Token hợp lệ và chưa đổi pass xong -> Hiện form */}
          {!isVerifying && isValidToken && status.type !== 'success' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mt-3 mb-1.5 ml-1">Mật khẩu mới</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full border-2 pl-4 pr-12 py-3.5 rounded-xl text-sm font-semibold transition-all outline-none ${
                      errors.password 
                        ? 'bg-rose-50 border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100' 
                        : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                    }`}
                    placeholder="Nhập tối thiểu 8 ký tự, 1 chữ hoa, 1 số"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">
                    {errors.password}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border px-4 py-3 rounded-xl text-sm font-semibold transition-all outline-none ${
                    errors.confirmPassword 
                      ? 'bg-rose-50 border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100' 
                      : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                  }`}
                  placeholder="Nhập lại mật khẩu mới"
                />
                {errors.confirmPassword && (
                  <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              <button 
                type="submit" disabled={isLoading}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <span>Xác nhận đổi mật khẩu</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Nút điều hướng */}
          {!isVerifying && (!isValidToken || status.type === 'success') && (
            <div className="mt-8 text-left">
              <Link to={status.type === 'success' ? "/login" : "/forgot-password"} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowRight className="rotate-180" size={16} />
                <span>{status.type === 'success' ? "Quay lại Đăng nhập" : "Gửi lại email khôi phục"}</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Hiệu ứng chuyển động của bóng */}
      <style>{`
        @keyframes chaotic-float {
          0% { transform: translate(0, 0) scale(1); }
          20% { transform: translate(60px, -40px) scale(1.15); }
          40% { transform: translate(-80px, 50px) scale(0.85); }
          60% { transform: translate(40px, 90px) scale(1.2); }
          80% { transform: translate(-50px, -60px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .animate-blob {
          animation: chaotic-float 60s infinite ease-in-out;
        }
        .animation-delay-2000 { animation-delay: -3s; }
        .animation-delay-4000 { animation-delay: -7s; }
        .animation-delay-6000 { animation-delay: -11s; }
      `}</style>
    </div>
  );
};

export default ResetPasswordPage;