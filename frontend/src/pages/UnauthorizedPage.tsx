import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-[#f8fafc] px-4 w-full h-full">
      <div className="bg-white p-10 md:p-14 rounded-4xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col items-center text-center max-w-lg w-full">
        {}
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <ShieldAlert className="w-12 h-12 text-rose-500" strokeWidth={1.5} />
        </div>

        {}
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-3">
          403 - Truy cập bị từ chối
        </h1>

        {}
        <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm">
          Rất tiếc, tài khoản của bạn không được cấp quyền để xem nội dung hoặc
          thực hiện thao tác trên trang này. Vui lòng liên hệ Quản trị viên nếu
          bạn nghĩ đây là sự nhầm lẫn.
        </p>

        {}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.3)] transition-all duration-300 active:scale-95"
        >
          <ArrowLeft size={18} />
          Quay về Dashboard
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
