import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Import Store
import { useProjectStore } from '../features/workspaces/store/useProjectStore';
import { useUserStore } from '../features/user/store/useUserStore'; 

// Import Components
import CreateProjectModal from '../features/workspaces/components/CreateProjectModal';
import CreateBoardModal from '../features/workspaces/components/CreateBoardModal';
import UpdateProjectModal from '../features/workspaces/components/UpdateProjectModal'; // 🚀 Nhúng modal sửa mới

// Import Icons
import { 
  Briefcase, Plus, MoreVertical, KanbanSquare, Users, 
  Search, LayoutGrid, Loader2, Edit, Trash2 
} from 'lucide-react';

const WorkspacesPage: React.FC = () => {
  const { projects, isLoading, fetchUserProjects, deleteExistingProject } = useProjectStore();
  const getUser = useUserStore((state: any) => state.getUser);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isBoardModalOpen, setIsBoardModalOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // 🚀 State quản lý Dropdown Menu & Modal Sửa
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  useEffect(() => {
    fetchUserProjects(); 
  }, [fetchUserProjects]);

  // Đóng mọi dropdown menu khi click ra khoảng trống bên ngoài
  useEffect(() => {
    const closeAllMenus = () => setActiveMenuId(null);
    document.addEventListener('click', closeAllMenus);
    return () => document.removeEventListener('click', closeAllMenus);
  }, []);

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (window.confirm(`Ông có chắc chắn muốn xoá toàn bộ Workspace "${projectName}" không? Toàn bộ Boards và Members thuộc dự án này sẽ bay màu vĩnh viễn và không thể khôi phục!`)) {
      const success = await deleteExistingProject(projectId);
      if (!success) alert("Xóa thất bại. Kiểm tra lại phân quyền hệ thống!");
    }
  };

  const filteredProjects = (projects || []).filter((item: any) => 
    item.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r text-slate-800 to-indigo-900 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Briefcase className="text-indigo-600" size={24} />
              </div>
              Your Workspaces
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">
              Manage your workspaces, teams, and Kanban boards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-all duration-200" />
              <input 
                type="text" 
                placeholder="Search workspaces..." 
                className="pl-9 pr-4 py-2.5 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all w-64 font-medium shadow-sm"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 border border-indigo-500/20"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>New Workspace</span>
            </button>
          </div>
        </div>

        {/* LIST WORKSPACES */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-80 text-slate-400">
            <Loader2 size={48} className="animate-spin text-indigo-600" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <Briefcase size={56} className="text-indigo-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Workspaces Found</h3>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredProjects.map((item: any) => {
              const workspace = item.project; 
              const boardsData = item.boards || []; 
              const membersData = item.members || []; 
              
              if (!workspace) return null; 
              const pId = workspace.id || workspace._id;

              return (
                <section key={pId} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg p-5 md:p-6 transition-all">
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
                        <span className="text-lg font-black text-white uppercase">{workspace.name?.charAt(0) || 'W'}</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{workspace.name}</h2>
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-1">
                          <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full">
                            <LayoutGrid size={12} /> {boardsData.length} boards
                          </span>

                          {/* Avatar Stack */}
                          {membersData.length > 0 && (
                            <div className="flex items-center gap-2 bg-slate-100/80 px-2.5 py-1 rounded-full">
                              <Users size={12} className="text-slate-400" />
                              <div className="flex items-center -space-x-1.5">
                                {membersData.slice(0, 4).map((rawMember: any, idx: number) => {
                                  const memberId = rawMember.id || rawMember._id || rawMember.user_id;
                                  const member = getUser(memberId, pId) || rawMember;
                                  const displayName = member.full_name || 'Member';
                                  return (
                                    <div key={memberId || idx} title={displayName} className="w-5 h-5 rounded-full ring-2 ring-slate-100 bg-indigo-100 flex items-center justify-center overflow-hidden">
                                      {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[9px] font-bold text-indigo-700">{displayName.charAt(0).toUpperCase()}</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 🚀 DROPDOWN MENU CHỨC NĂNG SỬA / XÓA WORKSPACE */}
                    <div className="relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === pId ? null : pId); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeMenuId === pId && (
                        <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingProject(workspace); setActiveMenuId(null); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit size={14} className="text-slate-400" /> Sửa Workspace
                          </button>
                          <button 
                            onClick={(e) => handleDeleteProject(e, pId, workspace.name)}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Xóa Workspace
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOARDS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {boardsData.map((boardItem: any) => {
                      const b = boardItem.board || boardItem;
                      return (
                        <Link to={`/board/${b.id || b._id}`} key={b.id || b._id} className="group relative bg-gradient-to-br from-white to-slate-50/80 border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-white border border-indigo-100 text-indigo-600 w-9 h-9 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <KanbanSquare size={18} />
                            </div>
                            <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{b.name}</h3>
                          </div>
                        </Link>
                      );
                    })}

                    <button 
                      onClick={() => { setSelectedProjectId(pId); setIsBoardModalOpen(true); }}
                      className="group border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all min-h-[104px]"
                    >
                      <Plus size={20} /> <span className="text-xs font-bold uppercase tracking-wider">Create board</span>
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        
        <CreateBoardModal 
          isOpen={isBoardModalOpen} 
          onClose={() => setIsBoardModalOpen(false)} 
          projectId={selectedProjectId as string} 
          onSuccess={() => setIsBoardModalOpen(false)} 
        />

        {/* 🚀 Nhúng cấu trúc Component Sửa Workspace */}
        <UpdateProjectModal 
          isOpen={editingProject !== null} 
          onClose={() => setEditingProject(null)} 
          project={editingProject} 
        />

      </div>
    </div>
  );
};

export default WorkspacesPage;