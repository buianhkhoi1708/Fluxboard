import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Building2, Users, Plus, UserPlus, ShieldAlert, Loader2, Edit2, UserMinus, Trash2, RefreshCw 
} from 'lucide-react';
import { useGetOrgTree } from '../features/organization/hooks/useOrgQueries';
import { OrgDepartment, OrgTeam, OrgMember, OrgModalState, OrgTargetIds, OrganizationPageProps } from '../features/organization/types/orgTypes';
import OrgFormModal from '../features/organization/components/OrgFormModal';
import UserPickerModal from '../features/organization/components/UserPickerModal';
import { orgApi } from '../features/organization/api/organizationApi';

// ------- Skeleton Components -------
const DepartmentSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden animate-pulse">
    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-slate-200 rounded-2xl" />
        <div className="space-y-2.5">
          <div className="h-6 w-48 bg-slate-200 rounded-md" />
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
        </div>
      </div>
      <div className="h-10 w-36 bg-slate-200 rounded-xl" />
    </div>
    <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-3xl p-6">
          <div className="flex gap-4 mb-6">
            <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
              <div className="h-4 w-1/2 bg-slate-200 rounded-md" />
            </div>
          </div>
          <div className="space-y-2 mb-6">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-12 bg-slate-100 rounded-2xl" />
        </div>
      ))}
    </div>
  </div>
);

const OrganizationPage: React.FC<OrganizationPageProps> = () => {
  const queryClient = useQueryClient();
  const { data: orgTree = [], isLoading, isError, refetch } = useGetOrgTree();

  const [modalState, setModalState] = useState<OrgModalState>({ 
    isOpen: false, mode: 'DEPARTMENT', action: 'CREATE', targetDeptId: null, targetTeam: null, targetDept: null
  });
  const [isUserPickerOpen, setIsUserPickerOpen] = useState<boolean>(false);
  const [targetIds, setTargetIds] = useState<OrgTargetIds>({ deptId: null, teamId: null });

  // ---- Modal handlers ----
  const openCreateDeptModal = () => setModalState({ isOpen: true, mode: 'DEPARTMENT', action: 'CREATE', targetDeptId: null, targetTeam: null, targetDept: null });
  
  const openEditDeptModal = (dept: OrgDepartment, displayManagerName: string) => {
    setModalState({ isOpen: true, mode: 'DEPARTMENT', action: 'EDIT', targetDeptId: null, targetTeam: null, targetDept: { ...dept, managerName: displayManagerName } });
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (!window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa phòng ban "${deptName}" không?\nTất cả các Team bên trong cũng có thể bị ảnh hưởng.`)) return;
    try {
      await orgApi.deleteDepartment(deptId);
      queryClient.invalidateQueries({ queryKey: ['orgTree'] });
    } catch (error: any) {
      alert(error.response?.data?.message || "Có lỗi xảy ra khi xóa phòng ban.");
    }
  };

  const openCreateTeamModal = (deptId: string) => setModalState({ isOpen: true, mode: 'TEAM', action: 'CREATE', targetDeptId: deptId, targetTeam: null, targetDept: null });
  
  const openEditTeamModal = (deptId: string, team: OrgTeam, displayLeadName: string) => {
    setModalState({ isOpen: true, mode: 'TEAM', action: 'EDIT', targetDeptId: deptId, targetTeam: { ...team, leadName: displayLeadName }, targetDept: null });
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Team "${teamName}" không?\nCác thành viên trong team sẽ trở về trạng thái chưa gán nhóm.`)) return;
    try {
      await orgApi.deleteTeam(teamId);
      queryClient.invalidateQueries({ queryKey: ['orgTree'] });
    } catch (error: any) {
      alert(error.response?.data?.message || "Có lỗi xảy ra khi xóa team.");
    }
  };

  const openAddMemberModal = (deptId: string, teamId: string) => {
    setTargetIds({ deptId, teamId });
    setIsUserPickerOpen(true);
  };

  const handleRemoveMember = async (teamId: string, userId: string, userName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn gỡ nhân sự "${userName}" khỏi Team này?`)) return;
    try {
      await orgApi.removeUserFromTeam(teamId, userId);
      queryClient.invalidateQueries({ queryKey: ['orgTree'] });
    } catch (error: any) {
      alert(error.response?.data?.message || "Có lỗi xảy ra khi gỡ nhân sự.");
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <Building2 className="text-indigo-600" size={24} />
              </div>
              Tổ chức
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">
              Thiết lập và quản lý cấu trúc phòng ban, đội ngũ.
            </p>
          </div>
          <button 
            onClick={openCreateDeptModal} 
            className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95 hover:shadow-indigo-300/40"
          >
            <Plus size={18} strokeWidth={2.5} className="transition-transform group-hover:rotate-90" />
            <span>Tạo Phòng Ban</span>
          </button>
        </div>

        {/* LOADING SKELETON */}
        {isLoading && orgTree.length === 0 && (
          <div className="space-y-8">
            {[1, 2].map((i) => <DepartmentSkeleton key={i} />)}
          </div>
        )}

        {/* ERROR STATE */}
        {isError && !isLoading && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-red-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="p-5 bg-red-50 rounded-full mb-5">
              <ShieldAlert size={56} className="text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Tải dữ liệu thất bại</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              Có lỗi xảy ra khi tải cấu trúc tổ chức. Vui lòng thử lại.
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all active:scale-95"
            >
              <RefreshCw size={18} strokeWidth={2.5} />
              <span>Tải lại</span>
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !isError && orgTree.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="p-5 bg-indigo-50 rounded-full mb-5">
              <Building2 size={56} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có tổ chức nào</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              Bắt đầu bằng cách tạo phòng ban đầu tiên cho doanh nghiệp của bạn.
            </p>
            <button
              onClick={openCreateDeptModal}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/40 transition-all active:scale-95"
            >
              <span className="flex items-center gap-2">
                <Plus size={18} /> Thiết lập ngay
              </span>
            </button>
          </div>
        )}

        {/* DANH SÁCH PHÒNG BAN */}
        {!isLoading && !isError && orgTree.length > 0 && (
          <div className="space-y-10 pb-20">
            {orgTree.map((dept: OrgDepartment) => {
              const allDeptMembers = dept.teams?.flatMap(t => t.members || []) || [];
              const managerInfo = allDeptMembers.find(m => m.id === dept.manager_id || m.userId === dept.manager_id);
              const displayManagerName = dept.manager_name || dept.managerName || managerInfo?.full_name || managerInfo?.fullName || 'Chưa phân công';

              return (
                <div key={dept.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/20 border border-slate-200/80 overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-100/20 hover:border-indigo-200/60">
                  
                  {/* Department Header */}
                  <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
                        <ShieldAlert size={28} strokeWidth={1.5} />
                      </div>
                      <div className="group/dept relative">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                            {dept.name}
                          </h2>
                          {dept.code && (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              {dept.code}
                            </span>
                          )}
                          <button 
                            onClick={() => openEditDeptModal(dept, displayManagerName)}
                            title="Chỉnh sửa Phòng ban"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover/dept:opacity-100"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                            title="Xóa Phòng ban"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/dept:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                          Giám đốc / Trưởng phòng: <span className="text-slate-800 font-semibold">{displayManagerName}</span>
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => openCreateTeamModal(dept.id)} 
                      className="flex items-center gap-1.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 px-5 py-2.5 rounded-xl hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={18} /> Thêm Team
                    </button>
                  </div>

                  {/* Teams Grid */}
                  <div className="p-6 md:p-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {dept.teams && dept.teams.length > 0 ? dept.teams.map((team: OrgTeam) => {
                      const actualLeadId = team.leadId || team.lead_id;
                      const leaderInfo = team.members?.find((m: any) => m.id === actualLeadId || m.userId === actualLeadId);
                      const displayLeadName = team.lead_name || team.leadName || leaderInfo?.full_name || leaderInfo?.fullName || 'Chưa gán';

                      return (
                        <div key={team.id} className="group/team bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md hover:shadow-indigo-100/20 hover:border-indigo-300 transition-all duration-200 relative">
                          
                          <div className="flex justify-between items-start mb-5">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 group-hover/team:text-indigo-600 group-hover/team:bg-indigo-50 transition-colors">
                                <Users size={22} strokeWidth={1.5} />
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-slate-800 leading-tight flex items-center gap-2">
                                  {team.name}
                                  {team.code && (
                                    <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                      {team.code}
                                    </span>
                                  )}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] text-slate-400 font-medium">Trưởng nhóm:</span>
                                  <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{displayLeadName}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover/team:opacity-100 transition-all">
                              <button 
                                onClick={() => openEditTeamModal(dept.id, team, displayLeadName)}
                                title="Cập nhật thông tin Team"
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTeam(team.id, team.name)}
                                title="Xóa Team"
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Member list */}
                          <div className="space-y-2 mb-5 min-h-[80px]">
                            {team.members && team.members.length > 0 ? team.members.map((member: OrgMember) => {
                              const memberId = member.id || member.userId || member.user_id;
                              const memberName = member.full_name || member.fullName || 'U';

                              return (
                                <div key={memberId} className="group/member flex justify-between items-center px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 relative">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center uppercase shadow-sm">
                                      {memberName.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-700 group-hover/member:text-indigo-700 transition-colors">{memberName}</p>
                                      <p className="text-[11px] text-slate-400 font-medium">{member?.email}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-center w-6 h-6 group-hover/member:hidden transition-all">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                  </div>

                                  <button 
                                    onClick={() => handleRemoveMember(team.id, memberId as string, memberName)}
                                    title="Gỡ khỏi Team"
                                    className="hidden group-hover/member:flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                  >
                                    <UserMinus size={14} strokeWidth={2.5} />
                                  </button>
                                </div>
                              );
                            }) : (
                              <div className="flex flex-col items-center justify-center h-full py-4 text-slate-400">
                                <p className="text-[13px] font-medium">Chưa có thành viên nào.</p>
                              </div>
                            )}
                          </div>

                          <button 
                            onClick={() => openAddMemberModal(dept.id, team.id)} 
                            className="w-full py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl text-[13px] font-bold text-slate-600 hover:text-indigo-700 transition-all flex justify-center items-center gap-2 active:scale-[0.99]"
                          >
                            <UserPlus size={16} /> Bổ sung nhân sự
                          </button>
                        </div>
                      );
                    }) : (
                      <div className="col-span-full py-12 text-center bg-white/60 backdrop-blur-sm border border-dashed border-slate-200 rounded-2xl">
                        <p className="text-slate-400 font-medium">Phòng ban này đang trống, hãy bắt đầu bằng việc tạo một Team.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      <OrgFormModal 
        isOpen={modalState.isOpen} 
        mode={modalState.mode}
        action={modalState.action}
        targetTeam={modalState.targetTeam}
        targetDept={modalState.targetDept} 
        targetDeptId={modalState.targetDeptId}
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
      />
      
      <UserPickerModal 
        isOpen={isUserPickerOpen} 
        targetDeptId={targetIds.deptId} 
        targetTeamId={targetIds.teamId} 
        onClose={() => setIsUserPickerOpen(false)} 
      />
    </div>
  );
};

export default OrganizationPage;