import React, { useState } from 'react';
import { useBoardStore } from '../stores/useBoardStore';
import { Sparkles, Loader2, Zap } from 'lucide-react';

const AiGeneratorPanel = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { setBoardFromAI } = useBoardStore();

  const handleGenerateBoard = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/v1/ai/generate-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });

      const result = await response.json();

      if (result.success) {
        setBoardFromAI(result.data);
        setPrompt(''); 
      } else {
        alert("Lỗi từ Backend: " + result.message);
      }
    } catch (error) {
      console.error("Lỗi gọi API:", error);
      alert("Không kết nối được tới Backend AI của Khôi!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 px-6 py-5 flex justify-center shrink-0">
      <div className="w-full max-w-4xl relative group">
        
        {/* 👉 Hiệu ứng Glow (Vòng sáng mờ ảo) phía sau thanh nhập liệu */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>

        {/* Khung Input chính */}
        <div className="relative flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 transition-all focus-within:ring-4 focus-within:ring-indigo-50 focus-within:border-indigo-300">
          
          {/* Icon lấp lánh */}
          <div className="pl-4 pr-2 text-indigo-500 flex-shrink-0">
            <Sparkles size={20} className={isLoading ? "animate-pulse" : ""} />
          </div>

          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateBoard()}
            placeholder="Nhập yêu cầu để AI tạo dự án (vd: Dự án App Học Tiếng Anh Flux cho nhóm 5 dev)..."
            className="flex-1 bg-transparent border-none outline-none px-2 py-3 text-sm text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal w-full"
            disabled={isLoading}
          />
          
          {/* Nút bấm chuyển sắc (Gradient) xịn xò */}
          <button 
            onClick={handleGenerateBoard}
            disabled={isLoading || !prompt.trim()}
            className="ml-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all duration-300 active:scale-95 flex-shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Zap size={18} className="fill-current text-yellow-300" />
                <span>Khởi tạo Bảng</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AiGeneratorPanel;