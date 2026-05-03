import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../features/workspaces/store/useProjectStore';
import { userApi } from '../features/user/api/userApi';
import axiosClient from '../lib/axiosClient';
import { 
  Sparkles, Briefcase, Users, Bot, ArrowRight, 
  Loader2, CheckCircle2, Wand2, Lightbulb,
  ChevronRight, MessageSquareCode, AlertCircle
} from 'lucide-react';

const AiBoardGeneratorPage = () => {
  const navigate = useNavigate();
  const { projects, fetchProjects } = useProjectStore();
  
  const [dbUsers, setDbUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 🚀 STATE LƯU LỖI VALIDATION (Viền đỏ)
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
    
    const loadUsers = async () => {
      setIsUsersLoading(true);
      try {
        const response = await userApi.getAllUsers();
        if (response.success) {
          setDbUsers(response.data.content || response.data);
        }
      } catch (error) {
        console.error("Lỗi fetch users:", error);
      } finally {
        setIsUsersLoading(false);
      }
    };

    loadUsers();
  }, [fetchProjects, projects.length]);

  const toggleMember = (id) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
    // Tự động xóa lỗi nếu người dùng đã click chọn thành viên
    if (errors.members) setErrors(prev => ({ ...prev, members: null }));
  };

  const handleConfirmGeneration = async () => {
    // 1. Validation UI
    const newErrors = {};
    if (!selectedProjectId) newErrors.project = "Sếp chưa chọn Workspace kìa!";
    if (!prompt.trim()) newErrors.prompt = "Hãy nhập mô tả để AI biết đường chia task nhé!";
    if (selectedMembers.length === 0) newErrors.members = "Phải có ít nhất 1 thành viên nhận việc!";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setIsGenerating(true);

    try {
      // 🚀 BƯỚC 0: GÁN NHÂN SỰ VÀO PROJECT (Để tránh lỗi Unnamed và phân quyền)
      // Chúng ta gọi đồng thời việc add các member được chọn vào dự án
      await Promise.all(
        selectedMembers.map(userId => 
          axiosClient.post(`/projects/${selectedProjectId}/members`, {
            user_id: userId,
            role_ids: ["MEMBER"]
          }).catch(err => {
            // Nếu user đã tồn tại trong dự án thì im lặng bỏ qua (Idempotent)
            console.log(`User ${userId} đã có trong dự án hoặc lỗi nhẹ:`, err.message);
          })
        )
      );

      // BƯỚC 1: TẠO BOARD TRỐNG
      const boardRes = await axiosClient.post('/boards', {
        project_id: selectedProjectId,
        name: `AI Board: ${prompt.substring(0, 25)}...`, 
      });

      const newBoardId = boardRes.id || boardRes.data?.id;

      if (!newBoardId) {
        throw new Error("Không thể khởi tạo Board mới từ hệ thống!");
      }

      // BƯỚC 2: GỌI AI SERVICE (Lúc này nhân sự đã có trong Project Member rồi)
      const aiPayload = {
        project_id: selectedProjectId,
        prompt: prompt,
        member_ids: selectedMembers
      };

      // Gọi API và bắt nó chờ 120 giây (Tăng timeout cục bộ cho request này)
      await axiosClient.post(`/ai/boards/${newBoardId}/generate`, aiPayload, { timeout: 120000 });

      // BƯỚC 3: NAVIGATE
      navigate(`/board/${newBoardId}`); 

    } catch (error) {
      console.error("Lỗi quy trình AI:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("Phiên làm việc hết hạn hoặc sếp thiếu quyền rồi. Sếp thử F5 lại nhé!");
      } else {
        alert("Có lỗi xảy ra. Sếp kiểm tra xem Token có bị hết hạn trong lúc AI đang 'suy nghĩ' không nhé!");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      
      {/* HEADER */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Wand2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Hệ thống AI</span>
              <ChevronRight size={10} />
              <span className="text-indigo-600">Constructor</span>
            </div>
            <h1 className="text-lg font-black text-slate-900! leading-none mt-0.5">Tạo bảng tự động</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg text-indigo-600 text-xs font-bold">
                <Sparkles size={14} />
                Gemini 2.5 Flash
            </div>
            <button 
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
                Hủy bỏ
            </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 space-y-6">
            
            {/* CARD 1: CHỌN DỰ ÁN */}
            <div className={`bg-white rounded-xl border transition-all shadow-sm overflow-hidden ${errors.project ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'}`}>
              <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className={errors.project ? 'text-red-500' : 'text-slate-400'} />
                  <span className={`text-sm font-bold uppercase tracking-tight text-[11px] ${errors.project ? 'text-red-600' : 'text-slate-700'}`}>Bước 1: Chọn Workspace đích</span>
                </div>
                {errors.project && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">
                    <AlertCircle size={12}/> {errors.project}
                  </span>
                )}
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map((item) => {
                  const p = item.project || item;
                  const isSelected = selectedProjectId === p.id;
                  return (
                    <button 
                      key={p.id}
                      onClick={() => { 
                        setSelectedProjectId(p.id); 
                        setErrors(prev => ({ ...prev, project: null })); 
                      }}
                      className={`flex flex-col p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <span className={`text-sm font-black ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{p.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Dept: {p.departmentId || 'General'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARD 2: NHẬP MÔ TẢ YÊU CẦU */}
            <div className={`bg-white rounded-xl border transition-all shadow-sm overflow-hidden ${errors.prompt ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'}`}>
              <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareCode size={16} className={errors.prompt ? 'text-red-500' : 'text-slate-400'} />
                  <span className={`text-sm font-bold uppercase tracking-tight text-[11px] ${errors.prompt ? 'text-red-600' : 'text-slate-700'}`}>Bước 2: Mô tả quy trình/tính năng</span>
                </div>
                {errors.prompt && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">
                    <AlertCircle size={12}/> {errors.prompt}
                  </span>
                )}
              </div>
              <div className="p-5">
                <textarea 
                  rows={10}
                  value={prompt}
                  onChange={(e) => { 
                    setPrompt(e.target.value); 
                    setErrors(prev => ({ ...prev, prompt: null })); 
                  }}
                  placeholder="Hãy mô tả thật chi tiết. Ví dụ: Tạo quy trình Sprint cho module thanh toán..."
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            
            {/* CARD 3: DANH SÁCH NHÂN SỰ */}
            <div className={`bg-white rounded-xl border transition-all shadow-sm overflow-hidden flex flex-col max-h-125 ${errors.members ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'}`}>
              <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users size={16} className={errors.members ? 'text-red-500' : 'text-slate-400'} />
                    <span className={`text-sm font-bold uppercase tracking-tight text-[11px] ${errors.members ? 'text-red-600' : 'text-slate-700'}`}>Bước 3: Gán nhân sự</span>
                </div>
                {errors.members ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                    <AlertCircle size={12}/> Lỗi
                  </span>
                ) : (
                  <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {selectedMembers.length} chọn
                  </span>
                )}
              </div>
              
              {errors.members && (
                <div className="bg-red-50 px-4 py-2 text-xs font-bold text-red-500 text-center border-b border-red-100">
                  {errors.members}
                </div>
              )}

              <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                {isUsersLoading ? (
                  <div className="flex flex-col items-center py-10 gap-2">
                    <Loader2 className="animate-spin text-indigo-500" size={20} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Đang tải User...</span>
                  </div>
                ) : dbUsers.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-medium">Không có dữ liệu thành viên.</div>
                ) : (
                  dbUsers.map((user) => {
                    const isSelected = selectedMembers.includes(user.id);
                    return (
                      <button 
                        key={user.id}
                        onClick={() => toggleMember(user.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isSelected ? 'border-indigo-200 bg-indigo-50 shadow-sm' : 'border-transparent bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{user.username || user.email}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{user.id.slice(0, 12)}</p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ACTION CARD */}
            <div className="bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden group shadow-xl">
              <div className="absolute -right-2 -top-2 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative">
                <h3 className="text-lg font-black mb-1 flex items-center gap-2">
                  Xác nhận <Sparkles size={18} className="text-indigo-400" />
                </h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-6 leading-relaxed">AI sẽ dựa trên mô tả để gán task cho {selectedMembers.length} người.</p>
                
                <button 
                  onClick={handleConfirmGeneration}
                  disabled={isGenerating}
                  className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    isGenerating ? 'bg-indigo-600 cursor-wait opacity-80' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-900/40'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      ĐANG XỬ LÝ...
                    </>
                  ) : (
                    <>
                      XÁC NHẬN TẠO BOARD
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* MẸO NHỎ */}
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex gap-3">
              <Lightbulb size={24} className="text-indigo-600 shrink-0" />
              <p className="text-[11px] font-bold text-indigo-700 leading-relaxed uppercase">
                Gợi ý: Sếp Khôi có thể yêu cầu AI tính toán Story Point theo dãy Fibonacci để quản lý tiến độ tốt hơn!
              </p>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default AiBoardGeneratorPage;