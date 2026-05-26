import React, { useEffect, useMemo } from 'react';
import { Shield, Plus, Settings2, Layout, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useRbacStore } from '../features/rbac/store/useRbacStore';

// ==============================================================================
// 1. CÁC COMPONENT UI PHỤ TRỢ
// ==============================================================================

const PageHeader = ({ onNewRole }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
        <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
          <Shield className="text-indigo-600" size={24} />
        </div>
        Quản lý Phân Quyền
      </h1>
      <p className="text-sm font-medium text-slate-500 pl-12">
        Cấu hình vai trò và kiểm soát quyền hạn trong hệ thống.
      </p>
    </div>
    <div className="flex items-center gap-3">
      <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
        <Settings2 size={16} />
        <span>Mã Quyền</span>
      </button>
      <button 
        onClick={onNewRole} 
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>Vai trò mới</span>
      </button>
    </div>
  </div>
);

const RoleCard = ({ role, isActive, onClick }) => (
  <div
    onClick={onClick}
    className={`group p-4 rounded-xl cursor-pointer border-2 transition-all duration-300 transform-gpu ${
      isActive
        ? 'bg-white border-indigo-500 shadow-md scale-[1.02]'
        : 'bg-white/60 border-transparent hover:border-slate-200 hover:bg-white shadow-sm'
    }`}
  >
    <div className="flex justify-between items-start mb-1.5">
      <h3 className={`font-bold text-sm transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>
        {role.name}
      </h3>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${role.scope === 'GLOBAL' || role.scope === 'SYSTEM' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
        {role.scope}
      </span>
    </div>
    <p className="text-[11px] text-slate-500 line-clamp-2 font-medium leading-relaxed">
      {role.description || 'Chưa có mô tả chi tiết.'}
    </p>

    {isActive && role.name !== 'SYSTEM_ADMIN' && (
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
);

const PermissionToggleCard = ({ perm, isChecked, isSystemAdmin, onToggle }) => {
  // Fix: Lấy id chuẩn từ MongoDB
  const permId = perm.id || perm._id;
  // Fix: Hiển thị Action thay vì Code (Backend không có field 'code')
  const title = `${perm.action} ${perm.resource}`; 

  return (
    <label
      className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
        isSystemAdmin
          ? 'bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed'
          : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className="pr-4">
        <div className="font-bold text-xs text-slate-800 mb-0.5 font-mono">{title}</div>
        <div className="text-[11px] text-slate-500">{perm.description || `Quyền ${title}`}</div>
      </div>
      <div className="relative inline-flex items-center shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isChecked}
          disabled={isSystemAdmin}
          onChange={() => {
            if (!isSystemAdmin) onToggle(permId, isChecked);
          }}
        />
        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all duration-300 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-300 peer-checked:after:translate-x-4 shadow-inner" />
      </div>
    </label>
  );
};


// ==============================================================================
// 2. COMPONENT CHÍNH
// ==============================================================================

const AdminRBACPage = () => {
  const {
    roles,
    permissions,
    activeRoleId,
    activeRolePermissionIds,
    fetchInitialData,
    setActiveRole,
    togglePermission,
    isLoading,
  } = useRbacStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fix: Lấy id an toàn
  const activeRole = roles.find((r) => (r.id || r._id) === activeRoleId);
  const isSystemAdmin = activeRole?.name === 'SYSTEM_ADMIN';

  // 🚀 FIX: Gom nhóm quyền theo 'resource' thay vì 'module'
  const groupedPermissions = useMemo(() => {
    if (!activeRole) return {};

    return permissions.reduce((acc, perm) => {
      // 🛡️ CHẶN ĐỨNG Ở ĐÂY: Quyền không cùng cấp bậc với Role thì vứt đi, không hiển thị!
      if (perm.scope !== activeRole.scope) return acc;

      const moduleName = perm.resource || 'Chung';
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(perm);
      return acc;
    }, {});
  }, [permissions, activeRole]);
  const handleCreateNewRole = () => {
    alert('Chức năng tạo vai trò mới sẽ được phát triển.');
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        
        <PageHeader onNewRole={handleCreateNewRole} />

        {isLoading && roles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4 text-indigo-500" size={32} />
            <p className="text-sm font-medium">Đang tải cấu hình phân quyền...</p>
          </div>
        )}

        {roles.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-0 min-h-[600px] max-h-[calc(100vh-14rem)]">
              
              <aside className="w-full lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 p-4 lg:p-6 flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Danh sách vai trò</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    {roles.length}
                  </span>
                </div>
                
                <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 pt-2 px-2 pb-4 space-y-2.5">
                  {roles.map((role) => {
                    const roleId = role.id || role._id; // Lấy an toàn
                    return (
                      <RoleCard 
                        key={roleId} 
                        role={role} 
                        isActive={activeRoleId === roleId} 
                        onClick={() => setActiveRole(roleId)} 
                      />
                    );
                  })}
                </div>
              </aside>

              <section className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${
                isLoading && roles.length > 0 ? 'opacity-50 pointer-events-none scale-[0.99]' : 'opacity-100 scale-100'
              }`}>
                
                <div className="px-6 py-4 border-b border-slate-100 shrink-0 bg-white/90">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                      Quyền hạn: <span className="text-indigo-600">{activeRole?.name || 'Chưa chọn'}</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 ml-3.5 font-medium">
                      {isSystemAdmin
                        ? '⚠️ SYSTEM_ADMIN có toàn quyền mặc định, không thể chỉnh sửa.'
                        : 'Bật/tắt công tắc để phân quyền. Thay đổi được tự động lưu.'}
                    </p>
                  </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-4 lg:p-6 flex-1">
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
                             const permId = perm.id || perm._id;
                             return (
                              <PermissionToggleCard
                                key={permId}
                                perm={perm}
                                isSystemAdmin={isSystemAdmin}
                                isChecked={isSystemAdmin || activeRolePermissionIds.includes(permId)}
                                onToggle={(id, isChecked) => togglePermission(activeRoleId, id, isChecked)}
                              />
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
            </div>
          </div>
        )}

        {!isLoading && roles.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm mt-4">
            <div className="p-5 bg-indigo-50 rounded-full mb-5">
              <Shield size={56} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có vai trò nào</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              Bắt đầu bằng cách tạo vai trò đầu tiên để phân quyền cho hệ thống.
            </p>
            <button
              onClick={handleCreateNewRole}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/40 transition-all active:scale-95"
            >
              <span className="flex items-center gap-2">
                <Plus size={18} /> Tạo vai trò mới
              </span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default AdminRBACPage;