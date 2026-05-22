import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KanbanSquare, Plus, LayoutGrid } from 'lucide-react';
// 🚀 IMPORT HOOK MỚI THAY VÌ DÙNG STORE CŨ
import { useProjectOverview } from '../hooks/useProjectQueries';
import CreateBoardModal from '../../workspaces/components/CreateBoardModal';

const ProjectBoardsTab = ({ projectId }) => {
    // 🚀 LẤY DATA TỪ CACHE CỦA TRANG CHA QUA HOOK
    const { data: projectOverview, refetch } = useProjectOverview(projectId);
    const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);

    const boards = projectOverview?.boards || [];

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <LayoutGrid size={20} className="text-indigo-600" />
                    Danh sách Bảng ({boards.length})
                </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {boards.map((item, idx) => {
                    const b = item.board || item; 
                    if (!b || (!b.id && !b._id)) return null;
                    
                    return (
                        <Link 
                            to={`/board/${b.id || b._id}`} 
                            key={b.id || b._id || idx}
                            className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/30 transition-all duration-200 overflow-hidden block"
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors"></div>
                            
                            <div className="flex items-center gap-3 mb-3 relative z-10">
                                <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                    <KanbanSquare size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 line-clamp-1 transition-colors">{b.name}</h3>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                        {item.columns?.length || b.columns?.length || 0} cột
                                    </p>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {/* Nút Tạo Bảng Mới */}
                <button 
                    onClick={() => setIsBoardModalOpen(true)}
                    className="group border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all min-h-[104px] backdrop-blur-sm"
                >
                    <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                        <Plus size={20} strokeWidth={2} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Tạo Bảng mới</span>
                </button>
            </div>

            <CreateBoardModal 
                isOpen={isBoardModalOpen} 
                onClose={() => setIsBoardModalOpen(false)} 
                projectId={projectId} 
                onSuccess={() => {
                    setIsBoardModalOpen(false);
                    refetch(); // 🚀 Kích hoạt làm mới data qua React Query cực chuẩn
                }} 
            />
        </div>
    );
};

export default ProjectBoardsTab;