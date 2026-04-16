import React, { useEffect, useState } from 'react';
import { Users, Search, Plus, Shield, MoreVertical, Mail, Trash2, ShieldAlert } from 'lucide-react';
import { useMemberStore } from '../stores/useMemberStore';
import { useRbacStore } from '../stores/useRbacStore'; // 👉 Móc Store RBAC vào đây để lấy Roles
import { useAuthStore } from '../stores/useAuthStore';

const MembersPage = () => {
  const { members, fetchMembers, updateMemberRole, removeMember, isLoading } = useMemberStore();
  const { roles, fetchInitialData: fetchRoles } = useRbacStore();
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Load dữ liệu khi vào trang
  useEffect(() => {
    fetchMembers();
    if (roles.length === 0) fetchRoles(); // Nếu chưa có Roles thì gọi Backend lấy về
  }, []);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Chưa phân quyền';
  };

  const isAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 sm:p-8 h-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-black flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl shadow-sm">
                <Users className="text-indigo-600" size={24} />
              </div>
              Thành viên Dự án
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Quản lý danh sách thành viên và phân công vai trò (Role) cho từng người.
            </p>
          </div>
          
          <div className="flex gap-3 self-end sm:self-auto">
            {/* Thanh tìm kiếm */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, email..."
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm w-full sm:w-64"
              />
            </div>
            
            {isAdmin && (
              <button className="group px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-sm rounded-xl hover:from-indigo-700 hover:to-indigo-800 flex items-center gap-2 shadow-lg shadow-indigo-200/50 transition-all active:scale-95">
                <Plus size={16} />
                <span>Mời thành viên</span>
              </button>
            )}
          </div>
        </div>

        {/* THỐNG KÊ NHANH */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Users size={20} /></div>
            <div><p className="text-sm font-semibold text-slate-500">Tổng thành viên</p><h3 className="text-2xl font-bold text-slate-800">{members.length}</h3></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Shield size={20} /></div>
            <div><p className="text-sm font-semibold text-slate-500">Đang hoạt động</p><h3 className="text-2xl font-bold text-slate-800">{members.filter(m => m.status === 'ACTIVE').length}</h3></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Mail size={20} /></div>
            <div><p className="text-sm font-semibold text-slate-500">Chờ xác nhận</p><h3 className="text-2xl font-bold text-slate-800">{members.filter(m => m.status === 'PENDING').length}</h3></div>
          </div>
        </div>

        {/* BẢNG DANH SÁCH THÀNH VIÊN */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden h-[calc(100vh-22rem)] flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Thành viên</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vai trò (Role)</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày tham gia</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    {/* Cột Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            {member.name}
                            {member.id === currentUser?.id && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">BẠN</span>}
                          </span>
                          <span className="text-xs text-slate-500">{member.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột Role (Dropdown) */}
                    <td className="py-4 px-6">
                      {isAdmin ? (
                        <select 
                          value={member.roleId}
                          onChange={(e) => updateMemberRole(member.id, e.target.value)}
                          className={`text-xs font-bold rounded-lg px-3 py-1.5 outline-none border cursor-pointer transition-all ${
                            getRoleName(member.roleId) === 'SYSTEM_ADMIN' 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:border-indigo-300'
                          }`}
                        >
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                          {getRoleName(member.roleId)}
                        </span>
                      )}
                    </td>

                    {/* Cột Status */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {member.status === 'ACTIVE' ? 'Hoạt động' : 'Chờ xác nhận'}
                      </span>
                    </td>

                    {/* Cột Ngày */}
                    <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                      {member.joinedAt}
                    </td>

                    {/* Cột Hành động */}
                    <td className="py-4 px-6 text-center">
                      {isAdmin && member.id !== currentUser?.id ? (
                        <button 
                          onClick={() => { if(window.confirm(`Xóa ${member.name} khỏi dự án?`)) removeMember(member.id) }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"><ShieldAlert size={16} className="mx-auto"/></span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {filteredMembers.length === 0 && (
                   <tr>
                     <td colSpan="5" className="py-12 text-center text-slate-400">
                       <p>Không tìm thấy thành viên nào phù hợp.</p>
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MembersPage;