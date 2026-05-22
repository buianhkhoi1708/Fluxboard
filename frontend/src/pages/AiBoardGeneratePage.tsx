import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useProjectStore from '../features/workspaces/store/useProjectStore';
import { useGenerateAiBoard } from '../features/ai/hooks/useAiQueries';
import { useRbacStore } from '../features/rbac/store/useRbacStore';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../lib/axiosClient';

import ProjectDetailMemberModal from '../features/project/components/ProjectDetailMemberModal';

import {
  Sparkles, ArrowRight, ArrowLeft,
  Loader2, CheckCircle2, Wand2,
  AlertCircle, Layout, Layers, Calendar, Plus,
  UserPlus, Fingerprint, XCircle, KeyRound, ShieldCheck
} from 'lucide-react'; 

// ===================== SUB-COMPONENTS =====================
const StepIndicator = ({ currentStep }) => (
  <div className="flex gap-1.5" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={3}>
    {[1, 2, 3].map(step => (
      <div key={step} className={`h-1.5 rounded-full transition-all duration-500 ${currentStep >= step ? 'w-6 bg-indigo-500 shadow-sm' : 'w-2 bg-slate-200'}`} />
    ))}
  </div>
);

const WorkspaceSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1,2,3].map(i => (
      <div key={i} className="p-5 rounded-2xl bg-white border border-slate-100 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    ))}
  </div>
);

const ErrorAlert = ({ message }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 text-red-500 text-[11px] font-bold bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in mt-2 shrink-0">
      <AlertCircle size={14} /> {message}
    </div>
  );
};

// ===================== MAIN COMPONENT =====================
const AiBoardGeneratorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: passedProjectId, members: passedMembers } = location.state || {};
  
  // --- 1. GLOBAL STORES ---
  const { projects, fetchProjects } = useProjectStore();
  const { mutateAsync: generateAiBoard, isPending: isGeneratingAi } = useGenerateAiBoard();
  const { roles: systemRoles, fetchInitialData: fetchRbacData } = useRbacStore();
  
  // 🚀 FIX 1: RÚT LÕI MẢNG TỪ PHÂN TRANG (Chống Crash)
  const projectList = useMemo(() => {
    if (!projects) return [];
    if (Array.isArray(projects)) return projects;
    return projects.content || projects.data?.content || projects.data || [];
  }, [projects]);

  const viewerRoleId = useMemo(() => {
    const ALLOWED_ROLES = ['PROJECT_ADMIN', 'PM', 'LEAD', 'MEMBER', 'VIEWER'];
    const projectRoles = systemRoles.filter(r => ALLOWED_ROLES.includes(r.name));
    return projectRoles.find(r => r.name === 'VIEWER')?.id;
  }, [systemRoles]);

  // --- 2. LOCAL STATE ---
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);

  const [prompt, setPrompt] = useState('');
  const [generationMode, setGenerationMode] = useState('ADVANCED');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState({});
  const [loadingText, setLoadingText] = useState('Đang khởi tạo...');
  const [isSyncingRbac, setIsSyncingRbac] = useState(false);

  // --- 3. FETCH PROJECT MEMBERS ---
  const { data: projectMembersRaw, isLoading: isMembersLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['project-members', selectedProjectId],
    queryFn: async () => {
        if (!selectedProjectId) return [];
        const response: any = await axiosClient.get(`/projects/${selectedProjectId}/members`);
        const rawData = response.data?.data || response.data || [];
        return rawData.content || rawData; 
    },
    enabled: !!selectedProjectId, 
  });

  // 🚀 FIX 1: Dùng useMemo để "đóng băng" địa chỉ bộ nhớ của mảng
  const projectMembers = useMemo(() => {
    const raw = projectMembersRaw || [];
    return Array.isArray(raw) ? raw : [];
  }, [projectMembersRaw]);

  useEffect(() => {
    if (projectMembers.length > 0) {
        const defaultSelections = projectMembers.map((m: any) => ({
            userId: m.userId || m.user_id || m.user?.id || m.id,
            roleId: (m.roleIds && m.roleIds[0]) || (m.role_ids && m.role_ids[0]) || ''
        }));
        setSelectedMembers(defaultSelections);
    } else {
        setSelectedMembers(prev => prev.length === 0 ? prev : []);
    }
  }, [projectMembers]);

  // --- 4. AUTO-FILL DATA ---
  useEffect(() => {
    if (passedProjectId) {
      setSelectedProjectId(passedProjectId);
      setCurrentStep(2); 
    }
  }, [passedProjectId]);

  useEffect(() => {
    if (projectList.length === 0) fetchProjects();
    if (systemRoles.length === 0) fetchRbacData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 5. HANDLERS ---
  const toggleMember = (userId, existingRoleId) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.userId === userId);
      if (exists) return prev.filter(m => m.userId !== userId);
      return [...prev, { userId, roleId: existingRoleId }]; 
    });
    setErrors({});
  };

  const nextStep = () => {
    if (currentStep === 1 && !selectedProjectId) return setErrors({ project: "Sếp chọn 1 Workspace để tiếp tục nhé!" });
    if (currentStep === 2 && selectedMembers.length === 0) return setErrors({ members: "Cần tích chọn ít nhất 1 nhân sự để đưa vào Board!" });
    setErrors({});
    setCurrentStep(prev => prev + 1);
  };

  const handleFinalGenerate = async () => {
    if (!prompt.trim()) { 
      setErrors({ prompt: "Nhập mô tả để AI làm việc sếp ơi!" }); 
      return; 
    }
    
    setIsSyncingRbac(true);
    setLoadingText("AI đang phân rã task & tính Deadline (khoảng 1 phút)...");
    
    try {
      const validAssignees = selectedMembers
        .filter(m => m.roleId !== viewerRoleId)
        .map(m => m.userId);

      const newBoardId = await generateAiBoard({
        project_id: selectedProjectId,
        prompt: prompt,
        member_ids: validAssignees,
        generation_mode: generationMode,
        project_start_date: new Date(startDate).toISOString()
      });

      navigate(`/board/${newBoardId}`);

    } catch (e: any) { 
      console.error("🚨 LỖI QUY TRÌNH TẠO BOARD:", e);
      const errorMsg = e.response?.data?.message || e.message || "Hệ thống quá tải hoặc hết Token";
      alert(`Thất bại: ${errorMsg}`); 
    } finally {
      setIsSyncingRbac(false);
    }
  };

  const isProcessing = isGeneratingAi || isSyncingRbac;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* ---------- HEADER ---------- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Wand2 className="text-indigo-600" size={24} />
              </div>
              Trình tạo Board AI
            </h1>
            <div className="flex items-center gap-4 pl-12">
              <StepIndicator currentStep={currentStep} />
              <span className="text-sm font-medium text-slate-500">
                {currentStep === 1 && 'Chọn không gian làm việc'}
                {currentStep === 2 && 'Phân quyền & thành viên'}
                {currentStep === 3 && 'Yêu cầu nghiệp vụ'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-full border border-indigo-100">
              <Sparkles size={12} className="text-indigo-600" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Gemini 3.1 Pro</span>
            </div>
            <button 
              onClick={() => navigate(-1)}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors px-4 py-2"
            >
              Thoát
            </button>
          </div>
        </div>

        {/* ---------- CONTENT CARD ---------- */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden">
          
          {/* Bước nội dung */}
          <div className="p-5 md:p-6 lg:p-8">
            {/* ---------- STEP 1: WORKSPACE ---------- */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">Cấu hình Workspace</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Chọn không gian làm việc để AI đồng bộ hóa dữ liệu.</p>
                </div>

                {projectList.length === 0 ? <WorkspaceSkeleton /> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar content-start pb-4">
                    <button className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-white transition-all group">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <Plus className="text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Tạo mới</span>
                    </button>
                    {projectList.map((item: any) => {
                      const p = item.project || item;
                      const isSelected = selectedProjectId === p.id;
                      return (
                        <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setErrors({}); }} className={`p-5 rounded-2xl border-2 text-left transition-all relative ${isSelected ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100/50' : 'border-white bg-white shadow-sm hover:border-slate-200 hover:shadow-md'}`}>
                          {isSelected && <div className="absolute top-3 right-3 text-indigo-600"><CheckCircle2 size={18}/></div>}
                          <h3 className="font-bold text-slate-800 text-sm truncate pr-6">{p.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">{p.departmentId || 'System'}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
                <ErrorAlert message={errors.project} />
              </div>
            )}

            {/* ---------- STEP 2: THÀNH VIÊN & PHÂN QUYỀN ---------- */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <KeyRound size={20} className="text-indigo-600" />
                    Tổ chức Nhóm ({projectMembers.length} thành viên)
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Kiểm tra danh sách và chọn người tham gia Board.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => setIsMemberModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95"
                  >
                    <UserPlus size={14} /> Mời thêm
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/30 rounded-2xl p-4">
                  {isMembersLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                      <span className="text-xs font-bold">Đang tải nhân sự Project...</span>
                    </div>
                  ) : projectMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Fingerprint size={48} className="mb-4 opacity-20" />
                      <span className="text-xs font-black uppercase tracking-widest opacity-40">Dự án trống</span>
                      <button onClick={() => setIsMemberModalOpen(true)} className="mt-4 text-indigo-600 text-sm font-bold underline">Thêm thành viên đầu tiên</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectMembers.map((member: any) => {
                        const safeUserId = member.userId || member.user_id || member.user?.id || member.id;
                        const name = member.full_name || member.user?.full_name || member.name || 'Unnamed';
                        const email = member.email || member.user?.email || '';
                        const roleId = (member.roleIds && member.roleIds[0]) || (member.role_ids && member.role_ids[0]) || '';
                        
                        const roleObj = systemRoles.find(r => r.id === roleId);
                        const roleName = roleObj ? roleObj.name : 'MEMBER';

                        const isSelected = !!selectedMembers.find(m => m.userId === safeUserId);

                        return (
                          <div key={safeUserId} className={`group relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                            isSelected 
                              ? 'bg-white border-indigo-200 shadow-md shadow-indigo-50' 
                              : 'bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-300'
                          }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4" onClick={() => toggleMember(safeUserId, roleId)} style={{cursor: 'pointer'}}>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${isSelected ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm truncate transition-colors ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                                  {name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{email}</span>
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {roleName}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberToEdit(member);
                                  setIsMemberModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <ShieldCheck size={16} />
                              </button>

                              <div onClick={() => toggleMember(safeUserId, roleId)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <CheckCircle2 size={12} className="text-white shrink-0" strokeWidth={4} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <ErrorAlert message={errors.members} />
              </div>
            )}

            {/* ---------- STEP 3: AI PROMPT ---------- */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">Yêu cầu nghiệp vụ</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Mô tả quy trình để AI tự động phân rã task và tính toán Story Points.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button onClick={() => setGenerationMode('SIMPLE')} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${generationMode === 'SIMPLE' ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 opacity-70 hover:opacity-100'}`}>
                    <div className={`p-2.5 rounded-xl ${generationMode === 'SIMPLE' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}><Layout size={20}/></div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Đơn giản</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">1 Giai đoạn</p>
                    </div>
                  </button>
                  <button onClick={() => setGenerationMode('ADVANCED')} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${generationMode === 'ADVANCED' ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 opacity-70 hover:opacity-100'}`}>
                    <div className={`p-2.5 rounded-xl ${generationMode === 'ADVANCED' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}><Layers size={20}/></div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Nâng cao</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Đa Giai đoạn</p>
                    </div>
                  </button>
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 flex items-center gap-4 shrink-0">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-indigo-600"><Calendar size={20}/></div>
                    <div className="text-left flex-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ngày bắt đầu</p>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs font-bold text-slate-800 outline-none bg-transparent w-full mt-0.5" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
                  <div className="flex gap-2 flex-wrap mb-4">
                    <button onClick={() => setPrompt("Xây dựng dự án AI Security: Triển khai ModelGuard bảo vệ mô hình khỏi Model Extraction attacks. Các giai đoạn: Đánh giá lỗ hổng, Thiết kế Defensive Framework, Coding Backend (Java/Quarkus) và Pentest.")} className="text-[9px] font-black px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-900 hover:text-white transition-all">+ BẢO MẬT AI</button>
                    <button onClick={() => setPrompt("Chiến dịch Content Marketing Tết 2026 cho Fluxboard. Gồm các bước: Idea Concept, Thuê KOLs, Video Production và Chạy Ad đa kênh.")} className="text-[9px] font-black px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-900 hover:text-white transition-all">+ CHIẾN DỊCH MARKETING</button>
                  </div>
                  <textarea rows={8} value={prompt} onChange={(e) => { setPrompt(e.target.value); setErrors({}); }} placeholder="Mô tả chi tiết dự án tại đây..." className="w-full text-sm font-medium outline-none resize-none placeholder:text-slate-300 custom-scrollbar leading-relaxed pr-8" />
                  {prompt && <button onClick={() => setPrompt('')} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"><XCircle size={18} /></button>}
                </div>
                <ErrorAlert message={errors.prompt} />
              </div>
            )}
          </div>

          {/* ---------- FOOTER (NAVIGATION) ---------- */}
          <div className="border-t border-slate-200 p-4 md:px-8 flex items-center justify-between bg-white/60 backdrop-blur-sm">
            {currentStep > 1 ? (
              <button onClick={() => (passedProjectId && currentStep === 2) ? navigate(-1) : setCurrentStep(prev => prev - 1)} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-800 transition-all uppercase tracking-widest">
                <ArrowLeft size={16} /> Quay lại
              </button>
            ) : <div />}

            {currentStep < 3 ? (
              <button onClick={nextStep} className={`flex items-center gap-2 px-8 md:px-10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                ((currentStep === 1 && !selectedProjectId) || (currentStep === 2 && selectedMembers.length === 0)) 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}>
                Tiếp theo <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={handleFinalGenerate} disabled={isProcessing} className={`flex items-center gap-2 px-10 md:px-12 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
                isProcessing ? 'bg-indigo-300 text-white cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-200'
              }`}>
                {isProcessing ? 'Đang xử lý...' : 'Khởi tạo Board'}
                {!isProcessing && <Sparkles size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* ---------- MODALS ---------- */}
        {isMemberModalOpen && (
          <ProjectDetailMemberModal 
            isOpen={isMemberModalOpen}
            onClose={() => {
                setIsMemberModalOpen(false);
                setMemberToEdit(null);
                refetchMembers(); 
            }}
            projectId={selectedProjectId}
            editMember={memberToEdit}
          />
        )}

        {/* ---------- GENERATING OVERLAY ---------- */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
            <h2 className="text-lg font-black tracking-tight">{loadingText}</h2>
            <div className="w-48 md:w-64 mt-4 bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-indigo-400 rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
      </div>
    </div>
  );
};

export default AiBoardGeneratorPage;