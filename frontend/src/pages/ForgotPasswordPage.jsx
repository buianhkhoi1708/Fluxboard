import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { forgotPasswordSchema } from '../features/auth/schema/auth.schema';
import { KeyRound, ArrowLeft, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import logoIcon from '../assets/icon.svg';

const ForgotPasswordPage = () => {
  const [formData, setFormData] = useState({ email: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  
  const { forgotPassword, isLoading } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = async (e) => {
    const { name } = e.target;
    try {
      await forgotPasswordSchema.validateAt(name, formData);
      setErrors(prev => ({ ...prev, [name]: '' }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [name]: err.message }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setStatus({ type: '', message: '' });
    setErrors({});

    try {
      await forgotPasswordSchema.validate(formData, { abortEarly: false });
      
      const result = await forgotPassword(formData.email);
      if (result.success) {
        setStatus({ 
          type: 'success', 
          message: 'Đường dẫn khôi phục mật khẩu đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra!' 
        });
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
            <p>Khôi phục quyền truy cập để tiếp tục làm việc với các dự án của bạn</p>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-white">
        <div className="w-full max-w-md z-10">
          <div className="flex items-center gap-4 mb-12">
            <img 
              src={logoIcon} 
              alt="Fluxboard Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md" 
            />
            <span className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight">Fluxboard</span>
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 mb-2">Quên mật khẩu</h2>
          <p className="text-base font-medium text-slate-500 mb-8">Nhập email đăng nhập để nhận hướng dẫn khôi phục.</p>

          {status.type === 'success' && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-semibold text-emerald-800">{status.message}</p>
            </div>
          )}
          
          {status.type === 'error' && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <XCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-semibold text-rose-800">{status.message}</p>
            </div>
          )}

          {status.type !== 'success' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mt-3 mb-1.5 ml-1">Email của bạn</label>
                <input 
                  type="text" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border-2 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all outline-none ${
                    errors.email 
                      ? 'bg-rose-50 border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100' 
                      : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                  }`}
                  placeholder="email@gmail.com"
                />
                {errors.email && (
                  <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">
                    {errors.email}
                  </span>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <span>Gửi link khôi phục</span>
                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-left">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} />
              <span>Quay lại Đăng nhập</span>
            </Link>
          </div>
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

export default ForgotPasswordPage;