import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../features/user/store/useUserStore';
import { useWorkspaces } from '../features/workspaces/hooks/useWorkspaceQueries';
import CreateProjectModal from '../features/workspaces/components/CreateProjectModal';
import CreateBoardModal from '../features/workspaces/components/CreateBoardModal';
import {
  Briefcase, Plus, MoreVertical, KanbanSquare, Users,
  Search, LayoutGrid, Loader2
} from 'lucide-react';

// ------- Component Skeleton khi tải -------
const WorkspaceSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg p-5 md:p-6 animate-pulse">
    <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-200" />
        <div className="space-y-2.5">
          <div className="h-5 w-36 bg-slate-200 rounded-md" />
          <div className="flex gap-3">
            <div className="h-4 w-14 bg-slate-200 rounded-full" />
            <div className="h-4 w-20 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>
      <div className="w-8 h-8 bg-slate-200 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[104px] bg-slate-100 rounded-xl" />
      ))}
    </div>
  </div>
);

// ------- Component Chính -------
const WorkspacesPage = () => {
  const getUser = useUserStore((state) => state.getUser);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useWorkspaces();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Làm phẳng & loại trùng lặp dữ liệu từ các trang
  const allProjects = useMemo(() => {
    if (!data?.pages) return [];
    const flatData = data.pages.flatMap(page => page.data);
    const uniqueData = Array.from(
      new Map(flatData.map(item => {
        const projectId = item.project?.id || item.project?._id;
        return [projectId, item];
      })).values()
    );
    return uniqueData;
  }, [data]);

  const filteredProjects = useMemo(() => {
    return allProjects.filter(item =>
      item.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProjects, searchTerm]);

  // Intersection Observer cho infinite scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const triggerRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Briefcase className="text-indigo-600" size={24} />
              </div>
              Không gian làm việc
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">
              Quản lý không gian làm việc, nhóm và bảng Kanban của bạn.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-indigo-500" />
              <input
                type="text"
                placeholder="Tìm kiếm không gian làm việc..."
                className="pl-9 pr-4 py-2.5 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 transition-all w-64 font-medium shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95 hover:shadow-indigo-300/40 border border-indigo-500/20"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Tạo không gian mới</span>
            </button>
          </div>
        </div>

        {/* KHUNG TẢI (SKELETON) */}
        {isLoading && (
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <WorkspaceSkeleton key={i} />
            ))}
          </div>
        )}

        {/* TRẠNG THÁI TRỐNG */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm transition-all">
            <div className="p-5 bg-indigo-50 rounded-full mb-5 animate-bounce-slow">
              <Briefcase size={56} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {searchTerm ? 'Không tìm thấy không gian phù hợp' : 'Chưa có không gian làm việc'}
            </h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              {searchTerm
                ? "Hãy thử điều chỉnh từ khóa tìm kiếm."
                : "Tạo không gian làm việc đầu tiên để bắt đầu cộng tác."}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/40 transition-all active:scale-95"
              >
                <span className="flex items-center gap-2">
                  <Plus size={18} /> Tạo không gian mới
                </span>
              </button>
            )}
          </div>
        )}

        {/* DANH SÁCH KHÔNG GIAN LÀM VIỆC */}
        {!isLoading && filteredProjects.length > 0 && (
          <div className="space-y-8">
            {filteredProjects.map((item, index) => {
              const workspace = item.project;
              const boardsData = item.boards || [];
              const membersData = item.members || [];

              if (!workspace) return null;

              const isLastElement = index === filteredProjects.length - 1;

              return (
                <section
                  ref={isLastElement ? triggerRef : null}
                  key={workspace.id || workspace._id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-5 md:p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100/20 hover:border-indigo-200/60 hover:-translate-y-0.5"
                >
                  {/* Đầu mục không gian làm việc */}
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200/50 shrink-0 transition-transform duration-200 group-hover:scale-105">
                        <span className="text-lg font-black text-white uppercase">
                          {workspace.name?.charAt(0) || 'W'}
                        </span>
                      </div>
                      <div>
                        <Link
                          to={`/projects/${workspace.id || workspace._id}?tab=boards`}
                          className="transition-colors"
                        >
                          <h2 className="text-lg font-bold text-slate-800 tracking-tight hover:text-indigo-600 transition-colors">
                            {workspace.name}
                          </h2>
                        </Link>
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-1">
                          <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full">
                            <LayoutGrid size={12} /> {boardsData.length} bảng
                          </span>

                          {/* Xem trước thành viên */}
                          <Link
                            to={`/projects/${workspace.id || workspace._id}?tab=members`}
                            title="Quản lý thành viên"
                            className="flex items-center gap-2 bg-slate-100/80 hover:bg-indigo-50 px-2.5 py-1 rounded-full cursor-pointer transition-all group"
                          >
                            <Users size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />

                            {membersData.length > 0 ? (
                              <div className="flex items-center -space-x-1.5">
                                {membersData.slice(0, 4).map((rawMember, idx) => {
                                  const memberId = rawMember.user_id || rawMember.id || rawMember._id;
                                  const member = getUser(memberId, workspace.id || workspace._id) || rawMember;
                                  const displayName = member.full_name || member.name || 'Thành viên';
                                  const avatarUrl = member.avatar_url || member.avatarUrl;
                                  const initial = displayName.charAt(0).toUpperCase();

                                  return (
                                    <div
                                      key={`stack-${memberId || idx}`}
                                      title={displayName}
                                      className="w-5 h-5 rounded-full ring-2 ring-slate-100 bg-indigo-100 flex items-center justify-center overflow-hidden transition-transform hover:scale-125 hover:z-20"
                                      style={{ zIndex: 10 - idx }}
                                    >
                                      {avatarUrl ? (
                                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[9px] font-bold text-indigo-700">{initial}</span>
                                      )}
                                    </div>
                                  );
                                })}
                                {membersData.length > 4 && (
                                  <div className="w-5 h-5 rounded-full ring-2 ring-slate-100 bg-slate-200 flex items-center justify-center z-0">
                                    <span className="text-[8px] font-bold text-slate-600">+{membersData.length - 4}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 group-hover:text-indigo-600 font-medium transition-colors">0 thành viên</span>
                            )}
                          </Link>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 active:scale-90">
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  {/* Lưới bảng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {boardsData.map((boardItem) => {
                      const b = boardItem.board || boardItem;
                      return (
                        <Link
                          to={`/board/${b.id || b._id}`}
                          key={b.id || b._id}
                          className="group relative bg-gradient-to-br from-white to-slate-50/80 border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/30 transition-all duration-200 block overflow-hidden hover:-translate-y-0.5"
                        >
                          <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-white border border-indigo-100 text-indigo-600 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-200">
                                <KanbanSquare size={18} />
                              </div>
                              <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-1">
                                {b.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Hoạt động</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Nút thêm bảng */}
                    <button
                      onClick={() => {
                        setSelectedProjectId(workspace.id || workspace._id);
                        setIsBoardModalOpen(true);
                      }}
                      className="group border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200 min-h-[104px] backdrop-blur-sm active:scale-95 hover:shadow-sm"
                    >
                      <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                        <Plus size={20} strokeWidth={2} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">Tạo bảng</span>
                    </button>
                  </div>
                </section>
              );
            })}

            {/* Chỉ báo tải trang tiếp theo */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200 text-sm text-slate-500 animate-pulse">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  <span>Đang tải thêm không gian...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Các Modal */}
        <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        <CreateBoardModal
          isOpen={isBoardModalOpen}
          onClose={() => setIsBoardModalOpen(false)}
          projectId={selectedProjectId}
          onSuccess={() => setIsBoardModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default WorkspacesPage;