import React, { useEffect, useMemo } from 'react';
import { Shield, Plus, Settings2, Layout, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useRbacStore } from '../features/rbac/store/useRbacStore';

const AdminRBACPage = () => {
  const {
    roles,
    permissions,
    activeRoleId,
    activeRolePermissionIds,
    fetchInitialData,
    setActiveRole,
    togglePermission,
    isLoading, // Biến này giờ chỉ dùng để làm mờ UI, không dùng để ẩn UI nữa
  } = useRbacStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const activeRole = roles.find((r) => r.id === activeRoleId);
  const isSystemAdmin = activeRole?.name === 'SYSTEM_ADMIN';

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, perm) => {
      const moduleName = perm.module || 'General';
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(perm);
      return acc;
    }, {});
  }, [permissions]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#f8f9fc] to-indigo-50/30 overflow-hidden">
      
      {/* 1. HEADER */}
      <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-20 px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-100/60 rounded-lg">
              <Shield className="text-indigo-600" size={18} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-lg font-extrabold !text-slate-900 tracking-tight text-black">
                Quản lý Phân Quyền
              </h1>
              <span className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full"></span>
              <p className="text-xs text-slate-500 font-medium">
                Cấu hình vai trò và kiểm soát quyền hạn.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-sm">
              <Settings2 size={14} />
              <span className="hidden sm:inline">Mã Quyền</span>
            </button>
            <button className="px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm transition-all active:scale-95">
              <Plus size={14} />
              <span className="hidden sm:inline">Vai trò mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* CHỈ HIỆN LOADER NẾU CHƯA CÓ ROLE NÀO (Lần tải đầu tiên) */}
      {isLoading && roles.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mb-4 text-indigo-500" size={32} />
          <p className="text-sm font-medium">Đang tải cấu hình...</p>
        </div>
      )}

      {/* 2. MAIN CONTENT - Bỏ !isLoading đi để giao diện không bị chớp */}
      {roles.length > 0 && (
        <main className="flex-1 flex gap-6 lg:gap-8 max-w-[1600px] w-full mx-auto p-4 sm:p-6 overflow-hidden">
          
          {/* CỘT TRÁI: DANH SÁCH ROLE */}
          <aside className="w-full lg:w-[320px] flex flex-col shrink-0 h-full">
            <div className="flex items-center justify-between mb-2 px-1 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Danh sách vai trò</span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">{roles.length}</span>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar h-full -mx-2 pt-2 px-2 pb-16 space-y-2.5">
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  // 👉 Thêm transform-gpu để scale mượt 60fps bằng card đồ họa
                  className={`group p-4 rounded-xl cursor-pointer border-2 transition-all duration-300 transform-gpu ${
                    activeRoleId === role.id
                      ? 'bg-white border-indigo-500 shadow-md scale-[1.02]'
                      : 'bg-white/60 border-transparent hover:border-slate-200 hover:bg-white shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className={`font-bold text-sm transition-colors ${
                      activeRoleId === role.id ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'
                    }`}>
                      {role.name}
                    </h3>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      role.scope === 'GLOBAL' 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {role.scope}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 font-medium leading-relaxed">
                    {role.description || 'Chưa có mô tả chi tiết.'}
                  </p>

                  {activeRoleId === role.id && role.name !== 'SYSTEM_ADMIN' && (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
                      <button className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                        <Edit2 size={10} /> Chỉnh sửa
                      </button>
                      <button className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors">
                        <Trash2 size={10} /> Xóa
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* CỘT PHẢI: CẤU HÌNH QUYỀN */}
          {/* 👉 CÚ CHỐT: Khi isLoading = true, làm mờ cột phải đi một xíu (opacity-50) và chặn click (pointer-events-none) */}
          <section className={`flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col h-full overflow-hidden transition-all duration-300 ${
            isLoading && roles.length > 0 ? 'opacity-50 pointer-events-none scale-[0.99]' : 'opacity-100 scale-100'
          }`}>
            
            <div className="px-6 py-4 border-b border-slate-100 shrink-0 bg-white z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold !text-slate-900 flex items-center gap-2 ">
                  <span className="w-1.5 h-5 bg-indigo-500 rounded-full " />
                  Quyền hạn: <span className="text-indigo-600">{activeRole?.name}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 ml-3.5 font-medium">
                  {isSystemAdmin
                    ? '⚠️ SYSTEM_ADMIN có toàn quyền mặc định, không thể chỉnh sửa.'
                    : 'Bật/tắt công tắc để phân quyền. Thay đổi tự động lưu.'}
                </p>
              </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-6 h-full pb-24">
              <div className="flex flex-col gap-8">
                {Object.entries(groupedPermissions).map(([moduleName, permsInModule]) => (
                  <div key={moduleName} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1 bg-indigo-50 rounded text-indigo-600">
                        <Layout size={14} />
                      </div>
                      <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {moduleName}
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-100 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {permsInModule.map((perm) => {
                        const isChecked = isSystemAdmin || activeRolePermissionIds.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                              isSystemAdmin
                                ? 'bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed'
                                : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
                            }`}
                          >
                            <div className="pr-4">
                              <div className="font-bold text-xs text-slate-800 mb-0.5 font-mono">
                                {perm.code}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {perm.description}
                              </div>
                            </div>

                            <div className="relative inline-flex items-center shrink-0">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isChecked}
                                disabled={isSystemAdmin}
                                onChange={() => {
                                  if (!isSystemAdmin) {
                                    togglePermission(activeRoleId, perm.id, isChecked);
                                  }
                                }}
                              />
                              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all duration-300 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-300 peer-checked:after:translate-x-4 shadow-inner" />
                            </div>
                          </label>
                        );
                      })}
                    </div>

                  </div>
                ))}

                {Object.keys(groupedPermissions).length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Shield className="mx-auto mb-2 opacity-30" size={32} />
                    <p className="text-xs font-medium">Chưa có mã quyền nào được định nghĩa.</p>
                  </div>
                )}
              </div>
            </div>

          </section>
        </main>
      )}
    </div>
  );
};

export default AdminRBACPage;